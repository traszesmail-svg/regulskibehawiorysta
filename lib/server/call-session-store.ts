import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { getLocalStoreDataDir } from '@/lib/server/local-store-path'
import { getSupabaseServerConfig, resolveDataMode } from '@/lib/server/env'
import { createClient } from '@supabase/supabase-js'
import {
  CallSession,
  CallSessionEvent,
  CallSessionState,
  CreateCallSessionInput,
  TransitionCallSessionInput,
  CallSessionError,
  CallSessionNotFoundError,
  CallSessionTerminalStateError,
  CallSessionTransitionError,
  CallSessionConcurrencyError,
  CallSessionIdempotencyConflictError,
  CallSessionResumeWindowExpiredError,
  CallSessionInvalidTimeError,
  isValidCallSessionTransition,
  isTerminalCallSessionState,
} from './call-session-types'
import {
  computeCallerPhoneFingerprint,
  computeCallerPhoneMasked,
  computeCallSessionOperationHash,
  sanitizePayload,
} from './call-session-security'

export const DEFAULT_CALL_LIMIT_SECONDS = 900 // 15 minutes
export const DEFAULT_RESUME_WINDOW_MS = 15 * 60 * 1000 // 15 minutes

export interface CallSessionStoreSnapshot {
  sessions: CallSession[]
  events: CallSessionEvent[]
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

function getCallSessionStorePath(): string {
  return path.join(getLocalStoreDataDir(), 'call-sessions-snapshot.json')
}

async function readStoreSnapshot(): Promise<CallSessionStoreSnapshot> {
  const filePath = getCallSessionStorePath()
  try {
    const raw = await readFile(filePath, 'utf8')
    const parsed = JSON.parse(raw) as Partial<CallSessionStoreSnapshot>
    return {
      sessions: Array.isArray(parsed?.sessions) ? parsed.sessions : [],
      events: Array.isArray(parsed?.events) ? parsed.events : [],
    }
  } catch (error: any) {
    if (error && error.code === 'ENOENT') {
      return { sessions: [], events: [] }
    }
    throw new CallSessionError(
      `Nie można odczytać magazynu sesji połączeń (fail-closed): ${error instanceof Error ? error.message : String(error)}`,
      'STORE_READ_ERROR',
    )
  }
}

async function writeStoreSnapshot(snapshot: CallSessionStoreSnapshot): Promise<void> {
  const targetPath = getCallSessionStorePath()
  const dir = path.dirname(targetPath)
  await mkdir(dir, { recursive: true })

  const tempPath = path.join(dir, `.call-sessions-snapshot.${randomUUID()}.tmp`)
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

function getSupabaseClient() {
  const config = getSupabaseServerConfig('durable call sessions')
  return createClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function normalizeSessionRecord(session: CallSession): CallSession {
  return {
    ...session,
    callSessionId: session.id,
  }
}

// -------------------------------------------------------------
// LOCAL STORE IMPLEMENTATION
// -------------------------------------------------------------

async function localCreateCallSession(input: CreateCallSessionInput): Promise<CallSession> {
  return withStoreLock(async () => {
    const snapshot = await readStoreSnapshot()
    const { sessions, events } = snapshot

    const fingerprint = computeCallerPhoneFingerprint(input.phone)
    const masked = computeCallerPhoneMasked(input.phone)
    const rawPayload = input.payload ?? {}
    const sanitizedPayload = sanitizePayload(rawPayload)
    const limit = input.limitSeconds !== undefined ? input.limitSeconds : DEFAULT_CALL_LIMIT_SECONDS
    if (typeof limit !== 'number' || !Number.isInteger(limit) || limit <= 0) {
      throw new CallSessionInvalidTimeError('Limit czasu musi być dodatnią liczbą całkowitą sekund')
    }
    const nowIso = new Date().toISOString()
    const answeredAt = input.answeredAt ?? nowIso
    const id = input.sessionId || randomUUID()
    const idempotencyKey = input.idempotencyKey?.trim() || null

    const operationHash = computeCallSessionOperationHash({
      operation: 'create',
      sessionId: input.sessionId ?? null,
      bookingId: input.bookingId,
      phoneFingerprint: fingerprint,
      limitSeconds: input.limitSeconds ?? null,
      answeredAt: input.answeredAt ?? null,
      payload: rawPayload,
    })

    if (idempotencyKey) {
      const existingEvent = events.find((e) => e.idempotencyKey === idempotencyKey)
      if (existingEvent) {
        if (existingEvent.payloadHash !== operationHash) {
          throw new CallSessionIdempotencyConflictError(idempotencyKey)
        }
        const existingSession = sessions.find((s) => s.id === existingEvent.callSessionId)
        if (!existingSession) {
          throw new CallSessionIdempotencyConflictError(idempotencyKey)
        }
        return normalizeSessionRecord(existingSession)
      }
    }

    if (input.sessionId && sessions.some((s) => s.id === input.sessionId)) {
      throw new CallSessionError(`Sesja o id ${input.sessionId} już istnieje`, 'SESSION_ALREADY_EXISTS')
    }

    const newSession: CallSession = {
      id,
      callSessionId: id,
      bookingId: input.bookingId,
      callerPhoneFingerprint: fingerprint,
      callerPhoneMasked: masked,
      limitSeconds: limit,
      elapsedSeconds: 0,
      remainingSeconds: limit,
      answeredAt,
      interruptedAt: null,
      resumeWindowExpiresAt: null,
      state: 'active',
      version: 1,
      idempotencyKey,
      createdAt: nowIso,
      updatedAt: nowIso,
    }

    sessions.push(newSession)

    if (idempotencyKey) {
      const newEvent: CallSessionEvent = {
        id: randomUUID(),
        callSessionId: id,
        eventType: 'session_started',
        fromState: null,
        toState: 'active',
        payload: sanitizedPayload,
        payloadHash: operationHash,
        idempotencyKey,
        createdAt: nowIso,
      }
      events.push(newEvent)
    }

    await writeStoreSnapshot({ sessions, events })

    return normalizeSessionRecord(newSession)
  })
}

async function localTransitionCallSession(input: TransitionCallSessionInput): Promise<CallSession> {
  return withStoreLock(async () => {
    const snapshot = await readStoreSnapshot()
    const { sessions, events } = snapshot

    const rawPayload = input.payload ?? {}
    const sanitizedPayload = sanitizePayload(rawPayload)
    const idempotencyKey = input.idempotencyKey?.trim() || null

    const operationHash = computeCallSessionOperationHash({
      operation: 'transition',
      sessionId: input.sessionId,
      targetState: input.targetState,
      expectedVersion: input.expectedVersion ?? null,
      deltaSeconds: input.deltaSeconds ?? null,
      eventType: input.eventType ?? null,
      answeredAt: input.answeredAt ?? null,
      interruptedAt: input.interruptedAt ?? null,
      resumeWindowExpiresAt: input.resumeWindowExpiresAt ?? null,
      payload: rawPayload,
    })

    // 1. Idempotency check before mutation
    if (idempotencyKey) {
      const existingEvent = events.find((e) => e.idempotencyKey === idempotencyKey)
      if (existingEvent) {
        if (existingEvent.payloadHash !== operationHash) {
          throw new CallSessionIdempotencyConflictError(idempotencyKey)
        }
        if (existingEvent.callSessionId !== input.sessionId) {
          throw new CallSessionIdempotencyConflictError(idempotencyKey)
        }
        const existingSession = sessions.find((s) => s.id === input.sessionId)
        if (!existingSession) {
          throw new CallSessionNotFoundError(input.sessionId)
        }
        return normalizeSessionRecord(existingSession)
      }
    }

    const sessionIndex = sessions.findIndex((s) => s.id === input.sessionId)
    if (sessionIndex === -1) {
      throw new CallSessionNotFoundError(input.sessionId)
    }

    const session = sessions[sessionIndex]

    // 2. Terminal state check
    if (isTerminalCallSessionState(session.state)) {
      throw new CallSessionTerminalStateError(session.state)
    }

    // 3. Concurrency / CAS check
    if (input.expectedVersion !== undefined && session.version !== input.expectedVersion) {
      throw new CallSessionConcurrencyError(input.expectedVersion, session.version)
    }

    const oldState = session.state
    let targetState = input.targetState

    // 4. Allowed transition check
    if (!isValidCallSessionTransition(oldState, targetState)) {
      throw new CallSessionTransitionError(oldState, targetState)
    }

    const now = Date.now()
    const nowIso = new Date(now).toISOString()

    // 5. Resume window expiry check on callback
    if (oldState === 'interrupted' && targetState === 'waiting_for_owner') {
      if (session.resumeWindowExpiresAt && new Date(session.resumeWindowExpiresAt).getTime() < now) {
        throw new CallSessionResumeWindowExpiredError(session.resumeWindowExpiresAt)
      }
    }

    // 6. Time accounting validation:
    // deltaSeconds > 0 is allowed ONLY from active or resumed state!
    const deltaSeconds = input.deltaSeconds ?? 0
    if (typeof deltaSeconds !== 'number' || !Number.isInteger(deltaSeconds) || deltaSeconds < 0) {
      throw new CallSessionInvalidTimeError('Czas rozmowy nie może być ujemny ani nieprawidłowy')
    }
    if (deltaSeconds > 0 && oldState !== 'active' && oldState !== 'resumed') {
      throw new CallSessionInvalidTimeError(
        `Naliczanie czasu (deltaSeconds > 0) jest dozwolone wyłącznie ze stanu "active" lub "resumed" (obecny stan: "${oldState}")`,
      )
    }

    let newElapsed = session.elapsedSeconds + deltaSeconds
    if (newElapsed > session.limitSeconds) {
      newElapsed = session.limitSeconds
    }
    const newRemaining = Math.max(0, session.limitSeconds - newElapsed)

    // Completion upon exhaustion
    if (newRemaining === 0 && targetState !== 'failed') {
      targetState = 'completed'
    }

    // 7. Dates and resume window
    let interruptedAt = session.interruptedAt
    let resumeWindowExpiresAt = session.resumeWindowExpiresAt
    const answeredAt = input.answeredAt ?? session.answeredAt

    if (targetState === 'interrupted') {
      interruptedAt = input.interruptedAt ?? nowIso
      const intMs = new Date(interruptedAt).getTime()
      resumeWindowExpiresAt =
        input.resumeWindowExpiresAt ?? new Date(intMs + DEFAULT_RESUME_WINDOW_MS).toISOString()
    } else if (targetState === 'resumed') {
      interruptedAt = null
      resumeWindowExpiresAt = null
    } else if (targetState === 'completed' || targetState === 'failed') {
      resumeWindowExpiresAt = null
    }

    // 8. Update session atomically
    const updatedSession: CallSession = {
      ...session,
      state: targetState,
      elapsedSeconds: newElapsed,
      remainingSeconds: newRemaining,
      answeredAt,
      interruptedAt,
      resumeWindowExpiresAt,
      version: session.version + 1,
      updatedAt: nowIso,
    }

    sessions[sessionIndex] = updatedSession

    // 9. Store audit event
    if (idempotencyKey) {
      const newEvent: CallSessionEvent = {
        id: randomUUID(),
        callSessionId: session.id,
        eventType: input.eventType ?? 'state_transition',
        fromState: oldState,
        toState: targetState,
        payload: sanitizedPayload,
        payloadHash: operationHash,
        idempotencyKey,
        createdAt: nowIso,
      }
      events.push(newEvent)
    }

    await writeStoreSnapshot({ sessions, events })

    return normalizeSessionRecord(updatedSession)
  })
}

async function localGetCallSessionById(id: string): Promise<CallSession | null> {
  return withStoreLock(async () => {
    const snapshot = await readStoreSnapshot()
    const found = snapshot.sessions.find((s) => s.id === id)
    return found ? normalizeSessionRecord(found) : null
  })
}

async function localGetCallSessionByBookingId(bookingId: string): Promise<CallSession | null> {
  return withStoreLock(async () => {
    const snapshot = await readStoreSnapshot()
    const matching = snapshot.sessions
      .filter((s) => s.bookingId === bookingId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    const found = matching[0] ?? null
    return found ? normalizeSessionRecord(found) : null
  })
}

async function localFindActiveCallSessionByPhoneFingerprint(fingerprint: string): Promise<CallSession | null> {
  return withStoreLock(async () => {
    const snapshot = await readStoreSnapshot()
    const matching = snapshot.sessions
      .filter((s) => s.callerPhoneFingerprint === fingerprint && !isTerminalCallSessionState(s.state))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    const found = matching[0] ?? null
    return found ? normalizeSessionRecord(found) : null
  })
}

async function localFindCallSessionsByPhoneFingerprint(fingerprint: string): Promise<CallSession[]> {
  return withStoreLock(async () => {
    const snapshot = await readStoreSnapshot()
    return snapshot.sessions
      .filter((s) => s.callerPhoneFingerprint === fingerprint)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(normalizeSessionRecord)
  })
}

async function localListCallSessionEvents(sessionId: string): Promise<CallSessionEvent[]> {
  return withStoreLock(async () => {
    const snapshot = await readStoreSnapshot()
    return snapshot.events
      .filter((e) => e.callSessionId === sessionId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  })
}

// -------------------------------------------------------------
// SUPABASE STORE IMPLEMENTATION (RPC / DB)
// -------------------------------------------------------------

function mapSupabaseRow(row: Record<string, unknown>): CallSession {
  return normalizeSessionRecord({
    id: String(row.id),
    bookingId: String(row.booking_id),
    callerPhoneFingerprint: String(row.caller_phone_fingerprint),
    callerPhoneMasked: String(row.caller_phone_masked),
    limitSeconds: Number(row.limit_seconds),
    elapsedSeconds: Number(row.elapsed_seconds),
    remainingSeconds: Number(row.remaining_seconds),
    answeredAt: row.answered_at ? String(row.answered_at) : null,
    interruptedAt: row.interrupted_at ? String(row.interrupted_at) : null,
    resumeWindowExpiresAt: row.resume_window_expires_at ? String(row.resume_window_expires_at) : null,
    state: row.state as CallSessionState,
    version: Number(row.version),
    idempotencyKey: row.idempotency_key ? String(row.idempotency_key) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  })
}

async function supabaseCreateCallSession(input: CreateCallSessionInput): Promise<CallSession> {
  const supabase = getSupabaseClient()
  const fingerprint = computeCallerPhoneFingerprint(input.phone)
  const masked = computeCallerPhoneMasked(input.phone)
  const rawPayload = input.payload ?? {}
  const sanitizedPayload = sanitizePayload(rawPayload)
  const idempotencyKey = input.idempotencyKey?.trim() || null
  const operationHash = computeCallSessionOperationHash({
    operation: 'create',
    sessionId: input.sessionId ?? null,
    bookingId: input.bookingId,
    phoneFingerprint: fingerprint,
    limitSeconds: input.limitSeconds ?? null,
    answeredAt: input.answeredAt ?? null,
    payload: rawPayload,
  })

  const { data, error } = await supabase.rpc('create_call_session', {
    p_session_id: input.sessionId ?? null,
    p_booking_id: input.bookingId,
    p_caller_phone_fingerprint: fingerprint,
    p_caller_phone_masked: masked,
    p_limit_seconds: input.limitSeconds ?? DEFAULT_CALL_LIMIT_SECONDS,
    p_answered_at: input.answeredAt ?? null,
    p_idempotency_key: idempotencyKey,
    p_payload: sanitizedPayload,
    p_payload_hash: operationHash,
  })

  if (error) {
    if (error.message.includes('IDEMPOTENCY_CONFLICT') || error.message.includes('call_sessions_idempotency_key_key')) {
      throw new CallSessionIdempotencyConflictError(idempotencyKey ?? '')
    }
    if (error.message.includes('call_sessions_pkey')) {
      throw new CallSessionError(`Sesja o id ${input.sessionId} już istnieje`, 'SESSION_ALREADY_EXISTS')
    }
    throw new Error(`Błąd tworzenia sesji w Supabase: ${error.message}`)
  }

  const row = Array.isArray(data) ? data[0] : data
  return mapSupabaseRow(row)
}

async function supabaseTransitionCallSession(input: TransitionCallSessionInput): Promise<CallSession> {
  const supabase = getSupabaseClient()
  const rawPayload = input.payload ?? {}
  const sanitizedPayload = sanitizePayload(rawPayload)
  const idempotencyKey = input.idempotencyKey?.trim() || null
  const operationHash = computeCallSessionOperationHash({
    operation: 'transition',
    sessionId: input.sessionId,
    targetState: input.targetState,
    expectedVersion: input.expectedVersion ?? null,
    deltaSeconds: input.deltaSeconds ?? null,
    eventType: input.eventType ?? null,
    answeredAt: input.answeredAt ?? null,
    interruptedAt: input.interruptedAt ?? null,
    resumeWindowExpiresAt: input.resumeWindowExpiresAt ?? null,
    payload: rawPayload,
  })

  const { data, error } = await supabase.rpc('transition_call_session', {
    p_session_id: input.sessionId,
    p_target_state: input.targetState,
    p_expected_version: input.expectedVersion ?? null,
    p_delta_seconds: input.deltaSeconds ?? 0,
    p_event_type: input.eventType ?? null,
    p_idempotency_key: idempotencyKey,
    p_payload: sanitizedPayload,
    p_payload_hash: operationHash,
    p_interrupted_at: input.interruptedAt ?? null,
    p_resume_window_expires_at: input.resumeWindowExpiresAt ?? null,
    p_answered_at: input.answeredAt ?? null,
  })

  if (error) {
    if (error.message.includes('IDEMPOTENCY_CONFLICT')) {
      throw new CallSessionIdempotencyConflictError(idempotencyKey ?? '')
    }
    if (error.message.includes('SESSION_NOT_FOUND')) {
      throw new CallSessionNotFoundError(input.sessionId)
    }
    if (error.message.includes('TERMINAL_STATE')) {
      const match = error.message.match(/terminal state (\w+)/i)
      throw new CallSessionTerminalStateError((match ? match[1] : input.targetState) as CallSessionState)
    }
    if (error.message.includes('CONCURRENCY_CONFLICT')) {
      const match = error.message.match(/Expected version (\d+) but session is at version (\d+)/i)
      throw new CallSessionConcurrencyError(
        match ? Number(match[1]) : (input.expectedVersion ?? -1),
        match ? Number(match[2]) : -1,
      )
    }
    if (error.message.includes('ILLEGAL_TRANSITION')) {
      const match = error.message.match(/Cannot transition from (\w+) to (\w+)/i)
      throw new CallSessionTransitionError(
        (match ? match[1] : 'unknown') as CallSessionState,
        (match ? match[2] : input.targetState) as CallSessionState,
      )
    }
    if (error.message.includes('RESUME_WINDOW_EXPIRED')) {
      const match = error.message.match(/expired at (.+)$/i)
      throw new CallSessionResumeWindowExpiredError(match ? match[1].trim() : '')
    }
    if (error.message.includes('INVALID_TIME')) {
      throw new CallSessionInvalidTimeError(error.message)
    }
    throw new Error(`Błąd przejścia stanu w Supabase: ${error.message}`)
  }

  const row = Array.isArray(data) ? data[0] : data
  return mapSupabaseRow(row)
}

async function supabaseGetCallSessionById(id: string): Promise<CallSession | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from('call_sessions').select('*').eq('id', id).maybeSingle()
  if (error) {
    throw new Error(`Błąd odczytu sesji: ${error.message}`)
  }
  return data ? mapSupabaseRow(data) : null
}

async function supabaseGetCallSessionByBookingId(bookingId: string): Promise<CallSession | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('call_sessions')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(`Błąd odczytu sesji po bookingId: ${error.message}`)
  }
  return data ? mapSupabaseRow(data) : null
}

async function supabaseFindActiveCallSessionByPhoneFingerprint(fingerprint: string): Promise<CallSession | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('call_sessions')
    .select('*')
    .eq('caller_phone_fingerprint', fingerprint)
    .not('state', 'in', '(completed,failed)')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(`Błąd wyszukiwania sesji po fingerprint: ${error.message}`)
  }
  return data ? mapSupabaseRow(data) : null
}

async function supabaseFindCallSessionsByPhoneFingerprint(fingerprint: string): Promise<CallSession[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('call_sessions')
    .select('*')
    .eq('caller_phone_fingerprint', fingerprint)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Błąd wyszukiwania sesji po fingerprint: ${error.message}`)
  }
  return (data || []).map(mapSupabaseRow)
}

async function supabaseListCallSessionEvents(sessionId: string): Promise<CallSessionEvent[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('call_session_events')
    .select('*')
    .eq('call_session_id', sessionId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Błąd odczytu zdarzeń: ${error.message}`)
  }
  return (data || []).map((row) => ({
    id: String(row.id),
    callSessionId: String(row.call_session_id),
    eventType: String(row.event_type),
    fromState: row.from_state ? (row.from_state as CallSessionState) : null,
    toState: row.to_state as CallSessionState,
    payload: (row.payload as Record<string, unknown>) || {},
    payloadHash: String(row.payload_hash),
    idempotencyKey: String(row.idempotency_key),
    createdAt: String(row.created_at),
  }))
}

// -------------------------------------------------------------
// PUBLIC STORE FACADE
// -------------------------------------------------------------

function shouldUseSupabase(): boolean {
  if (process.env.APP_DATA_MODE === 'local') {
    return false
  }
  if (process.env.APP_DATA_MODE === 'supabase') {
    return true
  }
  return resolveDataMode('durable call sessions') === 'supabase'
}

export async function createCallSession(input: CreateCallSessionInput): Promise<CallSession> {
  return shouldUseSupabase() ? supabaseCreateCallSession(input) : localCreateCallSession(input)
}

export async function transitionCallSession(input: TransitionCallSessionInput): Promise<CallSession> {
  return shouldUseSupabase() ? supabaseTransitionCallSession(input) : localTransitionCallSession(input)
}

export async function getCallSessionById(id: string): Promise<CallSession | null> {
  return shouldUseSupabase() ? supabaseGetCallSessionById(id) : localGetCallSessionById(id)
}

export async function getCallSessionByBookingId(bookingId: string): Promise<CallSession | null> {
  return shouldUseSupabase() ? supabaseGetCallSessionByBookingId(bookingId) : localGetCallSessionByBookingId(bookingId)
}

export async function findActiveCallSessionByPhoneFingerprint(fingerprint: string): Promise<CallSession | null> {
  return shouldUseSupabase()
    ? supabaseFindActiveCallSessionByPhoneFingerprint(fingerprint)
    : localFindActiveCallSessionByPhoneFingerprint(fingerprint)
}

export async function findCallSessionsByPhoneFingerprint(fingerprint: string): Promise<CallSession[]> {
  return shouldUseSupabase()
    ? supabaseFindCallSessionsByPhoneFingerprint(fingerprint)
    : localFindCallSessionsByPhoneFingerprint(fingerprint)
}

export async function listCallSessionEvents(sessionId: string): Promise<CallSessionEvent[]> {
  return shouldUseSupabase() ? supabaseListCallSessionEvents(sessionId) : localListCallSessionEvents(sessionId)
}

// Direct local exports for isolated test usage
export const localStore = {
  createCallSession: localCreateCallSession,
  transitionCallSession: localTransitionCallSession,
  getCallSessionById: localGetCallSessionById,
  getCallSessionByBookingId: localGetCallSessionByBookingId,
  findActiveCallSessionByPhoneFingerprint: localFindActiveCallSessionByPhoneFingerprint,
  findCallSessionsByPhoneFingerprint: localFindCallSessionsByPhoneFingerprint,
  listCallSessionEvents: localListCallSessionEvents,
}
