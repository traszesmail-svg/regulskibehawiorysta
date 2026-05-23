import { DEFAULT_BOOKING_SERVICE, getBookingServicePrice, getBookingServiceRoomDurationMinutes, getBookingServiceTitle, type BookingServiceType } from '@/lib/booking-services'
import type { AnimalType, ProblemType } from '@/lib/types'
import { FUNNEL_CTA_LABELS } from '@/lib/funnel'
import type { FunnelEventProperties } from '@/lib/types'

export function getServiceAnalyticsParams(
  serviceType: BookingServiceType = DEFAULT_BOOKING_SERVICE,
  quickConsultationPrice?: number,
): FunnelEventProperties {
  const fallbackQuickPrice = quickConsultationPrice ?? 69

  return {
    service_key: serviceType,
    service_name: getBookingServiceTitle(serviceType),
    service_duration: getBookingServiceRoomDurationMinutes(serviceType),
    service_price: getBookingServicePrice(serviceType, fallbackQuickPrice),
  }
}

export function normalizeAnimalTypeToSpecies(animalType: AnimalType | string | null | undefined) {
  if (!animalType) {
    return null
  }

  const normalized = animalType.trim().toLowerCase()

  if (normalized === 'pies') {
    return 'pies'
  }

  if (normalized === 'kot') {
    return 'kot'
  }

  return null
}

export function getBookingAnalyticsContextParams({
  serviceType = DEFAULT_BOOKING_SERVICE,
  quickConsultationPrice,
  animalType,
  problemType,
  bookingStatus,
  paymentMode,
}: {
  serviceType?: BookingServiceType
  quickConsultationPrice?: number
  animalType?: AnimalType | string | null
  problemType?: ProblemType | string | null
  bookingStatus?: string | null
  paymentMode?: string | null
}): FunnelEventProperties {
  return {
    ...getServiceAnalyticsParams(serviceType, quickConsultationPrice),
    species: normalizeAnimalTypeToSpecies(animalType),
    problem_key: problemType ?? null,
    booking_status: bookingStatus ?? null,
    payment_mode: paymentMode ?? null,
  }
}

export function getFunnelEntryEventForHref(href: string) {
  if (href.startsWith('/kontakt') || href.startsWith('/materialy')) {
    return null
  }

  if (href.includes('service=konsultacja-30-min')) {
    return 'funnel_entry_30_min'
  }

  if (href.includes('service=konsultacja-behawioralna-online')) {
    return 'funnel_entry_full_consultation'
  }

  return 'funnel_entry_15_min'
}

export function getFunnelEntryLabelForHref(href: string) {
  if (href.startsWith('/materialy')) {
    return FUNNEL_CTA_LABELS.secondary
  }

  if (href.startsWith('/kontakt')) {
    return FUNNEL_CTA_LABELS.contact
  }

  if (href.includes('service=konsultacja-30-min')) {
    return FUNNEL_CTA_LABELS.bridge
  }

  if (href.includes('service=konsultacja-behawioralna-online')) {
    return FUNNEL_CTA_LABELS.consultation
  }

  return FUNNEL_CTA_LABELS.primary
}
