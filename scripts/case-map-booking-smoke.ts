import assert from 'node:assert/strict'
import { spawn, type ChildProcess } from 'node:child_process'
import path from 'node:path'
import { loadEnvConfig } from '@next/env'
import { chromium, type Browser, type Locator, type Page } from 'playwright-core'
import { createLocalDataSandbox } from './lib/local-data-sandbox'
import { resolveBrowserExecutablePath } from './lib/browser-path'

const rootDir = process.cwd()
const measurementId = 'G-CASEMAPSAFETYSMOKE'

type SafetyPath = {
  name: string
  first: 'yes' | 'no'
  second: 'yes' | 'no'
  triage: 'PROCEED' | 'SAFETY_NOW' | 'VET_URGENT'
  expectedText: RegExp
}

const safetyPaths: SafetyPath[] = [
  {
    name: 'safe',
    first: 'no',
    second: 'no',
    triage: 'PROCEED',
    expectedText: /Najlepszy pierwszy krok to spokojna rozmowa z behawiorystą/i,
  },
  {
    name: 'active-danger',
    first: 'yes',
    second: 'no',
    triage: 'SAFETY_NOW',
    expectedText: /112/i,
  },
  {
    name: 'health-or-injury',
    first: 'no',
    second: 'yes',
    triage: 'VET_URGENT',
    expectedText: /weterynarz|klin.*całodobową/i,
  },
]

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

  throw new Error('Local case-map safety smoke server did not become ready in time.')
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

async function prepareMap(page: Page, appUrl: string) {
  await page.goto(`${appUrl}/mapa-sprawy`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    window.localStorage.setItem('regulski-behawiorysta.analytics.consent', 'granted')
  })
  await page.reload({ waitUntil: 'domcontentloaded' })

  const safetyScreen = page.locator('[data-map-screen="safety"]')
  await safetyScreen.waitFor()
  assert.equal(await page.locator('[data-safety-question]').count(), 2)
  assert.equal(await page.locator('[data-safety-question] button').count(), 4)
  assert.equal(await page.getByText('Nie wiem', { exact: true }).count(), 0)
  assert.equal(await page.getByText(/Szybka mapa|Pełniejsza mapa/i).count(), 0)

  const continueButton = page.locator('[data-map-action="continue"]')
  assert.equal(await continueButton.isDisabled(), true)
  return { continueButton }
}

async function clickAnswer(button: Locator) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    await button.click()
    if (await button.getAttribute('aria-pressed') === 'true') return
    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  throw new Error('Map safety answer did not become selected after the page hydrated.')
}

async function runSafetyPath(page: Page, appUrl: string, safetyPath: SafetyPath) {
  const { continueButton } = await prepareMap(page, appUrl)
  const firstQuestion = page.locator('[data-safety-question="active_danger"]')
  const secondQuestion = page.locator('[data-safety-question="emergency_health"]')

  await clickAnswer(firstQuestion.getByRole('button', { name: safetyPath.first === 'yes' ? /Tak, jest zagrożenie/i : /Nie, teraz jest bezpiecznie/i }))
  assert.equal(await continueButton.isDisabled(), true)
  await clickAnswer(secondQuestion.getByRole('button', { name: safetyPath.second === 'yes' ? /Tak, coś takiego/i : /Nie, nie widzę/i }))
  try {
    await page.waitForFunction(() => (document.querySelector('[data-map-action="continue"]') as HTMLButtonElement | null)?.disabled === false, undefined, { timeout: 5_000 })
  } catch (error) {
    const debugState = await page.locator('[data-safety-question]').evaluateAll((questions) =>
      questions.map((question) => ({
        id: question.getAttribute('data-safety-question'),
        buttons: [...question.querySelectorAll('button')].map((button) => ({
          text: button.textContent?.replace(/\s+/g, ' ').trim(),
          pressed: button.getAttribute('aria-pressed'),
        })),
      })),
    )
    console.error(JSON.stringify({ debugState, continueDisabled: await continueButton.isDisabled() }))
    throw error
  }
  assert.equal(await continueButton.isDisabled(), false)
  await continueButton.click()

  const result = page.locator('[data-map-screen="result"]')
  await result.waitFor()
  // Offer/completion are emitted from the result render. Keep the page alive
  // long enough for beacon/fetch delivery before the scenario closes it.
  await page.waitForTimeout(750)
  assert.equal(await page.locator('[data-map-stage="result"]').count(), 1)
  assert.equal(await result.getAttribute('data-map-triage'), safetyPath.triage)
  assert.match(await result.innerText(), safetyPath.expectedText)

  if (safetyPath.triage === 'PROCEED') {
    const bookingLink = result.locator('[data-map-action="booking"]')
    assert.equal(await bookingLink.count(), 1)
    assert.equal(new URL(await bookingLink.getAttribute('href') ?? '', appUrl).pathname, '/zapytaj')
  } else {
    assert.equal(await result.locator('[data-map-action="booking"]').count(), 0)
    assert.equal(await result.locator('a[href^="/zapytaj"]').count(), 0)
    assert.equal(await result.getByText(/PDF|blog/i).count(), 0)
  }
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
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = measurementId

  const sandbox = await createLocalDataSandbox('case-map-safety-smoke', rootDir)
  let server: ChildProcess | null = null
  let browser: Browser | null = null

  try {
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

    for (const viewport of [
      { width: 1440, height: 1000, label: 'desktop' },
      { width: 390, height: 844, label: 'mobile' },
    ]) {
      for (const safetyPath of safetyPaths) {
        const page: Page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } })
        const pageErrors: string[] = []
        page.on('pageerror', (error) => pageErrors.push(error.message))
        page.setDefaultNavigationTimeout(120_000)
        page.setDefaultTimeout(60_000)

        try {
          await runSafetyPath(page, appUrl, safetyPath)
          const noHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
          assert.equal(noHorizontalOverflow, true, `${viewport.label}/${safetyPath.name} has horizontal overflow`)
          assert.deepEqual(pageErrors, [], `${viewport.label}/${safetyPath.name} emitted a page error`)

          const analyticsEvents = await page.evaluate(() =>
            (window as Window & { __behawiorAnalyticsEvents?: Array<{ eventType?: unknown }> }).__behawiorAnalyticsEvents ?? [],
          )
          const eventTypes = analyticsEvents.map((event) => event.eventType)
          assert.equal(eventTypes.includes('case_map_started'), true, `${viewport.label}/${safetyPath.name} did not emit start analytics`)
          if (safetyPath.triage === 'PROCEED') {
            assert.equal(eventTypes.includes('case_map_completed'), true, `${viewport.label}/${safetyPath.name} did not emit completion analytics`)
            assert.equal(eventTypes.includes('case_map_offer_viewed'), true, `${viewport.label}/${safetyPath.name} did not emit offer analytics`)
          } else {
            assert.equal(eventTypes.includes('case_map_completed'), false, `${viewport.label}/${safetyPath.name} emitted completion analytics`)
            assert.equal(eventTypes.includes('case_map_offer_viewed'), false, `${viewport.label}/${safetyPath.name} emitted offer analytics`)
          }
        } finally {
          await page.close()
        }
      }
    }

    console.log('CASE_MAP_SAFETY_SMOKE_OK')
  } finally {
    await browser?.close().catch(() => {})
    if (server) await stopServerTree(server)
    await sandbox.cleanup()
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error)
  process.exitCode = 1
})
