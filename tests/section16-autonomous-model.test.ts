import test from 'node:test'
import assert from 'node:assert/strict'
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
} from '../lib/server/section16-store'
import {
  resolveWarsawIntakeTargetDate,
  validateWarsawIntakeTargetDate,
  validateContactCiphertextContract,
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
  isValidUrgentIntakeTransition,
  isValidAvailabilityNotificationTransition,
  isValidTalkEntitlementTransition,
} from '../lib/server/section16-types'
import { getSupabaseSchemaAudit } from '../scripts/lib/schema-audit'

test.beforeEach(async () => {
  process.env.APP_DATA_MODE = 'local'
  process.env.CALL_SESSION_PHONE_SECRET = 'test-secret-with-at-least-16-chars'
  await resetSection16LocalStore()
})

test.after(async () => {
  await resetSection16LocalStore()
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

  // Verify state transitioned to expired
  const updated = await getUrgentIntakeRequest(intake.id)
  assert.equal(updated?.state, 'expired')
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

test('Path B: offer expiration rejects late payment and transitions to expired', async () => {
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

  const updated = await getAvailabilityNotificationRequest(req.id)
  assert.equal(updated?.state, 'expired')
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

  const entitlement = await createTalkEntitlement(
    {
      rawPhone: '+48 600 777 888',
      paymentReference: 'revolut:tx_talk_ent_001',
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

test('Talk Entitlements: consumption after validUntil is rejected and marked expired', async () => {
  const now = new Date('2026-10-11T12:00:00Z')
  const validUntil = new Date(now.getTime() + 2 * 3600 * 1000).toISOString() // 2h window

  const entitlement = await createTalkEntitlement(
    {
      rawPhone: '+48 600 777 888',
      paymentReference: 'revolut:tx_talk_ent_exp',
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

  const updated = await getTalkEntitlement(entitlement.id)
  assert.equal(updated?.state, 'expired')
})

test('Talk Entitlements: revocation transitions active to revoked', async () => {
  const now = new Date('2026-10-11T12:00:00Z')
  const entitlement = await createTalkEntitlement(
    {
      rawPhone: '+48 600 777 888',
      paymentReference: 'revolut:tx_talk_ent_rev',
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

test('Static schema audit: migration 20261011005 and canonical markers are fully satisfied', () => {
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
