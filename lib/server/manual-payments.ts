import { getBookingById, getBookingForViewer, markBookingManualPaymentPending, markBookingManualPaymentRejected, markBookingPaid } from '@/lib/server/db'
import { buildManualPaymentReviewUrl } from '@/lib/server/manual-payment-review'
import { sendManualPaymentReportedAdminEmail } from '@/lib/server/notifications'
import { getManualPaymentConfig, getManualPaymentReference } from '@/lib/server/payment-options'
import { triggerZapytajCall } from '@/lib/server/zapytaj-call'

const MANUAL_PAYMENT_ADMIN_NOTIFICATION_TIMEOUT_MS = 3_000

type ManualPaymentAdminNotification =
  | Awaited<ReturnType<typeof sendManualPaymentReportedAdminEmail>>
  | {
      status: 'queued'
      reason?: string
    }

async function sendManualPaymentReportedAdminEmailWithTimeout(
  booking: Parameters<typeof sendManualPaymentReportedAdminEmail>[0],
  links: Parameters<typeof sendManualPaymentReportedAdminEmail>[1],
  timeoutMs = MANUAL_PAYMENT_ADMIN_NOTIFICATION_TIMEOUT_MS,
): Promise<ManualPaymentAdminNotification> {
  const timeoutResult: ManualPaymentAdminNotification = {
    status: 'queued',
    reason: `ADMIN_NOTIFICATION_EMAIL still pending after ${timeoutMs}ms`,
  }

  let timeoutHandle: ReturnType<typeof setTimeout> | null = null

  try {
    return await Promise.race([
      sendManualPaymentReportedAdminEmail(booking, links),
      new Promise<ManualPaymentAdminNotification>((resolve) => {
        timeoutHandle = setTimeout(() => resolve(timeoutResult), timeoutMs)
      }),
    ])
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle)
    }
  }
}

export async function reportManualPayment(
  bookingId: string,
  accessToken?: string | null,
  authorizationHeader?: string | null,
) {
  const booking = await getBookingForViewer(bookingId, accessToken, authorizationHeader)

  if (!booking) {
    throw new Error('Nie znaleziono rezerwacji albo link wygasł.')
  }

  if (booking.liveMode) {
    throw new Error('Rozmowa live wymaga automatycznej płatności. Tryb live jest obecnie niedostępny.')
  }

  const manualPayment = getManualPaymentConfig()

  if (!manualPayment.isAvailable) {
    throw new Error(manualPayment.summary)
  }

  const updatedBooking = await markBookingManualPaymentPending(booking.id, {
    paymentReference: booking.paymentReference ?? getManualPaymentReference(booking.id),
    customerAccessToken: accessToken ?? null,
  })

  if (!updatedBooking) {
    throw new Error('Nie udało się zapisać zgłoszenia wpłaty.')
  }

  const adminNotification = await sendManualPaymentReportedAdminEmailWithTimeout(updatedBooking, {
    approveUrl: buildManualPaymentReviewUrl(updatedBooking.id, 'approve', updatedBooking.paymentReportedAt),
    rejectUrl: buildManualPaymentReviewUrl(updatedBooking.id, 'reject', updatedBooking.paymentReportedAt),
  })

  if (adminNotification.status === 'queued') {
    console.info('[regulski-behawiorysta][manual-payment] admin notification still pending', {
      bookingId: updatedBooking.id,
      reason: adminNotification.reason ?? null,
      timeoutMs: MANUAL_PAYMENT_ADMIN_NOTIFICATION_TIMEOUT_MS,
    })
  } else if (adminNotification.status !== 'sent') {
    console.warn('[regulski-behawiorysta][manual-payment] admin notification not sent', {
      bookingId: updatedBooking.id,
      status: adminNotification.status,
      reason: adminNotification.reason ?? null,
    })
  }

  return {
    booking: updatedBooking,
    adminNotification,
  }
}

export async function approveManualPayment(bookingId: string) {
  const booking = await getBookingById(bookingId)

  if (!booking) {
    throw new Error('Nie znaleziono rezerwacji do potwierdzenia.')
  }

  if (booking.paymentStatus === 'paid') {
    return booking
  }

  const updatedBooking = await markBookingPaid(booking.id, {
    paymentMethod: 'manual',
    paymentReference: booking.paymentReference ?? getManualPaymentReference(booking.id),
    consultationMode: booking.consultationMode ?? (booking.liveMode ? 'phone' : undefined),
    triggerPaymentConfirmationSms: false,
  })

  if (!updatedBooking) {
    throw new Error('Nie udało się potwierdzić płatności.')
  }
  if (updatedBooking.consultationMode === 'phone') {
    try {
      const callAttempt = await triggerZapytajCall(updatedBooking)
      if (callAttempt.status === 'manual_required') {
        console.warn('[regulski-behawiorysta][zapytaj] automatic call unavailable', {
          bookingId: updatedBooking.id,
          reason: callAttempt.reason,
        })
      }
    } catch (error) {
      console.warn('[regulski-behawiorysta][zapytaj] automatic call fallback failed', {
        bookingId: updatedBooking.id,
        reason: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return updatedBooking
}

export async function rejectManualPayment(bookingId: string, reason?: string) {
  const booking = await markBookingManualPaymentRejected(bookingId, reason)

  if (!booking) {
    throw new Error('Nie znaleziono rezerwacji do odrzucenia.')
  }

  return booking
}
