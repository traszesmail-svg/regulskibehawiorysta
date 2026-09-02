import { NextRequest, NextResponse } from 'next/server'
import { listBookings, updateBookingCallState } from '@/lib/server/db'
import { listLeadBookings, updateLeadBooking } from '@/lib/server/lead-bookings'
import { markZapytajRecoveryPending } from '@/lib/server/zapytaj-recovery'
import { ZAPYTAJ_CALL_RETRY_DELAY_MS } from '@/lib/server/zapytaj-call'

export async function GET(req: NextRequest) {
  const zdEcho = req.nextUrl.searchParams.get('zd_echo')
  if (zdEcho) return new NextResponse(zdEcho)
  return NextResponse.json({ ok: true })
}

function isCallEndEvent(event: string) {
  return /END|NO[_-]?ANSWER|NOT[_-]?ANSWER|BUSY|CANCEL|FAIL/.test(event)
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const rawEvent = formData.get('event')
    const rawCallId = formData.get('call_id') ?? formData.get('pbx_call_id')
    const event = typeof rawEvent === 'string' ? rawEvent.toUpperCase() : ''
    const callId = typeof rawCallId === 'string' ? rawCallId : ''
    if (!event || !callId) return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })

    const leadBookings = await listLeadBookings()
    const leadBooking = leadBookings.find((booking) => booking.callId === callId)
    if (leadBooking) {
      if (event.includes('ANSWER') && !isCallEndEvent(event) && !leadBooking.startedAt) {
        await updateLeadBooking({ id: leadBooking.id, callStatus: 'active', startedAt: new Date().toISOString() })
      } else if (isCallEndEvent(event)) {
        await updateLeadBooking({ id: leadBooking.id, callStatus: 'completed' })
      }
      return NextResponse.json({ ok: true })
    }

    const mainBookings = await listBookings()
    const mainBooking = mainBookings.find((booking) => booking.callId === callId)
    if (!mainBooking) return NextResponse.json({ ok: true, message: 'No matching booking' })

    if (event.includes('ANSWER') && !isCallEndEvent(event) && !mainBooking.callAnsweredAt && !mainBooking.startedAt) {
      const answeredAt = new Date()
      const timerStartsAt = new Date(answeredAt.getTime() + 20_000).toISOString()
      await updateBookingCallState(mainBooking.id, {
        callStatus: 'active',
        callAnsweredAt: answeredAt.toISOString(),
        startedAt: timerStartsAt,
        callNextAttemptAt: null,
        callLastError: null,
      })
    } else if (isCallEndEvent(event)) {
      if (mainBooking.callAnsweredAt || mainBooking.startedAt) {
        await updateBookingCallState(mainBooking.id, {
          callStatus: 'completed',
          callNextAttemptAt: null,
        })
      } else if ((mainBooking.callAttempt ?? 0) < 2) {
        await updateBookingCallState(mainBooking.id, {
          callId: null,
          callStatus: 'retry_scheduled',
          callNextAttemptAt: new Date(Date.now() + ZAPYTAJ_CALL_RETRY_DELAY_MS).toISOString(),
          callLastError: 'Pierwsza próba nie została odebrana.',
          callAnsweredAt: null,
          startedAt: null,
          callAttempt: Math.max(1, mainBooking.callAttempt ?? 0),
        })
      } else {
        await markZapytajRecoveryPending(mainBooking, 'Druga próba nie została odebrana.')
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[ZADARMA WEBHOOK] Error processing webhook:', error)
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
  }
}
