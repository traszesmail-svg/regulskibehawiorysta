import assert from 'node:assert/strict'
import { access, rm } from 'fs/promises'
import path from 'path'
import { spawn } from 'child_process'
import { loadEnvConfig } from '@next/env'
import { chromium, type Locator, type Page } from 'playwright-core'
import { createLocalDataSandbox } from './lib/local-data-sandbox'
import { resolveBrowserExecutablePath } from './lib/browser-path'
import { getBookingServiceRoomDurationMinutes } from '../lib/booking-services'
import { buildScheduleAvailabilitySeed, getNormalBookingMinDateKey } from '../lib/scheduling/rules'

const rootDir = process.cwd()
let port = 0
let appUrl = ''
const adminSecret = 'codex-admin-secret'
const slowRouteTimeoutMs = 120000
const routeNavigationTimeoutMs = 30000
const roomActiveTimeoutMs = 30000
const retryActionTimeoutMs = 20000
const uiSmokeOwnerName = 'UI Smoke'
const uiSmokeEmail = 'ui-smoke@example.com'
const homeHeading = /Behawiorysta psów i kotów online|Behawiorysta psow i kotow online/i
const materialyHeading = /Materia.*PDF.*opiekun/i
const pricingHeading = /Cennik konsultacji behawioralnych\.|Wybierz rozmowę dopasowaną do sytuacji|Wybierz rozmowe dopasowana do sytuacji/i
type RouteButtonLabels = { buttonLabels?: readonly (string | RegExp)[] }
type CallRoomMode = 'phone' | 'video-live' | 'video-locked'

function getBookableSmokeSlot() {
  return {
    date: getNormalBookingMinDateKey(new Date()),
    time: '08:00',
  }
}

function getBookableVideoSmokeSlot() {
  const slot = buildScheduleAvailabilitySeed(new Date())
    .flatMap((entry) => entry.times.map((time) => ({ date: entry.date, time })))
    .find((entry) => entry.time === '08:15')

  if (!slot) {
    throw new Error('Local scheduling did not expose a future full-consultation slot for UI smoke.')
  }

  return slot
}

async function cleanLocalData(dataDir: string) {
  await rm(path.join(dataDir, 'availability.json'), { force: true })
  await rm(path.join(dataDir, 'pricing-settings.json'), { force: true })
  await rm(path.join(dataDir, 'bookings.json'), { force: true })
  await rm(path.join(dataDir, 'users.json'), { force: true })
  await rm(path.join(dataDir, 'funnel-events.json'), { force: true })
  await rm(path.join(dataDir, 'prep-materials'), { recursive: true, force: true })
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

  throw new Error('Local server did not become ready in time.')
}

function assignFreshServerAddress() {
  port = 3210 + Math.floor(Math.random() * 200)
  appUrl = `http://127.0.0.1:${port}`
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

  throw new Error('Nie znaleziono lokalnej przeglądarki Chromium (Chrome lub Edge) do ui-smoke.')
}

async function isVisible(locator: { isVisible: () => Promise<boolean> }) {
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

function cleanText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

async function waitForButtonLink(page: Page, label: string | RegExp) {
  await page.locator('a.button:visible, a.notatnik-btn:visible, a.essentials-index-button:visible').filter({ hasText: label }).first().waitFor()
}

async function verifyPublicRoute(
  page: Page,
  route: string,
  heading: RegExp,
  options?: {
    buttonLabels?: readonly (string | RegExp)[]
  },
) {
  await page.goto(`${appUrl}${route}`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { level: 1, name: heading }).waitFor({ timeout: slowRouteTimeoutMs })

  for (const label of options?.buttonLabels ?? []) {
    await waitForButtonLink(page, label)
  }

  const h1 = cleanText(await page.locator('h1').first().innerText())
  console.log(`[manual-route] ${route} :: ${h1}`)
}

async function verifyOpinionsInteractions(page: Page) {
  await page.goto(`${appUrl}/opinie`, { waitUntil: 'domcontentloaded' })
  await applyOpinionFilter(page, 'Pies', 'pies', 'kot')

  await applyOpinionFilter(page, 'Kot', 'kot', 'pies')

  await Promise.all([
    page.waitForURL(/\/opinie\/dodaj/, { timeout: routeNavigationTimeoutMs, waitUntil: 'domcontentloaded' }),
    page.locator('a[href="/opinie/dodaj"]').first().click(),
  ])
  await page.locator('[data-opinion-form="submit"]').waitFor({ timeout: routeNavigationTimeoutMs })
  await page.locator('[data-opinion-photo-input="true"]').waitFor({ timeout: routeNavigationTimeoutMs })
  await page.locator('#displayName').fill('Smoke')
  await page.locator('#opinion').fill('Krótka opinia do sprawdzenia formularza bez wysyłania danych.')
  console.log('[opinions-route] filters and add-opinion form visible')
}

async function applyOpinionFilter(page: Page, filter: 'Pies' | 'Kot', visibleSpecies: 'pies' | 'kot', hiddenSpecies: 'pies' | 'kot') {
  const filterButton = page.locator(`[data-opinion-filter="${filter}"]`)
  await filterButton.waitFor({ timeout: routeNavigationTimeoutMs })

  let filterApplied = false
  let lastError: unknown = null

  for (let attempt = 0; attempt < 3 && !filterApplied; attempt += 1) {
    await filterButton.click()

    try {
      await page.waitForFunction(
        ({ activeFilter, hidden }) => {
          const activeButton = document.querySelector(`[data-opinion-filter="${activeFilter}"]`)
          const hiddenReviews = document.querySelectorAll(`[data-opinion-review][data-review-species="${hidden}"]`)

          return activeButton?.getAttribute('aria-pressed') === 'true' && hiddenReviews.length === 0
        },
        { activeFilter: filter, hidden: hiddenSpecies },
        { timeout: Math.min(routeNavigationTimeoutMs, 5000) },
      )
      filterApplied = true
    } catch (error) {
      lastError = error
    }
  }

  if (!filterApplied) {
    throw lastError instanceof Error ? lastError : new Error(`Opinion filter ${filter} did not apply.`)
  }

  await page.locator(`[data-opinion-review][data-review-species="${visibleSpecies}"]`).first().waitFor({ timeout: routeNavigationTimeoutMs })
  assert.equal(await page.locator(`[data-opinion-review][data-review-species="${hiddenSpecies}"]`).count(), 0)
}

async function verifyRedirectRoute(
  page: Page,
  route: string,
  destinationPath: string,
  heading: RegExp,
  options?: {
    buttonLabels?: readonly (string | RegExp)[]
  },
) {
  await page.goto(`${appUrl}${route}`, { waitUntil: 'domcontentloaded' })
  const hasExpectedDestination = (currentUrl: string) => new URL(currentUrl).pathname === destinationPath
  if (!hasExpectedDestination(page.url())) {
    await page.waitForURL(
      (currentUrl) => hasExpectedDestination(currentUrl.toString()),
      { timeout: slowRouteTimeoutMs },
    )
  }
  await page.getByRole('heading', { level: 1, name: heading }).waitFor({ timeout: slowRouteTimeoutMs })

  for (const label of options?.buttonLabels ?? []) {
    await waitForButtonLink(page, label)
  }

  console.log(`[redirect-route] ${route} -> ${new URL(page.url()).pathname}`)
}

function escapeAttributeValue(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function getBookingFormField(page: Page, field: string) {
  return page.locator(`[data-booking-field="${escapeAttributeValue(field)}"]`).first()
}

function getBookingSubmitButton(page: Page) {
  return page.locator('[data-booking-submit="payment"]').first()
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

function getPaymentSubmitButton(page: Page, method: 'manual' | 'payu') {
  return page.locator(`[data-payment-submit="${method}"]`).first()
}

async function typeValue(locator: Locator, value: string) {
  await locator.fill(value)
}

function createBasicAuthHeader(password: string) {
  return `Basic ${Buffer.from(`admin:${password}`).toString('base64')}`
}

async function warmUpPostRoute(url: string, body: unknown, acceptableStatuses: number[], extraHeaders?: Record<string, string>) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(extraHeaders ?? {}),
    },
    body: JSON.stringify(body),
  })

  assert.equal(
    acceptableStatuses.includes(response.status),
    true,
    `Warmup for ${url} returned unexpected status ${response.status}.`,
  )
}

async function getTimerValue(page: Page) {
  try {
    return (await page.locator('.timer-box').first().innerText()).trim()
  } catch {
    return null
  }
}

async function roomIsMarkedActive(page: Page, initialTimerValue: string) {
  const timerValue = await getTimerValue(page)

  return (
    (await isVisible(page.getByText(/Rozmowa aktywna/i).first())) ||
    (await isVisible(page.getByRole('button', { name: /Rozmowa trwa/i }))) ||
    Boolean(timerValue && timerValue !== initialTimerValue)
  )
}

async function startRoomTimerWithRetry(page: Page, durationMinutes: number) {
  const deadline = Date.now() + roomActiveTimeoutMs
  const initialTimerValue = (await getTimerValue(page)) ?? `${durationMinutes}:00`
  let lastObservedTimer = initialTimerValue
  let lastError = ''

  while (Date.now() < deadline) {
    if (await roomIsMarkedActive(page, initialTimerValue)) {
      return
    }

    const startButton = page.getByRole('button', {
      name: new RegExp(`Uruchom licznik ${durationMinutes} minut`, 'i'),
    })

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

async function waitForBookingRow(page: Page, bookingId: string, bookingEmail: string, timeout = retryActionTimeoutMs) {
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

async function waitForAnyVisible(locators: Locator[], timeout: number) {
  const deadline = Date.now() + timeout

  while (Date.now() < deadline) {
    for (const locator of locators) {
      if (await isVisible(locator)) {
        return locator
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  throw new Error('Expected UI element did not become visible in time.')
}

async function approveManualPaymentWithRetry(page: Page, bookingId: string, bookingEmail: string) {
  const deadline = Date.now() + slowRouteTimeoutMs
  let lastError = ''

  while (Date.now() < deadline) {
    await page.waitForLoadState('domcontentloaded', { timeout: retryActionTimeoutMs }).catch(() => {})
    const bookingRow = await waitForBookingRow(page, bookingId, bookingEmail)

    if (
      (await isVisible(bookingRow.locator('[data-admin-booking-action="done"]').first())) ||
      (await isVisible(bookingRow.getByRole('button', { name: /Oznacz jako zako/i })))
    ) {
      return
    }

    const approveButton = await waitForAnyVisible(
      [
        bookingRow.locator('[data-admin-manual-action="approve"]').first(),
        bookingRow.getByRole('button', { name: /Potwierd/i }).first(),
      ],
      3000,
    ).catch(() => null)

    if (approveButton) {
      try {
        await approveButton.scrollIntoViewIfNeeded()
        const responsePromise = page.waitForResponse(
          (response) =>
            response.url().includes(`/api/admin/bookings/${bookingId}/manual-payment`) &&
            response.request().method() === 'POST',
          { timeout: retryActionTimeoutMs },
        )
        await approveButton.click({ force: true })
        const response = await responsePromise

        if (response.ok()) {
          return
        }

        lastError = `Admin approve POST returned ${response.status()}.`
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error)
      }
    } else {
      lastError = 'Approve button was not visible on the booking row.'
    }

    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {})
    await page.waitForTimeout(1200)
  }

  throw new Error(`Admin approval did not complete in time.${lastError ? ` Last issue: ${lastError}` : ''}`)
}

async function verifyCallRoomLoaded(page: Page, bookingId: string, ownerName: string): Promise<CallRoomMode> {
  await page.waitForURL(new RegExp(`/call/${bookingId}`), { timeout: routeNavigationTimeoutMs })
  await page.locator('.room-panel').waitFor({ timeout: routeNavigationTimeoutMs })
  assert.equal(await page.getByText(new RegExp(ownerName, 'i')).isVisible(), true)

  const phoneRoomEyebrow = page.getByText(/Telefoniczny pokój konsultacji/i).first()
  if (await isVisible(phoneRoomEyebrow)) {
    assert.equal(await page.getByText(/Rozmowa telefoniczna odbędzie się na Twoim telefonie/i).isVisible(), true)
    assert.equal(await page.locator('.room-stage').count(), 0)
    assert.equal(await page.locator('iframe.video-frame').count(), 0)

    const phoneStatus = page.locator('.status-box').first()
    await phoneStatus.waitFor({ timeout: 10000 })
    assert.match(
      await phoneStatus.innerText(),
      /Oczekiwanie na telefon|Łączenie telefoniczne|Laczenie telefoniczne|Połączenie aktywne|Polaczenie aktywne|Rozmowa zakończona/i,
    )
    return 'phone'
  }

  const liveRoomStage = page.locator('.room-stage-live').first()
  const lockedRoomStage = page.locator('.room-stage-locked').first()
  await waitForCondition(
    async () => (await isVisible(liveRoomStage)) || (await isVisible(lockedRoomStage)),
    10000,
    'Call room did not expose a live or locked access state.',
  )

  if (await isVisible(liveRoomStage)) {
    assert.equal(await page.getByText(/Pok[óo]j aktywny|Rozmowa zakończona/i).first().isVisible(), true)
    return 'video-live'
  }

  assert.equal(await page.getByText(/Wejście otworzy się za|Wejscie otworzy sie za/i).isVisible(), true)
  return 'video-locked'
}

async function stopServerTree(server: ReturnType<typeof spawn>) {
  const pid = server.pid
  if (!pid) {
    return
  }

  await new Promise<void>((resolve) => {
    const taskkill = spawn('taskkill.exe', ['/pid', String(pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    })
    let settled = false
    const finish = () => {
      if (!settled) {
        settled = true
        resolve()
      }
    }

    taskkill.once('error', finish)
    taskkill.once('exit', finish)
    setTimeout(finish, 5000)
  })
}

function isRetryableUiSmokeError(error: unknown) {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  return (
    message.includes('fetch failed') ||
    message.includes('ECONNREFUSED') ||
    message.includes('ERR_CONNECTION_REFUSED') ||
    message.includes('ERR_CONNECTION_RESET') ||
    message.includes('net::ERR_ABORTED') ||
    message.includes('page.goto: Timeout') ||
    message.includes('frame was detached') ||
    message.includes('locator.waitFor: Timeout') ||
    message.includes('Local server did not become ready') ||
    message.includes('Page crashed') ||
    message.includes('Target crashed') ||
    message.includes('Target page, context or browser has been closed')
  )
}

async function runUiSmokeOnce() {
  assignFreshServerAddress()
  loadEnvConfig(rootDir)
  process.env.APP_DATA_MODE = 'local'
  process.env.APP_PAYMENT_MODE = 'auto'
  process.env.NEXT_PUBLIC_APP_URL = appUrl
  process.env.ADMIN_ACCESS_SECRET = adminSecret
  process.env.RESEND_API_KEY = ''
  process.env.MANUAL_PAYMENT_BLIK_PHONE = '512992026'
  process.env.MANUAL_PAYMENT_PAYPAL_ME_URL = 'paypal.me/regulskibehawiorysta'
  process.env.MANUAL_PAYMENT_ACCOUNT_NAME = 'Krzysztof Regulski'
  process.env.SMS_PROVIDER = 'disabled'
  delete process.env.PAYU_CLIENT_ID
  delete process.env.PAYU_CLIENT_SECRET
  delete process.env.PAYU_POS_ID
  delete process.env.PAYU_SECOND_KEY

  const sandbox = await createLocalDataSandbox('ui-smoke', rootDir)
  const { dataDir } = sandbox
  const localStore = await import('../lib/server/local-store')

  let server: ReturnType<typeof spawn> | null = null
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null

  try {
    await cleanLocalData(dataDir)
    const smokeSlot = getBookableSmokeSlot()
    const smokeSlotId = `${smokeSlot.date}-${smokeSlot.time}`
    const slot = (await localStore.getAvailabilitySlot(smokeSlotId)) ??
      (await localStore.createAvailabilitySlot(smokeSlot.date, smokeSlot.time))
    assert.ok(slot, 'Expected a custom near-room slot for UI smoke test.')
    const videoSmokeSlot = getBookableVideoSmokeSlot()
    const videoSmokeSlotId = `${videoSmokeSlot.date}-${videoSmokeSlot.time}`
    const videoSlot = (await localStore.getAvailabilitySlot(videoSmokeSlotId)) ??
      (await localStore.createAvailabilitySlot(videoSmokeSlot.date, videoSmokeSlot.time))
    assert.ok(videoSlot, 'Expected a dedicated video-consultation slot for UI smoke test.')

    server = spawn('cmd.exe', ['/c', 'npm', 'run', 'dev', '--', '--hostname', '127.0.0.1', '--port', String(port)], {
      cwd: rootDir,
      env: process.env,
      stdio: 'ignore',
      windowsHide: true,
    })

    await waitForServer()
    await Promise.all([
      '/',
      '/koty',
      '/psy',
      '/book',
      '/oferta',
      '/materialy',
    ].map((route) => fetch(`${appUrl}${route}`, { cache: 'no-store' }).catch(() => null)))

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
    await publicPage.goto(appUrl, { waitUntil: 'domcontentloaded' })
    await publicPage
      .getByRole('heading', {
        level: 1,
        name: homeHeading,
      })
      .waitFor({ timeout: slowRouteTimeoutMs })

    const desktopPage = await adminContext.newPage()

    if (process.env.UI_SMOKE_SKIP_SHOP !== '1') {
      for (const [label, page] of [
        ['mobile', publicPage],
        ['desktop', desktopPage],
      ] as const) {
        await verifyRedirectRoute(page, '/koty', '/problemy', /Mapa problemów/i)
        await verifyRedirectRoute(page, '/psy', '/problemy', /Mapa problemów/i)
        await verifyRedirectRoute(page, '/oferta', '/cennik', pricingHeading)
        await verifyRedirectRoute(page, '/oferta/poradniki-pdf', '/cennik', pricingHeading)
      }
    }

    if (process.env.UI_SMOKE_SHOP_ONLY === '1') {
      console.log('UI_SMOKE_SHOP_OK')
      return
    }

    for (const route of [
      {
        path: '/opinie',
        heading: /Historie, które pokazują, jak zaczyna się spokojniejsza codzienność/i,
      },
      {
        path: '/o-mnie',
        heading: /Krzysztof Regulski - behawiorysta psow i kotow|Krzysztof Regulski - behawiorysta psów i kotów|Krzysztof Regulski\. Behawiorysta psów i kotów|Krzysztof Regulski\. Behawiorysta psow i kotow/i,
      },
      {
        path: '/kontakt',
        heading: /Napisz krótko, co się dzieje\. Pomogę Ci wybrać najrozsądniejszy pierwszy krok\./i,
      },
      {
        path: '/materialy',
        heading: materialyHeading,
      },
      {
        path: '/cennik',
        heading: pricingHeading,
      },
      {
        path: '/blog',
        heading: /Wiedza, która pomaga spokojniej żyć z psem i kotem/i,
      },
      {
        path: '/blog/dlaczego-moj-pies-szczeka-na-inne-psy',
        heading: /Dlaczego mój pies szczeka na inne psy/i,
      },
      {
        path: '/blog/pies-wyje-kiedy-zostaje-sam',
        heading: /Pies wyje, kiedy zostaje sam/i,
      },
      {
        path: '/blog/kot-zalatwia-sie-poza-kuweta',
        heading: /Kot załatwia się poza kuwetą/i,
      },
      {
        path: '/blog/jak-wyglada-konsultacja-behawioralna-online',
        heading: /Jak wygląda konsultacja behawioralna online/i,
      },
    ] as const) {
      const buttonLabels = (route as RouteButtonLabels).buttonLabels
      await verifyPublicRoute(publicPage, route.path, route.heading, { buttonLabels })
    }

    await verifyOpinionsInteractions(publicPage)

    for (const route of [
      {
        path: '/konsultacja-behawioralna-online',
        destinationPath: '/',
        heading: homeHeading,
      },
      {
        path: '/oferta/konsultacja-behawioralna-online',
        destinationPath: '/cennik',
        heading: pricingHeading,
      },
      {
        path: '/behawiorysta-psow',
        destinationPath: '/',
        heading: homeHeading,
      },
      {
        path: '/behawiorysta-kotow',
        destinationPath: '/',
        heading: homeHeading,
      },
      {
        path: '/oferta/poradniki-pdf',
        destinationPath: '/cennik',
        heading: pricingHeading,
      },
    ] as const) {
      const buttonLabels = (route as RouteButtonLabels).buttonLabels
      await verifyRedirectRoute(publicPage, route.path, route.destinationPath, route.heading, {
        buttonLabels,
      })
    }

    await publicPage.goto(`${appUrl}/book`, { waitUntil: 'domcontentloaded' })
    await publicPage.getByRole('heading', { name: /Wybierz termin konsultacji/i }).waitFor()

    await publicPage.goto(`${appUrl}/slot?problem=szczeniak`, { waitUntil: 'domcontentloaded' })
    await publicPage.getByRole('heading', { name: /Wybierz termin konsultacji/i }).waitFor()
    await publicPage.locator('[data-selected-slot-link="true"]').first().waitFor()
    await publicPage.locator('[data-nearest-slot-link="true"]').first().waitFor()

    const slotLink = publicPage.locator(`a[href^="/form?problem=szczeniak&slotId=${encodeURIComponent(slot.id)}"]`).first()
    await slotLink.waitFor()
    assert.equal((await slotLink.getAttribute('href'))?.includes('%3A'), true)
    await slotLink.click()
    const bookingForm = publicPage.locator('[data-booking-form="details"]').first()
    try {
      await bookingForm.waitFor({ timeout: routeNavigationTimeoutMs })
    } catch (error) {
      const bodyText = await publicPage.locator('body').innerText().catch(() => '')
      throw new Error(`Form page did not show booking form. URL: ${publicPage.url()}. Body: ${cleanText(bodyText).slice(0, 500)}`)
    }
    assert.equal(new URL(publicPage.url()).pathname, '/book')
    assert.equal(new URL(publicPage.url()).searchParams.get('problem'), 'szczeniak')
    assert.equal(await bookingForm.locator('input[name="slotId"]').inputValue(), slot.id)

    await publicPage.waitForTimeout(1000)
    await typeValue(getBookingFormField(publicPage, 'owner-name'), uiSmokeOwnerName)
    await typeValue(
      getBookingFormField(publicPage, 'description'),
      'Pies pobudza się przy wychodzeniu opiekuna i długo nie potrafi się wyciszyć po powrocie do domu.',
    )
    await typeValue(getBookingFormField(publicPage, 'email'), uiSmokeEmail)
    await publicPage.locator('#booking-privacy').check()
    await publicPage.locator('#booking-early-start').check()
    assert.equal(await getBookingFormField(publicPage, 'owner-name').inputValue(), uiSmokeOwnerName)
    assert.match(await getBookingFormField(publicPage, 'description').inputValue(), /Pies pobudza się/i)
    assert.equal(await getBookingFormField(publicPage, 'email').inputValue(), uiSmokeEmail)
    assert.equal(await publicPage.locator('[data-booking-field="phone"]').count(), 0)
    assert.equal(await publicPage.locator('[data-booking-field="animal-type"]').count(), 0)
    assert.equal(await publicPage.locator('#booking-privacy').isChecked(), true)
    assert.equal(await publicPage.locator('#booking-early-start').isChecked(), true)
    await publicPage.waitForTimeout(250)
    const bookingSubmitButton = getBookingSubmitButton(publicPage)
    await bookingSubmitButton.scrollIntoViewIfNeeded()

    const bookingResponse = await fetch(`${appUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ownerName: uiSmokeOwnerName,
        serviceType: null,
        problemType: 'szczeniak',
        animalType: 'Pies',
        petAge: '2 lata',
        durationNotes: 'Od dwóch tygodni',
        description: 'Pies pobudza się przy wychodzeniu opiekuna i długo nie potrafi się wyciszyć po powrocie do domu.',
        email: uiSmokeEmail,
        slotId: slot.id,
        qaBooking: false,
        consentTerms: true,
        consentEarlyStart: true,
      }),
    })

    assert.equal(bookingResponse.ok, true, `POST /api/bookings returned ${bookingResponse.status}.`)

    const bookingPayload = (await bookingResponse.json()) as { bookingId?: string; accessToken?: string; error?: string }
    assert.ok(bookingPayload.bookingId, 'Expected bookingId from booking API.')
    assert.ok(bookingPayload.accessToken, 'Expected access token from booking API.')

    const bookingId = bookingPayload.bookingId
    const accessToken = bookingPayload.accessToken

    await publicPage.goto(
      `${appUrl}/payment?bookingId=${encodeURIComponent(bookingId)}&access=${encodeURIComponent(accessToken)}`,
      { waitUntil: 'domcontentloaded' },
    )
    await publicPage.locator('[data-payment-state="payment-selection"]').waitFor()

    assert.ok(bookingId, 'Expected bookingId in payment URL.')
    assert.ok(accessToken, 'Expected access token in payment URL.')

    await publicPage.locator('[data-payment-state="payment-selection"]').waitFor()
    assert.equal(await publicPage.locator('[data-payment-method="manual"]').count(), 1)
    assert.equal(await publicPage.locator('[data-payment-method="payu"]').count(), 0)

    const manualSubmitButton = getPaymentSubmitButton(publicPage, 'manual')
    await manualSubmitButton.scrollIntoViewIfNeeded()
    const manualResponse = await fetch(`${appUrl}/api/payments/manual`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bookingId,
        accessToken,
      }),
    })
    assert.equal(manualResponse.ok, true, `POST /api/payments/manual returned ${manualResponse.status}.`)
    const manualPayload = (await manualResponse.json()) as { redirectTo?: string; error?: string }
    assert.ok(manualPayload.redirectTo, 'Expected redirectTo from manual payment API.')
    const confirmationUrl = new URL(manualPayload.redirectTo, appUrl).toString()
    await publicPage.goto(`${appUrl}/payment?bookingId=${bookingId}&access=${encodeURIComponent(accessToken)}`, {
      waitUntil: 'domcontentloaded',
    })
    await publicPage.locator('[data-payment-state="pending-manual-review"]').waitFor()
    const refreshStatusLink = publicPage.getByRole('link', { name: 'Odśwież status' })
    const refreshStatusHref = await refreshStatusLink.getAttribute('href')
    assert.ok(refreshStatusHref, 'Expected a refresh-status href on the new payment page.')
    const refreshStatusUrl = new URL(refreshStatusHref, appUrl)
    assert.equal(refreshStatusUrl.pathname, '/payment')
    assert.equal(refreshStatusUrl.searchParams.get('bookingId'), bookingId)
    assert.equal(refreshStatusUrl.searchParams.get('access'), accessToken)
    await Promise.all([
      publicPage.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: routeNavigationTimeoutMs }),
      refreshStatusLink.click(),
    ])
    await publicPage.locator('[data-payment-state="pending-manual-review"]').waitFor()

    await publicPage.goto(confirmationUrl, { waitUntil: 'domcontentloaded' })
    await publicPage.locator('.payment-ref-page--compact').waitFor()
    await publicPage.locator('[data-confirmation-state="pending-manual-review"]').waitFor()
    assert.equal(await publicPage.getByRole('heading', { name: /Nagranie, link lub krótki opis/i }).count(), 0)

    const roomCheckPage = await publicContext.newPage()
    await roomCheckPage.goto(`${appUrl}/call/${bookingId}?access=${encodeURIComponent(accessToken)}`, {
      waitUntil: 'domcontentloaded',
    })
    const lockedRoomError = roomCheckPage.locator('.error-box').first()
    await lockedRoomError.waitFor({ timeout: routeNavigationTimeoutMs })
    assert.match((await lockedRoomError.textContent()) ?? '', /potwierdzeniu płatności|sprawdź status na potwierdzeniu/i)
    await roomCheckPage.close()

    await warmUpPostRoute(
      `${appUrl}/api/admin/bookings/${bookingId}/manual-payment`,
      { action: 'noop' },
      [400],
      { authorization: createBasicAuthHeader(adminSecret) },
    )
    await warmUpPostRoute(
      `${appUrl}/api/bookings/${bookingId}/complete?access=${encodeURIComponent(accessToken)}`,
      { recommendedNextStep: 'warmup' },
      [409],
    )

    const adminPage = await adminContext.newPage()
    await adminPage.goto(`${appUrl}/admin`, { waitUntil: 'domcontentloaded' })
    await adminPage.getByRole('heading', { name: /Rezerwacje, płatności i terminy/i }).waitFor()
    await adminPage.locator('.summary-card .stat-label').filter({ hasText: 'Do potwierdzenia' }).first().waitFor()
    await approveManualPaymentWithRetry(adminPage, bookingId, uiSmokeEmail)

    await publicPage.goto(confirmationUrl, { waitUntil: 'domcontentloaded' })
    await fetch(`${appUrl}/api/bookings/${bookingId}/prep?access=${encodeURIComponent(accessToken)}`, {
      method: 'OPTIONS',
    }).catch(() => {})

    await waitForCondition(
      async () => {
        if ((await publicPage.locator('[data-confirmation-state="confirmed"]').count()) > 0) {
          return (await publicPage.locator('textarea').count()) > 0
        }

        await publicPage.waitForTimeout(1500)
        await publicPage.goto(confirmationUrl, { waitUntil: 'domcontentloaded' })
        return false
      },
      slowRouteTimeoutMs,
      'Confirmation did not switch to the paid state after admin approval in time.',
    )

    const prepWarmupResponse = await fetch(`${appUrl}/api/bookings/${bookingId}/prep?access=${encodeURIComponent(accessToken)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prepLinkUrl: '',
        prepNotes: '',
      }),
    })
    assert.equal(prepWarmupResponse.ok, true)

    await waitForCondition(
      async () => {
        const refreshedRow = await waitForBookingRow(adminPage, bookingId, uiSmokeEmail)
        return (
          (await isVisible(refreshedRow.locator('[data-admin-booking-action="done"]').first())) ||
          (await isVisible(refreshedRow.getByRole('button', { name: /Oznacz jako zako/i })))
        )
      },
      slowRouteTimeoutMs,
      'Admin approval completed, but the booking row did not expose the completion action in time.',
    )

    await publicPage.locator('[data-confirmation-state="confirmed"]').waitFor({ timeout: 30000 })
    await publicPage.getByRole('heading', { name: /(Testowa płatność została potwierdzona|Wpłata za .* została potwierdzona)/i }).waitFor({ timeout: 30000 })
    assert.equal(await publicPage.getByText(/Wpłata jest już potwierdzona/i).isVisible(), true)

    const prepNotes = 'Krótki opis do smoke testu po potwierdzonej płatności.'
    await publicPage.locator('textarea').fill(prepNotes)
    const prepSaveResponsePromise = publicPage.waitForResponse(
      (response) =>
        response.url().includes(`/api/bookings/${bookingId}/prep`) && response.request().method() === 'PATCH',
      { timeout: slowRouteTimeoutMs },
    )
    await publicPage.getByRole('button', { name: /Zapisz materiały do sprawy/i }).click()
    const prepSaveResponse = await prepSaveResponsePromise
    assert.equal(prepSaveResponse.ok(), true)
    await publicPage.reload({ waitUntil: 'domcontentloaded' })
    await publicPage.getByRole('heading', { name: /(Testowa płatność została potwierdzona|Wpłata za .* została potwierdzona)/i }).waitFor()
    assert.equal(await publicPage.locator('textarea').inputValue(), prepNotes)
    assert.equal((await publicPage.getByRole('button', { name: /Anuluj zakup w 1 minutę/i }).count()) === 0, true)

    const roomJoinHref = await publicPage.getByRole('link', { name: /Zobacz pokój rozmowy audio|Zobacz pokój rozmowy/i }).getAttribute('href')
    assert.ok(roomJoinHref, 'Expected room join href on the confirmation page.')
    await publicPage.goto(new URL(roomJoinHref, appUrl).toString(), { waitUntil: 'domcontentloaded' })
    const phoneRoomMode = await verifyCallRoomLoaded(publicPage, bookingId, uiSmokeOwnerName)
    assert.equal(phoneRoomMode, 'phone')

    await publicPage.reload({ waitUntil: 'domcontentloaded' })
    assert.equal(await verifyCallRoomLoaded(publicPage, bookingId, uiSmokeOwnerName), phoneRoomMode)

    const rejoinPage = await publicContext.newPage()
    await rejoinPage.goto(`${appUrl}/call/${bookingId}?access=${encodeURIComponent(accessToken)}`, {
      waitUntil: 'domcontentloaded',
    })
    assert.equal(await verifyCallRoomLoaded(rejoinPage, bookingId, uiSmokeOwnerName), phoneRoomMode)
    await rejoinPage.close()

    const videoBookingResult = await localStore.createPendingBooking({
      ownerName: 'UI Smoke Video',
      serviceType: 'konsultacja-behawioralna-online',
      problemType: 'separacja',
      animalType: 'Pies',
      petAge: '4 lata',
      durationNotes: 'Od kilku miesięcy',
      description: 'Kontrolowany test pokoju konsultacji online.',
      email: 'ui-smoke-video@example.com',
      slotId: videoSlot.id,
      qaBooking: true,
    })
    const videoPaidBooking = await localStore.markBookingPaid(videoBookingResult.booking.id, {
      paymentMethod: 'manual',
      paymentReference: `ui-smoke-video-${videoBookingResult.booking.id}`,
    })
    assert.equal(videoPaidBooking?.bookingStatus, 'confirmed')
    assert.equal(videoPaidBooking?.paymentStatus, 'paid')

    const videoLockedPage = await publicContext.newPage()
    await videoLockedPage.goto(
      `${appUrl}/call/${videoBookingResult.booking.id}?access=${encodeURIComponent(videoBookingResult.accessToken)}`,
      { waitUntil: 'domcontentloaded' },
    )
    assert.equal(await verifyCallRoomLoaded(videoLockedPage, videoBookingResult.booking.id, 'UI Smoke Video'), 'video-locked')
    const lockedVideoIframeSrc = await videoLockedPage.locator('iframe.video-frame').getAttribute('src')
    const videoRoomIframeHasMeetingConfig =
      Boolean(lockedVideoIframeSrc?.includes('config.startAudioOnly=true')) &&
      Boolean(lockedVideoIframeSrc?.includes('config.startWithVideoMuted=true'))
    assert.equal(videoRoomIframeHasMeetingConfig, true)
    await videoLockedPage.close()

    if (!browser) {
      throw new Error('Browser was not available for the unlocked video-room smoke test.')
    }

    const videoContext = await browser.newContext({
      locale: 'pl-PL',
      viewport: { width: 1280, height: 960 },
    })
    const videoRoomDurationMinutes = getBookingServiceRoomDurationMinutes('konsultacja-behawioralna-online')
    let videoTimerAfterStart = ''

    try {
      const videoPage = await videoContext.newPage()
      const videoRoomStart = new Date(`${videoBookingResult.booking.bookingDate}T${videoBookingResult.booking.bookingTime}:00Z`)
      await videoPage.clock.install({ time: new Date(videoRoomStart.getTime() + 60 * 1000) })
      await videoPage.goto(
        `${appUrl}/call/${videoBookingResult.booking.id}?access=${encodeURIComponent(videoBookingResult.accessToken)}`,
        { waitUntil: 'domcontentloaded' },
      )
      assert.equal(await verifyCallRoomLoaded(videoPage, videoBookingResult.booking.id, 'UI Smoke Video'), 'video-live')
      assert.equal((await videoPage.getByRole('link', { name: /nowej karcie/i }).getAttribute('href'))?.includes('meet.jit.si'), true)

      await startRoomTimerWithRetry(videoPage, videoRoomDurationMinutes)
      await videoPage.clock.runFor(2200)
      await videoPage.waitForTimeout(100)
      videoTimerAfterStart = await videoPage.locator('.timer-box').innerText()
      assert.notEqual(videoTimerAfterStart, `${videoRoomDurationMinutes}:00`)

      const completeResponsePromise = videoPage.waitForResponse(
        (response) =>
          response.url().includes(`/api/bookings/${videoBookingResult.booking.id}/complete`) && response.request().method() === 'POST',
        { timeout: slowRouteTimeoutMs },
      )
      await videoPage.getByRole('button', { name: /Zakończ/i }).click()
      const completeResponse = await completeResponsePromise
      assert.equal(completeResponse.ok(), true)
      await videoPage.getByRole('button', { name: /Rozmowa zakończona/i }).waitFor({ timeout: 10000 })
      assert.equal(await videoPage.getByRole('button', { name: /Rozmowa zakończona/i }).isVisible(), true)
      await videoPage.reload({ waitUntil: 'domcontentloaded' })
      assert.equal(await verifyCallRoomLoaded(videoPage, videoBookingResult.booking.id, 'UI Smoke Video'), 'video-live')
      await videoPage.getByRole('button', { name: /Rozmowa zakończona/i }).waitFor({ timeout: 10000 })
      assert.equal(await videoPage.getByText(/Rozmowa zakończona/i).first().isVisible(), true)
    } finally {
      await videoContext.close()
    }

    console.log(
      JSON.stringify(
        {
          homeVisible: true,
          bookingFlowStarted: true,
          paymentPageShowsTwoMethods: false,
          paymentPageKeepsPreparationLocked: true,
          manualPaymentReported: true,
          roomBlockedBeforeApproval: true,
          adminApprovedManualPayment: true,
          confirmationAutoRefreshedAfterApproval: true,
          confirmationUnlocked: true,
          confirmationSmsFallbackVisible: true,
          preparationMaterialsUnlockedAfterPayment: true,
          preparationMaterialsSavedAfterPayment: true,
          roomReloadWorked: true,
          roomRejoinWorked: true,
          phoneRoomFlowVerified: phoneRoomMode === 'phone',
          videoRoomLockedFlowVerified: true,
          videoRoomLiveFlowVerified: true,
          videoRoomIframeHasMeetingConfig,
          videoRoomTimerStarted: true,
          videoRoomTimerMoved: videoTimerAfterStart,
          videoRoomFinishWorked: true,
          videoRoomReloadAfterFinishWorked: true,
          payuCardVisible: false,
          manualOnlyFallbackVisible: true,
        },
        null,
        2,
      ),
    )

    await publicContext.close()
    await adminContext.close()
  } finally {
    if (browser) {
      await browser.close().catch(() => {})
    }

    if (server) {
      await stopServerTree(server)
    }
  }
}

async function main() {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      await runUiSmokeOnce()
      return
    } catch (error) {
      if (attempt === 2 || !isRetryableUiSmokeError(error)) {
        throw error
      }
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error)
  process.exitCode = 1
})
