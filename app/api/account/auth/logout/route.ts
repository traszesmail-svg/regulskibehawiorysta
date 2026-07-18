import { NextResponse } from 'next/server'
import { clearAccountSessionCookies } from '@/lib/server/account-auth'
import { PRIVATE_NO_STORE_HEADERS } from '@/lib/server/request-protection'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST() {
  const response = NextResponse.json({ ok: true }, { headers: PRIVATE_NO_STORE_HEADERS })
  clearAccountSessionCookies(response)
  return response
}
