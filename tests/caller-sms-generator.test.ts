import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createLocalDataSandbox } from '@/scripts/lib/local-data-sandbox'
import {
  createAvailabilitySlot,
  createPendingBooking,
  markBookingPaid,
  createCallSession,
  transitionCallSession,
  classifyIncomingCaller,
  generateCallerSms,
  evaluateCallerSmsPolicy,
  processCallerSmsForInboundCall,
  listCallerSmsPreparations,
  validateOfficialTargetUrl,
  validateSmsMessageContent,
  computeCallerSmsRequestHash,
  computeCallerSmsIdempotencyKey,
  DEFAULT_OFFICIAL_BOOKING_URL,
  DEFAULT_OFFICIAL_SMS_MESSAGE,
  FALLBACK_OFFICIAL_SMS_MESSAGE,
} from '@/lib/server/db'
import { listSmsQueue } from '@/lib/server/phone-agent-store'
import { POST as callerSmsApiRoute } from '@/app/api/phone-agent/caller-sms/route'
import { NextRequest } from 'next/server'
import type { CallerClassificationResult } from '@/lib/server/caller-classification-types'

const TEST_SECRET = 'super-secret-salt-for-call-sessions-tests-12345'
const TEST_PHONE_AGENT_TOKEN = 'test-phone-agent-token-xyz-1234'
const TEST_PHONE = '600123456'

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

function createDummyClassification(
  decision: any,
  overrides: Partial<CallerClassificationResult> = {},
): CallerClassificationResult {
  return {
    decision,
    allowCall: decision === 'eligible_callback',
    reason: `Test classification for ${decision}`,
    callerPhoneFingerprint: 'call_fp:abcdef1234567890abcdef1234567890',
    callerPhoneMasked: '+48 600 *** 456',
    bookingId: null,
    sessionId: null,
    remainingSeconds: null,
    resumeWindowExpiresAt: null,
    evaluatedAt: new Date().toISOString(),
    ...overrides,
  }
}

test('1. Macierz decyzji: 8 decyzji wykluczonych (blokada fail-closed) oraz 5 decyzji dopuszczalnych', async () => {
  const sandbox = await createLocalDataSandbox('caller-sms-matrix', process.cwd())
  try {
    await withEnv(
      {
        APP_DATA_MODE: 'local',
        CALL_SESSION_PHONE_SECRET: TEST_SECRET,
      },
      async () => {
        // 8 blocked decisions
        const blockedDecisions = [
          'eligible_callback',
          'session_in_progress',
          'ambiguous_match',
          'invalid_phone',
          'missing_secret',
          'store_error',
          'audit_error',
          'idempotency_conflict',
        ] as const

        for (const dec of blockedDecisions) {
          const classification = createDummyClassification(dec)
          const evalRes = evaluateCallerSmsPolicy(classification)

          assert.equal(evalRes.action, 'do_not_send', `Decyzja ${dec} musi wymusić action=do_not_send`)
          assert.equal(evalRes.status, 'do_not_send', `Decyzja ${dec} musi mieć status=do_not_send`)
          assert.equal(evalRes.isAdmissible, false, `Decyzja ${dec} nie może być dopuszczalna`)
          assert.equal(evalRes.message, null, `Decyzja ${dec} nie może generować treści SMS`)
          assert.ok(evalRes.rejectionReason, `Decyzja ${dec} musi mieć uzasadnienie odrzucenia`)

          const prep = await generateCallerSms(classification, { idempotencyKey: `blocked-${dec}` })
          assert.equal(prep.action, 'do_not_send')
          assert.equal(prep.status, 'do_not_send')
          assert.equal(prep.message, null)
          assert.ok(prep.rejectionReason)
        }

        // 5 admissible decisions
        const admissibleDecisions = [
          'unknown_number',
          'session_completed',
          'callback_window_expired',
          'unpaid_booking',
          'paid_booking_no_session',
        ] as const

        for (const dec of admissibleDecisions) {
          const classification = createDummyClassification(dec, {
            callerPhoneFingerprint: `call_fp:admissible_${dec}_fingerprint`,
          })
          const evalRes = evaluateCallerSmsPolicy(classification)

          assert.equal(evalRes.action, 'send', `Decyzja ${dec} musi pozwolić na wysyłkę (action=send)`)
          assert.equal(evalRes.status, 'prepared', `Decyzja ${dec} musi mieć status=prepared`)
          assert.equal(evalRes.isAdmissible, true, `Decyzja ${dec} musi być dopuszczalna`)
          assert.ok(evalRes.message?.includes('https://regulskibehawiorysta.pl/zapytaj'))
          assert.equal(evalRes.targetUrl, 'https://regulskibehawiorysta.pl/zapytaj')
          assert.equal(evalRes.rejectionReason, null)

          const prep = await generateCallerSms(classification, { idempotencyKey: `admissible-${dec}` })
          assert.equal(prep.action, 'send')
          assert.equal(prep.status, 'prepared')
          assert.ok(prep.message?.includes('https://regulskibehawiorysta.pl/zapytaj'))
          assert.equal(prep.targetUrl, 'https://regulskibehawiorysta.pl/zapytaj')
          assert.equal(prep.rejectionReason, null)
        }

        // Unexpected decision must fail closed
        const unexpectedClassification = createDummyClassification('some_future_unhandled_status' as any)
        const unhandledEval = evaluateCallerSmsPolicy(unexpectedClassification)
        assert.equal(unhandledEval.action, 'do_not_send')
        assert.equal(unhandledEval.status, 'do_not_send')
        assert.equal(unhandledEval.isAdmissible, false)
      },
    )
  } finally {
    await sandbox.cleanup()
  }
})

test('2. Exact retry: ponowne wywołanie z tym samym kluczem i identycznymi danymi zwraca ten sam rekord (semantyczna idempotencja)', async () => {
  const sandbox = await createLocalDataSandbox('caller-sms-retry', process.cwd())
  try {
    await withEnv(
      {
        APP_DATA_MODE: 'local',
        CALL_SESSION_PHONE_SECRET: TEST_SECRET,
      },
      async () => {
        const classification = createDummyClassification('unknown_number', {
          callerPhoneFingerprint: 'call_fp:retry_test_fingerprint_123',
        })

        const key = 'idem-exact-retry-key-1'
        const first = await generateCallerSms(classification, { idempotencyKey: key })
        assert.equal(first.action, 'send')
        assert.equal(first.status, 'prepared')

        // Exact retry with same key
        const retry = await generateCallerSms(classification, { idempotencyKey: key })
        assert.equal(retry.id, first.id, 'Identyfikator rekordu musi być identyczny')
        assert.equal(retry.action, first.action)
        assert.equal(retry.status, first.status)
        assert.equal(retry.preparedAt, first.preparedAt)
        assert.equal(retry.requestHash, first.requestHash)
        assert.equal(retry.message, first.message)

        // Verify only 1 record exists in store
        const all = await listCallerSmsPreparations({ fingerprint: classification.callerPhoneFingerprint! })
        assert.equal(all.length, 1)
      },
    )
  } finally {
    await sandbox.cleanup()
  }
})

test('3. Konflikt idempotencji: ten sam klucz dla innego payloadu/telefonu blokuje operację (fail-closed)', async () => {
  const sandbox = await createLocalDataSandbox('caller-sms-conflict', process.cwd())
  try {
    await withEnv(
      {
        APP_DATA_MODE: 'local',
        CALL_SESSION_PHONE_SECRET: TEST_SECRET,
      },
      async () => {
        const classificationA = createDummyClassification('unknown_number', {
          callerPhoneFingerprint: 'call_fp:phone_a_fingerprint',
          callerPhoneMasked: '+48 600 *** 111',
        })
        const classificationB = createDummyClassification('unknown_number', {
          callerPhoneFingerprint: 'call_fp:phone_b_fingerprint',
          callerPhoneMasked: '+48 600 *** 222',
        })

        const sharedKey = 'shared-conflict-key-999'

        // First call succeeds
        const first = await generateCallerSms(classificationA, { idempotencyKey: sharedKey })
        assert.equal(first.action, 'send')
        assert.equal(first.status, 'prepared')

        // Second call with same key but different phone/fingerprint -> Conflict
        const conflict = await generateCallerSms(classificationB, { idempotencyKey: sharedKey })
        assert.equal(conflict.action, 'do_not_send')
        assert.equal(conflict.status, 'do_not_send')
        assert.match(conflict.rejectionReason ?? '', /idempotency_conflict/i)
      },
    )
  } finally {
    await sandbox.cleanup()
  }
})

test('4. Współbieżność: równoległe wywołania dla tego samego numeru przygotowują dokładnie 1 SMS, a resztę blokują limitem 1/24h', async () => {
  const sandbox = await createLocalDataSandbox('caller-sms-concurrency', process.cwd())
  try {
    await withEnv(
      {
        APP_DATA_MODE: 'local',
        CALL_SESSION_PHONE_SECRET: TEST_SECRET,
      },
      async () => {
        const classification = createDummyClassification('unknown_number', {
          callerPhoneFingerprint: 'call_fp:concurrent_test_fingerprint_555',
        })

        // Launch 10 parallel requests with different idempotency keys
        const results = await Promise.all(
          Array.from({ length: 10 }, (_, i) =>
            generateCallerSms(classification, { idempotencyKey: `conc-key-${i}` }),
          ),
        )

        const preparedCount = results.filter((r) => r.action === 'send' && r.status === 'prepared').length
        const rateLimitedCount = results.filter(
          (r) => r.action === 'do_not_send' && r.rejectionReason?.includes('rate_limit_exceeded'),
        ).length

        assert.equal(preparedCount, 1, 'Dokładnie jedno współbieżne żądanie może zostać przygotowane (prepared)')
        assert.equal(rateLimitedCount, 9, 'Pozostałe 9 żądań musi zostać odrzuconych przez limit 1/24h')

        // Verify store has exactly 1 prepared item for this fingerprint
        const all = await listCallerSmsPreparations({ fingerprint: classification.callerPhoneFingerprint! })
        const storePrepared = all.filter((r) => r.status === 'prepared')
        assert.equal(storePrepared.length, 1)
      },
    )
  } finally {
    await sandbox.cleanup()
  }
})

test('5. Granica 24 godzin: w oknie <24h blokada, po upływie >24h dopuszczenie przygotowania kolejnego SMS', async () => {
  const sandbox = await createLocalDataSandbox('caller-sms-24h-boundary', process.cwd())
  try {
    await withEnv(
      {
        APP_DATA_MODE: 'local',
        CALL_SESSION_PHONE_SECRET: TEST_SECRET,
      },
      async () => {
        const fingerprint = 'call_fp:boundary_24h_test_fingerprint'
        const t0 = new Date('2026-10-11T12:00:00.000Z')

        const classification1 = createDummyClassification('unknown_number', {
          callerPhoneFingerprint: fingerprint,
          evaluatedAt: t0.toISOString(),
        })

        // 1. Initial SMS at T0
        const sms1 = await generateCallerSms(classification1, {
          idempotencyKey: 'boundary-key-t0',
          now: t0,
        })
        assert.equal(sms1.action, 'send')
        assert.equal(sms1.status, 'prepared')

        // 2. Call at T0 + 23 hours (within 24h window) -> BLOCKED by rate limit
        const t23h = new Date('2026-10-12T11:00:00.000Z')
        const classification2 = createDummyClassification('unknown_number', {
          callerPhoneFingerprint: fingerprint,
          evaluatedAt: t23h.toISOString(),
        })
        const sms2 = await generateCallerSms(classification2, {
          idempotencyKey: 'boundary-key-t23h',
          now: t23h,
        })
        assert.equal(sms2.action, 'do_not_send')
        assert.equal(sms2.status, 'do_not_send')
        assert.match(sms2.rejectionReason ?? '', /rate_limit_exceeded/i)

        // 3. Call at T0 + 24 hours + 1 minute (outside 24h window) -> ALLOWED
        const t24h1m = new Date('2026-10-12T12:01:00.000Z')
        const classification3 = createDummyClassification('unknown_number', {
          callerPhoneFingerprint: fingerprint,
          evaluatedAt: t24h1m.toISOString(),
        })
        const sms3 = await generateCallerSms(classification3, {
          idempotencyKey: 'boundary-key-t24h1m',
          now: t24h1m,
        })
        assert.equal(sms3.action, 'send')
        assert.equal(sms3.status, 'prepared')
      },
    )
  } finally {
    await sandbox.cleanup()
  }
})

test('6. Allowlista domeny, protokołu i ścieżki: zły host, http, niepoprawna ścieżka lub port są odrzucane fail-closed', async () => {
  const sandbox = await createLocalDataSandbox('caller-sms-url-allowlist', process.cwd())
  try {
    await withEnv(
      {
        APP_DATA_MODE: 'local',
        CALL_SESSION_PHONE_SECRET: TEST_SECRET,
      },
      async () => {
        const classification = createDummyClassification('unknown_number')

        const invalidUrls = [
          'http://regulskibehawiorysta.pl/zapytaj', // not https
          'https://evil.com/zapytaj', // bad host
          'https://phishing.regulskibehawiorysta.pl/zapytaj', // unauthorized subdomain
          'https://regulskibehawiorysta.pl/admin', // unauthorized path
          'https://regulskibehawiorysta.pl/termin', // redirect instead of direct approved /zapytaj
          'https://regulskibehawiorysta.pl:8080/zapytaj', // non-standard port
          'https://user:pass@regulskibehawiorysta.pl/zapytaj', // credentials in URL
          'https://regulskibehawiorysta.pl/zapytaj?token=pii123', // query params prohibited
          'ftp://regulskibehawiorysta.pl/zapytaj', // wrong scheme
          'javascript:alert(1)', // script injection
          '', // empty string
        ]

        for (const badUrl of invalidUrls) {
          const evalRes = evaluateCallerSmsPolicy(classification, { targetUrlOverride: badUrl })
          assert.equal(evalRes.action, 'do_not_send', `URL "${badUrl}" musi być zablokowany`)
          assert.equal(evalRes.status, 'do_not_send')
          assert.match(evalRes.rejectionReason ?? '', /Niedozwolony adres URL/i)

          const prep = await generateCallerSms(classification, {
            idempotencyKey: `bad-url-${badUrl.slice(0, 15)}`,
            targetUrlOverride: badUrl,
          })
          assert.equal(prep.action, 'do_not_send')
          assert.equal(prep.status, 'do_not_send')
        }

        // Official approved URL succeeds
        const approved = validateOfficialTargetUrl('https://regulskibehawiorysta.pl/zapytaj')
        assert.equal(approved.isValid, true)
        assert.equal(approved.url, 'https://regulskibehawiorysta.pl/zapytaj')
      },
    )
  } finally {
    await sandbox.cleanup()
  }
})

test('7. Limit długości SMS i bezpieczny fallback: treść >160 znaków automatycznie wraca do bezpiecznego fallbacku', async () => {
  const sandbox = await createLocalDataSandbox('caller-sms-length', process.cwd())
  try {
    await withEnv(
      {
        APP_DATA_MODE: 'local',
        CALL_SESSION_PHONE_SECRET: TEST_SECRET,
      },
      async () => {
        const classification = createDummyClassification('unknown_number')

        // Default template length check
        assert.ok(DEFAULT_OFFICIAL_SMS_MESSAGE.length <= 160)
        assert.ok(FALLBACK_OFFICIAL_SMS_MESSAGE.length <= 160)

        // When a custom template is too long (> 160 chars), fallback is used
        const tooLongTemplate = 'A'.repeat(161)
        const evalFallback = evaluateCallerSmsPolicy(classification, {
          messageTemplateOverride: tooLongTemplate,
        })
        assert.equal(evalFallback.action, 'send')
        assert.equal(evalFallback.status, 'prepared')
        assert.equal(evalFallback.message, FALLBACK_OFFICIAL_SMS_MESSAGE)
        assert.ok(evalFallback.message!.length <= 160)

        // Direct validator check
        const directInvalid = validateSmsMessageContent('A'.repeat(161))
        assert.equal(directInvalid.isValid, false)

        const directValid = validateSmsMessageContent('Regulski Behawiorysta: https://regulskibehawiorysta.pl/zapytaj')
        assert.equal(directValid.isValid, true)
      },
    )
  } finally {
    await sandbox.cleanup()
  }
})

test('8. Brak sekretu lub błąd kryptograficzny blokuje przygotowanie SMS fail-closed', async () => {
  const sandbox = await createLocalDataSandbox('caller-sms-secret', process.cwd())
  try {
    await withEnv(
      {
        APP_DATA_MODE: 'supabase', // non-local mode requires CALL_SESSION_PHONE_SECRET
        CALL_SESSION_PHONE_SECRET: null,
      },
      async () => {
        // Without secret in production mode, classification fails closed with missing_secret
        const classification = await classifyIncomingCaller(TEST_PHONE, { recordAudit: false })
        assert.equal(classification.decision, 'missing_secret')
        assert.equal(classification.allowCall, false)

        // SMS policy on missing_secret blocks message
        const evalRes = evaluateCallerSmsPolicy(classification)
        assert.equal(evalRes.action, 'do_not_send')
        assert.equal(evalRes.status, 'do_not_send')

        const prep = await generateCallerSms(classification, {
          idempotencyKey: 'missing-secret-key',
          recordPreparation: false,
        })
        assert.equal(prep.action, 'do_not_send')
        assert.equal(prep.status, 'do_not_send')
      },
    )
  } finally {
    await sandbox.cleanup()
  }
})

test('9. Prywatność i brak PII: wiadomość nie zawiera numeru telefonu, UUID rezerwacji/sesji, diagnozy, płatności ani obietnicy rozmowy', async () => {
  const sandbox = await createLocalDataSandbox('caller-sms-privacy', process.cwd())
  try {
    await withEnv(
      {
        APP_DATA_MODE: 'local',
        CALL_SESSION_PHONE_SECRET: TEST_SECRET,
      },
      async () => {
        const slot = await createAvailabilitySlot('2030-03-12', '11:00')
        const booking = await createPendingBooking({
          ownerName: 'Jan Kowalski',
          serviceType: 'szybka-konsultacja-15-min',
          problemType: 'agresja',
          animalType: 'Pies',
          petAge: '3 lata',
          durationNotes: 'Ciągle szczeka i gryzie',
          description: 'Bardzo agresywny pies w domu',
          phone: TEST_PHONE,
          email: 'jan@example.com',
          slotId: slot.id,
        })
        await markBookingPaid(booking.booking.id, { paymentMethod: 'payu', paymentReference: 'pay-priv-1' })

        // Process caller SMS for an inbound call
        const { classification, sms } = await processCallerSmsForInboundCall(TEST_PHONE, {
          idempotencyKey: 'privacy-check-key',
        })

        assert.equal(sms.action, 'send')
        assert.equal(sms.status, 'prepared')
        const message = sms.message!

        // 1. No phone number (raw or normalized)
        assert.equal(message.includes(TEST_PHONE), false, 'Wiadomość nie może zawierać surowego numeru telefonu')
        assert.equal(message.includes('48600123456'), false, 'Wiadomość nie może zawierać numeru z kodem kraju')

        // 2. No booking UUID or session UUID
        assert.equal(message.includes(booking.booking.id), false, 'Wiadomość nie może zawierać UUID rezerwacji')
        assert.doesNotMatch(message, /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)

        // 3. No customer name
        assert.equal(message.includes('Jan'), false, 'Wiadomość nie może zawierać imienia klienta')
        assert.equal(message.includes('Kowalski'), false, 'Wiadomość nie może zawierać nazwiska klienta')

        // 4. No animal diagnosis or problem description
        assert.equal(message.includes('agresja'), false)
        assert.equal(message.includes('pies'), false)
        assert.equal(message.includes('gryzie'), false)

        // 5. No payment status or amount
        assert.equal(message.includes('opłac'), false)
        assert.equal(message.includes('79'), false)
        assert.equal(message.includes('payu'), false)

        // 6. No immediate call promises or online status
        assert.equal(message.includes('natychmiast'), false)
        assert.equal(message.includes('oddzwonię teraz'), false)
        assert.equal(message.includes('online'), false)
      },
    )
  } finally {
    await sandbox.cleanup()
  }
})

test('10. Dowód zerowej wysyłki/kolejkowania: phone_agent_sms_queue pozostaje pusta, zero realnych wywołań dostawcy SMS', async () => {
  const sandbox = await createLocalDataSandbox('caller-sms-zero-sends', process.cwd())
  try {
    await withEnv(
      {
        APP_DATA_MODE: 'local',
        CALL_SESSION_PHONE_SECRET: TEST_SECRET,
      },
      async () => {
        // Monitor external HTTP requests
        let fetchCalls = 0
        const originalFetch = globalThis.fetch
        globalThis.fetch = (async (input: any, init: any) => {
          fetchCalls++
          return new Response(JSON.stringify({ ok: true }))
        }) as any

        try {
          // Process multiple inbound callers
          await processCallerSmsForInboundCall('600111222', { idempotencyKey: 'zero-send-1' })
          await processCallerSmsForInboundCall('600333444', { idempotencyKey: 'zero-send-2' })
          await processCallerSmsForInboundCall('invalid-phone', { idempotencyKey: 'zero-send-3' })

          // PROOF 1: Outbound SMS queue is completely empty (no pending, claimed, sent items)
          const queue = await listSmsQueue()
          assert.equal(queue.length, 0, 'Kolejka phone_agent_sms_queue musi pozostać całkowicie pusta (0 elementów)')

          // PROOF 2: No HTTP network calls were made to any SMS provider API
          assert.equal(fetchCalls, 0, 'Żadne zewnętrzne zapytanie HTTP nie zostało wykonane podczas przygotowywania SMS')
        } finally {
          globalThis.fetch = originalFetch
        }
      },
    )
  } finally {
    await sandbox.cleanup()
  }
})

test('11. Autoryzowane API (/api/phone-agent/caller-sms): brak auth -> 401, domyślny dry-run -> brak mutacji bazy, explicit dryRun:false -> zapis rekordu', async () => {
  const sandbox = await createLocalDataSandbox('caller-sms-api', process.cwd())
  try {
    await withEnv(
      {
        APP_DATA_MODE: 'local',
        CALL_SESSION_PHONE_SECRET: TEST_SECRET,
        PHONE_AGENT_TOKEN: TEST_PHONE_AGENT_TOKEN,
      },
      async () => {
        // 1. Unauthenticated request -> 401 Unauthorized
        const unauthReq = new NextRequest('http://localhost/api/phone-agent/caller-sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: TEST_PHONE }),
        })
        const unauthRes = await callerSmsApiRoute(unauthReq)
        assert.equal(unauthRes.status, 401)

        // 2. Authorized request with default preview (dry-run: true)
        const previewReq = new NextRequest('http://localhost/api/phone-agent/caller-sms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${TEST_PHONE_AGENT_TOKEN}`,
          },
          body: JSON.stringify({ phone: TEST_PHONE, idempotencyKey: 'api-preview-key-1' }),
        })
        const previewRes = await callerSmsApiRoute(previewReq)
        assert.equal(previewRes.status, 200)

        const previewBody = (await previewRes.json()) as any
        assert.equal(previewBody.ok, true)
        assert.equal(previewBody.preview, true, 'Domyślnie żądanie API musi być preview/dry-run')
        assert.equal(previewBody.sms.action, 'send')
        assert.equal(previewBody.sms.status, 'prepared')

        // Verify that preview did NOT persist to store snapshot
        const preparationsAfterPreview = await listCallerSmsPreparations()
        assert.equal(preparationsAfterPreview.length, 0, 'Domyślny preview nie może mutować bazy danych')

        // 3. Authorized request with dryRun: false -> persists to store
        const persistReq = new NextRequest('http://localhost/api/phone-agent/caller-sms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${TEST_PHONE_AGENT_TOKEN}`,
          },
          body: JSON.stringify({
            phone: TEST_PHONE,
            idempotencyKey: 'api-persist-key-1',
            dryRun: false,
          }),
        })
        const persistRes = await callerSmsApiRoute(persistReq)
        assert.equal(persistRes.status, 200)

        const persistBody = (await persistRes.json()) as any
        assert.equal(persistBody.ok, true)
        assert.equal(persistBody.preview, false)
        assert.equal(persistBody.sms.action, 'send')
        assert.equal(persistBody.sms.status, 'prepared')

        // Verify that record was persisted
        const preparationsAfterPersist = await listCallerSmsPreparations()
        assert.equal(preparationsAfterPersist.length, 1)

        // 4. Conflicting idempotency key on API -> 409 Conflict
        const conflictReq = new NextRequest('http://localhost/api/phone-agent/caller-sms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${TEST_PHONE_AGENT_TOKEN}`,
          },
          body: JSON.stringify({
            phone: '600999888', // different phone with same key
            idempotencyKey: 'api-persist-key-1',
            dryRun: false,
          }),
        })
        const conflictRes = await callerSmsApiRoute(conflictReq)
        assert.equal(conflictRes.status, 409)

        // 5. Outbound SMS queue still completely untouched
        const queue = await listSmsQueue()
        assert.equal(queue.length, 0, 'Kolejka phone_agent_sms_queue nie została zmodyfikowana przez API')
      },
    )
  } finally {
    await sandbox.cleanup()
  }
})
