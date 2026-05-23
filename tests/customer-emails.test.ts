import assert from 'node:assert/strict'
import { test } from 'node:test'
import { POST as postContactLead } from '@/app/api/contact/route'
import {
  createAvailabilitySlot,
  createPendingBooking,
  markBookingManualPaymentPending,
  markBookingManualPaymentRejected,
  markBookingPaid,
  markBookingPaymentFailed,
} from '@/lib/server/local-store'
import { reportManualPayment } from '@/lib/server/manual-payments'
import { getCustomerEmailDeliveryStatus } from '@/lib/server/notifications'
import { createLocalDataSandbox } from '@/scripts/lib/local-data-sandbox'

type ResendEmailPayload = {
  from?: string
  to?: string[]
  subject?: string
  html?: string
  text?: string
  reply_to?: string
  attachments?: unknown[]
}

const EXPECTED_RESEND_FROM = 'Regulski Behawiorysta <kontakt@regulskibehawiorysta.pl>'

function withEnv(
  overrides: Record<string, string | null | undefined>,
  run: () => void | Promise<void>,
) {
  const previous = new Map<string, string | undefined>()
  const restore = () => {
    for (const [key, value] of previous.entries()) {
      if (typeof value === 'string') {
        process.env[key] = value
      } else {
        delete process.env[key]
      }
    }
  }

  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, process.env[key])

    if (typeof value === 'string') {
      process.env[key] = value
    } else {
      delete process.env[key]
    }
  }

  const result = run()

  if (result && typeof (result as Promise<void>).then === 'function') {
    return (result as Promise<void>).finally(restore)
  }

  restore()
}

function normalize(value: string) {
  return value.normalize('NFKD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g, ' ').trim().toLowerCase()
}

function includesNormalized(value: string | undefined, expected: string) {
  return typeof value === 'string' && normalize(value).includes(normalize(expected))
}

function makeBookingForm(slotId: string) {
  return {
    ownerName: 'Testowy Klient',
    serviceType: 'szybka-konsultacja-15-min' as const,
    problemType: 'kot-stres' as const,
    animalType: 'Kot' as const,
    petAge: '3 lata',
    durationNotes: 'Szybki test dostarczenia maili',
    description: 'Sprawdzam customer emails na stage 5.',
    email: 'klient@example.com',
    slotId,
    qaBooking: true,
  }
}

function makeContactLeadPayload() {
  return {
    name: 'Anna Nowak',
    contact: 'klient@example.com',
    species: 'kot',
    topicId: 'kot-wycofanie',
    topic: 'Wycofanie / napiecie',
    contextLabel: 'Kot - Wycofanie / napiecie',
    message: 'Potrzebuje pomocy z kotem i chce ustalic prosty start. Temat wraca od kilku tygodni i nie wiem, od czego zaczac.',
    bookingId: 'booking-123',
    website: '',
    consentProcessing: true,
    consentPolicy: true,
  }
}

test('customer emails cover reservation, review, confirmation and cancel outcomes', async () => {
  const sentEmails: ResendEmailPayload[] = []
  const originalFetch = globalThis.fetch
  const sandbox = await createLocalDataSandbox('customer-emails', process.cwd())

  try {
    const mockFetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {}
      sentEmails.push(body)
      return new Response('{}', {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      })
    }

    ;(globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = mockFetch as typeof fetch

    await withEnv(
      {
        MAIL_PROVIDER: 'resend',
        RESEND_API_KEY: 're_test_key',
        RESEND_FROM_EMAIL: EXPECTED_RESEND_FROM,
        CUSTOMER_EMAIL_MODE: 'auto',
        MANUAL_PAYMENT_BLIK_PHONE: '500600700',
        MANUAL_PAYMENT_REVIEW_SECRET: 'test-review-secret',
        REGULSKI_CONTACT_EMAIL: 'kontakt@regulskibehawiorysta.pl',
      },
      async () => {
        const bookingDate = '2030-01-15'

        await createAvailabilitySlot(bookingDate, '10:00')
        await createAvailabilitySlot(bookingDate, '10:30')
        await createAvailabilitySlot(bookingDate, '11:00')

        const bookingA = await createPendingBooking(makeBookingForm(`${bookingDate}-10:00`))
        assert.equal(sentEmails.length, 1)
        assert.equal(bookingA.booking.bookingStatus, 'pending')
        assert.equal(bookingA.booking.paymentStatus, 'unpaid')
        assert.equal(sentEmails[0].to?.[0], 'klient@example.com')
        assert.equal(sentEmails[0].from, EXPECTED_RESEND_FROM)
        assert.equal(includesNormalized(sentEmails[0].subject, 'Regulski Behawiorysta'), true)
        assert.match(sentEmails[0].html ?? '', /data-email-shell="regulski"/)
        assert.match(sentEmails[0].html ?? '', /data-email-facts="reservation"/)
        assert.match(sentEmails[0].html ?? '', /data-email-button="primary"/)
        assert.match(sentEmails[0].text ?? '', new RegExp(`Strona rezerwacji: .*\\/payment\\?bookingId=${bookingA.booking.id}`))
        assert.match(sentEmails[0].text ?? '', /access=/)

        const manualReport = await reportManualPayment(bookingA.booking.id, bookingA.accessToken)
        const reviewBooking = manualReport.booking
        assert.equal(reviewBooking?.bookingStatus, 'pending_manual_payment')
        assert.equal(reviewBooking?.paymentStatus, 'pending_manual_review')
        assert.equal(manualReport.adminNotification.status, 'sent')
        assert.equal(sentEmails.length, 3)
        assert.equal(includesNormalized(sentEmails[1].subject, 'Regulski Behawiorysta'), true)
        assert.match(sentEmails[1].text ?? '', new RegExp(`Strona rezerwacji: .*\\/confirmation\\?bookingId=${bookingA.booking.id}`))
        assert.match(sentEmails[1].text ?? '', /access=/)
        assert.equal(sentEmails[2].to?.[0], 'kontakt@regulskibehawiorysta.pl')
        assert.match(sentEmails[2].html ?? '', /data-email-facts="manual-payment-review"/)
        assert.match(sentEmails[2].html ?? '', /data-email-button="danger"/)
        assert.match(sentEmails[2].html ?? '', /data-email-button="secondary"/)
        assert.doesNotMatch(sentEmails[2].html ?? '', /display:flex/)
        assert.match(sentEmails[2].text ?? '', /Jest wpłata:/)
        assert.match(sentEmails[2].text ?? '', /Nie ma wpłaty:/)
        assert.match(sentEmails[2].text ?? '', /Tytuł płatności: B15-/)

        const reviewBookingRepeat = await markBookingManualPaymentPending(bookingA.booking.id, {
          paymentReference: reviewBooking.paymentReference,
          customerAccessToken: bookingA.accessToken,
        })
        assert.equal(reviewBookingRepeat?.paymentStatus, 'pending_manual_review')
        assert.equal(sentEmails.length, 3)

        const paidBooking = await markBookingPaid(bookingA.booking.id, {
          paymentMethod: 'manual',
          paymentReference: reviewBooking.paymentReference,
        })
        assert.equal(paidBooking?.bookingStatus, 'confirmed')
        assert.equal(paidBooking?.paymentStatus, 'paid')
        assert.equal(sentEmails.length, 5)
        assert.equal(includesNormalized(sentEmails[3].subject, 'Regulski Behawiorysta'), true)
        assert.match(sentEmails[3].html ?? '', /data-email-facts="confirmation"/)
        assert.match(sentEmails[3].text ?? '', /Twoja konsultacja Regulski Behawiorysta została potwierdzona\./)
        assert.match(sentEmails[3].text ?? '', /Link do rozmowy:/)
        assert.equal(sentEmails[4].to?.[0], 'kontakt@regulskibehawiorysta.pl')
        assert.match(sentEmails[4].html ?? '', /data-email-facts="owner-confirmed"/)
        assert.match(sentEmails[4].html ?? '', /data-email-panel="Opis zgłoszenia"/)
        assert.match(sentEmails[4].text ?? '', /Konsultacja opłacona i potwierdzona\./)
        assert.equal(Array.isArray(sentEmails[4].attachments), true)

        const bookingB = await createPendingBooking(makeBookingForm(`${bookingDate}-10:30`))
        assert.equal(sentEmails.length, 6)
        assert.equal(includesNormalized(sentEmails[5].subject, 'Regulski Behawiorysta'), true)

        const rejectedBooking = await markBookingManualPaymentRejected(bookingB.booking.id, 'Brak potwierdzenia wplaty')
        assert.equal(rejectedBooking?.bookingStatus, 'cancelled')
        assert.equal(rejectedBooking?.paymentStatus, 'rejected')
        assert.equal(sentEmails.length, 7)
        assert.equal(includesNormalized(sentEmails[6].subject, 'Regulski Behawiorysta'), true)
        assert.equal(includesNormalized(sentEmails[6].text, 'Brak potwierdzenia wplaty'), true)

        const rejectedRepeat = await markBookingManualPaymentRejected(bookingB.booking.id, 'Brak potwierdzenia wplaty')
        assert.equal(rejectedRepeat?.paymentStatus, 'rejected')
        assert.equal(sentEmails.length, 7)

        const bookingC = await createPendingBooking(makeBookingForm(`${bookingDate}-11:00`))
        assert.equal(sentEmails.length, 8)
        assert.equal(includesNormalized(sentEmails[7].subject, 'Regulski Behawiorysta'), true)

        const failedBooking = await markBookingPaymentFailed(bookingC.booking.id)
        assert.equal(failedBooking?.bookingStatus, 'cancelled')
        assert.equal(failedBooking?.paymentStatus, 'failed')
        assert.equal(sentEmails.length, 9)
        assert.equal(includesNormalized(sentEmails[8].subject, 'Regulski Behawiorysta'), true)
      },
    )
  } finally {
    ;(globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = originalFetch
    await sandbox.cleanup()
  }
})

test('customer emails stay on the confirmation page when disabled', async () => {
  const sentEmails: ResendEmailPayload[] = []
  const originalFetch = globalThis.fetch
  const sandbox = await createLocalDataSandbox('customer-emails-disabled', process.cwd())

  try {
    const mockFetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {}
      sentEmails.push(body)
      return new Response('{}', {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      })
    }

    ;(globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = mockFetch as typeof fetch

    await withEnv(
      {
        MAIL_PROVIDER: 'resend',
        RESEND_API_KEY: 're_test_key',
        RESEND_FROM_EMAIL: EXPECTED_RESEND_FROM,
        CUSTOMER_EMAIL_MODE: 'disabled',
        MANUAL_PAYMENT_BLIK_PHONE: '500600700',
        MANUAL_PAYMENT_REVIEW_SECRET: 'test-review-secret',
        REGULSKI_CONTACT_EMAIL: 'kontakt@regulskibehawiorysta.pl',
      },
      async () => {
        const bookingDate = '2030-01-16'

        await createAvailabilitySlot(bookingDate, '11:00')

        const booking = await createPendingBooking(makeBookingForm(`${bookingDate}-11:00`))
        const status = getCustomerEmailDeliveryStatus(booking.booking.email)

        assert.equal(status.state, 'disabled')
        assert.equal(includesNormalized(status.summary, 'maile klienta'), true)
        assert.match(status.nextStep, /CUSTOMER_EMAIL_MODE=auto/i)
        assert.equal(sentEmails.length, 0)

        const manualReport = await reportManualPayment(booking.booking.id, booking.accessToken)
        const pendingBooking = manualReport.booking

        assert.equal(pendingBooking?.bookingStatus, 'pending_manual_payment')
        assert.equal(pendingBooking?.paymentStatus, 'pending_manual_review')
        assert.equal(manualReport.adminNotification.status, 'sent')
        assert.equal(sentEmails.length, 1)
        assert.equal(sentEmails[0].to?.[0], 'kontakt@regulskibehawiorysta.pl')
        assert.match(sentEmails[0].text ?? '', /Jest wpłata:/)
        assert.match(sentEmails[0].text ?? '', /Nie ma wpłaty:/)

        const paidBooking = await markBookingPaid(booking.booking.id, {
          paymentMethod: 'manual',
          paymentReference: pendingBooking.paymentReference,
        })

        assert.equal(paidBooking?.bookingStatus, 'confirmed')
        assert.equal(paidBooking?.paymentStatus, 'paid')
        assert.equal(sentEmails.length, 2)
        assert.equal(sentEmails[1].to?.[0], 'kontakt@regulskibehawiorysta.pl')
        assert.match(sentEmails[1].text ?? '', /Konsultacja opłacona i potwierdzona\./)
      },
    )
  } finally {
    ;(globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = originalFetch
    await sandbox.cleanup()
  }
})

test('contact route sends leads to the public inbox and replies to the sender', async () => {
  const sentEmails: ResendEmailPayload[] = []
  const originalFetch = globalThis.fetch

  try {
    const mockFetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {}
      sentEmails.push(body)
      return new Response('{}', {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      })
    }

    ;(globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = mockFetch as typeof fetch

    await withEnv(
      {
        MAIL_PROVIDER: 'resend',
        RESEND_API_KEY: 're_test_key',
        RESEND_FROM_EMAIL: EXPECTED_RESEND_FROM,
        REGULSKI_CONTACT_EMAIL: 'kontakt@regulskibehawiorysta.pl',
      },
      async () => {
        const response = await postContactLead(
          new Request('https://example.test/api/contact', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-forwarded-for': '203.0.113.10',
            },
            body: JSON.stringify(makeContactLeadPayload()),
          }),
        )

        const payload = (await response.json()) as { ok?: boolean; message?: string; error?: string }

        assert.equal(response.status, 200)
        assert.equal(payload.ok, true)
        assert.match(payload.message ?? '', /Odpowiem na podany adres e-mail/i)
        assert.equal(sentEmails.length, 2)
        assert.equal(sentEmails[0].to?.[0], 'kontakt@regulskibehawiorysta.pl')
        assert.equal(sentEmails[0].from, EXPECTED_RESEND_FROM)
        assert.equal(sentEmails[0].reply_to, 'klient@example.com')
        assert.match(sentEmails[0].subject ?? '', /Kontakt - .*Anna Nowak/)
        assert.match(sentEmails[0].html ?? '', /data-email-facts="contact"/)
        assert.match(sentEmails[0].html ?? '', /data-email-panel="Wiadomość"/)
        assert.match(sentEmails[0].text ?? '', /Kontekst:/)
        assert.match(sentEmails[0].text ?? '', /Numer rezerwacji: booking-123/)
        assert.equal(sentEmails[1].to?.[0], 'klient@example.com')
        assert.equal(sentEmails[1].from, EXPECTED_RESEND_FROM)
        assert.match(sentEmails[1].html ?? '', /data-email-facts="contact-reply"/)
        assert.match(sentEmails[1].html ?? '', /data-email-button="primary"/)
        assert.match(sentEmails[1].subject ?? '', /Dostałem Twoją wiadomość/i)
        assert.match(sentEmails[1].text ?? '', /1-2 dni roboczych/i)
      },
    )
  } finally {
    ;(globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = originalFetch
  }
})

test('contact route accepts browser form posts and redirects back to contact form', async () => {
  const sentEmails: ResendEmailPayload[] = []
  const originalFetch = globalThis.fetch

  try {
    const mockFetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {}
      sentEmails.push(body)
      return new Response('{}', {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      })
    }

    ;(globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = mockFetch as typeof fetch

    await withEnv(
      {
        MAIL_PROVIDER: 'resend',
        RESEND_API_KEY: 're_test_key',
        RESEND_FROM_EMAIL: EXPECTED_RESEND_FROM,
        REGULSKI_CONTACT_EMAIL: 'kontakt@regulskibehawiorysta.pl',
      },
      async () => {
        const body = new URLSearchParams({
          name: 'Anna Nowak',
          contact: 'klient@example.com',
          species: 'pies',
          topicId: 'inne',
          topic: 'Wiadomość z formularza kontaktowego',
          message:
            'Potrzebuje pomocy z psem i chce ustalic prosty start. Temat wraca od kilku tygodni i nie wiem, od czego zaczac.',
          consentProcessing: 'on',
          consentPolicy: 'on',
        })

        const response = await postContactLead(
          new Request('https://example.test/api/contact', {
            method: 'POST',
            headers: {
              'content-type': 'application/x-www-form-urlencoded',
              'x-forwarded-for': '203.0.113.13',
            },
            body,
          }),
        )

        assert.equal(response.status, 303)
        assert.match(response.headers.get('location') ?? '', /\/kontakt\?sent=1#formularz$/)
        assert.equal(sentEmails.length, 2)
        assert.equal(sentEmails[0].to?.[0], 'kontakt@regulskibehawiorysta.pl')
        assert.equal(sentEmails[1].to?.[0], 'klient@example.com')
      },
    )
  } finally {
    ;(globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = originalFetch
  }
})

test('contact route silently accepts honeypot submissions without sending emails', async () => {
  const sentEmails: ResendEmailPayload[] = []
  const originalFetch = globalThis.fetch

  try {
    const mockFetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {}
      sentEmails.push(body)
      return new Response('{}', {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      })
    }

    ;(globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = mockFetch as typeof fetch

    await withEnv(
      {
        MAIL_PROVIDER: 'resend',
        RESEND_API_KEY: 're_test_key',
        RESEND_FROM_EMAIL: EXPECTED_RESEND_FROM,
        REGULSKI_CONTACT_EMAIL: 'kontakt@regulskibehawiorysta.pl',
      },
      async () => {
        const response = await postContactLead(
          new Request('https://example.test/api/contact', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-forwarded-for': '203.0.113.11',
            },
            body: JSON.stringify({
              ...makeContactLeadPayload(),
              website: 'https://spam.example',
            }),
          }),
        )

        const payload = (await response.json()) as { ok?: boolean; message?: string }

        assert.equal(response.status, 200)
        assert.equal(payload.ok, true)
        assert.equal(sentEmails.length, 0)
      },
    )
  } finally {
    ;(globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = originalFetch
  }
})

test('contact route rate limits repeated submissions from the same IP', async () => {
  const sentEmails: ResendEmailPayload[] = []
  const originalFetch = globalThis.fetch

  try {
    const mockFetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {}
      sentEmails.push(body)
      return new Response('{}', {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      })
    }

    ;(globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = mockFetch as typeof fetch

    await withEnv(
      {
        MAIL_PROVIDER: 'resend',
        RESEND_API_KEY: 're_test_key',
        RESEND_FROM_EMAIL: EXPECTED_RESEND_FROM,
        REGULSKI_CONTACT_EMAIL: 'kontakt@regulskibehawiorysta.pl',
      },
      async () => {
        for (let attempt = 0; attempt < 3; attempt += 1) {
          const response = await postContactLead(
            new Request('https://example.test/api/contact', {
              method: 'POST',
              headers: {
                'content-type': 'application/json',
                'x-forwarded-for': '203.0.113.12',
              },
              body: JSON.stringify(makeContactLeadPayload()),
            }),
          )

          assert.equal(response.status, 200)
        }

        const blockedResponse = await postContactLead(
          new Request('https://example.test/api/contact', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-forwarded-for': '203.0.113.12',
            },
            body: JSON.stringify(makeContactLeadPayload()),
          }),
        )

        const blockedPayload = (await blockedResponse.json()) as { error?: string }

        assert.equal(blockedResponse.status, 429)
        assert.match(blockedPayload.error ?? '', /Za dużo prób/i)
        assert.equal(sentEmails.length, 6)
      },
    )
  } finally {
    ;(globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = originalFetch
  }
})
