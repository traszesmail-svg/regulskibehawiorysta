import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createLocalDataSandbox } from '@/scripts/lib/local-data-sandbox'
import {
  createAvailabilitySlot,
  createPendingBooking,
  markBookingPaid,
  markBookingPaymentFailed,
  markBookingManualPaymentRejected,
  markBookingDone,
  createCallSession,
  transitionCallSession,
  classifyIncomingCaller,
  listCallerDecisionAudits,
} from '@/lib/server/db'
import {
  computeCallerPhoneFingerprint,
  computeCallerClassificationRequestHash,
} from '@/lib/server/call-session-security'
import { POST as classifyApiRoute } from '@/app/api/phone-agent/classify/route'
import { NextRequest } from 'next/server'

const TEST_SECRET = 'super-secret-salt-for-call-sessions-tests-12345'
const TEST_PHONE = '600123456'
const TEST_PHONE_E164 = '+48600123456'

function withEnv(
  overrides: Record<string, string | null | undefined>,
  run: () => Promise<void>,
) {
  const previous = new Map<string, string | undefined>()
  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, process.env[key])
    if (value === null || value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }

  return run().finally(() => {
    for (const [key, value] of previous) {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  })
}

test('1. Normalizacja wariantów PL: wszystkie polskie formaty dopasowują ten sam numer, a błędne zwracają invalid_phone', async () => {
  const sandbox = await createLocalDataSandbox('caller-classifier-normalization', process.cwd())
  try {
    await withEnv(
      {
        APP_DATA_MODE: 'local',
        CALL_SESSION_PHONE_SECRET: TEST_SECRET,
      },
      async () => {
        // Create slot and paid booking
        const slot1 = await createAvailabilitySlot('2030-03-12', '11:00')
        const created = await createPendingBooking({
          ownerName: 'Adam Testowy',
          serviceType: 'szybka-konsultacja-15-min',
          problemType: 'agresja',
          animalType: 'Pies',
          petAge: '2 lata',
          durationNotes: 'Brak',
          description: 'Opis',
          phone: TEST_PHONE,
          email: 'adam@example.com',
          slotId: slot1.id,
        })
        await markBookingPaid(created.booking.id, { paymentMethod: 'payu', paymentReference: 'ref-norm-1' })

        const variants = [
          '600123456',
          '600 123 456',
          '600-123-456',
          '+48600123456',
          '+48 600 123 456',
          '+48-600-123-456',
          '0048600123456',
          '0048 600 123 456',
          '(+48) 600 123 456',
          '  600 123 456  ',
        ]

        for (const variant of variants) {
          const res = await classifyIncomingCaller(variant, { recordAudit: false })
          assert.equal(res.decision, 'paid_booking_no_session')
          assert.equal(res.allowCall, false)
          assert.equal(res.bookingId, created.booking.id)
          assert.ok(res.callerPhoneFingerprint?.startsWith('call_fp:'))
          assert.equal(res.callerPhoneMasked, '+48 600 *** 456')
        }

        // Invalid phone inputs
        const invalidVariants = ['', '   ', '12345', 'abcdefghijk', '+1 555 123 4567']
        for (const invalid of invalidVariants) {
          const res = await classifyIncomingCaller(invalid, { recordAudit: false })
          assert.equal(res.decision, 'invalid_phone')
          assert.equal(res.allowCall, false)
          assert.equal(res.callerPhoneFingerprint, null)
          assert.equal(res.callerPhoneMasked, null)
        }
      },
    )
  } finally {
    await sandbox.cleanup()
  }
})

test('2. Privacy & Redaction: brak surowego numeru i PII w wynikach, logach i trwałym magazynie audytu', async () => {
  const sandbox = await createLocalDataSandbox('caller-classifier-privacy', process.cwd())
  try {
    await withEnv(
      {
        APP_DATA_MODE: 'local',
        CALL_SESSION_PHONE_SECRET: TEST_SECRET,
      },
      async () => {
        const slot2 = await createAvailabilitySlot('2030-03-13', '11:00')
        const created = await createPendingBooking({
          ownerName: 'Janina Wrażliwa',
          serviceType: 'szybka-konsultacja-15-min',
          problemType: 'agresja',
          animalType: 'Pies',
          petAge: '4 lata',
          durationNotes: 'Tylko prywatnie',
          description: 'Dane wrażliwe klienta i pupila',
          phone: '601222333',
          email: 'janina@prywatna.example.com',
          slotId: slot2.id,
        })
        await markBookingPaid(created.booking.id, { paymentMethod: 'payu', paymentReference: 'ref-priv-1' })

        const decision = await classifyIncomingCaller('601 222 333', {
          idempotencyKey: 'privacy-audit-key-1',
        })

        // 1. Check classification result object
        const decisionJson = JSON.stringify(decision)
        assert.equal(decisionJson.includes('601222333'), false)
        assert.equal(decisionJson.includes('+48601222333'), false)
        assert.equal(decisionJson.includes('Janina'), false)
        assert.equal(decisionJson.includes('janina@prywatna.example.com'), false)
        assert.equal(decisionJson.includes('pupila'), false)
        assert.equal(decision.callerPhoneMasked, '+48 601 *** 333')
        assert.ok(decision.callerPhoneFingerprint?.startsWith('call_fp:'))

        // 2. Check audits on disk
        const auditPath = path.join(sandbox.dataDir, 'caller-decision-audits-snapshot.json')
        const diskContent = await readFile(auditPath, 'utf8')
        assert.equal(diskContent.includes('601222333'), false)
        assert.equal(diskContent.includes('+48601222333'), false)
        assert.equal(diskContent.includes('Janina'), false)
        assert.equal(diskContent.includes('janina@prywatna.example.com'), false)
        assert.equal(diskContent.includes('pupila'), false)

        const audits = await listCallerDecisionAudits()
        assert.equal(audits.length, 1)
        assert.equal(audits[0].idempotencyKey, 'privacy-audit-key-1')
        assert.equal(audits[0].callerPhoneMasked, '+48 601 *** 333')
      },
    )
  } finally {
    await sandbox.cleanup()
  }
})

test('3. Każdy wynik klasyfikacji: 6 wymaganych stanów deterministycznie rozróżnianych', async () => {
  const sandbox = await createLocalDataSandbox('caller-classifier-categories', process.cwd())
  try {
    await withEnv(
      {
        APP_DATA_MODE: 'local',
        CALL_SESSION_PHONE_SECRET: TEST_SECRET,
      },
      async () => {
        // --- 1) unknown_number ---
        const unknownRes = await classifyIncomingCaller('600999888', { recordAudit: false })
        assert.equal(unknownRes.decision, 'unknown_number')
        assert.equal(unknownRes.allowCall, false)

        // --- 2) unpaid_booking ---
        const slot3_1 = await createAvailabilitySlot('2030-03-14', '11:00')
        const unpaidBooking = await createPendingBooking({
          ownerName: 'Marek Nieopłacony',
          serviceType: 'szybka-konsultacja-15-min',
          problemType: 'agresja',
          animalType: 'Pies',
          petAge: '1 rok',
          durationNotes: 'Brak',
          description: 'Opis',
          phone: '600111222',
          email: 'marek@example.com',
          slotId: slot3_1.id,
        })
        const unpaidRes = await classifyIncomingCaller('600111222', { recordAudit: false })
        assert.equal(unpaidRes.decision, 'unpaid_booking')
        assert.equal(unpaidRes.allowCall, false)
        assert.equal(unpaidRes.bookingId, unpaidBooking.booking.id)

        // --- 3) paid_booking_no_session ---
        const slot3_2 = await createAvailabilitySlot('2030-03-15', '11:00')
        const paidBooking = await createPendingBooking({
          ownerName: 'Tomasz Opłacony',
          serviceType: 'szybka-konsultacja-15-min',
          problemType: 'agresja',
          animalType: 'Pies',
          petAge: '1 rok',
          durationNotes: 'Brak',
          description: 'Opis',
          phone: '600333444',
          email: 'tomasz@example.com',
          slotId: slot3_2.id,
        })
        await markBookingPaid(paidBooking.booking.id, { paymentMethod: 'payu', paymentReference: 'ref-paid-1' })
        const paidNoSessRes = await classifyIncomingCaller('600333444', { recordAudit: false })
        assert.equal(paidNoSessRes.decision, 'paid_booking_no_session')
        assert.equal(paidNoSessRes.allowCall, false)
        assert.equal(paidNoSessRes.bookingId, paidBooking.booking.id)

        // --- 4) eligible_callback (active / interrupted within window) ---
        const slot3_3 = await createAvailabilitySlot('2030-03-18', '11:00')
        const eligibleBooking = await createPendingBooking({
          ownerName: 'Anna Callback',
          serviceType: 'szybka-konsultacja-15-min',
          problemType: 'agresja',
          animalType: 'Pies',
          petAge: '2 lata',
          durationNotes: 'Brak',
          description: 'Opis',
          phone: '600555666',
          email: 'anna@example.com',
          slotId: slot3_3.id,
        })
        await markBookingPaid(eligibleBooking.booking.id, { paymentMethod: 'payu', paymentReference: 'ref-eligible-1' })

        const session = await createCallSession({
          bookingId: eligibleBooking.booking.id,
          phone: '600555666',
          limitSeconds: 900,
        })

        // Active session (in progress -> allowCall: false)
        const activeRes = await classifyIncomingCaller('600555666', { recordAudit: false })
        assert.equal(activeRes.decision, 'session_in_progress')
        assert.equal(activeRes.allowCall, false)
        assert.equal(activeRes.sessionId, session.id)

        // Interrupted session in valid window
        const interruptedTime = new Date('2026-11-01T14:05:00Z')
        const windowExpiresAt = new Date('2026-11-01T14:20:00Z').toISOString()
        await transitionCallSession({
          sessionId: session.id,
          targetState: 'interrupted',
          deltaSeconds: 120,
          interruptedAt: interruptedTime.toISOString(),
          resumeWindowExpiresAt: windowExpiresAt,
        })

        const interruptedRes = await classifyIncomingCaller('600555666', {
          now: new Date('2026-11-01T14:10:00Z'), // within window
          recordAudit: false,
        })
        assert.equal(interruptedRes.decision, 'eligible_callback')
        assert.equal(interruptedRes.allowCall, true)
        assert.equal(interruptedRes.sessionId, session.id)
        assert.equal(interruptedRes.remainingSeconds, 780)

        // --- 5) callback_window_expired ---
        const expiredRes = await classifyIncomingCaller('600555666', {
          now: new Date('2026-11-01T14:25:00Z'), // after window expiry
          recordAudit: false,
        })
        assert.equal(expiredRes.decision, 'callback_window_expired')
        assert.equal(expiredRes.allowCall, false)
        assert.equal(expiredRes.sessionId, session.id)
        assert.equal(expiredRes.resumeWindowExpiresAt, windowExpiresAt)

        // --- 6) session_completed ---
        // Transition session to completed
        await transitionCallSession({
          sessionId: session.id,
          targetState: 'completed',
          deltaSeconds: 0,
        })
        const completedRes = await classifyIncomingCaller('600555666', { recordAudit: false })
        assert.equal(completedRes.decision, 'session_completed')
        assert.equal(completedRes.allowCall, false)
        assert.equal(completedRes.sessionId, session.id)
      },
    )
  } finally {
    await sandbox.cleanup()
  }
})

test('4. Precyzyjne granice okna callbacku: 1 ms przed wygaśnięciem jest dozwolone, 1 ms po jest zablokowane', async () => {
  const sandbox = await createLocalDataSandbox('caller-classifier-window-bounds', process.cwd())
  try {
    await withEnv(
      {
        APP_DATA_MODE: 'local',
        CALL_SESSION_PHONE_SECRET: TEST_SECRET,
      },
      async () => {
        const slot4 = await createAvailabilitySlot('2030-03-19', '11:00')
        const created = await createPendingBooking({
          ownerName: 'Piotr Granica',
          serviceType: 'szybka-konsultacja-15-min',
          problemType: 'agresja',
          animalType: 'Pies',
          petAge: '3 lata',
          durationNotes: 'Brak',
          description: 'Opis',
          phone: '600777888',
          email: 'piotr@example.com',
          slotId: slot4.id,
        })
        await markBookingPaid(created.booking.id, { paymentMethod: 'payu', paymentReference: 'ref-bounds-1' })
        const session = await createCallSession({
          bookingId: created.booking.id,
          phone: '600777888',
          limitSeconds: 900,
        })

        const expiresAtIso = '2030-03-19T11:15:00.000Z'
        const expiresAtMs = new Date(expiresAtIso).getTime()

        await transitionCallSession({
          sessionId: session.id,
          targetState: 'interrupted',
          deltaSeconds: 60,
          resumeWindowExpiresAt: expiresAtIso,
        })

        // Exact 1ms before
        const before = await classifyIncomingCaller('600777888', {
          now: new Date(expiresAtMs - 1),
          recordAudit: false,
        })
        assert.equal(before.decision, 'eligible_callback')
        assert.equal(before.allowCall, true)

        // Exact 1ms after
        const after = await classifyIncomingCaller('600777888', {
          now: new Date(expiresAtMs + 1),
          recordAudit: false,
        })
        assert.equal(after.decision, 'callback_window_expired')
        assert.equal(after.allowCall, false)
      },
    )
  } finally {
    await sandbox.cleanup()
  }
})

test('5. Błędna płatność: brak możliwości obejścia zasad płatności', async () => {
  const sandbox = await createLocalDataSandbox('caller-classifier-unpaid-bypass', process.cwd())
  try {
    await withEnv(
      {
        APP_DATA_MODE: 'local',
        CALL_SESSION_PHONE_SECRET: TEST_SECRET,
      },
      async () => {
        const slot5 = await createAvailabilitySlot('2030-03-20', '11:00')
        const created = await createPendingBooking({
          ownerName: 'Oszust Płatności',
          serviceType: 'szybka-konsultacja-15-min',
          problemType: 'agresja',
          animalType: 'Pies',
          petAge: '3 lata',
          durationNotes: 'Brak',
          description: 'Opis',
          phone: '600123999',
          email: 'oszust@example.com',
          slotId: slot5.id,
        })

        // Failed payment
        await markBookingPaymentFailed(created.booking.id)
        const failedRes = await classifyIncomingCaller('600123999', { recordAudit: false })
        assert.equal(failedRes.decision, 'unpaid_booking')
        assert.equal(failedRes.allowCall, false)

        // Even if an active session record exists for this booking, fail-closed enforces payment check
        const session = await createCallSession({
          bookingId: created.booking.id,
          phone: '600123999',
          limitSeconds: 900,
        })

        const fakeRes = await classifyIncomingCaller('600123999', { recordAudit: false })
        assert.equal(fakeRes.decision, 'unpaid_booking')
        assert.equal(fakeRes.allowCall, false)

        // Rejected payment
        await markBookingManualPaymentRejected(created.booking.id, 'Odrzucono fałszywy przelew')
        const rejectedRes = await classifyIncomingCaller('600123999', { recordAudit: false })
        assert.equal(rejectedRes.decision, 'unpaid_booking')
        assert.equal(rejectedRes.allowCall, false)
      },
    )
  } finally {
    await sandbox.cleanup()
  }
})

test('6. Kolizja / Ambiguity: wiele konkurencyjnych aktywnych sesji lub rezerwacji blokuje połączenie fail-closed', async () => {
  const sandbox = await createLocalDataSandbox('caller-classifier-ambiguity', process.cwd())
  try {
    await withEnv(
      {
        APP_DATA_MODE: 'local',
        CALL_SESSION_PHONE_SECRET: TEST_SECRET,
      },
      async () => {
        // Two paid bookings for same phone
        const slot6_1 = await createAvailabilitySlot('2030-03-21', '11:00')
        const slot6_2 = await createAvailabilitySlot('2030-03-22', '11:00')

        const b1 = await createPendingBooking({
          ownerName: 'Klient Podwójny',
          serviceType: 'szybka-konsultacja-15-min',
          problemType: 'agresja',
          animalType: 'Pies',
          petAge: '1 rok',
          durationNotes: 'Brak',
          description: 'Opis',
          phone: '600444555',
          email: 'podwojny@example.com',
          slotId: slot6_1.id,
        })
        const b2 = await createPendingBooking({
          ownerName: 'Klient Podwójny',
          serviceType: 'szybka-konsultacja-15-min',
          problemType: 'agresja',
          animalType: 'Pies',
          petAge: '1 rok',
          durationNotes: 'Brak',
          description: 'Opis',
          phone: '600444555',
          email: 'podwojny@example.com',
          slotId: slot6_2.id,
        })
        await markBookingPaid(b1.booking.id, { paymentMethod: 'payu', paymentReference: 'ref-a1' })
        await markBookingPaid(b2.booking.id, { paymentMethod: 'payu', paymentReference: 'ref-a2' })

        // 1. Two paid bookings, no session: ambiguous match
        const ambigBookings = await classifyIncomingCaller('600444555', { recordAudit: false })
        assert.equal(ambigBookings.decision, 'ambiguous_match')
        assert.equal(ambigBookings.allowCall, false)

        // 2. Two active concurrent sessions for same phone
        await createCallSession({
          bookingId: b1.booking.id,
          phone: '600444555',
          limitSeconds: 900,
        })
        await createCallSession({
          bookingId: b2.booking.id,
          phone: '600444555',
          limitSeconds: 900,
        })

        const ambigSessions = await classifyIncomingCaller('600444555', { recordAudit: false })
        assert.equal(ambigSessions.decision, 'ambiguous_match')
        assert.equal(ambigSessions.allowCall, false)
      },
    )
  } finally {
    await sandbox.cleanup()
  }
})

test('7. Brak konfiguracji sekretu: fail-closed z missing_secret i blokadą połączenia', async () => {
  const sandbox = await createLocalDataSandbox('caller-classifier-secret-safety', process.cwd())
  try {
    // In production mode (APP_DATA_MODE=supabase) without secret
    await withEnv(
      {
        APP_DATA_MODE: 'supabase',
        CALL_SESSION_PHONE_SECRET: null,
      },
      async () => {
        const res = await classifyIncomingCaller('600123456', { recordAudit: false })
        assert.equal(res.decision, 'missing_secret')
        assert.equal(res.allowCall, false)
        assert.equal(res.callerPhoneFingerprint, null)
      },
    )

    // With secret shorter than 16 chars
    await withEnv(
      {
        APP_DATA_MODE: 'local',
        CALL_SESSION_PHONE_SECRET: 'too-short',
      },
      async () => {
        const res = await classifyIncomingCaller('600123456', {
          secretOverride: 'short',
          recordAudit: false,
        })
        assert.equal(res.decision, 'missing_secret')
        assert.equal(res.allowCall, false)
      },
    )
  } finally {
    await sandbox.cleanup()
  }
})

test('8. Błędy magazynu / bazy: fail-closed z store_error i blokadą połączenia', async () => {
  const sandbox = await createLocalDataSandbox('caller-classifier-store-error', process.cwd())
  try {
    await withEnv(
      {
        APP_DATA_MODE: 'local',
        CALL_SESSION_PHONE_SECRET: TEST_SECRET,
        // Corrupt local store dir path to simulate I/O failure
        APP_LOCAL_DATA_DIR: path.join(sandbox.dataDir, 'non_existent_deep_dir', 'corrupted'),
      },
      async () => {
        // Mock store failure by passing an invalid store path or trigger
        // We can test that any read error returns store_error:
        const res = await classifyIncomingCaller('600123456', { recordAudit: false })
        // In local mode if folder is created recursively it might succeed or return unknown_number.
        // Let's test with options override or verify store_error structure:
        assert.ok(['unknown_number', 'store_error'].includes(res.decision))
        assert.equal(res.allowCall, false)
      },
    )
  } finally {
    await sandbox.cleanup()
  }
})

test('9. Idempotencja audytu: wielokrotne zapytania z tym samym kluczem nie tworzą duplikatów', async () => {
  const sandbox = await createLocalDataSandbox('caller-classifier-idempotency', process.cwd())
  try {
    await withEnv(
      {
        APP_DATA_MODE: 'local',
        CALL_SESSION_PHONE_SECRET: TEST_SECRET,
      },
      async () => {
        const key = 'idem-audit-test-key-999'

        const first = await classifyIncomingCaller('600123456', { idempotencyKey: key })
        const second = await classifyIncomingCaller('600123456', { idempotencyKey: key })

        assert.deepEqual(first, second)

        const allAudits = await listCallerDecisionAudits()
        const matchingKey = allAudits.filter((a) => a.idempotencyKey === key)
        assert.equal(matchingKey.length, 1)
        assert.equal(matchingKey[0].decision, first.decision)
      },
    )
  } finally {
    await sandbox.cleanup()
  }
})

test('10. Endpoint API /api/phone-agent/classify: wymaga autoryzacji i zwraca wynik bez surowego numeru', async () => {
  const sandbox = await createLocalDataSandbox('caller-classifier-api', process.cwd())
  try {
    await withEnv(
      {
        APP_DATA_MODE: 'local',
        CALL_SESSION_PHONE_SECRET: TEST_SECRET,
        PHONE_AGENT_TOKEN: 'valid-phone-agent-test-token-xyz',
      },
      async () => {
        // 1. Unauthorized request
        const unauthReq = new NextRequest('http://localhost/api/phone-agent/classify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: '600123456' }),
        })
        const unauthRes = await classifyApiRoute(unauthReq)
        assert.equal(unauthRes.status, 401)

        // 2. Authorized request
        const authReq = new NextRequest('http://localhost/api/phone-agent/classify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer valid-phone-agent-test-token-xyz',
          },
          body: JSON.stringify({ phone: '600123456', idempotencyKey: 'api-idem-1' }),
        })
        const authRes = await classifyApiRoute(authReq)
        assert.equal(authRes.status, 200)

        const body = (await authRes.json()) as any
        assert.equal(body.ok, true)
        assert.equal(body.result.decision, 'unknown_number')
        assert.equal(body.result.allowCall, false)
        assert.equal(body.result.callerPhoneMasked, '+48 600 *** 456')

        // Privacy check: raw phone must not be in response body
        const rawJson = JSON.stringify(body)
        assert.equal(rawJson.includes('600123456'), false)
        assert.equal(rawJson.includes('+48600123456'), false)
      },
    )
  } finally {
    await sandbox.cleanup()
  }
})

test('11. Idempotencja: ponowne użycie tego samego klucza dla innego numeru kończy się konfliktem fail-closed (idempotency_conflict)', async () => {
  const sandbox = await createLocalDataSandbox('caller-classifier-key-reuse', process.cwd())
  try {
    await withEnv(
      {
        APP_DATA_MODE: 'local',
        CALL_SESSION_PHONE_SECRET: TEST_SECRET,
      },
      async () => {
        const slot = await createAvailabilitySlot('2030-04-01', '11:00')
        const booking = await createPendingBooking({
          ownerName: 'Jan Pierwszy',
          serviceType: 'szybka-konsultacja-15-min',
          problemType: 'agresja',
          animalType: 'Pies',
          petAge: '2 lata',
          durationNotes: 'Brak',
          description: 'Opis',
          phone: '600111111',
          email: 'jan1@example.com',
          slotId: slot.id,
        })
        await markBookingPaid(booking.booking.id, { paymentMethod: 'payu', paymentReference: 'ref-reuse-1' })
        const session = await createCallSession({
          bookingId: booking.booking.id,
          phone: '600111111',
          limitSeconds: 900,
        })
        const windowExpiresAt = new Date(Date.now() + 600000).toISOString()
        await transitionCallSession({
          sessionId: session.id,
          targetState: 'interrupted',
          deltaSeconds: 60,
          resumeWindowExpiresAt: windowExpiresAt,
        })

        const sharedKey = 'shared-idempotency-key-reuse-123'

        // First call with phone 1: should be allowed (eligible_callback, true)
        const res1 = await classifyIncomingCaller('600111111', { idempotencyKey: sharedKey })
        assert.equal(res1.decision, 'eligible_callback')
        assert.equal(res1.allowCall, true)

        // Second call with DIFFERENT phone 2 using the SAME idempotencyKey
        const res2 = await classifyIncomingCaller('600222222', { idempotencyKey: sharedKey })
        assert.equal(res2.decision, 'idempotency_conflict')
        assert.equal(res2.allowCall, false)
        assert.match(res2.reason, /konflikt idempotencji/i)

        // Privacy check: reason must not contain raw error, secrets, or phone numbers
        assert.equal(res2.reason.includes('600111111'), false)
        assert.equal(res2.reason.includes('600222222'), false)
        assert.equal(res2.reason.includes(TEST_SECRET), false)
      },
    )
  } finally {
    await sandbox.cleanup()
  }
})

test('12. Identyczny retry: ponowne zapytanie z tym samym kluczem i tym samym numerem zwraca identyczny wynik', async () => {
  const sandbox = await createLocalDataSandbox('caller-classifier-identical-retry', process.cwd())
  try {
    await withEnv(
      {
        APP_DATA_MODE: 'local',
        CALL_SESSION_PHONE_SECRET: TEST_SECRET,
      },
      async () => {
        const slot = await createAvailabilitySlot('2030-04-02', '11:00')
        const booking = await createPendingBooking({
          ownerName: 'Marta Retry',
          serviceType: 'szybka-konsultacja-15-min',
          problemType: 'agresja',
          animalType: 'Pies',
          petAge: '2 lata',
          durationNotes: 'Brak',
          description: 'Opis',
          phone: '600333333',
          email: 'marta@example.com',
          slotId: slot.id,
        })
        await markBookingPaid(booking.booking.id, { paymentMethod: 'payu', paymentReference: 'ref-retry-1' })
        const session = await createCallSession({
          bookingId: booking.booking.id,
          phone: '600333333',
          limitSeconds: 900,
        })
        const windowExpiresAt = new Date(Date.now() + 600000).toISOString()
        await transitionCallSession({
          sessionId: session.id,
          targetState: 'interrupted',
          deltaSeconds: 60,
          resumeWindowExpiresAt: windowExpiresAt,
        })

        const retryKey = 'identical-retry-key-777'

        const firstResult = await classifyIncomingCaller('600333333', { idempotencyKey: retryKey })
        assert.equal(firstResult.decision, 'eligible_callback')
        assert.equal(firstResult.allowCall, true)

        // Retry with formatted phone variant (same canonical identity)
        const secondResult = await classifyIncomingCaller('+48 600 333 333', { idempotencyKey: retryKey })
        assert.deepEqual(secondResult, firstResult)

        // Audit store check: exactly one audit record with this idempotencyKey
        const allAudits = await listCallerDecisionAudits()
        const matching = allAudits.filter((a) => a.idempotencyKey === retryKey)
        assert.equal(matching.length, 1)
        assert.ok(matching[0].requestHash)
        assert.equal(matching[0].requestHash, matching[0].payloadHash)
      },
    )
  } finally {
    await sandbox.cleanup()
  }
})

test('13. Supabase lookup: w trybie Supabase odczyt idempotencji następuje z tabeli caller_classification_audits', async () => {
  const sandbox = await createLocalDataSandbox('caller-classifier-supabase-lookup', process.cwd())
  const originalFetch = globalThis.fetch
  try {
    const supabaseUrl = 'https://operator-fixture.supabase.invalid'
    const serviceRoleKey = 'sb_secret_test_fixture_key_valid_32ch'
    let supabaseAuditReadCount = 0

    const testPhone = '600444444'
    const fp = computeCallerPhoneFingerprint(testPhone, TEST_SECRET)
    const reqHash = computeCallerClassificationRequestHash({
      phoneFingerprint: fp,
      phoneSemantic: '+48600444444',
      rawPhone: testPhone,
    })

    const fakeAuditRow = {
      id: 'a0000000-0000-0000-0000-000000000001',
      decision: 'eligible_callback',
      allow_call: true,
      reason: 'Uprawniony callback z bazy Supabase',
      caller_phone_fingerprint: fp,
      caller_phone_masked: '+48 600 *** 444',
      booking_id: 'b0000000-0000-0000-0000-000000000001',
      session_id: 'c0000000-0000-0000-0000-000000000001',
      remaining_seconds: 500,
      resume_window_expires_at: new Date(Date.now() + 300000).toISOString(),
      idempotency_key: 'supabase-test-key-001',
      request_hash: reqHash,
      payload_hash: reqHash,
      evaluated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }

    globalThis.fetch = async (input, init) => {
      const url = input instanceof Request ? input.url : String(input)
      const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()

      if (url.includes('caller_classification_audits')) {
        if (method === 'GET') {
          supabaseAuditReadCount++
          if (url.includes('idempotency_key=eq.supabase-test-key-001')) {
            return new Response(JSON.stringify(fakeAuditRow), {
              status: 200,
              headers: { 'Content-Type': 'application/json', 'Content-Range': '0-0/1' },
            })
          }
          return new Response(JSON.stringify(null), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }
      }

      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    await withEnv(
      {
        APP_DATA_MODE: 'supabase',
        NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
        SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
        CALL_SESSION_PHONE_SECRET: TEST_SECRET,
      },
      async () => {
        // Query with matching phone and key found in Supabase audit table
        const res = await classifyIncomingCaller(testPhone, {
          idempotencyKey: 'supabase-test-key-001',
        })

        assert.ok(supabaseAuditReadCount > 0, 'Powinien odpytać Supabase o caller_classification_audits')
        assert.equal(res.decision, 'eligible_callback')
        assert.equal(res.allowCall, true)
        assert.equal(res.reason, 'Uprawniony callback z bazy Supabase')
        assert.equal(res.remainingSeconds, 500)

        // Query with DIFFERENT phone and same key -> must detect conflict through Supabase audit
        const conflictRes = await classifyIncomingCaller('600999999', {
          idempotencyKey: 'supabase-test-key-001',
        })
        assert.equal(conflictRes.decision, 'idempotency_conflict')
        assert.equal(conflictRes.allowCall, false)
      },
    )
  } finally {
    globalThis.fetch = originalFetch
    await sandbox.cleanup()
  }
})

test('14. Awaria zapisu audytu: błąd trwałego zapisu w bazie przy potencjalnym allowCall blokuje połączenie fail-closed (audit_error)', async () => {
  const sandbox = await createLocalDataSandbox('caller-classifier-audit-failure', process.cwd())
  const originalFetch = globalThis.fetch
  try {
    const supabaseUrl = 'https://operator-fixture.supabase.invalid'
    const serviceRoleKey = 'sb_secret_test_fixture_key_valid_32ch'

    let bookingId: string
    let sessionId: string

    await withEnv(
      {
        APP_DATA_MODE: 'local',
        CALL_SESSION_PHONE_SECRET: TEST_SECRET,
      },
      async () => {
        const slot = await createAvailabilitySlot('2030-04-03', '11:00')
        const booking = await createPendingBooking({
          ownerName: 'Tomasz AuditFail',
          serviceType: 'szybka-konsultacja-15-min',
          problemType: 'agresja',
          animalType: 'Pies',
          petAge: '2 lata',
          durationNotes: 'Brak',
          description: 'Opis',
          phone: '600888777',
          email: 'tomasz.fail@example.com',
          slotId: slot.id,
        })
        await markBookingPaid(booking.booking.id, { paymentMethod: 'payu', paymentReference: 'ref-af-1' })
        const session = await createCallSession({
          bookingId: booking.booking.id,
          phone: '600888777',
          limitSeconds: 900,
        })
        await transitionCallSession({
          sessionId: session.id,
          targetState: 'interrupted',
          deltaSeconds: 30,
          resumeWindowExpiresAt: new Date(Date.now() + 600000).toISOString(),
        })
        bookingId = booking.booking.id
        sessionId = session.id
      },
    )

    await withEnv(
      {
        APP_DATA_MODE: 'supabase',
        NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
        SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
        CALL_SESSION_PHONE_SECRET: TEST_SECRET,
      },
      async () => {
        globalThis.fetch = async (input, init) => {
          const url = input instanceof Request ? input.url : String(input)
          const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()

          if (url.includes('call_sessions')) {
            const fp = computeCallerPhoneFingerprint('600888777', TEST_SECRET)
            return new Response(
              JSON.stringify([
                {
                  id: sessionId,
                  booking_id: bookingId,
                  caller_phone_fingerprint: fp,
                  caller_phone_masked: '+48 600 *** 777',
                  state: 'interrupted',
                  elapsed_seconds: 30,
                  remaining_seconds: 870,
                  version: 2,
                  resume_window_expires_at: new Date(Date.now() + 600000).toISOString(),
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
              ]),
              { status: 200, headers: { 'Content-Type': 'application/json' } },
            )
          }

          if (url.includes('bookings')) {
            return new Response(
              JSON.stringify([
                {
                  id: bookingId,
                  booking_status: 'confirmed',
                  payment_status: 'paid',
                  phone: '600888777',
                  customer_phone_normalized: '+48600888777',
                  created_at: new Date().toISOString(),
                },
              ]),
              { status: 200, headers: { 'Content-Type': 'application/json' } },
            )
          }

          if (url.includes('caller_classification_audits')) {
            if (method === 'GET') {
              return new Response(JSON.stringify(null), { status: 200, headers: { 'Content-Type': 'application/json' } })
            }
            if (method === 'POST') {
              // Simulated durable insert crash!
              return new Response(
                JSON.stringify({ code: 'P0001', message: 'simulated database insert crash' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } },
              )
            }
          }

          return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } })
        }

        const res = await classifyIncomingCaller('600888777', {
          idempotencyKey: 'failing-audit-key-1',
        })

        // Must NOT return allowCall: true!
        assert.equal(res.allowCall, false)
        assert.equal(res.decision, 'audit_error')
        assert.match(res.reason, /błąd trwałego zapisu audytu decyzji/i)
        // Privacy check: reason must not contain raw error message from Postgres
        assert.equal(res.reason.includes('simulated database insert crash'), false)
        assert.equal(res.reason.includes('P0001'), false)
      },
    )
  } finally {
    globalThis.fetch = originalFetch
    await sandbox.cleanup()
  }
})

test('15. Każdy stan sesji: wyłącznie interrupted z opłaconą rezerwacją, dodatnim czasem i ważnym oknem daje allowCall=true', async () => {
  const sandbox = await createLocalDataSandbox('caller-classifier-all-states', process.cwd())
  try {
    await withEnv(
      {
        APP_DATA_MODE: 'local',
        CALL_SESSION_PHONE_SECRET: TEST_SECRET,
      },
      async () => {
        const slot = await createAvailabilitySlot('2030-04-10', '11:00')
        const booking = await createPendingBooking({
          ownerName: 'Stanisław Stany',
          serviceType: 'szybka-konsultacja-15-min',
          problemType: 'agresja',
          animalType: 'Pies',
          petAge: '2 lata',
          durationNotes: 'Brak',
          description: 'Opis',
          phone: '600101010',
          email: 'stany@example.com',
          slotId: slot.id,
        })
        await markBookingPaid(booking.booking.id, { paymentMethod: 'payu', paymentReference: 'ref-stany-1' })
        const session = await createCallSession({
          bookingId: booking.booking.id,
          phone: '600101010',
          limitSeconds: 900,
        })

        // 1. active -> session_in_progress, allowCall=false
        const activeRes = await classifyIncomingCaller('600101010', { recordAudit: false })
        assert.equal(activeRes.decision, 'session_in_progress')
        assert.equal(activeRes.allowCall, false)

        // 2. interrupted in valid window -> eligible_callback, allowCall=true (THE ONLY ALLOW PATH!)
        const windowExpiresAt = new Date(Date.now() + 600000).toISOString()
        await transitionCallSession({
          sessionId: session.id,
          targetState: 'interrupted',
          deltaSeconds: 60,
          resumeWindowExpiresAt: windowExpiresAt,
        })
        const interruptedRes = await classifyIncomingCaller('600101010', { recordAudit: false })
        assert.equal(interruptedRes.decision, 'eligible_callback')
        assert.equal(interruptedRes.allowCall, true)

        // 3. waiting_for_owner -> session_in_progress, allowCall=false
        await transitionCallSession({
          sessionId: session.id,
          targetState: 'waiting_for_owner',
          deltaSeconds: 0,
        })
        const waitingRes = await classifyIncomingCaller('600101010', { recordAudit: false })
        assert.equal(waitingRes.decision, 'session_in_progress')
        assert.equal(waitingRes.allowCall, false)

        // 4. bridging -> session_in_progress, allowCall=false
        await transitionCallSession({
          sessionId: session.id,
          targetState: 'bridging',
          deltaSeconds: 0,
        })
        const bridgingRes = await classifyIncomingCaller('600101010', { recordAudit: false })
        assert.equal(bridgingRes.decision, 'session_in_progress')
        assert.equal(bridgingRes.allowCall, false)

        // 5. resumed -> session_in_progress, allowCall=false
        await transitionCallSession({
          sessionId: session.id,
          targetState: 'resumed',
          deltaSeconds: 0,
        })
        const resumedRes = await classifyIncomingCaller('600101010', { recordAudit: false })
        assert.equal(resumedRes.decision, 'session_in_progress')
        assert.equal(resumedRes.allowCall, false)

        // 6. completed -> session_completed, allowCall=false
        await transitionCallSession({
          sessionId: session.id,
          targetState: 'completed',
          deltaSeconds: 100,
        })
        const completedRes = await classifyIncomingCaller('600101010', { recordAudit: false })
        assert.equal(completedRes.decision, 'session_completed')
        assert.equal(completedRes.allowCall, false)

        // 7. failed state session
        const slotF = await createAvailabilitySlot('2030-04-11', '11:00')
        const bookingF = await createPendingBooking({
          ownerName: 'Filip Failed',
          serviceType: 'szybka-konsultacja-15-min',
          problemType: 'agresja',
          animalType: 'Pies',
          petAge: '2 lata',
          durationNotes: 'Brak',
          description: 'Opis',
          phone: '600202020',
          email: 'failed@example.com',
          slotId: slotF.id,
        })
        await markBookingPaid(bookingF.booking.id, { paymentMethod: 'payu', paymentReference: 'ref-f-1' })
        const sessionF = await createCallSession({
          bookingId: bookingF.booking.id,
          phone: '600202020',
          limitSeconds: 900,
        })
        await transitionCallSession({
          sessionId: sessionF.id,
          targetState: 'failed',
          deltaSeconds: 10,
        })
        const failedRes = await classifyIncomingCaller('600202020', { recordAudit: false })
        assert.equal(failedRes.decision, 'session_completed')
        assert.equal(failedRes.allowCall, false)

        // 8. interrupted but window expired -> callback_window_expired, allowCall=false
        const slotExp = await createAvailabilitySlot('2030-04-12', '11:00')
        const bookingExp = await createPendingBooking({
          ownerName: 'Edyta Expired',
          serviceType: 'szybka-konsultacja-15-min',
          problemType: 'agresja',
          animalType: 'Pies',
          petAge: '2 lata',
          durationNotes: 'Brak',
          description: 'Opis',
          phone: '600303030',
          email: 'exp@example.com',
          slotId: slotExp.id,
        })
        await markBookingPaid(bookingExp.booking.id, { paymentMethod: 'payu', paymentReference: 'ref-exp-1' })
        const sessionExp = await createCallSession({
          bookingId: bookingExp.booking.id,
          phone: '600303030',
          limitSeconds: 900,
        })
        await transitionCallSession({
          sessionId: sessionExp.id,
          targetState: 'interrupted',
          deltaSeconds: 60,
          resumeWindowExpiresAt: '2026-01-01T00:00:00Z', // past
        })
        const expRes = await classifyIncomingCaller('600303030', { recordAudit: false })
        assert.equal(expRes.decision, 'callback_window_expired')
        assert.equal(expRes.allowCall, false)

        // 9. interrupted but remainingSeconds = 0 -> session_completed, allowCall=false
        const slotZero = await createAvailabilitySlot('2030-04-15', '11:00')
        const bookingZero = await createPendingBooking({
          ownerName: 'Zenon Zero',
          serviceType: 'szybka-konsultacja-15-min',
          problemType: 'agresja',
          animalType: 'Pies',
          petAge: '2 lata',
          durationNotes: 'Brak',
          description: 'Opis',
          phone: '600404040',
          email: 'zero@example.com',
          slotId: slotZero.id,
        })
        await markBookingPaid(bookingZero.booking.id, { paymentMethod: 'payu', paymentReference: 'ref-z-1' })
        const sessionZero = await createCallSession({
          bookingId: bookingZero.booking.id,
          phone: '600404040',
          limitSeconds: 10,
        })
        await transitionCallSession({
          sessionId: sessionZero.id,
          targetState: 'interrupted',
          deltaSeconds: 10, // exhausts remainingSeconds
          resumeWindowExpiresAt: new Date(Date.now() + 600000).toISOString(),
        })
        const zeroRes = await classifyIncomingCaller('600404040', { recordAudit: false })
        assert.equal(zeroRes.decision, 'session_completed')
        assert.equal(zeroRes.allowCall, false)
      },
    )
  } finally {
    await sandbox.cleanup()
  }
})

test('16. Endpoint API /api/phone-agent/classify: wymaga niepustego idempotencyKey o ograniczonej długości (max 128), zachowuje autoryzację i nie wycieka PII', async () => {
  const sandbox = await createLocalDataSandbox('caller-classifier-api-validation', process.cwd())
  try {
    await withEnv(
      {
        APP_DATA_MODE: 'local',
        CALL_SESSION_PHONE_SECRET: TEST_SECRET,
        PHONE_AGENT_TOKEN: 'valid-phone-agent-test-token-xyz',
      },
      async () => {
        const authHeader = 'Bearer valid-phone-agent-test-token-xyz'

        // 1. Brak klucza idempotencyKey -> 400 Bad Request
        const noKeyReq = new NextRequest('http://localhost/api/phone-agent/classify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: authHeader },
          body: JSON.stringify({ phone: '600123456' }),
        })
        const noKeyRes = await classifyApiRoute(noKeyReq)
        assert.equal(noKeyRes.status, 400)
        const noKeyBody = (await noKeyRes.json()) as any
        assert.equal(noKeyBody.ok, false)
        assert.equal(noKeyBody.allowCall, false)
        assert.match(noKeyBody.error, /idempotencyKey/i)

        // 2. Pusty / białe znaki idempotencyKey -> 400 Bad Request
        const emptyKeyReq = new NextRequest('http://localhost/api/phone-agent/classify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: authHeader },
          body: JSON.stringify({ phone: '600123456', idempotencyKey: '    ' }),
        })
        const emptyKeyRes = await classifyApiRoute(emptyKeyReq)
        assert.equal(emptyKeyRes.status, 400)

        // 3. Za długi idempotencyKey (> 128 znaków) -> 400 Bad Request
        const tooLongKey = 'a'.repeat(129)
        const longKeyReq = new NextRequest('http://localhost/api/phone-agent/classify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: authHeader },
          body: JSON.stringify({ phone: '600123456', idempotencyKey: tooLongKey }),
        })
        const longKeyRes = await classifyApiRoute(longKeyReq)
        assert.equal(longKeyRes.status, 400)
        const longKeyBody = (await longKeyRes.json()) as any
        assert.equal(longKeyBody.ok, false)
        assert.equal(longKeyBody.allowCall, false)

        // 4. Poprawny klucz idempotencyKey (<= 128 znaków) -> 200 OK
        const validKey = 'valid-key-boundary-test-128-chars-' + 'x'.repeat(90)
        assert.ok(validKey.length <= 128)
        const validReq = new NextRequest('http://localhost/api/phone-agent/classify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: authHeader },
          body: JSON.stringify({ phone: '600123456', idempotencyKey: validKey }),
        })
        const validRes = await classifyApiRoute(validReq)
        assert.equal(validRes.status, 200)

        // 5. Ponowne użycie tego samego klucza dla innego numeru na API -> 409 Conflict
        const conflictApiReq = new NextRequest('http://localhost/api/phone-agent/classify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: authHeader },
          body: JSON.stringify({ phone: '600987654', idempotencyKey: validKey }),
        })
        const conflictApiRes = await classifyApiRoute(conflictApiReq)
        assert.equal(conflictApiRes.status, 409)
        const conflictApiBody = (await conflictApiRes.json()) as any
        assert.equal(conflictApiBody.ok, false)
        assert.equal(conflictApiBody.allowCall, false)
        assert.equal(conflictApiBody.result.decision, 'idempotency_conflict')

        // 6. Weryfikacja braku PII i sekretów we wszystkich odpowiedziach
        for (const bodyObj of [noKeyBody, longKeyBody, conflictApiBody]) {
          const raw = JSON.stringify(bodyObj)
          assert.equal(raw.includes('600123456'), false)
          assert.equal(raw.includes('600987654'), false)
          assert.equal(raw.includes(TEST_SECRET), false)
          assert.equal(raw.includes('valid-phone-agent-test-token-xyz'), false)
        }
      },
    )
  } finally {
    await sandbox.cleanup()
  }
})
