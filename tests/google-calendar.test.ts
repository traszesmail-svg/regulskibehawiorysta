import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { buildGoogleCalendarIcs, buildGoogleCalendarUrl, parseWarsawDateTime } from '@/lib/server/google-calendar'

function makeBooking(bookingDate: string, bookingTime: string) {
  return {
    id: `calendar-${bookingDate}`,
    bookingDate,
    bookingTime,
    serviceType: 'szybka-konsultacja-15-min' as const,
    amount: 69,
    ownerName: 'Anna Testowa',
    meetingUrl: 'https://meet.jit.si/calendar-test',
  }
}

function assertWarsawCalendarEvent(
  bookingDate: string,
  bookingTime: string,
  expectedUtcStart: string,
  expectedUtcEnd: string,
) {
  const booking = makeBooking(bookingDate, bookingTime)
  const calendarUrl = new URL(buildGoogleCalendarUrl(booking))
  const calendarIcs = buildGoogleCalendarIcs(booking)

  assert.equal(calendarUrl.searchParams.get('ctz'), 'Europe/Warsaw')
  assert.equal(calendarUrl.searchParams.get('dates'), `${expectedUtcStart}/${expectedUtcEnd}`)
  assert.match(calendarIcs, /X-WR-TIMEZONE:Europe\/Warsaw/)
  assert.match(calendarIcs, /TZID:Europe\/Warsaw/)
  assert.match(calendarIcs, new RegExp(`DTSTART;TZID=Europe/Warsaw:${bookingDate.replace(/-/g, '')}T${bookingTime.replace(':', '')}00`))
}

test('Google Calendar and ICS retain Europe/Warsaw winter time', () => {
  assertWarsawCalendarEvent('2030-01-15', '10:00', '20300115T090000Z', '20300115T091500Z')
})

test('Google Calendar and ICS retain Europe/Warsaw summer time', () => {
  assertWarsawCalendarEvent('2030-07-15', '10:00', '20300715T080000Z', '20300715T081500Z')
})

test('Warsaw parser returns the real instant in winter and summer', () => {
  assert.equal(parseWarsawDateTime('2030-01-15', '10:00').toISOString(), '2030-01-15T09:00:00.000Z')
  assert.equal(parseWarsawDateTime('2030-07-15', '10:00').toISOString(), '2030-07-15T08:00:00.000Z')
})

test('legacy lead-booking calendar routes use the shared Warsaw time-zone helper', () => {
  const routePaths = [
    path.join(process.cwd(), 'app', 'api', 'admin', 'lead-bookings', '[id]', 'route.ts'),
    path.join(process.cwd(), 'app', 'api', 'admin', 'lead-bookings', '[id]', 'confirm-payment', 'route.ts'),
  ]

  for (const routePath of routePaths) {
    const source = fs.readFileSync(routePath, 'utf8')
    assert.match(source, /parseWarsawDateTime/)
    assert.match(source, /buildGoogleCalendarUrlForEvent/)
    assert.doesNotMatch(source, /\+02:00/)
  }
})
