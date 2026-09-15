import { listBookings, markBookingPaid } from '@/lib/server/db'
import { enqueueSms } from '@/lib/server/phone-agent-store'
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
    }

export function extractAmountFromNotification(title: string, text: string): number | null {
  const combined = `${title} ${text}`.replace(/\s+/g, ' ')

  // Look for patterns like "79,00 zł", "79.00 PLN", "79 zł", "104 zł", "475 zł"
  const match = combined.match(/(\d{2,4}(?:[.,]\d{2})?)\s*(?:zł|pln)/i)
  if (!match) return null

  const normalized = match[1].replace(',', '.')
  const parsed = parseFloat(normalized)
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) / 100 : null
}

export function extractSenderFromNotification(title: string, text: string): string | null {
  const combined = `${title} ${text}`
  // Patterns like "od Jan Kowalski", "Jan Kowalski przesłał Ci", "Przelew od: Jan Kowalski"
  const match =
    combined.match(/(?:od|from|nadawca:?)\s+([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+(?:\s+[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)?)/i) ||
    combined.match(/([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+\s+[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)\s+przesłał/i)

  return match ? match[1].trim() : null
}

function nameMatches(bookingOwner: string, candidate: string): boolean {
  const normOwner = bookingOwner.toLowerCase().trim()
  const normCandidate = candidate.toLowerCase().trim()
  if (normOwner.includes(normCandidate) || normCandidate.includes(normOwner)) return true

  const ownerParts = normOwner.split(/\s+/)
  const candidateParts = normCandidate.split(/\s+/)
  return ownerParts.some((part) => part.length >= 3 && candidateParts.includes(part))
}

export async function reconcilePaymentNotification(
  payload: PaymentNotificationPayload,
): Promise<PaymentReconciliationResult> {
  const title = (payload.title ?? '').trim()
  const text = (payload.text ?? '').trim()

  if (!title && !text) {
    return { matched: false, reason: 'Powiadomienie nie zawiera treści.' }
  }

  const parsedAmount = extractAmountFromNotification(title, text)
  if (!parsedAmount) {
    return { matched: false, reason: 'Nie rozpoznano kwoty płatności w treści powiadomienia.' }
  }

  const parsedSender = extractSenderFromNotification(title, text)
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

  // If sender name found, try to match by name
  if (parsedSender) {
    matchedBooking = candidates.find((b) => nameMatches(b.ownerName, parsedSender)) ?? null
  }

  // If not matched by name, pick the oldest pending (FIFO) or single candidate
  if (!matchedBooking) {
    if (candidates.length === 1) {
      matchedBooking = candidates[0]
    } else {
      // Sort by creation time ascending
      candidates.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))
      matchedBooking = candidates[0]
    }
  }

  // Mark as paid
  const ref = `revolut:${payload.packageName || 'app'}:${(title || text).slice(0, 40)}`
  await markBookingPaid(matchedBooking.id, {
    paymentMethod: 'manual',
    paymentReference: ref,
    triggerPaymentConfirmationSms: true,
  })

  // Enqueue confirmation SMS for the Xperia phone agent to send
  if (matchedBooking.phone) {
    const smsMessage = `Regulski Behawiorysta: Wpłata ${parsedAmount} zł została zaksięgowana. Potwierdzony termin konsultacji: ${matchedBooking.bookingDate} ${matchedBooking.bookingTime}. Dziękuję!`
    await enqueueSms({
      bookingId: matchedBooking.id,
      phone: matchedBooking.phone,
      message: smsMessage,
      type: 'payment_confirmed',
      idempotencyKey: `payment_confirmed:${matchedBooking.id}`,
    })
  }

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
