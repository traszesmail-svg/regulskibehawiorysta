import { claimUrgentNoResponseSms, listUrgentNowRequests, markUrgentNoResponseSms } from '@/lib/server/db'
import { sendAdminUrgentReminderSms, sendUrgentNoResponseSms } from '@/lib/server/sms'
import { isUrgentOperatorResponseOverdue } from '@/lib/urgent-now-policy'

const URGENT_WINDOW_MS = 15 * 60 * 1000
const REMINDER_AT_MS = 10 * 60 * 1000
const PROCESSING_LEASE_MS = 5 * 60 * 1000

const defaultDeps = {
  listUrgentNowRequests,
  claimUrgentNoResponseSms,
  markUrgentNoResponseSms,
  sendAdminUrgentReminderSms,
  sendUrgentNoResponseSms,
  now: () => new Date(),
}

/** Runs at the first authenticated Motorola heartbeat after a deadline.
 * The durable claim and SMS queue idempotency keys protect concurrent/repeated calls.
 */
export async function runUrgentReminderSweep(overrides: Partial<typeof defaultDeps> = {}) {
  const deps = { ...defaultDeps, ...overrides }
  const now = deps.now().getTime()
  const requests = await deps.listUrgentNowRequests()
  const due = requests.filter((item) => {
    const age = now - Date.parse(item.createdAt)
    return item.status === 'new' && age >= REMINDER_AT_MS && age < URGENT_WINDOW_MS
  })
  const timeoutDue = requests.filter((item) =>
    item.species === null &&
    (!item.noResponseSmsStatus || (item.noResponseSmsStatus === 'processing' && now - Date.parse(item.updatedAt) >= PROCESSING_LEASE_MS)) &&
    isUrgentOperatorResponseOverdue(item.createdAt, item.status, new Date(now)),
  )
  const reminders = await Promise.allSettled(
    due.map((item) => deps.sendAdminUrgentReminderSms(item.id, item.name, item.topicLabel)),
  )
  const timeouts = await Promise.allSettled(timeoutDue.map(async (item) => {
    const claimed = await deps.claimUrgentNoResponseSms(item.id)
    if (!claimed) return 'already_claimed'
    const sms = await deps.sendUrgentNoResponseSms(claimed)
    const status = sms.status === 'sent' ? 'sent' : sms.status.startsWith('skipped') ? 'skipped' : 'failed'
    await deps.markUrgentNoResponseSms({ id: item.id, status })
    return status
  }))
  const results = reminders.map((result) => result.status === 'fulfilled' ? result.value.status : 'rejected')
  const timeoutResults = timeouts.map((result) => result.status === 'fulfilled' ? result.value : 'rejected')
  return {
    ok: ![...results, ...timeoutResults].some((status) => status === 'failed' || status === 'rejected'),
    checked: requests.filter((item) => item.status === 'new').length,
    reminded: due.length,
    results,
    timedOut: timeoutDue.length,
    timeoutResults,
  }
}
