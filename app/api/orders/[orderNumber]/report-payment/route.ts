export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
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
import { markBookingManualPaymentPending } from '@/lib/server/db'
import { sendCommerceManualPaymentReportedAdminEmail } from '@/lib/server/notifications'

type ReconciledReport = {
  order: CommerceOrder
  adminNotification: 'sent' | 'already_reported' | 'failed'
  adminNotificationReason: string | null
}

function buildRequestReviewUrl(request: Request, token: string, action: 'approve' | 'reject') {
  const url = new URL(`/api/admin/confirm-payment/${encodeURIComponent(token)}`, request.url)
  url.searchParams.set('action', action)
  return url.toString()
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
    }
  }

  if (current.productType === 'consultation' && current.meta.bookingId && !current.manualPaymentBookingPendingAt) {
    const booking = await markBookingManualPaymentPending(current.meta.bookingId, {
      paymentReference: current.orderNumber,
      customerAccessToken: current.meta.bookingAccessToken ?? null,
      suppressAdminEmail: true,
    })

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
      }
    }

    return {
      order: current,
      adminNotification: 'already_reported',
      adminNotificationReason: null,
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
    }
  }

  return {
    order: current,
    adminNotification: 'sent',
    adminNotificationReason: null,
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

    const report = await reportCommerceManualPayment(viewerOrder.orderNumber, viewerToken)
    if (!report) {
      return NextResponse.json({ error: 'Nie znaleziono zamówienia.' }, { status: 404 })
    }

    const reconciled = await reconcileReportedManualPayment(report.order, viewerToken)
    const order = reconciled.order
    const redirectTo = buildCommerceWaitingHref(order.orderNumber, viewerToken)

    if (reconciled.adminNotification === 'failed') {
      return NextResponse.json(
        {
          ok: false,
          alreadyReported: !report.reportedNow,
          orderNumber: order.orderNumber,
          status: order.status,
          adminNotification: 'failed',
          adminNotificationReason: reconciled.adminNotificationReason,
          redirectTo,
          error:
            'Zgłoszenie wpłaty zostało zapisane, ale mail do behawiorysty nie wyszedł. Nie wysyłaj zgłoszenia ponownie; skontaktuj się przez formularz kontaktowy.',
        },
        { status: 502 },
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
