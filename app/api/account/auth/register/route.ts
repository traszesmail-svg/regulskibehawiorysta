import { NextResponse } from 'next/server'
import { ConfigurationError } from '@/lib/server/env'
import { getAccountLoginRedirectUrl, getAccountUserFromAccessToken, setAccountSessionCookies, signUpAccount } from '@/lib/server/account-auth'
import { claimPendingCaseMapProfileClaimsForUser } from '@/lib/server/case-map-profile-claims'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function getSafeReturnTo(value: unknown) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/pokoj'
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string
      password?: string
      returnTo?: string
      caseMapClaimToken?: string
    }
    const email = body.email?.trim().toLowerCase() ?? ''
    const password = body.password ?? ''

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: 'Podaj email i hasło.' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ ok: false, error: 'Hasło musi mieć minimum 8 znaków.' }, { status: 400 })
    }

    const returnTo = getSafeReturnTo(body.returnTo)
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
    const response = NextResponse.json({ ok: true, hasSession: Boolean(session), caseMapProfileClaimed })
    if (session) setAccountSessionCookies(response, session)
    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nie udało się utworzyć konta.'
    const status = error instanceof ConfigurationError ? 400 : 500
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}
