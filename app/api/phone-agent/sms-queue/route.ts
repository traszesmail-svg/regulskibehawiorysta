import { NextRequest, NextResponse } from 'next/server'
import { hasValidPhoneAgentAuthorization } from '@/lib/server/phone-agent'
import {
  claimNextPendingSms,
  reportSmsResult,
  listSmsQueue,
} from '@/lib/server/phone-agent-store'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function unauthorized() {
  return NextResponse.json({ error: 'Brak autoryzacji telefonu.' }, { status: 401 })
}

export async function GET(request: NextRequest) {
  if (!hasValidPhoneAgentAuthorization(request.headers.get('authorization'))) {
    return unauthorized()
  }

  try {
    const listAll = request.nextUrl.searchParams.get('all') === 'true'
    if (listAll) {
      const items = await listSmsQueue(50)
      return NextResponse.json({ items }, { headers: { 'Cache-Control': 'no-store' } })
    }

    const nextSms = await claimNextPendingSms()
    return NextResponse.json({ sms: nextSms }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Nie udało się pobrać kolejki SMS.' },
      { status: 503 },
    )
  }
}

export async function POST(request: NextRequest) {
  if (!hasValidPhoneAgentAuthorization(request.headers.get('authorization'))) {
    return unauthorized()
  }

  try {
    const body = (await request.json()) as { id?: unknown; status?: unknown; error?: unknown }
    const id = typeof body.id === 'string' ? body.id.trim() : ''
    const status = body.status === 'sent' || body.status === 'failed' ? body.status : null
    const error = typeof body.error === 'string' ? body.error : undefined

    if (!id || !status) {
      return NextResponse.json({ error: 'Wymagane pola: id oraz status ("sent" lub "failed").' }, { status: 400 })
    }

    const updated = await reportSmsResult(id, status, error)
    if (!updated) {
      return NextResponse.json({ error: 'Nie znaleziono wiadomości SMS o podanym ID.' }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : error && typeof error === 'object' && 'message' in error
          ? String((error as { message: unknown }).message)
          : 'Nie udało się zaktualizować statusu SMS.'
    return NextResponse.json({ error: message }, { status: 503 })
  }
}
