export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { listUrgentNowRequests } from '@/lib/server/db'
import { ConfigurationError } from '@/lib/server/env'
import { getReminderAuthorizationError } from '@/lib/server/reminder-runner'
import { sendAdminUrgentReminderSms } from '@/lib/server/sms'

const URGENT_WINDOW_MS = 15 * 60 * 1000
const REMINDER_AT_MS = 10 * 60 * 1000

export async function GET(request: Request) {
  try {
    const authorizationError = getReminderAuthorizationError(request.headers.get('authorization'))

    if (authorizationError) {
      return NextResponse.json({ error: authorizationError }, { status: 401 })
    }

    const now = Date.now()
    const requests = await listUrgentNowRequests()

    const due = requests.filter((r) => {
      if (r.status !== 'new') return false
      const age = now - new Date(r.createdAt).getTime()
      return age >= REMINDER_AT_MS && age < URGENT_WINDOW_MS
    })

    const results = await Promise.allSettled(
      due.map((r) => sendAdminUrgentReminderSms(r.id, r.name, r.topicLabel)),
    )

    return NextResponse.json({
      ok: true,
      checked: requests.filter((r) => r.status === 'new').length,
      reminded: due.length,
      results: results.map((r) => (r.status === 'fulfilled' ? r.value.status : 'rejected')),
    })
  } catch (err) {
    console.error('[regulski-behawiorysta][cron][urgent-reminders] error', err)
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: err instanceof ConfigurationError ? 503 : 500 })
  }
}

export async function POST(request: Request) {
  return GET(request)
}
