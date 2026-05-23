import { NextResponse } from 'next/server'
import { ConfigurationError } from '@/lib/server/env'
import {
  getAccountUser,
  getAccountUserFromAccessToken,
  refreshAccountSession,
  setAccountSessionCookies,
} from '@/lib/server/account-auth'
import { getAccountHome } from '@/lib/server/account-store'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    try {
      const user = await getAccountUser(request)
      const payload = await getAccountHome(user)
      return NextResponse.json({ ok: true, account: payload })
    } catch (error) {
      if (!(error instanceof ConfigurationError)) throw error

      const refreshed = await refreshAccountSession(request)
      if (!refreshed) throw error

      const user = await getAccountUserFromAccessToken(refreshed.access_token)
      const payload = await getAccountHome(user)
      const response = NextResponse.json({ ok: true, account: payload })
      setAccountSessionCookies(response, refreshed)
      return response
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nie udało się odczytać konta.'
    const status = error instanceof ConfigurationError ? 401 : 500
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}
