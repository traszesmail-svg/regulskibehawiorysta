export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { getPublicProblemOptionById, type FunnelSpecies } from '@/lib/funnel'
import { createUrgentNowRequest, listAvailabilityBetween, listBookings } from '@/lib/server/db'
import { sendUrgentNowAdminAlertEmail, sendUrgentNowCustomerAckEmail } from '@/lib/server/notifications'
import { addWarsawDateDays, getWarsawDateAndDay, isUrgentNowDailyLimitError } from '@/lib/urgent-now-policy'
import type { ProblemType } from '@/lib/types'
import { normalizePolishPhone } from '@/lib/phone'
import { getZapytajLiveStatus } from '@/lib/server/zapytaj-live'
import { isAvailabilitySlotBookableForService } from '@/lib/scheduling/rules'
import { isZapytajLiveSlot } from '@/lib/zapytaj-flow'

const SUCCESS_MESSAGE = 'Prośba została przyjęta. Operator skontaktuje się z Tobą po ustaleniu rzeczywistej godziny. Zgłoszenie nie rezerwuje terminu.'
const RATE_LIMIT_MAX = 3
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000
type RateLimitEntry = { count: number; resetAt: number }
const globalStore = globalThis as typeof globalThis & { __urgentRateLimitStore?: Map<string, RateLimitEntry> }
const rateLimitStore = globalStore.__urgentRateLimitStore ?? new Map<string, RateLimitEntry>()
globalStore.__urgentRateLimitStore ??= rateLimitStore

type ContactPreference = 'payment_link' | 'notify_only'
type ValidatedUrgentPayload = {
  name: string
  email: string
  phone: string
  contactPreference: ContactPreference
  species: FunnelSpecies
  topicId: ProblemType
  topicLabel: string
  message: string
  requestedDate: string
  website: string
}

function singleLine(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized ? normalized.slice(0, maxLength) : null
}

function longText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.replace(/\r\n/g, '\n').trim()
  return normalized ? normalized.slice(0, maxLength) : null
}

function getFingerprint(req: Request) {
  return (req.headers.get('x-forwarded-for')?.split(',')[0] ?? req.headers.get('x-real-ip') ?? req.headers.get('x-vercel-forwarded-for') ?? 'unknown').trim() || 'unknown'
}

function consumeRateLimit(req: Request) {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore) if (entry.resetAt <= now) rateLimitStore.delete(key)
  const key = getFingerprint(req)
  const current = rateLimitStore.get(key)
  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true as const }
  }
  if (current.count >= RATE_LIMIT_MAX) return { allowed: false as const, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) }
  current.count += 1
  return { allowed: true as const }
}

function validate(body: Record<string, unknown>, targetDate: string): { payload?: ValidatedUrgentPayload; error?: string } {
  const name = singleLine(body.name, 120)
  const email = singleLine(body.email, 160)
  const phone = normalizePolishPhone(singleLine(body.phone, 40))?.display ?? null
  const speciesValue = singleLine(body.species, 32)?.toLowerCase()
  const species = speciesValue === 'pies' || speciesValue === 'kot' ? speciesValue : null
  const topicId = singleLine(body.topicId, 80)
  const topicOption = species ? getPublicProblemOptionById(species, topicId) : null
  const message = longText(body.message, 600)
  const contactPreference = body.contactPreference === 'payment_link' || body.contactPreference === 'notify_only' ? body.contactPreference : null
  const consentProcessing = body.consentProcessing === true
  const consentPolicy = body.consentPolicy === true
  const website = singleLine(body.website, 120) ?? ''

  if (!name || !email) return { error: 'Podaj imię i adres e-mail.' }
  if (!phone) return { error: 'Podaj prawidłowy numer telefonu.' }
  if (!species || !topicOption) return { error: 'Wybierz gatunek i temat.' }
  if (!message || message.length < 10) return { error: 'Opisz krótko sytuację.' }
  if (!contactPreference) return { error: 'Wybierz sposób kontaktu.' }
  if (!consentProcessing || !consentPolicy) return { error: 'Zaznacz wymagane zgody.' }

  return {
    payload: {
      name, email, phone, contactPreference, species,
      topicId: topicOption.id,
      topicLabel: topicOption.title,
      message,
      requestedDate: targetDate,
      website,
    },
  }
}

export async function POST(request: Request) {
  try {
    let body: Record<string, unknown>
    try {
      body = await request.json() as Record<string, unknown>
    } catch {
      return NextResponse.json({ error: 'Nie udało się odczytać formularza.' }, { status: 400 })
    }
    if (body.website) return NextResponse.json({ ok: true, message: SUCCESS_MESSAGE })

    const { date: today, isWeekend } = getWarsawDateAndDay()
    if (isWeekend) return NextResponse.json({ error: 'Zapytaj teraz jest dostępne w dni robocze. Wybierz termin w kalendarzu lub powiadomienie o dostępności.' }, { status: 400 })

    const liveStatus = await getZapytajLiveStatus()
    if (liveStatus.status === 'available_now') {
      return NextResponse.json({ error: 'Okno jest aktywne. Wybierz konkretną dostępną godzinę w kalendarzu; zgłoszenie bez ustalonego terminu nie pobiera płatności.' }, { status: 409 })
    }

    const availability = await listAvailabilityBetween(today, addWarsawDateDays(today, 60))
    const now = new Date()
    const nextAvailable = availability.find((group) => group.slots.some((slot) => !isZapytajLiveSlot(slot.id) && isAvailabilitySlotBookableForService(slot, 'szybka-konsultacja-15-min', now)))
    const targetDate = typeof body.targetDate === 'string' ? body.targetDate : ''
    if (!nextAvailable || nextAvailable.date !== targetDate) {
      return NextResponse.json({ error: 'Zmienił się najbliższy dostępny dzień. Odśwież stronę i sprawdź dostępność ponownie.' }, { status: 409 })
    }
    const { payload, error } = validate(body, targetDate)
    if (!payload || error) return NextResponse.json({ error: error ?? 'Nieprawidłowe dane formularza.' }, { status: 400 })
    const rateLimit = consumeRateLimit(request)
    if (!rateLimit.allowed) return NextResponse.json({ error: 'Za dużo prób w krótkim czasie. Spróbuj ponownie później.' }, { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } })

    const preferenceLabel = payload.contactPreference === 'payment_link'
      ? 'Preferencja: po ustaleniu godziny klient chce otrzymać link do płatności.'
      : 'Preferencja: klient chce wyłącznie powiadomienie o dostępności.'
    const storedMessage = `${payload.message}\n\n${preferenceLabel}`
    let record
    try {
      record = await createUrgentNowRequest({
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        contactPreference: payload.contactPreference,
        species: payload.species,
        topicId: payload.topicId,
        topicLabel: payload.topicLabel,
        message: storedMessage,
        requestedDate: payload.requestedDate,
        requestedTime: '00:00',
      })
    } catch (error) {
      if (isUrgentNowDailyLimitError(error)) {
        return NextResponse.json({ error: 'Limit zgłoszeń na wybrany dzień został wykorzystany. Możesz wybrać zwykły termin albo poprosić o powiadomienie.' }, { status: 409 })
      }
      if (error instanceof Error && error.message === 'URGENT_NOW_WEEKEND') {
        return NextResponse.json({ error: 'Zapytaj teraz jest dostępne w dni robocze.' }, { status: 400 })
      }
      if (error instanceof Error && error.message === 'URGENT_NOW_DATE_CHANGED') {
        return NextResponse.json({ error: 'Zmienił się dzień. Odśwież stronę i spróbuj ponownie.' }, { status: 409 })
      }
      throw error
    }

    const speciesLabel = payload.species === 'kot' ? 'Kot' : 'Pies'
    await Promise.allSettled([
      sendUrgentNowCustomerAckEmail({
        requestId: record.id, name: payload.name, email: payload.email, phone: payload.phone,
        topic: payload.topicLabel, species: speciesLabel, message: storedMessage,
        contactPreference: payload.contactPreference,
        requestedDate: payload.requestedDate, requestedTime: '', requestedSlotsSummary: 'Godzinę ustala operator; zgłoszenie nie rezerwuje terminu.',
      }),
      sendUrgentNowAdminAlertEmail({
        requestId: record.id, name: payload.name, email: payload.email, phone: payload.phone,
        topic: payload.topicLabel, species: speciesLabel, message: storedMessage,
        requestedDate: payload.requestedDate, requestedTime: '', requestedSlotsSummary: `Telefon: ${payload.phone}. ${preferenceLabel}`,
      }),
    ])
    const message = payload.contactPreference === 'payment_link'
      ? 'Zgłoszenie przyjęte. Po ustaleniu godziny operator wyśle link do płatności. To nie jest rezerwacja.'
      : 'Zgłoszenie przyjęte. Operator przekaże Ci informację o dostępności. To nie jest rezerwacja.'
    return NextResponse.json({ ok: true, message, requestId: record.id })
  } catch (error) {
    console.error('[regulski-behawiorysta][urgent-requests] unexpected error', error)
    return NextResponse.json({ error: 'Nie udało się wysłać prośby. Spróbuj ponownie.' }, { status: 500 })
  }
}
