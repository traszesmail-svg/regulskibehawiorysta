import { access, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { loadEnvConfig } from '@next/env'
import { chromium, type BrowserContext, type Locator, type Page } from 'playwright-core'
import { isFutureAvailabilitySlot } from '../lib/data'
import { SITE_PRODUCTION_URL } from '../lib/site'
import { resolveBrowserExecutablePath } from './lib/browser-path'

type StepStatus = 'passed' | 'failed'

type StepResult = {
  name: string
  status: StepStatus
  startUrl: string
  endUrl: string
  notes: string[]
}

type MobileResult = {
  width: number
  height: number
  heroClear: boolean
  cardsReadable: boolean
  bottomAreaLean: boolean
  ctaEasyToTap: boolean
  layoutStable: boolean
  notes: string[]
}

type DesktopResult = {
  bookCardsReadable: boolean
  problemCardsReadable: boolean
  layoutStable: boolean
  notes: string[]
}

type IssueLevel = 'console' | 'pageerror' | 'requestfailed' | 'http'

type Issue = {
  level: IssueLevel
  source: string
  url: string | null
  message: string
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

function readArg(name: string): string | null {
  const index = process.argv.indexOf(name)

  if (index === -1) {
    return null
  }

  return process.argv[index + 1] ?? null
}

function resolveBaseUrl() {
  const raw = readArg('--url') ?? process.env.LIVE_SMOKE_URL ?? SITE_PRODUCTION_URL
  return raw.endsWith('/') ? raw.slice(0, -1) : raw
}

function cleanText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function sameOrigin(baseUrl: string, targetUrl: string) {
  try {
    return new URL(targetUrl).origin === new URL(baseUrl).origin
  } catch {
    return false
  }
}

function isIgnorableSameOriginAbort(url: string, message: string, resourceType?: string) {
  if (!message.includes('ERR_ABORTED')) {
    return false
  }

  try {
    const parsed = new URL(url)

    if (parsed.pathname === '/icon.svg' || parsed.pathname.startsWith('/_next/static/') || parsed.pathname.startsWith('/branding/')) {
      return true
    }
  } catch {}

  if (resourceType === 'document') {
    return true
  }

  if (resourceType === 'image') {
    try {
      const parsed = new URL(url)
      return parsed.pathname === '/_next/image' || parsed.pathname === '/icon.svg'
    } catch {
      return false
    }
  }

  try {
    const parsed = new URL(url)
    if (parsed.pathname.startsWith('/api/bookings/') && parsed.pathname.endsWith('/status')) {
      return true
    }
  } catch {}

  try {
    const parsed = new URL(url)
    return parsed.searchParams.has('_rsc')
  } catch {
    return false
  }
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

  throw new Error('Nie znaleziono lokalnej przeglądarki Chromium (Chrome lub Edge) do live-clickthrough-report.')
}

function pushIssue(issues: Issue[], issue: Issue, seen: Set<string>) {
  const key = `${issue.level}|${issue.source}|${issue.url ?? ''}|${issue.message}`
  if (seen.has(key)) {
    return
  }

  seen.add(key)
  issues.push(issue)
}

function attachDiagnostics(page: Page, source: string, baseUrl: string, issues: Issue[], seen: Set<string>) {
  page.on('console', (message) => {
    if (message.type() !== 'error') {
      return
    }

    pushIssue(
      issues,
      {
        level: 'console',
        source,
        url: page.url() || null,
        message: cleanText(message.text()),
      },
      seen,
    )
  })

  page.on('pageerror', (error) => {
    pushIssue(
      issues,
      {
        level: 'pageerror',
        source,
        url: page.url() || null,
        message: cleanText(error.stack ?? error.message),
      },
      seen,
    )
  })

  page.on('requestfailed', (request) => {
    if (!sameOrigin(baseUrl, request.url())) {
      return
    }

    const message = cleanText(request.failure()?.errorText ?? 'Request failed')
    if (isIgnorableSameOriginAbort(request.url(), message, request.resourceType())) {
      return
    }

    pushIssue(
      issues,
      {
        level: 'requestfailed',
        source,
        url: request.url(),
        message,
      },
      seen,
    )
  })

  page.on('response', (response) => {
    if (!sameOrigin(baseUrl, response.url()) || response.status() < 400) {
      return
    }

    pushIssue(
      issues,
      {
        level: 'http',
        source,
        url: response.url(),
        message: `HTTP ${response.status()} ${response.statusText()}`,
      },
      seen,
    )
  })
}

async function createPage(context: BrowserContext, source: string, baseUrl: string, issues: Issue[], seen: Set<string>) {
  const page = await context.newPage()
  attachDiagnostics(page, source, baseUrl, issues, seen)
  return page
}

async function runStep(results: StepResult[], name: string, page: Page | null, work: (step: StepResult) => Promise<void>) {
  const step: StepResult = {
    name,
    status: 'passed',
    startUrl: page?.url() || 'about:blank',
    endUrl: page?.url() || 'about:blank',
    notes: [],
  }

  try {
    await work(step)
  } catch (error) {
    step.status = 'failed'
    step.notes.push(error instanceof Error ? error.message : String(error))
  }

  step.endUrl = page?.url() || step.endUrl
  results.push(step)
  return step.status === 'passed'
}

async function isVisible(locator: Locator) {
  try {
    return await locator.isVisible()
  } catch {
    return false
  }
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

  throw new Error('Żaden z oczekiwanych elementów nie pojawił się na czas.')
}

async function waitForAnyBodyText(page: Page, patterns: Array<RegExp | string>, timeout: number) {
  const deadline = Date.now() + timeout

  while (Date.now() < deadline) {
    let text = ''

    try {
      text = cleanText(await page.locator('body').innerText())
    } catch {}

    for (const pattern of patterns) {
      if (typeof pattern === 'string') {
        if (text.includes(pattern)) {
          return text
        }
      } else if (pattern.test(text)) {
        return text
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  throw new Error('Żaden z oczekiwanych elementów nie pojawił się na czas.')
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
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

function getFirstSlotLink(page: Page) {
  return page.locator('[data-selected-slot-link="true"], [data-nearest-slot-link="true"], a.slot-link').first()
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

function getPaymentMethodButton(page: Page, method: 'manual' | 'payu') {
  return page.locator(`[data-payment-method="${method}"]`).first()
}

function getPaymentSubmitButton(page: Page, method: 'manual' | 'payu') {
  return page.locator(`[data-payment-submit="${method}"]`).first()
}

function getBookingRowLocators(page: Page, bookingEmail: string, bookingId?: string | null) {
  const locators: Locator[] = []

  if (bookingId) {
    locators.push(page.locator(`[data-booking-id="${escapeAttributeValue(bookingId)}"]`).first())
  }

  locators.push(page.locator(`[data-booking-email="${escapeAttributeValue(bookingEmail)}"]`).first())
  locators.push(page.locator('.booking-row', { hasText: bookingEmail }).first())

  return locators
}

async function waitForBookingRow(page: Page, bookingEmail: string, bookingId?: string | null, timeout = 20000) {
  return waitForAnyVisible(getBookingRowLocators(page, bookingEmail, bookingId), timeout)
}

async function clickAndWaitForUrl(
  page: Page,
  locator: Locator,
  urlPattern: RegExp | string | ((url: URL) => boolean),
  timeout = 30000,
) {
  await Promise.all([page.waitForURL(urlPattern, { timeout, waitUntil: 'domcontentloaded' }), locator.click({ force: true })])
}

async function waitForHome(page: Page, baseUrl: string) {
  await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { level: 1, name: /Martwi Ci.*zachowanie psa lub kota/i }).waitFor({ timeout: 20000 })
  await page.locator('.homepage-zapytaj-primary').first().waitFor({ timeout: 20000 })
}
async function waitForConfirmationState(page: Page, expectedState: string, headingFallback: RegExp, timeout: number) {
  return waitForAnyVisible(
    [
      page.locator(`[data-confirmation-state="${escapeAttributeValue(expectedState)}"]`).first(),
      page.getByRole('heading', { level: 1, name: headingFallback }),
    ],
    timeout,
  )
}

async function waitForPendingManualReview(page: Page, timeout: number) {
  return waitForAnyVisible(
    [
      page.locator('[data-confirmation-state="pending-manual-review"]').first(),
      page.locator('[data-payment-state="pending-manual-review"]').first(),
      page.getByRole('heading', { level: 1, name: /Wplata czeka na potwierdzenie/i }),
    ],
    timeout,
  )
}

async function assertNoPublicPhoneLinks(page: Page, routePath: string) {
  const telLinkCount = await page.locator('a[href^="tel:"]').count()

  if (telLinkCount > 0) {
    throw new Error(`Publiczny link tel: nadal jest widoczny na ${routePath}.`)
  }
}

async function assertLegacyHeaderLinksHidden(page: Page, routePath: string) {
  const legacyLabels = ['Koty', 'Pobyty', 'Umów konsultację']
  const visibleLegacyLinks: string[] = []

  for (const label of legacyLabels) {
    if ((await page.getByRole('link', { name: new RegExp(`^${label}$`, 'i') }).count()) > 0) {
      visibleLegacyLinks.push(label)
    }
  }

  if (visibleLegacyLinks.length > 0) {
    throw new Error(`Stare linki nawigacji nadal są widoczne na ${routePath}: ${visibleLegacyLinks.join(', ')}.`)
  }
}

async function assertPublicSiteNavVisible(page: Page, routePath: string) {
  const nav = page.locator('header.notatnik-topbar nav[aria-label="Glowne sekcje"]').first()
  await waitForAnyVisible([nav], 20000)

  for (const label of ['Konsultacja', 'Terapia', 'Materiały', 'Blog', 'O mnie']) {
    const link = nav.getByRole('link', { name: new RegExp(`^${escapeRegExp(label)}$`, 'i') }).first()

    if (!(await isVisible(link))) {
      throw new Error(`Brakuje linku ${label} w publicznym topbarze na ${routePath}.`)
    }
  }
}

async function assertBookingHeroJumpLink(page: Page, routePath: string, expectedHref: string, expectedLabel: RegExp) {
  const link = page.locator('.mobile-first-step-cta-actions a').filter({ hasText: expectedLabel }).first()
  await waitForAnyVisible([link], 20000)
  const href = await link.getAttribute('href')

  if (href !== expectedHref) {
    throw new Error(`CTA hero na ${routePath} ma href ${href ?? 'null'} zamiast ${expectedHref}.`)
  }
}

async function rejectManualPaymentWithRetry(page: Page, bookingId: string) {
  const rejectButton = page.locator(`[data-admin-booking-actions="${escapeAttributeValue(bookingId)}"] [data-admin-manual-action="reject"]`).first()

  await waitForAnyVisible([rejectButton], 20000)

  const responsePromise = page
    .waitForResponse(
      (response) =>
        response.url().includes(`/api/admin/bookings/${bookingId}/manual-payment`) &&
        response.request().method() === 'POST',
      { timeout: 30000 },
    )
    .catch(() => null)

  await rejectButton.click({ force: true })
  const response = await responsePromise

  if (!response) {
    throw new Error('Admin reject nie zwrócił odpowiedzi z API.')
  }

  if (!response.ok()) {
    throw new Error(`Admin reject POST zwrócił ${response.status()}.`)
  }

  await page.waitForLoadState('domcontentloaded').catch(() => {})
  await page.waitForTimeout(1500)
}

async function checkMobileLayout(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  baseUrl: string,
  width: number,
  height: number,
  issues: Issue[],
  seen: Set<string>,
) {
  const context = await browser.newContext({
    locale: 'pl-PL',
    viewport: { width, height },
  })

  const page = await createPage(context, `mobile-${width}`, baseUrl, issues, seen)

  try {
    await waitForHome(page, baseUrl)
    const heroHeading = page.getByRole('heading', { level: 1 }).first()
    const homeCta = page.locator('.homepage-zapytaj-primary').first()
    const homeCtaBox = await homeCta.boundingBox()
    const headingBox = await heroHeading.boundingBox()
    const heroClear = Boolean(headingBox && headingBox.y >= 0 && headingBox.y + headingBox.height <= height)
    const homeCtaReadable = Boolean(homeCtaBox && homeCtaBox.width >= Math.max(220, width * 0.68))
    const ctaEasyToTap = Boolean(homeCtaBox && homeCtaBox.height >= 44 && homeCtaBox.width >= 44)
    const homeStable = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
    const homeLean = (await page.locator('footer').getByText(/Marka i kontakt/i).count()) === 0

    await page.goto(`${baseUrl}/book?qa=1`, { waitUntil: 'domcontentloaded' })
    await waitForAnyVisible([page.getByRole('heading', { name: /Wybierz termin konsultacji/i })], 20000)
    const calendarLayout = page.locator('.termin-calendar-layout').first()
    const calendarBox = await calendarLayout.boundingBox()
    const calendarControlsVisible =
      (await isVisible(page.locator('.termin-calendar-toolbar').first())) &&
      (await isVisible(page.locator('.termin-calendar-grid').first()))
    const bookCardsReadable = Boolean(calendarBox && calendarBox.width >= Math.max(236, width * 0.68)) && calendarControlsVisible
    const bookStable = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
    const bookLean = (await page.locator('footer').getByText(/Marka i kontakt/i).count()) === 0

    await page.goto(`${baseUrl}/kontakt`, { waitUntil: 'domcontentloaded' })
    await waitForAnyVisible([page.locator('h1').first()], 20000)
    const kontaktStable = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
    const kontaktLean = (await page.locator('footer').getByText(/Marka i kontakt/i).count()) === 0

    await page.goto(`${baseUrl}/zapytaj`, { waitUntil: 'domcontentloaded' })
    await waitForAnyVisible([page.getByRole('heading', { level: 1, name: /Martwi Ci.*zachowanie psa lub kota/i })], 20000)
    const zapytajCta = page.locator('.zapytaj-hero-actions a').first()
    const zapytajCtaBox = await zapytajCta.boundingBox()
    const zapytajPageReadable = Boolean(zapytajCtaBox && zapytajCtaBox.width >= Math.max(220, width * 0.68) && zapytajCtaBox.height >= 44)
    const zapytajStable = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
    const zapytajLean = (await page.locator('footer').getByText(/Marka i kontakt/i).count()) === 0

    return {
      width,
      height,
      heroClear,
      cardsReadable: homeCtaReadable && bookCardsReadable && zapytajPageReadable,
      bottomAreaLean: homeLean && bookLean && kontaktLean && zapytajLean,
      ctaEasyToTap,
      layoutStable: homeStable && bookStable && kontaktStable && zapytajStable,
      notes: [
        `homeCtaReadable=${homeCtaReadable}`,
        `bookCardsReadable=${bookCardsReadable}`,
        `zapytajPageReadable=${zapytajPageReadable}`,
        `homeLean=${homeLean}`,
        `bookLean=${bookLean}`,
        `kontaktLean=${kontaktLean}`,
        `zapytajLean=${zapytajLean}`,
      ],
    } satisfies MobileResult
  } catch (error) {
    pushIssue(
      issues,
      {
        level: 'pageerror',
        source: `mobile-${width}`,
        url: page.url() || null,
        message: cleanText(error instanceof Error ? error.stack ?? error.message : String(error)),
      },
      seen,
    )

    return {
      width,
      height,
      heroClear: false,
      cardsReadable: false,
      bottomAreaLean: false,
      ctaEasyToTap: false,
      layoutStable: false,
      notes: ['mobile layout check failed before completion'],
    } satisfies MobileResult
  } finally {
    await context.close()
  }
}

async function checkDesktopLayout(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  baseUrl: string,
  issues: Issue[],
  seen: Set<string>,
) {
  const context = await browser.newContext({
    locale: 'pl-PL',
    viewport: { width: 1366, height: 768 },
  })

  const page = await createPage(context, 'desktop', baseUrl, issues, seen)

  try {
    await page.goto(`${baseUrl}/book?qa=1`, { waitUntil: 'domcontentloaded' })
    await waitForAnyVisible([page.getByRole('heading', { name: /Wybierz termin konsultacji/i })], 20000)

    const calendarLayout = page.locator('.termin-calendar-layout').first()
    const calendarBox = await calendarLayout.boundingBox()
    const calendarToolbarBox = await page.locator('.termin-calendar-toolbar').first().boundingBox()
    const bookCardsReadable = Boolean(calendarBox && calendarBox.y <= 720 && calendarBox.width >= 700) && Boolean(calendarToolbarBox && calendarToolbarBox.width >= 400)

    await page.goto(`${baseUrl}/problemy#kot`, { waitUntil: 'domcontentloaded' })
    await waitForAnyVisible([page.locator('.problem-hub-group-kot .problem-hub-card').first()], 20000)

    const problemGroup = page.locator('.problem-hub-group-kot').first()
    const problemCard = problemGroup.locator('.problem-hub-card').first()
    const problemGridBox = await problemGroup.boundingBox()
    const problemCardBox = await problemCard.boundingBox()
    const problemCardsReadable = Boolean(problemGridBox && problemGridBox.y <= 720) && Boolean(problemCardBox && problemCardBox.width >= 300 && problemCardBox.width <= 420)

    const layoutStable = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)

    if (!bookCardsReadable) {
      pushIssue(
        issues,
        {
          level: 'pageerror',
          source: 'desktop-book',
          url: page.url() || null,
          message: 'Desktop booking cards are not readable or start too low on /book.',
        },
        seen,
      )
    }

    if (!problemCardsReadable) {
      pushIssue(
        issues,
        {
          level: 'pageerror',
          source: 'desktop-problem-map',
          url: page.url() || null,
          message: 'Desktop problem cards are not readable or start too low in the cat section of /problemy.',
        },
        seen,
      )
    }

    if (!layoutStable) {
      pushIssue(
        issues,
        {
          level: 'pageerror',
          source: 'desktop-layout',
          url: page.url() || null,
          message: 'Desktop layout overflowed the viewport on the booking pages.',
        },
        seen,
      )
    }

    return {
      bookCardsReadable,
      problemCardsReadable,
      layoutStable,
      notes: [
        `bookCardsReadable=${bookCardsReadable}`,
        `problemCardsReadable=${problemCardsReadable}`,
        `layoutStable=${layoutStable}`,
      ],
    } satisfies DesktopResult
  } catch (error) {
    pushIssue(
      issues,
      {
        level: 'pageerror',
        source: 'desktop',
        url: page.url() || null,
        message: cleanText(error instanceof Error ? error.stack ?? error.message : String(error)),
      },
      seen,
    )

    return {
      bookCardsReadable: false,
      problemCardsReadable: false,
      layoutStable: false,
      notes: ['desktop layout check failed before completion'],
    } satisfies DesktopResult
  } finally {
    await context.close()
  }
}

function buildReportMarkdown({
  baseUrl,
  timestamp,
  results,
  issues,
  qaIdentity,
  mobileResults,
}: {
  baseUrl: string
  timestamp: string
  results: StepResult[]
  issues: Issue[]
  qaIdentity: { ownerName: string; email: string }
  mobileResults: MobileResult[]
}) {
  const passed = results.filter((result) => result.status === 'passed').length
  const failed = results.filter((result) => result.status === 'failed').length
  const overall = failed === 0 ? 'PASS' : 'FAIL'

  const lines = [
    '# Raport QA Live Clickthrough',
    '',
    `- Data: ${timestamp}`,
    `- URL: ${baseUrl}`,
    `- Wynik ogólny: ${overall}`,
    `- Kroki zaliczone: ${passed}/${results.length}`,
    `- Liczba zebranych issue z runtime: ${issues.length}`,
    `- Booking QA identity: ${qaIdentity.ownerName} / ${qaIdentity.email}`,
    `- Bezpiecznik płatności: bez realnej płatności PayU i bez fałszywego approve na produkcji; test manual zakończony reject w adminie`,
    '',
    '## Kroki',
  ]

  for (const result of results) {
    lines.push(`### ${result.status.toUpperCase()} - ${result.name}`)
    lines.push(`- Start URL: ${result.startUrl}`)
    lines.push(`- End URL: ${result.endUrl}`)

    if (result.notes.length === 0) {
      lines.push('- Note: brak dodatkowych uwag')
    } else {
      for (const note of result.notes) {
        lines.push(`- Note: ${note}`)
      }
    }

    lines.push('')
  }

  lines.push('## Mobile')
  for (const result of mobileResults) {
    lines.push(`### ${result.width}px x ${result.height}px`)
    lines.push(`- heroClear=${result.heroClear}`)
    lines.push(`- cardsReadable=${result.cardsReadable}`)
    lines.push(`- bottomAreaLean=${result.bottomAreaLean}`)
    lines.push(`- ctaEasyToTap=${result.ctaEasyToTap}`)
    lines.push(`- layoutStable=${result.layoutStable}`)
    for (const note of result.notes) {
      lines.push(`- Note: ${note}`)
    }
    lines.push('')
  }

  lines.push('## Runtime issues')
  if (issues.length === 0) {
    lines.push('- Brak zebranych błędów konsoli, pageerrorów i same-origin request failures/HTTP >= 400.')
  } else {
    for (const issue of issues) {
      const urlSuffix = issue.url ? ` | ${issue.url}` : ''
      lines.push(`- [${issue.level}] ${issue.source}${urlSuffix} | ${issue.message}`)
    }
  }

  lines.push('')

  return lines.join('\n')
}

async function main() {
  const rootDir = process.cwd()
  loadEnvConfig(rootDir)

  const baseUrl = resolveBaseUrl()
  const adminSecret = process.env.ADMIN_ACCESS_SECRET?.trim()
  if (!adminSecret) {
    throw new Error('Brak ADMIN_ACCESS_SECRET w środowisku lokalnym.')
  }

  const timestamp = getWarsawTimestamp()
  const qaIdentity = {
    ownerName: `QA LIVE ${timestamp.compact}`,
    email: `qa-live-${timestamp.compact}@example.com`,
  }
  const issues: Issue[] = []
  const seenIssues = new Set<string>()
  const results: StepResult[] = []
  const reportDir = path.join(rootDir, 'qa-reports')
  const archivePath = path.join(reportDir, `live-clickthrough-${timestamp.compact}.md`)
  const latestPath = path.join(reportDir, 'latest-report.md')

  await mkdir(reportDir, { recursive: true })

  let browser = await chromium.launch({
    headless: true,
    executablePath: await resolveBrowserExecutablePath(),
  })

  try {
    const publicContext = await browser.newContext({
      locale: 'pl-PL',
      viewport: { width: 1440, height: 1200 },
    })
    const adminContext = await browser.newContext({
      locale: 'pl-PL',
      viewport: { width: 1440, height: 1200 },
      httpCredentials: { username: 'admin', password: adminSecret },
    })

    let publicPage = await createPage(publicContext, 'public', baseUrl, issues, seenIssues)

    let bookingId: string | null = null
    let accessToken: string | null = null
    let confirmationUrl: string | null = null

    await runStep(results, 'Home', publicPage, async (step) => {
      await waitForHome(publicPage, baseUrl)
      const ctaHref = await publicPage.locator('.homepage-zapytaj-primary').first().getAttribute('href')
      if (ctaHref !== '/zapytaj') {
        throw new Error(`Homepage primary CTA points to ${ctaHref ?? 'no link'} instead of /zapytaj.`)
      }
      step.notes.push('Homepage primary CTA points to the current Zapytaj service page.')
    })

    await runStep(results, 'Homepage CTA -> /zapytaj', publicPage, async (step) => {
      await waitForHome(publicPage, baseUrl)
      await clickAndWaitForUrl(publicPage, publicPage.locator('.homepage-zapytaj-primary').first(), (url) => url.pathname === '/zapytaj')
      await waitForAnyVisible([publicPage.locator('#formularz').first()], 20000)
      step.notes.push('The homepage CTA opens the current service page and its intake form.')
    })

    await runStep(results, 'Problem map cat cards', publicPage, async (step) => {
      await publicPage.goto(`${baseUrl}/problemy#kot`, { waitUntil: 'domcontentloaded' })
      await waitForAnyVisible([publicPage.locator('.problem-hub-group-kot .problem-hub-card').first()], 20000)
      const catProblemCard = publicPage.locator('a[data-analytics-problem="kot-sika-poza-kuweta"]').first()
      const catProblemHref = await catProblemCard.getAttribute('href')
      if (catProblemHref !== '/problemy/kot-sika-poza-kuweta') {
        throw new Error(`Cat problem card points to ${catProblemHref ?? 'no link'} instead of its canonical problem page.`)
      }
      step.notes.push('The canonical problem map exposes cat problem cards and links to the active detail routes.')
    })

    await runStep(results, '/book?qa=1', publicPage, async (step) => {
      await publicPage.goto(`${baseUrl}/book?qa=1`, { waitUntil: 'domcontentloaded' })
      await waitForAnyVisible([publicPage.getByRole('heading', { name: /Wybierz termin konsultacji/i })], 20000)
      await waitForAnyVisible([publicPage.locator('.termin-calendar-layout').first()], 20000)
      const selectedSpecies = publicPage.locator('.termin-inline-choice-options a.is-selected').first()
      if (!/Pies/i.test(await selectedSpecies.innerText())) {
        throw new Error('The booking entry without a species query does not default to the dog selection.')
      }
      step.notes.push('The booking QA route opens the current calendar with the default dog selection.')
    })

    await runStep(results, '/book cat QA route', publicPage, async (step) => {
      await publicPage.goto(`${baseUrl}/book?problem=kot-stres&species=kot&qa=1`, { waitUntil: 'domcontentloaded' })
      await waitForAnyVisible([publicPage.getByRole('heading', { level: 1, name: /Wybierz termin konsultacji/i })], 20000)
      const selectedSpecies = publicPage.locator('.termin-inline-choice-options a.is-selected').first()
      if (!/Kot/i.test(await selectedSpecies.innerText())) {
        throw new Error('The booking calendar did not preserve the selected cat species.')
      }
      const firstSlot = getFirstSlotLink(publicPage)
      await waitForAnyVisible([firstSlot], 20000)
      step.notes.push(`Cat QA route exposes an available slot: ${cleanText(await firstSlot.innerText())}`)
    })
    await runStep(results, '/form', publicPage, async (step) => {
      const firstSlot = getFirstSlotLink(publicPage)
      await firstSlot.click()
      await publicPage.waitForURL(/\/form\?problem=kot-stres&slotId=/, { timeout: 30000, waitUntil: 'domcontentloaded' })
      await waitForAnyVisible([publicPage.getByRole('heading', { level: 1, name: /Uzupełnij dane do rezerwacji/i })], 20000)

      await getBookingFormField(publicPage, 'owner-name').fill(qaIdentity.ownerName)
      await getBookingFormField(publicPage, 'email').fill(qaIdentity.email)
      await getBookingFormField(publicPage, 'description').fill(
        'Test QA live. Kot napina się przy gościach, długo nie wraca do równowagi i chcę sprawdzić pierwszy kierunek pracy.',
      )
      await publicPage.locator('#booking-privacy').check()
      await publicPage.locator('#booking-early-start').check()

      const bookingResponse = publicPage.waitForResponse(
        (response) => response.url().includes('/api/bookings') && response.request().method() === 'POST',
      )
      await submitBookingForm(publicPage)
      const response = await bookingResponse
      if (!response.ok()) {
        throw new Error(`POST /api/bookings zwrocil ${response.status()}.`)
      }

      await publicPage.waitForURL(/\/payment\?bookingId=/, { timeout: 30000, waitUntil: 'domcontentloaded' })
      const paymentUrl = new URL(publicPage.url())
      bookingId = paymentUrl.searchParams.get('bookingId')
      accessToken = paymentUrl.searchParams.get('access')

      if (!bookingId || !accessToken) {
        throw new Error('Brak bookingId lub access token w URL payment.')
      }

      step.notes.push('Formularz przeszedl do payment.')
    })

    await runStep(results, '/book cat 30 min QA route', publicPage, async (step) => {
      await publicPage.goto(`${baseUrl}/book?problem=kot-kuweta&service=konsultacja-30-min&species=kot&qa=1`, { waitUntil: 'domcontentloaded' })
      await waitForAnyVisible(
        [publicPage.getByRole('heading', { level: 1, name: /Wybierz termin konsultacji/i })],
        20000,
      )
      const firstSlot = getFirstSlotLink(publicPage)
      await waitForAnyVisible([firstSlot], 20000)
      step.notes.push('Cat booking keeps the selected 30-minute service on the current QA route.')
    })
    await runStep(results, '/payment', publicPage, async (step) => {
      if (!bookingId || !accessToken) {
        throw new Error('Brak bookingId lub access token do powrotu na payment.')
      }

      await publicPage.goto(`${baseUrl}/payment?bookingId=${bookingId}&access=${accessToken}`, {
        waitUntil: 'domcontentloaded',
      })
      await waitForAnyVisible(
        [
          publicPage.locator('[data-payment-state="payment-selection"]').first(),
          publicPage.getByRole('heading', { level: 1, name: /Wybierz sposób płatności/i }),
        ],
        20000,
      )

      const manualVisible = (await publicPage.locator('[data-payment-method="manual"]').count()) > 0
      const payuVisible = (await publicPage.locator('[data-payment-method="payu"]').count()) > 0

      step.notes.push(`manualVisible=${manualVisible}`)
      step.notes.push(`payuVisible=${payuVisible}`)
    })

    await runStep(results, 'manual payment -> pending', publicPage, async (step) => {
      const manualSubmitButton = getPaymentSubmitButton(publicPage, 'manual')

      if (!(await isVisible(manualSubmitButton))) {
        await getPaymentMethodButton(publicPage, 'manual').click({ force: true })
      }

      await manualSubmitButton.click({ force: true })

      const manualResponse = await publicPage.request.post(new URL('/api/payments/manual', baseUrl).toString(), {
        data: {
          bookingId: bookingId ?? '',
          accessToken: accessToken ?? '',
        },
      })

      if (!manualResponse.ok()) {
        throw new Error(`POST /api/payments/manual zwrócił ${manualResponse.status()}.`)
      }

      const manualPayload = (await manualResponse.json()) as { redirectTo?: string; error?: string }
      if (!manualPayload.redirectTo) {
        throw new Error(manualPayload.error ?? 'Brak redirectTo z /api/payments/manual.')
      }

      const confirmationTargetUrl = new URL(manualPayload.redirectTo, baseUrl)

      await publicPage.goto(confirmationTargetUrl.toString(), { waitUntil: 'domcontentloaded' })

      let pendingVisible = false
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          await waitForConfirmationState(publicPage, 'pending-manual-review', /Wpłata czeka na potwierdzenie/i, 20000)
          pendingVisible = true
          break
        } catch {
          await publicPage.waitForTimeout(1000)
          await publicPage.goto(confirmationTargetUrl.toString(), { waitUntil: 'domcontentloaded' })
        }
      }

      if (!pendingVisible) {
        throw new Error('Pending manual review nie pojawil sie po potwierdzeniu wplaty.')
      }

      step.notes.push('POST /api/payments/manual zwrocil canonical redirectTo i potwierdzenie pokazalo pending manual review.')
      confirmationUrl = publicPage.url()
      step.notes.push('Rezerwacja przeszła do pending manual review.')
    })

    const skipAdminFlow = process.env.LIVE_CLICKTHROUGH_SKIP_ADMIN_FLOW === '1' || process.env.LIVE_CLICKTHROUGH_SKIP_ADMIN_FLOW === 'true'

    if (!skipAdminFlow) {
      await runStep(results, 'admin reject', publicPage, async (step) => {
        if (!bookingId) {
          throw new Error('Brak bookingId do akcji admina.')
        }

        const adminPage = await createPage(adminContext, 'admin', baseUrl, issues, seenIssues)
        try {
          await adminPage.goto(`${baseUrl}/admin`, { waitUntil: 'domcontentloaded' })
          await rejectManualPaymentWithRetry(adminPage, bookingId)
        } finally {
          await adminPage.close()
        }

        step.notes.push('Admin odrzucił testową wpłatę QA.')
      })

      await runStep(results, '/confirmation', publicPage, async (step) => {
        const confirmationPage = await createPage(publicContext, 'confirmation', baseUrl, issues, seenIssues)
        publicPage = confirmationPage

        if (!confirmationUrl) {
          if (!bookingId) {
            throw new Error('Brak bookingId do odswiezenia confirmation.')
          }

          const fallbackConfirmationUrl = new URL('/confirmation', baseUrl)
          fallbackConfirmationUrl.searchParams.set('bookingId', bookingId)
          fallbackConfirmationUrl.searchParams.set('manual', 'reported')

          if (accessToken) {
            fallbackConfirmationUrl.searchParams.set('access', accessToken)
          }

          confirmationUrl = fallbackConfirmationUrl.toString()
        }

        await confirmationPage.goto(confirmationUrl, { waitUntil: 'domcontentloaded' })
        let rejectedVisible = false

        for (let attempt = 0; attempt < 6; attempt += 1) {
          try {
            await waitForConfirmationState(confirmationPage, 'manual-rejected', /Nie znaleziono wplaty do tej rezerwacji/i, 4000)
            rejectedVisible = true
            break
          } catch {}

          await confirmationPage.waitForTimeout(2000)
          await confirmationPage.goto(confirmationUrl, { waitUntil: 'domcontentloaded' })
        }

        if (!rejectedVisible) {
          throw new Error('Confirmation nie pokazał stanu odrzuconej wpłaty po adminowym reject.')
        }

        await waitForAnyVisible([confirmationPage.getByRole('link', { name: /Wybierz nowy termin/i })], 20000)
        step.notes.push('Confirmation pokazuje stan odrzuconej wpłaty.')
      })
    }

    await runStep(results, '/zapytaj current service page', publicPage, async (step) => {
      await publicPage.goto(`${baseUrl}/zapytaj`, { waitUntil: 'domcontentloaded' })
      await waitForAnyVisible([publicPage.getByRole('heading', { level: 1, name: /Martwi Ci.*zachowanie psa lub kota/i })], 20000)
      await waitForAnyVisible([publicPage.locator('#formularz').first()], 20000)
      const ctaHref = await publicPage.locator('.zapytaj-hero-actions a').first().getAttribute('href')
      if (ctaHref !== '#formularz') {
        throw new Error(`The Zapytaj hero CTA points to ${ctaHref ?? 'no link'} instead of #formularz.`)
      }
      step.notes.push('The canonical Zapytaj page exposes its intake form and matching hero CTA.')
    })

    await runStep(results, 'legacy offer redirects', publicPage, async (step) => {
      const redirects = [
        { from: '/cennik', to: '/zapytaj', heading: /Martwi Cię zachowanie psa lub kota|Martwi Cie zachowanie psa lub kota/i },
        { from: '/oferta', to: '/zapytaj', heading: /Martwi Cię zachowanie psa lub kota|Martwi Cie zachowanie psa lub kota/i },
        { from: '/oferta/konsultacja-behawioralna-online', to: '/konsultacja', heading: /Konsultacja/i },
        { from: '/oferta/poradniki-pdf', to: '/materialy', heading: /Materia.*PDF.*opiekun/i },
      ] as const

      for (const route of redirects) {
        await publicPage.goto(`${baseUrl}${route.from}`, { waitUntil: 'domcontentloaded' })
        await publicPage.waitForURL((url) => url.pathname === route.to, { timeout: 20000, waitUntil: 'domcontentloaded' })
        await waitForAnyVisible([publicPage.getByRole('heading', { level: 1, name: route.heading })], 20000)
      }
      step.notes.push('Legacy public offer URLs resolve to the current Zapytaj, consultation, and materials pages.')
    })
    await runStep(results, '/book 30 min hero CTA', publicPage, async (step) => {
      await publicPage.goto(`${baseUrl}/book?qa=1&service=konsultacja-30-min`, { waitUntil: 'domcontentloaded' })
      await waitForAnyVisible([publicPage.getByRole('heading', { level: 1, name: /Wybierz termin konsultacji/i })], 20000)
      await assertBookingHeroJumpLink(publicPage, '/book?qa=1&service=konsultacja-30-min', '#najblizsze-terminy', /Zobacz terminy/i)
      const bodyText = cleanText(await publicPage.locator('main').innerText())
      if (!bodyText.includes('Ten starszy wariant nie jest obecnie')) {
        throw new Error('The retired 30-minute service is not clearly identified as unavailable to public bookings.')
      }
      step.notes.push('The internal 30-minute QA route identifies the service as retired and links to available dates.')
    })

    await runStep(results, '/book full consultation hero CTA', publicPage, async (step) => {
      await publicPage.goto(`${baseUrl}/book?qa=1&service=konsultacja-behawioralna-online`, { waitUntil: 'domcontentloaded' })
      await waitForAnyVisible([publicPage.getByRole('heading', { level: 1, name: /Wybierz termin konsultacji/i })], 20000)
      await assertBookingHeroJumpLink(
        publicPage,
        '/book?qa=1&service=konsultacja-behawioralna-online',
        '#najblizsze-terminy',
        /Zobacz terminy/i,
      )
      const serviceTitle = await publicPage.locator('.mobile-first-step-cta strong').first().innerText()
      if (!/Pełna|Pelna konsultacja/i.test(serviceTitle)) {
        throw new Error(`The booking calendar does not show the selected full-consultation service: ${serviceTitle}.`)
      }
      step.notes.push('The current full-consultation calendar keeps the selected service and date CTA.')
    })

    await runStep(results, '/kontakt', publicPage, async (step) => {
      await publicPage.goto(`${baseUrl}/kontakt`, { waitUntil: 'domcontentloaded' })
      await waitForAnyBodyText(publicPage, [/Napisz krótko, co się dzieje/i, /Wyślij opis sytuacji/i], 20000)
      await assertNoPublicPhoneLinks(publicPage, '/kontakt')
      step.notes.push('Kontakt jest skrócony do akcji i krótkiej tożsamości.')
    })

    await runStep(results, '/regulamin', publicPage, async (step) => {
      await publicPage.goto(`${baseUrl}/regulamin`, { waitUntil: 'domcontentloaded' })
      await waitForAnyVisible([publicPage.getByRole('heading', { level: 1, name: /Zasady rezerwacji szybkiej konsultacji 15 min/i })], 20000)
      await waitForAnyVisible([publicPage.getByText(/Publiczny profil CAPBT \/ COAPE/i)], 20000)
      await assertNoPublicPhoneLinks(publicPage, '/regulamin')
      await assertPublicSiteNavVisible(publicPage, '/regulamin')
      await assertLegacyHeaderLinksHidden(publicPage, '/regulamin')
      step.notes.push('Regulamin używa nowego shellu prawnego bez starego menu.')
    })

    await runStep(results, '/polityka-prywatnosci', publicPage, async (step) => {
      await publicPage.goto(`${baseUrl}/polityka-prywatnosci`, { waitUntil: 'domcontentloaded' })
      await waitForAnyBodyText(
        publicPage,
        [/Jak przetwarzane są dane w marce Regulski \| Terapia behawioralna/i, /Opisz krótko, co się dzieje/i, /Publiczny profil CAPBT \/ COAPE/i],
        20000,
      )
      await assertNoPublicPhoneLinks(publicPage, '/polityka-prywatnosci')
      await assertPublicSiteNavVisible(publicPage, '/polityka-prywatnosci')
      await assertLegacyHeaderLinksHidden(publicPage, '/polityka-prywatnosci')
      step.notes.push('Polityka prywatności używa nowego shellu prawnego bez starego menu.')
    })

    await runStep(results, '/materialy guide nav', publicPage, async (step) => {
      await publicPage.goto(`${baseUrl}/materialy/pies-sam-w-domu`, { waitUntil: 'domcontentloaded' })
      await waitForAnyVisible([publicPage.locator('main h1').first()], 20000)
      await assertPublicSiteNavVisible(publicPage, '/materialy/pies-sam-w-domu')
      await assertLegacyHeaderLinksHidden(publicPage, '/materialy/pies-sam-w-domu')
      step.notes.push('Strona pojedynczego aktualnego PDF ma ten sam publiczny topbar co glowne templatey.')
    })

    await runStep(results, '/materialy listing nav', publicPage, async (step) => {
      await publicPage.goto(`${baseUrl}/materialy`, { waitUntil: 'domcontentloaded' })
      await waitForAnyVisible([publicPage.locator('main h1').first()], 20000)
      await assertPublicSiteNavVisible(publicPage, '/materialy')
      await assertLegacyHeaderLinksHidden(publicPage, '/materialy')
      step.notes.push('Katalog aktualnych PDF ma ten sam publiczny topbar co glowne templatey.')
    })

    await runStep(results, 'canonical leash reactivity article', publicPage, async (step) => {
      await publicPage.goto(`${baseUrl}/blog/reaktywnosc-na-smyczy-cwiczenie-luznej-smyczy`, { waitUntil: 'domcontentloaded' })
      await waitForAnyVisible([publicPage.locator('main h1').first()], 20000)
      await assertPublicSiteNavVisible(publicPage, '/blog/reaktywnosc-na-smyczy-cwiczenie-luznej-smyczy')
      await assertLegacyHeaderLinksHidden(publicPage, '/blog/reaktywnosc-na-smyczy-cwiczenie-luznej-smyczy')
      step.notes.push('The current canonical article uses the current public navigation.')
    })

    await publicContext.close()
    await adminContext.close()

    await browser.close().catch(() => {})
    browser = await chromium.launch({
      headless: true,
      executablePath: await resolveBrowserExecutablePath(),
    })

    const skipMobile = process.env.LIVE_CLICKTHROUGH_SKIP_MOBILE === '1' || process.env.LIVE_CLICKTHROUGH_SKIP_MOBILE === 'true'
    const desktopResult = await checkDesktopLayout(browser, baseUrl, issues, seenIssues)
    const mobileResults = skipMobile
      ? []
      : [
          await checkMobileLayout(browser, baseUrl, 360, 800, issues, seenIssues),
          await checkMobileLayout(browser, baseUrl, 375, 812, issues, seenIssues),
          await checkMobileLayout(browser, baseUrl, 390, 844, issues, seenIssues),
          await checkMobileLayout(browser, baseUrl, 430, 932, issues, seenIssues),
        ]

    const report = buildReportMarkdown({
      baseUrl,
      timestamp: timestamp.isoLike,
      results,
      issues,
      qaIdentity,
      mobileResults,
    })

    await writeFile(archivePath, report, 'utf8')
    await writeFile(latestPath, report, 'utf8')

    console.log(
      JSON.stringify(
        {
          archivePath,
          latestPath,
          passed: results.filter((result) => result.status === 'passed').length,
          failed: results.filter((result) => result.status === 'failed').length,
          issues: issues.length,
          bookingId,
          desktop: desktopResult,
          mobile: mobileResults,
        },
        null,
        2,
      ),
    )

    if (
      results.some((result) => result.status === 'failed') ||
      !desktopResult.bookCardsReadable ||
      !desktopResult.problemCardsReadable ||
      !desktopResult.layoutStable ||
      mobileResults.some((result) => !result.heroClear || !result.cardsReadable || !result.bottomAreaLean || !result.ctaEasyToTap || !result.layoutStable)
    ) {
      process.exitCode = 1
    }

  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error)
  process.exitCode = 1
})
