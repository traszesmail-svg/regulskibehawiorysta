import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { getLocalStoreDataDir } from '@/lib/server/local-store-path'
import { getSupabaseServerConfig, resolveDataMode } from '@/lib/server/env'
import { createClient } from '@supabase/supabase-js'
import { canonicalizePayload, computePayloadHash } from '@/lib/server/call-session-security'
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
