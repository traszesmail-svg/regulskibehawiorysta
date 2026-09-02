import { createCustomerAccessToken } from '@/lib/server/customer-access'
import { getBookingById, updateBookingCallState } from '@/lib/server/db'
import { sendZapytajNoAnswerRecoveryEmail } from '@/lib/server/notifications'
import { getBaseUrl } from '@/lib/server/env'
import type { BookingRecord } from '@/lib/types'

export const ZAPYTAJ_RECOVERY_WINDOW_HOURS = 48

export async function finalizeZapytajRecovery(booking: BookingRecord) {
  const current = await getBookingById(booking.id)
  if (!current || current.paymentStatus !== 'paid' || current.consultationMode !== 'phone') {
    return { status: 'ignored' as const, reason: 'Rezerwacja nie kwalifikuje się do odzyskania terminu.' }
  }

  if (current.callRecoveryTokenHash && current.callRecoveryExpiresAt) {
    return { status: 'already_available' as const, booking: current }
  }

  if (current.callRecoveryUsed || (current.callAttempt ?? 0) < 2) {
    return { status: 'ignored' as const, reason: 'Nie wykorzystano jeszcze dwóch prób połączenia.' }
  }

  const accessToken = createCustomerAccessToken()
  const expiresAt = new Date(Date.now() + ZAPYTAJ_RECOVERY_WINDOW_HOURS * 60 * 60 * 1000).toISOString()
  const updated = await updateBookingCallState(current.id, {
    callStatus: 'additional_slot_available',
    callId: null,
    callNextAttemptAt: null,
    callLastError: current.callLastError ?? 'Nieodebrano dwóch prób połączenia.',
    callRecoveryTokenHash: accessToken.tokenHash,
    callRecoveryExpiresAt: expiresAt,
    callRecoveryUsed: false,
  })

  if (!updated) {
    return { status: 'ignored' as const, reason: 'Nie udało się zapisać możliwości odzyskania terminu.' }
  }

  const recoveryUrl = new URL('/zapytaj/dodatkowy', getBaseUrl())
  recoveryUrl.searchParams.set('bookingId', updated.id)
  recoveryUrl.searchParams.set('token', accessToken.rawToken)
  const email = await sendZapytajNoAnswerRecoveryEmail(updated, recoveryUrl.toString())

  return { status: 'available' as const, booking: updated, email }
}

export async function markZapytajRecoveryPending(booking: BookingRecord, reason: string) {
  return updateBookingCallState(booking.id, {
    callId: null,
    callStatus: 'recovery_pending',
    callNextAttemptAt: new Date(Date.now() + 60_000).toISOString(),
    callLastError: reason,
    callAnsweredAt: null,
    startedAt: null,
  })
}
