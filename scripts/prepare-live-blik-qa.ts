import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium, type Page } from 'playwright-core'
import { SITE_PRODUCTION_URL } from '../lib/site'
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
  phase: 'booking-created' | 'waiting-for-blik-transfer'
}

const rootDir = process.cwd()
const defaultControlPath = path.join(rootDir, 'qa-reports', 'live-blik-qa-control.json')

function readArg(name: string): string | null {
  const index = process.argv.indexOf(name)
  return index === -1 ? null : process.argv[index + 1] ?? null
}

function requireCreateFlag() {
  if (!process.argv.includes('--create')) {
    throw new Error('This script creates a real production booking. Run it only with --create.')
  }
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

async function submitBookingForm(page: Page) {
  await page.evaluate(() => {
    const form = document.querySelector('[data-booking-form="details"]') as HTMLFormElement | null
    const button = document.querySelector('[data-booking-submit="payment"]') as HTMLButtonElement | null

    if (!form || !button) throw new Error('Missing booking form or submit button.')
    form.requestSubmit(button)
  })
}

async function persistControl(controlPath: string, control: LiveBlikControl) {
  await mkdir(path.dirname(controlPath), { recursive: true })
  await writeFile(controlPath, `${JSON.stringify(control, null, 2)}\n`, 'utf8')
}

async function main() {
  requireCreateFlag()

  const baseUrl = (readArg('--url') ?? SITE_PRODUCTION_URL).replace(/\/+$/, '')
  const controlPath = path.resolve(readArg('--control-file') ?? defaultControlPath)
  const timestamp = getWarsawCompactTimestamp()
  const browser = await chromium.launch({
    headless: true,
    executablePath: await resolveBrowserExecutablePath(),
  })

  try {
    const context = await browser.newContext({ locale: 'pl-PL', viewport: { width: 1366, height: 1100 } })
    const page = await context.newPage()

    await page.goto(`${baseUrl}/book?problem=szczeniak&species=pies&service=szybka-konsultacja-15-min`, {
      waitUntil: 'domcontentloaded',
    })
    await page.getByRole('heading', { name: /Wybierz termin konsultacji/i }).waitFor({ timeout: 30000 })

    const firstSlot = page.locator('a.slot-link:visible, [data-selected-slot-link="true"]:visible, [data-nearest-slot-link="true"]:visible').first()
    await firstSlot.waitFor({ timeout: 30000 })
    const slotLabel = (await firstSlot.innerText()).replace(/\s+/g, ' ').trim()
    const slotHref = await firstSlot.getAttribute('href')
    assert.ok(slotHref, 'The selected slot did not expose a booking link.')
    await firstSlot.click()
    await page
      .waitForURL((url) => url.pathname === '/form', { timeout: 10000, waitUntil: 'domcontentloaded' })
      .catch(async () => {
        // The page shell sometimes absorbs the first click during hydration.
        // Follow the exact href rendered for that same slot rather than choosing
        // a slot through an API or changing the production booking state.
        await page.goto(new URL(slotHref, baseUrl).toString(), { waitUntil: 'domcontentloaded' })
      })

    await page.locator('[data-booking-form="details"]').waitFor({ timeout: 30000 })
    await page.locator('[data-booking-field="owner-name"]').fill(`Kontrola BLIK ${timestamp}`)
    await page.locator('[data-booking-field="email"]').fill(`qa-live-blik-${timestamp}@example.com`)
    await page.locator('[data-booking-field="description"]').fill(
      'Kontrolna rezerwacja produkcyjna do sprawdzenia pełnej ścieżki BLIK po ręcznym potwierdzeniu wpłaty.',
    )
    await page.locator('#booking-privacy').check()
    await page.locator('#booking-early-start').check()

    const bookingResponsePromise = page.waitForResponse(
      (response) => response.url().includes('/api/bookings') && response.request().method() === 'POST',
      { timeout: 45000 },
    )
    await submitBookingForm(page)
    const bookingResponse = await bookingResponsePromise
    assert.equal(bookingResponse.ok(), true, `POST /api/bookings returned ${bookingResponse.status()}`)

    await page.waitForURL((url) => url.pathname === '/payment' && url.searchParams.has('bookingId') && url.searchParams.has('access'), {
      timeout: 30000,
      waitUntil: 'domcontentloaded',
    })
    const paymentUrl = new URL(page.url())
    const bookingId = paymentUrl.searchParams.get('bookingId')
    const bookingAccessToken = paymentUrl.searchParams.get('access')
    assert.ok(bookingId, 'Payment URL did not include bookingId.')
    assert.ok(bookingAccessToken, 'Payment URL did not include the booking access token.')

    const control: LiveBlikControl = {
      createdAt: new Date().toISOString(),
      baseUrl,
      bookingId,
      bookingAccessToken,
      slotLabel,
      phase: 'booking-created',
    }
    await persistControl(controlPath, control)

    await page.locator('[data-payment-state="payment-selection"]').waitFor({ timeout: 30000 })
    const orderResponsePromise = page.waitForResponse(
      (response) => new URL(response.url()).pathname === '/api/orders' && response.request().method() === 'POST',
      { timeout: 45000 },
    )
    await page.locator('[data-payment-submit="manual"]').click()
    const orderResponse = await orderResponsePromise
    assert.equal(orderResponse.ok(), true, `POST /api/orders returned ${orderResponse.status()}`)

    await page.waitForURL((url) => url.pathname.startsWith('/platnosc/blik/'), { timeout: 30000, waitUntil: 'domcontentloaded' })
    const blikUrl = new URL(page.url())
    const orderNumber = blikUrl.pathname.split('/').pop() ?? ''
    const viewerToken = blikUrl.searchParams.get('viewer') ?? ''
    assert.ok(orderNumber, 'BLIK URL did not include an order number.')
    assert.ok(viewerToken, 'BLIK URL did not include a viewer capability.')
    await page.getByRole('heading', { name: /BLIK po instrukcji e-mail/i }).waitFor({ timeout: 30000 })

    const amount = (await page.locator('p.hero-text strong').first().innerText()).trim()
    const phone = (await page.locator('.summary-card').first().locator('.summary-value').innerText()).trim()
    const title = (await page.locator('.summary-card').nth(1).locator('.summary-value').innerText()).trim()
    assert.equal(title, orderNumber, 'The BLIK title does not match the order number.')

    const readyControl: LiveBlikControl = {
      ...control,
      orderNumber,
      viewerToken,
      amount,
      phone,
      phase: 'waiting-for-blik-transfer',
    }
    await persistControl(controlPath, readyControl)

    console.log(
      JSON.stringify(
        {
          status: 'waiting-for-blik-transfer',
          orderNumber,
          amount,
          phone,
          title,
          slotLabel,
          controlFile: path.relative(rootDir, controlPath).replace(/\\/g, '/'),
        },
        null,
        2,
      ),
    )
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
