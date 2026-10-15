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
import { POST as postAdminViewerLink } from '@/app/api/admin/orders/[orderNumber]/viewer-link/route'
import { createAdminSessionToken } from '@/lib/admin-auth'
import {
  COMMERCE_MANUAL_NOTIFICATION_CLAIM_STALE_AFTER_MS,
  claimCommerceManualPaymentAdminNotification,
  completeCommerceManualPaymentAdminNotification,
  createCommerceOrder,
  ensureCommerceOrderViewerToken,
  fulfillCommerceOrder,
  getCommerceOrderForViewer,
  getCommerceOrderForViewerBounded,
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
    const boundedOrder = await getCommerceOrderForViewerBounded(order.orderNumber, order.viewerToken)
    assert.equal(boundedOrder.status, 'ok')
    assert.equal(boundedOrder.status === 'ok' ? boundedOrder.order?.orderNumber : null, order.orderNumber)
    const boundedUnauthorized = await getCommerceOrderForViewerBounded(order.orderNumber, order.orderNumber)
    assert.deepEqual(boundedUnauthorized, { status: 'ok', order: null })
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
    const previousSecret = process.env.ADMIN_ACCESS_SECRET
    process.env.ADMIN_ACCESS_SECRET = 'commerce-cookie-test-secret'
    try {
      const params = { params: Promise.resolve({ orderNumber: migrated.orderNumber }) }
      const denied = await postAdminViewerLink(new Request('http://localhost/api/admin/orders/test/viewer-link', { method: 'POST' }), params)
      assert.equal(denied.status, 401)
      const token = await createAdminSessionToken()
      const allowed = await postAdminViewerLink(new Request('http://localhost/api/admin/orders/test/viewer-link', {
        method: 'POST', headers: { cookie: 'rb_admin_session=' + token },
      }), params)
      assert.equal(allowed.status, 200)
      const payload = await allowed.json()
      assert.equal(new URL(payload.checkoutUrl, 'http://localhost').searchParams.get('viewer'), migrated.viewerToken)
    } finally {
      previousSecret === undefined ? delete process.env.ADMIN_ACCESS_SECRET : process.env.ADMIN_ACCESS_SECRET = previousSecret
    }
  })

  const migrationRoute = readSource('app', 'api', 'admin', 'orders', '[orderNumber]', 'viewer-link', 'route.ts')
  assert.match(migrationRoute, /await isAdminRequestAuthorized\(request\.headers, secret\)/)
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

test('manual payment report succeeds when admin notification email is unavailable/skipped', async () => {
  await withLocalCommerceStore(async () => {
    const order = await createTestOrder()
    assert.equal(order.status, 'created')
    assert.equal(order.paidAt, null)
    assert.equal(order.accessSentAt, null)

    const expectedWaitingHref = buildCommerceWaitingHref(order.orderNumber, order.viewerToken)

    // 1. Initial report: email is skipped/unavailable (default in test store without RESEND_API_KEY)
    const initialResponse = await postCommercePaymentReport(
      new Request(`https://regulskibehawiorysta.pl/api/orders/${encodeURIComponent(order.orderNumber)}/report-payment`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ viewerToken: order.viewerToken }),
      }),
      { params: Promise.resolve({ orderNumber: order.orderNumber }) },
    )
    const initialPayload = (await initialResponse.json()) as {
      ok: boolean
      alreadyReported: boolean
      orderNumber: string
      status: string
      adminNotification: string
      adminNotificationReason: string | null
      redirectTo: string
    }

    // Status sukcesu (200, ok: true)
    assert.equal(initialResponse.status, 200)
    assert.equal(initialPayload.ok, true)
    assert.equal(initialPayload.alreadyReported, false)
    assert.equal(initialPayload.orderNumber, order.orderNumber)
    assert.equal(initialPayload.status, 'payment_reported')
    assert.equal(initialPayload.adminNotification, 'skipped')
    assert.match(initialPayload.adminNotificationReason ?? '', /brak maila administracyjnego/i)

    // redirectTo to safe waiting page with capability viewerToken
    assert.equal(initialPayload.redirectTo, expectedWaitingHref)
    const redirectUrl = new URL(initialPayload.redirectTo, 'https://regulskibehawiorysta.pl')
    assert.equal(redirectUrl.searchParams.get('viewer'), order.viewerToken)

    // Stored order status: payment_reported, operational failure state recorded
    const stored = await getCommerceOrderForViewer(order.orderNumber, order.viewerToken)
    assert.ok(stored)
    assert.equal(stored.status, 'payment_reported')
    assert.ok(stored.paymentReportedAt)
    assert.equal(stored.manualPaymentAdminNotificationState, 'skipped')
    assert.match(stored.manualPaymentAdminNotificationFailure ?? '', /brak maila administracyjnego/i)

    // Brak uznania wpłaty za potwierdzoną
    assert.equal(stored.paidAt, null)
    assert.equal(stored.accessSentAt, null)
    assert.notEqual(stored.status, 'paid')
    assert.notEqual(stored.status, 'access_sent')

    // Zachowaj capability viewerToken
    assert.equal(stored.viewerToken, order.viewerToken)
    assert.equal(hasCommerceOrderViewerAccess(stored, order.viewerToken), true)
    assert.equal(await getCommerceOrderForViewer(order.orderNumber, null), null)
    assert.equal(await getCommerceOrderForViewer(order.orderNumber, 'invalid-token'), null)
    assert.equal(await getCommerceOrderForViewer(order.orderNumber, order.orderNumber), null)

    const unauthorizedResponse = await postCommercePaymentReport(
      new Request(`https://regulskibehawiorysta.pl/api/orders/${encodeURIComponent(order.orderNumber)}/report-payment`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ viewerToken: 'invalid-token' }),
      }),
      { params: Promise.resolve({ orderNumber: order.orderNumber }) },
    )
    assert.equal(unauthorizedResponse.status, 404)

    // 2. Brak duplikatu po ponowieniu
    const retryResponse = await postCommercePaymentReport(
      new Request(`https://regulskibehawiorysta.pl/api/orders/${encodeURIComponent(order.orderNumber)}/report-payment`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ viewerToken: order.viewerToken }),
      }),
      { params: Promise.resolve({ orderNumber: order.orderNumber }) },
    )
    const retryPayload = (await retryResponse.json()) as {
      ok: boolean
      alreadyReported: boolean
      orderNumber: string
      status: string
      adminNotification: string
      adminNotificationReason: string | null
      redirectTo: string
    }

    assert.equal(retryResponse.status, 200)
    assert.equal(retryPayload.ok, true)
    assert.equal(retryPayload.alreadyReported, true)
    assert.equal(retryPayload.orderNumber, order.orderNumber)
    assert.equal(retryPayload.status, 'payment_reported')
    assert.equal(retryPayload.adminNotification, 'skipped')
    assert.equal(retryPayload.redirectTo, expectedWaitingHref)

    const storedAfterRetry = await getCommerceOrderForViewer(order.orderNumber, order.viewerToken)
    assert.ok(storedAfterRetry)
    assert.equal(storedAfterRetry.status, 'payment_reported')
    assert.equal(storedAfterRetry.paidAt, null)
    assert.equal(storedAfterRetry.accessSentAt, null)
    assert.equal(storedAfterRetry.manualPaymentAdminNotificationState, 'skipped')

    // 3. Consultation order with skipped email: records booking pending and succeeds without duplicate
    const bookingDate = '2030-01-15'
    const bookingTime = '11:00'
    await createAvailabilitySlot(bookingDate, bookingTime)
    const consultationBooking = await createPendingBooking({
      ownerName: 'Konsultacja BLIK Skipped Mail',
      serviceType: 'szybka-konsultacja-15-min',
      problemType: 'separacja',
      animalType: 'Pies',
      petAge: '4 lata',
      durationNotes: '',
      description: 'Zgłoszenie wpłaty przy niedostępnym mailu administracyjnym.',
      phone: '579163241',
      email: `consultation-skipped-mail-${Date.now()}@example.com`,
      slotId: `${bookingDate}-${bookingTime}`,
    })
    const consultationOrder = await createOrReuseConsultationCommerceOrder(
      consultationBooking.booking.id,
      consultationBooking.accessToken,
    )

    const consultResponse = await postCommercePaymentReport(
      new Request(`https://regulskibehawiorysta.pl/api/orders/${encodeURIComponent(consultationOrder.orderNumber)}/report-payment`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ viewerToken: consultationOrder.viewerToken }),
      }),
      { params: Promise.resolve({ orderNumber: consultationOrder.orderNumber }) },
    )
    assert.equal(consultResponse.status, 200)
    const consultPayload = (await consultResponse.json()) as {
      ok: boolean
      alreadyReported: boolean
      status: string
      adminNotification: string
    }
    assert.equal(consultPayload.ok, true)
    assert.equal(consultPayload.alreadyReported, false)
    assert.equal(consultPayload.status, 'payment_reported')
    assert.equal(consultPayload.adminNotification, 'skipped')

    const storedConsult = await getCommerceOrderForViewer(consultationOrder.orderNumber, consultationOrder.viewerToken)
    assert.equal(storedConsult?.status, 'payment_reported')
    assert.ok(storedConsult?.manualPaymentBookingPendingAt)
    assert.equal(storedConsult?.paidAt, null)
    assert.equal(storedConsult?.accessSentAt, null)
    assert.equal(storedConsult?.manualPaymentAdminNotificationState, 'skipped')

    // Retry for consultation order
    const consultRetryResponse = await postCommercePaymentReport(
      new Request(`https://regulskibehawiorysta.pl/api/orders/${encodeURIComponent(consultationOrder.orderNumber)}/report-payment`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ viewerToken: consultationOrder.viewerToken }),
      }),
      { params: Promise.resolve({ orderNumber: consultationOrder.orderNumber }) },
    )
    assert.equal(consultRetryResponse.status, 200)
    const consultRetryPayload = (await consultRetryResponse.json()) as {
      ok: boolean
      alreadyReported: boolean
    }
    assert.equal(consultRetryPayload.ok, true)
    assert.equal(consultRetryPayload.alreadyReported, true)
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
    assert.match(source, /getCommerceOrderForViewer(?:Bounded)?/)
    assert.match(source, /viewerToken/)
  }
  assert.match(reportRoute, /alreadyReported: !report\.reportedNow/)
  assert.match(reportRoute, /reconcileReportedManualPayment/)
  assert.match(reportRoute, /claimCommerceManualPaymentAdminNotification/)
  assert.match(reportRoute, /sendCommerceManualPaymentReportedAdminEmail/)
  assert.doesNotMatch(blikSource, /prepareCommerceManualPayment/)
})
