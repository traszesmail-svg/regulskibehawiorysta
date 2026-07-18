import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ConfigurationError, getSupabaseServerConfig } from '@/lib/server/env'
import { PRIVATE_NO_STORE_HEADERS, consumeRequestRateLimit } from '@/lib/server/request-protection'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const ACCOUNT_PASSWORD_UPDATE_RATE_LIMIT = { key: 'account-password-update', limit: 10, windowMs: 15 * 60 * 1000 } as const

function getSupabaseAuthClient() {
  const config = getSupabaseServerConfig('konto opiekuna')
  return createClient(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function POST(request: Request) {
  try {
    const rateLimit = consumeRequestRateLimit(request, ACCOUNT_PASSWORD_UPDATE_RATE_LIMIT)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { ok: false, error: 'Za dużo prób zmiany hasła. Spróbuj ponownie później.' },
        { status: 429, headers: { ...PRIVATE_NO_STORE_HEADERS, 'Retry-After': String(rateLimit.retryAfterSeconds) } },
      )
    }

    const body = (await request.json()) as { accessToken?: string; password?: string }
    const accessToken = body.accessToken?.trim() ?? ''
    const password = body.password ?? ''

    if (!accessToken || password.length < 8) {
      return NextResponse.json({ ok: false, error: 'Hasło musi mieć minimum 8 znaków.' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS })
    }

    const supabase = getSupabaseAuthClient()
    const { data, error } = await supabase.auth.getUser(accessToken)

    if (error || !data.user) {
      return NextResponse.json({ ok: false, error: 'Link do zmiany hasła wygasł.' }, { status: 401, headers: PRIVATE_NO_STORE_HEADERS })
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(data.user.id, { password })

    if (updateError) {
      throw new ConfigurationError(updateError.message)
    }

    return NextResponse.json({ ok: true }, { headers: PRIVATE_NO_STORE_HEADERS })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nie udało się ustawić hasła.'
    const status = error instanceof ConfigurationError ? 400 : 500
    return NextResponse.json({ ok: false, error: message }, { status, headers: PRIVATE_NO_STORE_HEADERS })
  }
}
