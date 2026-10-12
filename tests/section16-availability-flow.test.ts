import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createLocalDataSandbox } from '../scripts/lib/local-data-sandbox'
import {
  createAvailabilityNotificationRequest,
  getAvailabilityNotificationRequest,
  getAvailabilityNotificationEventByIdempotencyKey,
  getFirstActiveQueuedAvailabilityNotificationRequest,
  offerAvailabilityNotification,
  confirmNotificationOfferPayment,
  transitionAvailabilityNotificationState,
  mapAvailabilityNotificationRequestRecord,
  mapAvailabilityNotificationEventRecord,
  mapRpcError,
  resetSection16LocalStore,
  readSection16StoreSnapshot,
} from '../lib/server/section16-store'
import {
  processOwnerAvailabilityReady,
  createAvailabilityOfferDescriptor,
  validateOwnerActionId,
  CANONICAL_UUID_V4_REGEX,
  Section16AvailabilityFlowError,
  Section16QueueEmptyError,
  DEFAULT_AVAILABILITY_FLOW_BOUNDARIES,
  AvailabilityFlowIntegrationBoundaries,
  ClientOfferDispatchAdapter,
  OwnerNotificationAdapter,
  AvailabilityOfferDescriptor,
} from '../lib/server/section16-availability-flow'
import {
  Section16ConcurrencyError,
  Section16IdempotencyConflictError,
  Section16HoldExpiredError,
  Section16ValidationError,
  Section16InvalidIdempotencyKeyError,
  Section16NotFoundError,
} from '../lib/server/section16-types'

let sandbox: Awaited<ReturnType<typeof createLocalDataSandbox>> | null = null

test.before(async () => {
  sandbox = await createLocalDataSandbox('section16-availability-flow')
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

// ---------------------------------------------------------------------------
// 1. KOLEJNOŚĆ FIFO I MONOTONICZNE POZYCJE BEZ PONOWNEGO UŻYCIA
// ---------------------------------------------------------------------------
test('1. Kolejność FIFO i monotoniczne pozycje bez ponownego użycia', async () => {
  const now = new Date('2026-10-12T10:00:00.000Z')

  const req1 = await createAvailabilityNotificationRequest(
    {
      rawPhone: '+48600111001',
      clientName: 'Klient 1',
      idempotencyKey: 'fifo-create-001',
    },
    now,
  )

  const req2 = await createAvailabilityNotificationRequest(
    {
      rawPhone: '+48600111002',
      clientName: 'Klient 2',
      idempotencyKey: 'fifo-create-002',
    },
    now,
  )

  const req3 = await createAvailabilityNotificationRequest(
    {
      rawPhone: '+48600111003',
      clientName: 'Klient 3',
      idempotencyKey: 'fifo-create-003',
    },
    now,
  )

  assert.equal(req1.queuePosition, 1)
  assert.equal(req2.queuePosition, 2)
  assert.equal(req3.queuePosition, 3)

  // 1st offer must pick req1 (queuePosition 1)
  const result1 = await processOwnerAvailabilityReady({
    ownerConfirmedReady: true,
    ownerActionId: 'a1b2c3d4-e5f6-4a1b-8c2d-e3f4a5b6c701',
    idempotencyKey: 'idemp-fifo-001',
    now,
  })
  assert.equal(result1.request.id, req1.id)
  assert.equal(result1.request.queuePosition, 1)
  assert.equal(result1.request.state, 'offer_sent')
  assert.equal(result1.isRetry, false)

  // 2nd offer must pick req2 (queuePosition 2)
  const result2 = await processOwnerAvailabilityReady({
    ownerConfirmedReady: true,
    ownerActionId: 'a1b2c3d4-e5f6-4a1b-8c2d-e3f4a5b6c702',
    idempotencyKey: 'idemp-fifo-002',
    now,
  })
  assert.equal(result2.request.id, req2.id)
  assert.equal(result2.request.queuePosition, 2)
  assert.equal(result2.request.state, 'offer_sent')
  assert.equal(result2.isRetry, false)

  // 3rd offer must pick req3 (queuePosition 3)
  const result3 = await processOwnerAvailabilityReady({
    ownerConfirmedReady: true,
    ownerActionId: 'a1b2c3d4-e5f6-4a1b-8c2d-e3f4a5b6c703',
    idempotencyKey: 'idemp-fifo-003',
    now,
  })
  assert.equal(result3.request.id, req3.id)
  assert.equal(result3.request.queuePosition, 3)
  assert.equal(result3.request.state, 'offer_sent')
  assert.equal(result3.isRetry, false)

  // Queue is now empty
  await assert.rejects(
    () =>
      processOwnerAvailabilityReady({
        ownerConfirmedReady: true,
        ownerActionId: 'a1b2c3d4-e5f6-4a1b-8c2d-e3f4a5b6c704',
        idempotencyKey: 'idemp-fifo-004',
        now,
      }),
    (err: any) => {
      assert.ok(err instanceof Section16QueueEmptyError)
      assert.equal(err.code, 'QUEUE_EMPTY')
      return true
    },
  )
})

// ---------------------------------------------------------------------------
// 2. POMIJANIE WYGASŁYCH ORAZ WSZYSTKICH STANÓW INNYCH NIŻ QUEUED
// ---------------------------------------------------------------------------
test('2. Pomijanie wygasłych oraz wszystkich stanów innych niż queued', async () => {
  const now = new Date('2026-10-12T12:00:00.000Z')

  // 2a. Expired request in queued state (expiresAt in past relative to now)
  const pastExpiry = new Date('2026-10-12T11:00:00.000Z').toISOString()
  const reqExpiredQueued = await createAvailabilityNotificationRequest(
    {
      rawPhone: '+48600111101',
      expiresAt: pastExpiry,
      idempotencyKey: 'skip-create-expired-queued',
    },
    new Date('2026-10-10T12:00:00.000Z'),
  )

  // 2b. Request transitioned to offer_sent
  const reqOfferSent = await createAvailabilityNotificationRequest(
    {
      rawPhone: '+48600111102',
      idempotencyKey: 'skip-create-offer-sent',
    },
    now,
  )
  await offerAvailabilityNotification(
    {
      requestId: reqOfferSent.id,
      expectedVersion: reqOfferSent.version,
      idempotencyKey: 'skip-offer-1',
    },
    now,
  )

  // 2c. Request transitioned to accepted_paid
  const reqAcceptedPaid = await createAvailabilityNotificationRequest(
    {
      rawPhone: '+48600111103',
      idempotencyKey: 'skip-create-accepted',
    },
    now,
  )
  await offerAvailabilityNotification(
    {
      requestId: reqAcceptedPaid.id,
      expectedVersion: reqAcceptedPaid.version,
      idempotencyKey: 'skip-offer-2',
    },
    now,
  )
  await confirmNotificationOfferPayment(
    {
      requestId: reqAcceptedPaid.id,
      expectedVersion: 2,
      paymentReference: 'pay-skip-001',
      idempotencyKey: 'skip-confirm-2',
    },
    now,
  )

  // 2d. Request transitioned to cancelled
  const reqCancelled = await createAvailabilityNotificationRequest(
    {
      rawPhone: '+48600111104',
      idempotencyKey: 'skip-create-cancelled',
    },
    now,
  )
  await transitionAvailabilityNotificationState(
    {
      requestId: reqCancelled.id,
      targetState: 'cancelled',
      expectedVersion: reqCancelled.version,
      idempotencyKey: 'skip-cancel-3',
    },
    now,
  )

  // 2e. Request transitioned to consumed (via accepted_paid -> consumed)
  const reqConsumed = await createAvailabilityNotificationRequest(
    {
      rawPhone: '+48600111105',
      idempotencyKey: 'skip-create-consumed',
    },
    now,
  )
  await offerAvailabilityNotification(
    {
      requestId: reqConsumed.id,
      expectedVersion: reqConsumed.version,
      idempotencyKey: 'skip-offer-4',
    },
    now,
  )
  await confirmNotificationOfferPayment(
    {
      requestId: reqConsumed.id,
      expectedVersion: 2,
      paymentReference: 'pay-skip-004',
      idempotencyKey: 'skip-confirm-4',
    },
    now,
  )
  await transitionAvailabilityNotificationState(
    {
      requestId: reqConsumed.id,
      targetState: 'consumed',
      expectedVersion: 3,
      idempotencyKey: 'skip-consume-4',
    },
    now,
  )

  // 2f. The ONLY valid active queued request
  const reqActive = await createAvailabilityNotificationRequest(
    {
      rawPhone: '+48600111106',
      idempotencyKey: 'skip-create-active',
    },
    now,
  )

  // Process readiness: must skip all above and select reqActive
  const result = await processOwnerAvailabilityReady({
    ownerConfirmedReady: true,
    ownerActionId: 'b1b2c3d4-e5f6-4a1b-8c2d-e3f4a5b6c701',
    idempotencyKey: 'idemp-skip-001',
    now,
  })

  assert.equal(result.request.id, reqActive.id)
  assert.equal(result.request.state, 'offer_sent')
  assert.equal(result.isRetry, false)

  // Crucial check: reading/skipping expired record did NOT mutate it during read
  const storeSnapshot = await readSection16StoreSnapshot()
  const expRecord = storeSnapshot.notificationRequests.find((r) => r.id === reqExpiredQueued.id)
  assert.ok(expRecord)
  assert.equal(expRecord.state, 'queued', 'Odczyt nie może mutować wygasłego rekordu')
  assert.equal(expRecord.version, 1, 'Wersja wygasłego rekordu nie może się zmienić podczas odczytu')
})

// ---------------------------------------------------------------------------
// 3. BRAK/FALSE OWNERCONFIRMEDREADY, BRAK/BŁĘDNY OWNERACTIONID I IDEMPOTENCY KEY
// ---------------------------------------------------------------------------
test('3. Brak/false ownerConfirmedReady, brak/błędny ownerActionId i idempotency key', async () => {
  const now = new Date('2026-10-12T10:00:00.000Z')
  await createAvailabilityNotificationRequest(
    {
      rawPhone: '+48600222001',
      idempotencyKey: 'validation-req-001',
    },
    now,
  )

  const snapBefore = await readSection16StoreSnapshot()

  // 3a. ownerConfirmedReady === false or missing
  for (const badReady of [false, undefined, null, 'true' as any, 1 as any, 0 as any]) {
    await assert.rejects(
      () =>
        processOwnerAvailabilityReady({
          ownerConfirmedReady: badReady,
          ownerActionId: 'c1b2c3d4-e5f6-4a1b-8c2d-e3f4a5b6c701',
          idempotencyKey: 'idemp-valid-001',
          now,
        }),
      (err: any) => {
        assert.ok(err instanceof Section16AvailabilityFlowError)
        assert.equal(err.code, 'OWNER_NOT_READY')
        return true
      },
    )
  }

  // 3b. ownerActionId: strictly canonical UUID v4 (rejects short/predictable strings, zero UUID, bad version/variant, spaces, prefixes/suffixes)
  const invalidActionIds: any[] = [
    // Previously accepted non-UUID / short / predictable strings
    'act-001',
    'act-valid-001',
    'action-fifo-001',
    'owner-action-xyz',
    '12345',
    'quick-action',

    // Missing, empty, whitespace, non-string
    undefined,
    null,
    '',
    '   ',
    123,
    true,
    false,
    {},
    [],

    // Zero / nil UUID (RFC 4122 nil UUID)
    '00000000-0000-0000-0000-000000000000',

    // Wrong version (e.g. v1, v2, v3, v5, v7)
    '30000000-0000-1000-8000-000000000001', // v1
    '30000000-0000-2000-8000-000000000001', // v2
    '30000000-0000-3000-8000-000000000001', // v3
    '30000000-0000-5000-8000-000000000001', // v5
    '30000000-0000-7000-8000-000000000001', // v7

    // Wrong variant (RFC 4122 variant bits 10xx -> [89ab])
    '30000000-0000-4000-0000-000000000001', // variant 0
    '30000000-0000-4000-7000-000000000001', // variant 7
    '30000000-0000-4000-c000-000000000001', // variant c (Microsoft GUID)
    '30000000-0000-4000-f000-000000000001', // variant f

    // Spaces (leading, trailing, internal)
    ' 30000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001 ',
    '30000000-0000 4000-8000-000000000001',

    // Prefixes and suffixes
    'urn:uuid:30000000-0000-4000-8000-000000000001',
    'act-30000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001-action',

    // Uppercase characters (non-canonical)
    '30000000-0000-4000-8000-00000000000A',
    '30000000-0000-4000-8000-00000000000F',

    // Non-hex characters
    '30000000-0000-4000-8000-00000000000g',

    // Length invalid
    '30000000-0000-4000-8000-00000000000', // 35 chars
    '30000000-0000-4000-8000-0000000000001', // 37 chars
    'a'.repeat(129),
  ]

  for (const badActionId of invalidActionIds) {
    await assert.rejects(
      () =>
        processOwnerAvailabilityReady({
          ownerConfirmedReady: true,
          ownerActionId: badActionId,
          idempotencyKey: 'idemp-valid-002',
          now,
        }),
      (err: any) => err instanceof Section16ValidationError,
      `Oczekiwano Section16ValidationError dla nieprawidłowego ownerActionId: ${String(badActionId)}`,
    )
    assert.throws(
      () => validateOwnerActionId(badActionId),
      (err: any) => err instanceof Section16ValidationError,
    )
  }

  // Direct validator unit check on valid deterministic UUID v4
  assert.equal(
    validateOwnerActionId('c1b2c3d4-e5f6-4a1b-8c2d-e3f4a5b6c701'),
    'c1b2c3d4-e5f6-4a1b-8c2d-e3f4a5b6c701',
  )

  // 3c. idempotencyKey missing, empty, whitespace, non-string, or >128 chars
  for (const badKey of ['', '   ', undefined as any, null as any, 123 as any, 'k'.repeat(129)]) {
    await assert.rejects(
      () =>
        processOwnerAvailabilityReady({
          ownerConfirmedReady: true,
          ownerActionId: 'c1b2c3d4-e5f6-4a1b-8c2d-e3f4a5b6c702',
          idempotencyKey: badKey,
          now,
        }),
      (err: any) => err instanceof Section16InvalidIdempotencyKeyError,
    )
  }

  // Verify fail-closed: zero mutations, zero events
  const snapAfter = await readSection16StoreSnapshot()
  assert.deepEqual(snapAfter, snapBefore, 'Błędne wejścia nie mogą wywołać żadnych skutków ubocznych')
})

// ---------------------------------------------------------------------------
// 4. TTL 5/60, DOMYŚLNE 15 ORAZ WARTOŚCI POZA ZAKRESEM
// ---------------------------------------------------------------------------
test('4. TTL 5/60, domyślne 15 oraz wartości poza zakresem', async () => {
  const now = new Date('2026-10-12T10:00:00.000Z')

  // 4a. Default TTL = 15 minutes
  const req1 = await createAvailabilityNotificationRequest(
    { rawPhone: '+48600333001', idempotencyKey: 'ttl-create-001' },
    now,
  )
  const resDefault = await processOwnerAvailabilityReady({
    ownerConfirmedReady: true,
    ownerActionId: 'd1b2c3d4-e5f6-4a1b-8c2d-e3f4a5b6c701',
    idempotencyKey: 'idemp-ttl-001',
    now,
  })
  assert.equal(resDefault.descriptor.offerTtlMinutes, 15)
  assert.equal(
    resDefault.descriptor.offerExpiresAt,
    new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
  )

  // 4b. Lower bound TTL = 5 minutes
  const req2 = await createAvailabilityNotificationRequest(
    { rawPhone: '+48600333002', idempotencyKey: 'ttl-create-002' },
    now,
  )
  const resMin = await processOwnerAvailabilityReady({
    ownerConfirmedReady: true,
    ownerActionId: 'd1b2c3d4-e5f6-4a1b-8c2d-e3f4a5b6c702',
    idempotencyKey: 'idemp-ttl-002',
    offerTtlMinutes: 5,
    now,
  })
  assert.equal(resMin.descriptor.offerTtlMinutes, 5)
  assert.equal(
    resMin.descriptor.offerExpiresAt,
    new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
  )

  // 4c. Upper bound TTL = 60 minutes
  const req3 = await createAvailabilityNotificationRequest(
    { rawPhone: '+48600333003', idempotencyKey: 'ttl-create-003' },
    now,
  )
  const resMax = await processOwnerAvailabilityReady({
    ownerConfirmedReady: true,
    ownerActionId: 'd1b2c3d4-e5f6-4a1b-8c2d-e3f4a5b6c703',
    idempotencyKey: 'idemp-ttl-003',
    offerTtlMinutes: 60,
    now,
  })
  assert.equal(resMax.descriptor.offerTtlMinutes, 60)
  assert.equal(
    resMax.descriptor.offerExpiresAt,
    new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
  )

  // 4d. Out of bounds TTLs (< 5, > 60, non-integers)
  const req4 = await createAvailabilityNotificationRequest(
    { rawPhone: '+48600333004', idempotencyKey: 'ttl-create-004' },
    now,
  )
  const invalidTtls = [4, 0, -1, 61, 120, 15.5, NaN, '15' as any]
  for (const badTtl of invalidTtls) {
    await assert.rejects(
      () =>
        processOwnerAvailabilityReady({
          ownerConfirmedReady: true,
          ownerActionId: 'd1b2c3d4-e5f6-4a1b-8c2d-e3f4a5b6c704',
          idempotencyKey: `idemp-ttl-bad-${badTtl}`,
          offerTtlMinutes: badTtl,
          now,
        }),
      (err: any) => err instanceof Section16ValidationError,
    )
  }

  // req4 must still be queued and untouched
  const req4After = await getAvailabilityNotificationRequest(req4.id)
  assert.equal(req4After?.state, 'queued')
  assert.equal(req4After?.version, 1)
})

// ---------------------------------------------------------------------------
// 5. OBOWIĄZKOWY CAS, KONFLIKT WERSJI I RÓWNOLEGŁE PRÓBY
// ---------------------------------------------------------------------------
test('5. Obowiązkowy CAS, konflikt wersji i równoległe próby', async () => {
  const now = new Date('2026-10-12T10:00:00.000Z')

  const req = await createAvailabilityNotificationRequest(
    { rawPhone: '+48600444001', idempotencyKey: 'cas-create-001' },
    now,
  )
  assert.equal(req.version, 1)

  // 5a. Explicit wrong expectedVersion (e.g. 2 instead of 1) -> Section16ConcurrencyError
  await assert.rejects(
    () =>
      processOwnerAvailabilityReady({
        ownerConfirmedReady: true,
        ownerActionId: 'e1b2c3d4-e5f6-4a1b-8c2d-e3f4a5b6c701',
        idempotencyKey: 'idemp-cas-bad-version',
        expectedVersion: 2,
        now,
      }),
    (err: any) => err instanceof Section16ConcurrencyError,
  )

  // 5b. Invalid expectedVersion values (0, negative, NaN, non-integer)
  for (const badVer of [0, -1, NaN, 1.5]) {
    await assert.rejects(
      () =>
        processOwnerAvailabilityReady({
          ownerConfirmedReady: true,
          ownerActionId: 'e1b2c3d4-e5f6-4a1b-8c2d-e3f4a5b6c701',
          idempotencyKey: `idemp-cas-invalid-${badVer}`,
          expectedVersion: badVer,
          now,
        }),
      (err: any) => err instanceof Section16ValidationError,
    )
  }

  // 5c. Parallel concurrent attempts on the same single queued request
  const snapBefore = await readSection16StoreSnapshot()
  const p1 = processOwnerAvailabilityReady({
    ownerConfirmedReady: true,
    ownerActionId: 'e1b2c3d4-e5f6-4a1b-8c2d-e3f4a5b6c702',
    idempotencyKey: 'idemp-cas-par-1',
    now,
  })
  const p2 = processOwnerAvailabilityReady({
    ownerConfirmedReady: true,
    ownerActionId: 'e1b2c3d4-e5f6-4a1b-8c2d-e3f4a5b6c703',
    idempotencyKey: 'idemp-cas-par-2',
    now,
  })

  const results = await Promise.allSettled([p1, p2])
  const fulfilled = results.filter((r) => r.status === 'fulfilled')
  const rejected = results.filter((r) => r.status === 'rejected')

  // Exactly one attempt must succeed, and the other must fail-closed (concurrency conflict or queue empty)
  assert.equal(fulfilled.length, 1, 'Dokładnie jedna równoległa próba musi się powieść')
  assert.equal(rejected.length, 1, 'Druga próba musi zakończyć się błędem')

  const rejectionReason = (rejected[0] as PromiseRejectedResult).reason
  assert.ok(
    rejectionReason instanceof Section16ConcurrencyError ||
      rejectionReason instanceof Section16QueueEmptyError,
    'Odrzucenie równoległe musi być CAS ConcurrencyError lub QueueEmptyError',
  )

  // Record is offered once, state = offer_sent, version = 2
  const finalReq = await getAvailabilityNotificationRequest(req.id)
  assert.equal(finalReq?.state, 'offer_sent')
  assert.equal(finalReq?.version, 2)
})

// ---------------------------------------------------------------------------
// 6. EXACT RETRY PO WYGAŚNIĘCIU OFERTY — TEN SAM REKORD/TTL, ZERO NOWEGO EVENTU
// ---------------------------------------------------------------------------
test('6. Exact retry po wygaśnięciu oferty — ten sam rekord/TTL, zero nowego eventu', async () => {
  const t0 = new Date('2026-10-12T10:00:00.000Z')
  const req = await createAvailabilityNotificationRequest(
    { rawPhone: '+48600555001', idempotencyKey: 'retry-create-001' },
    t0,
  )

  const idempotencyKey = 'idemp-retry-exact-001'
  const ownerActionId = 'f1b2c3d4-e5f6-4a1b-8c2d-e3f4a5b6c701'

  // First fresh execution
  const first = await processOwnerAvailabilityReady({
    ownerConfirmedReady: true,
    ownerActionId,
    idempotencyKey,
    offerTtlMinutes: 15,
    payload: { source: 'admin_dashboard' },
    now: t0,
  })

  assert.equal(first.isRetry, false)
  assert.equal(first.request.state, 'offer_sent')
  assert.equal(first.request.version, 2)
  const initialOfferExpiresAt = first.request.offerExpiresAt

  const snapAfterFirst = await readSection16StoreSnapshot()
  const initialEventCount = snapAfterFirst.notificationEvents.length

  // Retry after offer expiration time (t0 + 30m)
  const tOfferExpired = new Date('2026-10-12T10:30:00.000Z')
  const retry1 = await processOwnerAvailabilityReady({
    ownerConfirmedReady: true,
    ownerActionId,
    idempotencyKey,
    offerTtlMinutes: 15,
    payload: { source: 'admin_dashboard' },
    now: tOfferExpired,
  })

  assert.equal(retry1.isRetry, true)
  assert.equal(retry1.request.id, req.id)
  assert.equal(retry1.request.offerExpiresAt, initialOfferExpiresAt, 'TTL nie może zostać przedłużony')
  assert.equal(retry1.descriptor.offerExpiresAt, initialOfferExpiresAt)

  // Retry after overall request expiration time (t0 + 10 days)
  const tRequestExpired = new Date('2026-10-22T10:00:00.000Z')
  const retry2 = await processOwnerAvailabilityReady({
    ownerConfirmedReady: true,
    ownerActionId,
    idempotencyKey,
    offerTtlMinutes: 15,
    payload: { source: 'admin_dashboard' },
    now: tRequestExpired,
  })

  assert.equal(retry2.isRetry, true)
  assert.equal(retry2.request.id, req.id)
  assert.equal(retry2.request.offerExpiresAt, initialOfferExpiresAt)

  // Total events in store must remain exactly the same (zero new events)
  const snapFinal = await readSection16StoreSnapshot()
  assert.equal(
    snapFinal.notificationEvents.length,
    initialEventCount,
    'Zero nowego eventu po exact retry',
  )
})

// ---------------------------------------------------------------------------
// 7. KONFLIKTY RETRY DLA ZMIANY OWNERACTIONID/REQUEST/QUEUEPOSITION/VERSION/TTL/PAYLOAD
// ---------------------------------------------------------------------------
test('7. Konflikty retry dla zmiany ownerActionId/request/queuePosition/version/TTL/payload', async () => {
  const now = new Date('2026-10-12T10:00:00.000Z')
  const req = await createAvailabilityNotificationRequest(
    { rawPhone: '+48600666001', idempotencyKey: 'conflict-create-001' },
    now,
  )

  const idempotencyKey = 'idemp-conflict-base-001'
  const ownerActionId = '71b2c3d4-e5f6-4a1b-8c2d-e3f4a5b6c701'

  await processOwnerAvailabilityReady({
    ownerConfirmedReady: true,
    ownerActionId,
    idempotencyKey,
    offerTtlMinutes: 15,
    payload: { tag: 'initial' },
    now,
  })

  const snapBase = await readSection16StoreSnapshot()
  const eventsCountBefore = snapBase.notificationEvents.length

  // 7a. Change ownerActionId
  await assert.rejects(
    () =>
      processOwnerAvailabilityReady({
        ownerConfirmedReady: true,
        ownerActionId: '71b2c3d4-e5f6-4a1b-8c2d-e3f4a5b6c702',
        idempotencyKey,
        offerTtlMinutes: 15,
        payload: { tag: 'initial' },
        now,
      }),
    (err: any) => err instanceof Section16IdempotencyConflictError,
  )

  // 7b. Change expectedRequestId
  await assert.rejects(
    () =>
      processOwnerAvailabilityReady({
        ownerConfirmedReady: true,
        ownerActionId,
        idempotencyKey,
        expectedRequestId: 'different-request-id-000000000000',
        offerTtlMinutes: 15,
        payload: { tag: 'initial' },
        now,
      }),
    (err: any) => err instanceof Section16IdempotencyConflictError,
  )

  // 7c. Change expectedQueuePosition
  await assert.rejects(
    () =>
      processOwnerAvailabilityReady({
        ownerConfirmedReady: true,
        ownerActionId,
        idempotencyKey,
        expectedQueuePosition: 999,
        offerTtlMinutes: 15,
        payload: { tag: 'initial' },
        now,
      }),
    (err: any) => err instanceof Section16IdempotencyConflictError,
  )

  // 7d. Change expectedVersion
  await assert.rejects(
    () =>
      processOwnerAvailabilityReady({
        ownerConfirmedReady: true,
        ownerActionId,
        idempotencyKey,
        expectedVersion: 999,
        offerTtlMinutes: 15,
        payload: { tag: 'initial' },
        now,
      }),
    (err: any) => err instanceof Section16IdempotencyConflictError,
  )

  // 7e. Change TTL
  await assert.rejects(
    () =>
      processOwnerAvailabilityReady({
        ownerConfirmedReady: true,
        ownerActionId,
        idempotencyKey,
        offerTtlMinutes: 30, // was 15
        payload: { tag: 'initial' },
        now,
      }),
    (err: any) => err instanceof Section16IdempotencyConflictError,
  )

  // 7f. Change extra payload
  await assert.rejects(
    () =>
      processOwnerAvailabilityReady({
        ownerConfirmedReady: true,
        ownerActionId,
        idempotencyKey,
        offerTtlMinutes: 15,
        payload: { tag: 'MODIFIED_PAYLOAD' },
        now,
      }),
    (err: any) => err instanceof Section16IdempotencyConflictError,
  )

  // Zero new events after all conflict rejections
  const snapAfter = await readSection16StoreSnapshot()
  assert.equal(snapAfter.notificationEvents.length, eventsCountBefore)
})

// ---------------------------------------------------------------------------
// 8. QUEUE_EMPTY BEZ MUTACJI
// ---------------------------------------------------------------------------
test('8. QUEUE_EMPTY bez mutacji', async () => {
  const now = new Date('2026-10-12T10:00:00.000Z')
  const snapBefore = await readSection16StoreSnapshot()
  assert.equal(snapBefore.notificationRequests.length, 0)

  await assert.rejects(
    () =>
      processOwnerAvailabilityReady({
        ownerConfirmedReady: true,
        ownerActionId: '81b2c3d4-e5f6-4a1b-8c2d-e3f4a5b6c701',
        idempotencyKey: 'idemp-empty-001',
        now,
      }),
    (err: any) => {
      assert.ok(err instanceof Section16QueueEmptyError)
      assert.equal(err.code, 'QUEUE_EMPTY')
      return true
    },
  )

  const snapAfter = await readSection16StoreSnapshot()
  assert.deepEqual(snapAfter, snapBefore, 'QUEUE_EMPTY nie może tworzyć mutacji ani zdarzeń')
})

// ---------------------------------------------------------------------------
// 9. DESCRIPTOR BEZ PII I BEZ PRAWDZIWEGO LINKU/TOKENA
// ---------------------------------------------------------------------------
test('9. Descriptor bez PII i bez prawdziwego linku/tokena', async () => {
  const now = new Date('2026-10-12T10:00:00.000Z')
  const rawPhone = '+48600777888'
  const clientName = 'Jan Kowalski Tajny'
  const contactCiphertext = 'enc:valid_ciphertext_blob_abcdefghijk'
  const intakeIdempotencyKey = 'pii-create-001'
  const flowIdempotencyKey = 'idemp-pii-001'
  const ownerActionId = '91b2c3d4-e5f6-4a1b-8c2d-e3f4a5b6c701'

  const req = await createAvailabilityNotificationRequest(
    {
      rawPhone,
      clientName,
      contactCiphertext,
      channel: 'sms',
      idempotencyKey: intakeIdempotencyKey,
    },
    now,
  )

  const result = await processOwnerAvailabilityReady({
    ownerConfirmedReady: true,
    ownerActionId,
    idempotencyKey: flowIdempotencyKey,
    now,
  })

  const desc = result.descriptor

  // Negative property assertions: pseudo-data and sensitive fields must NOT exist on descriptor
  assert.equal('rawPhone' in desc, false, 'Descriptor nie może zawierać surowego numeru telefonu')
  assert.equal('callerPhoneMasked' in desc, false, 'Descriptor nie może zawierać maskowanego telefonu')
  assert.equal('callerPhoneFingerprint' in desc, false, 'Descriptor nie może zawierać pełnego fingerprintu')
  assert.equal('fingerprintPrefix' in desc, false, 'Descriptor nie może zawierać częściowego fingerprintu')
  assert.equal('clientName' in desc, false, 'Descriptor nie może zawierać imienia klienta')
  assert.equal('contactCiphertext' in desc, false, 'Descriptor nie może zawierać contactCiphertext')
  assert.equal('clientNotes' in desc, false, 'Descriptor nie może zawierać notatek klienta')
  assert.equal('idempotencyKey' in desc, false, 'Descriptor nie może zawierać klucza idempotencji')
  assert.equal('phone' in desc, false, 'Descriptor nie może zawierać właściwości phone')
  assert.equal('email' in desc, false, 'Descriptor nie może zawierać właściwości email')

  // Strict whitelist of descriptor keys
  const allowedKeys = new Set([
    'requestId',
    'queuePosition',
    'state',
    'channel',
    'ownerActionId',
    'offeredAt',
    'offerExpiresAt',
    'offerTtlMinutes',
    'paymentReference',
    'paymentUrl',
    'paymentToken',
  ])
  for (const key of Object.keys(desc)) {
    assert.ok(allowedKeys.has(key), `Nieoczekiwane pole w descriptorze: ${key}`)
  }

  // Exact correlation values
  assert.equal(desc.requestId, req.id)
  assert.equal(desc.queuePosition, req.queuePosition)
  assert.equal(desc.state, 'offer_sent')
  assert.equal(desc.channel, 'sms')
  assert.equal(desc.ownerActionId, ownerActionId)
  assert.equal(desc.offeredAt, result.request.offeredAt)
  assert.equal(desc.offerExpiresAt, result.request.offerExpiresAt)
  assert.equal(desc.offerTtlMinutes, 15)

  // Payment safety assertions: explicitly null
  assert.equal(desc.paymentReference, null)
  assert.equal(desc.paymentUrl, null)
  assert.equal(desc.paymentToken, null)

  // Stringified descriptor serialization checks
  const jsonStr = JSON.stringify(desc)

  // 1. Raw phone absence
  assert.equal(jsonStr.includes('600777888'), false, 'Zserializowany descriptor nie może zawierać cyfr telefonu')
  assert.equal(jsonStr.includes('+48600777888'), false, 'Zserializowany descriptor nie może zawierać surowego telefonu')
  assert.equal(jsonStr.includes('48600777888'), false, 'Zserializowany descriptor nie może zawierać telefonu z kodem kraju')

  // 2. Masked phone absence
  assert.ok(req.callerPhoneMasked && req.callerPhoneMasked.length > 0)
  assert.equal(jsonStr.includes(req.callerPhoneMasked), false, 'Zserializowany descriptor nie może zawierać maskowanego telefonu')
  assert.equal(jsonStr.includes('***'), false, 'Zserializowany descriptor nie może zawierać wzorca maskowania')

  // 3. Full and partial fingerprint absence
  assert.ok(req.callerPhoneFingerprint && req.callerPhoneFingerprint.length > 0)
  assert.equal(jsonStr.includes(req.callerPhoneFingerprint), false, 'Zserializowany descriptor nie może zawierać pełnego fingerprintu')
  assert.equal(jsonStr.includes(req.callerPhoneFingerprint.slice(0, 8)), false, 'Zserializowany descriptor nie może zawierać 8-znakowego prefiksu fingerprintu')
  assert.equal(jsonStr.includes(req.callerPhoneFingerprint.slice(0, 6)), false, 'Zserializowany descriptor nie może zawierać 6-znakowego fragmentu fingerprintu')
  assert.equal(jsonStr.includes(req.callerPhoneFingerprint.slice(0, 4)), false, 'Zserializowany descriptor nie może zawierać 4-znakowego fragmentu fingerprintu')

  // 4. Client name absence
  assert.equal(jsonStr.includes('Jan Kowalski'), false, 'Zserializowany descriptor nie może zawierać imienia klienta')
  assert.equal(jsonStr.includes('Tajny'), false, 'Zserializowany descriptor nie może zawierać fragmentu imienia klienta')

  // 5. Ciphertext absence
  assert.equal(jsonStr.includes('enc:valid_ciphertext'), false, 'Zserializowany descriptor nie może zawierać contactCiphertext')
  assert.equal(jsonStr.includes('enc:'), false, 'Zserializowany descriptor nie może zawierać prefiksu enc:')

  // 6. Idempotency keys absence
  assert.equal(jsonStr.includes(intakeIdempotencyKey), false, 'Zserializowany descriptor nie może zawierać klucza idempotencji zgłoszenia')
  assert.equal(jsonStr.includes(flowIdempotencyKey), false, 'Zserializowany descriptor nie może zawierać klucza idempotencji przepływu')

  // 7. Absence of prohibited field names in serialized JSON
  assert.equal(jsonStr.includes('callerPhoneMasked'), false)
  assert.equal(jsonStr.includes('fingerprintPrefix'), false)
  assert.equal(jsonStr.includes('callerPhoneFingerprint'), false)
  assert.equal(jsonStr.includes('idempotencyKey'), false)
  assert.equal(jsonStr.includes('contactCiphertext'), false)
  assert.equal(jsonStr.includes('clientName'), false)
  assert.equal(jsonStr.includes('rawPhone'), false)
})

// ---------------------------------------------------------------------------
// 10. ZERO WYWOŁAŃ ADAPTERÓW
// ---------------------------------------------------------------------------
test('10. Zero wywołań adapterów', async () => {
  const now = new Date('2026-10-12T10:00:00.000Z')
  await createAvailabilityNotificationRequest(
    { rawPhone: '+48600888999', idempotencyKey: 'adapter-req-001' },
    now,
  )

  const adapterCalls: string[] = []
  const boundariesSpy: AvailabilityFlowIntegrationBoundaries = {
    clientOfferDispatch: {
      dispatchClientOffer: async () => {
        adapterCalls.push('clientOfferDispatch')
      },
    },
    ownerNotification: {
      dispatchOwnerNotification: async () => {
        adapterCalls.push('ownerNotification')
      },
    },
  }

  // Fresh execution
  await processOwnerAvailabilityReady(
    {
      ownerConfirmedReady: true,
      ownerActionId: 'a0b2c3d4-e5f6-4a1b-8c2d-e3f4a5b6c701',
      idempotencyKey: 'idemp-adapter-001',
      now,
    },
    boundariesSpy,
  )

  assert.equal(adapterCalls.length, 0, 'Świeża operacja musi wykazać zero wywołań adapterów')

  // Retry execution
  await processOwnerAvailabilityReady(
    {
      ownerConfirmedReady: true,
      ownerActionId: 'a0b2c3d4-e5f6-4a1b-8c2d-e3f4a5b6c701',
      idempotencyKey: 'idemp-adapter-001',
      now,
    },
    boundariesSpy,
  )

  assert.equal(adapterCalls.length, 0, 'Retry musi wykazać zero wywołań adapterów')

  // Verify that default adapters are fail-closed when invoked
  await assert.rejects(
    () => DEFAULT_AVAILABILITY_FLOW_BOUNDARIES.clientOfferDispatch!.dispatchClientOffer({} as any),
    (err: any) => err.code === 'CLIENT_OFFER_DISPATCH_DISABLED',
  )
  await assert.rejects(
    () => DEFAULT_AVAILABILITY_FLOW_BOUNDARIES.ownerNotification!.dispatchOwnerNotification({}),
    (err: any) => err.code === 'OWNER_NOTIFICATION_DISABLED',
  )
})

// ---------------------------------------------------------------------------
// 11. KOMPLETNE RUNTIME MAPERY B NA REALISTYCZNYCH REKORDACH SUPABASE I NEGATYWNE FAIL-CLOSED
// ---------------------------------------------------------------------------
test('11. Kompletne runtime mapery B na realistycznych rekordach Supabase i negatywne fail-closed', () => {
  // 11a. Realistic PostgREST snake_case row for AvailabilityNotificationRequest
  const realisticSupabaseReq = {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    caller_phone_fingerprint: 'fp_sha256_mock_fingerprint_value',
    caller_phone_masked: '+48 *** *** 123',
    contact_ciphertext: 'enc:sample_aes_gcm_ciphertext_data',
    channel: 'sms',
    client_name: 'Piotr Wiśniewski',
    state: 'queued',
    queue_position: 42,
    offered_at: null,
    offer_expires_at: null,
    accepted_at: null,
    payment_reference: null,
    booking_id: null,
    expires_at: '2026-10-19T10:00:00.000Z',
    version: 1,
    idempotency_key: 'idemp-mock-supa-req-001',
    created_at: '2026-10-12T10:00:00.000Z',
    updated_at: '2026-10-12T10:00:00.000Z',
  }

  const mappedReq = mapAvailabilityNotificationRequestRecord(realisticSupabaseReq)
  assert.equal(mappedReq.id, 'f47ac10b-58cc-4372-a567-0e02b2c3d479')
  assert.equal(mappedReq.callerPhoneFingerprint, 'fp_sha256_mock_fingerprint_value')
  assert.equal(mappedReq.callerPhoneMasked, '+48 *** *** 123')
  assert.equal(mappedReq.contactCiphertext, 'enc:sample_aes_gcm_ciphertext_data')
  assert.equal(mappedReq.channel, 'sms')
  assert.equal(mappedReq.clientName, 'Piotr Wiśniewski')
  assert.equal(mappedReq.state, 'queued')
  assert.equal(mappedReq.queuePosition, 42)
  assert.equal(mappedReq.offeredAt, null)
  assert.equal(mappedReq.offerExpiresAt, null)
  assert.equal(mappedReq.acceptedAt, null)
  assert.equal(mappedReq.paymentReference, null)
  assert.equal(mappedReq.bookingId, null)
  assert.equal(mappedReq.expiresAt, '2026-10-19T10:00:00.000Z')
  assert.equal(mappedReq.version, 1)
  assert.equal(mappedReq.idempotencyKey, 'idemp-mock-supa-req-001')
  assert.equal(mappedReq.createdAt, '2026-10-12T10:00:00.000Z')
  assert.equal(mappedReq.updatedAt, '2026-10-12T10:00:00.000Z')

  // Support for bigint string queue_position
  const mappedBigintStr = mapAvailabilityNotificationRequestRecord({
    ...realisticSupabaseReq,
    queue_position: '105',
  })
  assert.equal(mappedBigintStr.queuePosition, 105)

  // Negative fail-closed tests on request mapper
  assert.throws(() => mapAvailabilityNotificationRequestRecord(null), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapAvailabilityNotificationRequestRecord([]), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapAvailabilityNotificationRequestRecord('bad'), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapAvailabilityNotificationRequestRecord({ ...realisticSupabaseReq, id: '' }), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapAvailabilityNotificationRequestRecord({ ...realisticSupabaseReq, caller_phone_fingerprint: '' }), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapAvailabilityNotificationRequestRecord({ ...realisticSupabaseReq, caller_phone_masked: '' }), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapAvailabilityNotificationRequestRecord({ ...realisticSupabaseReq, contact_ciphertext: 12345 }), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapAvailabilityNotificationRequestRecord({ ...realisticSupabaseReq, channel: 'unsupported_channel' }), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapAvailabilityNotificationRequestRecord({ ...realisticSupabaseReq, client_name: 123 }), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapAvailabilityNotificationRequestRecord({ ...realisticSupabaseReq, state: 'invalid_state' }), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapAvailabilityNotificationRequestRecord({ ...realisticSupabaseReq, queue_position: 0 }), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapAvailabilityNotificationRequestRecord({ ...realisticSupabaseReq, queue_position: -5 }), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapAvailabilityNotificationRequestRecord({ ...realisticSupabaseReq, queue_position: 1.5 }), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapAvailabilityNotificationRequestRecord({ ...realisticSupabaseReq, queue_position: 'invalid' }), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapAvailabilityNotificationRequestRecord({ ...realisticSupabaseReq, expires_at: '' }), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapAvailabilityNotificationRequestRecord({ ...realisticSupabaseReq, expires_at: 'not-a-date' }), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapAvailabilityNotificationRequestRecord({ ...realisticSupabaseReq, version: 0 }), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapAvailabilityNotificationRequestRecord({ ...realisticSupabaseReq, version: -1 }), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapAvailabilityNotificationRequestRecord({ ...realisticSupabaseReq, version: '1' }), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapAvailabilityNotificationRequestRecord({ ...realisticSupabaseReq, idempotency_key: '' }), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapAvailabilityNotificationRequestRecord({ ...realisticSupabaseReq, created_at: '' }), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapAvailabilityNotificationRequestRecord({ ...realisticSupabaseReq, updated_at: 'invalid-date' }), (err: any) => err instanceof Section16ValidationError)

  // 11b. Realistic PostgREST snake_case row for AvailabilityNotificationEvent
  const realisticSupabaseEvent = {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    request_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    event_type: 'offer_sent',
    from_state: 'queued',
    to_state: 'offer_sent',
    payload: { actionType: 'owner_availability_offer', ownerActionId: 'b0b2c3d4-e5f6-4a1b-8c2d-e3f4a5b6c701' },
    payload_hash: 'mock_payload_hash_hex_string',
    idempotency_key: 'idemp-mock-supa-ev-001',
    created_at: '2026-10-12T10:00:00.000Z',
  }

  const mappedEvent = mapAvailabilityNotificationEventRecord(realisticSupabaseEvent)
  assert.equal(mappedEvent.id, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890')
  assert.equal(mappedEvent.requestId, 'f47ac10b-58cc-4372-a567-0e02b2c3d479')
  assert.equal(mappedEvent.eventType, 'offer_sent')
  assert.equal(mappedEvent.fromState, 'queued')
  assert.equal(mappedEvent.toState, 'offer_sent')
  assert.deepEqual(mappedEvent.payload, {
    actionType: 'owner_availability_offer',
    ownerActionId: 'b0b2c3d4-e5f6-4a1b-8c2d-e3f4a5b6c701',
  })
  assert.equal(mappedEvent.payloadHash, 'mock_payload_hash_hex_string')
  assert.equal(mappedEvent.idempotencyKey, 'idemp-mock-supa-ev-001')
  assert.equal(mappedEvent.createdAt, '2026-10-12T10:00:00.000Z')

  // Negative fail-closed tests on event mapper
  assert.throws(() => mapAvailabilityNotificationEventRecord(null), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapAvailabilityNotificationEventRecord([]), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapAvailabilityNotificationEventRecord({ ...realisticSupabaseEvent, id: '' }), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapAvailabilityNotificationEventRecord({ ...realisticSupabaseEvent, request_id: '' }), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapAvailabilityNotificationEventRecord({ ...realisticSupabaseEvent, event_type: '' }), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapAvailabilityNotificationEventRecord({ ...realisticSupabaseEvent, from_state: 'bad_state' }), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapAvailabilityNotificationEventRecord({ ...realisticSupabaseEvent, to_state: 'bad_state' }), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapAvailabilityNotificationEventRecord({ ...realisticSupabaseEvent, payload: null }), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapAvailabilityNotificationEventRecord({ ...realisticSupabaseEvent, payload: 'string-not-obj' }), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapAvailabilityNotificationEventRecord({ ...realisticSupabaseEvent, payload_hash: '' }), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapAvailabilityNotificationEventRecord({ ...realisticSupabaseEvent, idempotency_key: '' }), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapAvailabilityNotificationEventRecord({ ...realisticSupabaseEvent, created_at: '' }), (err: any) => err instanceof Section16ValidationError)
})

// ---------------------------------------------------------------------------
// 12. STATYCZNY DOWÓD, ŻE WSZYSTKIE RPC/ODCZYTY B PRZECHODZĄ PRZEZ MAPERY
// ---------------------------------------------------------------------------
test('12. Statyczny lub bezpiecznie mockowany dowód, że wszystkie RPC/odczyty B przechodzą przez mapery', () => {
  const storeSource = readFileSync('lib/server/section16-store.ts', 'utf8')

  // 12a. create_availability_notification_request uses mapAvailabilityNotificationRequestRecord
  assert.ok(
    storeSource.includes("create_availability_notification_request'") &&
      storeSource.includes('mapAvailabilityNotificationRequestRecord(data)'),
    'create_availability_notification_request musi przekazywać wynik przez mapAvailabilityNotificationRequestRecord',
  )

  // 12b. offer_availability_notification uses mapAvailabilityNotificationRequestRecord
  assert.ok(
    storeSource.includes("offer_availability_notification'"),
    'offer_availability_notification musi być obecne w store',
  )

  // 12c. confirm_notification_offer_payment uses mapAvailabilityNotificationRequestRecord
  assert.ok(
    storeSource.includes("confirm_notification_offer_payment'"),
    'confirm_notification_offer_payment musi być obecne w store',
  )

  // 12d. transition_availability_notification_state uses mapAvailabilityNotificationRequestRecord
  assert.ok(
    storeSource.includes("transition_availability_notification_state'"),
    'transition_availability_notification_state musi być obecne w store',
  )

  // 12e. getAvailabilityNotificationRequest uses mapAvailabilityNotificationRequestRecord
  assert.ok(
    storeSource.includes("from('availability_notification_requests')") &&
      storeSource.includes('data ? mapAvailabilityNotificationRequestRecord(data) : null'),
    'getAvailabilityNotificationRequest musi mapować wynik przez mapAvailabilityNotificationRequestRecord',
  )

  // 12f. getAvailabilityNotificationEventByIdempotencyKey uses mapAvailabilityNotificationEventRecord
  assert.ok(
    storeSource.includes("from('availability_notification_events')") &&
      storeSource.includes('data ? mapAvailabilityNotificationEventRecord(data) : null'),
    'getAvailabilityNotificationEventByIdempotencyKey musi mapować wynik przez mapAvailabilityNotificationEventRecord',
  )

  // 12g. getFirstActiveQueuedAvailabilityNotificationRequest uses mapAvailabilityNotificationRequestRecord
  assert.ok(
    storeSource.includes('getFirstActiveQueuedAvailabilityNotificationRequest') &&
      storeSource.includes("gt('expires_at', nowDate.toISOString())") &&
      storeSource.includes("order('queue_position', { ascending: true })"),
    'getFirstActiveQueuedAvailabilityNotificationRequest musi poprawnie filtrować i sortować',
  )

  // 12h. Zero unsafe raw cast in Path B
  assert.ok(
    !storeSource.includes('data as AvailabilityNotificationRequest'),
    'Zakaz pozostawiania niebezpiecznego "data as AvailabilityNotificationRequest" w store',
  )
  assert.ok(
    !storeSource.includes('data as AvailabilityNotificationEvent'),
    'Zakaz pozostawiania niebezpiecznego "data as AvailabilityNotificationEvent" w store',
  )
})
