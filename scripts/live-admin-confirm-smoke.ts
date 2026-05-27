import assert from 'node:assert/strict'
import { loadEnvConfig } from '@next/env'
import { chromium, type Page } from 'playwright-core'
import { SITE_PRODUCTION_URL } from '../lib/site'
import { getCommerceOrder } from '../lib/server/commerce-store'
import { markBookingRefunded } from '../lib/server/db'
import { resolveBrowserExecutablePath } from './lib/browser-path'

type SmokeResult = {
  baseUrl: string
  bookingId: string | null
  orderNumber: string | null
  adminConfirmGetStatus: number | null
  statusAfterAdminGet: string | null
  tokenUsedAfterAdminGet: boolean | null
  adminConfirmPostStatus: number | null
  statusAfterAdminPost: string | null
  readyUrl: string | null
  repeatPostStatus: number | null
  cleanup: 'refunded' | 'skipped'
  notes: string[]
}

function readArg(name: string): string | null {
  const index = process.argv.indexOf(name)
  return index === -1 ? null : process.argv[index + 1] ?? null
}

function resolveBaseUrl() {
  const raw = readArg('--url') ?? process.env.LIVE_ADMIN_CONFIRM_SMOKE_URL ?? process.env.LIVE_SMOKE_URL ?? SITE_PRODUCTION_URL
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

async function submitBookingForm(page: Page) {
  await page.evaluate(() => {
    const form = document.querySelector('[data-booking-form="details"]') as HTMLFormElement | null
    const button = document.querySelector('[data-booking-submit="payment"]') as HTMLButtonElement | null

    if (!form || !button) {
      throw new Error('Missing booking form or submit button.')
    }

    form.requestSubmit(button)
  })
}

async function main() {
  loadEnvConfig(process.cwd())
  process.env.APP_DATA_MODE = 'supabase'

  const baseUrl = resolveBaseUrl()
  const timestamp = getWarsawCompactTimestamp()
  const result: SmokeResult = {
    baseUrl,
    bookingId: null,
    orderNumber: null,
    adminConfirmGetStatus: null,
    statusAfterAdminGet: null,
    tokenUsedAfterAdminGet: null,
    adminConfirmPostStatus: null,
    statusAfterAdminPost: null,
    readyUrl: null,
    repeatPostStatus: null,
    cleanup: 'skipped',
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

    await page.goto(`${baseUrl}/book?problem=szczeniak&species=pies&service=szybka-konsultacja-15-min`, {
      waitUntil: 'domcontentloaded',
    })
    await page.getByRole('heading', { name: /Wybierz termin konsultacji/i }).waitFor({ timeout: 30000 })

    const firstSlot = page.locator('a.slot-link:visible, [data-selected-slot-link="true"]:visible, [data-nearest-slot-link="true"]:visible').first()
    await firstSlot.waitFor({ timeout: 30000 })
    await Promise.all([
      page.waitForURL((url) => url.pathname === '/form', { timeout: 30000, waitUntil: 'domcontentloaded' }),
      firstSlot.click(),
    ])

    await page.locator('[data-booking-form="details"]').waitFor({ timeout: 30000 })
    await page.locator('[data-booking-field="owner-name"]').fill(`QA live admin confirm ${timestamp}`)
    await page.locator('[data-booking-field="email"]').fill(`qa-live-confirm-${timestamp}@example.com`)
    await page
      .locator('[data-booking-field="description"]')
      .fill('Kontrolny test produkcyjnego potwierdzenia admina: GET bez mutacji, POST potwierdza, powtórka nie psuje stanu.')
    await page.locator('#booking-privacy').check()
    await page.locator('#booking-early-start').check()

    const bookingResponsePromise = page.waitForResponse(
      (response) => response.url().includes('/api/bookings') && response.request().method() === 'POST',
      { timeout: 45000 },
    )
    await submitBookingForm(page)
    const bookingResponse = await bookingResponsePromise
    assert.equal(bookingResponse.ok(), true, `POST /api/bookings returned ${bookingResponse.status()}`)

    await page.waitForURL((url) => url.pathname === '/payment' && url.searchParams.has('bookingId') && url.searchParams.has('access'), {
      timeout: 30000,
      waitUntil: 'domcontentloaded',
    })
    const paymentUrl = new URL(page.url())
    result.bookingId = paymentUrl.searchParams.get('bookingId')
    assert.ok(result.bookingId, 'Payment URL did not include bookingId.')
    await page.locator('[data-payment-state="payment-selection"]').waitFor({ timeout: 30000 })

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
    result.orderNumber = new URL(page.url()).pathname.split('/').pop() ?? null
    assert.ok(result.orderNumber, 'BLIK payment URL did not include orderNumber.')

    const reportResponsePromise = page.waitForResponse(
      (response) => result.orderNumber !== null && response.url().includes(`/api/orders/${result.orderNumber}/report-payment`) && response.request().method() === 'POST',
      { timeout: 45000 },
    )
    await page.getByRole('button', { name: /Zap/i }).click()
    const reportResponse = await reportResponsePromise
    assert.equal(reportResponse.ok(), true, `POST report-payment returned ${reportResponse.status()}`)

    await page.waitForURL((url) => url.pathname === `/oczekiwanie/${result.orderNumber}`, {
      timeout: 30000,
      waitUntil: 'domcontentloaded',
    })

    const reportedOrder = await getCommerceOrder(result.orderNumber)
    assert.equal(reportedOrder?.status, 'payment_reported', 'Order was not waiting for admin confirmation.')
    assert.ok(reportedOrder.adminConfirmationToken, 'Order did not have admin confirmation token.')
    const adminConfirmUrl = `${baseUrl}/api/admin/confirm-payment/${encodeURIComponent(reportedOrder.adminConfirmationToken)}?action=approve`

    const adminGetResponse = await page.request.get(adminConfirmUrl)
    result.adminConfirmGetStatus = adminGetResponse.status()
    assert.equal(adminGetResponse.ok(), true, `Admin confirmation GET returned ${adminGetResponse.status()}`)
    const adminGetHtml = await adminGetResponse.text()
    assert.match(adminGetHtml, /Potwierdź decyzję/)
    assert.match(adminGetHtml, /Samo otwarcie linku z e-maila niczego nie zmienia/)

    const afterGetOrder = await getCommerceOrder(result.orderNumber)
    result.statusAfterAdminGet = afterGetOrder?.status ?? null
    result.tokenUsedAfterAdminGet = Boolean(afterGetOrder?.adminConfirmationTokenUsedAt)
    assert.equal(result.statusAfterAdminGet, 'payment_reported', 'Admin confirmation GET mutated the order.')
    assert.equal(result.tokenUsedAfterAdminGet, false, 'Admin confirmation GET used the token.')

    const adminPostResponse = await page.request.post(adminConfirmUrl)
    result.adminConfirmPostStatus = adminPostResponse.status()
    assert.equal(adminPostResponse.ok(), true, `Admin confirmation POST returned ${adminPostResponse.status()}`)
    const adminPostHtml = await adminPostResponse.text()
    assert.match(adminPostHtml, /Płatność potwierdzona/)

    const statusResponse = await page.request.get(`${baseUrl}/api/orders/${encodeURIComponent(result.orderNumber)}/status`)
    assert.equal(statusResponse.ok(), true, `Order status API returned ${statusResponse.status()}`)
    const statusPayload = (await statusResponse.json()) as {
      status?: string
      readyUrl?: string | null
    }
    result.statusAfterAdminPost = statusPayload.status ?? null
    result.readyUrl = statusPayload.readyUrl ?? null
    assert.equal(result.statusAfterAdminPost, 'paid', 'Admin confirmation POST did not mark the order paid.')
    assert.ok(result.readyUrl, 'Confirmed order did not expose readyUrl.')

    const repeatPostResponse = await page.request.post(adminConfirmUrl)
    result.repeatPostStatus = repeatPostResponse.status()
    assert.equal(repeatPostResponse.ok(), true, `Repeat admin confirmation POST returned ${repeatPostResponse.status()}`)
    const repeatPostHtml = await repeatPostResponse.text()
    assert.match(repeatPostHtml, /Płatność była już potwierdzona/)

    if (result.bookingId) {
      const refunded = await markBookingRefunded(result.bookingId)
      assert.equal(refunded?.paymentStatus, 'refunded', 'Test booking cleanup did not mark the booking refunded.')
      result.cleanup = 'refunded'
      result.notes.push('Confirmed test booking was refunded/cancelled after smoke cleanup.')
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
