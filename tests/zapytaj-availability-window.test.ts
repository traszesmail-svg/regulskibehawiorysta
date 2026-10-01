import assert from 'node:assert/strict'
import test from 'node:test'
import {
  addAvailabilityMonths,
  buildZapytajMonthDates,
  resolveZapytajAvailabilityWindow,
  sliceZapytajAvailabilityWindow,
} from '../lib/zapytaj-availability-window'

test('availability calendar validates and resolves a complete month', () => {
  assert.deepEqual(resolveZapytajAvailabilityWindow(null, '2026-10-01'), {
    from: '2026-10-01',
    to: '2026-10-31',
    month: '2026-10',
  })
  assert.equal(resolveZapytajAvailabilityWindow('2026-10-02', '2026-10-01'), null)
  assert.equal(resolveZapytajAvailabilityWindow('2026-02-01', '2026-10-01'), null)
  assert.equal(resolveZapytajAvailabilityWindow('2026-13-01', '2026-10-01'), null)
  assert.equal(resolveZapytajAvailabilityWindow('2027-11-01', '2026-10-01'), null)
})

test('calendar contains every date including dates without a real slot', () => {
  const dates = buildZapytajMonthDates('2026-10')
  assert.equal(dates.filter(Boolean).length, 31)
  assert.equal(dates[0], null)
  assert.equal(dates.includes('2026-10-01'), true)
  assert.equal(dates.includes('2026-10-31'), true)
})

test('sequential month pages retain only actual slots and expose later real availability', () => {
  const groups = [
    { date: '2026-10-08', slots: ['slot-oct'] },
    { date: '2026-11-03', slots: ['slot-nov'] },
  ]
  const october = resolveZapytajAvailabilityWindow('2026-10-01', '2026-10-01')!
  const november = resolveZapytajAvailabilityWindow('2026-11-01', '2026-10-01')!

  assert.deepEqual(sliceZapytajAvailabilityWindow(groups, october, '2026-10-01'), {
    slots: ['slot-oct'],
    hasAnySlots: true,
    hasEarlier: false,
    hasLater: true,
  })
  assert.deepEqual(sliceZapytajAvailabilityWindow(groups, november, '2026-10-01'), {
    slots: ['slot-nov'],
    hasAnySlots: true,
    hasEarlier: true,
    hasLater: false,
  })
  assert.equal(addAvailabilityMonths('2026-12', 1), '2027-01')
})

test('the month with the final real slot has no next control', () => {
  const window = resolveZapytajAvailabilityWindow('2026-10-01', '2026-10-01')!
  const result = sliceZapytajAvailabilityWindow([{ date: '2026-10-12', slots: ['only-slot'] }], window, '2026-10-01')

  assert.deepEqual(result.slots, ['only-slot'])
  assert.equal(result.hasLater, false)
  assert.equal(result.hasEarlier, false)
})
