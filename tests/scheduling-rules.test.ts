import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildScheduleAvailabilitySeed,
  buildVisibleServiceSlotsForDate,
  getNormalBookingMinDateKey,
} from '@/lib/scheduling/rules'
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
})
