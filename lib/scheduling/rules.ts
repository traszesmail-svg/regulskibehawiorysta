import type { BookingServiceType } from '@/lib/booking-services'
import type { AvailabilitySeed, AvailabilitySlot } from '@/lib/types'
import { isPolishPublicHoliday } from './polish-holidays'

export type ScheduleSlotState =
  | 'available'
  | 'booked'
  | 'locked'
  | 'outside_window'
  | 'unavailable'
  | 'reserved_for_urgent'

export type ScheduleSlotView = {
  id: string
  date: string
  time: string
  state: ScheduleSlotState
  statusLabel: 'Dostępny' | 'Zajęte' | 'Niedostępne'
  reasonLabel: string
  isBookable: boolean
  availabilitySlot: AvailabilitySlot | null
}

const WARSAW_TIME_ZONE = 'Europe/Warsaw'
const VISIBLE_START_MINUTES = 6 * 60
const VISIBLE_END_MINUTES = 20 * 60
const SLOT_STEP_MINUTES = 30
const STANDARD_HORIZON_DAYS = 30
const FULL_CONSULT_HORIZON_DAYS = 60
const STANDARD_BOOKING_DELAY_DAYS = 2
const FULL_CONSULT_WEEKDAY_TIME = '08:15'
const FULL_CONSULT_WEEKEND_TIME = '08:00'

const PRIMARY_WINDOW_TIMES = new Set([
  ...buildTimeRange(8 * 60, 11 * 60 + 30, SLOT_STEP_MINUTES),
  ...buildTimeRange(16 * 60, 17 * 60 + 30, SLOT_STEP_MINUTES),
])

const STANDARD_VISIBLE_TIMES = buildTimeRange(VISIBLE_START_MINUTES, VISIBLE_END_MINUTES, SLOT_STEP_MINUTES)
const FULL_CONSULT_VISIBLE_TIMES = [...new Set([...STANDARD_VISIBLE_TIMES, FULL_CONSULT_WEEKDAY_TIME])]
  .sort((left, right) => parseTimeToMinutes(left) - parseTimeToMinutes(right))

function buildTimeRange(startMinutes: number, endMinutes: number, stepMinutes: number) {
  const times: string[] = []

  for (let minutes = startMinutes; minutes <= endMinutes; minutes += stepMinutes) {
    times.push(minutesToTime(minutes))
  }

  return times
}

function minutesToTime(minutes: number) {
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function parseTimeToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

function formatDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return { year, month, day }
}

export function addDaysToDateKey(dateKey: string, offset: number) {
  const { year, month, day } = parseDateKey(dateKey)
  const date = new Date(Date.UTC(year, month - 1, day + offset, 12, 0, 0))
  return formatDateKey(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
}

function getWarsawNowBoundary(now = new Date()) {
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: WARSAW_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const values: Record<string, string> = {}

  for (const part of formatter.formatToParts(now)) {
    if (part.type !== 'literal') {
      values[part.type] = part.value
    }
  }

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  }
}

export function getWarsawTodayKey(now = new Date()) {
  return getWarsawNowBoundary(now).date
}

export function isFutureScheduleTime(date: string, time: string, now = new Date()) {
  const boundary = getWarsawNowBoundary(now)
  return `${date}T${time}` >= `${boundary.date}T${boundary.time}`
}

function getDayOfWeek(dateKey: string) {
  const { year, month, day } = parseDateKey(dateKey)
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  return (date.getUTCDay() + 6) % 7
}

function isWeekend(dateKey: string) {
  return getDayOfWeek(dateKey) >= 5
}

function isStandardWorkingDate(dateKey: string) {
  return !isWeekend(dateKey) && !isPolishPublicHoliday(dateKey)
}

function isFullConsultWorkingDate(dateKey: string) {
  return !isPolishPublicHoliday(dateKey)
}

export function getNormalBookingMinDateKey(now = new Date()) {
  let dateKey = addDaysToDateKey(getWarsawTodayKey(now), STANDARD_BOOKING_DELAY_DAYS)

  while (!isStandardWorkingDate(dateKey)) {
    dateKey = addDaysToDateKey(dateKey, 1)
  }

  return dateKey
}

export function getServiceScheduleHorizonDays(serviceType: BookingServiceType) {
  return serviceType === 'konsultacja-behawioralna-online' ? FULL_CONSULT_HORIZON_DAYS : STANDARD_HORIZON_DAYS
}

export function buildScheduleDateKeys(now = new Date(), horizonDays = STANDARD_HORIZON_DAYS) {
  const start = getWarsawTodayKey(now)
  return Array.from({ length: horizonDays + 1 }, (_, offset) => addDaysToDateKey(start, offset))
}

function getVisibleTimesForService(serviceType: BookingServiceType) {
  return serviceType === 'konsultacja-behawioralna-online' ? FULL_CONSULT_VISIBLE_TIMES : STANDARD_VISIBLE_TIMES
}

function getFullConsultAvailableTime(dateKey: string) {
  return isWeekend(dateKey) ? FULL_CONSULT_WEEKEND_TIME : FULL_CONSULT_WEEKDAY_TIME
}

function getBaseScheduleState(date: string, time: string, serviceType: BookingServiceType, now = new Date()): Omit<ScheduleSlotView, 'id' | 'availabilitySlot'> {
  if (!isFutureScheduleTime(date, time, now)) {
    return {
      date,
      time,
      state: 'unavailable',
      statusLabel: 'Niedostępne',
      reasonLabel: 'Ten termin jest już przeszły.',
      isBookable: false,
    }
  }

  if (serviceType === 'konsultacja-behawioralna-online') {
    if (!isFullConsultWorkingDate(date)) {
      return {
        date,
        time,
        state: 'unavailable',
        statusLabel: 'Niedostępne',
        reasonLabel: 'Pełna konsultacja nie odbywa się w święta i dni wolne od pracy.',
        isBookable: false,
      }
    }

    if (time !== getFullConsultAvailableTime(date)) {
      return {
        date,
        time,
        state: 'outside_window',
        statusLabel: 'Zajęte',
        reasonLabel: 'Ta godzina jest już zajęta.',
        isBookable: false,
      }
    }

    return {
      date,
      time,
      state: 'available',
      statusLabel: 'Dostępny',
      reasonLabel: 'Dostępny termin pełnej konsultacji.',
      isBookable: true,
    }
  }

  if (!isStandardWorkingDate(date)) {
    return {
      date,
      time,
      state: 'unavailable',
      statusLabel: 'Niedostępne',
      reasonLabel: 'Kwadranse nie odbywają się w weekendy, święta ani dni wolne od pracy.',
      isBookable: false,
    }
  }

  if (serviceType !== 'kwadrans-na-juz' && date < getNormalBookingMinDateKey(now)) {
    return {
      date,
      time,
      state: 'reserved_for_urgent',
      statusLabel: 'Niedostępne',
      reasonLabel: 'Najbliższe dwa dni są zarezerwowane dla Kwadransa na już.',
      isBookable: false,
    }
  }

  if (!PRIMARY_WINDOW_TIMES.has(time)) {
    return {
      date,
      time,
      state: 'outside_window',
      statusLabel: 'Zajęte',
      reasonLabel: 'Ta godzina jest już zajęta.',
      isBookable: false,
    }
  }

  return {
    date,
    time,
    state: 'available',
    statusLabel: 'Dostępny',
    reasonLabel: 'Dostępny termin.',
    isBookable: true,
  }
}

function getSlotById(slots: AvailabilitySlot[]) {
  return new Map(slots.map((slot) => [slot.id, slot]))
}

function applyAvailabilityState(base: Omit<ScheduleSlotView, 'id' | 'availabilitySlot'>, slot: AvailabilitySlot | null): ScheduleSlotView {
  const id = slot?.id ?? `${base.date}-${base.time}`

  if (!base.isBookable) {
    return { ...base, id, availabilitySlot: slot }
  }

  if (!slot) {
    return {
      ...base,
      id,
      state: 'unavailable',
      statusLabel: 'Niedostępne',
      reasonLabel: 'Ten termin nie jest jeszcze gotowy do rezerwacji.',
      isBookable: false,
      availabilitySlot: null,
    }
  }

  if (slot.isBooked) {
    return {
      ...base,
      id: slot.id,
      state: 'booked',
      statusLabel: 'Zajęte',
      reasonLabel: 'Ten termin jest już zajęty.',
      isBookable: false,
      availabilitySlot: slot,
    }
  }

  if (slot.lockedByBookingId) {
    return {
      ...base,
      id: slot.id,
      state: 'locked',
      statusLabel: 'Zajęte',
      reasonLabel: 'Ten termin jest chwilowo zarezerwowany.',
      isBookable: false,
      availabilitySlot: slot,
    }
  }

  return {
    ...base,
    id: slot.id,
    availabilitySlot: slot,
  }
}

export function buildVisibleServiceSlotsForDate(
  slots: AvailabilitySlot[],
  date: string,
  serviceType: BookingServiceType,
  now = new Date(),
): ScheduleSlotView[] {
  const slotsById = getSlotById(slots)

  return getVisibleTimesForService(serviceType).map((time) => {
    const base = getBaseScheduleState(date, time, serviceType, now)
    return applyAvailabilityState(base, slotsById.get(`${date}-${time}`) ?? null)
  })
}

export function isAvailabilitySlotBookableForService(
  slot: AvailabilitySlot,
  serviceType: BookingServiceType,
  now = new Date(),
) {
  const base = getBaseScheduleState(slot.bookingDate, slot.bookingTime, serviceType, now)
  return applyAvailabilityState(base, slot).isBookable
}

export function buildScheduleAvailabilitySeed(now = new Date(), horizonDays = FULL_CONSULT_HORIZON_DAYS): AvailabilitySeed[] {
  const result: AvailabilitySeed[] = []

  for (const date of buildScheduleDateKeys(now, horizonDays)) {
    const times = new Set<string>()

    if (isStandardWorkingDate(date)) {
      for (const time of PRIMARY_WINDOW_TIMES) {
        if (isFutureScheduleTime(date, time, now)) {
          times.add(time)
        }
      }
    }

    if (isFullConsultWorkingDate(date)) {
      const fullTime = getFullConsultAvailableTime(date)

      if (isFutureScheduleTime(date, fullTime, now)) {
        times.add(fullTime)
      }
    }

    if (times.size > 0) {
      result.push({
        date,
        times: [...times].sort((left, right) => parseTimeToMinutes(left) - parseTimeToMinutes(right)),
      })
    }
  }

  return result
}
