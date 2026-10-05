import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createLocalDataSandbox } from '@/scripts/lib/local-data-sandbox'
import { recordPhoneAgentHeartbeat, runPhoneAgentWatchdogCheck } from '@/lib/server/phone-agent-store'

async function offlineFixture(dir: string) {
  await recordPhoneAgentHeartbeat({ appVersion: 'test-only' })
  const file = path.join(dir, 'phone-agent-state.json')
  const state = JSON.parse(await readFile(file, 'utf8'))
  state.lastHeartbeatAt = new Date(Date.now() - 300_000).toISOString()
  await writeFile(file, JSON.stringify(state))
  return file
}

test('watchdog does not claim a skipped alert was sent or throttle the next attempt', async () => {
  const sandbox = await createLocalDataSandbox('watchdog-skipped-alert')
  const overrides = { APP_DATA_MODE: 'local', RESEND_API_KEY: '', SMTP_HOST: '', VAPID_PUBLIC_KEY: '', VAPID_PRIVATE_KEY: '' }
  const previous = Object.fromEntries(Object.keys(overrides).map(key => [key, process.env[key]]))
  Object.assign(process.env, overrides)
  try {
    const file = await offlineFixture(sandbox.dataDir)
    const result = await runPhoneAgentWatchdogCheck()
    assert.equal(result.liveDisabled, true)
    assert.equal(result.alertsSent, false)
    assert.equal(JSON.parse(await readFile(file, 'utf8')).lastOutageAlertSentAt, null)
  } finally {
    for (const [key, value] of Object.entries(previous)) value === undefined ? delete process.env[key] : process.env[key] = value
    await sandbox.cleanup()
  }
})

test('watchdog rejects when Live cannot be disabled instead of reporting success', async () => {
  const sandbox = await createLocalDataSandbox('watchdog-live-disable-failure')
  const previous = process.env.APP_DATA_MODE
  process.env.APP_DATA_MODE = 'local'
  try {
    const file = await offlineFixture(sandbox.dataDir)
    await mkdir(path.join(sandbox.dataDir, 'zapytaj-live.json'))
    await assert.rejects(runPhoneAgentWatchdogCheck())
    assert.equal(JSON.parse(await readFile(file, 'utf8')).lastOutageAlertSentAt, null)
  } finally {
    previous === undefined ? delete process.env.APP_DATA_MODE : process.env.APP_DATA_MODE = previous
    await sandbox.cleanup()
  }
})
