export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { isBookingServiceType } from '@/lib/booking-services'
import { buildPaymentHref } from '@/lib/booking-routing'
import { formatCommercePrice, getManualAmountForProduct } from '@/lib/commerce'
import { getProblemSpecies, isProblemType } from '@/lib/data'
import { formatPricePln } from '@/lib/pricing'
import { createPendingBooking } from '@/lib/server/db'
import { getBookingApiErrorSnapshot } from '@/lib/server/booking-api-errors'
import { getCustomerEmailDeliveryStatus } from '@/lib/server/notifications'
import { getManualPaymentReference, getQaCheckoutEligibility } from '@/lib/server/payment-options'
import { AnimalType, ProblemType } from '@/lib/types'

function isAnimalType(value: unknown): value is AnimalType {
  return value === 'Pies' || value === 'Kot'
}

function isEmailValid(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

const FORM_CONTENT_TYPES = ['application/x-www-form-urlencoded', 'multipart/form-data'] as const

function isFormSubmission(request: Request): boolean {
  const contentType = request.headers.get('content-type') ?? ''

  return FORM_CONTENT_TYPES.some((candidate) => contentType.includes(candidate))
}

function formDataToBody(formData: FormData): Record<string, unknown> {
  const body: Record<string, unknown> = {}

  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') {
      body[key] = value
    }
  }

  return body
}

function isTruthyFormValue(value: unknown): boolean {
  return value === true || value === 'true' || value === '1' || value === 'on' || value === 'yes'
}

function buildFormErrorRedirect(request: Request, body: Record<string, unknown>, message: string) {
  const url = new URL('/form', request.url)

  if (typeof body.problemType === 'string') {
    url.searchParams.set('problem', body.problemType)
  }

  if (typeof body.slotId === 'string') {
    url.searchParams.set('slotId', body.slotId)
  }

  if (typeof body.serviceType === 'string') {
    url.searchParams.set('service', body.serviceType)
  }

  if (isTruthyFormValue(body.qaBooking)) {
    url.searchParams.set('qa', '1')
  }

  url.searchParams.set('error', message)
  url.hash = 'formularz'

  return NextResponse.redirect(url, { status: 303 })
}

function bookingErrorResponse(request: Request, body: Record<string, unknown>, shouldRedirect: boolean, message: string, status: number) {
  if (shouldRedirect) {
    return buildFormErrorRedirect(request, body, message)
  }

  return NextResponse.json({ error: message }, { status })
}

export async function POST(request: Request) {
  const shouldRedirect = isFormSubmission(request)
  let body: Record<string, unknown> = {}

  try {
    try {
      body = shouldRedirect ? formDataToBody(await request.formData()) : ((await request.json()) as Record<string, unknown>)
    } catch {
      return bookingErrorResponse(request, body, shouldRedirect, 'Nie udało się odczytać formularza rezerwacji.', 400)
    }

    const rawProblemType = typeof body.problemType === 'string' ? body.problemType : null
    const rawAnimalType = body.animalType
    const rawServiceType = typeof body.serviceType === 'string' ? body.serviceType : null
    const qaBooking = isTruthyFormValue(body.qaBooking)

    if (
      typeof body.ownerName !== 'string' ||
      !isProblemType(rawProblemType) ||
      (rawServiceType !== null && !isBookingServiceType(rawServiceType)) ||
      !isAnimalType(rawAnimalType) ||
      (body.petAge !== undefined && typeof body.petAge !== 'string') ||
      (body.durationNotes !== undefined && typeof body.durationNotes !== 'string') ||
      typeof body.description !== 'string' ||
      typeof body.email !== 'string' ||
      typeof body.slotId !== 'string'
    ) {
      return bookingErrorResponse(request, body, shouldRedirect, 'Niepoprawne dane formularza.', 400)
    }

    const ownerName = body.ownerName
    const problemType = rawProblemType as ProblemType
    const animalType = rawAnimalType
    const serviceType = rawServiceType
    const petAge = typeof body.petAge === 'string' && body.petAge.trim()
      ? body.petAge.trim()
      : 'Nie podano w formularzu rezerwacji.'
    const durationNotes = typeof body.durationNotes === 'string' && body.durationNotes.trim()
      ? body.durationNotes.trim()
      : 'Nie podano w formularzu rezerwacji.'
    const description = body.description
    const email = body.email
    const slotId = body.slotId
    const consentTerms = isTruthyFormValue(body.consentTerms)
    const consentEarlyStart = isTruthyFormValue(body.consentEarlyStart)

    if (qaBooking) {
      const qaEligibility = getQaCheckoutEligibility({
        id: 'pending',
        qaBooking: true,
        email,
      })

      if (!qaEligibility.isAllowed) {
        return bookingErrorResponse(request, body, shouldRedirect, qaEligibility.reason ?? qaEligibility.summary, 403)
      }
    }

    const fields = [ownerName, description, email, slotId]

    if (fields.some((value) => value.trim().length === 0)) {
      return bookingErrorResponse(request, body, shouldRedirect, 'Uzupełnij imię, e-mail, termin i krótki opis problemu.', 400)
    }

    if (!isEmailValid(email.trim())) {
      return bookingErrorResponse(request, body, shouldRedirect, 'Podaj poprawny adres e-mail do potwierdzenia konsultacji.', 400)
    }

    if (description.trim().length < 10) {
      return bookingErrorResponse(
        request,
        body,
        shouldRedirect,
        'Napisz krótko, co się dzieje i z czym potrzebujesz pomocy.',
        400,
      )
    }

    if (!consentTerms || !consentEarlyStart) {
      return bookingErrorResponse(
        request,
        body,
        shouldRedirect,
        'Przed rezerwacją zaakceptuj regulamin, politykę prywatności i zgodę na rozpoczęcie usługi przed upływem 14 dni.',
        400,
      )
    }

    const problemSpecies = getProblemSpecies(problemType)

    if ((problemSpecies === 'kot' && animalType !== 'Kot') || (problemSpecies === 'pies' && animalType !== 'Pies')) {
      return bookingErrorResponse(request, body, shouldRedirect, 'Gatunek i temat muszą wskazywać ten sam typ sprawy.', 400)
    }

    const result = await createPendingBooking({
      ownerName,
      serviceType: serviceType ?? undefined,
      problemType,
      animalType,
      petAge,
      durationNotes,
      description,
      email,
      slotId,
      qaBooking,
    })

    if (shouldRedirect) {
      return NextResponse.redirect(
        new URL(buildPaymentHref(result.booking.id, result.accessToken, serviceType, qaBooking), request.url),
        { status: 303 },
      )
    }

    return NextResponse.json({
      bookingId: result.booking.id,
      accessToken: result.accessToken,
      paymentReference: result.booking.paymentReference ?? getManualPaymentReference(result.booking.id),
      amount: result.booking.amount,
      amountLabel: formatPricePln(result.booking.amount),
      manualAmountLabel: formatCommercePrice(getManualAmountForProduct('consultation', result.booking.amount)),
      customerEmailAvailable: getCustomerEmailDeliveryStatus(result.booking.email).state === 'ready',
      qaEligibility: getQaCheckoutEligibility(result.booking),
    })
  } catch (error) {
    console.error('[regulski-behawiorysta][booking-api] create failed', error)
    const failure = getBookingApiErrorSnapshot(error)

    if (shouldRedirect) {
      return buildFormErrorRedirect(request, body, failure.message)
    }

    return NextResponse.json({ error: failure.message, errorCode: failure.code }, { status: failure.status })
  }
}
