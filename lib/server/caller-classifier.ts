import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { normalizePolishPhone } from '@/lib/phone'
import { getLocalStoreDataDir } from '@/lib/server/local-store-path'
import { getSupabaseServerConfig, resolveDataMode } from '@/lib/server/env'
import { createClient } from '@supabase/supabase-js'
import {
  computeCallerPhoneFingerprint,
  computeCallerPhoneMasked,
  computeCallerClassificationRequestHash,
} from '@/lib/server/call-session-security'
import {
  CallSession,
  isTerminalCallSessionState,
} from '@/lib/server/call-session-types'
import {
  findCallSessionsByPhoneFingerprint,
  getBookingById,
  listBookings,
} from '@/lib/server/db'
import type { BookingRecord } from '@/lib/types'
import {
  CallerClassificationDecision,
  CallerClassificationResult,
  CallerDecisionAuditRecord,
  ClassifyCallerOptions,
} from './caller-classification-types'

export interface CallerDecisionAuditStoreSnapshot {
  audits: CallerDecisionAuditRecord[]
}

let auditStoreQueue = Promise.resolve()

function withAuditLock<T>(work: () => Promise<T>): Promise<T> {
  const next = auditStoreQueue.then(work, work)
  auditStoreQueue = next.then(
    () => undefined,
    () => undefined,
  )
  return next
}

function getAuditStorePath(): string {
  return path.join(getLocalStoreDataDir(), 'caller-decision-audits-snapshot.json')
}

async function readAuditStoreSnapshot(): Promise<CallerDecisionAuditStoreSnapshot> {
  const filePath = getAuditStorePath()
  try {
    const raw = await readFile(filePath, 'utf8')
    const parsed = JSON.parse(raw) as Partial<CallerDecisionAuditStoreSnapshot>
    return {
      audits: Array.isArray(parsed?.audits) ? parsed.audits : [],
    }
  } catch (error: any) {
    if (error && error.code === 'ENOENT') {
      return { audits: [] }
    }
    return { audits: [] }
  }
}

async function writeAuditStoreSnapshot(snapshot: CallerDecisionAuditStoreSnapshot): Promise<void> {
  const targetPath = getAuditStorePath()
  const dir = path.dirname(targetPath)
  await mkdir(dir, { recursive: true })

  const tempPath = path.join(dir, `.caller-decision-audits.${randomUUID()}.tmp`)
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
  const config = getSupabaseServerConfig('caller decision audit')
  return createClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function shouldUseSupabase(): boolean {
  if (process.env.APP_DATA_MODE === 'local' || process.env.APP_DATA_MODE === 'test') {
    return false
  }
  if (process.env.APP_DATA_MODE === 'supabase') {
    return true
  }
  return resolveDataMode('caller decision audit') === 'supabase'
}

function mapSupabaseRowToAuditRecord(row: any): CallerDecisionAuditRecord {
  return {
    id: String(row.id),
    decision: row.decision as CallerClassificationDecision,
    allowCall: Boolean(row.allow_call),
    reason: String(row.reason),
    callerPhoneFingerprint: row.caller_phone_fingerprint ?? null,
    callerPhoneMasked: row.caller_phone_masked ?? null,
    bookingId: row.booking_id ?? null,
    sessionId: row.session_id ?? null,
    remainingSeconds: row.remaining_seconds != null ? Number(row.remaining_seconds) : null,
    resumeWindowExpiresAt: row.resume_window_expires_at ? String(row.resume_window_expires_at) : null,
    idempotencyKey: row.idempotency_key ? String(row.idempotency_key) : null,
    requestHash: row.request_hash ? String(row.request_hash) : (row.payload_hash ? String(row.payload_hash) : null),
    payloadHash: row.payload_hash ? String(row.payload_hash) : (row.request_hash ? String(row.request_hash) : null),
    evaluatedAt: String(row.evaluated_at),
    createdAt: String(row.created_at),
  }
}

export async function recordCallerDecisionAudit(
  result: CallerClassificationResult,
  idempotencyKey?: string | null,
  requestHash?: string | null,
): Promise<CallerDecisionAuditRecord> {
  const nowIso = new Date().toISOString()
  const key = idempotencyKey?.trim() || null
  const hash = requestHash ?? null

  const newRecord: CallerDecisionAuditRecord = {
    id: randomUUID(),
    decision: result.decision,
    allowCall: result.allowCall,
    reason: result.reason,
    callerPhoneFingerprint: result.callerPhoneFingerprint,
    callerPhoneMasked: result.callerPhoneMasked,
    bookingId: result.bookingId,
    sessionId: result.sessionId,
    remainingSeconds: result.remainingSeconds,
    resumeWindowExpiresAt: result.resumeWindowExpiresAt,
    idempotencyKey: key,
    requestHash: hash,
    payloadHash: hash,
    evaluatedAt: result.evaluatedAt,
    createdAt: nowIso,
  }

  // Always persist to local store snapshot
  await withAuditLock(async () => {
    const snapshot = await readAuditStoreSnapshot()
    if (key) {
      const existing = snapshot.audits.find((a) => a.idempotencyKey === key)
      if (existing) {
        return existing
      }
    }
    snapshot.audits.push(newRecord)
    await writeAuditStoreSnapshot(snapshot)
    return newRecord
  })

  // In Supabase mode, record into caller_classification_audits
  if (shouldUseSupabase()) {
    const supabase = getSupabaseClient()
    const { error } = await supabase.from('caller_classification_audits').insert({
      id: newRecord.id,
      decision: newRecord.decision,
      allow_call: newRecord.allowCall,
      reason: newRecord.reason,
      caller_phone_fingerprint: newRecord.callerPhoneFingerprint,
      caller_phone_masked: newRecord.callerPhoneMasked,
      booking_id: newRecord.bookingId,
      session_id: newRecord.sessionId,
      remaining_seconds: newRecord.remainingSeconds,
      resume_window_expires_at: newRecord.resumeWindowExpiresAt,
      idempotency_key: newRecord.idempotencyKey,
      request_hash: newRecord.requestHash,
      payload_hash: newRecord.payloadHash,
      evaluated_at: newRecord.evaluatedAt,
      created_at: newRecord.createdAt,
    })
    if (error) {
      throw new Error(`Błąd trwałego zapisu audytu w Supabase: ${error.message}`)
    }
  }

  return newRecord
}

export async function listCallerDecisionAudits(filter?: {
  fingerprint?: string
}): Promise<CallerDecisionAuditRecord[]> {
  if (shouldUseSupabase()) {
    const supabase = getSupabaseClient()
    let query = supabase
      .from('caller_classification_audits')
      .select('*')
      .order('created_at', { ascending: false })
    if (filter?.fingerprint) {
      query = query.eq('caller_phone_fingerprint', filter.fingerprint)
    }
    const { data, error } = await query
    if (error) {
      throw new Error(`Błąd odczytu listy audytów w Supabase: ${error.message}`)
    }
    return (data || []).map(mapSupabaseRowToAuditRecord)
  }

  return withAuditLock(async () => {
    const snapshot = await readAuditStoreSnapshot()
    let list = snapshot.audits
    if (filter?.fingerprint) {
      list = list.filter((a) => a.callerPhoneFingerprint === filter.fingerprint)
    }
    return [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  })
}

async function findAuditByIdempotencyKey(key: string): Promise<CallerDecisionAuditRecord | null> {
  if (shouldUseSupabase()) {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('caller_classification_audits')
      .select('*')
      .eq('idempotency_key', key)
      .maybeSingle()

    if (error) {
      throw new Error(`Błąd odczytu audytu idempotencji z Supabase: ${error.message}`)
    }
    if (!data) {
      return null
    }
    return mapSupabaseRowToAuditRecord(data)
  }

  const snapshot = await readAuditStoreSnapshot()
  return snapshot.audits.find((a) => a.idempotencyKey === key) ?? null
}

export async function classifyIncomingCaller(
  rawPhone: string,
  options?: ClassifyCallerOptions,
): Promise<CallerClassificationResult> {
  const now = options?.now ?? new Date()
  const nowIso = now.toISOString()
  const nowMs = now.getTime()
  const idempotencyKey = options?.idempotencyKey?.trim() || null

  // 1. Normalize Polish phone to E.164
  const normalized = normalizePolishPhone(rawPhone)

  // 2. Compute HMAC fingerprint & masked phone hint
  let fingerprint: string | null = null
  let masked: string | null = null
  let securityConfigError: boolean = false

  if (normalized) {
    try {
      fingerprint = computeCallerPhoneFingerprint(rawPhone, options?.secretOverride)
      masked = computeCallerPhoneMasked(rawPhone)
    } catch {
      securityConfigError = true
    }
  }

  // 3. Compute deterministic request hash
  const requestHash = computeCallerClassificationRequestHash({
    phoneFingerprint: fingerprint,
    phoneSemantic: normalized ? normalized.e164 : null,
    rawPhone,
  })

  // 4. Idempotency check before evaluation
  if (idempotencyKey) {
    let existing: CallerDecisionAuditRecord | null = null
    try {
      existing = await findAuditByIdempotencyKey(idempotencyKey)
    } catch {
      return {
        decision: 'audit_error',
        allowCall: false,
        reason: 'Błąd weryfikacji trwałego audytu idempotencji (fail-closed)',
        callerPhoneFingerprint: fingerprint,
        callerPhoneMasked: masked,
        bookingId: null,
        sessionId: null,
        remainingSeconds: null,
        resumeWindowExpiresAt: null,
        evaluatedAt: nowIso,
      }
    }

    if (existing) {
      const existingHash = existing.requestHash ?? existing.payloadHash ?? null
      if (existingHash && existingHash === requestHash) {
        // Identical retry -> return identical result
        return {
          decision: existing.decision,
          allowCall: existing.allowCall,
          reason: existing.reason,
          callerPhoneFingerprint: existing.callerPhoneFingerprint,
          callerPhoneMasked: existing.callerPhoneMasked,
          bookingId: existing.bookingId,
          sessionId: existing.sessionId,
          remainingSeconds: existing.remainingSeconds,
          resumeWindowExpiresAt: existing.resumeWindowExpiresAt,
          evaluatedAt: existing.evaluatedAt,
        }
      }

      // Conflict: same key, different request/operation hash -> fail-closed
      return {
        decision: 'idempotency_conflict',
        allowCall: false,
        reason: 'Konflikt idempotencji: klucz został już użyty dla innego żądania (fail-closed)',
        callerPhoneFingerprint: fingerprint,
        callerPhoneMasked: masked,
        bookingId: null,
        sessionId: null,
        remainingSeconds: null,
        resumeWindowExpiresAt: null,
        evaluatedAt: nowIso,
      }
    }
  }

  // Helper to persist audit and enforce fail-closed on audit write failure
  const finalize = async (result: CallerClassificationResult): Promise<CallerClassificationResult> => {
    if (options?.recordAudit !== false) {
      try {
        await recordCallerDecisionAudit(result, idempotencyKey, requestHash)
      } catch {
        if (result.allowCall) {
          // CRITICAL: Persistent audit must not fail before returning allowCall=true
          return {
            decision: 'audit_error',
            allowCall: false,
            reason: 'Błąd trwałego zapisu audytu decyzji (fail-closed)',
            callerPhoneFingerprint: result.callerPhoneFingerprint,
            callerPhoneMasked: result.callerPhoneMasked,
            bookingId: result.bookingId,
            sessionId: result.sessionId,
            remainingSeconds: result.remainingSeconds,
            resumeWindowExpiresAt: result.resumeWindowExpiresAt,
            evaluatedAt: nowIso,
          }
        }
      }
    }
    return result
  }

  // Check invalid phone
  if (!normalized) {
    return finalize({
      decision: 'invalid_phone',
      allowCall: false,
      reason: 'Nieprawidłowy lub nierozpoznany format polskiego numeru telefonu (musi normalizować się do E.164)',
      callerPhoneFingerprint: null,
      callerPhoneMasked: null,
      bookingId: null,
      sessionId: null,
      remainingSeconds: null,
      resumeWindowExpiresAt: null,
      evaluatedAt: nowIso,
    })
  }

  // Check security configuration / missing secret
  if (securityConfigError || !fingerprint || !masked) {
    return finalize({
      decision: 'missing_secret',
      allowCall: false,
      reason: 'Błąd konfiguracji bezpieczeństwa: brak wymaganego CALL_SESSION_PHONE_SECRET (fail-closed)',
      callerPhoneFingerprint: null,
      callerPhoneMasked: null,
      bookingId: null,
      sessionId: null,
      remainingSeconds: null,
      resumeWindowExpiresAt: null,
      evaluatedAt: nowIso,
    })
  }

  // 5. Fetch store data fail-closed
  let allSessions: CallSession[]
  let allBookings: BookingRecord[]
  try {
    const [sessions, bookings] = await Promise.all([
      findCallSessionsByPhoneFingerprint(fingerprint),
      listBookings(),
    ])
    allSessions = sessions
    allBookings = bookings
  } catch {
    return finalize({
      decision: 'store_error',
      allowCall: false,
      reason: 'Błąd dostępu do magazynu danych (fail-closed)',
      callerPhoneFingerprint: fingerprint,
      callerPhoneMasked: masked,
      bookingId: null,
      sessionId: null,
      remainingSeconds: null,
      resumeWindowExpiresAt: null,
      evaluatedAt: nowIso,
    })
  }

  // 6. Match bookings for this caller
  const matchingBookings = allBookings
    .filter((b) => {
      if (b.customerPhoneNormalized && b.customerPhoneNormalized === normalized.e164) {
        return true
      }
      const norm = normalizePolishPhone(b.phone)
      return norm ? norm.e164 === normalized.e164 : false
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  // 7. Ambiguity / collision checks
  const activeSessions = allSessions.filter((s) => !isTerminalCallSessionState(s.state))
  if (activeSessions.length > 1) {
    return finalize({
      decision: 'ambiguous_match',
      allowCall: false,
      reason: 'Wykryto wiele współbieżnych aktywnych sesji dla tego numeru (kolizja)',
      callerPhoneFingerprint: fingerprint,
      callerPhoneMasked: masked,
      bookingId: null,
      sessionId: null,
      remainingSeconds: null,
      resumeWindowExpiresAt: null,
      evaluatedAt: nowIso,
    })
  }

  const activePaidBookings = matchingBookings.filter(
    (b) =>
      b.paymentStatus === 'paid' &&
      b.bookingStatus !== 'cancelled' &&
      b.bookingStatus !== 'expired' &&
      b.bookingStatus !== 'done',
  )

  if (activeSessions.length === 0 && activePaidBookings.length > 1) {
    return finalize({
      decision: 'ambiguous_match',
      allowCall: false,
      reason: 'Wykryto wiele aktywnych opłaconych rezerwacji bez jednoznacznej aktywnej sesji (kolizja)',
      callerPhoneFingerprint: fingerprint,
      callerPhoneMasked: masked,
      bookingId: null,
      sessionId: null,
      remainingSeconds: null,
      resumeWindowExpiresAt: null,
      evaluatedAt: nowIso,
    })
  }

  // 8. Single active session path
  if (activeSessions.length === 1) {
    const session = activeSessions[0]
    let booking = matchingBookings.find((b) => b.id === session.bookingId)
    if (!booking) {
      try {
        booking = (await getBookingById(session.bookingId)) ?? undefined
      } catch {
        // store error
      }
    }

    if (!booking) {
      return finalize({
        decision: 'ambiguous_match',
        allowCall: false,
        reason: 'Nie odnaleziono poprawnej rezerwacji powiązanej z aktywną sesją (fail-closed)',
        callerPhoneFingerprint: fingerprint,
        callerPhoneMasked: masked,
        bookingId: session.bookingId,
        sessionId: session.id,
        remainingSeconds: session.remainingSeconds,
        resumeWindowExpiresAt: session.resumeWindowExpiresAt,
        evaluatedAt: nowIso,
      })
    }

    // Strict payment rule
    if (booking.paymentStatus !== 'paid') {
      return finalize({
        decision: 'unpaid_booking',
        allowCall: false,
        reason: `Rezerwacja powiązana z sesją nie jest opłacona (status płatności: ${booking.paymentStatus})`,
        callerPhoneFingerprint: fingerprint,
        callerPhoneMasked: masked,
        bookingId: booking.id,
        sessionId: session.id,
        remainingSeconds: session.remainingSeconds,
        resumeWindowExpiresAt: session.resumeWindowExpiresAt,
        evaluatedAt: nowIso,
      })
    }

    // Cancelled or expired booking
    if (booking.bookingStatus === 'cancelled' || booking.bookingStatus === 'expired') {
      return finalize({
        decision: 'session_completed',
        allowCall: false,
        reason: `Rezerwacja powiązana z sesją została oznaczona jako ${booking.bookingStatus}`,
        callerPhoneFingerprint: fingerprint,
        callerPhoneMasked: masked,
        bookingId: booking.id,
        sessionId: session.id,
        remainingSeconds: session.remainingSeconds,
        resumeWindowExpiresAt: session.resumeWindowExpiresAt,
        evaluatedAt: nowIso,
      })
    }

    // Limit exhaustion
    if (session.remainingSeconds <= 0) {
      return finalize({
        decision: 'session_completed',
        allowCall: false,
        reason: 'Limit czasu opłaconej konsultacji został w całości wyczerpany',
        callerPhoneFingerprint: fingerprint,
        callerPhoneMasked: masked,
        bookingId: booking.id,
        sessionId: session.id,
        remainingSeconds: 0,
        resumeWindowExpiresAt: session.resumeWindowExpiresAt,
        evaluatedAt: nowIso,
      })
    }

    // Active session in progress (active | resumed | waiting_for_owner | bridging)
    if (
      session.state === 'active' ||
      session.state === 'resumed' ||
      session.state === 'waiting_for_owner' ||
      session.state === 'bridging'
    ) {
      return finalize({
        decision: 'session_in_progress',
        allowCall: false,
        reason: 'Konsultacja jest już w toku (sesja aktywna/mostkowana - ponowne połączenie zablokowane)',
        callerPhoneFingerprint: fingerprint,
        callerPhoneMasked: masked,
        bookingId: booking.id,
        sessionId: session.id,
        remainingSeconds: session.remainingSeconds,
        resumeWindowExpiresAt: session.resumeWindowExpiresAt,
        evaluatedAt: nowIso,
      })
    }

    // Interrupted session: check resume window
    if (session.state === 'interrupted') {
      const expiresMs = session.resumeWindowExpiresAt
        ? new Date(session.resumeWindowExpiresAt).getTime()
        : 0

      if (expiresMs <= 0 || isNaN(expiresMs) || nowMs > expiresMs) {
        return finalize({
          decision: 'callback_window_expired',
          allowCall: false,
          reason: 'Okno czasowe na oddzwonienie po przerwaniu konsultacji wygasło',
          callerPhoneFingerprint: fingerprint,
          callerPhoneMasked: masked,
          bookingId: booking.id,
          sessionId: session.id,
          remainingSeconds: session.remainingSeconds,
          resumeWindowExpiresAt: session.resumeWindowExpiresAt,
          evaluatedAt: nowIso,
        })
      }

      // Valid callback window - ONLY path with allowCall = true!
      return finalize({
        decision: 'eligible_callback',
        allowCall: true,
        reason: 'Uprawniony callback przerwanej opłaconej konsultacji w ważnym oknie',
        callerPhoneFingerprint: fingerprint,
        callerPhoneMasked: masked,
        bookingId: booking.id,
        sessionId: session.id,
        remainingSeconds: session.remainingSeconds,
        resumeWindowExpiresAt: session.resumeWindowExpiresAt,
        evaluatedAt: nowIso,
      })
    }

    // Any other / unexpected state -> fail-closed
    return finalize({
      decision: 'session_completed',
      allowCall: false,
      reason: 'Nierozpoznany lub zakończony stan sesji (fail-closed)',
      callerPhoneFingerprint: fingerprint,
      callerPhoneMasked: masked,
      bookingId: booking.id,
      sessionId: session.id,
      remainingSeconds: session.remainingSeconds,
      resumeWindowExpiresAt: session.resumeWindowExpiresAt,
      evaluatedAt: nowIso,
    })
  }

  // 9. No active session path (activeSessions.length === 0)
  const latestTerminalSession = allSessions.find((s) => isTerminalCallSessionState(s.state))
  const latestBooking = matchingBookings[0]

  if (!latestBooking) {
    if (latestTerminalSession) {
      return finalize({
        decision: 'session_completed',
        allowCall: false,
        reason: 'Sesja połączenia została zakończona (brak nowszych aktywnych rezerwacji)',
        callerPhoneFingerprint: fingerprint,
        callerPhoneMasked: masked,
        bookingId: latestTerminalSession.bookingId,
        sessionId: latestTerminalSession.id,
        remainingSeconds: latestTerminalSession.remainingSeconds,
        resumeWindowExpiresAt: null,
        evaluatedAt: nowIso,
      })
    }

    return finalize({
      decision: 'unknown_number',
      allowCall: false,
      reason: 'Numer telefonu nieznany (brak dopasowanych rezerwacji ani sesji w systemie)',
      callerPhoneFingerprint: fingerprint,
      callerPhoneMasked: masked,
      bookingId: null,
      sessionId: null,
      remainingSeconds: null,
      resumeWindowExpiresAt: null,
      evaluatedAt: nowIso,
    })
  }

  if (latestBooking.paymentStatus === 'paid') {
    if (latestTerminalSession && latestTerminalSession.bookingId === latestBooking.id) {
      return finalize({
        decision: 'session_completed',
        allowCall: false,
        reason: 'Sesja połączenia dla tej rezerwacji została już zakończona',
        callerPhoneFingerprint: fingerprint,
        callerPhoneMasked: masked,
        bookingId: latestBooking.id,
        sessionId: latestTerminalSession.id,
        remainingSeconds: latestTerminalSession.remainingSeconds,
        resumeWindowExpiresAt: null,
        evaluatedAt: nowIso,
      })
    }

    if (latestBooking.bookingStatus === 'done') {
      return finalize({
        decision: 'session_completed',
        allowCall: false,
        reason: 'Konsultacja została już zakończona (status rezerwacji: done)',
        callerPhoneFingerprint: fingerprint,
        callerPhoneMasked: masked,
        bookingId: latestBooking.id,
        sessionId: latestTerminalSession?.id ?? null,
        remainingSeconds: latestTerminalSession?.remainingSeconds ?? null,
        resumeWindowExpiresAt: null,
        evaluatedAt: nowIso,
      })
    }

    if (latestBooking.bookingStatus === 'cancelled' || latestBooking.bookingStatus === 'expired') {
      return finalize({
        decision: 'session_completed',
        allowCall: false,
        reason: `Rezerwacja została oznaczona jako ${latestBooking.bookingStatus}`,
        callerPhoneFingerprint: fingerprint,
        callerPhoneMasked: masked,
        bookingId: latestBooking.id,
        sessionId: latestTerminalSession?.id ?? null,
        remainingSeconds: null,
        resumeWindowExpiresAt: null,
        evaluatedAt: nowIso,
      })
    }

    return finalize({
      decision: 'paid_booking_no_session',
      allowCall: false,
      reason: 'Opłacona rezerwacja bez przerwanej sesji (połączenie samodzielne klienta jest zablokowane)',
      callerPhoneFingerprint: fingerprint,
      callerPhoneMasked: masked,
      bookingId: latestBooking.id,
      sessionId: null,
      remainingSeconds: null,
      resumeWindowExpiresAt: null,
      evaluatedAt: nowIso,
    })
  }

  return finalize({
    decision: 'unpaid_booking',
    allowCall: false,
    reason: `Zgłoszenie/rezerwacja nieopłacona (status płatności: ${latestBooking.paymentStatus})`,
    callerPhoneFingerprint: fingerprint,
    callerPhoneMasked: masked,
    bookingId: latestBooking.id,
    sessionId: null,
    remainingSeconds: null,
    resumeWindowExpiresAt: null,
    evaluatedAt: nowIso,
  })
}
