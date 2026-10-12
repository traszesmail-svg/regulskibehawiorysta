import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { createLocalDataSandbox } from '../scripts/lib/local-data-sandbox'
import {
  resetSection16LocalStore,
  readSection16StoreSnapshot,
  updateSection16StoreSnapshot,
  mapSection16SweepResult,
  mapRpcError,
  sweepExpiredSection16Records,
  setSupabaseClientOverrideForTest,
} from '../lib/server/section16-store'
import { sanitizePayload } from '../lib/server/call-session-security'
import {
  runSection16ExpirationSweep,
  validateSweepBatchLimit,
  MIN_SWEEP_BATCH_LIMIT,
  MAX_SWEEP_BATCH_LIMIT,
  DEFAULT_SWEEP_BATCH_LIMIT,
} from '../lib/server/section16-expiration-sweep'
import {
  computeSection16PayloadHash,
  computeCallerPhoneFingerprint,
  computeCallerPhoneMasked,
} from '../lib/server/section16-policy'
import {
  Section16ValidationError,
  isValidUrgentIntakeTransition,
  isValidAvailabilityNotificationTransition,
  isValidTalkEntitlementTransition,
} from '../lib/server/section16-types'

let sandbox: Awaited<ReturnType<typeof createLocalDataSandbox>> | null = null

test.before(async () => {
  sandbox = await createLocalDataSandbox('section16-expiration-sweep')
  process.env.APP_DATA_MODE = 'local'
  process.env.CALL_SESSION_PHONE_SECRET = 'test-secret-with-at-least-16-chars'
  await resetSection16LocalStore()
})

test.after(async () => {
  await sandbox?.cleanup()
})

test.beforeEach(async () => {
  await resetSection16LocalStore()
})

// Helper to create an urgent intake in a specific state with custom deadlines
async function createUrgentIntakeWithDeadlines(options: {
  id?: string
  state: 'pending_proposal' | 'timeslot_proposed' | 'payment_confirmed' | 'expired' | 'cancelled' | 'rejected'
  expiresAt: string
  holdExpiresAt?: string | null
  version?: number
  phone?: string
  paymentReference?: string
  clientName?: string
  clientNotes?: string
}) {
  const id = options.id ?? randomUUID()
  const phone = options.phone ?? '+48600123456'
  const fp = computeCallerPhoneFingerprint(phone)
  const masked = computeCallerPhoneMasked(phone)

  await updateSection16StoreSnapshot((store) => {
    store.urgentIntakes.push({
      id,
      dayChoice: 'today',
      targetDate: '2026-10-12',
      callerPhoneFingerprint: fp,
      callerPhoneMasked: masked,
      contactCiphertext: 'enc:1234567890abcdef',
      clientName: options.clientName ?? 'Jan Kowalski',
      clientNotes: options.clientNotes ?? 'Pies boi się hałasów',
      state: options.state,
      proposedDate: options.state === 'timeslot_proposed' ? '2026-10-12' : null,
      proposedTime: options.state === 'timeslot_proposed' ? '14:00' : null,
      proposedTimeslotIso: options.state === 'timeslot_proposed' ? '2026-10-12T12:00:00.000Z' : null,
      holdExpiresAt: options.holdExpiresAt ?? null,
      expiresAt: options.expiresAt,
      paymentReference: options.paymentReference ?? (options.state === 'payment_confirmed' ? 'rev:urg_123' : null),
      bookingId: null,
      version: options.version ?? 1,
      idempotencyKey: `init:urgent:${id}`,
      createdAt: '2026-10-12T00:00:00.000Z',
      updatedAt: '2026-10-12T00:00:00.000Z',
    })
  })

  return id
}

// Helper to create an availability notification in a specific state with custom deadlines
async function createAvailabilityRequestWithDeadlines(options: {
  id?: string
  state: 'queued' | 'offer_sent' | 'accepted_paid' | 'expired' | 'cancelled' | 'consumed'
  expiresAt: string
  offerExpiresAt?: string | null
  version?: number
  phone?: string
  paymentReference?: string
  clientName?: string
}) {
  const id = options.id ?? randomUUID()
  const phone = options.phone ?? '+48600123456'
  const fp = computeCallerPhoneFingerprint(phone)
  const masked = computeCallerPhoneMasked(phone)

  await updateSection16StoreSnapshot((store) => {
    const queuePos = store.notificationRequests.length + 1
    store.notificationRequests.push({
      id,
      callerPhoneFingerprint: fp,
      callerPhoneMasked: masked,
      contactCiphertext: 'enc:1234567890abcdef',
      channel: 'sms',
      clientName: options.clientName ?? 'Anna Nowak',
      state: options.state,
      queuePosition: queuePos,
      offeredAt: options.state === 'offer_sent' ? '2026-10-12T00:00:00.000Z' : null,
      offerExpiresAt: options.offerExpiresAt ?? null,
      acceptedAt: options.state === 'accepted_paid' ? '2026-10-12T01:00:00.000Z' : null,
      paymentReference: options.paymentReference ?? (options.state === 'accepted_paid' ? 'rev:avail_123' : null),
      bookingId: null,
      expiresAt: options.expiresAt,
      version: options.version ?? 1,
      idempotencyKey: `init:avail:${id}`,
      createdAt: '2026-10-12T00:00:00.000Z',
      updatedAt: '2026-10-12T00:00:00.000Z',
    })
  })

  return id
}

// Helper to create a talk entitlement with custom deadlines
async function createTalkEntitlementWithDeadlines(options: {
  id?: string
  state: 'active' | 'consumed' | 'expired' | 'revoked'
  validFrom: string
  validUntil: string
  version?: number
  phone?: string
  paymentReference?: string
}) {
  const id = options.id ?? randomUUID()
  const phone = options.phone ?? '+48600123456'
  const fp = computeCallerPhoneFingerprint(phone)
  const masked = computeCallerPhoneMasked(phone)

  await updateSection16StoreSnapshot((store) => {
    store.talkEntitlements.push({
      id,
      callerPhoneFingerprint: fp,
      callerPhoneMasked: masked,
      bookingId: null,
      paymentReference: options.paymentReference ?? 'rev:talk_123',
      urgentRequestId: null,
      notificationRequestId: null,
      allocatedSeconds: 900,
      validFrom: options.validFrom,
      validUntil: options.validUntil,
      state: options.state,
      consumedAt: options.state === 'consumed' ? '2026-10-12T02:00:00.000Z' : null,
      consumedCallSessionId: options.state === 'consumed' ? randomUUID() : null,
      version: options.version ?? 1,
      idempotencyKey: `init:talk:${id}`,
      createdAt: '2026-10-12T00:00:00.000Z',
      updatedAt: '2026-10-12T00:00:00.000Z',
    })
  })

  return id
}

// ============================================================================
// 1. KAŻDY KWALIFIKUJĄCY SIĘ STAN I DEADLINE RÓWNY NOW ZOSTAJE WYGASZONY
// ============================================================================
test('1. Każdy kwalifikujący się stan i deadline równy now zostaje wygaszony', async () => {
  const now = new Date('2026-10-12T12:00:00.000Z')
  const nowIso = now.toISOString()
  const pastIso = '2026-10-12T11:59:00.000Z'
  const futureIso = '2026-10-12T13:00:00.000Z'

  // A. urgent_intake_requests
  // 1) pending_proposal with expires_at == now
  const u1 = await createUrgentIntakeWithDeadlines({
    state: 'pending_proposal',
    expiresAt: nowIso,
  })
  // 2) pending_proposal with expires_at < now
  const u2 = await createUrgentIntakeWithDeadlines({
    state: 'pending_proposal',
    expiresAt: pastIso,
  })
  // 3) timeslot_proposed with hold_expires_at == now (expires_at in future)
  const u3 = await createUrgentIntakeWithDeadlines({
    state: 'timeslot_proposed',
    holdExpiresAt: nowIso,
    expiresAt: futureIso,
  })
  // 4) timeslot_proposed with parent expires_at == now (hold_expires_at in future)
  const u4 = await createUrgentIntakeWithDeadlines({
    state: 'timeslot_proposed',
    holdExpiresAt: futureIso,
    expiresAt: nowIso,
  })

  // B. availability_notification_requests
  // 5) queued with expires_at == now
  const a1 = await createAvailabilityRequestWithDeadlines({
    state: 'queued',
    expiresAt: nowIso,
  })
  // 6) queued with expires_at < now
  const a2 = await createAvailabilityRequestWithDeadlines({
    state: 'queued',
    expiresAt: pastIso,
  })
  // 7) offer_sent with offer_expires_at == now (expires_at in future)
  const a3 = await createAvailabilityRequestWithDeadlines({
    state: 'offer_sent',
    offerExpiresAt: nowIso,
    expiresAt: futureIso,
  })
  // 8) offer_sent with parent expires_at == now (offer_expires_at in future)
  const a4 = await createAvailabilityRequestWithDeadlines({
    state: 'offer_sent',
    offerExpiresAt: futureIso,
    expiresAt: nowIso,
  })

  // C. consultation_talk_entitlements
  // 9) active with valid_until == now
  const t1 = await createTalkEntitlementWithDeadlines({
    state: 'active',
    validFrom: pastIso,
    validUntil: nowIso,
  })
  // 10) active with valid_until < now
  const t2 = await createTalkEntitlementWithDeadlines({
    state: 'active',
    validFrom: '2026-10-12T10:00:00.000Z',
    validUntil: pastIso,
  })

  const result = await runSection16ExpirationSweep({
    batchLimit: 100,
    now,
  })

  assert.equal(result.urgentIntakesExpired, 4)
  assert.equal(result.availabilityNotificationsExpired, 4)
  assert.equal(result.talkEntitlementsExpired, 2)
  assert.equal(result.totalExpired, 10)

  const store = await readSection16StoreSnapshot()

  // Verify all 10 records transitioned to 'expired'
  for (const id of [u1, u2, u3, u4]) {
    const item = store.urgentIntakes.find((r) => r.id === id)
    assert.ok(item)
    assert.equal(item.state, 'expired')
  }
  for (const id of [a1, a2, a3, a4]) {
    const item = store.notificationRequests.find((r) => r.id === id)
    assert.ok(item)
    assert.equal(item.state, 'expired')
  }
  for (const id of [t1, t2]) {
    const item = store.talkEntitlements.find((r) => r.id === id)
    assert.ok(item)
    assert.equal(item.state, 'expired')
  }
})

// ============================================================================
// 2. DEADLINE W PRZYSZŁOŚCI ORAZ WSZYSTKIE STANY CHRONIONE NIE SĄ ZMIENIANE
// ============================================================================
test('2. Deadline w przyszłości oraz stany chronione nie są zmieniane', async () => {
  const now = new Date('2026-10-12T12:00:00.000Z')
  const pastIso = '2026-10-12T11:00:00.000Z'
  const futureIso = '2026-10-12T13:00:00.000Z'

  // Future deadlines (should not expire)
  const fu1 = await createUrgentIntakeWithDeadlines({
    state: 'pending_proposal',
    expiresAt: futureIso,
  })
  const fu2 = await createUrgentIntakeWithDeadlines({
    state: 'timeslot_proposed',
    holdExpiresAt: futureIso,
    expiresAt: futureIso,
  })
  const fa1 = await createAvailabilityRequestWithDeadlines({
    state: 'queued',
    expiresAt: futureIso,
  })
  const fa2 = await createAvailabilityRequestWithDeadlines({
    state: 'offer_sent',
    offerExpiresAt: futureIso,
    expiresAt: futureIso,
  })
  const ft1 = await createTalkEntitlementWithDeadlines({
    state: 'active',
    validFrom: pastIso,
    validUntil: futureIso,
  })

  // Protected / terminal states with past deadlines (should NOT expire)
  const pu1 = await createUrgentIntakeWithDeadlines({
    state: 'payment_confirmed',
    expiresAt: pastIso,
    paymentReference: 'rev:confirmed_123',
  })
  const pu2 = await createUrgentIntakeWithDeadlines({
    state: 'cancelled',
    expiresAt: pastIso,
  })
  const pu3 = await createUrgentIntakeWithDeadlines({
    state: 'rejected',
    expiresAt: pastIso,
  })
  const pu4 = await createUrgentIntakeWithDeadlines({
    state: 'expired',
    expiresAt: pastIso,
  })

  const pa1 = await createAvailabilityRequestWithDeadlines({
    state: 'accepted_paid',
    expiresAt: pastIso,
    paymentReference: 'rev:accepted_123',
  })
  const pa2 = await createAvailabilityRequestWithDeadlines({
    state: 'consumed',
    expiresAt: pastIso,
  })
  const pa3 = await createAvailabilityRequestWithDeadlines({
    state: 'cancelled',
    expiresAt: pastIso,
  })
  const pa4 = await createAvailabilityRequestWithDeadlines({
    state: 'expired',
    expiresAt: pastIso,
  })

  const pt1 = await createTalkEntitlementWithDeadlines({
    state: 'consumed',
    validFrom: '2026-10-12T08:00:00.000Z',
    validUntil: pastIso,
  })
  const pt2 = await createTalkEntitlementWithDeadlines({
    state: 'revoked',
    validFrom: '2026-10-12T08:00:00.000Z',
    validUntil: pastIso,
  })
  const pt3 = await createTalkEntitlementWithDeadlines({
    state: 'expired',
    validFrom: '2026-10-12T08:00:00.000Z',
    validUntil: pastIso,
  })

  const result = await runSection16ExpirationSweep({
    batchLimit: 100,
    now,
  })

  assert.equal(result.urgentIntakesExpired, 0)
  assert.equal(result.availabilityNotificationsExpired, 0)
  assert.equal(result.talkEntitlementsExpired, 0)
  assert.equal(result.totalExpired, 0)

  const store = await readSection16StoreSnapshot()

  // Verify none of the future or protected items changed state or version
  assert.equal(store.urgentIntakes.find((r) => r.id === fu1)?.state, 'pending_proposal')
  assert.equal(store.urgentIntakes.find((r) => r.id === fu2)?.state, 'timeslot_proposed')
  assert.equal(store.notificationRequests.find((r) => r.id === fa1)?.state, 'queued')
  assert.equal(store.notificationRequests.find((r) => r.id === fa2)?.state, 'offer_sent')
  assert.equal(store.talkEntitlements.find((r) => r.id === ft1)?.state, 'active')

  assert.equal(store.urgentIntakes.find((r) => r.id === pu1)?.state, 'payment_confirmed')
  assert.equal(store.urgentIntakes.find((r) => r.id === pu2)?.state, 'cancelled')
  assert.equal(store.urgentIntakes.find((r) => r.id === pu3)?.state, 'rejected')
  assert.equal(store.urgentIntakes.find((r) => r.id === pu4)?.state, 'expired')

  assert.equal(store.notificationRequests.find((r) => r.id === pa1)?.state, 'accepted_paid')
  assert.equal(store.notificationRequests.find((r) => r.id === pa2)?.state, 'consumed')
  assert.equal(store.notificationRequests.find((r) => r.id === pa3)?.state, 'cancelled')
  assert.equal(store.notificationRequests.find((r) => r.id === pa4)?.state, 'expired')

  assert.equal(store.talkEntitlements.find((r) => r.id === pt1)?.state, 'consumed')
  assert.equal(store.talkEntitlements.find((r) => r.id === pt2)?.state, 'revoked')
  assert.equal(store.talkEntitlements.find((r) => r.id === pt3)?.state, 'expired')

  assert.equal(store.urgentEvents.length, 0)
  assert.equal(store.notificationEvents.length, 0)
  assert.equal(store.talkEvents.length, 0)
})

// ============================================================================
// 3. KAŻDA ZMIANA TWORZY DOKŁADNIE JEDEN EVENT, POPRAWNIE ZWIĘKSZA WERSJĘ I USTAWA UPDATED_AT
// ============================================================================
test('3. Każda zmiana tworzy dokładnie jeden event, zwiększa wersję i ustawia updatedAt', async () => {
  const now = new Date('2026-10-12T12:00:00.000Z')
  const pastIso = '2026-10-12T11:00:00.000Z'

  const uid = await createUrgentIntakeWithDeadlines({
    state: 'pending_proposal',
    expiresAt: pastIso,
    version: 3,
  })
  const aid = await createAvailabilityRequestWithDeadlines({
    state: 'queued',
    expiresAt: pastIso,
    version: 7,
  })
  const tid = await createTalkEntitlementWithDeadlines({
    state: 'active',
    validFrom: '2026-10-12T08:00:00.000Z',
    validUntil: pastIso,
    version: 2,
  })

  const result = await runSection16ExpirationSweep({
    batchLimit: 10,
    now,
  })

  assert.equal(result.totalExpired, 3)

  const store = await readSection16StoreSnapshot()

  // 1. Urgent Intake
  const uRec = store.urgentIntakes.find((r) => r.id === uid)!
  assert.equal(uRec.state, 'expired')
  assert.equal(uRec.version, 4) // 3 + 1
  assert.equal(uRec.updatedAt, now.toISOString())

  assert.equal(store.urgentEvents.length, 1)
  const uEvt = store.urgentEvents[0]
  assert.equal(uEvt.requestId, uid)
  assert.equal(uEvt.fromState, 'pending_proposal')
  assert.equal(uEvt.toState, 'expired')
  assert.equal(uEvt.eventType, 'intake_expired')
  assert.equal(uEvt.idempotencyKey, `sweep:urgent_intake:${uid}:v3:pending_proposal:expired`)
  assert.ok(uEvt.idempotencyKey.length <= 128)
  assert.equal(uEvt.payloadHash, computeSection16PayloadHash(uEvt.payload))
  assert.equal(uEvt.createdAt, now.toISOString())

  // 2. Availability Notification
  const aRec = store.notificationRequests.find((r) => r.id === aid)!
  assert.equal(aRec.state, 'expired')
  assert.equal(aRec.version, 8) // 7 + 1
  assert.equal(aRec.updatedAt, now.toISOString())

  assert.equal(store.notificationEvents.length, 1)
  const aEvt = store.notificationEvents[0]
  assert.equal(aEvt.requestId, aid)
  assert.equal(aEvt.fromState, 'queued')
  assert.equal(aEvt.toState, 'expired')
  assert.equal(aEvt.eventType, 'notification_expired')
  assert.equal(aEvt.idempotencyKey, `sweep:availability_notification:${aid}:v7:queued:expired`)
  assert.ok(aEvt.idempotencyKey.length <= 128)
  assert.equal(aEvt.payloadHash, computeSection16PayloadHash(aEvt.payload))
  assert.equal(aEvt.createdAt, now.toISOString())

  // 3. Talk Entitlement
  const tRec = store.talkEntitlements.find((r) => r.id === tid)!
  assert.equal(tRec.state, 'expired')
  assert.equal(tRec.version, 3) // 2 + 1
  assert.equal(tRec.updatedAt, now.toISOString())

  assert.equal(store.talkEvents.length, 1)
  const tEvt = store.talkEvents[0]
  assert.equal(tEvt.entitlementId, tid)
  assert.equal(tEvt.fromState, 'active')
  assert.equal(tEvt.toState, 'expired')
  assert.equal(tEvt.eventType, 'entitlement_expired')
  assert.equal(tEvt.idempotencyKey, `sweep:talk_entitlement:${tid}:v2:active:expired`)
  assert.ok(tEvt.idempotencyKey.length <= 128)
  assert.equal(tEvt.payloadHash, computeSection16PayloadHash(tEvt.payload))
  assert.equal(tEvt.createdAt, now.toISOString())
})

// ============================================================================
// 4. PONOWNY SWEEP ZWRACA ZERA I NIE TWORZY EVENTÓW
// ============================================================================
test('4. Ponowny sweep zwraca zera i nie tworzy eventów', async () => {
  const now = new Date('2026-10-12T12:00:00.000Z')
  const pastIso = '2026-10-12T11:00:00.000Z'

  await createUrgentIntakeWithDeadlines({
    state: 'pending_proposal',
    expiresAt: pastIso,
  })
  await createAvailabilityRequestWithDeadlines({
    state: 'queued',
    expiresAt: pastIso,
  })
  await createTalkEntitlementWithDeadlines({
    state: 'active',
    validFrom: '2026-10-12T08:00:00.000Z',
    validUntil: pastIso,
  })

  // First sweep: processes 3 items
  const res1 = await runSection16ExpirationSweep({
    batchLimit: 10,
    now,
  })
  assert.equal(res1.totalExpired, 3)

  const storeAfterFirst = await readSection16StoreSnapshot()
  assert.equal(storeAfterFirst.urgentEvents.length, 1)
  assert.equal(storeAfterFirst.notificationEvents.length, 1)
  assert.equal(storeAfterFirst.talkEvents.length, 1)

  // Second sweep: with exact same time
  const res2 = await runSection16ExpirationSweep({
    batchLimit: 10,
    now,
  })
  assert.equal(res2.totalExpired, 0)
  assert.equal(res2.urgentIntakesExpired, 0)
  assert.equal(res2.availabilityNotificationsExpired, 0)
  assert.equal(res2.talkEntitlementsExpired, 0)

  // Third sweep: with later time
  const res3 = await runSection16ExpirationSweep({
    batchLimit: 10,
    now: new Date('2026-10-12T13:00:00.000Z'),
  })
  assert.equal(res3.totalExpired, 0)

  // Verify zero additional events and zero double-version increments
  const storeAfterLater = await readSection16StoreSnapshot()
  assert.equal(storeAfterLater.urgentEvents.length, 1)
  assert.equal(storeAfterLater.notificationEvents.length, 1)
  assert.equal(storeAfterLater.talkEvents.length, 1)

  assert.equal(storeAfterLater.urgentIntakes[0].version, 2)
  assert.equal(storeAfterLater.notificationRequests[0].version, 2)
  assert.equal(storeAfterLater.talkEntitlements[0].version, 2)
})

// ============================================================================
// 5. DWA RÓWNOLEGŁE SWEEPY NIE DUBLUJĄ ZMIAN/EVENTÓW I DAJĄ ŁĄCZNE LICZNIKI
// ============================================================================
test('5. Dwa równoległe sweepy nie dublują zmian/eventów i dają łączne liczniki zgodne z liczbą rekordów', async () => {
  const now = new Date('2026-10-12T12:00:00.000Z')
  const pastIso = '2026-10-12T11:00:00.000Z'

  // Create 6 expired records (2 per family)
  await createUrgentIntakeWithDeadlines({ state: 'pending_proposal', expiresAt: pastIso })
  await createUrgentIntakeWithDeadlines({ state: 'timeslot_proposed', holdExpiresAt: pastIso, expiresAt: pastIso })

  await createAvailabilityRequestWithDeadlines({ state: 'queued', expiresAt: pastIso })
  await createAvailabilityRequestWithDeadlines({ state: 'offer_sent', offerExpiresAt: pastIso, expiresAt: pastIso })

  await createTalkEntitlementWithDeadlines({ state: 'active', validFrom: '2026-10-12T08:00:00.000Z', validUntil: pastIso })
  await createTalkEntitlementWithDeadlines({ state: 'active', validFrom: '2026-10-12T08:00:00.000Z', validUntil: pastIso })

  // Trigger two concurrent sweeps simultaneously
  const [res1, res2] = await Promise.all([
    runSection16ExpirationSweep({ batchLimit: 10, now }),
    runSection16ExpirationSweep({ batchLimit: 10, now }),
  ])

  // Total expired across the two sweeps must equal exactly 6
  assert.equal(res1.totalExpired + res2.totalExpired, 6)

  const store = await readSection16StoreSnapshot()
  assert.equal(store.urgentEvents.length, 2)
  assert.equal(store.notificationEvents.length, 2)
  assert.equal(store.talkEvents.length, 2)

  // Verify versions were incremented exactly once (1 -> 2, never 3)
  for (const r of store.urgentIntakes) {
    assert.equal(r.state, 'expired')
    assert.equal(r.version, 2)
  }
  for (const r of store.notificationRequests) {
    assert.equal(r.state, 'expired')
    assert.equal(r.version, 2)
  }
  for (const r of store.talkEntitlements) {
    assert.equal(r.state, 'expired')
    assert.equal(r.version, 2)
  }
})

// ============================================================================
// 6. BATCH LIMIT JEST WYMAGANY/OGRANICZONY I RZECZYWIŚCIE OGRANICZA LICZBĘ ZMIAN
// ============================================================================
test('6. Batch limit jest wymagany/ograniczony i ogranicza liczbę zmian', async () => {
  const now = new Date('2026-10-12T12:00:00.000Z')
  const pastIso = '2026-10-12T11:00:00.000Z'

  // A. Fail-closed validation of batchLimit
  await assert.rejects(
    () => runSection16ExpirationSweep(undefined as any),
    Section16ValidationError,
  )
  await assert.rejects(
    () => runSection16ExpirationSweep({} as any),
    Section16ValidationError,
  )
  await assert.rejects(
    () => runSection16ExpirationSweep({ batchLimit: undefined as any }),
    Section16ValidationError,
  )
  await assert.rejects(
    () => runSection16ExpirationSweep({ batchLimit: 0 }),
    Section16ValidationError,
  )
  await assert.rejects(
    () => runSection16ExpirationSweep({ batchLimit: -5 }),
    Section16ValidationError,
  )
  await assert.rejects(
    () => runSection16ExpirationSweep({ batchLimit: 2.5 }),
    Section16ValidationError,
  )
  await assert.rejects(
    () => runSection16ExpirationSweep({ batchLimit: 501 }),
    Section16ValidationError,
  )
  await assert.rejects(
    () => runSection16ExpirationSweep({ batchLimit: '10' as any }),
    Section16ValidationError,
  )
  await assert.rejects(
    () => runSection16ExpirationSweep({ batchLimit: 10, now: new Date('invalid') }),
    Section16ValidationError,
  )

  // Policy boundary checks
  assert.equal(validateSweepBatchLimit(MIN_SWEEP_BATCH_LIMIT), 1)
  assert.equal(validateSweepBatchLimit(MAX_SWEEP_BATCH_LIMIT), 500)
  assert.equal(validateSweepBatchLimit(DEFAULT_SWEEP_BATCH_LIMIT), 100)

  // B. Batch bounding and pagination
  // Create 5 expired urgent requests
  const ids: string[] = []
  for (let i = 0; i < 5; i++) {
    const id = await createUrgentIntakeWithDeadlines({
      state: 'pending_proposal',
      expiresAt: pastIso,
    })
    ids.push(id)
  }

  // Batch 1 with limit = 2 -> expires 2, 3 remain
  const b1 = await runSection16ExpirationSweep({ batchLimit: 2, now })
  assert.equal(b1.totalExpired, 2)
  assert.equal(b1.batchLimit, 2)
  let store = await readSection16StoreSnapshot()
  let expiredCount = store.urgentIntakes.filter((r) => r.state === 'expired').length
  assert.equal(expiredCount, 2)

  // Batch 2 with limit = 2 -> expires 2, 1 remains
  const b2 = await runSection16ExpirationSweep({ batchLimit: 2, now })
  assert.equal(b2.totalExpired, 2)
  store = await readSection16StoreSnapshot()
  expiredCount = store.urgentIntakes.filter((r) => r.state === 'expired').length
  assert.equal(expiredCount, 4)

  // Batch 3 with limit = 2 -> expires 1, 0 remain
  const b3 = await runSection16ExpirationSweep({ batchLimit: 2, now })
  assert.equal(b3.totalExpired, 1)
  store = await readSection16StoreSnapshot()
  expiredCount = store.urgentIntakes.filter((r) => r.state === 'expired').length
  assert.equal(expiredCount, 5)

  // Batch 4 with limit = 2 -> returns 0
  const b4 = await runSection16ExpirationSweep({ batchLimit: 2, now })
  assert.equal(b4.totalExpired, 0)
})

// ============================================================================
// 7. PAYLOAD I SERIALIZOWANE EVENTY NIE ZAWIERAJĄ TELEFONU, FINGERPRINTU, PAYMENT_REFERENCE ANI DANYCH OPISOWYCH
// ============================================================================
test('7. Payload i serializowane eventy nie zawierają telefonu, fingerprintu, paymentReference ani danych opisowych', async () => {
  const now = new Date('2026-10-12T12:00:00.000Z')
  const pastIso = '2026-10-12T11:00:00.000Z'

  const rawPhone = '+48600987654'
  const fp = computeCallerPhoneFingerprint(rawPhone)
  const masked = computeCallerPhoneMasked(rawPhone)
  const paymentRef = 'rev:secret_revolut_payment_9999'
  const clientName = 'Zofia Kowalska-TajneNazwisko'
  const clientNotes = 'Szczegółowy opis problemu z psem i historią leczenia'
  const ciphertext = 'enc:super_secret_encrypted_blob_data_123'

  await updateSection16StoreSnapshot((store) => {
    store.urgentIntakes.push({
      id: randomUUID(),
      dayChoice: 'today',
      targetDate: '2026-10-12',
      callerPhoneFingerprint: fp,
      callerPhoneMasked: masked,
      contactCiphertext: ciphertext,
      clientName,
      clientNotes,
      state: 'pending_proposal',
      proposedDate: null,
      proposedTime: null,
      proposedTimeslotIso: null,
      holdExpiresAt: null,
      expiresAt: pastIso,
      paymentReference: paymentRef,
      bookingId: randomUUID(),
      version: 1,
      idempotencyKey: 'caller:secret_idempotency_key_111',
      createdAt: '2026-10-12T00:00:00.000Z',
      updatedAt: '2026-10-12T00:00:00.000Z',
    })

    store.notificationRequests.push({
      id: randomUUID(),
      callerPhoneFingerprint: fp,
      callerPhoneMasked: masked,
      contactCiphertext: ciphertext,
      channel: 'sms',
      clientName,
      state: 'queued',
      queuePosition: 1,
      offeredAt: null,
      offerExpiresAt: null,
      acceptedAt: null,
      paymentReference: paymentRef,
      bookingId: randomUUID(),
      expiresAt: pastIso,
      version: 1,
      idempotencyKey: 'caller:secret_idempotency_key_222',
      createdAt: '2026-10-12T00:00:00.000Z',
      updatedAt: '2026-10-12T00:00:00.000Z',
    })

    store.talkEntitlements.push({
      id: randomUUID(),
      callerPhoneFingerprint: fp,
      callerPhoneMasked: masked,
      bookingId: randomUUID(),
      paymentReference: paymentRef,
      urgentRequestId: null,
      notificationRequestId: null,
      allocatedSeconds: 900,
      validFrom: '2026-10-12T08:00:00.000Z',
      validUntil: pastIso,
      state: 'active',
      consumedAt: null,
      consumedCallSessionId: null,
      version: 1,
      idempotencyKey: 'caller:secret_idempotency_key_333',
      createdAt: '2026-10-12T00:00:00.000Z',
      updatedAt: '2026-10-12T00:00:00.000Z',
    })
  })

  const sweepRes = await runSection16ExpirationSweep({ batchLimit: 10, now })
  assert.equal(sweepRes.totalExpired, 3)

  const store = await readSection16StoreSnapshot()

  const allEvents = [
    ...store.urgentEvents,
    ...store.notificationEvents,
    ...store.talkEvents,
  ]
  assert.equal(allEvents.length, 3)

  for (const evt of allEvents) {
    const payload = evt.payload
    const serializedPayload = JSON.stringify(payload)
    const serializedEvent = JSON.stringify(evt)

    // A. Payload object property checks
    assert.equal('phone' in payload, false)
    assert.equal('rawPhone' in payload, false)
    assert.equal('callerPhone' in payload, false)
    assert.equal('callerPhoneMasked' in payload, false)
    assert.equal('callerPhoneFingerprint' in payload, false)
    assert.equal('fingerprint' in payload, false)
    assert.equal('paymentReference' in payload, false)
    assert.equal('contactCiphertext' in payload, false)
    assert.equal('clientName' in payload, false)
    assert.equal('clientNotes' in payload, false)
    assert.equal('bookingId' in payload, false)
    assert.equal('booking_id' in payload, false)
    assert.equal('idempotencyKey' in payload, false)

    // B. String search for secrets in payload string
    assert.equal(serializedPayload.includes(rawPhone), false)
    assert.equal(serializedPayload.includes(fp), false)
    assert.equal(serializedPayload.includes(masked), false)
    assert.equal(serializedPayload.includes(paymentRef), false)
    assert.equal(serializedPayload.includes(clientName), false)
    assert.equal(serializedPayload.includes(clientNotes), false)
    assert.equal(serializedPayload.includes(ciphertext), false)
    assert.equal(serializedPayload.includes('secret_idempotency_key'), false)

    // C. Entire serialized event check for caller secrets
    assert.equal(serializedEvent.includes(rawPhone), false)
    assert.equal(serializedEvent.includes(fp), false)
    assert.equal(serializedEvent.includes(paymentRef), false)
    assert.equal(serializedEvent.includes(clientName), false)
    assert.equal(serializedEvent.includes(clientNotes), false)
    assert.equal(serializedEvent.includes(ciphertext), false)
    assert.equal(serializedEvent.includes('secret_idempotency_key'), false)
  }
})

// ============================================================================
// 8. RPC ORAZ ACL SĄ SERVICE-ROLE-ONLY; BRAK EXECUTE DLA PUBLIC/ANON/AUTH; ACL Z 11006 NIENARUSZONE
// ============================================================================
test('8. RPC oraz ACL są service-role-only; brak execute dla public/anon/auth; ACL z 11006 nienaruszone', () => {
  const migPath = 'supabase/migrations/20261011008_section16_expiration_sweep.sql'
  const schemaPath = 'supabase/schema.sql'
  const aclMigPath = 'supabase/migrations/20261011006_section16_append_only_acl.sql'

  const migSql = readFileSync(migPath, 'utf8')
  const schemaSql = readFileSync(schemaPath, 'utf8')
  const aclMigSql = readFileSync(aclMigPath, 'utf8')

  // A. Migration 20261011008 checks
  assert.ok(
    migSql.includes('create or replace function public.sweep_expired_section16_records(\n  p_batch_limit integer default 100\n)'),
    'Migracja musi definiować sweep_expired_section16_records z parametrem p_batch_limit integer',
  )
  assert.equal(migSql.includes('p_now'), false, 'Migracja nie może zawierać parametru ani referencji p_now')
  assert.ok(migSql.includes('statement_timestamp()'), 'Migracja musi pobierać czas wyłącznie z PostgreSQL statement_timestamp()')
  assert.ok(migSql.includes('security definer'), 'RPC musi być security definer')
  assert.ok(migSql.includes('set search_path = public, pg_temp'), 'RPC musi mieć bezpieczny search_path')
  assert.ok(migSql.includes('for update skip locked'), 'RPC musi stosować FOR UPDATE SKIP LOCKED')
  assert.ok(
    migSql.includes(
      'revoke all on function public.sweep_expired_section16_records(integer) from public, anon, authenticated;',
    ),
    'RPC musi odbierać execute rolom public, anon, authenticated dla sygnatury (integer)',
  )
  assert.ok(
    migSql.includes(
      'grant execute on function public.sweep_expired_section16_records(integer) to service_role;',
    ),
    'RPC musi nadawać execute wyłącznie dla service_role dla sygnatury (integer)',
  )

  // Verify no grants to public/anon/authenticated
  assert.equal(/grant\s+.*to\s+(public|anon|authenticated)/i.test(migSql), false)

  // B. Canonical schema checks
  assert.ok(
    schemaSql.includes('create or replace function public.sweep_expired_section16_records(\n  p_batch_limit integer default 100\n)'),
    'Schema musi definiować sweep_expired_section16_records z parametrem p_batch_limit integer',
  )
  const sweepFnIndex = schemaSql.indexOf('create or replace function public.sweep_expired_section16_records(')
  const sweepFnEnd = schemaSql.indexOf('revoke all on function public.sweep_expired_section16_records(integer)', sweepFnIndex)
  const sweepFunctionChunk = schemaSql.slice(sweepFnIndex, sweepFnEnd)
  assert.equal(sweepFunctionChunk.includes('p_now'), false, 'Ciało funkcji w schema.sql nie może zawierać p_now')
  assert.ok(sweepFunctionChunk.includes('statement_timestamp()'), 'Ciało funkcji w schema.sql musi pobierać czas z statement_timestamp()')

  assert.ok(
    schemaSql.includes(
      'revoke all on function public.sweep_expired_section16_records(integer) from public, anon, authenticated;',
    ),
    'Schema musi zawierać revoke na sweep_expired_section16_records(integer)',
  )
  assert.ok(
    schemaSql.includes(
      'grant execute on function public.sweep_expired_section16_records(integer) to service_role;',
    ),
    'Schema musi zawierać grant service_role na sweep_expired_section16_records(integer)',
  )

  // C. ACL from 20261011006 remains intact
  assert.ok(
    aclMigSql.includes('grant select, insert on table public.urgent_intake_events to service_role;'),
    'ACL 11006 nie może być naruszone',
  )
  assert.ok(
    aclMigSql.includes('grant select, insert on table public.availability_notification_events to service_role;'),
    'ACL 11006 nie może być naruszone',
  )
  assert.ok(
    aclMigSql.includes('grant select, insert on table public.consultation_talk_entitlement_events to service_role;'),
    'ACL 11006 nie może być naruszone',
  )
})

// ============================================================================
// 9. REALISTYCZNY WYNIK SUPABASE PRZECHODZI PRZEZ MAPPER, A BŁĘDNE DANE SĄ ODRZUCANE
// ============================================================================
test('9. Realistyczny wynik Supabase przechodzi przez mapper, a błędne dane są odrzucane', () => {
  // A. Valid realistic snake_case record from PostgREST
  const validSupabase = {
    urgent_intakes_expired: 3,
    availability_notifications_expired: 2,
    talk_entitlements_expired: 1,
    total_expired: 6,
    batch_limit: 100,
    swept_at: '2026-10-12T12:00:00.000Z',
  }

  const mapped = mapSection16SweepResult(validSupabase)
  assert.equal(mapped.urgentIntakesExpired, 3)
  assert.equal(mapped.availabilityNotificationsExpired, 2)
  assert.equal(mapped.talkEntitlementsExpired, 1)
  assert.equal(mapped.totalExpired, 6)
  assert.equal(mapped.batchLimit, 100)
  assert.equal(mapped.sweptAt, '2026-10-12T12:00:00.000Z')

  // Also valid camelCase
  const validCamel = {
    urgentIntakesExpired: 0,
    availabilityNotificationsExpired: 0,
    talkEntitlementsExpired: 0,
    totalExpired: 0,
    batchLimit: 50,
    sweptAt: '2026-10-12T12:00:00.000Z',
  }
  const mappedCamel = mapSection16SweepResult(validCamel)
  assert.equal(mappedCamel.totalExpired, 0)

  // B. Negative cases (fail-closed)
  assert.throws(() => mapSection16SweepResult(null), Section16ValidationError)
  assert.throws(() => mapSection16SweepResult(undefined), Section16ValidationError)
  assert.throws(() => mapSection16SweepResult('invalid'), Section16ValidationError)
  assert.throws(() => mapSection16SweepResult([]), Section16ValidationError)

  // Missing or negative urgent_intakes_expired
  assert.throws(
    () => mapSection16SweepResult({ ...validSupabase, urgent_intakes_expired: -1 }),
    Section16ValidationError,
  )
  assert.throws(
    () => mapSection16SweepResult({ ...validSupabase, urgent_intakes_expired: '3' }),
    Section16ValidationError,
  )

  // Non-integer total_expired
  assert.throws(
    () => mapSection16SweepResult({ ...validSupabase, total_expired: 6.5 }),
    Section16ValidationError,
  )

  // Inconsistent sum
  assert.throws(
    () => mapSection16SweepResult({ ...validSupabase, total_expired: 99 }),
    Section16ValidationError,
  )

  // Invalid batchLimit
  assert.throws(
    () => mapSection16SweepResult({ ...validSupabase, batch_limit: 0 }),
    Section16ValidationError,
  )
  assert.throws(
    () => mapSection16SweepResult({ ...validSupabase, batch_limit: '100' }),
    Section16ValidationError,
  )

  // Invalid sweptAt timestamp
  assert.throws(
    () => mapSection16SweepResult({ ...validSupabase, swept_at: 'not-a-date' }),
    Section16ValidationError,
  )
  assert.throws(
    () => mapSection16SweepResult({ ...validSupabase, swept_at: '' }),
    Section16ValidationError,
  )

  // mapRpcError mapping of INVALID_BATCH_LIMIT
  assert.throws(
    () => mapRpcError(new Error('INVALID_BATCH_LIMIT: batch_limit jest wymagany')),
    Section16ValidationError,
  )
})

// ============================================================================
// 10. REGRESJA STAGE 2–4 POZOSTAJE ZIELONA
// ============================================================================
test('10. Regresja Stage 2–4 pozostaje zielona', () => {
  // State machine transitions
  assert.equal(isValidUrgentIntakeTransition('pending_proposal', 'expired'), true)
  assert.equal(isValidUrgentIntakeTransition('timeslot_proposed', 'expired'), true)
  assert.equal(isValidUrgentIntakeTransition('payment_confirmed', 'expired'), false)
  assert.equal(isValidUrgentIntakeTransition('expired', 'pending_proposal'), false)

  assert.equal(isValidAvailabilityNotificationTransition('queued', 'expired'), true)
  assert.equal(isValidAvailabilityNotificationTransition('offer_sent', 'expired'), true)
  assert.equal(isValidAvailabilityNotificationTransition('accepted_paid', 'expired'), false)
  assert.equal(isValidAvailabilityNotificationTransition('consumed', 'expired'), false)
  assert.equal(isValidAvailabilityNotificationTransition('expired', 'queued'), false)

  assert.equal(isValidTalkEntitlementTransition('active', 'expired'), true)
  assert.equal(isValidTalkEntitlementTransition('consumed', 'expired'), false)
  assert.equal(isValidTalkEntitlementTransition('revoked', 'expired'), false)
  assert.equal(isValidTalkEntitlementTransition('expired', 'active'), false)
})

// ============================================================================
// 11. WARSTWA SUPABASE: RPC OTRZYMUJE TYLKO P_BATCH_LIMIT, OPTIONS.NOW FAILS-CLOSED PRZED RPC
// ============================================================================
test('11. Warstwa Supabase: RPC otrzymuje tylko p_batch_limit, options.now fails-closed przed RPC, a local fallback obsługuje injected now', async () => {
  const previousMode = process.env.APP_DATA_MODE
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  process.env.APP_DATA_MODE = 'supabase'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock-test.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_mock_test_fixture_service_role_key'

  try {
    // A. Mock Supabase client weryfikuje, że RPC otrzymuje wyłącznie p_batch_limit (brak p_now)
    let capturedRpc = ''
    let capturedArgs: Record<string, unknown> | null = null

    setSupabaseClientOverrideForTest({
      rpc: async (fn: string, args: Record<string, unknown>) => {
        capturedRpc = fn
        capturedArgs = args
        return {
          data: {
            urgent_intakes_expired: 1,
            availability_notifications_expired: 2,
            talk_entitlements_expired: 0,
            total_expired: 3,
            batch_limit: args.p_batch_limit,
            swept_at: '2026-10-12T10:00:00.000Z',
          },
          error: null,
        }
      },
    })

    const sweepRes = await runSection16ExpirationSweep({ batchLimit: 42 })
    assert.equal(capturedRpc, 'sweep_expired_section16_records')
    assert.deepEqual(capturedArgs, { p_batch_limit: 42 })
    assert.equal('p_now' in (capturedArgs ?? {}), false, 'RPC w Supabase nie może otrzymywać p_now')
    assert.equal(sweepRes.totalExpired, 3)
    assert.equal(sweepRes.batchLimit, 42)
    assert.equal(sweepRes.sweptAt, '2026-10-12T10:00:00.000Z')

    // B. Próba podania options.now w trybie Supabase ma fail-closed przed RPC
    let rpcCalledOnOptionsNow = false
    setSupabaseClientOverrideForTest({
      rpc: async () => {
        rpcCalledOnOptionsNow = true
        return { data: null, error: null }
      },
    })

    await assert.rejects(
      async () => {
        await runSection16ExpirationSweep({ batchLimit: 10, now: new Date() })
      },
      (err: any) => {
        assert.ok(err instanceof Section16ValidationError)
        assert.ok(
          err.message.includes('options.now') || err.message.includes('now'),
          'Komunikat błędu musi informować o zakazie podawania now w trybie Supabase',
        )
        return true
      },
    )
    assert.equal(
      rpcCalledOnOptionsNow,
      false,
      'RPC nie może zostać wywołane gdy caller podał options.now w trybie Supabase',
    )

    // C. Bezpośrednie wywołanie store sweepExpiredSection16Records z now w trybie Supabase ma fail-closed przed RPC
    let rpcCalledOnDirectNow = false
    setSupabaseClientOverrideForTest({
      rpc: async () => {
        rpcCalledOnDirectNow = true
        return { data: null, error: null }
      },
    })

    await assert.rejects(
      async () => {
        await sweepExpiredSection16Records(10, new Date())
      },
      (err: any) => {
        assert.ok(err instanceof Section16ValidationError)
        assert.ok(
          err.message.includes('now'),
          'Komunikat błędu musi informować o zakazie podawania now w trybie Supabase',
        )
        return true
      },
    )
    assert.equal(
      rpcCalledOnDirectNow,
      false,
      'RPC nie może zostać wywołane przy bezpośrednim przekazaniu now w trybie Supabase',
    )

    // D. Statyczny audyt kodu section16-store.ts potwierdzający brak p_now w wywołaniu RPC
    const storeCode = readFileSync('lib/server/section16-store.ts', 'utf8')
    assert.ok(
      storeCode.includes("supabase.rpc('sweep_expired_section16_records', {\n      p_batch_limit: validatedLimit,\n    })"),
      'Store musi wywoływać RPC przekazując wyłącznie p_batch_limit',
    )
    const rpcCallSnippet = storeCode.slice(
      storeCode.indexOf("supabase.rpc('sweep_expired_section16_records'"),
      storeCode.indexOf("supabase.rpc('sweep_expired_section16_records'") + 120,
    )
    assert.equal(rpcCallSnippet.includes('p_now'), false, 'Ciało wywołania RPC w store nie może zawierać p_now')
  } finally {
    setSupabaseClientOverrideForTest(null)
    process.env.APP_DATA_MODE = previousMode ?? 'local'
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl
    if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey
  }

  // E. W trybie local JSON fallback injected now jest dozwolone i działa poprawnie
  process.env.APP_DATA_MODE = 'local'
  const localSweepWithNow = await runSection16ExpirationSweep({
    batchLimit: 10,
    now: new Date('2026-10-12T12:00:00.000Z'),
  })
  assert.equal(typeof localSweepWithNow.totalExpired, 'number')
  assert.equal(localSweepWithNow.sweptAt, '2026-10-12T12:00:00.000Z')

  // F. W trybie local JSON fallback bez parametru now domyślnie używany jest lokalny czas
  const localSweepDefault = await runSection16ExpirationSweep({ batchLimit: 10 })
  assert.equal(typeof localSweepDefault.totalExpired, 'number')
  assert.ok(Date.parse(localSweepDefault.sweptAt) > 0)
})

// ============================================================================
// 12. CELOWANY TEST REGRESYJNY GLOBALNEGO SANITIZERA (UUID VS TELEFON I DANE WRAŻLIWE)
// ============================================================================
test('12. Celowany test regresyjny globalnego sanitizera: kanoniczny UUID nienaruszony, telefony i dane wrażliwe redagowane', () => {
  // A. Samodzielny kanoniczny UUID v4 pozostaje niezmieniony (brak fałszywego dopasowania do regexu telefonu)
  const canonicalUuids = [
    'cde9326e-75b1-4f0d-8274-e13708d3f285',
    '38848486-b93e-4763-315c-e04bf4f3d86d',
    // Przypadki brzegowe: UUID zawierające ciąg cyfr, które w luźnym regexie telefonu mogłyby dać false positive
    '12345678-1234-4234-8234-123456789abc',
    '12345678-1000-4000-8000-000000000000',
    '00000000-0000-0000-0000-000000000000',
    '98765432-1000-4000-8000-000000000000',
    'CDE9326E-75B1-4F0D-8274-E13708D3F285', // wielkie litery
  ]

  for (const uuid of canonicalUuids) {
    const sanitizedObj = sanitizePayload({ requestId: uuid, actionId: uuid })
    assert.equal(
      sanitizedObj.requestId,
      uuid,
      `Samodzielny kanoniczny UUID (${uuid}) musi pozostać niezmieniony`,
    )
    assert.equal(
      sanitizedObj.actionId,
      uuid,
      `Samodzielny kanoniczny UUID w actionId (${uuid}) musi pozostać niezmieniony`,
    )
  }

  // B. Prawdziwe numery telefonów (samodzielne) są bezwzględnie redagowane
  const rawPhones = [
    '+48 501 234 567',
    '+48501234567',
    '501234567',
    '501-234-567',
    '501.234.567',
    '0048 501 234 567',
    '0048501234567',
    '+48 600 700 800',
    '600700800',
  ]

  for (const phone of rawPhones) {
    const sanitized = sanitizePayload({ contactInfo: phone })
    assert.equal(
      sanitized.contactInfo,
      '[REDACTED_PHONE]',
      `Prawdziwy numer telefonu (${phone}) musi zostać zredagowany`,
    )
  }

  // C. Numer telefonu osadzony w zwykłym tekście jest redagowany (zachowując kontekst tekstu lub maskując całość przy braku innych cyfr)
  const textWithPhones = [
    {
      input: 'Klient prosi o kontakt pod numerem 501 234 567 po 17:00',
      expected: 'Klient prosi o kontakt pod numerem [REDACTED_PHONE] po 17:00',
    },
    {
      input: 'Wiadomość z kodem 1234 oraz tel 501-234-567 dla klienta',
      expected: 'Wiadomość z kodem 1234 oraz tel [REDACTED_PHONE] dla klienta',
    },
    {
      input: 'Kontakt: 500600700 oraz backup: 501234567',
      expected: 'Kontakt: [REDACTED_PHONE] oraz backup: [REDACTED_PHONE]',
    },
    {
      input: 'Zadzwoń: +48-501-234-567 pilne!',
      expected: '[REDACTED_PHONE]', // Gdy w tekście są tylko cyfry numeru telefonu, normalizePolishPhone chroni cały ciąg
    },
  ]

  for (const { input, expected } of textWithPhones) {
    const sanitized = sanitizePayload({ note: input })
    assert.equal(
      sanitized.note,
      expected,
      `Numer osadzony w tekście (${input}) musi zostać zredagowany`,
    )
  }

  // D. Wrażliwe klucze nadal wymuszają redakcję niezależnie od wartości
  assert.equal(
    sanitizePayload({ phone: 'cde9326e-75b1-4f0d-8274-e13708d3f285' }).phone,
    '[REDACTED_PHONE]',
    'Klucz phone musi redagować nawet jeśli wartością jest UUID',
  )
  assert.equal(
    sanitizePayload({ caller_phone: '12345678-1234-4234-8234-123456789abc' }).caller_phone,
    '[REDACTED_PHONE]',
    'Klucz caller_phone musi redagować nawet jeśli wartością jest UUID',
  )
  assert.equal(
    sanitizePayload({ secret_token: 'secret-api-key-value' }).secret_token,
    '[REDACTED]',
    'Klucz sekretu musi być redagowany do [REDACTED]',
  )
  assert.equal(
    sanitizePayload({ password: 'user-password' }).password,
    '[REDACTED]',
    'Klucz hasła musi być redagowany do [REDACTED]',
  )

  // E. Złożony payload zdarzenia audytowego zachowuje tożsamość rekordu, a redaguje dane prywatne
  const eventPayload = {
    action: 'sweep_expired',
    requestId: 'cde9326e-75b1-4f0d-8274-e13708d3f285',
    entitlementId: '12345678-1234-4234-8234-123456789abc',
    clientNote: 'Zadzwoń pod +48 501 234 567 po 17:00 jutro',
    safeDescription: 'Automated expiration sweep run',
  }

  const sanitizedEventPayload = sanitizePayload(eventPayload)
  assert.equal(sanitizedEventPayload.action, 'sweep_expired')
  assert.equal(sanitizedEventPayload.requestId, 'cde9326e-75b1-4f0d-8274-e13708d3f285')
  assert.equal(sanitizedEventPayload.entitlementId, '12345678-1234-4234-8234-123456789abc')
  assert.equal(sanitizedEventPayload.clientNote, 'Zadzwoń pod [REDACTED_PHONE] po 17:00 jutro')
  assert.equal(sanitizedEventPayload.safeDescription, 'Automated expiration sweep run')
})

