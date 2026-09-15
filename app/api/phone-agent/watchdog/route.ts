import { NextRequest, NextResponse } from 'next/server'
import { hasValidPhoneAgentAuthorization } from '@/lib/server/phone-agent'
import { hasValidAdminAuthorization } from '@/lib/admin-auth'
import { runPhoneAgentWatchdogCheck } from '@/lib/server/phone-agent-store'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization')
  const isAuthorized = hasValidPhoneAgentAuthorization(auth) || hasValidAdminAuthorization(auth)

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Brak autoryzacji.' }, { status: 401 })
  }

  try {
    const result = await runPhoneAgentWatchdogCheck()
    return NextResponse.json({ ok: true, watchdog: result }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Błąd watchdoga telefonu.' },
      { status: 503 },
    )
  }
}
