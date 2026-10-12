import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { getLocalStoreDataDir } from '@/lib/server/local-store-path'
import { getSupabaseServerConfig, resolveDataMode } from '@/lib/server/env'
import { createClient } from '@supabase/supabase-js'
import { getBookingById } from '@/lib/server/db'
import {
  UrgentIntakeRequest,
  UrgentIntakeEvent,
  UrgentIntakeDayChoice,
  UrgentIntakeState,
  AvailabilityNotificationRequest,
  AvailabilityNotificationEvent,
  AvailabilityNotificationState,
  ConsultationTalkEntitlement,
  ConsultationTalkEntitlementEvent,
  TalkEntitlementState,
  CreateUrgentIntakeInput,
  ProposeUrgentTimeslotInput,
  ConfirmUrgentPaymentInput,
  TransitionUrgentIntakeInput,
  CreateAvailabilityNotificationInput,
  OfferAvailabilityNotificationInput,
  ConfirmNotificationPaymentInput,
  TransitionAvailabilityNotificationInput,
  CreateTalkEntitlementInput,
  ConsumeTalkEntitlementInput,
  RevokeTalkEntitlementInput,
  Section16SweepResult,
  Section16ExpirationSweepOptions,
  Section16DomainError,
  Section16NotFoundError,
  Section16TerminalStateError,
  Section16TransitionError,
  Section16ConcurrencyError,
  Section16IdempotencyConflictError,
  Section16HoldExpiredError,
  Section16PaymentRequiredError,
  Section16ValidationError,
  Section16InvalidIdempotencyKeyError,
  Section16PrivacyError,
  Section16EntitlementAlreadyExistsError,
  isValidUrgentIntakeTransition,
  isTerminalUrgentIntakeState,
  isValidAvailabilityNotificationTransition,
  isTerminalAvailabilityNotificationState,
  isValidTalkEntitlementTransition,
  isTerminalTalkEntitlementState,
} from './section16-types'
import {
  resolveWarsawIntakeTargetDate,
  validateWarsawIntakeTargetDate,
  validateContactCiphertextContract,
  validateIdempotencyKey,
  computeSection16PayloadHash,
  computeCallerPhoneFingerprint,
  computeCallerPhoneMasked,
  sanitizePayload,
  DEFAULT_INTAKE_EXPIRY_HOURS,
  DEFAULT_HOLD_EXPIRY_MINUTES,
  DEFAULT_OFFER_EXPIRY_MINUTES,
  DEFAULT_NOTIFICATION_QUEUE_EXPIRY_DAYS,
  DEFAULT_TALK_ENTITLEMENT_ALLOCATED_SECONDS,
  validateSweepBatchLimit,
} from './section16-policy'

export interface Section16StoreSnapshot {
  urgentIntakes: UrgentIntakeRequest[]
  urgentEvents: UrgentIntakeEvent[]
  notificationRequests: AvailabilityNotificationRequest[]
  notificationEvents: AvailabilityNotificationEvent[]
  talkEntitlements: ConsultationTalkEntitlement[]
  talkEvents: ConsultationTalkEntitlementEvent[]
}

let localStoreQueue = Promise.resolve()

function withStoreLock<T>(work: () => Promise<T>): Promise<T> {
  const next = localStoreQueue.then(work, work)
  localStoreQueue = next.then(
    () => undefined,
    () => undefined,
  )
  return next
}

function getStorePath(): string {
  return path.join(getLocalStoreDataDir(), 'section16-snapshot.json')
}

async function readStoreSnapshot(): Promise<Section16StoreSnapshot> {
  const filePath = getStorePath()
  try {
    const raw = await readFile(filePath, 'utf8')
    const parsed = JSON.parse(raw) as Partial<Section16StoreSnapshot>
    return {
      urgentIntakes: Array.isArray(parsed?.urgentIntakes) ? parsed.urgentIntakes : [],
      urgentEvents: Array.isArray(parsed?.urgentEvents) ? parsed.urgentEvents : [],
      notificationRequests: Array.isArray(parsed?.notificationRequests) ? parsed.notificationRequests : [],
      notificationEvents: Array.isArray(parsed?.notificationEvents) ? parsed.notificationEvents : [],
      talkEntitlements: Array.isArray(parsed?.talkEntitlements) ? parsed.talkEntitlements : [],
      talkEvents: Array.isArray(parsed?.talkEvents) ? parsed.talkEvents : [],
    }
  } catch (error: any) {
    if (error && error.code === 'ENOENT') {
      return {
        urgentIntakes: [],
        urgentEvents: [],
        notificationRequests: [],
        notificationEvents: [],
        talkEntitlements: [],
        talkEvents: [],
      }
    }
    throw new Section16DomainError(
      `Nie można odczytać magazynu sekcji 16 (fail-closed): ${error instanceof Error ? error.message : String(error)}`,
      'STORE_READ_ERROR',
    )
  }
}

async function writeStoreSnapshot(snapshot: Section16StoreSnapshot): Promise<void> {
  const targetPath = getStorePath()
  const dir = path.dirname(targetPath)
  await mkdir(dir, { recursive: true })

  const tempPath = path.join(dir, `.section16-snapshot.${randomUUID()}.tmp`)
  const content = JSON.stringify(snapshot, null, 2)

  await writeFile(tempPath, content, 'utf8')
  try {
    await rename(tempPath, targetPath)
  } catch (renameErr) {
    try {
      await unlink(tempPath)
    } catch {
      // ignore unlink error
    }
    throw renameErr
  }
}

export async function resetSection16LocalStore(): Promise<void> {
  await withStoreLock(async () => {
    const targetPath = getStorePath()
    try {
      await unlink(targetPath)
    } catch (e: any) {
      if (e?.code !== 'ENOENT') throw e
    }
  })
}

export async function readSection16StoreSnapshot(): Promise<Section16StoreSnapshot> {
  return readStoreSnapshot()
}

export async function updateSection16StoreSnapshot(
  updater: (snapshot: Section16StoreSnapshot) => void | Promise<void>,
): Promise<void> {
  await withStoreLock(async () => {
    const store = await readStoreSnapshot()
    await updater(store)
    await writeStoreSnapshot(store)
  })
}

function getSupabaseClient() {
  const config = getSupabaseServerConfig('section16 autonomous data model')
  return createClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function mapRpcError(error: any): never {
  const message = error?.message || String(error)
  if (message.includes('INVALID_IDEMPOTENCY_KEY')) {
    throw new Section16InvalidIdempotencyKeyError(message)
  }
  if (message.includes('IDEMPOTENCY_CONFLICT')) {
    throw new Section16IdempotencyConflictError(message)
  }
  if (message.includes('ENTITLEMENT_ALREADY_EXISTS')) {
    throw new Section16EntitlementAlreadyExistsError(message)
  }
  if (message.includes('CONCURRENCY_CONFLICT')) {
    throw new Section16ConcurrencyError(0, 0)
  }
  if (
    message.includes('REQUEST_NOT_FOUND') ||
    message.includes('ENTITLEMENT_NOT_FOUND') ||
    message.includes('SOURCE_NOT_FOUND') ||
    message.includes('BOOKING_NOT_FOUND')
  ) {
    throw new Section16NotFoundError('Section16Entity', message)
  }
  if (message.includes('TERMINAL_STATE')) {
    throw new Section16TerminalStateError('Section16Entity', message)
  }
  if (
    message.includes('ILLEGAL_TRANSITION') ||
    message.includes('INVALID_STATE') ||
    message.includes('INVALID_TARGET_STATE')
  ) {
    throw new Section16TransitionError('Section16Entity', 'unknown', message)
  }
  if (
    message.includes('HOLD_EXPIRED') ||
    message.includes('OFFER_EXPIRED') ||
    message.includes('ENTITLEMENT_EXPIRED') ||
    message.includes('REQUEST_EXPIRED')
  ) {
    throw new Section16HoldExpiredError(message)
  }
  if (
    message.includes('PAYMENT_REQUIRED') ||
    message.includes('PAYMENT_SOURCE_REQUIRED') ||
    message.includes('UNPAID_SOURCE') ||
    message.includes('UNPAID_BOOKING') ||
    message.includes('MISSING_PAYMENT_REFERENCE')
  ) {
    throw new Section16PaymentRequiredError(message)
  }
  if (message.includes('INVALID_CONTACT_CIPHERTEXT')) {
    throw new Section16PrivacyError(message)
  }
  if (
    message.includes('INVALID_BATCH_LIMIT') ||
    message.includes('INVALID_DAY_CHOICE') ||
    message.includes('INVALID_TARGET_DATE') ||
    message.includes('INVALID_FINGERPRINT') ||
    message.includes('INVALID_EXPIRY') ||
    message.includes('INVALID_OFFER_EXPIRY') ||
    message.includes('INVALID_CHANNEL') ||
    message.includes('INVALID_VALIDITY_WINDOW') ||
    message.includes('FINGERPRINT_MISMATCH') ||
    message.includes('PAYMENT_REFERENCE_MISMATCH') ||
    message.includes('CONFLICTING_SOURCES') ||
    message.includes('DATE_MISMATCH') ||
    message.includes('INVALID_HOLD') ||
    message.includes('ENTITLEMENT_NOT_YET_VALID') ||
    message.includes('MISSING_SESSION_ID') ||
    message.includes('INVALID_PAYLOAD_HASH')
  ) {
    throw new Section16ValidationError(message)
  }
  throw new Section16DomainError(message, 'RPC_ERROR')
}

/**
 * Maps Supabase / PostgREST snake_case row to UrgentIntakeRequest with strict runtime validation.
 * Fails closed if any mandatory property is missing or of incorrect type.
 */
export function mapUrgentIntakeRequestRecord(raw: unknown): UrgentIntakeRequest {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Section16ValidationError('Rekord UrgentIntakeRequest musi być niepustym obiektem')
  }

  const r = raw as Record<string, unknown>

  const id = r.id
  if (typeof id !== 'string' || id.trim().length === 0) {
    throw new Section16ValidationError('Brak lub nieprawidłowe pole id w rekordzie UrgentIntakeRequest')
  }

  const dayChoiceRaw = r.day_choice ?? r.dayChoice
  if (dayChoiceRaw !== 'today' && dayChoiceRaw !== 'tomorrow') {
    throw new Section16ValidationError(
      `Nieprawidłowe pole dayChoice w rekordzie UrgentIntakeRequest: ${String(dayChoiceRaw)}`,
    )
  }
  const dayChoice = dayChoiceRaw as UrgentIntakeDayChoice

  const targetDateRaw = r.target_date ?? r.targetDate
  if (typeof targetDateRaw !== 'string' || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(targetDateRaw)) {
    throw new Section16ValidationError(
      `Brak lub nieprawidłowe pole targetDate w rekordzie UrgentIntakeRequest: ${String(targetDateRaw)}`,
    )
  }
  const targetDate = targetDateRaw

  const callerPhoneFingerprint = r.caller_phone_fingerprint ?? r.callerPhoneFingerprint
  if (typeof callerPhoneFingerprint !== 'string' || callerPhoneFingerprint.trim().length === 0) {
    throw new Section16ValidationError(
      'Brak lub nieprawidłowe pole callerPhoneFingerprint w rekordzie UrgentIntakeRequest',
    )
  }

  const callerPhoneMasked = r.caller_phone_masked ?? r.callerPhoneMasked
  if (typeof callerPhoneMasked !== 'string' || callerPhoneMasked.trim().length === 0) {
    throw new Section16ValidationError(
      'Brak lub nieprawidłowe pole callerPhoneMasked w rekordzie UrgentIntakeRequest',
    )
  }

  const contactCiphertextRaw = r.contact_ciphertext !== undefined ? r.contact_ciphertext : r.contactCiphertext
  if (
    contactCiphertextRaw !== null &&
    contactCiphertextRaw !== undefined &&
    typeof contactCiphertextRaw !== 'string'
  ) {
    throw new Section16ValidationError(
      'Nieprawidłowy typ pola contactCiphertext w rekordzie UrgentIntakeRequest',
    )
  }
  const contactCiphertext = (contactCiphertextRaw as string | null) ?? null

  const clientNameRaw = r.client_name !== undefined ? r.client_name : r.clientName
  if (clientNameRaw !== null && clientNameRaw !== undefined && typeof clientNameRaw !== 'string') {
    throw new Section16ValidationError('Nieprawidłowy typ pola clientName w rekordzie UrgentIntakeRequest')
  }
  const clientName = (clientNameRaw as string | null) ?? null

  const clientNotesRaw = r.client_notes !== undefined ? r.client_notes : r.clientNotes
  if (clientNotesRaw !== null && clientNotesRaw !== undefined && typeof clientNotesRaw !== 'string') {
    throw new Section16ValidationError('Nieprawidłowy typ pola clientNotes w rekordzie UrgentIntakeRequest')
  }
  const clientNotes = (clientNotesRaw as string | null) ?? null

  const stateRaw = r.state
  if (
    typeof stateRaw !== 'string' ||
    !['pending_proposal', 'timeslot_proposed', 'payment_confirmed', 'expired', 'cancelled', 'rejected'].includes(
      stateRaw,
    )
  ) {
    throw new Section16ValidationError(
      `Brak lub nieprawidłowy stan (state) w rekordzie UrgentIntakeRequest: ${String(stateRaw)}`,
    )
  }
  const state = stateRaw as UrgentIntakeState

  const proposedDateRaw = r.proposed_date !== undefined ? r.proposed_date : r.proposedDate
  if (proposedDateRaw !== null && proposedDateRaw !== undefined && typeof proposedDateRaw !== 'string') {
    throw new Section16ValidationError('Nieprawidłowy typ pola proposedDate w rekordzie UrgentIntakeRequest')
  }
  const proposedDate = (proposedDateRaw as string | null) ?? null

  const proposedTimeRaw = r.proposed_time !== undefined ? r.proposed_time : r.proposedTime
  if (proposedTimeRaw !== null && proposedTimeRaw !== undefined && typeof proposedTimeRaw !== 'string') {
    throw new Section16ValidationError('Nieprawidłowy typ pola proposedTime w rekordzie UrgentIntakeRequest')
  }
  const proposedTime = (proposedTimeRaw as string | null) ?? null

  const proposedTimeslotIsoRaw =
    r.proposed_timeslot_iso !== undefined ? r.proposed_timeslot_iso : r.proposedTimeslotIso
  if (
    proposedTimeslotIsoRaw !== null &&
    proposedTimeslotIsoRaw !== undefined &&
    typeof proposedTimeslotIsoRaw !== 'string'
  ) {
    throw new Section16ValidationError(
      'Nieprawidłowy typ pola proposedTimeslotIso w rekordzie UrgentIntakeRequest',
    )
  }
  const proposedTimeslotIso = (proposedTimeslotIsoRaw as string | null) ?? null

  const holdExpiresAtRaw = r.hold_expires_at !== undefined ? r.hold_expires_at : r.holdExpiresAt
  if (holdExpiresAtRaw !== null && holdExpiresAtRaw !== undefined && typeof holdExpiresAtRaw !== 'string') {
    throw new Section16ValidationError('Nieprawidłowy typ pola holdExpiresAt w rekordzie UrgentIntakeRequest')
  }
  const holdExpiresAt = (holdExpiresAtRaw as string | null) ?? null

  const expiresAtRaw = r.expires_at ?? r.expiresAt
  if (typeof expiresAtRaw !== 'string' || expiresAtRaw.trim().length === 0) {
    throw new Section16ValidationError(
      'Brak lub nieprawidłowe pole expiresAt w rekordzie UrgentIntakeRequest',
    )
  }
  const expiresAt = expiresAtRaw

  const paymentReferenceRaw = r.payment_reference !== undefined ? r.payment_reference : r.paymentReference
  if (
    paymentReferenceRaw !== null &&
    paymentReferenceRaw !== undefined &&
    typeof paymentReferenceRaw !== 'string'
  ) {
    throw new Section16ValidationError(
      'Nieprawidłowy typ pola paymentReference w rekordzie UrgentIntakeRequest',
    )
  }
  const paymentReference = (paymentReferenceRaw as string | null) ?? null

  const bookingIdRaw = r.booking_id !== undefined ? r.booking_id : r.bookingId
  if (bookingIdRaw !== null && bookingIdRaw !== undefined && typeof bookingIdRaw !== 'string') {
    throw new Section16ValidationError('Nieprawidłowy typ pola bookingId w rekordzie UrgentIntakeRequest')
  }
  const bookingId = (bookingIdRaw as string | null) ?? null

  const versionRaw = r.version
  if (
    typeof versionRaw !== 'number' ||
    !Number.isInteger(versionRaw) ||
    versionRaw < 1 ||
    Number.isNaN(versionRaw)
  ) {
    throw new Section16ValidationError(
      `Brak lub nieprawidłowe pole version w rekordzie UrgentIntakeRequest: ${String(versionRaw)}`,
    )
  }
  const version = versionRaw

  const idempotencyKeyRaw = r.idempotency_key ?? r.idempotencyKey
  if (typeof idempotencyKeyRaw !== 'string' || idempotencyKeyRaw.trim().length === 0) {
    throw new Section16ValidationError(
      'Brak lub nieprawidłowe pole idempotencyKey w rekordzie UrgentIntakeRequest',
    )
  }
  const idempotencyKey = idempotencyKeyRaw.trim()

  const createdAtRaw = r.created_at ?? r.createdAt
  if (typeof createdAtRaw !== 'string' || createdAtRaw.trim().length === 0) {
    throw new Section16ValidationError(
      'Brak lub nieprawidłowe pole createdAt w rekordzie UrgentIntakeRequest',
    )
  }
  const createdAt = createdAtRaw

  const updatedAtRaw = r.updated_at ?? r.updatedAt
  if (typeof updatedAtRaw !== 'string' || updatedAtRaw.trim().length === 0) {
    throw new Section16ValidationError(
      'Brak lub nieprawidłowe pole updatedAt w rekordzie UrgentIntakeRequest',
    )
  }
  const updatedAt = updatedAtRaw

  return {
    id,
    dayChoice,
    targetDate,
    callerPhoneFingerprint,
    callerPhoneMasked,
    contactCiphertext,
    clientName,
    clientNotes,
    state,
    proposedDate,
    proposedTime,
    proposedTimeslotIso,
    holdExpiresAt,
    expiresAt,
    paymentReference,
    bookingId,
    version,
    idempotencyKey,
    createdAt,
    updatedAt,
  }
}

/**
 * Maps Supabase / PostgREST snake_case row to UrgentIntakeEvent with strict runtime validation.
 * Fails closed if any mandatory property is missing or of incorrect type.
 */
export function mapUrgentIntakeEventRecord(raw: unknown): UrgentIntakeEvent {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Section16ValidationError('Rekord UrgentIntakeEvent musi być niepustym obiektem')
  }

  const r = raw as Record<string, unknown>

  const id = r.id
  if (typeof id !== 'string' || id.trim().length === 0) {
    throw new Section16ValidationError('Brak lub nieprawidłowe pole id w rekordzie UrgentIntakeEvent')
  }

  const requestIdRaw = r.request_id ?? r.requestId
  if (typeof requestIdRaw !== 'string' || requestIdRaw.trim().length === 0) {
    throw new Section16ValidationError(
      'Brak lub nieprawidłowe pole requestId w rekordzie UrgentIntakeEvent',
    )
  }
  const requestId = requestIdRaw

  const eventTypeRaw = r.event_type ?? r.eventType
  if (typeof eventTypeRaw !== 'string' || eventTypeRaw.trim().length === 0) {
    throw new Section16ValidationError(
      'Brak lub nieprawidłowe pole eventType w rekordzie UrgentIntakeEvent',
    )
  }
  const eventType = eventTypeRaw

  const fromStateRaw = r.from_state !== undefined ? r.from_state : r.fromState
  if (
    fromStateRaw !== null &&
    fromStateRaw !== undefined &&
    (typeof fromStateRaw !== 'string' ||
      !['pending_proposal', 'timeslot_proposed', 'payment_confirmed', 'expired', 'cancelled', 'rejected'].includes(
        fromStateRaw,
      ))
  ) {
    throw new Section16ValidationError(
      `Nieprawidłowy stan fromState w rekordzie UrgentIntakeEvent: ${String(fromStateRaw)}`,
    )
  }
  const fromState = (fromStateRaw as UrgentIntakeState | null) ?? null

  const toStateRaw = r.to_state ?? r.toState
  if (
    typeof toStateRaw !== 'string' ||
    !['pending_proposal', 'timeslot_proposed', 'payment_confirmed', 'expired', 'cancelled', 'rejected'].includes(
      toStateRaw,
    )
  ) {
    throw new Section16ValidationError(
      `Brak lub nieprawidłowy stan toState w rekordzie UrgentIntakeEvent: ${String(toStateRaw)}`,
    )
  }
  const toState = toStateRaw as UrgentIntakeState

  const payloadRaw = r.payload
  if (!payloadRaw || typeof payloadRaw !== 'object' || Array.isArray(payloadRaw)) {
    throw new Section16ValidationError('Pole payload w rekordzie UrgentIntakeEvent musi być obiektem')
  }
  const payload = payloadRaw as Record<string, unknown>

  const payloadHashRaw = r.payload_hash ?? r.payloadHash
  if (typeof payloadHashRaw !== 'string' || payloadHashRaw.trim().length === 0) {
    throw new Section16ValidationError(
      'Brak lub nieprawidłowe pole payloadHash w rekordzie UrgentIntakeEvent',
    )
  }
  const payloadHash = payloadHashRaw

  const idempotencyKeyRaw = r.idempotency_key ?? r.idempotencyKey
  if (typeof idempotencyKeyRaw !== 'string' || idempotencyKeyRaw.trim().length === 0) {
    throw new Section16ValidationError(
      'Brak lub nieprawidłowe pole idempotencyKey w rekordzie UrgentIntakeEvent',
    )
  }
  const idempotencyKey = idempotencyKeyRaw.trim()

  const createdAtRaw = r.created_at ?? r.createdAt
  if (typeof createdAtRaw !== 'string' || createdAtRaw.trim().length === 0) {
    throw new Section16ValidationError(
      'Brak lub nieprawidłowe pole createdAt w rekordzie UrgentIntakeEvent',
    )
  }
  const createdAt = createdAtRaw

  return {
    id,
    requestId,
    eventType,
    fromState,
    toState,
    payload,
    payloadHash,
    idempotencyKey,
    createdAt,
  }
}

/**
 * Maps Supabase / PostgREST snake_case row to AvailabilityNotificationRequest with strict runtime validation.
 * Fails closed if any mandatory property is missing or of incorrect type.
 */
export function mapAvailabilityNotificationRequestRecord(raw: unknown): AvailabilityNotificationRequest {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Section16ValidationError('Rekord AvailabilityNotificationRequest musi być niepustym obiektem')
  }

  const r = raw as Record<string, unknown>

  const id = r.id
  if (typeof id !== 'string' || id.trim().length === 0) {
    throw new Section16ValidationError('Brak lub nieprawidłowe pole id w rekordzie AvailabilityNotificationRequest')
  }

  const callerPhoneFingerprint = r.caller_phone_fingerprint ?? r.callerPhoneFingerprint
  if (typeof callerPhoneFingerprint !== 'string' || callerPhoneFingerprint.trim().length === 0) {
    throw new Section16ValidationError(
      'Brak lub nieprawidłowe pole callerPhoneFingerprint w rekordzie AvailabilityNotificationRequest',
    )
  }

  const callerPhoneMasked = r.caller_phone_masked ?? r.callerPhoneMasked
  if (typeof callerPhoneMasked !== 'string' || callerPhoneMasked.trim().length === 0) {
    throw new Section16ValidationError(
      'Brak lub nieprawidłowe pole callerPhoneMasked w rekordzie AvailabilityNotificationRequest',
    )
  }

  const contactCiphertextRaw = r.contact_ciphertext !== undefined ? r.contact_ciphertext : r.contactCiphertext
  if (
    contactCiphertextRaw !== null &&
    contactCiphertextRaw !== undefined &&
    typeof contactCiphertextRaw !== 'string'
  ) {
    throw new Section16ValidationError(
      'Nieprawidłowy typ pola contactCiphertext w rekordzie AvailabilityNotificationRequest',
    )
  }
  const contactCiphertext = (contactCiphertextRaw as string | null) ?? null

  const channelRaw = r.channel
  if (channelRaw !== 'sms' && channelRaw !== 'email') {
    throw new Section16ValidationError(
      `Brak lub nieprawidłowy kanał (channel) w rekordzie AvailabilityNotificationRequest: ${String(channelRaw)}`,
    )
  }
  const channel = channelRaw as 'sms' | 'email'

  const clientNameRaw = r.client_name !== undefined ? r.client_name : r.clientName
  if (clientNameRaw !== null && clientNameRaw !== undefined && typeof clientNameRaw !== 'string') {
    throw new Section16ValidationError(
      'Nieprawidłowy typ pola clientName w rekordzie AvailabilityNotificationRequest',
    )
  }
  const clientName = (clientNameRaw as string | null) ?? null

  const stateRaw = r.state
  if (
    typeof stateRaw !== 'string' ||
    !['queued', 'offer_sent', 'accepted_paid', 'expired', 'cancelled', 'consumed'].includes(stateRaw)
  ) {
    throw new Section16ValidationError(
      `Brak lub nieprawidłowy stan (state) w rekordzie AvailabilityNotificationRequest: ${String(stateRaw)}`,
    )
  }
  const state = stateRaw as AvailabilityNotificationState

  const queuePositionRaw = r.queue_position !== undefined ? r.queue_position : r.queuePosition
  let queuePosition: number
  if (typeof queuePositionRaw === 'number') {
    if (!Number.isInteger(queuePositionRaw) || queuePositionRaw <= 0 || !Number.isSafeInteger(queuePositionRaw)) {
      throw new Section16ValidationError(
        `Brak lub nieprawidłowe pole queuePosition w rekordzie AvailabilityNotificationRequest: ${String(queuePositionRaw)}`,
      )
    }
    queuePosition = queuePositionRaw
  } else if (typeof queuePositionRaw === 'string' && /^[1-9][0-9]*$/.test(queuePositionRaw.trim())) {
    const parsed = Number(queuePositionRaw.trim())
    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
      throw new Section16ValidationError(
        `Brak lub nieprawidłowe pole queuePosition w rekordzie AvailabilityNotificationRequest: ${String(queuePositionRaw)}`,
      )
    }
    queuePosition = parsed
  } else {
    throw new Section16ValidationError(
      `Brak lub nieprawidłowe pole queuePosition w rekordzie AvailabilityNotificationRequest: ${String(queuePositionRaw)}`,
    )
  }

  const offeredAtRaw = r.offered_at !== undefined ? r.offered_at : r.offeredAt
  if (offeredAtRaw !== null && offeredAtRaw !== undefined) {
    if (typeof offeredAtRaw !== 'string' || offeredAtRaw.trim().length === 0 || Number.isNaN(Date.parse(offeredAtRaw))) {
      throw new Section16ValidationError(
        'Nieprawidłowy format pola offeredAt w rekordzie AvailabilityNotificationRequest',
      )
    }
  }
  const offeredAt = (offeredAtRaw as string | null) ?? null

  const offerExpiresAtRaw = r.offer_expires_at !== undefined ? r.offer_expires_at : r.offerExpiresAt
  if (offerExpiresAtRaw !== null && offerExpiresAtRaw !== undefined) {
    if (
      typeof offerExpiresAtRaw !== 'string' ||
      offerExpiresAtRaw.trim().length === 0 ||
      Number.isNaN(Date.parse(offerExpiresAtRaw))
    ) {
      throw new Section16ValidationError(
        'Nieprawidłowy format pola offerExpiresAt w rekordzie AvailabilityNotificationRequest',
      )
    }
  }
  const offerExpiresAt = (offerExpiresAtRaw as string | null) ?? null

  const acceptedAtRaw = r.accepted_at !== undefined ? r.accepted_at : r.acceptedAt
  if (acceptedAtRaw !== null && acceptedAtRaw !== undefined) {
    if (
      typeof acceptedAtRaw !== 'string' ||
      acceptedAtRaw.trim().length === 0 ||
      Number.isNaN(Date.parse(acceptedAtRaw))
    ) {
      throw new Section16ValidationError(
        'Nieprawidłowy format pola acceptedAt w rekordzie AvailabilityNotificationRequest',
      )
    }
  }
  const acceptedAt = (acceptedAtRaw as string | null) ?? null

  const paymentReferenceRaw = r.payment_reference !== undefined ? r.payment_reference : r.paymentReference
  if (
    paymentReferenceRaw !== null &&
    paymentReferenceRaw !== undefined &&
    typeof paymentReferenceRaw !== 'string'
  ) {
    throw new Section16ValidationError(
      'Nieprawidłowy typ pola paymentReference w rekordzie AvailabilityNotificationRequest',
    )
  }
  const paymentReference = (paymentReferenceRaw as string | null) ?? null

  const bookingIdRaw = r.booking_id !== undefined ? r.booking_id : r.bookingId
  if (bookingIdRaw !== null && bookingIdRaw !== undefined && typeof bookingIdRaw !== 'string') {
    throw new Section16ValidationError(
      'Nieprawidłowy typ pola bookingId w rekordzie AvailabilityNotificationRequest',
    )
  }
  const bookingId = (bookingIdRaw as string | null) ?? null

  const expiresAtRaw = r.expires_at ?? r.expiresAt
  if (typeof expiresAtRaw !== 'string' || expiresAtRaw.trim().length === 0 || Number.isNaN(Date.parse(expiresAtRaw))) {
    throw new Section16ValidationError(
      'Brak lub nieprawidłowe pole expiresAt w rekordzie AvailabilityNotificationRequest',
    )
  }
  const expiresAt = expiresAtRaw

  const versionRaw = r.version
  if (
    typeof versionRaw !== 'number' ||
    !Number.isInteger(versionRaw) ||
    versionRaw < 1 ||
    Number.isNaN(versionRaw)
  ) {
    throw new Section16ValidationError(
      `Brak lub nieprawidłowe pole version w rekordzie AvailabilityNotificationRequest: ${String(versionRaw)}`,
    )
  }
  const version = versionRaw

  const idempotencyKeyRaw = r.idempotency_key ?? r.idempotencyKey
  if (typeof idempotencyKeyRaw !== 'string' || idempotencyKeyRaw.trim().length === 0) {
    throw new Section16ValidationError(
      'Brak lub nieprawidłowe pole idempotencyKey w rekordzie AvailabilityNotificationRequest',
    )
  }
  const idempotencyKey = idempotencyKeyRaw.trim()

  const createdAtRaw = r.created_at ?? r.createdAt
  if (typeof createdAtRaw !== 'string' || createdAtRaw.trim().length === 0 || Number.isNaN(Date.parse(createdAtRaw))) {
    throw new Section16ValidationError(
      'Brak lub nieprawidłowe pole createdAt w rekordzie AvailabilityNotificationRequest',
    )
  }
  const createdAt = createdAtRaw

  const updatedAtRaw = r.updated_at ?? r.updatedAt
  if (typeof updatedAtRaw !== 'string' || updatedAtRaw.trim().length === 0 || Number.isNaN(Date.parse(updatedAtRaw))) {
    throw new Section16ValidationError(
      'Brak lub nieprawidłowe pole updatedAt w rekordzie AvailabilityNotificationRequest',
    )
  }
  const updatedAt = updatedAtRaw

  return {
    id,
    callerPhoneFingerprint,
    callerPhoneMasked,
    contactCiphertext,
    channel,
    clientName,
    state,
    queuePosition,
    offeredAt,
    offerExpiresAt,
    acceptedAt,
    paymentReference,
    bookingId,
    expiresAt,
    version,
    idempotencyKey,
    createdAt,
    updatedAt,
  }
}

/**
 * Maps Supabase / PostgREST snake_case row to AvailabilityNotificationEvent with strict runtime validation.
 * Fails closed if any mandatory property is missing or of incorrect type.
 */
export function mapAvailabilityNotificationEventRecord(raw: unknown): AvailabilityNotificationEvent {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Section16ValidationError('Rekord AvailabilityNotificationEvent musi być niepustym obiektem')
  }

  const r = raw as Record<string, unknown>

  const id = r.id
  if (typeof id !== 'string' || id.trim().length === 0) {
    throw new Section16ValidationError('Brak lub nieprawidłowe pole id w rekordzie AvailabilityNotificationEvent')
  }

  const requestIdRaw = r.request_id ?? r.requestId
  if (typeof requestIdRaw !== 'string' || requestIdRaw.trim().length === 0) {
    throw new Section16ValidationError(
      'Brak lub nieprawidłowe pole requestId w rekordzie AvailabilityNotificationEvent',
    )
  }
  const requestId = requestIdRaw

  const eventTypeRaw = r.event_type ?? r.eventType
  if (typeof eventTypeRaw !== 'string' || eventTypeRaw.trim().length === 0) {
    throw new Section16ValidationError(
      'Brak lub nieprawidłowe pole eventType w rekordzie AvailabilityNotificationEvent',
    )
  }
  const eventType = eventTypeRaw

  const fromStateRaw = r.from_state !== undefined ? r.from_state : r.fromState
  if (
    fromStateRaw !== null &&
    fromStateRaw !== undefined &&
    (typeof fromStateRaw !== 'string' ||
      !['queued', 'offer_sent', 'accepted_paid', 'expired', 'cancelled', 'consumed'].includes(fromStateRaw))
  ) {
    throw new Section16ValidationError(
      `Nieprawidłowy stan fromState w rekordzie AvailabilityNotificationEvent: ${String(fromStateRaw)}`,
    )
  }
  const fromState = (fromStateRaw as AvailabilityNotificationState | null) ?? null

  const toStateRaw = r.to_state ?? r.toState
  if (
    typeof toStateRaw !== 'string' ||
    !['queued', 'offer_sent', 'accepted_paid', 'expired', 'cancelled', 'consumed'].includes(toStateRaw)
  ) {
    throw new Section16ValidationError(
      `Brak lub nieprawidłowy stan toState w rekordzie AvailabilityNotificationEvent: ${String(toStateRaw)}`,
    )
  }
  const toState = toStateRaw as AvailabilityNotificationState

  const payloadRaw = r.payload
  if (!payloadRaw || typeof payloadRaw !== 'object' || Array.isArray(payloadRaw)) {
    throw new Section16ValidationError('Pole payload w rekordzie AvailabilityNotificationEvent musi być obiektem')
  }
  const payload = payloadRaw as Record<string, unknown>

  const payloadHashRaw = r.payload_hash ?? r.payloadHash
  if (typeof payloadHashRaw !== 'string' || payloadHashRaw.trim().length === 0) {
    throw new Section16ValidationError(
      'Brak lub nieprawidłowe pole payloadHash w rekordzie AvailabilityNotificationEvent',
    )
  }
  const payloadHash = payloadHashRaw

  const idempotencyKeyRaw = r.idempotency_key ?? r.idempotencyKey
  if (typeof idempotencyKeyRaw !== 'string' || idempotencyKeyRaw.trim().length === 0) {
    throw new Section16ValidationError(
      'Brak lub nieprawidłowe pole idempotencyKey w rekordzie AvailabilityNotificationEvent',
    )
  }
  const idempotencyKey = idempotencyKeyRaw.trim()

  const createdAtRaw = r.created_at ?? r.createdAt
  if (typeof createdAtRaw !== 'string' || createdAtRaw.trim().length === 0 || Number.isNaN(Date.parse(createdAtRaw))) {
    throw new Section16ValidationError(
      'Brak lub nieprawidłowe pole createdAt w rekordzie AvailabilityNotificationEvent',
    )
  }
  const createdAt = createdAtRaw

  return {
    id,
    requestId,
    eventType,
    fromState,
    toState,
    payload,
    payloadHash,
    idempotencyKey,
    createdAt,
  }
}

export const SECTION16_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function validateRecordUuid(value: unknown, fieldName: string, entityName: string): string {
  if (typeof value !== 'string' || !SECTION16_UUID_REGEX.test(value.trim())) {
    throw new Section16ValidationError(
      `Brak lub nieprawidłowe pole ${fieldName} (wymagany UUID) w rekordzie ${entityName}: ${String(value)}`,
    )
  }
  return value.trim()
}

function validateRecordNullableUuid(
  value: unknown,
  fieldName: string,
  entityName: string,
): string | null {
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value !== 'string' || !SECTION16_UUID_REGEX.test(value.trim())) {
    throw new Section16ValidationError(
      `Nieprawidłowy format pola ${fieldName} (wymagany UUID lub null) w rekordzie ${entityName}: ${String(value)}`,
    )
  }
  return value.trim()
}

/**
 * Maps Supabase / PostgREST snake_case row to ConsultationTalkEntitlement with strict runtime validation.
 * Fails closed if any mandatory property is missing or of incorrect type.
 */
export function mapConsultationTalkEntitlementRecord(raw: unknown): ConsultationTalkEntitlement {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Section16ValidationError('Rekord ConsultationTalkEntitlement musi być niepustym obiektem')
  }

  const r = raw as Record<string, unknown>

  const id = validateRecordUuid(r.id, 'id', 'ConsultationTalkEntitlement')

  const callerPhoneFingerprint = r.caller_phone_fingerprint ?? r.callerPhoneFingerprint
  if (typeof callerPhoneFingerprint !== 'string' || callerPhoneFingerprint.trim().length === 0) {
    throw new Section16ValidationError(
      'Brak lub nieprawidłowe pole callerPhoneFingerprint w rekordzie ConsultationTalkEntitlement',
    )
  }

  const callerPhoneMasked = r.caller_phone_masked ?? r.callerPhoneMasked
  if (typeof callerPhoneMasked !== 'string' || callerPhoneMasked.trim().length === 0) {
    throw new Section16ValidationError(
      'Brak lub nieprawidłowe pole callerPhoneMasked w rekordzie ConsultationTalkEntitlement',
    )
  }

  const bookingId = validateRecordNullableUuid(
    r.booking_id !== undefined ? r.booking_id : r.bookingId,
    'bookingId',
    'ConsultationTalkEntitlement',
  )

  const paymentReferenceRaw = r.payment_reference ?? r.paymentReference
  if (typeof paymentReferenceRaw !== 'string' || paymentReferenceRaw.trim().length === 0) {
    throw new Section16ValidationError(
      'Brak lub nieprawidłowe pole paymentReference w rekordzie ConsultationTalkEntitlement',
    )
  }
  const paymentReference = paymentReferenceRaw.trim()

  const urgentRequestId = validateRecordNullableUuid(
    r.urgent_request_id !== undefined ? r.urgent_request_id : r.urgentRequestId,
    'urgentRequestId',
    'ConsultationTalkEntitlement',
  )

  const notificationRequestId = validateRecordNullableUuid(
    r.notification_request_id !== undefined ? r.notification_request_id : r.notificationRequestId,
    'notificationRequestId',
    'ConsultationTalkEntitlement',
  )

  if (!urgentRequestId && !notificationRequestId && !bookingId) {
    throw new Section16ValidationError(
      'Wymagane jest co najmniej jedno źródło (urgentRequestId, notificationRequestId lub bookingId) w rekordzie ConsultationTalkEntitlement',
    )
  }

  const allocatedSecondsRaw = r.allocated_seconds !== undefined ? r.allocated_seconds : r.allocatedSeconds
  let allocatedSeconds: number
  if (typeof allocatedSecondsRaw === 'number') {
    if (
      !Number.isInteger(allocatedSecondsRaw) ||
      allocatedSecondsRaw <= 0 ||
      !Number.isSafeInteger(allocatedSecondsRaw)
    ) {
      throw new Section16ValidationError(
        `Brak lub nieprawidłowe pole allocatedSeconds w rekordzie ConsultationTalkEntitlement: ${String(allocatedSecondsRaw)}`,
      )
    }
    allocatedSeconds = allocatedSecondsRaw
  } else if (typeof allocatedSecondsRaw === 'string' && /^[1-9][0-9]*$/.test(allocatedSecondsRaw.trim())) {
    const parsed = Number(allocatedSecondsRaw.trim())
    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
      throw new Section16ValidationError(
        `Brak lub nieprawidłowe pole allocatedSeconds w rekordzie ConsultationTalkEntitlement: ${String(allocatedSecondsRaw)}`,
      )
    }
    allocatedSeconds = parsed
  } else {
    throw new Section16ValidationError(
      `Brak lub nieprawidłowe pole allocatedSeconds w rekordzie ConsultationTalkEntitlement: ${String(allocatedSecondsRaw)}`,
    )
  }

  const validFromRaw = r.valid_from ?? r.validFrom
  if (
    typeof validFromRaw !== 'string' ||
    validFromRaw.trim().length === 0 ||
    Number.isNaN(Date.parse(validFromRaw))
  ) {
    throw new Section16ValidationError(
      'Brak lub nieprawidłowe pole validFrom w rekordzie ConsultationTalkEntitlement',
    )
  }
  const validFrom = validFromRaw

  const validUntilRaw = r.valid_until ?? r.validUntil
  if (
    typeof validUntilRaw !== 'string' ||
    validUntilRaw.trim().length === 0 ||
    Number.isNaN(Date.parse(validUntilRaw))
  ) {
    throw new Section16ValidationError(
      'Brak lub nieprawidłowe pole validUntil w rekordzie ConsultationTalkEntitlement',
    )
  }
  const validUntil = validUntilRaw

  if (Date.parse(validUntil) <= Date.parse(validFrom)) {
    throw new Section16ValidationError(
      'Nieprawidłowe okno ważności: validUntil musi być późniejsze niż validFrom w rekordzie ConsultationTalkEntitlement',
    )
  }

  const stateRaw = r.state
  if (
    typeof stateRaw !== 'string' ||
    !['active', 'consumed', 'expired', 'revoked'].includes(stateRaw)
  ) {
    throw new Section16ValidationError(
      `Brak lub nieprawidłowy stan (state) w rekordzie ConsultationTalkEntitlement: ${String(stateRaw)}`,
    )
  }
  const state = stateRaw as TalkEntitlementState

  const consumedAtRaw = r.consumed_at !== undefined ? r.consumed_at : r.consumedAt
  if (consumedAtRaw !== null && consumedAtRaw !== undefined) {
    if (
      typeof consumedAtRaw !== 'string' ||
      consumedAtRaw.trim().length === 0 ||
      Number.isNaN(Date.parse(consumedAtRaw))
    ) {
      throw new Section16ValidationError(
        'Nieprawidłowy format pola consumedAt w rekordzie ConsultationTalkEntitlement',
      )
    }
  }
  const consumedAt = (consumedAtRaw as string | null) ?? null

  const consumedCallSessionId = validateRecordNullableUuid(
    r.consumed_call_session_id !== undefined ? r.consumed_call_session_id : r.consumedCallSessionId,
    'consumedCallSessionId',
    'ConsultationTalkEntitlement',
  )

  if (state === 'consumed' && (!consumedAt || !consumedCallSessionId)) {
    throw new Section16ValidationError(
      'Stan consumed wymaga obecności niepustych pól consumedAt i consumedCallSessionId w rekordzie ConsultationTalkEntitlement',
    )
  }

  const versionRaw = r.version
  if (
    typeof versionRaw !== 'number' ||
    !Number.isInteger(versionRaw) ||
    versionRaw < 1 ||
    Number.isNaN(versionRaw)
  ) {
    throw new Section16ValidationError(
      `Brak lub nieprawidłowe pole version w rekordzie ConsultationTalkEntitlement: ${String(versionRaw)}`,
    )
  }
  const version = versionRaw

  const idempotencyKeyRaw = r.idempotency_key ?? r.idempotencyKey
  if (typeof idempotencyKeyRaw !== 'string' || idempotencyKeyRaw.trim().length === 0) {
    throw new Section16ValidationError(
      'Brak lub nieprawidłowe pole idempotencyKey w rekordzie ConsultationTalkEntitlement',
    )
  }
  const idempotencyKey = idempotencyKeyRaw.trim()

  const createdAtRaw = r.created_at ?? r.createdAt
  if (
    typeof createdAtRaw !== 'string' ||
    createdAtRaw.trim().length === 0 ||
    Number.isNaN(Date.parse(createdAtRaw))
  ) {
    throw new Section16ValidationError(
      'Brak lub nieprawidłowe pole createdAt w rekordzie ConsultationTalkEntitlement',
    )
  }
  const createdAt = createdAtRaw

  const updatedAtRaw = r.updated_at ?? r.updatedAt
  if (
    typeof updatedAtRaw !== 'string' ||
    updatedAtRaw.trim().length === 0 ||
    Number.isNaN(Date.parse(updatedAtRaw))
  ) {
    throw new Section16ValidationError(
      'Brak lub nieprawidłowe pole updatedAt w rekordzie ConsultationTalkEntitlement',
    )
  }
  const updatedAt = updatedAtRaw

  return {
    id,
    callerPhoneFingerprint,
    callerPhoneMasked,
    bookingId,
    paymentReference,
    urgentRequestId,
    notificationRequestId,
    allocatedSeconds,
    validFrom,
    validUntil,
    state,
    consumedAt,
    consumedCallSessionId,
    version,
    idempotencyKey,
    createdAt,
    updatedAt,
  }
}

/**
 * Maps Supabase / PostgREST snake_case row to ConsultationTalkEntitlementEvent with strict runtime validation.
 * Fails closed if any mandatory property is missing or of incorrect type.
 */
export function mapConsultationTalkEntitlementEventRecord(
  raw: unknown,
): ConsultationTalkEntitlementEvent {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Section16ValidationError('Rekord ConsultationTalkEntitlementEvent musi być niepustym obiektem')
  }

  const r = raw as Record<string, unknown>

  const id = validateRecordUuid(r.id, 'id', 'ConsultationTalkEntitlementEvent')

  const entitlementId = validateRecordUuid(
    r.entitlement_id ?? r.entitlementId,
    'entitlementId',
    'ConsultationTalkEntitlementEvent',
  )

  const eventTypeRaw = r.event_type ?? r.eventType
  if (typeof eventTypeRaw !== 'string' || eventTypeRaw.trim().length === 0) {
    throw new Section16ValidationError(
      'Brak lub nieprawidłowe pole eventType w rekordzie ConsultationTalkEntitlementEvent',
    )
  }
  const eventType = eventTypeRaw

  const fromStateRaw = r.from_state !== undefined ? r.from_state : r.fromState
  if (
    fromStateRaw !== null &&
    fromStateRaw !== undefined &&
    (typeof fromStateRaw !== 'string' ||
      !['active', 'consumed', 'expired', 'revoked'].includes(fromStateRaw))
  ) {
    throw new Section16ValidationError(
      `Nieprawidłowy stan fromState w rekordzie ConsultationTalkEntitlementEvent: ${String(fromStateRaw)}`,
    )
  }
  const fromState = (fromStateRaw as TalkEntitlementState | null) ?? null

  const toStateRaw = r.to_state ?? r.toState
  if (
    typeof toStateRaw !== 'string' ||
    !['active', 'consumed', 'expired', 'revoked'].includes(toStateRaw)
  ) {
    throw new Section16ValidationError(
      `Brak lub nieprawidłowy stan toState w rekordzie ConsultationTalkEntitlementEvent: ${String(toStateRaw)}`,
    )
  }
  const toState = toStateRaw as TalkEntitlementState

  const payloadRaw = r.payload
  if (!payloadRaw || typeof payloadRaw !== 'object' || Array.isArray(payloadRaw)) {
    throw new Section16ValidationError(
      'Pole payload w rekordzie ConsultationTalkEntitlementEvent musi być obiektem',
    )
  }
  const payload = payloadRaw as Record<string, unknown>

  const payloadHashRaw = r.payload_hash ?? r.payloadHash
  if (typeof payloadHashRaw !== 'string' || payloadHashRaw.trim().length === 0) {
    throw new Section16ValidationError(
      'Brak lub nieprawidłowe pole payloadHash w rekordzie ConsultationTalkEntitlementEvent',
    )
  }
  const payloadHash = payloadHashRaw

  const idempotencyKeyRaw = r.idempotency_key ?? r.idempotencyKey
  if (typeof idempotencyKeyRaw !== 'string' || idempotencyKeyRaw.trim().length === 0) {
    throw new Section16ValidationError(
      'Brak lub nieprawidłowe pole idempotencyKey w rekordzie ConsultationTalkEntitlementEvent',
    )
  }
  const idempotencyKey = idempotencyKeyRaw.trim()

  const createdAtRaw = r.created_at ?? r.createdAt
  if (
    typeof createdAtRaw !== 'string' ||
    createdAtRaw.trim().length === 0 ||
    Number.isNaN(Date.parse(createdAtRaw))
  ) {
    throw new Section16ValidationError(
      'Brak lub nieprawidłowe pole createdAt w rekordzie ConsultationTalkEntitlementEvent',
    )
  }
  const createdAt = createdAtRaw

  return {
    id,
    entitlementId,
    eventType,
    fromState,
    toState,
    payload,
    payloadHash,
    idempotencyKey,
    createdAt,
  }
}

function getDataMode(): 'local' | 'supabase' {
  return resolveDataMode('section16 autonomous data model')
}

// ---------------------------------------------------------------------------
// PATH A: URGENT INTAKE REQUESTS
// ---------------------------------------------------------------------------

export async function createUrgentIntakeRequest(
  input: CreateUrgentIntakeInput,
  nowDate: Date = new Date(),
): Promise<UrgentIntakeRequest> {
  const mode = getDataMode()
  const idempotencyKey = validateIdempotencyKey(input.idempotencyKey)
  const targetDate = input.targetDate ?? resolveWarsawIntakeTargetDate(input.dayChoice, nowDate)
  validateWarsawIntakeTargetDate(input.dayChoice, targetDate, nowDate)

  const fingerprint = input.callerPhoneFingerprint ?? (input.rawPhone ? computeCallerPhoneFingerprint(input.rawPhone) : '')
  const masked = input.callerPhoneMasked ?? (input.rawPhone ? computeCallerPhoneMasked(input.rawPhone) : '')
  if (!fingerprint) {
    throw new Section16ValidationError('Wymagany jest fingerprint numeru telefonu lub rawPhone')
  }

  validateContactCiphertextContract(input.contactCiphertext)

  const sanitizedPayload = sanitizePayload(input.payload ?? {})
  const payloadHash = computeSection16PayloadHash(sanitizedPayload)
  const defaultExpiryIso = new Date(nowDate.getTime() + DEFAULT_INTAKE_EXPIRY_HOURS * 3600 * 1000).toISOString()
  const expiresAt = input.expiresAt ?? defaultExpiryIso
  const requestId = input.requestId ?? randomUUID()

  if (mode === 'supabase') {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.rpc('create_urgent_intake_request', {
      p_request_id: requestId,
      p_day_choice: input.dayChoice,
      p_target_date: targetDate,
      p_caller_phone_fingerprint: fingerprint,
      p_caller_phone_masked: masked,
      p_contact_ciphertext: input.contactCiphertext ?? null,
      p_client_name: input.clientName ?? null,
      p_client_notes: input.clientNotes ?? null,
      p_expires_at: expiresAt,
      p_idempotency_key: idempotencyKey,
      p_payload: sanitizedPayload,
      p_payload_hash: payloadHash,
    })
    if (error) mapRpcError(error)
    return mapUrgentIntakeRequestRecord(data)
  }

  // Local / Test store execution
  return withStoreLock(async () => {
    const store = await readStoreSnapshot()

    const existingEvent = store.urgentEvents.find((e) => e.idempotencyKey === idempotencyKey)
    if (existingEvent) {
      if (existingEvent.payloadHash !== payloadHash) {
        throw new Section16IdempotencyConflictError(idempotencyKey)
      }
      const existingReq = store.urgentIntakes.find((r) => r.id === existingEvent.requestId)
      if (existingReq) return existingReq
    }

    const nowIso = nowDate.toISOString()
    const record: UrgentIntakeRequest = {
      id: requestId,
      dayChoice: input.dayChoice,
      targetDate,
      callerPhoneFingerprint: fingerprint,
      callerPhoneMasked: masked,
      contactCiphertext: input.contactCiphertext ?? null,
      clientName: input.clientName ?? null,
      clientNotes: input.clientNotes ?? null,
      state: 'pending_proposal',
      proposedDate: null,
      proposedTime: null,
      proposedTimeslotIso: null,
      holdExpiresAt: null,
      expiresAt,
      paymentReference: null,
      bookingId: null,
      version: 1,
      idempotencyKey,
      createdAt: nowIso,
      updatedAt: nowIso,
    }

    store.urgentIntakes.unshift(record)

    const eventRecord: UrgentIntakeEvent = {
      id: randomUUID(),
      requestId: record.id,
      eventType: 'request_created',
      fromState: null,
      toState: 'pending_proposal',
      payload: sanitizedPayload as Record<string, unknown>,
      payloadHash,
      idempotencyKey,
      createdAt: nowIso,
    }
    store.urgentEvents.push(eventRecord)

    await writeStoreSnapshot(store)
    return record
  })
}

export async function proposeUrgentIntakeTimeslot(
  input: ProposeUrgentTimeslotInput,
  nowDate: Date = new Date(),
): Promise<UrgentIntakeRequest> {
  const mode = getDataMode()
  const idempotencyKey = validateIdempotencyKey(input.idempotencyKey)
  const sanitizedPayload = sanitizePayload(input.payload ?? {})
  const payloadHash = computeSection16PayloadHash(sanitizedPayload)
  const defaultHoldIso = new Date(nowDate.getTime() + DEFAULT_HOLD_EXPIRY_MINUTES * 60 * 1000).toISOString()
  const holdExpiresAt = input.holdExpiresAt ?? defaultHoldIso

  if (mode === 'supabase') {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.rpc('propose_urgent_intake_timeslot', {
      p_request_id: input.requestId,
      p_expected_version: input.expectedVersion ?? null,
      p_proposed_date: input.proposedDate,
      p_proposed_time: input.proposedTime,
      p_proposed_timeslot_iso: input.proposedTimeslotIso ?? null,
      p_hold_expires_at: holdExpiresAt,
      p_idempotency_key: idempotencyKey,
      p_payload: sanitizedPayload,
      p_payload_hash: payloadHash,
    })
    if (error) mapRpcError(error)
    return mapUrgentIntakeRequestRecord(data)
  }

  return withStoreLock(async () => {
    const store = await readStoreSnapshot()

    const existingEvent = store.urgentEvents.find((e) => e.idempotencyKey === idempotencyKey)
    if (existingEvent) {
      if (existingEvent.payloadHash !== payloadHash || existingEvent.requestId !== input.requestId) {
        throw new Section16IdempotencyConflictError(idempotencyKey)
      }
      const existingReq = store.urgentIntakes.find((r) => r.id === input.requestId)
      if (existingReq) return existingReq
    }

    const req = store.urgentIntakes.find((r) => r.id === input.requestId)
    if (!req) {
      throw new Section16NotFoundError('UrgentIntakeRequest', input.requestId)
    }

    if (isTerminalUrgentIntakeState(req.state)) {
      throw new Section16TerminalStateError('UrgentIntakeRequest', req.state)
    }

    if (Date.parse(req.expiresAt) <= nowDate.getTime()) {
      req.state = 'expired'
      req.updatedAt = nowDate.toISOString()
      req.version += 1
      await writeStoreSnapshot(store)
      throw new Section16HoldExpiredError('Zgłoszenie pilne wygasło przed propozycją terminu')
    }

    if (input.expectedVersion !== undefined && req.version !== input.expectedVersion) {
      throw new Section16ConcurrencyError(input.expectedVersion, req.version)
    }

    if (input.proposedDate !== req.targetDate) {
      throw new Section16ValidationError(
        `Proponowana data ${input.proposedDate} nie zgadza się z wybranym dniem docelowym ${req.targetDate}`,
      )
    }

    if (Date.parse(holdExpiresAt) <= nowDate.getTime()) {
      throw new Section16ValidationError('Czas wygaśnięcia blokady musi być w przyszłości')
    }

    const fromState = req.state
    const nowIso = nowDate.toISOString()
    req.state = 'timeslot_proposed'
    req.proposedDate = input.proposedDate
    req.proposedTime = input.proposedTime
    req.proposedTimeslotIso = input.proposedTimeslotIso ?? null
    req.holdExpiresAt = holdExpiresAt
    req.version += 1
    req.updatedAt = nowIso

    store.urgentEvents.push({
      id: randomUUID(),
      requestId: req.id,
      eventType: 'timeslot_proposed',
      fromState,
      toState: 'timeslot_proposed',
      payload: sanitizedPayload as Record<string, unknown>,
      payloadHash,
      idempotencyKey,
      createdAt: nowIso,
    })

    await writeStoreSnapshot(store)
    return req
  })
}

export async function confirmUrgentIntakePayment(
  input: ConfirmUrgentPaymentInput,
  nowDate: Date = new Date(),
): Promise<UrgentIntakeRequest> {
  const mode = getDataMode()
  const idempotencyKey = validateIdempotencyKey(input.idempotencyKey)
  const sanitizedPayload = sanitizePayload(input.payload ?? {})
  const payloadHash = computeSection16PayloadHash(sanitizedPayload)

  if (mode === 'supabase') {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.rpc('confirm_urgent_intake_payment', {
      p_request_id: input.requestId,
      p_expected_version: input.expectedVersion ?? null,
      p_payment_reference: input.paymentReference,
      p_booking_id: input.bookingId ?? null,
      p_idempotency_key: idempotencyKey,
      p_payload: sanitizedPayload,
      p_payload_hash: payloadHash,
    })
    if (error) mapRpcError(error)
    return mapUrgentIntakeRequestRecord(data)
  }

  return withStoreLock(async () => {
    const store = await readStoreSnapshot()

    const existingEvent = store.urgentEvents.find((e) => e.idempotencyKey === idempotencyKey)
    if (existingEvent) {
      if (existingEvent.payloadHash !== payloadHash || existingEvent.requestId !== input.requestId) {
        throw new Section16IdempotencyConflictError(idempotencyKey)
      }
      const existingReq = store.urgentIntakes.find((r) => r.id === input.requestId)
      if (existingReq) return existingReq
    }

    const req = store.urgentIntakes.find((r) => r.id === input.requestId)
    if (!req) {
      throw new Section16NotFoundError('UrgentIntakeRequest', input.requestId)
    }

    if (req.state !== 'timeslot_proposed') {
      throw new Section16TransitionError('UrgentIntakeRequest', req.state, 'payment_confirmed')
    }

    if (req.holdExpiresAt && Date.parse(req.holdExpiresAt) <= nowDate.getTime()) {
      req.state = 'expired'
      req.updatedAt = nowDate.toISOString()
      req.version += 1
      await writeStoreSnapshot(store)
      throw new Section16HoldExpiredError('Proponowany termin i blokada wygasły przed opłaceniem')
    }

    if (input.expectedVersion !== undefined && req.version !== input.expectedVersion) {
      throw new Section16ConcurrencyError(input.expectedVersion, req.version)
    }

    if (!input.paymentReference?.trim()) {
      throw new Section16PaymentRequiredError('Wymagana jest referencja potwierdzonej płatności')
    }

    const nowIso = nowDate.toISOString()
    req.state = 'payment_confirmed'
    req.paymentReference = input.paymentReference.trim()
    req.bookingId = input.bookingId ?? null
    req.version += 1
    req.updatedAt = nowIso

    store.urgentEvents.push({
      id: randomUUID(),
      requestId: req.id,
      eventType: 'payment_confirmed',
      fromState: 'timeslot_proposed',
      toState: 'payment_confirmed',
      payload: sanitizedPayload as Record<string, unknown>,
      payloadHash,
      idempotencyKey,
      createdAt: nowIso,
    })

    await writeStoreSnapshot(store)
    return req
  })
}

export async function transitionUrgentIntakeState(
  input: TransitionUrgentIntakeInput,
  nowDate: Date = new Date(),
): Promise<UrgentIntakeRequest> {
  const mode = getDataMode()
  const idempotencyKey = validateIdempotencyKey(input.idempotencyKey)
  const sanitizedPayload = sanitizePayload(input.payload ?? {})
  const payloadHash = computeSection16PayloadHash(sanitizedPayload)

  if (mode === 'supabase') {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.rpc('transition_urgent_intake_state', {
      p_request_id: input.requestId,
      p_target_state: input.targetState,
      p_expected_version: input.expectedVersion ?? null,
      p_reason: input.reason ?? null,
      p_idempotency_key: idempotencyKey,
      p_payload: sanitizedPayload,
      p_payload_hash: payloadHash,
    })
    if (error) mapRpcError(error)
    return mapUrgentIntakeRequestRecord(data)
  }

  return withStoreLock(async () => {
    const store = await readStoreSnapshot()

    const existingEvent = store.urgentEvents.find((e) => e.idempotencyKey === idempotencyKey)
    if (existingEvent) {
      if (existingEvent.payloadHash !== payloadHash || existingEvent.requestId !== input.requestId) {
        throw new Section16IdempotencyConflictError(idempotencyKey)
      }
      const existingReq = store.urgentIntakes.find((r) => r.id === input.requestId)
      if (existingReq) return existingReq
    }

    const req = store.urgentIntakes.find((r) => r.id === input.requestId)
    if (!req) {
      throw new Section16NotFoundError('UrgentIntakeRequest', input.requestId)
    }

    if (!isValidUrgentIntakeTransition(req.state, input.targetState)) {
      throw new Section16TransitionError('UrgentIntakeRequest', req.state, input.targetState)
    }

    if (input.targetState === 'rejected' && req.state !== 'pending_proposal') {
      throw new Section16TransitionError('UrgentIntakeRequest', req.state, 'rejected')
    }

    if (input.expectedVersion !== undefined && req.version !== input.expectedVersion) {
      throw new Section16ConcurrencyError(input.expectedVersion, req.version)
    }

    const fromState = req.state
    const nowIso = nowDate.toISOString()
    req.state = input.targetState
    req.version += 1
    req.updatedAt = nowIso

    store.urgentEvents.push({
      id: randomUUID(),
      requestId: req.id,
      eventType: input.reason ?? input.targetState,
      fromState,
      toState: input.targetState,
      payload: sanitizedPayload as Record<string, unknown>,
      payloadHash,
      idempotencyKey,
      createdAt: nowIso,
    })

    await writeStoreSnapshot(store)
    return req
  })
}

export async function getUrgentIntakeRequest(id: string): Promise<UrgentIntakeRequest | null> {
  const mode = getDataMode()
  if (mode === 'supabase') {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.from('urgent_intake_requests').select('*').eq('id', id).maybeSingle()
    if (error) throw new Section16DomainError(error.message, 'DB_ERROR')
    return data ? mapUrgentIntakeRequestRecord(data) : null
  }

  const store = await readStoreSnapshot()
  return store.urgentIntakes.find((r) => r.id === id) ?? null
}

export async function getUrgentIntakeEventByIdempotencyKey(
  idempotencyKey: string,
): Promise<UrgentIntakeEvent | null> {
  const mode = getDataMode()
  if (mode === 'supabase') {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('urgent_intake_events')
      .select('*')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle()
    if (error) throw new Section16DomainError(error.message, 'DB_ERROR')
    return data ? mapUrgentIntakeEventRecord(data) : null
  }

  const store = await readStoreSnapshot()
  return store.urgentEvents.find((e) => e.idempotencyKey === idempotencyKey) ?? null
}


// ---------------------------------------------------------------------------
// PATH B: AVAILABILITY NOTIFICATION REQUESTS
// ---------------------------------------------------------------------------

export async function createAvailabilityNotificationRequest(
  input: CreateAvailabilityNotificationInput,
  nowDate: Date = new Date(),
): Promise<AvailabilityNotificationRequest> {
  const mode = getDataMode()
  const idempotencyKey = validateIdempotencyKey(input.idempotencyKey)
  const fingerprint = input.callerPhoneFingerprint ?? (input.rawPhone ? computeCallerPhoneFingerprint(input.rawPhone) : '')
  const masked = input.callerPhoneMasked ?? (input.rawPhone ? computeCallerPhoneMasked(input.rawPhone) : '')
  if (!fingerprint) {
    throw new Section16ValidationError('Wymagany jest fingerprint numeru telefonu lub rawPhone')
  }

  validateContactCiphertextContract(input.contactCiphertext)

  const sanitizedPayload = sanitizePayload(input.payload ?? {})
  const payloadHash = computeSection16PayloadHash(sanitizedPayload)
  const defaultExpiryIso = new Date(
    nowDate.getTime() + DEFAULT_NOTIFICATION_QUEUE_EXPIRY_DAYS * 24 * 3600 * 1000,
  ).toISOString()
  const expiresAt = input.expiresAt ?? defaultExpiryIso
  const requestId = input.requestId ?? randomUUID()
  const channel = input.channel ?? 'sms'

  if (mode === 'supabase') {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.rpc('create_availability_notification_request', {
      p_request_id: requestId,
      p_caller_phone_fingerprint: fingerprint,
      p_caller_phone_masked: masked,
      p_contact_ciphertext: input.contactCiphertext ?? null,
      p_channel: channel,
      p_client_name: input.clientName ?? null,
      p_expires_at: expiresAt,
      p_idempotency_key: idempotencyKey,
      p_payload: sanitizedPayload,
      p_payload_hash: payloadHash,
    })
    if (error) mapRpcError(error)
    return mapAvailabilityNotificationRequestRecord(data)
  }

  return withStoreLock(async () => {
    const store = await readStoreSnapshot()

    const existingEvent = store.notificationEvents.find((e) => e.idempotencyKey === idempotencyKey)
    if (existingEvent) {
      if (existingEvent.payloadHash !== payloadHash) {
        throw new Section16IdempotencyConflictError(idempotencyKey)
      }
      const existingReq = store.notificationRequests.find((r) => r.id === existingEvent.requestId)
      if (existingReq) return existingReq
    }

    const maxPos = store.notificationRequests.reduce(
      (max, r) => (r.queuePosition > max ? r.queuePosition : max),
      0,
    )
    const nextPos = maxPos + 1

    const nowIso = nowDate.toISOString()
    const record: AvailabilityNotificationRequest = {
      id: requestId,
      callerPhoneFingerprint: fingerprint,
      callerPhoneMasked: masked,
      contactCiphertext: input.contactCiphertext ?? null,
      channel,
      clientName: input.clientName ?? null,
      state: 'queued',
      queuePosition: nextPos,
      offeredAt: null,
      offerExpiresAt: null,
      acceptedAt: null,
      paymentReference: null,
      bookingId: null,
      expiresAt,
      version: 1,
      idempotencyKey,
      createdAt: nowIso,
      updatedAt: nowIso,
    }

    store.notificationRequests.push(record)

    store.notificationEvents.push({
      id: randomUUID(),
      requestId: record.id,
      eventType: 'notification_queued',
      fromState: null,
      toState: 'queued',
      payload: sanitizedPayload as Record<string, unknown>,
      payloadHash,
      idempotencyKey,
      createdAt: nowIso,
    })

    await writeStoreSnapshot(store)
    return record
  })
}

export async function offerAvailabilityNotification(
  input: OfferAvailabilityNotificationInput,
  nowDate: Date = new Date(),
): Promise<AvailabilityNotificationRequest> {
  const mode = getDataMode()
  const idempotencyKey = validateIdempotencyKey(input.idempotencyKey)
  const sanitizedPayload = sanitizePayload(input.payload ?? {})
  const payloadHash = computeSection16PayloadHash(sanitizedPayload)
  const defaultOfferIso = new Date(nowDate.getTime() + DEFAULT_OFFER_EXPIRY_MINUTES * 60 * 1000).toISOString()
  const offerExpiresAt = input.offerExpiresAt ?? defaultOfferIso

  if (mode === 'supabase') {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.rpc('offer_availability_notification', {
      p_request_id: input.requestId,
      p_expected_version: input.expectedVersion ?? null,
      p_offer_expires_at: offerExpiresAt,
      p_idempotency_key: idempotencyKey,
      p_payload: sanitizedPayload,
      p_payload_hash: payloadHash,
    })
    if (error) mapRpcError(error)
    return mapAvailabilityNotificationRequestRecord(data)
  }

  return withStoreLock(async () => {
    const store = await readStoreSnapshot()

    const existingEvent = store.notificationEvents.find((e) => e.idempotencyKey === idempotencyKey)
    if (existingEvent) {
      if (existingEvent.payloadHash !== payloadHash || existingEvent.requestId !== input.requestId) {
        throw new Section16IdempotencyConflictError(idempotencyKey)
      }
      const existingReq = store.notificationRequests.find((r) => r.id === input.requestId)
      if (existingReq) return existingReq
    }

    const req = store.notificationRequests.find((r) => r.id === input.requestId)
    if (!req) {
      throw new Section16NotFoundError('AvailabilityNotificationRequest', input.requestId)
    }

    if (isTerminalAvailabilityNotificationState(req.state) || req.state === 'accepted_paid') {
      throw new Section16TerminalStateError('AvailabilityNotificationRequest', req.state)
    }

    if (Date.parse(req.expiresAt) <= nowDate.getTime()) {
      req.state = 'expired'
      req.updatedAt = nowDate.toISOString()
      req.version += 1
      await writeStoreSnapshot(store)
      throw new Section16HoldExpiredError('Zgłoszenie w kolejce wygasło')
    }

    if (input.expectedVersion !== undefined && req.version !== input.expectedVersion) {
      throw new Section16ConcurrencyError(input.expectedVersion, req.version)
    }

    if (Date.parse(offerExpiresAt) <= nowDate.getTime()) {
      throw new Section16ValidationError('Czas wygaśnięcia oferty musi być w przyszłości')
    }

    const fromState = req.state
    const nowIso = nowDate.toISOString()
    req.state = 'offer_sent'
    req.offeredAt = nowIso
    req.offerExpiresAt = offerExpiresAt
    req.version += 1
    req.updatedAt = nowIso

    store.notificationEvents.push({
      id: randomUUID(),
      requestId: req.id,
      eventType: 'offer_sent',
      fromState,
      toState: 'offer_sent',
      payload: sanitizedPayload as Record<string, unknown>,
      payloadHash,
      idempotencyKey,
      createdAt: nowIso,
    })

    await writeStoreSnapshot(store)
    return req
  })
}

export async function confirmNotificationOfferPayment(
  input: ConfirmNotificationPaymentInput,
  nowDate: Date = new Date(),
): Promise<AvailabilityNotificationRequest> {
  const mode = getDataMode()
  const idempotencyKey = validateIdempotencyKey(input.idempotencyKey)
  const sanitizedPayload = sanitizePayload(input.payload ?? {})
  const payloadHash = computeSection16PayloadHash(sanitizedPayload)

  if (mode === 'supabase') {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.rpc('confirm_notification_offer_payment', {
      p_request_id: input.requestId,
      p_expected_version: input.expectedVersion ?? null,
      p_payment_reference: input.paymentReference,
      p_booking_id: input.bookingId ?? null,
      p_idempotency_key: idempotencyKey,
      p_payload: sanitizedPayload,
      p_payload_hash: payloadHash,
    })
    if (error) mapRpcError(error)
    return mapAvailabilityNotificationRequestRecord(data)
  }

  return withStoreLock(async () => {
    const store = await readStoreSnapshot()

    const existingEvent = store.notificationEvents.find((e) => e.idempotencyKey === idempotencyKey)
    if (existingEvent) {
      if (existingEvent.payloadHash !== payloadHash || existingEvent.requestId !== input.requestId) {
        throw new Section16IdempotencyConflictError(idempotencyKey)
      }
      const existingReq = store.notificationRequests.find((r) => r.id === input.requestId)
      if (existingReq) return existingReq
    }

    const req = store.notificationRequests.find((r) => r.id === input.requestId)
    if (!req) {
      throw new Section16NotFoundError('AvailabilityNotificationRequest', input.requestId)
    }

    if (req.state !== 'offer_sent') {
      throw new Section16TransitionError('AvailabilityNotificationRequest', req.state, 'accepted_paid')
    }

    if (req.offerExpiresAt && Date.parse(req.offerExpiresAt) <= nowDate.getTime()) {
      req.state = 'expired'
      req.updatedAt = nowDate.toISOString()
      req.version += 1
      await writeStoreSnapshot(store)
      throw new Section16HoldExpiredError('Oferta dostępności wygasła przed opłaceniem')
    }

    if (input.expectedVersion !== undefined && req.version !== input.expectedVersion) {
      throw new Section16ConcurrencyError(input.expectedVersion, req.version)
    }

    if (!input.paymentReference?.trim()) {
      throw new Section16PaymentRequiredError('Wymagana jest referencja potwierdzonej płatności')
    }

    const nowIso = nowDate.toISOString()
    req.state = 'accepted_paid'
    req.paymentReference = input.paymentReference.trim()
    req.bookingId = input.bookingId ?? null
    req.acceptedAt = nowIso
    req.version += 1
    req.updatedAt = nowIso

    store.notificationEvents.push({
      id: randomUUID(),
      requestId: req.id,
      eventType: 'offer_accepted_paid',
      fromState: 'offer_sent',
      toState: 'accepted_paid',
      payload: sanitizedPayload as Record<string, unknown>,
      payloadHash,
      idempotencyKey,
      createdAt: nowIso,
    })

    await writeStoreSnapshot(store)
    return req
  })
}

export async function transitionAvailabilityNotificationState(
  input: TransitionAvailabilityNotificationInput,
  nowDate: Date = new Date(),
): Promise<AvailabilityNotificationRequest> {
  const mode = getDataMode()
  const idempotencyKey = validateIdempotencyKey(input.idempotencyKey)
  const sanitizedPayload = sanitizePayload(input.payload ?? {})
  const payloadHash = computeSection16PayloadHash(sanitizedPayload)

  if (mode === 'supabase') {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.rpc('transition_availability_notification_state', {
      p_request_id: input.requestId,
      p_target_state: input.targetState,
      p_expected_version: input.expectedVersion ?? null,
      p_reason: input.reason ?? null,
      p_idempotency_key: idempotencyKey,
      p_payload: sanitizedPayload,
      p_payload_hash: payloadHash,
    })
    if (error) mapRpcError(error)
    return mapAvailabilityNotificationRequestRecord(data)
  }

  return withStoreLock(async () => {
    const store = await readStoreSnapshot()

    const existingEvent = store.notificationEvents.find((e) => e.idempotencyKey === idempotencyKey)
    if (existingEvent) {
      if (existingEvent.payloadHash !== payloadHash || existingEvent.requestId !== input.requestId) {
        throw new Section16IdempotencyConflictError(idempotencyKey)
      }
      const existingReq = store.notificationRequests.find((r) => r.id === input.requestId)
      if (existingReq) return existingReq
    }

    const req = store.notificationRequests.find((r) => r.id === input.requestId)
    if (!req) {
      throw new Section16NotFoundError('AvailabilityNotificationRequest', input.requestId)
    }

    if (!isValidAvailabilityNotificationTransition(req.state, input.targetState)) {
      throw new Section16TransitionError('AvailabilityNotificationRequest', req.state, input.targetState)
    }

    if (input.targetState === 'consumed' && req.state !== 'accepted_paid') {
      throw new Section16TransitionError('AvailabilityNotificationRequest', req.state, 'consumed')
    }

    if (input.expectedVersion !== undefined && req.version !== input.expectedVersion) {
      throw new Section16ConcurrencyError(input.expectedVersion, req.version)
    }

    const fromState = req.state
    const nowIso = nowDate.toISOString()
    req.state = input.targetState
    req.version += 1
    req.updatedAt = nowIso

    store.notificationEvents.push({
      id: randomUUID(),
      requestId: req.id,
      eventType: input.reason ?? input.targetState,
      fromState,
      toState: input.targetState,
      payload: sanitizedPayload as Record<string, unknown>,
      payloadHash,
      idempotencyKey,
      createdAt: nowIso,
    })

    await writeStoreSnapshot(store)
    return req
  })
}

export async function getAvailabilityNotificationRequest(id: string): Promise<AvailabilityNotificationRequest | null> {
  const mode = getDataMode()
  if (mode === 'supabase') {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.from('availability_notification_requests').select('*').eq('id', id).maybeSingle()
    if (error) throw new Section16DomainError(error.message, 'DB_ERROR')
    return data ? mapAvailabilityNotificationRequestRecord(data) : null
  }

  const store = await readStoreSnapshot()
  return store.notificationRequests.find((r) => r.id === id) ?? null
}

export async function getAvailabilityNotificationEventByIdempotencyKey(
  idempotencyKey: string,
): Promise<AvailabilityNotificationEvent | null> {
  const mode = getDataMode()
  if (mode === 'supabase') {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('availability_notification_events')
      .select('*')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle()
    if (error) throw new Section16DomainError(error.message, 'DB_ERROR')
    return data ? mapAvailabilityNotificationEventRecord(data) : null
  }

  const store = await readStoreSnapshot()
  return store.notificationEvents.find((e) => e.idempotencyKey === idempotencyKey) ?? null
}

export async function getFirstActiveQueuedAvailabilityNotificationRequest(
  nowDate: Date = new Date(),
): Promise<AvailabilityNotificationRequest | null> {
  const mode = getDataMode()
  if (mode === 'supabase') {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('availability_notification_requests')
      .select('*')
      .eq('state', 'queued')
      .gt('expires_at', nowDate.toISOString())
      .order('queue_position', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (error) throw new Section16DomainError(error.message, 'DB_ERROR')
    return data ? mapAvailabilityNotificationRequestRecord(data) : null
  }

  const store = await readStoreSnapshot()
  const activeQueued = store.notificationRequests
    .filter((r) => r.state === 'queued' && Date.parse(r.expiresAt) > nowDate.getTime())
    .sort((a, b) => a.queuePosition - b.queuePosition)

  return activeQueued[0] ?? null
}

// ---------------------------------------------------------------------------
// TIMED TALK ENTITLEMENTS
// ---------------------------------------------------------------------------

export async function createTalkEntitlement(
  input: CreateTalkEntitlementInput,
  nowDate: Date = new Date(),
): Promise<ConsultationTalkEntitlement> {
  const mode = getDataMode()
  const idempotencyKey = validateIdempotencyKey(input.idempotencyKey)
  const fingerprint = input.callerPhoneFingerprint ?? (input.rawPhone ? computeCallerPhoneFingerprint(input.rawPhone) : '')
  const masked = input.callerPhoneMasked ?? (input.rawPhone ? computeCallerPhoneMasked(input.rawPhone) : '')
  if (!fingerprint) {
    throw new Section16ValidationError('Wymagany jest fingerprint numeru telefonu lub rawPhone')
  }

  if (!input.paymentReference?.trim()) {
    throw new Section16PaymentRequiredError('Uprawnienie do rozmowy bezwzględnie wymaga potwierdzonej płatności')
  }

  if (Date.parse(input.validUntil) <= Date.parse(input.validFrom)) {
    throw new Section16ValidationError('validUntil musi być późniejsze niż validFrom')
  }

  if (!input.urgentRequestId && !input.notificationRequestId && !input.bookingId) {
    throw new Section16PaymentRequiredError(
      'Uprawnienie do rozmowy wymaga co najmniej jednego autorytatywnego opłaconego źródła (urgentRequestId, notificationRequestId lub bookingId)',
    )
  }

  if (
    input.notificationRequestId !== undefined &&
    input.notificationRequestId !== null &&
    (typeof input.notificationRequestId !== 'string' ||
      !SECTION16_UUID_REGEX.test(input.notificationRequestId.trim()))
  ) {
    throw new Section16ValidationError(
      'notificationRequestId musi być poprawnym identyfikatorem UUID',
    )
  }

  const sanitizedPayload = sanitizePayload(input.payload ?? {})
  const payloadHash = computeSection16PayloadHash(sanitizedPayload)
  const entitlementId = input.entitlementId ?? randomUUID()
  const allocatedSeconds = input.allocatedSeconds ?? DEFAULT_TALK_ENTITLEMENT_ALLOCATED_SECONDS

  if (mode === 'supabase') {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.rpc('create_talk_entitlement', {
      p_entitlement_id: entitlementId,
      p_caller_phone_fingerprint: fingerprint,
      p_caller_phone_masked: masked,
      p_payment_reference: input.paymentReference.trim(),
      p_booking_id: input.bookingId ?? null,
      p_urgent_request_id: input.urgentRequestId ?? null,
      p_notification_request_id: input.notificationRequestId ?? null,
      p_allocated_seconds: allocatedSeconds,
      p_valid_from: input.validFrom,
      p_valid_until: input.validUntil,
      p_idempotency_key: idempotencyKey,
      p_payload: sanitizedPayload,
      p_payload_hash: payloadHash,
    })
    if (error) mapRpcError(error)
    return mapConsultationTalkEntitlementRecord(data)
  }

  return withStoreLock(async () => {
    const store = await readStoreSnapshot()

    const existingEvent = store.talkEvents.find((e) => e.idempotencyKey === idempotencyKey)
    if (existingEvent) {
      if (existingEvent.payloadHash !== payloadHash) {
        throw new Section16IdempotencyConflictError(idempotencyKey)
      }
      const existingEnt = store.talkEntitlements.find((t) => t.id === existingEvent.entitlementId)
      if (existingEnt) return existingEnt
    }

    let urgReq: UrgentIntakeRequest | undefined
    if (input.urgentRequestId) {
      urgReq = store.urgentIntakes.find((r) => r.id === input.urgentRequestId)
      if (!urgReq) {
        throw new Section16NotFoundError('UrgentIntakeRequest', input.urgentRequestId)
      }
      if (urgReq.state !== 'payment_confirmed') {
        throw new Section16PaymentRequiredError(
          `Zgłoszenie pilne ${input.urgentRequestId} nie posiada potwierdzonej płatności (stan: ${urgReq.state})`,
        )
      }
      if (urgReq.callerPhoneFingerprint !== fingerprint) {
        throw new Section16ValidationError(
          'Fingerprint numeru telefonu nie zgadza się ze zgłoszeniem pilnym',
        )
      }
      if (urgReq.paymentReference !== input.paymentReference.trim()) {
        throw new Section16ValidationError(
          'Referencja płatności nie zgadza się ze zgłoszeniem pilnym',
        )
      }
      if (input.bookingId && urgReq.bookingId && input.bookingId !== urgReq.bookingId) {
        throw new Section16ValidationError(
          'Podany bookingId nie zgadza się z rezerwacją przypisaną do zgłoszenia pilnego',
        )
      }
    }

    let notifReq: AvailabilityNotificationRequest | undefined
    if (input.notificationRequestId) {
      notifReq = store.notificationRequests.find((r) => r.id === input.notificationRequestId)
      if (!notifReq) {
        throw new Section16NotFoundError('AvailabilityNotificationRequest', input.notificationRequestId)
      }
      if (notifReq.state !== 'accepted_paid') {
        throw new Section16PaymentRequiredError(
          `Zgłoszenie powiadomienia ${input.notificationRequestId} nie posiada opłaconej oferty (stan: ${notifReq.state})`,
        )
      }
      if (notifReq.callerPhoneFingerprint !== fingerprint) {
        throw new Section16ValidationError(
          'Fingerprint numeru telefonu nie zgadza się ze zgłoszeniem powiadomienia',
        )
      }
      if (notifReq.paymentReference !== input.paymentReference.trim()) {
        throw new Section16ValidationError(
          'Referencja płatności nie zgadza się ze zgłoszeniem powiadomienia',
        )
      }
      if (input.bookingId && notifReq.bookingId && input.bookingId !== notifReq.bookingId) {
        throw new Section16ValidationError(
          'Podany bookingId nie zgadza się z rezerwacją przypisaną do zgłoszenia powiadomienia',
        )
      }

      const existingForNotif = store.talkEntitlements.find(
        (t) => t.notificationRequestId === input.notificationRequestId,
      )
      if (existingForNotif) {
        throw new Section16EntitlementAlreadyExistsError(
          `Dla opłaconej oferty ${input.notificationRequestId} istnieje już uprawnienie do rozmowy (id: ${existingForNotif.id})`,
        )
      }
    }

    if (urgReq && notifReq) {
      if (
        urgReq.paymentReference !== notifReq.paymentReference ||
        urgReq.callerPhoneFingerprint !== notifReq.callerPhoneFingerprint
      ) {
        throw new Section16ValidationError('Źródła płatności nie są ze sobą zgodne')
      }
      if (urgReq.bookingId && notifReq.bookingId && urgReq.bookingId !== notifReq.bookingId) {
        throw new Section16ValidationError('Rezerwacje w źródłach nie są ze sobą zgodne')
      }
    }

    if (input.bookingId) {
      const booking = await getBookingById(input.bookingId)
      if (!booking) {
        throw new Section16NotFoundError('Booking', input.bookingId)
      }
      if (
        booking.paymentStatus !== 'paid' ||
        !booking.paidAt ||
        booking.bookingStatus === 'cancelled' ||
        booking.bookingStatus === 'expired'
      ) {
        throw new Section16PaymentRequiredError(
          `Rezerwacja ${input.bookingId} nie posiada potwierdzonego statusu płatności (stan: ${booking.paymentStatus})`,
        )
      }
      if (booking.paymentReference && booking.paymentReference.trim() !== input.paymentReference.trim()) {
        throw new Section16ValidationError('Referencja płatności nie zgadza się z rezerwacją')
      }
      const bPhone = booking.customerPhoneNormalized || booking.phone
      if (bPhone) {
        const bFp = computeCallerPhoneFingerprint(bPhone)
        if (bFp !== fingerprint) {
          throw new Section16ValidationError('Fingerprint numeru telefonu nie zgadza się z rezerwacją')
        }
      }
    }

    const nowIso = nowDate.toISOString()
    const record: ConsultationTalkEntitlement = {
      id: entitlementId,
      callerPhoneFingerprint: fingerprint,
      callerPhoneMasked: masked,
      bookingId: input.bookingId ?? urgReq?.bookingId ?? notifReq?.bookingId ?? null,
      paymentReference: input.paymentReference.trim(),
      urgentRequestId: input.urgentRequestId ?? null,
      notificationRequestId: input.notificationRequestId ?? null,
      allocatedSeconds,
      validFrom: input.validFrom,
      validUntil: input.validUntil,
      state: 'active',
      consumedAt: null,
      consumedCallSessionId: null,
      version: 1,
      idempotencyKey,
      createdAt: nowIso,
      updatedAt: nowIso,
    }

    store.talkEntitlements.push(record)

    store.talkEvents.push({
      id: randomUUID(),
      entitlementId: record.id,
      eventType: 'entitlement_created',
      fromState: null,
      toState: 'active',
      payload: sanitizedPayload as Record<string, unknown>,
      payloadHash,
      idempotencyKey,
      createdAt: nowIso,
    })

    await writeStoreSnapshot(store)
    return record
  })
}

export async function consumeTalkEntitlement(
  input: ConsumeTalkEntitlementInput,
  nowDate: Date = new Date(),
): Promise<ConsultationTalkEntitlement> {
  const mode = getDataMode()
  const idempotencyKey = validateIdempotencyKey(input.idempotencyKey)
  const sanitizedPayload = sanitizePayload(input.payload ?? {})
  const payloadHash = computeSection16PayloadHash(sanitizedPayload)

  if (mode === 'supabase') {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.rpc('consume_talk_entitlement', {
      p_entitlement_id: input.entitlementId,
      p_call_session_id: input.callSessionId,
      p_expected_version: input.expectedVersion ?? null,
      p_idempotency_key: idempotencyKey,
      p_payload: sanitizedPayload,
      p_payload_hash: payloadHash,
    })
    if (error) mapRpcError(error)
    return mapConsultationTalkEntitlementRecord(data)
  }

  return withStoreLock(async () => {
    const store = await readStoreSnapshot()

    const existingEvent = store.talkEvents.find((e) => e.idempotencyKey === idempotencyKey)
    if (existingEvent) {
      if (existingEvent.payloadHash !== payloadHash || existingEvent.entitlementId !== input.entitlementId) {
        throw new Section16IdempotencyConflictError(idempotencyKey)
      }
      const existingEnt = store.talkEntitlements.find((t) => t.id === input.entitlementId)
      if (existingEnt) return existingEnt
    }

    const ent = store.talkEntitlements.find((t) => t.id === input.entitlementId)
    if (!ent) {
      throw new Section16NotFoundError('ConsultationTalkEntitlement', input.entitlementId)
    }

    if (ent.state !== 'active') {
      throw new Section16TransitionError('ConsultationTalkEntitlement', ent.state, 'consumed')
    }

    const nowTime = nowDate.getTime()
    if (nowTime < Date.parse(ent.validFrom)) {
      throw new Section16ValidationError('Okno ważności uprawnienia jeszcze się nie rozpoczęło')
    }

    if (nowTime > Date.parse(ent.validUntil)) {
      ent.state = 'expired'
      ent.updatedAt = nowDate.toISOString()
      ent.version += 1
      await writeStoreSnapshot(store)
      throw new Section16HoldExpiredError('Uprawnienie do rozmowy wygasło')
    }

    if (input.expectedVersion !== undefined && ent.version !== input.expectedVersion) {
      throw new Section16ConcurrencyError(input.expectedVersion, ent.version)
    }

    if (!input.callSessionId) {
      throw new Section16ValidationError('Zużycie uprawnienia wymaga podania callSessionId')
    }

    const nowIso = nowDate.toISOString()
    ent.state = 'consumed'
    ent.consumedAt = nowIso
    ent.consumedCallSessionId = input.callSessionId
    ent.version += 1
    ent.updatedAt = nowIso

    store.talkEvents.push({
      id: randomUUID(),
      entitlementId: ent.id,
      eventType: 'entitlement_consumed',
      fromState: 'active',
      toState: 'consumed',
      payload: sanitizedPayload as Record<string, unknown>,
      payloadHash,
      idempotencyKey,
      createdAt: nowIso,
    })

    await writeStoreSnapshot(store)
    return ent
  })
}

export async function revokeTalkEntitlement(
  input: RevokeTalkEntitlementInput,
  nowDate: Date = new Date(),
): Promise<ConsultationTalkEntitlement> {
  const mode = getDataMode()
  const idempotencyKey = validateIdempotencyKey(input.idempotencyKey)
  const sanitizedPayload = sanitizePayload(input.payload ?? {})
  const payloadHash = computeSection16PayloadHash(sanitizedPayload)

  if (mode === 'supabase') {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.rpc('revoke_talk_entitlement', {
      p_entitlement_id: input.entitlementId,
      p_expected_version: input.expectedVersion ?? null,
      p_reason: input.reason ?? null,
      p_idempotency_key: idempotencyKey,
      p_payload: sanitizedPayload,
      p_payload_hash: payloadHash,
    })
    if (error) mapRpcError(error)
    return mapConsultationTalkEntitlementRecord(data)
  }

  return withStoreLock(async () => {
    const store = await readStoreSnapshot()

    const existingEvent = store.talkEvents.find((e) => e.idempotencyKey === idempotencyKey)
    if (existingEvent) {
      if (existingEvent.payloadHash !== payloadHash || existingEvent.entitlementId !== input.entitlementId) {
        throw new Section16IdempotencyConflictError(idempotencyKey)
      }
      const existingEnt = store.talkEntitlements.find((t) => t.id === input.entitlementId)
      if (existingEnt) return existingEnt
    }

    const ent = store.talkEntitlements.find((t) => t.id === input.entitlementId)
    if (!ent) {
      throw new Section16NotFoundError('ConsultationTalkEntitlement', input.entitlementId)
    }

    if (!isValidTalkEntitlementTransition(ent.state, 'revoked')) {
      throw new Section16TransitionError('ConsultationTalkEntitlement', ent.state, 'revoked')
    }

    if (input.expectedVersion !== undefined && ent.version !== input.expectedVersion) {
      throw new Section16ConcurrencyError(input.expectedVersion, ent.version)
    }

    const nowIso = nowDate.toISOString()
    ent.state = 'revoked'
    ent.version += 1
    ent.updatedAt = nowIso

    store.talkEvents.push({
      id: randomUUID(),
      entitlementId: ent.id,
      eventType: input.reason ?? 'entitlement_revoked',
      fromState: 'active',
      toState: 'revoked',
      payload: sanitizedPayload as Record<string, unknown>,
      payloadHash,
      idempotencyKey,
      createdAt: nowIso,
    })

    await writeStoreSnapshot(store)
    return ent
  })
}

export async function getTalkEntitlement(id: string): Promise<ConsultationTalkEntitlement | null> {
  const mode = getDataMode()
  if (mode === 'supabase') {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.from('consultation_talk_entitlements').select('*').eq('id', id).maybeSingle()
    if (error) throw new Section16DomainError(error.message, 'DB_ERROR')
    return data ? mapConsultationTalkEntitlementRecord(data) : null
  }

  const store = await readStoreSnapshot()
  return store.talkEntitlements.find((t) => t.id === id) ?? null
}

export async function getTalkEntitlementEventByIdempotencyKey(
  idempotencyKey: string,
): Promise<ConsultationTalkEntitlementEvent | null> {
  const mode = getDataMode()
  if (mode === 'supabase') {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('consultation_talk_entitlement_events')
      .select('*')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle()
    if (error) throw new Section16DomainError(error.message, 'DB_ERROR')
    return data ? mapConsultationTalkEntitlementEventRecord(data) : null
  }

  const store = await readStoreSnapshot()
  return store.talkEvents.find((e) => e.idempotencyKey === idempotencyKey) ?? null
}

// ---------------------------------------------------------------------------
// STAGE 5: PERIODIC EXPIRATION SWEEP
// ---------------------------------------------------------------------------

/**
 * Maps Supabase / PostgREST snake_case row to Section16SweepResult with strict runtime validation.
 * Fails closed if any mandatory property is missing or of incorrect type.
 */
export function mapSection16SweepResult(raw: unknown): Section16SweepResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Section16ValidationError('Wynik sweepu sekcji 16 musi być niepustym obiektem')
  }

  const r = raw as Record<string, unknown>

  const urgentRaw = r.urgent_intakes_expired ?? r.urgentIntakesExpired
  if (typeof urgentRaw !== 'number' || !Number.isInteger(urgentRaw) || urgentRaw < 0) {
    throw new Section16ValidationError(
      `Brak lub nieprawidłowa liczba urgentIntakesExpired w wyniku sweepu: ${String(urgentRaw)}`,
    )
  }

  const availRaw = r.availability_notifications_expired ?? r.availabilityNotificationsExpired
  if (typeof availRaw !== 'number' || !Number.isInteger(availRaw) || availRaw < 0) {
    throw new Section16ValidationError(
      `Brak lub nieprawidłowa liczba availabilityNotificationsExpired w wyniku sweepu: ${String(availRaw)}`,
    )
  }

  const talkRaw = r.talk_entitlements_expired ?? r.talkEntitlementsExpired
  if (typeof talkRaw !== 'number' || !Number.isInteger(talkRaw) || talkRaw < 0) {
    throw new Section16ValidationError(
      `Brak lub nieprawidłowa liczba talkEntitlementsExpired w wyniku sweepu: ${String(talkRaw)}`,
    )
  }

  const totalRaw = r.total_expired ?? r.totalExpired
  if (typeof totalRaw !== 'number' || !Number.isInteger(totalRaw) || totalRaw < 0) {
    throw new Section16ValidationError(
      `Brak lub nieprawidłowa liczba totalExpired w wyniku sweepu: ${String(totalRaw)}`,
    )
  }

  if (totalRaw !== urgentRaw + availRaw + talkRaw) {
    throw new Section16ValidationError(
      `Niespójna suma totalExpired (${totalRaw}) z sumą składowych (${urgentRaw + availRaw + talkRaw})`,
    )
  }

  const batchLimitRaw = r.batch_limit ?? r.batchLimit
  if (typeof batchLimitRaw !== 'number' || !Number.isInteger(batchLimitRaw) || batchLimitRaw < 1) {
    throw new Section16ValidationError(
      `Brak lub nieprawidłowy batchLimit w wyniku sweepu: ${String(batchLimitRaw)}`,
    )
  }

  const sweptAtRaw = r.swept_at ?? r.sweptAt
  if (
    typeof sweptAtRaw !== 'string' ||
    sweptAtRaw.trim().length === 0 ||
    Number.isNaN(Date.parse(sweptAtRaw))
  ) {
    throw new Section16ValidationError(
      `Brak lub nieprawidłowy znacznik czasu sweptAt w wyniku sweepu: ${String(sweptAtRaw)}`,
    )
  }

  return {
    urgentIntakesExpired: urgentRaw,
    availabilityNotificationsExpired: availRaw,
    talkEntitlementsExpired: talkRaw,
    totalExpired: totalRaw,
    batchLimit: batchLimitRaw,
    sweptAt: sweptAtRaw,
  }
}

export async function sweepExpiredSection16RecordsLocal(
  batchLimit: number,
  nowDate: Date = new Date(),
): Promise<Section16SweepResult> {
  const validatedLimit = validateSweepBatchLimit(batchLimit)
  const nowMs = nowDate.getTime()
  const nowIso = nowDate.toISOString()

  return withStoreLock(async () => {
    const store = await readStoreSnapshot()
    let remainingBudget = validatedLimit
    let urgentCount = 0
    let availCount = 0
    let talkCount = 0

    // 1. urgent_intake_requests
    // Eligible:
    // - pending_proposal when expiresAt <= now
    // - timeslot_proposed when holdExpiresAt <= now OR expiresAt <= now
    // Protected: payment_confirmed, expired, cancelled, rejected (never swept)
    const eligibleUrgent = store.urgentIntakes
      .filter((r) => {
        if (r.state === 'pending_proposal') {
          return Date.parse(r.expiresAt) <= nowMs
        }
        if (r.state === 'timeslot_proposed') {
          const holdMs = r.holdExpiresAt ? Date.parse(r.holdExpiresAt) : Infinity
          const expMs = Date.parse(r.expiresAt)
          return holdMs <= nowMs || expMs <= nowMs
        }
        return false
      })
      .sort((a, b) => {
        const timeA = Date.parse(a.holdExpiresAt ?? a.expiresAt)
        const timeB = Date.parse(b.holdExpiresAt ?? b.expiresAt)
        if (timeA !== timeB) return timeA - timeB
        return a.id.localeCompare(b.id)
      })
      .slice(0, remainingBudget)

    for (const req of eligibleUrgent) {
      let reason: string
      let deadline: string
      if (req.state === 'pending_proposal') {
        reason = 'intake_proposal_window_expired'
        deadline = req.expiresAt
      } else if (req.holdExpiresAt && Date.parse(req.holdExpiresAt) <= nowMs) {
        reason = 'timeslot_hold_expired'
        deadline = req.holdExpiresAt
      } else {
        reason = 'intake_overall_window_expired'
        deadline = req.expiresAt
      }

      const idempotencyKey = `sweep:urgent_intake:${req.id}:v${req.version}:${req.state}:expired`
      if (store.urgentEvents.some((e) => e.idempotencyKey === idempotencyKey)) {
        continue
      }

      const payload = {
        action: 'sweep_expired',
        reason,
        requestId: req.id,
        fromState: req.state,
        toState: 'expired',
        deadline,
        expiredAt: nowIso,
      }
      const payloadHash = computeSection16PayloadHash(payload)
      const fromState = req.state

      req.state = 'expired'
      req.version += 1
      req.updatedAt = nowIso

      store.urgentEvents.push({
        id: randomUUID(),
        requestId: req.id,
        eventType: 'intake_expired',
        fromState,
        toState: 'expired',
        payload,
        payloadHash,
        idempotencyKey,
        createdAt: nowIso,
      })

      urgentCount += 1
    }

    remainingBudget -= urgentCount

    // 2. availability_notification_requests
    // Eligible:
    // - queued when expiresAt <= now
    // - offer_sent when offerExpiresAt <= now OR expiresAt <= now
    // Protected: accepted_paid, consumed, expired, cancelled (never swept)
    if (remainingBudget > 0) {
      const eligibleAvail = store.notificationRequests
        .filter((r) => {
          if (r.state === 'queued') {
            return Date.parse(r.expiresAt) <= nowMs
          }
          if (r.state === 'offer_sent') {
            const offerMs = r.offerExpiresAt ? Date.parse(r.offerExpiresAt) : Infinity
            const expMs = Date.parse(r.expiresAt)
            return offerMs <= nowMs || expMs <= nowMs
          }
          return false
        })
        .sort((a, b) => {
          const timeA = Date.parse(a.offerExpiresAt ?? a.expiresAt)
          const timeB = Date.parse(b.offerExpiresAt ?? b.expiresAt)
          if (timeA !== timeB) return timeA - timeB
          return a.id.localeCompare(b.id)
        })
        .slice(0, remainingBudget)

      for (const req of eligibleAvail) {
        let reason: string
        let deadline: string
        if (req.state === 'queued') {
          reason = 'queue_window_expired'
          deadline = req.expiresAt
        } else if (req.offerExpiresAt && Date.parse(req.offerExpiresAt) <= nowMs) {
          reason = 'offer_window_expired'
          deadline = req.offerExpiresAt
        } else {
          reason = 'notification_overall_window_expired'
          deadline = req.expiresAt
        }

        const idempotencyKey = `sweep:availability_notification:${req.id}:v${req.version}:${req.state}:expired`
        if (store.notificationEvents.some((e) => e.idempotencyKey === idempotencyKey)) {
          continue
        }

        const payload = {
          action: 'sweep_expired',
          reason,
          requestId: req.id,
          fromState: req.state,
          toState: 'expired',
          deadline,
          expiredAt: nowIso,
        }
        const payloadHash = computeSection16PayloadHash(payload)
        const fromState = req.state

        req.state = 'expired'
        req.version += 1
        req.updatedAt = nowIso

        store.notificationEvents.push({
          id: randomUUID(),
          requestId: req.id,
          eventType: 'notification_expired',
          fromState,
          toState: 'expired',
          payload,
          payloadHash,
          idempotencyKey,
          createdAt: nowIso,
        })

        availCount += 1
      }

      remainingBudget -= availCount
    }

    // 3. consultation_talk_entitlements
    // Eligible:
    // - active when validUntil <= now
    // Protected: consumed, expired, revoked (never swept)
    if (remainingBudget > 0) {
      const eligibleTalk = store.talkEntitlements
        .filter((e) => e.state === 'active' && Date.parse(e.validUntil) <= nowMs)
        .sort((a, b) => {
          const timeA = Date.parse(a.validUntil)
          const timeB = Date.parse(b.validUntil)
          if (timeA !== timeB) return timeA - timeB
          return a.id.localeCompare(b.id)
        })
        .slice(0, remainingBudget)

      for (const ent of eligibleTalk) {
        const reason = 'validity_window_expired'
        const deadline = ent.validUntil
        const idempotencyKey = `sweep:talk_entitlement:${ent.id}:v${ent.version}:${ent.state}:expired`

        if (store.talkEvents.some((e) => e.idempotencyKey === idempotencyKey)) {
          continue
        }

        const payload = {
          action: 'sweep_expired',
          reason,
          entitlementId: ent.id,
          fromState: ent.state,
          toState: 'expired',
          deadline,
          expiredAt: nowIso,
        }
        const payloadHash = computeSection16PayloadHash(payload)
        const fromState = ent.state

        ent.state = 'expired'
        ent.version += 1
        ent.updatedAt = nowIso

        store.talkEvents.push({
          id: randomUUID(),
          entitlementId: ent.id,
          eventType: 'entitlement_expired',
          fromState,
          toState: 'expired',
          payload,
          payloadHash,
          idempotencyKey,
          createdAt: nowIso,
        })

        talkCount += 1
      }
    }

    const totalExpired = urgentCount + availCount + talkCount
    if (totalExpired > 0) {
      await writeStoreSnapshot(store)
    }

    return {
      urgentIntakesExpired: urgentCount,
      availabilityNotificationsExpired: availCount,
      talkEntitlementsExpired: talkCount,
      totalExpired,
      batchLimit: validatedLimit,
      sweptAt: nowIso,
    }
  })
}

export async function sweepExpiredSection16Records(
  batchLimit: number,
  nowDate?: Date,
): Promise<Section16SweepResult> {
  const validatedLimit = validateSweepBatchLimit(batchLimit)
  const mode = getDataMode()

  if (mode === 'supabase') {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.rpc('sweep_expired_section16_records', {
      p_batch_limit: validatedLimit,
      p_now: nowDate ? nowDate.toISOString() : null,
    })

    if (error) {
      mapRpcError(error)
    }

    return mapSection16SweepResult(data)
  }

  return sweepExpiredSection16RecordsLocal(validatedLimit, nowDate ?? new Date())
}
