export const CALL_SESSION_STATES = [
  'active',
  'interrupted',
  'waiting_for_owner',
  'bridging',
  'resumed',
  'completed',
  'failed',
] as const

export type CallSessionState = (typeof CALL_SESSION_STATES)[number]

export const TERMINAL_CALL_SESSION_STATES: ReadonlySet<CallSessionState> = new Set(['completed', 'failed'])

export const ALLOWED_CALL_SESSION_TRANSITIONS: Record<CallSessionState, readonly CallSessionState[]> = {
  active: ['interrupted', 'completed', 'failed', 'active'],
  interrupted: ['waiting_for_owner', 'completed', 'failed'],
  waiting_for_owner: ['bridging', 'interrupted', 'failed'],
  bridging: ['resumed', 'interrupted', 'failed'],
  resumed: ['interrupted', 'completed', 'failed', 'resumed'],
  completed: [],
  failed: [],
}

export function isTerminalCallSessionState(state: CallSessionState): boolean {
  return TERMINAL_CALL_SESSION_STATES.has(state)
}

export function isValidCallSessionTransition(from: CallSessionState, to: CallSessionState): boolean {
  if (isTerminalCallSessionState(from)) {
    return false
  }
  const allowed = ALLOWED_CALL_SESSION_TRANSITIONS[from]
  return allowed ? allowed.includes(to) : false
}

export class CallSessionError extends Error {
  readonly code: string
  constructor(message: string, code: string) {
    super(message)
    this.name = this.constructor.name
    this.code = code
  }
}

export class CallSessionNotFoundError extends CallSessionError {
  constructor(sessionId: string) {
    super(`Nie znaleziono sesji połączenia: ${sessionId}`, 'SESSION_NOT_FOUND')
  }
}

export class CallSessionTerminalStateError extends CallSessionError {
  constructor(state: CallSessionState) {
    super(`Nie można modyfikować sesji w stanie terminalnym: ${state}`, 'TERMINAL_STATE')
  }
}

export class CallSessionTransitionError extends CallSessionError {
  constructor(from: CallSessionState, to: CallSessionState) {
    super(`Niedozwolone przejście stanu z ${from} do ${to}`, 'ILLEGAL_TRANSITION')
  }
}

export class CallSessionConcurrencyError extends CallSessionError {
  constructor(expectedVersion: number, actualVersion: number) {
    super(
      `Konflikt współbieżności CAS: oczekiwano wersji ${expectedVersion}, aktualna ${actualVersion}`,
      'CONCURRENCY_CONFLICT',
    )
  }
}

export class CallSessionIdempotencyConflictError extends CallSessionError {
  constructor(idempotencyKey: string) {
    super(`Konflikt idempotencji: klucz ${idempotencyKey} został już użyty z innym ładunkiem`, 'IDEMPOTENCY_CONFLICT')
  }
}

export class CallSessionResumeWindowExpiredError extends CallSessionError {
  constructor(expiresAt: string) {
    super(`Okno na oddzwonienie po przerwaniu wygasło: ${expiresAt}`, 'RESUME_WINDOW_EXPIRED')
  }
}

export class CallSessionInvalidTimeError extends CallSessionError {
  constructor(message: string) {
    super(message, 'INVALID_TIME')
  }
}

export class CallSessionInvalidPhoneError extends CallSessionError {
  constructor(message = 'Nieprawidłowy lub pusty numer telefonu rozmówcy') {
    super(message, 'INVALID_PHONE')
  }
}

export class CallSessionSecurityError extends CallSessionError {
  constructor(message: string) {
    super(message, 'SECURITY_ERROR')
  }
}

export interface CallSession {
  id: string
  callSessionId?: string
  bookingId: string
  callerPhoneFingerprint: string
  callerPhoneMasked: string
  limitSeconds: number
  elapsedSeconds: number
  remainingSeconds: number
  answeredAt: string | null
  interruptedAt: string | null
  resumeWindowExpiresAt: string | null
  state: CallSessionState
  version: number
  idempotencyKey: string | null
  createdAt: string
  updatedAt: string
}

export interface CallSessionEvent {
  id: string
  callSessionId: string
  eventType: string
  fromState: CallSessionState | null
  toState: CallSessionState
  payload: Record<string, unknown>
  payloadHash: string
  idempotencyKey: string
  createdAt: string
}

export interface CreateCallSessionInput {
  sessionId?: string
  bookingId: string
  phone: string
  limitSeconds?: number
  answeredAt?: string | null
  idempotencyKey?: string | null
  payload?: Record<string, unknown>
}

export interface TransitionCallSessionInput {
  sessionId: string
  targetState: CallSessionState
  expectedVersion?: number
  deltaSeconds?: number
  eventType?: string
  idempotencyKey?: string | null
  payload?: Record<string, unknown>
  interruptedAt?: string | null
  resumeWindowExpiresAt?: string | null
  answeredAt?: string | null
}
