import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

;(globalThis as unknown as { React: typeof React }).React = React
import { GET as downloadRouteGet } from '@/app/api/access/download/route'
import BlikPaymentPage from '@/app/platnosc/blik/[orderNumber]/page'
import WaitingPage from '@/app/oczekiwanie/[orderNumber]/page'
import {
  canUseCommerceAccess,
  claimCommerceAccessUse,
  createCommerceOrder,
  findCommerceOrderByProduct,
  fulfillCommerceOrder,
  getCommerceOrder,
  getCommerceOrderByAccessCode,
  prepareCommerceManualPayment,
  rejectCommerceManualPayment,
  reportCommerceManualPayment,
  setCommerceSupabaseClientOverrideForTest,
} from '@/lib/server/commerce-store'
import type { CommerceOrder } from '@/lib/commerce'

async function withLocalCommerceStore(run: () => Promise<void>) {
  const sandboxDir = await mkdtemp(path.join(os.tmpdir(), 'regulski-pdf-access-'))
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

async function createAndFulfillEbookOrder(options?: {
  email?: string
  slug?: string
  initialUsageCount?: number
  expiresAt?: string
}): Promise<CommerceOrder> {
  const email = options?.email ?? `buyer-${randomUUID()}@example.com`
  const slug = options?.slug ?? 'pies-sam-w-domu'

  const created = await createCommerceOrder({
    customerEmail: email,
    customerName: 'Kupujący PDF',
    productType: 'ebook',
    productId: `guide:${slug}:${randomUUID()}`,
    productName: 'Pies sam w domu',
    amount: 19,
    meta: {
      productKind: 'guide',
      productSlug: slug,
    },
  })

  const fulfilled = await fulfillCommerceOrder(created.orderNumber, 'blik_phone')
  if (!fulfilled) {
    throw new Error('Failed to fulfill test order')
  }

  if (typeof options?.initialUsageCount === 'number' || options?.expiresAt) {
    const storePath = path.join(process.env.APP_LOCAL_DATA_DIR!, 'payment-orders.json')
    const raw = await readFile(storePath, 'utf8')
    const parsed = JSON.parse(raw) as { orders: CommerceOrder[] }
    const idx = parsed.orders.findIndex((o) => o.orderNumber === fulfilled.orderNumber)
    if (idx >= 0) {
      if (typeof options.initialUsageCount === 'number') {
        parsed.orders[idx].accessCodeUsageCount = options.initialUsageCount
        if (options.initialUsageCount >= parsed.orders[idx].accessCodeUsageLimit) {
          parsed.orders[idx].accessCodeStatus = 'used'
        }
      }
      if (options.expiresAt) {
        parsed.orders[idx].accessCodeExpiresAt = options.expiresAt
      }
      await writeFile(storePath, JSON.stringify(parsed, null, 2), 'utf8')
      return parsed.orders[idx]
    }
  }

  return fulfilled
}

function makeDownloadRequest(code?: string | null, email?: string | null): Request {
  const url = new URL('https://regulskibehawiorysta.pl/api/access/download')
  if (typeof code === 'string') {
    url.searchParams.set('code', code)
  }
  if (typeof email === 'string') {
    url.searchParams.set('email', email)
  }
  return new Request(url.toString(), {
    method: 'GET',
    headers: {
      'x-forwarded-for': '127.0.0.1',
    },
  })
}

// ---------------------------------------------------------------------------
// 1. BRAK / PUSTY / CUDZY EMAIL ODRZUCANY BEZ UJAWNIANIA SZCZEGÓŁÓW
// ---------------------------------------------------------------------------
test('1. Pobranie PDF bezwzględnie wymaga niepustego, zgodnego e-maila; brak, spacja i cudzy e-mail odrzucane bez wycieku', async () => {
  await withLocalCommerceStore(async () => {
    const order = await createAndFulfillEbookOrder({ email: 'wlasciciel@example.com' })
    assert.ok(order.accessCode)

    // A. Brak parametru email
    const resNoEmail = await downloadRouteGet(makeDownloadRequest(order.accessCode, null))
    assert.equal(resNoEmail.status, 400)
    const jsonNoEmail = await resNoEmail.json()
    assert.deepEqual(jsonNoEmail, { error: 'Kod jest nieprawidłowy albo wygasł.' })

    // B. Pusty email
    const resEmptyEmail = await downloadRouteGet(makeDownloadRequest(order.accessCode, ''))
    assert.equal(resEmptyEmail.status, 400)
    const jsonEmptyEmail = await resEmptyEmail.json()
    assert.deepEqual(jsonEmptyEmail, { error: 'Kod jest nieprawidłowy albo wygasł.' })

    // C. Email zawierający wyłącznie białe znaki
    const resWhitespaceEmail = await downloadRouteGet(makeDownloadRequest(order.accessCode, '   '))
    assert.equal(resWhitespaceEmail.status, 400)
    const jsonWhitespaceEmail = await resWhitespaceEmail.json()
    assert.deepEqual(jsonWhitespaceEmail, { error: 'Kod jest nieprawidłowy albo wygasł.' })

    // D. Cudzy e-mail
    const resOtherEmail = await downloadRouteGet(makeDownloadRequest(order.accessCode, 'cudzy@example.com'))
    assert.equal(resOtherEmail.status, 400)
    const jsonOtherEmail = await resOtherEmail.json()
    assert.deepEqual(jsonOtherEmail, { error: 'Kod jest nieprawidłowy albo wygasł.' })

    // E. Brak kodu przy podanym emailu
    const resNoCode = await downloadRouteGet(makeDownloadRequest(null, 'wlasciciel@example.com'))
    assert.equal(resNoCode.status, 400)
    const jsonNoCode = await resNoCode.json()
    assert.deepEqual(jsonNoCode, { error: 'Kod jest nieprawidłowy albo wygasł.' })

    // F. Licznik pobrań w zamówieniu NIE może ulec zmianie po nieudanych próbach
    const checkOrder = await getCommerceOrder(order.orderNumber)
    assert.equal(checkOrder?.accessCodeUsageCount, 0)
    assert.equal(checkOrder?.accessCodeStatus, 'active')
  })
})

// ---------------------------------------------------------------------------
// 2. STATUSY ZAMÓWIENIA (UNPAID / EXPIRED / CANCELLED)
// ---------------------------------------------------------------------------
test('2. Statusy unpaid, expired i cancelled uniemożliwiają pobranie PDF', async () => {
  await withLocalCommerceStore(async () => {
    // A. Unpaid (created)
    const unpaidOrder = await createCommerceOrder({
      customerEmail: 'nieoplacone@example.com',
      customerName: 'Klient Nieopłacony',
      productType: 'ebook',
      productId: 'guide:pies-sam-w-domu:unpaid',
      productName: 'Pies sam w domu',
      amount: 19,
      meta: { productKind: 'guide', productSlug: 'pies-sam-w-domu' },
    })
    assert.equal(canUseCommerceAccess(unpaidOrder), false)

    // B. Waiting manual payment
    await prepareCommerceManualPayment(unpaidOrder.orderNumber)
    const waitingOrder = await getCommerceOrder(unpaidOrder.orderNumber)
    assert.ok(waitingOrder)
    assert.equal(waitingOrder.status, 'waiting_manual_payment')
    assert.equal(canUseCommerceAccess(waitingOrder), false)

    // C. Payment reported
    await reportCommerceManualPayment(unpaidOrder.orderNumber, unpaidOrder.viewerToken)
    const reportedOrder = await getCommerceOrder(unpaidOrder.orderNumber)
    assert.ok(reportedOrder)
    assert.equal(reportedOrder.status, 'payment_reported')
    assert.equal(canUseCommerceAccess(reportedOrder), false)

    // D. Cancelled
    const orderToCancel = await createAndFulfillEbookOrder({ email: 'anulowane@example.com' })
    await rejectCommerceManualPayment(orderToCancel.orderNumber)
    const cancelledOrder = await getCommerceOrder(orderToCancel.orderNumber)
    assert.ok(cancelledOrder)
    assert.equal(cancelledOrder.status, 'cancelled')
    assert.equal(canUseCommerceAccess(cancelledOrder), false)

    const resCancelled = await downloadRouteGet(makeDownloadRequest(orderToCancel.accessCode, 'anulowane@example.com'))
    assert.equal(resCancelled.status, 400)
    const jsonCancelled = await resCancelled.json()
    assert.deepEqual(jsonCancelled, { error: 'Kod jest nieprawidłowy albo wygasł.' })

    // E. Expired timestamp
    const expiredTimestamp = new Date(Date.now() - 3600_000).toISOString()
    const expiredOrder = await createAndFulfillEbookOrder({
      email: 'wygasle@example.com',
      expiresAt: expiredTimestamp,
    })
    assert.equal(canUseCommerceAccess(expiredOrder), false)

    const resExpired = await downloadRouteGet(makeDownloadRequest(expiredOrder.accessCode, 'wygasle@example.com'))
    assert.equal(resExpired.status, 400)
    const jsonExpired = await resExpired.json()
    assert.deepEqual(jsonExpired, { error: 'Kod jest nieprawidłowy albo wygasł.' })
  })
})

// ---------------------------------------------------------------------------
// 3. WŁAŚCIWY PDF, NAGŁÓWKI I ATOMOWE ZUŻYCIE JEDNEGO POBRANIA
// ---------------------------------------------------------------------------
test('3. Właściwy PDF: poprawny kod i email zwraca plik PDF z prawidłowymi nagłówkami i zużywa 1 pobranie', async () => {
  await withLocalCommerceStore(async () => {
    const order = await createAndFulfillEbookOrder({ email: 'pobieram@example.com' })
    assert.ok(order.accessCode)

    const res = await downloadRouteGet(makeDownloadRequest(order.accessCode, 'pobieram@example.com'))
    assert.equal(res.status, 200)
    assert.equal(res.headers.get('content-type'), 'application/pdf')
    assert.equal(res.headers.get('content-disposition'), 'attachment; filename="pies-sam-w-domu.pdf"')
    assert.ok(res.headers.get('cache-control')?.includes('no-store'))

    const buffer = await res.arrayBuffer()
    assert.ok(buffer.byteLength > 1000)

    const updated = await getCommerceOrder(order.orderNumber)
    assert.equal(updated?.accessCodeUsageCount, 1)
    assert.equal(updated?.accessCodeStatus, 'active')
  })
})

// ---------------------------------------------------------------------------
// 4. WYŚCIG 5 ŻĄDAŃ Z JEDNYM SUKCESEM PRZY usageCount=2 i limit=3
// ---------------------------------------------------------------------------
test('4. Wyścig: przy usageCount=2 i 5 równoległych żądaniach dokładnie jedno pobiera PDF, pozostałe 4 dostają 400', async () => {
  await withLocalCommerceStore(async () => {
    const order = await createAndFulfillEbookOrder({
      email: 'wyscig@example.com',
      initialUsageCount: 2,
    })
    assert.equal(order.accessCodeUsageCount, 2)
    assert.equal(order.accessCodeUsageLimit, 3)
    assert.equal(order.accessCodeStatus, 'active')

    // 5 równoległych żądań pobrania
    const requests = Array.from({ length: 5 }, () =>
      downloadRouteGet(makeDownloadRequest(order.accessCode, 'wyscig@example.com')),
    )

    const responses = await Promise.all(requests)

    const successResponses = responses.filter((r) => r.status === 200)
    const failureResponses = responses.filter((r) => r.status === 400)

    assert.equal(successResponses.length, 1, 'Dokładnie jedno żądanie musi otrzymać PDF (status 200)')
    assert.equal(failureResponses.length, 4, 'Pozostałe cztery żądania muszą zostać odrzucone (status 400)')

    for (const failRes of failureResponses) {
      const json = await failRes.json()
      assert.deepEqual(json, { error: 'Kod jest nieprawidłowy albo wygasł.' })
    }

    const successfulRes = successResponses[0]
    assert.equal(successfulRes.headers.get('content-type'), 'application/pdf')
    const body = await successfulRes.arrayBuffer()
    assert.ok(body.byteLength > 1000)

    // Stan po wyścigu
    const finalOrder = await getCommerceOrder(order.orderNumber)
    assert.equal(finalOrder?.accessCodeUsageCount, 3)
    assert.equal(finalOrder?.accessCodeStatus, 'used')
  })
})

// ---------------------------------------------------------------------------
// 5. RETRY I RESTART PO OSIĄGNIĘCIU LIMITU
// ---------------------------------------------------------------------------
test('5. Retry i restart: po osiągnięciu limitu pobrań kolejny retry oraz stan po restarcie odrzucają żądanie', async () => {
  await withLocalCommerceStore(async () => {
    const order = await createAndFulfillEbookOrder({
      email: 'restart@example.com',
      initialUsageCount: 3,
    })
    assert.equal(order.accessCodeUsageCount, 3)
    assert.equal(order.accessCodeStatus, 'used')

    // Retry po wyczerpaniu limitu
    const retryRes = await downloadRouteGet(makeDownloadRequest(order.accessCode, 'restart@example.com'))
    assert.equal(retryRes.status, 400)
    const retryJson = await retryRes.json()
    assert.deepEqual(retryJson, { error: 'Kod jest nieprawidłowy albo wygasł.' })

    // Symulacja restartu aplikacji: bezpośredni odczyt pliku na dysku
    const storePath = path.join(process.env.APP_LOCAL_DATA_DIR!, 'payment-orders.json')
    const rawDisk = await readFile(storePath, 'utf8')
    const parsedDisk = JSON.parse(rawDisk) as { orders: CommerceOrder[] }
    const persisted = parsedDisk.orders.find((o) => o.orderNumber === order.orderNumber)

    assert.ok(persisted)
    assert.equal(persisted.accessCodeUsageCount, 3)
    assert.equal(persisted.accessCodeStatus, 'used')
    assert.equal(canUseCommerceAccess(persisted), false)

    // claimCommerceAccessUse bezpośrednio zwraca null
    const directClaim = await claimCommerceAccessUse(order.orderNumber)
    assert.equal(directClaim, null)
  })
})

// ---------------------------------------------------------------------------
// 6. PARYTET findCommerceOrderByProduct (IGNOROWANIE CANCELLED I EXPIRED)
// ---------------------------------------------------------------------------
test('6. Parytet findCommerceOrderByProduct: zamówienie cancelled lub expired jest ignorowane i nie blokuje nowego', async () => {
  await withLocalCommerceStore(async () => {
    const productId = `ebook:recommendation:test-booking-1:pies-sam-w-domu`

    // Krok 1: Utworzenie pierwszego zamówienia i anulowanie go
    const order1 = await createCommerceOrder({
      customerEmail: 'klient1@example.com',
      customerName: 'Klient 1',
      productType: 'ebook',
      productId,
      productName: 'Pies sam w domu',
      amount: 19,
    })
    await rejectCommerceManualPayment(order1.orderNumber)

    const foundAfterCancel = await findCommerceOrderByProduct('ebook', productId)
    assert.equal(foundAfterCancel, null, 'Anulowane zamówienie musi być ignorowane przez findCommerceOrderByProduct')

    // Krok 2: Utworzenie kolejnego zamówienia nie jest zablokowane
    const order2 = await createCommerceOrder({
      customerEmail: 'klient2@example.com',
      customerName: 'Klient 2',
      productType: 'ebook',
      productId,
      productName: 'Pies sam w domu',
      amount: 19,
    })
    assert.ok(order2)

    const foundActive = await findCommerceOrderByProduct('ebook', productId)
    assert.equal(foundActive?.orderNumber, order2.orderNumber)

    // Krok 3: Po wygaśnięciu (expired) również ignorowane
    const storePath = path.join(process.env.APP_LOCAL_DATA_DIR!, 'payment-orders.json')
    const raw = await readFile(storePath, 'utf8')
    const parsed = JSON.parse(raw) as { orders: CommerceOrder[] }
    const idx = parsed.orders.findIndex((o) => o.orderNumber === order2.orderNumber)
    parsed.orders[idx].status = 'expired'
    await writeFile(storePath, JSON.stringify(parsed, null, 2), 'utf8')

    const foundAfterExpired = await findCommerceOrderByProduct('ebook', productId)
    assert.equal(foundAfterExpired, null, 'Wygasłe zamówienie musi być ignorowane przez findCommerceOrderByProduct')
  })
})

// ---------------------------------------------------------------------------
// 7. STATYCZNY AUDYT MIGRACJI I SCHEMA.SQL POD KĄTEM RPC claim_commerce_access
// ---------------------------------------------------------------------------
test('7. Statyczny audyt migracji i schema.sql pod kątem parytetu RPC claim_commerce_access', () => {
  const migPath = path.join(process.cwd(), 'supabase', 'migrations', '20261013001_commerce_access_claim.sql')
  const schemaPath = path.join(process.cwd(), 'supabase', 'schema.sql')

  const migSql = readFileSync(migPath, 'utf8')
  const schemaSql = readFileSync(schemaPath, 'utf8')

  for (const [sourceName, sql] of [
    ['migracja 20261013001_commerce_access_claim.sql', migSql],
    ['schema.sql', schemaSql],
  ] as const) {
    assert.ok(
      sql.includes('create or replace function public.claim_commerce_access('),
      `${sourceName} musi definiować funkcję public.claim_commerce_access`,
    )
    assert.ok(
      sql.includes('p_order_number text'),
      `${sourceName} musi przyjmować p_order_number`,
    )
    assert.ok(
      sql.includes('for update'),
      `${sourceName} musi blokować wiersz zamówienia klauzulą FOR UPDATE`,
    )
    assert.ok(
      sql.includes('security definer'),
      `${sourceName} musi być security definer`,
    )
    assert.ok(
      sql.includes('set search_path = public, pg_temp'),
      `${sourceName} musi ustawiać bezpieczny search_path = public, pg_temp`,
    )
    assert.ok(
      sql.includes('revoke all on function public.claim_commerce_access(text, text, text) from public, anon, authenticated;'),
      `${sourceName} musi odbierać uprawnienia public, anon, authenticated`,
    )
    assert.ok(
      sql.includes('grant execute on function public.claim_commerce_access(text, text, text) to service_role;'),
      `${sourceName} musi nadawać execute dla service_role`,
    )
    assert.ok(
      sql.includes('v_usage_count >= v_usage_limit'),
      `${sourceName} musi weryfikować przekroczenie limitu pobrań`,
    )
    assert.ok(
      sql.includes("p_access_code is null or trim(p_access_code) = ''"),
      `${sourceName} musi odrzucać puste lub NULL p_access_code`,
    )
    assert.ok(
      sql.includes("p_email is null or trim(p_email) = ''"),
      `${sourceName} musi odrzucać puste lub NULL p_email`,
    )
    assert.ok(
      sql.includes("v_row.calendar_url <> ('commerce-code:' || v_norm_code)"),
      `${sourceName} musi weryfikować zgodność kodu dostępu z calendar_url`,
    )
    assert.ok(
      sql.includes("lower(trim(v_row.email)) <> v_norm_email"),
      `${sourceName} musi weryfikować zgodność adresu e-mail`,
    )
  }
})

// ---------------------------------------------------------------------------
// 8. WIDOKI BLIK I OCZEKIWANIA OBSŁUGUJĄ CANCELLED BEZ ZACHĘTY DO WPŁATY
// ---------------------------------------------------------------------------
test('8. Widoki BLIK i oczekiwania jasno obsługują status cancelled bez zachęty do wpłaty', async () => {
  await withLocalCommerceStore(async () => {
    const order = await createAndFulfillEbookOrder({ email: 'anulowane-widok@example.com' })
    await rejectCommerceManualPayment(order.orderNumber)
    const cancelled = await getCommerceOrder(order.orderNumber)
    assert.ok(cancelled)
    assert.equal(cancelled.status, 'cancelled')

    // A. Widok BLIK
    const blikPage = await BlikPaymentPage({
      params: Promise.resolve({ orderNumber: cancelled.orderNumber }),
      searchParams: Promise.resolve({ viewer: cancelled.viewerToken }),
    })

    const blikHtml = renderToStaticMarkup(blikPage)
    assert.ok(blikHtml.includes('Zamówienie zostało anulowane'))
    assert.ok(blikHtml.includes('To zamówienie zostało anulowane. Nie wykonuj wpłaty'))
    assert.ok(!blikHtml.includes('Wyślij dopłatę BLIK'))
    assert.ok(!blikHtml.includes('CommerceBlikActions'))

    // B. Widok oczekiwania
    const waitingPage = await WaitingPage({
      params: Promise.resolve({ orderNumber: cancelled.orderNumber }),
      searchParams: Promise.resolve({ viewer: cancelled.viewerToken }),
    })

    const waitingHtml = renderToStaticMarkup(waitingPage)
    assert.ok(waitingHtml.includes('Zamówienie zostało anulowane'))
    assert.ok(waitingHtml.includes('To zamówienie zostało anulowane. Nie wykonuj wpłaty ani nie zgłaszaj jej ponownie'))
    assert.ok(!waitingHtml.includes('wróć do instrukcji BLIK i kliknij „Zapłaciłem/am”'))
    assert.ok(!waitingHtml.includes('Płatność czeka na zgłoszenie'))
  })
})

// ---------------------------------------------------------------------------
// 9. PARYTET SUPABASE: RPC claim_commerce_access
// ---------------------------------------------------------------------------
test('9. Parytet Supabase RPC claim_commerce_access: prawidłowe wywołanie, parametry, mapowanie i obsługa odmowy', async () => {
  let capturedRpc = ''
  let capturedArgs: Record<string, unknown> | null = null

  const mockRow = {
    id: 'lead-test-1',
    access_token: 'token-123',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: 'paid',
    service: 'commerce:ebook:guide:pies-sam-w-domu',
    service_label: 'Pies sam w domu',
    service_price: '19',
    name: 'Klient Supabase',
    email: 'supabase-user@example.com',
    species: 'pies',
    description: 'Zamówienie płatności ZAM-SUPA1',
    preferred_slots: 'ZAM-SUPA1',
    confirmed_date: null,
    confirmed_time: null,
    payment_link: null,
    payment_method: 'blik_phone',
    paid_at: new Date().toISOString(),
    call_room_url: null,
    calendar_url: 'commerce-code:KOD-SUPA-01',
    admin_notes: JSON.stringify({
      commerce: true,
      status: 'access_sent',
      viewerToken: 'viewer-token-supa-40-chars-long-secret-key-12345',
      productType: 'ebook',
      productId: 'guide:pies-sam-w-domu',
      amount: 19,
      onlineAmount: 19,
      manualAmount: 19,
      currency: 'PLN',
      customerPhone: null,
      accessCodeStatus: 'used',
      accessCodeUsageCount: 3,
      accessCodeUsageLimit: 3,
      accessCodeExpiresAt: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
      adminConfirmationTokenUsedAt: null,
      adminConfirmationIp: null,
      adminConfirmationUserAgent: null,
      stripeCheckoutSessionId: null,
      providerPaymentId: null,
      paidAt: new Date().toISOString(),
      accessSentAt: new Date().toISOString(),
      paymentReportedAt: null,
      cancelledAt: null,
      meta: { productKind: 'guide', productSlug: 'pies-sam-w-domu' },
    }),
  }

  // A. Sukces claim w Supabase
  setCommerceSupabaseClientOverrideForTest({
    rpc: async (fn: string, args: Record<string, unknown>) => {
      capturedRpc = fn
      capturedArgs = args
      return { data: [mockRow], error: null }
    },
  })

  try {
    const claimed = await claimCommerceAccessUse('ZAM-SUPA1', {
      code: 'kod-supa-01',
      email: '  Supabase-User@Example.Com  ',
    })

    assert.equal(capturedRpc, 'claim_commerce_access')
    assert.deepEqual(capturedArgs, {
      p_order_number: 'ZAM-SUPA1',
      p_access_code: 'KOD-SUPA-01',
      p_email: 'supabase-user@example.com',
    })
    assert.ok(claimed)
    assert.equal(claimed.orderNumber, 'ZAM-SUPA1')
    assert.equal(claimed.accessCodeUsageCount, 3)
    assert.equal(claimed.accessCodeStatus, 'used')

    // B. Odmowa claim w Supabase (np. wyczerpany limit lub wygasły kod) -> RPC zwraca puste []
    setCommerceSupabaseClientOverrideForTest({
      rpc: async () => ({ data: [], error: null }),
    })

    const denied = await claimCommerceAccessUse('ZAM-SUPA1', {
      code: 'KOD-SUPA-01',
      email: 'supabase-user@example.com',
    })
    assert.equal(denied, null, 'Odrzucony claim w Supabase musi zwrócić null')
  } finally {
    setCommerceSupabaseClientOverrideForTest(null)
  }
})

// ---------------------------------------------------------------------------
// 10. PARYTET SUPABASE: findCommerceOrderByProduct ignoruje cancelled i expired
// ---------------------------------------------------------------------------
test('10. Parytet Supabase findCommerceOrderByProduct: pomija anulowane i wygasłe rekordy', async () => {
  let capturedNotCol = ''
  let capturedNotOperator = ''
  let capturedNotVal = ''

  const cancelledRow = {
    id: 'lead-cancelled-1',
    access_token: 'token-c1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: 'cancelled',
    service: 'commerce:ebook:guide:pies-sam-w-domu',
    service_label: 'Pies sam w domu',
    service_price: '19',
    name: 'Klient Anulowany',
    email: 'anulowany@example.com',
    species: 'pies',
    description: 'Anulowane zamówienie',
    preferred_slots: 'ZAM-CANC1',
    confirmed_date: null,
    confirmed_time: null,
    payment_link: null,
    payment_method: null,
    paid_at: null,
    call_room_url: null,
    calendar_url: null,
    admin_notes: JSON.stringify({
      commerce: true,
      status: 'cancelled',
      productType: 'ebook',
      productId: 'guide:pies-sam-w-domu',
      amount: 19,
      onlineAmount: 19,
      manualAmount: 19,
      currency: 'PLN',
      customerPhone: null,
      accessCodeStatus: null,
      accessCodeUsageCount: 0,
      accessCodeUsageLimit: 3,
      accessCodeExpiresAt: null,
      adminConfirmationTokenUsedAt: null,
      adminConfirmationIp: null,
      adminConfirmationUserAgent: null,
      stripeCheckoutSessionId: null,
      providerPaymentId: null,
      paidAt: null,
      accessSentAt: null,
      paymentReportedAt: null,
      cancelledAt: new Date().toISOString(),
      meta: {},
    }),
  }

  setCommerceSupabaseClientOverrideForTest({
    from: () => ({
      select: () => ({
        eq: () => ({
          not: (col: string, op: string, val: string) => {
            capturedNotCol = col
            capturedNotOperator = op
            capturedNotVal = val
            return {
              order: () => Promise.resolve({ data: [cancelledRow], error: null }),
            }
          },
        }),
      }),
    }),
  })

  try {
    const result = await findCommerceOrderByProduct('ebook', 'guide:pies-sam-w-domu')
    assert.equal(capturedNotCol, 'status')
    assert.equal(capturedNotOperator, 'in')
    assert.ok(capturedNotVal.includes('cancelled'))
    assert.ok(capturedNotVal.includes('expired'))
    assert.equal(result, null, 'Nawet jeśli baza zwróciła cancelled, mapper i funkcja muszą go odrzucić')
  } finally {
    setCommerceSupabaseClientOverrideForTest(null)
  }
})

// ---------------------------------------------------------------------------
// 11. REGRESJA: FAIL-CLOSED GDY SUPABASE RPC ZWRACA BŁĄD PRZY PASUJĄCYM ZAMÓWIENIU LOKALNYM
// ---------------------------------------------------------------------------
test('11. Regresja fail-closed: aktywny Supabase zwracający błąd RPC kończy się null i nie dotyka lokalnego licznika', async () => {
  await withLocalCommerceStore(async () => {
    const order = await createAndFulfillEbookOrder({ email: 'failclosed@example.com' })
    assert.ok(order.accessCode)
    assert.equal(order.accessCodeUsageCount, 0)
    assert.equal(order.accessCodeStatus, 'active')

    let rpcCalled = false
    setCommerceSupabaseClientOverrideForTest({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      }),
      rpc: async (fn: string) => {
        if (fn === 'claim_commerce_access') {
          rpcCalled = true
          return { data: null, error: { message: 'Database connection failure', code: 'P0001' } }
        }
        return { data: null, error: null }
      },
    })

    try {
      const claimResult = await claimCommerceAccessUse(order.orderNumber, {
        code: order.accessCode,
        email: 'failclosed@example.com',
      })

      assert.equal(rpcCalled, true, 'Mock Supabase RPC claim_commerce_access musiał zostać wywołany')
      assert.equal(
        claimResult,
        null,
        'Gdy klient Supabase jest aktywny i RPC zwraca błąd, claimCommerceAccessUse musi zakończyć się fail-closed wynikiem null',
      )

      const localOrder = await getCommerceOrder(order.orderNumber)
      assert.ok(localOrder)
      assert.equal(
        localOrder.accessCodeUsageCount,
        0,
        'Lokalny licznik nie może ulec inkrementacji, gdy Supabase RPC zwróci błąd',
      )
      assert.equal(localOrder.accessCodeStatus, 'active')

      const downloadRes = await downloadRouteGet(makeDownloadRequest(order.accessCode, 'failclosed@example.com'))
      assert.equal(downloadRes.status, 400, 'Endpoint download musi odmówić wydania PDF (400) przy awarii bazy')
      const downloadJson = await downloadRes.json()
      assert.deepEqual(downloadJson, { error: 'Kod jest nieprawidłowy albo wygasł.' })

      const localOrderAfterDownload = await getCommerceOrder(order.orderNumber)
      assert.equal(
        localOrderAfterDownload?.accessCodeUsageCount,
        0,
        'Lokalny licznik nadal musi wynosić 0 po próbie pobrania przez API',
      )
      assert.equal(localOrderAfterDownload?.accessCodeStatus, 'active')
    } finally {
      setCommerceSupabaseClientOverrideForTest(null)
    }
  })
})
