import type { QuizSpecies, QuizTopic } from '@/lib/quiz-first-step'

export const CASE_MAP_SCHEMA_VERSION = '1'
export const CASE_MAP_CONSENT_VERSION = '2026-07-14'

export type CaseMapPath = 'fast' | 'long'
export type CaseMapStatus = 'draft' | 'completed' | 'archived'
export type CaseMapTriageState =
  | 'SAFETY_NOW'
  | 'HUMAN_MEDICAL'
  | 'VET_URGENT'
  | 'VET_FIRST'
  | 'SAFETY_PRIORITY'
  | 'PROCEED'
export type CaseMapAnswerValue = string | number | boolean | null
export type CaseMapAnswers = Record<string, CaseMapAnswerValue>
export type CaseMapSpecies = QuizSpecies
export type CaseMapTopic = QuizTopic

export type CaseMapTriageAnswers = {
  /**
   * Legacy, private Map records can contain a completed safety triage. The
   * public Mapa zachowania deliberately does not ask those questions, so its
   * saved record must say triage was not performed rather than manufacture
   * negative answers.
   */
  assessed?: boolean
  activeDanger: 'yes' | 'no' | 'unknown'
  injury: 'yes' | 'no' | 'unknown'
  emergencyHealth: 'yes' | 'no' | 'unknown'
  healthChange: 'yes' | 'no' | 'unknown'
  escapeSelfharm: 'yes' | 'no' | 'unknown'
  vulnerableContext: 'yes' | 'no' | 'unknown'
  vetStatus: 'seen' | 'not_seen' | 'unknown'
}

export type CaseMapCreateInput = {
  species: CaseMapSpecies
  topic: CaseMapTopic
  path: CaseMapPath
  source: 'direct' | 'problem_page' | 'instagram'
  problemKey: string | null
  triage: CaseMapTriageAnswers
  answers: CaseMapAnswers
  currentQuestionId: string | null
  consentVersion: string
  privacyConsent: boolean
  marketingConsent: boolean
}

export type CaseMapPatchInput = {
  revision: number
  answers?: CaseMapAnswers
  currentQuestionId?: string | null
  status?: CaseMapStatus
  path?: CaseMapPath
  triage?: CaseMapTriageAnswers
}

export type CaseMapRecord = {
  id: string
  ownerUserId: string
  schemaVersion: string
  status: CaseMapStatus
  species: CaseMapSpecies
  topic: CaseMapTopic
  path: CaseMapPath
  source: 'direct' | 'problem_page' | 'instagram'
  problemKey: string | null
  triageState: CaseMapTriageState
  answers: CaseMapAnswers
  result: Record<string, CaseMapAnswerValue>
  currentQuestionId: string | null
  bookingId: string | null
  sharedWithConsultantAt: string | null
  reviewedAt: string | null
  consentVersion: string
  consentedAt: string
  marketingConsent: boolean
  revision: number
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

export type CaseMapSummary = Omit<CaseMapRecord, 'answers' | 'result'>

export class CaseMapInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CaseMapInputError'
  }
}

const YES_NO_UNKNOWN = new Set(['yes', 'no', 'unknown'])
const CASE_MAP_PATHS = new Set<CaseMapPath>(['fast', 'long'])
const CASE_MAP_STATUSES = new Set<CaseMapStatus>(['draft', 'completed', 'archived'])
const CASE_MAP_SOURCES = new Set<CaseMapCreateInput['source']>(['direct', 'problem_page', 'instagram'])
const TOPICS_BY_SPECIES: Record<CaseMapSpecies, ReadonlySet<CaseMapTopic>> = {
  pies: new Set(['dog_walks', 'dog_alone', 'dog_resources', 'dog_noise', 'dog_change', 'other']),
  kot: new Set(['cat_litter', 'cat_touch', 'cat_conflict', 'cat_change', 'noise', 'other']),
}

const CASE_MAP_ANSWER_KEYS = new Set([
  'case_focus',
  'case_description',
  'case_path',
  'case_urgent',
  'active_danger',
  'injury',
  'emergency_health',
  'health_change',
  'escape_selfharm',
  'vulnerable_context',
  'vet_status',
  'triage_assessed',
  'fast_age_stage',
  'fast_onset',
  'fast_frequency',
  'fast_predictability',
  'fast_impact',
  'fast_recovery',
  'fast_current_management',
  'fast_goal',
  'walk_goal',
  'walk_pattern',
  'walk_distance',
  'walk_contact_history',
  'alone_evidence',
  'alone_first_signal',
  'alone_symptoms',
  'alone_recovery',
  'resource_item',
  'resource_approach',
  'resource_signals',
  'resource_injury',
  'noise_source',
  'noise_signals',
  'noise_recovery',
  'noise_escape',
  'change_type',
  'change_relationship',
  'change_symptoms',
  'change_stability',
  'litter_problem',
  'litter_urinary_symptoms',
  'litter_cat_count',
  'litter_change',
  'touch_context',
  'touch_area',
  'touch_signals',
  'touch_sudden_or_injury',
  'conflict_pattern',
  'conflict_locations',
  'conflict_access_loss',
  'conflict_injury',
  'other_observable_behavior',
  'other_context',
  'other_pattern',
  'other_main_concern',
  'intake_pet_name',
  'intake_pet_age',
  'intake_pet_history',
  'intake_household',
  'intake_health_history',
  'intake_medication',
  'intake_problem_start',
  'intake_triggers',
  'intake_daily_routine',
  'intake_environment',
  'intake_relationships',
  'intake_event_before',
  'intake_event_behavior',
  'intake_event_after',
  'intake_previous_steps',
  'intake_goal',
  'intake_media_permission',
  'intake_notes',
])

const MAX_ANSWER_KEYS = 90
const MAX_ANSWER_VALUE_LENGTH = 1600
const MAX_DESCRIPTION_LENGTH = 400
const MAX_CURRENT_QUESTION_ID_LENGTH = 96
const MAX_PROBLEM_KEY_LENGTH = 96
const MAX_CONSENT_VERSION_LENGTH = 40
const MAX_SERIALIZED_ANSWERS_BYTES = 24 * 1024

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function trimString(value: unknown, maxLength: number, field: string) {
  if (typeof value !== 'string') {
    throw new CaseMapInputError('Nieprawidłowe pole: ' + field + '.')
  }

  const normalized = value.trim()
  if (normalized.length > maxLength) {
    throw new CaseMapInputError('Pole ' + field + ' jest za długie.')
  }

  return normalized
}

function optionalTrimmedString(value: unknown, maxLength: number, field: string) {
  if (value === null || value === undefined || value === '') return null
  return trimString(value, maxLength, field)
}

function normalizeChoice(value: unknown, field: string): 'yes' | 'no' | 'unknown' {
  if (typeof value !== 'string' || !YES_NO_UNKNOWN.has(value)) {
    throw new CaseMapInputError('Nieprawidłowa odpowiedź triage: ' + field + '.')
  }

  return value as 'yes' | 'no' | 'unknown'
}

function normalizeAnswerValue(value: unknown, key: string): CaseMapAnswerValue {
  if (value === null || typeof value === 'boolean') return value

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new CaseMapInputError('Nieprawidłowa wartość pola ' + key + '.')
    }
    return value
  }

  if (typeof value === 'string') {
    const maxLength = key === 'case_description' ? MAX_DESCRIPTION_LENGTH : MAX_ANSWER_VALUE_LENGTH
    const normalized = value.trim()
    if (normalized.length > maxLength) {
      throw new CaseMapInputError('Pole ' + key + ' jest za długie.')
    }
    return normalized
  }

  throw new CaseMapInputError('Pole ' + key + ' musi zawierać prostą wartość.')
}

export function normalizeCaseMapAnswers(value: unknown): CaseMapAnswers {
  if (!isRecord(value)) {
    throw new CaseMapInputError('Odpowiedzi Mapy zachowania muszą być obiektem.')
  }

  const entries = Object.entries(value)
  if (entries.length > MAX_ANSWER_KEYS) {
    throw new CaseMapInputError('Mapa zachowania zawiera zbyt wiele odpowiedzi.')
  }

  const answers: CaseMapAnswers = {}
  for (const [key, rawValue] of entries) {
    if (!CASE_MAP_ANSWER_KEYS.has(key)) {
      throw new CaseMapInputError('Nieobsługiwane pole Mapy zachowania: ' + key + '.')
    }
    answers[key] = normalizeAnswerValue(rawValue, key)
  }

  if (Buffer.byteLength(JSON.stringify(answers), 'utf8') > MAX_SERIALIZED_ANSWERS_BYTES) {
    throw new CaseMapInputError('Mapa zachowania jest zbyt duża do bezpiecznego zapisu.')
  }

  return answers
}

export function normalizeCaseMapTriage(value: unknown): CaseMapTriageAnswers {
  if (!isRecord(value)) {
    throw new CaseMapInputError('Brakuje triage bezpieczeństwa i zdrowia.')
  }

  const vetStatus = value.vetStatus
  const assessed = value.assessed
  if (typeof vetStatus !== 'string' || !['seen', 'not_seen', 'unknown'].includes(vetStatus)) {
    throw new CaseMapInputError('Nieprawidłowy status konsultacji weterynaryjnej.')
  }
  if (assessed !== undefined && typeof assessed !== 'boolean') {
    throw new CaseMapInputError('Nieprawidłowy status triage Mapy zachowania.')
  }

  return {
    assessed: assessed !== false,
    activeDanger: normalizeChoice(value.activeDanger, 'activeDanger'),
    injury: normalizeChoice(value.injury, 'injury'),
    emergencyHealth: normalizeChoice(value.emergencyHealth, 'emergencyHealth'),
    healthChange: normalizeChoice(value.healthChange, 'healthChange'),
    escapeSelfharm: normalizeChoice(value.escapeSelfharm, 'escapeSelfharm'),
    vulnerableContext: normalizeChoice(value.vulnerableContext, 'vulnerableContext'),
    vetStatus: vetStatus as CaseMapTriageAnswers['vetStatus'],
  }
}

export function resolveCaseMapTriage(triage: CaseMapTriageAnswers): CaseMapTriageState {
  if (triage.assessed === false) return 'PROCEED'
  if (triage.activeDanger === 'yes') return 'SAFETY_NOW'
  if (triage.injury === 'yes') return 'HUMAN_MEDICAL'
  if (triage.emergencyHealth === 'yes') return 'VET_URGENT'
  if (triage.healthChange === 'yes') return 'VET_FIRST'
  if (triage.escapeSelfharm === 'yes' || triage.vulnerableContext === 'yes') return 'SAFETY_PRIORITY'

  const hasCriticalUnknown = [
    triage.activeDanger,
    triage.injury,
    triage.emergencyHealth,
    triage.healthChange,
    triage.escapeSelfharm,
    triage.vulnerableContext,
  ].includes('unknown')

  if (hasCriticalUnknown) return 'SAFETY_PRIORITY'
  return 'PROCEED'
}

/**
 * Some focused interview modules repeat safety signals that a person may only
 * recognise after naming the concrete situation. Keep those answers attached
 * to the same safety model, so they cannot lead to a normal booking result.
 */
export function resolveCaseMapTriageWithAnswers(
  triage: CaseMapTriageAnswers,
  answers: CaseMapAnswers,
): CaseMapTriageState {
  if (triage.assessed === false) return 'PROCEED'
  const baseState = resolveCaseMapTriage(triage)

  if (baseState === 'SAFETY_NOW' || baseState === 'HUMAN_MEDICAL' || baseState === 'VET_URGENT') {
    return baseState
  }

  if (answers.litter_urinary_symptoms === 'yes') return 'VET_URGENT'

  if (
    answers.touch_sudden_or_injury === 'yes' ||
    answers.resource_injury === 'yes' ||
    answers.conflict_injury === 'yes'
  ) {
    return 'VET_FIRST'
  }

  if (answers.noise_escape === 'yes' && baseState !== 'VET_FIRST') {
    return 'SAFETY_PRIORITY'
  }

  return baseState
}

export function isCaseMapTopicForSpecies(species: CaseMapSpecies, topic: unknown): topic is CaseMapTopic {
  return typeof topic === 'string' && TOPICS_BY_SPECIES[species].has(topic as CaseMapTopic)
}

export function normalizeCaseMapCreateInput(value: unknown): CaseMapCreateInput {
  if (!isRecord(value)) {
    throw new CaseMapInputError('Nieprawidłowy zapis Mapy zachowania.')
  }

  const species = value.species === 'kot' ? 'kot' : value.species === 'pies' ? 'pies' : null
  if (!species) {
    throw new CaseMapInputError('Wybierz psa albo kota.')
  }

  if (!isCaseMapTopicForSpecies(species, value.topic)) {
    throw new CaseMapInputError('Temat nie pasuje do wybranego zwierzęcia.')
  }

  if (typeof value.path !== 'string' || !CASE_MAP_PATHS.has(value.path as CaseMapPath)) {
    throw new CaseMapInputError('Wybierz zakres Mapy zachowania.')
  }

  if (typeof value.source !== 'string' || !CASE_MAP_SOURCES.has(value.source as CaseMapCreateInput['source'])) {
    throw new CaseMapInputError('Nieprawidłowe źródło wejścia.')
  }

  if (typeof value.marketingConsent !== 'boolean') {
    throw new CaseMapInputError('Nieprawidłowy wybór zgody marketingowej.')
  }

  if (value.privacyConsent !== true) {
    throw new CaseMapInputError('Potwierdź zgodę na prywatny zapis Mapy zachowania.')
  }

  const consentVersion = trimString(value.consentVersion, MAX_CONSENT_VERSION_LENGTH, 'consentVersion')
  if (!consentVersion) {
    throw new CaseMapInputError('Wymagana jest zgoda na obsługę sprawy.')
  }

  return {
    species,
    topic: value.topic,
    path: value.path as CaseMapPath,
    source: value.source as CaseMapCreateInput['source'],
    problemKey: optionalTrimmedString(value.problemKey, MAX_PROBLEM_KEY_LENGTH, 'problemKey'),
    triage: normalizeCaseMapTriage(value.triage),
    answers: normalizeCaseMapAnswers(value.answers ?? {}),
    currentQuestionId: optionalTrimmedString(value.currentQuestionId, MAX_CURRENT_QUESTION_ID_LENGTH, 'currentQuestionId'),
    consentVersion,
    privacyConsent: true,
    marketingConsent: value.marketingConsent,
  }
}

export function normalizeCaseMapPatchInput(value: unknown): CaseMapPatchInput {
  if (!isRecord(value)) {
    throw new CaseMapInputError('Nieprawidłowa aktualizacja Mapy zachowania.')
  }

  const revision = value.revision
  if (!Number.isInteger(revision) || (revision as number) < 1) {
    throw new CaseMapInputError('Brakuje poprawnej rewizji zapisu.')
  }

  const patch: CaseMapPatchInput = { revision: revision as number }

  if (Object.prototype.hasOwnProperty.call(value, 'answers')) {
    patch.answers = normalizeCaseMapAnswers(value.answers)
  }

  if (Object.prototype.hasOwnProperty.call(value, 'currentQuestionId')) {
    patch.currentQuestionId = optionalTrimmedString(value.currentQuestionId, MAX_CURRENT_QUESTION_ID_LENGTH, 'currentQuestionId')
  }

  if (Object.prototype.hasOwnProperty.call(value, 'status')) {
    if (typeof value.status !== 'string' || !CASE_MAP_STATUSES.has(value.status as CaseMapStatus)) {
      throw new CaseMapInputError('Nieprawidłowy status Mapy zachowania.')
    }
    patch.status = value.status as CaseMapStatus
  }

  if (Object.prototype.hasOwnProperty.call(value, 'path')) {
    if (typeof value.path !== 'string' || !CASE_MAP_PATHS.has(value.path as CaseMapPath)) {
      throw new CaseMapInputError('Nieprawidłowa ścieżka Mapy zachowania.')
    }
    patch.path = value.path as CaseMapPath
  }

  if (Object.prototype.hasOwnProperty.call(value, 'triage')) {
    patch.triage = normalizeCaseMapTriage(value.triage)
  }

  if (Object.keys(patch).length === 1) {
    throw new CaseMapInputError('Brakuje zmian do zapisania.')
  }

  return patch
}
