import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildScheduleAvailabilitySeed,
  buildVisibleServiceSlotsForDate,
  getNormalBookingMinDateKey,
} from '@/lib/scheduling/rules'
import { UNPAID_BOOKING_EXPIRY_HOURS, isUnpaidBookingExpired } from '@/lib/booking-expiry'
import { shouldSendReminderForBooking } from '@/lib/server/reminders'
import { REMINDER_LEAD_TIME_MINUTES } from '@/lib/server/reminder-runner'
import type { AvailabilitySlot } from '@/lib/types'

function slotsFromSeed(now: Date): AvailabilitySlot[] {
  const timestamp = now.toISOString()

  return buildScheduleAvailabilitySeed(now).flatMap((entry) =>
    entry.times.map((bookingTime) => ({
      id: `${entry.date}-${bookingTime}`,
      bookingDate: entry.date,
      bookingTime,
      isBooked: false,
      lockedByBookingId: null,
      lockedUntil: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
  )
}

describe('service scheduling rules', () => {
  it('moves normal Kwadrans availability from Friday to Monday', () => {
    const friday = new Date('2026-05-15T08:00:00.000Z')

    assert.equal(getNormalBookingMinDateKey(friday), '2026-05-18')
  })

  it('marks weekend Kwadrans slots as Niedostępne and working-day off-window slots as Zajęte', () => {
    const now = new Date('2026-05-15T08:00:00.000Z')
    const slots = slotsFromSeed(now)
    const saturday = buildVisibleServiceSlotsForDate(slots, '2026-05-16', 'szybka-konsultacja-15-min', now)
    const monday = buildVisibleServiceSlotsForDate(slots, '2026-05-18', 'szybka-konsultacja-15-min', now)

    assert.equal(saturday.find((slot) => slot.time === '08:00')?.statusLabel, 'Niedostępne')
    assert.equal(monday.find((slot) => slot.time === '07:30')?.statusLabel, 'Zajęte')
    assert.equal(monday.find((slot) => slot.time === '08:00')?.statusLabel, 'Dostępny')
  })

  it('keeps full consultation available on regular weekends and unavailable on public holidays', () => {
    const now = new Date('2026-05-15T08:00:00.000Z')
    const slots = slotsFromSeed(now)
    const sunday = buildVisibleServiceSlotsForDate(slots, '2026-05-17', 'konsultacja-behawioralna-online', now)
    const christmas = buildVisibleServiceSlotsForDate(slots, '2026-12-25', 'konsultacja-behawioralna-online', now)

    assert.equal(sunday.find((slot) => slot.time === '08:00')?.statusLabel, 'Dostępny')
    assert.equal(sunday.find((slot) => slot.time === '08:30')?.statusLabel, 'Zajęte')
    assert.equal(christmas.find((slot) => slot.time === '08:15')?.statusLabel, 'Niedostępne')
  })

  it('sends booking reminders in the final 15-minute window', () => {
    const start = { date: '2026-06-01', time: '10:00' }
    const end = { date: '2026-06-01', time: '10:15' }
    const baseBooking = {
      bookingStatus: 'confirmed' as const,
      paymentStatus: 'paid' as const,
      reminderSent: false,
      bookingDate: '2026-06-01',
      bookingTime: '10:15',
    }

    assert.equal(REMINDER_LEAD_TIME_MINUTES, 15)
    assert.equal(shouldSendReminderForBooking(baseBooking, start, end), true)
    assert.equal(shouldSendReminderForBooking({ ...baseBooking, bookingTime: '10:16' }, start, end), false)
    assert.equal(shouldSendReminderForBooking({ ...baseBooking, reminderSent: true }, start, end), false)
  })

  it('expires unpaid admin bookings after 24 hours', () => {
    const now = new Date('2026-06-01T12:00:00.000Z')
    const fresh = {
      bookingStatus: 'pending' as const,
      paymentStatus: 'unpaid' as const,
      createdAt: '2026-05-31T13:00:00.000Z',
    }
    const stale = {
      bookingStatus: 'pending_manual_payment' as const,
      paymentStatus: 'pending_manual_review' as const,
      createdAt: '2026-05-31T11:59:00.000Z',
    }

    assert.equal(UNPAID_BOOKING_EXPIRY_HOURS, 24)
    assert.equal(isUnpaidBookingExpired(fresh, now), false)
    assert.equal(isUnpaidBookingExpired(stale, now), true)
    assert.equal(
      isUnpaidBookingExpired({ ...stale, bookingStatus: 'confirmed', paymentStatus: 'paid' }, now),
      false,
    )
  })
})
