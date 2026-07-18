import { NextResponse } from 'next/server'
import { ConfigurationError } from '@/lib/server/env'
import { confirmAccountSession, setAccountSessionCookies } from '@/lib/server/account-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { accessToken?: string; refreshToken?: string }
    const accessToken = body.accessToken?.trim() ?? ''
    const refreshToken = body.refreshToken?.trim() ?? ''

    if (!accessToken || !refreshToken) {
      return NextResponse.json({ ok: false, error: 'Link potwierdzający nie zawiera kompletnej sesji.' }, { status: 400 })
    }

    const session = await confirmAccountSession(accessToken, refreshToken)
    const response = NextResponse.json({ ok: true })
    setAccountSessionCookies(response, session)
    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nie udało się potwierdzić konta.'
    const status = error instanceof ConfigurationError ? 401 : 500
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}
