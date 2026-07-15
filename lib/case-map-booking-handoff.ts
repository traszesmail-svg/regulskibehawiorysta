import type { BookingServiceType } from '@/lib/booking-services'
import { isBookingSpecies, type BookingSpecies } from '@/lib/booking-routing'
import { isProblemType } from '@/lib/data'
import type { CaseMapAnswers, CaseMapPath, CaseMapSpecies, CaseMapTopic, CaseMapTriageState } from '@/lib/case-map'
import { getCaseMapFastQuestions } from '@/lib/case-map-questions'
import type { ProblemType } from '@/lib/types'

export const CASE_MAP_BOOKING_HANDOFF_KEY = 'regulski.case-map-booking-handoff.v1'
export const CASE_MAP_BOOKING_HANDOFF_TTL_MS = 30 * 60 * 1000

/**
 * Public Mapy can select only the three services that can receive their brief:
 * a regular 15-minute conversation, priority Kwadrans na już, or a longer
 * consultation for a fuller context.
 */
export type CaseMapBookingServiceType =
  | 'szybka-konsultacja-15-min'
  | 'kwadrans-na-juz'
  | 'konsultacja-30-min'

const DEFAULT_CASE_MAP_BOOKING_SERVICE: CaseMapBookingServiceType = 'szybka-konsultacja-15-min'

export type CaseMapBookingHandoff = {
  version: 1
  createdAt: number
  species: BookingSpecies
  problemType: ProblemType
  serviceType: BookingServiceType
  brief: string
  caseMapId: string | null
  shareWithConsultant: boolean
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const dogProblemByTopic: Partial<Record<CaseMapTopic, ProblemType>> = {
  dog_walks: 'spacer',
  dog_alone: 'separacja',
  dog_resources: 'agresja',
  dog_noise: 'pobudzenie',
  dog_change: 'pobudzenie',
  noise: 'pobudzenie',
  other: 'pobudzenie',
}

const catProblemByTopic: Partial<Record<CaseMapTopic, ProblemType>> = {
  cat_litter: 'kot-kuweta',
  cat_touch: 'kot-dotyk',
  cat_conflict: 'kot-konflikt',
  cat_change: 'kot-zmiany-w-domu',
  noise: 'kot-wycofanie',
  other: 'kot-wycofanie',
}

const topicLabels: Record<CaseMapTopic, string> = {
  dog_walks: 'spacer i reakcje na bodźce',
  dog_alone: 'zostawanie samemu',
  dog_resources: 'zasoby',
  dog_noise: 'hałas i panika',
  dog_change: 'zmiana w domu lub rytmie',
  cat_litter: 'kuweta',
  cat_touch: 'dotyk, głaskanie lub gryzienie',
  cat_conflict: 'napięcie między kotami',
  cat_change: 'zmiana w domu lub rytmie',
  noise: 'hałas i nagłe bodźce',
  other: 'inna sytuacja',
}

const focusLabels: Record<string, string> = {
  one_animal: 'jedno zwierzę',
  one_pet: 'jedno zwierzę',
  relationship: 'relacja między zwierzętami lub osobami',
  unsure: 'trudno określić',
  unknown: 'trudno określić',
}

const shortAnswerLabels: Record<string, Record<string, string>> = {
  fast_onset: {
    sudden: 'pojawiło się nagle',
    recent: 'narasta od dni lub tygodni',
    longer: 'trwa od dawna',
    unknown: 'trudno określić',
  },
  fast_frequency: {
    single: 'pojedynczo lub rzadko',
    weekly: 'kilka razy w tygodniu',
    daily: 'codziennie lub prawie codziennie',
    unknown: 'trudno określić',
  },
  fast_goal: {
    safety: 'szybkiego uporządkowania sytuacji',
    understanding: 'zrozumienia, co obserwować',
    specific: 'planu dla jednej sytuacji',
    change: 'przygotowania zmiany w domu lub rytmie',
    full_plan: 'pełniejszego planu',
    unknown: 'trudno określić',
  },
}

const shortTopicQuestionByTopic: Record<CaseMapTopic, string> = {
  dog_walks: 'walk_pattern',
  dog_alone: 'alone_first_signal',
  dog_resources: 'resource_signals',
  dog_noise: 'noise_recovery',
  dog_change: 'change_symptoms',
  cat_litter: 'litter_problem',
  cat_touch: 'touch_context',
  cat_conflict: 'conflict_pattern',
  cat_change: 'change_symptoms',
  noise: 'noise_recovery',
  other: 'other_observable_behavior',
}

const longBriefFields = [
  ['intake_pet_age', 'Etap życia'],
  ['intake_problem_start', 'Początek'],
  ['intake_triggers', 'Co poprzedza sytuację'],
  ['intake_daily_routine', 'Rytm dnia'],
  ['intake_event_behavior', 'Przebieg zdarzenia'],
  ['intake_goal', 'Cel rozmowy'],
] as const

function getShortAnswerLabel(answers: CaseMapAnswers, key: string) {
  const value = answers[key]
  if (typeof value === 'number') return key === 'fast_impact' ? `${value}/4` : String(value)
  if (typeof value !== 'string' || value.length === 0) return null
  return shortAnswerLabels[key]?.[value] ?? value.replace(/_/g, ' ')
}

function getBriefText(answers: CaseMapAnswers, key: string, maxLength = 118) {
  const value = answers[key]
  if (typeof value !== 'string') return null
  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized ? normalized.slice(0, maxLength) : null
}

function getTopicDetailLabel(answers: CaseMapAnswers, topic: CaseMapTopic) {
  const questionId = shortTopicQuestionByTopic[topic]
  const value = answers[questionId]
  if (typeof value !== 'string' || value.length === 0) return null

  const question = getCaseMapFastQuestions(topic).find((candidate) => candidate.id === questionId)
  return question?.options?.find((option) => option.id === value)?.label ?? value.replace(/_/g, ' ')
}

function getBrowserSessionStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null

  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export function getCaseMapBookingProblemType(species: CaseMapSpecies | null, topic: CaseMapTopic | null): ProblemType | null {
  if (!species || !topic) return null
  const candidate = species === 'kot' ? catProblemByTopic[topic] : dogProblemByTopic[topic]
  return candidate && isProblemType(candidate) ? candidate : null
}

export function createCaseMapBookingHandoff({
  species,
  topic,
  path,
  answers,
  triageState,
  serviceType = DEFAULT_CASE_MAP_BOOKING_SERVICE,
  caseMapId = null,
  shareWithConsultant = false,
  now = Date.now(),
}: {
  species: CaseMapSpecies | null
  topic: CaseMapTopic | null
  path: CaseMapPath | null
  answers: CaseMapAnswers
  triageState: CaseMapTriageState | null
  serviceType?: CaseMapBookingServiceType
  caseMapId?: string | null
  shareWithConsultant?: boolean
  now?: number
}): CaseMapBookingHandoff | null {
  const problemType = getCaseMapBookingProblemType(species, topic)
  if (
    !species ||
    !isBookingSpecies(species) ||
    !topic ||
    !problemType ||
    !path ||
    triageState !== 'PROCEED' ||
    !isCaseMapBookingServiceType(serviceType)
  ) return null

  const focus = typeof answers.case_focus === 'string' ? focusLabels[answers.case_focus] : null
  const description = typeof answers.case_description === 'string' ? answers.case_description.trim().slice(0, 320) : ''
  const topicDetail = getTopicDetailLabel(answers, topic)
  const longContext = path === 'long'
    ? longBriefFields.flatMap(([key, label]) => {
      const value = getBriefText(answers, key)
      return value ? [`${label}: ${value}.`] : []
    })
    : []
  const briefParts = [
    `Mapa zachowania: ${topicLabels[topic]}.`,
    `Zakres: ${path === 'long' ? 'pełniejsza mapa' : 'szybka mapa'}.`,
    focus ? `Dotyczy: ${focus}.` : '',
    getShortAnswerLabel(answers, 'fast_onset') ? `Początek: ${getShortAnswerLabel(answers, 'fast_onset')}.` : '',
    getShortAnswerLabel(answers, 'fast_frequency') ? `Częstotliwość: ${getShortAnswerLabel(answers, 'fast_frequency')}.` : '',
    getShortAnswerLabel(answers, 'fast_impact') ? `Wpływ: ${getShortAnswerLabel(answers, 'fast_impact')}.` : '',
    topicDetail ? `Wzorzec: ${topicDetail}.` : '',
    getShortAnswerLabel(answers, 'fast_goal') ? `Cel: ${getShortAnswerLabel(answers, 'fast_goal')}.` : '',
    ...longContext,
    description ? `Opis opiekuna: ${description}` : '',
  ].filter(Boolean).join(' ').slice(0, 700)

  return {
    version: 1,
    createdAt: now,
    species,
    problemType,
    serviceType,
    brief: briefParts,
    caseMapId: shareWithConsultant && isUuid(caseMapId) ? caseMapId : null,
    shareWithConsultant: shareWithConsultant && isUuid(caseMapId),
  }
}

function isCaseMapBookingServiceType(value: unknown): value is CaseMapBookingServiceType {
  return value === DEFAULT_CASE_MAP_BOOKING_SERVICE || value === 'kwadrans-na-juz' || value === 'konsultacja-30-min'
}

function isCaseMapBookingHandoff(value: unknown, now: number): value is CaseMapBookingHandoff {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<CaseMapBookingHandoff>
  const validCaseMap = candidate.caseMapId === null || isUuid(candidate.caseMapId)

  return (
    candidate.version === 1 &&
    typeof candidate.createdAt === 'number' &&
    candidate.createdAt <= now &&
    now - candidate.createdAt <= CASE_MAP_BOOKING_HANDOFF_TTL_MS &&
    typeof candidate.brief === 'string' &&
    candidate.brief.length > 0 &&
    candidate.brief.length <= 700 &&
    typeof candidate.shareWithConsultant === 'boolean' &&
    validCaseMap &&
    isBookingSpecies(candidate.species) &&
    isProblemType(candidate.problemType) &&
    isCaseMapBookingServiceType(candidate.serviceType)
  )
}

export function writeCaseMapBookingHandoff(handoff: CaseMapBookingHandoff, storage = getBrowserSessionStorage()) {
  if (!storage) return false

  try {
    storage.setItem(CASE_MAP_BOOKING_HANDOFF_KEY, JSON.stringify(handoff))
    return true
  } catch {
    return false
  }
}

export function readCaseMapBookingHandoff({
  problemType,
  serviceType,
  species,
  storage = getBrowserSessionStorage(),
  now = Date.now(),
}: {
  problemType?: ProblemType
  serviceType?: BookingServiceType
  species?: BookingSpecies
  storage?: StorageLike | null
  now?: number
} = {}): CaseMapBookingHandoff | null {
  if (!storage) return null

  try {
    const raw = storage.getItem(CASE_MAP_BOOKING_HANDOFF_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isCaseMapBookingHandoff(parsed, now)) {
      storage.removeItem(CASE_MAP_BOOKING_HANDOFF_KEY)
      return null
    }
    if ((problemType && parsed.problemType !== problemType) || (serviceType && parsed.serviceType !== serviceType) || (species && parsed.species !== species)) {
      return null
    }
    return parsed
  } catch {
    try {
      storage.removeItem(CASE_MAP_BOOKING_HANDOFF_KEY)
    } catch {
      // Disabled browser storage must not block booking.
    }
    return null
  }
}

export function clearCaseMapBookingHandoff(storage = getBrowserSessionStorage()) {
  if (!storage) return
  try {
    storage.removeItem(CASE_MAP_BOOKING_HANDOFF_KEY)
  } catch {
    // Disabled browser storage must not block booking.
  }
}
