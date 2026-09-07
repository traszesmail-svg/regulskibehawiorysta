import type { BookingServiceType } from '@/lib/booking-services'

export const FOLLOW_UP_QUESTION_COUNT = 2
export const FOLLOW_UP_QUESTION_WINDOW_DAYS = 7
export const FOLLOW_UP_QUESTION_WINDOW_MS = FOLLOW_UP_QUESTION_WINDOW_DAYS * 24 * 60 * 60 * 1000

export function getInitialQuestionsRemaining(serviceType: string | null | undefined): number | null {
  if (serviceType === 'szybka-konsultacja-15-min' || serviceType === 'kwadrans-na-juz' || serviceType === 'konsultacja-30-min') {
    return FOLLOW_UP_QUESTION_COUNT
  }

  if (serviceType === 'konsultacja-behawioralna-online') {
    return 0
  }

  return null
}

export function getQuestionsExpiresAt(publishedAt: string | Date): string | null {
  const timestamp = publishedAt instanceof Date ? publishedAt.getTime() : Date.parse(publishedAt)

  if (!Number.isFinite(timestamp)) {
    return null
  }

  return new Date(timestamp + FOLLOW_UP_QUESTION_WINDOW_MS).toISOString()
}

export function isQuestionsAccessExpired(expiresAt: string | null | undefined, now = Date.now()): boolean {
  if (!expiresAt) {
    return false
  }

  const timestamp = Date.parse(expiresAt)
  return Number.isFinite(timestamp) && now >= timestamp
}

/**
 * Older rows do not have an expiry timestamp. For a completed short booking,
 * updated_at is the closest safe migration fallback because completion writes
 * it when the summary/recommendation is published.
 */
export function resolveQuestionsExpiresAt(input: {
  serviceType: BookingServiceType | string | null | undefined
  bookingStatus?: string | null
  questionsExpiresAt?: string | null
  updatedAt?: string | null
}): string | null {
  if (input.questionsExpiresAt) {
    return input.questionsExpiresAt
  }

  if (input.bookingStatus === 'done' && getInitialQuestionsRemaining(input.serviceType) === FOLLOW_UP_QUESTION_COUNT) {
    return getQuestionsExpiresAt(input.updatedAt ?? '')
  }

  return null
}
