import { NextRequest, NextResponse } from 'next/server'
import { getBookingById, listBookings, transitionBookingCallState } from '@/lib/server/db'
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
    const now = Date.now()
    const job = (await listBookings())
      .filter((booking) => {
        if (!isPhoneAgentCandidate(booking) || !isZapytajPhoneBooking(booking) || booking.callStatus !== 'phone_agent_pending') return false
        return !booking.callNextAttemptAt || new Date(booking.callNextAttemptAt).getTime() <= now
      })
      .sort((a, b) => (a.bookingDate + 'T' + a.bookingTime).localeCompare(b.bookingDate + 'T' + b.bookingTime))[0]

    return NextResponse.json({ job: job ? toPhoneAgentCase(job) : null }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Nie udało się pobrać zadania telefonu.' }, { status: 503 })
  }
}

export async function POST(request: NextRequest) {
  if (!hasValidPhoneAgentAuthorization(request.headers.get('authorization'))) return unauthorized()

  try {
    const body = (await request.json()) as { bookingId?: unknown; event?: unknown; error?: unknown; manualCompletion?: unknown }
    const bookingId = typeof body.bookingId === 'string' ? body.bookingId.trim() : ''
    const event = typeof body.event === 'string' ? body.event : ''
    const error = typeof body.error === 'string' ? body.error.trim().slice(0, 300) : null
    const manualCompletion = body.manualCompletion === true
    // APK 1.5.4 reports completion manually without this newer flag.
    // Compatibility is limited to an explicitly configured manual provider.
    const legacyManualMode = process.env.PHONE_CALL_PROVIDER?.trim() === 'manual_sim'
    const booking = bookingId ? await getBookingById(bookingId) : null

    if (!booking || !isPhoneAgentCandidate(booking) || !isZapytajPhoneBooking(booking)) {
      return NextResponse.json({ error: 'Nie znaleziono aktywnej rozmowy.' }, { status: 404 })
    }

    const now = new Date().toISOString()
    const conflict = (reason: string) =>
      NextResponse.json({ error: reason, state: booking.callStatus }, { status: 409, headers: { 'Cache-Control': 'no-store' } })
    const idempotent = () =>
      NextResponse.json({ ok: true, state: booking.callStatus, idempotent: true }, { headers: { 'Cache-Control': 'no-store' } })
    const transition = async (
      expectedStatuses: string[],
      patch: Parameters<typeof transitionBookingCallState>[2],
      failure: string,
    ) => {
      const updated = await transitionBookingCallState(booking.id, expectedStatuses, patch)
      return updated
        ? NextResponse.json({ ok: true, state: updated.callStatus }, { headers: { 'Cache-Control': 'no-store' } })
        : conflict(failure)
    }

    if (event === 'claimed') {
      if (booking.callStatus === 'phone_agent_dialing') return idempotent()
      if (booking.callStatus !== 'phone_agent_pending') return conflict('Zadanie nie oczekuje na odebranie przez telefon.')
      if (booking.callNextAttemptAt && Date.parse(booking.callNextAttemptAt) > Date.now()) {
        return conflict('Kolejna próba połączenia nie jest jeszcze dostępna.')
      }
      return transition(
        ['phone_agent_pending'],
        { callId: 'android:' + booking.id, callStatus: 'phone_agent_dialing', callAttempt: (booking.callAttempt ?? 0) + 1, callLastError: null },
        'Zadanie zostało już przejęte przez inny proces.',
      )
    }

    if (event === 'started') {
      if (booking.callStatus === 'phone_agent_active') return idempotent()
      if (booking.callStatus !== 'phone_agent_dialing') return conflict('Rozmowę można oznaczyć jako rozpoczętą wyłącznie po wybraniu numeru.')
      return transition(
        ['phone_agent_dialing'],
        { callStatus: 'phone_agent_active', startedAt: now, callAnsweredAt: now, callLastError: null },
        'Stan rozmowy zmienił się przed potwierdzeniem odebrania.',
      )
    }

    if (event === 'ended') {
      if (booking.callStatus === 'phone_agent_completed') return idempotent()
      if (booking.callStatus === 'phone_agent_active') {
        return transition(['phone_agent_active'], { callStatus: 'phone_agent_completed', callNextAttemptAt: null, callLastError: null }, 'Stan rozmowy zmienił się przed jej zakończeniem.')
      }
      if (booking.callStatus === 'phone_agent_dialing' && (manualCompletion || legacyManualMode)) {
        return transition(['phone_agent_dialing'], { callStatus: 'phone_agent_completed', callNextAttemptAt: null, callLastError: null }, 'Stan rozmowy zmienił się przed ręcznym zakończeniem.')
      }
      return conflict('Nie można zakończyć rozmowy, która nie została odebrana. Ręczne zakończenie wymaga manualCompletion=true.')
    }

    if (event === 'no_answer') {
      if (booking.callStatus === 'phone_agent_pending' && booking.callLastError?.includes('Klient nie odebrał')) return idempotent()
      if (booking.callStatus !== 'phone_agent_dialing') return conflict('Brak odpowiedzi można zgłosić wyłącznie podczas wybierania numeru.')
      const attempt = booking.callAttempt ?? 1
      if (attempt < 2) {
        return transition(
          ['phone_agent_dialing'],
          { callId: null, callStatus: 'phone_agent_pending', callNextAttemptAt: new Date(Date.now() + 120000).toISOString(), callLastError: 'Klient nie odebrał — zaplanowano 2. próbę za 2 minuty.' },
          'Stan rozmowy zmienił się przed zapisem braku odpowiedzi.',
        )
      }
      return transition(
        ['phone_agent_dialing'],
        { callId: null, callStatus: 'phone_agent_failed', callLastError: 'Brak odebrania po dwóch próbach połączenia.' },
        'Stan rozmowy zmienił się przed zapisem braku odpowiedzi.',
      )
    }

    if (event === 'dropped') {
      if (booking.callStatus === 'phone_agent_pending' && booking.callLastError?.includes('Połączenie przerwane technicznie')) return idempotent()
      if (booking.callStatus !== 'phone_agent_active') return conflict('Techniczne przerwanie można zgłosić wyłącznie podczas aktywnej rozmowy.')
      return transition(
        ['phone_agent_active'],
        { callId: null, callStatus: 'phone_agent_pending', callNextAttemptAt: new Date(Date.now() + 30000).toISOString(), callLastError: 'Połączenie przerwane technicznie — wznowienie za 30 sekund.' },
        'Stan rozmowy zmienił się przed zapisem awarii.',
      )
    }

    if (event === 'failed') {
      if (booking.callStatus === 'phone_agent_failed') return idempotent()
      if (booking.callStatus !== 'phone_agent_dialing') return conflict('Błąd wybierania numeru nie może nadpisać aktywnej ani zakończonej rozmowy.')
      return transition(
        ['phone_agent_dialing'],
        { callId: null, callStatus: 'phone_agent_failed', callLastError: error || 'Telefon nie uruchomił połączenia.' },
        'Stan rozmowy zmienił się przed zapisem błędu.',
      )
    }

    return NextResponse.json({ error: 'Nieprawidłowy status zadania telefonu.' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Nie udało się zapisać statusu telefonu.' }, { status: 503 })
  }
}
