export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { getLeadMagnetBySlug } from '@/lib/active-lead-magnets'
import { recordFunnelEvent } from '@/lib/server/db'
import { upsertGrowthSignup } from '@/lib/server/growth-signups'
import { syncNewsletterSubscriber } from '@/lib/server/mailerlite'
import { sendLeadMagnetDownloadEmail } from '@/lib/server/notifications'
import { consumeRequestRateLimit } from '@/lib/server/request-protection'

type SignupKind = 'newsletter' | 'lead_magnet'

function normalizeSingleLine(value: unknown, maxLength: number) {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized.length > 0 ? normalized.slice(0, maxLength) : null
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export async function POST(request: Request) {
  const rateLimit = consumeRequestRateLimit(request, {
    key: 'growth-signup',
    limit: 5,
    windowMs: 60 * 60 * 1000,
  })

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Zbyt wiele prób z tego połączenia. Spróbuj ponownie za chwilę.' },
      {
        status: 429,
        headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) },
      },
    )
  }

  let body: Record<string, unknown>

  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Nie udało się odczytać formularza.' }, { status: 400 })
  }

  const kind = normalizeSingleLine(body.kind, 32) as SignupKind | null
  const email = normalizeSingleLine(body.email, 160)
  const leadMagnetSlug = normalizeSingleLine(body.leadMagnetSlug, 120)
  const location = normalizeSingleLine(body.location, 120)
  const sourcePage = normalizeSingleLine(body.sourcePage, 160)
  const segment = normalizeSingleLine(body.segment, 16) ?? 'oba'
  const marketingOptIn = body.marketingOptIn === true
  const honeypot = normalizeSingleLine(body.website, 160) ?? ''

  if (honeypot) {
    // Nie ujawniamy automatom działania ochrony i nie tworzymy zapisu ani wysyłki.
    return NextResponse.json({ ok: true, message: 'Zapis przyjęty.' })
  }

  if (!kind || (kind !== 'newsletter' && kind !== 'lead_magnet')) {
    return NextResponse.json({ error: 'Nieprawidlowy typ zapisu.' }, { status: 400 })
  }

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: 'Podaj poprawny adres e-mail.' }, { status: 400 })
  }

  if (kind === 'lead_magnet' && !leadMagnetSlug) {
    return NextResponse.json({ error: 'Brakuje identyfikatora materiału.' }, { status: 400 })
  }

  const magnet = leadMagnetSlug ? getLeadMagnetBySlug(leadMagnetSlug) : null

  if (kind === 'lead_magnet' && !magnet) {
    return NextResponse.json({ error: 'Nie znaleziono materiału.' }, { status: 404 })
  }

  let signupId: string | null = null

  try {
    const signup = await upsertGrowthSignup({
      email,
      kind,
      leadMagnetSlug: magnet?.slug ?? null,
      location,
      sourcePage,
      segment,
      marketingOptIn,
    })
    signupId = signup.id
  } catch (error) {
    console.warn('[regulski-behawiorysta][growth-signup] signup save skipped', error)
  }

  try {
    await recordFunnelEvent({
      eventType: kind === 'newsletter' ? 'newsletter_signup' : 'lead_magnet_signup',
      source: 'server',
      pagePath: sourcePage,
      location,
      properties: {
        email_domain: email.split('@')[1] ?? null,
        signup_kind: kind,
        segment,
        lead_magnet_slug: magnet?.slug ?? null,
        marketing_opt_in: kind === 'lead_magnet' ? marketingOptIn : null,
      },
    })
  } catch (error) {
    console.warn('[regulski-behawiorysta][growth-signup] event record skipped', error)
  }

  if (kind === 'lead_magnet' && magnet) {
    let emailDelivery: 'sent' | 'skipped' | 'failed' = 'failed'

    try {
      emailDelivery = (await sendLeadMagnetDownloadEmail(email, magnet)).status
    } catch (error) {
      console.error('[regulski-behawiorysta][growth-signup] lead magnet email failed', error)
    }

    const message =
      emailDelivery === 'sent'
        ? 'Pobieranie rozpocznie się za chwilę. Wysłałem też dodatkowy link do materiału na podany e-mail.'
        : 'Pobieranie rozpocznie się za chwilę. Materiał jest dostępny bezpośrednio na tej stronie; nie potwierdziliśmy wysłania dodatkowego linku e-mail.'

    return NextResponse.json({
      ok: true,
      signupId,
      downloadUrl: `/api/lead-magnet/${encodeURIComponent(magnet.slug)}`,
      redirectTo: `/bezplatne-materialy/dziekuje?leadMagnet=${encodeURIComponent(magnet.slug)}`,
      emailDelivery,
      message,
    })
  }

  const provider = await syncNewsletterSubscriber({
    email,
    segment,
    sourcePage,
    location,
  })

  if (provider.status === 'failed') {
    console.warn('[regulski-behawiorysta][growth-signup] mailerlite sync failed', provider.reason)
  }

  const message =
    provider.status === 'synced'
      ? 'Zapis został przyjęty. O dalszych wiadomościach poinformujemy tylko przez aktywną listę newslettera.'
      : 'Zapis został zapisany po stronie serwisu, ale nie potwierdziliśmy przekazania go do listy newslettera. Nie będziemy obiecywać wiadomości e-mail.'

  return NextResponse.json({
    ok: true,
    signupId,
    provider: provider.status,
    message,
  })
}
