import { NextRequest, NextResponse } from 'next/server'
import { hasValidPhoneAgentAuthorization } from '@/lib/server/phone-agent'
import { isAdminRequestAuthorized } from '@/lib/admin-auth'
import { processCallerSmsForInboundCall } from '@/lib/server/caller-sms-policy'

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

  let body: { phone?: unknown; idempotencyKey?: unknown; dryRun?: unknown } | null = null
  try {
    body = (await request.json()) as { phone?: unknown; idempotencyKey?: unknown; dryRun?: unknown }
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: 'Nieprawidłowy format danych JSON (fail-closed).',
        action: 'do_not_send',
      },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const phone = typeof body?.phone === 'string' ? body.phone.trim() : ''
  const rawKey = typeof body?.idempotencyKey === 'string' ? body.idempotencyKey.trim() : ''

  if (rawKey.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
    return NextResponse.json(
      {
        ok: false,
        error: `Parametr idempotencyKey przekracza maksymalną dopuszczalną długość (${MAX_IDEMPOTENCY_KEY_LENGTH} znaków).`,
        action: 'do_not_send',
      },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  // Stage 3 requirement: "domyślnie preview/dry-run, bez mutacji kolejki"
  // dryRun defaults to true unless explicitly requested as false.
  const dryRun = body?.dryRun === false ? false : true

  try {
    const { classification, sms } = await processCallerSmsForInboundCall(phone, {
      idempotencyKey: rawKey || undefined,
      dryRun,
    })

    if (sms.status === 'do_not_send' && sms.rejectionReason?.includes('idempotency_conflict')) {
      return NextResponse.json(
        {
          ok: false,
          error: sms.rejectionReason,
          action: 'do_not_send',
          preview: dryRun,
          classification,
          sms,
        },
        { status: 409, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    return NextResponse.json(
      {
        ok: true,
        preview: dryRun,
        classification,
        sms,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: 'Błąd generatora wiadomości SMS po klasyfikacji (fail-closed)',
        action: 'do_not_send',
      },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
