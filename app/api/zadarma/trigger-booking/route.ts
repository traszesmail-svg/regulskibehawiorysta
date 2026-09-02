import { NextResponse } from 'next/server'
import { getBookingForViewer } from '@/lib/server/db'
import { triggerZapytajCall } from '@/lib/server/zapytaj-call'

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

    const result = await triggerZapytajCall(booking)
    if (result.status === 'ignored') {
      return NextResponse.json({ error: result.reason }, { status: 400 })
    }
    if (result.status === 'manual_required') {
      return NextResponse.json({ error: result.reason }, { status: 503 })
    }

    return NextResponse.json({
      ok: true,
      status: result.status,
      callId: 'callId' in result ? result.callId : undefined,
      startsAt: 'startsAt' in result ? result.startsAt : undefined,
    })
  } catch (error) {
    console.error('[ZADARMA MAIN TRIGGER] failed', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Błąd połączenia.' }, { status: 500 })
  }
}
