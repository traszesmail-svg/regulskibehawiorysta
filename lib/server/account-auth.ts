import { createClient, type Session, type User } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { ConfigurationError, getSupabaseServerConfig } from '@/lib/server/env'

export const ACCOUNT_ACCESS_COOKIE = 'regulski_account_access'
export const ACCOUNT_REFRESH_COOKIE = 'regulski_account_refresh'

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

function getSupabaseAuthClient() {
  const config = getSupabaseServerConfig('konto opiekuna')

  return createClient(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

function readCookie(header: string | null, name: string) {
  if (!header) return null

  const prefix = `${name}=`
  const part = header
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(prefix))

  return part ? decodeURIComponent(part.slice(prefix.length)) : null
}

export function setAccountSessionCookies(response: NextResponse, session: Session) {
  const secure = process.env.NODE_ENV === 'production'

  response.cookies.set(ACCOUNT_ACCESS_COOKIE, session.access_token, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: session.expires_in ?? COOKIE_MAX_AGE_SECONDS,
  })

  response.cookies.set(ACCOUNT_REFRESH_COOKIE, session.refresh_token, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: COOKIE_MAX_AGE_SECONDS,
  })
}

export function clearAccountSessionCookies(response: NextResponse) {
  response.cookies.set(ACCOUNT_ACCESS_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })

  response.cookies.set(ACCOUNT_REFRESH_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
}

export function readBearerToken(request: Request) {
  const header = request.headers.get('authorization') ?? ''

  if (header.startsWith('Bearer ')) {
    const token = header.slice('Bearer '.length).trim()
    if (token) return token
  }

  return readCookie(request.headers.get('cookie'), ACCOUNT_ACCESS_COOKIE)
}

export function readRefreshToken(request: Request) {
  return readCookie(request.headers.get('cookie'), ACCOUNT_REFRESH_COOKIE)
}

export async function signInAccount(email: string, password: string) {
  const supabase = getSupabaseAuthClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })

  if (error || !data.session) {
    throw new ConfigurationError(error?.message ?? 'Nie udalo sie zalogowac.')
  }

  return data.session
}

export async function signUpAccount(email: string, password: string, redirectTo: string) {
  const supabase = getSupabaseAuthClient()
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      emailRedirectTo: redirectTo,
    },
  })

  if (error) {
    throw new ConfigurationError(error.message)
  }

  return data.session ?? null
}

export async function sendAccountPasswordReset(email: string, redirectTo: string) {
  const supabase = getSupabaseAuthClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo,
  })

  if (error) {
    throw new ConfigurationError(error.message)
  }
}

export async function refreshAccountSession(request: Request) {
  const refreshToken = readRefreshToken(request)
  if (!refreshToken) return null

  const supabase = getSupabaseAuthClient()
  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  })

  if (error || !data.session) return null
  return data.session
}

export async function getAccountUser(request: Request): Promise<User> {
  const token = readBearerToken(request)

  if (!token) {
    throw new ConfigurationError('Brak sesji konta opiekuna.')
  }

  return getAccountUserFromAccessToken(token)
}

export async function getAccountUserFromAccessToken(token: string): Promise<User> {
  const supabase = getSupabaseAuthClient()
  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data.user?.email) {
    throw new ConfigurationError('Sesja konta opiekuna wygasla albo jest niepoprawna.')
  }

  return data.user
}
