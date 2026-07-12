import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  createPendingBooking,
  getBookingById,
  listAvailabilityAdmin,
  updateBookingQuiz,
  markBookingPaid,
} from '@/lib/server/db'
import { sendRescheduleRequestEmail } from '@/lib/server/notifications'
import { isAvailabilitySlotBookableForService } from '@/lib/scheduling/rules'
import { createLocalDataSandbox } from '@/scripts/lib/local-data-sandbox'

function withEnv(
  overrides: Record<string, string | null | undefined>,
  run: () => void | Promise<void>,
) {
  const previous = new Map<string, string | undefined>()
  const restore = () => {
    for (const [key, value] of previous.entries()) {
      if (typeof value === 'string') {
        process.env[key] = value
      } else {
        delete process.env[key]
      }
    }
  }

  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, process.env[key])
    if (typeof value === 'string') {
      process.env[key] = value
    } else {
      delete process.env[key]
    }
  }

  const result = run()
  if (result && typeof (result as Promise<void>).then === 'function') {
    return (result as Promise<void>).finally(restore)
  }
  restore()
}

test('voip chat limits and quiz updates', async () => {
  await withEnv(
    {
      APP_DATA_MODE: 'local',
      CUSTOMER_EMAIL_MODE: 'disabled',
      ADMIN_NOTIFICATION_EMAIL: 'kontakt@regulskibehawiorysta.pl',
      RESEND_API_KEY: null,
    },
    async () => {
      const sandbox = await createLocalDataSandbox('voip-chat-limits', process.cwd())

      try {
        const slots = (await listAvailabilityAdmin()).filter((slot) =>
          isAvailabilitySlotBookableForService(slot, 'szybka-konsultacja-15-min'),
        )
        assert.ok(slots.length >= 1, 'Expected at least one seeded Kwadrans slot.')

        // 1. Create a booking
        const bookingResult = await createPendingBooking({
          ownerName: 'Test Client',
          serviceType: 'szybka-konsultacja-15-min',
          problemType: 'separacja',
          animalType: 'Pies',
          petAge: '2 lata',
          durationNotes: 'preferowane godziny popołudniowe',
          description: 'Pies szczeka gdy zostaje sam.',
          phone: '+48600700800',
          email: 'client@example.com',
          slotId: slots[0].id,
        })

        const bookingId = bookingResult.booking.id

        // 2. Test updateBookingQuiz
        const updated = await updateBookingQuiz(bookingId, {
          petAge: '3 lata',
          durationNotes: 'zmiana notatki',
          description: 'nowy opis problemu',
          questionsRemaining: 2,
        })

        assert.ok(updated, 'Expected updateBookingQuiz to return updated booking')
        assert.equal(updated.petAge, '3 lata')
        assert.equal(updated.durationNotes, 'zmiana notatki')
        assert.equal(updated.description, 'nowy opis problemu')
        assert.equal(updated.questionsRemaining, 2)

        // 3. Test sendRescheduleRequestEmail
        const emailResult = await sendRescheduleRequestEmail(updated, 'Z powodu nagłej podróży służbowej.')
        assert.equal(emailResult.status, 'skipped') // skipped because RESEND_API_KEY is null

      } finally {
        await sandbox.cleanup()
      }
    },
  )
})
