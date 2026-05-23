import assert from 'node:assert/strict'
import { access, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { loadEnvConfig } from '@next/env'
import { chromium, type BrowserContext, type Page } from 'playwright-core'
import { resolveBrowserExecutablePath } from './lib/browser-path'

const rootDir = process.cwd()
const baseUrl = process.env.STAGE8_BASE_URL?.replace(/\/$/, '') ?? 'http://127.0.0.1:3000'
const reportDir = path.join(rootDir, 'qa-reports')
const screenshotNames = {
  homeDesktop: 'stage8-home-desktop.png',
  homeMobile: 'stage8-home-mobile.png',
  paymentDesktop: 'stage8-payment-desktop.png',
  paymentMobile: 'stage8-payment-mobile.png',
  confirmationPending: 'stage8-confirmation-pending.png',
  confirmationConfirmed: 'stage8-confirmation-confirmed.png',
} as const

function cleanText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function createBasicAuthHeader(password: string) {
  return `Basic ${Buffer.from(`admin:${password}`).toString('base64')}`
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

  throw new Error('Nie znaleziono lokalnej przegladarki Chrome lub Edge do stage8 screenshots.')
}

function attachDiagnostics(page: Page, issues: string[], label: string) {
  page.on('console', (message) => {
    if (message.type() !== 'error') {
      return
    }

    issues.push(`[${label}] console: ${cleanText(message.text())}`)
  })

  page.on('pageerror', (error) => {
    issues.push(`[${label}] pageerror: ${cleanText(error.stack ?? error.message)}`)
  })
}

async function saveScreenshot(page: Page, fileName: string, fullPage = true) {
  const filePath = path.join(reportDir, fileName)
  await page.screenshot({ path: filePath, fullPage })
  return filePath
}

async function waitForBookingFlow(page: Page, selector: string) {
  await page.locator(selector).first().waitFor({ timeout: 30000 })
  await page.waitForTimeout(600)
}

async function run() {
  loadEnvConfig(rootDir)
  await mkdir(reportDir, { recursive: true })

  const browserExecutablePath = await resolveBrowserExecutablePath()
  const issues: string[] = []
  const adminSecret = process.env.ADMIN_ACCESS_SECRET?.trim() ?? ''

  assert.ok(adminSecret, 'Missing ADMIN_ACCESS_SECRET for stage 8 screenshots.')

  const browser = await chromium.launch({
    executablePath: browserExecutablePath,
    headless: true,
  })

  let desktopContext: BrowserContext | null = null
  let mobileContext: BrowserContext | null = null

  try {
    desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 1600 },
      deviceScaleFactor: 1,
    })
    const desktopPage = await desktopContext.newPage()
    attachDiagnostics(desktopPage, issues, 'desktop')

    await desktopPage.goto(baseUrl, { waitUntil: 'domcontentloaded' })
    await waitForBookingFlow(desktopPage, '.home-hero-panel')
    const homeDesktopPath = await saveScreenshot(desktopPage, screenshotNames.homeDesktop, true)

    await desktopPage.goto(`${baseUrl}/book`, { waitUntil: 'domcontentloaded' })
    await desktopPage.locator('.book-topic-card').first().click()
    await desktopPage.waitForURL(/\/slot\?problem=/, { timeout: 30000 })
    await waitForBookingFlow(desktopPage, '[data-slot-id]')
    await desktopPage.locator('[data-slot-id]').first().click()
    await desktopPage.waitForURL(/\/form\?problem=/, { timeout: 30000 })
    await waitForBookingFlow(desktopPage, '[data-booking-form="details"]')

    await desktopPage.locator('[data-booking-field="owner-name"]').fill('Anna Nowak')
    await desktopPage.locator('[data-booking-field="email"]').fill('stage8@example.com')
    await desktopPage
      .locator('[data-booking-field="description"]')
      .fill('Pies napina sie przy mijaniu innych psow i trudno mu sie wyciszyc po powrocie do domu.')
    await desktopPage.locator('#booking-privacy').check()
    await desktopPage.locator('#booking-early-start').check()
    await desktopPage.locator('[data-booking-submit="payment"]').click()

    await desktopPage.waitForURL(/\/payment\?bookingId=/, { timeout: 30000 })
    await waitForBookingFlow(desktopPage, '[data-payment-state]')
    const paymentUrl = new URL(desktopPage.url())
    const bookingId = paymentUrl.searchParams.get('bookingId')
    const accessToken = paymentUrl.searchParams.get('access')

    assert.ok(bookingId, 'Expected bookingId in payment URL.')
    assert.ok(accessToken, 'Expected access token in payment URL.')

    const paymentDesktopPath = await saveScreenshot(desktopPage, screenshotNames.paymentDesktop, true)

    mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    })
    const mobilePage = await mobileContext.newPage()
    attachDiagnostics(mobilePage, issues, 'mobile')

    await mobilePage.goto(baseUrl, { waitUntil: 'domcontentloaded' })
    await waitForBookingFlow(mobilePage, '.home-hero-panel')
    const homeMobilePath = await saveScreenshot(mobilePage, screenshotNames.homeMobile, false)

    await mobilePage.goto(paymentUrl.toString(), { waitUntil: 'domcontentloaded' })
    await waitForBookingFlow(mobilePage, '[data-payment-state]')
    const paymentMobilePath = await saveScreenshot(mobilePage, screenshotNames.paymentMobile, false)

    await desktopPage.locator('[data-payment-submit="manual"]').click()
    await desktopPage.waitForURL(/\/confirmation\?bookingId=/, { timeout: 30000 })
    await waitForBookingFlow(desktopPage, '[data-confirmation-state="pending-manual-review"]')
    const confirmationUrl = new URL(desktopPage.url())
    const confirmationPendingPath = await saveScreenshot(desktopPage, screenshotNames.confirmationPending, true)

    const approveResponse = await fetch(`${baseUrl}/api/admin/bookings/${bookingId}/manual-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: createBasicAuthHeader(adminSecret),
      },
      body: JSON.stringify({ action: 'approve' }),
    })

    assert.equal(approveResponse.ok, true, `Admin approval returned ${approveResponse.status}.`)

    await desktopPage.goto(confirmationUrl.toString(), { waitUntil: 'domcontentloaded' })
    await waitForBookingFlow(desktopPage, '[data-confirmation-state="confirmed"]')
    await desktopPage.evaluate(() => {
      const activeElement = document.activeElement
      if (activeElement instanceof HTMLElement) {
        activeElement.blur()
      }
    })
    await desktopPage.mouse.click(24, 24).catch(() => {})
    await desktopPage.waitForTimeout(300)
    const confirmationConfirmedPath = await saveScreenshot(desktopPage, screenshotNames.confirmationConfirmed, false)

    if (issues.length > 0) {
      throw new Error(`Browser errors detected during stage 8 screenshots:\n${issues.join('\n')}`)
    }

    const report = [
      '# Stage 8 Visual Check',
      '',
      `Base URL: ${baseUrl}`,
      `Booking ID: ${bookingId}`,
      '',
      '## Screenshots',
      `- [Home desktop](./${path.basename(homeDesktopPath)})`,
      `- [Home mobile](./${path.basename(homeMobilePath)})`,
      `- [Payment desktop](./${path.basename(paymentDesktopPath)})`,
      `- [Payment mobile](./${path.basename(paymentMobilePath)})`,
      `- [Confirmation pending](./${path.basename(confirmationPendingPath)})`,
      `- [Confirmation confirmed](./${path.basename(confirmationConfirmedPath)})`,
      '',
      '## Notes',
      '- Payment and confirmation flows were exercised against the local dev server.',
      '- The manual payment was approved through the admin API to capture the confirmed confirmation state.',
    ].join('\n')

    await writeFile(path.join(reportDir, 'stage8-visual-check.md'), report, 'utf8')

    console.log(
      JSON.stringify(
        {
          bookingId,
          screenshots: {
            homeDesktop: homeDesktopPath,
            homeMobile: homeMobilePath,
            paymentDesktop: paymentDesktopPath,
            paymentMobile: paymentMobilePath,
            confirmationPending: confirmationPendingPath,
            confirmationConfirmed: confirmationConfirmedPath,
          },
          report: path.join(reportDir, 'stage8-visual-check.md'),
        },
        null,
        2,
      ),
    )
  } finally {
    await mobileContext?.close().catch(() => {})
    await desktopContext?.close().catch(() => {})
    await browser.close().catch(() => {})
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
