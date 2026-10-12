import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createLocalDataSandbox } from '../scripts/lib/local-data-sandbox'
import {
  createAvailabilityNotificationRequest,
  getAvailabilityNotificationRequest,
  offerAvailabilityNotification,
  confirmNotificationOfferPayment,
  transitionAvailabilityNotificationState,
  mapConsultationTalkEntitlementRecord,
  mapConsultationTalkEntitlementEventRecord,
  mapRpcError,
  resetSection16LocalStore,
  readSection16StoreSnapshot,
  updateSection16StoreSnapshot,
} from '../lib/server/section16-store'
import {
  grantTalkEntitlementForPaidAvailability,
  createPaidTalkEntitlementDescriptor,
  validateGrantActionId,
  validateAllocatedSeconds,
  validateValidForMinutes,
  CANONICAL_UUID_V4_REGEX,
  MIN_TALK_ENTITLEMENT_ALLOCATED_SECONDS,
  MAX_TALK_ENTITLEMENT_ALLOCATED_SECONDS,
  MIN_TALK_ENTITLEMENT_VALIDITY_MINUTES,
  MAX_TALK_ENTITLEMENT_VALIDITY_MINUTES,
  DisabledOwnerTalkNotificationAdapter,
  DisabledClientTalkNotificationAdapter,
  DisabledCallBridgeInitiationAdapter,
  DEFAULT_PAID_ENTITLEMENT_FLOW_BOUNDARIES,
  PaidEntitlementFlowIntegrationBoundaries,
} from '../lib/server/section16-paid-entitlement-flow'
import {
  Section16DomainError,
  Section16NotFoundError,
  Section16TerminalStateError,
  Section16PaymentRequiredError,
  Section16HoldExpiredError,
  Section16IdempotencyConflictError,
  Section16ValidationError,
  Section16InvalidIdempotencyKeyError,
  Section16EntitlementAlreadyExistsError,
} from '../lib/server/section16-types'

let sandbox: Awaited<ReturnType<typeof createLocalDataSandbox>> | null = null

test.before(async () => {
  sandbox = await createLocalDataSandbox('section16-paid-entitlement-flow')
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

// Helper to set up a paid availability notification request
async function setupPaidAvailabilityRequest(options?: {
  phone?: string
  paymentReference?: string
  now?: Date
  offerExpiresMinutes?: number
}) {
  const baseNow = options?.now ?? new Date('2026-10-12T10:00:00.000Z')
  const phone = options?.phone ?? '+48600123456'
  const paymentReference = options?.paymentReference ?? 'rev:paid_avail_001'
  const offerMinutes = options?.offerExpiresMinutes ?? 15

  const req = await createAvailabilityNotificationRequest(
    {
      rawPhone: phone,
      clientName: 'Jan Testowy',
      idempotencyKey: `setup-create-${Math.random().toString(36).substring(2, 9)}`,
    },
    baseNow,
  )

  const offerExpiresAt = new Date(baseNow.getTime() + offerMinutes * 60 * 1000).toISOString()
  await offerAvailabilityNotification(
    {
      requestId: req.id,
      expectedVersion: req.version,
      offerExpiresAt,
      idempotencyKey: `setup-offer-${Math.random().toString(36).substring(2, 9)}`,
    },
    baseNow,
  )

  const paidAtDate = new Date(baseNow.getTime() + 5 * 60 * 1000)
  const paid = await confirmNotificationOfferPayment(
    {
      requestId: req.id,
      expectedVersion: 2,
      paymentReference,
      idempotencyKey: `setup-pay-${Math.random().toString(36).substring(2, 9)}`,
    },
    paidAtDate,
  )

  return { req: paid, phone, paymentReference, baseNow, paidAtDate }
}

// ---------------------------------------------------------------------------
// 1. POPRAWNY GRANT Z ACCEPTED_PAID I DANE WYPROWADZONE WYŁĄCZNIE ZE ŹRÓDŁA
// ---------------------------------------------------------------------------
test('1. Poprawny grant z accepted_paid i dane wyprowadzone wyłącznie ze źródła', async () => {
  const { req, paymentReference } = await setupPaidAvailabilityRequest()
  const grantNow = new Date('2026-10-12T10:10:00.000Z')
  const actionId = 'a1b2c3d4-e5f6-4a1b-8c2d-e3f4a5b6c701'
  const idempotencyKey = 'grant-paid-001'
  const allocatedSeconds = 900
  const validForMinutes = 60

  const result = await grantTalkEntitlementForPaidAvailability({
    notificationRequestId: req.id,
    idempotencyKey,
    actionId,
    allocatedSeconds,
    validForMinutes,
    now: grantNow,
  })

  // Assert return shape
  assert.equal(result.isRetry, false)
  assert.ok(result.entitlement)
  assert.ok(result.descriptor)

  // Assert entitlement fields derived exclusively from source
  const ent = result.entitlement
  assert.equal(ent.notificationRequestId, req.id)
  assert.equal(ent.callerPhoneFingerprint, req.callerPhoneFingerprint)
  assert.equal(ent.callerPhoneMasked, req.callerPhoneMasked)
  assert.equal(ent.paymentReference, paymentReference)
  assert.equal(ent.bookingId, req.bookingId ?? null)
  assert.equal(ent.state, 'active')
  assert.equal(ent.allocatedSeconds, 900)
  assert.equal(ent.version, 1)
  assert.equal(ent.validFrom, grantNow.toISOString())
  assert.equal(ent.validUntil, new Date(grantNow.getTime() + 60 * 60 * 1000).toISOString())
  assert.equal(ent.idempotencyKey, idempotencyKey)
  assert.equal(ent.consumedAt, null)
  assert.equal(ent.consumedCallSessionId, null)

  // Assert exactly 1 event recorded
  const snapshot = await readSection16StoreSnapshot()
  assert.equal(snapshot.talkEntitlements.length, 1)
  assert.equal(snapshot.talkEvents.length, 1)
  const event = snapshot.talkEvents[0]
  assert.equal(event.entitlementId, ent.id)
  assert.equal(event.eventType, 'entitlement_created')
  assert.equal(event.fromState, null)
  assert.equal(event.toState, 'active')
  assert.equal(event.idempotencyKey, idempotencyKey)
})

// ---------------------------------------------------------------------------
// 2. ODRZUCENIE QUEUED, OFFER_SENT, EXPIRED, CANCELLED, CONSUMED ORAZ BŁĘDNYCH METADANYCH PŁATNOŚCI
// ---------------------------------------------------------------------------
test('2. Odrzucenie queued, offer_sent, expired, cancelled, consumed oraz błędnych metadanych płatności', async () => {
  const now = new Date('2026-10-12T10:00:00.000Z')
  const actionId = 'b2c3d4e5-f6a1-4b2c-9d3e-f4a5b6c7d802'

  // A. Queued state rejection
  const queuedReq = await createAvailabilityNotificationRequest(
    {
      rawPhone: '+48600111222',
      idempotencyKey: 'state-check-queued-req',
    },
    now,
  )

  await assert.rejects(
    () =>
      grantTalkEntitlementForPaidAvailability({
        notificationRequestId: queuedReq.id,
        idempotencyKey: 'grant-on-queued',
        actionId,
        allocatedSeconds: 900,
        validForMinutes: 60,
        now,
      }),
    Section16PaymentRequiredError,
  )

  // B. Offer_sent state rejection
  await offerAvailabilityNotification(
    {
      requestId: queuedReq.id,
      expectedVersion: 1,
      offerExpiresAt: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
      idempotencyKey: 'state-check-offer-sent-req',
    },
    now,
  )

  await assert.rejects(
    () =>
      grantTalkEntitlementForPaidAvailability({
        notificationRequestId: queuedReq.id,
        idempotencyKey: 'grant-on-offer-sent',
        actionId,
        allocatedSeconds: 900,
        validForMinutes: 60,
        now,
      }),
    Section16PaymentRequiredError,
  )

  // C. Expired state rejection
  const expReq = await createAvailabilityNotificationRequest(
    {
      rawPhone: '+48600111333',
      idempotencyKey: 'state-check-exp-req',
    },
    now,
  )
  await transitionAvailabilityNotificationState(
    {
      requestId: expReq.id,
      targetState: 'expired',
      expectedVersion: 1,
      idempotencyKey: 'state-check-trans-exp',
    },
    now,
  )

  await assert.rejects(
    () =>
      grantTalkEntitlementForPaidAvailability({
        notificationRequestId: expReq.id,
        idempotencyKey: 'grant-on-expired',
        actionId,
        allocatedSeconds: 900,
        validForMinutes: 60,
        now,
      }),
    Section16TerminalStateError,
  )

  // D. Cancelled state rejection
  const cancReq = await createAvailabilityNotificationRequest(
    {
      rawPhone: '+48600111444',
      idempotencyKey: 'state-check-canc-req',
    },
    now,
  )
  await transitionAvailabilityNotificationState(
    {
      requestId: cancReq.id,
      targetState: 'cancelled',
      expectedVersion: 1,
      idempotencyKey: 'state-check-trans-canc',
    },
    now,
  )

  await assert.rejects(
    () =>
      grantTalkEntitlementForPaidAvailability({
        notificationRequestId: cancReq.id,
        idempotencyKey: 'grant-on-cancelled',
        actionId,
        allocatedSeconds: 900,
        validForMinutes: 60,
        now,
      }),
    Section16TerminalStateError,
  )

  // E. Consumed state rejection
  const { req: paidReq } = await setupPaidAvailabilityRequest({
    phone: '+48600111555',
    now,
  })
  await transitionAvailabilityNotificationState(
    {
      requestId: paidReq.id,
      targetState: 'consumed',
      expectedVersion: paidReq.version,
      idempotencyKey: 'state-check-trans-consumed',
    },
    now,
  )

  await assert.rejects(
    () =>
      grantTalkEntitlementForPaidAvailability({
        notificationRequestId: paidReq.id,
        idempotencyKey: 'grant-on-consumed',
        actionId,
        allocatedSeconds: 900,
        validForMinutes: 60,
        now,
      }),
    Section16TerminalStateError,
  )

  // F. Missing paymentReference in accepted_paid record
  const { req: corruptPayReq } = await setupPaidAvailabilityRequest({
    phone: '+48600111666',
    now,
  })
  await updateSection16StoreSnapshot((store) => {
    const item = store.notificationRequests.find((r) => r.id === corruptPayReq.id)
    if (item) {
      item.paymentReference = null
    }
  })
  await assert.rejects(
    () =>
      grantTalkEntitlementForPaidAvailability({
        notificationRequestId: corruptPayReq.id,
        idempotencyKey: 'grant-corrupt-pay-ref',
        actionId,
        allocatedSeconds: 900,
        validForMinutes: 60,
        now,
      }),
    Section16PaymentRequiredError,
  )

  // G. Missing acceptedAt in accepted_paid record
  const { req: corruptAcceptedReq } = await setupPaidAvailabilityRequest({
    phone: '+48600111777',
    now,
  })
  await updateSection16StoreSnapshot((store) => {
    const item = store.notificationRequests.find((r) => r.id === corruptAcceptedReq.id)
    if (item) {
      item.acceptedAt = null
    }
  })
  await assert.rejects(
    () =>
      grantTalkEntitlementForPaidAvailability({
        notificationRequestId: corruptAcceptedReq.id,
        idempotencyKey: 'grant-corrupt-accepted-at',
        actionId,
        allocatedSeconds: 900,
        validForMinutes: 60,
        now,
      }),
    Section16PaymentRequiredError,
  )

  // H. acceptedAt > offerExpiresAt
  const { req: lateReq } = await setupPaidAvailabilityRequest({
    phone: '+48600111888',
    now,
  })
  await updateSection16StoreSnapshot((store) => {
    const item = store.notificationRequests.find((r) => r.id === lateReq.id)
    if (item && item.offerExpiresAt) {
      // Force acceptedAt after offerExpiresAt
      item.acceptedAt = new Date(Date.parse(item.offerExpiresAt) + 60 * 1000).toISOString()
    }
  })
  await assert.rejects(
    () =>
      grantTalkEntitlementForPaidAvailability({
        notificationRequestId: lateReq.id,
        idempotencyKey: 'grant-late-accepted-at',
        actionId,
        allocatedSeconds: 900,
        validForMinutes: 60,
        now,
      }),
    Section16HoldExpiredError,
  )
})

// ---------------------------------------------------------------------------
// 3. WYMAGANE I OGRANICZONE ALLOCATEDSECONDS / VALIDFORMINUTES; UUID V4 ACTIONID
// ---------------------------------------------------------------------------
test('3. Wymagane i ograniczone allocatedSeconds / validForMinutes; UUID v4 actionId', async () => {
  const { req } = await setupPaidAvailabilityRequest()
  const validActionId = 'c3d4e5f6-a1b2-4c3d-8e4f-5a6b7c8d9e03'
  const now = new Date('2026-10-12T10:00:00.000Z')

  // A. actionId validation
  for (const badActionId of [
    '',
    'not-a-uuid',
    'c3d4e5f6-a1b2-1c3d-8e4f-5a6b7c8d9e03', // v1
    'C3D4E5F6-A1B2-4C3D-8E4F-5A6B7C8D9E03', // uppercase
    'c3d4e5f6-a1b2-4c3d-0e4f-5a6b7c8d9e03', // invalid variant
    null as unknown as string,
    undefined as unknown as string,
  ]) {
    await assert.rejects(
      () =>
        grantTalkEntitlementForPaidAvailability({
          notificationRequestId: req.id,
          idempotencyKey: `bad-action-${Math.random().toString(36).substring(2, 9)}`,
          actionId: badActionId,
          allocatedSeconds: 900,
          validForMinutes: 60,
          now,
        }),
      Section16ValidationError,
    )
  }

  // B. allocatedSeconds bounds & validation (60-7200)
  for (const badAllocated of [
    undefined as unknown as number,
    null as unknown as number,
    0,
    -1,
    59, // below min
    7201, // above max
    900.5, // non-integer
    NaN,
    Infinity,
    '900' as unknown as number,
  ]) {
    await assert.rejects(
      () =>
        grantTalkEntitlementForPaidAvailability({
          notificationRequestId: req.id,
          idempotencyKey: `bad-allocated-${Math.random().toString(36).substring(2, 9)}`,
          actionId: validActionId,
          allocatedSeconds: badAllocated,
          validForMinutes: 60,
          now,
        }),
      Section16ValidationError,
    )
  }

  // C. validForMinutes bounds & validation (5-2880)
  for (const badValid of [
    undefined as unknown as number,
    null as unknown as number,
    0,
    -5,
    4, // below min
    2881, // above max (48h + 1m)
    60.5, // non-integer
    NaN,
    Infinity,
    '60' as unknown as number,
  ]) {
    await assert.rejects(
      () =>
        grantTalkEntitlementForPaidAvailability({
          notificationRequestId: req.id,
          idempotencyKey: `bad-valid-${Math.random().toString(36).substring(2, 9)}`,
          actionId: validActionId,
          allocatedSeconds: 900,
          validForMinutes: badValid,
          now,
        }),
      Section16ValidationError,
    )
  }

  // D. Boundary values: 60s and 7200s, 5m and 2880m are accepted
  assert.equal(validateAllocatedSeconds(MIN_TALK_ENTITLEMENT_ALLOCATED_SECONDS), 60)
  assert.equal(validateAllocatedSeconds(MAX_TALK_ENTITLEMENT_ALLOCATED_SECONDS), 7200)
  assert.equal(validateValidForMinutes(MIN_TALK_ENTITLEMENT_VALIDITY_MINUTES), 5)
  assert.equal(validateValidForMinutes(MAX_TALK_ENTITLEMENT_VALIDITY_MINUTES), 2880)
})

// ---------------------------------------------------------------------------
// 4. EXACT RETRY PO VALIDUNTIL: TEN SAM REKORD/OKNO, ZERO EVENTU
// ---------------------------------------------------------------------------
test('4. Exact retry po validUntil: ten sam rekord/okno, zero eventu', async () => {
  const { req } = await setupPaidAvailabilityRequest()
  const grantNow = new Date('2026-10-12T10:00:00.000Z')
  const actionId = 'd4e5f6a1-b2c3-4d4e-9f5a-6b7c8d9e0f04'
  const idempotencyKey = 'retry-post-expiry-001'
  const allocatedSeconds = 900
  const validForMinutes = 60 // expires at 11:00

  // 1st call at 10:00
  const firstResult = await grantTalkEntitlementForPaidAvailability({
    notificationRequestId: req.id,
    idempotencyKey,
    actionId,
    allocatedSeconds,
    validForMinutes,
    now: grantNow,
  })

  assert.equal(firstResult.isRetry, false)
  const initialValidUntil = firstResult.entitlement.validUntil
  const initialValidFrom = firstResult.entitlement.validFrom

  // Verify initial event count
  const snap1 = await readSection16StoreSnapshot()
  assert.equal(snap1.talkEvents.length, 1)

  // 2nd call at 13:00 (2 hours AFTER validUntil expired)
  const afterExpiryNow = new Date('2026-10-12T13:00:00.000Z')
  const retryResult = await grantTalkEntitlementForPaidAvailability({
    notificationRequestId: req.id,
    idempotencyKey,
    actionId,
    allocatedSeconds,
    validForMinutes,
    now: afterExpiryNow,
  })

  // Must return exact same entitlement and window without extension
  assert.equal(retryResult.isRetry, true)
  assert.equal(retryResult.entitlement.id, firstResult.entitlement.id)
  assert.equal(retryResult.entitlement.validFrom, initialValidFrom)
  assert.equal(retryResult.entitlement.validUntil, initialValidUntil)
  assert.equal(retryResult.descriptor.validFrom, initialValidFrom)
  assert.equal(retryResult.descriptor.validUntil, initialValidUntil)

  // Must NOT have created any new events
  const snap2 = await readSection16StoreSnapshot()
  assert.equal(snap2.talkEvents.length, 1)
})

// ---------------------------------------------------------------------------
// 5. KONFLIKTY TEGO SAMEGO KLUCZA PRZY ZMIANIE WSZYSTKICH ELEMENTÓW IDENTITY
// ---------------------------------------------------------------------------
test('5. Konflikty tego samego klucza przy zmianie wszystkich elementów identity', async () => {
  const { req: req1 } = await setupPaidAvailabilityRequest({ phone: '+48600111001' })
  const { req: req2 } = await setupPaidAvailabilityRequest({ phone: '+48600111002' })
  const now = new Date('2026-10-12T10:00:00.000Z')
  const actionId1 = 'e5f6a1b2-c3d4-4e5f-af6b-7c8d9e0f1a05'
  const actionId2 = 'f6a1b2c3-d4e5-4f6a-bf7c-8d9e0f1a2b06'
  const idempotencyKey = 'conflict-identity-key'

  // Initial successful grant
  await grantTalkEntitlementForPaidAvailability({
    notificationRequestId: req1.id,
    idempotencyKey,
    actionId: actionId1,
    allocatedSeconds: 900,
    validForMinutes: 60,
    now,
    payload: { note: 'initial' },
  })

  // A. Same key, different actionId -> IDEMPOTENCY_CONFLICT
  await assert.rejects(
    () =>
      grantTalkEntitlementForPaidAvailability({
        notificationRequestId: req1.id,
        idempotencyKey,
        actionId: actionId2, // Changed!
        allocatedSeconds: 900,
        validForMinutes: 60,
        now,
        payload: { note: 'initial' },
      }),
    Section16IdempotencyConflictError,
  )

  // B. Same key, different allocatedSeconds -> IDEMPOTENCY_CONFLICT
  await assert.rejects(
    () =>
      grantTalkEntitlementForPaidAvailability({
        notificationRequestId: req1.id,
        idempotencyKey,
        actionId: actionId1,
        allocatedSeconds: 1200, // Changed!
        validForMinutes: 60,
        now,
        payload: { note: 'initial' },
      }),
    Section16IdempotencyConflictError,
  )

  // C. Same key, different validForMinutes -> IDEMPOTENCY_CONFLICT
  await assert.rejects(
    () =>
      grantTalkEntitlementForPaidAvailability({
        notificationRequestId: req1.id,
        idempotencyKey,
        actionId: actionId1,
        allocatedSeconds: 900,
        validForMinutes: 120, // Changed!
        now,
        payload: { note: 'initial' },
      }),
    Section16IdempotencyConflictError,
  )

  // D. Same key, different notificationRequestId -> IDEMPOTENCY_CONFLICT
  await assert.rejects(
    () =>
      grantTalkEntitlementForPaidAvailability({
        notificationRequestId: req2.id, // Changed!
        idempotencyKey,
        actionId: actionId1,
        allocatedSeconds: 900,
        validForMinutes: 60,
        now,
        payload: { note: 'initial' },
      }),
    Section16IdempotencyConflictError,
  )

  // E. Same key, different client payload -> IDEMPOTENCY_CONFLICT
  await assert.rejects(
    () =>
      grantTalkEntitlementForPaidAvailability({
        notificationRequestId: req1.id,
        idempotencyKey,
        actionId: actionId1,
        allocatedSeconds: 900,
        validForMinutes: 60,
        now,
        payload: { note: 'modified' }, // Changed!
      }),
    Section16IdempotencyConflictError,
  )
})

// ---------------------------------------------------------------------------
// 6. DWA RÓŻNE KLUCZE DLA TEGO SAMEGO NOTIFICATIONREQUESTID -> DOKŁADNIE JEDEN ENTITLEMENT I ENTITLEMENT_ALREADY_EXISTS
// ---------------------------------------------------------------------------
test('6. Dwa różne klucze dla tego samego notificationRequestId -> dokładnie jeden entitlement i ENTITLEMENT_ALREADY_EXISTS', async () => {
  const { req } = await setupPaidAvailabilityRequest()
  const now = new Date('2026-10-12T10:00:00.000Z')
  const actionId1 = 'a1b2c3d4-e5f6-4a1b-8c2d-e3f4a5b6c701'
  const actionId2 = 'b2c3d4e5-f6a1-4b2c-9d3e-f4a5b6c7d802'

  // 1st grant with key1 -> SUCCESS
  const res1 = await grantTalkEntitlementForPaidAvailability({
    notificationRequestId: req.id,
    idempotencyKey: 'key-grant-first',
    actionId: actionId1,
    allocatedSeconds: 900,
    validForMinutes: 60,
    now,
  })
  assert.equal(res1.isRetry, false)
  assert.ok(res1.entitlement.id)

  // 2nd grant with DIFFERENT key2 for the SAME notificationRequestId -> REJECTED
  await assert.rejects(
    () =>
      grantTalkEntitlementForPaidAvailability({
        notificationRequestId: req.id,
        idempotencyKey: 'key-grant-second-different',
        actionId: actionId2,
        allocatedSeconds: 900,
        validForMinutes: 60,
        now,
      }),
    (err: unknown) => {
      assert.ok(err instanceof Section16EntitlementAlreadyExistsError)
      assert.equal(err.code, 'ENTITLEMENT_ALREADY_EXISTS')
      assert.ok(err.message.includes(req.id))
      return true
    },
  )

  // Ensure store has exactly 1 entitlement and 1 event
  const snapshot = await readSection16StoreSnapshot()
  assert.equal(snapshot.talkEntitlements.length, 1)
  assert.equal(snapshot.talkEvents.length, 1)
})

// ---------------------------------------------------------------------------
// 7. RÓWNOLEGŁE GRANTY -> DOKŁADNIE JEDEN SUKCES/JEDEN KONTROLOWANY KONFLIKT, ZERO DUPLIKATU
// ---------------------------------------------------------------------------
test('7. Równoległe granty -> dokładnie jeden sukces/jeden kontrolowany konflikt, zero duplikatu', async () => {
  const { req } = await setupPaidAvailabilityRequest()
  const now = new Date('2026-10-12T10:00:00.000Z')

  const results = await Promise.allSettled([
    grantTalkEntitlementForPaidAvailability({
      notificationRequestId: req.id,
      idempotencyKey: 'parallel-key-alpha',
      actionId: 'a1b2c3d4-e5f6-4a1b-8c2d-e3f4a5b6c701',
      allocatedSeconds: 900,
      validForMinutes: 60,
      now,
    }),
    grantTalkEntitlementForPaidAvailability({
      notificationRequestId: req.id,
      idempotencyKey: 'parallel-key-beta',
      actionId: 'b2c3d4e5-f6a1-4b2c-9d3e-f4a5b6c7d802',
      allocatedSeconds: 900,
      validForMinutes: 60,
      now,
    }),
  ])

  const fulfilled = results.filter((r) => r.status === 'fulfilled')
  const rejected = results.filter((r) => r.status === 'rejected')

  assert.equal(fulfilled.length, 1, 'Dokładnie jedno równoległe żądanie musi zakończyć się sukcesem')
  assert.equal(rejected.length, 1, 'Dokładnie jedno równoległe żądanie musi zostać odrzucone')

  const rejectionReason = (rejected[0] as PromiseRejectedResult).reason
  assert.ok(
    rejectionReason instanceof Section16EntitlementAlreadyExistsError ||
      rejectionReason?.code === 'ENTITLEMENT_ALREADY_EXISTS',
    'Błąd odrzucenia musi być ENTITLEMENT_ALREADY_EXISTS',
  )

  // Store has exactly 1 entitlement and 1 event
  const snapshot = await readSection16StoreSnapshot()
  assert.equal(snapshot.talkEntitlements.length, 1)
  assert.equal(snapshot.talkEvents.length, 1)
})

// ---------------------------------------------------------------------------
// 8. DESCRIPTOR BEZ PII/PSEUDODANYCH/PAYMENTREFERENCE/IDEMPOTENCY KEY
// ---------------------------------------------------------------------------
test('8. Descriptor bez PII/pseudodanych/paymentReference/idempotency key', async () => {
  const { req } = await setupPaidAvailabilityRequest()
  const now = new Date('2026-10-12T10:00:00.000Z')
  const actionId = 'c3d4e5f6-a1b2-4c3d-8e4f-5a6b7c8d9e03'

  const { descriptor } = await grantTalkEntitlementForPaidAvailability({
    notificationRequestId: req.id,
    idempotencyKey: 'descriptor-pii-check-key',
    actionId,
    allocatedSeconds: 900,
    validForMinutes: 60,
    now,
  })

  // Check exact keys allowed
  const allowedKeys = new Set([
    'entitlementId',
    'notificationRequestId',
    'state',
    'allocatedSeconds',
    'validFrom',
    'validUntil',
    'actionId',
  ])

  const actualKeys = Object.keys(descriptor)
  for (const k of actualKeys) {
    assert.ok(allowedKeys.has(k), `Niedozwolony klucz w descriptorze: ${k}`)
  }
  assert.equal(actualKeys.length, allowedKeys.size)

  // Strictly assert no sensitive or contact data
  const rawDescriptor = descriptor as unknown as Record<string, unknown>
  assert.equal(rawDescriptor.phone, undefined)
  assert.equal(rawDescriptor.callerPhone, undefined)
  assert.equal(rawDescriptor.callerPhoneFingerprint, undefined)
  assert.equal(rawDescriptor.callerPhoneMasked, undefined)
  assert.equal(rawDescriptor.rawPhone, undefined)
  assert.equal(rawDescriptor.paymentReference, undefined)
  assert.equal(rawDescriptor.bookingId, undefined)
  assert.equal(rawDescriptor.idempotencyKey, undefined)
  assert.equal(rawDescriptor.clientName, undefined)
  assert.equal(rawDescriptor.contactCiphertext, undefined)

  // Assert expected values
  assert.equal(descriptor.notificationRequestId, req.id)
  assert.equal(descriptor.actionId, actionId)
  assert.equal(descriptor.state, 'active')
  assert.equal(descriptor.allocatedSeconds, 900)
  assert.equal(descriptor.validFrom, now.toISOString())
  assert.equal(descriptor.validUntil, new Date(now.getTime() + 60 * 60 * 1000).toISOString())
})

// ---------------------------------------------------------------------------
// 9. ZERO WYWOŁAŃ ADAPTERÓW (FAIL-CLOSED BOUNDARIES)
// ---------------------------------------------------------------------------
test('9. Zero wywołań adapterów (fail-closed boundaries)', async () => {
  const { req } = await setupPaidAvailabilityRequest()
  const now = new Date('2026-10-12T10:00:00.000Z')
  const actionId = 'd4e5f6a1-b2c3-4d4e-9f5a-6b7c8d9e0f04'

  let ownerCallCount = 0
  let clientCallCount = 0
  let bridgeCallCount = 0

  const mockBoundaries: PaidEntitlementFlowIntegrationBoundaries = {
    ownerNotification: {
      dispatchOwnerTalkNotification: async () => {
        ownerCallCount++
      },
    },
    clientNotification: {
      dispatchClientTalkNotification: async () => {
        clientCallCount++
      },
    },
    callBridge: {
      initiateCallBridge: async () => {
        bridgeCallCount++
      },
    },
  }

  await grantTalkEntitlementForPaidAvailability(
    {
      notificationRequestId: req.id,
      idempotencyKey: 'adapter-spy-key',
      actionId,
      allocatedSeconds: 900,
      validForMinutes: 60,
      now,
    },
    mockBoundaries,
  )

  // Spies strictly confirm 0 calls
  assert.equal(ownerCallCount, 0, 'Powiadomienie właściciela nie może być wywołane podczas grantowania')
  assert.equal(clientCallCount, 0, 'Powiadomienie klienta nie może być wywołane podczas grantowania')
  assert.equal(bridgeCallCount, 0, 'Call bridge nie może być wywołany podczas grantowania')

  // Verify disabled adapters fail-closed if invoked directly
  const disabledOwner = new DisabledOwnerTalkNotificationAdapter()
  await assert.rejects(() => disabledOwner.dispatchOwnerTalkNotification(), Section16DomainError)

  const disabledClient = new DisabledClientTalkNotificationAdapter()
  await assert.rejects(
    () =>
      disabledClient.dispatchClientTalkNotification({
        entitlementId: 'e-1',
        notificationRequestId: 'n-1',
        state: 'active',
        allocatedSeconds: 900,
        validFrom: now.toISOString(),
        validUntil: now.toISOString(),
        actionId,
      }),
    Section16DomainError,
  )

  const disabledBridge = new DisabledCallBridgeInitiationAdapter()
  await assert.rejects(
    () =>
      disabledBridge.initiateCallBridge({
        entitlementId: 'e-1',
        notificationRequestId: 'n-1',
        state: 'active',
        allocatedSeconds: 900,
        validFrom: now.toISOString(),
        validUntil: now.toISOString(),
        actionId,
      }),
    Section16DomainError,
  )
})

// ---------------------------------------------------------------------------
// 10. MAPERY SUPABASE REQUEST/EVENT I ICH NEGATYWNE PRZYPADKI
// ---------------------------------------------------------------------------
test('10. Mapery Supabase request/event i ich negatywne przypadki', () => {
  const validEntitlementRow = {
    id: 'a0000000-0000-0000-0000-000000000001',
    caller_phone_fingerprint: 'a'.repeat(64),
    caller_phone_masked: '+48 600 *** 001',
    booking_id: 'b0000000-0000-0000-0000-000000000001',
    payment_reference: 'rev:pay_valid_001',
    urgent_request_id: null,
    notification_request_id: 'c0000000-0000-0000-0000-000000000001',
    allocated_seconds: 900,
    valid_from: '2026-10-12T10:00:00.000Z',
    valid_until: '2026-10-12T11:00:00.000Z',
    state: 'active',
    consumed_at: null,
    consumed_call_session_id: null,
    version: 1,
    idempotency_key: 'map-ent-test-key-1',
    created_at: '2026-10-12T10:00:00.000Z',
    updated_at: '2026-10-12T10:00:00.000Z',
  }

  // A. Success mapping
  const mappedEnt = mapConsultationTalkEntitlementRecord(validEntitlementRow)
  assert.equal(mappedEnt.id, validEntitlementRow.id)
  assert.equal(mappedEnt.callerPhoneFingerprint, validEntitlementRow.caller_phone_fingerprint)
  assert.equal(mappedEnt.callerPhoneMasked, validEntitlementRow.caller_phone_masked)
  assert.equal(mappedEnt.bookingId, validEntitlementRow.booking_id)
  assert.equal(mappedEnt.paymentReference, validEntitlementRow.payment_reference)
  assert.equal(mappedEnt.urgentRequestId, null)
  assert.equal(mappedEnt.notificationRequestId, validEntitlementRow.notification_request_id)
  assert.equal(mappedEnt.allocatedSeconds, 900)
  assert.equal(mappedEnt.state, 'active')
  assert.equal(mappedEnt.version, 1)

  // B. Negative entitlement mapping cases
  assert.throws(() => mapConsultationTalkEntitlementRecord(null), Section16ValidationError)
  assert.throws(() => mapConsultationTalkEntitlementRecord([]), Section16ValidationError)
  assert.throws(() => mapConsultationTalkEntitlementRecord({ ...validEntitlementRow, id: 'bad-uuid' }), Section16ValidationError)
  assert.throws(() => mapConsultationTalkEntitlementRecord({ ...validEntitlementRow, caller_phone_fingerprint: '' }), Section16ValidationError)
  assert.throws(() => mapConsultationTalkEntitlementRecord({ ...validEntitlementRow, caller_phone_masked: '' }), Section16ValidationError)
  assert.throws(() => mapConsultationTalkEntitlementRecord({ ...validEntitlementRow, payment_reference: '   ' }), Section16ValidationError)
  assert.throws(
    () =>
      mapConsultationTalkEntitlementRecord({
        ...validEntitlementRow,
        booking_id: null,
        urgent_request_id: null,
        notification_request_id: null,
      }),
    Section16ValidationError,
  )
  assert.throws(() => mapConsultationTalkEntitlementRecord({ ...validEntitlementRow, allocated_seconds: 0 }), Section16ValidationError)
  assert.throws(() => mapConsultationTalkEntitlementRecord({ ...validEntitlementRow, allocated_seconds: -10 }), Section16ValidationError)
  assert.throws(() => mapConsultationTalkEntitlementRecord({ ...validEntitlementRow, allocated_seconds: 900.5 }), Section16ValidationError)
  assert.throws(() => mapConsultationTalkEntitlementRecord({ ...validEntitlementRow, valid_from: 'bad-date' }), Section16ValidationError)
  assert.throws(() => mapConsultationTalkEntitlementRecord({ ...validEntitlementRow, valid_until: 'bad-date' }), Section16ValidationError)
  // validUntil <= validFrom
  assert.throws(
    () =>
      mapConsultationTalkEntitlementRecord({
        ...validEntitlementRow,
        valid_from: '2026-10-12T12:00:00.000Z',
        valid_until: '2026-10-12T11:00:00.000Z',
      }),
    Section16ValidationError,
  )
  assert.throws(() => mapConsultationTalkEntitlementRecord({ ...validEntitlementRow, state: 'invalid_state' }), Section16ValidationError)
  // State consumed without consumed_at / consumed_call_session_id
  assert.throws(
    () =>
      mapConsultationTalkEntitlementRecord({
        ...validEntitlementRow,
        state: 'consumed',
        consumed_at: null,
        consumed_call_session_id: null,
      }),
    Section16ValidationError,
  )
  assert.throws(() => mapConsultationTalkEntitlementRecord({ ...validEntitlementRow, version: 0 }), Section16ValidationError)
  assert.throws(() => mapConsultationTalkEntitlementRecord({ ...validEntitlementRow, idempotency_key: '' }), Section16ValidationError)
  assert.throws(() => mapConsultationTalkEntitlementRecord({ ...validEntitlementRow, created_at: 'bad-date' }), Section16ValidationError)
  assert.throws(() => mapConsultationTalkEntitlementRecord({ ...validEntitlementRow, updated_at: 'bad-date' }), Section16ValidationError)

  // C. Event mapper
  const validEventRow = {
    id: 'e0000000-0000-0000-0000-000000000001',
    entitlement_id: 'a0000000-0000-0000-0000-000000000001',
    event_type: 'entitlement_created',
    from_state: null,
    to_state: 'active',
    payload: { actionType: 'test' },
    payload_hash: 'h'.repeat(64),
    idempotency_key: 'map-event-key-1',
    created_at: '2026-10-12T10:00:00.000Z',
  }

  const mappedEvent = mapConsultationTalkEntitlementEventRecord(validEventRow)
  assert.equal(mappedEvent.id, validEventRow.id)
  assert.equal(mappedEvent.entitlementId, validEventRow.entitlement_id)
  assert.equal(mappedEvent.eventType, 'entitlement_created')
  assert.equal(mappedEvent.fromState, null)
  assert.equal(mappedEvent.toState, 'active')
  assert.equal(mappedEvent.payloadHash, validEventRow.payload_hash)
  assert.equal(mappedEvent.idempotencyKey, validEventRow.idempotency_key)

  // Negative event mapper cases
  assert.throws(() => mapConsultationTalkEntitlementEventRecord(null), Section16ValidationError)
  assert.throws(() => mapConsultationTalkEntitlementEventRecord({ ...validEventRow, id: 'bad-uuid' }), Section16ValidationError)
  assert.throws(() => mapConsultationTalkEntitlementEventRecord({ ...validEventRow, entitlement_id: 'bad-uuid' }), Section16ValidationError)
  assert.throws(() => mapConsultationTalkEntitlementEventRecord({ ...validEventRow, event_type: '' }), Section16ValidationError)
  assert.throws(() => mapConsultationTalkEntitlementEventRecord({ ...validEventRow, to_state: 'invalid_to_state' }), Section16ValidationError)
  assert.throws(() => mapConsultationTalkEntitlementEventRecord({ ...validEventRow, payload: null }), Section16ValidationError)
  assert.throws(() => mapConsultationTalkEntitlementEventRecord({ ...validEventRow, payload_hash: '' }), Section16ValidationError)
  assert.throws(() => mapConsultationTalkEntitlementEventRecord({ ...validEventRow, idempotency_key: '' }), Section16ValidationError)
  assert.throws(() => mapConsultationTalkEntitlementEventRecord({ ...validEventRow, created_at: 'bad-date' }), Section16ValidationError)
})

// ---------------------------------------------------------------------------
// 11. STATYCZNY AUDYT MIGRACJI, CANONICAL SCHEMA, ACL I UŻYCIA MAPPERÓW
// ---------------------------------------------------------------------------
test('11. Statyczny audyt migracji, canonical schema, ACL i użycia mapperów', () => {
  const migPath = 'supabase/migrations/20261011007_section16_single_entitlement_for_paid_source.sql'
  const schemaPath = 'supabase/schema.sql'
  const storePath = 'lib/server/section16-store.ts'

  const migSql = readFileSync(migPath, 'utf8')
  const schemaSql = readFileSync(schemaPath, 'utf8')
  const storeCode = readFileSync(storePath, 'utf8')

  // A. Migration contains partial unique index on notification_request_id
  assert.ok(
    migSql.includes(
      'create unique index if not exists consultation_talk_entitlements_notification_request_id_idx',
    ),
    'Migracja musi definiować unique index na consultation_talk_entitlements',
  )
  assert.ok(
    migSql.includes('where notification_request_id is not null'),
    'Indeks unikalności musi mieć klauzulę where notification_request_id is not null',
  )

  // B. Canonical schema contains identical partial unique index
  assert.ok(
    schemaSql.includes(
      'create unique index if not exists consultation_talk_entitlements_notification_request_id_idx',
    ),
    'Canonical schema.sql musi zawierać unique index na consultation_talk_entitlements',
  )

  // C. RPC create_talk_entitlement hardening in migration and schema
  for (const [name, sql] of [
    ['migracja', migSql],
    ['schema', schemaSql],
  ] as const) {
    assert.ok(
      sql.includes('for update'),
      `${name} musi blokować wiersz źródła klauzulą for update`,
    )
    assert.ok(
      sql.includes('ENTITLEMENT_ALREADY_EXISTS'),
      `${name} musi rzucać błąd ENTITLEMENT_ALREADY_EXISTS przy istniejącym uprawnieniu`,
    )
    assert.ok(
      sql.includes('security definer'),
      `${name} create_talk_entitlement musi być security definer`,
    )
    assert.ok(
      sql.includes('set search_path = public, pg_temp'),
      `${name} create_talk_entitlement musi mieć bezpieczny search_path`,
    )
    assert.ok(
      sql.includes(
        'revoke all on function public.create_talk_entitlement(uuid, text, text, text, uuid, uuid, uuid, integer, timestamptz, timestamptz, text, jsonb, text) from public, anon, authenticated;',
      ),
      `${name} musi odbierać uprawnienia public, anon, authenticated do create_talk_entitlement`,
    )
    assert.ok(
      sql.includes(
        'grant execute on function public.create_talk_entitlement(uuid, text, text, text, uuid, uuid, uuid, integer, timestamptz, timestamptz, text, jsonb, text) to service_role;',
      ),
      `${name} musi nadawać execute tylko dla service_role`,
    )
  }

  // D. Store uses runtime mappers without unsafe casts
  assert.ok(
    storeCode.includes('mapConsultationTalkEntitlementRecord(data)'),
    'section16-store musi używać mapConsultationTalkEntitlementRecord na wynikach Supabase',
  )
  assert.ok(
    storeCode.includes('mapConsultationTalkEntitlementEventRecord(data)'),
    'section16-store musi używać mapConsultationTalkEntitlementEventRecord na wynikach zdarzeń',
  )

  // Check no raw unsafe 'data as ConsultationTalkEntitlement' casts remain in store
  assert.equal(
    storeCode.includes('data as ConsultationTalkEntitlement'),
    false,
    'section16-store nie może zawierać niebezpiecznego rzutowania "data as ConsultationTalkEntitlement"',
  )

  // E. mapRpcError covers ENTITLEMENT_ALREADY_EXISTS, ENTITLEMENT_NOT_YET_VALID, MISSING_SESSION_ID
  assert.throws(
    () => mapRpcError(new Error('ENTITLEMENT_ALREADY_EXISTS: Duplikat')),
    Section16EntitlementAlreadyExistsError,
  )
  assert.throws(
    () => mapRpcError(new Error('ENTITLEMENT_NOT_YET_VALID: Zbyt wcześnie')),
    Section16ValidationError,
  )
  assert.throws(
    () => mapRpcError(new Error('MISSING_SESSION_ID: Brak sesji')),
    Section16ValidationError,
  )
})
