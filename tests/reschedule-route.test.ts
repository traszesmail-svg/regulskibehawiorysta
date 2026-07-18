import assert from 'node:assert/strict'
import { test } from 'node:test'
import { POST as postReschedule } from '@/app/api/bookings/[id]/reschedule/route'
import { createAvailabilitySlot, createPendingBooking } from '@/lib/server/local-store'
import { sendRescheduleRequestEmail } from '@/lib/server/notifications'
import { createLocalDataSandbox } from '@/scripts/lib/local-data-sandbox'

function withEnv(overrides: Record<string, string | null | undefined>, run: () => void | Promise<void>) {
  const previous = new Map<string, string | undefined>()

  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, process.env[key])
    if (typeof value === 'string') {
      process.env[key] = value
    } else {
      delete process.env[key]
    }
  }

  const restore = () => {
    for (const [key, value] of previous.entries()) {
      if (typeof value === 'string') {
        process.env[key] = value
      } else {
        delete process.env[key]
      }
    }
  }

  const result = run()
  if (result && typeof (result as Promise<void>).then === 'function') {
    return (result as Promise<void>).finally(restore)
  }

  restore()
}

test('reschedule request does not report success when administrator delivery is skipped', async () => {
  const sandbox = await createLocalDataSandbox('reschedule-route', process.cwd())

  try {
    await withEnv(
      {
        APP_DATA_MODE: 'local',
        CUSTOMER_EMAIL_MODE: 'disabled',
        MAIL_PROVIDER: 'resend',
        RESEND_API_KEY: null,
        ADMIN_NOTIFICATION_EMAIL: 'kontakt@regulskibehawiorysta.pl',
        REGULSKI_CONTACT_EMAIL: 'kontakt@regulskibehawiorysta.pl',
      },
      async () => {
        const bookingDate = '2030-03-12'
        await createAvailabilitySlot(bookingDate, '10:00')
        const created = await createPendingBooking({
          ownerName: 'Klient Testowy',
          serviceType: 'szybka-konsultacja-15-min',
          problemType: 'separacja',
          animalType: 'Pies',
          petAge: '4 lata',
          durationNotes: 'Test trasy zmiany terminu',
          description: 'Proszę o zmianę terminu na późniejszy.',
          email: 'klient@example.com',
          slotId: `${bookingDate}-10:00`,
        })

        const response = await postReschedule(
          new Request(`https://example.test/api/bookings/${created.booking.id}/reschedule?access=${created.accessToken}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ reason: 'Nie mogę być o tej godzinie.' }),
          }),
          { params: Promise.resolve({ id: created.booking.id }) },
        )
        const payload = (await response.json()) as { error?: string }

        assert.equal(response.status, 503)
        assert.match(payload.error ?? '', /Nie możemy teraz przekazać prośby/i)
      },
    )
  } finally {
    await sandbox.cleanup()
  }
})

test('administrator reschedule email escapes the customer address in its mailto link', async () => {
  const sentEmails: Array<{ html?: string }> = []
  const originalFetch = globalThis.fetch

  try {
    const mockFetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
      sentEmails.push(typeof init?.body === 'string' ? JSON.parse(init.body) : {})
      return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
    }

    ;(globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = mockFetch as typeof fetch

    await withEnv(
      {
        MAIL_PROVIDER: 'resend',
        RESEND_API_KEY: 're_test_key',
        ADMIN_NOTIFICATION_EMAIL: 'kontakt@regulskibehawiorysta.pl',
      },
      async () => {
        const result = await sendRescheduleRequestEmail(
          {
            id: 'reschedule-escape-test',
            ownerName: 'Anna',
            serviceType: 'szybka-konsultacja-15-min',
            amount: 69,
            problemType: 'inne',
            animalType: 'Pies',
            petAge: '',
            durationNotes: '',
            description: '',
            email: 'klient"&@example.com',
            phone: '',
            bookingDate: '2030-03-12',
            bookingTime: '10:00',
            slotId: '',
            bookingStatus: 'pending',
            paymentStatus: 'unpaid',
            meetingUrl: '',
            createdAt: '2030-03-01T12:00:00.000Z',
            updatedAt: '2030-03-01T12:00:00.000Z',
          },
          'Proszę o inny termin.',
        )

        assert.equal(result.status, 'sent')
      },
    )

    assert.equal(sentEmails.length, 1)
    assert.match(sentEmails[0].html ?? '', /mailto:klient&quot;&amp;@example\.com/)
    assert.doesNotMatch(sentEmails[0].html ?? '', /mailto:klient"&@example\.com/)
  } finally {
    ;(globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = originalFetch
  }
})
