export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { isBookingAwaitingPayment } from '@/lib/booking-expiry'
import {
  buildCommerceWaitingHref,
  readCommerceViewerToken,
} from '@/lib/commerce'
import {
  buildCommerceManualReviewUrl,
  isCommerceTestModeAllowed,
} from '@/lib/server/commerce-service'
import {
  claimCommerceManualPaymentAdminNotification,
  completeCommerceManualPaymentAdminNotification,
  getCommerceOrderForViewer,
  markCommerceManualPaymentBookingPending,
  reportCommerceManualPayment,
} from '@/lib/server/commerce-store'
import type { CommerceOrder } from '@/lib/commerce'
import { getBookingById, markBookingManualPaymentPending } from '@/lib/server/db'
import { sendCommerceManualPaymentReportedAdminEmail } from '@/lib/server/notifications'

type ReconciledReport = {
  order: CommerceOrder
  adminNotification: 'sent' | 'already_reported' | 'failed'
  adminNotificationReason: string | null
  failureKind: 'booking-unavailable' | 'admin-notification' | null
}

const INACTIVE_CONSULTATION_BOOKING_MESSAGE =
  'Ten termin rezerwacji nie jest już aktywny. Nie wysyłaj wpłaty ponownie; wybierz nowy termin albo napisz przez formularz kontaktowy.'

function buildRequestReviewUrl(request: Request, token: string, action: 'approve' | 'reject') {
  const url = new URL(`/api/admin/confirm-payment/${encodeURIComponent(token)}`, request.url)
  url.searchParams.set('action', action)
  return url.toString()
}

async function getConsultationBookingBlocker(order: CommerceOrder) {
  if (order.productType !== 'consultation' || !order.meta.bookingId) {
    return null
  }

  const booking = await getBookingById(order.meta.bookingId)

  if (order.meta.clinicPhoneUpgrade) {
    return booking && booking.paymentStatus === 'paid' && booking.paymentMethod === 'promo' && booking.consultationMode === 'jitsi'
      ? null
      : INACTIVE_CONSULTATION_BOOKING_MESSAGE
  }

  return booking && isBookingAwaitingPayment(booking) ? null : INACTIVE_CONSULTATION_BOOKING_MESSAGE
}

async function recordBookingUnavailableNotificationFailure(order: CommerceOrder, viewerToken: string) {
  const claim = await claimCommerceManualPaymentAdminNotification(order.orderNumber, viewerToken)

  if (!claim || !claim.shouldSend) {
    return claim?.order ?? order
  }

  return (
    (await completeCommerceManualPaymentAdminNotification(order.orderNumber, viewerToken, {
      status: 'failed',
      reason: INACTIVE_CONSULTATION_BOOKING_MESSAGE,
    })) ?? claim.order
  )
}

async function reconcileReportedManualPayment(
  order: CommerceOrder,
  viewerToken: string,
): Promise<ReconciledReport> {
  let current = order

  if (current.status !== 'payment_reported') {
    return {
      order: current,
      adminNotification: 'already_reported',
      adminNotificationReason: null,
      failureKind: null,
    }
  }

  if (current.productType === 'consultation' && current.meta.bookingId && !current.manualPaymentBookingPendingAt && !current.meta.clinicPhoneUpgrade) {
    const bookingBlocker = await getConsultationBookingBlocker(current)

    if (bookingBlocker) {
      current = await recordBookingUnavailableNotificationFailure(current, viewerToken)
      return {
        order: current,
        adminNotification: 'failed',
        adminNotificationReason: bookingBlocker,
        failureKind: 'booking-unavailable',
      }
    }

    let booking
    try {
      booking = await markBookingManualPaymentPending(current.meta.bookingId, {
        paymentReference: current.orderNumber,
        customerAccessToken: current.meta.bookingAccessToken ?? null,
        suppressAdminEmail: true,
      })
    } catch (error) {
      const blockerAfterRace = await getConsultationBookingBlocker(current)

      if (blockerAfterRace) {
        current = await recordBookingUnavailableNotificationFailure(current, viewerToken)
        return {
          order: current,
          adminNotification: 'failed',
          adminNotificationReason: blockerAfterRace,
          failureKind: 'booking-unavailable',
        }
      }

      throw error
    }

    if (!booking) {
      throw new Error('Nie udało się zaktualizować rezerwacji po zgłoszeniu wpłaty.')
    }

    const marked = await markCommerceManualPaymentBookingPending(current.orderNumber, viewerToken)
    if (!marked) {
      throw new Error('Nie udało się zapisać statusu rezerwacji po zgłoszeniu wpłaty.')
    }
    current = marked
  }

  const claim = await claimCommerceManualPaymentAdminNotification(current.orderNumber, viewerToken)
  if (!claim) {
    throw new Error('Nie udało się zapisać stanu powiadomienia o wpłacie.')
  }
  current = claim.order

  if (!claim.shouldSend) {
    if (
      current.manualPaymentAdminNotificationState === 'failed' ||
      current.manualPaymentAdminNotificationState === 'skipped'
    ) {
      return {
        order: current,
        adminNotification: 'failed',
        adminNotificationReason:
          current.manualPaymentAdminNotificationFailure ?? 'Powiadomienie o zgłoszeniu wpłaty nie zostało wysłane.',
        failureKind: 'admin-notification',
      }
    }

    return {
      order: current,
      adminNotification: 'already_reported',
      adminNotificationReason: null,
      failureKind: null,
    }
  }

  const emailResult = await sendCommerceManualPaymentReportedAdminEmail(current, {
    approveUrl: buildCommerceManualReviewUrl(current, 'approve'),
    rejectUrl: buildCommerceManualReviewUrl(current, 'reject'),
  })
  const completed = await completeCommerceManualPaymentAdminNotification(current.orderNumber, viewerToken, emailResult)

  if (!completed) {
    throw new Error('Nie udało się zapisać wyniku powiadomienia o wpłacie.')
  }
  current = completed

  if (emailResult.status !== 'sent') {
    console.error('[commerce][orders] admin payment notification not sent', {
      orderNumber: current.orderNumber,
      status: emailResult.status,
      reason: emailResult.reason,
    })
    return {
      order: current,
      adminNotification: 'failed',
      adminNotificationReason: emailResult.reason ?? null,
      failureKind: 'admin-notification',
    }
  }

  return {
    order: current,
    adminNotification: 'sent',
    adminNotificationReason: null,
    failureKind: null,
  }
}

export async function POST(request: Request, props: { params: Promise<{ orderNumber: string }> }) {
  const params = await props.params

  try {
    let body: Record<string, unknown>
    try {
      body = (await request.json()) as Record<string, unknown>
    } catch {
      return NextResponse.json({ error: 'Niepoprawny format zapytania.' }, { status: 400 })
    }

    const viewerToken = readCommerceViewerToken(body.viewerToken as string | string[] | undefined)
    const viewerOrder = await getCommerceOrderForViewer(params.orderNumber, viewerToken)

    // Return the same response for an invalid capability as for an unknown
    // order, so order numbers cannot be enumerated.
    if (!viewerOrder) {
      return NextResponse.json({ error: 'Nie znaleziono zamówienia.' }, { status: 404 })
    }

    if (viewerOrder.status === 'created' || viewerOrder.status === 'waiting_manual_payment') {
      const bookingBlocker = await getConsultationBookingBlocker(viewerOrder)

      if (bookingBlocker) {
        return NextResponse.json({ error: bookingBlocker }, { status: 409 })
      }
    }

    const report = await reportCommerceManualPayment(viewerOrder.orderNumber, viewerToken)
    if (!report) {
      return NextResponse.json({ error: 'Nie znaleziono zamówienia.' }, { status: 404 })
    }

    const reconciled = await reconcileReportedManualPayment(report.order, viewerToken)
    const order = reconciled.order
    const redirectTo = buildCommerceWaitingHref(order.orderNumber, viewerToken)

    if (reconciled.failureKind) {
      const bookingUnavailable = reconciled.failureKind === 'booking-unavailable'
      return NextResponse.json(
        {
          ok: false,
          alreadyReported: !report.reportedNow,
          orderNumber: order.orderNumber,
          status: order.status,
          adminNotification: 'failed',
          adminNotificationReason: reconciled.adminNotificationReason,
          redirectTo,
          error: bookingUnavailable
            ? reconciled.adminNotificationReason ?? INACTIVE_CONSULTATION_BOOKING_MESSAGE
            : 'Zgłoszenie wpłaty zostało zapisane, ale mail do behawiorysty nie wyszedł. Nie wysyłaj zgłoszenia ponownie; skontaktuj się przez formularz kontaktowy.',
        },
        { status: bookingUnavailable ? 409 : 502 },
      )
    }

    return NextResponse.json({
      ok: true,
      alreadyReported: !report.reportedNow,
      orderNumber: order.orderNumber,
      status: order.status,
      adminNotification: reconciled.adminNotification,
      adminNotificationReason: null,
      redirectTo,
      testAdminConfirmUrl:
        isCommerceTestModeAllowed() && order.adminConfirmationToken
          ? buildRequestReviewUrl(request, order.adminConfirmationToken, 'approve')
          : null,
    })
  } catch (error) {
    console.error('[commerce][orders] report manual payment failed', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Nie udało się zgłosić płatności.' },
      { status: 500 },
    )
  }
}
