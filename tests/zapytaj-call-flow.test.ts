import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createAvailabilitySlot, getBookingById, listAvailabilityAdmin, markBookingPaid, updateBookingCallState } from '@/lib/server/db'
import { triggerZapytajCall } from '@/lib/server/zapytaj-call'
import { POST as zadarmaWebhook } from '@/app/api/zadarma/webhook/route'
import { GET as zadarmaCron } from '@/app/api/zadarma/cron/route'
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
  return result && typeof (result as Promise<void>).then === 'function' ? (result as Promise<void>).finally(restore) : restore()
}

test('Zapytaj telefon wykonuje dwie proby i udostepnia jeden termin odzyskiwania', async () => {
  await withEnv(
    {
      APP_DATA_MODE: 'local',
      CUSTOMER_EMAIL_MODE: 'disabled',
      ADMIN_NOTIFICATION_EMAIL: null,
      ZADARMA_USER_KEY: 'user-test',
      ZADARMA_SECRET_KEY: 'secret-test',
      ZADARMA_BEHAWIORYSTA_SIP: 'sip-test',
      CRON_SECRET: 'cron-test-secret',
    },
    async () => {
      const sandbox = await createLocalDataSandbox('zapytaj-call-flow', process.cwd())
      const originalFetch = globalThis.fetch
      let callbackCount = 0

      ;(globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = (async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('api.zadarma.com/v1/request/callback/')) {
          callbackCount += 1
          return new Response(JSON.stringify({ status: 'success', call_id: `test-call-${callbackCount}` }), { status: 200 })
        }
        if (url.includes('api.zadarma.com/v1/pbx/hangup/')) {
          return new Response(JSON.stringify({ status: 'success' }), { status: 200 })
        }
        return new Response('{}', { status: 200 })
      }) as typeof fetch

      try {
        await createAvailabilitySlot('2030-01-15', '10:00')
        const slot = (await listAvailabilityAdmin()).find((item) => item.bookingDate === '2030-01-15' && item.bookingTime === '10:00')
        assert.ok(slot)

        const { createPendingBooking } = await import('@/lib/server/db')
        const created = await createPendingBooking({
          ownerName: 'Test Zapytaj',
          serviceType: 'szybka-konsultacja-15-min',
          consultationMode: 'phone',
          problemType: 'inne',
          animalType: 'Pies',
          petAge: '2 lata',
          durationNotes: 'test',
          description: 'Pies szczeka i trudno go wyciszyć w domu.',
          phone: '+48600700800',
          email: 'zapytaj-test@example.com',
          slotId: slot.id,
        })
        let booking = await markBookingPaid(created.booking.id, { paymentMethod: 'manual', consultationMode: 'phone' })
        assert.ok(booking)
        assert.equal(booking.questionsRemaining, 2)

        const first = await triggerZapytajCall(booking!, { force: true })
        assert.equal(first.status, 'started')
        assert.equal(first.attempt, 1)

        let current = await getBookingById(created.booking.id)
        assert.equal(current?.callStatus, 'calling')
        assert.equal(current?.callAttempt, 1)

        const firstEnd = new FormData()
        firstEnd.set('event', 'NO_ANSWER')
        firstEnd.set('call_id', 'test-call-1')
        await zadarmaWebhook(new Request('http://localhost/api/zadarma/webhook', { method: 'POST', body: firstEnd }))
        current = await getBookingById(created.booking.id)
        assert.equal(current?.callStatus, 'retry_scheduled')
        assert.equal(current?.callAttempt, 1)

        await updateBookingCallState(created.booking.id, { callNextAttemptAt: new Date(Date.now() - 1_000).toISOString() })
        await zadarmaCron(new Request('http://localhost/api/zadarma/cron', { headers: { authorization: 'Bearer cron-test-secret' } }) as never)
        current = await getBookingById(created.booking.id)
        assert.equal(current?.callStatus, 'calling_retry')
        assert.equal(current?.callAttempt, 2)
        assert.equal(callbackCount, 2)

        const secondEnd = new FormData()
        secondEnd.set('event', 'END')
        secondEnd.set('call_id', 'test-call-2')
        await zadarmaWebhook(new Request('http://localhost/api/zadarma/webhook', { method: 'POST', body: secondEnd }))
        await updateBookingCallState(created.booking.id, { callNextAttemptAt: new Date(Date.now() - 1_000).toISOString() })
        await zadarmaCron(new Request('http://localhost/api/zadarma/cron', { headers: { authorization: 'Bearer cron-test-secret' } }) as never)

        current = await getBookingById(created.booking.id)
        assert.equal(current?.callStatus, 'additional_slot_available')
        assert.equal(current?.callRecoveryUsed, false)
        assert.ok(current?.callRecoveryTokenHash)
        assert.ok(current?.callRecoveryExpiresAt)
      } finally {
        ;(globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = originalFetch
        await sandbox.cleanup()
      }
    },
  )
})
