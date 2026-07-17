import { NextResponse } from 'next/server'
import { ConfigurationError } from '@/lib/server/env'
import { getAccountUserFromAccessToken, setAccountSessionCookies, signInAccount } from '@/lib/server/account-auth'
import { claimPendingCaseMapProfileClaimsForUser } from '@/lib/server/case-map-profile-claims'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string; caseMapClaimToken?: string }
    const email = body.email?.trim().toLowerCase() ?? ''
    const password = body.password ?? ''

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: 'Podaj email i hasło.' }, { status: 400 })
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
    const response = NextResponse.json({ ok: true, caseMapProfileClaimed })
    setAccountSessionCookies(response, session)
    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nie udało się zalogować.'
    const status = error instanceof ConfigurationError ? 401 : 500
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}
