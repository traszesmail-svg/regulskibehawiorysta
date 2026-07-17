import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium, type Page } from 'playwright-core'
import { SITE_PRODUCTION_URL } from '@/lib/site'
import { resolveBrowserExecutablePath } from './lib/browser-path'

type CheckResult = {
  name: string
  status: 'PASS' | 'FAIL'
  detail: string
}

const rootDir = process.cwd()
const reportDir = path.join(rootDir, 'qa-reports', 'js-off-smoke')
const reportPath = path.join(reportDir, 'report.md')

function readArg(name: string) {
  const index = process.argv.indexOf(name)
  return index === -1 ? null : process.argv[index + 1] ?? null
}

function resolveBaseUrl() {
  return (readArg('--base-url') ?? process.env.JS_OFF_SMOKE_URL ?? SITE_PRODUCTION_URL).replace(/\/+$/, '')
}

function pass(name: string, detail: string): CheckResult {
  return { name, status: 'PASS', detail }
}

function fail(name: string, detail: string): CheckResult {
  return { name, status: 'FAIL', detail }
}

async function requireSelector(page: Page, selector: string, name: string) {
  const count = await page.locator(selector).count()
  return count > 0 ? pass(name, selector) : fail(name, `missing selector: ${selector}`)
}

async function checkContactFallback(page: Page, baseUrl: string) {
  await page.goto(`${baseUrl}/kontakt`, { waitUntil: 'networkidle', timeout: 45_000 })

  return [
    await requireSelector(page, 'form[action="/api/contact"][method="post"]', 'contact form posts without JS'),
    await requireSelector(page, 'input[name="name"]', 'contact name field'),
    await requireSelector(page, 'input[name="contact"][type="email"]', 'contact email field'),
    await requireSelector(page, 'textarea[name="message"]', 'contact message field'),
    await requireSelector(page, 'input[name="species"][type="radio"]', 'contact species radios'),
  ]
}

async function checkBookingFallback(page: Page, baseUrl: string) {
  await page.goto(`${baseUrl}/book`, { waitUntil: 'networkidle', timeout: 45_000 })

  const firstSlotHref = await page
    .locator('a[data-nearest-slot-link="true"], a[data-selected-slot-link="true"]')
    .first()
    .getAttribute('href')
    .catch(() => null)

  if (!firstSlotHref) {
    return [fail('booking slot link without JS', 'missing nearest/selected slot link on /book')]
  }

  const formUrl = new URL(firstSlotHref, `${baseUrl}/`).toString()
  await page.goto(formUrl, { waitUntil: 'networkidle', timeout: 45_000 })

  return [
    pass('booking slot link without JS', firstSlotHref),
    await requireSelector(page, 'form[action="/api/bookings"][method="post"]', 'booking form posts without JS'),
    await requireSelector(page, 'input[name="ownerName"]', 'booking owner field'),
    await requireSelector(page, 'input[name="email"][type="email"]', 'booking email field'),
    await requireSelector(page, 'textarea[name="description"]', 'booking description field'),
    await requireSelector(page, 'input[name="slotId"]', 'booking slot id field'),
    await requireSelector(page, 'input[name="consentTerms"][type="checkbox"]', 'booking terms checkbox'),
    await requireSelector(page, 'input[name="consentEarlyStart"][type="checkbox"]', 'booking early start checkbox'),
  ]
}

function renderReport(baseUrl: string, checks: CheckResult[]) {
  const failures = checks.filter((check) => check.status === 'FAIL')
  const lines = [
    '# JS Off Smoke',
    '',
    `Base URL: ${baseUrl}`,
    `Generated: ${new Date().toISOString()}`,
    `Status: ${failures.length === 0 ? 'PASS' : 'FAIL'}`,
    '',
    '## Checks',
    ...checks.map((check) => `- ${check.status} ${check.name}: ${check.detail}`),
  ]

  return `${lines.join('\n')}\n`
}

async function main() {
  const baseUrl = resolveBaseUrl()
  const executablePath = await resolveBrowserExecutablePath({ preferSystem: true })
  const browser = await chromium.launch({ executablePath, headless: true })
  const checks: CheckResult[] = []

  try {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      ignoreHTTPSErrors: true,
    })
    const page = await context.newPage()

    try {
      checks.push(...(await checkContactFallback(page, baseUrl)))
      checks.push(...(await checkBookingFallback(page, baseUrl)))
    } finally {
      await page.close().catch(() => {})
      await context.close().catch(() => {})
    }
  } finally {
    await browser.close().catch(() => {})
  }

  const report = renderReport(baseUrl, checks)
  const failures = checks.filter((check) => check.status === 'FAIL').length

  await mkdir(reportDir, { recursive: true })
  await writeFile(reportPath, report, 'utf8')

  console.log(
    JSON.stringify(
      {
        baseUrl,
        checks: checks.length,
        failures,
        report: path.relative(rootDir, reportPath).replace(/\\/g, '/'),
      },
      null,
      2,
    ),
  )

  if (failures > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
