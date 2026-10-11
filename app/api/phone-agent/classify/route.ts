import { NextRequest, NextResponse } from 'next/server'
import { hasValidPhoneAgentAuthorization } from '@/lib/server/phone-agent'
import { isAdminRequestAuthorized } from '@/lib/admin-auth'
import { classifyIncomingCaller } from '@/lib/server/caller-classifier'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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

  try {
    const body = (await request.json()) as { phone?: unknown; idempotencyKey?: unknown }
    const phone = typeof body?.phone === 'string' ? body.phone.trim() : ''
    const idempotencyKey = typeof body?.idempotencyKey === 'string' ? body.idempotencyKey.trim() : undefined

    const result = await classifyIncomingCaller(phone, { idempotencyKey })

    return NextResponse.json(
      { ok: true, result },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
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
