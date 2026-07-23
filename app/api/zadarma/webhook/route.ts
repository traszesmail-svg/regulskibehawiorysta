import { NextRequest, NextResponse } from 'next/server'
import { listBookings, updateBookingCallState } from '@/lib/server/db'
import { listLeadBookings, updateLeadBooking } from '@/lib/server/lead-bookings'

export async function GET(req: NextRequest) {
  const zdEcho = req.nextUrl.searchParams.get('zd_echo')
  if (zdEcho) return new NextResponse(zdEcho)
  return NextResponse.json({ ok: true })
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const event = formData.get('event') as string | null
    const callId = (formData.get('call_id') ?? formData.get('pbx_call_id')) as string | null
    if (!event || !callId) return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })

    const leadBookings = await listLeadBookings()
    const leadBooking = leadBookings.find((booking) => booking.callId === callId)
    if (leadBooking) {
      if (event.includes('ANSWER') && !leadBooking.startedAt) {
        await updateLeadBooking({ id: leadBooking.id, callStatus: 'active', startedAt: new Date().toISOString() })
      } else if (event.includes('END')) {
        await updateLeadBooking({ id: leadBooking.id, callStatus: 'completed' })
      }
      return NextResponse.json({ ok: true })
    }

    const mainBookings = await listBookings()
    const mainBooking = mainBookings.find((booking) => booking.callId === callId)
    if (!mainBooking) return NextResponse.json({ ok: true, message: 'No matching booking' })

    if (event.includes('ANSWER') && !mainBooking.startedAt) {
      await updateBookingCallState(mainBooking.id, { callStatus: 'active', startedAt: new Date().toISOString() })
    } else if (event.includes('END')) {
      await updateBookingCallState(mainBooking.id, { callStatus: 'completed' })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[ZADARMA WEBHOOK] Error processing webhook:', error)
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
  }
}