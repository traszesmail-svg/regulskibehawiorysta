import type { BookingRecord } from '@/lib/types'

export const UNPAID_BOOKING_EXPIRY_HOURS = 24

export function getUnpaidBookingExpiryCutoff(now = new Date()) {
  return new Date(now.getTime() - UNPAID_BOOKING_EXPIRY_HOURS * 60 * 60 * 1000)
}

export function isBookingAwaitingPayment(
  booking: Pick<BookingRecord, 'bookingStatus' | 'paymentStatus'>,
) {
  return (
    (booking.bookingStatus === 'pending' && booking.paymentStatus === 'unpaid') ||
    (booking.bookingStatus === 'pending_manual_payment' && booking.paymentStatus === 'pending_manual_review')
  )
}

export function isUnpaidBookingExpired(
  booking: Pick<BookingRecord, 'bookingStatus' | 'paymentStatus' | 'createdAt'>,
  now = new Date(),
) {
  if (!isBookingAwaitingPayment(booking)) {
    return false
  }

  const createdAt = Date.parse(booking.createdAt)

  return Number.isFinite(createdAt) && createdAt < getUnpaidBookingExpiryCutoff(now).getTime()
}
