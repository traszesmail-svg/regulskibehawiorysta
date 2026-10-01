import assert from 'node:assert/strict'
import test from 'node:test'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { NextRequest } from 'next/server'
import { POST as postHeartbeat } from '@/app/api/phone-agent/heartbeat/route'
import { GET as getUrgentCron } from '@/app/api/cron/urgent-reminders/route'
import { runUrgentReminderSweep } from '@/lib/server/urgent-reminder-runner'
import { listSmsQueue } from '@/lib/server/phone-agent-store'
import { listUrgentNowRequests } from '@/lib/server/urgent-now-store'
import { createLocalDataSandbox } from '@/scripts/lib/local-data-sandbox'
import type { UrgentNowRequestRecord } from '@/lib/urgent-now'

function request(id: string, createdAt: string): UrgentNowRequestRecord {
  return {
    id, createdAt, updatedAt: createdAt, status: 'new', name: 'Test', email: 'test@example.com',
    phone: '+48500600700', species: null, topicId: 'inne', topicLabel: 'Inne', message: 'Test',
    requestedDate: '2026-10-02', requestedTime: '12:00',
  }
}

test('urgent sweep respects 10m reminder, 15m timeout and manual operator response', async () => {
  const now = new Date('2026-10-01T10:15:00.000Z')
  const records = [
    request('before', '2026-10-01T10:00:00.001Z'),
    request('due', '2026-10-01T10:00:00.000Z'),
    { ...request('responded', '2026-10-01T09:00:00.000Z'), status: 'responded' as const },
    { ...request('already-sent', '2026-10-01T09:00:00.000Z'), noResponseSmsStatus: 'sent' as const },
    { ...request('lease-active', '2026-10-01T09:00:00.000Z'), noResponseSmsStatus: 'processing' as const, updatedAt: '2026-10-01T10:14:00.000Z' },
  ]
  const reminded: string[] = []
  const claimed: string[] = []
  const sent: string[] = []
  const result = await runUrgentReminderSweep({
    now: () => now,
    listUrgentNowRequests: async () => records,
    sendAdminUrgentReminderSms: async (id) => { reminded.push(id); return { status: 'sent', normalizedPhone: null } },
    claimUrgentNoResponseSms: async (id) => { claimed.push(id); return records.find((item) => item.id === id)! },
    sendUrgentNoResponseSms: async (item) => { sent.push(item.id); return { status: 'sent', normalizedPhone: item.phone ?? null } },
    markUrgentNoResponseSms: async () => null,
  })
  assert.equal(result.ok, true)
  assert.deepEqual(reminded, ['before'])
  assert.deepEqual(claimed, ['due'])
  assert.deepEqual(sent, ['due'])
})

test('urgent sweep reports failure and retries abandoned processing through the durable claim', async () => {
  const item = { ...request('stale', '2026-10-01T09:00:00.000Z'), noResponseSmsStatus: 'processing' as const }
  const result = await runUrgentReminderSweep({
    now: () => new Date('2026-10-01T10:15:00.000Z'),
    listUrgentNowRequests: async () => [item],
    claimUrgentNoResponseSms: async () => item,
    sendUrgentNoResponseSms: async () => { throw new Error('test failure') },
  })
  assert.equal(result.ok, false)
  assert.deepEqual(result.timeoutResults, ['rejected'])
})

test('authenticated Motorola heartbeat awaits timeout queueing; repeated/concurrent sweeps do not duplicate SMS; cron retains authorization', async () => {
  const sandbox = await createLocalDataSandbox('urgent-heartbeat', process.cwd())
  const env = { APP_DATA_MODE: 'local', PHONE_AGENT_TOKEN: 'test-phone-token', CRON_SECRET: 'test-cron-token', SMS_PROVIDER: 'phone_agent' }
  const previous = Object.fromEntries(Object.keys(env).map((key) => [key, process.env[key]]))
  Object.assign(process.env, env)
  const expired = new Date(Date.now() - 16 * 60 * 1000).toISOString()
  try {
    await writeFile(path.join(sandbox.dataDir, 'urgent-now-requests.json'), JSON.stringify({ requests: [request('heartbeat-timeout', expired)] }))
    const unauthorized = await postHeartbeat(new NextRequest('http://localhost/api/phone-agent/heartbeat', { method: 'POST' }))
    assert.equal(unauthorized.status, 401)
    assert.equal((await listSmsQueue()).length, 0)

    const response = await postHeartbeat(new NextRequest('http://localhost/api/phone-agent/heartbeat', {
      method: 'POST', headers: { Authorization: 'Bearer test-phone-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ batteryLevel: 95 }),
    }))
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.equal(body.ok, true)
    assert.equal(body.state.batteryLevel, 95)
    assert.equal(body.urgentReminders.ok, true)
    assert.deepEqual(body.urgentReminders.timeoutResults, ['sent'])
    // Queueing is complete when heartbeat returns, without a background task.
    const queued = await listSmsQueue()
    assert.equal(queued.length, 1)
    assert.equal(queued[0].status, 'pending')
    assert.equal(queued[0].idempotencyKey, 'urgent-no-response-heartbeat-timeout')
    assert.equal((await listUrgentNowRequests())[0].noResponseSmsStatus, 'sent')
    await Promise.all([runUrgentReminderSweep(), runUrgentReminderSweep()])
    assert.equal((await listSmsQueue()).length, 1)

    const records = await listUrgentNowRequests()
    await writeFile(path.join(sandbox.dataDir, 'urgent-now-requests.json'), JSON.stringify({ requests: [...records, request('concurrent-timeout', expired)] }))
    await Promise.all([runUrgentReminderSweep(), runUrgentReminderSweep()])
    assert.equal((await listSmsQueue()).filter((item) => item.idempotencyKey === 'urgent-no-response-concurrent-timeout').length, 1)

    const noAuth = await getUrgentCron(new Request('http://localhost/api/cron/urgent-reminders'))
    assert.equal(noAuth.status, 401)
    const phoneAuth = await getUrgentCron(new Request('http://localhost/api/cron/urgent-reminders', { headers: { Authorization: 'Bearer test-phone-token' } }))
    assert.equal(phoneAuth.status, 401)
    const cronAuth = await getUrgentCron(new Request('http://localhost/api/cron/urgent-reminders', { headers: { Authorization: 'Bearer test-cron-token' } }))
    assert.equal(cronAuth.status, 200)
    assert.equal((await cronAuth.json()).ok, true)
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
    await sandbox.cleanup()
  }
})
