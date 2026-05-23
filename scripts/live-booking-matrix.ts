import { access, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { loadEnvConfig } from '@next/env'
import { chromium, type BrowserContext, type Locator, type Page } from 'playwright-core'
import { resolveBrowserExecutablePath } from './lib/browser-path'
import { SITE_PRODUCTION_URL } from '../lib/site'

type MatrixAttempt = {
  label: string
  problem: string
  routePath: '/book' | '/koty'
  animalType: 'Pies' | 'Kot'
}

type MatrixAttemptResult = {
  index: number
  label: string
  routePath: '/book' | '/koty'
  problem: string
  status: 'passed' | 'failed'
  startUrl: string
  endUrl: string
  slotLabel: string | null
  bookingId: string | null
  accessToken: string | null
  notes: string[]
}

const MATRIX_ATTEMPTS: MatrixAttempt[] = [
  { label: 'kot-stres', problem: 'kot-stres', routePath: '/koty', animalType: 'Kot' },
  { label: 'kot-kuweta', problem: 'kot-kuweta', routePath: '/koty', animalType: 'Kot' },
  { label: 'kot-dotyk', problem: 'kot-dotyk', routePath: '/koty', animalType: 'Kot' },
  { label: 'kot-konflikt', problem: 'kot-konflikt', routePath: '/koty', animalType: 'Kot' },
  { label: 'kot-nocna-wokalizacja', problem: 'kot-nocna-wokalizacja', routePath: '/koty', animalType: 'Kot' },
  { label: 'szczeniak', problem: 'szczeniak', routePath: '/book', animalType: 'Pies' },
  { label: 'separacja', problem: 'separacja', routePath: '/book', animalType: 'Pies' },
  { label: 'agresja', problem: 'agresja', routePath: '/book', animalType: 'Pies' },
  { label: 'spacer', problem: 'spacer', routePath: '/book', animalType: 'Pies' },
  { label: 'pobudzenie', problem: 'pobudzenie', routePath: '/book', animalType: 'Pies' },
]

function readArg(name: string): string | null {
  const index = process.argv.indexOf(name)
  if (index === -1) {
    return null
  }

  return process.argv[index + 1] ?? null
}

function resolveBaseUrl() {
  const raw = readArg('--url') ?? process.env.LIVE_BOOKING_MATRIX_URL ?? process.env.LIVE_SMOKE_URL ?? SITE_PRODUCTION_URL
  return raw.endsWith('/') ? raw.slice(0, -1) : raw
}

function cleanText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function escapeAttributeValue(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
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

  throw new Error('Nie znaleziono lokalnej przegladarki Chromium (Chrome lub Edge) do live-booking-matrix.')
}

function getWarsawTimestamp() {
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

  return {
    isoLike: `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}:${values.second} Europe/Warsaw`,
    compact: `${values.year}${values.month}${values.day}-${values.hour}${values.minute}${values.second}`,
  }
}

async function waitForAnyVisible(locators: Locator[], timeout: number) {
  const deadline = Date.now() + timeout

  while (Date.now() < deadline) {
    for (const locator of locators) {
      try {
        if (await locator.isVisible()) {
          return locator
        }
      } catch {}
    }

    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  throw new Error('Expected UI element did not become visible in time.')
}

async function clickAndWaitForUrl(
  page: Page,
  locator: Locator,
  urlPattern: RegExp | string | ((url: URL) => boolean),
  timeout = 30000,
) {
  await Promise.all([page.waitForURL(urlPattern, { timeout, waitUntil: 'domcontentloaded' }), locator.click({ force: true })])
}

function getBookingFormField(page: Page, field: string) {
  return page.locator(`[data-booking-field="${escapeAttributeValue(field)}"]`).first()
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

function getTopicSelector(attempt: MatrixAttempt) {
  return attempt.routePath === '/koty'
    ? `a[data-cat-problem="${escapeAttributeValue(attempt.problem)}"]`
    : `a.topic-card[data-problem="${escapeAttributeValue(attempt.problem)}"]`
}

function buildAttemptOwnerName(attempt: MatrixAttempt, index: number) {
  return `Matrix ${String(index + 1).padStart(2, '0')} - ${attempt.label}`
}

function buildAttemptEmail(index: number) {
  return `live-booking-matrix-${String(index + 1).padStart(2, '0')}@example.com`
}

function buildAttemptDescription(attempt: MatrixAttempt) {
  return `Live matrix attempt for ${attempt.label}. Verify form -> payment on production.`
}

async function runAttempt(
  context: BrowserContext,
  baseUrl: string,
  attempt: MatrixAttempt,
  index: number,
): Promise<MatrixAttemptResult> {
  const page = await context.newPage()
  const result: MatrixAttemptResult = {
    index: index + 1,
    label: attempt.label,
    routePath: attempt.routePath,
    problem: attempt.problem,
    status: 'failed',
    startUrl: page.url() || 'about:blank',
    endUrl: page.url() || 'about:blank',
    slotLabel: null,
    bookingId: null,
    accessToken: null,
    notes: [],
  }

  try {
    await page.goto(`${baseUrl}${attempt.routePath}`, { waitUntil: 'domcontentloaded' })
    await waitForAnyVisible([page.locator('main h1').first()], 20000)

    await clickAndWaitForUrl(page, page.locator(getTopicSelector(attempt)).first(), (url) => {
      return url.pathname === '/slot' && url.searchParams.get('problem') === attempt.problem
    })

    await waitForAnyVisible([page.locator('a.slot-link').first()], 20000)
    const firstSlot = page.locator('a.slot-link').first()
    result.slotLabel = cleanText(await firstSlot.innerText())

    await clickAndWaitForUrl(page, firstSlot, (url) => url.pathname === '/form' && url.searchParams.get('problem') === attempt.problem)
    await page.locator('[data-booking-form="details"]').waitFor({ timeout: 20000 })

    const ownerName = buildAttemptOwnerName(attempt, index)
    const email = buildAttemptEmail(index)

    await getBookingFormField(page, 'owner-name').fill(ownerName)
    await getBookingFormField(page, 'email').fill(email)
    await getBookingFormField(page, 'description').fill(buildAttemptDescription(attempt))
    await page.locator('#booking-privacy').check()
    await page.locator('#booking-early-start').check()

    const bookingResponse = page.waitForResponse(
      (response) => response.url().includes('/api/bookings') && response.request().method() === 'POST',
      { timeout: 30000 },
    )
    await submitBookingForm(page)
    const response = await bookingResponse

    if (!response.ok()) {
      throw new Error(`POST /api/bookings zwrocil ${response.status()}.`)
    }

    await page.waitForURL(/\/payment\?bookingId=/, { timeout: 30000, waitUntil: 'domcontentloaded' })
    const paymentUrl = new URL(page.url())
    result.bookingId = paymentUrl.searchParams.get('bookingId')
    result.accessToken = paymentUrl.searchParams.get('access')

    if (!result.bookingId || !result.accessToken) {
      throw new Error('Brak bookingId lub access token w URL payment.')
    }

    const manualVisible = (await page.locator('[data-payment-method="manual"]').count()) > 0
    const payuVisible = (await page.locator('[data-payment-method="payu"]').count()) > 0

    result.status = 'passed'
    result.endUrl = page.url()
    result.notes.push('Route: /book or /koty -> /slot -> /form -> /payment')
    result.notes.push(`Slot: ${result.slotLabel ?? 'brak'}`)
    result.notes.push(`manualVisible=${manualVisible}`)
    result.notes.push(`payuVisible=${payuVisible}`)
    result.notes.push(`bookingId=${result.bookingId}`)
  } catch (error) {
    result.notes.push(error instanceof Error ? error.message : String(error))
    result.endUrl = page.url() || result.endUrl
  } finally {
    await page.close()
  }

  return result
}

function buildReportMarkdown(timestamp: string, baseUrl: string, results: MatrixAttemptResult[]) {
  const passed = results.filter((result) => result.status === 'passed').length
  const failed = results.filter((result) => result.status === 'failed').length
  const overall = failed === 0 ? 'PASS' : 'FAIL'

  const lines = [
    '# Raport Live Booking Matrix',
    '',
    `- Data: ${timestamp}`,
    `- URL: ${baseUrl}`,
    `- Wynik ogolny: ${overall}`,
    `- Proby zaliczone: ${passed}/${results.length}`,
    '',
    '## Proby',
  ]

  for (const result of results) {
    lines.push(`### ${result.status.toUpperCase()} - ${result.index}. ${result.label}`)
    lines.push(`- Route start: ${result.routePath}`)
    lines.push(`- Start URL: ${result.startUrl}`)
    lines.push(`- End URL: ${result.endUrl}`)
    lines.push(`- Slot: ${result.slotLabel ?? 'brak'}`)
    lines.push(`- BookingId: ${result.bookingId ?? 'brak'}`)
    lines.push(`- Access: ${result.accessToken ? 'present' : 'missing'}`)

    for (const note of result.notes) {
      lines.push(`- Note: ${note}`)
    }

    lines.push('')
  }

  return lines.join('\n')
}

async function main() {
  const rootDir = process.cwd()
  loadEnvConfig(rootDir)

  const baseUrl = resolveBaseUrl()
  const timestamp = getWarsawTimestamp()
  const reportDir = path.join(rootDir, 'qa-reports')
  const archivePath = path.join(reportDir, `live-booking-matrix-${timestamp.compact}.md`)
  const latestPath = path.join(reportDir, 'latest-live-booking-matrix.md')

  const browser = await chromium.launch({
    headless: true,
    executablePath: await resolveBrowserExecutablePath(),
  })

  try {
    const context = await browser.newContext({
      locale: 'pl-PL',
      viewport: { width: 1440, height: 1200 },
    })

    const results: MatrixAttemptResult[] = []

    for (const [index, attempt] of MATRIX_ATTEMPTS.entries()) {
      results.push(await runAttempt(context, baseUrl, attempt, index))
    }

    const report = buildReportMarkdown(timestamp.isoLike, baseUrl, results)
    await mkdir(reportDir, { recursive: true })
    await writeFile(archivePath, `${report}\n`, 'utf8')
    await writeFile(latestPath, `${report}\n`, 'utf8')

    const failed = results.filter((result) => result.status === 'failed').length

    console.log(
      JSON.stringify(
        {
          baseUrl,
          archivePath,
          latestPath,
          passed: results.length - failed,
          failed,
          attempts: results.map((result) => ({
            index: result.index,
            label: result.label,
            status: result.status,
            bookingId: result.bookingId,
            slotLabel: result.slotLabel,
          })),
        },
        null,
        2,
      ),
    )

    if (failed > 0) {
      throw new Error(`Live booking matrix detected ${failed} failed attempt(s).`)
    }
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
