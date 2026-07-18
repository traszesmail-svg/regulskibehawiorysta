import { NextResponse } from 'next/server'
import { ConfigurationError } from '@/lib/server/env'
import { getAccountLoginRedirectUrl, sendAccountPasswordReset } from '@/lib/server/account-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string }
    const email = body.email?.trim().toLowerCase() ?? ''

    if (!email) {
      return NextResponse.json({ ok: false, error: 'Podaj email.' }, { status: 400 })
    }

    await sendAccountPasswordReset(email, getAccountLoginRedirectUrl())
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nie udało się wysłać linku.'
    const status = error instanceof ConfigurationError ? 400 : 500
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}
