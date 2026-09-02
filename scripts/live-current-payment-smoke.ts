import assert from 'node:assert/strict'
import { loadEnvConfig } from '@next/env'
import { chromium, type Page } from 'playwright-core'
import { SITE_PRODUCTION_URL } from '../lib/site'
import { resolveBrowserExecutablePath } from './lib/browser-path'

type SmokeResult = {
  baseUrl: string
  bookingId: string | null
  accessTokenPresent: boolean
  directManualFlow: boolean
  orderNumber: string | null
  viewerTokenPresent: boolean
  slotLabel: string | null
  paymentMethods: string[]
  reportPaymentStatus: number | null
  waitingUrl: string | null
  orderStatusAfterReport: string | null
  testAdminConfirmUrlExposed: boolean | null
  cleanupStatus: number | null
  notes: string[]
}

function readArg(name: string): string | null {
  const index = process.argv.indexOf(name)
  return index === -1 ? null : process.argv[index + 1] ?? null
}

function resolveBaseUrl() {
  const raw = readArg('--url') ?? process.env.LIVE_CURRENT_PAYMENT_SMOKE_URL ?? process.env.LIVE_SMOKE_URL ?? SITE_PRODUCTION_URL
  return raw.endsWith('/') ? raw.slice(0, -1) : raw
}

function getWarsawCompactTimestamp() {
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const values: Record<string, string> = {}

  for (const part of formatter.formatToParts(new Date())) {
    if (part.type !== 'literal') {
      values[part.type] = part.value
    }
  }

  return `${values.year}${values.month}${values.day}-${values.hour}${values.minute}${values.second}`
}

function createBasicAuthHeader(password: string) {
  return `Basic ${Buffer.from(`admin:${password}`).toString('base64')}`
}

async function main() {
  loadEnvConfig(process.cwd())

  const baseUrl = resolveBaseUrl()
  const timestamp = getWarsawCompactTimestamp()
  const result: SmokeResult = {
    baseUrl,
    bookingId: null,
    accessTokenPresent: false,
    directManualFlow: false,
    orderNumber: null,
    viewerTokenPresent: false,
    slotLabel: null,
    paymentMethods: [],
    reportPaymentStatus: null,
    waitingUrl: null,
    orderStatusAfterReport: null,
    testAdminConfirmUrlExposed: null,
    cleanupStatus: null,
    notes: [],
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath: await resolveBrowserExecutablePath(),
  })

  try {
    const context = await browser.newContext({
      locale: 'pl-PL',
      viewport: { width: 1366, height: 1100 },
    })
    const page = await context.newPage()

    await page.goto(`${baseUrl}/zapytaj`, {
      waitUntil: 'domcontentloaded',
    })
    await page.locator('#zapytaj-page-title').waitFor({ timeout: 30000 })

    const firstSlot = page.locator('.zapytaj-slot-option:visible').first()
    await firstSlot.waitFor({ timeout: 30000 })
    result.slotLabel = (await firstSlot.innerText()).replace(/\s+/g, ' ').trim()
    await firstSlot.click()

    await page.locator('form.zapytaj-form').waitFor({ timeout: 30000 })
    await page.locator('#zapytaj-name').fill(`QA live payment ${timestamp}`)
    await page.locator('#zapytaj-phone').fill('500600700')
    await page.locator('#zapytaj-email').fill(`qa-live-payment-${timestamp}@example.com`)
    await page.locator('input[name="species"][value="pies"]').check()
    await page
      .locator('#zapytaj-description')
      .fill('Kontrolny test produkcyjnego lejka: rezerwacja, wybor platnosci, BLIK i sprzatanie testu.')
    const consentCheckboxes = page.locator('.zapytaj-consents input[type="checkbox"]')
    for (let index = 0; index < await consentCheckboxes.count(); index += 1) {
      await consentCheckboxes.nth(index).check()
    }

    const bookingResponsePromise = page.waitForResponse(
      (response) => new URL(response.url()).pathname === '/api/zapytaj' && response.request().method() === 'POST',
      { timeout: 45000 },
    )
    await page.locator('form.zapytaj-form button[type="submit"]').click()
    const bookingResponse = await bookingResponsePromise
    assert.equal(bookingResponse.ok(), true, `POST /api/bookings returned ${bookingResponse.status()}`)

    await page.waitForURL((url) => url.pathname === '/payment' && url.searchParams.has('bookingId') && url.searchParams.has('access'), {
      timeout: 30000,
      waitUntil: 'domcontentloaded',
    })
    const paymentUrl = new URL(page.url())
    result.bookingId = paymentUrl.searchParams.get('bookingId')
    const accessToken = paymentUrl.searchParams.get('access')
    result.accessTokenPresent = Boolean(paymentUrl.searchParams.get('access'))
    assert.ok(result.bookingId, 'Payment URL did not include bookingId.')
    assert.equal(result.accessTokenPresent, true, 'Payment URL did not include access token.')
    await page.locator('[data-payment-state="payment-selection"]').waitFor({ timeout: 30000 })

    result.directManualFlow = (await page.locator('[data-direct-manual-flow="true"]').count()) === 1

    if (result.directManualFlow) {
      assert.equal(await page.locator('[data-payment-submit="manual-direct"]').count(), 1, 'Zapytaj payment page did not expose direct manual payment action.')

      const manualResponsePromise = page.waitForResponse(
        (response) => new URL(response.url()).pathname === '/api/payments/manual' && response.request().method() === 'POST',
        { timeout: 45000 },
      )
      await page.locator('[data-payment-submit="manual-direct"]').click()
      const manualResponse = await manualResponsePromise
      result.reportPaymentStatus = manualResponse.status()
      assert.equal(manualResponse.ok(), true, `POST /api/payments/manual returned ${manualResponse.status()}`)

      await page.waitForURL(
        (url) => url.pathname === '/confirmation' && url.searchParams.get('bookingId') === result.bookingId && url.searchParams.get('manual') === 'reported',
        { timeout: 30000, waitUntil: 'domcontentloaded' },
      )
      result.waitingUrl = page.url()
      await page.locator('[data-confirmation-state="pending-manual-review"]').waitFor({ timeout: 30000 })
      result.testAdminConfirmUrlExposed = (await page.locator('a[href*="/api/admin/confirm-payment/"]').count()) > 0
      assert.equal(result.testAdminConfirmUrlExposed, false, 'Production confirmation exposed a test admin confirmation URL.')

      const statusResponse = await page.request.get(
        `${baseUrl}/api/bookings/${encodeURIComponent(result.bookingId)}/status?access=${encodeURIComponent(accessToken ?? '')}`,
      )
      assert.equal(statusResponse.ok(), true, `Booking status API returned ${statusResponse.status()}`)
      const statusPayload = (await statusResponse.json()) as {
        bookingStatus?: string
        paymentStatus?: string
        paymentMethod?: string | null
      }
      result.orderStatusAfterReport = `${statusPayload.bookingStatus ?? 'unknown'}:${statusPayload.paymentStatus ?? 'unknown'}`
      assert.equal(result.orderStatusAfterReport, 'pending_manual_payment:pending_manual_review', 'Manual BLIK report did not remain pending for admin confirmation.')
      assert.equal(statusPayload.paymentMethod ?? null, 'manual', 'Manual BLIK report did not retain payment method.')
    } else {
    const methods = await page.locator('[data-payment-method]').evaluateAll((nodes) =>
      nodes
        .map((node) => node.getAttribute('data-payment-method'))
        .filter((value): value is string => Boolean(value)),
    )
    result.paymentMethods = methods
    assert.ok(methods.includes('manual'), 'Payment page did not expose manual/BLIK method.')
    assert.ok(methods.includes('online'), 'Payment page did not expose online method.')

    const orderResponsePromise = page.waitForResponse(
      (response) => new URL(response.url()).pathname === '/api/orders' && response.request().method() === 'POST',
      { timeout: 45000 },
    )
    await page.locator('[data-payment-submit="manual"]').click()
    const orderResponse = await orderResponsePromise

    assert.equal(orderResponse.ok(), true, `POST /api/orders returned ${orderResponse.status()}`)

    await page.waitForURL((url) => url.pathname.startsWith('/platnosc/blik/'), {
      timeout: 30000,
      waitUntil: 'domcontentloaded',
    })
    const blikUrl = new URL(page.url())
    result.orderNumber = blikUrl.pathname.split('/').pop() ?? null
    result.viewerTokenPresent = Boolean(blikUrl.searchParams.get('viewer'))
    assert.ok(result.orderNumber, 'BLIK payment URL did not include orderNumber.')
    assert.equal(result.viewerTokenPresent, true, 'BLIK payment URL did not include the order viewer token.')
    await page.getByRole('heading', { name: /BLIK po instrukcji e-mail/i }).waitFor({ timeout: 30000 })

    const checkoutPage = await page.context().newPage()
    try {
      await checkoutPage.goto(`${baseUrl}/checkout?orderNumber=${encodeURIComponent(result.orderNumber)}&viewer=${encodeURIComponent(blikUrl.searchParams.get('viewer') ?? '')}`, {
        waitUntil: 'domcontentloaded',
      })
      await checkoutPage.getByRole('heading', { name: /Płatność za konsultację/i }).waitFor({ timeout: 30000 })
      assert.equal(await checkoutPage.locator('.payment-ref-test-card').count(), 0, 'Production checkout exposed the test payment card.')
    } finally {
      await checkoutPage.close()
    }

    const reportResponsePromise = page.waitForResponse(
      (response) => result.orderNumber !== null && response.url().includes(`/api/orders/${result.orderNumber}/report-payment`) && response.request().method() === 'POST',
      { timeout: 45000 },
    )
    await page.getByRole('button', { name: /Zap/i }).click()
    const reportResponse = await reportResponsePromise
    result.reportPaymentStatus = reportResponse.status()

    assert.equal(reportResponse.ok(), true, `POST report-payment returned ${reportResponse.status()}`)

    await page.waitForURL((url) => url.pathname === `/oczekiwanie/${result.orderNumber}`, {
      timeout: 30000,
      waitUntil: 'domcontentloaded',
    })
    result.waitingUrl = page.url()
    await page.getByRole('heading', { name: /Zgłoszenie płatności zostało wysłane/i }).waitFor({ timeout: 30000 })
    result.testAdminConfirmUrlExposed = (await page.locator('a[href*="/api/admin/confirm-payment/"]').count()) > 0
    assert.equal(result.testAdminConfirmUrlExposed, false, 'Production waiting page exposed a test admin confirmation URL.')

    const statusResponse = await page.request.get(`${baseUrl}/api/orders/${encodeURIComponent(result.orderNumber)}/status?viewer=${encodeURIComponent(blikUrl.searchParams.get('viewer') ?? '')}`)
    assert.equal(statusResponse.ok(), true, `Order status API returned ${statusResponse.status()}`)
    const statusPayload = (await statusResponse.json()) as {
      status?: string
      testAdminConfirmUrl?: string | null
      testAdminRejectUrl?: string | null
    }
    result.orderStatusAfterReport = statusPayload.status ?? null
    assert.equal(result.orderStatusAfterReport, 'payment_reported', 'Manual BLIK report was mutated before explicit admin POST confirmation.')
    assert.equal(statusPayload.testAdminConfirmUrl ?? null, null, 'Production status API exposed testAdminConfirmUrl.')
    assert.equal(statusPayload.testAdminRejectUrl ?? null, null, 'Production status API exposed testAdminRejectUrl.')
    }

    const adminSecret = process.env.ADMIN_ACCESS_SECRET?.trim()

    if (adminSecret && result.bookingId) {
      const cleanupResponse = await page.request.post(`${baseUrl}/api/admin/bookings/${encodeURIComponent(result.bookingId)}/manual-payment`, {
        headers: {
          authorization: createBasicAuthHeader(adminSecret),
        },
        data: {
          action: 'reject',
          reason: 'QA live payment smoke cleanup - no real external payment was made.',
        },
      })
      result.cleanupStatus = cleanupResponse.status()
      assert.equal(cleanupResponse.ok(), true, `Admin cleanup returned ${cleanupResponse.status()}`)
      result.notes.push('Test booking was rejected after smoke cleanup.')
    } else {
      result.notes.push('ADMIN_ACCESS_SECRET missing locally, cleanup was skipped.')
    }

    console.log(JSON.stringify(result, null, 2))
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
