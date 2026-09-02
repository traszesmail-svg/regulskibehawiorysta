import { NextRequest, NextResponse } from 'next/server'
import { getBookingServiceRoomDurationMinutes, resolveBookingServiceType } from '@/lib/booking-services'
import { listBookings, updateBookingCallState } from '@/lib/server/db'
import { ConfigurationError } from '@/lib/server/env'
import { listLeadBookings, updateLeadBooking } from '@/lib/server/lead-bookings'
import { getReminderAuthorizationError } from '@/lib/server/reminder-runner'
import { finalizeZapytajRecovery, markZapytajRecoveryPending } from '@/lib/server/zapytaj-recovery'
import {
  isZapytajPhoneBooking,
  triggerZapytajCall,
  ZAPYTAJ_CALL_MAX_ATTEMPTS,
} from '@/lib/server/zapytaj-call'
import { hangupZadarmaCall, sendZadarmaSms } from '@/lib/server/zadarma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function secondsSince(startedAt: string, now: Date) {
  return Math.max(0, Math.floor((now.getTime() - new Date(startedAt).getTime()) / 1000))
}

function shouldRunAt(value: string | null | undefined, now: Date) {
  return Boolean(value && Number.isFinite(Date.parse(value)) && Date.parse(value) <= now.getTime())
}

async function processMainPhoneBooking(booking: Awaited<ReturnType<typeof listBookings>>[number], now: Date) {
  const processed: Array<{ id: string; action: string }> = []

  if (booking.callStatus === 'recovery_pending' && shouldRunAt(booking.callNextAttemptAt, now)) {
    const recovery = await finalizeZapytajRecovery(booking)
    if (recovery.status === 'available') {
      processed.push({ id: booking.id, action: 'recovery_email_sent' })
    }
    return processed
  }

  if (booking.callStatus === 'additional_slot_available' || booking.callRecoveryUsed) {
    return processed
  }

  const callAttempt = booking.callAttempt ?? 0
  if (
    booking.callId &&
    (booking.callStatus === 'calling' || booking.callStatus === 'calling_retry') &&
    shouldRunAt(booking.callNextAttemptAt, now)
  ) {
    await hangupZadarmaCall(booking.callId)
    await updateBookingCallState(booking.id, { callId: null, callAnsweredAt: null, startedAt: null })

    if (callAttempt < ZAPYTAJ_CALL_MAX_ATTEMPTS) {
      await updateBookingCallState(booking.id, {
        callStatus: 'retry_scheduled',
        callNextAttemptAt: now.toISOString(),
        callLastError: 'Pierwsza próba nie została odebrana.',
      })
      const retry = await triggerZapytajCall({ ...booking, callId: null, callStatus: 'retry_scheduled', callNextAttemptAt: now.toISOString() }, { force: true })
      processed.push({ id: booking.id, action: retry.status === 'started' ? 'main_callback_retry_started' : `main_callback_retry_${retry.status}` })
    } else {
      await markZapytajRecoveryPending(booking, 'Druga próba nie została odebrana.')
      processed.push({ id: booking.id, action: 'recovery_pending' })
    }
    return processed
  }

  if (
    !booking.callId &&
    booking.callStatus === 'retry_scheduled' &&
    shouldRunAt(booking.callNextAttemptAt, now)
  ) {
    const retry = await triggerZapytajCall(booking, { force: true })
    processed.push({ id: booking.id, action: retry.status === 'started' ? 'main_callback_retry_started' : `main_callback_retry_${retry.status}` })
    return processed
  }

  if (
    !booking.callId &&
    !booking.startedAt &&
    booking.callStatus !== 'manual_required' &&
    booking.callStatus !== 'completed' &&
    booking.callStatus !== 'failed'
  ) {
    const attempt = await triggerZapytajCall(booking)
    if (attempt.status === 'started') processed.push({ id: booking.id, action: 'main_callback_started' })
    if (attempt.status === 'manual_required') processed.push({ id: booking.id, action: 'main_call_manual_required' })
    return processed
  }

  if (!booking.startedAt || !booking.callId) return processed
  if (booking.callStatus !== 'active' && booking.callStatus !== 'warning_sent') return processed

  const elapsedSeconds = secondsSince(booking.startedAt, now)
  const serviceType = resolveBookingServiceType(booking.serviceType, booking.amount)
  const durationLimitMinutes = booking.liveMode ? 17 : getBookingServiceRoomDurationMinutes(serviceType)
  const durationLimitSeconds = durationLimitMinutes * 60

  if (booking.callStatus === 'active' && elapsedSeconds >= durationLimitSeconds - 60) {
    await sendZadarmaSms(booking.phone, 'Regulski Behawiorysta: do konca rozmowy zostala 1 minuta. Polaczenie zostanie zakonczone automatycznie.')
    await updateBookingCallState(booking.id, { callStatus: 'warning_sent' })
    processed.push({ id: booking.id, action: 'main_warning_sms_sent' })
  }
  if (elapsedSeconds >= durationLimitSeconds) {
    await hangupZadarmaCall(booking.callId)
    await updateBookingCallState(booking.id, { callStatus: 'completed', callNextAttemptAt: null })
    processed.push({ id: booking.id, action: 'main_call_hungup' })
  }

  return processed
}

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
      const elapsedSeconds = secondsSince(booking.startedAt, now)
      const durationLimitMinutes = booking.service === 'konsultacja-30-min' ? 30 : 15
      const durationLimitSeconds = durationLimitMinutes * 60

      if (booking.callStatus === 'active' && elapsedSeconds >= durationLimitSeconds - 60) {
        if (booking.phone) {
          await sendZadarmaSms(booking.phone, 'Regulski Behawiorysta: do konca konsultacji zostala 1 minuta. Polaczenie zostanie zakonczone automatycznie.')
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

    for (const booking of mainBookings) {
      if (booking.paymentStatus !== 'paid' || !booking.phone || !isZapytajPhoneBooking(booking)) continue
      try {
        processed.push(...(await processMainPhoneBooking(booking, now)))
      } catch (error) {
        console.error('[ZADARMA CRON] booking processing failed', { bookingId: booking.id, error })
        processed.push({ id: booking.id, action: 'main_processing_error' })
      }
    }

    return NextResponse.json({ ok: true, processed })
  } catch (error) {
    console.error('[ZADARMA CRON] Unexpected error:', error)
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: error instanceof ConfigurationError ? 503 : 500 })
  }
}
