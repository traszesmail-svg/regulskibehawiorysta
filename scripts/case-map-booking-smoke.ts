import assert from 'node:assert/strict'
import { spawn, type ChildProcess } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { loadEnvConfig } from '@next/env'
import { chromium, type Page } from 'playwright-core'
import { createLocalDataSandbox } from './lib/local-data-sandbox'
import { resolveBrowserExecutablePath } from './lib/browser-path'
import { getNormalBookingMinDateKey } from '../lib/scheduling/rules'
import type { FunnelEventRecord } from '../lib/types'

const rootDir = process.cwd()
const ownerName = 'Mapa Smoke'
const email = 'mapa-smoke@example.com'
const caseMapSmokeMeasurementId = 'G-CASEMAPSMOKE'
const caseMapClaimSmokeToken = 'A'.repeat(43)

function getAppUrl() {
  return `http://127.0.0.1:${3300 + Math.floor(Math.random() * 200)}`
}

async function waitForServer(appUrl: string) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(appUrl, { cache: 'no-store' })
      if (response.status > 0) return
    } catch {}

    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  throw new Error('Local case-map smoke server did not become ready in time.')
}

async function waitForCondition(check: () => Promise<boolean>, label: string) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (await check()) return
    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  throw new Error(`Timed out while waiting for ${label}.`)
}

async function completeFastMap(page: Page, appUrl: string) {
  await page.goto(`${appUrl}/mapa-sprawy`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    window.localStorage.setItem('regulski-behawiorysta.analytics.consent', 'granted')
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  const dogButton = page.getByRole('button', { name: /Pies/i }).first()
  let advanced = false
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await page.getByRole('button', { name: /Szybka mapa/i }).click()
    if (await dogButton.isVisible().catch(() => false)) {
      advanced = true
      break
    }
    await page.waitForTimeout(250)
  }
  if (!advanced) {
    const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 800)
    throw new Error(`Map did not advance from the scope choice: ${text}`)
  }
  await dogButton.click()
  await page.getByRole('button', { name: /^Dalej$/i }).click()
  await page.getByRole('button', { name: /Spacer i reakcje/i }).click()
  await page.getByRole('button', { name: /^Dalej$/i }).click()

  for (let step = 0; step < 12; step += 1) {
    if (await page.locator('article').filter({ hasText: /Masz punkt startu do rozmowy/i }).count()) {
      return
    }

    const textarea = page.locator('textarea:visible').first()
    if (await textarea.count()) {
      await textarea.fill('Krótki opis wyłącznie do kontrolowanego testu lokalnego.')
    } else {
      const title = await page.locator('h2').first().innerText()
      const choices = page.locator('button[aria-pressed="false"]:visible')
      const choice = title.includes('Czego najbardziej potrzebujesz') ? choices.nth(1) : choices.first()
      await choice.waitFor()
      await choice.click()
    }

    const next = page.getByRole('button', { name: /^(Dalej|Zobacz swoją mapę)$/i })
    await next.waitFor()
    await next.click()
  }

  throw new Error('The fast Map did not reach its result within the expected number of steps.')
}

async function assertPrivateAnalyticsBoundaries(
  page: Page,
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  appUrl: string,
) {
  await page.waitForFunction(
    () => Object.keys(window).some((key) => key.startsWith('ga-disable-') && Reflect.get(window, key) === true),
  )
  assert.equal(await page.locator('#ga4-script').count(), 0)
  assert.equal(await page.locator('#ga4-init').count(), 0)
  const gaDisableStates = await page.evaluate(() =>
    Object.keys(window)
      .filter((key) => key.startsWith('ga-disable-'))
      .map((key) => [key, Reflect.get(window, key)]),
  )
  assert.equal(gaDisableStates.some(([, value]) => value === true), true, JSON.stringify(gaDisableStates))

  const loginPage = await browser.newPage()
  try {
    await loginPage.goto(`${appUrl}/login#case-map-claim=${caseMapClaimSmokeToken}`, { waitUntil: 'domcontentloaded' })
    await loginPage.waitForFunction(() => window.location.hash === '')
    assert.equal(await loginPage.locator('#ga4-script').count(), 0)
    assert.equal(await loginPage.locator('#ga4-init').count(), 0)
    assert.equal(
      await loginPage.evaluate(() => window.sessionStorage.getItem('regulski-behawiorysta.case-map-profile-claim-token')),
      caseMapClaimSmokeToken,
    )
  } finally {
    await loginPage.close()
  }

  const publicPage = await browser.newPage()
  try {
    await publicPage.route('https://www.googletagmanager.com/**', (route) => route.abort())
    await publicPage.goto(appUrl, { waitUntil: 'domcontentloaded' })
    await publicPage.evaluate(() => {
      window.localStorage.setItem('regulski-behawiorysta.analytics.consent', 'granted')
    })
    await publicPage.reload({ waitUntil: 'domcontentloaded' })
    await publicPage.locator('#ga4-init').waitFor({ state: 'attached' })
    await publicPage.evaluate(() => {
      document.documentElement.dataset.caseMapSpaSmoke = 'before-navigation'
    })

    const mapLink = publicPage.locator('a[href^="/mapa-sprawy"]').first()
    await mapLink.waitFor()
    await mapLink.click()
    await publicPage.waitForURL(/\/mapa-sprawy/)
    await publicPage.waitForFunction(() => document.documentElement.dataset.caseMapSpaSmoke !== 'before-navigation')
    assert.equal(await publicPage.locator('#ga4-script').count(), 0)
    assert.equal(await publicPage.locator('#ga4-init').count(), 0)
  } finally {
    await publicPage.close()
  }
}

async function readEvents(dataDir: string) {
  const raw = await readFile(path.join(dataDir, 'funnel-events.json'), 'utf8')
  return JSON.parse(raw) as FunnelEventRecord[]
}

async function stopServerTree(server: ChildProcess) {
  const pid = server.pid
  if (!pid) return

  await new Promise<void>((resolve) => {
    const killer = spawn('taskkill.exe', ['/pid', String(pid), '/t', '/f'], {
      stdio: 'ignore',
      windowsHide: true,
    })
    killer.once('exit', () => resolve())
    killer.once('error', () => resolve())
  })
}

async function run() {
  loadEnvConfig(rootDir)
  const appUrl = getAppUrl()
  const port = new URL(appUrl).port
  process.env.APP_DATA_MODE = 'local'
  process.env.APP_PAYMENT_MODE = 'mock'
  process.env.NEXT_PUBLIC_APP_URL = appUrl
  process.env.CUSTOMER_EMAIL_MODE = 'disabled'
  process.env.RESEND_API_KEY = ''
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = caseMapSmokeMeasurementId
  process.env.MANUAL_PAYMENT_BLIK_PHONE = '512992026'
  process.env.MANUAL_PAYMENT_PAYPAL_ME_URL = 'paypal.me/regulski-behawiorysta'

  const sandbox = await createLocalDataSandbox('case-map-booking-smoke', rootDir)
  let server: ChildProcess | null = null
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null

  try {
    const localStore = await import('../lib/server/local-store')
    const date = getNormalBookingMinDateKey(new Date())
    const slotId = `${date}-10:00`
    const slot = (await localStore.getAvailabilitySlot(slotId)) ?? await localStore.createAvailabilitySlot(date, '10:00')

    server = spawn(process.execPath, [path.join(rootDir, 'node_modules', 'next', 'dist', 'bin', 'next'), 'dev', '--hostname', '127.0.0.1', '--port', port], {
      cwd: rootDir,
      env: process.env,
      stdio: 'ignore',
      windowsHide: true,
    })
    await waitForServer(appUrl)

    browser = await chromium.launch({
      headless: true,
      executablePath: await resolveBrowserExecutablePath(),
    })
    const page = await browser.newPage()
    page.setDefaultNavigationTimeout(120_000)
    page.setDefaultTimeout(60_000)
    page.on('pageerror', (error) => {
      console.error(`[case-map-smoke][pageerror] ${error.message}`)
    })
    await page.goto(appUrl, { waitUntil: 'domcontentloaded' })
    await completeFastMap(page, appUrl)
    await assertPrivateAnalyticsBoundaries(page, browser, appUrl)

    const bookingCta = page.getByRole('link', { name: /Wybierz termin/i }).first()
    await bookingCta.waitFor()
    assert.match(await bookingCta.getAttribute('href') ?? '', /^\/book/)
    await bookingCta.click()
    await page.getByRole('heading', { name: /Wybierz termin konsultacji/i }).waitFor()
    assert.equal(new URL(page.url()).pathname, '/book')

    await waitForCondition(async () => {
      try {
        const eventTypes = new Set((await readEvents(sandbox.dataDir)).map((event) => event.eventType))
        return [
          'case_map_started',
          'case_map_completed',
          'case_map_offer_viewed',
          'case_map_service_clicked',
          'case_map_booking_started',
        ].every((eventType) => eventTypes.has(eventType as FunnelEventRecord['eventType']))
      } catch {
        return false
      }
    }, 'the five private Map analytics events before booking submission')

    const slotLink = page.locator(`[data-selected-slot-link="true"][data-slot-id="${slot.id}"]`).first()
    await slotLink.waitFor()
    await slotLink.click()

    const form = page.locator('[data-booking-form="details"]')
    await form.waitFor()
    assert.equal(new URL(page.url()).pathname, '/book')
    await page.waitForTimeout(750)
    const brief = await page.locator('input[name="durationNotes"]').inputValue()
    assert.match(brief, /Mapa zachowania:/)
    assert.equal(await page.locator('#booking-save-case-map').isChecked(), false)

    await page.locator('[data-booking-field="owner-name"]').fill(ownerName)
    await page.locator('[data-booking-field="email"]').fill(email)
    await page.locator('[data-booking-field="description"]').fill('Kontrolowany lokalny test przekazania briefu z Mapy do rezerwacji.')
    await page.locator('#booking-privacy').check()
    await page.locator('#booking-early-start').check()

    const bookingResponsePromise = page.waitForResponse(
      (response) => response.url().includes('/api/bookings') && response.request().method() === 'POST',
    )
    await page.locator('[data-booking-submit="payment"]').click()
    const bookingResponse = await bookingResponsePromise
    assert.equal(bookingResponse.ok(), true)
    const bookingPayload = await bookingResponse.json() as { bookingId?: string; error?: string }
    assert.ok(bookingPayload.bookingId, bookingPayload.error ?? 'Booking API did not return an id.')

    const booking = await localStore.getBookingById(bookingPayload.bookingId)
    assert.ok(booking)
    assert.match(booking.durationNotes, /Mapa zachowania:/)
    assert.doesNotMatch(booking.durationNotes, /Kontrolowany lokalny test przekazania briefu/)

    const mapEvents = (await readEvents(sandbox.dataDir)).filter((event) => event.eventType.startsWith('case_map_'))
    assert.equal(mapEvents.length >= 5, true)
    for (const event of mapEvents) {
      assert.equal(event.pagePath === '/mapa-sprawy' || event.pagePath === '/book', true)
      assert.equal('answers' in event.properties, false)
      assert.equal('brief' in event.properties, false)
      assert.equal('email' in event.properties, false)
      assert.equal('booking_id' in event.properties, false)
    }

    console.log('CASE_MAP_BOOKING_SMOKE_OK')
  } finally {
    await browser?.close().catch(() => {})
    if (server) {
      await stopServerTree(server)
    }
    await sandbox.cleanup()
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error)
  process.exitCode = 1
})
