import type {
  CallerClassificationDecision,
  CallerClassificationResult,
} from './caller-classification-types'

export const OFFICIAL_SMS_DOMAINS = ['regulskibehawiorysta.pl'] as const
export const OFFICIAL_SMS_PATHS = ['/zapytaj'] as const
export const MAX_TRANSACTIONAL_SMS_LENGTH = 160
export const CALLER_SMS_RATE_LIMIT_HOURS = 24
export const CALLER_SMS_RATE_LIMIT_MS = CALLER_SMS_RATE_LIMIT_HOURS * 60 * 60 * 1000

export type CallerSmsAction = 'send' | 'do_not_send'
export type CallerSmsStatus = 'prepared' | 'do_not_send'

export const ADMISSIBLE_CALLER_SMS_DECISIONS = [
  'unknown_number',
  'session_completed',
  'callback_window_expired',
  'unpaid_booking',
] as const

export const BLOCKED_CALLER_SMS_DECISIONS = [
  'eligible_callback',
  'session_in_progress',
  'paid_booking_no_session',
  'ambiguous_match',
  'invalid_phone',
  'missing_secret',
  'store_error',
  'audit_error',
  'idempotency_conflict',
] as const

export type AdmissibleCallerSmsDecision = (typeof ADMISSIBLE_CALLER_SMS_DECISIONS)[number]
export type BlockedCallerSmsDecision = (typeof BLOCKED_CALLER_SMS_DECISIONS)[number]

export interface CallerSmsPreparationRecord {
  id: string
  action: CallerSmsAction
  status: CallerSmsStatus
  decision: CallerClassificationDecision
  callerPhoneFingerprint: string | null
  callerPhoneMasked: string | null
  message: string | null
  targetUrl: string | null
  rejectionReason: string | null
  idempotencyKey: string | null
  requestHash: string | null
  payloadHash: string | null
  preparedAt: string
  createdAt: string
}

export interface GenerateCallerSmsOptions {
  idempotencyKey?: string
  now?: Date
  dryRun?: boolean
  targetUrlOverride?: string
  messageTemplateOverride?: string
  secretOverride?: string
  recordPreparation?: boolean
}

export interface CallerSmsPolicyEvaluation {
  action: CallerSmsAction
  status: CallerSmsStatus
  decision: CallerClassificationDecision
  callerPhoneFingerprint: string | null
  callerPhoneMasked: string | null
  message: string | null
  targetUrl: string | null
  rejectionReason: string | null
  isAdmissible: boolean
}

export interface CallerSmsStoreSnapshot {
  preparations: CallerSmsPreparationRecord[]
}
