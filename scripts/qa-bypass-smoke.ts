import assert from 'node:assert/strict'
import { access, rm } from 'node:fs/promises'
import { spawn, type ChildProcess } from 'node:child_process'
import { loadEnvConfig } from '@next/env'
import { chromium, type Locator, type Page } from 'playwright-core'
import { createLocalDataSandbox } from './lib/local-data-sandbox'
import { resolveBrowserExecutablePath } from './lib/browser-path'

const rootDir = process.cwd()
const port = 3210 + Math.floor(Math.random() * 200)
const appUrl = `http://localhost:${port}`
const adminSecret = 'codex-admin-secret'
const routeNavigationTimeoutMs = 30_000
const slowRouteTimeoutMs = 120_000
const qaSmokeOwnerName = 'QA Smoke'
const qaSmokeEmail = 'qa-smoke@example.com'

function getWarsawSlotInMinutes(offsetMinutes: number) {
  const target = new Date(Date.now() + offsetMinutes * 60 * 1000)
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const values: Record<string, string> = {}

  for (const part of formatter.formatToParts(target)) {
    if (part.type !== 'literal') {
      values[part.type] = part.value
    }
  }

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  }
}

async function cleanLocalData(dataDir: string) {
  await rm(`${dataDir}/availability.json`, { force: true })
  await rm(`${dataDir}/pricing-settings.json`, { force: true })
  await rm(`${dataDir}/bookings.json`, { force: true })
  await rm(`${dataDir}/users.json`, { force: true })
  await rm(`${dataDir}/funnel-events.json`, { force: true })
  await rm(`${dataDir}/prep-materials`, { recursive: true, force: true })
}

async function waitForServer() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(appUrl, { cache: 'no-store' })
      if (response.status > 0) {
        return
      }
    } catch {}

    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  throw new Error('Local QA smoke server did not become ready in time.')
}

async function resolveBrowserExecutablePathLegacy() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ]

  for (const candidate of candidates) {
    try {
      await access(candidate)
      return candidate
    } catch {}
  }

  throw new Error('Nie znaleziono lokalnej przegladarki Chromium (Chrome lub Edge) do qa-bypass-smoke.')
}

async function isVisible(locator: Locator) {
  try {
    return await locator.isVisible()
  } catch {
    return false
  }
}

async function waitForCondition(check: () => Promise<boolean>, timeoutMs: number, errorMessage: string) {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    if (await check()) {
      return
    }

    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  throw new Error(errorMessage)
}

function isRetryableApiStatus(status: number) {
  return status === 404 || status === 503
}

function escapeAttributeValue(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function createBasicAuthHeader(password: string) {
  return `Basic ${Buffer.from(`admin:${password}`).toString('base64')}`
}

async function waitForBookingRow(page: Page, bookingId: string, bookingEmail: string, timeout = 20_000) {
  const deadline = Date.now() + timeout

  while (Date.now() < deadline) {
    const byId = page.locator(`[data-booking-id="${escapeAttributeValue(bookingId)}"]`).first()
    if (await isVisible(byId)) {
      return byId
    }

    const byEmail = page.locator(`[data-booking-email="${escapeAttributeValue(bookingEmail)}"]`).first()
    if (await isVisible(byEmail)) {
      return byEmail
    }

    const fallback = page.locator('.booking-row', { hasText: bookingEmail }).first()
    if (await isVisible(fallback)) {
      return fallback
    }

    await page.waitForTimeout(250)
  }

  throw new Error('Booking row was not visible in time.')
}

async function getTimerValue(page: Page) {
  try {
    return (await page.locator('.timer-box').first().innerText()).trim()
  } catch {
    return null
  }
}

async function roomIsMarkedActive(page: Page) {
  const timerValue = await getTimerValue(page)

  return (
    (await isVisible(page.getByText(/Rozmowa aktywna/i).first())) ||
    (await isVisible(page.getByRole('button', { name: /Rozmowa trwa/i }))) ||
    Boolean(timerValue && timerValue !== '15:00')
  )
}

async function startRoomTimerWithRetry(page: Page) {
  const deadline = Date.now() + 30_000
  let lastObservedTimer = (await getTimerValue(page)) ?? 'missing'
  let lastError = ''

  while (Date.now() < deadline) {
    if (await roomIsMarkedActive(page)) {
      return
    }

    const startButton = page.getByRole('button', { name: /Uruchom licznik 15 minut/i })

    if (await isVisible(startButton)) {
      try {
        await startButton.scrollIntoViewIfNeeded()
        await startButton.evaluate((button) => {
          ;(button as HTMLButtonElement).click()
        })
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error)
      }
    }

    await page.waitForTimeout(1000)
    lastObservedTimer = (await getTimerValue(page)) ?? lastObservedTimer
  }

  throw new Error(
    `Room timer started, but the UI did not switch to the active-room state in time. Last timer value: ${lastObservedTimer}.${lastError ? ` Last click error: ${lastError}` : ''}`,
  )
}

async function createAvailabilitySlotViaApi(bookingDate: string, bookingTime: string) {
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    const response = await fetch(`${appUrl}/api/availability`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: createBasicAuthHeader(adminSecret),
      },
      body: JSON.stringify({ bookingDate, bookingTime }),
    })

    const bodyText = await response.text()
    let payload: { slot?: { id?: string }; error?: string } = {}

    if ((response.headers.get('content-type') ?? '').includes('application/json')) {
      try {
        payload = JSON.parse(bodyText) as { slot?: { id?: string }; error?: string }
      } catch {}
    }

    if (response.ok && payload.slot?.id) {
      return payload.slot.id
    }

    const message = `POST /api/availability returned ${response.status}${payload.error ? `: ${payload.error}` : `: ${bodyText}`}.`

    if (attempt < 20 && isRetryableApiStatus(response.status)) {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      continue
    }

    assert.equal(response.ok, true, message)
    assert.ok(payload.slot?.id, 'Expected slot id from availability API.')
  }

  throw new Error('Expected slot id from availability API.')
}

async function createQaBookingViaApi(slotId: string, ownerName: string, problemType: 'szczeniak' | 'kot-stres') {
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    const response = await fetch(`${appUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ownerName,
        serviceType: null,
        problemType,
        animalType: problemType === 'kot-stres' ? 'Kot' : 'Pies',
        petAge: problemType === 'kot-stres' ? '3 lata' : '2 lata',
        durationNotes: 'QA smoke flow',
        description:
          problemType === 'kot-stres'
            ? 'Testowa rezerwacja QA dla sciezki bez realnej platnosci.'
            : 'Testowa rezerwacja QA dla sciezki adminowego potwierdzenia.',
        email: qaSmokeEmail,
        slotId,
        qaBooking: false,
      }),
    })

    const bodyText = await response.text()
    let payload: { bookingId?: string; accessToken?: string; error?: string } = {}

    if ((response.headers.get('content-type') ?? '').includes('application/json')) {
      try {
        payload = JSON.parse(bodyText) as { bookingId?: string; accessToken?: string; error?: string }
      } catch {}
    }

    if (response.ok && payload.bookingId && payload.accessToken) {
      return {
        bookingId: payload.bookingId,
        accessToken: payload.accessToken,
      }
    }

    const message = `POST /api/bookings returned ${response.status}${payload.error ? `: ${payload.error}` : `: ${bodyText}`}.`

    if (attempt < 20 && isRetryableApiStatus(response.status)) {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      continue
    }

    assert.equal(response.ok, true, message)
    assert.ok(payload.bookingId, 'Expected bookingId from QA booking API.')
    assert.ok(payload.accessToken, 'Expected access token from QA booking API.')
  }

  throw new Error('Expected bookingId from QA booking API.')
}

function isRetryableSmokeError(error: unknown) {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  return (
    message.includes('fetch failed') ||
    message.includes('ECONNREFUSED') ||
    message.includes('ERR_CONNECTION_REFUSED') ||
    message.includes('ERR_CONNECTION_RESET') ||
    message.includes('Local QA smoke server did not become ready') ||
    message.includes('Page crashed') ||
    message.includes('Target crashed') ||
    message.includes('Target page, context or browser has been closed')
  )
}

async function runQaSmokeOnce() {
  loadEnvConfig(rootDir)
  process.env.APP_DATA_MODE = 'local'
  process.env.APP_PAYMENT_MODE = 'mock'
  process.env.NEXT_PUBLIC_APP_URL = appUrl
  process.env.ADMIN_ACCESS_SECRET = adminSecret
  process.env.TEST_CHECKOUT_ENABLED = 'true'
  process.env.QA_CHECKOUT_EMAIL_ALLOWLIST = qaSmokeEmail
  process.env.QA_CHECKOUT_PHONE_ALLOWLIST = ''
  process.env.VERCEL_ENV = 'production'
  process.env.RESEND_API_KEY = ''
  process.env.MANUAL_PAYMENT_BLIK_PHONE = '512992026'
  process.env.MANUAL_PAYMENT_PAYPAL_ME_URL = 'paypal.me/regulskibehawiorysta'
  process.env.MANUAL_PAYMENT_ACCOUNT_NAME = 'Krzysztof Regulski'
  process.env.SMS_PROVIDER = 'disabled'
  delete process.env.PAYU_CLIENT_ID
  delete process.env.PAYU_CLIENT_SECRET
  delete process.env.PAYU_POS_ID
  delete process.env.PAYU_SECOND_KEY

  const sandbox = await createLocalDataSandbox('qa-bypass-smoke', rootDir)
  const { dataDir } = sandbox

  let server: ChildProcess | null = null
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null

  try {
    await cleanLocalData(dataDir)

    const devServerCommand = [
      'set "APP_DATA_MODE=local"',
      'set "APP_PAYMENT_MODE=mock"',
      `set "NEXT_PUBLIC_APP_URL=${appUrl}"`,
      `set "ADMIN_ACCESS_SECRET=${adminSecret}"`,
      'set "TEST_CHECKOUT_ENABLED=true"',
      `set "QA_CHECKOUT_EMAIL_ALLOWLIST=${qaSmokeEmail}"`,
      'set "QA_CHECKOUT_PHONE_ALLOWLIST="',
      'set "VERCEL_ENV=production"',
      'set "RESEND_API_KEY="',
      'set "MANUAL_PAYMENT_BLIK_PHONE=512992026"',
      'set "MANUAL_PAYMENT_PAYPAL_ME_URL=paypal.me/regulskibehawiorysta"',
      'set "MANUAL_PAYMENT_ACCOUNT_NAME=Krzysztof Regulski"',
      'set "SMS_PROVIDER=disabled"',
      `set "APP_LOCAL_DATA_DIR=${dataDir}"`,
      `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    ].join(' && ')

    server = spawn('cmd.exe', ['/d', '/s', '/c', devServerCommand], {
      cwd: rootDir,
      env: process.env,
      stdio: 'ignore',
      windowsHide: true,
    })

    await waitForServer()
    await Promise.all(
      ['/', '/404', '/500', '/book', '/admin'].map((route) =>
        fetch(`${appUrl}${route}`, { cache: 'no-store' }).catch(() => null),
      ),
    )
    await fetch(`${appUrl}/api/availability`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: createBasicAuthHeader(adminSecret),
      },
      body: JSON.stringify({ bookingDate: '2000-01-01', bookingTime: '00:00' }),
    }).catch(() => null)

    const checkoutSlot = getWarsawSlotInMinutes(14)
    const checkoutAvailabilityId = await createAvailabilitySlotViaApi(checkoutSlot.date, checkoutSlot.time)

    assert.ok(checkoutAvailabilityId, 'Expected a custom QA checkout slot.')

    browser = await chromium.launch({
      headless: true,
      executablePath: await resolveBrowserExecutablePath(),
    })

    const publicContext = await browser.newContext({
      locale: 'pl-PL',
      viewport: { width: 390, height: 844 },
    })
    const adminContext = await browser.newContext({
      locale: 'pl-PL',
      viewport: { width: 1440, height: 1200 },
      httpCredentials: { username: 'admin', password: adminSecret },
    })

    const publicPage = await publicContext.newPage()
    const adminPage = await adminContext.newPage()

    const checkoutBooking = await createQaBookingViaApi(checkoutAvailabilityId, `${qaSmokeOwnerName} Checkout`, 'kot-stres')
    await publicPage.goto(
      `${appUrl}/payment?bookingId=${encodeURIComponent(checkoutBooking.bookingId)}&access=${encodeURIComponent(checkoutBooking.accessToken)}`,
      { waitUntil: 'domcontentloaded' },
    )
    await publicPage.getByRole('heading', { name: /Opłać rezerwację|Wpłata została zgłoszona/i }).waitFor()
    await publicPage.locator('[data-payment-method-selected="manual"]').waitFor()
    assert.equal(await publicPage.locator('[data-qa-booking="true"]').count(), 0)
    assert.equal(await publicPage.locator('[data-payment-submit="manual"]').count(), 1)
    assert.equal(await publicPage.locator('[data-payment-submit="qa"]').count(), 0)
    assert.equal(await publicPage.locator('[data-payment-submit="payu"]').count(), 0)

    const manualResponse = await fetch(`${appUrl}/api/payments/manual`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bookingId: checkoutBooking.bookingId,
        accessToken: checkoutBooking.accessToken,
      }),
    })
    const manualPayload = (await manualResponse.json()) as { redirectTo?: string; error?: string }
    assert.equal(manualResponse.ok, true)
    assert.ok(manualPayload.redirectTo, 'Expected redirectTo from manual payment API.')
    await publicPage.goto(new URL(manualPayload.redirectTo, appUrl).toString(), { waitUntil: 'domcontentloaded' })

    await publicPage.locator('[data-confirmation-state="pending-manual-review"]').waitFor()
    await publicPage.getByRole('heading', { name: /Wpłata czeka na potwierdzenie do 60 min/i }).waitFor()
    await adminPage.goto(`${appUrl}/admin`, { waitUntil: 'domcontentloaded' })
    await adminPage.getByRole('heading', { name: /Rezerwacje.*terminy/i }).waitFor()
    const bookingRow = await waitForBookingRow(adminPage, checkoutBooking.bookingId, qaSmokeEmail)
    const approveButton = bookingRow.locator('[data-admin-manual-action="approve"]').first()
    await approveButton.waitFor()

    const approveResponsePromise = adminPage
      .waitForResponse(
        (response) =>
          response.url().includes(`/api/admin/bookings/${checkoutBooking.bookingId}/manual-payment`) &&
          response.request().method() === 'POST',
        { timeout: routeNavigationTimeoutMs },
      )
      .catch(() => null)
    await approveButton.click({ force: true })
    const approveResponse = await approveResponsePromise
    if (approveResponse) {
      assert.equal(approveResponse.ok(), true)
    }

    try {
      await adminPage.waitForLoadState('domcontentloaded', { timeout: 10_000 })
    } catch {}

    let refreshedRow = await waitForBookingRow(adminPage, checkoutBooking.bookingId, qaSmokeEmail)

    if (!(await isVisible(refreshedRow.locator('[data-admin-booking-action="done"]').first()))) {
      await adminPage.reload({ waitUntil: 'domcontentloaded' })
      refreshedRow = await waitForBookingRow(adminPage, checkoutBooking.bookingId, qaSmokeEmail)
    }

    await waitForCondition(
      async () => isVisible(refreshedRow.locator('[data-admin-booking-action="done"]').first()),
      slowRouteTimeoutMs,
      'Manual approve did not expose the done action in admin in time.',
    )

    await publicPage.reload({ waitUntil: 'domcontentloaded' })
    await publicPage.locator('[data-confirmation-state="confirmed"]').waitFor()
    await publicPage.getByRole('heading', { name: /Wpłata za .* została potwierdzona/i }).waitFor()
    assert.equal(await publicPage.locator('textarea').count() > 0, true)
    const roomJoinHref = await publicPage.getByRole('link', { name: /Zobacz pokój rozmowy audio|Zobacz pokój rozmowy/i }).getAttribute('href')
    assert.ok(roomJoinHref, 'Expected confirmation page to expose room link.')

    await publicPage.goto(new URL(roomJoinHref, appUrl).toString(), { waitUntil: 'domcontentloaded' })
    await publicPage.getByRole('button', { name: /Uruchom licznik .* minut/i }).waitFor({ timeout: 10_000 })
    await startRoomTimerWithRetry(publicPage)
    assert.equal(await publicPage.getByText(/Pokój aktywny|Rozmowa aktywna/i).isVisible(), true)

    await adminPage.close()
    await publicPage.close()
    await publicContext.close()
    await adminContext.close()
  } finally {
    if (browser) {
      await browser.close().catch(() => {})
    }

    if (server) {
      server.kill()
    }

    await sandbox.cleanup().catch(() => {})
  }
}

async function main() {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      await runQaSmokeOnce()
      return
    } catch (error) {
      if (attempt === 2 || !isRetryableSmokeError(error)) {
        throw error
      }
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error)
  process.exitCode = 1
})
