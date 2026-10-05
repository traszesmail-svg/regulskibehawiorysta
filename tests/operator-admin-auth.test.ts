import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createAdminSessionToken, isAdminRequestAuthorized } from '@/lib/admin-auth'
import { getOperatorStatusPresentation, OPERATOR_HEARTBEAT_TIMEOUT_MS } from '@/lib/operator-status-presentation'
import type { OperatorStatusData } from '@/components/AdminOperatorMobileCard'

test('admin request accepts Basic or signed cookie and rejects malformed sessions', async () => {
  const secret = 'operator-test-secret'
  const token = await createAdminSessionToken(secret)
  assert.ok(token)
  assert.equal(await isAdminRequestAuthorized(new Headers({ cookie: 'rb_admin_session=' + token }), secret), true)
  assert.equal(await isAdminRequestAuthorized(new Headers({ authorization: 'Basic ' + Buffer.from('admin:' + secret).toString('base64') }), secret), true)
  assert.equal(await isAdminRequestAuthorized(new Headers({ cookie: 'rb_admin_session=v1.future' }), secret), false)
  assert.equal(await isAdminRequestAuthorized(new Headers(), secret), false)
})

test('operator presentation expires heartbeat and live availability on client time', () => {
  const now = Date.now()
  const data = {
    device: { lastHeartbeatAt: new Date(now - OPERATOR_HEARTBEAT_TIMEOUT_MS - 1).toISOString() },
    live: { status: 'available_now', enabledUntil: new Date(now - 1).toISOString() },
  } as OperatorStatusData
  const state = getOperatorStatusPresentation(data, now)
  assert.equal(state.deviceOnline, false)
  assert.equal(state.modeEnabled, false)
  assert.equal(state.availableNow, false)
})

test('operator status distinguishes a busy call, stale data, failure and future heartbeat', () => {
  const now = Date.now()
  const data = {
    updatedAt: new Date(now).toISOString(),
    device: { lastHeartbeatAt: new Date(now - 1000).toISOString() },
    live: { status: 'in_call', enabledUntil: new Date(now + 60000).toISOString() },
  } as OperatorStatusData
  assert.equal(getOperatorStatusPresentation(data, now).deviceOnline, true)
  assert.equal(getOperatorStatusPresentation(data, now).availableNow, false)
  assert.equal(getOperatorStatusPresentation(data, now).liveLabel, 'OBSŁUGA ROZMOWY')
  assert.equal(getOperatorStatusPresentation(data, now, true).deviceOnline, false)
  assert.equal(getOperatorStatusPresentation(data, now, true).dataCurrent, false)
  assert.equal(getOperatorStatusPresentation(data, now + 30001).dataCurrent, false)
  data.live.enabledUntil = new Date(now - 1).toISOString()
  assert.equal(getOperatorStatusPresentation(data, now).liveState, 'in_call')
  data.device.lastHeartbeatAt = new Date(now + 60000).toISOString()
  assert.equal(getOperatorStatusPresentation(data, now).deviceOnline, false)
})
