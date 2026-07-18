import { NextResponse } from 'next/server'
import { getAccountUserFromAccessToken, getPublicAccountAuthFailure, setAccountSessionCookies, signInAccount } from '@/lib/server/account-auth'
import { PRIVATE_NO_STORE_HEADERS, consumeRequestRateLimit } from '@/lib/server/request-protection'
import { claimPendingCaseMapProfileClaimsForUser } from '@/lib/server/case-map-profile-claims'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const ACCOUNT_LOGIN_RATE_LIMIT = { key: 'account-login', limit: 10, windowMs: 15 * 60 * 1000 } as const

export async function POST(request: Request) {
  try {
    const rateLimit = consumeRequestRateLimit(request, ACCOUNT_LOGIN_RATE_LIMIT)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { ok: false, error: 'Za dużo prób logowania. Spróbuj ponownie później.' },
        { status: 429, headers: { ...PRIVATE_NO_STORE_HEADERS, 'Retry-After': String(rateLimit.retryAfterSeconds) } },
      )
    }

    const body = (await request.json()) as { email?: string; password?: string; caseMapClaimToken?: string }
    const email = body.email?.trim().toLowerCase() ?? ''
    const password = body.password ?? ''

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: 'Podaj email i hasło.' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS })
    }

    const session = await signInAccount(email, password)
    let caseMapProfileClaimed = false
    try {
      const user = await getAccountUserFromAccessToken(session.access_token)
      caseMapProfileClaimed = (await claimPendingCaseMapProfileClaimsForUser(user, body.caseMapClaimToken)).length > 0
    } catch (claimError) {
      // A failed optional claim must not block account access. It remains
      // pending until the next successful login within its retention window.
      console.error('[regulski-behawiorysta][account-login] case map profile claim skipped', claimError)
    }
    const response = NextResponse.json({ ok: true, caseMapProfileClaimed }, { headers: PRIVATE_NO_STORE_HEADERS })
    setAccountSessionCookies(response, session)
    return response
  } catch (error) {
    const failure = getPublicAccountAuthFailure('login', error)
    return NextResponse.json({ ok: false, error: failure.error }, { status: failure.status, headers: PRIVATE_NO_STORE_HEADERS })
  }
}
