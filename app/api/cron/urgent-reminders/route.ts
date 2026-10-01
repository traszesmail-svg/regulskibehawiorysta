export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { ConfigurationError } from '@/lib/server/env'
import { getReminderAuthorizationError } from '@/lib/server/reminder-runner'
import { runUrgentReminderSweep } from '@/lib/server/urgent-reminder-runner'

export async function GET(request: Request) {
  try {
    const authorizationError = getReminderAuthorizationError(request.headers.get('authorization'))

    if (authorizationError) {
      return NextResponse.json({ error: authorizationError }, { status: 401 })
    }

    return NextResponse.json(await runUrgentReminderSweep())
  } catch (err) {
    console.error('[regulski-behawiorysta][cron][urgent-reminders] error', err)
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: err instanceof ConfigurationError ? 503 : 500 })
  }
}

export async function POST(request: Request) {
  return GET(request)
}
