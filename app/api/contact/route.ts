export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { getPublicProblemOptionById, type FunnelSpecies } from '@/lib/funnel'
import { createUrgentNowRequest } from '@/lib/server/db'
import { ConfigurationError } from '@/lib/server/env'
import { sendContactLeadAutoReplyEmail, sendContactLeadEmail } from '@/lib/server/notifications'
import { getContactDetails } from '@/lib/site'
import { isUrgentNowIntent } from '@/lib/urgent-now'
import type { ProblemType } from '@/lib/types'

const SUCCESS_MESSAGE = 'Dziękuję za wiadomość. Wiadomość trafiła do mnie. Odpowiem na podany adres e-mail.'
const URGENT_SUCCESS_MESSAGE = 'Dziękuję. Prośba o Zapytaj teraz trafiła do mnie. Odpowiem priorytetowo na podany adres e-mail z realną propozycją terminu.'
const UNAVAILABLE_MESSAGE = 'Formularz kontaktowy jest chwilowo niedostępny. Spróbuj później lub napisz bezpośrednio.'
const GENERIC_ERROR_MESSAGE = 'Nie udało się wysłać wiadomości. Spróbuj ponownie później.'
const RATE_LIMIT_MESSAGE = 'Za dużo prób w krótkim czasie. Spróbuj ponownie za godzinę.'
const CONTACT_RATE_LIMIT_MAX = 3
const CONTACT_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000
const FORM_CONTENT_TYPES = ['application/x-www-form-urlencoded', 'multipart/form-data'] as const

type RateLimitEntry = {
  count: number
  resetAt: number
}

const globalRateLimitStore = globalThis as typeof globalThis & {
  __regulskiBehawiorystaContactRateLimitStore?: Map<string, RateLimitEntry>
}

const contactRateLimitStore =
  globalRateLimitStore.__regulskiBehawiorystaContactRateLimitStore ?? new Map<string, RateLimitEntry>()

if (!globalRateLimitStore.__regulskiBehawiorystaContactRateLimitStore) {
  globalRateLimitStore.__regulskiBehawiorystaContactRateLimitStore = contactRateLimitStore
}

type ValidatedContactLeadPayload = {
  name: string
  email: string
  phone?: string | null
  species: ContactLeadSpecies
  topicId: ProblemType
  topic: string
  message: string
  contextLabel: string
  serviceLabel?: string | null
  requestedDate?: string | null
  requestedTime?: string | null
  intent?: string | null
  bookingId?: string | null
  website?: string | null
  consentProcessing: boolean
  consentPolicy: boolean
}

type ContactLeadSpecies = FunnelSpecies | 'nie-wiem'

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

function contactRedirect(request: Request, params: { sent?: true; error?: string }) {
  const url = new URL('/kontakt', request.url)

  if (params.sent) {
    url.searchParams.set('sent', '1')
  } else if (params.error) {
    url.searchParams.set('error', params.error)
  }

  url.hash = 'formularz'

  return NextResponse.redirect(url, { status: 303 })
}

function contactSuccessResponse(request: Request, shouldRedirect: boolean, message: string) {
  if (shouldRedirect) {
    return contactRedirect(request, { sent: true })
  }

  return NextResponse.json({ ok: true, message })
}

function contactErrorResponse(
  request: Request,
  shouldRedirect: boolean,
  message: string,
  status: number,
  init?: ResponseInit,
) {
  if (shouldRedirect) {
    return contactRedirect(request, { error: message })
  }

  return NextResponse.json({ error: message }, { ...init, status })
}

function getUnavailableMessage(): string {
  const contact = getContactDetails()

  if (contact.email) {
    return `Formularz kontaktowy jest chwilowo niedostępny. Spróbuj później albo napisz na ${contact.email}.`
  }

  return UNAVAILABLE_MESSAGE
}

function normalizeSingleLine(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized.length > 0 ? normalized.slice(0, maxLength) : null
}

function normalizeLongText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.replace(/\r\n/g, '\n').trim()
  return normalized.length > 0 ? normalized.slice(0, maxLength) : null
}

function normalizeDate(value: unknown): string | null {
  const normalized = normalizeSingleLine(value, 32)
  return normalized && /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null
}

function normalizeTime(value: unknown): string | null {
  const normalized = normalizeSingleLine(value, 16)
  return normalized && /^\d{2}:\d{2}$/.test(normalized) ? normalized : null
}

function pickContactCandidate(body: Record<string, unknown>): string | null {
  return normalizeSingleLine(body.email, 160) ?? normalizeSingleLine(body.contact, 160)
}

function normalizeSpecies(value: unknown): ContactLeadSpecies | null {
  const species = normalizeSingleLine(value, 32)?.toLowerCase() ?? null

  if (species === 'pies' || species === 'kot') {
    return species
  }

  if (species === 'nie-wiem' || species === 'nie wiem' || species === 'unknown') {
    return 'nie-wiem'
  }

  return null
}

function getSpeciesLabel(species: ContactLeadSpecies) {
  if (species === 'nie-wiem') {
    return 'Nie wiem'
  }

  return species === 'kot' ? 'Kot' : 'Pies'
}

function getClientFingerprint(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const vercelForwardedFor = request.headers.get('x-vercel-forwarded-for')
  const candidate = forwardedFor?.split(',')[0] ?? realIp ?? vercelForwardedFor ?? 'unknown'

  return candidate.trim() || 'unknown'
}

function consumeContactRateLimit(request: Request): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  const now = Date.now()

  for (const [key, entry] of contactRateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      contactRateLimitStore.delete(key)
    }
  }

  const fingerprint = getClientFingerprint(request)
  const current = contactRateLimitStore.get(fingerprint)

  if (!current || current.resetAt <= now) {
    contactRateLimitStore.set(fingerprint, {
      count: 1,
      resetAt: now + CONTACT_RATE_LIMIT_WINDOW_MS,
    })
    return { allowed: true }
  }

  if (current.count >= CONTACT_RATE_LIMIT_MAX) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    }
  }

  current.count += 1
  contactRateLimitStore.set(fingerprint, current)
  return { allowed: true }
}

function validatePayload(body: Record<string, unknown>): { payload?: ValidatedContactLeadPayload; error?: string } {
  const name = normalizeSingleLine(body.name ?? body.displayName, 120)
  const contact = pickContactCandidate(body)
  const phone = normalizeSingleLine(body.phone ?? body.phoneNumber, 32)
  const species = normalizeSpecies(body.species)
  const topicId = normalizeSingleLine(body.topicId, 80)
  const knownSpecies = species === 'pies' || species === 'kot' ? species : null
  const topicOption = knownSpecies ? getPublicProblemOptionById(knownSpecies, topicId) : null
  const legacyTopic = normalizeSingleLine(body.topic, 120)
  const topic = species === 'nie-wiem' ? legacyTopic : topicOption?.title ?? legacyTopic ?? null
  const message = normalizeLongText(body.message, 1200)
  const bookingId = normalizeSingleLine(body.bookingId, 120) ?? null
  const website = normalizeSingleLine(body.website, 120) ?? ''
  const intent = normalizeSingleLine(body.intent, 80) ?? normalizeSingleLine(body.service, 80) ?? null
  const requestedDate = normalizeDate(body.requestedDate)
  const requestedTime = normalizeTime(body.requestedTime)
  const consentProcessing = isTruthyFormValue(body.consentProcessing)
  const consentPolicy = isTruthyFormValue(body.consentPolicy)
  const contextLabel =
    species && topic ? `${getSpeciesLabel(species)} • ${topic}` : topic ? `Kontakt • ${topic}` : null

  if (!name || !contact || !species || !topic || !message || !contextLabel) {
    return { error: 'Uzupełnij imię, adres e-mail, gatunek, temat i krótki opis problemu.' }
  }

  if (species !== 'nie-wiem' && !topicOption && !legacyTopic) {
    return { error: 'Wybierz temat.' }
  }

  if (message.length < 20) {
    return { error: 'Opisz problem w 2-4 zdaniach, żebym mógł wskazać najprostszy kolejny krok.' }
  }

  if (!consentProcessing || !consentPolicy) {
    return { error: 'Zaznacz zgodę na kontakt i akceptację polityki prywatności.' }
  }

  if (isUrgentNowIntent(intent) && species === 'nie-wiem') {
    return { error: 'Przy prośbie o pilny termin wybierz, czy sprawa dotyczy psa czy kota.' }
  }

  return {
    payload: {
      name,
      email: contact,
      phone,
      species,
      topicId: topicOption?.id ?? 'inne',
      topic,
      message,
      contextLabel,
      serviceLabel: isUrgentNowIntent(intent) ? 'Zapytaj teraz' : null,
      requestedDate,
      requestedTime,
      intent,
      bookingId,
      website,
      consentProcessing,
      consentPolicy,
    },
  }
}

export async function POST(request: Request) {
  const shouldRedirect = isFormSubmission(request)

  try {
    let body: Record<string, unknown>

    try {
      body = shouldRedirect ? formDataToBody(await request.formData()) : ((await request.json()) as Record<string, unknown>)
    } catch {
      return contactErrorResponse(request, shouldRedirect, 'Nie udało się odczytać formularza kontaktu.', 400)
    }

    const { payload, error } = validatePayload(body)

    if (error || !payload) {
      return contactErrorResponse(request, shouldRedirect, error ?? GENERIC_ERROR_MESSAGE, 400)
    }

    if (payload.website) {
      return contactSuccessResponse(request, shouldRedirect, isUrgentNowIntent(payload.intent) ? URGENT_SUCCESS_MESSAGE : SUCCESS_MESSAGE)
    }

    const rateLimit = consumeContactRateLimit(request)

    if (!rateLimit.allowed) {
      return contactErrorResponse(
        request,
        shouldRedirect,
        RATE_LIMIT_MESSAGE,
        429,
        {
          headers: {
            'Retry-After': String(rateLimit.retryAfterSeconds),
          },
        },
      )
    }

    if (isUrgentNowIntent(payload.intent) && payload.species !== 'nie-wiem') {
      await createUrgentNowRequest({
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        species: payload.species,
        topicId: payload.topicId,
        topicLabel: payload.topic,
        message: payload.message,
        requestedDate: payload.requestedDate ?? '',
        requestedTime: payload.requestedTime ?? '',
      })
    }

    const delivery = await sendContactLeadEmail(payload)

    if (delivery.status === 'sent') {
      const customerDelivery = await sendContactLeadAutoReplyEmail(payload)

      if (customerDelivery.status === 'failed') {
        console.error('[regulski-behawiorysta][contact] customer auto-reply failed', customerDelivery.reason)
      } else if (customerDelivery.status === 'skipped') {
        console.warn('[regulski-behawiorysta][contact] customer auto-reply skipped', customerDelivery.reason)
      }

      return contactSuccessResponse(request, shouldRedirect, isUrgentNowIntent(payload.intent) ? URGENT_SUCCESS_MESSAGE : SUCCESS_MESSAGE)
    }

    if (delivery.status === 'skipped') {
      console.warn('[regulski-behawiorysta][contact] submission skipped', delivery.reason)
      return contactErrorResponse(request, shouldRedirect, getUnavailableMessage(), 503)
    }

    console.error('[regulski-behawiorysta][contact] submission failed', delivery.reason)
    return contactErrorResponse(request, shouldRedirect, GENERIC_ERROR_MESSAGE, 500)
  } catch (error) {
    console.error('[regulski-behawiorysta][contact] unexpected error', error)

    if (error instanceof ConfigurationError) {
      return contactErrorResponse(request, shouldRedirect, getUnavailableMessage(), 503)
    }

    return contactErrorResponse(request, shouldRedirect, GENERIC_ERROR_MESSAGE, 500)
  }
}
