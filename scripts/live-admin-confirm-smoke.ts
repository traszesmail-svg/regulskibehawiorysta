import assert from 'node:assert/strict'
import { loadEnvConfig } from '@next/env'
import { chromium } from 'playwright-core'
import { SITE_PRODUCTION_URL } from '../lib/site'
import { markBookingRefunded } from '../lib/server/db'
import { resolveBrowserExecutablePath } from './lib/browser-path'
import { applyOptionalEnvFileOverride } from './lib/env-file'

type SmokeResult = {
  baseUrl: string
  bookingId: string | null
  accessTokenPresent: boolean
  adminApproveStatus: number | null
  statusBeforeAdminApprove: string | null
  statusAfterAdminApprove: string | null
  repeatApproveStatus: number | null
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
    if (part.type !== 'literal') values[part.type] = part.value
  }

  return `${values.year}${values.month}${values.day}-${values.hour}${values.minute}${values.second}`
}

function createBasicAuthHeader(password: string) {
  return `Basic ${Buffer.from(`admin:${password}`).toString('base64')}`
}

async function main() {
  loadEnvConfig(process.cwd())
  const runtimeAdminSecret = process.env.ADMIN_ACCESS_SECRET?.trim()
  const envOverridePath = applyOptionalEnvFileOverride(process.cwd())
  assert.ok(
    envOverridePath,
    'This smoke creates a paid production booking. Re-run with --env-file .env.production so the test can refund its own booking.',
  )
  process.env.APP_DATA_MODE = 'supabase'

  const baseUrl = resolveBaseUrl()
  const timestamp = getWarsawCompactTimestamp()
  const result: SmokeResult = {
    baseUrl,
    bookingId: null,
    accessTokenPresent: false,
    adminApproveStatus: null,
    statusBeforeAdminApprove: null,
    statusAfterAdminApprove: null,
    repeatApproveStatus: null,
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

    await page.goto(`${baseUrl}/zapytaj`, { waitUntil: 'domcontentloaded' })
    await page.locator('#zapytaj-page-title').waitFor({ timeout: 30000 })

    const firstSlot = page.locator('.zapytaj-slot-option:visible').first()
    await firstSlot.waitFor({ timeout: 30000 })
    await firstSlot.click()

    await page.locator('form.zapytaj-form').waitFor({ timeout: 30000 })
    await page.locator('#zapytaj-name').fill(`QA live admin confirm ${timestamp}`)
    await page.locator('#zapytaj-phone').fill('500600700')
    await page.locator('#zapytaj-email').fill(`qa-live-confirm-${timestamp}@example.com`)
    await page.locator('input[name="species"][value="pies"]').check()
    await page.locator('#zapytaj-description').fill('Kontrolny test produkcyjnego potwierdzenia admina: GET bez mutacji, POST potwierdza, powtórka nie psuje stanu.')

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
    assert.equal(bookingResponse.ok(), true, `POST /api/zapytaj returned ${bookingResponse.status()}`)

    await page.waitForURL((url) => url.pathname === '/payment' && url.searchParams.has('bookingId') && url.searchParams.has('access'), {
      timeout: 30000,
      waitUntil: 'domcontentloaded',
    })
    const paymentUrl = new URL(page.url())
    result.bookingId = paymentUrl.searchParams.get('bookingId')
    const accessToken = paymentUrl.searchParams.get('access')
    result.accessTokenPresent = Boolean(accessToken)
    assert.ok(result.bookingId, 'Payment URL did not include bookingId.')
    assert.equal(result.accessTokenPresent, true, 'Payment URL did not include access token.')
    await page.locator('[data-payment-state="payment-selection"]').waitFor({ timeout: 30000 })
    assert.equal(await page.locator('[data-direct-manual-flow="true"]').count(), 1, 'Zapytaj payment page did not expose direct manual payment flow.')

    const manualResponsePromise = page.waitForResponse(
      (response) => new URL(response.url()).pathname === '/api/payments/manual' && response.request().method() === 'POST',
      { timeout: 45000 },
    )
    await page.locator('[data-payment-submit="manual-direct"]').click()
    const manualResponse = await manualResponsePromise
    assert.equal(manualResponse.ok(), true, `POST /api/payments/manual returned ${manualResponse.status()}`)

    await page.waitForURL(
      (url) => url.pathname === '/confirmation' && url.searchParams.get('bookingId') === result.bookingId && url.searchParams.get('manual') === 'reported',
      { timeout: 30000, waitUntil: 'domcontentloaded' },
    )
    await page.locator('[data-confirmation-state="pending-manual-review"]').waitFor({ timeout: 30000 })

    const statusUrl = `${baseUrl}/api/bookings/${encodeURIComponent(result.bookingId)}/status?access=${encodeURIComponent(accessToken ?? '')}`
    const beforeApproveResponse = await page.request.get(statusUrl)
    assert.equal(beforeApproveResponse.ok(), true, `Booking status API returned ${beforeApproveResponse.status()}`)
    const beforeApprovePayload = (await beforeApproveResponse.json()) as {
      bookingStatus?: string
      paymentStatus?: string
      paymentMethod?: string | null
    }
    result.statusBeforeAdminApprove = `${beforeApprovePayload.bookingStatus ?? 'unknown'}:${beforeApprovePayload.paymentStatus ?? 'unknown'}`
    assert.equal(result.statusBeforeAdminApprove, 'pending_manual_payment:pending_manual_review', 'Booking was not waiting for admin confirmation.')
    assert.equal(beforeApprovePayload.paymentMethod ?? null, 'manual', 'Booking did not retain manual payment method.')

    const adminSecret = runtimeAdminSecret ?? process.env.ADMIN_ACCESS_SECRET?.trim()
    assert.ok(adminSecret, 'Missing ADMIN_ACCESS_SECRET for live admin confirmation smoke.')
    const adminEndpoint = `${baseUrl}/api/admin/bookings/${encodeURIComponent(result.bookingId)}/manual-payment`
    const adminHeaders = {
      authorization: createBasicAuthHeader(adminSecret),
      'content-type': 'application/json',
    }

    const adminApproveResponse = await page.request.post(adminEndpoint, {
      headers: adminHeaders,
      data: { action: 'approve' },
    })
    result.adminApproveStatus = adminApproveResponse.status()
    assert.equal(adminApproveResponse.ok(), true, `Admin approval returned ${adminApproveResponse.status()}`)

    const afterApproveResponse = await page.request.get(statusUrl)
    assert.equal(afterApproveResponse.ok(), true, `Booking status after admin approval returned ${afterApproveResponse.status()}`)
    const afterApprovePayload = (await afterApproveResponse.json()) as {
      bookingStatus?: string
      paymentStatus?: string
      paymentMethod?: string | null
    }
    result.statusAfterAdminApprove = `${afterApprovePayload.bookingStatus ?? 'unknown'}:${afterApprovePayload.paymentStatus ?? 'unknown'}`
    assert.equal(result.statusAfterAdminApprove, 'confirmed:paid', 'Admin approval did not confirm the booking.')
    assert.equal(afterApprovePayload.paymentMethod ?? null, 'manual', 'Admin approval changed the payment method unexpectedly.')

    const repeatApproveResponse = await page.request.post(adminEndpoint, {
      headers: adminHeaders,
      data: { action: 'approve' },
    })
    result.repeatApproveStatus = repeatApproveResponse.status()
    assert.equal(repeatApproveResponse.ok(), true, `Repeat admin approval returned ${repeatApproveResponse.status()}`)

    const refunded = await markBookingRefunded(result.bookingId)
    assert.equal(refunded?.bookingStatus, 'cancelled', 'Test booking cleanup did not cancel the booking.')
    assert.equal(refunded?.paymentStatus, 'refunded', 'Test booking cleanup did not mark the booking refunded.')
    result.cleanup = 'refunded'
    result.notes.push('Confirmed test booking was refunded/cancelled after smoke cleanup.')
    result.notes.push('Booking approval was tested before the future slot window, so Zadarma was not called.')

    console.log(JSON.stringify(result, null, 2))
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
