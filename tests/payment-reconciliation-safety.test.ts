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
import { reconcileCommercePaymentNotification } from '@/lib/server/payment-reconciliation'
import { createCommerceOrder, getCommerceOrder, prepareCommerceManualPayment } from '@/lib/server/commerce-store'
import { listSmsQueue } from '@/lib/server/phone-agent-store'
import { createLocalDataSandbox } from '@/scripts/lib/local-data-sandbox'
import { NextRequest } from 'next/server'
import { POST as postPaymentNotification } from '@/app/api/phone-agent/payment-notification/route'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

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

test('Revolut PDF reconciliation atomically accepts one notification and one transaction per order', async () => {
  const sandbox = await createLocalDataSandbox('commerce-revolut-auto', process.cwd())
  try {
    await withEnv({ APP_DATA_MODE: 'local', CUSTOMER_EMAIL_MODE: 'disabled', RESEND_API_KEY: null }, async () => {
      const created = await createCommerceOrder({
        customerEmail: 'pdf-owner@example.invalid', customerName: 'Odbiorca PDF', customerPhone: null,
        productType: 'ebook', productId: 'pies-reaktywny-na-spacerze', productName: 'Pies reaktywny na spacerze',
        amount: 19, onlineAmount: 19, manualAmount: 19,
        meta: { productKind: 'guide', productSlug: 'pies-reaktywny-na-spacerze' },
      })
      await prepareCommerceManualPayment(created.orderNumber)
      const payload = {
        packageName: 'com.revolut.revolut',
        title: 'Otrzymałeś 19,00 zł',
        text: `Wpływ 19,00 zł ${created.orderNumber}`,
        transactionId: 'revolut-pdf-order-transaction-0001',
      }
      const [sameFirst, sameRetry] = await Promise.all([
        reconcileCommercePaymentNotification(payload),
        reconcileCommercePaymentNotification(payload),
      ])
      assert.equal([sameFirst, sameRetry].filter((result) => result.matched).length, 1)
      assert.equal([sameFirst, sameRetry].filter((result) => !result.matched).length, 1)
      const fulfilled = await getCommerceOrder(created.orderNumber)
      assert.equal(fulfilled?.status, 'access_sent')
      assert.equal(fulfilled?.paymentMethod, 'blik_phone')
      assert.equal(fulfilled?.providerPaymentId?.startsWith('revolut:'), true)
      assert.equal(fulfilled?.manualPaymentAdminNotificationState, null)
      assert.ok(fulfilled?.accessCode)
      assert.equal((await listSmsQueue()).length, 0, 'PDF reconciliation cannot send SMS')

      const secondCreated = await createCommerceOrder({
        customerEmail: 'pdf-second@example.invalid', customerName: 'Second PDF', customerPhone: null,
        productType: 'ebook', productId: 'pies-reaktywny-na-spacerze', productName: 'Pies reaktywny na spacerze',
        amount: 19, onlineAmount: 19, manualAmount: 19,
        meta: { productKind: 'guide', productSlug: 'pies-reaktywny-na-spacerze' },
      })
      await prepareCommerceManualPayment(secondCreated.orderNumber)
      const secondBase = { ...payload, text: payload.text.replace(created.orderNumber, secondCreated.orderNumber) }
      const [differentFirst, differentSecond] = await Promise.all([
        reconcileCommercePaymentNotification({ ...secondBase, transactionId: 'revolut-pdf-order-transaction-0002' }),
        reconcileCommercePaymentNotification({ ...secondBase, transactionId: 'revolut-pdf-order-transaction-0003' }),
      ])
      assert.equal([differentFirst, differentSecond].filter((result) => result.matched).length, 1)
      assert.equal([differentFirst, differentSecond].filter((result) => !result.matched).length, 1)
      const secondFulfilled = await getCommerceOrder(secondCreated.orderNumber)
      assert.equal(secondFulfilled?.status, 'access_sent')
      assert.ok(secondFulfilled?.providerPaymentId?.startsWith('revolut:'))
      assert.equal((await listSmsQueue()).length, 0, 'Two transaction IDs cannot add SMS')
    })
  } finally {
    await sandbox.cleanup()
  }
})

test('phone payment route atomically grants one local PDF access for a Revolut notification', async () => {
  const sandbox = await createLocalDataSandbox('commerce-revolut-route', process.cwd())
  try {
    await withEnv({
      APP_DATA_MODE: 'local',
      CUSTOMER_EMAIL_MODE: 'disabled',
      RESEND_API_KEY: null,
      PHONE_AGENT_TOKEN: 'commerce-route-test-token',
      PHONE_AGENT_AUTO_PAYMENT_RECONCILIATION: 'true',
    }, async () => {
      const created = await createCommerceOrder({
        customerEmail: 'route-pdf@example.invalid', customerName: 'Route PDF', customerPhone: null,
        productType: 'ebook', productId: 'pies-reaktywny-na-spacerze', productName: 'Pies reaktywny na spacerze',
        amount: 19, onlineAmount: 19, manualAmount: 19,
        meta: { productKind: 'guide', productSlug: 'pies-reaktywny-na-spacerze' },
      })
      await prepareCommerceManualPayment(created.orderNumber)

      const transactionId = 'revolut-pdf-route-transaction-0001'
      const expectedFingerprint = 'revolut:' + createHash('sha256').update(transactionId).digest('hex')
      const body = {
        packageName: 'com.revolut.revolut',
        title: 'Otrzymałeś 19,00 zł',
        text: `Wpływ 19,00 zł ${created.orderNumber}`,
        transactionId,
      }
      const request = () => new NextRequest('http://localhost/api/phone-agent/payment-notification', {
        method: 'POST',
        headers: { Authorization: 'Bearer commerce-route-test-token', 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const firstResponse = await postPaymentNotification(request())
      assert.equal(firstResponse.status, 200)
      const firstPayload = await firstResponse.json()
      assert.equal(firstPayload.ok, true)
      assert.equal(firstPayload.result.matched, true)

      const firstOrder = await getCommerceOrder(created.orderNumber)
      assert.equal(firstOrder?.status, 'access_sent')
      assert.equal(firstOrder?.providerPaymentId, expectedFingerprint)
      assert.equal(firstOrder?.manualPaymentAdminNotificationState, null)
      const accessCode = firstOrder?.accessCode
      assert.ok(accessCode)
      assert.equal((await listSmsQueue()).length, 0, 'PDF route must not enqueue SMS')

      const retryResponse = await postPaymentNotification(request())
      assert.equal(retryResponse.status, 200)
      const retryPayload = await retryResponse.json()
      assert.equal(retryPayload.ok, false)
      const retryOrder = await getCommerceOrder(created.orderNumber)
      assert.equal(retryOrder?.status, 'access_sent')
      assert.equal(retryOrder?.providerPaymentId, expectedFingerprint)
      assert.equal(retryOrder?.accessCode, accessCode)
      assert.equal((await listSmsQueue()).length, 0, 'Identical retry must not enqueue SMS')
    })
  } finally {
    await sandbox.cleanup()
  }
})

test('commerce Revolut migration keeps fingerprint and order claims in one RPC', async () => {
  const migration = await readFile(
    path.join(process.cwd(), 'supabase', 'migrations', '20261014001_atomic_revolut_commerce_reconciliation.sql'),
    'utf8',
  )
  assert.match(migration, /notification_fingerprint text primary key/i)
  assert.match(migration, /order_id uuid not null unique/i)
  assert.match(migration, /create or replace function public\.reconcile_revolut_commerce_payment_notification\(/i)
  assert.match(migration, /p_access_code text/i)
  assert.match(migration, /p_fingerprint is null or p_fingerprint !~/i)
  assert.match(migration, /p_access_code is null or p_access_code !~/i)
  assert.match(migration, /v_meta->>'manualAmount' is null/i)
  assert.ok(
    migration.indexOf("v_meta := v_order.admin_notes::jsonb") <
      migration.indexOf("if v_meta->>'manualAmount' is null"),
    'manualAmount must be checked only after parsing the order metadata',
  )
  assert.ok(
    migration.indexOf("if v_meta->>'manualAmount' is null") <
      migration.indexOf("if (v_meta->>'manualAmount')::numeric <> p_amount"),
    'manualAmount must be required before comparing it with the notification amount',
  )
  assert.match(migration, /\^KOD-\[0-9A-F\]\{4\}-\[0-9A-F\]\{2\}\$/)
  assert.match(migration, /for update/i)
  assert.match(migration, /on conflict do nothing/i)
  assert.match(migration, /providerPaymentId/i)
  assert.match(migration, /revoke all on function public\.reconcile_revolut_commerce_payment_notification\(text, text, numeric, text\)/i)
  assert.match(migration, /grant execute on function public\.reconcile_revolut_commerce_payment_notification\(text, text, numeric, text\)[\s\S]*to service_role/i)
})

test('global Revolut migration blocks a fingerprint from crossing booking and PDF ledgers', async () => {
  const migration = await readFile(
    path.join(process.cwd(), 'supabase', 'migrations', '20261014002_global_revolut_fingerprint_claim.sql'),
    'utf8',
  )
  assert.match(migration, /revolut_notification_fingerprint_claims\s*\([\s\S]*notification_fingerprint text primary key/i)
  assert.match(migration, /join public\.revolut_commerce_payment_reconciliation_claims c using \(notification_fingerprint\)/i)
  assert.match(migration, /from public\.revolut_payment_reconciliation_claims/i)
  assert.match(migration, /from public\.revolut_commerce_payment_reconciliation_claims/i)
  assert.match(migration, /create or replace function public\.claim_global_revolut_notification_fingerprint\(\)/i)
  assert.match(migration, /before insert on public\.revolut_payment_reconciliation_claims/i)
  assert.match(migration, /before insert on public\.revolut_commerce_payment_reconciliation_claims/i)
  assert.match(migration, /on conflict \(notification_fingerprint\) do nothing/i)
  assert.match(migration, /if v_inserted = 0 then[\s\S]*return null/i)
  assert.match(migration, /enable row level security/i)
  assert.match(migration, /revoke all on table public\.revolut_notification_fingerprint_claims from public, anon, authenticated/i)
})
