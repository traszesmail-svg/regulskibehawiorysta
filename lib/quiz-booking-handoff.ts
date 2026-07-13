import { isBookingServiceType, type BookingServiceType } from '@/lib/booking-services'
import { isBookingSpecies, type BookingSpecies } from '@/lib/booking-routing'
import { isProblemType } from '@/lib/data'
import {
  getQuizTopicLabel,
  type QuizAnswers,
  type QuizProblemContext,
  type QuizResult,
  type QuizSpecies,
  type QuizTopic,
} from '@/lib/quiz-first-step'
import type { ProblemType } from '@/lib/types'

export const QUIZ_BOOKING_HANDOFF_KEY = 'regulski.quiz-booking-handoff.v1'
export const QUIZ_BOOKING_HANDOFF_TTL_MS = 30 * 60 * 1000

export type QuizBookingHandoff = {
  version: 1
  createdAt: number
  species: BookingSpecies
  problemType: ProblemType
  serviceType: BookingServiceType
  brief: string
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const quizServiceToBookingService = {
  kwadrans: 'szybka-konsultacja-15-min',
  'dwa-kwadranse': 'konsultacja-30-min',
  'pelna-konsultacja': 'konsultacja-behawioralna-online',
} as const satisfies Record<NonNullable<QuizResult['serviceKey']>, BookingServiceType>

const dogProblemByTopic: Partial<Record<QuizTopic, ProblemType>> = {
  dog_walks: 'spacer',
  dog_alone: 'separacja',
  dog_resources: 'agresja',
  dog_noise: 'pobudzenie',
  dog_change: 'pobudzenie',
  noise: 'pobudzenie',
  other: 'pobudzenie',
}

const catProblemByTopic: Partial<Record<QuizTopic, ProblemType>> = {
  cat_litter: 'kot-kuweta',
  cat_touch: 'kot-dotyk',
  cat_conflict: 'kot-konflikt',
  cat_change: 'kot-zmiany-w-domu',
  noise: 'kot-wycofanie',
  other: 'kot-wycofanie',
}

function getBrowserSessionStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null

  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

export function getQuizBookingProblemType(species: QuizSpecies | null, topic: QuizTopic | null): ProblemType | null {
  if (!species || !topic) return null
  const candidate = species === 'kot' ? catProblemByTopic[topic] : dogProblemByTopic[topic]
  return candidate && isProblemType(candidate) ? candidate : null
}

export function createQuizBookingHandoff({
  answers,
  context,
  result,
  now = Date.now(),
}: {
  answers: QuizAnswers
  context: QuizProblemContext | null
  result: QuizResult
  now?: number
}): QuizBookingHandoff | null {
  if (!result.serviceKey) return null

  const species = (answers.species ?? context?.species) as QuizSpecies | undefined
  const topic = (answers.topic ?? context?.topic) as QuizTopic | undefined
  const problemType = getQuizBookingProblemType(species ?? null, topic ?? null)
  const serviceType = quizServiceToBookingService[result.serviceKey]

  if (!species || !isBookingSpecies(species) || !topic || !problemType || !serviceType) return null

  return {
    version: 1,
    createdAt: now,
    species,
    problemType,
    serviceType,
    brief: `Mapa pierwszego kroku: ${getQuizTopicLabel(topic)}. Wskazówka na teraz: ${result.firstStep}`,
  }
}

function isQuizBookingHandoff(value: unknown, now: number): value is QuizBookingHandoff {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<QuizBookingHandoff>

  return (
    candidate.version === 1 &&
    typeof candidate.createdAt === 'number' &&
    candidate.createdAt <= now &&
    now - candidate.createdAt <= QUIZ_BOOKING_HANDOFF_TTL_MS &&
    typeof candidate.brief === 'string' &&
    candidate.brief.length > 0 &&
    candidate.brief.length <= 700 &&
    isBookingSpecies(candidate.species) &&
    isProblemType(candidate.problemType) &&
    isBookingServiceType(candidate.serviceType)
  )
}

export function writeQuizBookingHandoff(handoff: QuizBookingHandoff, storage = getBrowserSessionStorage()) {
  if (!storage) return false

  try {
    storage.setItem(QUIZ_BOOKING_HANDOFF_KEY, JSON.stringify(handoff))
    return true
  } catch {
    return false
  }
}

export function readQuizBookingHandoff({
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
} = {}): QuizBookingHandoff | null {
  if (!storage) return null

  try {
    const raw = storage.getItem(QUIZ_BOOKING_HANDOFF_KEY)
    if (!raw) return null

    const parsed: unknown = JSON.parse(raw)
    if (!isQuizBookingHandoff(parsed, now)) {
      storage.removeItem(QUIZ_BOOKING_HANDOFF_KEY)
      return null
    }

    if (
      (problemType && parsed.problemType !== problemType) ||
      (serviceType && parsed.serviceType !== serviceType) ||
      (species && parsed.species !== species)
    ) {
      return null
    }

    return parsed
  } catch {
    try {
      storage.removeItem(QUIZ_BOOKING_HANDOFF_KEY)
    } catch {
      // A disabled browser storage should not block a booking.
    }
    return null
  }
}

export function clearQuizBookingHandoff(storage = getBrowserSessionStorage()) {
  if (!storage) return

  try {
    storage.removeItem(QUIZ_BOOKING_HANDOFF_KEY)
  } catch {
    // A disabled browser storage should not block a booking.
  }
}
