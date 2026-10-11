export const CALLER_CLASSIFICATION_DECISIONS = [
  'eligible_callback',
  'session_in_progress',
  'paid_booking_no_session',
  'unpaid_booking',
  'unknown_number',
  'session_completed',
  'callback_window_expired',
  'ambiguous_match',
  'invalid_phone',
  'missing_secret',
  'store_error',
  'audit_error',
  'idempotency_conflict',
] as const

export type CallerClassificationDecision = (typeof CALLER_CLASSIFICATION_DECISIONS)[number]

export interface CallerClassificationResult {
  decision: CallerClassificationDecision
  allowCall: boolean
  reason: string
  callerPhoneFingerprint: string | null
  callerPhoneMasked: string | null
  bookingId: string | null
  sessionId: string | null
  remainingSeconds: number | null
  resumeWindowExpiresAt: string | null
  evaluatedAt: string
}

export interface CallerDecisionAuditRecord {
  id: string
  decision: CallerClassificationDecision
  allowCall: boolean
  reason: string
  callerPhoneFingerprint: string | null
  callerPhoneMasked: string | null
  bookingId: string | null
  sessionId: string | null
  remainingSeconds: number | null
  resumeWindowExpiresAt: string | null
  idempotencyKey: string | null
  requestHash: string | null
  payloadHash: string | null
  evaluatedAt: string
  createdAt: string
}

export interface ClassifyCallerOptions {
  secretOverride?: string
  now?: Date
  idempotencyKey?: string
  recordAudit?: boolean
}
