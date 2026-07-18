export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { getBookingForViewer } from '@/lib/server/db'
import { sendRescheduleRequestEmail } from '@/lib/server/notifications'

export const runtime = 'nodejs'

function resolveAccessToken(request: Request): string | null {
  return new URL(request.url).searchParams.get('access')
}

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const accessToken = resolveAccessToken(request)
    const booking = await getBookingForViewer(params.id, accessToken, request.headers.get('authorization'))

    if (!booking) {
      return NextResponse.json({ error: 'Nie masz dostępu do tej rezerwacji.' }, { status: 403 })
    }

    const body = (await request.json()) as { reason: string }

    if (!body.reason || !body.reason.trim()) {
      return NextResponse.json({ error: 'Podaj powód zmiany terminu.' }, { status: 400 })
    }

    const result = await sendRescheduleRequestEmail(booking, body.reason.trim())

    if (result.status !== 'sent') {
      return NextResponse.json(
        { error: 'Nie możemy teraz przekazać prośby o zmianę terminu. Spróbuj ponownie za chwilę albo napisz przez formularz kontaktowy.' },
        { status: result.status === 'skipped' ? 503 : 500 },
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Wystąpił błąd podczas zgłaszania prośby.' },
      { status: 500 },
    )
  }
}
