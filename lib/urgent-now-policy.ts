export const URGENT_NOW_DAILY_LIMIT = 2

export type UrgentNowDayState = 'available' | 'full' | 'weekend' | 'in_progress' | 'unavailable' | 'offline' | 'online_with_slot' | 'online_without_slot'
export type PublicZapytajNowStatus = 'available_now' | 'payment_pending' | 'in_call' | 'buffer' | 'offline' | 'unavailable'

export function isZapytajTodayIntakeOpen(input: {
  status: PublicZapytajNowStatus
  enabledUntil: string | null
  storageAvailable: boolean
}, now = new Date()) {
  return input.storageAvailable &&
    ['available_now', 'payment_pending', 'in_call'].includes(input.status) &&
    Boolean(input.enabledUntil && Date.parse(input.enabledUntil) > now.getTime())
}

export type ZapytajUrgentPreferenceError = 'invalid_date' | 'invalid_time' | 'past_time'

export const URGENT_OPERATOR_RESPONSE_WINDOW_MS = 15 * 60 * 1000

export function isUrgentOperatorResponseOverdue(createdAt: string, status: string, now = new Date()) {
  return status === 'new' && now.getTime() - Date.parse(createdAt) >= URGENT_OPERATOR_RESPONSE_WINDOW_MS
}

export function validateZapytajUrgentPreference(date: string, time: string, now = new Date()): ZapytajUrgentPreferenceError | null {
  const today = getWarsawDateAndDay(now).date
  if (date !== today && date !== addWarsawDateDays(today, 1)) return 'invalid_date'
  if (!/^(?:(?:0[8-9]|1[0-9]):(?:00|30)|20:00)$/.test(time)) return 'invalid_time'
  if (date === today) {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Warsaw', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(now)
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
    const currentMinutes = Number(values.hour) * 60 + Number(values.minute)
    const requestedMinutes = Number(time.slice(0, 2)) * 60 + Number(time.slice(3))
    if (requestedMinutes < currentMinutes) return 'past_time'
  }
  return null
}

export function getWarsawDateAndDay(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).formatToParts(now)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    weekday: values.weekday,
    isWeekend: values.weekday === 'Sat' || values.weekday === 'Sun',
  }
}

export function addWarsawDateDays(date: string, days: number) {
  const [year, month, day] = date.split('-').map(Number)
  const result = new Date(Date.UTC(year, month - 1, day + days, 12))
  return `${result.getUTCFullYear()}-${String(result.getUTCMonth() + 1).padStart(2, '0')}-${String(result.getUTCDate()).padStart(2, '0')}`
}

export function getUrgentNowDayState(now: Date, acceptedCount: number): UrgentNowDayState {
  const { isWeekend } = getWarsawDateAndDay(now)
  if (isWeekend) return 'weekend'
  return acceptedCount >= URGENT_NOW_DAILY_LIMIT ? 'full' : 'available'
}

export function isZapytajNowActivationTime(now: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Warsaw',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  const minuteOfDay = Number(values.hour) * 60 + Number(values.minute)
  return !['Sat', 'Sun'].includes(values.weekday) && minuteOfDay >= 8 * 60 && minuteOfDay <= 20 * 60
}

export function isCurrentLiveCheckoutSlot(status: PublicZapytajNowStatus, activeSlotId: string | null, requestedSlotId: string) {
  return status === 'available_now' && Boolean(activeSlotId) && activeSlotId === requestedSlotId
}

export function getZapytajNowPublicStatus(
  liveStatus: PublicZapytajNowStatus,
  paymentLinkCount: number,
  now: Date,
  hasOnlineSlot = false,
): UrgentNowDayState {
  if (getWarsawDateAndDay(now).isWeekend) return 'weekend'
  if (liveStatus === 'in_call' || liveStatus === 'payment_pending') return 'in_progress'
  if (liveStatus === 'available_now') return hasOnlineSlot ? 'online_with_slot' : 'online_without_slot'
  return paymentLinkCount >= URGENT_NOW_DAILY_LIMIT ? 'full' : 'offline'
}

export function countZapytajNowPaymentLinkRequestsForDate(
  requests: Array<{ createdAt: string; requestedDate?: string | null; contactPreference?: 'payment_link' | 'notify_only' }>,
  date: string,
) {
  return requests.filter((request) =>
    request.contactPreference === 'payment_link' && (request.requestedDate ?? getWarsawDateAndDay(new Date(request.createdAt)).date) === date,
  ).length
}

export function countActiveUrgentDayBookings<T extends { id: string; bookingDate: string; bookingStatus: string }>(
  bookings: T[],
  slots: Array<{ lockedByBookingId?: string | null; lockedUntil?: string | null }>,
  date: string,
  now = new Date(),
) {
  const activeLocks = new Set(slots
    .filter((slot) => slot.lockedByBookingId && slot.lockedUntil && Date.parse(slot.lockedUntil) > now.getTime())
    .map((slot) => slot.lockedByBookingId as string))
  return bookings.filter((booking) => booking.bookingDate === date && (
    booking.bookingStatus === 'confirmed' || booking.bookingStatus === 'done' ||
    ((booking.bookingStatus === 'pending' || booking.bookingStatus === 'pending_manual_payment') && activeLocks.has(booking.id))
  )).length
}

export function getZapytajHeaderStatusLabel(status: UrgentNowDayState | 'unknown') {
  switch (status) {
    case 'available': return 'Zapytaj teraz: dostępne'
    case 'full': return 'Zapytaj teraz: limit zgłoszeń wykorzystany'
    case 'offline': return 'Zapytaj teraz: sprawdź najbliższy dostępny dzień'
    case 'online_with_slot': return 'Zapytaj teraz: dostępny termin online'
    case 'online_without_slot': return 'Zapytaj teraz: okno aktywne, brak terminu'
    case 'in_progress': return 'Zapytaj teraz: trwa rozmowa lub oczekiwanie na płatność'
    case 'weekend': return 'Zapytaj teraz: dostępne w dni robocze'
    case 'unavailable': return 'Zapytaj teraz: okno nieaktywne'
    case 'unknown': return 'Zapytaj teraz: nie można sprawdzić dostępności'
  }
}

export function isUrgentNowDailyLimitError(error: unknown) {
  return error instanceof Error && error.message.includes('URGENT_NOW_DAILY_LIMIT')
}
