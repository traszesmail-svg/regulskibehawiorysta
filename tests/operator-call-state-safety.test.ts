import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createLocalDataSandbox } from '@/scripts/lib/local-data-sandbox'
import { createAvailabilitySlot, createPendingBooking, markBookingPaid, markBookingRefunded, updateBookingCallState, transitionBookingCallState, getBookingById } from '@/lib/server/local-store'
import { NextRequest } from 'next/server'
import { POST as reportJob } from '@/app/api/phone-agent/job/route'

test('conditional phone transition cannot start a booking cancelled and refunded after job read', async () => {
  const sandbox = await createLocalDataSandbox('call-cancel-race')
  const previous = process.env.APP_DATA_MODE
  process.env.APP_DATA_MODE = 'local'
  try {
    const slot = await createAvailabilitySlot('2030-03-12', '10:00')
    const { booking } = await createPendingBooking({ ownerName: 'Test Local', serviceType: 'szybka-konsultacja-15-min', problemType: 'inne', animalType: 'Pies', petAge: '2 lata', durationNotes: 'Test', description: 'Test bez połączeń.', phone: '500600700', email: 'local@example.invalid', slotId: slot.id })
    await markBookingPaid(booking.id)
    await updateBookingCallState(booking.id, { callStatus: 'phone_agent_dialing' })
    await markBookingRefunded(booking.id)
    const changed = await transitionBookingCallState(booking.id, ['phone_agent_dialing'], { callStatus: 'phone_agent_active' })
    assert.equal(changed, null)
    const preserved = await getBookingById(booking.id)
    assert.equal(preserved?.bookingStatus, 'cancelled')
    assert.equal(preserved?.paymentStatus, 'refunded')
    assert.equal(preserved?.callStatus, 'phone_agent_dialing')
  } finally {
    previous === undefined ? delete process.env.APP_DATA_MODE : process.env.APP_DATA_MODE = previous
    await sandbox.cleanup()
  }
})

test('legacy manual completion is compatible without allowing unclaimed or automatic completion', async () => {
  const sandbox = await createLocalDataSandbox('legacy-manual-completion')
  const keys = ['APP_DATA_MODE', 'PHONE_CALL_PROVIDER', 'PHONE_AGENT_TOKEN', 'CUSTOMER_EMAIL_MODE'] as const
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]))
  Object.assign(process.env, { APP_DATA_MODE: 'local', PHONE_CALL_PROVIDER: 'manual_sim', PHONE_AGENT_TOKEN: 'legacy-fixture-token', CUSTOMER_EMAIL_MODE: 'disabled' })
  try {
    const slot = await createAvailabilitySlot('2030-03-13', '10:00')
    const { booking } = await createPendingBooking({ ownerName: 'Test Local', serviceType: 'szybka-konsultacja-15-min', consultationMode: 'phone', problemType: 'inne', animalType: 'Pies', petAge: '2 lata', durationNotes: 'Test', description: 'Test bez połączeń.', phone: '500600700', email: 'local@example.invalid', slotId: slot.id })
    await markBookingPaid(booking.id)
    const ended = () => reportJob(new NextRequest('http://localhost/api/phone-agent/job', {
      method: 'POST', headers: { Authorization: 'Bearer legacy-fixture-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: booking.id, event: 'ended' }),
    }))
    await updateBookingCallState(booking.id, { callStatus: 'phone_agent_pending' })
    assert.equal((await ended()).status, 409)
    await updateBookingCallState(booking.id, { callStatus: 'phone_agent_dialing' })
    process.env.PHONE_CALL_PROVIDER = 'android_agent'
    assert.equal((await ended()).status, 409)
    delete process.env.PHONE_CALL_PROVIDER
    assert.equal((await ended()).status, 409)
    process.env.PHONE_CALL_PROVIDER = 'manual_sim'
    assert.equal((await ended()).status, 200)
    const completed = await getBookingById(booking.id)
    assert.equal(completed?.callStatus, 'phone_agent_completed')
    assert.ok(!completed?.callAnsweredAt, 'manual completion must not invent an answer timestamp')
    const repeated = await ended()
    assert.equal(repeated.status, 200)
    assert.equal((await repeated.json()).idempotent, true)
  } finally {
    for (const [key, value] of Object.entries(previous)) value === undefined ? delete process.env[key] : process.env[key] = value
    await sandbox.cleanup()
  }
})
