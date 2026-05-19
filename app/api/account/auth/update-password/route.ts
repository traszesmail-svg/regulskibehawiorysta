import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ConfigurationError, getSupabaseServerConfig } from '@/lib/server/env'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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
    const body = (await request.json()) as { accessToken?: string; password?: string }
    const accessToken = body.accessToken?.trim() ?? ''
    const password = body.password ?? ''

    if (!accessToken || password.length < 8) {
      return NextResponse.json({ ok: false, error: 'Haslo musi miec minimum 8 znakow.' }, { status: 400 })
    }

    const supabase = getSupabaseAuthClient()
    const { data, error } = await supabase.auth.getUser(accessToken)

    if (error || !data.user) {
      return NextResponse.json({ ok: false, error: 'Link do zmiany hasla wygasl.' }, { status: 401 })
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(data.user.id, { password })

    if (updateError) {
      throw new ConfigurationError(updateError.message)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nie udalo sie ustawic hasla.'
    const status = error instanceof ConfigurationError ? 400 : 500
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}
