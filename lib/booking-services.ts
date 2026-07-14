import { formatPricePln } from './pricing'
import { FUNNEL_SERVICE_CONFIG, type AnyBookingServiceType } from './funnel'
import type { AvailabilitySlot, GroupedAvailability } from './types'

export type BookingServiceType = AnyBookingServiceType

type BookingServiceConfig = {
  id: BookingServiceType
  title: string
  shortTitle: string
  slotSpan: number
  roomDurationMinutes: number
  slotSummary: string
  slotBadge: string
  roomSummary: string
}

const BOOKING_SERVICE_CONFIG: Record<BookingServiceType, BookingServiceConfig> = {
  'szybka-konsultacja-15-min': {
    id: 'szybka-konsultacja-15-min',
    title: FUNNEL_SERVICE_CONFIG['szybka-konsultacja-15-min'].title,
    shortTitle: FUNNEL_SERVICE_CONFIG['szybka-konsultacja-15-min'].shortTitle,
    slotSpan: FUNNEL_SERVICE_CONFIG['szybka-konsultacja-15-min'].slotSpan,
    roomDurationMinutes: FUNNEL_SERVICE_CONFIG['szybka-konsultacja-15-min'].durationMinutes,
    slotSummary: FUNNEL_SERVICE_CONFIG['szybka-konsultacja-15-min'].slotSummary,
    slotBadge: FUNNEL_SERVICE_CONFIG['szybka-konsultacja-15-min'].slotBadge,
    roomSummary: FUNNEL_SERVICE_CONFIG['szybka-konsultacja-15-min'].roomSummary,
  },
  'kwadrans-na-juz': {
    id: 'kwadrans-na-juz',
    title: FUNNEL_SERVICE_CONFIG['kwadrans-na-juz'].title,
    shortTitle: FUNNEL_SERVICE_CONFIG['kwadrans-na-juz'].shortTitle,
    slotSpan: FUNNEL_SERVICE_CONFIG['kwadrans-na-juz'].slotSpan,
    roomDurationMinutes: FUNNEL_SERVICE_CONFIG['kwadrans-na-juz'].durationMinutes,
    slotSummary: FUNNEL_SERVICE_CONFIG['kwadrans-na-juz'].slotSummary,
    slotBadge: FUNNEL_SERVICE_CONFIG['kwadrans-na-juz'].slotBadge,
    roomSummary: FUNNEL_SERVICE_CONFIG['kwadrans-na-juz'].roomSummary,
  },
  'konsultacja-30-min': {
    id: 'konsultacja-30-min',
    title: FUNNEL_SERVICE_CONFIG['konsultacja-30-min'].title,
    shortTitle: FUNNEL_SERVICE_CONFIG['konsultacja-30-min'].shortTitle,
    slotSpan: FUNNEL_SERVICE_CONFIG['konsultacja-30-min'].slotSpan,
    roomDurationMinutes: FUNNEL_SERVICE_CONFIG['konsultacja-30-min'].durationMinutes,
    slotSummary: FUNNEL_SERVICE_CONFIG['konsultacja-30-min'].slotSummary,
    slotBadge: FUNNEL_SERVICE_CONFIG['konsultacja-30-min'].slotBadge,
    roomSummary: FUNNEL_SERVICE_CONFIG['konsultacja-30-min'].roomSummary,
  },
  'konsultacja-behawioralna-online': {
    id: 'konsultacja-behawioralna-online',
    title: FUNNEL_SERVICE_CONFIG['konsultacja-behawioralna-online'].title,
    shortTitle: FUNNEL_SERVICE_CONFIG['konsultacja-behawioralna-online'].shortTitle,
    slotSpan: FUNNEL_SERVICE_CONFIG['konsultacja-behawioralna-online'].slotSpan,
    roomDurationMinutes: FUNNEL_SERVICE_CONFIG['konsultacja-behawioralna-online'].durationMinutes,
    slotSummary: FUNNEL_SERVICE_CONFIG['konsultacja-behawioralna-online'].slotSummary,
    slotBadge: FUNNEL_SERVICE_CONFIG['konsultacja-behawioralna-online'].slotBadge,
    roomSummary: FUNNEL_SERVICE_CONFIG['konsultacja-behawioralna-online'].roomSummary,
  },
}

export const DEFAULT_BOOKING_SERVICE: BookingServiceType = 'szybka-konsultacja-15-min'
export const BOOKING_SERVICE_30_PRICE = FUNNEL_SERVICE_CONFIG['konsultacja-30-min'].priceAmount
export const BOOKING_SERVICE_ONLINE_PRICE = FUNNEL_SERVICE_CONFIG['konsultacja-behawioralna-online'].priceAmount
const DEFAULT_BOOKING_SLOT_STEP_MINUTES = 20
const MAX_INFERRED_BOOKING_SLOT_STEP_MINUTES = 30

export function isBookingServiceType(value: string | null | undefined): value is BookingServiceType {
  return (
    value === 'szybka-konsultacja-15-min' ||
    value === 'kwadrans-na-juz' ||
    value === 'konsultacja-30-min' ||
    value === 'konsultacja-behawioralna-online'
  )
}

export function normalizeBookingServiceType(value: string | null | undefined): BookingServiceType {
  if (value === 'kwadrans-na-juz') {
    return value
  }

  if (value === 'konsultacja-30-min') {
    return value
  }

  if (value === 'konsultacja-behawioralna-online') {
    return value
  }

  return DEFAULT_BOOKING_SERVICE
}

export function getBookingServiceConfig(serviceType: BookingServiceType) {
  return BOOKING_SERVICE_CONFIG[serviceType]
}

export function getBookingServiceTitle(serviceType: BookingServiceType) {
  return getBookingServiceConfig(serviceType).title
}

export function getBookingServiceDurationLabel(serviceType: BookingServiceType) {
  return FUNNEL_SERVICE_CONFIG[serviceType].durationLabel
}

export function getBookingServiceSlotSummary(serviceType: BookingServiceType) {
  return getBookingServiceConfig(serviceType).slotSummary
}

export function getBookingServiceSlotBadge(serviceType: BookingServiceType) {
  return getBookingServiceConfig(serviceType).slotBadge
}

export function getBookingServiceRoomSummary(serviceType: BookingServiceType) {
  return getBookingServiceConfig(serviceType).roomSummary
}

export function getBookingServiceRoomAccessLabel(serviceType: BookingServiceType) {
  if (serviceType === 'konsultacja-behawioralna-online') {
    return 'pokój konsultacji online'
  }

  if (serviceType === 'konsultacja-30-min') {
    return 'pokój konsultacji'
  }

  return 'pokój rozmowy audio'
}

export function getBookingServicePrice(serviceType: BookingServiceType, quickConsultationPrice: number) {
  if (serviceType === 'kwadrans-na-juz') {
    return FUNNEL_SERVICE_CONFIG['kwadrans-na-juz'].priceAmount
  }

  if (serviceType === 'konsultacja-30-min') {
    return BOOKING_SERVICE_30_PRICE
  }

  if (serviceType === 'konsultacja-behawioralna-online') {
    return BOOKING_SERVICE_ONLINE_PRICE
  }

  return quickConsultationPrice
}

export function getBookingServicePriceLabel(serviceType: BookingServiceType, quickConsultationPrice: number) {
  return formatPricePln(getBookingServicePrice(serviceType, quickConsultationPrice))
}

export function inferBookingServiceTypeFromAmount(amount: number): BookingServiceType {
  if (Math.round(amount * 100) / 100 === FUNNEL_SERVICE_CONFIG['kwadrans-na-juz'].priceAmount) {
    return 'kwadrans-na-juz'
  }

  if (Math.round(amount * 100) / 100 === BOOKING_SERVICE_30_PRICE) {
    return 'konsultacja-30-min'
  }

  if (Math.round(amount * 100) / 100 === BOOKING_SERVICE_ONLINE_PRICE) {
    return 'konsultacja-behawioralna-online'
  }

  return DEFAULT_BOOKING_SERVICE
}

export function resolveBookingServiceType(serviceType: string | null | undefined, amount?: number | null) {
  if (isBookingServiceType(serviceType)) {
    return serviceType
  }

  if (typeof amount === 'number' && Number.isFinite(amount)) {
    return inferBookingServiceTypeFromAmount(amount)
  }

  return DEFAULT_BOOKING_SERVICE
}

export function getBookingServiceSlotSpan(serviceType: BookingServiceType) {
  return getBookingServiceConfig(serviceType).slotSpan
}

export function getBookingServiceRoomDurationMinutes(serviceType: BookingServiceType) {
  return getBookingServiceConfig(serviceType).roomDurationMinutes
}

export function isAudioOnlyBookingService(serviceType: BookingServiceType) {
  return FUNNEL_SERVICE_CONFIG[serviceType].mode === 'phone'
}

function parseTimeToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

function getSortedAvailabilitySlots(slots: AvailabilitySlot[]) {
  return [...slots].sort((left, right) =>
    `${left.bookingDate}T${left.bookingTime}`.localeCompare(`${right.bookingDate}T${right.bookingTime}`),
  )
}

function getAvailabilitySlotStepMinutes(slots: AvailabilitySlot[]) {
  const sortedSlots = getSortedAvailabilitySlots(slots)
  const diffCounts = new Map<number, number>()

  for (let index = 1; index < sortedSlots.length; index += 1) {
    const previousSlot = sortedSlots[index - 1]
    const nextSlot = sortedSlots[index]

    if (previousSlot.bookingDate !== nextSlot.bookingDate) {
      continue
    }

    const diffMinutes = parseTimeToMinutes(nextSlot.bookingTime) - parseTimeToMinutes(previousSlot.bookingTime)

    if (diffMinutes <= 0 || diffMinutes > MAX_INFERRED_BOOKING_SLOT_STEP_MINUTES) {
      continue
    }

    diffCounts.set(diffMinutes, (diffCounts.get(diffMinutes) ?? 0) + 1)
  }

  if (diffCounts.size === 0) {
    return null
  }

  return [...diffCounts.entries()].sort((left, right) => {
    if (right[1] !== left[1]) {
      return right[1] - left[1]
    }

    return left[0] - right[0]
  })[0]?.[0] ?? null
}

function getServiceAvailabilitySlotSpan(slots: AvailabilitySlot[], serviceType: BookingServiceType) {
  if (serviceType === 'konsultacja-30-min' || serviceType === 'konsultacja-behawioralna-online') {
    return 1
  }

  const slotStepMinutes = getAvailabilitySlotStepMinutes(slots)
  const configuredSlotSpan = getBookingServiceSlotSpan(serviceType)

  if (!slotStepMinutes) {
    if (slots.length === 0) {
      return configuredSlotSpan
    }

    return Math.max(1, Math.ceil(getBookingServiceRoomDurationMinutes(serviceType) / DEFAULT_BOOKING_SLOT_STEP_MINUTES))
  }

  return Math.max(1, Math.ceil(getBookingServiceRoomDurationMinutes(serviceType) / slotStepMinutes))
}

function areSlotsConsecutive(left: AvailabilitySlot, right: AvailabilitySlot, slotStepMinutes: number | null) {
  if (slotStepMinutes === null) {
    return left.bookingDate === right.bookingDate
  }

  return (
    left.bookingDate === right.bookingDate &&
    parseTimeToMinutes(right.bookingTime) - parseTimeToMinutes(left.bookingTime) === slotStepMinutes
  )
}

export function getServiceAvailabilityWindow(
  slots: AvailabilitySlot[],
  startSlotId: string,
  serviceType: BookingServiceType,
): AvailabilitySlot[] | null {
  const sortedSlots = getSortedAvailabilitySlots(slots)
  const slotSpan = getServiceAvailabilitySlotSpan(sortedSlots, serviceType)
  const slotStepMinutes =
    getAvailabilitySlotStepMinutes(sortedSlots) ??
    (sortedSlots.length > 0 ? DEFAULT_BOOKING_SLOT_STEP_MINUTES : null)
  const startIndex = sortedSlots.findIndex((slot) => slot.id === startSlotId)

  if (startIndex === -1) {
    return null
  }

  const window = sortedSlots.slice(startIndex, startIndex + slotSpan)

  if (window.length !== slotSpan) {
    return null
  }

  for (let index = 1; index < window.length; index += 1) {
    if (!areSlotsConsecutive(window[index - 1], window[index], slotStepMinutes)) {
      return null
    }
  }

  return window
}

export function getBookableServiceAvailabilityWindow(
  slots: AvailabilitySlot[],
  startSlotId: string,
  serviceType: BookingServiceType,
): AvailabilitySlot[] | null {
  const window = getServiceAvailabilityWindow(slots, startSlotId, serviceType)

  if (!window) {
    return null
  }

  return window.every((slot) => !slot.isBooked && !slot.lockedByBookingId) ? window : null
}

export function filterGroupedAvailabilityForService(
  groups: GroupedAvailability[],
  serviceType: BookingServiceType,
): GroupedAvailability[] {
  const slotSpan = getServiceAvailabilitySlotSpan(groups.flatMap((group) => group.slots), serviceType)

  if (slotSpan === 1) {
    return groups
  }

  return groups
    .map((group) => {
      const eligibleSlots = group.slots.filter((slot) => getServiceAvailabilityWindow(group.slots, slot.id, serviceType))
      return {
        ...group,
        slots: eligibleSlots,
      }
    })
    .filter((group) => group.slots.length > 0)
}
