export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { sendBookRequestAutoReplyEmail, sendBookRequestEmail } from '@/lib/server/notifications'
import { createLeadBooking } from '@/lib/server/lead-bookings'
import type { BookingSpecies } from '@/lib/booking-routing'

type BookingServiceId = 'kwadrans-na-juz' | 'szybka-konsultacja-15-min' | 'konsultacja-30-min' | 'konsultacja-behawioralna-online'

type ValidatedBookPayload = {
  service: BookingServiceId
  serviceLabel: string
  servicePrice: string
  name: string
  email: string
  species: BookingSpecies
  description: string
  preferredSlots: string
  consentRodo: boolean
  consentRegulamin: boolean
  consentEarlyStart: boolean
  honeypot: string
}

const SERVICES: Record<BookingServiceId, { label: string; price: string }> = {
  'kwadrans-na-juz': { label: 'Kwadrans na juĹĽ', price: '99 zĹ‚' },
  'szybka-konsultacja-15-min': { label: '15-minutowa konsultacja behawioralna', price: '69 zĹ‚' },
  'konsultacja-30-min': { label: 'Dwa kwadranse', price: '169 zĹ‚' },
  'konsultacja-behawioralna-online': { label: 'PeĹ‚na konsultacja', price: '470 zĹ‚' },
}

const SUCCESS_MESSAGE = 'DostaĹ‚em TwojÄ… rezerwacjÄ™. WysĹ‚aĹ‚em teĹĽ kopiÄ™ na podany adres e-mail.'
const URGENT_SUCCESS_MESSAGE = 'Twoja proĹ›ba o Kwadrans na juĹĽ dotarĹ‚a. WysĹ‚aĹ‚em teĹĽ kopiÄ™ na podany adres e-mail.'
const GENERIC_ERROR_MESSAGE = 'Nie udaĹ‚o siÄ™ wysĹ‚aÄ‡ proĹ›by o rezerwacjÄ™. SprĂłbuj ponownie pĂłĹşniej.'
const UNAVAILABLE_MESSAGE = 'Rezerwacja mailowa jest chwilowo niedostÄ™pna. SprĂłbuj pĂłĹşniej albo napisz przez formularz kontaktowy.'

function normalizeSingleLine(value: unknown, maxLength: number) {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized.length > 0 ? normalized.slice(0, maxLength) : null
}

function normalizeLongText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.replace(/\r\n/g, '\n').trim()
  return normalized.length > 0 ? normalized.slice(0, maxLength) : null
}

function isEmailValid(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function validatePayload(body: Record<string, unknown>): { payload?: ValidatedBookPayload; error?: string } {
  const service = normalizeSingleLine(body.service, 80) as BookingServiceId | null
  const name = normalizeSingleLine(body.name, 120)
  const email = normalizeSingleLine(body.email, 160)
  const speciesValue = normalizeSingleLine(body.species, 16)
  const description = normalizeLongText(body.description, 1000)
  const preferredSlots = normalizeLongText(body.preferredSlots, 1200)
  const honeypot = normalizeSingleLine(body.honeypot, 120) ?? ''
  const consentRodo = body.consentRodo === true
  const consentRegulamin = body.consentRegulamin === true
  const consentEarlyStart = body.consentEarlyStart === true
  const serviceConfig = service ? SERVICES[service] : null
  const species = speciesValue === 'pies' || speciesValue === 'kot' ? speciesValue : null

  if (service === 'kwadrans-na-juz') {
    return { error: 'Kwadrans na juĹĽ ma osobny formularz z wyborem godzin na dziĹ›.' }
  }

  if (!serviceConfig || !name || !email || !species || !description || !preferredSlots) {
    return { error: 'UzupeĹ‚nij usĹ‚ugÄ™, imiÄ™, e-mail, gatunek, opis sytuacji i preferowane terminy.' }
  }

  if (!isEmailValid(email)) {
    return { error: 'Podaj poprawny adres e-mail.' }
  }

  if (description.length < 20) {
    return { error: 'Opis sytuacji powinien mieÄ‡ co najmniej 20 znakĂłw.' }
  }

  if (!consentRodo || !consentRegulamin || !consentEarlyStart) {
    return { error: 'Zaznacz wszystkie wymagane zgody.' }
  }

  return {
    payload: {
      service: service as BookingServiceId,
      serviceLabel: serviceConfig.label,
      servicePrice: serviceConfig.price,
      name,
      email,
      species,
      description,
      preferredSlots: preferredSlots ?? 'ChcÄ™ termin jak najszybciej - proszÄ™ o priorytetowÄ… odpowiedĹş z realnÄ… propozycjÄ… terminu.',
      consentRodo,
      consentRegulamin,
      consentEarlyStart,
      honeypot,
    },
  }
}

export async function POST(request: Request) {
  try {
    let body: Record<string, unknown>

    try {
      body = (await request.json()) as Record<string, unknown>
    } catch {
      return NextResponse.json({ error: 'Nie udaĹ‚o siÄ™ odczytaÄ‡ formularza rezerwacji.' }, { status: 400 })
    }

    const { payload, error } = validatePayload(body)

    if (!payload || error) {
      return NextResponse.json({ error: error ?? GENERIC_ERROR_MESSAGE }, { status: 400 })
    }

    if (payload.honeypot) {
      return NextResponse.json({ ok: true, message: payload.service === 'kwadrans-na-juz' ? URGENT_SUCCESS_MESSAGE : SUCCESS_MESSAGE })
    }

    // Create persistent lead booking record (with unique token for the customer page)
    let leadBooking = null
    try {
      leadBooking = await createLeadBooking({
        service: payload.service,
        serviceLabel: payload.serviceLabel,
        servicePrice: payload.servicePrice,
        name: payload.name,
        email: payload.email,
        species: payload.species,
        description: payload.description,
        preferredSlots: payload.preferredSlots,
      })
    } catch (storageError) {
      console.error('[regulski-behawiorysta][book] lead booking storage failed', storageError)
      // Continue with email-only flow if storage fails
    }

    const submissionWithToken = {
      ...payload,
      leadBookingId: leadBooking?.id,
      leadBookingAccessToken: leadBooking?.accessToken,
    }

    // Try sending notifications (best-effort)
    const adminDelivery = await sendBookRequestEmail(submissionWithToken)

    if (adminDelivery.status !== 'sent') {
      console.warn('[regulski-behawiorysta][book] admin email not sent', { status: adminDelivery.status, reason: adminDelivery.reason })
    }

    if (adminDelivery.status !== 'failed') {
      const customerDelivery = await sendBookRequestAutoReplyEmail(submissionWithToken)

      if (customerDelivery.status === 'failed') {
        console.error('[regulski-behawiorysta][book] auto-reply failed', customerDelivery.reason)
      } else if (customerDelivery.status === 'skipped') {
        console.warn('[regulski-behawiorysta][book] auto-reply skipped', customerDelivery.reason)
      }
    }

    // Return success if booking was created (emails are best-effort)
    if (leadBooking) {
      return NextResponse.json({
        ok: true,
        message: payload.service === 'kwadrans-na-juz' ? URGENT_SUCCESS_MESSAGE : SUCCESS_MESSAGE,
        bookingId: leadBooking?.id,
      })
    }

    // If no booking was created and admin email failed, return error
    if (adminDelivery.status === 'failed') {
      console.error('[regulski-behawiorysta][book] submission failed', adminDelivery.reason)
      return NextResponse.json({ error: GENERIC_ERROR_MESSAGE }, { status: 500 })
    }

    // Otherwise emails were skipped but booking should have been created
    return NextResponse.json({
      ok: true,
      message: payload.service === 'kwadrans-na-juz' ? URGENT_SUCCESS_MESSAGE : SUCCESS_MESSAGE,
      bookingId: null,
    })
  } catch (error) {
    console.error('[regulski-behawiorysta][book] unexpected error', error)
    return NextResponse.json({ error: GENERIC_ERROR_MESSAGE }, { status: 500 })
  }
}

