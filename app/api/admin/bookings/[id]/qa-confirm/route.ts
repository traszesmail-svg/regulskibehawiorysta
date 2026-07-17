export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { getBookingById, markBookingPaid } from '@/lib/server/db'
import { getQaCheckoutPaymentReference } from '@/lib/server/payment-options'

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const booking = await getBookingById(params.id)

    if (!booking) {
      return NextResponse.json({ error: 'Nie znaleziono rezerwacji do potwierdzenia QA.' }, { status: 404 })
    }

    if (!booking.qaBooking) {
      return NextResponse.json({ error: 'Ta rezerwacja nie ma flagi QA.' }, { status: 403 })
    }

    if (booking.paymentStatus === 'paid') {
      return NextResponse.json({ ok: true, bookingId: booking.id, qa: true })
    }

    const updatedBooking = await markBookingPaid(booking.id, {
      checkoutSessionId: 'qa-admin-confirm',
      paymentIntentId: 'qa-admin-confirm',
      paymentMethod: 'mock',
      paymentReference: getQaCheckoutPaymentReference(booking.id),
      triggerPaymentConfirmationSms: false,
    })

    if (!updatedBooking) {
      return NextResponse.json({ error: 'Nie udało się potwierdzić QA bookingu.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, bookingId: updatedBooking.id, qa: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Nie udało się potwierdzić QA bookingu.' },
      { status: 500 },
    )
  }
}
