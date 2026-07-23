import { NextRequest, NextResponse } from 'next/server'
import { getBookingServiceRoomDurationMinutes, resolveBookingServiceType } from '@/lib/booking-services'
import { listBookings, updateBookingCallState } from '@/lib/server/db'
import { ConfigurationError } from '@/lib/server/env'
import { parseWarsawDateTime } from '@/lib/server/google-calendar'
import { listLeadBookings, updateLeadBooking } from '@/lib/server/lead-bookings'
import { getReminderAuthorizationError } from '@/lib/server/reminder-runner'
import { hangupZadarmaCall, sendZadarmaSms, triggerZadarmaCallback } from '@/lib/server/zadarma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  try {
    const authorizationError = getReminderAuthorizationError(req.headers.get('authorization'))
    if (authorizationError) return NextResponse.json({ error: authorizationError }, { status: 401 })

    const [leadBookings, mainBookings] = await Promise.all([listLeadBookings(), listBookings()])
    const now = new Date()
    const processed: Array<{ id: string; action: string }> = []

    for (const booking of leadBookings) {
      if (!booking.startedAt || !booking.callId) continue
      if (booking.callStatus !== 'active' && booking.callStatus !== 'warning_sent') continue
      const elapsedSeconds = Math.floor((now.getTime() - new Date(booking.startedAt).getTime()) / 1000)
      const durationLimitMinutes = booking.service === 'konsultacja-30-min' ? 30 : 15
      const durationLimitSeconds = durationLimitMinutes * 60

      if (booking.callStatus === 'active' && elapsedSeconds >= durationLimitSeconds - 60) {
        if (booking.phone) {
          await sendZadarmaSms(booking.phone, 'Regulski Behawiorysta: do końca konsultacji została 1 minuta. Połączenie zostanie zakończone automatycznie.')
        }
        await updateLeadBooking({ id: booking.id, callStatus: 'warning_sent' })
        processed.push({ id: booking.id, action: 'lead_warning_sms_sent' })
      }
      if (elapsedSeconds >= durationLimitSeconds) {
        await hangupZadarmaCall(booking.callId)
        await updateLeadBooking({ id: booking.id, callStatus: 'completed' })
        processed.push({ id: booking.id, action: 'lead_call_hungup' })
      }
    }

    const callbackFrom = process.env.ZADARMA_BEHAWIORYSTA_SIP?.trim() ?? ''
    for (const booking of mainBookings) {
      if (booking.paymentStatus !== 'paid' || booking.consultationMode !== 'phone' || !booking.phone) continue
      const startsAt = parseWarsawDateTime(booking.bookingDate, booking.bookingTime)
      const millisecondsUntilStart = startsAt.getTime() - now.getTime()

      if (!booking.callId && millisecondsUntilStart <= 60_000 && millisecondsUntilStart >= -180_000 && callbackFrom) {
        const result = await triggerZadarmaCallback(callbackFrom, booking.phone)
        if (result.status === 'success' && result.call_id) {
          await updateBookingCallState(booking.id, { callId: result.call_id, callStatus: 'calling' })
          processed.push({ id: booking.id, action: 'main_callback_started' })
        }
        continue
      }

      if (!booking.startedAt || !booking.callId) continue
      if (booking.callStatus !== 'active' && booking.callStatus !== 'warning_sent') continue
      const elapsedSeconds = Math.floor((now.getTime() - new Date(booking.startedAt).getTime()) / 1000)
      const serviceType = resolveBookingServiceType(booking.serviceType, booking.amount)
      const durationLimitSeconds = getBookingServiceRoomDurationMinutes(serviceType) * 60

      if (booking.callStatus === 'active' && elapsedSeconds >= durationLimitSeconds - 60) {
        await sendZadarmaSms(booking.phone, 'Regulski Behawiorysta: do końca konsultacji została 1 minuta. Połączenie zostanie zakończone automatycznie.')
        await updateBookingCallState(booking.id, { callStatus: 'warning_sent' })
        processed.push({ id: booking.id, action: 'main_warning_sms_sent' })
      }
      if (elapsedSeconds >= durationLimitSeconds) {
        await hangupZadarmaCall(booking.callId)
        await updateBookingCallState(booking.id, { callStatus: 'completed' })
        processed.push({ id: booking.id, action: 'main_call_hungup' })
      }
    }

    return NextResponse.json({ ok: true, processed })
  } catch (error) {
    console.error('[ZADARMA CRON] Unexpected error:', error)
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: error instanceof ConfigurationError ? 503 : 500 })
  }
}