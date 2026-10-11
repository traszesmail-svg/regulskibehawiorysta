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

export async function recordCallerDecisionAudit(
  result: CallerClassificationResult,
  idempotencyKey?: string | null,
): Promise<CallerDecisionAuditRecord> {
  const nowIso = new Date().toISOString()
  const key = idempotencyKey?.trim() || null

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

  // In Supabase mode, attempt to record into caller_classification_audits if table exists
  if (shouldUseSupabase()) {
    try {
      const supabase = getSupabaseClient()
      await supabase.from('caller_classification_audits').insert({
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
        evaluated_at: newRecord.evaluatedAt,
        created_at: newRecord.createdAt,
      })
    } catch {
      // Fail-safe: migration may not yet be deployed on Supabase
    }
  }

  return newRecord
}

export async function listCallerDecisionAudits(filter?: {
  fingerprint?: string
}): Promise<CallerDecisionAuditRecord[]> {
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

  // 1. Idempotency check before performing evaluation
  if (idempotencyKey) {
    const existing = await findAuditByIdempotencyKey(idempotencyKey)
    if (existing) {
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
  }

  // 2. Normalize Polish phone to E.164
  const normalized = normalizePolishPhone(rawPhone)
  if (!normalized) {
    const result: CallerClassificationResult = {
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
    }
    if (options?.recordAudit !== false && idempotencyKey) {
      await recordCallerDecisionAudit(result, idempotencyKey).catch(() => {})
    }
    return result
  }

  // 3. Compute HMAC fingerprint & masked phone hint
  let fingerprint: string
  let masked: string
  try {
    fingerprint = computeCallerPhoneFingerprint(rawPhone, options?.secretOverride)
    masked = computeCallerPhoneMasked(rawPhone)
  } catch (error) {
    const result: CallerClassificationResult = {
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
    }
    return result
  }

  // 4. Fetch store data fail-closed
  let allSessions: CallSession[]
  let allBookings: BookingRecord[]
  try {
    const [sessions, bookings] = await Promise.all([
      findCallSessionsByPhoneFingerprint(fingerprint),
      listBookings(),
    ])
    allSessions = sessions
    allBookings = bookings
  } catch (error: any) {
    const result: CallerClassificationResult = {
      decision: 'store_error',
      allowCall: false,
      reason: `Błąd dostępu do magazynu danych: ${error instanceof Error ? error.message : String(error)}`,
      callerPhoneFingerprint: fingerprint,
      callerPhoneMasked: masked,
      bookingId: null,
      sessionId: null,
      remainingSeconds: null,
      resumeWindowExpiresAt: null,
      evaluatedAt: nowIso,
    }
    if (options?.recordAudit !== false && idempotencyKey) {
      await recordCallerDecisionAudit(result, idempotencyKey).catch(() => {})
    }
    return result
  }

  // 5. Match bookings for this caller
  const matchingBookings = allBookings
    .filter((b) => {
      if (b.customerPhoneNormalized && b.customerPhoneNormalized === normalized.e164) {
        return true
      }
      const norm = normalizePolishPhone(b.phone)
      return norm ? norm.e164 === normalized.e164 : false
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  // 6. Ambiguity / collision checks
  const activeSessions = allSessions.filter((s) => !isTerminalCallSessionState(s.state))
  if (activeSessions.length > 1) {
    const result: CallerClassificationResult = {
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
    }
    if (options?.recordAudit !== false) {
      await recordCallerDecisionAudit(result, idempotencyKey).catch(() => {})
    }
    return result
  }

  const activePaidBookings = matchingBookings.filter(
    (b) =>
      b.paymentStatus === 'paid' &&
      b.bookingStatus !== 'cancelled' &&
      b.bookingStatus !== 'expired' &&
      b.bookingStatus !== 'done',
  )

  if (activeSessions.length === 0 && activePaidBookings.length > 1) {
    const result: CallerClassificationResult = {
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
    }
    if (options?.recordAudit !== false) {
      await recordCallerDecisionAudit(result, idempotencyKey).catch(() => {})
    }
    return result
  }

  // 7. Active session path (callback evaluation)
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
      const result: CallerClassificationResult = {
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
      }
      if (options?.recordAudit !== false) {
        await recordCallerDecisionAudit(result, idempotencyKey).catch(() => {})
      }
      return result
    }

    // Strict payment rule
    if (booking.paymentStatus !== 'paid') {
      const result: CallerClassificationResult = {
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
      }
      if (options?.recordAudit !== false) {
        await recordCallerDecisionAudit(result, idempotencyKey).catch(() => {})
      }
      return result
    }

    // Cancelled or expired booking
    if (booking.bookingStatus === 'cancelled' || booking.bookingStatus === 'expired') {
      const result: CallerClassificationResult = {
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
      }
      if (options?.recordAudit !== false) {
        await recordCallerDecisionAudit(result, idempotencyKey).catch(() => {})
      }
      return result
    }

    // Limit exhaustion
    if (session.remainingSeconds <= 0) {
      const result: CallerClassificationResult = {
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
      }
      if (options?.recordAudit !== false) {
        await recordCallerDecisionAudit(result, idempotencyKey).catch(() => {})
      }
      return result
    }

    // Interrupted session: check resume window
    if (session.state === 'interrupted') {
      const expiresMs = session.resumeWindowExpiresAt
        ? new Date(session.resumeWindowExpiresAt).getTime()
        : 0

      if (expiresMs <= 0 || nowMs > expiresMs) {
        const result: CallerClassificationResult = {
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
        }
        if (options?.recordAudit !== false) {
          await recordCallerDecisionAudit(result, idempotencyKey).catch(() => {})
        }
        return result
      }

      // Valid callback window
      const result: CallerClassificationResult = {
        decision: 'eligible_callback',
        allowCall: true,
        reason: 'Uprawniony callback aktywnej/przerwanej opłaconej konsultacji w ważnym oknie',
        callerPhoneFingerprint: fingerprint,
        callerPhoneMasked: masked,
        bookingId: booking.id,
        sessionId: session.id,
        remainingSeconds: session.remainingSeconds,
        resumeWindowExpiresAt: session.resumeWindowExpiresAt,
        evaluatedAt: nowIso,
      }
      if (options?.recordAudit !== false) {
        await recordCallerDecisionAudit(result, idempotencyKey).catch(() => {})
      }
      return result
    }

    // Active session in state 'active' | 'resumed' | 'waiting_for_owner' | 'bridging'
    const result: CallerClassificationResult = {
      decision: 'eligible_callback',
      allowCall: true,
      reason: 'Uprawnione połączenie aktywnej opłaconej konsultacji',
      callerPhoneFingerprint: fingerprint,
      callerPhoneMasked: masked,
      bookingId: booking.id,
      sessionId: session.id,
      remainingSeconds: session.remainingSeconds,
      resumeWindowExpiresAt: session.resumeWindowExpiresAt,
      evaluatedAt: nowIso,
    }
    if (options?.recordAudit !== false) {
      await recordCallerDecisionAudit(result, idempotencyKey).catch(() => {})
    }
    return result
  }

  // 8. No active session path
  const latestTerminalSession = allSessions.find((s) => isTerminalCallSessionState(s.state))
  const latestBooking = matchingBookings[0]

  if (!latestBooking) {
    if (latestTerminalSession) {
      const result: CallerClassificationResult = {
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
      }
      if (options?.recordAudit !== false) {
        await recordCallerDecisionAudit(result, idempotencyKey).catch(() => {})
      }
      return result
    }

    const result: CallerClassificationResult = {
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
    }
    if (options?.recordAudit !== false) {
      await recordCallerDecisionAudit(result, idempotencyKey).catch(() => {})
    }
    return result
  }

  if (latestBooking.paymentStatus === 'paid') {
    if (latestTerminalSession && latestTerminalSession.bookingId === latestBooking.id) {
      const result: CallerClassificationResult = {
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
      }
      if (options?.recordAudit !== false) {
        await recordCallerDecisionAudit(result, idempotencyKey).catch(() => {})
      }
      return result
    }

    if (latestBooking.bookingStatus === 'done') {
      const result: CallerClassificationResult = {
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
      }
      if (options?.recordAudit !== false) {
        await recordCallerDecisionAudit(result, idempotencyKey).catch(() => {})
      }
      return result
    }

    if (latestBooking.bookingStatus === 'cancelled' || latestBooking.bookingStatus === 'expired') {
      const result: CallerClassificationResult = {
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
      }
      if (options?.recordAudit !== false) {
        await recordCallerDecisionAudit(result, idempotencyKey).catch(() => {})
      }
      return result
    }

    const result: CallerClassificationResult = {
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
    }
    if (options?.recordAudit !== false) {
      await recordCallerDecisionAudit(result, idempotencyKey).catch(() => {})
    }
    return result
  }

  const result: CallerClassificationResult = {
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
  }
  if (options?.recordAudit !== false) {
    await recordCallerDecisionAudit(result, idempotencyKey).catch(() => {})
  }
  return result
}
