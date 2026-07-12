import { NextRequest, NextResponse } from 'next/server'
import { listLeadBookings, updateLeadBooking } from '@/lib/server/lead-bookings'
import { hangupZadarmaCall, sendZadarmaSms } from '@/lib/server/zadarma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  try {
    // Secret token check to prevent abuse of the cron endpoint
    const cronSecret = process.env.CRON_SECRET
    const authHeader = req.headers.get('authorization')
    const querySecret = req.nextUrl.searchParams.get('secret')

    if (cronSecret && authHeader !== `Bearer ${cronSecret}` && querySecret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const bookings = await listLeadBookings()
    const now = new Date()
    const processed = []

    for (const booking of bookings) {
      if (!booking.startedAt || !booking.callId) continue

      // Only check active or warning-sent calls
      if (booking.callStatus !== 'active' && booking.callStatus !== 'warning_sent') continue

      const startedAt = new Date(booking.startedAt)
      const elapsedSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000)

      // Determine duration limit (15 min default, 30 min for dva kwadranse)
      const is30Min = booking.service === 'konsultacja-30-min'
      const durationLimitMinutes = is30Min ? 30 : 15
      const durationLimitSeconds = durationLimitMinutes * 60

      console.log(`[ZADARMA CRON] Checking call ${booking.callId}:`, {
        elapsedSeconds,
        durationLimitSeconds,
        callStatus: booking.callStatus
      })

      // 1. Send warning SMS 60 seconds before ending
      if (booking.callStatus === 'active' && elapsedSeconds >= (durationLimitSeconds - 60)) {
        if (booking.phone) {
          const smsText = `Wykopane.pl: Pozostala 1 minuta Twojej konsultacji. Polaczenie zostanie przerwane automatycznie.`
          console.log(`[ZADARMA CRON] Sending warning SMS to ${booking.phone}`)
          await sendZadarmaSms(booking.phone, smsText)
        }
        await updateLeadBooking({
          id: booking.id,
          callStatus: 'warning_sent'
        })
        processed.push({ id: booking.id, action: 'warning_sms_sent' })
      }

      // 2. Hang up call at the limit
      if (elapsedSeconds >= durationLimitSeconds) {
        console.log(`[ZADARMA CRON] Call time limit reached (${durationLimitMinutes} min). Hanging up call ${booking.callId}`)
        await hangupZadarmaCall(booking.callId)
        await updateLeadBooking({
          id: booking.id,
          callStatus: 'completed'
        })
        processed.push({ id: booking.id, action: 'call_hungup' })
      }
    }

    return NextResponse.json({ ok: true, processed })
  } catch (error) {
    console.error('[ZADARMA CRON] Unexpected cron error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
