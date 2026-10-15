import { NextRequest, NextResponse } from 'next/server'
import { hasValidPhoneAgentAuthorization } from '@/lib/server/phone-agent'
import {
  reconcilePaymentNotification,
  reconcileCommercePaymentNotification,
  type PaymentNotificationPayload,
} from '@/lib/server/payment-reconciliation'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function unauthorized() {
  return NextResponse.json({ error: 'Brak autoryzacji telefonu.' }, { status: 401 })
}

export async function POST(request: NextRequest) {
  if (!hasValidPhoneAgentAuthorization(request.headers.get('authorization'))) {
    return unauthorized()
  }

  // A notification is not a bank webhook.  Keep manual BLIK as the default
  // until the matching rules have been proven in a controlled pilot.
  if (process.env.PHONE_AGENT_AUTO_PAYMENT_RECONCILIATION?.trim() !== 'true') {
    return NextResponse.json(
      { error: 'Automatyczne potwierdzanie wpłat jest wyłączone. Potwierdź BLIK ręcznie.' },
      { status: 409, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  try {
    const body = (await request.json()) as PaymentNotificationPayload
    const bookingResult = await reconcilePaymentNotification(body)
    const result = bookingResult.matched ? bookingResult : await reconcileCommercePaymentNotification(body)

    return NextResponse.json(
      { ok: result.matched, result },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Nie zaksięgowano wpłaty automatycznie. Zweryfikuj ją ręcznie w panelu.',
        requiresManualReview: true,
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
