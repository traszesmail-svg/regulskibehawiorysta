import { NextRequest, NextResponse } from 'next/server'
import { listBookings } from '@/lib/server/db'
import { hasValidPhoneAgentAuthorization, isPhoneAgentCandidate, toPhoneAgentCase } from '@/lib/server/phone-agent'
import { isZapytajPhoneBooking } from '@/lib/server/zapytaj-call'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  if (!hasValidPhoneAgentAuthorization(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Brak autoryzacji telefonu.' }, { status: 401 })
  }

  try {
    const cases = (await listBookings())
      .filter((booking) => isPhoneAgentCandidate(booking) && isZapytajPhoneBooking(booking))
      .sort((a, b) => `${a.bookingDate}T${a.bookingTime}`.localeCompare(`${b.bookingDate}T${b.bookingTime}`))
      .map(toPhoneAgentCase)
    return NextResponse.json({ cases, generatedAt: new Date().toISOString() }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Nie udało się pobrać spraw.' }, { status: 503 })
  }
}
