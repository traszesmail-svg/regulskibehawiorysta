import { NextRequest, NextResponse } from 'next/server'
import { listLeadBookings, updateLeadBooking } from '@/lib/server/lead-bookings'
import { ConfigurationError } from '@/lib/server/env'
import { getReminderAuthorizationError } from '@/lib/server/reminder-runner'
import { hangupZadarmaCall, sendZadarmaSms } from '@/lib/server/zadarma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  try {
    const authorizationError = getReminderAuthorizationError(req.headers.get('authorization'))

    if (authorizationError) {
      return NextResponse.json({ error: authorizationError }, { status: 401 })
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
          const smsText = 'Regulski Behawiorysta: do końca konsultacji została 1 minuta. Połączenie zostanie zakończone automatycznie.'
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
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: error instanceof ConfigurationError ? 503 : 500 })
  }
}
