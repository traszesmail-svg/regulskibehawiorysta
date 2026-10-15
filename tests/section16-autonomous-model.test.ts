import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  createUrgentIntakeRequest,
  proposeUrgentIntakeTimeslot,
  confirmUrgentIntakePayment,
  transitionUrgentIntakeState,
  getUrgentIntakeRequest,
  createAvailabilityNotificationRequest,
  offerAvailabilityNotification,
  confirmNotificationOfferPayment,
  transitionAvailabilityNotificationState,
  getAvailabilityNotificationRequest,
  createTalkEntitlement,
  consumeTalkEntitlement,
  revokeTalkEntitlement,
  getTalkEntitlement,
  resetSection16LocalStore,
  readSection16StoreSnapshot,
} from '../lib/server/section16-store'
import {
  resolveWarsawIntakeTargetDate,
  validateWarsawIntakeTargetDate,
  validateContactCiphertextContract,
  validateIdempotencyKey,
  getWarsawDateDetails,
  computeCallerPhoneFingerprint,
  computeCallerPhoneMasked,
} from '../lib/server/section16-policy'
import {
  Section16IdempotencyConflictError,
  Section16ConcurrencyError,
  Section16TransitionError,
  Section16TerminalStateError,
  Section16HoldExpiredError,
  Section16InvalidTimezoneError,
  Section16PaymentRequiredError,
  Section16PrivacyError,
  Section16InvalidIdempotencyKeyError,
  Section16ValidationError,
  Section16NotFoundError,
  isValidUrgentIntakeTransition,
  isValidAvailabilityNotificationTransition,
  isValidTalkEntitlementTransition,
} from '../lib/server/section16-types'
import {
  createAvailabilitySlot,
  createPendingBooking,
  markBookingPaid,
  resetAvailabilityLocalStore,
} from '../lib/server/local-store'
import { createLocalDataSandbox } from '../scripts/lib/local-data-sandbox'
import { getSupabaseSchemaAudit } from '../scripts/lib/schema-audit'

let sandbox: Awaited<ReturnType<typeof createLocalDataSandbox>> | null = null

test.before(async () => {
  sandbox = await createLocalDataSandbox('section16-autonomous')
  process.env.APP_DATA_MODE = 'local'
  process.env.CALL_SESSION_PHONE_SECRET = 'test-secret-with-at-least-16-chars'
  await resetSection16LocalStore()
  await resetAvailabilityLocalStore()
})

test.beforeEach(async () => {
  process.env.APP_DATA_MODE = 'local'
  process.env.CALL_SESSION_PHONE_SECRET = 'test-secret-with-at-least-16-chars'
  await resetSection16LocalStore()
  await resetAvailabilityLocalStore()
})

test.after(async () => {
  await resetSection16LocalStore()
  await resetAvailabilityLocalStore()
  if (sandbox) {
    await sandbox.cleanup()
  }
})

// ============================================================================
// 1. TIMEZONE & DATE CALCULATIONS (Europe/Warsaw)
// ============================================================================

test('Europe/Warsaw timezone: correctly calculates today and tomorrow dates', () => {
  const fixedUtc = new Date('2026-10-11T23:30:00Z') // 01:30 Warsaw next day (2026-10-12)
  const warsawDetails = getWarsawDateDetails(fixedUtc)
  assert.equal(warsawDetails.date, '2026-10-12')
  assert.equal(warsawDetails.time, '01:30')

  const todayDate = resolveWarsawIntakeTargetDate('today', fixedUtc)
  assert.equal(todayDate, '2026-10-12')

  const tomorrowDate = resolveWarsawIntakeTargetDate('tomorrow', fixedUtc)
  assert.equal(tomorrowDate, '2026-10-13')

  assert.doesNotThrow(() => {
    validateWarsawIntakeTargetDate('today', '2026-10-12', fixedUtc)
    validateWarsawIntakeTargetDate('tomorrow', '2026-10-13', fixedUtc)
  })

  assert.throws(
    () => validateWarsawIntakeTargetDate('today', '2026-10-11', fixedUtc),
    Section16InvalidTimezoneError,
  )
  assert.throws(
    () => validateWarsawIntakeTargetDate('tomorrow', '2026-10-14', fixedUtc),
    Section16InvalidTimezoneError,
  )
})

// ============================================================================
// 2. PRIVACY & CONTACT CIPHERTEXT CONTRACT
// ============================================================================

test('Privacy: strips rawPhone, derives HMAC fingerprint & masked phone, no raw phone in record', async () => {
  const raw = '+48 600 123 456'
  const expectedFingerprint = computeCallerPhoneFingerprint(raw)
  const expectedMasked = computeCallerPhoneMasked(raw)

  const created = await createUrgentIntakeRequest({
    dayChoice: 'today',
    rawPhone: raw,
    clientName: 'Jan Kowalski',
    idempotencyKey: 'test-privacy-raw-phone-key-1',
  })

  assert.equal(created.callerPhoneFingerprint, expectedFingerprint)
  assert.equal(created.callerPhoneMasked, expectedMasked)
  assert.equal((created as any).rawPhone, undefined)
  assert.equal((created as any).phone, undefined)

  // Assert that raw phone is not in serialized snapshot
  const fetched = await getUrgentIntakeRequest(created.id)
  assert.ok(fetched)
  const serialized = JSON.stringify(fetched)
  assert.equal(serialized.includes('600123456'), false)
  assert.equal(serialized.includes('600 123 456'), false)
})

test('Privacy: contactCiphertext contract enforces non-plaintext encrypted format', () => {
  assert.doesNotThrow(() => {
    validateContactCiphertextContract(null)
    validateContactCiphertextContract(undefined)
    validateContactCiphertextContract('enc:f0a8b92c4d6e810a9b2c3d4e5f')
  })

  // Too short (< 16 chars)
  assert.throws(
    () => validateContactCiphertextContract('enc:short'),
    Section16PrivacyError,
  )

  // Missing "enc:" prefix
  assert.throws(
    () => validateContactCiphertextContract('raw_text_without_prefix_123456'),
    Section16PrivacyError,
  )

  // Plain phone embedded in ciphertext contract
  assert.throws(
    () => validateContactCiphertextContract('enc:+48600123456000000'),
    Section16PrivacyError,
  )

  // Plain email embedded in ciphertext contract
  assert.throws(
    () => validateContactCiphertextContract('enc:klient@example.com_blob'),
    Section16PrivacyError,
  )
})

// ============================================================================
// 3. PATH A: URGENT INTAKE REQUESTS & STATE MACHINE
// ============================================================================

test('Path A: valid lifecycle (create -> propose timeslot -> confirm payment)', async () => {
  const now = new Date('2026-10-11T10:00:00Z')
  const intake = await createUrgentIntakeRequest(
    {
      dayChoice: 'today',
      rawPhone: '+48 600 111 222',
      clientName: 'Anna Nowak',
      clientNotes: 'Pies nagle stał się agresywny przy misce',
      idempotencyKey: 'intake-valid-lifecycle-step1',
    },
    now,
  )

  assert.equal(intake.state, 'pending_proposal')
  assert.equal(intake.dayChoice, 'today')
  assert.equal(intake.version, 1)
  assert.equal(intake.bookingId, null)
  assert.equal(intake.paymentReference, null)

  // Propose timeslot
  await createAvailabilitySlot(intake.targetDate, '15:30', undefined, now)
  const proposed = await proposeUrgentIntakeTimeslot(
    {
      requestId: intake.id,
      expectedVersion: 1,
      proposedDate: intake.targetDate,
      proposedTime: '15:30',
      holdExpiresAt: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
      idempotencyKey: 'intake-valid-lifecycle-step2',
    },
    now,
  )

  assert.equal(proposed.state, 'timeslot_proposed')
  assert.equal(proposed.proposedDate, intake.targetDate)
  assert.equal(proposed.proposedTime, '15:30')
  assert.equal(proposed.version, 2)
  assert.equal(proposed.bookingId, null) // Strictly NO booking before payment!

  // Confirm payment
  const bookingUuid = 'b0000000-0000-0000-0000-000000000001'
  const confirmed = await confirmUrgentIntakePayment(
    {
      requestId: intake.id,
      expectedVersion: 2,
      paymentReference: 'revolut:tx_1234567890abcdef',
      bookingId: bookingUuid,
      idempotencyKey: 'intake-valid-lifecycle-step3',
    },
    now,
  )

  assert.equal(confirmed.state, 'payment_confirmed')
  assert.equal(confirmed.version, 3)
  assert.equal(confirmed.paymentReference, 'revolut:tx_1234567890abcdef')
  assert.equal(confirmed.bookingId, bookingUuid)
})

test('Path A: cannot confirm payment directly from pending_proposal without proposed timeslot', async () => {
  const now = new Date('2026-10-11T10:00:00Z')
  const intake = await createUrgentIntakeRequest(
    {
      dayChoice: 'today',
      rawPhone: '+48 600 111 222',
      idempotencyKey: 'intake-direct-pay-key',
    },
    now,
  )

  await assert.rejects(
    () =>
      confirmUrgentIntakePayment(
        {
          requestId: intake.id,
          expectedVersion: 1,
          paymentReference: 'revolut:tx_direct_test',
          idempotencyKey: 'intake-direct-pay-attempt',
        },
        now,
      ),
    Section16TransitionError,
  )
})

test('Path A: timeslot hold expiration prevents payment confirmation', async () => {
  const now = new Date('2026-10-11T10:00:00Z')
  const intake = await createUrgentIntakeRequest(
    {
      dayChoice: 'today',
      rawPhone: '+48 600 111 222',
      idempotencyKey: 'intake-hold-exp-key1',
    },
    now,
  )

  const holdExpiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString() // +15 min
  await createAvailabilitySlot(intake.targetDate, '14:00', undefined, now)
  await proposeUrgentIntakeTimeslot(
    {
      requestId: intake.id,
      expectedVersion: 1,
      proposedDate: intake.targetDate,
      proposedTime: '14:00',
      holdExpiresAt,
      idempotencyKey: 'intake-hold-exp-key2',
    },
    now,
  )

  // Attempt payment after hold expiration (+16 min)
  const afterHold = new Date(now.getTime() + 16 * 60 * 1000)
  await assert.rejects(
    () =>
      confirmUrgentIntakePayment(
        {
          requestId: intake.id,
          expectedVersion: 2,
          paymentReference: 'tx_late_payment',
          idempotencyKey: 'intake-hold-exp-key3',
        },
        afterHold,
      ),
    Section16HoldExpiredError,
  )

  // Verify state is NOT mutated by rejected operation (PostgreSQL parity: rollback on exception)
  const updated = await getUrgentIntakeRequest(intake.id)
  assert.equal(updated?.state, 'timeslot_proposed')
  assert.equal(updated?.version, 2)
})

test('Path A: CAS version mismatch rejects transition', async () => {
  const now = new Date('2026-10-11T10:00:00Z')
  const intake = await createUrgentIntakeRequest(
    {
      dayChoice: 'today',
      rawPhone: '+48 600 111 222',
      idempotencyKey: 'intake-cas-key1',
    },
    now,
  )

  await assert.rejects(
    () =>
      proposeUrgentIntakeTimeslot(
        {
          requestId: intake.id,
          expectedVersion: 99, // Wrong version! Current is 1
          proposedDate: intake.targetDate,
          proposedTime: '14:00',
          idempotencyKey: 'intake-cas-key2',
        },
        now,
      ),
    Section16ConcurrencyError,
  )
})

test('Path A: idempotency returns same record on exact match and rejects conflicting payload', async () => {
  const now = new Date('2026-10-11T10:00:00Z')
  const key = 'intake-idempotency-dedup-key'

  const first = await createUrgentIntakeRequest(
    {
      dayChoice: 'today',
      rawPhone: '+48 600 111 222',
      clientName: 'Jan',
      idempotencyKey: key,
      payload: { meta: 'safe_info' },
    },
    now,
  )

  // Same key + same payload -> idempotent return
  const duplicate = await createUrgentIntakeRequest(
    {
      dayChoice: 'today',
      rawPhone: '+48 600 111 222',
      clientName: 'Jan',
      idempotencyKey: key,
      payload: { meta: 'safe_info' },
    },
    now,
  )

  assert.equal(first.id, duplicate.id)
  assert.equal(first.createdAt, duplicate.createdAt)

  // Same key + different payload -> conflict error!
  await assert.rejects(
    () =>
      createUrgentIntakeRequest(
        {
          dayChoice: 'today',
          rawPhone: '+48 600 111 222',
          clientName: 'Inne Imie',
          idempotencyKey: key,
          payload: { meta: 'different_payload_here' },
        },
        now,
      ),
    Section16IdempotencyConflictError,
  )
})

test('Path A: terminal state rejection and allowed cancellation/rejection', async () => {
  const now = new Date('2026-10-11T10:00:00Z')
  const intake = await createUrgentIntakeRequest(
    {
      dayChoice: 'tomorrow',
      rawPhone: '+48 600 111 222',
      idempotencyKey: 'intake-terminal-test-key1',
    },
    now,
  )

  // Rejection from pending_proposal is valid
  const rejected = await transitionUrgentIntakeState(
    {
      requestId: intake.id,
      targetState: 'rejected',
      expectedVersion: 1,
      reason: 'Brak wolnych mocy przerobowych',
      idempotencyKey: 'intake-terminal-test-key2',
    },
    now,
  )

  assert.equal(rejected.state, 'rejected')
  assert.equal(rejected.version, 2)

  // Cannot propose timeslot or change state from rejected (terminal)
  await assert.rejects(
    () =>
      proposeUrgentIntakeTimeslot(
        {
          requestId: intake.id,
          expectedVersion: 2,
          proposedDate: intake.targetDate,
          proposedTime: '10:00',
          idempotencyKey: 'intake-terminal-test-key3',
        },
        now,
      ),
    Section16TerminalStateError,
  )
})

// ============================================================================
// 4. PATH B: AVAILABILITY NOTIFICATIONS & QUEUE
// ============================================================================

test('Path B: valid lifecycle (queued -> offer_sent -> accepted_paid -> consumed)', async () => {
  const now = new Date('2026-10-11T12:00:00Z')

  const req1 = await createAvailabilityNotificationRequest(
    {
      rawPhone: '+48 600 222 333',
      clientName: 'Piotr',
      idempotencyKey: 'notif-valid-queue-1',
    },
    now,
  )
  assert.equal(req1.state, 'queued')
  assert.equal(req1.queuePosition, 1)
  assert.equal(req1.bookingId, null)

  const req2 = await createAvailabilityNotificationRequest(
    {
      rawPhone: '+48 600 444 555',
      clientName: 'Marta',
      idempotencyKey: 'notif-valid-queue-2',
    },
    now,
  )
  assert.equal(req2.state, 'queued')
  assert.equal(req2.queuePosition, 2) // Incremental order preserved

  // Offer sent to req1
  const offerExpiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString()
  const offered = await offerAvailabilityNotification(
    {
      requestId: req1.id,
      expectedVersion: 1,
      offerExpiresAt,
      idempotencyKey: 'notif-valid-offer-1',
    },
    now,
  )
  assert.equal(offered.state, 'offer_sent')
  assert.equal(offered.version, 2)
  assert.equal(offered.offerExpiresAt, offerExpiresAt)
  assert.equal(offered.bookingId, null)

  // Confirm payment
  const bookingUuid = 'b0000000-0000-0000-0000-000000000002'
  const accepted = await confirmNotificationOfferPayment(
    {
      requestId: req1.id,
      expectedVersion: 2,
      paymentReference: 'revolut:tx_avail_notif_999',
      bookingId: bookingUuid,
      idempotencyKey: 'notif-valid-paid-1',
    },
    now,
  )
  assert.equal(accepted.state, 'accepted_paid')
  assert.equal(accepted.version, 3)
  assert.equal(accepted.paymentReference, 'revolut:tx_avail_notif_999')
  assert.equal(accepted.bookingId, bookingUuid)

  // Mark consumed
  const consumed = await transitionAvailabilityNotificationState(
    {
      requestId: req1.id,
      targetState: 'consumed',
      expectedVersion: 3,
      idempotencyKey: 'notif-valid-consumed-1',
    },
    now,
  )
  assert.equal(consumed.state, 'consumed')
  assert.equal(consumed.version, 4)
})

test('Path B: offer expiration rejects late payment without mutation', async () => {
  const now = new Date('2026-10-11T12:00:00Z')
  const req = await createAvailabilityNotificationRequest(
    {
      rawPhone: '+48 600 222 333',
      idempotencyKey: 'notif-exp-key1',
    },
    now,
  )

  const offerExpiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString()
  await offerAvailabilityNotification(
    {
      requestId: req.id,
      expectedVersion: 1,
      offerExpiresAt,
      idempotencyKey: 'notif-exp-key2',
    },
    now,
  )

  // Attempt payment after 16 minutes
  const afterOffer = new Date(now.getTime() + 16 * 60 * 1000)
  await assert.rejects(
    () =>
      confirmNotificationOfferPayment(
        {
          requestId: req.id,
          expectedVersion: 2,
          paymentReference: 'tx_too_late',
          idempotencyKey: 'notif-exp-key3',
        },
        afterOffer,
      ),
    Section16HoldExpiredError,
  )

  // Verify state is NOT mutated by rejected operation (PostgreSQL parity: rollback on exception)
  const updated = await getAvailabilityNotificationRequest(req.id)
  assert.equal(updated?.state, 'offer_sent')
  assert.equal(updated?.version, 2)
})

test('Path B: cannot mark consumed directly from queued or offer_sent', async () => {
  const now = new Date('2026-10-11T12:00:00Z')
  const req = await createAvailabilityNotificationRequest(
    {
      rawPhone: '+48 600 222 333',
      idempotencyKey: 'notif-illegal-consumed-key1',
    },
    now,
  )

  await assert.rejects(
    () =>
      transitionAvailabilityNotificationState(
        {
          requestId: req.id,
          targetState: 'consumed',
          expectedVersion: 1,
          idempotencyKey: 'notif-illegal-consumed-key2',
        },
        now,
      ),
    Section16TransitionError,
  )
})

// ============================================================================
// 5. TIMED TALK ENTITLEMENTS
// ============================================================================

test('Talk Entitlements: cannot create entitlement without payment confirmation', async () => {
  const now = new Date('2026-10-11T12:00:00Z')

  await assert.rejects(
    () =>
      createTalkEntitlement(
        {
          rawPhone: '+48 600 777 888',
          paymentReference: '', // Empty payment reference!
          validFrom: now.toISOString(),
          validUntil: new Date(now.getTime() + 24 * 3600 * 1000).toISOString(),
          idempotencyKey: 'entitlement-no-pay-key',
        },
        now,
      ),
    Section16PaymentRequiredError,
  )
})

test('Talk Entitlements: valid lifecycle (create active -> consume with callSessionId)', async () => {
  const now = new Date('2026-10-11T12:00:00Z')
  const validUntil = new Date(now.getTime() + 48 * 3600 * 1000).toISOString()
  const callSessionUuid = 'c0000000-0000-0000-0000-000000000001'
  const phone = '+48 600 777 888'
  const payRef = 'revolut:tx_talk_ent_001'

  // Authoritative paid urgent intake source
  const urg = await createUrgentIntakeRequest(
    {
      dayChoice: 'today',
      rawPhone: phone,
      idempotencyKey: 'ent-life-urg-req1',
    },
    now,
  )
  const targetDate = resolveWarsawIntakeTargetDate('today', now)
  await createAvailabilitySlot(targetDate, '14:00', undefined, now)
  await proposeUrgentIntakeTimeslot(
    {
      requestId: urg.id,
      proposedDate: targetDate,
      proposedTime: '14:00',
      proposedTimeslotIso: new Date(now.getTime() + 2 * 3600 * 1000).toISOString(),
      holdExpiresAt: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
      idempotencyKey: 'ent-life-urg-prop1',
    },
    now,
  )
  await confirmUrgentIntakePayment(
    {
      requestId: urg.id,
      paymentReference: payRef,
      idempotencyKey: 'ent-life-urg-pay1',
    },
    now,
  )

  const entitlement = await createTalkEntitlement(
    {
      rawPhone: phone,
      paymentReference: payRef,
      urgentRequestId: urg.id,
      validFrom: now.toISOString(),
      validUntil,
      allocatedSeconds: 900,
      idempotencyKey: 'ent-lifecycle-key1',
    },
    now,
  )

  assert.equal(entitlement.state, 'active')
  assert.equal(entitlement.allocatedSeconds, 900)
  assert.equal(entitlement.version, 1)
  assert.equal(entitlement.urgentRequestId, urg.id)

  // Consume entitlement with session ID
  const consumed = await consumeTalkEntitlement(
    {
      entitlementId: entitlement.id,
      callSessionId: callSessionUuid,
      expectedVersion: 1,
      idempotencyKey: 'ent-lifecycle-key2',
    },
    new Date(now.getTime() + 10 * 60 * 1000), // 10 min into window
  )

  assert.equal(consumed.state, 'consumed')
  assert.equal(consumed.consumedCallSessionId, callSessionUuid)
  assert.equal(consumed.version, 2)
  assert.ok(consumed.consumedAt)

  // Cannot consume again (terminal)
  await assert.rejects(
    () =>
      consumeTalkEntitlement(
        {
          entitlementId: entitlement.id,
          callSessionId: 'c0000000-0000-0000-0000-000000000002',
          expectedVersion: 2,
          idempotencyKey: 'ent-lifecycle-key3',
        },
        new Date(now.getTime() + 20 * 60 * 1000),
      ),
    Section16TransitionError,
  )
})

test('Talk Entitlements: consumption after validUntil is rejected without mutation', async () => {
  const now = new Date('2026-10-11T12:00:00Z')
  const validUntil = new Date(now.getTime() + 2 * 3600 * 1000).toISOString() // 2h window
  const phone = '+48 600 777 888'
  const payRef = 'revolut:tx_talk_ent_exp'

  // Authoritative paid urgent intake source
  const urg = await createUrgentIntakeRequest(
    {
      dayChoice: 'today',
      rawPhone: phone,
      idempotencyKey: 'ent-exp-urg-req1',
    },
    now,
  )
  const targetDate = resolveWarsawIntakeTargetDate('today', now)
  await createAvailabilitySlot(targetDate, '14:00', undefined, now)
  await proposeUrgentIntakeTimeslot(
    {
      requestId: urg.id,
      proposedDate: targetDate,
      proposedTime: '14:00',
      proposedTimeslotIso: new Date(now.getTime() + 2 * 3600 * 1000).toISOString(),
      holdExpiresAt: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
      idempotencyKey: 'ent-exp-urg-prop1',
    },
    now,
  )
  await confirmUrgentIntakePayment(
    {
      requestId: urg.id,
      paymentReference: payRef,
      idempotencyKey: 'ent-exp-urg-pay1',
    },
    now,
  )

  const entitlement = await createTalkEntitlement(
    {
      rawPhone: phone,
      paymentReference: payRef,
      urgentRequestId: urg.id,
      validFrom: now.toISOString(),
      validUntil,
      idempotencyKey: 'ent-exp-key1',
    },
    now,
  )

  // Attempt to consume at +3h
  const afterExpiry = new Date(now.getTime() + 3 * 3600 * 1000)
  await assert.rejects(
    () =>
      consumeTalkEntitlement(
        {
          entitlementId: entitlement.id,
          callSessionId: 'c0000000-0000-0000-0000-000000000001',
          expectedVersion: 1,
          idempotencyKey: 'ent-exp-key2',
        },
        afterExpiry,
      ),
    Section16HoldExpiredError,
  )

  // Verify state is NOT mutated by rejected operation (PostgreSQL parity: rollback on exception)
  const updated = await getTalkEntitlement(entitlement.id)
  assert.equal(updated?.state, 'active')
  assert.equal(updated?.version, 1)
})

test('Talk Entitlements: revocation transitions active to revoked', async () => {
  const now = new Date('2026-10-11T12:00:00Z')
  const phone = '+48 600 777 888'
  const payRef = 'revolut:tx_talk_ent_rev'

  // Authoritative paid urgent intake source
  const urg = await createUrgentIntakeRequest(
    {
      dayChoice: 'today',
      rawPhone: phone,
      idempotencyKey: 'ent-rev-urg-req1',
    },
    now,
  )
  const targetDate = resolveWarsawIntakeTargetDate('today', now)
  await createAvailabilitySlot(targetDate, '14:00', undefined, now)
  await proposeUrgentIntakeTimeslot(
    {
      requestId: urg.id,
      proposedDate: targetDate,
      proposedTime: '14:00',
      proposedTimeslotIso: new Date(now.getTime() + 2 * 3600 * 1000).toISOString(),
      holdExpiresAt: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
      idempotencyKey: 'ent-rev-urg-prop1',
    },
    now,
  )
  await confirmUrgentIntakePayment(
    {
      requestId: urg.id,
      paymentReference: payRef,
      idempotencyKey: 'ent-rev-urg-pay1',
    },
    now,
  )

  const entitlement = await createTalkEntitlement(
    {
      rawPhone: phone,
      paymentReference: payRef,
      urgentRequestId: urg.id,
      validFrom: now.toISOString(),
      validUntil: new Date(now.getTime() + 24 * 3600 * 1000).toISOString(),
      idempotencyKey: 'ent-rev-key1',
    },
    now,
  )

  const revoked = await revokeTalkEntitlement(
    {
      entitlementId: entitlement.id,
      expectedVersion: 1,
      reason: 'Zwrot opłaty na wniosek klienta',
      idempotencyKey: 'ent-rev-key2',
    },
    now,
  )

  assert.equal(revoked.state, 'revoked')
  assert.equal(revoked.version, 2)
})

// ============================================================================
// 6. STATIC SCHEMA AUDIT & TRANSITIONS INTEGRITY
// ============================================================================

test('Static schema audit: migrations 20261011005, 20261011006 and canonical markers are fully satisfied', () => {
  const audit = getSupabaseSchemaAudit()
  assert.equal(audit.ok, true, audit.summary)
  assert.equal(audit.missingFiles.length, 0)
  assert.equal(audit.missingMarkers.length, 0)
})

test('Transition tables: state machine matrix integrity', () => {
  // Urgent Intake
  assert.equal(isValidUrgentIntakeTransition('pending_proposal', 'timeslot_proposed'), true)
  assert.equal(isValidUrgentIntakeTransition('timeslot_proposed', 'payment_confirmed'), true)
  assert.equal(isValidUrgentIntakeTransition('pending_proposal', 'payment_confirmed'), false)
  assert.equal(isValidUrgentIntakeTransition('payment_confirmed', 'pending_proposal'), false)

  // Availability Notification
  assert.equal(isValidAvailabilityNotificationTransition('queued', 'offer_sent'), true)
  assert.equal(isValidAvailabilityNotificationTransition('offer_sent', 'accepted_paid'), true)
  assert.equal(isValidAvailabilityNotificationTransition('accepted_paid', 'consumed'), true)
  assert.equal(isValidAvailabilityNotificationTransition('queued', 'accepted_paid'), false)
  assert.equal(isValidAvailabilityNotificationTransition('consumed', 'queued'), false)

  // Talk Entitlements
  assert.equal(isValidTalkEntitlementTransition('active', 'consumed'), true)
  assert.equal(isValidTalkEntitlementTransition('active', 'revoked'), true)
  assert.equal(isValidTalkEntitlementTransition('active', 'expired'), true)
  assert.equal(isValidTalkEntitlementTransition('consumed', 'active'), false)
})

// ============================================================================
// 7. MANDATORY IDEMPOTENCY KEY ENFORCEMENT & UNCONDITIONAL AUDIT EVENTS
// ============================================================================

test('Idempotency: all 11 mutation functions reject missing, empty, whitespace, and oversized keys fail-closed', async () => {
  const now = new Date('2026-10-11T12:00:00Z')
  const invalidKeys = [undefined as any, '', '   ', 'k'.repeat(129)]

  // 1. createUrgentIntakeRequest
  for (const badKey of invalidKeys) {
    await assert.rejects(
      () =>
        createUrgentIntakeRequest(
          {
            dayChoice: 'today',
            rawPhone: '+48 600 111 222',
            idempotencyKey: badKey,
          },
          now,
        ),
      Section16InvalidIdempotencyKeyError,
    )
  }

  // Setup valid urgent request for following mutations
  const urgReq = await createUrgentIntakeRequest(
    {
      dayChoice: 'today',
      rawPhone: '+48 600 111 222',
      idempotencyKey: 'idemp-test-urg-base',
    },
    now,
  )

  // 2. proposeUrgentIntakeTimeslot
  await createAvailabilitySlot(urgReq.targetDate, '15:00', undefined, now)
  for (const badKey of invalidKeys) {
    await assert.rejects(
      () =>
        proposeUrgentIntakeTimeslot(
          {
            requestId: urgReq.id,
            proposedDate: resolveWarsawIntakeTargetDate('today', now),
            proposedTime: '15:00',
            proposedTimeslotIso: new Date(now.getTime() + 2 * 3600 * 1000).toISOString(),
            holdExpiresAt: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
            idempotencyKey: badKey,
          },
          now,
        ),
      Section16InvalidIdempotencyKeyError,
    )
  }

  const proposedUrg = await proposeUrgentIntakeTimeslot(
    {
      requestId: urgReq.id,
      proposedDate: resolveWarsawIntakeTargetDate('today', now),
      proposedTime: '15:00',
      proposedTimeslotIso: new Date(now.getTime() + 2 * 3600 * 1000).toISOString(),
      holdExpiresAt: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
      idempotencyKey: 'idemp-test-urg-prop-base',
    },
    now,
  )

  // 3. confirmUrgentIntakePayment
  for (const badKey of invalidKeys) {
    await assert.rejects(
      () =>
        confirmUrgentIntakePayment(
          {
            requestId: proposedUrg.id,
            paymentReference: 'tx_pay_idemp_test',
            idempotencyKey: badKey,
          },
          now,
        ),
      Section16InvalidIdempotencyKeyError,
    )
  }

  // 4. transitionUrgentIntakeState (test on fresh request)
  const urgToCancel = await createUrgentIntakeRequest(
    {
      dayChoice: 'today',
      rawPhone: '+48 600 111 222',
      idempotencyKey: 'idemp-test-urg-cancel-base',
    },
    now,
  )
  for (const badKey of invalidKeys) {
    await assert.rejects(
      () =>
        transitionUrgentIntakeState(
          {
            requestId: urgToCancel.id,
            targetState: 'cancelled',
            expectedVersion: 1,
            idempotencyKey: badKey,
          },
          now,
        ),
      Section16InvalidIdempotencyKeyError,
    )
  }

  // 5. createAvailabilityNotificationRequest
  for (const badKey of invalidKeys) {
    await assert.rejects(
      () =>
        createAvailabilityNotificationRequest(
          {
            rawPhone: '+48 600 333 444',
            idempotencyKey: badKey,
          },
          now,
        ),
      Section16InvalidIdempotencyKeyError,
    )
  }

  const notifReq = await createAvailabilityNotificationRequest(
    {
      rawPhone: '+48 600 333 444',
      idempotencyKey: 'idemp-test-notif-base',
    },
    now,
  )

  // 6. offerAvailabilityNotification
  for (const badKey of invalidKeys) {
    await assert.rejects(
      () =>
        offerAvailabilityNotification(
          {
            requestId: notifReq.id,
            offerExpiresAt: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
            idempotencyKey: badKey,
          },
          now,
        ),
      Section16InvalidIdempotencyKeyError,
    )
  }

  const offeredNotif = await offerAvailabilityNotification(
    {
      requestId: notifReq.id,
      offerExpiresAt: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
      idempotencyKey: 'idemp-test-notif-offer-base',
    },
    now,
  )

  // 7. confirmNotificationOfferPayment
  for (const badKey of invalidKeys) {
    await assert.rejects(
      () =>
        confirmNotificationOfferPayment(
          {
            requestId: offeredNotif.id,
            paymentReference: 'tx_pay_notif_test',
            idempotencyKey: badKey,
          },
          now,
        ),
      Section16InvalidIdempotencyKeyError,
    )
  }

  // 8. transitionAvailabilityNotificationState (test on fresh request)
  const notifToCancel = await createAvailabilityNotificationRequest(
    {
      rawPhone: '+48 600 333 444',
      idempotencyKey: 'idemp-test-notif-cancel-base',
    },
    now,
  )
  for (const badKey of invalidKeys) {
    await assert.rejects(
      () =>
        transitionAvailabilityNotificationState(
          {
            requestId: notifToCancel.id,
            targetState: 'cancelled',
            expectedVersion: 1,
            idempotencyKey: badKey,
          },
          now,
        ),
      Section16InvalidIdempotencyKeyError,
    )
  }

  // Setup paid urgent request for talk entitlement tests
  const paidUrg = await confirmUrgentIntakePayment(
    {
      requestId: proposedUrg.id,
      paymentReference: 'tx_pay_idemp_test',
      idempotencyKey: 'idemp-test-urg-pay-confirmed',
    },
    now,
  )

  // 9. createTalkEntitlement
  for (const badKey of invalidKeys) {
    await assert.rejects(
      () =>
        createTalkEntitlement(
          {
            rawPhone: '+48 600 111 222',
            paymentReference: 'tx_pay_idemp_test',
            urgentRequestId: paidUrg.id,
            validFrom: now.toISOString(),
            validUntil: new Date(now.getTime() + 24 * 3600 * 1000).toISOString(),
            idempotencyKey: badKey,
          },
          now,
        ),
      Section16InvalidIdempotencyKeyError,
    )
  }

  const ent = await createTalkEntitlement(
    {
      rawPhone: '+48 600 111 222',
      paymentReference: 'tx_pay_idemp_test',
      urgentRequestId: paidUrg.id,
      validFrom: now.toISOString(),
      validUntil: new Date(now.getTime() + 24 * 3600 * 1000).toISOString(),
      idempotencyKey: 'idemp-test-ent-base',
    },
    now,
  )

  // 10. consumeTalkEntitlement
  for (const badKey of invalidKeys) {
    await assert.rejects(
      () =>
        consumeTalkEntitlement(
          {
            entitlementId: ent.id,
            callSessionId: 'c0000000-0000-0000-0000-000000000010',
            idempotencyKey: badKey,
          },
          now,
        ),
      Section16InvalidIdempotencyKeyError,
    )
  }

  // 11. revokeTalkEntitlement (test on fresh entitlement)
  const freshPaidUrg = await createUrgentIntakeRequest(
    {
      dayChoice: 'today',
      rawPhone: '+48 600 555 666',
      idempotencyKey: 'idemp-test-urg-fresh-1',
    },
    now,
  )
  await createAvailabilitySlot(freshPaidUrg.targetDate, '16:00', undefined, now)
  await proposeUrgentIntakeTimeslot(
    {
      requestId: freshPaidUrg.id,
      proposedDate: resolveWarsawIntakeTargetDate('today', now),
      proposedTime: '16:00',
      proposedTimeslotIso: new Date(now.getTime() + 3 * 3600 * 1000).toISOString(),
      holdExpiresAt: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
      idempotencyKey: 'idemp-test-urg-fresh-2',
    },
    now,
  )
  await confirmUrgentIntakePayment(
    {
      requestId: freshPaidUrg.id,
      paymentReference: 'tx_pay_fresh_rev',
      idempotencyKey: 'idemp-test-urg-fresh-3',
    },
    now,
  )
  const entToRevoke = await createTalkEntitlement(
    {
      rawPhone: '+48 600 555 666',
      paymentReference: 'tx_pay_fresh_rev',
      urgentRequestId: freshPaidUrg.id,
      validFrom: now.toISOString(),
      validUntil: new Date(now.getTime() + 24 * 3600 * 1000).toISOString(),
      idempotencyKey: 'idemp-test-ent-to-revoke',
    },
    now,
  )

  for (const badKey of invalidKeys) {
    await assert.rejects(
      () =>
        revokeTalkEntitlement(
          {
            entitlementId: entToRevoke.id,
            idempotencyKey: badKey,
          },
          now,
        ),
      Section16InvalidIdempotencyKeyError,
    )
  }
})

test('Idempotency: every mutation creates exactly one event; retries are idempotent and do not duplicate events', async () => {
  const now = new Date('2026-10-11T12:00:00Z')
  await resetSection16LocalStore()

  const snapBefore = await readSection16StoreSnapshot()
  assert.equal(snapBefore.urgentEvents.length, 0)
  assert.equal(snapBefore.notificationEvents.length, 0)
  assert.equal(snapBefore.talkEvents.length, 0)

  // 1. Create urgent intake -> exactly 1 event
  const req1 = await createUrgentIntakeRequest(
    {
      dayChoice: 'today',
      rawPhone: '+48 600 123 456',
      idempotencyKey: 'event-test-urg-1',
      payload: { testField: 'v1' },
    },
    now,
  )
  let snap = await readSection16StoreSnapshot()
  assert.equal(snap.urgentEvents.length, 1)
  assert.equal(snap.urgentEvents[0].idempotencyKey, 'event-test-urg-1')
  assert.ok(snap.urgentEvents[0].payloadHash)
  assert.equal(snap.urgentEvents[0].eventType, 'request_created')

  // Exact retry with identical payload returns exact same record, no new event
  const retryReq1 = await createUrgentIntakeRequest(
    {
      dayChoice: 'today',
      rawPhone: '+48 600 123 456',
      idempotencyKey: 'event-test-urg-1',
      payload: { testField: 'v1' },
    },
    now,
  )
  assert.equal(retryReq1.id, req1.id)
  snap = await readSection16StoreSnapshot()
  assert.equal(snap.urgentEvents.length, 1)

  // Conflicting retry with same key but different payload throws Section16IdempotencyConflictError
  await assert.rejects(
    () =>
      createUrgentIntakeRequest(
        {
          dayChoice: 'today',
          rawPhone: '+48 600 123 456',
          idempotencyKey: 'event-test-urg-1',
          payload: { testField: 'DIFFERENT_PAYLOAD' },
        },
        now,
      ),
    Section16IdempotencyConflictError,
  )
  snap = await readSection16StoreSnapshot()
  assert.equal(snap.urgentEvents.length, 1)

  // 2. Propose timeslot -> creates exactly 1 new event (total 2)
  await createAvailabilitySlot(req1.targetDate, '14:30', undefined, now)
  await proposeUrgentIntakeTimeslot(
    {
      requestId: req1.id,
      proposedDate: resolveWarsawIntakeTargetDate('today', now),
      proposedTime: '14:30',
      proposedTimeslotIso: new Date(now.getTime() + 2 * 3600 * 1000).toISOString(),
      holdExpiresAt: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
      idempotencyKey: 'event-test-urg-2',
    },
    now,
  )
  snap = await readSection16StoreSnapshot()
  assert.equal(snap.urgentEvents.length, 2)
  assert.equal(snap.urgentEvents[1].eventType, 'timeslot_proposed')

  // 3. Confirm payment -> creates exactly 1 new event (total 3)
  await confirmUrgentIntakePayment(
    {
      requestId: req1.id,
      paymentReference: 'tx_single_event_urg',
      idempotencyKey: 'event-test-urg-3',
    },
    now,
  )
  snap = await readSection16StoreSnapshot()
  assert.equal(snap.urgentEvents.length, 3)
  assert.equal(snap.urgentEvents[2].eventType, 'payment_confirmed')

  // 4. Create availability notification -> creates exactly 1 notification event
  const notif = await createAvailabilityNotificationRequest(
    {
      rawPhone: '+48 600 999 888',
      idempotencyKey: 'event-test-notif-1',
    },
    now,
  )
  snap = await readSection16StoreSnapshot()
  assert.equal(snap.notificationEvents.length, 1)
  assert.equal(snap.notificationEvents[0].eventType, 'notification_queued')

  // 5. Create talk entitlement -> creates exactly 1 talk event
  const ent = await createTalkEntitlement(
    {
      rawPhone: '+48 600 123 456',
      paymentReference: 'tx_single_event_urg',
      urgentRequestId: req1.id,
      validFrom: now.toISOString(),
      validUntil: new Date(now.getTime() + 24 * 3600 * 1000).toISOString(),
      idempotencyKey: 'event-test-talk-1',
    },
    now,
  )
  snap = await readSection16StoreSnapshot()
  assert.equal(snap.talkEvents.length, 1)
  assert.equal(snap.talkEvents[0].eventType, 'entitlement_created')

  // Exact retry on talk entitlement does not duplicate
  const retryEnt = await createTalkEntitlement(
    {
      rawPhone: '+48 600 123 456',
      paymentReference: 'tx_single_event_urg',
      urgentRequestId: req1.id,
      validFrom: now.toISOString(),
      validUntil: new Date(now.getTime() + 24 * 3600 * 1000).toISOString(),
      idempotencyKey: 'event-test-talk-1',
    },
    now,
  )
  assert.equal(retryEnt.id, ent.id)
  snap = await readSection16StoreSnapshot()
  assert.equal(snap.talkEvents.length, 1)
})

// ============================================================================
// 8. QUEUE CONCURRENCY, MONOTONIC SEQUENCE, AND POSITION NON-REUSE
// ============================================================================

test('Queue Concurrency: parallel requests receive strictly unique, monotonic positions without reuse', async () => {
  const now = new Date('2026-10-11T12:00:00Z')
  await resetSection16LocalStore()

  // Concurrently create 10 availability notification requests
  const count = 10
  const promises = Array.from({ length: count }, (_, i) =>
    createAvailabilityNotificationRequest(
      {
        rawPhone: `+48 600 100 ${String(100 + i).padStart(3, '0')}`,
        idempotencyKey: `parallel-queue-req-${i}`,
      },
      now,
    ),
  )

  const createdRequests = await Promise.all(promises)

  // Verify all 10 have unique queue positions
  const positions = createdRequests.map((r) => r.queuePosition)
  const uniquePositions = new Set(positions)
  assert.equal(uniquePositions.size, count, 'Każde zgłoszenie współbieżne musi mieć unikalną pozycję')

  // Sorted positions must be strictly 1, 2, 3, ..., 10
  const sorted = [...positions].sort((a, b) => a - b)
  for (let i = 0; i < count; i++) {
    assert.equal(sorted[i], i + 1, `Pozycja [${i}] musi wynosić ${i + 1}`)
  }

  // Transition request #1 (queuePosition: 1) out of queued state:
  // queued -> offer_sent -> accepted_paid -> consumed
  const firstReq = createdRequests.find((r) => r.queuePosition === 1)!
  const offered = await offerAvailabilityNotification(
    {
      requestId: firstReq.id,
      expectedVersion: 1,
      offerExpiresAt: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
      idempotencyKey: 'parallel-queue-offer-1',
    },
    now,
  )
  assert.equal(offered.state, 'offer_sent')

  const paid = await confirmNotificationOfferPayment(
    {
      requestId: firstReq.id,
      expectedVersion: 2,
      paymentReference: 'tx_parallel_queue_pay_1',
      idempotencyKey: 'parallel-queue-pay-1',
    },
    now,
  )
  assert.equal(paid.state, 'accepted_paid')

  const consumed = await transitionAvailabilityNotificationState(
    {
      requestId: firstReq.id,
      targetState: 'consumed',
      expectedVersion: 3,
      idempotencyKey: 'parallel-queue-consumed-1',
    },
    now,
  )
  assert.equal(consumed.state, 'consumed')

  // Create request #11: verify its position is 11 (position 1 is NEVER reused)
  const eleventhReq = await createAvailabilityNotificationRequest(
    {
      rawPhone: '+48 600 200 999',
      idempotencyKey: 'parallel-queue-req-eleventh',
    },
    now,
  )
  assert.equal(eleventhReq.queuePosition, 11, 'Pozycje w kolejce są monotoniczne i nie mogą być ponownie używane')
})

// ============================================================================
// 9. AUTHORITATIVE PAYMENT BINDING FOR TALK ENTITLEMENTS (POSITIVE & NEGATIVE)
// ============================================================================

test('Talk Entitlements: binding to authoritative paid sources, rejecting arbitrary and conflicting references', async () => {
  const now = new Date('2026-10-11T12:00:00Z')
  await resetSection16LocalStore()

  const phone = '+48 600 111 222'
  const validUntil = new Date(now.getTime() + 24 * 3600 * 1000).toISOString()

  // 1. Arbitrary payment reference without source -> REJECTED
  await assert.rejects(
    () =>
      createTalkEntitlement(
        {
          rawPhone: phone,
          paymentReference: 'arbitrary_fake_payment_ref',
          validFrom: now.toISOString(),
          validUntil,
          idempotencyKey: 'talk-src-arbitrary-ref',
        },
        now,
      ),
    Section16PaymentRequiredError,
  )

  // 2. Urgent Intake source path:
  const urgReq = await createUrgentIntakeRequest(
    {
      dayChoice: 'today',
      rawPhone: phone,
      idempotencyKey: 'talk-src-urg-req1',
    },
    now,
  )

  // Unpaid urgent intake (pending_proposal) -> REJECTED
  await assert.rejects(
    () =>
      createTalkEntitlement(
        {
          rawPhone: phone,
          paymentReference: 'tx_some_ref',
          urgentRequestId: urgReq.id,
          validFrom: now.toISOString(),
          validUntil,
          idempotencyKey: 'talk-src-urg-unpaid',
        },
        now,
      ),
    Section16PaymentRequiredError,
  )

  // Non-existent urgent request ID -> REJECTED
  await assert.rejects(
    () =>
      createTalkEntitlement(
        {
          rawPhone: phone,
          paymentReference: 'tx_some_ref',
          urgentRequestId: '00000000-0000-0000-0000-000000000099',
          validFrom: now.toISOString(),
          validUntil,
          idempotencyKey: 'talk-src-urg-notfound',
        },
        now,
      ),
    Section16NotFoundError,
  )

  // Propose timeslot and confirm payment on urgent request
  await createAvailabilitySlot(urgReq.targetDate, '15:00', undefined, now)
  await proposeUrgentIntakeTimeslot(
    {
      requestId: urgReq.id,
      proposedDate: resolveWarsawIntakeTargetDate('today', now),
      proposedTime: '15:00',
      proposedTimeslotIso: new Date(now.getTime() + 2 * 3600 * 1000).toISOString(),
      holdExpiresAt: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
      idempotencyKey: 'talk-src-urg-prop1',
    },
    now,
  )
  await confirmUrgentIntakePayment(
    {
      requestId: urgReq.id,
      paymentReference: 'tx_urg_legit_payment',
      idempotencyKey: 'talk-src-urg-pay1',
    },
    now,
  )

  // Mismatched payment reference against urgent intake -> REJECTED
  await assert.rejects(
    () =>
      createTalkEntitlement(
        {
          rawPhone: phone,
          paymentReference: 'tx_mismatched_reference',
          urgentRequestId: urgReq.id,
          validFrom: now.toISOString(),
          validUntil,
          idempotencyKey: 'talk-src-urg-ref-mismatch',
        },
        now,
      ),
    Section16ValidationError,
  )

  // Mismatched phone fingerprint against urgent intake -> REJECTED
  await assert.rejects(
    () =>
      createTalkEntitlement(
        {
          rawPhone: '+48 600 999 000', // Different phone!
          paymentReference: 'tx_urg_legit_payment',
          urgentRequestId: urgReq.id,
          validFrom: now.toISOString(),
          validUntil,
          idempotencyKey: 'talk-src-urg-fp-mismatch',
        },
        now,
      ),
    Section16ValidationError,
  )

  // Matching urgent request -> SUCCESS
  const entFromUrg = await createTalkEntitlement(
    {
      rawPhone: phone,
      paymentReference: 'tx_urg_legit_payment',
      urgentRequestId: urgReq.id,
      validFrom: now.toISOString(),
      validUntil,
      idempotencyKey: 'talk-src-urg-success',
    },
    now,
  )
  assert.equal(entFromUrg.state, 'active')
  assert.equal(entFromUrg.urgentRequestId, urgReq.id)

  // 3. Availability Notification source path:
  const notifPhone = '+48 600 333 444'
  const notifReq = await createAvailabilityNotificationRequest(
    {
      rawPhone: notifPhone,
      idempotencyKey: 'talk-src-notif-req1',
    },
    now,
  )

  // Unpaid notification (queued) -> REJECTED
  await assert.rejects(
    () =>
      createTalkEntitlement(
        {
          rawPhone: notifPhone,
          paymentReference: 'tx_notif_legit_pay',
          notificationRequestId: notifReq.id,
          validFrom: now.toISOString(),
          validUntil,
          idempotencyKey: 'talk-src-notif-unpaid',
        },
        now,
      ),
    Section16PaymentRequiredError,
  )

  await offerAvailabilityNotification(
    {
      requestId: notifReq.id,
      offerExpiresAt: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
      idempotencyKey: 'talk-src-notif-offer1',
    },
    now,
  )
  await confirmNotificationOfferPayment(
    {
      requestId: notifReq.id,
      paymentReference: 'tx_notif_legit_pay',
      idempotencyKey: 'talk-src-notif-pay1',
    },
    now,
  )

  // Mismatched payment reference against notification -> REJECTED
  await assert.rejects(
    () =>
      createTalkEntitlement(
        {
          rawPhone: notifPhone,
          paymentReference: 'tx_mismatched_pay_ref',
          notificationRequestId: notifReq.id,
          validFrom: now.toISOString(),
          validUntil,
          idempotencyKey: 'talk-src-notif-ref-mismatch',
        },
        now,
      ),
    Section16ValidationError,
  )

  // Matching notification -> SUCCESS
  const entFromNotif = await createTalkEntitlement(
    {
      rawPhone: notifPhone,
      paymentReference: 'tx_notif_legit_pay',
      notificationRequestId: notifReq.id,
      validFrom: now.toISOString(),
      validUntil,
      idempotencyKey: 'talk-src-notif-success',
    },
    now,
  )
  assert.equal(entFromNotif.state, 'active')
  assert.equal(entFromNotif.notificationRequestId, notifReq.id)

  // 4. Conflicting sources (urgent and notification have different payment refs) -> REJECTED
  await assert.rejects(
    () =>
      createTalkEntitlement(
        {
          rawPhone: phone,
          paymentReference: 'tx_urg_legit_payment',
          urgentRequestId: urgReq.id,
          notificationRequestId: notifReq.id,
          validFrom: now.toISOString(),
          validUntil,
          idempotencyKey: 'talk-src-conflict-test',
        },
        now,
      ),
    Section16ValidationError,
  )

  // 5. Booking source path:
  const slot = await createAvailabilitySlot('2030-03-12', '10:00')
  const { booking } = await createPendingBooking({
    ownerName: 'Jan Kowalski',
    serviceType: 'szybka-konsultacja-15-min',
    problemType: 'inne',
    animalType: 'Pies',
    petAge: '3 lata',
    durationNotes: 'Brak',
    description: 'Konsultacja testowa',
    phone: '600888999',
    email: 'jan@example.invalid',
    slotId: slot.id,
  })

  // Booking is unpaid initially -> REJECTED
  await assert.rejects(
    () =>
      createTalkEntitlement(
        {
          rawPhone: '+48 600 888 999',
          paymentReference: 'tx_booking_paid_999',
          bookingId: booking.id,
          validFrom: now.toISOString(),
          validUntil,
          idempotencyKey: 'talk-src-booking-unpaid',
        },
        now,
      ),
    Section16PaymentRequiredError,
  )

  // Mark booking paid
  await markBookingPaid(booking.id, {
    paymentReference: 'tx_booking_paid_999',
    paymentMethod: 'manual',
  })

  // Paid booking -> SUCCESS
  const entFromBooking = await createTalkEntitlement(
    {
      rawPhone: '+48 600 888 999',
      paymentReference: 'tx_booking_paid_999',
      bookingId: booking.id,
      validFrom: now.toISOString(),
      validUntil,
      idempotencyKey: 'talk-src-booking-success',
    },
    now,
  )
  assert.equal(entFromBooking.state, 'active')
  assert.equal(entFromBooking.bookingId, booking.id)
})

// ============================================================================
// 10. CIPHERTEXT DEFENSE-IN-DEPTH AND SCHEMA AUDIT CONSTRAINTS
// ============================================================================

test('Ciphertext defense-in-depth: enforces enc: prefix, length, rejects disguised plaintext phone and email', async () => {
  const now = new Date('2026-10-11T12:00:00Z')

  // Valid ciphertext accepted
  const valid = await createUrgentIntakeRequest(
    {
      dayChoice: 'today',
      rawPhone: '+48 600 123 456',
      contactCiphertext: 'enc:f0a8b92c4d6e810a9b2c3d4e5f_ciphertext',
      idempotencyKey: 'cipher-valid-urg-1',
    },
    now,
  )
  assert.equal(valid.contactCiphertext, 'enc:f0a8b92c4d6e810a9b2c3d4e5f_ciphertext')

  // Plain phone embedded in contactCiphertext rejected
  await assert.rejects(
    () =>
      createUrgentIntakeRequest(
        {
          dayChoice: 'today',
          rawPhone: '+48 600 123 456',
          contactCiphertext: 'enc:+48600123456000000',
          idempotencyKey: 'cipher-plain-phone-urg',
        },
        now,
      ),
    Section16PrivacyError,
  )

  // Plain email embedded in contactCiphertext rejected
  await assert.rejects(
    () =>
      createUrgentIntakeRequest(
        {
          dayChoice: 'today',
          rawPhone: '+48 600 123 456',
          contactCiphertext: 'enc:jan.kowalski@example.com_blob',
          idempotencyKey: 'cipher-plain-email-urg',
        },
        now,
      ),
    Section16PrivacyError,
  )

  // Same enforcement on Availability Notification
  await assert.rejects(
    () =>
      createAvailabilityNotificationRequest(
        {
          rawPhone: '+48 600 123 456',
          contactCiphertext: 'enc:+48600123456000000',
          idempotencyKey: 'cipher-plain-phone-notif',
        },
        now,
      ),
    Section16PrivacyError,
  )
})

test('Static SQL audit: schema and migration enforce sequence, unique queue position, NOT NULL idempotency, and ciphertext regex', () => {
  const schemaSql = readFileSync('supabase/schema.sql', 'utf8')
  const migrationSql = readFileSync('supabase/migrations/20261011005_section16_autonomous_intake_and_entitlements.sql', 'utf8')

  for (const sql of [schemaSql, migrationSql]) {
    // Dedicated sequence
    assert.ok(sql.includes('create sequence if not exists public.availability_notification_queue_seq'), 'Brak sekwencji availability_notification_queue_seq')

    // Unique queue position constraint
    assert.ok(sql.includes('constraint availability_notification_requests_queue_position_key unique (queue_position)'), 'Brak unikalnego constraintu na queue_position')

    // NOT NULL idempotency key constraints
    assert.ok(sql.includes('idempotency_key text not null unique check (length(trim(idempotency_key)) between 1 and 128)'), 'Brak NOT NULL klucza idempotencji o długości 1-128')

    // Authoritative source constraint on consultation_talk_entitlements
    assert.ok(sql.includes('check (urgent_request_id is not null or notification_request_id is not null or booking_id is not null)'), 'Brak ograniczenia wymagającego co najmniej jednego źródła w consultation_talk_entitlements')

    // Defense-in-depth ciphertext regex constraint
    assert.ok(sql.includes("substring(contact_ciphertext from 5) !~* '([0-9][\\s.-]*){9}'"), 'Brak blokady jawnego telefonu w contact_ciphertext SQL')
    assert.ok(sql.includes("substring(contact_ciphertext from 5) !~* '[a-zA-Z0-9_.+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}'"), 'Brak blokady jawnego emaila w contact_ciphertext SQL')
  }
})

// ============================================================================
// SECTION 16 ACL CONTRACT AUDIT (APPEND-ONLY & MONOTONIC SEQUENCE PRIVILEGES)
// ============================================================================

interface PrivilegeMap {
  [objectName: string]: {
    [role: string]: Set<string>
  }
}

const ALL_TABLE_PRIVILEGES = ['select', 'insert', 'update', 'delete', 'truncate', 'references', 'trigger']
const ALL_SEQUENCE_PRIVILEGES = ['usage', 'select', 'update']
const ALL_FUNCTION_PRIVILEGES = ['execute']

const SECTION16_MAIN_TABLES = [
  'public.urgent_intake_requests',
  'public.availability_notification_requests',
  'public.consultation_talk_entitlements',
]

const SECTION16_EVENT_TABLES = [
  'public.urgent_intake_events',
  'public.availability_notification_events',
  'public.consultation_talk_entitlement_events',
]

const SECTION16_SEQUENCE = 'public.availability_notification_queue_seq'

const SECTION16_RPCS = [
  'public.create_urgent_intake_request',
  'public.propose_urgent_intake_timeslot',
  'public.confirm_urgent_intake_payment',
  'public.transition_urgent_intake_state',
  'public.create_availability_notification_request',
  'public.offer_availability_notification',
  'public.confirm_notification_offer_payment',
  'public.transition_availability_notification_state',
  'public.create_talk_entitlement',
  'public.consume_talk_entitlement',
  'public.revoke_talk_entitlement',
]

function createDefaultPrivilegeState(): PrivilegeMap {
  const map: PrivilegeMap = {}
  for (const t of [...SECTION16_MAIN_TABLES, ...SECTION16_EVENT_TABLES]) {
    map[t] = {
      // Simulate PostgreSQL default privileges (pg_default_acl) in Supabase schema public
      service_role: new Set(ALL_TABLE_PRIVILEGES),
      anon: new Set(),
      authenticated: new Set(),
      public: new Set(),
    }
  }
  map[SECTION16_SEQUENCE] = {
    service_role: new Set(ALL_SEQUENCE_PRIVILEGES),
    anon: new Set(),
    authenticated: new Set(),
    public: new Set(),
  }
  for (const rpc of SECTION16_RPCS) {
    map[rpc] = {
      service_role: new Set(),
      anon: new Set(),
      authenticated: new Set(),
      public: new Set(),
    }
  }
  return map
}

function parseAndApplySqlPrivileges(sql: string, state: PrivilegeMap) {
  const cleanSql = sql.replace(/--.*$/gm, '')
  const statements = cleanSql
    .split(';')
    .map(s => s.trim().replace(/\s+/g, ' '))
    .filter(s => s.length > 0)

  for (const stmt of statements) {
    const revokeMatch = stmt.match(/^revoke\s+(.+?)\s+on\s+(table|sequence|function)\s+([a-zA-Z0-9_.]+)(?:\(.*?\))?\s+from\s+(.+)$/i)
    if (revokeMatch) {
      const [, rawPrivs, kind, rawObj, rawRoles] = revokeMatch
      const obj = rawObj.toLowerCase().startsWith('public.') ? rawObj.toLowerCase() : `public.${rawObj.toLowerCase()}`
      const roles = rawRoles.split(',').map(r => r.trim().toLowerCase())

      if (!state[obj]) {
        state[obj] = {
          service_role: new Set(),
          anon: new Set(),
          authenticated: new Set(),
          public: new Set(),
        }
      }

      const privsToRevoke = rawPrivs.trim().toLowerCase().startsWith('all')
        ? (kind.toLowerCase() === 'table' ? ALL_TABLE_PRIVILEGES : kind.toLowerCase() === 'sequence' ? ALL_SEQUENCE_PRIVILEGES : ALL_FUNCTION_PRIVILEGES)
        : rawPrivs.split(',').map(p => p.trim().toLowerCase())

      for (const role of roles) {
        if (!state[obj][role]) {
          state[obj][role] = new Set()
        }
        for (const p of privsToRevoke) {
          state[obj][role].delete(p)
        }
      }
      continue
    }

    const grantMatch = stmt.match(/^grant\s+(.+?)\s+on\s+(table|sequence|function)\s+([a-zA-Z0-9_.]+)(?:\(.*?\))?\s+to\s+(.+)$/i)
    if (grantMatch) {
      const [, rawPrivs, kind, rawObj, rawRoles] = grantMatch
      const obj = rawObj.toLowerCase().startsWith('public.') ? rawObj.toLowerCase() : `public.${rawObj.toLowerCase()}`
      const roles = rawRoles.split(',').map(r => r.trim().toLowerCase())

      if (!state[obj]) {
        state[obj] = {
          service_role: new Set(),
          anon: new Set(),
          authenticated: new Set(),
          public: new Set(),
        }
      }

      const privsToGrant = rawPrivs.trim().toLowerCase().startsWith('all')
        ? (kind.toLowerCase() === 'table' ? ALL_TABLE_PRIVILEGES : kind.toLowerCase() === 'sequence' ? ALL_SEQUENCE_PRIVILEGES : ALL_FUNCTION_PRIVILEGES)
        : rawPrivs.split(',').map(p => p.trim().toLowerCase())

      for (const role of roles) {
        if (!state[obj][role]) {
          state[obj][role] = new Set()
        }
        for (const p of privsToGrant) {
          state[obj][role].add(p)
        }
      }
      continue
    }
  }
}

test('Section 16 ACL contract: migration 20261011006 strips default privileges and enforces strict append-only ACL', () => {
  const mig11005 = readFileSync('supabase/migrations/20261011005_section16_autonomous_intake_and_entitlements.sql', 'utf8')
  const mig11006 = readFileSync('supabase/migrations/20261011006_section16_append_only_acl.sql', 'utf8')

  const state = createDefaultPrivilegeState()
  parseAndApplySqlPrivileges(mig11005, state)
  parseAndApplySqlPrivileges(mig11006, state)

  // 1. Event tables: service_role has ONLY SELECT and INSERT (append-only)
  for (const table of SECTION16_EVENT_TABLES) {
    const srPrivs = [...state[table].service_role].sort()
    assert.deepEqual(
      srPrivs,
      ['insert', 'select'],
      `${table} service_role privileges must be exactly SELECT, INSERT (found ${srPrivs.join(', ')})`,
    )
    for (const forbidden of ['update', 'delete', 'truncate', 'references', 'trigger']) {
      assert.equal(
        state[table].service_role.has(forbidden),
        false,
        `${table} must NOT grant ${forbidden} to service_role`,
      )
    }
    // zero rights for public, anon, authenticated
    for (const role of ['anon', 'authenticated', 'public']) {
      assert.equal(
        state[table][role].size,
        0,
        `${table} must have 0 privileges for ${role}`,
      )
    }
  }

  // 2. Main tables: service_role has ONLY SELECT, INSERT, UPDATE (no DELETE/TRUNCATE/REFERENCES/TRIGGER)
  for (const table of SECTION16_MAIN_TABLES) {
    const srPrivs = [...state[table].service_role].sort()
    assert.deepEqual(
      srPrivs,
      ['insert', 'select', 'update'],
      `${table} service_role privileges must be exactly SELECT, INSERT, UPDATE (found ${srPrivs.join(', ')})`,
    )
    for (const forbidden of ['delete', 'truncate', 'references', 'trigger']) {
      assert.equal(
        state[table].service_role.has(forbidden),
        false,
        `${table} must NOT grant ${forbidden} to service_role`,
      )
    }
    // zero rights for public, anon, authenticated
    for (const role of ['anon', 'authenticated', 'public']) {
      assert.equal(
        state[table][role].size,
        0,
        `${table} must have 0 privileges for ${role}`,
      )
    }
  }

  // 3. Dedicated sequence: service_role has ONLY USAGE, SELECT (NO UPDATE -> setval is blocked)
  const seqPrivs = [...state[SECTION16_SEQUENCE].service_role].sort()
  assert.deepEqual(
    seqPrivs,
    ['select', 'usage'],
    `${SECTION16_SEQUENCE} service_role privileges must be exactly USAGE, SELECT (found ${seqPrivs.join(', ')})`,
  )
  assert.equal(
    state[SECTION16_SEQUENCE].service_role.has('update'),
    false,
    `${SECTION16_SEQUENCE} must NOT grant UPDATE to service_role (blocks setval)`,
  )
  for (const role of ['anon', 'authenticated', 'public']) {
    assert.equal(
      state[SECTION16_SEQUENCE][role].size,
      0,
      `${SECTION16_SEQUENCE} must have 0 privileges for ${role}`,
    )
  }

  // 4. Mutating RPCs: execute only for service_role, zero for public, anon, authenticated
  for (const rpc of SECTION16_RPCS) {
    assert.deepEqual(
      [...state[rpc].service_role].sort(),
      ['execute'],
      `${rpc} service_role must have EXECUTE`,
    )
    for (const role of ['anon', 'authenticated', 'public']) {
      assert.equal(
        state[rpc][role].size,
        0,
        `${rpc} must have 0 privileges for ${role}`,
      )
    }
  }
})

test('Section 16 ACL contract: canonical schema.sql guarantees identical minimal ACL on fresh install', () => {
  const schemaSql = readFileSync('supabase/schema.sql', 'utf8')
  const state = createDefaultPrivilegeState()
  parseAndApplySqlPrivileges(schemaSql, state)

  // Event tables
  for (const table of SECTION16_EVENT_TABLES) {
    assert.deepEqual(
      [...state[table].service_role].sort(),
      ['insert', 'select'],
      `${table} fresh install must have exactly SELECT, INSERT for service_role`,
    )
    for (const role of ['anon', 'authenticated', 'public']) {
      assert.equal(state[table][role].size, 0, `${table} fresh install must have 0 for ${role}`)
    }
  }

  // Main tables
  for (const table of SECTION16_MAIN_TABLES) {
    assert.deepEqual(
      [...state[table].service_role].sort(),
      ['insert', 'select', 'update'],
      `${table} fresh install must have exactly SELECT, INSERT, UPDATE for service_role`,
    )
    for (const role of ['anon', 'authenticated', 'public']) {
      assert.equal(state[table][role].size, 0, `${table} fresh install must have 0 for ${role}`)
    }
  }

  // Sequence
  assert.deepEqual(
    [...state[SECTION16_SEQUENCE].service_role].sort(),
    ['select', 'usage'],
    `${SECTION16_SEQUENCE} fresh install must have exactly USAGE, SELECT for service_role`,
  )
  assert.equal(
    state[SECTION16_SEQUENCE].service_role.has('update'),
    false,
    `${SECTION16_SEQUENCE} fresh install must NOT have UPDATE for service_role`,
  )
  for (const role of ['anon', 'authenticated', 'public']) {
    assert.equal(state[SECTION16_SEQUENCE][role].size, 0, `${SECTION16_SEQUENCE} fresh install must have 0 for ${role}`)
  }

  // RPCs
  for (const rpc of SECTION16_RPCS) {
    assert.deepEqual([...state[rpc].service_role].sort(), ['execute'])
    for (const role of ['anon', 'authenticated', 'public']) {
      assert.equal(state[rpc][role].size, 0)
    }
  }
})

test('Section 16 ACL contract: static AST asserts explicit REVOKE ALL before GRANT and absence of prohibited grants', () => {
  const mig11006 = readFileSync('supabase/migrations/20261011006_section16_append_only_acl.sql', 'utf8')

  // Check sequence: revoke all from service_role before grant
  const seqRevokeIdx = mig11006.indexOf('revoke all on sequence public.availability_notification_queue_seq from service_role;')
  const seqGrantIdx = mig11006.indexOf('grant usage, select on sequence public.availability_notification_queue_seq to service_role;')
  assert.ok(seqRevokeIdx !== -1, 'Brak revoke all on sequence from service_role')
  assert.ok(seqGrantIdx !== -1, 'Brak grant usage, select on sequence to service_role')
  assert.ok(seqRevokeIdx < seqGrantIdx, 'Revoke all on sequence musi poprzedzać grant')

  // Ensure sequence never receives UPDATE
  assert.equal(
    /grant\s+[^;]*\bupdate\b[^;]*\bon\s+sequence\s+public\.availability_notification_queue_seq/i.test(mig11006),
    false,
    'Sekwencja nie może otrzymać UPDATE',
  )

  // Check all event tables: revoke all from service_role before grant
  for (const table of SECTION16_EVENT_TABLES) {
    const rawName = table.replace('public.', '')
    const revokeIdx = mig11006.indexOf(`revoke all on table public.${rawName} from service_role;`)
    const grantIdx = mig11006.indexOf(`grant select, insert on table public.${rawName} to service_role;`)
    assert.ok(revokeIdx !== -1, `Brak revoke all on table ${rawName} from service_role`)
    assert.ok(grantIdx !== -1, `Brak grant select, insert on table ${rawName} to service_role`)
    assert.ok(revokeIdx < grantIdx, `Revoke all on table ${rawName} musi poprzedzać grant`)

    // Check no prohibited privileges
    const grantRegex = new RegExp(`grant\\s+([^;]+?)\\s+on\\s+table\\s+public\\.${rawName}\\s+to\\s+service_role;`, 'i')
    const match = mig11006.match(grantRegex)
    assert.ok(match, `Brak dopasowania grantu dla ${rawName}`)
    const granted = match[1].split(',').map(s => s.trim().toLowerCase())
    for (const forbidden of ['update', 'delete', 'truncate', 'references', 'trigger']) {
      assert.equal(
        granted.includes(forbidden),
        false,
        `${rawName} nie może mieć ${forbidden} w grant`,
      )
    }
  }

  // Check all main tables: revoke all from service_role before grant
  for (const table of SECTION16_MAIN_TABLES) {
    const rawName = table.replace('public.', '')
    const revokeIdx = mig11006.indexOf(`revoke all on table public.${rawName} from service_role;`)
    const grantIdx = mig11006.indexOf(`grant select, insert, update on table public.${rawName} to service_role;`)
    assert.ok(revokeIdx !== -1, `Brak revoke all on table ${rawName} from service_role`)
    assert.ok(grantIdx !== -1, `Brak grant select, insert, update on table ${rawName} to service_role`)
    assert.ok(revokeIdx < grantIdx, `Revoke all on table ${rawName} musi poprzedzać grant`)

    const grantRegex = new RegExp(`grant\\s+([^;]+?)\\s+on\\s+table\\s+public\\.${rawName}\\s+to\\s+service_role;`, 'i')
    const match = mig11006.match(grantRegex)
    assert.ok(match, `Brak dopasowania grantu dla ${rawName}`)
    const granted = match[1].split(',').map(s => s.trim().toLowerCase())
    for (const forbidden of ['delete', 'truncate', 'references', 'trigger']) {
      assert.equal(
        granted.includes(forbidden),
        false,
        `${rawName} nie może mieć ${forbidden} w grant`,
      )
    }
  }

  // Ensure NO grant statements exist for public, anon, or authenticated
  const unsafeGrantRegex = /grant\s+[^;]+?\s+to\s+[^;]*\b(public|anon|authenticated)\b/i
  assert.equal(
    unsafeGrantRegex.test(mig11006),
    false,
    'Migracja 20261011006 nie może nadawać uprawnień rolom public, anon ani authenticated',
  )
})

test('Section 16 ACL contract: negative validation catches simulated ACL leaks and regressions', () => {
  // Test 1: Leaked UPDATE on event table is caught
  const leakedEventState = createDefaultPrivilegeState()
  parseAndApplySqlPrivileges(`
    revoke all on table public.urgent_intake_events from service_role;
    grant select, insert, update on table public.urgent_intake_events to service_role;
  `, leakedEventState)
  assert.equal(leakedEventState['public.urgent_intake_events'].service_role.has('update'), true)

  // Test 2: Leaked UPDATE on sequence is caught
  const leakedSeqState = createDefaultPrivilegeState()
  parseAndApplySqlPrivileges(`
    revoke all on sequence public.availability_notification_queue_seq from service_role;
    grant usage, select, update on sequence public.availability_notification_queue_seq to service_role;
  `, leakedSeqState)
  assert.equal(leakedSeqState['public.availability_notification_queue_seq'].service_role.has('update'), true)

  // Test 3: Unstripped default privileges (omitted revoke) are caught
  const unstrippedState = createDefaultPrivilegeState()
  parseAndApplySqlPrivileges(`
    grant select, insert on table public.urgent_intake_events to service_role;
  `, unstrippedState)
  // Since revoke all was omitted, default privileges (delete, truncate, etc.) still remain!
  assert.equal(unstrippedState['public.urgent_intake_events'].service_role.has('delete'), true)
  assert.equal(unstrippedState['public.urgent_intake_events'].service_role.has('truncate'), true)

  // Test 4: Leaked anon grant is caught
  const leakedAnonState = createDefaultPrivilegeState()
  parseAndApplySqlPrivileges(`
    grant select on table public.urgent_intake_events to anon;
  `, leakedAnonState)
  assert.equal(leakedAnonState['public.urgent_intake_events'].anon.has('select'), true)
})
