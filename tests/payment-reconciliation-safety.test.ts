import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  createAvailabilitySlot,
  createPendingBooking,
  getBookingById,
  markBookingPaymentFailed,
  reconcileRevolutPaymentNotification,
} from '@/lib/server/db'
import { extractAmountFromNotification, reconcilePaymentNotification } from '@/lib/server/payment-reconciliation'
import { listSmsQueue } from '@/lib/server/phone-agent-store'
import { createLocalDataSandbox } from '@/scripts/lib/local-data-sandbox'
import { NextRequest } from 'next/server'
import { POST as postPaymentNotification } from '@/app/api/phone-agent/payment-notification/route'

function withEnv(overrides: Record<string, string | null>, run: () => Promise<void>) {
  const previous = new Map<string, string | undefined>()
  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, process.env[key])
    if (value === null) delete process.env[key]
    else process.env[key] = value
  }
  return run().finally(() => {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })
}

test('Revolut reconciliation requires a transaction ID and atomically claims concurrent duplicates', async () => {
  const sandbox = await createLocalDataSandbox('payment-reconciliation-safety', process.cwd())
  try {
    await withEnv({ APP_DATA_MODE: 'local', SMS_PROVIDER: 'phone_agent' }, async () => {
      await createAvailabilitySlot('2030-03-12', '11:00')
      const created = await createPendingBooking({
        ownerName: 'Jan Kowalski',
        serviceType: 'szybka-konsultacja-15-min',
        problemType: 'agresja',
        animalType: 'Pies',
        petAge: '2 lata',
        durationNotes: 'Test',
        description: 'Test bez danych produkcyjnych.',
        phone: '600700800',
        email: 'jan@example.com',
        slotId: '2030-03-12-11:00',
      })
      const payload = {
        packageName: 'com.revolut.revolut',
        title: 'Otrzymałeś 79,00 zł',
        text: 'Wpływ 79,00 zł ' + created.booking.id,
        transactionId: 'revolut-concurrent-transaction-0001',
      }

      const surnameOnly = await reconcilePaymentNotification({
        ...payload,
        transactionId: 'revolut-surname-only-transaction-0002',
        text: 'Wpływ 79,00 zł od Kowalski',
      })
      assert.equal(surnameOnly.matched, false)
      assert.equal(surnameOnly.requiresManualReview, true)

      for (const text of [
        created.booking.id + ' 11111111-1111-4111-8111-111111111111',
        'telefon 600700800 lub 700800900',
        'telefon 99600700800',
      ]) {
        const ambiguous = await reconcilePaymentNotification({ ...payload, text })
        assert.equal(ambiguous.matched, false)
        assert.equal(ambiguous.requiresManualReview, true)
      }

      const [first, second] = await Promise.all([
        reconcilePaymentNotification(payload),
        reconcilePaymentNotification(payload),
      ])
      assert.equal([first, second].filter((result) => result.matched).length, 1)
      assert.equal([first, second].filter((result) => !result.matched && result.requiresManualReview).length, 1)

      const paid = await getBookingById(created.booking.id)
      assert.equal(paid?.paymentStatus, 'paid')
      assert.match(paid?.paymentReference ?? '', /^revolut:[0-9a-f]{64}$/)
      assert.equal((await listSmsQueue()).filter((item) => item.bookingId === created.booking.id).length, 1)

      await assert.rejects(
        reconcileRevolutPaymentNotification('revolut:not-a-valid-fingerprint', created.booking.id, 79),
        /Nieprawidłowy odcisk/,
      )
      await assert.rejects(
        reconcileRevolutPaymentNotification('revolut:' + 'a'.repeat(64), created.booking.id, Number.NaN),
        /Nieprawidłowa kwota/,
      )
      assert.equal(
        await reconcileRevolutPaymentNotification('revolut:' + 'b'.repeat(64), created.booking.id, 79.01),
        null,
      )
    })
  } finally {
    await sandbox.cleanup()
  }
})

test('two different Revolut fingerprints cannot credit one booking or enqueue a second SMS', async () => {
  const sandbox = await createLocalDataSandbox('payment-reconciliation-two-fingerprints', process.cwd())
  try {
    await withEnv({ APP_DATA_MODE: 'local', SMS_PROVIDER: 'phone_agent', CUSTOMER_EMAIL_MODE: 'disabled' }, async () => {
      const slot = await createAvailabilitySlot('2030-03-13', '11:00')
      const created = await createPendingBooking({
        ownerName: 'Jan Kowalski', serviceType: 'szybka-konsultacja-15-min', problemType: 'agresja', animalType: 'Pies',
        petAge: '2 lata', durationNotes: 'Test', description: 'Test bez danych produkcyjnych.', phone: '600700801',
        email: 'jan2@example.com', slotId: slot.id,
      })
      const payload = (transactionId: string) => ({
        packageName: 'com.revolut.revolut', title: 'Otrzymałeś 79,00 zł',
        text: `Wpływ 79,00 zł ${created.booking.id}`, transactionId,
      })

      const [first, second] = await Promise.all([
        reconcilePaymentNotification(payload('revolut-two-fingerprint-transaction-0001')),
        reconcilePaymentNotification(payload('revolut-two-fingerprint-transaction-0002')),
      ])
      assert.equal([first, second].filter((result) => result.matched).length, 1)
      assert.equal([first, second].filter((result) => !result.matched && result.requiresManualReview).length, 1)
      assert.equal((await listSmsQueue()).filter((item) => item.bookingId === created.booking.id).length, 1)
    })
  } finally {
    await sandbox.cleanup()
  }
})

test('cancelled or wrong-amount bookings stay outside the automatic Revolut CAS', async () => {
  const sandbox = await createLocalDataSandbox('payment-reconciliation-cas', process.cwd())
  try {
    await withEnv({ APP_DATA_MODE: 'local', SMS_PROVIDER: 'phone_agent', CUSTOMER_EMAIL_MODE: 'disabled' }, async () => {
      const slot = await createAvailabilitySlot('2030-03-14', '11:00')
      const created = await createPendingBooking({
        ownerName: 'Jan Kowalski', serviceType: 'szybka-konsultacja-15-min', problemType: 'agresja', animalType: 'Pies',
        petAge: '2 lata', durationNotes: 'Test', description: 'Test bez danych produkcyjnych.', phone: '600700802',
        email: 'jan3@example.com', slotId: slot.id,
      })
      const wrongAmount = await reconcilePaymentNotification({
        packageName: 'com.revolut.revolut', title: 'Otrzymałeś 104,00 zł',
        text: `Wpływ 104,00 zł ${created.booking.id}`, transactionId: 'revolut-wrong-amount-transaction-0001',
      })
      assert.equal(wrongAmount.matched, false)
      assert.equal((await getBookingById(created.booking.id))?.paymentStatus, 'unpaid')

      await markBookingPaymentFailed(created.booking.id)
      const cancelled = await reconcilePaymentNotification({
        packageName: 'com.revolut.revolut', title: 'Otrzymałeś 79,00 zł',
        text: `Wpływ 79,00 zł ${created.booking.id}`, transactionId: 'revolut-cancelled-transaction-0001',
      })
      assert.equal(cancelled.matched, false)
      const preserved = await getBookingById(created.booking.id)
      assert.equal(preserved?.bookingStatus, 'cancelled')
      assert.equal(preserved?.paymentStatus, 'failed')
      assert.equal((await listSmsQueue()).filter((item) => item.bookingId === created.booking.id).length, 0)
    })
  } finally {
    await sandbox.cleanup()
  }
})

test('missing Supabase configuration fails closed at the phone route and requires manual review', async () => {
  await withEnv({
    APP_DATA_MODE: 'supabase',
    PHONE_AGENT_TOKEN: 'payment-route-test-token',
    PHONE_AGENT_AUTO_PAYMENT_RECONCILIATION: 'true',
    NEXT_PUBLIC_SUPABASE_URL: null,
    SUPABASE_SERVICE_ROLE_KEY: null,
  }, async () => {
    const response = await postPaymentNotification(new NextRequest('http://localhost/api/phone-agent/payment-notification', {
      method: 'POST',
      headers: { Authorization: 'Bearer payment-route-test-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        packageName: 'com.revolut.revolut', title: 'Otrzymałeś 79,00 zł', text: 'Wpływ 79,00 zł',
        transactionId: 'revolut-missing-migration-transaction-0001',
      }),
    }))
    assert.equal(response.status, 503)
    const body = await response.json()
    assert.equal(body.requiresManualReview, true)
    assert.equal('detail' in body, false)
  })
})

test('Revolut amounts reject ambiguity and incomplete number matches', () => {
  assert.equal(extractAmountFromNotification('Wpływ 79,00 zł', '79.00 PLN'), 79)
  assert.equal(extractAmountFromNotification('Wpływ 79 PLN', '104 PLN'), null)
  assert.equal(extractAmountFromNotification('Wpływ 1,079.00 PLN', ''), null)
  assert.equal(extractAmountFromNotification('Wpływ 1 079,00 PLN', ''), 1079)
  assert.equal(extractAmountFromNotification('Wpływ 79 EUR', ''), null)
})
