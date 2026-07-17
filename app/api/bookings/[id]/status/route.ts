import { NextResponse } from 'next/server'
import { getBookingForViewer } from '@/lib/server/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

function readAccessToken(request: Request) {
  const { searchParams } = new URL(request.url)
  return searchParams.get('access')
}

export async function GET(request: Request, props: RouteContext) {
  const params = await props.params;
  try {
    const booking = await getBookingForViewer(params.id, readAccessToken(request), request.headers.get('authorization'))

    if (!booking) {
      return NextResponse.json({ error: 'Nie znaleziono rezerwacji.' }, { status: 404 })
    }

    return NextResponse.json({
      bookingId: booking.id,
      bookingStatus: booking.bookingStatus,
      paymentStatus: booking.paymentStatus,
      paymentMethod: booking.paymentMethod ?? null,
      paymentReference: booking.paymentReference ?? null,
      payuOrderId: booking.payuOrderId ?? null,
      payuOrderStatus: booking.payuOrderStatus ?? null,
      smsConfirmationStatus: booking.smsConfirmationStatus ?? null,
      updatedAt: booking.updatedAt,
    })
  } catch (error) {
    console.error('[regulski-behawiorysta][booking-status-api] load failed', error)
    return NextResponse.json({ error: 'Nie udało się odczytać statusu rezerwacji.' }, { status: 500 })
  }
}
