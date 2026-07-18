import { NextResponse } from 'next/server'
import { ConfigurationError } from '@/lib/server/env'
import { getAccountLoginRedirectUrl, sendAccountPasswordReset } from '@/lib/server/account-auth'
import { PRIVATE_NO_STORE_HEADERS, consumeRequestRateLimit } from '@/lib/server/request-protection'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const ACCOUNT_RESET_RATE_LIMIT = { key: 'account-reset', limit: 5, windowMs: 60 * 60 * 1000 } as const

export async function POST(request: Request) {
  try {
    const rateLimit = consumeRequestRateLimit(request, ACCOUNT_RESET_RATE_LIMIT)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { ok: false, error: 'Za dużo prób wysłania linku. Spróbuj ponownie później.' },
        { status: 429, headers: { ...PRIVATE_NO_STORE_HEADERS, 'Retry-After': String(rateLimit.retryAfterSeconds) } },
      )
    }

    const body = (await request.json()) as { email?: string }
    const email = body.email?.trim().toLowerCase() ?? ''

    if (!email) {
      return NextResponse.json({ ok: false, error: 'Podaj email.' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS })
    }

    await sendAccountPasswordReset(email, getAccountLoginRedirectUrl())
    return NextResponse.json({ ok: true }, { headers: PRIVATE_NO_STORE_HEADERS })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nie udało się wysłać linku.'
    const status = error instanceof ConfigurationError ? 400 : 500
    return NextResponse.json({ ok: false, error: message }, { status, headers: PRIVATE_NO_STORE_HEADERS })
  }
}
