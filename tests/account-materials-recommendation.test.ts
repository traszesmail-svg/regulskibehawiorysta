import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as recommendationRoute from '@/app/api/account/materials/recommendation/route'
import { POST as postRecommendation } from '@/app/api/account/materials/recommendation/route'
import {
  canUseCommerceAccess,
  fulfillCommerceOrder,
  getCommerceOrder,
  prepareCommerceManualPayment,
  recordCommerceAccessUse,
  reportCommerceManualPayment,
} from '@/lib/server/commerce-store'
import { createAvailabilitySlot, createPendingBooking, markBookingDone, markBookingPaid } from '@/lib/server/db'
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

test('recommendation order flow: creates new order, preserves pending manual review, and provides working access/download on paid order without looping to bare /pokoj', async () => {
  const sandbox = await createLocalDataSandbox('account-materials-recommendation', process.cwd())

  try {
    await withEnv(
      {
        APP_DATA_MODE: 'local',
        CUSTOMER_EMAIL_MODE: 'disabled',
        NODE_ENV: 'test',
      },
      async () => {
        const userEmail = 'opiekun-test@example.com'
        const bookingDate = '2030-03-12'
        const productSlug = 'pies-reaktywny-na-spacerze'

        const slot = await createAvailabilitySlot(bookingDate, '10:00')
        const created = await createPendingBooking({
          ownerName: 'Opiekun Testowy',
          serviceType: 'szybka-konsultacja-15-min',
          problemType: 'spacer',
          animalType: 'Pies',
          petAge: '2 lata',
          durationNotes: 'Test polecenia PDF',
          description: 'Pies szczeka na inne psy.',
          email: userEmail,
          slotId: slot.id,
        })

        await markBookingPaid(created.booking.id, {
          paymentMethod: 'mock',
          paymentReference: 'PAY-MOCK-1',
        })

        await markBookingDone(created.booking.id, 'Zalecenie po konsultacji: praca na dystansie', productSlug)

        // 1. Validation errors
        const missingBodyRes = await postRecommendation(
          new Request('https://example.test/api/account/materials/recommendation', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-test-account-email': userEmail,
            },
            body: JSON.stringify({}),
          }),
        )
        assert.equal(missingBodyRes.status, 400)

        const forbiddenRes = await postRecommendation(
          new Request('https://example.test/api/account/materials/recommendation', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-test-account-email': 'inny-uzytkownik@example.com',
            },
            body: JSON.stringify({ bookingId: created.booking.id, productSlug }),
          }),
        )
        assert.equal(forbiddenRes.status, 403)

        // 2. New order creation: server price 19 PLN, high-entropy viewerToken, redirects to checkout
        const newOrderRes = await postRecommendation(
          new Request('https://example.test/api/account/materials/recommendation', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-test-account-email': userEmail,
            },
            body: JSON.stringify({ bookingId: created.booking.id, productSlug }),
          }),
        )
        assert.equal(newOrderRes.status, 200)
        const newOrderPayload = (await newOrderRes.json()) as {
          ok: boolean
          orderNumber: string
          viewerToken: string
          status: string
          redirectTo: string
        }

        assert.equal(newOrderPayload.ok, true)
        assert.match(newOrderPayload.orderNumber, /^ZAM-/)
        assert.match(newOrderPayload.viewerToken, /^[A-Za-z0-9_-]{40,}$/)
        assert.equal(newOrderPayload.status, 'created')
        assert.match(newOrderPayload.redirectTo, /^\/checkout\?orderNumber=ZAM-/)
        assert.ok(newOrderPayload.redirectTo.includes(`viewer=${encodeURIComponent(newOrderPayload.viewerToken)}`))

        const storedOrder = await getCommerceOrder(newOrderPayload.orderNumber)
        assert.ok(storedOrder)
        assert.equal(storedOrder.amount, 19)
        assert.equal(storedOrder.productType, 'ebook')

        // 3. Pending order flow: waiting manual payment and payment reported preserve checkout / waiting
        await prepareCommerceManualPayment(newOrderPayload.orderNumber)
        await reportCommerceManualPayment(newOrderPayload.orderNumber, newOrderPayload.viewerToken)

        const pendingRes = await postRecommendation(
          new Request('https://example.test/api/account/materials/recommendation', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-test-account-email': userEmail,
            },
            body: JSON.stringify({ bookingId: created.booking.id, productSlug }),
          }),
        )
        assert.equal(pendingRes.status, 200)
        const pendingPayload = (await pendingRes.json()) as {
          ok: boolean
          orderNumber: string
          viewerToken: string
          status: string
          redirectTo: string
        }
        assert.equal(pendingPayload.orderNumber, newOrderPayload.orderNumber)
        assert.equal(pendingPayload.status, 'payment_reported')
        assert.ok(pendingPayload.redirectTo.includes('/checkout?orderNumber='))
        assert.notEqual(pendingPayload.redirectTo, '/pokoj')

        // 4. Paid / fulfilled order: NO loop to bare /pokoj, provides working downloadUrl and accessUrl
        const fulfilled = await fulfillCommerceOrder(newOrderPayload.orderNumber, 'blik_phone')
        assert.ok(fulfilled)
        assert.equal(fulfilled.status, 'access_sent')
        assert.ok(fulfilled.accessCode)
        assert.equal(canUseCommerceAccess(fulfilled), true)

        const paidRes = await postRecommendation(
          new Request('https://example.test/api/account/materials/recommendation', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-test-account-email': userEmail,
            },
            body: JSON.stringify({ bookingId: created.booking.id, productSlug }),
          }),
        )
        assert.equal(paidRes.status, 200)
        const paidPayload = (await paidRes.json()) as {
          ok: boolean
          orderNumber: string
          viewerToken: string
          status: string
          accessCode?: string
          accessUrl: string
          downloadUrl: string
          hasActiveAccess: boolean
          redirectTo: string
        }

        assert.equal(paidPayload.ok, true)
        assert.equal(paidPayload.orderNumber, newOrderPayload.orderNumber)
        assert.equal(paidPayload.status, 'access_sent')
        assert.equal(paidPayload.hasActiveAccess, true)
        assert.equal('accessCode' in paidPayload, false, 'accessCode must not be exposed as a standalone JSON field')
        assert.equal(paidPayload.accessCode, undefined)
        assert.notEqual(paidPayload.redirectTo, '/pokoj') // FIXED: No longer loops back to bare /pokoj!
        assert.ok(
          paidPayload.redirectTo.startsWith('/api/access/download?') ||
            paidPayload.redirectTo.startsWith('/pokoj?code='),
        )
        assert.ok(paidPayload.accessUrl.startsWith('/pokoj?code='))
        assert.ok(paidPayload.downloadUrl.startsWith('/api/access/download?'))
        assert.ok(paidPayload.downloadUrl.includes(`code=${encodeURIComponent(fulfilled.accessCode)}`))
        assert.ok(paidPayload.downloadUrl.includes(`email=${encodeURIComponent(userEmail)}`))

        // 5. Verification: GET method is not exported, order recovery / creation is strictly POST
        assert.equal('GET' in recommendationRoute, false, 'recommendation route must not export GET method')
        assert.equal(typeof (recommendationRoute as Record<string, unknown>).GET, 'undefined')

        // 6. Access limit enforcement
        await recordCommerceAccessUse(newOrderPayload.orderNumber)
        await recordCommerceAccessUse(newOrderPayload.orderNumber)
        await recordCommerceAccessUse(newOrderPayload.orderNumber)

        const exhaustedOrder = await getCommerceOrder(newOrderPayload.orderNumber)
        assert.ok(exhaustedOrder)
        assert.equal(canUseCommerceAccess(exhaustedOrder), false)

        const limitRes = await postRecommendation(
          new Request('https://example.test/api/account/materials/recommendation', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-test-account-email': userEmail,
            },
            body: JSON.stringify({ bookingId: created.booking.id, productSlug }),
          }),
        )
        const limitPayload = (await limitRes.json()) as {
          ok: boolean
          hasActiveAccess: boolean
          downloadUrl: string | null
          accessUrl: string
          redirectTo: string
        }
        assert.equal(limitPayload.hasActiveAccess, false)
        assert.equal(limitPayload.downloadUrl, null)
        assert.ok(limitPayload.redirectTo.startsWith('/pokoj?code=')) // Falls back to access info page
      },
    )
  } finally {
    await sandbox.cleanup()
  }
})

test('recommendation endpoint requires authentication when test headers are not provided', async () => {
  const unauthRes = await postRecommendation(
    new Request('https://example.test/api/account/materials/recommendation', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ bookingId: 'any-id', productSlug: 'pies-reaktywny-na-spacerze' }),
    }),
  )

  assert.equal(unauthRes.status, 401)
  const payload = (await unauthRes.json()) as { ok: boolean; error: string }
  assert.equal(payload.ok, false)
  assert.match(payload.error, /sesji|opiekuna/i)
})

test('x-test-account-email header is strictly limited to NODE_ENV=test and cannot bypass auth in NODE_ENV=production even with APP_DATA_MODE=local', async () => {
  await withEnv(
    {
      NODE_ENV: 'production',
      APP_DATA_MODE: 'local',
    },
    async () => {
      const res = await postRecommendation(
        new Request('https://example.test/api/account/materials/recommendation', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-test-account-email': 'opiekun-test@example.com',
          },
          body: JSON.stringify({ bookingId: 'any-id', productSlug: 'pies-reaktywny-na-spacerze' }),
        }),
      )

      assert.equal(res.status, 401)
      const payload = (await res.json()) as { ok: boolean; error: string }
      assert.equal(payload.ok, false)
      assert.match(payload.error, /sesji|opiekuna/i)
    },
  )
})

test('recommendation endpoint does not export mutating GET handler (strictly POST)', () => {
  assert.equal('GET' in recommendationRoute, false, 'Endpoint must not export GET method')
  assert.equal(typeof (recommendationRoute as Record<string, unknown>).GET, 'undefined')
})

test('room card representation logic resolves unlocked, pending, and new purchase states correctly', () => {
  const recommendedTitle = 'Pies reaktywny na spacerze'

  // Helper matching AccountRoomApp memo logic
  function resolveRecommendationCardState(materials: Array<{
    productName: string
    productType: string
    status: string
    accessUrl: string | null
  }>) {
    const unlocked = materials.find(
      (m) =>
        m.productType === 'ebook' &&
        m.productName.trim().toLowerCase() === recommendedTitle.toLowerCase() &&
        (m.status === 'paid' || m.status === 'access_sent'),
    ) ?? null

    const pending = materials.find(
      (m) =>
        m.productType === 'ebook' &&
        m.productName.trim().toLowerCase() === recommendedTitle.toLowerCase() &&
        (m.status === 'waiting_manual_payment' || m.status === 'payment_reported'),
    ) ?? null

    const downloadUrl = (() => {
      if (!unlocked?.accessUrl) return null
      try {
        const url = new URL(unlocked.accessUrl, 'https://local.test')
        const code = url.searchParams.get('code')
        const email = url.searchParams.get('email')
        if (code && email) {
          return `/api/access/download?code=${encodeURIComponent(code)}&email=${encodeURIComponent(email)}`
        }
      } catch {
        // ignore
      }
      return unlocked.accessUrl.replace('/pokoj?', '/api/access/download?')
    })()

    return {
      isUnlocked: Boolean(unlocked),
      isPending: Boolean(pending && !unlocked),
      downloadUrl,
      accessUrl: unlocked?.accessUrl ?? null,
    }
  }

  // 1. Unlocked state
  const unlockedResult = resolveRecommendationCardState([
    {
      productName: 'Pies reaktywny na spacerze',
      productType: 'ebook',
      status: 'access_sent',
      accessUrl: '/pokoj?code=KOD-1234-AB&email=opiekun%40example.com',
    },
  ])
  assert.equal(unlockedResult.isUnlocked, true)
  assert.equal(unlockedResult.isPending, false)
  assert.equal(
    unlockedResult.downloadUrl,
    '/api/access/download?code=KOD-1234-AB&email=opiekun%40example.com',
  )

  // 2. Pending manual payment state
  const pendingResult = resolveRecommendationCardState([
    {
      productName: 'Pies reaktywny na spacerze',
      productType: 'ebook',
      status: 'payment_reported',
      accessUrl: null,
    },
  ])
  assert.equal(pendingResult.isUnlocked, false)
  assert.equal(pendingResult.isPending, true)
  assert.equal(pendingResult.downloadUrl, null)

  // 3. New / unpurchased state
  const newResult = resolveRecommendationCardState([])
  assert.equal(newResult.isUnlocked, false)
  assert.equal(newResult.isPending, false)
  assert.equal(newResult.downloadUrl, null)
})
