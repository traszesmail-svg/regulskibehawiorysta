import { NextResponse } from 'next/server'
import { ConfigurationError } from '@/lib/server/env'
import { confirmAccountSession, setAccountSessionCookies } from '@/lib/server/account-auth'
import { PRIVATE_NO_STORE_HEADERS, consumeRequestRateLimit } from '@/lib/server/request-protection'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const ACCOUNT_CONFIRM_RATE_LIMIT = { key: 'account-confirm', limit: 10, windowMs: 15 * 60 * 1000 } as const

export async function POST(request: Request) {
  try {
    const rateLimit = consumeRequestRateLimit(request, ACCOUNT_CONFIRM_RATE_LIMIT)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { ok: false, error: 'Za dużo prób potwierdzenia konta. Spróbuj ponownie później.' },
        { status: 429, headers: { ...PRIVATE_NO_STORE_HEADERS, 'Retry-After': String(rateLimit.retryAfterSeconds) } },
      )
    }

    const body = (await request.json()) as { accessToken?: string; refreshToken?: string }
    const accessToken = body.accessToken?.trim() ?? ''
    const refreshToken = body.refreshToken?.trim() ?? ''

    if (!accessToken || !refreshToken) {
      return NextResponse.json({ ok: false, error: 'Link potwierdzający nie zawiera kompletnej sesji.' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS })
    }

    const session = await confirmAccountSession(accessToken, refreshToken)
    const response = NextResponse.json({ ok: true }, { headers: PRIVATE_NO_STORE_HEADERS })
    setAccountSessionCookies(response, session)
    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nie udało się potwierdzić konta.'
    const status = error instanceof ConfigurationError ? 401 : 500
    return NextResponse.json({ ok: false, error: message }, { status, headers: PRIVATE_NO_STORE_HEADERS })
  }
}
