import { NextRequest, NextResponse } from 'next/server'
import { hasValidPhoneAgentAuthorization } from '@/lib/server/phone-agent'
import { isAdminRequestAuthorized } from '@/lib/admin-auth'
import { classifyIncomingCaller } from '@/lib/server/caller-classifier'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const MAX_IDEMPOTENCY_KEY_LENGTH = 128

function unauthorized() {
  return NextResponse.json({ error: 'Brak autoryzacji agenta telefonu.' }, { status: 401 })
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const isAuthorized =
    hasValidPhoneAgentAuthorization(authHeader) ||
    (await isAdminRequestAuthorized(request.headers))

  if (!isAuthorized) {
    return unauthorized()
  }

  let body: { phone?: unknown; idempotencyKey?: unknown } | null = null
  try {
    body = (await request.json()) as { phone?: unknown; idempotencyKey?: unknown }
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: 'Nieprawidłowy format danych JSON (fail-closed).',
        allowCall: false,
      },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const rawKey = typeof body?.idempotencyKey === 'string' ? body.idempotencyKey.trim() : ''

  if (!rawKey) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Wymagany jest niepusty parametr idempotencyKey.',
        allowCall: false,
      },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  if (rawKey.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
    return NextResponse.json(
      {
        ok: false,
        error: `Parametr idempotencyKey przekracza maksymalną dopuszczalną długość (${MAX_IDEMPOTENCY_KEY_LENGTH} znaków).`,
        allowCall: false,
      },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const phone = typeof body?.phone === 'string' ? body.phone.trim() : ''

  try {
    const result = await classifyIncomingCaller(phone, { idempotencyKey: rawKey })

    if (result.decision === 'idempotency_conflict') {
      return NextResponse.json(
        {
          ok: false,
          error: result.reason,
          allowCall: false,
          result,
        },
        { status: 409, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    return NextResponse.json(
      { ok: true, result },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: 'Błąd klasyfikacji połączenia przychodzącego (fail-closed)',
        allowCall: false,
      },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
