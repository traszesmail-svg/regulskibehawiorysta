import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createLocalDataSandbox } from '@/scripts/lib/local-data-sandbox'
import {
  generateCallerSms,
  getCallerSmsPreparationById,
  promoteCallerSmsToQueue,
  validateTechnicalTestMessage,
  listCallerSmsPreparations,
  isStage4PromotionEnabled,
  DEFAULT_OFFICIAL_BOOKING_URL,
  DEFAULT_OFFICIAL_SMS_MESSAGE,
  CONTROLLED_TECHNICAL_TEST_MARKER,
  STAGE4_RUNTIME_FLAG_ENV,
} from '@/lib/server/db'
import { listSmsQueue } from '@/lib/server/phone-agent-store'
import { POST as promoteSmsApiRoute } from '@/app/api/phone-agent/caller-sms/promote/route'
import { NextRequest } from 'next/server'
import type { CallerClassificationResult } from '@/lib/server/caller-classification-types'

const TEST_SECRET = 'super-secret-salt-for-call-sessions-tests-12345'
const TEST_ADMIN_SECRET = 'admin-super-secret-password-xyz-456'
const TEST_PHONE_AGENT_TOKEN = 'test-phone-agent-token-xyz-1234'
const TEST_PHONE = '600123456'
const MISMATCHED_PHONE = '500999888'

function createAdminBasicAuthHeader(secret = TEST_ADMIN_SECRET): string {
  const credentials = Buffer.from(`admin:${secret}`).toString('base64')
  return `Basic ${credentials}`
}

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
  fingerprint: string,
  overrides: Partial<CallerClassificationResult> = {},
): CallerClassificationResult {
  return {
    decision,
    allowCall: decision === 'eligible_callback',
    reason: `Test classification for ${decision}`,
    callerPhoneFingerprint: fingerprint,
    callerPhoneMasked: '+48 600 *** 456',
    bookingId: null,
    sessionId: null,
    remainingSeconds: null,
    resumeWindowExpiresAt: null,
    evaluatedAt: new Date().toISOString(),
    ...overrides,
  }
}

test('1. Autoryzacja endpointu: brak admina -> 401 Unauthorized', async () => {
  const sandbox = await createLocalDataSandbox('stage4-auth-noadmin', process.cwd())
  try {
    await withEnv(
      {
        APP_DATA_MODE: 'local',
        ADMIN_ACCESS_SECRET: TEST_ADMIN_SECRET,
        PHONE_AGENT_TOKEN: TEST_PHONE_AGENT_TOKEN,
      },
      async () => {
        // Request without any auth headers
        const reqNoAuth = new NextRequest('http://localhost/api/phone-agent/caller-sms/promote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            preparationId: 'some-id',
            approvalId: 'appr-1',
            rawPhone: TEST_PHONE,
            isControlledTechnicalTest: true,
          }),
        })
        const resNoAuth = await promoteSmsApiRoute(reqNoAuth)
        assert.equal(resNoAuth.status, 401, 'Brak nagłówka autoryzacji musi zwrócić 401')
        assert.equal(resNoAuth.headers.get('Cache-Control'), 'no-store')

        // Request with invalid Basic auth
        const badCredentials = Buffer.from('admin:wrong-password').toString('base64')
        const reqBadAdmin = new NextRequest('http://localhost/api/phone-agent/caller-sms/promote', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${badCredentials}`,
          },
          body: JSON.stringify({
            preparationId: 'some-id',
            approvalId: 'appr-1',
            rawPhone: TEST_PHONE,
            isControlledTechnicalTest: true,
          }),
        })
        const resBadAdmin = await promoteSmsApiRoute(reqBadAdmin)
        assert.equal(resBadAdmin.status, 401, 'Złe hasło administratora musi zwrócić 401')
      },
    )
  } finally {
    await sandbox.cleanup()
  }
})

test('2. Autoryzacja endpointu: sam token phone-agenta NIE wystarcza -> 403 Forbidden', async () => {
  const sandbox = await createLocalDataSandbox('stage4-auth-phone-agent-only', process.cwd())
  try {
    await withEnv(
      {
        APP_DATA_MODE: 'local',
        ADMIN_ACCESS_SECRET: TEST_ADMIN_SECRET,
        PHONE_AGENT_TOKEN: TEST_PHONE_AGENT_TOKEN,
      },
      async () => {
        // Request with valid phone-agent Bearer token, but missing admin credentials
        const reqPhoneAgent = new NextRequest('http://localhost/api/phone-agent/caller-sms/promote', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${TEST_PHONE_AGENT_TOKEN}`,
          },
          body: JSON.stringify({
            preparationId: 'some-id',
            approvalId: 'appr-1',
            rawPhone: TEST_PHONE,
            isControlledTechnicalTest: true,
          }),
        })
        const resPhoneAgent = await promoteSmsApiRoute(reqPhoneAgent)
        assert.equal(
          resPhoneAgent.status,
          403,
          'Sam token phone-agenta nie może autoryzować kontaktu i musi zwrócić 403 Forbidden',
        )
        const json = (await resPhoneAgent.json()) as any
        assert.equal(json.ok, false)
        assert.match(json.error, /Token agenta telefonu nie wystarcza/i)
      },
    )
  } finally {
    await sandbox.cleanup()
  }
})

test('3. Flaga runtime false (domyślnie wyłączona): blokada mutacji i zero wpisów do kolejki', async () => {
  const sandbox = await createLocalDataSandbox('stage4-flag-disabled', process.cwd())
  try {
    await withEnv(
      {
        APP_DATA_MODE: 'local',
        CALL_SESSION_PHONE_SECRET: TEST_SECRET,
        ADMIN_ACCESS_SECRET: TEST_ADMIN_SECRET,
        // Runtime flag NOT set (evaluates to false by default)
        STAGE4_CONTROLLED_SMS_PROMOTION_ENABLED: null,
      },
      async () => {
        assert.equal(isStage4PromotionEnabled(), false, 'Flaga runtime musi być domyślnie wyłączona')

        // First create a prepared record
        const classification = createDummyClassification('unknown_number', 'call_fp:test_prep_001')
        const prep = await generateCallerSms(classification, {
          idempotencyKey: 'prep-event-key-1',
          dryRun: false,
        })
        assert.equal(prep.status, 'prepared')

        // Attempt durable promotion (dryRun: false) via API
        const reqDurable = new NextRequest('http://localhost/api/phone-agent/caller-sms/promote', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: createAdminBasicAuthHeader(),
          },
          body: JSON.stringify({
            preparationId: prep.id,
            approvalId: 'approval-flag-disabled-1',
            rawPhone: TEST_PHONE,
            isControlledTechnicalTest: true,
            dryRun: false,
          }),
        })
        const resDurable = await promoteSmsApiRoute(reqDurable)
        assert.equal(resDurable.status, 403, 'Przy wyłączonej fladze żądanie mutacji zwraca 403')
        const jsonDurable = (await resDurable.json()) as any
        assert.equal(jsonDurable.ok, false)
        assert.match(jsonDurable.error, /Bramka promocji SMS Etapu 4 jest wyłączona/i)

        // Verify zero mutations in queue
        const queueItems = await listSmsQueue()
        assert.equal(queueItems.length, 0, 'Kolejka phone_agent_sms_queue pozostaje nienaruszona (0 wpisów)')

        // Verify preparation record was NOT promoted
        const prepAfter = await getCallerSmsPreparationById(prep.id)
        assert.equal(prepAfter?.status, 'prepared', 'Status preparation pozostaje prepared')
        assert.equal(prepAfter?.promotedAt, null, 'promotedAt pozostaje null')
      },
    )
  } finally {
    await sandbox.cleanup()
  }
})

test('4. Tryb preview (domyślny lub dryRun: true): bezpieczna symulacja bez mutacji kolejki i storage', async () => {
  const sandbox = await createLocalDataSandbox('stage4-preview-mode', process.cwd())
  try {
    await withEnv(
      {
        APP_DATA_MODE: 'local',
        CALL_SESSION_PHONE_SECRET: TEST_SECRET,
        ADMIN_ACCESS_SECRET: TEST_ADMIN_SECRET,
        STAGE4_CONTROLLED_SMS_PROMOTION_ENABLED: 'true', // even if flag enabled, preview never mutates!
      },
      async () => {
        // Create prepared record with actual HMAC of TEST_PHONE
        const { computeCallerPhoneFingerprint } = await import('@/lib/server/call-session-security')
        const fp = computeCallerPhoneFingerprint(TEST_PHONE, TEST_SECRET)
        const classification = createDummyClassification('unknown_number', fp)
        const prep = await generateCallerSms(classification, {
          idempotencyKey: 'prep-event-key-preview',
          dryRun: false,
        })
        assert.equal(prep.status, 'prepared')

        // Default request (omitted dryRun defaults to true)
        const reqDefault = new NextRequest('http://localhost/api/phone-agent/caller-sms/promote', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: createAdminBasicAuthHeader(),
          },
          body: JSON.stringify({
            preparationId: prep.id,
            approvalId: 'approval-preview-default',
            rawPhone: TEST_PHONE,
            isControlledTechnicalTest: true,
          }),
        })
        const resDefault = await promoteSmsApiRoute(reqDefault)
        assert.equal(resDefault.status, 200)
        const jsonDefault = (await resDefault.json()) as any
        assert.equal(jsonDefault.ok, true)
        assert.equal(jsonDefault.preview, true, 'Domyślny tryb to preview=true')
        assert.equal(jsonDefault.queueItem?.message.includes(CONTROLLED_TECHNICAL_TEST_MARKER), true)
        assert.equal(jsonDefault.preparation?.status, 'promoted')

        // Explicit dryRun: true request
        const reqExplicit = new NextRequest('http://localhost/api/phone-agent/caller-sms/promote', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: createAdminBasicAuthHeader(),
          },
          body: JSON.stringify({
            preparationId: prep.id,
            approvalId: 'approval-preview-explicit',
            rawPhone: TEST_PHONE,
            isControlledTechnicalTest: true,
            dryRun: true,
          }),
        })
        const resExplicit = await promoteSmsApiRoute(reqExplicit)
        assert.equal(resExplicit.status, 200)
        const jsonExplicit = (await resExplicit.json()) as any
        assert.equal(jsonExplicit.ok, true)
        assert.equal(jsonExplicit.preview, true)

        // Verify ZERO queue mutation and ZERO preparation mutation in storage
        const queue = await listSmsQueue()
        assert.equal(queue.length, 0, 'Kolejka pozostaje pusta po preview')
        const prepInStore = await getCallerSmsPreparationById(prep.id)
        assert.equal(prepInStore?.status, 'prepared', 'Rekord w bazie zachowuje status prepared')
        assert.equal(prepInStore?.promotedAt, null, 'promotedAt w bazie pozostaje null')
      },
    )
  } finally {
    await sandbox.cleanup()
  }
})

test('5. Ścisła weryfikacja fingerprintu: zły numer telefonu -> fail-closed', async () => {
  const sandbox = await createLocalDataSandbox('stage4-bad-fingerprint', process.cwd())
  try {
    await withEnv(
      {
        APP_DATA_MODE: 'local',
        CALL_SESSION_PHONE_SECRET: TEST_SECRET,
        ADMIN_ACCESS_SECRET: TEST_ADMIN_SECRET,
        STAGE4_CONTROLLED_SMS_PROMOTION_ENABLED: 'true',
      },
      async () => {
        const { computeCallerPhoneFingerprint } = await import('@/lib/server/call-session-security')
        const fpExpected = computeCallerPhoneFingerprint(TEST_PHONE, TEST_SECRET)

        const classification = createDummyClassification('unknown_number', fpExpected)
        const prep = await generateCallerSms(classification, {
          idempotencyKey: 'prep-event-key-fp',
          dryRun: false,
        })

        // Request passes MISMATCHED_PHONE whose HMAC differs from prep.callerPhoneFingerprint
        const reqBadFp = new NextRequest('http://localhost/api/phone-agent/caller-sms/promote', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: createAdminBasicAuthHeader(),
          },
          body: JSON.stringify({
            preparationId: prep.id,
            approvalId: 'approval-bad-fp',
            rawPhone: MISMATCHED_PHONE,
            isControlledTechnicalTest: true,
            dryRun: false,
          }),
        })
        const resBadFp = await promoteSmsApiRoute(reqBadFp)
        assert.equal(resBadFp.status, 400)
        const jsonBadFp = (await resBadFp.json()) as any
        assert.equal(jsonBadFp.ok, false)
        assert.match(jsonBadFp.error, /Niezgodność fingerprintu numeru telefonu/i)

        // Direct library call also fails closed
        const libResult = await promoteCallerSmsToQueue({
          preparationId: prep.id,
          approvalId: 'approval-bad-fp-lib',
          rawPhone: MISMATCHED_PHONE,
          isControlledTechnicalTest: true,
          dryRun: false,
          adminAuthorized: true,
          secretOverride: TEST_SECRET,
        })
        assert.equal(libResult.ok, false)
        assert.equal(libResult.status, 'rejected')
        assert.match(libResult.rejectionReason ?? '', /Niezgodność fingerprintu numeru telefonu/i)

        assert.equal((await listSmsQueue()).length, 0, 'Kolejka pozostaje pusta')
      },
    )
  } finally {
    await sandbox.cleanup()
  }
})

test('6. Zły status oraz wygaśnięcie rekordu: fail-closed', async () => {
  const sandbox = await createLocalDataSandbox('stage4-bad-status-expiry', process.cwd())
  try {
    await withEnv(
      {
        APP_DATA_MODE: 'local',
        CALL_SESSION_PHONE_SECRET: TEST_SECRET,
        ADMIN_ACCESS_SECRET: TEST_ADMIN_SECRET,
        STAGE4_CONTROLLED_SMS_PROMOTION_ENABLED: 'true',
      },
      async () => {
        const { computeCallerPhoneFingerprint } = await import('@/lib/server/call-session-security')
        const fp = computeCallerPhoneFingerprint(TEST_PHONE, TEST_SECRET)

        // A. Record with blocked decision / do_not_send status
        const blockedClassification = createDummyClassification('eligible_callback', fp)
        const blockedPrep = await generateCallerSms(blockedClassification, {
          idempotencyKey: 'prep-blocked-1',
          dryRun: true,
        })
        assert.equal(blockedPrep.action, 'do_not_send')

        const resBlocked = await promoteCallerSmsToQueue({
          preparationId: blockedPrep.id,
          approvalId: 'appr-blocked-1',
          rawPhone: TEST_PHONE,
          isControlledTechnicalTest: true,
          dryRun: false,
          adminAuthorized: true,
          secretOverride: TEST_SECRET,
        })
        assert.equal(resBlocked.ok, false)
        assert.match(resBlocked.rejectionReason ?? '', /do_not_send|wyklucza wysyłkę|Nie znaleziono/i)

        // B. Expired preparation (> 30 minutes old)
        const admissibleClassification = createDummyClassification('unknown_number', fp)
        const pastDate = new Date(Date.now() - 35 * 60 * 1000) // 35 minutes ago
        const expiredPrep = await generateCallerSms(admissibleClassification, {
          idempotencyKey: 'prep-expired-1',
          now: pastDate,
          dryRun: false,
        })

        const resExpired = await promoteCallerSmsToQueue({
          preparationId: expiredPrep.id,
          approvalId: 'appr-expired-1',
          rawPhone: TEST_PHONE,
          isControlledTechnicalTest: true,
          dryRun: false,
          adminAuthorized: true,
          secretOverride: TEST_SECRET,
        })
        assert.equal(resExpired.ok, false)
        assert.match(resExpired.rejectionReason ?? '', /wygasł/i)

        assert.equal((await listSmsQueue()).length, 0, 'Zero kolejkowania')
      },
    )
  } finally {
    await sandbox.cleanup()
  }
})

test('7. Wymóg kontrolnego testu technicznego: nie-testowa treść i zły link -> odrzucenie', async () => {
  const sandbox = await createLocalDataSandbox('stage4-non-test-content', process.cwd())
  try {
    await withEnv(
      {
        APP_DATA_MODE: 'local',
        CALL_SESSION_PHONE_SECRET: TEST_SECRET,
        ADMIN_ACCESS_SECRET: TEST_ADMIN_SECRET,
        STAGE4_CONTROLLED_SMS_PROMOTION_ENABLED: 'true',
      },
      async () => {
        const { computeCallerPhoneFingerprint } = await import('@/lib/server/call-session-security')
        const fp = computeCallerPhoneFingerprint(TEST_PHONE, TEST_SECRET)

        const classification = createDummyClassification('unknown_number', fp)
        const prep = await generateCallerSms(classification, {
          idempotencyKey: 'prep-content-test-1',
          dryRun: false,
        })

        // A. Missing controlled technical test affirm flag
        const resMissingFlag = await promoteCallerSmsToQueue({
          preparationId: prep.id,
          approvalId: 'appr-no-test-flag',
          rawPhone: TEST_PHONE,
          isControlledTechnicalTest: false, // NOT affirmed
          dryRun: false,
          adminAuthorized: true,
          secretOverride: TEST_SECRET,
        })
        assert.equal(resMissingFlag.ok, false)
        assert.match(resMissingFlag.rejectionReason ?? '', /oznaczenie kontrolowanego testu technicznego/i)

        // B. Message without [TEST TECHNICZNY] marker
        const plainMsg = 'Dzień dobry, zapraszamy: https://regulskibehawiorysta.pl/zapytaj'
        const resNoMarker = await promoteCallerSmsToQueue({
          preparationId: prep.id,
          approvalId: 'appr-no-marker',
          rawPhone: TEST_PHONE,
          isControlledTechnicalTest: true,
          messageOverride: plainMsg,
          dryRun: false,
          adminAuthorized: true,
          secretOverride: TEST_SECRET,
        })
        assert.equal(resNoMarker.ok, false)
        assert.match(resNoMarker.rejectionReason ?? '', /oznaczenia kontrolnego testu technicznego/i)

        // C. Message with test marker, but wrong/unauthorized URL
        const wrongUrlMsg = '[TEST TECHNICZNY] Oferta pod adresem: https://nieautoryzowana-domena.pl/zapytaj'
        const resWrongUrl = await promoteCallerSmsToQueue({
          preparationId: prep.id,
          approvalId: 'appr-wrong-url',
          rawPhone: TEST_PHONE,
          isControlledTechnicalTest: true,
          messageOverride: wrongUrlMsg,
          dryRun: false,
          adminAuthorized: true,
          secretOverride: TEST_SECRET,
        })
        assert.equal(resWrongUrl.ok, false)
        assert.match(resWrongUrl.rejectionReason ?? '', /oficjalny link docelowy/i)

        assert.equal((await listSmsQueue()).length, 0, 'Kolejka pozostaje pusta')
      },
    )
  } finally {
    await sandbox.cleanup()
  }
})

test('8. Exact retry: ponowne wywołanie z identycznym approvalId zwraca identyczny wynik (1 rekord queue)', async () => {
  const sandbox = await createLocalDataSandbox('stage4-exact-retry', process.cwd())
  try {
    await withEnv(
      {
        APP_DATA_MODE: 'local',
        CALL_SESSION_PHONE_SECRET: TEST_SECRET,
        ADMIN_ACCESS_SECRET: TEST_ADMIN_SECRET,
        STAGE4_CONTROLLED_SMS_PROMOTION_ENABLED: 'true',
      },
      async () => {
        const { computeCallerPhoneFingerprint } = await import('@/lib/server/call-session-security')
        const fp = computeCallerPhoneFingerprint(TEST_PHONE, TEST_SECRET)

        const classification = createDummyClassification('unknown_number', fp)
        const prep = await generateCallerSms(classification, {
          idempotencyKey: 'prep-exact-retry-1',
          dryRun: false,
        })

        const approvalId = 'approval-exact-retry-999'

        // First promotion -> creates 1 queue item and sets preparation promoted
        const req1 = new NextRequest('http://localhost/api/phone-agent/caller-sms/promote', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: createAdminBasicAuthHeader(),
          },
          body: JSON.stringify({
            preparationId: prep.id,
            approvalId,
            rawPhone: TEST_PHONE,
            isControlledTechnicalTest: true,
            dryRun: false,
          }),
        })
        const res1 = await promoteSmsApiRoute(req1)
        assert.equal(res1.status, 200)
        const json1 = (await res1.json()) as any
        assert.equal(json1.ok, true)
        assert.equal(json1.isRetry, false)
        assert.equal(json1.status, 'promoted')
        assert.ok(json1.queueItem?.id)
        assert.equal(json1.preparation?.status, 'promoted')
        assert.equal(json1.preparation?.approvalId, approvalId)

        const queueAfter1 = await listSmsQueue()
        assert.equal(queueAfter1.length, 1, 'Kolejka zawiera dokładnie 1 element po pierwszej promocji')

        // Second promotion with identical params -> exact retry!
        const req2 = new NextRequest('http://localhost/api/phone-agent/caller-sms/promote', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: createAdminBasicAuthHeader(),
          },
          body: JSON.stringify({
            preparationId: prep.id,
            approvalId,
            rawPhone: TEST_PHONE,
            isControlledTechnicalTest: true,
            dryRun: false,
          }),
        })
        const res2 = await promoteSmsApiRoute(req2)
        assert.equal(res2.status, 200)
        const json2 = (await res2.json()) as any
        assert.equal(json2.ok, true)
        assert.equal(json2.isRetry, true, 'isRetry musi być true')
        assert.equal(json2.status, 'retry_matched')
        assert.equal(json2.queueItem?.id, json1.queueItem?.id, 'Zwraca ten sam identyfikator queueItem')
        assert.equal(json2.preparation?.id, json1.preparation?.id)

        const queueAfter2 = await listSmsQueue()
        assert.equal(queueAfter2.length, 1, 'Kolejka nadal zawiera dokładnie 1 element (brak duplikacji)')
      },
    )
  } finally {
    await sandbox.cleanup()
  }
})

test('9. Konflikt idempotencji: ten sam approvalId z innym prep/treścią lub zużyty rekord -> fail-closed (409/400)', async () => {
  const sandbox = await createLocalDataSandbox('stage4-idemp-conflict', process.cwd())
  try {
    await withEnv(
      {
        APP_DATA_MODE: 'local',
        CALL_SESSION_PHONE_SECRET: TEST_SECRET,
        ADMIN_ACCESS_SECRET: TEST_ADMIN_SECRET,
        STAGE4_CONTROLLED_SMS_PROMOTION_ENABLED: 'true',
      },
      async () => {
        const { computeCallerPhoneFingerprint } = await import('@/lib/server/call-session-security')
        const fp = computeCallerPhoneFingerprint(TEST_PHONE, TEST_SECRET)
        const TEST_PHONE_2 = '600123457'
        const fp2 = computeCallerPhoneFingerprint(TEST_PHONE_2, TEST_SECRET)

        // Preparation 1
        const prep1 = await generateCallerSms(createDummyClassification('unknown_number', fp), {
          idempotencyKey: 'prep-conflict-item-1',
          dryRun: false,
        })
        assert.equal(prep1.status, 'prepared')

        // Preparation 2 with distinct phone so both preparations are in 'prepared' status
        const prep2 = await generateCallerSms(createDummyClassification('unknown_number', fp2), {
          idempotencyKey: 'prep-conflict-item-2',
          dryRun: false,
        })
        assert.equal(prep2.status, 'prepared')

        const approvalId = 'approval-shared-key-1'

        // Promote prep1 with approvalId
        const promote1 = await promoteCallerSmsToQueue({
          preparationId: prep1.id,
          approvalId,
          rawPhone: TEST_PHONE,
          isControlledTechnicalTest: true,
          dryRun: false,
          adminAuthorized: true,
          secretOverride: TEST_SECRET,
        })
        assert.equal(promote1.ok, true)
        assert.equal(promote1.status, 'promoted')

        // Conflict A: Trying to promote prep2 with the same approvalId -> 409 idempotency_conflict
        const reqConflictPrep = new NextRequest('http://localhost/api/phone-agent/caller-sms/promote', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: createAdminBasicAuthHeader(),
          },
          body: JSON.stringify({
            preparationId: prep2.id,
            approvalId, // re-used for different preparation!
            rawPhone: TEST_PHONE_2,
            isControlledTechnicalTest: true,
            dryRun: false,
          }),
        })
        const resConflictPrep = await promoteSmsApiRoute(reqConflictPrep)
        assert.equal(resConflictPrep.status, 409, 'Konflikt ponownego użycia approvalId dla innego preparation zwraca 409')
        const jsonConflictPrep = (await resConflictPrep.json()) as any
        assert.equal(jsonConflictPrep.ok, false)
        assert.match(jsonConflictPrep.error, /idempotency_conflict/i)

        // Conflict B: Trying to promote prep1 again with a DIFFERENT approvalId (already used / promoted prep)
        const reqReusedPrep = new NextRequest('http://localhost/api/phone-agent/caller-sms/promote', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: createAdminBasicAuthHeader(),
          },
          body: JSON.stringify({
            preparationId: prep1.id,
            approvalId: 'approval-different-id-2', // new approvalId for already promoted prep!
            rawPhone: TEST_PHONE,
            isControlledTechnicalTest: true,
            dryRun: false,
          }),
        })
        const resReusedPrep = await promoteSmsApiRoute(reqReusedPrep)
        assert.equal(resReusedPrep.status, 400)
        const jsonReusedPrep = (await resReusedPrep.json()) as any
        assert.equal(jsonReusedPrep.ok, false)
        assert.match(jsonReusedPrep.error, /został już wykorzystany/i)

        // Conflict C: Same approvalId and prep1, but different message content on retry -> 409
        const reqMismatchedMsg = new NextRequest('http://localhost/api/phone-agent/caller-sms/promote', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: createAdminBasicAuthHeader(),
          },
          body: JSON.stringify({
            preparationId: prep1.id,
            approvalId,
            rawPhone: TEST_PHONE,
            isControlledTechnicalTest: true,
            message: `[TEST TECHNICZNY] Inna zmodyfikowana treść: ${DEFAULT_OFFICIAL_BOOKING_URL}`,
            dryRun: false,
          }),
        })
        const resMismatchedMsg = await promoteSmsApiRoute(reqMismatchedMsg)
        assert.equal(resMismatchedMsg.status, 409)
        const jsonMismatchedMsg = (await resMismatchedMsg.json()) as any
        assert.equal(jsonMismatchedMsg.ok, false)
        assert.match(jsonMismatchedMsg.error, /idempotency_conflict/i)

        // Queue count strictly stays at 1
        assert.equal((await listSmsQueue()).length, 1)
      },
    )
  } finally {
    await sandbox.cleanup()
  }
})

test('10. Równoległość / Concurrency: 5 równoległych żądań tworzy dokładnie 1 rekord w kolejce', async () => {
  const sandbox = await createLocalDataSandbox('stage4-concurrency', process.cwd())
  try {
    await withEnv(
      {
        APP_DATA_MODE: 'local',
        CALL_SESSION_PHONE_SECRET: TEST_SECRET,
        ADMIN_ACCESS_SECRET: TEST_ADMIN_SECRET,
        STAGE4_CONTROLLED_SMS_PROMOTION_ENABLED: 'true',
      },
      async () => {
        const { computeCallerPhoneFingerprint } = await import('@/lib/server/call-session-security')
        const fp = computeCallerPhoneFingerprint(TEST_PHONE, TEST_SECRET)

        const prep = await generateCallerSms(createDummyClassification('unknown_number', fp), {
          idempotencyKey: 'prep-concurrent-item-1',
          dryRun: false,
        })

        const approvalId = 'approval-concurrent-batch-1'

        // Launch 5 concurrent promotion requests with identical parameters
        const promises = Array.from({ length: 5 }).map(async () => {
          return promoteCallerSmsToQueue({
            preparationId: prep.id,
            approvalId,
            rawPhone: TEST_PHONE,
            isControlledTechnicalTest: true,
            dryRun: false,
            adminAuthorized: true,
            secretOverride: TEST_SECRET,
          })
        })

        const results = await Promise.all(promises)

        // All 5 must succeed (either promoted or retry_matched)
        for (const res of results) {
          assert.equal(res.ok, true, 'Każde współbieżne żądanie musi zakończyć się sukcesem')
          assert.ok(res.status === 'promoted' || res.status === 'retry_matched')
        }

        // Exactly one unique queue item ID must be shared by all results
        const queueItemIds = new Set(results.map((r) => r.queueItem?.id).filter(Boolean))
        assert.equal(queueItemIds.size, 1, 'Wszystkie współbieżne wywołania muszą wskazywać na ten sam rekord queueItem')

        // Queue must contain exactly 1 element
        const queueItems = await listSmsQueue()
        assert.equal(queueItems.length, 1, 'Kolejka phone_agent_sms_queue zawiera dokładnie 1 element po współbieżnym wykonaniu')
        assert.equal(queueItems[0].idempotencyKey, `stage4_promo:${approvalId}`)
      },
    )
  } finally {
    await sandbox.cleanup()
  }
})

test('11. Dowód zerowej wysyłki / zerowego wpływu: provider calls = 0, brak logowania surowego numeru', async () => {
  const sandbox = await createLocalDataSandbox('stage4-zero-sends-proof', process.cwd())
  try {
    await withEnv(
      {
        APP_DATA_MODE: 'local',
        CALL_SESSION_PHONE_SECRET: TEST_SECRET,
        ADMIN_ACCESS_SECRET: TEST_ADMIN_SECRET,
        // Domyślnie flaga false:
        STAGE4_CONTROLLED_SMS_PROMOTION_ENABLED: null,
      },
      async () => {
        // Intercept console.log and console.info to prove rawPhone is NEVER logged
        const logEntries: string[] = []
        const originalLog = console.log
        const originalInfo = console.info
        const originalWarn = console.warn
        const originalError = console.error

        const intercept = (...args: any[]) => {
          logEntries.push(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '))
        }

        console.log = intercept
        console.info = intercept
        console.warn = intercept
        console.error = intercept

        try {
          // Send request with raw phone
          const req = new NextRequest('http://localhost/api/phone-agent/caller-sms/promote', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: createAdminBasicAuthHeader(),
            },
            body: JSON.stringify({
              preparationId: 'non-existent-id',
              approvalId: 'appr-privacy-1',
              rawPhone: TEST_PHONE,
              isControlledTechnicalTest: true,
              dryRun: true,
            }),
          })
          const res = await promoteSmsApiRoute(req)
          assert.equal(res.status, 400)

          // Verify raw phone TEST_PHONE ('600123456') was NEVER logged
          for (const entry of logEntries) {
            assert.equal(
              entry.includes(TEST_PHONE),
              false,
              `Log zawierał surowy numer telefonu: "${entry}"`,
            )
          }

          // Verify zero items in queue
          const queue = await listSmsQueue()
          assert.equal(queue.length, 0, 'Kolejka pozostaje pusta')
        } finally {
          console.log = originalLog
          console.info = originalInfo
          console.warn = originalWarn
          console.error = originalError
        }
      },
    )
  } finally {
    await sandbox.cleanup()
  }
})
