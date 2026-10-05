import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createAvailabilitySlot, createPendingBooking, getBookingById } from '@/lib/server/db'
import { extractAmountFromNotification, reconcilePaymentNotification } from '@/lib/server/payment-reconciliation'
import { createLocalDataSandbox } from '@/scripts/lib/local-data-sandbox'

function withEnv(overrides: Record<string, string>, run: () => Promise<void>) {
  const previous = new Map<string, string | undefined>()
  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, process.env[key])
    process.env[key] = value
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
    })
  } finally {
    await sandbox.cleanup()
  }
})

test('Revolut amounts reject ambiguity and incomplete number matches', () => {
  assert.equal(extractAmountFromNotification('Wpływ 79,00 zł', '79.00 PLN'), 79)
  assert.equal(extractAmountFromNotification('Wpływ 79 PLN', '104 PLN'), null)
  assert.equal(extractAmountFromNotification('Wpływ 1,079.00 PLN', ''), null)
  assert.equal(extractAmountFromNotification('Wpływ 1 079,00 PLN', ''), 1079)
  assert.equal(extractAmountFromNotification('Wpływ 79 EUR', ''), null)
})
