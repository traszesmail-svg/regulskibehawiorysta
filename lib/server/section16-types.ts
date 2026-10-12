// Section 16 Stage 1: Domain types and state machines for Urgent Intake,
// Availability Notifications, and Timed Talk Entitlements.

export const URGENT_INTAKE_DAY_CHOICES = ['today', 'tomorrow'] as const
export type UrgentIntakeDayChoice = (typeof URGENT_INTAKE_DAY_CHOICES)[number]

export const URGENT_INTAKE_STATES = [
  'pending_proposal',
  'timeslot_proposed',
  'payment_confirmed',
  'expired',
  'cancelled',
  'rejected',
] as const
export type UrgentIntakeState = (typeof URGENT_INTAKE_STATES)[number]

export const TERMINAL_URGENT_INTAKE_STATES: ReadonlySet<UrgentIntakeState> = new Set([
  'payment_confirmed',
  'expired',
  'cancelled',
  'rejected',
])

export const ALLOWED_URGENT_INTAKE_TRANSITIONS: Record<UrgentIntakeState, readonly UrgentIntakeState[]> = {
  pending_proposal: ['timeslot_proposed', 'expired', 'cancelled', 'rejected'],
  timeslot_proposed: ['payment_confirmed', 'expired', 'cancelled', 'timeslot_proposed'],
  payment_confirmed: [],
  expired: [],
  cancelled: [],
  rejected: [],
}

export function isTerminalUrgentIntakeState(state: UrgentIntakeState): boolean {
  return TERMINAL_URGENT_INTAKE_STATES.has(state)
}

export function isValidUrgentIntakeTransition(from: UrgentIntakeState, to: UrgentIntakeState): boolean {
  if (isTerminalUrgentIntakeState(from)) {
    return false
  }
  const allowed = ALLOWED_URGENT_INTAKE_TRANSITIONS[from]
  return allowed ? allowed.includes(to) : false
}

export const AVAILABILITY_NOTIFICATION_STATES = [
  'queued',
  'offer_sent',
  'accepted_paid',
  'expired',
  'cancelled',
  'consumed',
] as const
export type AvailabilityNotificationState = (typeof AVAILABILITY_NOTIFICATION_STATES)[number]

export const TERMINAL_AVAILABILITY_NOTIFICATION_STATES: ReadonlySet<AvailabilityNotificationState> = new Set([
  'consumed',
  'expired',
  'cancelled',
])

export const ALLOWED_AVAILABILITY_NOTIFICATION_TRANSITIONS: Record<
  AvailabilityNotificationState,
  readonly AvailabilityNotificationState[]
> = {
  queued: ['offer_sent', 'expired', 'cancelled'],
  offer_sent: ['accepted_paid', 'expired', 'cancelled'],
  accepted_paid: ['consumed', 'cancelled'],
  consumed: [],
  expired: [],
  cancelled: [],
}

export function isTerminalAvailabilityNotificationState(state: AvailabilityNotificationState): boolean {
  return TERMINAL_AVAILABILITY_NOTIFICATION_STATES.has(state)
}

export function isValidAvailabilityNotificationTransition(
  from: AvailabilityNotificationState,
  to: AvailabilityNotificationState,
): boolean {
  if (isTerminalAvailabilityNotificationState(from)) {
    return false
  }
  const allowed = ALLOWED_AVAILABILITY_NOTIFICATION_TRANSITIONS[from]
  return allowed ? allowed.includes(to) : false
}

export const TALK_ENTITLEMENT_STATES = ['active', 'consumed', 'expired', 'revoked'] as const
export type TalkEntitlementState = (typeof TALK_ENTITLEMENT_STATES)[number]

export const TERMINAL_TALK_ENTITLEMENT_STATES: ReadonlySet<TalkEntitlementState> = new Set([
  'consumed',
  'expired',
  'revoked',
])

export const ALLOWED_TALK_ENTITLEMENT_TRANSITIONS: Record<TalkEntitlementState, readonly TalkEntitlementState[]> = {
  active: ['consumed', 'expired', 'revoked'],
  consumed: [],
  expired: [],
  revoked: [],
}

export function isTerminalTalkEntitlementState(state: TalkEntitlementState): boolean {
  return TERMINAL_TALK_ENTITLEMENT_STATES.has(state)
}

export function isValidTalkEntitlementTransition(from: TalkEntitlementState, to: TalkEntitlementState): boolean {
  if (isTerminalTalkEntitlementState(from)) {
    return false
  }
  const allowed = ALLOWED_TALK_ENTITLEMENT_TRANSITIONS[from]
  return allowed ? allowed.includes(to) : false
}

// Domain Errors
export class Section16DomainError extends Error {
  readonly code: string
  constructor(message: string, code: string) {
    super(message)
    this.name = this.constructor.name
    this.code = code
  }
}

export class Section16NotFoundError extends Section16DomainError {
  constructor(entity: string, id: string) {
    super(`Nie znaleziono obiektu ${entity}: ${id}`, 'NOT_FOUND')
  }
}

export class Section16TerminalStateError extends Section16DomainError {
  constructor(entity: string, state: string) {
    super(`Nie można modyfikować ${entity} w stanie terminalnym: ${state}`, 'TERMINAL_STATE')
  }
}

export class Section16TransitionError extends Section16DomainError {
  constructor(entity: string, from: string, to: string) {
    super(`Niedozwolone przejście stanu dla ${entity} z "${from}" do "${to}"`, 'ILLEGAL_TRANSITION')
  }
}

export class Section16ConcurrencyError extends Section16DomainError {
  constructor(expectedVersion: number, actualVersion: number) {
    super(
      `Konflikt współbieżności CAS: oczekiwano wersji ${expectedVersion}, aktualna ${actualVersion}`,
      'CONCURRENCY_CONFLICT',
    )
  }
}

export class Section16IdempotencyConflictError extends Section16DomainError {
  constructor(idempotencyKey: string) {
    super(`Konflikt idempotencji: klucz ${idempotencyKey} został już użyty z innym ładunkiem`, 'IDEMPOTENCY_CONFLICT')
  }
}

export class Section16HoldExpiredError extends Section16DomainError {
  constructor(message = 'Proponowany termin i blokada wygasły') {
    super(message, 'HOLD_EXPIRED')
  }
}

export class Section16InvalidTimezoneError extends Section16DomainError {
  constructor(message: string) {
    super(message, 'INVALID_TIMEZONE_DATE')
  }
}

export class Section16PaymentRequiredError extends Section16DomainError {
  constructor(message = 'Wymagane jest potwierdzenie płatności przed wykonaniem tej operacji') {
    super(message, 'PAYMENT_REQUIRED')
  }
}

export class Section16PrivacyError extends Section16DomainError {
  constructor(message: string) {
    super(message, 'PRIVACY_VIOLATION')
  }
}

export class Section16ValidationError extends Section16DomainError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR')
  }
}

export class Section16InvalidIdempotencyKeyError extends Section16ValidationError {
  constructor(message = 'Wymagany jest prawidłowy klucz idempotencji (1-128 znaków)') {
    super(message)
    this.name = 'Section16InvalidIdempotencyKeyError'
  }
}

export class Section16EntitlementAlreadyExistsError extends Section16DomainError {
  constructor(message = 'Dla tego źródła istnieje już uprawnienie do rozmowy') {
    super(message, 'ENTITLEMENT_ALREADY_EXISTS')
    this.name = 'Section16EntitlementAlreadyExistsError'
  }
}

// Data Entities
export interface UrgentIntakeRequest {
  id: string
  dayChoice: UrgentIntakeDayChoice
  targetDate: string
  callerPhoneFingerprint: string
  callerPhoneMasked: string
  contactCiphertext: string | null
  clientName: string | null
  clientNotes: string | null
  state: UrgentIntakeState
  proposedDate: string | null
  proposedTime: string | null
  proposedTimeslotIso: string | null
  holdExpiresAt: string | null
  expiresAt: string
  paymentReference: string | null
  bookingId: string | null
  version: number
  idempotencyKey: string
  createdAt: string
  updatedAt: string
}

export interface UrgentIntakeEvent {
  id: string
  requestId: string
  eventType: string
  fromState: UrgentIntakeState | null
  toState: UrgentIntakeState
  payload: Record<string, unknown>
  payloadHash: string
  idempotencyKey: string
  createdAt: string
}

export interface AvailabilityNotificationRequest {
  id: string
  callerPhoneFingerprint: string
  callerPhoneMasked: string
  contactCiphertext: string | null
  channel: 'sms' | 'email'
  clientName: string | null
  state: AvailabilityNotificationState
  queuePosition: number
  offeredAt: string | null
  offerExpiresAt: string | null
  acceptedAt: string | null
  paymentReference: string | null
  bookingId: string | null
  expiresAt: string
  version: number
  idempotencyKey: string
  createdAt: string
  updatedAt: string
}

export interface AvailabilityNotificationEvent {
  id: string
  requestId: string
  eventType: string
  fromState: AvailabilityNotificationState | null
  toState: AvailabilityNotificationState
  payload: Record<string, unknown>
  payloadHash: string
  idempotencyKey: string
  createdAt: string
}

export interface ConsultationTalkEntitlement {
  id: string
  callerPhoneFingerprint: string
  callerPhoneMasked: string
  bookingId: string | null
  paymentReference: string
  urgentRequestId: string | null
  notificationRequestId: string | null
  allocatedSeconds: number
  validFrom: string
  validUntil: string
  state: TalkEntitlementState
  consumedAt: string | null
  consumedCallSessionId: string | null
  version: number
  idempotencyKey: string
  createdAt: string
  updatedAt: string
}

export interface ConsultationTalkEntitlementEvent {
  id: string
  entitlementId: string
  eventType: string
  fromState: TalkEntitlementState | null
  toState: TalkEntitlementState
  payload: Record<string, unknown>
  payloadHash: string
  idempotencyKey: string
  createdAt: string
}

// Operation Inputs
export interface CreateUrgentIntakeInput {
  requestId?: string
  dayChoice: UrgentIntakeDayChoice
  targetDate?: string // auto-calculated for Warsaw if omitted
  rawPhone?: string // if provided, fingerprint & masked are derived, rawPhone is strictly NOT stored
  callerPhoneFingerprint?: string
  callerPhoneMasked?: string
  contactCiphertext?: string | null
  clientName?: string | null
  clientNotes?: string | null
  expiresAt?: string | null
  idempotencyKey: string
  payload?: Record<string, unknown>
}

export interface ProposeUrgentTimeslotInput {
  requestId: string
  expectedVersion?: number
  proposedDate: string
  proposedTime: string // HH:MM
  proposedTimeslotIso?: string | null
  holdExpiresAt?: string | null // defaults to fail-closed duration e.g. 15-30m
  idempotencyKey: string
  payload?: Record<string, unknown>
}

export interface ConfirmUrgentPaymentInput {
  requestId: string
  expectedVersion?: number
  paymentReference: string
  bookingId?: string | null
  idempotencyKey: string
  payload?: Record<string, unknown>
}

export interface TransitionUrgentIntakeInput {
  requestId: string
  targetState: 'expired' | 'cancelled' | 'rejected'
  expectedVersion?: number
  reason?: string | null
  idempotencyKey: string
  payload?: Record<string, unknown>
}

export interface CreateAvailabilityNotificationInput {
  requestId?: string
  rawPhone?: string
  callerPhoneFingerprint?: string
  callerPhoneMasked?: string
  contactCiphertext?: string | null
  channel?: 'sms' | 'email'
  clientName?: string | null
  expiresAt?: string | null
  idempotencyKey: string
  payload?: Record<string, unknown>
}

export interface OfferAvailabilityNotificationInput {
  requestId: string
  expectedVersion?: number
  offerExpiresAt?: string | null
  idempotencyKey: string
  payload?: Record<string, unknown>
}

export interface ConfirmNotificationPaymentInput {
  requestId: string
  expectedVersion?: number
  paymentReference: string
  bookingId?: string | null
  idempotencyKey: string
  payload?: Record<string, unknown>
}

export interface TransitionAvailabilityNotificationInput {
  requestId: string
  targetState: 'consumed' | 'expired' | 'cancelled'
  expectedVersion?: number
  reason?: string | null
  idempotencyKey: string
  payload?: Record<string, unknown>
}

export interface CreateTalkEntitlementInput {
  entitlementId?: string
  rawPhone?: string
  callerPhoneFingerprint?: string
  callerPhoneMasked?: string
  bookingId?: string | null
  paymentReference: string
  urgentRequestId?: string | null
  notificationRequestId?: string | null
  allocatedSeconds?: number
  validFrom: string
  validUntil: string
  idempotencyKey: string
  payload?: Record<string, unknown>
}

export interface ConsumeTalkEntitlementInput {
  entitlementId: string
  callSessionId: string
  expectedVersion?: number
  idempotencyKey: string
  payload?: Record<string, unknown>
}

export interface RevokeTalkEntitlementInput {
  entitlementId: string
  expectedVersion?: number
  reason?: string | null
  idempotencyKey: string
  payload?: Record<string, unknown>
}

// Stage 5: Periodic Expiration Sweep Types
export interface Section16SweepResult {
  urgentIntakesExpired: number
  availabilityNotificationsExpired: number
  talkEntitlementsExpired: number
  totalExpired: number
  batchLimit: number
  sweptAt: string
}

export interface Section16ExpirationSweepOptions {
  batchLimit: number
  now?: Date
}
