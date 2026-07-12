import { NextRequest, NextResponse } from 'next/server'
import { listLeadBookings, updateLeadBooking } from '@/lib/server/lead-bookings'

export async function GET(req: NextRequest) {
  const zdEcho = req.nextUrl.searchParams.get('zd_echo')
  if (zdEcho) {
    return new NextResponse(zdEcho)
  }
  return NextResponse.json({ ok: true })
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const event = formData.get('event') as string | null
    const callId = (formData.get('call_id') ?? formData.get('pbx_call_id')) as string | null

    console.log('[ZADARMA WEBHOOK]', { event, callId })

    if (!event || !callId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    // Find the booking with this callId
    const bookings = await listLeadBookings()
    const booking = bookings.find((b) => b.callId === callId)

    if (!booking) {
      console.warn('[ZADARMA WEBHOOK] No booking found for callId:', callId)
      return NextResponse.json({ ok: true, message: 'No matching booking' })
    }

    if (event.includes('ANSWER')) {
      // Set startedAt only if it wasn't set yet (to avoid overwriting when the second leg answers)
      if (!booking.startedAt) {
        await updateLeadBooking({
          id: booking.id,
          callStatus: 'active',
          startedAt: new Date().toISOString(),
        })
        console.log('[ZADARMA WEBHOOK] Call started for booking:', booking.id)
      }
    } else if (event.includes('END')) {
      await updateLeadBooking({
        id: booking.id,
        callStatus: 'completed',
      })
      console.log('[ZADARMA WEBHOOK] Call ended for booking:', booking.id)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[ZADARMA WEBHOOK] Error processing webhook:', err)
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
  }
}
