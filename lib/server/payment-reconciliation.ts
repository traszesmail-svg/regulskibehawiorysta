import { createHash } from 'node:crypto'
import { claimPaymentReconciliation, listBookings, markBookingPaid } from '@/lib/server/db'
import type { BookingRecord } from '@/lib/types'

export type PaymentNotificationPayload = {
  packageName?: string | null
  title?: string | null
  text?: string | null
  timestamp?: string | null
  transactionId?: string | null
}

export type PaymentReconciliationResult =
  | {
      matched: true
      bookingId: string
      amount: number
      ownerName: string
      bookingDate: string
      bookingTime: string
      summary: string
    }
  | {
      matched: false
      reason: string
      parsedAmount?: number | null
      parsedSender?: string | null
      requiresManualReview?: boolean
    }

export function isIncomingPaymentNotification(title: string, text: string): boolean {
  const combined = `${title} ${text}`.toLowerCase()

  // Reject debit / outgoing / expense patterns
  const outgoingPhrases = [
    'zapłacono',
    'płatność kartą',
    'wysłałeś',
    'wysłałaś',
    'przelew wychodzący',
    'obciążenie',
    'wypłata z bankomatu',
    'opłata za',
    'sent to',
    'payment to',
    'card payment',
  ]
  if (outgoingPhrases.some((phrase) => combined.includes(phrase))) {
    return false
  }

  // Accept incoming payment phrases
  const incomingPhrases = [
    'przesłał ci',
    'przesłała ci',
    'otrzymałeś',
    'otrzymałaś',
    'wpływ',
    'przelew od',
    'przelew na konto',
    'doładowanie',
    'płatność blik',
    'pieniądze od',
    'sent you',
    'received',
  ]
  return incomingPhrases.some((phrase) => combined.includes(phrase))
}

export function extractAmountFromNotification(title: string, text: string): number | null {
  const combined = `${title} ${text}`.replace(/\s+/g, ' ')

  // Reject different amounts and partial matches inside unsupported number
  // formats. Repeated copies of the same amount in title/text are harmless.
  const amounts = new Set<number>()
  for (const match of combined.matchAll(/(?<![\d.,])((?:\d{1,3}(?: \d{3})+|\d+)(?:[.,]\d{2})?)\s*(?:zł|pln)(?![a-z])/gi)) {
    const parsed = Number(match[1].replaceAll(' ', '').replace(',', '.'))
    if (Number.isFinite(parsed) && parsed > 0) amounts.add(Math.round(parsed * 100) / 100)
  }
  return amounts.size === 1 ? [...amounts][0] : null
}

export function extractSenderFromNotification(title: string, text: string): string | null {
  const combined = `${title} ${text}`
  const match =
    combined.match(/(?:od|from|nadawca:?)\s+([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+(?:\s+[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)?)/i) ||
    combined.match(/([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+(?:\s+[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)?)\s+przesłał/i)

  return match ? match[1].trim() : null
}

function normalizePolishPhoneDigits(value: string | null | undefined): string | null {
  const digits = (value ?? '').replace(/\D/g, '')
  if (/^48\d{9}$/.test(digits)) return digits.slice(2)
  return /^\d{9}$/.test(digits) ? digits : null
}

function extractReferencesFromNotification(title: string, text: string) {
  const combined = title + ' ' + text
  const uuid = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi
  const bookingIds = [...new Set([...combined.matchAll(uuid)].map(match => match[0].toLowerCase()))]
  const withoutUuids = combined.replace(uuid, ' ')
  const phones = [...new Set([...withoutUuids.matchAll(/(?<![0-9a-z])(?:\+?48[\s-]*)?([4-9]\d{2}[\s-]?\d{3}[\s-]?\d{3})(?![0-9a-z])/gi)].map(match => match[1].replace(/[\s-]/g, '')))]
  return { bookingIds, phones }
}

function getRevolutNotificationFingerprint(payload: PaymentNotificationPayload): string | null {
  const transactionId = payload.transactionId?.trim()
  if (!transactionId || !/^[a-zA-Z0-9._:-]{8,160}$/.test(transactionId)) return null
  return 'revolut:' + createHash('sha256').update(transactionId.toLowerCase()).digest('hex')
}

export async function reconcilePaymentNotification(
  payload: PaymentNotificationPayload,
): Promise<PaymentReconciliationResult> {
  const title = (payload.title ?? '').trim()
  const text = (payload.text ?? '').trim()

  if (payload.packageName !== 'com.revolut.revolut') {
    return { matched: false, reason: 'Automatyczne rozliczanie obsługuje wyłącznie powiadomienia aplikacji Revolut.' }
  }

  if (!title && !text) {
    return { matched: false, reason: 'Powiadomienie nie zawiera treści.' }
  }

  // 1. Must be incoming payment, not debit / expense
  if (!isIncomingPaymentNotification(title, text)) {
    return {
      matched: false,
      reason: 'Powiadomienie nie wskazuje na wpływ środków (wydatek lub brak słów kluczowych wpływu).',
    }
  }

  // 2. Extract valid PLN amount
  const parsedAmount = extractAmountFromNotification(title, text)
  if (!parsedAmount) {
    return { matched: false, reason: 'Nie rozpoznano kwoty płatności w PLN w treści powiadomienia.' }
  }

  const parsedSender = extractSenderFromNotification(title, text)
  const fingerprint = getRevolutNotificationFingerprint(payload)
  if (!fingerprint) {
    return {
      matched: false,
      reason: 'Brak wiarygodnego identyfikatora transakcji Revolut. Wymagana weryfikacja ręczna.',
      parsedAmount,
      parsedSender,
      requiresManualReview: true,
    }
  }

  const { bookingIds, phones } = extractReferencesFromNotification(title, text)
  if (bookingIds.length > 1 || (bookingIds.length === 0 && phones.length > 1)) {
    return { matched: false, reason: 'Powiadomienie zawiera różne identyfikatory rezerwacji lub numery. Wymagana weryfikacja ręczna.', parsedAmount, parsedSender, requiresManualReview: true }
  }
  const bookingId = bookingIds[0] ?? null
  const phone = phones[0] ?? null
  const allBookings = await listBookings()

  // A candidate must be awaiting payment in both state columns. Never trust
  // one stale column to re-credit a paid, rejected, or refunded booking.
  const candidates = allBookings.filter((booking) => {
    const awaitingPayment =
      (booking.bookingStatus === 'pending' && booking.paymentStatus === 'unpaid') ||
      (booking.bookingStatus === 'pending_manual_payment' && booking.paymentStatus === 'pending_manual_review')
    return awaitingPayment && Math.abs(booking.amount - parsedAmount) < 0.01
  })

  if (candidates.length === 0) {
    return {
      matched: false,
      reason: `Brak oczekujących rezerwacji na kwotę ${parsedAmount} zł.`,
      parsedAmount,
      parsedSender,
    }
  }

  let matchedBooking: BookingRecord | null = null

  // UUID takes precedence. A phone is accepted only as a complete normalized
  // number and only when it identifies exactly one pending booking.
  if (bookingId) {
    matchedBooking = candidates.find((booking) => booking.id.toLowerCase() === bookingId) ?? null
  } else if (phone) {
    const phoneMatches = candidates.filter((booking) => normalizePolishPhoneDigits(booking.phone) === phone)
    if (phoneMatches.length === 1) matchedBooking = phoneMatches[0]
    if (phoneMatches.length > 1) {
      return {
        matched: false,
        reason: 'Niejednoznaczny numer telefonu dla tej kwoty. Wymagana weryfikacja ręczna.',
        parsedAmount,
        parsedSender,
        requiresManualReview: true,
      }
    }
  }

  // Never resolve by sender name or amount alone: a surname and a notification
  // without a booking UUID/exact phone are insufficient evidence of payment.
  if (!matchedBooking) {
    return {
      matched: false,
      reason: `Brak jednoznacznego dopasowania do danych klienta (nadawca: ${parsedSender || 'nieznany'}). Sprawdź wpłatę ręcznie w panelu admina.`,
      parsedAmount,
      parsedSender,
      requiresManualReview: true,
    }
  }

  // The ledger is a durable uniqueness boundary in Supabase (and its local
  // equivalent in development). If its migration is absent, the call throws
  // and the route fails closed instead of crediting a payment twice.
  const claimed = await claimPaymentReconciliation(fingerprint, matchedBooking.id, parsedAmount)
  if (!claimed) {
    return {
      matched: false,
      reason: 'To powiadomienie Revolut zostało już obsłużone albo wymaga ręcznej weryfikacji.',
      parsedAmount,
      parsedSender,
      requiresManualReview: true,
    }
  }

  // Marking remains after the durable claim. A process failure here can only
  // require manual review; it cannot produce a second automatic credit.
  const ref = fingerprint
  await markBookingPaid(matchedBooking.id, {
    paymentMethod: 'manual',
    paymentReference: ref,
    triggerPaymentConfirmationSms: true,
  })

  return {
    matched: true,
    bookingId: matchedBooking.id,
    amount: parsedAmount,
    ownerName: matchedBooking.ownerName,
    bookingDate: matchedBooking.bookingDate,
    bookingTime: matchedBooking.bookingTime,
    summary: `Zaksięgowano wpłatę ${parsedAmount} zł dla rezerwacji ${matchedBooking.id} (${matchedBooking.ownerName}).`,
  }
}
