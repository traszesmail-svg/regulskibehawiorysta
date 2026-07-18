import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { resolveBrowserExecutablePath } from './lib/browser-path'

type LiveBlikControl = {
  createdAt: string
  baseUrl: string
  bookingId: string
  bookingAccessToken: string
  orderNumber?: string
  viewerToken?: string
  slotLabel: string
  amount?: string
  phone?: string
  phase: 'booking-created' | 'waiting-for-blik-transfer' | 'payment-reported-awaiting-admin'
  reportedAt?: string
  waitingPath?: string
}

type ReportPayload = {
  status?: string
  adminNotification?: 'sent' | 'already_reported' | 'failed'
  adminNotificationReason?: string | null
}

type StatusPayload = {
  status?: string
  testAdminConfirmUrl?: string | null
}

const rootDir = process.cwd()
const defaultControlPath = path.join(rootDir, 'qa-reports', 'live-blik-qa-control.json')

function readArg(name: string): string | null {
  const index = process.argv.indexOf(name)
  return index === -1 ? null : process.argv[index + 1] ?? null
}

function requireReportFlag() {
  if (!process.argv.includes('--report')) {
    throw new Error('This script reports a real BLIK payment. Run it only with --report.')
  }
}

async function readControl(controlPath: string) {
  const raw = await readFile(controlPath, 'utf8')
  return JSON.parse(raw) as LiveBlikControl
}

async function persistControl(controlPath: string, control: LiveBlikControl) {
  await mkdir(path.dirname(controlPath), { recursive: true })
  await writeFile(controlPath, `${JSON.stringify(control, null, 2)}\n`, 'utf8')
}

async function main() {
  requireReportFlag()

  const controlPath = path.resolve(readArg('--control-file') ?? defaultControlPath)
  const control = await readControl(controlPath)
  assert.equal(control.phase, 'waiting-for-blik-transfer', 'The control file is not awaiting a BLIK report.')
  assert.ok(control.orderNumber, 'The control file does not contain an order number.')
  assert.ok(control.viewerToken, 'The control file does not contain a buyer capability.')

  const orderNumber = control.orderNumber
  const viewerToken = control.viewerToken
  const baseUrl = control.baseUrl.replace(/\/+$/, '')
  const paymentPath = `/platnosc/blik/${encodeURIComponent(orderNumber)}`
  const waitingPath = `/oczekiwanie/${encodeURIComponent(orderNumber)}`
  const waitingUrl = `${baseUrl}${waitingPath}?viewer=${encodeURIComponent(viewerToken)}`
  const browser = await chromium.launch({
    headless: true,
    executablePath: await resolveBrowserExecutablePath(),
  })

  try {
    const context = await browser.newContext({ locale: 'pl-PL', viewport: { width: 1366, height: 1100 } })
    const page = await context.newPage()

    await page.goto(`${baseUrl}${paymentPath}?viewer=${encodeURIComponent(viewerToken)}`, { waitUntil: 'domcontentloaded' })
    const reportButton = page.getByRole('button', { name: /Zapłaciłem\/am/i })
    await reportButton.waitFor({ timeout: 30000 })

    const reportResponsePromise = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === `/api/orders/${encodeURIComponent(orderNumber)}/report-payment` &&
        response.request().method() === 'POST',
      { timeout: 45000 },
    )
    const waitingNavigationPromise = page
      .waitForURL((url) => url.pathname === waitingPath, { timeout: 30000, waitUntil: 'domcontentloaded' })
      .then(() => true)
      .catch(() => false)

    await reportButton.click()
    const reportResponse = await reportResponsePromise
    const reportPayload = (await reportResponse.json()) as ReportPayload

    const statusResponse = await page.request.get(
      `${baseUrl}/api/orders/${encodeURIComponent(orderNumber)}/status?viewer=${encodeURIComponent(viewerToken)}`,
    )
    assert.equal(statusResponse.ok(), true, `GET order status returned ${statusResponse.status()}`)
    const statusPayload = (await statusResponse.json()) as StatusPayload
    assert.equal(statusPayload.status, 'payment_reported', 'The order was not recorded as payment_reported.')
    assert.equal(statusPayload.testAdminConfirmUrl ?? null, null, 'Production exposed a test admin confirmation URL.')

    const navigatedToWaitingPage = await waitingNavigationPromise
    if (!navigatedToWaitingPage) {
      await page.goto(waitingUrl, { waitUntil: 'domcontentloaded' })
    }
    const heading = page.getByRole('heading', { name: 'Zgłoszenie płatności zostało wysłane.' })
    await heading.waitFor({ timeout: 30000 })
    const pageHeading = (await heading.innerText()).replace(/\s+/g, ' ').trim()

    const screenshotPath = path.join(rootDir, 'qa-reports', 'live-blik-payment-reported.png')
    await mkdir(path.dirname(screenshotPath), { recursive: true })
    await page.screenshot({ path: screenshotPath, fullPage: true })

    const reportedControl: LiveBlikControl = {
      ...control,
      phase: 'payment-reported-awaiting-admin',
      reportedAt: new Date().toISOString(),
      waitingPath,
    }
    await persistControl(controlPath, reportedControl)

    console.log(
      JSON.stringify(
        {
          result: reportResponse.ok() ? 'payment-reported' : 'payment-reported-with-notification-failure',
          orderNumber,
          reportHttpStatus: reportResponse.status(),
          reportStatus: reportPayload.status ?? null,
          adminNotification: reportPayload.adminNotification ?? null,
          adminNotificationReason: reportPayload.adminNotificationReason ?? null,
          orderStatus: statusPayload.status,
          pageHeading,
          testAdminConfirmUrlExposed: Boolean(statusPayload.testAdminConfirmUrl),
          waitingPath,
          screenshot: path.relative(rootDir, screenshotPath).replace(/\\/g, '/'),
        },
        null,
        2,
      ),
    )
  } finally {
    await browser.close()
  }
}

main().catch(() => {
  console.error('Nie udało się bezpiecznie zgłosić kontrolnej wpłaty BLIK. Stan sprawdź w lokalnym pliku kontrolnym.')
  process.exitCode = 1
})
