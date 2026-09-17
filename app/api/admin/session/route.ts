import { NextResponse } from 'next/server'
import { ADMIN_SESSION_COOKIE, createAdminSessionToken, hasValidAdminPassword } from '@/lib/admin-auth'

export async function POST(request: Request) {
  const form = await request.formData()
  const password = form.get('password')
  if (typeof password !== 'string' || !hasValidAdminPassword(password)) {
    return NextResponse.redirect(new URL('/admin/login?error=1', request.url), 303)
  }
  const token = await createAdminSessionToken()
  if (!token) return NextResponse.redirect(new URL('/admin/login?error=1', request.url), 303)
  const response = NextResponse.redirect(new URL('/admin', request.url), 303)
  response.cookies.set(ADMIN_SESSION_COOKIE, token, { httpOnly: true, sameSite: 'strict', secure: true, path: '/', maxAge: 60 * 60 * 24 * 30 })
  return response
}
