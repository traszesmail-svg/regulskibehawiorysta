import { NextResponse } from 'next/server'
import { getSafeInternalReturnPath } from '@/lib/safe-return-path'
import { getAccountLoginRedirectUrl, getAccountUserFromAccessToken, getPublicAccountAuthFailure, setAccountSessionCookies, signUpAccount } from '@/lib/server/account-auth'
import { PRIVATE_NO_STORE_HEADERS, consumeRequestRateLimit } from '@/lib/server/request-protection'
import { claimPendingCaseMapProfileClaimsForUser } from '@/lib/server/case-map-profile-claims'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const ACCOUNT_REGISTER_RATE_LIMIT = { key: 'account-register', limit: 5, windowMs: 60 * 60 * 1000 } as const

export async function POST(request: Request) {
  try {
    const rateLimit = consumeRequestRateLimit(request, ACCOUNT_REGISTER_RATE_LIMIT)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { ok: false, error: 'Za dużo prób utworzenia konta. Spróbuj ponownie później.' },
        { status: 429, headers: { ...PRIVATE_NO_STORE_HEADERS, 'Retry-After': String(rateLimit.retryAfterSeconds) } },
      )
    }

    const body = (await request.json()) as {
      email?: string
      password?: string
      returnTo?: string
      caseMapClaimToken?: string
    }
    const email = body.email?.trim().toLowerCase() ?? ''
    const password = body.password ?? ''

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: 'Podaj email i hasło.' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS })
    }

    if (password.length < 8) {
      return NextResponse.json({ ok: false, error: 'Hasło musi mieć minimum 8 znaków.' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS })
    }

    const returnTo = getSafeInternalReturnPath(body.returnTo)
    const redirectTo = getAccountLoginRedirectUrl(returnTo)
    const session = await signUpAccount(email, password, redirectTo)
    let caseMapProfileClaimed = false
    if (session) {
      try {
        const user = await getAccountUserFromAccessToken(session.access_token)
        caseMapProfileClaimed = (await claimPendingCaseMapProfileClaimsForUser(user, body.caseMapClaimToken)).length > 0
      } catch (claimError) {
        console.error('[regulski-behawiorysta][account-register] case map profile claim skipped', claimError)
      }
    }
    const response = NextResponse.json({ ok: true, hasSession: Boolean(session), caseMapProfileClaimed }, { headers: PRIVATE_NO_STORE_HEADERS })
    if (session) setAccountSessionCookies(response, session)
    return response
  } catch (error) {
    const failure = getPublicAccountAuthFailure('register', error)
    return NextResponse.json({ ok: false, error: failure.error }, { status: failure.status, headers: PRIVATE_NO_STORE_HEADERS })
  }
}
