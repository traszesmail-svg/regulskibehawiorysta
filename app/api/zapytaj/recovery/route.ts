import { NextResponse } from 'next/server'
import {
  getBookingByRecoveryAccess,
  moveBookingToRecoverySlot,
} from '@/lib/server/db'
import { sendZapytajRecoveryConfirmationEmail } from '@/lib/server/notifications'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Niepoprawny format zapytania.' }, { status: 400 })
  }

  const bookingId = typeof body.bookingId === 'string' ? body.bookingId.trim() : ''
  const token = typeof body.token === 'string' ? body.token.trim() : ''
  const slotId = typeof body.slotId === 'string' ? body.slotId.trim() : ''
  if (!bookingId || !token || !slotId) {
    return NextResponse.json({ error: 'Brak danych potrzebnych do wyboru terminu.' }, { status: 400 })
  }

  try {
    const access = await getBookingByRecoveryAccess(bookingId, token)
    if (!access) return NextResponse.json({ error: 'Link do dodatkowego terminu wygasł albo jest nieprawidłowy.' }, { status: 403 })
    if (access.callRecoveryUsed) return NextResponse.json({ error: 'Dodatkowy termin został już wybrany.' }, { status: 409 })

    const booking = await moveBookingToRecoverySlot(bookingId, token, slotId)
    if (!booking) return NextResponse.json({ error: 'Nie udało się zarezerwować dodatkowego terminu.' }, { status: 409 })

    const email = await sendZapytajRecoveryConfirmationEmail(booking, token)
    return NextResponse.json({
      ok: true,
      bookingId: booking.id,
      redirectTo: `/call/${encodeURIComponent(booking.id)}?access=${encodeURIComponent(token)}`,
      emailStatus: email.status,
    })
  } catch (error) {
    console.error('[regulski-behawiorysta][zapytaj-recovery] failed', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Nie udało się zapisać dodatkowego terminu.' },
      { status: 409 },
    )
  }
}
