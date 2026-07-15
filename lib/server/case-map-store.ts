import { createClient, type User } from '@supabase/supabase-js'
import {
  CASE_MAP_SCHEMA_VERSION,
  CaseMapInputError,
  type CaseMapAnswers,
  type CaseMapCreateInput,
  type CaseMapPatchInput,
  type CaseMapRecord,
  type CaseMapSummary,
  type CaseMapTriageAnswers,
  normalizeCaseMapAnswers,
  normalizeCaseMapTriage,
  resolveCaseMapTriageWithAnswers,
} from '@/lib/case-map'
import { buildCaseMapReport } from '@/lib/case-map-report'
import { getSupabaseServerConfig } from '@/lib/server/env'

type CaseMapRow = {
  id: string
  owner_user_id: string
  schema_version: string
  status: CaseMapRecord['status']
  species: CaseMapRecord['species']
  topic: CaseMapRecord['topic']
  path: CaseMapRecord['path']
  source: CaseMapRecord['source']
  problem_key: string | null
  triage_state: CaseMapRecord['triageState']
  answers: unknown
  result: unknown
  current_question_id: string | null
  booking_id: string | null
  shared_with_consultant_at: string | null
  reviewed_at: string | null
  consent_version: string
  consented_at: string
  marketing_consent: boolean
  revision: number
  created_at: string
  updated_at: string
  completed_at: string | null
}

export class CaseMapConflictError extends Error {
  constructor() {
    super('Ta Mapa zachowania została zmieniona w innym oknie. Odśwież ją przed kolejnym zapisem.')
    this.name = 'CaseMapConflictError'
  }
}

export class CaseMapArchivedError extends Error {
  constructor() {
    super('Zarchiwizowanej Mapy zachowania nie można już zmienić.')
    this.name = 'CaseMapArchivedError'
  }
}

function getSupabaseAdmin() {
  const config = getSupabaseServerConfig('Mapa zachowania')

  return createClient(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function assertCaseMapId(value: string) {
  if (!isUuid(value)) {
    throw new CaseMapInputError('Nieprawidłowy identyfikator Mapy zachowania.')
  }
}

function triageAnswersToStoredAnswers(triage: CaseMapTriageAnswers): CaseMapAnswers {
  return {
    triage_assessed: triage.assessed !== false,
    active_danger: triage.activeDanger,
    injury: triage.injury,
    emergency_health: triage.emergencyHealth,
    health_change: triage.healthChange,
    escape_selfharm: triage.escapeSelfharm,
    vulnerable_context: triage.vulnerableContext,
    vet_status: triage.vetStatus,
  }
}

function triageFromStoredAnswers(answers: CaseMapAnswers): CaseMapTriageAnswers {
  return normalizeCaseMapTriage({
    assessed: answers.triage_assessed !== false,
    activeDanger: answers.active_danger ?? 'unknown',
    injury: answers.injury ?? 'unknown',
    emergencyHealth: answers.emergency_health ?? 'unknown',
    healthChange: answers.health_change ?? 'unknown',
    escapeSelfharm: answers.escape_selfharm ?? 'unknown',
    vulnerableContext: answers.vulnerable_context ?? 'unknown',
    vetStatus: answers.vet_status ?? 'unknown',
  })
}

function normalizeResult(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  const result: Record<string, string | number | boolean | null> = {}
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (!/^[a-z0-9_]{1,80}$/i.test(key)) continue
    if (entry === null || typeof entry === 'boolean') {
      result[key] = entry
      continue
    }
    if (typeof entry === 'number' && Number.isFinite(entry)) {
      result[key] = entry
      continue
    }
    if (typeof entry === 'string' && entry.length <= 1600) {
      result[key] = entry
    }
  }

  return result
}

function rowToRecord(row: CaseMapRow): CaseMapRecord {
  const answers = normalizeCaseMapAnswers(row.answers)
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    schemaVersion: row.schema_version,
    status: row.status,
    species: row.species,
    topic: row.topic,
    path: row.path,
    source: row.source,
    problemKey: row.problem_key,
    triageState: row.triage_state,
    answers,
    result: normalizeResult(row.result),
    currentQuestionId: row.current_question_id,
    bookingId: row.booking_id,
    sharedWithConsultantAt: row.shared_with_consultant_at,
    reviewedAt: row.reviewed_at,
    consentVersion: row.consent_version,
    consentedAt: row.consented_at,
    marketingConsent: Boolean(row.marketing_consent),
    revision: row.revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  }
}

function toSummary(record: CaseMapRecord): CaseMapSummary {
  const { answers: _answers, result: _result, ...summary } = record
  return summary
}

export async function createCaseMap(user: User, input: CaseMapCreateInput): Promise<CaseMapRecord> {
  const now = new Date().toISOString()
  const answers = normalizeCaseMapAnswers({
    ...input.answers,
    ...triageAnswersToStoredAnswers(input.triage),
    case_path: input.path,
  })
  const triageState = resolveCaseMapTriageWithAnswers(input.triage, answers)
  const report = buildCaseMapReport({ species: input.species, topic: input.topic, path: input.path, triageState, answers })
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('case_maps')
    .insert({
      owner_user_id: user.id,
      schema_version: CASE_MAP_SCHEMA_VERSION,
      status: 'draft',
      species: input.species,
      topic: input.topic,
      path: input.path,
      source: input.source,
      problem_key: input.problemKey,
      triage_state: triageState,
      answers,
      result: report,
      current_question_id: input.currentQuestionId,
      consent_version: input.consentVersion,
      consented_at: now,
      marketing_consent: input.marketingConsent,
      revision: 1,
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Nie udało się utworzyć Mapy zachowania.')
  }

  return rowToRecord(data as CaseMapRow)
}

export async function listCaseMapsForUser(user: User): Promise<CaseMapSummary[]> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('case_maps')
    .select('*')
    .eq('owner_user_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => toSummary(rowToRecord(row as CaseMapRow)))
}

export async function getCaseMapForUser(user: User, id: string): Promise<CaseMapRecord | null> {
  assertCaseMapId(id)

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('case_maps')
    .select('*')
    .eq('id', id)
    .eq('owner_user_id', user.id)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data ? rowToRecord(data as CaseMapRow) : null
}

export async function patchCaseMapForUser(
  user: User,
  id: string,
  patch: CaseMapPatchInput,
): Promise<CaseMapRecord | null> {
  const current = await getCaseMapForUser(user, id)
  if (!current) return null

  if (current.status === 'archived') {
    throw new CaseMapArchivedError()
  }

  if (current.revision !== patch.revision) {
    throw new CaseMapConflictError()
  }

  const nextTriage = patch.triage ?? triageFromStoredAnswers(current.answers)
  const nextAnswers = normalizeCaseMapAnswers({
    ...current.answers,
    ...(patch.answers ?? {}),
    ...triageAnswersToStoredAnswers(nextTriage),
    ...(patch.path ? { case_path: patch.path } : {}),
  })
  const nextPath = patch.path ?? current.path
  const nextTriageState = resolveCaseMapTriageWithAnswers(nextTriage, nextAnswers)
  const nextResult = buildCaseMapReport({ species: current.species, topic: current.topic, path: nextPath, triageState: nextTriageState, answers: nextAnswers })
  const nextStatus = patch.status ?? current.status
  const now = new Date().toISOString()
  const completedAt = nextStatus === 'completed'
    ? current.completedAt ?? now
    : current.completedAt

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('case_maps')
    .update({
      answers: nextAnswers,
      path: nextPath,
      status: nextStatus,
      triage_state: nextTriageState,
      current_question_id: Object.prototype.hasOwnProperty.call(patch, 'currentQuestionId')
        ? patch.currentQuestionId
        : current.currentQuestionId,
      result: nextResult,
      revision: current.revision + 1,
      updated_at: now,
      completed_at: completedAt,
    })
    .eq('id', current.id)
    .eq('owner_user_id', user.id)
    .eq('revision', current.revision)
    .select('*')
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new CaseMapConflictError()
  }

  return rowToRecord(data as CaseMapRow)
}

export type ConsultantCaseMap = CaseMapRecord & {
  booking: {
    id: string
    ownerName: string
    email: string
    bookingDate: string
    bookingTime: string
    problemType: string
    serviceType: string | null
  } | null
}

type BookingContactRow = {
  id: string
  owner_name: string
  email: string
  booking_date: string
  booking_time: string
  problem_type: string
  service_type: string | null
}

export async function linkCaseMapToBookingForUser(user: User, caseMapId: string, bookingId: string): Promise<CaseMapRecord | null> {
  assertCaseMapId(caseMapId)
  assertCaseMapId(bookingId)
  const now = new Date().toISOString()
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('case_maps')
    .update({
      booking_id: bookingId,
      shared_with_consultant_at: now,
      reviewed_at: null,
      updated_at: now,
    })
    .eq('id', caseMapId)
    .eq('owner_user_id', user.id)
    .select('*')
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data ? rowToRecord(data as CaseMapRow) : null
}

export async function listCaseMapsForConsultant(): Promise<ConsultantCaseMap[]> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('case_maps')
    .select('*')
    .not('shared_with_consultant_at', 'is', null)
    .order('shared_with_consultant_at', { ascending: false })
    .limit(100)

  if (error) throw new Error(error.message)
  const caseMaps = (data ?? []).map((row) => rowToRecord(row as CaseMapRow))
  const bookingIds = caseMaps.map((caseMap) => caseMap.bookingId).filter((id): id is string => Boolean(id))
  const bookingsById = new Map<string, BookingContactRow>()

  if (bookingIds.length > 0) {
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, owner_name, email, booking_date, booking_time, problem_type, service_type')
      .in('id', bookingIds)

    if (bookingsError) throw new Error(bookingsError.message)
    for (const booking of bookings ?? []) {
      const row = booking as BookingContactRow
      bookingsById.set(row.id, row)
    }
  }

  return caseMaps.map((caseMap) => {
    const booking = caseMap.bookingId ? bookingsById.get(caseMap.bookingId) : null
    return {
      ...caseMap,
      booking: booking
        ? {
            id: booking.id,
            ownerName: booking.owner_name,
            email: booking.email,
            bookingDate: booking.booking_date,
            bookingTime: booking.booking_time,
            problemType: booking.problem_type,
            serviceType: booking.service_type,
          }
        : null,
    }
  })
}

export async function markCaseMapReviewed(caseMapId: string): Promise<CaseMapRecord | null> {
  assertCaseMapId(caseMapId)
  const now = new Date().toISOString()
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('case_maps')
    .update({ reviewed_at: now, updated_at: now })
    .eq('id', caseMapId)
    .not('shared_with_consultant_at', 'is', null)
    .select('*')
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data ? rowToRecord(data as CaseMapRow) : null
}
