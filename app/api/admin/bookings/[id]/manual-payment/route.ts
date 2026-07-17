export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { approveManualPayment, rejectManualPayment } from '@/lib/server/manual-payments'

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const body = (await request.json()) as { action?: 'approve' | 'reject'; reason?: string }

    if (!(body.action === 'approve' || body.action === 'reject')) {
      return NextResponse.json({ error: 'Nieprawidłowa akcja płatności.' }, { status: 400 })
    }

    const booking =
      body.action === 'approve'
        ? await approveManualPayment(params.id)
        : await rejectManualPayment(params.id, body.reason)

    return NextResponse.json({ ok: true, bookingId: booking.id })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Nie udało się zaktualizować płatności.' },
      { status: 500 },
    )
  }
}
