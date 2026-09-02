import { NextResponse } from 'next/server'
import { buildZapytajPaymentHref } from '@/lib/booking-routing'
import { getBookingApiErrorSnapshot } from '@/lib/server/booking-api-errors'
import { createPendingBooking, recordFunnelEvent } from '@/lib/server/db'
import { getDataModeStatus } from '@/lib/server/env'
import { normalizePolishPhone } from '@/lib/phone'
import { createCommunityPromoBooking, PromoCodeValidationError } from '@/lib/server/promo-codes'
import { getZapytajLiveStatus } from '@/lib/server/zapytaj-live'
import { isZapytajLiveSlot, ZAPYTAJ_SERVICE_TYPE } from '@/lib/zapytaj-flow'
import type { AnimalType } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function isTruthy(value: unknown) {
  return value === true || value === 'true' || value === '1' || value === 'on' || value === 'yes'
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function errorResponse(message: string, status: 400 | 409 | 503) {
  return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  let body: Record<string, unknown>

  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return errorResponse('Nie udało się odczytać formularza.', 400)
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const species = body.species === 'kot' || body.species === 'pies' ? body.species : null
  const description = typeof body.description === 'string' ? body.description.trim() : ''
  const mode = body.mode === 'live' ? 'live' : body.mode === 'scheduled' ? 'scheduled' : null
  const slotId = typeof body.slotId === 'string' ? body.slotId.trim() : ''
  const promoCode = typeof body.promoCode === 'string' ? body.promoCode.trim() : ''
  const normalizedPhone = normalizePolishPhone(phone)

  if (name.length < 1 || name.length > 120) {
    return errorResponse('Podaj imię lub nazwę, którą mogę wykorzystać przy kontakcie.', 400)
  }

  if (!normalizedPhone) {
    return errorResponse('Podaj poprawny polski numer telefonu.', 400)
  }

  if (email.length > 200 || !isEmail(email)) {
    return errorResponse('Podaj poprawny adres e-mail.', 400)
  }

  if (!species) {
    return errorResponse('Wybierz, czy sprawa dotyczy psa czy kota.', 400)
  }

  if (description.length < 20 || description.length > 800) {
    return errorResponse('Opisz sytuację w 20–800 znakach.', 400)
  }

  if (!mode || !slotId) {
    return errorResponse('Wybierz sposób i termin rozmowy.', 400)
  }

  if (!isTruthy(body.consentProcessing) || !isTruthy(body.consentPolicy) || !isTruthy(body.consentEarlyStart)) {
    return errorResponse('Zaznacz wszystkie zgody potrzebne do rezerwacji i rozpoczęcia usługi.', 400)
  }

  const dataMode = getDataModeStatus()
  if (!dataMode.isValid) {
    return errorResponse('Rezerwacja chwilowo jest niedostępna. Spróbuj ponownie za moment.', 503)
  }

  const liveMode = mode === 'live'

  if (promoCode && liveMode) {
    return errorResponse('Kod grupowy działa tylko przy zwykłym terminie rozmowy.', 400)
  }

  try {
    if (liveMode) {
      const live = await getZapytajLiveStatus()
      if (
        !isZapytajLiveSlot(slotId) ||
        !live.liveSlotId ||
        live.liveSlotId !== slotId ||
        (live.status !== 'available_now' && live.status !== 'in_call')
      ) {
        return errorResponse('To okno live nie jest już dostępne. Odśwież status i wybierz inne.', 409)
      }
    } else if (isZapytajLiveSlot(slotId)) {
      return errorResponse('Wybierz zwykły termin rozmowy.', 400)
    }

    const result = promoCode
      ? await createCommunityPromoBooking({
          code: promoCode,
          ownerName: name,
          problemType: 'inne',
          animalType: (species === 'kot' ? 'Kot' : 'Pies') as AnimalType,
          petAge: 'Nie podano w formularzu usługi Zapytaj.',
          durationNotes: 'Zapytaj — bez dodatkowego formularza.',
          description,
          phone,
          email,
          slotId,
        })
      : await createPendingBooking({
          ownerName: name,
          serviceType: ZAPYTAJ_SERVICE_TYPE,
          consultationMode: 'phone',
          problemType: 'inne',
          animalType: (species === 'kot' ? 'Kot' : 'Pies') as AnimalType,
          petAge: 'Nie podano w formularzu usługi Zapytaj.',
          durationNotes: 'Zapytaj — bez dodatkowego formularza.',
          description,
          phone,
          email,
          slotId,
          liveMode,
        })

    try {
      await recordFunnelEvent({
        eventType: 'booking_form_submitted',
        bookingId: result.booking.id,
        source: 'server',
        pagePath: '/zapytaj',
        properties: {
          service_type: ZAPYTAJ_SERVICE_TYPE,
          live_mode: liveMode,
          animal_type: result.booking.animalType,
          amount: result.booking.amount,
          promotion: promoCode ? 'community-39-99' : null,
        },
      })
    } catch (analyticsError) {
      console.warn('[regulski-behawiorysta][zapytaj] funnel event failed', analyticsError)
    }

    return NextResponse.json(
      {
        ok: true,
        bookingId: result.booking.id,
        accessToken: result.accessToken,
        amount: result.booking.amount,
        redirectTo: buildZapytajPaymentHref(result.booking.id, result.accessToken),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    console.error('[regulski-behawiorysta][zapytaj] booking create failed', error)
    if (error instanceof PromoCodeValidationError) {
      return errorResponse(error.message, 400)
    }
    const failure = getBookingApiErrorSnapshot(error)
    return NextResponse.json(
      { error: failure.message, errorCode: failure.code },
      { status: failure.status, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
