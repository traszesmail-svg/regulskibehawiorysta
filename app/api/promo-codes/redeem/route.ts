export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { getBookingForViewer } from '@/lib/server/db'
import { redeemPromoCodeForBooking } from '@/lib/server/promo-codes'

export async function POST(request: Request) {
  let body: Record<string, unknown>

  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Niepoprawny format zapytania.' }, { status: 400 })
  }

  const bookingId = typeof body.bookingId === 'string' ? body.bookingId.trim() : ''
  const accessToken = typeof body.accessToken === 'string' ? body.accessToken.trim() : ''
  const code = typeof body.code === 'string' ? body.code.trim() : ''
  const consultationMode = 'jitsi' as const


  if (body.consultationMode === 'phone') {
    return NextResponse.json({ error: 'Wariant telefoniczny wymaga numeru telefonu i osobnej dopłaty.' }, { status: 400 })
  }  if (!bookingId) {
    return NextResponse.json({ error: 'Brak bookingId.' }, { status: 400 })
  }

  if (!code) {
    return NextResponse.json({ error: 'Wpisz kod promocyjny.' }, { status: 400 })
  }

  try {
    const booking = await getBookingForViewer(bookingId, accessToken || null, request.headers.get('authorization'))

    if (!booking) {
      return NextResponse.json({ error: 'Nie znaleziono rezerwacji albo link wygasl.' }, { status: 403 })
    }

    const result = await redeemPromoCodeForBooking(booking, code, consultationMode)
    const redirectParams = new URLSearchParams({
      bookingId: result.booking.id,
      promo: 'redeemed',
    })

    if (accessToken) {
      redirectParams.set('access', accessToken)
    }

    return NextResponse.json({
      ok: true,
      redirectTo: `/confirmation?${redirectParams.toString()}`,
    })
  } catch (error) {
    console.error('[regulski-behawiorysta][promo-codes] redeem failed', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Nie udalo sie uzyc kodu promocyjnego.' },
      { status: 400 },
    )
  }
}
