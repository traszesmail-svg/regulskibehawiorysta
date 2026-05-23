import { SPECIALIST_NAME } from '@/lib/site'
import { normalizePolishPhone } from '@/lib/phone'
import type { BookingRecord, QaCheckoutEligibility } from '@/lib/types'
import { getPaymentModeStatus } from '@/lib/server/env'

const DEFAULT_MANUAL_PAYMENT_HOLD_MINUTES = 15

function readEnv(name: string): string | null {
  const value = process.env[name]?.trim()
  return value ? value : null
}

function readBooleanEnv(name: string): boolean {
  const value = readEnv(name)?.toLowerCase() ?? null

  return value === '1' || value === 'true' || value === 'yes' || value === 'on'
}

function readListEnv(name: string): string[] {
  const raw = readEnv(name)

  if (!raw) {
    return []
  }

  return raw
    .split(/[\n,;]+/)
    .map((value) => value.trim())
    .filter(Boolean)
}

function formatPhone(value: string | null): string | null {
  if (!value) {
    return null
  }

  const digits = value.replace(/\D/g, '')

  if (digits.length === 9) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
  }

  if (digits.length === 11 && digits.startsWith('48')) {
    return `+48 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`
  }

  return value
}

function formatPaypalMe(value: string | null): { display: string | null; url: string | null } {
  if (!value) {
    return { display: null, url: null }
  }

  const trimmed = value.trim()

  if (!trimmed) {
    return { display: null, url: null }
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return {
      display: trimmed.replace(/^https?:\/\//i, ''),
      url: trimmed,
    }
  }

  const normalizedPath = trimmed.replace(/^\/+/, '').replace(/^paypal\.me\//i, '')

  return {
    display: `paypal.me/${normalizedPath}`,
    url: `https://paypal.me/${normalizedPath}`,
  }
}

function getManualPaymentMethodLabel(phone: string | null, paypalMeUrl: string | null) {
  if (phone && paypalMeUrl) {
    return 'BLIK po instrukcji e-mail i PayPal.me'
  }

  if (phone) {
    return 'BLIK po instrukcji e-mail'
  }

  if (paypalMeUrl) {
    return 'PayPal.me'
  }

  return 'Wpłata ręczna'
}

function getManualPaymentAvailabilityLabel(phone: string | null, paypalMeUrl: string | null) {
  if (phone && paypalMeUrl) {
    return 'BLIK po instrukcji e-mail i PayPal.me są dostępne'
  }

  if (phone) {
    return 'BLIK po instrukcji e-mail jest dostępny'
  }

  if (paypalMeUrl) {
    return 'PayPal.me jest dostępny'
  }

  return 'Wpłata ręczna jest dostępna'
}

export type ManualPaymentConfig = {
  isAvailable: boolean
  phone: string | null
  phoneDisplay: string | null
  paypalMe: string | null
  paypalMeDisplay: string | null
  paypalMeUrl: string | null
  accountName: string
  instructions: string | null
  holdMinutes: number
  summary: string
}

export type PayuEnvironment = 'production' | 'sandbox'
export type PayuMode = 'auto' | 'disabled'

export type PayuOptionStatus = {
  isAvailable: boolean
  mode: PayuMode
  environment: PayuEnvironment
  apiBaseUrl: string
  oauthUrl: string
  posId: string | null
  clientId: string | null
  clientSecret: string | null
  secondKey: string | null
  summary: string
  missing: string[]
}

export function getQaCheckoutPaymentReference(bookingId: string): string {
  const compactId = bookingId.replace(/-/g, '').slice(0, 12).toUpperCase()
  return `QA-${compactId}`
}

function getQaCheckoutModeSummary(): string {
  const paymentMode = getPaymentModeStatus()
  const qaEnabled = readBooleanEnv('TEST_CHECKOUT_ENABLED')
  const emailAllowlist = readListEnv('QA_CHECKOUT_EMAIL_ALLOWLIST')
  const phoneAllowlist = readListEnv('QA_CHECKOUT_PHONE_ALLOWLIST')
  const hasAllowlist = emailAllowlist.length > 0 || phoneAllowlist.length > 0

  if (paymentMode.active !== 'mock') {
    return `Testowy checkout QA jest zablokowany, bo APP_PAYMENT_MODE nie wskazuje mock. ${paymentMode.summary}`
  }

  if (!qaEnabled) {
    return 'Testowy checkout QA jest wyłączony. Ustaw TEST_CHECKOUT_ENABLED=true, aby odblokować jawny testowy flow.'
  }

  if (hasAllowlist) {
    return `Testowy checkout QA jest ograniczony do allowlisty kontaktów (${emailAllowlist.length} emaili, ${phoneAllowlist.length} telefonów) i jawnej flagi QA.`
  }

  if (process.env.VERCEL_ENV === 'production') {
    return 'Testowy checkout QA jest zablokowany w produkcji, bo nie ustawiono allowlisty emaili lub telefonów.'
  }

  return 'Testowy checkout QA jest aktywny poza produkcją i wymaga jawnej flagi QA.'
}

function normalizeEmail(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase() ?? ''
  return normalized || null
}

function getQaCheckoutContactGateStatus(email: string, phone: string): { isAllowed: boolean; reason: string | null } {
  const qaEnabled = readBooleanEnv('TEST_CHECKOUT_ENABLED')

  if (!qaEnabled) {
    return {
      isAllowed: false,
      reason: 'Testowy checkout QA jest wyłączony. Ustaw TEST_CHECKOUT_ENABLED=true.',
    }
  }

  const emailAllowlist = readListEnv('QA_CHECKOUT_EMAIL_ALLOWLIST').map((entry) => entry.toLowerCase())
  const phoneAllowlist = readListEnv('QA_CHECKOUT_PHONE_ALLOWLIST').flatMap((entry) => {
    const normalized = normalizePolishPhone(entry)
    if (normalized) {
      return [normalized.e164, normalized.digits]
    }

    const compact = entry.replace(/\s+/g, '')
    return compact ? [compact] : []
  })

  const normalizedEmail = normalizeEmail(email)
  const normalizedPhone = normalizePolishPhone(phone)
  const emailMatches = normalizedEmail ? emailAllowlist.includes(normalizedEmail) : false
  const phoneMatches = Boolean(
    normalizedPhone && (phoneAllowlist.includes(normalizedPhone.e164) || phoneAllowlist.includes(normalizedPhone.digits)),
  )

  if (emailAllowlist.length === 0 && phoneAllowlist.length === 0) {
    if (process.env.VERCEL_ENV === 'production') {
      return {
        isAllowed: false,
        reason: 'Testowy checkout QA jest zablokowany w produkcji, bo nie ustawiono allowlisty emaili lub telefonow.',
      }
    }

    return {
      isAllowed: true,
      reason: null,
    }
  }

  if (emailMatches || phoneMatches) {
    return {
      isAllowed: true,
      reason: null,
    }
  }

  return {
    isAllowed: false,
    reason: 'Testowy checkout QA jest ograniczony do allowlisty emaili lub telefonow.',
  }
}

export function getQaCheckoutEligibility(
  booking: Pick<BookingRecord, 'id' | 'qaBooking' | 'email' | 'phone'>,
): QaCheckoutEligibility {
  const payment = getPaymentModeStatus()
  const paymentReference = getQaCheckoutPaymentReference(booking.id)

  if (payment.active !== 'mock') {
    return {
      isAllowed: false,
      reason: `Testowy checkout QA wymaga aktywnego trybu mock. ${payment.summary}`,
      summary: 'Testowy checkout QA jest wyłączony, bo aktywny tryb płatności nie jest mock.',
      paymentReference,
    }
  }

  if (!booking.qaBooking) {
    return {
      isAllowed: false,
      reason: 'Booking nie ma jawnej flagi QA.',
      summary: 'Testowy checkout QA jest dostępny tylko dla bookingów oznaczonych jako QA.',
      paymentReference,
    }
  }

  const contactGate = getQaCheckoutContactGateStatus(booking.email, booking.phone)

  if (!contactGate.isAllowed) {
    return {
      isAllowed: false,
      reason: contactGate.reason,
      summary: contactGate.reason ?? 'Testowy checkout QA jest zablokowany dla tego kontaktu.',
      paymentReference,
    }
  }

  return {
    isAllowed: true,
    reason: null,
    summary: getQaCheckoutModeSummary(),
    paymentReference,
  }
}

export function getQaCheckoutPolicySummary(): string {
  return getQaCheckoutModeSummary()
}

function readPayuMode(): PayuMode {
  const configuredMode = readEnv('PAYU_MODE')
  return configuredMode === 'auto' ? 'auto' : 'disabled'
}

export function getManualPaymentReference(bookingId: string): string {
  const compactId = bookingId.replace(/-/g, '').slice(0, 12).toUpperCase()
  return `B15-${compactId}`
}

export function getManualPaymentConfig(): ManualPaymentConfig {
  const phone = readEnv('MANUAL_PAYMENT_BLIK_PHONE') ?? null
  const paypalMeRaw = readEnv('MANUAL_PAYMENT_PAYPAL_ME_URL') ?? readEnv('MANUAL_PAYMENT_PAYPAL_ME')
  const paypalMe = formatPaypalMe(paypalMeRaw)
  const instructions = readEnv('MANUAL_PAYMENT_INSTRUCTIONS')
  const accountName = readEnv('MANUAL_PAYMENT_ACCOUNT_NAME') ?? SPECIALIST_NAME
  const holdMinutesRaw = Number(readEnv('MANUAL_PAYMENT_HOLD_MINUTES'))
  const holdMinutes =
    Number.isFinite(holdMinutesRaw) && holdMinutesRaw > 0 ? holdMinutesRaw : DEFAULT_MANUAL_PAYMENT_HOLD_MINUTES

  if (!phone && !paypalMe.url) {
    return {
      isAvailable: false,
      phone: null,
      phoneDisplay: null,
      paypalMe: null,
      paypalMeDisplay: null,
      paypalMeUrl: null,
      accountName,
      instructions,
      holdMinutes,
      summary: 'Wpłata ręczna wymaga aktywnej konfiguracji BLIK po instrukcji e-mail lub PayPal.me.',
    }
  }

  return {
    isAvailable: true,
    phone,
    phoneDisplay: formatPhone(phone),
    paypalMe: paypalMeRaw,
    paypalMeDisplay: paypalMe.display,
    paypalMeUrl: paypalMe.url,
    accountName,
    instructions,
    holdMinutes,
    summary: `${getManualPaymentAvailabilityLabel(phone, paypalMe.url)}.`,
  }
}

export function getPublicManualPaymentConfig(): ManualPaymentConfig {
  const manual = getManualPaymentConfig()

  if (!manual.isAvailable) {
    return manual
  }

  return {
    ...manual,
    phone: null,
    phoneDisplay: null,
    paypalMe: null,
    paypalMeDisplay: null,
    paypalMeUrl: null,
    summary: 'Wpłata ręczna jest dostępna z ręcznym potwierdzeniem do 60 minut.',
  }
}

export function getPayuOptionStatus(): PayuOptionStatus {
  const mode = readPayuMode()
  const environment = readEnv('PAYU_ENVIRONMENT') === 'sandbox' ? 'sandbox' : 'production'
  const apiBaseUrl = environment === 'sandbox' ? 'https://secure.snd.payu.com' : 'https://secure.payu.com'
  const oauthUrl = `${apiBaseUrl}/pl/standard/user/oauth/authorize`
  const clientId = readEnv('PAYU_CLIENT_ID')
  const clientSecret = readEnv('PAYU_CLIENT_SECRET')
  const posId = readEnv('PAYU_POS_ID') ?? clientId
  const secondKey = readEnv('PAYU_SECOND_KEY')
  const missing = ['PAYU_CLIENT_ID', 'PAYU_CLIENT_SECRET', 'PAYU_SECOND_KEY'].filter((name) => !readEnv(name))

  if (!posId) {
    missing.push('PAYU_POS_ID')
  }

  const dedupedMissing = Array.from(new Set(missing))

  if (mode === 'disabled') {
    return {
      isAvailable: false,
      mode,
      environment,
      apiBaseUrl,
      oauthUrl,
      posId,
      clientId,
      clientSecret,
      secondKey,
      summary: 'Płatność online PayU jest chwilowo niedostępna. Na ten moment rezerwacja korzysta z wpłaty ręcznej.',
      missing: [],
    }
  }

  if (dedupedMissing.length > 0) {
    return {
      isAvailable: false,
      mode,
      environment,
      apiBaseUrl,
      oauthUrl,
      posId,
      clientId,
      clientSecret,
      secondKey,
      summary: `PayU wymaga: ${dedupedMissing.join(', ')}.`,
      missing: dedupedMissing,
    }
  }

  return {
    isAvailable: true,
    mode,
    environment,
    apiBaseUrl,
    oauthUrl,
    posId,
    clientId,
    clientSecret,
    secondKey,
    summary: `PayU jest gotowe w środowisku ${environment}.`,
    missing: [],
  }
}

export function getPaymentOptionsSummary() {
  const manual = getManualPaymentConfig()
  const payu = getPayuOptionStatus()
  const qa = getQaCheckoutPolicySummary()

  return {
    manual,
    payu,
    qa,
    summary: [manual.summary, payu.summary, qa].join(' '),
  }
}

