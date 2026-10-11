// Section 16 Stage 2: Urgent flow backend orchestration (Path A).
// Handles strict owner proposal parsing, minimal notification preparation,
// and safe atomic timeslot hold creation with fail-closed integration boundaries.

import {
  UrgentIntakeRequest,
  UrgentIntakeDayChoice,
  Section16DomainError,
  Section16NotFoundError,
  Section16TerminalStateError,
  Section16TransitionError,
  Section16ConcurrencyError,
  Section16IdempotencyConflictError,
  Section16HoldExpiredError,
  Section16ValidationError,
  Section16InvalidIdempotencyKeyError,
} from './section16-types'
import {
  MIN_HOLD_EXPIRY_MINUTES,
  MAX_HOLD_EXPIRY_MINUTES,
  DEFAULT_HOLD_EXPIRY_MINUTES,
  validateIdempotencyKey,
  computeSection16PayloadHash,
} from './section16-policy'
import {
  getUrgentIntakeRequest,
  getUrgentIntakeEventByIdempotencyKey,
  proposeUrgentIntakeTimeslot,
} from './section16-store'

export const MAX_OWNER_NOTIFICATION_SMS_LENGTH = 160

// ---------------------------------------------------------------------------
// DOMAIN ERRORS & RESULT TYPES
// ---------------------------------------------------------------------------

export class Section16UrgentProposalError extends Section16DomainError {
  constructor(message: string, code: string) {
    super(message, code)
    this.name = 'Section16UrgentProposalError'
  }
}

export interface ParsedOwnerProposal {
  raw: string
  day: number
  month: number
  year: number
  hour: number
  minute: number
  formattedDate: string // YYYY-MM-DD
  formattedTime: string // HH:MM
  isoTimestamp: string // ISO 8601 UTC
  warsawOffset: string // '+01:00' or '+02:00'
}

export type ParseOwnerProposalResult =
  | {
      success: true
      data: ParsedOwnerProposal
    }
  | {
      success: false
      error: Section16UrgentProposalError
    }

export interface PrepareOwnerUrgentNotificationInput {
  requestId: string
  dayChoice: UrgentIntakeDayChoice
  targetDate: string
}

export interface OwnerUrgentNotificationPayload {
  requestId: string
  dayChoice: UrgentIntakeDayChoice
  targetDate: string
  message: string
  characterCount: number
  formatInstruction: string
}

export interface ProcessOwnerProposalInput {
  requestId: string
  response: string
  idempotencyKey: string
  expectedVersion: number
  holdDurationMinutes?: number
  now?: Date
  payload?: Record<string, unknown>
}

export interface ProcessOwnerProposalResult {
  request: UrgentIntakeRequest
  parsedProposal: ParsedOwnerProposal
  isRetry: boolean
}

// ---------------------------------------------------------------------------
// INTEGRATION BOUNDARIES & ADAPTERS (FAIL-CLOSED IN THIS STAGE)
// ---------------------------------------------------------------------------

export interface OwnerSmsDispatchAdapter {
  dispatchOwnerNotification(payload: OwnerUrgentNotificationPayload): Promise<void>
}

export interface ClientPaymentLinkDispatchAdapter {
  dispatchClientPaymentLink(request: UrgentIntakeRequest): Promise<void>
}

export interface CalendarBookingAdapter {
  createCalendarBooking(request: UrgentIntakeRequest): Promise<void>
}

export class DisabledOwnerSmsDispatchAdapter implements OwnerSmsDispatchAdapter {
  async dispatchOwnerNotification(): Promise<void> {
    throw new Section16DomainError(
      'Wysyłka powiadomień SMS do właściciela jest wyłączona w tym etapie (fail-closed)',
      'OWNER_SMS_DISPATCH_DISABLED',
    )
  }
}

export class DisabledClientPaymentLinkDispatchAdapter implements ClientPaymentLinkDispatchAdapter {
  async dispatchClientPaymentLink(): Promise<void> {
    throw new Section16DomainError(
      'Wysyłka linku płatności do klienta jest wyłączona w tym etapie (fail-closed)',
      'CLIENT_PAYMENT_LINK_DISPATCH_DISABLED',
    )
  }
}

export class DisabledCalendarBookingAdapter implements CalendarBookingAdapter {
  async createCalendarBooking(): Promise<void> {
    throw new Section16DomainError(
      'Integracja z kalendarzem jest wyłączona w tym etapie (fail-closed)',
      'CALENDAR_BOOKING_DISABLED',
    )
  }
}

export interface UrgentFlowIntegrationBoundaries {
  ownerSmsDispatch?: OwnerSmsDispatchAdapter
  clientPaymentLinkDispatch?: ClientPaymentLinkDispatchAdapter
  calendarBooking?: CalendarBookingAdapter
}

export const DEFAULT_URGENT_FLOW_BOUNDARIES: UrgentFlowIntegrationBoundaries = Object.freeze({
  ownerSmsDispatch: new DisabledOwnerSmsDispatchAdapter(),
  clientPaymentLinkDispatch: new DisabledClientPaymentLinkDispatchAdapter(),
  calendarBooking: new DisabledCalendarBookingAdapter(),
})

// ---------------------------------------------------------------------------
// HELPER FUNCTIONS: CALENDAR & DST VALIDATION
// ---------------------------------------------------------------------------

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)
}

function getDaysInMonth(year: number, month: number): number {
  if (month < 1 || month > 12) return 0
  const daysPerMonth = [0, 31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return daysPerMonth[month]
}

const STRICT_RESPONSE_REGEX = /^[0-9]{2}\.[0-9]{2}\.[0-9]{4}\.[0-9]{2}:[0-9]{2}$/

/**
 * Strictly parses owner response in exact canonical format DD.MM.RRRR.HH:MM.
 * Validates calendar validity, Europe/Warsaw timezone & DST (gap & overlap detection),
 * and matches request's targetDate.
 * Pure structural parsing: does NOT evaluate future vs `now`.
 */
export function parseOwnerProposalStructure(
  response: unknown,
  targetDate: string,
): ParseOwnerProposalResult {
  if (typeof response !== 'string' || !STRICT_RESPONSE_REGEX.test(response)) {
    return {
      success: false,
      error: new Section16UrgentProposalError(
        'Odpowiedź musi mieć dokładnie format DD.MM.RRRR.HH:MM (np. 12.10.2026.14:30), bez spacji i dodatkowego tekstu',
        'INVALID_FORMAT',
      ),
    }
  }

  const match = response.match(/^([0-9]{2})\.([0-9]{2})\.([0-9]{4})\.([0-9]{2}):([0-9]{2})$/)
  if (!match) {
    return {
      success: false,
      error: new Section16UrgentProposalError(
        'Odpowiedź musi mieć dokładnie format DD.MM.RRRR.HH:MM (np. 12.10.2026.14:30), bez spacji i dodatkowego tekstu',
        'INVALID_FORMAT',
      ),
    }
  }

  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])

  // Calendar date validation
  if (month < 1 || month > 12 || day < 1 || day > getDaysInMonth(year, month)) {
    return {
      success: false,
      error: new Section16UrgentProposalError(
        `Podana data kalendarzowa nie istnieje (${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year})`,
        'INVALID_CALENDAR_DATE',
      ),
    }
  }

  // Time component validation
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return {
      success: false,
      error: new Section16UrgentProposalError(
        `Podana godzina jest nieprawidłowa (dozwolony zakres 00:00 do 23:59): ${hour}:${minute}`,
        'INVALID_TIME',
      ),
    }
  }

  const formattedDate = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const formattedTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`

  // Strict match with request targetDate (cannot change chosen day after midnight)
  if (targetDate && formattedDate !== targetDate) {
    return {
      success: false,
      error: new Section16UrgentProposalError(
        `Proponowana data ${formattedDate} nie zgadza się z wybranym dniem docelowym zgłoszenia (${targetDate})`,
        'TARGET_DATE_MISMATCH',
      ),
    }
  }

  // Europe/Warsaw DST interpretation:
  // Poland uses UTC+1 (standard / CET) and UTC+2 (daylight / CEST).
  // Clock changes introduce:
  // - Spring forward gap: 02:00:00 - 02:59:59 does not exist (0 matches).
  // - Autumn fall back overlap: 02:00:00 - 02:59:59 occurs twice (2 matches).
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })

  function formatsToLocal(utcMs: number): boolean {
    const parts = dtf.formatToParts(new Date(utcMs))
    const v = Object.fromEntries(parts.map((p) => [p.type, p.value]))
    return (
      Number(v.year) === year &&
      Number(v.month) === month &&
      Number(v.day) === day &&
      Number(v.hour) === hour &&
      Number(v.minute) === minute
    )
  }

  const tStandard = Date.UTC(year, month - 1, day, hour - 1, minute, 0, 0)
  const tDaylight = Date.UTC(year, month - 1, day, hour - 2, minute, 0, 0)

  const candidates = [tDaylight, tStandard].filter(formatsToLocal)

  if (candidates.length === 0) {
    return {
      success: false,
      error: new Section16UrgentProposalError(
        'Podana godzina nie istnieje w strefie Europe/Warsaw ze względu na wiosenną zmianę czasu (przesunięcie wskazówek do przodu)',
        'DST_NON_EXISTENT_TIME',
      ),
    }
  }

  if (candidates.length > 1) {
    return {
      success: false,
      error: new Section16UrgentProposalError(
        'Podana godzina jest niejednoznaczna w strefie Europe/Warsaw ze względu na jesienną zmianę czasu (cofnięcie wskazówek)',
        'DST_AMBIGUOUS_TIME',
      ),
    }
  }

  const chosenUtcMs = candidates[0]
  const localAsUtcMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0)
  const offsetHours = Math.round((localAsUtcMs - chosenUtcMs) / (3600 * 1000))
  const warsawOffset = offsetHours === 2 ? '+02:00' : '+01:00'
  const isoTimestamp = new Date(chosenUtcMs).toISOString()

  return {
    success: true,
    data: {
      raw: response,
      day,
      month,
      year,
      hour,
      minute,
      formattedDate,
      formattedTime,
      isoTimestamp,
      warsawOffset,
    },
  }
}

export function parseOwnerProposalStructureOrThrow(
  response: unknown,
  targetDate: string,
): ParsedOwnerProposal {
  const result = parseOwnerProposalStructure(response, targetDate)
  if (!result.success) {
    throw result.error
  }
  return result.data
}

/**
 * Strictly parses owner response in exact canonical format DD.MM.RRRR.HH:MM.
 * Validates calendar validity, Europe/Warsaw timezone & DST (gap & overlap detection),
 * ensures proposal is strictly in future relative to `now`, and matches request's targetDate.
 */
export function parseOwnerProposalResponse(
  response: unknown,
  targetDate: string,
  now: Date = new Date(),
): ParseOwnerProposalResult {
  const structResult = parseOwnerProposalStructure(response, targetDate)
  if (!structResult.success) {
    return structResult
  }

  const chosenUtcMs = Date.parse(structResult.data.isoTimestamp)
  const nowMs = now.getTime()

  // Strictly in the future relative to `now`
  if (chosenUtcMs <= nowMs) {
    return {
      success: false,
      error: new Section16UrgentProposalError(
        'Proponowany termin musi być ściśle w przyszłości względem bieżącego czasu',
        'PAST_OR_CURRENT_TIME',
      ),
    }
  }

  return structResult
}

export function parseOwnerProposalResponseOrThrow(
  response: unknown,
  targetDate: string,
  now: Date = new Date(),
): ParsedOwnerProposal {
  const result = parseOwnerProposalResponse(response, targetDate, now)
  if (!result.success) {
    throw result.error
  }
  return result.data
}

// ---------------------------------------------------------------------------
// NOTIFICATION PREPARATION (PURE FUNCTION, ZERO DISPATCH, NO PII)
// ---------------------------------------------------------------------------

/**
 * Prepares the minimal SMS notification payload for the owner.
 * Pure function: zero enqueue, zero dispatch.
 * Contains only unguessable request ID, day choice, target date, and response instruction.
 * Strictly free of PII (client name, notes, raw phone, ciphertext, fingerprint).
 */
export function prepareOwnerUrgentNotification(
  input: PrepareOwnerUrgentNotificationInput,
): OwnerUrgentNotificationPayload {
  if (!input.requestId || typeof input.requestId !== 'string' || input.requestId.trim().length === 0) {
    throw new Section16ValidationError('Wymagany jest identyfikator zgłoszenia (requestId)')
  }
  const trimmedId = input.requestId.trim()
  if (trimmedId.length > 64) {
    throw new Section16ValidationError('requestId przekracza maksymalną dopuszczalną długość (64 znaki)')
  }

  if (input.dayChoice !== 'today' && input.dayChoice !== 'tomorrow') {
    throw new Section16ValidationError(`Niedozwolony wybór dnia: ${input.dayChoice}`)
  }

  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(input.targetDate)) {
    throw new Section16ValidationError(`Nieprawidłowy format targetDate: ${input.targetDate}`)
  }

  const [yStr, mStr, dStr] = input.targetDate.split('-')
  const year = Number(yStr)
  const month = Number(mStr)
  const day = Number(dStr)

  if (month < 1 || month > 12 || day < 1 || day > getDaysInMonth(year, month)) {
    throw new Section16ValidationError(
      `Podana data docelowa nie istnieje w kalendarzu (${input.targetDate})`,
    )
  }

  const polishTargetDate = `${dStr}.${mStr}.${yStr}`
  const dayLabel = input.dayChoice === 'today' ? 'dzisiaj' : 'jutro'
  const formatInstruction = `Format odpowiedzi: DD.MM.RRRR.HH:MM (np. ${polishTargetDate}.14:30)`
  const message = `Zgloszenie pilne [${trimmedId}]. Termin: ${dayLabel} (${polishTargetDate}). Odpowiedz scisle formatem: DD.MM.RRRR.HH:MM (np. ${polishTargetDate}.14:30)`

  if (message.length > MAX_OWNER_NOTIFICATION_SMS_LENGTH) {
    throw new Section16ValidationError(
      `Wiadomość przekracza dopuszczalny limit długości (${message.length}/${MAX_OWNER_NOTIFICATION_SMS_LENGTH})`,
    )
  }

  return {
    requestId: trimmedId,
    dayChoice: input.dayChoice,
    targetDate: input.targetDate,
    message,
    characterCount: message.length,
    formatInstruction,
  }
}

// ---------------------------------------------------------------------------
// PROCESS RESPONSE & SET HOLD
// ---------------------------------------------------------------------------

/**
 * Processes owner response, parses timeslot, and atomically establishes an expiring hold.
 * Requires pending_proposal state (except on exact idempotent retry).
 * Enforces CAS versioning, idempotency key, bounded TTL (5-120 min), and fail-closed isolation.
 * Does not create bookings, calendar entries, payment links, or talk entitlements.
 */
export async function processOwnerProposalAndSetHold(
  input: ProcessOwnerProposalInput,
  _boundaries: UrgentFlowIntegrationBoundaries = DEFAULT_URGENT_FLOW_BOUNDARIES,
): Promise<ProcessOwnerProposalResult> {
  const idempotencyKey = validateIdempotencyKey(input.idempotencyKey)
  const now = input.now ?? new Date()

  // 1. CAS expectedVersion: strictly required and validated as positive integer
  if (
    input.expectedVersion === undefined ||
    input.expectedVersion === null ||
    typeof input.expectedVersion !== 'number' ||
    Number.isNaN(input.expectedVersion) ||
    !Number.isInteger(input.expectedVersion) ||
    input.expectedVersion <= 0
  ) {
    throw new Section16ValidationError(
      'Wymagana jest poprawna wersja oczekiwana (expectedVersion jako dodatnia liczba całkowita)',
    )
  }

  // 2. holdDurationMinutes: bounded integer in [MIN_HOLD_EXPIRY_MINUTES, MAX_HOLD_EXPIRY_MINUTES]
  let holdMinutes = DEFAULT_HOLD_EXPIRY_MINUTES
  if (input.holdDurationMinutes !== undefined) {
    if (
      typeof input.holdDurationMinutes !== 'number' ||
      !Number.isInteger(input.holdDurationMinutes) ||
      input.holdDurationMinutes < MIN_HOLD_EXPIRY_MINUTES ||
      input.holdDurationMinutes > MAX_HOLD_EXPIRY_MINUTES
    ) {
      throw new Section16ValidationError(
        `Czas blokady musi być liczbą całkowitą od ${MIN_HOLD_EXPIRY_MINUTES} do ${MAX_HOLD_EXPIRY_MINUTES} minut`,
      )
    }
    holdMinutes = input.holdDurationMinutes
  }

  const existing = await getUrgentIntakeRequest(input.requestId)
  if (!existing) {
    throw new Section16NotFoundError('UrgentIntakeRequest', input.requestId)
  }

  // 3. Recognize existing event for idempotencyKey BEFORE time validations
  const existingEvent = await getUrgentIntakeEventByIdempotencyKey(idempotencyKey)
  if (existingEvent) {
    // Conflict check 1: requestId
    if (existingEvent.requestId !== input.requestId) {
      throw new Section16IdempotencyConflictError(idempotencyKey)
    }

    // Conflict check 2: eventType
    if (existingEvent.eventType !== 'timeslot_proposed') {
      throw new Section16IdempotencyConflictError(idempotencyKey)
    }

    // Structural parsing of response (does NOT check future vs now)
    const structResult = parseOwnerProposalStructure(input.response, existing.targetDate)
    if (!structResult.success) {
      throw new Section16IdempotencyConflictError(idempotencyKey)
    }

    // Reconstruct canonical payload to verify hash
    const candidatePayload: Record<string, unknown> = {
      ...(input.payload ?? {}),
      expectedVersion: input.expectedVersion,
      response: input.response,
      parsedProposal: {
        formattedDate: structResult.data.formattedDate,
        formattedTime: structResult.data.formattedTime,
        isoTimestamp: structResult.data.isoTimestamp,
        warsawOffset: structResult.data.warsawOffset,
      },
      holdDurationMinutes: holdMinutes,
    }
    const candidatePayloadHash = computeSection16PayloadHash(candidatePayload)

    if (existingEvent.payloadHash !== candidatePayloadHash) {
      throw new Section16IdempotencyConflictError(idempotencyKey)
    }

    // Also verify direct payload attributes if present
    const evPayload = existingEvent.payload
    if (evPayload && evPayload.holdDurationMinutes !== undefined && evPayload.holdDurationMinutes !== holdMinutes) {
      throw new Section16IdempotencyConflictError(idempotencyKey)
    }
    if (evPayload && evPayload.expectedVersion !== undefined && evPayload.expectedVersion !== input.expectedVersion) {
      throw new Section16IdempotencyConflictError(idempotencyKey)
    }

    // Exact idempotent retry:
    // Return previously established record without any mutation or new events,
    // even if now is past expiresAt, holdExpiresAt, or the proposed time.
    return {
      request: existing,
      parsedProposal: structResult.data,
      isRetry: true,
    }
  }

  // 4. Fresh operation validations (fail-closed before mutation)
  if (existing.state !== 'pending_proposal') {
    throw new Section16TransitionError('UrgentIntakeRequest', existing.state, 'timeslot_proposed')
  }

  if (Date.parse(existing.expiresAt) <= now.getTime()) {
    throw new Section16HoldExpiredError('Zgłoszenie pilne wygasło przed propozycją terminu')
  }

  if (existing.version !== input.expectedVersion) {
    throw new Section16ConcurrencyError(input.expectedVersion, existing.version)
  }

  // Parse proposal response strictly in future relative to now
  const parsed = parseOwnerProposalResponseOrThrow(input.response, existing.targetDate, now)

  const holdExpiresAt = new Date(now.getTime() + holdMinutes * 60 * 1000).toISOString()
  const payloadToStore: Record<string, unknown> = {
    ...(input.payload ?? {}),
    expectedVersion: input.expectedVersion,
    response: input.response,
    parsedProposal: {
      formattedDate: parsed.formattedDate,
      formattedTime: parsed.formattedTime,
      isoTimestamp: parsed.isoTimestamp,
      warsawOffset: parsed.warsawOffset,
    },
    holdDurationMinutes: holdMinutes,
  }

  const updated = await proposeUrgentIntakeTimeslot(
    {
      requestId: existing.id,
      expectedVersion: input.expectedVersion,
      proposedDate: parsed.formattedDate,
      proposedTime: parsed.formattedTime,
      proposedTimeslotIso: parsed.isoTimestamp,
      holdExpiresAt,
      idempotencyKey,
      payload: payloadToStore,
    },
    now,
  )

  return {
    request: updated,
    parsedProposal: parsed,
    isRetry: false,
  }
}
