import { NextResponse } from 'next/server'
import { ConfigurationError } from '@/lib/server/env'
import { setAccountSessionCookies, signInAccount } from '@/lib/server/account-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string }
    const email = body.email?.trim().toLowerCase() ?? ''
    const password = body.password ?? ''

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: 'Podaj email i haslo.' }, { status: 400 })
    }

    const session = await signInAccount(email, password)
    const response = NextResponse.json({ ok: true })
    setAccountSessionCookies(response, session)
    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nie udalo sie zalogowac.'
    const status = error instanceof ConfigurationError ? 401 : 500
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}
