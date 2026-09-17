import { NextRequest, NextResponse } from 'next/server'
import { getReminderAuthorizationError } from '@/lib/server/reminder-runner'
import { runPhoneAgentWatchdogCheck } from '@/lib/server/phone-agent-store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Prepared for an external scheduler or Vercel Pro cron. Vercel supplies
// `Authorization: Bearer $CRON_SECRET` for configured cron invocations.
export async function GET(request: NextRequest) {
  try {
    const authorizationError = getReminderAuthorizationError(request.headers.get('authorization'))
    if (authorizationError) return NextResponse.json({ error: authorizationError }, { status: 401 })

    const watchdog = await runPhoneAgentWatchdogCheck()
    return NextResponse.json({ ok: true, watchdog }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Błąd watchdoga telefonu.' },
      { status: 503 },
    )
  }
}

// Supabase pg_net schedules JSON POSTs; Vercel Cron uses GET. Both use the
// same bearer-secret gate and execute exactly the same watchdog check.
export async function POST(request: NextRequest) {
  return GET(request)
}
