import { listBookings, markBookingPaid } from '@/lib/server/db'
import type { BookingRecord } from '@/lib/types'

export type PaymentNotificationPayload = {
  packageName?: string | null
  title?: string | null
  text?: string | null
  timestamp?: string | null
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

  // Look for patterns strictly in PLN / zł
  const match = combined.match(/(\d{2,4}(?:[.,]\d{2})?)\s*(?:zł|pln)/i)
  if (!match) return null

  const normalized = match[1].replace(',', '.')
  const parsed = parseFloat(normalized)
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) / 100 : null
}

export function extractSenderFromNotification(title: string, text: string): string | null {
  const combined = `${title} ${text}`
  const match =
    combined.match(/(?:od|from|nadawca:?)\s+([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+(?:\s+[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)?)/i) ||
    combined.match(/([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+(?:\s+[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)?)\s+przesłał/i)

  return match ? match[1].trim() : null
}

export function extractPhoneOrRefFromNotification(title: string, text: string): string | null {
  const combined = `${title} ${text}`
  const phoneMatch = combined.match(/(?:\+?48\s*)?([4-9]\d{2}[\s-]?\d{3}[\s-]?\d{3})/)
  if (phoneMatch) {
    return phoneMatch[1].replace(/[\s-]/g, '')
  }

  const uuidMatch = combined.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
  if (uuidMatch) {
    return uuidMatch[0].toLowerCase()
  }

  return null
}

export function safeNameMatches(bookingOwner: string, candidate: string): boolean {
  const normOwner = bookingOwner.toLowerCase().trim()
  const normCandidate = candidate.toLowerCase().trim()

  if (normOwner === normCandidate) return true

  const ownerParts = normOwner.split(/\s+/).filter((p) => p.length >= 3)
  const candidateParts = normCandidate.split(/\s+/).filter((p) => p.length >= 3)

  // Must match at least 2 parts (first and last name)
  if (ownerParts.length >= 2 && candidateParts.length >= 2) {
    const matchingCount = ownerParts.filter((part) => candidateParts.includes(part)).length
    return matchingCount >= 2
  }

  // If candidate has only 1 part (e.g. just surname), it must be at least 5 chars AND exact match to owner's last name
  if (candidateParts.length === 1 && ownerParts.length >= 2) {
    const candidateSurname = candidateParts[0]
    const ownerSurname = ownerParts[ownerParts.length - 1]
    return candidateSurname.length >= 5 && candidateSurname === ownerSurname
  }

  return false
}

export async function reconcilePaymentNotification(
  payload: PaymentNotificationPayload,
): Promise<PaymentReconciliationResult> {
  const title = (payload.title ?? '').trim()
  const text = (payload.text ?? '').trim()

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
  const phoneOrRef = extractPhoneOrRefFromNotification(title, text)
  const allBookings = await listBookings()

  // Filter candidates: unpaid or pending review, matching amount, not cancelled/expired
  const candidates = allBookings.filter((booking) => {
    const isPending =
      booking.paymentStatus === 'pending_manual_review' ||
      booking.paymentStatus === 'unpaid' ||
      booking.bookingStatus === 'pending_manual_payment' ||
      booking.bookingStatus === 'pending'
    const notTerminated =
      booking.bookingStatus !== 'cancelled' &&
      booking.bookingStatus !== 'expired' &&
      booking.bookingStatus !== 'done'

    return isPending && notTerminated && Math.abs(booking.amount - parsedAmount) < 0.01
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

  // 3a. Direct match by UUID / booking ID or phone in title
  if (phoneOrRef) {
    matchedBooking =
      candidates.find(
        (b) =>
          b.id.toLowerCase() === phoneOrRef.toLowerCase() ||
          (b.phone && b.phone.replace(/\D/g, '').includes(phoneOrRef)),
      ) ?? null
  }

  // 3b. Safe name match (requires full name / 2 parts, not single common word)
  if (!matchedBooking && parsedSender) {
    const nameMatches = candidates.filter((b) => safeNameMatches(b.ownerName, parsedSender))
    if (nameMatches.length === 1) {
      matchedBooking = nameMatches[0]
    } else if (nameMatches.length > 1) {
      return {
        matched: false,
        reason: `Niejednoznaczność: znaleziono ${nameMatches.length} rezerwacji o pasującym nazwisku na kwotę ${parsedAmount} zł. Wymagana weryfikacja ręczna.`,
        parsedAmount,
        parsedSender,
        requiresManualReview: true,
      }
    }
  }

  // 3c. Strict security rule per PLAN-OPERATOR-2026-09-16: NEVER pick oldest candidate by amount alone!
  if (!matchedBooking) {
    return {
      matched: false,
      reason: `Brak jednoznacznego dopasowania do danych klienta (nadawca: ${parsedSender || 'nieznany'}). Sprawdź wpłatę ręcznie w panelu admina.`,
      parsedAmount,
      parsedSender,
      requiresManualReview: true,
    }
  }

  // 4. Duplicate prevention: if already paid, do not process again
  if (matchedBooking.paymentStatus === 'paid') {
    return {
      matched: false,
      reason: `Rezerwacja ${matchedBooking.id} została już wcześniej opłacona.`,
      parsedAmount,
      parsedSender,
    }
  }

  // 5. Mark as paid - single dispatch handles SMS confirmation via phone agent queue (no duplicate SMS)
  const ref = `revolut:${payload.packageName || 'app'}:${(title || text).slice(0, 40)}`
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
