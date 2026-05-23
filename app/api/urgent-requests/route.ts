export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { getPublicProblemOptionById, type FunnelSpecies } from '@/lib/funnel'
import { createUrgentNowRequest } from '@/lib/server/db'
import { sendUrgentNowAdminAlertEmail, sendUrgentNowCustomerAckEmail } from '@/lib/server/notifications'
import {
  appendUrgentRequestedSlotsToMessage,
  formatUrgentRequestedSlots,
  type UrgentRequestedSlot,
} from '@/lib/urgent-now'
import type { ProblemType } from '@/lib/types'

const SUCCESS_MESSAGE =
  'Prośba trafiła do mnie. Odpiszę priorytetowo na podany adres e-mail z realną propozycją godziny i linkiem do płatności.'

const RATE_LIMIT_MAX = 3
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000

type RateLimitEntry = { count: number; resetAt: number }
const globalStore = globalThis as typeof globalThis & {
  __urgentRateLimitStore?: Map<string, RateLimitEntry>
}
const rateLimitStore =
  globalStore.__urgentRateLimitStore ?? new Map<string, RateLimitEntry>()
if (!globalStore.__urgentRateLimitStore) {
  globalStore.__urgentRateLimitStore = rateLimitStore
}

type ValidatedUrgentPayload = {
  name: string
  email: string
  species: FunnelSpecies
  topicId: ProblemType
  topicLabel: string
  message: string
  requestedDate: string
  requestedTime: string
  requestedSlots: UrgentRequestedSlot[]
  website: string
}

function normalizeSingleLine(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null
  const s = value.trim().replace(/\s+/g, ' ')
  return s.length > 0 ? s.slice(0, maxLength) : null
}

function normalizeLongText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null
  const s = value.replace(/\r\n/g, '\n').trim()
  return s.length > 0 ? s.slice(0, maxLength) : null
}

function normalizeDate(value: unknown): string | null {
  const s = normalizeSingleLine(value, 32)
  return s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null
}

function normalizeTime(value: unknown): string | null {
  const s = normalizeSingleLine(value, 16)
  return s && /^\d{2}:\d{2}$/.test(s) ? s : null
}

function getWarsawDateInputValue(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function getWarsawMinutes(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Warsaw',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return Number(values.hour) * 60 + Number(values.minute)
}

function getTimeMinutes(value: string) {
  const [hour, minute] = value.split(':').map(Number)
  return hour * 60 + minute
}

function isHalfHourTime(value: string) {
  const minute = Number(value.slice(3, 5))
  return minute === 0 || minute === 30
}

function normalizeRequestedSlots(value: unknown): UrgentRequestedSlot[] {
  if (!Array.isArray(value)) return []

  const seen = new Set<string>()
  const slots: UrgentRequestedSlot[] = []

  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const candidate = item as Record<string, unknown>
    const date = normalizeDate(candidate.date)
    const time = normalizeTime(candidate.time)
    if (!date || !time) continue
    const key = `${date}-${time}`
    if (seen.has(key)) continue
    seen.add(key)
    slots.push({ date, time })
  }

  return slots
    .sort((left, right) => `${left.date}T${left.time}`.localeCompare(`${right.date}T${right.time}`))
}

function normalizeSpecies(value: unknown): FunnelSpecies | null {
  const s = normalizeSingleLine(value, 32)?.toLowerCase() ?? null
  return s === 'pies' || s === 'kot' ? s : null
}

function getFingerprint(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  const real = req.headers.get('x-real-ip')
  const vercel = req.headers.get('x-vercel-forwarded-for')
  return (fwd?.split(',')[0] ?? real ?? vercel ?? 'unknown').trim() || 'unknown'
}

function consumeRateLimit(req: Request): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) rateLimitStore.delete(key)
  }
  const fp = getFingerprint(req)
  const current = rateLimitStore.get(fp)
  if (!current || current.resetAt <= now) {
    rateLimitStore.set(fp, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true }
  }
  if (current.count >= RATE_LIMIT_MAX) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) }
  }
  current.count += 1
  return { allowed: true }
}

function validate(body: Record<string, unknown>): { payload?: ValidatedUrgentPayload; error?: string } {
  const name = normalizeSingleLine(body.name, 120)
  const email = normalizeSingleLine(body.email, 160)
  const species = normalizeSpecies(body.species)
  const topicId = normalizeSingleLine(body.topicId, 80)
  const topicOption = species ? getPublicProblemOptionById(species, topicId) : null
  const message = normalizeLongText(body.message, 600)
  const requestedDate = normalizeDate(body.requestedDate)
  const requestedTime = normalizeTime(body.requestedTime)
  const requestedSlotsFromBody = normalizeRequestedSlots(body.requestedSlots)
  const requestedSlots =
    requestedSlotsFromBody.length > 0
      ? requestedSlotsFromBody
      : requestedDate && requestedTime
        ? [{ date: requestedDate, time: requestedTime }]
        : []
  const website = normalizeSingleLine(body.website, 120) ?? ''
  const consentProcessing = body.consentProcessing === true
  const consentPolicy = body.consentPolicy === true

  const todayDate = getWarsawDateInputValue()
  const earliestSlotMinutes = Math.ceil(getWarsawMinutes() / 30) * 30

  if (!name || !email) return { error: 'Uzupełnij imię i adres e-mail.' }
  if (!species || !topicOption) return { error: 'Wybierz gatunek i temat konsultacji.' }
  if (!message || message.length < 10) return { error: 'Opisz krótko sytuację.' }
  if (!requestedDate || !requestedTime) return { error: 'Podaj preferowaną datę i godzinę.' }
  if (requestedSlots.length < 3 || requestedSlots.length > 5) return { error: 'Wybierz od 3 do 5 godzin na dziś.' }
  if (new Set(requestedSlots.map((slot) => slot.date)).size !== 1) return { error: 'Wybierz godziny z jednego dnia.' }
  if (requestedSlots.some((slot) => slot.date !== todayDate)) return { error: 'Kwadrans na już przyjmuje tylko godziny na dzisiaj.' }
  if (requestedSlots.some((slot) => !isHalfHourTime(slot.time))) return { error: 'Wybierz półgodzinne okna czasowe.' }
  if (requestedSlots.some((slot) => getTimeMinutes(slot.time) > 18 * 60)) return { error: 'Wybierz godziny najpóźniej do 18:00.' }
  if (requestedSlots.some((slot) => getTimeMinutes(slot.time) < earliestSlotMinutes)) {
    return { error: 'Wybierz godziny od najbliższego dostępnego okna.' }
  }
  if (!consentProcessing || !consentPolicy) return { error: 'Zaznacz zgodę na kontakt i akceptację polityki prywatności.' }

  return {
    payload: {
      name,
      email,
      species,
      topicId: topicOption.id,
      topicLabel: topicOption.title,
      message,
      requestedDate: requestedSlots[0].date,
      requestedTime: requestedSlots[0].time,
      requestedSlots,
      website,
    },
  }
}

export async function POST(request: Request) {
  try {
    let body: Record<string, unknown>
    try {
      body = (await request.json()) as Record<string, unknown>
    } catch {
      return NextResponse.json({ error: 'Nie udało się odczytać formularza.' }, { status: 400 })
    }

    if (body.website) {
      return NextResponse.json({ ok: true, message: SUCCESS_MESSAGE })
    }

    const { payload, error } = validate(body)
    if (error || !payload) {
      return NextResponse.json({ error: error ?? 'Błąd walidacji.' }, { status: 400 })
    }

    const rateLimit = consumeRateLimit(request)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Za dużo prób w krótkim czasie. Spróbuj ponownie za godzinę.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } },
      )
    }

    const selectedSlotsSummary = formatUrgentRequestedSlots(payload.requestedSlots)
    const storedMessage = appendUrgentRequestedSlotsToMessage(payload.message, payload.requestedSlots)

    const record = await createUrgentNowRequest({
      name: payload.name,
      email: payload.email,
      phone: null,
      species: payload.species,
      topicId: payload.topicId,
      topicLabel: payload.topicLabel,
      message: storedMessage,
      requestedDate: payload.requestedDate,
      requestedTime: payload.requestedTime,
    })

    const speciesLabel = payload.species === 'kot' ? 'Kot' : 'Pies'

    await Promise.allSettled([
      sendUrgentNowCustomerAckEmail({
        requestId: record.id,
        name: payload.name,
        email: payload.email,
        phone: null,
        topic: payload.topicLabel,
        species: speciesLabel,
        message: payload.message,
        requestedDate: payload.requestedDate,
        requestedTime: payload.requestedTime,
        requestedSlotsSummary: selectedSlotsSummary,
      }),
      sendUrgentNowAdminAlertEmail({
        requestId: record.id,
        name: payload.name,
        email: payload.email,
        phone: null,
        topic: payload.topicLabel,
        species: speciesLabel,
        message: payload.message,
        requestedDate: payload.requestedDate,
        requestedTime: payload.requestedTime,
        requestedSlotsSummary: selectedSlotsSummary,
      }),
    ])

    return NextResponse.json({ ok: true, message: SUCCESS_MESSAGE, requestId: record.id })
  } catch (err) {
    console.error('[regulski-behawiorysta][urgent-requests] unexpected error', err)
    return NextResponse.json({ error: 'Nie udało się wysłać prośby. Spróbuj ponownie.' }, { status: 500 })
  }
}
