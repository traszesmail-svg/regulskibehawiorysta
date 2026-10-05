import assert from 'node:assert/strict'
import { test } from 'node:test'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/phone-agent/heartbeat/route'
import { recordPhoneAgentHeartbeat } from '@/lib/server/phone-agent-store'
import { createLocalDataSandbox } from '@/scripts/lib/local-data-sandbox'

async function isolated(run: () => Promise<void>) {
  const sandbox = await createLocalDataSandbox('heartbeat-durability')
  const values = { APP_DATA_MODE: 'local', PHONE_AGENT_TOKEN: 'durability-test-token', NEXT_PUBLIC_SUPABASE_URL: 'https://operator-fixture.supabase.invalid', SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_fixture_not_a_real_key' }
  const previous = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]))
  const originalFetch = globalThis.fetch
  Object.assign(process.env, values)
  try { await run() } finally {
    globalThis.fetch = originalFetch
    for (const [key, value] of Object.entries(previous)) value === undefined ? delete process.env[key] : process.env[key] = value
    await sandbox.cleanup()
  }
}

test('heartbeat read failure rejects instead of returning previously cached ONLINE', async () => isolated(async () => {
  await recordPhoneAgentHeartbeat({ appVersion: 'cached-online' })
  process.env.APP_DATA_MODE = 'supabase'
  let reads = 0
  globalThis.fetch = async () => {
    reads++
    return new Response(JSON.stringify({ code: 'TEST_FAILURE', message: 'fixture unavailable' }), { status: 503, headers: { 'Content-Type': 'application/json' } })
  }
  const response = await GET(new NextRequest('http://localhost/api/phone-agent/heartbeat', { headers: { Authorization: 'Bearer durability-test-token' } }))
  assert.equal(response.status, 503)
  assert.ok(reads > 0)
  assert.equal((await response.json()).ok, undefined)
}))

test('heartbeat does not acknowledge a rejected durable write', async () => isolated(async () => {
  process.env.APP_DATA_MODE = 'supabase'
  let writes = 0
  const requests: string[] = []
  globalThis.fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : String(input)
    requests.push((init?.method ?? 'GET') + ' ' + url)
    assert.match(url, /^https:\/\/operator-fixture\.supabase\.invalid\//)
    if ((init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase() === 'POST') {
      writes++
      return new Response(JSON.stringify({ code: 'TEST_FAILURE', message: 'fixture write denied' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
    return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }
  const response = await POST(new NextRequest('http://localhost/api/phone-agent/heartbeat', { method: 'POST', headers: { Authorization: 'Bearer durability-test-token', 'Content-Type': 'application/json' }, body: JSON.stringify({ batteryLevel: 88 }) }))
  assert.equal(writes, 1, JSON.stringify({ requests, body: await response.clone().json() }))
  assert.equal(response.status, 503)
  assert.equal((await response.json()).ok, undefined)
}))
