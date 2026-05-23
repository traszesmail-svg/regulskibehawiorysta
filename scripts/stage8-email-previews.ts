import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { loadEnvConfig } from '@next/env'
import { chromium } from 'playwright-core'
import {
  sendBookingConfirmationEmail,
  sendBookingManualPaymentPendingEmail,
  sendBookingReservationCreatedEmail,
  sendBookingStatusOutcomeEmail,
  sendLeadMagnetDirectDownloadEmail,
  sendMaterialyCodeCustomerEmail,
  sendMaterialyOrderPendingCustomerEmail,
  type MaterialyOrderEmailPayload,
} from '@/lib/server/notifications'
import type { BookingRecord } from '@/lib/types'
import { resolveBrowserExecutablePath } from './lib/browser-path'

type CapturedEmail = {
  from?: string
  to?: string[]
  subject?: string
  html?: string
  text?: string
}

const rootDir = process.cwd()
const reportDir = path.join(rootDir, 'qa-reports', 'stage8-email-previews')
const forbiddenCustomerCopy = [
  /\bNIP\b/i,
  /\bCEIDG\b/i,
  /\bOlsztyn\b/i,
  /BLIK na telefon/i,
  /publiczny telefon/i,
  /telefon publiczny/i,
  /przedsi[eę]biorca/i,
  /\bfirma\b/i,
] as const

function safeFileName(value: string) {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 72)
}

function collectEmailCopy(email: CapturedEmail) {
  return [email.subject, email.html, email.text].filter((value): value is string => typeof value === 'string').join('\n')
}

function assertPublicSafeCopy(email: CapturedEmail) {
  const copy = collectEmailCopy(email)

  for (const pattern of forbiddenCustomerCopy) {
    assert.doesNotMatch(copy, pattern, `Forbidden customer email copy matched ${pattern}`)
  }
}

function makeBooking(overrides: Partial<BookingRecord> = {}): BookingRecord {
  return {
    id: 'stage8-booking-001',
    ownerName: 'Anna',
    serviceType: 'szybka-konsultacja-15-min',
    problemType: 'pies-reaktywnosc',
    animalType: 'Pies',
    petAge: '4 lata',
    durationNotes: 'Problem wraca od kilku tygodni.',
    description: 'Pies napina się na spacerze i trudno mu wrócić do odpoczynku po mijaniu innych psów.',
    phone: '',
    email: 'klient@example.com',
    bookingDate: '2030-01-15',
    bookingTime: '10:00',
    slotId: '2030-01-15-10:00',
    qaBooking: true,
    amount: 69,
    bookingStatus: 'pending',
    paymentStatus: 'unpaid',
    paymentMethod: null,
    paymentReference: 'B15-STAGE8',
    meetingUrl: 'https://regulskibehawiorysta.pl/call/stage8-booking-001',
    createdAt: '2030-01-01T10:00:00.000Z',
    updatedAt: '2030-01-01T10:00:00.000Z',
    paidAt: null,
    paymentReportedAt: null,
    paymentRejectedAt: null,
    paymentRejectedReason: null,
    cancelledAt: null,
    expiredAt: null,
    refundedAt: null,
    checkoutSessionId: null,
    paymentIntentId: null,
    payuOrderId: null,
    payuOrderStatus: null,
    customerPhoneNormalized: null,
    smsConfirmationStatus: null,
    smsConfirmationSentAt: null,
    smsProviderMessageId: null,
    smsErrorCode: null,
    smsErrorMessage: null,
    recommendedNextStep: null,
    reminderSent: false,
    prepVideoPath: null,
    prepVideoFilename: null,
    prepVideoSizeBytes: null,
    prepLinkUrl: null,
    prepNotes: null,
    prepUploadedAt: null,
    ...overrides,
  }
}

function makeMaterialyOrder(overrides: Partial<MaterialyOrderEmailPayload> = {}): MaterialyOrderEmailPayload {
  return {
    orderId: 'MAT-2305-001',
    productKind: 'guide',
    productSlug: 'pies-sam-w-domu',
    productTitle: 'Pies sam w domu: spokojny start',
    priceLabel: '49 zł',
    priceAmount: 49,
    customerName: 'Anna',
    customerEmail: 'klient@example.com',
    notes: null,
    ...overrides,
  }
}

async function captureCustomerEmails() {
  const captured: CapturedEmail[] = []
  const originalFetch = globalThis.fetch
  const previousEnv = new Map<string, string | undefined>()
  const env = {
    MAIL_PROVIDER: 'resend',
    RESEND_API_KEY: 're_stage8_preview',
    RESEND_FROM_EMAIL: 'Regulski Behawiorysta <kontakt@regulskibehawiorysta.pl>',
    CUSTOMER_EMAIL_MODE: 'auto',
    REGULSKI_CONTACT_EMAIL: 'kontakt@regulskibehawiorysta.pl',
    NEXT_PUBLIC_SITE_URL: 'https://regulskibehawiorysta.pl',
  }

  for (const [key, value] of Object.entries(env)) {
    previousEnv.set(key, process.env[key])
    process.env[key] = value
  }

  ;(globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    const payload = typeof init?.body === 'string' ? JSON.parse(init.body) : {}
    captured.push(payload)
    return new Response('{}', {
      status: 200,
      headers: {
        'content-type': 'application/json',
      },
    })
  }) as typeof fetch

  try {
    const baseBooking = makeBooking()

    await sendBookingReservationCreatedEmail(baseBooking, 'stage8-access-token')
    await sendBookingManualPaymentPendingEmail(
      makeBooking({
        bookingStatus: 'pending_manual_payment',
        paymentStatus: 'pending_manual_review',
        paymentReportedAt: '2030-01-01T10:05:00.000Z',
      }),
      'stage8-access-token',
    )
    await sendBookingConfirmationEmail(
      makeBooking({
        bookingStatus: 'confirmed',
        paymentStatus: 'paid',
        paidAt: '2030-01-01T10:10:00.000Z',
      }),
    )
    await sendBookingStatusOutcomeEmail(
      makeBooking({
        bookingStatus: 'cancelled',
        paymentStatus: 'rejected',
        paymentRejectedAt: '2030-01-01T10:12:00.000Z',
        paymentRejectedReason: 'Brak potwierdzenia wpłaty.',
      }),
    )
    await sendMaterialyOrderPendingCustomerEmail(makeMaterialyOrder())
    await sendMaterialyCodeCustomerEmail(makeMaterialyOrder(), '123456', '2030-01-20T12:00:00.000Z')
    await sendLeadMagnetDirectDownloadEmail({
      email: 'klient@example.com',
      title: '30 sygnałów, które warto zauważyć',
      downloadUrl: 'https://regulskibehawiorysta.pl/poradniki/30-zachowan.pdf',
    })
  } finally {
    ;(globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = originalFetch

    for (const [key, value] of previousEnv.entries()) {
      if (typeof value === 'string') {
        process.env[key] = value
      } else {
        delete process.env[key]
      }
    }
  }

  assert.equal(captured.length, 7, 'Expected seven customer email previews.')
  captured.forEach(assertPublicSafeCopy)

  return captured
}

function renderPreviewDocument(email: CapturedEmail) {
  return `<!doctype html>
<html lang="pl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${email.subject ?? 'Email preview'}</title>
    <style>
      html, body { margin: 0; background: #ece5d8; font-family: Arial, Helvetica, sans-serif; }
      .preview-meta { max-width: 680px; margin: 0 auto; padding: 18px 14px 0; color: #4d443b; font-size: 13px; line-height: 1.45; }
      .preview-meta strong { color: #1f1a17; }
    </style>
  </head>
  <body>
    <div class="preview-meta">
      <div><strong>Temat:</strong> ${email.subject ?? '-'}</div>
      <div><strong>Do:</strong> ${email.to?.join(', ') ?? '-'}</div>
    </div>
    ${email.html ?? ''}
  </body>
</html>`
}

async function run() {
  loadEnvConfig(rootDir)
  await mkdir(reportDir, { recursive: true })

  const emails = await captureCustomerEmails()
  const browser = await chromium.launch({
    executablePath: await resolveBrowserExecutablePath(),
    headless: true,
  })

  const reportLines = ['# Stage 8 Email Preview', '', `Generated: ${new Date().toISOString()}`, '', '## Screenshots']

  try {
    const page = await browser.newPage()
    const issues: string[] = []

    page.on('console', (message) => {
      if (message.type() === 'error') {
        issues.push(message.text())
      }
    })

    page.on('pageerror', (error) => {
      issues.push(error.message)
    })

    for (const [index, email] of emails.entries()) {
      const baseName = `${String(index + 1).padStart(2, '0')}-${safeFileName(email.subject ?? 'email')}`
      const htmlPath = path.join(reportDir, `${baseName}.html`)
      const desktopPath = path.join(reportDir, `${baseName}-desktop.png`)
      const mobilePath = path.join(reportDir, `${baseName}-mobile.png`)
      const html = renderPreviewDocument(email)

      await writeFile(htmlPath, html, 'utf8')

      await page.setViewportSize({ width: 760, height: 980 })
      await page.setContent(html, { waitUntil: 'domcontentloaded' })
      const desktopScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
      assert.ok(desktopScrollWidth <= 768, `${baseName} overflows desktop preview width (${desktopScrollWidth}px).`)
      await page.screenshot({ path: desktopPath, fullPage: true })

      await page.setViewportSize({ width: 390, height: 844 })
      await page.setContent(html, { waitUntil: 'domcontentloaded' })
      const mobileScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
      assert.ok(mobileScrollWidth <= 398, `${baseName} overflows mobile preview width (${mobileScrollWidth}px).`)
      await page.screenshot({ path: mobilePath, fullPage: true })

      reportLines.push(`- ${email.subject ?? 'Email'}: [HTML](./${path.basename(htmlPath)}), [desktop](./${path.basename(desktopPath)}), [mobile](./${path.basename(mobilePath)})`)
    }

    if (issues.length > 0) {
      throw new Error(`Email preview browser issues:\n${issues.join('\n')}`)
    }

    reportLines.push('', '## Checks', '- Customer email HTML rendered at 760px and 390px.', '- No forbidden public copy matched in captured customer emails.')
    await writeFile(path.join(reportDir, 'report.md'), `${reportLines.join('\n')}\n`, 'utf8')
  } finally {
    await browser.close().catch(() => {})
  }

  console.log(
    JSON.stringify(
      {
        emails: emails.length,
        report: path.join(reportDir, 'report.md'),
      },
      null,
      2,
    ),
  )
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
