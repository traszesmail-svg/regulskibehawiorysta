import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  consumeConsultationAccessCode,
  createAvailabilitySlot,
  createPendingBooking,
  getConsultationAccessByCode,
  issueConsultationAccessCode,
  listAvailabilityAdmin,
  markBookingDone,
  markBookingPaid,
} from '@/lib/server/db'
import { POST as createBooking } from '@/app/api/bookings/route'
import { createLocalDataSandbox } from '@/scripts/lib/local-data-sandbox'

function withEnv(overrides: Record<string, string | null | undefined>, run: () => void | Promise<void>) {
  const previous = new Map<string, string | undefined>()
  const restore = () => {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }

  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, process.env[key])
    if (value === undefined || value === null) delete process.env[key]
    else process.env[key] = value
  }

  const result = run()
  return result && typeof (result as Promise<void>).then === 'function'
    ? (result as Promise<void>).finally(restore)
    : restore()
}

test('Kod konsultacji otwiera jeden przypisany termin i wygasa po uzyciu', async () => {
  await withEnv(
    {
      APP_DATA_MODE: 'local',
      CUSTOMER_EMAIL_MODE: 'disabled',
      ADMIN_NOTIFICATION_EMAIL: null,
    },
    async () => {
      const sandbox = await createLocalDataSandbox('consultation-access', process.cwd())

      try {
        await createAvailabilitySlot('2030-01-15', '11:00')
        const slot = (await listAvailabilityAdmin()).find(
          (item) => item.bookingDate === '2030-01-15' && item.bookingTime === '11:00',
        )
        assert.ok(slot)

        const created = await createPendingBooking({
          ownerName: 'Test konsultacja',
          serviceType: 'szybka-konsultacja-15-min',
          consultationMode: 'phone',
          problemType: 'inne',
          animalType: 'Pies',
          petAge: '3 lata',
          durationNotes: '',
          description: 'Opis fikcyjnego problemu do testu bramki konsultacji.',
          phone: '+48600700801',
          email: 'consultation-access@example.com',
          slotId: slot.id,
        })
        const paid = await markBookingPaid(created.booking.id, {
          paymentMethod: 'manual',
          consultationMode: 'phone',
        })
        assert.equal(paid?.paymentStatus, 'paid')
        await markBookingDone(created.booking.id, 'Rekomenduję pełną konsultację po tej rozmowie.')

        const issued = await issueConsultationAccessCode(created.booking.id)
        assert.match(issued.code, /^RB-[0-9A-F]{10}$/)
        assert.equal(issued.booking.id, created.booking.id)

        const available = await getConsultationAccessByCode(issued.code.toLowerCase())
        assert.equal(available?.id, created.booking.id)
        assert.equal(await getConsultationAccessByCode('RB-NOT-A-REAL-CODE'), null)

        const fullBookingPayload = {
          ownerName: 'Test konsultacja',
          problemType: 'inne',
          animalType: 'Pies',
          petAge: '3 lata',
          durationNotes: '',
          description: 'Opis fikcyjnego problemu do testu bramki konsultacji.',
          email: 'consultation-access@example.com',
          slotId: slot.id,
          serviceType: 'konsultacja-behawioralna-online',
          consentTerms: true,
          consentEarlyStart: true,
        }
        const withoutCode = await createBooking(new Request('http://localhost/api/bookings', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(fullBookingPayload),
        }))
        assert.equal(withoutCode.status, 403)
        const wrongEmail = await createBooking(new Request('http://localhost/api/bookings', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ...fullBookingPayload, email: 'another@example.com', consultationAccessCode: issued.code }),
        }))
        assert.equal(wrongEmail.status, 403)

        const consumed = await consumeConsultationAccessCode(issued.code)
        assert.equal(consumed?.id, created.booking.id)
        assert.equal(await getConsultationAccessByCode(issued.code), null)
        assert.equal(await consumeConsultationAccessCode(issued.code), null)
      } finally {
        await sandbox.cleanup()
      }
    },
  )
})
