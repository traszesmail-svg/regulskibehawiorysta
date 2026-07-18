import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import {
  buildCommerceBlikHref,
  buildCommerceCheckoutHref,
  buildCommerceOrderStatusHref,
  buildCommerceWaitingHref,
} from '@/lib/commerce'
import { POST as postCommercePaymentReport } from '@/app/api/orders/[orderNumber]/report-payment/route'
import {
  COMMERCE_MANUAL_NOTIFICATION_CLAIM_STALE_AFTER_MS,
  claimCommerceManualPaymentAdminNotification,
  completeCommerceManualPaymentAdminNotification,
  createCommerceOrder,
  ensureCommerceOrderViewerToken,
  fulfillCommerceOrder,
  getCommerceOrderForViewer,
  hasCommerceOrderViewerAccess,
  markCommerceManualPaymentBookingPending,
  prepareCommerceManualPayment,
  rejectCommerceManualPayment,
  reportCommerceManualPayment,
} from '@/lib/server/commerce-store'
import { createOrReuseConsultationCommerceOrder } from '@/lib/server/commerce-service'
import { createAvailabilitySlot, createPendingBooking, markBookingExpired } from '@/lib/server/db'

function readSource(...parts: string[]) {
  return readFileSync(path.join(process.cwd(), ...parts), 'utf8')
}

async function withLocalCommerceStore(run: () => Promise<void>) {
  const sandboxDir = await mkdtemp(path.join(os.tmpdir(), 'regulski-commerce-security-'))
  const previousDataMode = process.env.APP_DATA_MODE
  const previousDataDir = process.env.APP_LOCAL_DATA_DIR
  const previousCustomerEmailMode = process.env.CUSTOMER_EMAIL_MODE

  process.env.APP_DATA_MODE = 'local'
  process.env.APP_LOCAL_DATA_DIR = sandboxDir
  process.env.CUSTOMER_EMAIL_MODE = 'disabled'

  try {
    await run()
  } finally {
    if (typeof previousDataMode === 'string') {
      process.env.APP_DATA_MODE = previousDataMode
    } else {
      delete process.env.APP_DATA_MODE
    }

    if (typeof previousDataDir === 'string') {
      process.env.APP_LOCAL_DATA_DIR = previousDataDir
    } else {
      delete process.env.APP_LOCAL_DATA_DIR
    }

    if (typeof previousCustomerEmailMode === 'string') {
      process.env.CUSTOMER_EMAIL_MODE = previousCustomerEmailMode
    } else {
      delete process.env.CUSTOMER_EMAIL_MODE
    }

    await rm(sandboxDir, { recursive: true, force: true })
  }
}

async function createTestOrder() {
  return createCommerceOrder({
    customerEmail: `commerce-security-${Date.now()}@example.com`,
    customerName: 'Kontrola BLIK',
    productType: 'ebook',
    productId: `security-${randomUUID()}`,
    productName: 'Materiał kontrolny',
    amount: 69,
  })
}

test('buyer order links require a high-entropy per-order viewer capability', async () => {
  await withLocalCommerceStore(async () => {
    const order = await createTestOrder()

    assert.match(order.viewerToken, /^[A-Za-z0-9_-]{40,}$/)
    assert.equal(hasCommerceOrderViewerAccess(order, order.viewerToken), true)
    assert.equal(hasCommerceOrderViewerAccess(order, `${order.viewerToken}x`), false)
    assert.equal(hasCommerceOrderViewerAccess(order, order.orderNumber), false)
    assert.ok(await getCommerceOrderForViewer(order.orderNumber, order.viewerToken))
    assert.equal(await getCommerceOrderForViewer(order.orderNumber, order.orderNumber), null)
    assert.equal(await getCommerceOrderForViewer(order.orderNumber, null), null)
    assert.equal(await reportCommerceManualPayment(order.orderNumber, order.orderNumber), null)

    const unchanged = await getCommerceOrderForViewer(order.orderNumber, order.viewerToken)
    assert.equal(unchanged?.status, 'created')

    for (const href of [
      buildCommerceCheckoutHref(order.orderNumber, order.viewerToken),
      buildCommerceBlikHref(order.orderNumber, order.viewerToken),
      buildCommerceWaitingHref(order.orderNumber, order.viewerToken),
      buildCommerceOrderStatusHref(order.orderNumber, order.viewerToken),
    ]) {
      const url = new URL(href, 'https://regulskibehawiorysta.pl')
      assert.equal(url.searchParams.get('viewer'), order.viewerToken)
    }
  })
})

test('legacy order viewer tokens can only be reissued from an authenticated owner path', async () => {
  await withLocalCommerceStore(async () => {
    const order = await createTestOrder()
    order.viewerToken = ''

    const migrated = await ensureCommerceOrderViewerToken(order)
    assert.match(migrated.viewerToken, /^[A-Za-z0-9_-]{40,}$/)
    assert.ok(await getCommerceOrderForViewer(migrated.orderNumber, migrated.viewerToken))
  })

  const migrationRoute = readSource('app', 'api', 'admin', 'orders', '[orderNumber]', 'viewer-link', 'route.ts')
  assert.match(migrationRoute, /hasValidAdminAuthorization/)
  assert.match(migrationRoute, /getAdminAuthChallengeHeaders/)
  assert.match(migrationRoute, /ensureCommerceOrderViewerToken/)
  assert.match(migrationRoute, /buildCommerceCheckoutHref/)
})

test('manual BLIK report is idempotent and cannot roll back terminal order states', async () => {
  await withLocalCommerceStore(async () => {
    const order = await createTestOrder()
    const reports = await Promise.all([
      reportCommerceManualPayment(order.orderNumber, order.viewerToken),
      reportCommerceManualPayment(order.orderNumber, order.viewerToken),
    ])

    assert.equal(reports.filter((report) => report?.reportedNow).length, 1)
    assert.equal(reports.every((report) => report?.order.status === 'payment_reported'), true)

    const paid = await fulfillCommerceOrder(order.orderNumber, 'blik_phone')
    assert.equal(paid?.status, 'access_sent')

    const afterPaid = await reportCommerceManualPayment(order.orderNumber, order.viewerToken)
    assert.equal(afterPaid?.reportedNow, false)
    assert.equal(afterPaid?.order.status, 'access_sent')

    const cancelled = await createTestOrder()
    const rejected = await rejectCommerceManualPayment(cancelled.orderNumber)
    assert.equal(rejected?.status, 'cancelled')

    const afterCancelled = await reportCommerceManualPayment(cancelled.orderNumber, cancelled.viewerToken)
    assert.equal(afterCancelled?.reportedNow, false)
    assert.equal(afterCancelled?.order.status, 'cancelled')
  })
})

test('expired consultation cannot be reported as a new or legacy manual BLIK payment', async () => {
  await withLocalCommerceStore(async () => {
    const bookingDate = '2030-01-15'
    const scenarios = [
      { bookingTime: '10:00', expectedStatus: 'created' as const },
      { bookingTime: '10:30', expectedStatus: 'waiting_manual_payment' as const },
    ]

    for (const scenario of scenarios) {
      await createAvailabilitySlot(bookingDate, scenario.bookingTime)
      const created = await createPendingBooking({
        ownerName: 'Kontrola wygasłego terminu',
        serviceType: 'szybka-konsultacja-15-min',
        problemType: 'separacja',
        animalType: 'Pies',
        petAge: '2 lata',
        durationNotes: '',
        description: 'Kontrola blokady zgłoszenia po wygaśnięciu terminu.',
        phone: '579163241',
        email: `expired-commerce-${scenario.bookingTime.replace(':', '')}-${Date.now()}@example.com`,
        slotId: `${bookingDate}-${scenario.bookingTime}`,
      })
      const order = await createOrReuseConsultationCommerceOrder(created.booking.id, created.accessToken)

      if (scenario.expectedStatus === 'waiting_manual_payment') {
        assert.equal((await prepareCommerceManualPayment(order.orderNumber))?.status, 'waiting_manual_payment')
      }

      await markBookingExpired(created.booking.id)

      const response = await postCommercePaymentReport(
        new Request(`https://regulskibehawiorysta.pl/api/orders/${encodeURIComponent(order.orderNumber)}/report-payment`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ viewerToken: order.viewerToken }),
        }),
        { params: Promise.resolve({ orderNumber: order.orderNumber }) },
      )
      const payload = (await response.json()) as { error?: string }

      assert.equal(response.status, 409, scenario.expectedStatus)
      assert.match(payload.error ?? '', /Termin rezerwacji nie jest już aktywny/i)
      const unchanged = await getCommerceOrderForViewer(order.orderNumber, order.viewerToken)
      assert.equal(unchanged?.status, scenario.expectedStatus)
      assert.equal(unchanged?.manualPaymentBookingPendingAt, null)
      assert.equal(unchanged?.manualPaymentAdminNotificationState, null)
    }
  })
})

test('manual BLIK reconciliation records booking and notification phases without a duplicate send claim', async () => {
  await withLocalCommerceStore(async () => {
    const order = await createTestOrder()
    const report = await reportCommerceManualPayment(order.orderNumber, order.viewerToken)
    assert.equal(report?.reportedNow, true)
    assert.equal(report?.order.manualPaymentBookingPendingAt, null)
    assert.equal(report?.order.manualPaymentAdminNotificationState, 'pending')

    const bookingMarked = await markCommerceManualPaymentBookingPending(order.orderNumber, order.viewerToken)
    assert.ok(bookingMarked?.manualPaymentBookingPendingAt)

    const claimStart = new Date('2026-07-18T08:00:00.000Z')
    const firstClaim = await claimCommerceManualPaymentAdminNotification(order.orderNumber, order.viewerToken, {
      now: claimStart,
    })
    assert.equal(firstClaim?.shouldSend, true)
    assert.equal(firstClaim?.order.manualPaymentAdminNotificationState, 'sending')

    const duplicateClaim = await claimCommerceManualPaymentAdminNotification(order.orderNumber, order.viewerToken, {
      now: new Date(claimStart.getTime() + COMMERCE_MANUAL_NOTIFICATION_CLAIM_STALE_AFTER_MS - 1),
    })
    assert.equal(duplicateClaim?.shouldSend, false)
    assert.equal(duplicateClaim?.order.manualPaymentAdminNotificationState, 'sending')

    const staleClaim = await claimCommerceManualPaymentAdminNotification(order.orderNumber, order.viewerToken, {
      now: new Date(claimStart.getTime() + COMMERCE_MANUAL_NOTIFICATION_CLAIM_STALE_AFTER_MS + 1),
    })
    assert.equal(staleClaim?.shouldSend, true)

    const completed = await completeCommerceManualPaymentAdminNotification(order.orderNumber, order.viewerToken, {
      status: 'sent',
    })
    assert.equal(completed?.manualPaymentAdminNotificationState, 'sent')
    assert.ok(completed?.manualPaymentAdminNotificationSentAt)

    const afterSentClaim = await claimCommerceManualPaymentAdminNotification(order.orderNumber, order.viewerToken)
    assert.equal(afterSentClaim?.shouldSend, false)
    assert.equal(afterSentClaim?.order.manualPaymentAdminNotificationState, 'sent')
  })
})

test('buyer-facing BLIK routes enforce the viewer token and BLIK GET stays read-only', () => {
  const ordersRoute = readSource('app', 'api', 'orders', 'route.ts')
  const checkoutSource = readSource('app', 'checkout', 'page.tsx')
  const blikSource = readSource('app', 'platnosc', 'blik', '[orderNumber]', 'page.tsx')
  const waitingSource = readSource('app', 'oczekiwanie', '[orderNumber]', 'page.tsx')
  const statusRoute = readSource('app', 'api', 'orders', '[orderNumber]', 'status', 'route.ts')
  const reportRoute = readSource('app', 'api', 'orders', '[orderNumber]', 'report-payment', 'route.ts')
  const onlineCheckoutRoute = readSource('app', 'api', 'payments', 'online', 'create-checkout', 'route.ts')

  assert.match(ordersRoute, /viewerToken: order\.viewerToken/)
  assert.match(ordersRoute, /buildCommerceCheckoutHref\(order\.orderNumber, order\.viewerToken\)/)
  for (const source of [checkoutSource, blikSource, waitingSource, statusRoute, reportRoute, onlineCheckoutRoute]) {
    assert.match(source, /getCommerceOrderForViewer/)
    assert.match(source, /viewerToken/)
  }
  assert.match(reportRoute, /alreadyReported: !report\.reportedNow/)
  assert.match(reportRoute, /reconcileReportedManualPayment/)
  assert.match(reportRoute, /claimCommerceManualPaymentAdminNotification/)
  assert.match(reportRoute, /sendCommerceManualPaymentReportedAdminEmail/)
  assert.doesNotMatch(blikSource, /prepareCommerceManualPayment/)
})
