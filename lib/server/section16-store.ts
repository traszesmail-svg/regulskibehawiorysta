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
  AvailabilityNotificationRequest,
  AvailabilityNotificationEvent,
  ConsultationTalkEntitlement,
  ConsultationTalkEntitlementEvent,
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

function getSupabaseClient() {
  const config = getSupabaseServerConfig('section16 autonomous data model')
  return createClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function mapRpcError(error: any): never {
  const message = error?.message || String(error)
  if (message.includes('INVALID_IDEMPOTENCY_KEY')) {
    throw new Section16InvalidIdempotencyKeyError(message)
  }
  if (message.includes('IDEMPOTENCY_CONFLICT')) {
    throw new Section16IdempotencyConflictError(message)
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
  if (message.includes('ILLEGAL_TRANSITION') || message.includes('INVALID_STATE')) {
    throw new Section16TransitionError('Section16Entity', 'unknown', message)
  }
  if (message.includes('HOLD_EXPIRED') || message.includes('OFFER_EXPIRED') || message.includes('ENTITLEMENT_EXPIRED')) {
    throw new Section16HoldExpiredError(message)
  }
  if (
    message.includes('PAYMENT_REQUIRED') ||
    message.includes('PAYMENT_SOURCE_REQUIRED') ||
    message.includes('UNPAID_SOURCE') ||
    message.includes('UNPAID_BOOKING')
  ) {
    throw new Section16PaymentRequiredError(message)
  }
  if (message.includes('INVALID_CONTACT_CIPHERTEXT')) {
    throw new Section16PrivacyError(message)
  }
  if (
    message.includes('INVALID_DAY_CHOICE') ||
    message.includes('INVALID_TARGET_DATE') ||
    message.includes('INVALID_FINGERPRINT') ||
    message.includes('INVALID_EXPIRY') ||
    message.includes('INVALID_CHANNEL') ||
    message.includes('INVALID_VALIDITY_WINDOW') ||
    message.includes('FINGERPRINT_MISMATCH') ||
    message.includes('PAYMENT_REFERENCE_MISMATCH') ||
    message.includes('CONFLICTING_SOURCES')
  ) {
    throw new Section16ValidationError(message)
  }
  throw new Section16DomainError(message, 'RPC_ERROR')
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
    return data as UrgentIntakeRequest
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
    return data as UrgentIntakeRequest
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
    return data as UrgentIntakeRequest
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
    return data as UrgentIntakeRequest
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
    return data as UrgentIntakeRequest | null
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
    return data as UrgentIntakeEvent | null
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
    return data as AvailabilityNotificationRequest
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
    return data as AvailabilityNotificationRequest
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
    return data as AvailabilityNotificationRequest
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
    return data as AvailabilityNotificationRequest
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
    return data as AvailabilityNotificationRequest | null
  }

  const store = await readStoreSnapshot()
  return store.notificationRequests.find((r) => r.id === id) ?? null
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
    return data as ConsultationTalkEntitlement
  }

  return withStoreLock(async () => {
    const store = await readStoreSnapshot()

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

    const existingEvent = store.talkEvents.find((e) => e.idempotencyKey === idempotencyKey)
    if (existingEvent) {
      if (existingEvent.payloadHash !== payloadHash) {
        throw new Section16IdempotencyConflictError(idempotencyKey)
      }
      const existingEnt = store.talkEntitlements.find((t) => t.id === existingEvent.entitlementId)
      if (existingEnt) return existingEnt
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
    return data as ConsultationTalkEntitlement
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
    return data as ConsultationTalkEntitlement
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
    return data as ConsultationTalkEntitlement | null
  }

  const store = await readStoreSnapshot()
  return store.talkEntitlements.find((t) => t.id === id) ?? null
}
