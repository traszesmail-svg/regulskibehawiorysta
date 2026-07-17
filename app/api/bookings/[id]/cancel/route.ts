export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { canSelfCancelBooking } from '@/lib/self-cancellation'
import { getBookingForViewer, markBookingRefunded } from '@/lib/server/db'
import { ConfigurationError, getPublicFeatureUnavailableMessage } from '@/lib/server/env'
import { refundPayuBooking } from '@/lib/server/payu'

export const runtime = 'nodejs'

function resolveAccessToken(request: Request): string | null {
  return new URL(request.url).searchParams.get('access')
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ConfigurationError) {
    return getPublicFeatureUnavailableMessage('payment')
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Nie udało się anulować rezerwacji.'
}

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const booking = await getBookingForViewer(params.id, resolveAccessToken(request), request.headers.get('authorization'))

    if (!booking) {
      return NextResponse.json({ error: 'Ten link do potwierdzenia jest nieprawidłowy albo wygasł.' }, { status: 403 })
    }

    if (!canSelfCancelBooking(booking)) {
      return NextResponse.json(
        {
          error:
            '24-godzinne okno na bezpłatną rezygnację już minęło albo ta rezerwacja nie kwalifikuje się do automatycznego zwrotu.',
        },
        { status: 409 },
      )
    }

    if (booking.paymentMethod === 'stripe') {
      // Legacy Stripe bookings are finalized by the generic refund flow below.
    }

    if (booking.paymentMethod === 'payu') {
      await refundPayuBooking(booking)
    }

    const updatedBooking = await markBookingRefunded(booking.id)

    if (!updatedBooking) {
      return NextResponse.json({ error: 'Nie znaleziono rezerwacji do anulowania.' }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: error instanceof ConfigurationError ? 503 : 500 },
    )
  }
}
