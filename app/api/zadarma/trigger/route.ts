import { NextRequest, NextResponse } from 'next/server'
import { getLeadBookingById, updateLeadBooking } from '@/lib/server/lead-bookings'
import { triggerZadarmaCallback } from '@/lib/server/zadarma'

export async function POST(req: NextRequest) {
  try {
    const { bookingId } = await req.json()
    if (!bookingId) {
      return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 })
    }

    const booking = await getLeadBookingById(bookingId)
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    if (!booking.phone) {
      return NextResponse.json({ error: 'Booking has no phone number configured' }, { status: 400 })
    }

    const behawiorystaSip = process.env.ZADARMA_BEHAWIORYSTA_SIP ?? ''
    if (!behawiorystaSip) {
      return NextResponse.json({ error: 'ZADARMA_BEHAWIORYSTA_SIP is not configured on the server' }, { status: 500 })
    }

    console.log('[ZADARMA TRIGGER] Initiating callback:', { from: behawiorystaSip, to: booking.phone })

    const resData = await triggerZadarmaCallback(behawiorystaSip, booking.phone)

    if (resData.status === 'success' && resData.call_id) {
      await updateLeadBooking({
        id: booking.id,
        callId: resData.call_id,
        callStatus: 'calling',
      })
      return NextResponse.json({ ok: true, callId: resData.call_id })
    } else {
      console.error('[ZADARMA TRIGGER] Callback trigger failed:', resData)
      return NextResponse.json({ error: resData.message ?? 'Zadarma callback trigger failed' }, { status: 500 })
    }
  } catch (error) {
    console.error('[ZADARMA TRIGGER] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
