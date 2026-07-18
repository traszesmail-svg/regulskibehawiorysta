import assert from 'node:assert/strict'
import { test } from 'node:test'
import { hasEligibleAccountRoomBooking } from '@/lib/server/account-store'

test('account room requires a paid confirmed consultation and never treats a commerce record as room access', () => {
  assert.equal(hasEligibleAccountRoomBooking([], []), false)
  assert.equal(
    hasEligibleAccountRoomBooking(
      [{ bookingStatus: 'pending', paymentStatus: 'unpaid' }],
      [],
    ),
    false,
  )
  assert.equal(
    hasEligibleAccountRoomBooking(
      [{ bookingStatus: 'confirmed', paymentStatus: 'paid' }],
      [],
    ),
    true,
  )
  assert.equal(
    hasEligibleAccountRoomBooking(
      [],
      [{ service: 'commerce:ebook:guide', status: 'paid' }],
    ),
    false,
  )
  assert.equal(
    hasEligibleAccountRoomBooking(
      [],
      [{ service: 'konsultacja-30-min', status: 'paid' }],
    ),
    true,
  )
})
