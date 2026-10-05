import { NextRequest, NextResponse } from 'next/server'
import { hasValidPhoneAgentAuthorization } from '@/lib/server/phone-agent'
import { runUrgentReminderSweep } from '@/lib/server/urgent-reminder-runner'
import {
  getPhoneAgentDeviceState,
  recordPhoneAgentHeartbeat,
  generateUpcomingBookingSmsReminders,
  type PhoneAgentHeartbeatInput,
} from '@/lib/server/phone-agent-store'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function unauthorized() {
  return NextResponse.json({ error: 'Brak autoryzacji telefonu.' }, { status: 401 })
}

export async function GET(request: NextRequest) {
  if (!hasValidPhoneAgentAuthorization(request.headers.get('authorization'))) {
    return unauthorized()
  }

  try {
    const state = await getPhoneAgentDeviceState()
    return NextResponse.json({ ok: true, state }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Nie udało się pobrać stanu agenta.' },
      { status: 503 },
    )
  }
}

export async function POST(request: NextRequest) {
  if (!hasValidPhoneAgentAuthorization(request.headers.get('authorization'))) {
    return unauthorized()
  }

  try {
    const body = (await request.json().catch(() => ({}))) as PhoneAgentHeartbeatInput
    const state = await recordPhoneAgentHeartbeat(body)
    // Await durable urgent processing before the function can be suspended.
    // A sweep failure must not discard an already persisted device heartbeat.
    let urgentReminders: Awaited<ReturnType<typeof runUrgentReminderSweep>> | { ok: false }
    try {
      urgentReminders = await runUrgentReminderSweep()
      if (!urgentReminders.ok) console.warn('[phone-agent-heartbeat] urgent reminders partially failed')
    } catch {
      console.warn('[phone-agent-heartbeat] urgent reminders sweep failed')
      urgentReminders = { ok: false }
    }

    // Await queue persistence. Returning before it completes could make the
    // phone report a successful heartbeat while a reminder was lost.
    let bookingSmsReminders: Awaited<ReturnType<typeof generateUpcomingBookingSmsReminders>>
    try {
      bookingSmsReminders = await generateUpcomingBookingSmsReminders()
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          heartbeatPersisted: true,
          state,
          urgentReminders,
          error: error instanceof Error ? error.message : 'Nie udało się trwale zapisać przypomnień SMS.',
        },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    return NextResponse.json({ ok: true, state, urgentReminders, bookingSmsReminders }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Nie udało się zapisać meldunku telefonu.' },
      { status: 503 },
    )
  }
}
