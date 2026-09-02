import { NextResponse } from 'next/server'
import { recordFunnelEvent } from '@/lib/server/db'
import { normalizePolishPhone } from '@/lib/phone'
import { upsertZapytajLiveNotification, type ZapytajLiveNotificationChannel } from '@/lib/server/zapytaj-notifications'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function isTruthy(value: unknown) {
  return value === true || value === 'true' || value === '1' || value === 'on' || value === 'yes'
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function errorResponse(message: string, status: 400 | 503) {
  return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  let body: Record<string, unknown>

  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return errorResponse('Nie udało się odczytać formularza.', 400)
  }

  if (body.channel !== 'sms' && body.channel !== 'email') {
    return errorResponse('Wybierz kanał powiadomienia.', 400)
  }

  const channel: ZapytajLiveNotificationChannel = body.channel
  const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const normalizedPhone = phone ? normalizePolishPhone(phone) : null

  if (!isTruthy(body.consentAvailability)) {
    return errorResponse('Zaznacz zgodę na jednorazowe powiadomienie o dostępności.', 400)
  }

  if (phone && !normalizedPhone) {
    return errorResponse('Podaj poprawny polski numer telefonu.', 400)
  }

  if (email && (email.length > 200 || !isEmail(email))) {
    return errorResponse('Podaj poprawny adres e-mail.', 400)
  }

  if (channel === 'sms' && !normalizedPhone) {
    return errorResponse('Podaj numer telefonu do powiadomienia SMS.', 400)
  }

  if (channel === 'email' && !email) {
    return errorResponse('Podaj adres e-mail do powiadomienia.', 400)
  }

  try {
    const record = await upsertZapytajLiveNotification({
      phone: normalizedPhone?.e164 ?? null,
      email: email || null,
      channel,
      sourcePage: '/zapytaj',
    })

    try {
      await recordFunnelEvent({
        eventType: 'notification_optin_submitted',
        source: 'server',
        pagePath: '/zapytaj',
        properties: {
          notification_channel: channel,
          email_fallback_available: Boolean(email),
        },
      })
    } catch (analyticsError) {
      console.warn('[regulski-behawiorysta][zapytaj] notification funnel event failed', analyticsError)
    }

    return NextResponse.json(
      {
        ok: true,
        id: record.id,
        message:
          channel === 'sms'
            ? 'Zapisane. Przy włączeniu rozmowy teraz system spróbuje wysłać jednorazowy SMS. To nie rezerwuje miejsca.'
            : 'Zapisane. Przy włączeniu rozmowy teraz system spróbuje wysłać jednorazowy e-mail. To nie rezerwuje miejsca.',
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    console.error('[regulski-behawiorysta][zapytaj] notification save failed', error)
    return errorResponse('Powiadomienie chwilowo jest niedostępne. Spróbuj ponownie za moment.', 503)
  }
}
