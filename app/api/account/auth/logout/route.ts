import { NextResponse } from 'next/server'
import { clearAccountSessionCookies } from '@/lib/server/account-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST() {
  const response = NextResponse.json({ ok: true })
  clearAccountSessionCookies(response)
  return response
}
