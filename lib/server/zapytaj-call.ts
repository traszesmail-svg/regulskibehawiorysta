import { parseWarsawDateTime } from '@/lib/server/google-calendar'
import { updateBookingCallState } from '@/lib/server/db'
import { triggerZadarmaCallback } from '@/lib/server/zadarma'
import { isZapytajLiveSlot, ZAPYTAJ_SERVICE_TYPE } from '@/lib/zapytaj-flow'
import type { BookingRecord } from '@/lib/types'

export const ZAPYTAJ_CALL_START_GRACE_MS = 60_000
export const ZAPYTAJ_CALL_LATE_WINDOW_MS = 180_000
export const ZAPYTAJ_CALL_RETRY_DELAY_MS = 60_000
export const ZAPYTAJ_CALL_MAX_ATTEMPTS = 2

export type ZapytajCallAttempt =
  | { status: 'started'; callId: string; attempt: number }
  | { status: 'scheduled'; startsAt: string }
  | { status: 'manual_required'; reason: string }
  | { status: 'already_started'; callId: string }
  | { status: 'ignored'; reason: string }

export function isZapytajPhoneBooking(booking: Pick<BookingRecord, 'serviceType' | 'consultationMode' | 'liveMode' | 'slotId'>) {
  const serviceType = booking.serviceType
  const supportedService =
    serviceType === ZAPYTAJ_SERVICE_TYPE || serviceType === 'kwadrans-na-juz' || serviceType === 'konsultacja-30-min'

  return supportedService && Boolean(booking.consultationMode === 'phone' || booking.liveMode || isZapytajLiveSlot(booking.slotId))
}

function getAttempt(booking: BookingRecord) {
  const attempt = Number(booking.callAttempt ?? 0)
  return Number.isFinite(attempt) ? Math.max(0, Math.floor(attempt)) : 0
}

function alreadyInProgress(booking: BookingRecord) {
  return booking.callStatus === 'calling' || booking.callStatus === 'calling_retry' || booking.callStatus === 'active' || booking.callStatus === 'warning_sent'
}

export async function triggerZapytajCall(
  booking: BookingRecord,
  options: { force?: boolean } = {},
): Promise<ZapytajCallAttempt> {
  if (!isZapytajPhoneBooking(booking) || booking.paymentStatus !== 'paid' || !booking.phone) {
    return { status: 'ignored', reason: 'Booking nie jest opłaconą rozmową telefoniczną z numerem telefonu.' }
  }

  if (booking.callId) {
    return { status: 'already_started', callId: booking.callId }
  }

  if (alreadyInProgress(booking)) {
    return { status: 'ignored', reason: 'Połączenie jest już uruchamiane albo trwa.' }
  }

  const attempt = getAttempt(booking)
  if (attempt >= ZAPYTAJ_CALL_MAX_ATTEMPTS) {
    return { status: 'ignored', reason: 'Wykorzystano obie automatyczne próby połączenia.' }
  }

  let startsAt: Date

  try {
    startsAt = parseWarsawDateTime(booking.bookingDate, booking.bookingTime)
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Nieprawidłowy termin rozmowy.'
    await updateBookingCallState(booking.id, { callStatus: 'manual_required', callLastError: reason })
    return { status: 'manual_required', reason }
  }

  const millisecondsUntilStart = startsAt.getTime() - Date.now()

  if (!options.force && millisecondsUntilStart > ZAPYTAJ_CALL_START_GRACE_MS) {
    await updateBookingCallState(booking.id, { callStatus: 'scheduled', callLastError: null })
    return { status: 'scheduled', startsAt: startsAt.toISOString() }
  }

  if (!options.force && millisecondsUntilStart < -ZAPYTAJ_CALL_LATE_WINDOW_MS) {
    const reason = 'Okno automatycznego połączenia już minęło.'
    await updateBookingCallState(booking.id, { callStatus: 'manual_required', callLastError: reason })
    return { status: 'manual_required', reason }
  }

  const from = process.env.ZADARMA_BEHAWIORYSTA_SIP?.trim()
  if (!from) {
    const reason = 'Brak numeru SIP behawiorysty.'
    await updateBookingCallState(booking.id, { callStatus: 'manual_required', callLastError: reason })
    return { status: 'manual_required', reason }
  }

  const nextAttempt = attempt + 1
  const preparingStatus = nextAttempt === 1 ? 'calling' : 'calling_retry'
  await updateBookingCallState(booking.id, {
    callStatus: preparingStatus,
    callAttempt: nextAttempt,
    callNextAttemptAt: new Date(Date.now() + ZAPYTAJ_CALL_RETRY_DELAY_MS).toISOString(),
    callLastError: null,
    callAnsweredAt: null,
    startedAt: null,
    callId: null,
  })

  try {
    const result = await triggerZadarmaCallback(from, booking.phone)
    if (result.status === 'success' && result.call_id) {
      await updateBookingCallState(booking.id, {
        callId: result.call_id,
        callStatus: preparingStatus,
        callAttempt: nextAttempt,
      })
      return { status: 'started', callId: result.call_id, attempt: nextAttempt }
    }

    const reason = result.message ?? result.error ?? 'Zadarma nie uruchomiła połączenia.'
    await updateBookingCallState(booking.id, { callStatus: 'manual_required', callLastError: reason })
    return { status: 'manual_required', reason }
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Nie udało się połączyć z Zadarmą.'
    await updateBookingCallState(booking.id, { callStatus: 'manual_required', callLastError: reason })
    return { status: 'manual_required', reason }
  }
}
