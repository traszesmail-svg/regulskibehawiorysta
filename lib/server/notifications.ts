import nodemailer from 'nodemailer'
import type { LeadMagnet } from '@/lib/growth-layer'
import { getBookingServiceTitle, resolveBookingServiceType } from '@/lib/booking-services'
import { repairCopy } from '@/lib/copy'
import { formatDateTimeLabel, getProblemLabel } from '@/lib/data'
import { formatPricePln } from '@/lib/pricing'
import { getContactDetails, getPublicContactDetails } from '@/lib/site'
import { getBaseUrl } from '@/lib/server/env'
import { generateConfirmToken } from '@/lib/admin-confirm-token'
import { getManualPaymentConfig } from '@/lib/server/payment-options'
import { buildGoogleCalendarIcs, buildGoogleCalendarUrl } from '@/lib/server/google-calendar'
import { getPrepGuideUrl } from '@/lib/server/prep-guide'
import { BookingRecord } from '@/lib/types'
import type { CommerceOrder } from '@/lib/commerce'

const EMAIL_BRAND_NAME = 'Regulski Behawiorysta'
const DEFAULT_RESEND_FROM_EMAIL = `${EMAIL_BRAND_NAME} <kontakt@regulskibehawiorysta.pl>`
const DEFAULT_MAIL_PROVIDER = 'resend'

export type EmailAttachment = {
  filename: string
  content: string
  contentType?: string
  encoding?: 'utf8' | 'base64'
}

type SendEmailPayload = {
  to: string
  subject: string
  html: string
  text: string
  replyTo?: string
  attachments?: EmailAttachment[]
}

type DeliveryResult = {
  status: 'sent' | 'skipped' | 'failed'
  reason?: string
}

type EmailAudience = 'customer' | 'internal'

export type CustomerEmailDeliveryState = 'ready' | 'disabled' | 'blocked'

export type CustomerEmailDeliveryStatus = {
  state: CustomerEmailDeliveryState
  mode: 'auto' | 'disabled' | 'invalid'
  issue: string | null
  summary: string
  nextStep: string
}

type MailProvider = 'resend' | 'gmail'

type MailProviderConfig =
  | {
      provider: 'resend'
      apiKey: string | null
      from: string
      configuredFrom: string | null
      configuredFromStatus: 'missing' | 'invalid' | 'valid'
    }
  | {
      provider: 'gmail'
      smtpUser: string | null
      smtpAppPassword: string | null
      from: string | null
      fromStatus: 'missing' | 'invalid' | 'valid'
    }

let gmailTransport: nodemailer.Transporter | null = null

type ManualPaymentReviewLinks = {
  approveUrl: string
  rejectUrl: string
}

export type TestimonialSubmission = {
  displayName: string
  email: string
  issueCategory: string
  opinion: string
  beforeAfter: string
  photoUrl: string
}

function getResendConfig(): Extract<MailProviderConfig, { provider: 'resend' }> {
  const apiKey = process.env.RESEND_API_KEY?.trim() || null
  const configuredFrom = process.env.RESEND_FROM_EMAIL?.trim() || null
  const configuredFromStatus: 'missing' | 'invalid' | 'valid' = !configuredFrom
    ? 'missing'
    : isValidResendFrom(configuredFrom)
      ? 'valid'
      : 'invalid'
  const from: string =
    configuredFromStatus === 'valid' ? configuredFrom ?? DEFAULT_RESEND_FROM_EMAIL : DEFAULT_RESEND_FROM_EMAIL

  return {
    provider: 'resend' as const,
    apiKey,
    from,
    configuredFrom,
    configuredFromStatus,
  }
}

function getMailProvider(): MailProvider | 'invalid' {
  const raw = process.env.MAIL_PROVIDER?.trim().toLowerCase() || DEFAULT_MAIL_PROVIDER

  if (raw === 'resend' || raw === 'gmail') {
    return raw
  }

  return 'invalid'
}

function getGmailConfig(): MailProviderConfig {
  const smtpUser = process.env.GMAIL_SMTP_USER?.trim() || null
  const smtpAppPassword = process.env.GMAIL_SMTP_APP_PASSWORD?.trim() || null
  const configuredFrom = process.env.GMAIL_FROM_EMAIL?.trim() || smtpUser
  const fromStatus = !configuredFrom ? 'missing' : isValidPublicEmail(configuredFrom) ? 'valid' : 'invalid'

  return {
    provider: 'gmail',
    smtpUser,
    smtpAppPassword,
    from: fromStatus === 'valid' ? configuredFrom : null,
    fromStatus,
  }
}

function getMailProviderConfig(): MailProviderConfig | { provider: 'invalid' } {
  const provider = getMailProvider()

  if (provider === 'invalid') {
    return { provider }
  }

  return provider === 'gmail' ? getGmailConfig() : getResendConfig()
}

function getCustomerEmailModeConfig(): { mode: 'auto' | 'disabled' | 'invalid'; raw: string | null } {
  const raw = process.env.CUSTOMER_EMAIL_MODE?.trim().toLowerCase() || null

  if (!raw || raw === 'auto') {
    return {
      mode: 'auto',
      raw,
    }
  }

  if (raw === 'disabled') {
    return {
      mode: 'disabled',
      raw,
    }
  }

  return {
    mode: 'invalid',
    raw,
  }
}

function isValidPublicEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function isValidResendFrom(value: string | null): value is string {
  if (!value) {
    return false
  }

  const match = value.match(/<([^>]+)>/)
  const candidate = match?.[1]?.trim() ?? value.trim()

  return isValidPublicEmail(candidate)
}

function extractEmailAddress(value: string): string {
  const match = value.match(/<([^>]+)>/)
  return (match?.[1]?.trim() ?? value.trim()).toLowerCase()
}

function isResendTestingSender(value: string): boolean {
  return extractEmailAddress(value).endsWith('@resend.dev')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatMultilineHtml(value: string): string {
  return escapeHtml(value).replace(/\n/g, '<br />')
}

function getNotificationRecipientEmail(): string | null {
  return getContactDetails().email
}

function getAdminNotificationRecipientEmail(): string | null {
  return process.env.ADMIN_NOTIFICATION_EMAIL?.trim() || getNotificationRecipientEmail()
}

export function getTestimonialSubmissionConfigIssue(): string | null {
  const mail = getMailProviderConfig()

  if (mail.provider === 'invalid') {
    return 'MAIL_PROVIDER invalid'
  }

  if (mail.provider === 'resend') {
    if (!mail.apiKey) {
      return 'RESEND_API_KEY missing'
    }

    if (mail.configuredFromStatus !== 'valid') {
      return 'RESEND_FROM_EMAIL missing or invalid'
    }
  } else {
    if (!mail.smtpUser) {
      return 'GMAIL_SMTP_USER missing'
    }

    if (!mail.smtpAppPassword) {
      return 'GMAIL_SMTP_APP_PASSWORD missing'
    }

    if (mail.fromStatus !== 'valid') {
      return 'GMAIL_FROM_EMAIL missing or invalid'
    }
  }

  if (!getNotificationRecipientEmail()) {
    return 'public contact email missing or invalid'
  }

  return null
}

function repairCustomerEmailDeliveryStatus(status: CustomerEmailDeliveryStatus): CustomerEmailDeliveryStatus {
  return {
    ...status,
    issue: status.issue ? repairCopy(status.issue) : null,
    summary: repairCopy(status.summary),
    nextStep: repairCopy(status.nextStep),
  }
}

export function getCustomerEmailDeliveryStatus(recipientEmail?: string | null): CustomerEmailDeliveryStatus {
  const modeConfig = getCustomerEmailModeConfig()
  const mail = getMailProviderConfig()

  const status = (() => {
    if (modeConfig.mode === 'invalid') {
      return {
        state: 'blocked',
        mode: 'invalid',
        issue: `CUSTOMER_EMAIL_MODE has invalid value "${modeConfig.raw}".`,
        summary: 'Tryb maili klienta jest zablokowany, bo CUSTOMER_EMAIL_MODE ma nieprawidłową wartość.',
        nextStep: 'Ustaw CUSTOMER_EMAIL_MODE=auto albo CUSTOMER_EMAIL_MODE=disabled.',
      }
    }

    if (modeConfig.mode === 'disabled') {
      return {
        state: 'disabled',
        mode: 'disabled',
        issue: 'CUSTOMER_EMAIL_MODE=disabled',
        summary:
          'Maile klienta są świadomie wyłączone. Status płatności, materiały i link do rozmowy pozostają na stronie potwierdzenia rezerwacji.',
        nextStep:
          'Zostaw ten tryb tymczasowo albo po weryfikacji domeny nadawcy przełącz CUSTOMER_EMAIL_MODE=auto i ustaw RESEND_FROM_EMAIL na zweryfikowany adres.',
      }
    }

    if (mail.provider === 'invalid') {
      return {
        state: 'blocked',
        mode: 'auto',
        issue: 'MAIL_PROVIDER invalid',
        summary: 'Wysyłka maili do klientów jest zablokowana, bo MAIL_PROVIDER ma nieprawidłową wartość.',
        nextStep: 'Ustaw MAIL_PROVIDER=resend albo MAIL_PROVIDER=gmail.',
      }
    }

    if (mail.provider === 'gmail') {
      if (!mail.smtpUser) {
        return {
          state: 'blocked',
          mode: 'auto',
          issue: 'GMAIL_SMTP_USER missing',
          summary: 'Wysyłka maili do klientów jest zablokowana, bo brakuje GMAIL_SMTP_USER.',
          nextStep: 'Ustaw GMAIL_SMTP_USER i powtórz próbę wysyłki.',
        }
      }

      if (!mail.smtpAppPassword) {
        return {
          state: 'blocked',
          mode: 'auto',
          issue: 'GMAIL_SMTP_APP_PASSWORD missing',
          summary: 'Wysyłka maili do klientów jest zablokowana, bo brakuje GMAIL_SMTP_APP_PASSWORD.',
          nextStep: 'Wygeneruj Gmail App Password i ustaw GMAIL_SMTP_APP_PASSWORD.',
        }
      }

      if (mail.fromStatus !== 'valid' || !mail.from) {
        return {
          state: 'blocked',
          mode: 'auto',
          issue: 'GMAIL_FROM_EMAIL missing or invalid',
          summary: 'Wysyłka maili do klientów jest zablokowana, bo GMAIL_FROM_EMAIL jest pusty albo nieprawidłowy.',
          nextStep: 'Ustaw poprawny adres nadawcy w GMAIL_FROM_EMAIL albo użyj poprawnego GMAIL_SMTP_USER.',
        }
      }

      return {
        state: 'ready',
        mode: 'auto',
        issue: null,
        summary: 'Wysyłka maili do klientów zewnętrznych jest gotowa z aktualnej konfiguracji Gmail SMTP.',
        nextStep: 'Brak blokera po stronie konfiguracji maili klienta.',
      }
    }

    if (!mail.apiKey) {
      return {
        state: 'blocked',
        mode: 'auto',
        issue: 'RESEND_API_KEY missing',
        summary: 'Wysyłka maili do klientów jest zablokowana, bo brakuje RESEND_API_KEY.',
        nextStep: 'Uzupełnij RESEND_API_KEY i powtórz próbę wysyłki na zewnętrzny adres testowy.',
      }
    }

    if (mail.configuredFromStatus === 'invalid') {
      return {
        state: 'blocked',
        mode: 'auto',
        issue: 'RESEND_FROM_EMAIL missing or invalid',
        summary: 'Wysyłka maili do klientów jest zablokowana, bo RESEND_FROM_EMAIL jest pusty albo nieprawidłowy.',
        nextStep: 'Ustaw poprawny adres nadawcy w RESEND_FROM_EMAIL.',
      }
    }

    if (!isValidResendFrom(mail.from)) {
      return {
        state: 'blocked',
        mode: 'auto',
        issue: 'RESEND_FROM_EMAIL missing or invalid',
        summary: 'Wysyłka maili do klientów jest zablokowana, bo RESEND_FROM_EMAIL jest pusty albo nieprawidłowy.',
        nextStep: 'Ustaw poprawny adres nadawcy w RESEND_FROM_EMAIL.',
      }
    }

    if (!isResendTestingSender(mail.from)) {
      return {
        state: 'ready',
        mode: 'auto',
        issue: null,
        summary: 'Wysyłka maili do klientów zewnętrznych jest gotowa z aktualnej konfiguracji Resend.',
        nextStep: 'Brak blokera po stronie konfiguracji maili klienta.',
      }
    }

    const allowedRecipient = getNotificationRecipientEmail()?.toLowerCase() ?? null
    const normalizedRecipient = recipientEmail?.trim().toLowerCase() ?? null

    if (allowedRecipient && normalizedRecipient === allowedRecipient) {
      return {
        state: 'ready',
        mode: 'auto',
        issue: null,
        summary: 'Wysyłka maili do klientów zewnętrznych jest gotowa z aktualnej konfiguracji Resend.',
        nextStep: 'Brak blokera po stronie konfiguracji maili klienta.',
      }
    }

    return {
      state: 'blocked',
      mode: 'auto',
      issue: allowedRecipient
        ? `RESEND_FROM_EMAIL uses resend.dev testing mode. Verify a domain to send customer emails to recipients other than ${allowedRecipient}.`
        : 'RESEND_FROM_EMAIL uses resend.dev testing mode. Verify a domain to send customer emails to external recipients.',
      summary: 'Wysyłka maili do klientów zewnętrznych jest zablokowana, bo RESEND_FROM_EMAIL nadal korzysta z resend.dev testing mode.',
      nextStep: 'Zweryfikuj domene nadawcy w Resend i ustaw RESEND_FROM_EMAIL na adres z tej domeny.',
    }
  })()

  return repairCustomerEmailDeliveryStatus(status)
}

export function getCustomerEmailDeliveryConfigIssue(recipientEmail?: string | null): string | null {
  const status = getCustomerEmailDeliveryStatus(recipientEmail)

  return status.state === 'ready' ? null : status.issue
}

function buildBookingSummary(booking: BookingRecord): string {
  return `${formatDateTimeLabel(booking.bookingDate, booking.bookingTime)} | ${getProblemLabel(booking.problemType)}`
}

function renderContactBlockHtml() {
  const contact = getPublicContactDetails()
  const parts = []

  if (contact.email) {
    parts.push(`<p><strong>Kontakt:</strong> <a href="mailto:${contact.email}">${contact.email}</a></p>`)
  }

  if (!parts.length) {
    parts.push('<p><strong>Kontakt:</strong> odpowiedz na tę wiadomość, jeśli potrzebujesz doprecyzowania terminu.</p>')
  }

  return parts.join('')
}

function renderContactBlockText() {
  const contact = getPublicContactDetails()
  const lines = []

  if (contact.email) {
    lines.push(`Kontakt: ${contact.email}`)
  }

  if (!lines.length) {
    lines.push('Kontakt: odpowiedz na tę wiadomość, jeśli potrzebujesz doprecyzowania terminu.')
  }

  return lines.join('\n')
}

function renderEmailShell(title: string, intro: string, content: string, outro: string) {
  return `
    <div style="background:#f6f3ee;padding:24px 12px;font-family:Arial,sans-serif;color:#1f1a17;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e9dfcf;border-radius:18px;overflow:hidden;box-shadow:0 12px 40px rgba(31,26,23,0.06);">
        <div style="background:linear-gradient(135deg,#1f1a17,#6f5a48);padding:24px 28px;color:#ffffff;">
          <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.82;">${EMAIL_BRAND_NAME}</div>
          <h1 style="margin:10px 0 0;font-size:28px;line-height:1.2;">${escapeHtml(title)}</h1>
        </div>
        <div style="padding:28px;line-height:1.65;font-size:15px;">
          <p style="margin-top:0;">${escapeHtml(intro)}</p>
          ${content}
          <p>${escapeHtml(outro)}</p>
          <p style="margin-bottom:0;color:#6b625b;font-size:13px;">Wiadomość wysłana automatycznie przez ${EMAIL_BRAND_NAME}.</p>
        </div>
      </div>
    </div>
  `
}

type EmailActionButton = {
  href: string
  label: string
}

function renderEmailActionButton(action: EmailActionButton) {
  return `
    <div style="margin:24px 0 20px;">
      <a
        href="${escapeHtml(action.href)}"
        style="display:inline-block;padding:14px 22px;border-radius:999px;background:#1f1a17;color:#ffffff;text-decoration:none;font-weight:700;letter-spacing:0.01em;"
      >
        ${escapeHtml(action.label)}
      </a>
    </div>
  `
}

function repairEmailPayload(payload: SendEmailPayload): SendEmailPayload {
  return {
    ...payload,
    subject: repairCopy(payload.subject),
    html: repairCopy(payload.html),
    text: repairCopy(payload.text),
  }
}

function decodeEmailAttachment(attachment: EmailAttachment): Buffer {
  return Buffer.from(attachment.content, attachment.encoding === 'base64' ? 'base64' : 'utf8')
}

function buildAbsoluteUrl(pathname: string): string {
  return new URL(pathname, getBaseUrl()).toString()
}

function buildBookingViewerUrl(pathname: '/payment' | '/confirmation', bookingId: string, accessToken?: string | null) {
  const searchParams = new URLSearchParams({
    bookingId,
  })

  if (accessToken) {
    searchParams.set('access', accessToken)
  }

  return buildAbsoluteUrl(`${pathname}?${searchParams.toString()}`)
}

type BookingEmailFact = {
  label: string
  htmlValue: string
  textValue: string
}

function renderBookingEmailFacts(facts: BookingEmailFact[]) {
  return {
    html: facts.map((fact) => `<p><strong>${escapeHtml(fact.label)}:</strong> ${fact.htmlValue}</p>`).join(''),
    text: facts.map((fact) => `${fact.label}: ${fact.textValue}`).join('\n'),
  }
}

function buildBookingCustomerEmail(
  booking: BookingRecord,
  subject: string,
  title: string,
  intro: string,
  facts: BookingEmailFact[],
  outro: string,
  actionButton?: EmailActionButton | null,
) {
  const renderedFacts = renderBookingEmailFacts(facts)
  const actionHtml = actionButton ? renderEmailActionButton(actionButton) : ''
  const actionText = actionButton ? `Strona rezerwacji: ${actionButton.href}` : ''

  return {
    to: booking.email,
    subject,
    html: renderEmailShell(title, intro, `${renderedFacts.html}${actionHtml}`, outro),
    text: [intro, renderedFacts.text, outro, actionText, renderContactBlockText()].filter(Boolean).join('\n'),
  }
}

export function shouldSendBookingConfirmationAfterPayment(
  booking: Pick<BookingRecord, 'bookingStatus' | 'paymentStatus'>,
): boolean {
  return (
    (booking.bookingStatus === 'pending' && booking.paymentStatus === 'unpaid') ||
    (booking.bookingStatus === 'pending_manual_payment' && booking.paymentStatus === 'pending_manual_review')
  )
}

async function deliverEmail(payload: SendEmailPayload, audience: EmailAudience = 'internal'): Promise<DeliveryResult> {
  const cleanedPayload = repairEmailPayload(payload)
  const mail = getMailProviderConfig()

  if (mail.provider === 'invalid') {
    console.warn('[regulski-behawiorysta][email] skip', {
      reason: 'MAIL_PROVIDER invalid',
      to: cleanedPayload.to,
      subject: cleanedPayload.subject,
    })
    return {
      status: 'skipped',
      reason: 'MAIL_PROVIDER invalid',
    }
  }

  if (mail.provider === 'resend' && !mail.apiKey) {
    console.warn('[regulski-behawiorysta][email] skip', {
      reason: 'RESEND_API_KEY missing',
      to: cleanedPayload.to,
      subject: cleanedPayload.subject,
    })
    return {
      status: 'skipped',
      reason: 'RESEND_API_KEY missing',
    }
  }

  if (mail.provider === 'resend' && audience === 'internal' && mail.configuredFromStatus === 'invalid') {
    console.warn('[regulski-behawiorysta][email] invalid RESEND_FROM_EMAIL, using resend.dev fallback for internal delivery only', {
      configuredFrom: mail.configuredFrom,
      to: cleanedPayload.to,
      subject: cleanedPayload.subject,
    })
  }

  if (audience === 'customer') {
    const customerEmailStatus = getCustomerEmailDeliveryStatus(cleanedPayload.to)

    if (customerEmailStatus.state !== 'ready') {
      const reason = customerEmailStatus.issue ?? customerEmailStatus.summary
      console.warn('[regulski-behawiorysta][email] skip', {
        reason,
        state: customerEmailStatus.state,
        to: cleanedPayload.to,
        subject: cleanedPayload.subject,
      })
      return {
        status: 'skipped',
        reason,
      }
    }
  }

  try {
    if (mail.provider === 'gmail') {
      if (!mail.smtpUser || !mail.smtpAppPassword || !mail.from) {
        return {
          status: 'skipped',
          reason: 'Gmail SMTP not fully configured',
        }
      }

      if (!gmailTransport) {
        gmailTransport = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: mail.smtpUser,
            pass: mail.smtpAppPassword,
          },
        })
      }

      const replyTo = cleanedPayload.replyTo ?? getPublicContactDetails().email ?? undefined

      await gmailTransport.sendMail({
        from: mail.from,
        to: cleanedPayload.to,
        subject: cleanedPayload.subject,
        html: cleanedPayload.html,
        text: cleanedPayload.text,
        replyTo,
        attachments: cleanedPayload.attachments?.map((attachment) => ({
          filename: attachment.filename,
          content: decodeEmailAttachment(attachment),
          contentType: attachment.contentType,
        })),
      })

      console.info('[regulski-behawiorysta][email] sent', {
        provider: mail.provider,
        to: cleanedPayload.to,
        subject: cleanedPayload.subject,
      })
      return {
        status: 'sent',
      }
    }

    const resendAttachments = cleanedPayload.attachments?.map((attachment) => ({
      filename: attachment.filename,
      content: attachment.encoding === 'base64' ? attachment.content : decodeEmailAttachment(attachment).toString('base64'),
      content_type: attachment.contentType,
    }))

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mail.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: mail.from,
        to: [cleanedPayload.to],
        subject: cleanedPayload.subject,
        html: cleanedPayload.html,
        text: cleanedPayload.text,
        reply_to: cleanedPayload.replyTo,
        ...(resendAttachments?.length ? { attachments: resendAttachments } : {}),
      }),
    })

    if (!response.ok) {
      const body = await response.text()
    console.error('[regulski-behawiorysta][email] failed', {
      status: response.status,
      body,
      to: cleanedPayload.to,
      subject: cleanedPayload.subject,
    })
      return {
        status: 'failed',
        reason: `Resend HTTP ${response.status}`,
      }
    }

    console.info('[regulski-behawiorysta][email] sent', {
      provider: mail.provider,
      to: cleanedPayload.to,
      subject: cleanedPayload.subject,
    })
    return {
      status: 'sent',
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown Resend error'
    console.error('[regulski-behawiorysta][email] failed', {
      reason,
      to: cleanedPayload.to,
      subject: cleanedPayload.subject,
    })
    return {
      status: 'failed',
      reason,
    }
  }
}

export async function sendBookingReservationCreatedEmail(
  booking: BookingRecord,
  accessToken?: string | null,
): Promise<DeliveryResult> {
  const summary = buildBookingSummary(booking)
  const subject = `Rezerwacja przyjęta - ${EMAIL_BRAND_NAME} - ${summary}`
  const customerEmailStatus = getCustomerEmailDeliveryStatus(booking.email)
  const bookingPageUrl = buildBookingViewerUrl('/payment', booking.id, accessToken)
  const accountUrl = buildAbsoluteUrl(`/login?email=${encodeURIComponent(booking.email)}`)
  const emailDeliveryNote =
    customerEmailStatus.state === 'ready'
      ? 'Po potwierdzeniu klient automatycznie dostanie mail z linkiem do pokoju rozmowy, a przy braku wpłaty wróci do płatności.'
      : customerEmailStatus.state === 'disabled'
        ? 'Po potwierdzeniu klient od razu zobaczy aktywne potwierdzenie i pokój na swojej stronie rezerwacji. Maile klienta są teraz świadomie wyłączone, więc link do rozmowy zostaje na stronie potwierdzenia.'
        : 'Po potwierdzeniu klient od razu zobaczy aktywne potwierdzenie i pokój na swojej stronie rezerwacji. Wysyłka maili do innych adresów ruszy po naprawie konfiguracji Resend.'
  const html = renderEmailShell(
    'Mamy Twoją rezerwację',
    'Termin został chwilowo zablokowany i czeka na płatność. To pierwszy krok do spokojniejszego planu działania.',
    `
      <p><strong>Termin:</strong> ${formatDateTimeLabel(booking.bookingDate, booking.bookingTime)}</p>
      <p><strong>Temat:</strong> ${getProblemLabel(booking.problemType)}</p>
      <p><strong>Kwota:</strong> ${formatPricePln(booking.amount)}</p>
      <p><strong>Co dalej:</strong> dokończ płatność, aby ostatecznie potwierdzić konsultację i odblokować link do rozmowy.</p>
      ${renderEmailActionButton({ href: bookingPageUrl, label: 'Otwórz stronę rezerwacji' })}
      <p>Po utworzeniu konta ten termin będzie widoczny w pokoju opiekuna razem z historią sprawy pupila.</p>
      ${renderEmailActionButton({ href: accountUrl, label: 'Otwórz pokój opiekuna' })}
      ${renderContactBlockHtml()}
    `,
    emailDeliveryNote,
  )
  const text = [
    `${EMAIL_BRAND_NAME} - rezerwacja przyjęta.`,
    `Termin: ${formatDateTimeLabel(booking.bookingDate, booking.bookingTime)}`,
    `Temat: ${getProblemLabel(booking.problemType)}`,
    `Kwota: ${formatPricePln(booking.amount)}`,
    'Co dalej: dokończ płatność, aby ostatecznie potwierdzić konsultację i odblokować link do rozmowy.',
    `Strona rezerwacji: ${bookingPageUrl}`,
    `Pokój opiekuna: ${accountUrl}`,
    emailDeliveryNote,
    renderContactBlockText(),
  ].join('\n')

  return deliverEmail({ to: booking.email, subject, html, text }, 'customer')
}

export async function sendBookingOwnerNotificationEmail(booking: BookingRecord): Promise<DeliveryResult> {
  const recipient = getAdminNotificationRecipientEmail()

  if (!recipient) {
    return {
      status: 'skipped',
      reason: 'admin notification email missing or invalid',
    }
  }

  const speciesLabel = booking.animalType
  const serviceLabel = getProblemLabel(booking.problemType)
  const bookingServiceLabel = booking.serviceType ? booking.serviceType : 'szybka-konsultacja-15-min'
  const serviceTitle =
    bookingServiceLabel === 'konsultacja-behawioralna-online'
      ? 'Pełna konsultacja behawioralna'
      : bookingServiceLabel === 'konsultacja-30-min'
        ? 'Dwa kwadranse'
        : '15-minutowa konsultacja behawioralna'
  const summary = formatDateTimeLabel(booking.bookingDate, booking.bookingTime)
  const subject = `[Rezerwacja] ${serviceTitle} - ${booking.ownerName} ${speciesLabel}`
  const replyTo = isValidPublicEmail(booking.email) ? booking.email : undefined
  const html = renderEmailShell(
    'Nowa rezerwacja w systemie',
    'Rezerwacja została zapisana i termin jest już zablokowany. To jest wewnętrzne powiadomienie dla właściciela.',
    `
      <p><strong>Imię klienta:</strong> ${escapeHtml(booking.ownerName)}</p>
      <p><strong>E-mail klienta:</strong> ${replyTo ? `<a href="mailto:${escapeHtml(booking.email)}">${escapeHtml(booking.email)}</a>` : escapeHtml(booking.email)}</p>
      <p><strong>Gatunek:</strong> ${escapeHtml(speciesLabel)}</p>
      <p><strong>Usługa:</strong> ${escapeHtml(serviceTitle)} (${escapeHtml(formatPricePln(booking.amount))})</p>
      <p><strong>Temat:</strong> ${escapeHtml(serviceLabel)}</p>
      <p><strong>Termin:</strong> ${escapeHtml(summary)}</p>
      <p><strong>Opis sytuacji:</strong><br />${formatMultilineHtml(booking.description)}</p>
      <p><strong>Status:</strong> ${escapeHtml(booking.bookingStatus)} / ${escapeHtml(booking.paymentStatus)}</p>
      <p><strong>Co dalej:</strong> gdy klient kliknie „Zrobiłem płatność”, dostaniesz osobny mail z linkami do potwierdzenia albo odrzucenia wpłaty.</p>
      <p><strong>ID rezerwacji:</strong> ${escapeHtml(booking.id)}</p>
    `,
    'Ta ścieżka nie zbiera oddzielnych checkboxów zgód klienta. Termin czeka teraz na opłatę i dalszą obsługę.',
  )
  const text = [
    'Nowa rezerwacja w systemie.',
    `Imię klienta: ${booking.ownerName}`,
    `E-mail klienta: ${booking.email}`,
    `Gatunek: ${speciesLabel}`,
    `Usługa: ${serviceTitle} (${formatPricePln(booking.amount)})`,
    `Temat: ${serviceLabel}`,
    `Termin: ${summary}`,
    'Opis sytuacji:',
    booking.description,
    '',
    `Status: ${booking.bookingStatus} / ${booking.paymentStatus}`,
    'Co dalej: gdy klient kliknie "Zrobiłem płatność", dostaniesz osobny mail z linkami do potwierdzenia albo odrzucenia wpłaty.',
    `ID rezerwacji: ${booking.id}`,
    'Zgody: ta ścieżka nie zbiera oddzielnych checkboxów zgód klienta.',
  ].join('\n')

  return deliverEmail(
    {
      to: recipient,
      subject,
      html,
      text,
      replyTo,
    },
    'internal',
  )
}

export type ContactLeadSubmission = {
  name: string
  email: string
  topic: string
  message: string
  contextLabel: string
  serviceLabel?: string | null
  requestedDate?: string | null
  requestedTime?: string | null
  bookingId?: string | null
  website?: string | null
}

export type PdfOrderSubmission = {
  itemType: 'guide' | 'bundle'
  itemSlug: string
  itemTitle: string
  itemPrice: string
  name: string
  email: string
  notes?: string | null
  website?: string | null
}

export type BookRequestSubmission = {
  service: 'kwadrans-na-juz' | 'szybka-konsultacja-15-min' | 'konsultacja-30-min' | 'konsultacja-behawioralna-online'
  serviceLabel: string
  servicePrice: string
  name: string
  email: string
  species: 'pies' | 'kot'
  description: string
  preferredSlots: string
  leadBookingId?: string
  leadBookingAccessToken?: string
}

function getPdfOrderCustomerCta(_submission: PdfOrderSubmission): EmailActionButton {
  const manualPayment = getManualPaymentConfig()

  if (manualPayment.paypalMeUrl) {
    return {
      href: manualPayment.paypalMeUrl,
      label: 'Przejdź do PayPal',
    }
  }

  return {
    href: buildAbsoluteUrl('/materialy'),
    label: 'Zobacz szczegóły zamówienia',
  }
}

export async function sendContactLeadEmail(submission: ContactLeadSubmission): Promise<DeliveryResult> {
  const recipient = getAdminNotificationRecipientEmail()

  if (!recipient) {
    return {
      status: 'skipped',
      reason: 'public contact email missing or invalid',
    }
  }

  const subject = `Kontakt - ${submission.topic} - ${submission.name}`
  const contactValue = submission.email.trim()
  const replyTo = isValidPublicEmail(contactValue) ? contactValue : undefined
  const contextBlock = submission.bookingId
    ? `<p><strong>Numer rezerwacji:</strong> ${escapeHtml(submission.bookingId)}</p>`
    : ''
  const serviceBlock = submission.serviceLabel ? `<p><strong>Ścieżka:</strong> ${escapeHtml(submission.serviceLabel)}</p>` : ''
  const preferredWindowBlock =
    submission.requestedDate && submission.requestedTime
      ? `<p><strong>Preferowany termin:</strong> ${escapeHtml(submission.requestedDate)} o ${escapeHtml(submission.requestedTime)}</p>`
      : ''
  const html = renderEmailShell(
    'Nowa wiadomość z formularza kontaktu',
    'Ktoś wysłał wiadomość przez formularz kontaktowy. To jest pierwszy krok do odpowiedzi i uporządkowania kolejnego ruchu.',
    `
      <p><strong>Imię:</strong> ${escapeHtml(submission.name)}</p>
      <p><strong>Kontakt:</strong> ${replyTo ? `<a href="mailto:${escapeHtml(contactValue)}">${escapeHtml(contactValue)}</a>` : escapeHtml(contactValue)}</p>
      <p><strong>Temat:</strong> ${escapeHtml(submission.topic)}</p>
      ${serviceBlock}
      <p><strong>Kontekst:</strong> ${escapeHtml(submission.contextLabel)}</p>
      ${preferredWindowBlock}
      ${contextBlock}
      <p><strong>Wiadomość:</strong><br />${formatMultilineHtml(submission.message)}</p>
    `,
    'Odpowiedz na podany adres e-mail albo wróć do kontaktu, jeśli potrzebujesz doprecyzować szczegóły.',
  )
  const text = [
    'Nowa wiadomość z formularza kontaktu.',
    `Imię: ${submission.name}`,
    `Kontakt: ${contactValue}`,
    `Temat: ${submission.topic}`,
    submission.serviceLabel ? `Ścieżka: ${submission.serviceLabel}` : null,
    `Kontekst: ${submission.contextLabel}`,
    submission.requestedDate && submission.requestedTime
      ? `Preferowany termin: ${submission.requestedDate} ${submission.requestedTime}`
      : null,
    submission.bookingId ? `Numer rezerwacji: ${submission.bookingId}` : null,
    `Wiadomość: ${submission.message}`,
    'Odpowiedz na podany adres e-mail albo wróć do kontaktu, jeśli potrzebujesz doprecyzować szczegóły.',
  ]
    .filter((line): line is string => typeof line === 'string' && line.length > 0)
    .join('\n')

  return deliverEmail(
    {
      to: recipient,
      subject,
      html,
      text,
      replyTo,
    },
    'internal',
  )
}

export async function sendContactLeadAutoReplyEmail(submission: ContactLeadSubmission): Promise<DeliveryResult> {
  const recipient = submission.email.trim()

  if (!isValidPublicEmail(recipient)) {
    return {
      status: 'skipped',
      reason: 'customer contact email missing or invalid',
    }
  }

  const subject = 'Dostałem Twoją wiadomość - Regulski'
  const quickStartHref = 'https://regulskibehawiorysta.pl/book?service=szybka-konsultacja-15-min'
  const html = renderEmailShell(
    `Cześć ${escapeHtml(submission.name)}, dostałem Twoją wiadomość.`,
    'Odpowiem na podany adres e-mail w ciągu 1-2 dni roboczych.',
    `
      <p><strong>Temat:</strong> ${escapeHtml(submission.topic)}</p>
      <p>Jeśli sytuacja wymaga szybszego wejścia, możesz od razu umówić 15-minutową konsultację behawioralną.</p>
      <p><a href="${quickStartHref}">${quickStartHref}</a></p>
      ${renderContactBlockHtml()}
    `,
    'Jeśli chcesz doprecyzować temat, po prostu odpowiedz na tego maila.',
  )
  const text = [
    `Cześć ${submission.name},`,
    '',
    'Dostałem Twoją wiadomość i odpowiem w ciągu 1-2 dni roboczych.',
    '',
    `Temat: ${submission.topic}`,
    'Jeśli sytuacja wymaga szybszego wejścia, możesz od razu umówić 15-minutową konsultację behawioralną:',
    quickStartHref,
    '',
    'Jeśli chcesz doprecyzować temat, po prostu odpowiedz na tego maila.',
    renderContactBlockText(),
  ].join('\n')

  return deliverEmail(
    {
      to: recipient,
      subject,
      html,
      text,
      replyTo: getPublicContactDetails().email ?? undefined,
    },
    'customer',
  )
}
export async function sendPdfOrderEmail(submission: PdfOrderSubmission): Promise<DeliveryResult> {
  const recipient = getAdminNotificationRecipientEmail()

  if (!recipient) {
    return {
      status: 'skipped',
      reason: 'public contact email missing or invalid',
    }
  }

  const replyTo = isValidPublicEmail(submission.email) ? submission.email : undefined
  const itemTypeLabel = submission.itemType === 'bundle' ? 'Pakiet PDF' : 'PDF'
  const notesBlock = submission.notes ? `<p><strong>Wiadomość:</strong><br />${formatMultilineHtml(submission.notes)}</p>` : ''
  const subject = `Zamówienie ${itemTypeLabel} - ${submission.itemTitle} - ${submission.name}`
  const html = renderEmailShell(
    'Nowe zamówienie PDF',
    'Klient wysłał zamówienie poradnika PDF albo pakietu. Odpowiedz z potwierdzeniem wyboru i preferuj PayPal albo BLIK na telefon bez eksponowania numeru publicznie.',
    `
      <p><strong>Imię:</strong> ${escapeHtml(submission.name)}</p>
      <p><strong>E-mail:</strong> ${replyTo ? `<a href="mailto:${escapeHtml(submission.email)}">${escapeHtml(submission.email)}</a>` : escapeHtml(submission.email)}</p>
      <p><strong>Typ:</strong> ${itemTypeLabel}</p>
      <p><strong>Produkt:</strong> ${escapeHtml(submission.itemTitle)}</p>
      <p><strong>Slug:</strong> ${escapeHtml(submission.itemSlug)}</p>
      <p><strong>Cena:</strong> ${escapeHtml(submission.itemPrice)}</p>
      ${notesBlock}
    `,
    'Wyślij klientowi mail z przyciskiem do PayPal albo z instrukcją BLIK na telefon, bez odsyłania do publicznego numeru.',
  )
  const text = [
    'Nowe zamówienie PDF.',
    `Imię: ${submission.name}`,
    `E-mail: ${submission.email}`,
    `Typ: ${itemTypeLabel}`,
    `Produkt: ${submission.itemTitle}`,
    `Slug: ${submission.itemSlug}`,
    `Cena: ${submission.itemPrice}`,
    submission.notes ? `Wiadomość: ${submission.notes}` : null,
    'Wyślij klientowi mail z przyciskiem do PayPal albo z instrukcją BLIK na telefon, bez odsyłania do publicznego numeru.',
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n')

  return deliverEmail(
    {
      to: recipient,
      subject,
      html,
      text,
      replyTo,
    },
    'internal',
  )
}

export async function sendPdfOrderAutoReplyEmail(submission: PdfOrderSubmission): Promise<DeliveryResult> {
  const recipient = submission.email.trim()

  if (!isValidPublicEmail(recipient)) {
    return {
      status: 'skipped',
      reason: 'customer contact email missing or invalid',
    }
  }

  const action = getPdfOrderCustomerCta(submission)
  const hasPaypalButton = action.label === 'Przejdź do PayPal'
  const subject = `Dostałem zamówienie: ${submission.itemTitle}`
  const html = renderEmailShell(
    `Cześć ${escapeHtml(submission.name)}, dostałem Twoje zamówienie.`,
    hasPaypalButton
      ? 'Zamówienie jest zapisane. Możesz od razu przejść do płatności przez PayPal z przycisku poniżej. BLIK na telefon zostaje dostępny jako opcja zapasowa bez publikowania numeru na stronie.'
      : 'Zamówienie jest zapisane. Odpowiem mailowo z dalszym krokiem płatności. BLIK na telefon zostaje dostępny bez publikowania numeru na stronie.',
    `
      <p><strong>Produkt:</strong> ${escapeHtml(submission.itemTitle)}</p>
      <p><strong>Cena:</strong> ${escapeHtml(submission.itemPrice)}</p>
      <p><strong>Metody płatności:</strong> PayPal albo BLIK na telefon.</p>
      <p><strong>Dalszy krok:</strong> ${
        hasPaypalButton
          ? 'po płatności odpiszę z potwierdzeniem i informacją o dostępie do materiału.'
          : 'odpiszę z potwierdzeniem wyboru i instrukcją płatności.'
      }</p>
      ${renderEmailActionButton(action)}
      <p style="margin-top:0;color:#6b625b;">${
        hasPaypalButton
          ? 'Przycisk prowadzi bezpośrednio do PayPal, żeby ograniczyc widocznosc numeru telefonu.'
          : 'Jeśli wybierzesz BLIK na telefon, szczegóły dostaniesz mailowo bez publikowania numeru na stronie.'
      }</p>
      ${renderContactBlockHtml()}
    `,
    'Jeśli chcesz coś doprecyzować, po prostu odpowiedz na tego maila.',
  )
  const text = [
    `Cześć ${submission.name},`,
    '',
    hasPaypalButton
      ? 'Dostałem Twoje zamówienie. Możesz od razu przejść do płatności przez PayPal z linku poniżej. BLIK na telefon zostaje dostępny jako opcja zapasowa.'
      : 'Dostałem Twoje zamówienie. Odpiszę z potwierdzeniem wyboru i instrukcją płatności. BLIK na telefon zostaje dostępny bez publikowania numeru na stronie.',
    '',
    `Produkt: ${submission.itemTitle}`,
    `Cena: ${submission.itemPrice}`,
    'Metody płatności: PayPal albo BLIK na telefon.',
    `${hasPaypalButton ? 'Przycisk do PayPal' : 'Szczegóły zamówienia'}: ${action.href}`,
    'Jeśli chcesz coś doprecyzować, po prostu odpowiedz na tego maila.',
    renderContactBlockText(),
  ].join('\n')

  return deliverEmail(
    {
      to: recipient,
      subject,
      html,
      text,
      replyTo: getPublicContactDetails().email ?? undefined,
    },
    'customer',
  )
}

export async function sendBookRequestEmail(submission: BookRequestSubmission): Promise<DeliveryResult> {
  const recipient = getAdminNotificationRecipientEmail()

  if (!recipient) {
    return {
      status: 'skipped',
      reason: 'admin notification email missing or invalid',
    }
  }

  const replyTo = isValidPublicEmail(submission.email) ? submission.email : undefined
  const speciesLabel = submission.species === 'kot' ? 'Kot' : 'Pies'
  const adminPanelHref = submission.leadBookingId
    ? buildAbsoluteUrl(`/admin/lead-bookings/${submission.leadBookingId}`)
    : null
  const confirmToken = submission.leadBookingId ? generateConfirmToken(submission.leadBookingId) : null
  const quickConfirmHref = submission.leadBookingId && confirmToken
    ? buildAbsoluteUrl(`/admin/quick-confirm/${submission.leadBookingId}?token=${confirmToken}`)
    : null
  const subject =
    submission.service === 'kwadrans-na-juz'
      ? `PILNE - Kwadrans na już: ${submission.name}`
      : `REZERWACJA [${submission.serviceLabel}] - ${submission.name} (${speciesLabel})`
  const html = renderEmailShell(
    'Nowa prośba o rezerwację',
    submission.service === 'kwadrans-na-juz'
      ? 'Klient wysłał pilną prośbę o Kwadrans na już. Wróć z odpowiedzią priorytetowo i odeślij potwierdzenie terminu z PayPal albo instrukcją BLIK na telefon.'
      : 'Klient wysłał prośbę o rezerwację konsultacji. Odpowiedz z potwierdzonym terminem i preferuj PayPal albo BLIK na telefon bez eksponowania numeru publicznie.',
    `
      <p><strong>Usługa:</strong> ${escapeHtml(submission.serviceLabel)} (${escapeHtml(submission.servicePrice)})</p>
      <p><strong>Gatunek:</strong> ${escapeHtml(speciesLabel)}</p>
      <p><strong>Imię:</strong> ${escapeHtml(submission.name)}</p>
      <p><strong>E-mail:</strong> ${replyTo ? `<a href="mailto:${escapeHtml(submission.email)}">${escapeHtml(submission.email)}</a>` : escapeHtml(submission.email)}</p>
      <p><strong>Preferowane terminy:</strong><br />${formatMultilineHtml(submission.preferredSlots)}</p>
      <p><strong>Opis sytuacji:</strong><br />${formatMultilineHtml(submission.description)}</p>
      <p><strong>Następny krok:</strong> ${submission.service === 'kwadrans-na-juz' ? 'odpisz w ciągu 15 minut z pierwszym wolnym terminem i dalszym krokiem płatności.' : 'Gdy klient wpłaci, kliknij przycisk niżej, wpisz termin i system wyśle klientowi link do pokoju.'}</p>
      ${quickConfirmHref ? renderEmailActionButton({ href: quickConfirmHref, label: 'Potwierdź płatność i wyślij termin klientowi' }) : ''}
      ${adminPanelHref ? `<p style="margin-top:12px;font-size:13px"><a href="${escapeHtml(adminPanelHref)}" style="color:#666">lub otwórz pełny panel admina</a></p>` : ''}
    `,
    'To jest manualny flow rezerwacji po potwierdzeniu terminu, bez publicznego numeru telefonu.',
  )
  const text = [
    submission.service === 'kwadrans-na-juz' ? 'Nowa pilna prośba o rezerwację.' : 'Nowa prośba o rezerwację.',
    `Usługa: ${submission.serviceLabel} (${submission.servicePrice})`,
    `Gatunek: ${speciesLabel}`,
    `Imię: ${submission.name}`,
    `E-mail: ${submission.email}`,
    '',
    'Preferowane terminy:',
    submission.preferredSlots,
    '',
    'Opis sytuacji:',
    submission.description,
    '',
    submission.service === 'kwadrans-na-juz'
      ? 'Następny krok: odpisz w ciągu 15 minut z pierwszym wolnym terminem i dalszym krokiem płatności.'
      : 'Następny krok: potwierdź termin i wyślij klientowi PayPal albo instrukcję BLIK na telefon.',
  ].join('\n')

  return deliverEmail(
    {
      to: recipient,
      subject,
      html,
      text,
      replyTo,
    },
    'internal',
  )
}

export async function sendBookRequestAutoReplyEmail(submission: BookRequestSubmission): Promise<DeliveryResult> {
  const recipient = submission.email.trim()

  if (!isValidPublicEmail(recipient)) {
    return {
      status: 'skipped',
      reason: 'customer contact email missing or invalid',
    }
  }

  const faqHref = buildAbsoluteUrl('/faq')
  const subject = `Dostałem Twoją rezerwację - ${submission.serviceLabel}`
  const html = renderEmailShell(
    `Cześć ${escapeHtml(submission.name)}, dostałem Twoją rezerwację.`,
    `Prośba o ${escapeHtml(submission.serviceLabel)} (${escapeHtml(submission.servicePrice)}) trafiła do mnie poprawnie. Płatność zostaje w modelu PayPal albo BLIK na telefon, bez publikowania numeru na stronie.`,
    `
      <p><strong>Co dalej:</strong></p>
      <p>${submission.service === 'kwadrans-na-juz' ? '1. Odezwę się w ciągu 15 minut z pierwszym wolnym terminem i dalszym krokiem płatności.' : '1. Odezwę się w ciągu kilku godzin, między 9 a 21, z potwierdzeniem terminu i dalszym krokiem płatności.'}</p>
      <p>2. Dostaniesz PayPal albo instrukcje BLIK na telefon, zależnie od najprostszego wariantu dla tej rezerwacji.</p>
      <p>3. Po płatności potwierdzam rezerwację do 15 minut i odsyłam link do rozmowy oraz wpis do kalendarza.</p>
      <p><strong>Twoje preferowane terminy:</strong><br />${formatMultilineHtml(submission.preferredSlots)}</p>
      <p><strong>Status:</strong> Czeka na potwierdzenie terminu.</p>
      ${renderEmailActionButton({ href: faqHref, label: 'Najczęściej zadawane pytania' })}
      ${renderContactBlockHtml()}
    `,
    'Jeśli chcesz coś dopowiedzieć, po prostu odpowiedz na tego maila.',
  )
  const text = [
    `Cześć ${submission.name},`,
    '',
    `Dostałem Twoją rezerwację: ${submission.serviceLabel} (${submission.servicePrice}).`,
    'Płatność zostaje w modelu PayPal albo BLIK na telefon, bez publikowania numeru na stronie.',
    '',
    'Co dalej:',
    submission.service === 'kwadrans-na-juz'
      ? '1. Odezwę się w ciągu 15 minut z pierwszym wolnym terminem i dalszym krokiem płatności.'
      : '1. Odezwę się w ciągu kilku godzin, między 9 a 21, z potwierdzeniem terminu i dalszym krokiem płatności.',
    '2. Dostaniesz PayPal albo instrukcje BLIK na telefon.',
    '3. Po płatności potwierdzam rezerwację do 15 minut i odsyłam link do rozmowy oraz wpis do kalendarza.',
    '',
    'Twoje preferowane terminy:',
    submission.preferredSlots,
    '',
    'Status: Czeka na potwierdzenie terminu.',
    '',
    `Najczęściej zadawane pytania: ${faqHref}`,
    '',
    'Jeśli chcesz coś dopowiedzieć, po prostu odpowiedz na tego maila.',
    renderContactBlockText(),
  ].join('\n')

  return deliverEmail(
    {
      to: recipient,
      subject,
      html,
      text,
      replyTo: getPublicContactDetails().email ?? undefined,
    },
    'customer',
  )
}

export async function sendLeadMagnetDownloadEmail(email: string, magnet: LeadMagnet): Promise<DeliveryResult> {
  const recipient = email.trim()

  if (!isValidPublicEmail(recipient)) {
    return {
      status: 'skipped',
      reason: 'customer contact email missing or invalid',
    }
  }

  const downloadHref = buildAbsoluteUrl(`/api/lead-magnet/${magnet.slug}`)
  const thankYouHref = buildAbsoluteUrl(`/bezplatne-materialy/dziekuje?leadMagnet=${encodeURIComponent(magnet.slug)}`)
  const subject = `Twój PDF: ${magnet.shortTitle}`
  const html = renderEmailShell(
    `Twój PDF jest gotowy: ${escapeHtml(magnet.title)}`,
    'Poniżej masz bezpośredni link do pobrania. Zostawiam też stronę potwierdzenia, gdyby link z załącznikiem został zablokowany przez skrzynkę.',
    `
      ${renderEmailActionButton({ href: downloadHref, label: 'Pobierz PDF' })}
      <p><strong>Strona potwierdzenia:</strong><br /><a href="${escapeHtml(thankYouHref)}">${escapeHtml(thankYouHref)}</a></p>
      <p>${escapeHtml(magnet.thankYouHint)}</p>
      ${renderContactBlockHtml()}
    `,
    'Jeśli materiał nie wystarczy, odpowiedz na tego maila albo przejdź do Kwadransu.',
  )
  const text = [
    `Twój PDF jest gotowy: ${magnet.title}`,
    '',
    `Pobierz PDF: ${downloadHref}`,
    `Strona potwierdzenia: ${thankYouHref}`,
    magnet.thankYouHint,
    '',
    'Jeśli materiał nie wystarczy, odpowiedz na tego maila albo przejdź do Kwadransu.',
    renderContactBlockText(),
  ].join('\n')

  return deliverEmail(
    {
      to: recipient,
      subject,
      html,
      text,
      replyTo: getPublicContactDetails().email ?? undefined,
    },
    'customer',
  )
}

export async function sendLeadMagnetFollowUpThreeEmail(email: string, magnet: LeadMagnet): Promise<DeliveryResult> {
  if (!isValidPublicEmail(email)) {
    return {
      status: 'skipped',
      reason: 'customer contact email missing or invalid',
    }
  }

  const subject = `${magnet.followUpTitle} - Regulski`
  const nextStepHref = `https://regulskibehawiorysta.pl${magnet.nextStepHref}`
  const html = renderEmailShell(
    magnet.followUpTitle,
    magnet.followUpBody,
    `
      <p><strong>Kolejny krok:</strong> <a href="${nextStepHref}">${nextStepHref}</a></p>
      <p>${escapeHtml(magnet.nextStepCopy)}</p>
      ${renderContactBlockHtml()}
    `,
    'Jeśli chcesz doprecyzować swoja sytuację, odpowiedz na tego maila albo przejdź do rezerwacji.',
  )
  const text = [
    magnet.followUpTitle,
    '',
    magnet.followUpBody,
    '',
    `Kolejny krok: ${nextStepHref}`,
    magnet.nextStepCopy,
    '',
    'Jeśli chcesz doprecyzować swoja sytuację, odpowiedz na tego maila albo przejdź do rezerwacji.',
    renderContactBlockText(),
  ].join('\n')

  return deliverEmail(
    {
      to: email,
      subject,
      html,
      text,
      replyTo: getPublicContactDetails().email ?? undefined,
    },
    'customer',
  )
}

export async function sendLeadMagnetFollowUpSevenEmail(email: string, magnet: LeadMagnet): Promise<DeliveryResult> {
  if (!isValidPublicEmail(email)) {
    return {
      status: 'skipped',
      reason: 'customer contact email missing or invalid',
    }
  }

  const bookingHref = 'https://regulskibehawiorysta.pl/book?service=szybka-konsultacja-15-min'
  const subject = `Jeśli dalej coś się nie układa - ${magnet.shortTitle}`
  const html = renderEmailShell(
    'Jeśli dalej coś się nie układa',
    'Po kilku dniach materiał powinien już porządkować pierwsze obserwacje. Jeśli nadal nie wiesz, co zrobić dalej, najprostszy kolejny krok to krótka rozmowa.',
    `
      <p><strong>Najprostszy kolejny krok:</strong> <a href="${bookingHref}">${bookingHref}</a></p>
      <p>15-minutowa konsultacja behawioralna zostaje najlżejszym startem, gdy chcesz przejść od obserwacji do konkretnej decyzji.</p>
      ${renderContactBlockHtml()}
    `,
    'Jeśli temat jest już dla Ciebie jasny, zachowaj materiał i wróć do niego wtedy, kiedy będzie potrzebny.',
  )
  const text = [
      'Jeśli dalej coś się nie układa, najprostszy kolejny krok to krótka rozmowa.',
    '',
    `Najprostszy kolejny krok: ${bookingHref}`,
    '15-minutowa konsultacja behawioralna zostaje najlżejszym startem, gdy chcesz przejść od obserwacji do konkretnej decyzji.',
    '',
    'Jeśli temat jest już dla Ciebie jasny, zachowaj materiał i wróć do niego wtedy, kiedy będzie potrzebny.',
    renderContactBlockText(),
  ].join('\n')

  return deliverEmail(
    {
      to: email,
      subject,
      html,
      text,
      replyTo: getPublicContactDetails().email ?? undefined,
    },
    'customer',
  )
}

type UrgentNowResponseEmailPayload = {
  customerName: string
  customerEmail: string
  topic: string
  proposedDate: string
  proposedTime: string
  bookingHref: string
  responseNote?: string | null
}

export async function sendUrgentNowResponseEmail(payload: UrgentNowResponseEmailPayload): Promise<DeliveryResult> {
  const subject = `Kwadrans na już - proponowany termin ${payload.proposedDate} ${payload.proposedTime}`
  const noteBlock = payload.responseNote ? `<p><strong>Dodatkowa wiadomość:</strong><br />${formatMultilineHtml(payload.responseNote)}</p>` : ''
  const paymentHref = /^https?:\/\//i.test(payload.bookingHref) ? payload.bookingHref : buildAbsoluteUrl(payload.bookingHref)
  const html = renderEmailShell(
    'Mam dla Ciebie termin Kwadransu na już',
    'Dodałem proponowany termin do terminarza. Możesz od razu przejść do płatności i dokończyć rezerwację.',
    `
      <p><strong>Temat:</strong> ${escapeHtml(payload.topic)}</p>
      <p><strong>Proponowany termin:</strong> ${escapeHtml(payload.proposedDate)} o ${escapeHtml(payload.proposedTime)}</p>
      <p><strong>Link do płatności:</strong> <a href="${escapeHtml(paymentHref)}">${escapeHtml(paymentHref)}</a></p>
      ${renderEmailActionButton({ href: paymentHref, label: 'Przejdź do płatności' })}
      ${noteBlock}
      ${renderContactBlockHtml()}
    `,
    'Jeśli termin przestał pasować, odpowiedz na tego maila albo napisz przez formularz kontaktu.',
  )
  const text = [
    `Mam dla Ciebie termin Kwadransu na już.`,
    `Temat: ${payload.topic}`,
    `Proponowany termin: ${payload.proposedDate} ${payload.proposedTime}`,
    `Link do płatności: ${paymentHref}`,
    payload.responseNote ? `Dodatkowa wiadomość: ${payload.responseNote}` : null,
    'Jeśli termin przestał pasować, odpowiedz na tego maila albo napisz przez formularz kontaktu.',
    renderContactBlockText(),
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n')

  return deliverEmail(
    {
      to: payload.customerEmail,
      subject,
      html,
      text,
    },
    'customer',
  )
}

export async function sendBookingConfirmationEmail(booking: BookingRecord): Promise<DeliveryResult> {
  const summary = buildBookingSummary(booking)
  const subject = `Potwierdzenie konsultacji - ${EMAIL_BRAND_NAME} - ${summary}`
  const prepGuideUrl = getPrepGuideUrl(booking)
  const prepGuideBlock = prepGuideUrl
    ? `<p><strong>Jak się przygotować:</strong> <a href="${escapeHtml(prepGuideUrl)}">Przeczytaj krótki poradnik</a> — zajmuje 3 minuty i sprawi, że wyciągniesz z rozmowy maksimum.</p>`
    : ''
  const prepGuideText = prepGuideUrl
    ? `Jak się przygotować: ${prepGuideUrl}`
    : ''

  const html = renderEmailShell(
    'Konsultacja potwierdzona',
    'Płatność została przyjęta, a Twój termin jest już przypisany do Ciebie.',
    `
      <p><strong>Termin:</strong> ${formatDateTimeLabel(booking.bookingDate, booking.bookingTime)}</p>
      <p><strong>Temat:</strong> ${getProblemLabel(booking.problemType)}</p>
      <p><strong>Link do rozmowy:</strong> <a href="${escapeHtml(booking.meetingUrl)}">${escapeHtml(booking.meetingUrl)}</a></p>
      ${prepGuideBlock}
      <p><strong>Co dalej:</strong> wejdź 3–5 minut przed czasem. Miej gotową jedną najważniejszą obserwację — to wystarczy, żeby zacząć.</p>
      ${renderContactBlockHtml()}
    `,
    'Jeśli będzie potrzebny kolejny krok po rozmowie, dostaniesz jasną rekomendację zamiast ogólnych porad.',
  )
  const text = [
    `Twoja konsultacja ${EMAIL_BRAND_NAME} została potwierdzona.`,
    `Termin: ${formatDateTimeLabel(booking.bookingDate, booking.bookingTime)}`,
    `Temat: ${getProblemLabel(booking.problemType)}`,
    `Link do rozmowy: ${booking.meetingUrl}`,
    prepGuideText,
    'Co dalej: wejdź 3–5 minut przed czasem. Miej gotową jedną najważniejszą obserwację.',
    renderContactBlockText(),
  ].filter(Boolean).join('\n')

  return deliverEmail({ to: booking.email, subject, html, text }, 'customer')
}

function buildCalendarAttachmentFilename(booking: Pick<BookingRecord, 'bookingDate' | 'bookingTime'>) {
  return `regulski-konsultacja-${booking.bookingDate}-${booking.bookingTime.replace(':', '')}.ics`
}

export async function sendBookingPaymentConfirmedOwnerEmail(booking: BookingRecord): Promise<DeliveryResult> {
  const recipient = getAdminNotificationRecipientEmail()

  if (!recipient) {
    return {
      status: 'skipped',
      reason: 'ADMIN_NOTIFICATION_EMAIL missing',
    }
  }

  const serviceTitle = getBookingServiceTitle(resolveBookingServiceType(booking.serviceType, booking.amount))
  const calendarUrl = buildGoogleCalendarUrl(booking)
  const subject = `[Potwierdzona] ${serviceTitle} - ${booking.ownerName} - ${formatDateTimeLabel(booking.bookingDate, booking.bookingTime)}`
  const replyTo = isValidPublicEmail(booking.email) ? booking.email : undefined
  const html = renderEmailShell(
    'Konsultacja opłacona i potwierdzona',
    'Płatność została potwierdzona. Poniżej masz komplet danych do rozmowy.',
    `
      <p><strong>Termin:</strong> ${formatDateTimeLabel(booking.bookingDate, booking.bookingTime)}</p>
      <p><strong>Usługa:</strong> ${escapeHtml(serviceTitle)} (${escapeHtml(formatPricePln(booking.amount))})</p>
      <p><strong>Temat:</strong> ${getProblemLabel(booking.problemType)}</p>
      <p><strong>Klient:</strong> ${escapeHtml(booking.ownerName)} | <a href="mailto:${escapeHtml(booking.email)}">${escapeHtml(booking.email)}</a>${booking.phone ? ` | ${escapeHtml(booking.phone)}` : ''}</p>
      <p><strong>Link do rozmowy:</strong> <a href="${escapeHtml(booking.meetingUrl)}">${escapeHtml(booking.meetingUrl)}</a></p>
      <p><strong>Google Calendar:</strong> <a href="${escapeHtml(calendarUrl)}">dodaj termin do kalendarza</a></p>
      <p><strong>Opis zgłoszenia:</strong><br />${formatMultilineHtml(booking.description)}</p>
      <p><strong>ID rezerwacji:</strong> ${escapeHtml(booking.id)}</p>
    `,
    'Plik .ics jest dołączony do tej wiadomości. Możesz też użyć linku Google Calendar z treści maila.',
  )
  const text = [
    'Konsultacja opłacona i potwierdzona.',
    `Termin: ${formatDateTimeLabel(booking.bookingDate, booking.bookingTime)}`,
    `Usługa: ${serviceTitle} (${formatPricePln(booking.amount)})`,
    `Temat: ${getProblemLabel(booking.problemType)}`,
    `Klient: ${booking.ownerName} | ${booking.email}${booking.phone ? ` | ${booking.phone}` : ''}`,
    `Link do rozmowy: ${booking.meetingUrl}`,
    `Google Calendar: ${calendarUrl}`,
    'Opis zgłoszenia:',
    booking.description,
    `ID rezerwacji: ${booking.id}`,
  ].join('\n')

  return deliverEmail(
    {
      to: recipient,
      subject,
      html,
      text,
      replyTo,
      attachments: [
        {
          filename: buildCalendarAttachmentFilename(booking),
          content: buildGoogleCalendarIcs(booking),
          contentType: 'text/calendar; charset=utf-8',
        },
      ],
    },
    'internal',
  )
}

export type BookingPreparationMaterialsOwnerEmailPayload = {
  videoUrl?: string | null
  linkUrl?: string | null
  notes?: string | null
  changedFields: Array<'video' | 'link' | 'notes'>
}

export async function sendBookingPreparationMaterialsOwnerEmail(
  booking: BookingRecord,
  payload: BookingPreparationMaterialsOwnerEmailPayload,
): Promise<DeliveryResult> {
  const recipient = getAdminNotificationRecipientEmail()

  if (!recipient) {
    return {
      status: 'skipped',
      reason: 'ADMIN_NOTIFICATION_EMAIL missing',
    }
  }

  if (!payload.changedFields.length) {
    return {
      status: 'skipped',
      reason: 'no preparation material changes',
    }
  }

  const changedLabels = payload.changedFields
    .map((field) => (field === 'video' ? 'nagranie MP4' : field === 'link' ? 'link' : 'krótki opis'))
    .join(', ')
  const serviceTitle = getBookingServiceTitle(resolveBookingServiceType(booking.serviceType, booking.amount))
  const replyTo = isValidPublicEmail(booking.email) ? booking.email : undefined
  const videoBlock = payload.videoUrl
    ? `<p><strong>Nagranie MP4:</strong> <a href="${escapeHtml(payload.videoUrl)}">${escapeHtml(payload.videoUrl)}</a></p>`
    : ''
  const linkBlock = payload.linkUrl
    ? `<p><strong>Link klienta:</strong> <a href="${escapeHtml(payload.linkUrl)}">${escapeHtml(payload.linkUrl)}</a></p>`
    : ''
  const notesBlock = payload.notes
    ? `<p><strong>Krótki opis:</strong><br />${formatMultilineHtml(payload.notes)}</p>`
    : ''

  const subject = `[Materiały] ${booking.ownerName} - ${formatDateTimeLabel(booking.bookingDate, booking.bookingTime)}`
  const html = renderEmailShell(
    'Klient dodał materiały przed rozmową',
    `Zmienione pola: ${changedLabels}.`,
    `
      <p><strong>Termin:</strong> ${formatDateTimeLabel(booking.bookingDate, booking.bookingTime)}</p>
      <p><strong>Usługa:</strong> ${escapeHtml(serviceTitle)}</p>
      <p><strong>Temat:</strong> ${getProblemLabel(booking.problemType)}</p>
      <p><strong>Klient:</strong> ${escapeHtml(booking.ownerName)} | <a href="mailto:${escapeHtml(booking.email)}">${escapeHtml(booking.email)}</a></p>
      ${videoBlock}
      ${linkBlock}
      ${notesBlock}
      <p><strong>Link do rozmowy:</strong> <a href="${escapeHtml(booking.meetingUrl)}">${escapeHtml(booking.meetingUrl)}</a></p>
    `,
    'To są materiały pomocnicze do przygotowania rozmowy, nie konsultacja wideo.',
  )
  const text = [
    'Klient dodał materiały przed rozmową.',
    `Zmienione pola: ${changedLabels}`,
    `Termin: ${formatDateTimeLabel(booking.bookingDate, booking.bookingTime)}`,
    `Usługa: ${serviceTitle}`,
    `Temat: ${getProblemLabel(booking.problemType)}`,
    `Klient: ${booking.ownerName} | ${booking.email}`,
    payload.videoUrl ? `Nagranie MP4: ${payload.videoUrl}` : null,
    payload.linkUrl ? `Link klienta: ${payload.linkUrl}` : null,
    payload.notes ? `Krótki opis: ${payload.notes}` : null,
    `Link do rozmowy: ${booking.meetingUrl}`,
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n')

  return deliverEmail({ to: recipient, subject, html, text, replyTo }, 'internal')
}

export async function sendBookingManualPaymentPendingEmail(
  booking: BookingRecord,
  accessToken?: string | null,
): Promise<DeliveryResult> {
  const summary = buildBookingSummary(booking)
  const paymentReference = booking.paymentReference ?? booking.id
  const confirmationUrl = buildBookingViewerUrl('/confirmation', booking.id, accessToken)
  const subject = `Wpłata zgłoszona - czekamy na potwierdzenie - ${EMAIL_BRAND_NAME} - ${summary}`
  const intro = 'Dostałem zgłoszenie wpłaty ręcznej. Sprawdzę je do 15 minut.'
  const facts = [
    {
      label: 'Termin',
      htmlValue: escapeHtml(formatDateTimeLabel(booking.bookingDate, booking.bookingTime)),
      textValue: formatDateTimeLabel(booking.bookingDate, booking.bookingTime),
    },
    {
      label: 'Temat',
      htmlValue: escapeHtml(getProblemLabel(booking.problemType)),
      textValue: getProblemLabel(booking.problemType),
    },
    {
      label: 'Kwota',
      htmlValue: escapeHtml(formatPricePln(booking.amount)),
      textValue: formatPricePln(booking.amount),
    },
    {
      label: 'Tytuł wpłaty',
      htmlValue: escapeHtml(paymentReference),
      textValue: paymentReference,
    },
    {
      label: 'Następny krok',
      htmlValue: escapeHtml('Po akceptacji dostaniesz mail z linkiem do pokoju rozmowy.'),
      textValue: 'Po akceptacji dostaniesz mail z linkiem do pokoju rozmowy.',
    },
  ]
  const outro = 'Do czasu potwierdzenia status rezerwacji pozostaje na stronie potwierdzenia.'
  const email = buildBookingCustomerEmail(
    booking,
    subject,
    'Wpłata jest w weryfikacji',
    intro,
    facts,
    outro,
    { href: confirmationUrl, label: 'Zobacz stronę rezerwacji' },
  )

  return deliverEmail(email, 'customer')
}

export async function sendBookingStatusOutcomeEmail(booking: BookingRecord): Promise<DeliveryResult> {
  const summary = buildBookingSummary(booking)
  const outcome =
    booking.paymentStatus === 'refunded'
      ? {
          subject: `Rezerwacja anulowana - ${EMAIL_BRAND_NAME} - ${summary}`,
          title: 'Rezerwacja została anulowana',
          intro: 'Zwrot został uruchomiony, a termin wrócił do kalendarza.',
          statusLabel: 'Zwrot',
          reasonLabel: 'Powód',
          nextStep: 'Jeśli chcesz wrócić do konsultacji, wybierz nowy termin albo napisz wiadomość.',
        }
      : booking.paymentStatus === 'rejected'
        ? {
            subject: `Wpłata nie została potwierdzona - ${EMAIL_BRAND_NAME} - ${summary}`,
            title: 'Wpłata nie została potwierdzona',
            intro: 'Nie udało się potwierdzić wpłaty, więc termin wrócił do kalendarza.',
            statusLabel: 'Status',
            reasonLabel: 'Powód',
            nextStep: 'Jeśli chcesz wrócić do konsultacji, wybierz nowy termin albo napisz wiadomość.',
          }
        : booking.paymentStatus === 'failed'
          ? {
              subject: `Płatność nie została dokończona - ${EMAIL_BRAND_NAME} - ${summary}`,
              title: 'Płatność nie została dokończona',
              intro: 'Płatność online nie została zakończona i termin wrócił do kalendarza.',
              statusLabel: 'Status',
              reasonLabel: 'Powód',
              nextStep: 'Jeśli chcesz wrócić do konsultacji, wybierz nowy termin albo napisz wiadomość.',
            }
          : {
              subject: `Rezerwacja wygasła - ${EMAIL_BRAND_NAME} - ${summary}`,
              title: 'Rezerwacja wygasła',
              intro: 'Czas na potwierdzenie minął, więc termin wrócił do kalendarza.',
              statusLabel: 'Status',
              reasonLabel: 'Powód',
              nextStep: 'Jeśli chcesz wrócić do konsultacji, wybierz nowy termin albo napisz wiadomość.',
            }

  const facts: BookingEmailFact[] = [
    {
      label: 'Termin',
      htmlValue: escapeHtml(formatDateTimeLabel(booking.bookingDate, booking.bookingTime)),
      textValue: formatDateTimeLabel(booking.bookingDate, booking.bookingTime),
    },
    {
      label: 'Temat',
      htmlValue: escapeHtml(getProblemLabel(booking.problemType)),
      textValue: getProblemLabel(booking.problemType),
    },
    {
      label: outcome.statusLabel,
      htmlValue: escapeHtml(booking.paymentStatus),
      textValue: booking.paymentStatus,
    },
  ]

  if (booking.paymentRejectedReason) {
    facts.push({
      label: outcome.reasonLabel,
      htmlValue: escapeHtml(booking.paymentRejectedReason),
      textValue: booking.paymentRejectedReason,
    })
  }

  facts.push({
    label: 'Następny krok',
    htmlValue: escapeHtml(outcome.nextStep),
    textValue: outcome.nextStep,
  })

  const email = buildBookingCustomerEmail(booking, outcome.subject, outcome.title, outcome.intro, facts, 'Możesz wrócić do rezerwacji w dowolnym momencie.')

  return deliverEmail(email, 'customer')
}

export async function sendManualPaymentReportedAdminEmail(
  booking: BookingRecord,
  links: ManualPaymentReviewLinks,
): Promise<DeliveryResult> {
  const recipient = getAdminNotificationRecipientEmail()
  const customerEmailStatus = getCustomerEmailDeliveryStatus(booking.email)

  if (!recipient) {
    return {
      status: 'skipped',
      reason: 'ADMIN_NOTIFICATION_EMAIL missing',
    }
  }

  const calendarUrl = buildGoogleCalendarUrl(booking)
  const subject = `Płatność do potwierdzenia do 15 min - ${EMAIL_BRAND_NAME} - ${buildBookingSummary(booking)}`
  const html = renderEmailShell(
    'Wpłata czeka na decyzję',
    'Klient kliknął "Zrobiłem płatność". Sprawdź wpływ i kliknij właściwą decyzję.',
    `
      <p><strong>Booking ID:</strong> ${escapeHtml(booking.id)}</p>
      <p><strong>Tytuł płatności:</strong> ${escapeHtml(booking.paymentReference ?? booking.id)}</p>
      <p><strong>Termin:</strong> ${formatDateTimeLabel(booking.bookingDate, booking.bookingTime)}</p>
      <p><strong>Temat:</strong> ${getProblemLabel(booking.problemType)}</p>
      <p><strong>Kwota:</strong> ${formatPricePln(booking.amount)}</p>
      <p><strong>Klient:</strong> ${escapeHtml(booking.ownerName)} | <a href="mailto:${escapeHtml(booking.email)}">${escapeHtml(booking.email)}</a> | ${escapeHtml(booking.phone)}</p>
      <p><strong>Opis:</strong> ${formatMultilineHtml(booking.description)}</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:20px;">
        <a href="${links.approveUrl}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#0a5c36;color:#ffffff;text-decoration:none;font-weight:700;">Jest wpłata — potwierdź i otwórz pokój</a>
        <a href="${links.rejectUrl}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#8a3022;color:#ffffff;text-decoration:none;font-weight:700;">Nie ma wpłaty</a>
        <a href="${escapeHtml(calendarUrl)}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#1a56b0;color:#ffffff;text-decoration:none;font-weight:700;">Dodaj do Google Calendar</a>
      </div>
    `,
    customerEmailStatus.state !== 'ready'
      ? 'Po potwierdzeniu klient od razu zobaczy aktywne potwierdzenie i pokój na swojej stronie rezerwacji. Wysyłka maili do innych adresów ruszy po weryfikacji domeny nadawcy w Resend.'
      : 'Po potwierdzeniu klient automatycznie dostanie mail z linkiem do pokoju rozmowy, a przy braku wpłaty wróci do płatności.',
  )
  const text = [
    'Płatność czeka na potwierdzenie do 15 min.',
    `Booking ID: ${booking.id}`,
    `Tytuł płatności: ${booking.paymentReference ?? booking.id}`,
    `Termin: ${formatDateTimeLabel(booking.bookingDate, booking.bookingTime)}`,
    `Temat: ${getProblemLabel(booking.problemType)}`,
    `Kwota: ${formatPricePln(booking.amount)}`,
    `Klient: ${booking.ownerName} | ${booking.email} | ${booking.phone}`,
    `Opis: ${booking.description}`,
    `Jest wpłata: ${links.approveUrl}`,
    `Nie ma wpłaty: ${links.rejectUrl}`,
    `Dodaj do Google Calendar: ${calendarUrl}`,
  ].join('\n')

  return deliverEmail({ to: recipient, subject, html, text }, 'internal')
}

export async function sendBookingReminderEmail(booking: BookingRecord): Promise<DeliveryResult> {
  const subject = `Przypomnienie: konsultacja ${EMAIL_BRAND_NAME} startuje za mniej niż godzinę`
  const html = renderEmailShell(
    'Przypomnienie o konsultacji',
    'Za mniej niż godzinę startuje Twoja rozmowa. Warto wejść chwilę wcześniej, żeby zacząć spokojnie i bez pośpiechu.',
    `
      <p><strong>Termin:</strong> ${formatDateTimeLabel(booking.bookingDate, booking.bookingTime)}</p>
      <p><strong>Temat:</strong> ${getProblemLabel(booking.problemType)}</p>
      <p><strong>Link do rozmowy:</strong> <a href="${booking.meetingUrl}">${booking.meetingUrl}</a></p>
      <p><strong>Przed rozmową:</strong> przygotuj 2-3 najważniejsze pytania i najkrótszy możliwy opis problemu.</p>
      ${renderContactBlockHtml()}
    `,
    'Do usłyszenia. To będzie krótka rozmowa, ale z konkretnym kierunkiem działania.',
  )
  const text = [
    `Przypomnienie o konsultacji ${EMAIL_BRAND_NAME}.`,
    `Termin: ${formatDateTimeLabel(booking.bookingDate, booking.bookingTime)}`,
    `Temat: ${getProblemLabel(booking.problemType)}`,
    `Link do rozmowy: ${booking.meetingUrl}`,
    'Przed rozmową przygotuj 2-3 najważniejsze pytania i najkrótszy możliwy opis problemu.',
    renderContactBlockText(),
  ].join('\n')

  return deliverEmail({ to: booking.email, subject, html, text }, 'customer')
}

export async function sendTestimonialSubmissionEmail(submission: TestimonialSubmission): Promise<DeliveryResult> {
  const recipient = getNotificationRecipientEmail()
  const configIssue = getTestimonialSubmissionConfigIssue()

  if (!recipient || configIssue) {
    return {
      status: 'skipped',
      reason: configIssue ?? 'public contact email missing or invalid',
    }
  }

  const subject = `Nowe zgłoszenie opinii do weryfikacji - ${EMAIL_BRAND_NAME} - ${submission.displayName}`
  const photoBlock = submission.photoUrl
    ? `<p><strong>Link do zdjęcia:</strong> <a href="${escapeHtml(submission.photoUrl)}">${escapeHtml(submission.photoUrl)}</a></p>`
    : '<p><strong>Link do zdjęcia:</strong> klient nie dodał linku.</p>'
  const html = renderEmailShell(
    'Nowa opinia czeka na weryfikację',
    'Klient wysłał opinię przez formularz na stronie. Wpis nie jest jeszcze opublikowany.',
    `
      <p><strong>Imię do publikacji:</strong> ${escapeHtml(submission.displayName)}</p>
      <p><strong>Email do kontaktu:</strong> <a href="mailto:${escapeHtml(submission.email)}">${escapeHtml(submission.email)}</a></p>
      <p><strong>Kategoria problemu:</strong> ${escapeHtml(submission.issueCategory)}</p>
      <p><strong>Treść opinii:</strong><br />${formatMultilineHtml(submission.opinion)}</p>
      <p><strong>Co się zmieniło:</strong><br />${formatMultilineHtml(submission.beforeAfter)}</p>
      ${photoBlock}
      <p><strong>Status:</strong> wpis nadal wymaga ręcznej akceptacji i ręcznego dodania do statycznej listy opinii.</p>
    `,
    'Po akceptacji zapisz zdjęcie lokalnie i dopisz nowy wpis do lib/testimonials.ts przed kolejnym deployem.',
  )
  const text = [
    'Nowa opinia czeka na weryfikację. Wpis nie jest jeszcze opublikowany.',
    `Imię do publikacji: ${submission.displayName}`,
    `Email do kontaktu: ${submission.email}`,
    `Kategoria problemu: ${submission.issueCategory}`,
    `Treść opinii: ${submission.opinion}`,
    `Co się zmieniło: ${submission.beforeAfter}`,
    `Link do zdjęcia: ${submission.photoUrl || 'brak'}`,
    'Status: wpis nadal wymaga ręcznej akceptacji i ręcznego dodania do statycznej listy opinii.',
  ].join('\n')

  return deliverEmail({ to: recipient, subject, html, text }, 'internal')
}

export type OpinionSubmission = {
  displayName: string
  species: 'pies' | 'kot'
  topic: string
  opinion: string
  consentPublish: boolean
}

export async function sendOpinionSubmissionEmail(submission: OpinionSubmission): Promise<DeliveryResult> {
  const recipient = getNotificationRecipientEmail()

  if (!recipient) {
    return {
      status: 'skipped',
      reason: 'public contact email missing or invalid',
    }
  }

  const speciesLabel = submission.species === 'kot' ? 'Kot' : 'Pies'
  const subject = `Nowa opinia do ręcznej akceptacji - ${EMAIL_BRAND_NAME} - ${submission.displayName}`
  const html = renderEmailShell(
    'Nowa opinia do sprawdzenia',
    'Klient wysłał opinię przez ukryty formularz po konsultacji. To nie jest jeszcze wpis publikowany.',
    `
      <p><strong>Imię lub inicjały:</strong> ${escapeHtml(submission.displayName)}</p>
      <p><strong>Gatunek:</strong> ${escapeHtml(speciesLabel)}</p>
      <p><strong>Temat:</strong> ${escapeHtml(submission.topic)}</p>
      <p><strong>Zgoda na publikację:</strong> ${submission.consentPublish ? 'tak' : 'nie'}</p>
      <p><strong>Treść opinii:</strong><br />${formatMultilineHtml(submission.opinion)}</p>
      <p><strong>Status:</strong> wpis czeka na ręczną akceptację i dodanie do publicznej listy opinii.</p>
    `,
    'Po akceptacji dodaj wpis ręcznie do publicznej listy opinii przed kolejnym publikowaniem strony.',
  )
  const text = [
    'Nowa opinia do ręcznej akceptacji.',
    `Imię lub inicjały: ${submission.displayName}`,
    `Gatunek: ${speciesLabel}`,
    `Temat: ${submission.topic}`,
    `Zgoda na publikację: ${submission.consentPublish ? 'tak' : 'nie'}`,
    `Treść opinii: ${submission.opinion}`,
    'Status: wpis czeka na ręczną akceptację i dodanie do publicznej listy opinii.',
    'Po akceptacji dodaj wpis ręcznie do publicznej listy opinii przed kolejnym publikowaniem strony.',
  ].join('\n')

  return deliverEmail({ to: recipient, subject, html, text }, 'internal')
}

type UrgentNowSubmission = {
  requestId: string
  name: string
  email: string
  phone?: string | null
  topic: string
  species: string
  message: string
  requestedDate?: string | null
  requestedTime?: string | null
  requestedSlotsSummary?: string | null
}

export async function sendUrgentNowCustomerAckEmail(submission: UrgentNowSubmission): Promise<DeliveryResult> {
  const recipient = submission.email.trim()

  if (!isValidPublicEmail(recipient)) {
    return { status: 'skipped', reason: 'customer email missing or invalid' }
  }

  const subject = 'Kwadrans na już - dostałem Twoją prośbę, odpiszę w 15 minut'
  const html = renderEmailShell(
    `Cześć ${escapeHtml(submission.name.split(' ')[0])}, dostałem Twoją prośbę o Kwadrans na już.`,
    'Odpiszę na ten adres e-mail w ciągu 15 minut z konkretną godziną albo najbliższym realnym terminem i linkiem do płatności.',
    `
      <p><strong>Temat:</strong> ${escapeHtml(submission.topic)}</p>
      ${submission.requestedSlotsSummary ? `<p><strong>Wybrane godziny:</strong> ${escapeHtml(submission.requestedSlotsSummary)}</p>` : ''}
      <p>Jeśli coś się zmieni albo zechcesz doprecyzować temat, po prostu odpowiedz na tego maila.</p>
      ${renderContactBlockHtml()}
    `,
    'Poczekaj chwilę — wrócę z godziną i dalszym krokiem płatności.',
  )
  const text = [
    `Cześć ${submission.name.split(' ')[0]},`,
    '',
    'Dostałem Twoją prośbę o Kwadrans na już. Odpiszę w ciągu 15 minut z konkretną godziną albo najbliższym realnym terminem i linkiem do płatności.',
    '',
    `Temat: ${submission.topic}`,
    submission.requestedSlotsSummary ? `Wybrane godziny: ${submission.requestedSlotsSummary}` : null,
    '',
    'Jeśli coś się zmieni, po prostu odpowiedz na tego maila.',
    renderContactBlockText(),
  ]
    .filter((line): line is string => typeof line === 'string')
    .join('\n')

  return deliverEmail(
    { to: recipient, subject, html, text, replyTo: getPublicContactDetails().email ?? undefined },
    'customer',
  )
}

export async function sendUrgentNowAdminAlertEmail(submission: UrgentNowSubmission): Promise<DeliveryResult> {
  const recipient = getAdminNotificationRecipientEmail()

  if (!recipient) {
    return { status: 'skipped', reason: 'admin email missing or invalid' }
  }

  const replyTo = isValidPublicEmail(submission.email) ? submission.email : undefined
  const phoneBlock = submission.phone ? `<p><strong>Telefon:</strong> ${escapeHtml(submission.phone)}</p>` : ''
  const preferredBlock =
    submission.requestedSlotsSummary
      ? `<p><strong>Wybrane godziny klienta:</strong> ${escapeHtml(submission.requestedSlotsSummary)}</p>`
      : ''
  const adminConfirmHref = buildAbsoluteUrl(`/admin/urgent-confirm/${submission.requestId}`)
  const subject = `KWADRANS NA JUZ: ${submission.name} - ${submission.topic} [ID: ${submission.requestId.slice(0, 8)}]`
  const html = renderEmailShell(
    'Nowe zgłoszenie Kwadrans na już',
    'Klient czeka na odpowiedź w ciągu 15 minut. Wybierz godzinę na dziś albo podaj najbliższy realny termin.',
    `
      <p><strong>Imię:</strong> ${escapeHtml(submission.name)}</p>
      <p><strong>E-mail:</strong> ${replyTo ? `<a href="mailto:${escapeHtml(submission.email)}">${escapeHtml(submission.email)}</a>` : escapeHtml(submission.email)}</p>
      ${phoneBlock}
      <p><strong>Gatunek:</strong> ${escapeHtml(submission.species)}</p>
      <p><strong>Temat:</strong> ${escapeHtml(submission.topic)}</p>
      ${preferredBlock}
      <p><strong>Opis:</strong><br />${formatMultilineHtml(submission.message)}</p>
      <p><strong>ID prośby:</strong> ${escapeHtml(submission.requestId)}</p>
      ${renderEmailActionButton({ href: adminConfirmHref, label: 'Wybierz godzinę i wyślij link do płatności' })}
    `,
    'Po zatwierdzeniu system utworzy rezerwację Kwadransu na już i wyśle klientowi link do płatności.',
  )
  const text = [
    'KWADRANS NA JUZ - nowe zgłoszenie.',
    `Imię: ${submission.name}`,
    `E-mail: ${submission.email}`,
    submission.phone ? `Telefon: ${submission.phone}` : null,
    `Gatunek: ${submission.species}`,
    `Temat: ${submission.topic}`,
    submission.requestedSlotsSummary ? `Wybrane godziny klienta: ${submission.requestedSlotsSummary}` : null,
    `Opis: ${submission.message}`,
    `ID prośby: ${submission.requestId}`,
    `Wybierz godzinę i wyślij link do płatności: ${adminConfirmHref}`,
  ]
    .filter((line): line is string => typeof line === 'string')
    .join('\n')

  return deliverEmail({ to: recipient, subject, html, text, replyTo }, 'internal')
}

export type ClientTestimonialSubmission = {
  id: string
  displayName: string
  email: string
  issueCategory: string
  opinion: string
  photoUrl: string | null
  photoLabel?: string | null
  photoAttachment?: EmailAttachment | null
}

export async function sendClientTestimonialNotificationEmail(
  submission: ClientTestimonialSubmission,
): Promise<DeliveryResult> {
  const recipient = getAdminNotificationRecipientEmail()
  if (!recipient) {
    return {
      status: 'skipped',
      reason: 'ADMIN_NOTIFICATION_EMAIL missing',
    }
  }

  const baseUrl = getBaseUrl()
  const publishUrl = `${baseUrl}/api/admin/testimonials/${submission.id}?action=publish`
  const skipUrl = `${baseUrl}/api/admin/testimonials/${submission.id}?action=skip`

  const subject = `Nowa opinia od klienta - ${submission.displayName}`
  const hasPhotoLink = submission.photoUrl ? /^https?:\/\//i.test(submission.photoUrl) : false
  const photoLabel = submission.photoLabel ?? submission.photoUrl
  const photoBlock = submission.photoAttachment
    ? `<p><strong>Zdjęcie:</strong> załącznik ${escapeHtml(photoLabel ?? submission.photoAttachment.filename)}</p>`
    : submission.photoUrl
      ? hasPhotoLink
        ? `<p><strong>Zdjęcie:</strong> <a href="${escapeHtml(submission.photoUrl)}">${escapeHtml(submission.photoUrl)}</a></p>`
        : `<p><strong>Zdjęcie:</strong> ${escapeHtml(submission.photoUrl)}</p>`
      : '<p><strong>Zdjęcie:</strong> brak</p>'

  const html = renderEmailShell(
    'Nowa opinia od klienta',
    'Klient wysłał opinię przez prywatny formularz. Zatwierdź lub odłóż poniżej.',
    `
      <p><strong>Imię do publikacji:</strong> ${escapeHtml(submission.displayName)}</p>
      <p><strong>Email:</strong> <a href="mailto:${escapeHtml(submission.email)}">${escapeHtml(submission.email)}</a></p>
      <p><strong>Kategoria:</strong> ${escapeHtml(submission.issueCategory)}</p>
      <p><strong>Treść opinii:</strong><br />${formatMultilineHtml(submission.opinion)}</p>
      ${photoBlock}
      <div style="margin:28px 0 8px;display:flex;gap:12px;">
        <a href="${escapeHtml(publishUrl)}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#1f7a1f;color:#ffffff;text-decoration:none;font-weight:700;margin-right:12px;">
          Opublikuj opinię
        </a>
        <a href="${escapeHtml(skipUrl)}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#7a3a1f;color:#ffffff;text-decoration:none;font-weight:700;">
          Odłóż (zostaje w panelu)
        </a>
      </div>
      <p style="font-size:13px;color:#6b625b;">Linki wymagają autoryzacji admina. Po kliknięciu trzeba podać hasło.</p>
    `,
    'Opinia czeka w panelu /admin/opinie do momentu zatwierdzenia.',
  )

  const text = [
    'Nowa opinia od klienta czeka na zatwierdzenie.',
    `Imię: ${submission.displayName}`,
    `Email: ${submission.email}`,
    `Kategoria: ${submission.issueCategory}`,
    `Treść: ${submission.opinion}`,
    `Zdjęcie: ${photoLabel ?? 'brak'}`,
    '',
    `Opublikuj: ${publishUrl}`,
    `Odłóż: ${skipUrl}`,
  ].join('\n')

  const attachments = submission.photoAttachment ? [submission.photoAttachment] : undefined
  const replyTo = isValidPublicEmail(submission.email) ? submission.email : undefined

  return deliverEmail({ to: recipient, subject, html, text, replyTo, attachments }, 'internal')
}

// ── /materialy funnel ───────────────────────────────────────────────────────
// Notifications for the new low-friction PDF funnel that uses BLIK + manual
// confirmation. Two flows: (1) free lead-magnet — code is generated immediately
// and sent to the customer; (2) paid order — owner gets a "to confirm" mail,
// then after manual confirmation the customer receives the unlock code.

export type MaterialyOrderEmailPayload = {
  orderId: string
  productKind: 'guide' | 'bundle'
  productSlug: string
  productTitle: string
  priceLabel: string
  priceAmount: number
  customerName: string
  customerEmail: string
  customerPhone?: string | null
  notes?: string | null
}

export async function sendMaterialyOrderOwnerEmail(payload: MaterialyOrderEmailPayload): Promise<DeliveryResult> {
  const recipient = getAdminNotificationRecipientEmail()
  if (!recipient) return { status: 'skipped', reason: 'public contact email missing or invalid' }

  const replyTo = isValidPublicEmail(payload.customerEmail) ? payload.customerEmail : undefined
  const isBundle = payload.productKind === 'bundle'
  const isFree = payload.priceAmount === 0
  const subject = isFree
    ? `Materiały: nowy lead - ${payload.productTitle}`
    : `Materiały: zamówienie ${payload.orderId} - ${payload.productTitle} (${payload.priceLabel})`

  const phoneBlock = payload.customerPhone
    ? `<p><strong>Telefon:</strong> ${escapeHtml(payload.customerPhone)}</p>`
    : ''
  const notesBlock = payload.notes
    ? `<p><strong>Wiadomość:</strong><br />${formatMultilineHtml(payload.notes)}</p>`
    : ''

  const intro = isFree
    ? 'Klient pobrał darmowy materiał. Kod do pobrania został już wysłany automatycznie. To powiadomienie tylko do listy mailingowej i statystyk.'
    : `Klient zamówił ${isBundle ? 'pakiet' : 'pojedynczy PDF'}. Po wpływie BLIK potwierdź zamówienie w panelu admina (lub przez API confirm), aby system wysłał klientowi kod do pobrania.`

  const html = renderEmailShell(
    isFree ? 'Nowy lead PDF (bezpłatny)' : 'Nowe zamówienie PDF',
    intro,
    `
      <p><strong>Order ID:</strong> <code>${escapeHtml(payload.orderId)}</code></p>
      <p><strong>Produkt:</strong> ${escapeHtml(payload.productTitle)} ${isBundle ? '(pakiet)' : ''}</p>
      <p><strong>Slug:</strong> ${escapeHtml(payload.productSlug)}</p>
      <p><strong>Cena:</strong> ${escapeHtml(payload.priceLabel)}</p>
      <p><strong>Imię:</strong> ${escapeHtml(payload.customerName)}</p>
      <p><strong>E-mail:</strong> ${replyTo ? `<a href="mailto:${escapeHtml(payload.customerEmail)}">${escapeHtml(payload.customerEmail)}</a>` : escapeHtml(payload.customerEmail)}</p>
      ${phoneBlock}
      ${notesBlock}
    `,
    isFree
      ? 'Materiał wysłany automatycznie. Możesz dodać kontakt do listy nurturingowej.'
      : 'Po BLIK na podany w polu nadawcy numer wykonaj POST /api/materialy/confirm z nagłówkiem x-admin-secret i body { orderId }, lub potwierdź w panelu admina.',
  )

  const lines = [
    isFree ? 'Nowy lead PDF (darmowy).' : 'Nowe zamówienie PDF.',
    `Order ID: ${payload.orderId}`,
    `Produkt: ${payload.productTitle}${isBundle ? ' (pakiet)' : ''}`,
    `Slug: ${payload.productSlug}`,
    `Cena: ${payload.priceLabel}`,
    `Imię: ${payload.customerName}`,
    `E-mail: ${payload.customerEmail}`,
    payload.customerPhone ? `Telefon: ${payload.customerPhone}` : null,
    payload.notes ? `Wiadomość: ${payload.notes}` : null,
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n')

  return deliverEmail({ to: recipient, subject, html, text: lines, replyTo }, 'internal')
}

export async function sendMaterialyOrderPendingCustomerEmail(payload: MaterialyOrderEmailPayload, blikPhone: string): Promise<DeliveryResult> {
  const recipient = payload.customerEmail.trim()
  if (!isValidPublicEmail(recipient)) return { status: 'skipped', reason: 'customer contact email missing or invalid' }

  const subject = `Zamówienie ${payload.orderId}: jak opłacić i odebrać PDF`
  const html = renderEmailShell(
    `Cześć ${escapeHtml(payload.customerName)}, dostałem Twoje zamówienie.`,
    'Wystarczy zrobić szybki BLIK i wyślę Ci kod do pobrania PDF. To proces ręczny - kod przychodzi do 60 minut w godzinach 8-18 (pon-pt). Poza tymi godzinami w następny dzień roboczy.',
    `
      <p><strong>Numer zamówienia:</strong> <code>${escapeHtml(payload.orderId)}</code></p>
      <p><strong>Produkt:</strong> ${escapeHtml(payload.productTitle)}</p>
      <p><strong>Kwota:</strong> ${escapeHtml(payload.priceLabel)}</p>
      <h2 style="font-size:16px;margin-top:24px;">Jak opłacić</h2>
      <p>Wykonaj BLIK <strong>na numer telefonu:</strong> <code>${escapeHtml(blikPhone)}</code></p>
      <p><strong>Tytuł przelewu:</strong> ${escapeHtml(payload.orderId)}</p>
      <p>(Możesz też zrobić zwykły przelew z tym samym tytułem na konto, które podam w odpowiedzi mailowej, jeśli nie korzystasz z BLIKa.)</p>
      <h2 style="font-size:16px;margin-top:24px;">Co dalej</h2>
      <p>Po zaksięgowaniu wpłaty wyślę Ci e-mail z 6-cyfrowym kodem. Kod wpisujesz na stronie <a href="https://regulskibehawiorysta.pl/materialy/pobranie">regulskibehawiorysta.pl/materialy/pobranie</a> i pobierasz PDF.</p>
      <p>Kod jest ważny 72 godziny.</p>
    `,
    'Jeśli zamówienie wymaga zmiany albo dane się nie zgadzają, odpowiedz na ten e-mail.',
  )
  const text = [
    `Cześć ${payload.customerName},`,
    `Numer zamówienia: ${payload.orderId}`,
    `Produkt: ${payload.productTitle}`,
    `Kwota: ${payload.priceLabel}`,
    '',
    `BLIK na numer: ${blikPhone}`,
    `Tytuł: ${payload.orderId}`,
    '',
    'Po zaksięgowaniu wyślemy Ci kod do pobrania mailem.',
    'Strona pobrania: https://regulskibehawiorysta.pl/materialy/pobranie',
  ].join('\n')

  return deliverEmail({ to: recipient, subject, html, text }, 'customer')
}

export async function sendMaterialyCodeCustomerEmail(payload: MaterialyOrderEmailPayload, code: string, expiresAt: string): Promise<DeliveryResult> {
  const recipient = payload.customerEmail.trim()
  if (!isValidPublicEmail(recipient)) return { status: 'skipped', reason: 'customer contact email missing or invalid' }

  const expiresLabel = new Date(expiresAt).toLocaleString('pl-PL', { dateStyle: 'long', timeStyle: 'short' })
  const isFree = payload.priceAmount === 0
  const subject = isFree
    ? `Twój bezpłatny materiał: ${payload.productTitle}`
    : `Kod do pobrania: ${payload.productTitle}`

  const html = renderEmailShell(
    isFree
      ? `Cześć ${escapeHtml(payload.customerName)}, oto Twój bezpłatny materiał.`
      : `Cześć ${escapeHtml(payload.customerName)}, dostałem Twoją wpłatę. Oto kod.`,
    isFree
      ? 'Materiał jest darmowy. Kod poniżej działa tak samo jak przy zamówieniach płatnych.'
      : 'Wpisz poniższy kod razem z e-mailem na stronie pobrania, żeby otworzyć PDF.',
    `
      <p><strong>Numer zamówienia:</strong> <code>${escapeHtml(payload.orderId)}</code></p>
      <p><strong>Produkt:</strong> ${escapeHtml(payload.productTitle)}</p>
      <p style="margin-top:24px;"><strong>Kod do pobrania:</strong></p>
      <p style="font-size:28px;letter-spacing:6px;font-weight:700;background:#f0e5d6;padding:16px 24px;border-radius:6px;display:inline-block;">${escapeHtml(code)}</p>
      <p style="margin-top:24px;"><strong>Strona pobrania:</strong><br /><a href="https://regulskibehawiorysta.pl/materialy/pobranie">regulskibehawiorysta.pl/materialy/pobranie</a></p>
      <p><strong>Ważny do:</strong> ${escapeHtml(expiresLabel)}.</p>
    `,
    'Materiał wyłącznie do użytku własnego, bez prawa dalszej dystrybucji.',
  )
  const text = [
    `Cześć ${payload.customerName},`,
    `Numer zamówienia: ${payload.orderId}`,
    `Produkt: ${payload.productTitle}`,
    '',
    `Kod do pobrania: ${code}`,
    `Strona pobrania: https://regulskibehawiorysta.pl/materialy/pobranie`,
    `Ważny do: ${expiresLabel}.`,
  ].join('\n')

  return deliverEmail({ to: recipient, subject, html, text }, 'customer')
}



export type LeadBookingConfirmedPayload = {
  name: string
  email: string
  serviceLabel: string
  confirmedDate: string
  confirmedTime: string
  callRoomUrl: string
  calendarUrl?: string | null
}

export async function sendLeadBookingConfirmedEmail(payload: LeadBookingConfirmedPayload): Promise<DeliveryResult> {
  const recipient = payload.email.trim()
  if (!isValidPublicEmail(recipient)) {
    return { status: 'skipped', reason: 'customer email missing or invalid' }
  }

  const subject = `Potwierdzona konsultacja: ${payload.serviceLabel} - ${payload.confirmedDate} ${payload.confirmedTime}`
  const calendarBlock = payload.calendarUrl
    ? renderEmailActionButton({ href: payload.calendarUrl, label: 'Dodaj do kalendarza Google' })
    : ''

  const html = renderEmailShell(
    `Cześć ${escapeHtml(payload.name)}, konsultacja potwierdzona!`,
    'Płatność dotarła. Poniżej znajdziesz termin i link do pokoju rozmowy.',
    `
      <p><strong>Usługa:</strong> ${escapeHtml(payload.serviceLabel)}</p>
      <p><strong>Data i godzina:</strong> ${escapeHtml(payload.confirmedDate)} o ${escapeHtml(payload.confirmedTime)}</p>
      <p><strong>Link do rozmowy:</strong> <a href="${escapeHtml(payload.callRoomUrl)}">${escapeHtml(payload.callRoomUrl)}</a></p>
      <p>Połączenie jest audio (bez kamery). Wejdź na powyższy link o ustalonej porze - bez instalacji, bezpośrednio w przeglądarce.</p>
      ${calendarBlock}
    `,
    'Jeśli masz pytania przed konsultacją, odpisz na tego maila.',
  )

  const text = [
    `Cześć ${payload.name}, konsultacja potwierdzona!`,
    '',
    `Usługa: ${payload.serviceLabel}`,
    `Data i godzina: ${payload.confirmedDate} o ${payload.confirmedTime}`,
    `Link do rozmowy: ${payload.callRoomUrl}`,
    payload.calendarUrl ? `Dodaj do kalendarza: ${payload.calendarUrl}` : '',
    '',
    'Jeśli masz pytania przed konsultacją, odpisz na tego maila.',
  ].filter(Boolean).join('\n')

  return deliverEmail({ to: recipient, subject, html, text }, 'customer')
}

export async function sendCommerceManualPaymentReportedAdminEmail(
  order: CommerceOrder,
  links: { approveUrl: string; rejectUrl?: string | null },
): Promise<DeliveryResult> {
  const recipient = getAdminNotificationRecipientEmail()
  const replyTo = isValidPublicEmail(order.customerEmail) ? order.customerEmail : undefined

  if (!recipient) {
    return {
      status: 'skipped',
      reason: 'ADMIN_NOTIFICATION_EMAIL missing',
    }
  }

  const subject = `Potwierdzenie płatności BLIK - ${order.orderNumber}`
  const createdLabel = new Date(order.createdAt).toLocaleString('pl-PL', { dateStyle: 'long', timeStyle: 'short' })
  const rejectButton = links.rejectUrl
    ? renderEmailActionButton({ href: links.rejectUrl, label: 'Odrzuć płatność' })
    : ''

  const html = renderEmailShell(
    'Płatność BLIK czeka na potwierdzenie',
    'Klient kliknął "Zapłaciłem/am". Sprawdź wpływ i potwierdź płatność bez logowania.',
    `
      <p><strong>Numer zamówienia:</strong> <code>${escapeHtml(order.orderNumber)}</code></p>
      <p><strong>Produkt:</strong> ${escapeHtml(order.productName)}</p>
      <p><strong>Typ:</strong> ${order.productType === 'consultation' ? 'konsultacja' : 'ebook / materiał cyfrowy'}</p>
      <p><strong>Kwota:</strong> ${escapeHtml(formatPricePln(order.manualAmount))}</p>
      <p><strong>E-mail klienta:</strong> <a href="mailto:${escapeHtml(order.customerEmail)}">${escapeHtml(order.customerEmail)}</a></p>
      <p><strong>Imię:</strong> ${escapeHtml(order.customerName || '-')}</p>
      <p><strong>Data utworzenia:</strong> ${escapeHtml(createdLabel)}</p>
      <p><strong>Metoda płatności:</strong> BLIK na telefon</p>
      ${renderEmailActionButton({ href: links.approveUrl, label: 'Potwierdzam płatność' })}
      ${rejectButton}
    `,
    'Link potwierdzenia jest jednorazowy i przypisany do tego zamówienia.',
  )

  const text = [
    `Potwierdzenie płatności BLIK - ${order.orderNumber}`,
    `Produkt: ${order.productName}`,
    `Kwota: ${formatPricePln(order.manualAmount)}`,
    `E-mail klienta: ${order.customerEmail}`,
    `Imię: ${order.customerName || '-'}`,
    `Data utworzenia: ${createdLabel}`,
    'Metoda płatności: BLIK na telefon',
    `Potwierdzam płatność: ${links.approveUrl}`,
    links.rejectUrl ? `Odrzuć płatność: ${links.rejectUrl}` : '',
  ].filter(Boolean).join('\n')

  return deliverEmail({ to: recipient, subject, html, text, replyTo }, 'internal')
}

export async function sendCommerceAccessCodeCustomerEmail(order: CommerceOrder): Promise<DeliveryResult> {
  const recipient = order.customerEmail.trim()
  if (!isValidPublicEmail(recipient)) {
    return { status: 'skipped', reason: 'customer email missing or invalid' }
  }

  if (!order.accessCode) {
    return { status: 'skipped', reason: 'access code missing' }
  }

  const accessUrl = buildAbsoluteUrl('/dostep')
  const accountUrl = buildAbsoluteUrl(`/login?email=${encodeURIComponent(order.customerEmail)}`)
  const subject = 'Twój kod dostępu'
  const isFreeAccess = order.productType === 'ebook' && order.amount === 0
  const expiresLabel = order.accessCodeExpiresAt
    ? new Date(order.accessCodeExpiresAt).toLocaleString('pl-PL', { dateStyle: 'long', timeStyle: 'short' })
    : null

  const html = renderEmailShell(
    isFreeAccess
      ? `Cześć ${escapeHtml(order.customerName || '')}, dostęp do materiału jest aktywny.`
      : `Cześć ${escapeHtml(order.customerName || '')}, płatność została potwierdzona.`,
    'Poniżej znajdziesz kod dostępu. Wpisz go na stronie dostępu razem z adresem e-mail użytym przy zamówieniu.',
    `
      <p><strong>Numer zamówienia:</strong> <code>${escapeHtml(order.orderNumber)}</code></p>
      <p><strong>Produkt:</strong> ${escapeHtml(order.productName)}</p>
      <p style="margin-top:24px;"><strong>Twój kod dostępu:</strong></p>
      <p style="font-size:28px;letter-spacing:4px;font-weight:700;background:#f0e5d6;padding:16px 24px;border-radius:6px;display:inline-block;">${escapeHtml(order.accessCode)}</p>
      <p style="margin-top:24px;"><strong>Wejdź tutaj:</strong><br /><a href="${escapeHtml(accessUrl)}">${escapeHtml(accessUrl)}</a></p>
      <p>Możesz też utworzyć konto opiekuna. Ten materiał będzie wtedy widoczny w aplikacji razem z rezerwacjami i historią sprawy.</p>
      ${renderEmailActionButton({ href: accountUrl, label: 'Otwórz pokój opiekuna' })}
      ${expiresLabel ? `<p><strong>Ważny do:</strong> ${escapeHtml(expiresLabel)}</p>` : ''}
    `,
    'Dziękujemy.',
  )

  const text = [
    'Cześć,',
    isFreeAccess ? 'Dostęp do materiału jest aktywny.' : 'Twoja płatność została potwierdzona.',
    '',
    `Numer zamówienia: ${order.orderNumber}`,
    `Produkt: ${order.productName}`,
    `Twój kod dostępu: ${order.accessCode}`,
    `Wejdź tutaj: ${accessUrl}`,
    `Pokój opiekuna: ${accountUrl}`,
    expiresLabel ? `Ważny do: ${expiresLabel}` : '',
    '',
    'Dziękujemy.',
  ].filter(Boolean).join('\n')

  return deliverEmail({ to: recipient, subject, html, text }, 'customer')
}

export async function sendAccountRoomReplyEmail(payload: {
  email: string
  conversationSubject: string
  messageBody: string
}): Promise<DeliveryResult> {
  const recipient = payload.email.trim()
  if (!isValidPublicEmail(recipient)) {
    return { status: 'skipped', reason: 'customer email missing or invalid' }
  }

  const accountUrl = buildAbsoluteUrl(`/login?email=${encodeURIComponent(recipient)}`)
  const subject = `Nowa odpowiedź w pokoju opiekuna - ${EMAIL_BRAND_NAME}`
  const html = renderEmailShell(
    'Nowa odpowiedź w pokoju opiekuna',
    `W rozmowie "${payload.conversationSubject}" pojawiła się nowa odpowiedź.`,
    `
      <div style="margin:18px 0;padding:16px;border-radius:14px;background:#f6f3ee;border:1px solid #e9dfcf;">
        ${formatMultilineHtml(payload.messageBody)}
      </div>
      ${renderEmailActionButton({ href: accountUrl, label: 'Otwórz pokój opiekuna' })}
    `,
    'Całą rozmowę, pliki i historię sprawy znajdziesz w swoim pokoju opiekuna.',
  )
  const text = [
    `W rozmowie "${payload.conversationSubject}" pojawiła się nowa odpowiedź.`,
    '',
    payload.messageBody,
    '',
    `Pokój opiekuna: ${accountUrl}`,
    '',
    renderContactBlockText(),
  ].join('\n')

  return deliverEmail({ to: recipient, subject, html, text }, 'customer')
}
