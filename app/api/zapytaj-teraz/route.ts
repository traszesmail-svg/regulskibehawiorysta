import { NextResponse } from 'next/server'
import { normalizePolishPhone } from '@/lib/phone'
import { createUrgentNowRequest } from '@/lib/server/db'
import { sendUrgentNowAdminAlertEmail } from '@/lib/server/notifications'
import { getZapytajLiveStatus } from '@/lib/server/zapytaj-live'
import { getWarsawDateAndDay, isUrgentNowDailyLimitError, isZapytajTodayIntakeOpen, validateZapytajUrgentPreference } from '@/lib/urgent-now-policy'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const globalStore = globalThis as typeof globalThis & { __zapytajDzisRateLimit?: Map<string, number> }
const rateLimit = globalStore.__zapytajDzisRateLimit ?? new Map<string, number>()
globalStore.__zapytajDzisRateLimit ??= rateLimit

async function isIntakeOpen() {
  try {
    const live = await getZapytajLiveStatus()
    return isZapytajTodayIntakeOpen(live)
  } catch {
    return false
  }
}

export async function GET() {
  return NextResponse.json({ accepting: await isIntakeOpen() }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>
    const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ').slice(0, 120) : ''
    const phoneInput = typeof body.phone === 'string' ? body.phone.trim().slice(0, 40) : ''
    const phone = normalizePolishPhone(phoneInput)?.display
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 600) : ''
    const requestedDate = typeof body.requestedDate === 'string' ? body.requestedDate : ''
    const requestedTime = typeof body.requestedTime === 'string' ? body.requestedTime : ''
    if (!name || !phone || message.length < 10 || body.consent !== true || body.policy !== true) {
      return NextResponse.json({ error: 'Podaj imię, prawidłowy numer telefonu, krótki opis i zaznacz wymagane zgody.' }, { status: 400 })
    }
    const preferenceError = validateZapytajUrgentPreference(requestedDate, requestedTime)
    if (preferenceError) {
      return NextResponse.json({ error: preferenceError === 'invalid_date' ? 'Wybierz dziś albo jutro.' : preferenceError === 'past_time' ? 'Wybierz godzinę, od której możesz rozmawiać.' : 'Wybierz godzinę między 8:00 a 20:00, w odstępach co 30 minut.' }, { status: 400 })
    }
    if (!(await isIntakeOpen())) return NextResponse.json({ error: 'Przyjmowanie zgłoszeń o rozmowę dziś jest zamknięte. Wybierz zwykły termin w kalendarzu.' }, { status: 409 })

    const fingerprint = (request.headers.get('x-forwarded-for')?.split(',')[0] ?? request.headers.get('x-real-ip') ?? 'unknown').trim()
    const now = Date.now()
    for (const [key, expiry] of rateLimit) if (expiry <= now) rateLimit.delete(key)
    if (rateLimit.has(fingerprint)) return NextResponse.json({ error: 'Zgłoszenie zostało już wysłane. Spróbuj ponownie później.' }, { status: 429 })
    rateLimit.set(fingerprint, now + 15 * 60 * 1000)

    const { isWeekend } = getWarsawDateAndDay()
    if (isWeekend) return NextResponse.json({ error: 'Przyjmowanie zgłoszeń o rozmowę dziś jest zamknięte.' }, { status: 409 })
    let record
    try {
      record = await createUrgentNowRequest({
        name, email: '', phone, contactPreference: 'payment_link', species: null,
        topicId: 'inne', topicLabel: 'Pilny termin — Zapytaj teraz', message,
        requestedDate, requestedTime,
      })
    } catch (error) {
      if (isUrgentNowDailyLimitError(error)) return NextResponse.json({ error: 'Dzisiejsze zgłoszenia zostały już przyjęte. Wybierz zwykły termin w kalendarzu.' }, { status: 409 })
      if (error instanceof Error && error.message === 'URGENT_NOW_WEEKEND') return NextResponse.json({ error: 'Przyjmowanie zgłoszeń o rozmowę dziś jest zamknięte.' }, { status: 409 })
      throw error
    }

    await sendUrgentNowAdminAlertEmail({
      requestId: record.id, name, email: '', phone, topic: 'Pilny termin — Zapytaj teraz', species: 'Nie podano',
      message, requestedDate, requestedTime,
      requestedSlotsSummary: `Najwcześniejsza dyspozycyjność klienta: ${requestedDate} od ${requestedTime}`,
      contactPreference: 'payment_link',
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[zapytaj-teraz] failed to accept request', error)
    return NextResponse.json({ error: 'Nie udało się przyjąć zgłoszenia. Spróbuj ponownie.' }, { status: 500 })
  }
}
