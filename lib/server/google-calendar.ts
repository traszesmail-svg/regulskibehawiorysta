import { resolveBookingServiceType, getBookingServiceRoomDurationMinutes } from '@/lib/booking-services'
import type { BookingRecord } from '@/lib/types'

export const WARSAW_TIME_ZONE = 'Europe/Warsaw'

type LocalDateTimeParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

function padTwo(value: number): string {
  return String(value).padStart(2, '0')
}

function getTimeZoneParts(date: Date, timeZone = WARSAW_TIME_ZONE): LocalDateTimeParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  ) as Record<string, number>

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  }
}

function getTimeZoneOffsetMilliseconds(date: Date, timeZone = WARSAW_TIME_ZONE): number {
  const parts = getTimeZoneParts(date, timeZone)
  const localClockAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
  return localClockAsUtc - date.getTime()
}

function parseDateAndTime(date: string, time: string): LocalDateTimeParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time)

  if (!match || !timeMatch) {
    throw new Error('Invalid booking date or time.')
  }

  const parts: LocalDateTimeParts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(timeMatch[1]),
    minute: Number(timeMatch[2]),
    second: 0,
  }
  const check = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second))

  if (
    check.getUTCFullYear() !== parts.year ||
    check.getUTCMonth() + 1 !== parts.month ||
    check.getUTCDate() !== parts.day ||
    check.getUTCHours() !== parts.hour ||
    check.getUTCMinutes() !== parts.minute
  ) {
    throw new Error('Invalid booking date or time.')
  }

  return parts
}

function isSameLocalDateTime(left: LocalDateTimeParts, right: LocalDateTimeParts): boolean {
  return (
    left.year === right.year &&
    left.month === right.month &&
    left.day === right.day &&
    left.hour === right.hour &&
    left.minute === right.minute &&
    left.second === right.second
  )
}

/**
 * Converts a wall-clock booking time to an instant in Europe/Warsaw. This does
 * not depend on the Node process time zone and therefore keeps the correct
 * UTC+1/UTC+2 offset in winter and summer.
 */
export function parseWarsawDateTime(date: string, time: string): Date {
  const local = parseDateAndTime(date, time)
  const localClockAsUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second)
  const offsetSampleTimes = [-36, -24, -12, 0, 12, 24, 36].map((hours) => new Date(localClockAsUtc + hours * 60 * 60 * 1000))
  const offsets = new Set(offsetSampleTimes.map((sample) => getTimeZoneOffsetMilliseconds(sample)))
  const candidates = [...offsets]
    .map((offset) => new Date(localClockAsUtc - offset))
    .filter((candidate) => isSameLocalDateTime(getTimeZoneParts(candidate), local))

  if (!candidates.length) {
    throw new Error(`The booking time ${date} ${time} does not exist in ${WARSAW_TIME_ZONE}.`)
  }

  // During the autumn DST change 02:xx occurs twice. Keep the earlier instant;
  // normal booking slots do not use that ambiguous hour, and this is deterministic.
  return new Date(Math.min(...candidates.map((candidate) => candidate.getTime())))
}

function toGoogleCalendarUtcDate(date: Date): string {
  return [
    date.getUTCFullYear(),
    padTwo(date.getUTCMonth() + 1),
    padTwo(date.getUTCDate()),
    'T',
    padTwo(date.getUTCHours()),
    padTwo(date.getUTCMinutes()),
    padTwo(date.getUTCSeconds()),
    'Z',
  ].join('')
}

function toIcsWarsawDate(date: Date): string {
  const parts = getTimeZoneParts(date)
  return [parts.year, padTwo(parts.month), padTwo(parts.day), 'T', padTwo(parts.hour), padTwo(parts.minute), padTwo(parts.second)].join('')
}

export function buildGoogleCalendarUrlForEvent(input: {
  title: string
  details: string
  location: string
  startsAt: Date
  endsAt: Date
}): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: input.title,
    dates: `${toGoogleCalendarUtcDate(input.startsAt)}/${toGoogleCalendarUtcDate(input.endsAt)}`,
    details: input.details,
    location: input.location,
    ctz: WARSAW_TIME_ZONE,
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function buildGoogleCalendarUrl(
  booking: Pick<BookingRecord, 'bookingDate' | 'bookingTime' | 'serviceType' | 'amount' | 'ownerName' | 'meetingUrl'>,
): string {
  const serviceType = resolveBookingServiceType(booking.serviceType, booking.amount)
  const durationMinutes = getBookingServiceRoomDurationMinutes(serviceType)
  const startsAt = parseWarsawDateTime(booking.bookingDate, booking.bookingTime)
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000)

  return buildGoogleCalendarUrlForEvent({
    title: `Regulski Behawiorysta – ${booking.ownerName}`,
    details: `Link do rozmowy: ${booking.meetingUrl}`,
    location: booking.meetingUrl,
    startsAt,
    endsAt,
  })
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

function renderWarsawVTimeZone(): string[] {
  return [
    'BEGIN:VTIMEZONE',
    `TZID:${WARSAW_TIME_ZONE}`,
    `X-LIC-LOCATION:${WARSAW_TIME_ZONE}`,
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:+0100',
    'TZOFFSETTO:+0200',
    'TZNAME:CEST',
    'DTSTART:19700329T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:+0200',
    'TZOFFSETTO:+0100',
    'TZNAME:CET',
    'DTSTART:19701025T030000',
    'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
    'END:STANDARD',
    'END:VTIMEZONE',
  ]
}

export function buildGoogleCalendarIcs(
  booking: Pick<BookingRecord, 'id' | 'bookingDate' | 'bookingTime' | 'serviceType' | 'amount' | 'ownerName' | 'meetingUrl'>,
): string {
  const serviceType = resolveBookingServiceType(booking.serviceType, booking.amount)
  const durationMinutes = getBookingServiceRoomDurationMinutes(serviceType)
  const startsAt = parseWarsawDateTime(booking.bookingDate, booking.bookingTime)
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000)
  const now = new Date()
  const summary = `Regulski Behawiorysta - ${booking.ownerName}`
  const details = `Link do rozmowy: ${booking.meetingUrl}`

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Regulski Behawiorysta//Rezerwacja//PL',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-TIMEZONE:${WARSAW_TIME_ZONE}`,
    ...renderWarsawVTimeZone(),
    'BEGIN:VEVENT',
    `UID:${booking.id}@regulskibehawiorysta.pl`,
    `DTSTAMP:${toGoogleCalendarUtcDate(now)}`,
    `DTSTART;TZID=${WARSAW_TIME_ZONE}:${toIcsWarsawDate(startsAt)}`,
    `DTEND;TZID=${WARSAW_TIME_ZONE}:${toIcsWarsawDate(endsAt)}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `DESCRIPTION:${escapeIcsText(details)}`,
    `LOCATION:${escapeIcsText(booking.meetingUrl)}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Regulski Behawiorysta - rozmowa za 15 minut',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n')
}
