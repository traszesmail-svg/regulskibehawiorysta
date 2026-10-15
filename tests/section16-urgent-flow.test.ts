import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createLocalDataSandbox } from '../scripts/lib/local-data-sandbox'
import {
  createUrgentIntakeRequest,
  getUrgentIntakeRequest,
  getUrgentIntakeEventByIdempotencyKey,
  proposeUrgentIntakeTimeslot,
  confirmUrgentIntakePayment,
  transitionUrgentIntakeState,
  mapRpcError,
  mapUrgentIntakeRequestRecord,
  mapUrgentIntakeEventRecord,
  resetSection16LocalStore,
  readSection16StoreSnapshot,
} from '../lib/server/section16-store'
import {
  parseOwnerProposalStructure,
  parseOwnerProposalStructureOrThrow,
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
import { createAvailabilitySlot, resetAvailabilityLocalStore } from '../lib/server/local-store'

let sandbox: Awaited<ReturnType<typeof createLocalDataSandbox>> | null = null

async function seedDefaultFlowSlots() {
  const ref = new Date('2026-10-12T00:00:00.000Z')
  const dates = ['2026-10-12', '2026-10-13']
  const times = [
    '09:00',
    '09:15',
    '10:00',
    '11:00',
    '12:00',
    '14:00',
    '14:30',
    '15:00',
    '16:00',
    '17:00',
  ]
  for (const date of dates) {
    for (const time of times) {
      await createAvailabilitySlot(date, time, undefined, ref).catch(() => {})
    }
  }
}

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
  await resetAvailabilityLocalStore()
  await seedDefaultFlowSlots()
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
        expectedVersion: req.version,
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
    expectedVersion: req.version,
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
    response: '12.10.2026.14:30',
    holdDurationMinutes: 5,
    idempotencyKey: 'prop-ttl-min',
    expectedVersion: reqMin.version,
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
    response: '12.10.2026.15:00',
    holdDurationMinutes: 120,
    idempotencyKey: 'prop-ttl-max',
    expectedVersion: reqMax.version,
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
        expectedVersion: reqInvalid1.version,
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
        expectedVersion: reqInvalid1.version,
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
        expectedVersion: reqInvalid1.version,
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
          expectedVersion: req.version,
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
  assert.equal(eventsForReq1[1].payload?.expectedVersion, 1, 'Zapisane zdarzenie musi mieć payload.expectedVersion zgodne z wersją pierwotną')

  // Second call (exact retry)
  const retry = await processOwnerProposalAndSetHold({
    requestId: req.id,
    response: '12.10.2026.15:00',
    idempotencyKey: 'prop-retry-key-001',
    holdDurationMinutes: 30,
    expectedVersion: 1,
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
    expectedVersion: 1,
    now,
  })

  // 11b. Idempotency Conflict: same key, different response/payload
  await assert.rejects(
    async () => {
      await processOwnerProposalAndSetHold({
        requestId: req.id,
        response: '12.10.2026.16:00', // Different response!
        idempotencyKey: 'prop-base-key',
        expectedVersion: 1,
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
        expectedVersion: 2,
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
        expectedVersion: expiredReq.version,
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
      expectedVersion: req.version,
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

// ---------------------------------------------------------------------------
// 14. CAS EXPECTEDVERSION: FAIL-CLOSED BEZ MUTACJI I BEZ NOWEGO ZDARZENIA
// ---------------------------------------------------------------------------
test('14. CAS expectedVersion: brak/NaN/0/ujemne/ułamkowe fail-closed bez nowego zdarzenia', async () => {
  const now = new Date('2026-10-12T08:00:00.000Z')
  const req = await createUrgentIntakeRequest(
    {
      dayChoice: 'today',
      targetDate: '2026-10-12',
      rawPhone: '+48600111222',
      idempotencyKey: 'intake-cas-audit-001',
    },
    now,
  )

  const snapBefore = await readSection16StoreSnapshot()
  const initialEventCount = snapBefore.urgentEvents.length

  const invalidVersions: any[] = [
    undefined,
    null,
    Number.NaN,
    0,
    -1,
    -42,
    1.5,
    2.718,
    '1',
    'one',
  ]

  for (let i = 0; i < invalidVersions.length; i++) {
    const inv = invalidVersions[i]
    await assert.rejects(
      async () => {
        await processOwnerProposalAndSetHold({
          requestId: req.id,
          response: '12.10.2026.15:00',
          idempotencyKey: `prop-cas-invalid-${i}`,
          expectedVersion: inv,
          now,
        })
      },
      (err: any) => {
        assert.ok(err instanceof Section16ValidationError, `Oczekiwano Section16ValidationError dla ${String(inv)}`)
        return true
      },
    )
  }

  // Assert fail-closed: zero new events created, record version unchanged
  const snapAfter = await readSection16StoreSnapshot()
  assert.equal(snapAfter.urgentEvents.length, initialEventCount, 'Żadne zdarzenie nie może powstać przy nieprawidłowym expectedVersion')

  const unchangedReq = await getUrgentIntakeRequest(req.id)
  assert.equal(unchangedReq?.version, 1, 'Wersja rekordu nie mogła ulec zmianie')
  assert.equal(unchangedReq?.state, 'pending_proposal', 'Stan rekordu nie mógł ulec zmianie')
})

// ---------------------------------------------------------------------------
// 15. DOKŁADNY RETRY PO EXPIRESAT, HOLDEXPIRESAT I PROPONOWANEJ GODZINIE
// ---------------------------------------------------------------------------
test('15. Dokładny retry po expiresAt, po holdExpiresAt i po proponowanej godzinie: ten sam rekord, isRetry: true, zero nowego zdarzenia i zero zmiany hold', async () => {
  const t0 = new Date('2026-10-12T08:00:00.000Z')
  const req = await createUrgentIntakeRequest(
    {
      dayChoice: 'today',
      targetDate: '2026-10-12',
      rawPhone: '+48600111222',
      idempotencyKey: 'intake-retry-durable-001',
      expiresAt: '2026-10-12T10:00:00.000Z', // Request expires at 10:00
    },
    t0,
  )

  // First call establishes proposal at 11:00 with 15 min hold (hold expires at 08:15)
  const first = await processOwnerProposalAndSetHold({
    requestId: req.id,
    response: '12.10.2026.11:00',
    idempotencyKey: 'retry-durable-prop-001',
    holdDurationMinutes: 15,
    expectedVersion: 1,
    now: t0,
  })

  assert.equal(first.isRetry, false)
  assert.equal(first.request.state, 'timeslot_proposed')
  assert.equal(first.request.version, 2)
  const initialHoldExpiresAt = first.request.holdExpiresAt
  assert.equal(initialHoldExpiresAt, '2026-10-12T08:15:00.000Z')

  const snapAfterFirst = await readSection16StoreSnapshot()
  const eventCountAfterFirst = snapAfterFirst.urgentEvents.length

  // Advance time far into the future (days later)
  const tFuture = new Date('2026-10-15T12:00:00.000Z')
  assert.ok(tFuture.getTime() > Date.parse(first.request.expiresAt), 'tFuture musi być po expiresAt')
  assert.ok(tFuture.getTime() > Date.parse(initialHoldExpiresAt!), 'tFuture musi być po holdExpiresAt')
  assert.ok(tFuture.getTime() > Date.parse(first.parsedProposal.isoTimestamp), 'tFuture musi być po zaproponowanym terminie')

  // Exact retry with the original expectedVersion (1) and same payload
  const retry = await processOwnerProposalAndSetHold({
    requestId: req.id,
    response: '12.10.2026.11:00',
    idempotencyKey: 'retry-durable-prop-001',
    holdDurationMinutes: 15,
    expectedVersion: 1,
    now: tFuture,
  })

  assert.equal(retry.isRetry, true, 'isRetry musi wynosić true')
  assert.equal(retry.request.id, first.request.id)
  assert.equal(retry.request.version, 2, 'Wersja nie może się zmienić')
  assert.equal(retry.request.state, 'timeslot_proposed')
  assert.equal(retry.request.holdExpiresAt, initialHoldExpiresAt, 'Czas blokady nie może ulec zmianie ani przedłużeniu')
  assert.equal(retry.parsedProposal.isoTimestamp, first.parsedProposal.isoTimestamp)

  const snapAfterRetry = await readSection16StoreSnapshot()
  assert.equal(snapAfterRetry.urgentEvents.length, eventCountAfterFirst, 'Nie może powstać żadne nowe zdarzenie')
})

// ---------------------------------------------------------------------------
// 16. RETRY Z INNYM REQUESTID / RESPONSE / TTL / PAYLOADEM -> IDEMPOTENCY_CONFLICT
// ---------------------------------------------------------------------------
test('16. Retry z tym samym kluczem, ale innym requestId/response/TTL/payload -> IDEMPOTENCY_CONFLICT', async () => {
  const now = new Date('2026-10-12T08:00:00.000Z')
  const reqA = await createUrgentIntakeRequest(
    {
      dayChoice: 'today',
      targetDate: '2026-10-12',
      rawPhone: '+48600111222',
      idempotencyKey: 'intake-idem-matrix-a',
    },
    now,
  )
  const reqB = await createUrgentIntakeRequest(
    {
      dayChoice: 'today',
      targetDate: '2026-10-12',
      rawPhone: '+48600333444',
      idempotencyKey: 'intake-idem-matrix-b',
    },
    now,
  )

  const conflictKey = 'prop-idem-conflict-matrix'
  await processOwnerProposalAndSetHold({
    requestId: reqA.id,
    response: '12.10.2026.11:00',
    idempotencyKey: conflictKey,
    holdDurationMinutes: 30,
    expectedVersion: 1,
    payload: { source: 'unit-test' },
    now,
  })

  // Verify stored event has payload.expectedVersion === 1
  const snapAfterInit = await readSection16StoreSnapshot()
  const initialEvent = snapAfterInit.urgentEvents.find((e) => e.idempotencyKey === conflictKey)
  assert.ok(initialEvent)
  assert.equal(initialEvent.payload?.expectedVersion, 1, 'Zapisane zdarzenie ma payload.expectedVersion zgodne z wersją pierwotną')

  // 16a. Different requestId
  await assert.rejects(
    async () => {
      await processOwnerProposalAndSetHold({
        requestId: reqB.id,
        response: '12.10.2026.11:00',
        idempotencyKey: conflictKey,
        holdDurationMinutes: 30,
        expectedVersion: 1,
        payload: { source: 'unit-test' },
        now,
      })
    },
    (err: any) => err instanceof Section16IdempotencyConflictError,
  )

  // 16b. Different response
  await assert.rejects(
    async () => {
      await processOwnerProposalAndSetHold({
        requestId: reqA.id,
        response: '12.10.2026.12:00',
        idempotencyKey: conflictKey,
        holdDurationMinutes: 30,
        expectedVersion: 1,
        payload: { source: 'unit-test' },
        now,
      })
    },
    (err: any) => err instanceof Section16IdempotencyConflictError,
  )

  // 16c. Malformed response
  await assert.rejects(
    async () => {
      await processOwnerProposalAndSetHold({
        requestId: reqA.id,
        response: 'bad-response-format',
        idempotencyKey: conflictKey,
        holdDurationMinutes: 30,
        expectedVersion: 1,
        payload: { source: 'unit-test' },
        now,
      })
    },
    (err: any) => err instanceof Section16IdempotencyConflictError,
  )

  // 16d. Different holdDurationMinutes (TTL)
  await assert.rejects(
    async () => {
      await processOwnerProposalAndSetHold({
        requestId: reqA.id,
        response: '12.10.2026.11:00',
        idempotencyKey: conflictKey,
        holdDurationMinutes: 60,
        expectedVersion: 1,
        payload: { source: 'unit-test' },
        now,
      })
    },
    (err: any) => err instanceof Section16IdempotencyConflictError,
  )

  // 16e. Different payload
  await assert.rejects(
    async () => {
      await processOwnerProposalAndSetHold({
        requestId: reqA.id,
        response: '12.10.2026.11:00',
        idempotencyKey: conflictKey,
        holdDurationMinutes: 30,
        expectedVersion: 1,
        payload: { source: 'unit-test-modified' },
        now,
      })
    },
    (err: any) => err instanceof Section16IdempotencyConflictError,
  )

  // 16f. Different expectedVersion (2 instead of 1) -> IDEMPOTENCY_CONFLICT
  await assert.rejects(
    async () => {
      await processOwnerProposalAndSetHold({
        requestId: reqA.id,
        response: '12.10.2026.11:00',
        idempotencyKey: conflictKey,
        holdDurationMinutes: 30,
        expectedVersion: 2,
        payload: { source: 'unit-test' },
        now,
      })
    },
    (err: any) => err instanceof Section16IdempotencyConflictError,
  )

  // 16g. Different expectedVersion (999 instead of 1) -> IDEMPOTENCY_CONFLICT
  await assert.rejects(
    async () => {
      await processOwnerProposalAndSetHold({
        requestId: reqA.id,
        response: '12.10.2026.11:00',
        idempotencyKey: conflictKey,
        holdDurationMinutes: 30,
        expectedVersion: 999,
        payload: { source: 'unit-test' },
        now,
      })
    },
    (err: any) => err instanceof Section16IdempotencyConflictError,
  )
})

// ---------------------------------------------------------------------------
// 17. CZYSTE TESTY MAPPERÓW (SNAKE_CASE -> CAMELCASE) I FAIL-CLOSED
// ---------------------------------------------------------------------------
test('17. Czyste testy mapperów: realistyczny rekord Supabase snake_case i fail-closed na błędnych danych', () => {
  // 17a. UrgentIntakeRequest mapper: valid realistic Supabase PostgREST record
  const realisticSupabaseRequest = {
    id: '918d3600-47b7-4b72-8f96-261ec4cf3615',
    day_choice: 'today',
    target_date: '2026-10-12',
    caller_phone_fingerprint: 'call_fp:abc123456789',
    caller_phone_masked: '+48 600 *** 222',
    contact_ciphertext: 'enc:blob_1234567890abcdef',
    client_name: 'Jan Testowy',
    client_notes: 'Pilny przypadek',
    state: 'timeslot_proposed',
    proposed_date: '2026-10-12',
    proposed_time: '14:30',
    proposed_timeslot_iso: '2026-10-12T12:30:00.000Z',
    hold_expires_at: '2026-10-12T13:00:00.000Z',
    expires_at: '2026-10-13T08:00:00.000Z',
    payment_reference: 'pay_ref_test_01',
    booking_id: 'a0000000-0000-0000-0000-000000000001',
    version: 2,
    idempotency_key: 'idem-map-req-01',
    created_at: '2026-10-12T08:00:00.000Z',
    updated_at: '2026-10-12T08:05:00.000Z',
  }

  const mappedReq = mapUrgentIntakeRequestRecord(realisticSupabaseRequest)
  assert.equal(mappedReq.id, realisticSupabaseRequest.id)
  assert.equal(mappedReq.dayChoice, 'today')
  assert.equal(mappedReq.targetDate, '2026-10-12')
  assert.equal(mappedReq.callerPhoneFingerprint, 'call_fp:abc123456789')
  assert.equal(mappedReq.callerPhoneMasked, '+48 600 *** 222')
  assert.equal(mappedReq.contactCiphertext, 'enc:blob_1234567890abcdef')
  assert.equal(mappedReq.clientName, 'Jan Testowy')
  assert.equal(mappedReq.clientNotes, 'Pilny przypadek')
  assert.equal(mappedReq.state, 'timeslot_proposed')
  assert.equal(mappedReq.proposedDate, '2026-10-12')
  assert.equal(mappedReq.proposedTime, '14:30')
  assert.equal(mappedReq.proposedTimeslotIso, '2026-10-12T12:30:00.000Z')
  assert.equal(mappedReq.holdExpiresAt, '2026-10-12T13:00:00.000Z')
  assert.equal(mappedReq.expiresAt, '2026-10-13T08:00:00.000Z')
  assert.equal(mappedReq.paymentReference, 'pay_ref_test_01')
  assert.equal(mappedReq.bookingId, 'a0000000-0000-0000-0000-000000000001')
  assert.equal(mappedReq.version, 2)
  assert.equal(mappedReq.idempotencyKey, 'idem-map-req-01')
  assert.equal(mappedReq.createdAt, '2026-10-12T08:00:00.000Z')
  assert.equal(mappedReq.updatedAt, '2026-10-12T08:05:00.000Z')

  // 17b. Negative tests for UrgentIntakeRequest mapper
  assert.throws(() => mapUrgentIntakeRequestRecord(null), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapUrgentIntakeRequestRecord('string'), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapUrgentIntakeRequestRecord([]), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapUrgentIntakeRequestRecord({ ...realisticSupabaseRequest, id: '' }), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapUrgentIntakeRequestRecord({ ...realisticSupabaseRequest, day_choice: 'next_week' }), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapUrgentIntakeRequestRecord({ ...realisticSupabaseRequest, target_date: 'invalid-date' }), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapUrgentIntakeRequestRecord({ ...realisticSupabaseRequest, caller_phone_fingerprint: '' }), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapUrgentIntakeRequestRecord({ ...realisticSupabaseRequest, caller_phone_masked: '' }), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapUrgentIntakeRequestRecord({ ...realisticSupabaseRequest, state: 'unknown_state' }), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapUrgentIntakeRequestRecord({ ...realisticSupabaseRequest, version: 0 }), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapUrgentIntakeRequestRecord({ ...realisticSupabaseRequest, version: -5 }), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapUrgentIntakeRequestRecord({ ...realisticSupabaseRequest, version: 1.5 }), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapUrgentIntakeRequestRecord({ ...realisticSupabaseRequest, version: Number.NaN }), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapUrgentIntakeRequestRecord({ ...realisticSupabaseRequest, idempotency_key: '' }), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapUrgentIntakeRequestRecord({ ...realisticSupabaseRequest, expires_at: '' }), (err: any) => err instanceof Section16ValidationError)

  // 17c. UrgentIntakeEvent mapper: valid realistic Supabase PostgREST record
  const realisticSupabaseEvent = {
    id: 'e1000000-0000-0000-0000-000000000001',
    request_id: '918d3600-47b7-4b72-8f96-261ec4cf3615',
    event_type: 'timeslot_proposed',
    from_state: 'pending_proposal',
    to_state: 'timeslot_proposed',
    payload: { response: '12.10.2026.14:30', holdDurationMinutes: 30 },
    payload_hash: 'hash1234567890abcdef',
    idempotency_key: 'idem-map-event-01',
    created_at: '2026-10-12T08:05:00.000Z',
  }

  const mappedEv = mapUrgentIntakeEventRecord(realisticSupabaseEvent)
  assert.equal(mappedEv.id, realisticSupabaseEvent.id)
  assert.equal(mappedEv.requestId, realisticSupabaseEvent.request_id)
  assert.equal(mappedEv.eventType, 'timeslot_proposed')
  assert.equal(mappedEv.fromState, 'pending_proposal')
  assert.equal(mappedEv.toState, 'timeslot_proposed')
  assert.deepEqual(mappedEv.payload, realisticSupabaseEvent.payload)
  assert.equal(mappedEv.payloadHash, 'hash1234567890abcdef')
  assert.equal(mappedEv.idempotencyKey, 'idem-map-event-01')
  assert.equal(mappedEv.createdAt, '2026-10-12T08:05:00.000Z')

  // 17d. Negative tests for UrgentIntakeEvent mapper
  assert.throws(() => mapUrgentIntakeEventRecord(null), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapUrgentIntakeEventRecord('string'), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapUrgentIntakeEventRecord({ ...realisticSupabaseEvent, id: '' }), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapUrgentIntakeEventRecord({ ...realisticSupabaseEvent, request_id: '' }), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapUrgentIntakeEventRecord({ ...realisticSupabaseEvent, event_type: '' }), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapUrgentIntakeEventRecord({ ...realisticSupabaseEvent, to_state: 'bad_state' }), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapUrgentIntakeEventRecord({ ...realisticSupabaseEvent, from_state: 'bad_state' }), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapUrgentIntakeEventRecord({ ...realisticSupabaseEvent, payload: null }), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapUrgentIntakeEventRecord({ ...realisticSupabaseEvent, payload: 'not-an-object' }), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapUrgentIntakeEventRecord({ ...realisticSupabaseEvent, payload_hash: '' }), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapUrgentIntakeEventRecord({ ...realisticSupabaseEvent, idempotency_key: '' }), (err: any) => err instanceof Section16ValidationError)
  assert.throws(() => mapUrgentIntakeEventRecord({ ...realisticSupabaseEvent, created_at: '' }), (err: any) => err instanceof Section16ValidationError)
})

// ---------------------------------------------------------------------------
// 18. PARYTET SUPABASE: WYNIKI PILNYCH RPC I ODCZYTÓW PRZECHODZĄ PRZEZ MAPPER
// ---------------------------------------------------------------------------
test('18. Parytet Supabase: wyniki pilnych RPC i odczytów przechodzą przez mapper (audyt statyczny)', () => {
  const storeSource = readFileSync('lib/server/section16-store.ts', 'utf8')

  // 18a. create_urgent_intake_request uses mapUrgentIntakeRequestRecord
  assert.ok(
    storeSource.includes("create_urgent_intake_request'") &&
      storeSource.includes('return mapUrgentIntakeRequestRecord(data)'),
    'create_urgent_intake_request musi przekazywać wynik przez mapUrgentIntakeRequestRecord',
  )

  // 18b. propose_urgent_intake_timeslot uses mapUrgentIntakeRequestRecord
  assert.ok(
    storeSource.includes("propose_urgent_intake_timeslot'"),
    'propose_urgent_intake_timeslot musi być wywoływane w sekcji supabase',
  )

  // 18c. confirm_urgent_intake_payment uses mapUrgentIntakeRequestRecord
  assert.ok(
    storeSource.includes("confirm_urgent_intake_payment'"),
    'confirm_urgent_intake_payment musi być wywoływane w sekcji supabase',
  )

  // 18d. transition_urgent_intake_state uses mapUrgentIntakeRequestRecord
  assert.ok(
    storeSource.includes("transition_urgent_intake_state'"),
    'transition_urgent_intake_state musi być wywoływane w sekcji supabase',
  )

  // 18e. getUrgentIntakeRequest uses mapUrgentIntakeRequestRecord
  assert.ok(
    storeSource.includes("from('urgent_intake_requests')") &&
      storeSource.includes('mapUrgentIntakeRequestRecord(data)'),
    'getUrgentIntakeRequest w sekcji supabase musi mapować dane przez mapUrgentIntakeRequestRecord',
  )

  // 18f. getUrgentIntakeEventByIdempotencyKey uses mapUrgentIntakeEventRecord
  assert.ok(
    storeSource.includes("from('urgent_intake_events')") &&
      storeSource.includes('mapUrgentIntakeEventRecord(data)'),
    'getUrgentIntakeEventByIdempotencyKey w sekcji supabase musi mapować dane przez mapUrgentIntakeEventRecord',
  )

  // 18g. Zero unsafe raw cast in urgent path
  assert.ok(
    !storeSource.includes('data as UrgentIntakeRequest'),
    'Zakaz pozostawiania niebezpiecznego "data as UrgentIntakeRequest" w store',
  )
  assert.ok(
    !storeSource.includes('data as UrgentIntakeEvent'),
    'Zakaz pozostawiania niebezpiecznego "data as UrgentIntakeEvent" w store',
  )
})

// ---------------------------------------------------------------------------
// 19. MAPOWANIE BŁĘDÓW RPC: REQUEST_EXPIRED, DATE_MISMATCH, INVALID_HOLD
// ---------------------------------------------------------------------------
test('19. Mapowanie błędów RPC: REQUEST_EXPIRED, DATE_MISMATCH, INVALID_HOLD na właściwe błędy', () => {
  // REQUEST_EXPIRED -> Section16HoldExpiredError
  assert.throws(
    () => mapRpcError({ message: 'REQUEST_EXPIRED: Zgłoszenie pilne wygasło przed propozycją terminu' }),
    (err: any) => {
      assert.ok(err instanceof Section16HoldExpiredError)
      assert.equal(err.code, 'HOLD_EXPIRED')
      return true
    },
  )

  // DATE_MISMATCH -> Section16ValidationError
  assert.throws(
    () => mapRpcError({ message: 'DATE_MISMATCH: Proponowana data 2026-10-13 nie zgadza się z wybranym dniem docelowym 2026-10-12' }),
    (err: any) => {
      assert.ok(err instanceof Section16ValidationError)
      assert.equal(err.code, 'VALIDATION_ERROR')
      return true
    },
  )

  // INVALID_HOLD -> Section16ValidationError
  assert.throws(
    () => mapRpcError({ message: 'INVALID_HOLD: Czas wygaśnięcia blokady musi być w przyszłości' }),
    (err: any) => {
      assert.ok(err instanceof Section16ValidationError)
      assert.equal(err.code, 'VALIDATION_ERROR')
      return true
    },
  )
})

// ---------------------------------------------------------------------------
// 20. NIEISTNIEJĄCY TARGETDATE W PRZYGOTOWANIU POWIADOMIENIA -> ODRZUCENIE
// ---------------------------------------------------------------------------
test('20. Nieistniejący targetDate w przygotowaniu powiadomienia: odrzucenie kalendarzowe', () => {
  const invalidTargetDates = [
    '2026-02-29', // 2026 nie jest przestępny
    '2026-02-30',
    '2026-02-31',
    '2026-04-31', // Kwiecień ma 30 dni
    '2026-06-31', // Czerwiec ma 30 dni
    '2026-09-31', // Wrzesień ma 30 dni
    '2026-11-31', // Listopad ma 30 dni
    '2026-13-10', // Miesiąc 13
    '2026-00-10', // Miesiąc 0
    '2026-10-00', // Dzień 0
    '2026-10-32', // Dzień 32
  ]

  for (const invalidDate of invalidTargetDates) {
    assert.throws(
      () => {
        prepareOwnerUrgentNotification({
          requestId: 'test-req-calendar-01',
          dayChoice: 'today',
          targetDate: invalidDate,
        })
      },
      (err: any) => {
        assert.ok(err instanceof Section16ValidationError, `Oczekiwano błędu dla daty ${invalidDate}`)
        return true
      },
    )
  }

  // Poprawne daty nie mogą rzucać błędów
  const validLeap = prepareOwnerUrgentNotification({
    requestId: 'test-req-calendar-ok1',
    dayChoice: 'today',
    targetDate: '2024-02-29', // 2024 jest przestępny
  })
  assert.ok(validLeap.message.includes('29.02.2024'))

  const validStandard = prepareOwnerUrgentNotification({
    requestId: 'test-req-calendar-ok2',
    dayChoice: 'tomorrow',
    targetDate: '2026-10-13',
  })
  assert.ok(validStandard.message.includes('13.10.2026'))
})

// ---------------------------------------------------------------------------
// 21. ROZDZIAŁ PARSERA STRUKTURALNEGO OD REGUŁY ŚCIŚLE W PRZYSZŁOŚCI
// ---------------------------------------------------------------------------
test('21. Rozdział parsera strukturalnego od reguły ściśle w przyszłości', () => {
  // Propozycja w czasie przeszłym względem zegara referencyjnego
  const pastRef = new Date('2026-10-12T16:00:00.000Z')

  // 1. Parser strukturalny parsuje poprawnie strukturę, kalendarz i DST bez błędu czasu
  const structResult = parseOwnerProposalStructure('12.10.2026.14:00', '2026-10-12')
  assert.equal(structResult.success, true)
  if (structResult.success) {
    assert.equal(structResult.data.formattedDate, '2026-10-12')
    assert.equal(structResult.data.formattedTime, '14:00')
    assert.equal(structResult.data.isoTimestamp, '2026-10-12T12:00:00.000Z')
    assert.equal(structResult.data.warsawOffset, '+02:00')
  }

  const structOrThrow = parseOwnerProposalStructureOrThrow('12.10.2026.14:00', '2026-10-12')
  assert.equal(structOrThrow.formattedTime, '14:00')

  // 2. Parser z walidacją czasu względem `pastRef` (gdzie 14:00 jest w przeszłości) odrzuca termin
  const timeResult = parseOwnerProposalResponse('12.10.2026.14:00', '2026-10-12', pastRef)
  assert.equal(timeResult.success, false)
  if (!timeResult.success) {
    assert.equal(timeResult.error.code, 'PAST_OR_CURRENT_TIME')
  }

  assert.throws(
    () => parseOwnerProposalResponseOrThrow('12.10.2026.14:00', '2026-10-12', pastRef),
    (err: any) => err.code === 'PAST_OR_CURRENT_TIME',
  )
})

// ---------------------------------------------------------------------------
// 22. REGRESJA: EXPECTEDVERSION W TOŻSAMOŚCI RETRY I KANONICZNYM PAYLOADZIE ZDARZENIA
// ---------------------------------------------------------------------------
test('22. Regresja: expectedVersion w tożsamości retry i kanonicznym payloadzie zdarzenia', async () => {
  const now = new Date('2026-10-12T08:00:00.000Z')
  const req = await createUrgentIntakeRequest(
    {
      dayChoice: 'today',
      targetDate: '2026-10-12',
      rawPhone: '+48600111222',
      idempotencyKey: 'intake-cas-retry-reg-001',
    },
    now,
  )

  const idempotencyKey = 'prop-cas-retry-reg-001'
  const first = await processOwnerProposalAndSetHold({
    requestId: req.id,
    response: '12.10.2026.11:00',
    idempotencyKey,
    holdDurationMinutes: 30,
    expectedVersion: 1,
    payload: { channel: 'sms' },
    now,
  })

  assert.equal(first.isRetry, false)
  assert.equal(first.request.state, 'timeslot_proposed')
  assert.equal(first.request.version, 2)

  // Potwierdź, że zapisane zdarzenie ma payload.expectedVersion zgodne z wersją pierwotną (1)
  const snapAfterFirst = await readSection16StoreSnapshot()
  const event = snapAfterFirst.urgentEvents.find((e) => e.idempotencyKey === idempotencyKey)
  assert.ok(event, 'Zdarzenie timeslot_proposed musi istnieć')
  assert.equal(
    event.payload?.expectedVersion,
    1,
    'Zapisane zdarzenie ma payload.expectedVersion zgodne z wersją pierwotną',
  )

  const eventsCountBefore = snapAfterFirst.urgentEvents.length
  const reqBefore = snapAfterFirst.urgentIntakes.find((r) => r.id === req.id)

  // Retry z tym samym kluczem i identycznymi pozostałymi danymi, ale expectedVersion: 2 -> IDEMPOTENCY_CONFLICT
  await assert.rejects(
    async () => {
      await processOwnerProposalAndSetHold({
        requestId: req.id,
        response: '12.10.2026.11:00',
        idempotencyKey,
        holdDurationMinutes: 30,
        expectedVersion: 2,
        payload: { channel: 'sms' },
        now,
      })
    },
    (err: any) => err instanceof Section16IdempotencyConflictError,
  )

  // Retry z tym samym kluczem i identycznymi pozostałymi danymi, ale expectedVersion: 999 -> IDEMPOTENCY_CONFLICT
  await assert.rejects(
    async () => {
      await processOwnerProposalAndSetHold({
        requestId: req.id,
        response: '12.10.2026.11:00',
        idempotencyKey,
        holdDurationMinutes: 30,
        expectedVersion: 999,
        payload: { channel: 'sms' },
        now,
      })
    },
    (err: any) => err instanceof Section16IdempotencyConflictError,
  )

  // Zero nowego zdarzenia i zero zmiany rekordu
  const snapAfterConflicts = await readSection16StoreSnapshot()
  assert.equal(
    snapAfterConflicts.urgentEvents.length,
    eventsCountBefore,
    'Zero nowego zdarzenia po odrzuceniu retry ze zmienioną expectedVersion',
  )
  const reqAfterConflicts = snapAfterConflicts.urgentIntakes.find((r) => r.id === req.id)
  assert.deepEqual(
    reqAfterConflicts,
    reqBefore,
    'Zero zmiany rekordu po odrzuceniu retry ze zmienioną expectedVersion',
  )

  // Retry z pierwotną expectedVersion: 1 po upływie czasu działa bez błędu, zwraca isRetry: true, zero nowego zdarzenia i zero mutacji
  const tFuture = new Date('2026-10-15T12:00:00.000Z')
  const retryOk = await processOwnerProposalAndSetHold({
    requestId: req.id,
    response: '12.10.2026.11:00',
    idempotencyKey,
    holdDurationMinutes: 30,
    expectedVersion: 1,
    payload: { channel: 'sms' },
    now: tFuture,
  })

  assert.equal(retryOk.isRetry, true)
  assert.equal(retryOk.request.id, req.id)
  assert.equal(retryOk.request.version, 2)
  assert.equal(retryOk.request.state, 'timeslot_proposed')

  const snapAfterOkRetry = await readSection16StoreSnapshot()
  assert.equal(
    snapAfterOkRetry.urgentEvents.length,
    eventsCountBefore,
    'Zero nowego zdarzenia po poprawnym retry z oryginalną expectedVersion',
  )
})
