import { createHash } from 'node:crypto'
import {
  computeCallerPhoneFingerprint,
  computeCallerPhoneMasked,
  sanitizePayload,
  canonicalizePayload,
} from './call-session-security'
import {
  UrgentIntakeDayChoice,
  Section16InvalidTimezoneError,
  Section16PrivacyError,
  Section16ValidationError,
} from './section16-types'

// Limits & Defaults (Safe parameters with validated bounds)
export const MIN_HOLD_EXPIRY_MINUTES = 5
export const MAX_HOLD_EXPIRY_MINUTES = 120
export const DEFAULT_HOLD_EXPIRY_MINUTES = 30

export const MIN_OFFER_EXPIRY_MINUTES = 5
export const MAX_OFFER_EXPIRY_MINUTES = 60
export const DEFAULT_OFFER_EXPIRY_MINUTES = 15

export const DEFAULT_INTAKE_EXPIRY_HOURS = 24
export const DEFAULT_NOTIFICATION_QUEUE_EXPIRY_DAYS = 7
export const DEFAULT_TALK_ENTITLEMENT_ALLOCATED_SECONDS = 900 // 15 min
export const DEFAULT_TALK_ENTITLEMENT_VALIDITY_HOURS = 48

export interface WarsawDateDetails {
  date: string // YYYY-MM-DD
  time: string // HH:MM
  year: number
  month: number
  day: number
  hour: number
  minute: number
  isWeekend: boolean
}

/**
 * Returns current date and time components in Europe/Warsaw timezone.
 */
export function getWarsawDateDetails(now: Date = new Date()): WarsawDateDetails {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  }).formatToParts(now)

  const values = Object.fromEntries(parts.map((p) => [p.type, p.value]))
  const year = Number(values.year)
  const month = Number(values.month)
  const day = Number(values.day)
  const hour = Number(values.hour)
  const minute = Number(values.minute)
  const weekday = values.weekday

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
    year,
    month,
    day,
    hour,
    minute,
    isWeekend: weekday === 'Sat' || weekday === 'Sun',
  }
}

/**
 * Calculates the exact target date for "today" or "tomorrow" in Europe/Warsaw.
 */
export function resolveWarsawIntakeTargetDate(
  dayChoice: UrgentIntakeDayChoice,
  now: Date = new Date(),
): string {
  const warsaw = getWarsawDateDetails(now)
  if (dayChoice === 'today') {
    return warsaw.date
  }
  if (dayChoice === 'tomorrow') {
    // Add 1 calendar day safely in UTC midday to avoid DST transition shifts
    const [y, m, d] = warsaw.date.split('-').map(Number)
    const nextDayUtc = new Date(Date.UTC(y, m - 1, d + 1, 12, 0, 0))
    const nextParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Warsaw',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(nextDayUtc)
    const nextVals = Object.fromEntries(nextParts.map((p) => [p.type, p.value]))
    return `${nextVals.year}-${nextVals.month}-${nextVals.day}`
  }

  throw new Section16ValidationError(`Niedozwolony wybór dnia: ${dayChoice}`)
}

/**
 * Validates that the specified targetDate matches the expected Warsaw date for today/tomorrow.
 */
export function validateWarsawIntakeTargetDate(
  dayChoice: UrgentIntakeDayChoice,
  targetDate: string,
  now: Date = new Date(),
): boolean {
  const expected = resolveWarsawIntakeTargetDate(dayChoice, now)
  if (targetDate !== expected) {
    throw new Section16InvalidTimezoneError(
      `Niezgodność daty docelowej dla wyboru "${dayChoice}" w strefie Europe/Warsaw: oczekiwano ${expected}, otrzymano ${targetDate}`,
    )
  }
  return true
}

/**
 * Validates the contract for reversible contact ciphertext.
 * Plaintext phone numbers or emails are strictly rejected.
 * Must be null or a ciphertext string starting with "enc:" with length >= 16.
 */
export function validateContactCiphertextContract(ciphertext?: string | null): void {
  if (!ciphertext) {
    return
  }

  const trimmed = ciphertext.trim()
  if (trimmed.length < 16) {
    throw new Section16PrivacyError(
      'contactCiphertext musi mieć co najmniej 16 znaków (kontrakt szyfrowanego blobu)',
    )
  }

  if (!trimmed.startsWith('enc:')) {
    throw new Section16PrivacyError(
      'contactCiphertext musi spełniać kontrakt zaszyfrowanego blobu (przedrostek "enc:")',
    )
  }

  // Strictly check that someone hasn't just prefixed a raw phone number or email with enc:
  const payload = trimmed.slice(4)
  const phonePattern = /(?:(?:\+|00)?48[\s.-]*)?(?:\d[\s.-]*){9}/
  const emailPattern = /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/
  if (phonePattern.test(payload) || emailPattern.test(payload)) {
    throw new Section16PrivacyError(
      'Niedozwolona próba zapisu jawnego numeru lub adresu email w polu contactCiphertext',
    )
  }
}

/**
 * Computes deterministic SHA-256 hash of a canonicalized payload for idempotency verification.
 */
export function computeSection16PayloadHash(payload: unknown): string {
  const sanitized = sanitizePayload(payload ?? {})
  return createHash('sha256').update(canonicalizePayload(sanitized)).digest('hex')
}

export {
  computeCallerPhoneFingerprint,
  computeCallerPhoneMasked,
  sanitizePayload,
  canonicalizePayload,
}
