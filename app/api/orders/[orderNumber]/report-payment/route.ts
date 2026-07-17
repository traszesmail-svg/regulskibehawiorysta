export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import {
  buildCommerceManualReviewUrl,
  isCommerceTestModeAllowed,
} from '@/lib/server/commerce-service'
import { reportCommerceManualPayment } from '@/lib/server/commerce-store'
import { markBookingManualPaymentPending } from '@/lib/server/db'
import { sendCommerceManualPaymentReportedAdminEmail } from '@/lib/server/notifications'

function buildRequestReviewUrl(request: Request, token: string, action: 'approve' | 'reject') {
  const url = new URL(`/api/admin/confirm-payment/${encodeURIComponent(token)}`, request.url)
  url.searchParams.set('action', action)
  return url.toString()
}

export async function POST(request: Request, props: { params: Promise<{ orderNumber: string }> }) {
  const params = await props.params;
  try {
    const order = await reportCommerceManualPayment(params.orderNumber)

    if (!order) {
      return NextResponse.json({ error: 'Nie znaleziono zamówienia.' }, { status: 404 })
    }

    if (order.productType === 'consultation' && order.meta.bookingId) {
      await markBookingManualPaymentPending(order.meta.bookingId, {
        paymentReference: order.orderNumber,
        customerAccessToken: order.meta.bookingAccessToken ?? null,
        suppressAdminEmail: true,
      })
    }

    const emailResult = await sendCommerceManualPaymentReportedAdminEmail(order, {
      approveUrl: buildCommerceManualReviewUrl(order, 'approve'),
      rejectUrl: buildCommerceManualReviewUrl(order, 'reject'),
    })

    if (emailResult.status !== 'sent') {
      console.error('[commerce][orders] admin payment notification not sent', {
        orderNumber: order.orderNumber,
        status: emailResult.status,
        reason: emailResult.reason,
      })

      return NextResponse.json(
        {
          ok: false,
          orderNumber: order.orderNumber,
          status: order.status,
          adminNotification: emailResult.status,
          adminNotificationReason: emailResult.reason ?? null,
          redirectTo: `/oczekiwanie/${encodeURIComponent(order.orderNumber)}`,
          error:
            'Zgłoszenie wpłaty zostało zapisane, ale mail do behawiorysty nie wyszedł. Spróbuj kliknąć ponownie za chwilę albo napisz przez formularz kontaktowy.',
        },
        { status: 502 },
      )
    }

    return NextResponse.json({
      ok: true,
      orderNumber: order.orderNumber,
      status: order.status,
      adminNotification: emailResult.status,
      adminNotificationReason: null,
      redirectTo: `/oczekiwanie/${encodeURIComponent(order.orderNumber)}`,
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
