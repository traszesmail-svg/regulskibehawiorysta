import { NextResponse } from 'next/server'
import { getBookingForViewer, updateBookingCallState } from '@/lib/server/db'
import { triggerZadarmaCallback } from '@/lib/server/zadarma'

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Niepoprawny format zapytania.' }, { status: 400 })
  }

  const bookingId = typeof body.bookingId === 'string' ? body.bookingId.trim() : ''
  const accessToken = typeof body.accessToken === 'string' ? body.accessToken.trim() : null
  if (!bookingId) return NextResponse.json({ error: 'Brak bookingId.' }, { status: 400 })

  try {
    const booking = await getBookingForViewer(bookingId, accessToken, request.headers.get('authorization'))
    if (!booking) return NextResponse.json({ error: 'Nie znaleziono rezerwacji albo link wygasł.' }, { status: 403 })
    if (booking.paymentStatus !== 'paid' || booking.consultationMode !== 'phone') {
      return NextResponse.json({ error: 'Połączenie telefoniczne nie jest opłaconym kanałem tej rezerwacji.' }, { status: 400 })
    }
    if (!booking.phone) return NextResponse.json({ error: 'Brak numeru telefonu w rezerwacji.' }, { status: 400 })
    if (booking.callId) return NextResponse.json({ ok: true, callId: booking.callId, status: booking.callStatus })

    const from = process.env.ZADARMA_BEHAWIORYSTA_SIP?.trim()
    if (!from) return NextResponse.json({ error: 'Telefon jest chwilowo niedostępny.' }, { status: 503 })

    const result = await triggerZadarmaCallback(from, booking.phone)
    if (result.status !== 'success' || !result.call_id) {
      return NextResponse.json({ error: result.message ?? 'Nie udało się uruchomić połączenia.' }, { status: 502 })
    }

    await updateBookingCallState(booking.id, { callId: result.call_id, callStatus: 'calling' })
    return NextResponse.json({ ok: true, callId: result.call_id, status: 'calling' })
  } catch (error) {
    console.error('[ZADARMA MAIN TRIGGER] failed', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Błąd połączenia.' }, { status: 500 })
  }
}