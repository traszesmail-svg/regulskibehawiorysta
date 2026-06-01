import assert from 'node:assert/strict'
import { DEFAULT_PRICE_PLN } from '../lib/pricing'
import { runBookingReminderSweep } from '../lib/server/reminder-runner'
import { BookingRecord } from '../lib/types'

function createBooking(id: string, overrides: Partial<BookingRecord> = {}): BookingRecord {
  return {
    id,
    userId: 'user-1',
    customerAccessTokenHash: null,
    ownerName: 'Reminder Smoke',
    problemType: 'szczeniak',
    animalType: 'Pies',
    petAge: '2 lata',
    durationNotes: 'Od miesiaca',
    description: 'Test przypomnienia',
    phone: '',
    email: `${id}@example.com`,
    bookingDate: '2026-03-21',
    bookingTime: '10:30',
    slotId: `${id}-slot`,
    amount: DEFAULT_PRICE_PLN,
    bookingStatus: 'confirmed',
    paymentStatus: 'paid',
    meetingUrl: `https://meet.jit.si/${id}`,
    createdAt: '2026-03-21T08:00:00.000Z',
    updatedAt: '2026-03-21T08:00:00.000Z',
    reminderSent: false,
    ...overrides,
  }
}

async function main() {
  const delivered: string[] = []
  const marked: string[] = []

  const result = await runBookingReminderSweep({
    now: () => new Date('2026-03-21T09:15:00Z'),
    listBookings: async () => [
      createBooking('send-ok'),
      createBooking('send-skip'),
      createBooking('send-fail'),
      createBooking('already-sent', { reminderSent: true }),
      createBooking('cancelled', { bookingStatus: 'cancelled' }),
    ],
    sendBookingReminderEmail: async (booking) => {
      delivered.push(booking.id)

      if (booking.id === 'send-ok') {
        return { status: 'sent' as const }
      }

      if (booking.id === 'send-skip') {
        return { status: 'skipped' as const, reason: 'RESEND_API_KEY missing' }
      }

      return { status: 'failed' as const, reason: 'SMTP timeout' }
    },
    sendOwnerBookingReminderEmail: async () => ({ status: 'skipped' as const, reason: 'smoke' }),
    sendBookingPushReminders: async () => ({
      configured: false,
      attempted: 0,
      sent: 0,
      skipped: 1,
      failed: 0,
      expired: 0,
      ownerSent: 0,
      customerSent: 0,
    }),
    markBookingReminderSent: async (bookingId) => {
      marked.push(bookingId)
      return createBooking(bookingId, { reminderSent: true })
    },
  })

  assert.equal(result.checked, 5)
  assert.equal(result.candidates, 3)
  assert.equal(result.sent, 1)
  assert.equal(result.skipped, 1)
  assert.equal(result.failed, 1)
  assert.deepEqual(delivered, ['send-ok', 'send-skip', 'send-fail'])
  assert.deepEqual(marked, ['send-ok'])

  console.log(
    JSON.stringify(
      {
        ok: true,
        ...result,
        delivered,
        marked,
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
