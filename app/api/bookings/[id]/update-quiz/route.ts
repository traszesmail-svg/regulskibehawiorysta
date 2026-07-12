export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { getBookingForViewer, updateBookingQuiz } from '@/lib/server/db'

export const runtime = 'nodejs'

function resolveAccessToken(request: Request): string | null {
  return new URL(request.url).searchParams.get('access')
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const accessToken = resolveAccessToken(request)
    const booking = await getBookingForViewer(params.id, accessToken, request.headers.get('authorization'))

    if (!booking) {
      return NextResponse.json({ error: 'Nie masz dostępu do tej rezerwacji.' }, { status: 403 })
    }

    const body = (await request.json()) as {
      petAge?: string
      durationNotes?: string
      description?: string
    }

    const patch: {
      petAge?: string
      durationNotes?: string
      description?: string
    } = {}

    if (typeof body.petAge === 'string') patch.petAge = body.petAge
    if (typeof body.durationNotes === 'string') patch.durationNotes = body.durationNotes
    if (typeof body.description === 'string') patch.description = body.description

    const updatedBooking = await updateBookingQuiz(booking.id, patch)

    if (!updatedBooking) {
      return NextResponse.json({ error: 'Nie znaleziono rezerwacji do aktualizacji.' }, { status: 404 })
    }

    return NextResponse.json({ ok: true, booking: updatedBooking })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Wystąpił błąd podczas aktualizacji formularza.' },
      { status: 500 },
    )
  }
}
