import test from 'node:test'
import assert from 'node:assert/strict'
import { createLocalDataSandbox } from '../scripts/lib/local-data-sandbox'
import {
  createUrgentIntakeRequest,
  getUrgentIntakeRequest,
  resetSection16LocalStore,
  readSection16StoreSnapshot,
} from '../lib/server/section16-store'
import {
  parseOwnerProposalResponse,
  parseOwnerProposalResponseOrThrow,
  prepareOwnerUrgentNotification,
  processOwnerProposalAndSetHold,
  Section16UrgentProposalError,
  MAX_OWNER_NOTIFICATION_SMS_LENGTH,
  DEFAULT_URGENT_FLOW_BOUNDARIES,
  UrgentFlowIntegrationBoundaries,
} from '../lib/server/section16-urgent-flow'
import {
  Section16ConcurrencyError,
  Section16IdempotencyConflictError,
  Section16HoldExpiredError,
  Section16TransitionError,
  Section16ValidationError,
  Section16NotFoundError,
} from '../lib/server/section16-types'

let sandbox: Awaited<ReturnType<typeof createLocalDataSandbox>> | null = null

test.before(async () => {
  sandbox = await createLocalDataSandbox('section16-urgent-flow')
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
// 1. POPRAWNY DZISIAJ / JUTRO
// ---------------------------------------------------------------------------
test('1. Poprawny dzisiaj/jutro: ścisłe przetwarzanie propozycji i założenie blokady', async () => {
  // Test "today" proposal
  const fixedNow = new Date('2026-10-12T08:00:00.000Z') // 10:00 Warsaw (CEST, UTC+2)
  const reqToday = await createUrgentIntakeRequest(
    {
      dayChoice: 'today',
      targetDate: '2026-10-12',
      rawPhone: '+48600111222',
      idempotencyKey: 'intake-today-001',
    },
    fixedNow,
  )

  const parseToday = parseOwnerProposalResponse('12.10.2026.14:30', reqToday.targetDate, fixedNow)
  assert.equal(parseToday.success, true)
  if (parseToday.success) {
    assert.equal(parseToday.data.formattedDate, '2026-10-12')
    assert.equal(parseToday.data.formattedTime, '14:30')
    assert.equal(parseToday.data.warsawOffset, '+02:00')
    assert.equal(parseToday.data.isoTimestamp, '2026-10-12T12:30:00.000Z')
  }

  const resultToday = await processOwnerProposalAndSetHold({
    requestId: reqToday.id,
    response: '12.10.2026.14:30',
    idempotencyKey: 'prop-today-001',
    expectedVersion: reqToday.version,
    now: fixedNow,
  })
  assert.equal(resultToday.request.state, 'timeslot_proposed')
  assert.equal(resultToday.request.proposedDate, '2026-10-12')
  assert.equal(resultToday.request.proposedTime, '14:30')
  assert.equal(resultToday.request.proposedTimeslotIso, '2026-10-12T12:30:00.000Z')
  assert.equal(resultToday.request.version, 2)
  assert.equal(resultToday.isRetry, false)

  // Test "tomorrow" proposal
  const reqTomorrow = await createUrgentIntakeRequest(
    {
      dayChoice: 'tomorrow',
      targetDate: '2026-10-13',
      rawPhone: '+48600111222',
      idempotencyKey: 'intake-tomorrow-001',
    },
    fixedNow,
  )

  const parseTomorrow = parseOwnerProposalResponse('13.10.2026.09:15', reqTomorrow.targetDate, fixedNow)
  assert.equal(parseTomorrow.success, true)
  if (parseTomorrow.success) {
    assert.equal(parseTomorrow.data.formattedDate, '2026-10-13')
    assert.equal(parseTomorrow.data.formattedTime, '09:15')
    assert.equal(parseTomorrow.data.isoTimestamp, '2026-10-13T07:15:00.000Z')
  }

  const resultTomorrow = await processOwnerProposalAndSetHold({
    requestId: reqTomorrow.id,
    response: '13.10.2026.09:15',
    idempotencyKey: 'prop-tomorrow-001',
    expectedVersion: reqTomorrow.version,
    now: fixedNow,
  })
  assert.equal(resultTomorrow.request.state, 'timeslot_proposed')
  assert.equal(resultTomorrow.request.proposedDate, '2026-10-13')
  assert.equal(resultTomorrow.request.proposedTime, '09:15')
})

// ---------------------------------------------------------------------------
// 2. DATA PRZESTĘPNA I NIEPOPRAWNA
// ---------------------------------------------------------------------------
test('2. Data przestępna i niepoprawna: odrzucanie nieistniejących dni kalendarzowych', () => {
  const futureRef = new Date('2023-01-01T00:00:00.000Z')

  // 2024 is leap year -> Feb 29 exists
  const leap2024 = parseOwnerProposalResponse('29.02.2024.12:00', '2024-02-29', futureRef)
  assert.equal(leap2024.success, true)

  // 2025 is not leap year -> Feb 29 does not exist
  const nonLeap2025 = parseOwnerProposalResponse('29.02.2025.12:00', '2025-02-29', futureRef)
  assert.equal(nonLeap2025.success, false)
  if (!nonLeap2025.success) {
    assert.equal(nonLeap2025.error.code, 'INVALID_CALENDAR_DATE')
  }

  // 2026 is not leap year -> Feb 29 does not exist
  const nonLeap2026 = parseOwnerProposalResponse('29.02.2026.12:00', '2026-02-29', futureRef)
  assert.equal(nonLeap2026.success, false)
  if (!nonLeap2026.success) {
    assert.equal(nonLeap2026.error.code, 'INVALID_CALENDAR_DATE')
  }

  // April 31 does not exist (April has 30 days)
  const apr31 = parseOwnerProposalResponse('31.04.2026.12:00', '2026-04-31', futureRef)
  assert.equal(apr31.success, false)
  if (!apr31.success) {
    assert.equal(apr31.error.code, 'INVALID_CALENDAR_DATE')
  }

  // June 31 does not exist
  const jun31 = parseOwnerProposalResponse('31.06.2026.12:00', '2026-06-31', futureRef)
  assert.equal(jun31.success, false)
  if (!jun31.success) {
    assert.equal(jun31.error.code, 'INVALID_CALENDAR_DATE')
  }

  // Day 00 or 32
  const day0 = parseOwnerProposalResponse('00.10.2026.12:00', '2026-10-00', futureRef)
  assert.equal(day0.success, false)
  if (!day0.success) {
    assert.equal(day0.error.code, 'INVALID_CALENDAR_DATE')
  }

  const day32 = parseOwnerProposalResponse('32.01.2026.12:00', '2026-01-32', futureRef)
  assert.equal(day32.success, false)
  if (!day32.success) {
    assert.equal(day32.error.code, 'INVALID_CALENDAR_DATE')
  }

  // Month 13 or 00
  const month13 = parseOwnerProposalResponse('15.13.2026.12:00', '2026-13-15', futureRef)
  assert.equal(month13.success, false)
  if (!month13.success) {
    assert.equal(month13.error.code, 'INVALID_CALENDAR_DATE')
  }
})

// ---------------------------------------------------------------------------
// 3. ZŁA LICZBA CYFR
// ---------------------------------------------------------------------------
test('3. Zła liczba cyfr: odrzucanie niepełnych lub skróconych komponentów daty i godziny', () => {
  const futureRef = new Date('2026-01-01T00:00:00.000Z')

  const cases = [
    '1.10.2026.14:30', // 1-digit day
    '12.1.2026.14:30', // 1-digit month
    '12.10.26.14:30', // 2-digit year
    '12.10.2026.9:30', // 1-digit hour
    '12.10.2026.09:3', // 1-digit minute
    '12.10.20266.14:30', // 5-digit year
  ]

  for (const c of cases) {
    const res = parseOwnerProposalResponse(c, '2026-10-12', futureRef)
    assert.equal(res.success, false, `Expected failure for: ${c}`)
    if (!res.success) {
      assert.equal(res.error.code, 'INVALID_FORMAT')
    }
  }
})

// ---------------------------------------------------------------------------
// 4. SPACJE / TEKST / SEKUNDY
// ---------------------------------------------------------------------------
test('4. Spacje/tekst/sekundy: ścisłe odrzucanie prefiksów, sufiksów, spacji i sekund', () => {
  const futureRef = new Date('2026-01-01T00:00:00.000Z')

  const cases = [
    ' 12.10.2026.14:30', // leading space
    '12.10.2026.14:30 ', // trailing space
    '12.10.2026 14:30', // space instead of dot
    '12.10.2026. 14:30', // space after dot
    '12.10.2026.14: 30', // space inside time
    '12.10.2026.14:30:00', // seconds included
    'Termin: 12.10.2026.14:30', // text prefix
    '12.10.2026.14:30 ok', // text suffix
    '12.10.2026.14:30\n', // newline
    '', // empty string
    '   ', // whitespace only
  ]

  for (const c of cases) {
    const res = parseOwnerProposalResponse(c, '2026-10-12', futureRef)
    assert.equal(res.success, false, `Expected failure for: ${c}`)
    if (!res.success) {
      assert.equal(res.error.code, 'INVALID_FORMAT')
    }
  }

  // Non-string inputs
  const nonStrings: unknown[] = [null, undefined, 12345, {}, []]
  for (const ns of nonStrings) {
    const res = parseOwnerProposalResponse(ns, '2026-10-12', futureRef)
    assert.equal(res.success, false)
    if (!res.success) {
      assert.equal(res.error.code, 'INVALID_FORMAT')
    }
  }
})

// ---------------------------------------------------------------------------
// 5. CZAS PRZESZŁY / RÓWNY NOW
// ---------------------------------------------------------------------------
test('5. Czas przeszły/równy now: odrzucanie terminów niebędących ściśle w przyszłości', () => {
  // At 14:30:00 UTC (16:30 Warsaw CEST)
  const now = new Date('2026-10-12T14:30:00.000Z')

  // Past term: 16:15 Warsaw (14:15 UTC)
  const pastRes = parseOwnerProposalResponse('12.10.2026.16:15', '2026-10-12', now)
  assert.equal(pastRes.success, false)
  if (!pastRes.success) {
    assert.equal(pastRes.error.code, 'PAST_OR_CURRENT_TIME')
  }

  // Equal term: 16:30 Warsaw (14:30:00.000Z UTC)
  const equalRes = parseOwnerProposalResponse('12.10.2026.16:30', '2026-10-12', now)
  assert.equal(equalRes.success, false)
  if (!equalRes.success) {
    assert.equal(equalRes.error.code, 'PAST_OR_CURRENT_TIME')
  }

  // Strictly future term: 16:31 Warsaw (14:31 UTC)
  const futureRes = parseOwnerProposalResponse('12.10.2026.16:31', '2026-10-12', now)
  assert.equal(futureRes.success, true)
})

// ---------------------------------------------------------------------------
// 6. NIEZGODNY TARGET DATE
// ---------------------------------------------------------------------------
test('6. Niezgodny targetDate: zakaz zmiany dnia oraz zachowanie po północy', async () => {
  const req = await createUrgentIntakeRequest(
    {
      dayChoice: 'today',
      targetDate: '2026-10-12',
      rawPhone: '+48600111222',
      idempotencyKey: 'intake-mismatch-001',
    },
    new Date('2026-10-12T08:00:00.000Z'),
  )

  // Proposed tomorrow date 13.10 when request is for 12.10
  const mismatchRes = parseOwnerProposalResponse(
    '13.10.2026.10:00',
    req.targetDate,
    new Date('2026-10-12T08:00:00.000Z'),
  )
  assert.equal(mismatchRes.success, false)
  if (!mismatchRes.success) {
    assert.equal(mismatchRes.error.code, 'TARGET_DATE_MISMATCH')
  }

  // Simulation: Owner replies after midnight (at 01:00 UTC on 2026-10-13)
  // Request targetDate remains locked at '2026-10-12'. Owner proposing 13.10 is rejected.
  const pastMidnight = new Date('2026-10-13T01:00:00.000Z')
  await assert.rejects(
    async () => {
      await processOwnerProposalAndSetHold({
        requestId: req.id,
        response: '13.10.2026.09:00',
        idempotencyKey: 'prop-after-midnight-001',
        now: pastMidnight,
      })
    },
    (err: any) => {
      assert.equal(err.code, 'TARGET_DATE_MISMATCH')
      return true
    },
  )
})

// ---------------------------------------------------------------------------
// 7. DST EUROPE/WARSAW (NIEISTNIEJĄCY I NIEJEDNOZNACZNY CZAS)
// ---------------------------------------------------------------------------
test('7. DST Europe/Warsaw: poprawne odrzucanie luki wiosennej oraz niejednoznaczności jesiennej', () => {
  // A. Spring transition 2026-03-29 (clocks spring forward from 02:00 to 03:00)
  // Local times 02:00:00 - 02:59:59 DO NOT EXIST in Europe/Warsaw
  const refSpring = new Date('2026-03-29T00:00:00.000Z')

  const springGap0200 = parseOwnerProposalResponse('29.03.2026.02:00', '2026-03-29', refSpring)
  assert.equal(springGap0200.success, false)
  if (!springGap0200.success) {
    assert.equal(springGap0200.error.code, 'DST_NON_EXISTENT_TIME')
  }

  const springGap0230 = parseOwnerProposalResponse('29.03.2026.02:30', '2026-03-29', refSpring)
  assert.equal(springGap0230.success, false)
  if (!springGap0230.success) {
    assert.equal(springGap0230.error.code, 'DST_NON_EXISTENT_TIME')
  }

  const springGap0259 = parseOwnerProposalResponse('29.03.2026.02:59', '2026-03-29', refSpring)
  assert.equal(springGap0259.success, false)
  if (!springGap0259.success) {
    assert.equal(springGap0259.error.code, 'DST_NON_EXISTENT_TIME')
  }

  // Right before spring gap: 01:59 is valid (CET, UTC+1)
  const springBefore = parseOwnerProposalResponse('29.03.2026.01:59', '2026-03-29', refSpring)
  assert.equal(springBefore.success, true)
  if (springBefore.success) {
    assert.equal(springBefore.data.warsawOffset, '+01:00')
    assert.equal(springBefore.data.isoTimestamp, '2026-03-29T00:59:00.000Z')
  }

  // Right after spring gap: 03:00 is valid (CEST, UTC+2)
  const springAfter = parseOwnerProposalResponse('29.03.2026.03:00', '2026-03-29', refSpring)
  assert.equal(springAfter.success, true)
  if (springAfter.success) {
    assert.equal(springAfter.data.warsawOffset, '+02:00')
    assert.equal(springAfter.data.isoTimestamp, '2026-03-29T01:00:00.000Z')
  }

  // B. Autumn transition 2026-10-25 (clocks fall back from 03:00 to 02:00)
  // Local times 02:00:00 - 02:59:59 OCCUR TWICE (ambiguous without guessing)
  const refAutumn = new Date('2026-10-24T23:00:00.000Z')

  const autumnOverlap0200 = parseOwnerProposalResponse('25.10.2026.02:00', '2026-10-25', refAutumn)
  assert.equal(autumnOverlap0200.success, false)
  if (!autumnOverlap0200.success) {
    assert.equal(autumnOverlap0200.error.code, 'DST_AMBIGUOUS_TIME')
  }

  const autumnOverlap0230 = parseOwnerProposalResponse('25.10.2026.02:30', '2026-10-25', refAutumn)
  assert.equal(autumnOverlap0230.success, false)
  if (!autumnOverlap0230.success) {
    assert.equal(autumnOverlap0230.error.code, 'DST_AMBIGUOUS_TIME')
  }

  const autumnOverlap0259 = parseOwnerProposalResponse('25.10.2026.02:59', '2026-10-25', refAutumn)
  assert.equal(autumnOverlap0259.success, false)
  if (!autumnOverlap0259.success) {
    assert.equal(autumnOverlap0259.error.code, 'DST_AMBIGUOUS_TIME')
  }

  // Right before autumn overlap: 01:59 is valid (CEST, UTC+2)
  const autumnBefore = parseOwnerProposalResponse('25.10.2026.01:59', '2026-10-25', refAutumn)
  assert.equal(autumnBefore.success, true)
  if (autumnBefore.success) {
    assert.equal(autumnBefore.data.warsawOffset, '+02:00')
    assert.equal(autumnBefore.data.isoTimestamp, '2026-10-24T23:59:00.000Z')
  }

  // Right after autumn overlap: 03:00 is valid (CET, UTC+1)
  const autumnAfter = parseOwnerProposalResponse('25.10.2026.03:00', '2026-10-25', refAutumn)
  assert.equal(autumnAfter.success, true)
  if (autumnAfter.success) {
    assert.equal(autumnAfter.data.warsawOffset, '+01:00')
    assert.equal(autumnAfter.data.isoTimestamp, '2026-10-25T02:00:00.000Z')
  }
})

// ---------------------------------------------------------------------------
// 8. GRANICE TTL 5/120 I WARTOŚCI POZA ZAKRESEM
// ---------------------------------------------------------------------------
test('8. Granice TTL 5/120: dopuszczanie granic i odrzucanie wartości spoza zakresu', async () => {
  const now = new Date('2026-10-12T08:00:00.000Z')
  const req = await createUrgentIntakeRequest(
    {
      dayChoice: 'today',
      targetDate: '2026-10-12',
      rawPhone: '+48600111222',
      idempotencyKey: 'intake-ttl-001',
    },
    now,
  )

  // Default TTL: 30 minutes
  const resDefault = await processOwnerProposalAndSetHold({
    requestId: req.id,
    response: '12.10.2026.14:00',
    idempotencyKey: 'prop-ttl-default',
    now,
  })
  const expectedDefaultExpiry = new Date(now.getTime() + 30 * 60 * 1000).toISOString()
  assert.equal(resDefault.request.holdExpiresAt, expectedDefaultExpiry)

  // Lower bound: 5 minutes (using new request)
  const reqMin = await createUrgentIntakeRequest(
    {
      dayChoice: 'today',
      targetDate: '2026-10-12',
      rawPhone: '+48600111222',
      idempotencyKey: 'intake-ttl-min',
    },
    now,
  )
  const resMin = await processOwnerProposalAndSetHold({
    requestId: reqMin.id,
    response: '12.10.2026.14:00',
    holdDurationMinutes: 5,
    idempotencyKey: 'prop-ttl-min',
    now,
  })
  assert.equal(resMin.request.holdExpiresAt, new Date(now.getTime() + 5 * 60 * 1000).toISOString())

  // Upper bound: 120 minutes (using new request)
  const reqMax = await createUrgentIntakeRequest(
    {
      dayChoice: 'today',
      targetDate: '2026-10-12',
      rawPhone: '+48600111222',
      idempotencyKey: 'intake-ttl-max',
    },
    now,
  )
  const resMax = await processOwnerProposalAndSetHold({
    requestId: reqMax.id,
    response: '12.10.2026.14:00',
    holdDurationMinutes: 120,
    idempotencyKey: 'prop-ttl-max',
    now,
  })
  assert.equal(resMax.request.holdExpiresAt, new Date(now.getTime() + 120 * 60 * 1000).toISOString())

  // Out of bounds: 4 minutes
  const reqInvalid1 = await createUrgentIntakeRequest(
    {
      dayChoice: 'today',
      targetDate: '2026-10-12',
      rawPhone: '+48600111222',
      idempotencyKey: 'intake-ttl-inv1',
    },
    now,
  )
  await assert.rejects(
    async () => {
      await processOwnerProposalAndSetHold({
        requestId: reqInvalid1.id,
        response: '12.10.2026.14:00',
        holdDurationMinutes: 4,
        idempotencyKey: 'prop-ttl-inv-4',
        now,
      })
    },
    (err: any) => err instanceof Section16ValidationError,
  )

  // Out of bounds: 121 minutes
  await assert.rejects(
    async () => {
      await processOwnerProposalAndSetHold({
        requestId: reqInvalid1.id,
        response: '12.10.2026.14:00',
        holdDurationMinutes: 121,
        idempotencyKey: 'prop-ttl-inv-121',
        now,
      })
    },
    (err: any) => err instanceof Section16ValidationError,
  )

  // Non-integer: 30.5 minutes
  await assert.rejects(
    async () => {
      await processOwnerProposalAndSetHold({
        requestId: reqInvalid1.id,
        response: '12.10.2026.14:00',
        holdDurationMinutes: 30.5,
        idempotencyKey: 'prop-ttl-inv-float',
        now,
      })
    },
    (err: any) => err instanceof Section16ValidationError,
  )
})

// ---------------------------------------------------------------------------
// 9. WYMAGANY IDEMPOTENCY KEY
// ---------------------------------------------------------------------------
test('9. Wymagany idempotency key: odrzucanie brakującego, pustego i nadmiarowego klucza', async () => {
  const now = new Date('2026-10-12T08:00:00.000Z')
  const req = await createUrgentIntakeRequest(
    {
      dayChoice: 'today',
      targetDate: '2026-10-12',
      rawPhone: '+48600111222',
      idempotencyKey: 'intake-idemp-001',
    },
    now,
  )

  const invalidKeys: any[] = [
    undefined,
    null,
    '',
    '   ',
    'a'.repeat(129), // > 128 chars
  ]

  for (const k of invalidKeys) {
    await assert.rejects(
      async () => {
        await processOwnerProposalAndSetHold({
          requestId: req.id,
          response: '12.10.2026.14:00',
          idempotencyKey: k,
          now,
        })
      },
      (err: any) => {
        assert.ok(err.code === 'VALIDATION_ERROR' || err.name === 'Section16InvalidIdempotencyKeyError')
        return true
      },
    )
  }
})

// ---------------------------------------------------------------------------
// 10. RETRY BEZ DUPLIKATU ZDARZENIA
// ---------------------------------------------------------------------------
test('10. Retry bez duplikatu zdarzenia: ponowne wywołanie z tym samym kluczem i payloadem', async () => {
  const now = new Date('2026-10-12T08:00:00.000Z')
  const req = await createUrgentIntakeRequest(
    {
      dayChoice: 'today',
      targetDate: '2026-10-12',
      rawPhone: '+48600111222',
      idempotencyKey: 'intake-retry-001',
    },
    now,
  )

  // First call
  const first = await processOwnerProposalAndSetHold({
    requestId: req.id,
    response: '12.10.2026.15:00',
    idempotencyKey: 'prop-retry-key-001',
    holdDurationMinutes: 30,
    expectedVersion: 1,
    now,
  })
  assert.equal(first.request.state, 'timeslot_proposed')
  assert.equal(first.request.version, 2)
  assert.equal(first.isRetry, false)

  const snapAfterFirst = await readSection16StoreSnapshot()
  const eventsForReq1 = snapAfterFirst.urgentEvents.filter((e) => e.requestId === req.id)
  assert.equal(eventsForReq1.length, 2) // request_created + timeslot_proposed

  // Second call (exact retry)
  const retry = await processOwnerProposalAndSetHold({
    requestId: req.id,
    response: '12.10.2026.15:00',
    idempotencyKey: 'prop-retry-key-001',
    holdDurationMinutes: 30,
    now,
  })
  assert.equal(retry.request.state, 'timeslot_proposed')
  assert.equal(retry.request.version, 2)
  assert.equal(retry.isRetry, true)

  const snapAfterRetry = await readSection16StoreSnapshot()
  const eventsForReq2 = snapAfterRetry.urgentEvents.filter((e) => e.requestId === req.id)
  assert.equal(eventsForReq2.length, 2, 'Nie może powstać drugi rekord zdarzenia')
})

// ---------------------------------------------------------------------------
// 11. KONFLIKT IDEMPOTENCJI / CAS / STANU
// ---------------------------------------------------------------------------
test('11. Konflikt idempotencji/CAS/stanu: fail-closed na rozbieżnościach', async () => {
  const now = new Date('2026-10-12T08:00:00.000Z')
  const req = await createUrgentIntakeRequest(
    {
      dayChoice: 'today',
      targetDate: '2026-10-12',
      rawPhone: '+48600111222',
      idempotencyKey: 'intake-conflict-001',
    },
    now,
  )

  // 11a. CAS Version Conflict
  await assert.rejects(
    async () => {
      await processOwnerProposalAndSetHold({
        requestId: req.id,
        response: '12.10.2026.15:00',
        idempotencyKey: 'prop-cas-err',
        expectedVersion: 999, // Mismatch: actual is 1
        now,
      })
    },
    (err: any) => err instanceof Section16ConcurrencyError,
  )

  // Establish initial proposal
  await processOwnerProposalAndSetHold({
    requestId: req.id,
    response: '12.10.2026.15:00',
    idempotencyKey: 'prop-base-key',
    now,
  })

  // 11b. Idempotency Conflict: same key, different response/payload
  await assert.rejects(
    async () => {
      await processOwnerProposalAndSetHold({
        requestId: req.id,
        response: '12.10.2026.16:00', // Different response!
        idempotencyKey: 'prop-base-key',
        now,
      })
    },
    (err: any) => err instanceof Section16IdempotencyConflictError,
  )

  // 11c. State Conflict: Request is already timeslot_proposed; calling with new idempotency key
  await assert.rejects(
    async () => {
      await processOwnerProposalAndSetHold({
        requestId: req.id,
        response: '12.10.2026.17:00',
        idempotencyKey: 'prop-fresh-key-on-existing',
        now,
      })
    },
    (err: any) => err instanceof Section16TransitionError,
  )

  // 11d. Expired request fails closed
  const expiredReq = await createUrgentIntakeRequest(
    {
      dayChoice: 'today',
      targetDate: '2026-10-12',
      rawPhone: '+48600111222',
      idempotencyKey: 'intake-expired-001',
      expiresAt: '2026-10-12T07:00:00.000Z', // In the past relative to now (08:00)
    },
    new Date('2026-10-12T06:00:00.000Z'),
  )

  await assert.rejects(
    async () => {
      await processOwnerProposalAndSetHold({
        requestId: expiredReq.id,
        response: '12.10.2026.15:00',
        idempotencyKey: 'prop-on-expired',
        now,
      })
    },
    (err: any) => err instanceof Section16HoldExpiredError,
  )
})

// ---------------------------------------------------------------------------
// 12. BRAK WYWOŁAŃ SMS / PŁATNOŚCI / KALENDARZA
// ---------------------------------------------------------------------------
test('12. Brak wywołań SMS/płatności/kalendarza: izolacja granic i fail-closed domyślnych adapterów', async () => {
  const now = new Date('2026-10-12T08:00:00.000Z')
  const req = await createUrgentIntakeRequest(
    {
      dayChoice: 'today',
      targetDate: '2026-10-12',
      rawPhone: '+48600111222',
      idempotencyKey: 'intake-boundaries-001',
    },
    now,
  )

  let smsCalls = 0
  let paymentCalls = 0
  let calendarCalls = 0

  const spyBoundaries: UrgentFlowIntegrationBoundaries = {
    ownerSmsDispatch: {
      dispatchOwnerNotification: async () => {
        smsCalls += 1
      },
    },
    clientPaymentLinkDispatch: {
      dispatchClientPaymentLink: async () => {
        paymentCalls += 1
      },
    },
    calendarBooking: {
      createCalendarBooking: async () => {
        calendarCalls += 1
      },
    },
  }

  // Preparation does NOT dispatch SMS
  const notif = prepareOwnerUrgentNotification({
    requestId: req.id,
    dayChoice: req.dayChoice,
    targetDate: req.targetDate,
  })
  assert.ok(notif.message.length > 0)
  assert.equal(smsCalls, 0)

  // Hold creation does NOT dispatch SMS, payment link, or calendar booking
  const res = await processOwnerProposalAndSetHold(
    {
      requestId: req.id,
      response: '12.10.2026.14:00',
      idempotencyKey: 'prop-spy-boundaries',
      now,
    },
    spyBoundaries,
  )

  assert.equal(smsCalls, 0, 'Zero wywołań wysyłki SMS do właściciela')
  assert.equal(paymentCalls, 0, 'Zero wywołań wysyłki linku płatności do klienta')
  assert.equal(calendarCalls, 0, 'Zero wywołań integracji kalendarza')

  // Verify that the request has not acquired payment or calendar booking
  assert.equal(res.request.state, 'timeslot_proposed')
  assert.equal(res.request.paymentReference, null)
  assert.equal(res.request.bookingId, null)

  // Verify that calling default adapters directly throws fail-closed error
  await assert.rejects(
    async () => {
      await DEFAULT_URGENT_FLOW_BOUNDARIES.ownerSmsDispatch!.dispatchOwnerNotification(notif)
    },
    (err: any) => err.code === 'OWNER_SMS_DISPATCH_DISABLED',
  )

  await assert.rejects(
    async () => {
      await DEFAULT_URGENT_FLOW_BOUNDARIES.clientPaymentLinkDispatch!.dispatchClientPaymentLink(res.request)
    },
    (err: any) => err.code === 'CLIENT_PAYMENT_LINK_DISPATCH_DISABLED',
  )

  await assert.rejects(
    async () => {
      await DEFAULT_URGENT_FLOW_BOUNDARIES.calendarBooking!.createCalendarBooking(res.request)
    },
    (err: any) => err.code === 'CALENDAR_BOOKING_DISABLED',
  )
})

// ---------------------------------------------------------------------------
// 13. BRAK PII W PRZYGOTOWANYM POWIADOMIENIU
// ---------------------------------------------------------------------------
test('13. Brak PII w przygotowanym powiadomieniu: weryfikacja zawartości i długości SMS', async () => {
  const sensitiveClientName = 'Anna Kowalska'
  const sensitiveNotes = 'Pies gryzie i szczeka przy bramie'
  const sensitiveRawPhone = '+48600999888'
  const sensitiveCiphertext = 'enc:blob_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'

  const req = await createUrgentIntakeRequest(
    {
      dayChoice: 'today',
      targetDate: '2026-10-12',
      rawPhone: sensitiveRawPhone,
      clientName: sensitiveClientName,
      clientNotes: sensitiveNotes,
      contactCiphertext: sensitiveCiphertext,
      idempotencyKey: 'intake-privacy-test-001',
    },
    new Date('2026-10-12T08:00:00.000Z'),
  )

  const prep = prepareOwnerUrgentNotification({
    requestId: req.id,
    dayChoice: req.dayChoice,
    targetDate: req.targetDate,
  })

  // Assert NO PII in message
  assert.ok(!prep.message.includes(sensitiveClientName), 'Komunikat nie może zawierać nazwiska klienta')
  assert.ok(!prep.message.includes('Kowalska'), 'Komunikat nie może zawierać nazwiska')
  assert.ok(!prep.message.includes(sensitiveNotes), 'Komunikat nie może zawierać notatek ani opisu')
  assert.ok(!prep.message.includes('gryzie'), 'Komunikat nie może zawierać fragmentu notatek')
  assert.ok(!prep.message.includes('600999888'), 'Komunikat nie może zawierać surowego telefonu')
  assert.ok(!prep.message.includes(req.callerPhoneMasked), 'Komunikat nie może zawierać maskowanego telefonu')
  assert.ok(!prep.message.includes(req.callerPhoneFingerprint), 'Komunikat nie może zawierać fingerprintu')
  assert.ok(!prep.message.includes('enc:'), 'Komunikat nie może zawierać szyfrogramu')

  // Assert required fields are present
  assert.ok(prep.message.includes(req.id), 'Komunikat musi zawierać identyfikator zgłoszenia')
  assert.ok(prep.message.includes('dzisiaj (12.10.2026)'), 'Komunikat musi zawierać termin dzisiaj')
  assert.ok(prep.message.includes('DD.MM.RRRR.HH:MM'), 'Komunikat musi zawierać format odpowiedzi')
  assert.ok(prep.message.includes('12.10.2026.14:30'), 'Komunikat musi zawierać przykład odpowiedzi')

  // Assert length limit
  assert.ok(
    prep.characterCount <= MAX_OWNER_NOTIFICATION_SMS_LENGTH,
    `Długość SMS (${prep.characterCount}) przekracza ${MAX_OWNER_NOTIFICATION_SMS_LENGTH}`,
  )
  assert.equal(prep.characterCount, prep.message.length)
})
