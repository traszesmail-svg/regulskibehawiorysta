import { NextRequest, NextResponse } from 'next/server'
import { getBookingById, listBookings, updateBookingCallState } from '@/lib/server/db'
import { hasValidPhoneAgentAuthorization, isPhoneAgentCandidate, toPhoneAgentCase } from '@/lib/server/phone-agent'
import { isZapytajPhoneBooking } from '@/lib/server/zapytaj-call'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function unauthorized() {
  return NextResponse.json({ error: 'Brak autoryzacji telefonu.' }, { status: 401 })
}

export async function GET(request: NextRequest) {
  if (!hasValidPhoneAgentAuthorization(request.headers.get('authorization'))) return unauthorized()

  try {
    const job = (await listBookings())
      .filter((booking) => isPhoneAgentCandidate(booking) && isZapytajPhoneBooking(booking) && booking.callStatus === 'phone_agent_pending')
      .sort((a, b) => `${a.bookingDate}T${a.bookingTime}`.localeCompare(`${b.bookingDate}T${b.bookingTime}`))[0]

    return NextResponse.json({ job: job ? toPhoneAgentCase(job) : null }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Nie udało się pobrać zadania telefonu.' }, { status: 503 })
  }
}

export async function POST(request: NextRequest) {
  if (!hasValidPhoneAgentAuthorization(request.headers.get('authorization'))) return unauthorized()

  try {
    const body = (await request.json()) as { bookingId?: unknown; event?: unknown; error?: unknown }
    const bookingId = typeof body.bookingId === 'string' ? body.bookingId.trim() : ''
    const event = typeof body.event === 'string' ? body.event : ''
    const error = typeof body.error === 'string' ? body.error.trim().slice(0, 300) : null
    const booking = bookingId ? await getBookingById(bookingId) : null

    if (!booking || !isPhoneAgentCandidate(booking) || !isZapytajPhoneBooking(booking)) {
      return NextResponse.json({ error: 'Nie znaleziono aktywnej rozmowy.' }, { status: 404 })
    }

    const now = new Date().toISOString()
    if (event === 'claimed') {
      if (booking.callStatus !== 'phone_agent_pending') return NextResponse.json({ ok: true, state: booking.callStatus })
      await updateBookingCallState(booking.id, { callId: `android:${booking.id}`, callStatus: 'phone_agent_dialing', callAttempt: (booking.callAttempt ?? 0) + 1, callLastError: null })
    } else if (event === 'started') {
      await updateBookingCallState(booking.id, { callStatus: 'phone_agent_active', startedAt: now, callAnsweredAt: now, callLastError: null })
    } else if (event === 'ended') {
      await updateBookingCallState(booking.id, { callStatus: 'phone_agent_completed', callNextAttemptAt: null, callLastError: null })
    } else if (event === 'failed') {
      await updateBookingCallState(booking.id, { callId: null, callStatus: 'phone_agent_failed', callLastError: error || 'Telefon nie uruchomił połączenia.' })
    } else {
      return NextResponse.json({ error: 'Nieprawidłowy status zadania telefonu.' }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Nie udało się zapisać statusu telefonu.' }, { status: 503 })
  }
}
