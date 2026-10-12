import { createHash, createHmac } from 'node:crypto'
import { maskPhoneForLogs, normalizePolishPhone } from '@/lib/phone'
import {
  CallSessionInvalidPhoneError,
  CallSessionSecurityError,
} from './call-session-types'

export const MIN_CALL_SESSION_PHONE_SECRET_LENGTH = 16

export function getCallSessionPhoneSecret(secretOverride?: string): string {
  if (secretOverride) {
    if (secretOverride.length < MIN_CALL_SESSION_PHONE_SECRET_LENGTH) {
      throw new CallSessionSecurityError(
        `CALL_SESSION_PHONE_SECRET musi mieć co najmniej ${MIN_CALL_SESSION_PHONE_SECRET_LENGTH} znaków`,
      )
    }
    return secretOverride
  }

  const configured = process.env.CALL_SESSION_PHONE_SECRET?.trim()
  if (configured) {
    if (configured.length < MIN_CALL_SESSION_PHONE_SECRET_LENGTH) {
      throw new CallSessionSecurityError(
        `CALL_SESSION_PHONE_SECRET musi mieć co najmniej ${MIN_CALL_SESSION_PHONE_SECRET_LENGTH} znaków`,
      )
    }
    return configured
  }

  // Safe non-production salt allowed ONLY in explicitly isolated local/test modes.
  const mode = process.env.APP_DATA_MODE?.trim().toLowerCase()
  if (mode === 'local' || mode === 'test') {
    return 'call-session-test-salt'
  }

  throw new CallSessionSecurityError(
    'Brak wymaganego CALL_SESSION_PHONE_SECRET w środowisku produkcyjnym/Supabase (fail-closed)',
  )
}

export function computeCallerPhoneFingerprint(rawPhone: string, secretOverride?: string): string {
  if (!rawPhone || typeof rawPhone !== 'string' || !rawPhone.trim()) {
    throw new CallSessionInvalidPhoneError('Nieprawidłowy lub pusty numer telefonu rozmówcy')
  }
  const normalized = normalizePolishPhone(rawPhone)
  if (!normalized) {
    throw new CallSessionInvalidPhoneError('Nieprawidłowy lub pusty numer telefonu rozmówcy')
  }
  const phoneKey = normalized.e164
  const secret = getCallSessionPhoneSecret(secretOverride)

  const digest = createHmac('sha256', secret)
    .update(`call_session_phone:${phoneKey}`)
    .digest('hex')

  return `call_fp:${digest}`
}

export function computeCallerPhoneMasked(rawPhone: string): string {
  if (!rawPhone || typeof rawPhone !== 'string' || !rawPhone.trim()) {
    throw new CallSessionInvalidPhoneError('Nieprawidłowy lub pusty numer telefonu rozmówcy')
  }
  const normalized = normalizePolishPhone(rawPhone)
  if (!normalized) {
    throw new CallSessionInvalidPhoneError('Nieprawidłowy lub pusty numer telefonu rozmówcy')
  }
  const masked = maskPhoneForLogs(normalized.e164)
  return masked ?? `${normalized.display.slice(0, 7)} *** ${normalized.display.slice(-3)}`
}

const SENSITIVE_PHONE_KEY_REGEX = /^(?:.*_)?(?:phone|mobile|tel|telephone|msisdn|komorka|telefon)(?:_.*)?$/i
const SENSITIVE_SECRET_KEY_REGEX = /^(?:.*_)?(?:secret|token|password|haslo|auth)(?:_.*)?$/i
const PHONE_NUMBER_IN_TEXT_REGEX = /(?:(?:\+|00)?48[\s.-]*)?(?:\d[\s.-]*){9}/g

export function isSensitivePhoneKey(key: string): boolean {
  return SENSITIVE_PHONE_KEY_REGEX.test(key)
}

export function isSensitiveSecretKey(key: string): boolean {
  return SENSITIVE_SECRET_KEY_REGEX.test(key)
}

function sanitizeString(value: string, key?: string): string {
  if (key && isSensitiveSecretKey(key)) {
    return '[REDACTED]'
  }
  if (key && isSensitivePhoneKey(key)) {
    return '[REDACTED_PHONE]'
  }
  if (normalizePolishPhone(value)) {
    return '[REDACTED_PHONE]'
  }
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim())) {
    return value
  }
  const phoneInTextRegex = /(?:(?:\+|00)?48[\s.-]*)?(?:\d[\s.-]*){8}\d/g
  return value.replace(phoneInTextRegex, '[REDACTED_PHONE]')
}

export function sanitizePayload<T>(value: T, parentKey?: string): T {
  if (value === null || value === undefined) {
    return value
  }
  if (typeof value === 'string') {
    return sanitizeString(value, parentKey) as unknown as T
  }
  if (typeof value === 'number') {
    if (parentKey && isSensitivePhoneKey(parentKey)) {
      return '[REDACTED_PHONE]' as unknown as T
    }
    if (parentKey && isSensitiveSecretKey(parentKey)) {
      return '[REDACTED]' as unknown as T
    }
    // If a number looks like a 9-digit phone number
    const strNum = String(value)
    if (/^\d{9}$/.test(strNum)) {
      return '[REDACTED_PHONE]' as unknown as T
    }
    return value
  }
  if (typeof value !== 'object') {
    return value
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizePayload(item, parentKey)) as unknown as T
  }
  const record = value as Record<string, unknown>
  const result: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(record)) {
    result[k] = sanitizePayload(v, k)
  }
  return result as unknown as T
}

export function canonicalizePayload(value: unknown): string {
  if (value === undefined) {
    return 'null'
  }
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }
  if (value instanceof Date) {
    return JSON.stringify(value.toISOString())
  }
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalizePayload).join(',') + ']'
  }
  const record = value as Record<string, unknown>
  const keys = Object.keys(record).sort()
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalizePayload(record[k])).join(',') + '}'
}

export function computePayloadHash(payload: unknown): string {
  return createHash('sha256').update(canonicalizePayload(payload ?? {})).digest('hex')
}

export interface CreateOperationHashInput {
  operation: 'create'
  sessionId?: string | null
  bookingId: string
  phoneFingerprint: string
  limitSeconds?: number | null
  answeredAt?: string | null
  payload?: unknown
}

export interface TransitionOperationHashInput {
  operation: 'transition'
  sessionId: string
  targetState: string
  expectedVersion?: number | null
  deltaSeconds?: number | null
  eventType?: string | null
  answeredAt?: string | null
  interruptedAt?: string | null
  resumeWindowExpiresAt?: string | null
  payload?: unknown
}

export type OperationHashInput = CreateOperationHashInput | TransitionOperationHashInput

export function computeCallSessionOperationHash(input: OperationHashInput): string {
  let descriptor: Record<string, unknown>

  if (input.operation === 'create') {
    descriptor = {
      operation: 'create',
      sessionId: input.sessionId ?? null,
      bookingId: input.bookingId,
      callerPhoneFingerprint: input.phoneFingerprint,
      limitSeconds: input.limitSeconds ?? 900,
      answeredAt: input.answeredAt ?? null,
      payload: input.payload ?? {},
    }
  } else {
    descriptor = {
      operation: 'transition',
      sessionId: input.sessionId,
      targetState: input.targetState,
      expectedVersion: input.expectedVersion ?? null,
      deltaSeconds: input.deltaSeconds ?? 0,
      eventType: input.eventType ?? null,
      answeredAt: input.answeredAt ?? null,
      interruptedAt: input.interruptedAt ?? null,
      resumeWindowExpiresAt: input.resumeWindowExpiresAt ?? null,
      payload: input.payload ?? {},
    }
  }

  return createHash('sha256').update(canonicalizePayload(descriptor)).digest('hex')
}

export interface CallerClassificationRequestHashInput {
  phoneFingerprint: string | null
  phoneSemantic?: string | null
  rawPhone?: string | null
}

export function computeCallerClassificationRequestHash(
  input: CallerClassificationRequestHashInput,
): string {
  let semantic = input.phoneSemantic
  if (!semantic) {
    if (input.phoneFingerprint) {
      semantic = input.phoneFingerprint
    } else if (input.rawPhone) {
      semantic = `raw_sha256:${createHash('sha256').update(input.rawPhone.trim()).digest('hex')}`
    } else {
      semantic = 'unknown'
    }
  }

  const descriptor = {
    operation: 'classify_incoming_caller',
    callerPhoneFingerprint: input.phoneFingerprint ?? null,
    phoneSemantic: semantic,
  }

  return createHash('sha256').update(canonicalizePayload(descriptor)).digest('hex')
}
