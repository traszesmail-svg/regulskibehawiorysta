export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { getBookingForViewer, markBookingDone } from '@/lib/server/db'
import { ConfigurationError } from '@/lib/server/env'

export const runtime = 'nodejs'

function resolveAccessToken(request: Request): string | null {
  return new URL(request.url).searchParams.get('access')
}

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const body = (await request.json()) as { recommendedNextStep?: string }
    const viewerBooking = await getBookingForViewer(
      params.id,
      resolveAccessToken(request),
      request.headers.get('authorization'),
    )

    if (!viewerBooking) {
      return NextResponse.json({ error: 'Ten link do rozmowy jest nieprawidłowy albo wygasł.' }, { status: 403 })
    }

    const canComplete =
      viewerBooking.paymentStatus === 'paid' &&
      (viewerBooking.bookingStatus === 'confirmed' || viewerBooking.bookingStatus === 'done')

    if (!canComplete) {
      return NextResponse.json(
        { error: 'Pokój można zamknąć dopiero po potwierdzonej płatności i aktywnej rezerwacji.' },
        { status: 409 },
      )
    }

    const booking = await markBookingDone(params.id, body.recommendedNextStep)

    if (!booking) {
      return NextResponse.json({ error: 'Nie znaleziono bookingu.' }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nie udało się zamknąć konsultacji.'
    return NextResponse.json({ error: message }, { status: error instanceof ConfigurationError ? 503 : 500 })
  }
}
