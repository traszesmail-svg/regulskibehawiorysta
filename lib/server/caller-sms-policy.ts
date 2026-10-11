import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { getLocalStoreDataDir } from '@/lib/server/local-store-path'
import { getSupabaseServerConfig, resolveDataMode } from '@/lib/server/env'
import { createClient } from '@supabase/supabase-js'
import { normalizePolishPhone } from '@/lib/phone'
import {
  canonicalizePayload,
  computeCallerPhoneFingerprint,
  computePayloadHash,
} from '@/lib/server/call-session-security'
import {
  deleteSmsQueueItem,
  deleteSmsQueueItemUnderLock,
  enqueueSms,
  enqueueSmsUnderLock,
  getSmsQueueItemById,
  getSmsQueueItemByIdUnderLock,
  getSmsQueueItemByIdempotencyKey,
  getSmsQueueItemByIdempotencyKeyUnderLock,
  readStoredSmsQueueUnderLock,
  writeStoredSmsQueueUnderLock,
  withStoreLock,
  type SmsQueueItem,
} from '@/lib/server/phone-agent-store'
import { classifyIncomingCaller } from '@/lib/server/caller-classifier'
import type {
  CallerClassificationDecision,
  CallerClassificationResult,
  ClassifyCallerOptions,
} from './caller-classification-types'
import {
  ADMISSIBLE_CALLER_SMS_DECISIONS,
  BLOCKED_CALLER_SMS_DECISIONS,
  CALLER_SMS_RATE_LIMIT_HOURS,
  CALLER_SMS_RATE_LIMIT_MS,
  MAX_TRANSACTIONAL_SMS_LENGTH,
  OFFICIAL_SMS_DOMAINS,
  OFFICIAL_SMS_PATHS,
  CallerSmsAction,
  CallerSmsPolicyEvaluation,
  CallerSmsPreparationRecord,
  CallerSmsStatus,
  CallerSmsStoreSnapshot,
  GenerateCallerSmsOptions,
  PromoteCallerSmsOptions,
  PromoteCallerSmsResult,
  PromoteCallerSmsStatus,
} from './caller-sms-types'

export const DEFAULT_OFFICIAL_BOOKING_URL = 'https://regulskibehawiorysta.pl/zapytaj'
export const DEFAULT_OFFICIAL_SMS_MESSAGE =
  'Dzień dobry. Rezerwacja terminu rozmowy z behawiorystą Krzysztofem Regulskim jest możliwa pod adresem: https://regulskibehawiorysta.pl/zapytaj'
export const FALLBACK_OFFICIAL_SMS_MESSAGE =
  'Regulski Behawiorysta: wybor terminu konsultacji: https://regulskibehawiorysta.pl/zapytaj'

let callerSmsStoreQueue = Promise.resolve()

function withCallerSmsLock<T>(work: () => Promise<T>): Promise<T> {
  const next = callerSmsStoreQueue.then(work, work)
  callerSmsStoreQueue = next.then(
    () => undefined,
    () => undefined,
  )
  return next
}

function getCallerSmsStorePath(): string {
  return path.join(getLocalStoreDataDir(), 'caller-sms-preparations-snapshot.json')
}

async function readCallerSmsStoreSnapshot(): Promise<CallerSmsStoreSnapshot> {
  const filePath = getCallerSmsStorePath()
  try {
    const raw = await readFile(filePath, 'utf8')
    const parsed = JSON.parse(raw) as Partial<CallerSmsStoreSnapshot>
    return {
      preparations: Array.isArray(parsed?.preparations) ? parsed.preparations : [],
    }
  } catch (error: any) {
    if (error && error.code === 'ENOENT') {
      return { preparations: [] }
    }
    return { preparations: [] }
  }
}

async function writeCallerSmsStoreSnapshot(snapshot: CallerSmsStoreSnapshot): Promise<void> {
  const targetPath = getCallerSmsStorePath()
  const dir = path.dirname(targetPath)
  await mkdir(dir, { recursive: true })

  const tempPath = path.join(dir, `.caller-sms-preparations.${randomUUID()}.tmp`)
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
  const config = getSupabaseServerConfig('caller sms preparations')
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
  return resolveDataMode('caller sms preparations') === 'supabase'
}

function mapSupabaseRowToPreparationRecord(row: any): CallerSmsPreparationRecord {
  return {
    id: String(row.id),
    action: row.action as CallerSmsAction,
    status: row.status as CallerSmsStatus,
    decision: row.decision as CallerClassificationDecision,
    callerPhoneFingerprint: row.caller_phone_fingerprint ?? null,
    callerPhoneMasked: row.caller_phone_masked ?? null,
    message: row.message ?? null,
    targetUrl: row.target_url ?? null,
    rejectionReason: row.rejection_reason ?? null,
    idempotencyKey: row.idempotency_key ? String(row.idempotency_key) : null,
    requestHash: row.request_hash ? String(row.request_hash) : null,
    payloadHash: row.payload_hash ? String(row.payload_hash) : null,
    preparedAt: String(row.prepared_at),
    createdAt: String(row.created_at),
    promotedAt: row.promoted_at ? String(row.promoted_at) : null,
    queueItemId: row.queue_item_id ? String(row.queue_item_id) : null,
    approvalId: row.approval_id ? String(row.approval_id) : null,
  }
}

function mapSupabaseRowToSmsQueueItem(row: any): SmsQueueItem {
  return {
    id: String(row.id),
    bookingId: row.booking_id ? String(row.booking_id) : null,
    phone: String(row.phone),
    message: String(row.message),
    type: row.type,
    status: row.status,
    scheduledFor: String(row.scheduled_for),
    createdAt: String(row.created_at),
    sentAt: row.sent_at ? String(row.sent_at) : null,
    error: row.error ? String(row.error) : null,
    idempotencyKey: String(row.idempotency_key),
  }
}

export function validateOfficialTargetUrl(urlCandidate: string): {
  isValid: boolean
  url: string | null
  error: string | null
} {
  if (!urlCandidate || typeof urlCandidate !== 'string') {
    return { isValid: false, url: null, error: 'Pusty adres URL' }
  }

  try {
    const parsed = new URL(urlCandidate.trim())
    if (parsed.protocol !== 'https:') {
      return {
        isValid: false,
        url: null,
        error: `Niedozwolony protokół "${parsed.protocol}" (wymagany wyłącznie https:)`,
      }
    }

    const hostname = parsed.hostname.toLowerCase()
    if (!OFFICIAL_SMS_DOMAINS.includes(hostname as any)) {
      return {
        isValid: false,
        url: null,
        error: `Niedozwolona domena "${hostname}" (dozwolona wyłącznie: ${OFFICIAL_SMS_DOMAINS.join(', ')})`,
      }
    }

    if (parsed.port && parsed.port !== '443') {
      return { isValid: false, url: null, error: `Niedozwolony port "${parsed.port}"` }
    }

    if (parsed.username || parsed.password) {
      return { isValid: false, url: null, error: 'URL nie może zawierać danych uwierzytelniających' }
    }

    if (!OFFICIAL_SMS_PATHS.includes(parsed.pathname as any)) {
      return {
        isValid: false,
        url: null,
        error: `Niedozwolona ścieżka "${parsed.pathname}" (dozwolona wyłącznie: ${OFFICIAL_SMS_PATHS.join(', ')})`,
      }
    }

    if (parsed.search && parsed.search.length > 1) {
      return { isValid: false, url: null, error: 'URL nie może zawierać parametrów query' }
    }

    if (parsed.hash && parsed.hash.length > 1) {
      return { isValid: false, url: null, error: 'URL nie może zawierać fragmentu hash' }
    }

    return { isValid: true, url: `${parsed.origin}${parsed.pathname}`, error: null }
  } catch {
    return { isValid: false, url: null, error: 'Nieprawidłowy format adresu URL' }
  }
}

export function validateSmsMessageContent(message: string): {
  isValid: boolean
  message: string | null
  error: string | null
} {
  if (!message || typeof message !== 'string') {
    return { isValid: false, message: null, error: 'Pusta treść wiadomości SMS' }
  }

  const trimmed = message.trim()
  if (trimmed.length === 0) {
    return { isValid: false, message: null, error: 'Pusta treść wiadomości SMS' }
  }

  if (trimmed.length > MAX_TRANSACTIONAL_SMS_LENGTH) {
    return {
      isValid: false,
      message: null,
      error: `Przekroczono maksymalną dopuszczalną długość SMS (${trimmed.length}/${MAX_TRANSACTIONAL_SMS_LENGTH} znaków)`,
    }
  }

  return { isValid: true, message: trimmed, error: null }
}

export interface CallerSmsRequestHashInput {
  callerPhoneFingerprint: string | null
  decision: string
  targetUrl: string
  message: string
  action: string
}

export function computeCallerSmsRequestHash(input: CallerSmsRequestHashInput): string {
  const descriptor = {
    operation: 'prepare_caller_sms',
    callerPhoneFingerprint: input.callerPhoneFingerprint ?? null,
    decision: input.decision,
    targetUrl: input.targetUrl,
    message: input.message,
    action: input.action,
  }
  return createHash('sha256').update(canonicalizePayload(descriptor)).digest('hex')
}

export function computeCallerSmsIdempotencyKey(input: {
  callerPhoneFingerprint: string
  evaluatedAt: string
}): string {
  const digest = createHash('sha256')
    .update(`caller_sms_idemp:${input.callerPhoneFingerprint}:${input.evaluatedAt}`)
    .digest('hex')
    .slice(0, 32)
  return `sms_prep_${digest}`
}

export function evaluateCallerSmsPolicy(
  classification: CallerClassificationResult,
  options?: GenerateCallerSmsOptions,
): CallerSmsPolicyEvaluation {
  const decision = classification.decision
  const fingerprint = classification.callerPhoneFingerprint
  const masked = classification.callerPhoneMasked

  // 1. Fail-closed: Blocked decisions
  if ((BLOCKED_CALLER_SMS_DECISIONS as readonly string[]).includes(decision)) {
    const rejectionReason =
      decision === 'paid_booking_no_session'
        ? 'Klient opłacił rezerwację bez przerwanej sesji - ponowny wybór terminu wykluczony ze względu na ryzyko podwójnej płatności (fail-closed)'
        : `Decyzja klasyfikatora "${decision}" wyklucza wysyłkę wiadomości SMS (polityka fail-closed)`
    return {
      action: 'do_not_send',
      status: 'do_not_send',
      decision,
      callerPhoneFingerprint: fingerprint,
      callerPhoneMasked: masked,
      message: null,
      targetUrl: null,
      rejectionReason,
      isAdmissible: false,
    }
  }

  // 2. Strict Admissibility check
  if (!(ADMISSIBLE_CALLER_SMS_DECISIONS as readonly string[]).includes(decision)) {
    return {
      action: 'do_not_send',
      status: 'do_not_send',
      decision,
      callerPhoneFingerprint: fingerprint,
      callerPhoneMasked: masked,
      message: null,
      targetUrl: null,
      rejectionReason: `Nierozpoznana decyzja klasyfikatora "${decision}" (polityka fail-closed)`,
      isAdmissible: false,
    }
  }

  // 3. Security prerequisites: must have valid phone fingerprint
  if (!fingerprint) {
    return {
      action: 'do_not_send',
      status: 'do_not_send',
      decision,
      callerPhoneFingerprint: null,
      callerPhoneMasked: masked,
      message: null,
      targetUrl: null,
      rejectionReason: 'Brak wymaganego fingerprintu numeru telefonu (fail-closed)',
      isAdmissible: false,
    }
  }

  // 4. Validate official URL
  const targetUrl = options?.targetUrlOverride ?? DEFAULT_OFFICIAL_BOOKING_URL
  const urlValidation = validateOfficialTargetUrl(targetUrl)
  if (!urlValidation.isValid || !urlValidation.url) {
    return {
      action: 'do_not_send',
      status: 'do_not_send',
      decision,
      callerPhoneFingerprint: fingerprint,
      callerPhoneMasked: masked,
      message: null,
      targetUrl: null,
      rejectionReason: `Niedozwolony adres URL: ${urlValidation.error} (fail-closed)`,
      isAdmissible: false,
    }
  }

  // 5. Message generation and length validation
  let message = options?.messageTemplateOverride ?? DEFAULT_OFFICIAL_SMS_MESSAGE
  let msgValidation = validateSmsMessageContent(message)
  if (!msgValidation.isValid) {
    // Attempt safe fallback message
    message = FALLBACK_OFFICIAL_SMS_MESSAGE
    msgValidation = validateSmsMessageContent(message)
  }

  if (!msgValidation.isValid || !msgValidation.message) {
    return {
      action: 'do_not_send',
      status: 'do_not_send',
      decision,
      callerPhoneFingerprint: fingerprint,
      callerPhoneMasked: masked,
      message: null,
      targetUrl: null,
      rejectionReason: `Błąd walidacji treści wiadomości SMS: ${msgValidation.error} (fail-closed)`,
      isAdmissible: false,
    }
  }

  // Admissible and passed all safety checks
  return {
    action: 'send',
    status: 'prepared',
    decision,
    callerPhoneFingerprint: fingerprint,
    callerPhoneMasked: masked,
    message: msgValidation.message,
    targetUrl: urlValidation.url,
    rejectionReason: null,
    isAdmissible: true,
  }
}

export async function generateCallerSms(
  classification: CallerClassificationResult,
  options?: GenerateCallerSmsOptions,
): Promise<CallerSmsPreparationRecord> {
  const now = options?.now ?? new Date()
  const nowIso = now.toISOString()
  const nowMs = now.getTime()

  // 1. Evaluate policy
  const policy = evaluateCallerSmsPolicy(classification, options)

  const isDryRun = options?.dryRun === true || options?.recordPreparation === false
  const rawKey = typeof options?.idempotencyKey === 'string' ? options.idempotencyKey.trim() : ''

  // 2. Pure preview mode: does not mutate durable storage
  if (isDryRun) {
    if (rawKey.length > 128) {
      return {
        id: `fail-closed-${randomUUID()}`,
        action: 'do_not_send',
        status: 'do_not_send',
        decision: policy.decision,
        callerPhoneFingerprint: policy.callerPhoneFingerprint,
        callerPhoneMasked: policy.callerPhoneMasked,
        message: null,
        targetUrl: null,
        rejectionReason: 'Parametr idempotencyKey przekracza maksymalną dopuszczalną długość (128 znaków) (fail-closed)',
        idempotencyKey: null,
        requestHash: computeCallerSmsRequestHash({
          callerPhoneFingerprint: policy.callerPhoneFingerprint,
          decision: policy.decision,
          targetUrl: '',
          message: '',
          action: 'do_not_send',
        }),
        payloadHash: computePayloadHash({
          decision: policy.decision,
          callerPhoneFingerprint: policy.callerPhoneFingerprint,
          action: 'do_not_send',
          targetUrl: null,
          message: null,
          rejectionReason: 'Parametr idempotencyKey przekracza maksymalną dopuszczalną długość (128 znaków) (fail-closed)',
        }),
        preparedAt: nowIso,
        createdAt: nowIso,
      }
    }

    // Pure preview supports missing key without mutation or fake idempotency guarantees
    const previewIdempotencyKey = rawKey.length > 0 ? rawKey : null
    const requestHash = computeCallerSmsRequestHash({
      callerPhoneFingerprint: policy.callerPhoneFingerprint,
      decision: policy.decision,
      targetUrl: policy.targetUrl ?? '',
      message: policy.message ?? '',
      action: policy.action,
    })
    const payloadHash = computePayloadHash({
      decision: policy.decision,
      callerPhoneFingerprint: policy.callerPhoneFingerprint,
      action: policy.action,
      targetUrl: policy.targetUrl,
      message: policy.message,
      rejectionReason: policy.rejectionReason,
    })

    return {
      id: `preview-${randomUUID()}`,
      action: policy.action,
      status: policy.status,
      decision: policy.decision,
      callerPhoneFingerprint: policy.callerPhoneFingerprint,
      callerPhoneMasked: policy.callerPhoneMasked,
      message: policy.message,
      targetUrl: policy.targetUrl,
      rejectionReason: policy.rejectionReason,
      idempotencyKey: previewIdempotencyKey,
      requestHash,
      payloadHash,
      preparedAt: nowIso,
      createdAt: nowIso,
    }
  }

  // 3. Durable preparation mode: must fail-closed if key is missing, whitespace, or >128 chars
  if (!rawKey) {
    return {
      id: `fail-closed-${randomUUID()}`,
      action: 'do_not_send',
      status: 'do_not_send',
      decision: policy.decision,
      callerPhoneFingerprint: policy.callerPhoneFingerprint,
      callerPhoneMasked: policy.callerPhoneMasked,
      message: null,
      targetUrl: null,
      rejectionReason: 'Brak wymaganego klucza idempotencji dla trwałego przygotowania SMS (fail-closed)',
      idempotencyKey: null,
      requestHash: computeCallerSmsRequestHash({
        callerPhoneFingerprint: policy.callerPhoneFingerprint,
        decision: policy.decision,
        targetUrl: '',
        message: '',
        action: 'do_not_send',
      }),
      payloadHash: computePayloadHash({
        decision: policy.decision,
        callerPhoneFingerprint: policy.callerPhoneFingerprint,
        action: 'do_not_send',
        targetUrl: null,
        message: null,
        rejectionReason: 'Brak wymaganego klucza idempotencji dla trwałego przygotowania SMS (fail-closed)',
      }),
      preparedAt: nowIso,
      createdAt: nowIso,
    }
  }

  if (rawKey.length > 128) {
    return {
      id: `fail-closed-${randomUUID()}`,
      action: 'do_not_send',
      status: 'do_not_send',
      decision: policy.decision,
      callerPhoneFingerprint: policy.callerPhoneFingerprint,
      callerPhoneMasked: policy.callerPhoneMasked,
      message: null,
      targetUrl: null,
      rejectionReason: 'Parametr idempotencyKey przekracza maksymalną dopuszczalną długość (128 znaków) (fail-closed)',
      idempotencyKey: null,
      requestHash: computeCallerSmsRequestHash({
        callerPhoneFingerprint: policy.callerPhoneFingerprint,
        decision: policy.decision,
        targetUrl: '',
        message: '',
        action: 'do_not_send',
      }),
      payloadHash: computePayloadHash({
        decision: policy.decision,
        callerPhoneFingerprint: policy.callerPhoneFingerprint,
        action: 'do_not_send',
        targetUrl: null,
        message: null,
        rejectionReason: 'Parametr idempotencyKey przekracza maksymalną dopuszczalną długość (128 znaków) (fail-closed)',
      }),
      preparedAt: nowIso,
      createdAt: nowIso,
    }
  }

  const idempotencyKey = rawKey

  // 4. Compute deterministic hashes
  const requestHash = computeCallerSmsRequestHash({
    callerPhoneFingerprint: policy.callerPhoneFingerprint,
    decision: policy.decision,
    targetUrl: policy.targetUrl ?? '',
    message: policy.message ?? '',
    action: policy.action,
  })

  const payloadHash = computePayloadHash({
    decision: policy.decision,
    callerPhoneFingerprint: policy.callerPhoneFingerprint,
    action: policy.action,
    targetUrl: policy.targetUrl,
    message: policy.message,
    rejectionReason: policy.rejectionReason,
  })

  // 5. Blocked policy evaluation: fail-closed without mutating durable storage (e.g. paid_booking_no_session)
  if (policy.action === 'do_not_send') {
    return {
      id: `blocked-${randomUUID()}`,
      action: 'do_not_send',
      status: 'do_not_send',
      decision: policy.decision,
      callerPhoneFingerprint: policy.callerPhoneFingerprint,
      callerPhoneMasked: policy.callerPhoneMasked,
      message: null,
      targetUrl: null,
      rejectionReason: policy.rejectionReason,
      idempotencyKey,
      requestHash,
      payloadHash,
      preparedAt: nowIso,
      createdAt: nowIso,
    }
  }

  // 6. Supabase execution mode
  if (shouldUseSupabase()) {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.rpc('prepare_caller_sms', {
        p_caller_phone_fingerprint: policy.callerPhoneFingerprint ?? 'unidentified',
        p_caller_phone_masked: policy.callerPhoneMasked ?? 'unidentified',
        p_decision: policy.decision,
        p_action: policy.action,
        p_status: policy.status,
        p_message: policy.message,
        p_target_url: policy.targetUrl,
        p_rejection_reason: policy.rejectionReason,
        p_idempotency_key: idempotencyKey,
        p_request_hash: requestHash,
        p_payload_hash: payloadHash,
        p_now: nowIso,
      })

      if (error) {
        if (error.message.includes('idempotency_conflict')) {
          return {
            id: randomUUID(),
            action: 'do_not_send',
            status: 'do_not_send',
            decision: policy.decision,
            callerPhoneFingerprint: policy.callerPhoneFingerprint,
            callerPhoneMasked: policy.callerPhoneMasked,
            message: null,
            targetUrl: null,
            rejectionReason: 'idempotency_conflict: klucz idempotencji został już użyty dla innego żądania (fail-closed)',
            idempotencyKey,
            requestHash,
            payloadHash,
            preparedAt: nowIso,
            createdAt: nowIso,
          }
        }
        throw new Error(`Błąd trwałego przygotowania SMS w Supabase: ${error.message}`)
      }

      return mapSupabaseRowToPreparationRecord(data)
    } catch (err: any) {
      throw err
    }
  }

  // 7. Local store execution mode (with thread-safe lock and atomic snapshot persistence)
  return withCallerSmsLock(async () => {
    const snapshot = await readCallerSmsStoreSnapshot()

    // 7a. Idempotency check on incoming event key
    const existing = snapshot.preparations.find((p) => p.idempotencyKey === idempotencyKey)
    if (existing) {
      if (existing.requestHash === requestHash) {
        // Exact retry -> return existing record
        return existing
      }

      // Conflict: same key, different request/payload
      return {
        id: randomUUID(),
        action: 'do_not_send',
        status: 'do_not_send',
        decision: policy.decision,
        callerPhoneFingerprint: policy.callerPhoneFingerprint,
        callerPhoneMasked: policy.callerPhoneMasked,
        message: null,
        targetUrl: null,
        rejectionReason: 'idempotency_conflict: klucz idempotencji został już użyty dla innego żądania (fail-closed)',
        idempotencyKey,
        requestHash,
        payloadHash,
        preparedAt: nowIso,
        createdAt: nowIso,
      }
    }

    // 7b. Rate-limit check (1 SMS per 24 hours per phone fingerprint)
    if (policy.callerPhoneFingerprint) {
      const recentPrepared = snapshot.preparations.find((p) => {
        if (p.callerPhoneFingerprint !== policy.callerPhoneFingerprint) return false
        if (p.status !== 'prepared') return false
        const prepTime = new Date(p.preparedAt).getTime()
        return nowMs - prepTime < CALLER_SMS_RATE_LIMIT_MS
      })

      if (recentPrepared) {
        const rateLimitedRecord: CallerSmsPreparationRecord = {
          id: randomUUID(),
          action: 'do_not_send',
          status: 'do_not_send',
          decision: policy.decision,
          callerPhoneFingerprint: policy.callerPhoneFingerprint,
          callerPhoneMasked: policy.callerPhoneMasked,
          message: null,
          targetUrl: null,
          rejectionReason: `rate_limit_exceeded: limit maksymalnie 1 SMS na 24 godziny na numer został wyczerpany (ostatnio przygotowano: ${recentPrepared.preparedAt})`,
          idempotencyKey,
          requestHash,
          payloadHash,
          preparedAt: nowIso,
          createdAt: nowIso,
        }

        snapshot.preparations.push(rateLimitedRecord)
        await writeCallerSmsStoreSnapshot(snapshot)
        return rateLimitedRecord
      }
    }

    // 7c. Record prepared SMS
    const newRecord: CallerSmsPreparationRecord = {
      id: randomUUID(),
      action: policy.action,
      status: policy.status,
      decision: policy.decision,
      callerPhoneFingerprint: policy.callerPhoneFingerprint,
      callerPhoneMasked: policy.callerPhoneMasked,
      message: policy.message,
      targetUrl: policy.targetUrl,
      rejectionReason: policy.rejectionReason,
      idempotencyKey,
      requestHash,
      payloadHash,
      preparedAt: nowIso,
      createdAt: nowIso,
    }

    snapshot.preparations.push(newRecord)
    await writeCallerSmsStoreSnapshot(snapshot)

    return newRecord
  })
}

export async function processCallerSmsForInboundCall(
  phone: string,
  options?: GenerateCallerSmsOptions & ClassifyCallerOptions,
): Promise<{
  classification: CallerClassificationResult
  sms: CallerSmsPreparationRecord
}> {
  const classification = await classifyIncomingCaller(phone, options)
  const sms = await generateCallerSms(classification, options)
  return { classification, sms }
}

export async function listCallerSmsPreparations(filter?: {
  fingerprint?: string
}): Promise<CallerSmsPreparationRecord[]> {
  if (shouldUseSupabase()) {
    const supabase = getSupabaseClient()
    let query = supabase
      .from('caller_sms_preparations')
      .select('*')
      .order('created_at', { ascending: false })
    if (filter?.fingerprint) {
      query = query.eq('caller_phone_fingerprint', filter.fingerprint)
    }
    const { data, error } = await query
    if (error) {
      throw new Error(`Błąd odczytu listy przygotowań SMS w Supabase: ${error.message}`)
    }
    return (data || []).map(mapSupabaseRowToPreparationRecord)
  }

  return withCallerSmsLock(async () => {
    const snapshot = await readCallerSmsStoreSnapshot()
    let list = snapshot.preparations
    if (filter?.fingerprint) {
      list = list.filter((p) => p.callerPhoneFingerprint === filter.fingerprint)
    }
    return [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  })
}

export const STAGE4_RUNTIME_FLAG_ENV = 'STAGE4_CONTROLLED_SMS_PROMOTION_ENABLED'
export const CONTROLLED_TECHNICAL_TEST_MARKER = '[TEST TECHNICZNY]'
export const TECHNICAL_TEST_REGEX = /\[?TEST\s+TECHNICZNY\]?/i
export const DEFAULT_PROMOTION_EXPIRY_MS = 30 * 60 * 1000 // 30 minutes

export function isStage4PromotionEnabled(): boolean {
  return process.env.STAGE4_CONTROLLED_SMS_PROMOTION_ENABLED?.trim().toLowerCase() === 'true'
}

export type PromotionBoundaryHookContext = {
  preparationId: string
  approvalId: string
  queueItemId: string
  preparation: CallerSmsPreparationRecord
}

export type PromotionBoundaryHook = (
  context: PromotionBoundaryHookContext,
) => Promise<void> | void

let testBoundaryHook: PromotionBoundaryHook | null = null

/**
 * Test-only hook to simulate boundary pause or failure inside the atomic critical section.
 * NEVER exposed to HTTP or runtime configuration.
 */
export function setPromotionBoundaryHookForTest(
  hook: PromotionBoundaryHook | null,
): void {
  testBoundaryHook = hook
}

export function validateTechnicalTestMessage(
  candidateMessage: string,
  targetUrl: string | null,
): {
  isValid: boolean
  message: string | null
  error: string | null
} {
  const contentValidation = validateSmsMessageContent(candidateMessage)
  if (!contentValidation.isValid || !contentValidation.message) {
    return { isValid: false, message: null, error: contentValidation.error }
  }

  const message = contentValidation.message
  if (!TECHNICAL_TEST_REGEX.test(message)) {
    return {
      isValid: false,
      message: null,
      error: 'Treść wiadomości nie zawiera wymaganego oznaczenia kontrolnego testu technicznego (wymagane [TEST TECHNICZNY]) (fail-closed)',
    }
  }

  if (!targetUrl || !message.includes(targetUrl)) {
    return {
      isValid: false,
      message: null,
      error: 'Wiadomość musi zawierać oficjalny link docelowy z rekordu przygotowania (fail-closed)',
    }
  }

  const urlValidation = validateOfficialTargetUrl(targetUrl)
  if (!urlValidation.isValid) {
    return {
      isValid: false,
      message: null,
      error: `Nieprawidłowy adres URL w wiadomości: ${urlValidation.error} (fail-closed)`,
    }
  }

  return { isValid: true, message, error: null }
}

export async function getCallerSmsPreparationById(
  id: string,
): Promise<CallerSmsPreparationRecord | null> {
  if (shouldUseSupabase()) {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('caller_sms_preparations')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) {
      throw new Error(`Błąd odczytu przygotowania SMS w Supabase: ${error.message}`)
    }
    return data ? mapSupabaseRowToPreparationRecord(data) : null
  }

  return withCallerSmsLock(async () => {
    const snapshot = await readCallerSmsStoreSnapshot()
    const found = snapshot.preparations.find((p) => p.id === id)
    return found
      ? {
          ...found,
          promotedAt: found.promotedAt ?? null,
          queueItemId: found.queueItemId ?? null,
          approvalId: found.approvalId ?? null,
        }
      : null
  })
}

export async function promoteCallerSmsToQueue(
  options: PromoteCallerSmsOptions,
): Promise<PromoteCallerSmsResult> {
  const isDryRun = options.dryRun !== false
  const now = options.now ?? new Date()
  const nowIso = now.toISOString()
  const nowMs = now.getTime()
  const maxAgeMs = options.maxAgeMs ?? DEFAULT_PROMOTION_EXPIRY_MS

  // 1. Defense-in-depth: Admin authorization required
  if (options.adminAuthorized !== true) {
    return {
      ok: false,
      status: 'rejected',
      preview: isDryRun,
      rejectionReason: 'Brak autoryzacji administratora dla promocji SMS (fail-closed)',
      preparation: null,
      queueItem: null,
    }
  }

  // 2. Controlled technical test explicit affirmation required
  if (options.isControlledTechnicalTest !== true) {
    return {
      ok: false,
      status: 'rejected',
      preview: isDryRun,
      rejectionReason: 'Wymagane jest jawne oznaczenie kontrolowanego testu technicznego (isControlledTechnicalTest=true) (fail-closed)',
      preparation: null,
      queueItem: null,
    }
  }

  // 3. Validate preparationId and approvalId
  const preparationId = options.preparationId?.trim()
  if (!preparationId) {
    return {
      ok: false,
      status: 'rejected',
      preview: isDryRun,
      rejectionReason: 'Brak wymaganego identyfikatora preparationId (fail-closed)',
      preparation: null,
      queueItem: null,
    }
  }

  const approvalId = options.approvalId?.trim()
  if (!approvalId || approvalId.length > 128) {
    return {
      ok: false,
      status: 'rejected',
      preview: isDryRun,
      rejectionReason: 'Nieprawidłowy lub brakujący approvalId (wymagane 1-128 znaków) (fail-closed)',
      preparation: null,
      queueItem: null,
    }
  }

  // 4. Validate rawPhone, normalize, compute HMAC (NEVER log rawPhone)
  const rawPhone = options.rawPhone?.trim()
  if (!rawPhone) {
    return {
      ok: false,
      status: 'rejected',
      preview: isDryRun,
      rejectionReason: 'Brak numeru telefonu w żądaniu (fail-closed)',
      preparation: null,
      queueItem: null,
    }
  }

  const normalized = normalizePolishPhone(rawPhone)
  if (!normalized) {
    return {
      ok: false,
      status: 'rejected',
      preview: isDryRun,
      rejectionReason: 'Nieprawidłowy format numeru telefonu (fail-closed)',
      preparation: null,
      queueItem: null,
    }
  }

  let computedFingerprint: string
  try {
    computedFingerprint = computeCallerPhoneFingerprint(rawPhone, options.secretOverride)
  } catch {
    return {
      ok: false,
      status: 'rejected',
      preview: isDryRun,
      rejectionReason: 'Błąd wyliczania fingerprintu numeru telefonu (fail-closed)',
      preparation: null,
      queueItem: null,
    }
  }

  // 5. Runtime flag check: mutations disabled unless explicitly enabled in runtime
  const flagEnabled = isStage4PromotionEnabled()
  if (!isDryRun && !flagEnabled) {
    return {
      ok: false,
      status: 'rejected',
      preview: true,
      rejectionReason: `Bramka promocji SMS Etapu 4 jest wyłączona w konfiguracji runtime (${STAGE4_RUNTIME_FLAG_ENV}=false). Mutacje są zablokowane.`,
      preparation: null,
      queueItem: null,
    }
  }

  const validatePreparationRecord = (
    prep: CallerSmsPreparationRecord,
  ): { isValid: boolean; error?: string; status?: PromoteCallerSmsStatus } => {
    // 5a. Strict fingerprint match
    if (prep.callerPhoneFingerprint !== computedFingerprint) {
      return {
        isValid: false,
        error: 'Niezgodność fingerprintu numeru telefonu z rekordem przygotowania (fail-closed)',
        status: 'rejected',
      }
    }

    // 5b. Status & action check
    if (prep.action === 'do_not_send' || prep.status === 'do_not_send') {
      return {
        isValid: false,
        error: 'Rekord przygotowania ma status do_not_send (fail-closed)',
        status: 'rejected',
      }
    }

    // 5c. Semantic admissibility check
    if (!(ADMISSIBLE_CALLER_SMS_DECISIONS as readonly string[]).includes(prep.decision)) {
      return {
        isValid: false,
        error: `Decyzja "${prep.decision}" wyklucza wysyłkę wiadomości SMS (fail-closed)`,
        status: 'rejected',
      }
    }

    // 5d. Expiration window check
    const prepMs = new Date(prep.preparedAt).getTime()
    if (nowMs - prepMs > maxAgeMs) {
      return {
        isValid: false,
        error: `Rekord przygotowania wygasł (przekroczono maksymalne okno ważności ${Math.round(maxAgeMs / 60000)} min) (fail-closed)`,
        status: 'rejected',
      }
    }

    return { isValid: true }
  }

  const resolveTargetMessage = (prep: CallerSmsPreparationRecord) => {
    let candidate = options.messageOverride
    if (!candidate) {
      candidate = `${CONTROLLED_TECHNICAL_TEST_MARKER} ${prep.message}`
      if (candidate.length > MAX_TRANSACTIONAL_SMS_LENGTH) {
        candidate = `${CONTROLLED_TECHNICAL_TEST_MARKER} ${FALLBACK_OFFICIAL_SMS_MESSAGE}`
      }
    }
    return validateTechnicalTestMessage(candidate, prep.targetUrl)
  }

  // 6. Supabase mode
  if (shouldUseSupabase()) {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('caller_sms_preparations')
      .select('*')
      .eq('id', preparationId)
      .maybeSingle()

    if (error) {
      throw new Error(`Błąd odczytu przygotowania SMS w Supabase: ${error.message}`)
    }
    if (!data) {
      return {
        ok: false,
        status: 'rejected',
        preview: isDryRun,
        rejectionReason: 'Nie znaleziono rekordu przygotowania SMS o podanym ID (fail-closed)',
        preparation: null,
        queueItem: null,
      }
    }

    const preparation = mapSupabaseRowToPreparationRecord(data)
    const prepValidation = validatePreparationRecord(preparation)
    if (!prepValidation.isValid) {
      return {
        ok: false,
        status: prepValidation.status ?? 'rejected',
        preview: isDryRun,
        rejectionReason: prepValidation.error!,
        preparation: null,
        queueItem: null,
      }
    }

    const msgValidation = resolveTargetMessage(preparation)
    if (!msgValidation.isValid || !msgValidation.message) {
      return {
        ok: false,
        status: 'rejected',
        preview: isDryRun,
        rejectionReason: msgValidation.error ?? 'Błąd walidacji treści testu technicznego (fail-closed)',
        preparation: null,
        queueItem: null,
      }
    }
    const validatedMessage = msgValidation.message

    // Check exact retry vs conflict on preparation
    if (preparation.status === 'promoted' || preparation.approvalId) {
      if (preparation.approvalId === approvalId) {
        const queueItem = preparation.queueItemId
          ? await getSmsQueueItemById(preparation.queueItemId)
          : await getSmsQueueItemByIdempotencyKey(`stage4_promo:${approvalId}`)

        if (queueItem && queueItem.message !== validatedMessage) {
          return {
            ok: false,
            status: 'idempotency_conflict',
            preview: isDryRun,
            rejectionReason: 'idempotency_conflict: niezgodna treść wiadomości dla ponowionego approvalId (fail-closed)',
            preparation: null,
            queueItem: null,
          }
        }

        return {
          ok: true,
          status: 'retry_matched',
          preview: isDryRun,
          isRetry: true,
          rejectionReason: null,
          preparation,
          queueItem,
        }
      }

      return {
        ok: false,
        status: 'rejected',
        preview: isDryRun,
        rejectionReason: 'Rekord przygotowania został już wykorzystany dla innego zatwierdzenia (fail-closed)',
        preparation: null,
        queueItem: null,
      }
    }

    // Check if approvalId was used for another preparation
    const { data: otherPrep } = await supabase
      .from('caller_sms_preparations')
      .select('id')
      .eq('approval_id', approvalId)
      .neq('id', preparation.id)
      .maybeSingle()

    if (otherPrep) {
      return {
        ok: false,
        status: 'idempotency_conflict',
        preview: isDryRun,
        rejectionReason: 'idempotency_conflict: approvalId został już użyty dla innego rekordu przygotowania (fail-closed)',
        preparation: null,
        queueItem: null,
      }
    }

    // Check 24-hour rate limit on promotions
    const since24h = new Date(nowMs - CALLER_SMS_RATE_LIMIT_MS).toISOString()
    const { data: recentPromotions } = await supabase
      .from('caller_sms_preparations')
      .select('id')
      .eq('caller_phone_fingerprint', computedFingerprint)
      .eq('status', 'promoted')
      .gte('promoted_at', since24h)
      .neq('id', preparation.id)
      .limit(1)

    if (recentPromotions && recentPromotions.length > 0) {
      return {
        ok: false,
        status: 'rejected',
        preview: isDryRun,
        rejectionReason: 'rate_limit_exceeded: limit 1 promowanego SMS na 24h na numer został już wykorzystany (fail-closed)',
        preparation: null,
        queueItem: null,
      }
    }

    // Dry-run preview
    if (isDryRun) {
      const previewQueueItem: SmsQueueItem = {
        id: `preview-${randomUUID()}`,
        bookingId: null,
        phone: normalized.e164,
        message: validatedMessage,
        type: 'custom',
        status: 'pending',
        scheduledFor: nowIso,
        createdAt: nowIso,
        sentAt: null,
        error: null,
        idempotencyKey: `stage4_promo:${approvalId}`,
      }
      const previewPreparation: CallerSmsPreparationRecord = {
        ...preparation,
        status: 'promoted',
        promotedAt: nowIso,
        queueItemId: previewQueueItem.id,
        approvalId,
      }
      return {
        ok: true,
        status: 'preview',
        preview: true,
        isRetry: false,
        rejectionReason: null,
        preparation: previewPreparation,
        queueItem: previewQueueItem,
      }
    }

    // Live execution in Supabase mode via atomic RPC
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'promote_caller_sms_to_queue',
      {
        p_preparation_id: preparation.id,
        p_approval_id: approvalId,
        p_phone: normalized.e164,
        p_caller_phone_fingerprint: computedFingerprint,
        p_message: validatedMessage,
        p_now: nowIso,
        p_max_age_seconds: Math.floor(maxAgeMs / 1000),
      },
    )

    if (rpcError) {
      const errMsg = rpcError.message || ''
      if (errMsg.includes('idempotency_conflict')) {
        return {
          ok: false,
          status: 'idempotency_conflict',
          preview: false,
          rejectionReason: errMsg,
          preparation: null,
          queueItem: null,
        }
      }
      if (
        errMsg.includes('rate_limit_exceeded') ||
        errMsg.includes('fingerprint_mismatch') ||
        errMsg.includes('expired') ||
        errMsg.includes('invalid_status') ||
        errMsg.includes('inadmissible_decision') ||
        errMsg.includes('already_promoted') ||
        errMsg.includes('invalid_message') ||
        errMsg.includes('not_found')
      ) {
        return {
          ok: false,
          status: 'rejected',
          preview: false,
          rejectionReason: errMsg,
          preparation: null,
          queueItem: null,
        }
      }
      throw new Error(`Błąd atomowej promocji SMS w Supabase: ${errMsg}`)
    }

    const rpcResult = rpcData as {
      status: PromoteCallerSmsStatus
      is_retry: boolean
      queue_item: any
      preparation: any
    }

    return {
      ok: true,
      status: rpcResult.status,
      preview: false,
      isRetry: Boolean(rpcResult.is_retry),
      rejectionReason: null,
      preparation: mapSupabaseRowToPreparationRecord(rpcResult.preparation),
      queueItem: mapSupabaseRowToSmsQueueItem(rpcResult.queue_item),
    }
  }

  // 7. Local store mode with atomic thread-safe critical section across queue and preparations
  return withCallerSmsLock(async () => {
    return withStoreLock(async () => {
      const snapshot = await readCallerSmsStoreSnapshot()
      const preparation = snapshot.preparations.find((p) => p.id === preparationId)

      if (!preparation) {
        return {
          ok: false,
          status: 'rejected',
          preview: isDryRun,
          rejectionReason: 'Nie znaleziono rekordu przygotowania SMS o podanym ID (fail-closed)',
          preparation: null,
          queueItem: null,
        }
      }

      const prepValidation = validatePreparationRecord(preparation)
      if (!prepValidation.isValid) {
        return {
          ok: false,
          status: prepValidation.status ?? 'rejected',
          preview: isDryRun,
          rejectionReason: prepValidation.error!,
          preparation: null,
          queueItem: null,
        }
      }

      const msgValidation = resolveTargetMessage(preparation)
      if (!msgValidation.isValid || !msgValidation.message) {
        return {
          ok: false,
          status: 'rejected',
          preview: isDryRun,
          rejectionReason: msgValidation.error ?? 'Błąd walidacji treści testu technicznego (fail-closed)',
          preparation: null,
          queueItem: null,
        }
      }
      const validatedMessage = msgValidation.message

      // Check exact retry vs conflict on preparation
      if (preparation.status === 'promoted' || preparation.approvalId) {
        if (preparation.approvalId === approvalId) {
          const queueItem = preparation.queueItemId
            ? await getSmsQueueItemByIdUnderLock(preparation.queueItemId)
            : await getSmsQueueItemByIdempotencyKeyUnderLock(`stage4_promo:${approvalId}`)

          if (queueItem && queueItem.message !== validatedMessage) {
            return {
              ok: false,
              status: 'idempotency_conflict',
              preview: isDryRun,
              rejectionReason: 'idempotency_conflict: niezgodna treść wiadomości dla ponowionego approvalId (fail-closed)',
              preparation: null,
              queueItem: null,
            }
          }

          return {
            ok: true,
            status: 'retry_matched',
            preview: isDryRun,
            isRetry: true,
            rejectionReason: null,
            preparation,
            queueItem,
          }
        }

        return {
          ok: false,
          status: 'rejected',
          preview: isDryRun,
          rejectionReason: 'Rekord przygotowania został już wykorzystany dla innego zatwierdzenia (fail-closed)',
          preparation: null,
          queueItem: null,
        }
      }

      // Check if approvalId was used for another preparation
      const otherPrep = snapshot.preparations.find(
        (p) => p.approvalId === approvalId && p.id !== preparation.id,
      )
      if (otherPrep) {
        return {
          ok: false,
          status: 'idempotency_conflict',
          preview: isDryRun,
          rejectionReason: 'idempotency_conflict: approvalId został już użyty dla innego rekordu przygotowania (fail-closed)',
          preparation: null,
          queueItem: null,
        }
      }

      // Check 24-hour rate limit on promotions
      const recentPromoted = snapshot.preparations.find((p) => {
        if (p.callerPhoneFingerprint !== computedFingerprint) return false
        if (p.status !== 'promoted' || !p.promotedAt) return false
        if (p.id === preparation.id) return false
        const promoTime = new Date(p.promotedAt).getTime()
        return nowMs - promoTime < CALLER_SMS_RATE_LIMIT_MS
      })

      if (recentPromoted) {
        return {
          ok: false,
          status: 'rejected',
          preview: isDryRun,
          rejectionReason: 'rate_limit_exceeded: limit 1 promowanego SMS na 24h na numer został już wykorzystany (fail-closed)',
          preparation: null,
          queueItem: null,
        }
      }

      // Dry-run preview
      if (isDryRun) {
        const previewQueueItem: SmsQueueItem = {
          id: `preview-${randomUUID()}`,
          bookingId: null,
          phone: normalized.e164,
          message: validatedMessage,
          type: 'custom',
          status: 'pending',
          scheduledFor: nowIso,
          createdAt: nowIso,
          sentAt: null,
          error: null,
          idempotencyKey: `stage4_promo:${approvalId}`,
        }
        const previewPreparation: CallerSmsPreparationRecord = {
          ...preparation,
          status: 'promoted',
          promotedAt: nowIso,
          queueItemId: previewQueueItem.id,
          approvalId,
        }
        return {
          ok: true,
          status: 'preview',
          preview: true,
          isRetry: false,
          rejectionReason: null,
          preparation: previewPreparation,
          queueItem: previewQueueItem,
        }
      }

      // Live execution in local store mode with atomic critical section spanning
      // queue item enqueue, preparation update, and snapshot write.
      // Any error triggers complete rollback before the lock is released.
      const previousQueueSnapshot = await readStoredSmsQueueUnderLock()
      const originalPreparation = { ...preparation }
      let createdQueueItem: SmsQueueItem | null = null

      try {
        const queueItem = await enqueueSmsUnderLock({
          phone: normalized.e164,
          message: validatedMessage,
          type: 'custom',
          idempotencyKey: `stage4_promo:${approvalId}`,
        })
        createdQueueItem = queueItem

        // Test-only boundary hook for pause / fault-injection verification.
        // Never exposed via HTTP.
        if (testBoundaryHook) {
          await testBoundaryHook({
            preparationId: preparation.id,
            approvalId,
            queueItemId: queueItem.id,
            preparation,
          })
        }

        preparation.status = 'promoted'
        preparation.promotedAt = nowIso
        preparation.queueItemId = queueItem.id
        preparation.approvalId = approvalId

        await writeCallerSmsStoreSnapshot(snapshot)

        return {
          ok: true,
          status: 'promoted',
          preview: false,
          isRetry: false,
          rejectionReason: null,
          preparation: { ...preparation },
          queueItem,
        }
      } catch (err) {
        if (createdQueueItem) {
          await writeStoredSmsQueueUnderLock(previousQueueSnapshot)
        }
        Object.assign(preparation, originalPreparation)
        throw err
      }
    })
  })
}
