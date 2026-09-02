export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { getBookingById } from '@/lib/server/db'
import { triggerZapytajCall } from '@/lib/server/zapytaj-call'

export async function POST(_request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params
    const booking = await getBookingById(id)
    if (!booking) return NextResponse.json({ error: 'Nie znaleziono rezerwacji.' }, { status: 404 })

    const result = await triggerZapytajCall(booking, { force: true })
    if (result.status === 'ignored') {
      return NextResponse.json({ error: result.reason }, { status: 400 })
    }

    return NextResponse.json({ ok: true, result })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Nie udało się uruchomić połączenia.' }, { status: 503 })
  }
}
