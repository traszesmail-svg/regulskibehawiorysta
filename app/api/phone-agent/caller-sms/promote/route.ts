import { NextRequest, NextResponse } from 'next/server'
import { hasValidPhoneAgentAuthorization } from '@/lib/server/phone-agent'
import { getAdminAuthChallengeHeaders, isAdminRequestAuthorized } from '@/lib/admin-auth'
import {
  isStage4PromotionEnabled,
  promoteCallerSmsToQueue,
  STAGE4_RUNTIME_FLAG_ENV,
} from '@/lib/server/caller-sms-policy'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export type PromoteRouteDependencies = {
  promoter?: typeof promoteCallerSmsToQueue
}

export async function POST(
  request: NextRequest,
  deps?: PromoteRouteDependencies,
) {
  const promoteFn = deps?.promoter ?? promoteCallerSmsToQueue
  // 1. Admin authorization check: phone-agent token alone is NOT sufficient
  const isAdmin = await isAdminRequestAuthorized(request.headers)
  if (!isAdmin) {
    const authHeader = request.headers.get('authorization')
    if (hasValidPhoneAgentAuthorization(authHeader)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Token agenta telefonu nie wystarcza do autoryzacji kontaktu. Wymagana jest autoryzacja administratora (fail-closed).',
        },
        { status: 403, headers: { 'Cache-Control': 'no-store' } },
      )
    }
    return NextResponse.json(
      {
        ok: false,
        error: 'Brak autoryzacji administratora.',
      },
      {
        status: 401,
        headers: {
          'Cache-Control': 'no-store',
          ...getAdminAuthChallengeHeaders(),
        },
      },
    )
  }

  // 2. Parse request JSON body
  let body: Record<string, unknown> | null = null
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: 'Nieprawidłowy format danych JSON (fail-closed).',
      },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const preparationId = typeof body?.preparationId === 'string' ? body.preparationId.trim() : ''
  const approvalId =
    typeof body?.approvalId === 'string'
      ? body.approvalId.trim()
      : typeof body?.idempotencyKey === 'string'
        ? body.idempotencyKey.trim()
        : ''
  const rawPhone =
    typeof body?.rawPhone === 'string'
      ? body.rawPhone.trim()
      : typeof body?.phone === 'string'
        ? body.phone.trim()
        : ''
  const isControlledTechnicalTest =
    body?.isControlledTechnicalTest === true || body?.confirmation === 'controlled_technical_test'

  // dryRun defaults to true unless explicitly requested as false
  const dryRun = body?.dryRun === false ? false : true
  const messageOverride = typeof body?.message === 'string' ? body.message : undefined

  // 3. Runtime flag check: mutations are strictly disabled unless enabled in runtime configuration
  if (!dryRun && !isStage4PromotionEnabled()) {
    return NextResponse.json(
      {
        ok: false,
        error: `Bramka promocji SMS Etapu 4 jest wyłączona w konfiguracji runtime (${STAGE4_RUNTIME_FLAG_ENV}=false). Mutacje kolejki są zablokowane.`,
        preview: true,
      },
      { status: 403, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  // 4. Run promotion gate logic
  try {
    const result = await promoteFn({
      preparationId,
      approvalId,
      rawPhone,
      isControlledTechnicalTest,
      dryRun,
      messageOverride,
      adminAuthorized: true,
    })

    if (!result.ok) {
      const statusCode =
        result.status === 'idempotency_conflict'
          ? 409
          : result.rejectionReason?.includes('wyłączona w konfiguracji')
            ? 403
            : 400

      return NextResponse.json(
        {
          ok: false,
          error: result.rejectionReason,
          status: result.status,
          preview: result.preview,
        },
        { status: statusCode, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    return NextResponse.json(
      {
        ok: true,
        preview: result.preview,
        isRetry: result.isRetry ?? false,
        status: result.status,
        queueItem: result.queueItem,
        preparation: result.preparation,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const sanitizedError = errorMessage
      .replace(/\+?\d{9,15}/g, '[REDACTED_PHONE]')
      .replace(/key=[^\s&]+/gi, 'key=[REDACTED]')
      .replace(/secret=[^\s&]+/gi, 'secret=[REDACTED]')
      .replace(/password=[^\s&]+/gi, 'password=[REDACTED]')
      .replace(/bearer\s+[^\s]+/gi, 'bearer [REDACTED]')

    console.error(
      `[caller-sms/promote] Błąd wewnętrzny bramki promocji SMS: ${sanitizedError}`,
    )

    return NextResponse.json(
      {
        ok: false,
        error: 'Błąd wewnętrzny bramki promocji SMS (fail-closed)',
        code: 'PROMOTION_INTERNAL_ERROR',
      },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
