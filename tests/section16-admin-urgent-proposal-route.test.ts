import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createLocalDataSandbox } from '../scripts/lib/local-data-sandbox'
import {
  createUrgentIntakeRequest,
  getUrgentIntakeRequest,
  resetSection16LocalStore,
  readSection16StoreSnapshot,
} from '../lib/server/section16-store'
import {
  resolveWarsawIntakeTargetDate,
  getWarsawDateDetails,
} from '../lib/server/section16-policy'
import {
  createAdminSessionToken,
  ADMIN_SESSION_COOKIE,
} from '../lib/admin-auth'
import { createAvailabilitySlot, resetAvailabilityLocalStore } from '../lib/server/local-store'
import { POST } from '../app/api/admin/section16/urgent-requests/[id]/proposal/route'

let sandbox: Awaited<ReturnType<typeof createLocalDataSandbox>> | null = null
const TEST_ADMIN_SECRET = 'test-admin-secret-at-least-16-chars'
const BASIC_AUTH = 'Basic ' + Buffer.from(`admin:${TEST_ADMIN_SECRET}`).toString('base64')
const originalNodeEnv = process.env.NODE_ENV
const testEnvironment: Record<string, string | undefined> = process.env

async function seedAdminProposalSlots() {
  const tomorrow = resolveWarsawIntakeTargetDate('tomorrow', new Date())
  const today = resolveWarsawIntakeTargetDate('today', new Date())
  const times = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00']
  for (const date of [today, tomorrow]) {
    for (const time of times) {
      await createAvailabilitySlot(date, time, undefined, new Date()).catch(() => {})
    }
  }
}

test.before(async () => {
  testEnvironment.NODE_ENV = 'test'
  sandbox = await createLocalDataSandbox('section16-admin-proposal')
  process.env.APP_DATA_MODE = 'local'
  process.env.ADMIN_ACCESS_SECRET = TEST_ADMIN_SECRET
  process.env.CALL_SESSION_PHONE_SECRET = 'test-phone-secret-with-at-least-16-chars'
  process.env.SECTION16_ADMIN_PROPOSALS_ENABLED = 'true'
  await resetSection16LocalStore()
})

test.after(async () => {
  await sandbox?.cleanup()
  if (originalNodeEnv === undefined) delete testEnvironment.NODE_ENV
  else testEnvironment.NODE_ENV = originalNodeEnv
})

test('Produkcja odrzuca localhost mimo lokalnego store i testowego NODE_ENV', async () => {
  const previousVercelEnv = process.env.VERCEL_ENV
  const token = await createAdminSessionToken(TEST_ADMIN_SECRET)
  const before = await readSection16StoreSnapshot()
  try {
    process.env.VERCEL_ENV = 'production'
    for (const origin of ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://[::1]:3000']) {
      for (const auth of [{ auth: BASIC_AUTH }, { auth: null, cookie: `${ADMIN_SESSION_COOKIE}=${token}` }]) {
        const { res } = await callProposalRoute(randomUUID(), {}, { ...auth, origin })
        assert.equal(res.status, 403)
      }
    }
  } finally {
    if (previousVercelEnv === undefined) delete process.env.VERCEL_ENV
    else process.env.VERCEL_ENV = previousVercelEnv
  }
  assert.deepEqual(await readSection16StoreSnapshot(), before)
})

test.beforeEach(async () => {
  process.env.SECTION16_ADMIN_PROPOSALS_ENABLED = 'true'
  process.env.ADMIN_ACCESS_SECRET = TEST_ADMIN_SECRET
  await resetSection16LocalStore()
  await resetAvailabilityLocalStore()
  await seedAdminProposalSlots()
})

interface CallRouteOptions {
  auth?: string | null
  cookie?: string | null
  origin?: string | null
  referer?: string | null
  headers?: Record<string, string>
  rawBody?: string
}

async function callProposalRoute(
  id: string,
  body?: unknown,
  options: CallRouteOptions = {},
) {
  const headers = new Headers()

  // Default to Basic auth unless explicitly overridden
  if (options.auth !== undefined) {
    if (options.auth) headers.set('authorization', options.auth)
  } else if (options.cookie === undefined) {
    headers.set('authorization', BASIC_AUTH)
  }

  if (options.cookie) {
    headers.set('cookie', options.cookie)
  }

  if (options.origin) {
    headers.set('origin', options.origin)
  }

  if (options.referer) {
    headers.set('referer', options.referer)
  }

  if (options.headers) {
    for (const [k, v] of Object.entries(options.headers)) {
      headers.set(k, v)
    }
  }

  const reqBody = options.rawBody !== undefined
    ? options.rawBody
    : (body !== undefined ? JSON.stringify(body) : undefined)

  if (reqBody !== undefined && !headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }

  const req = new Request(`http://localhost:3000/api/admin/section16/urgent-requests/${id}/proposal`, {
    method: 'POST',
    headers,
    body: reqBody,
  })

  const res = await POST(req, { params: Promise.resolve({ id }) })
  const json = await res.json().catch(() => null)
  return { res, json }
}

function getTomorrowProposalValues() {
  const targetDate = resolveWarsawIntakeTargetDate('tomorrow', new Date())
  const [y, m, d] = targetDate.split('-')
  const responseTime = `${d}.${m}.${y}.10:00`
  return { targetDate, responseTime }
}

// ---------------------------------------------------------------------------
// 1. BRAK / BŁĘDNA AUTH
// ---------------------------------------------------------------------------
test('1. Brak lub błędna autoryzacja zwraca 401 z no-store i nagłówkiem challenge', async () => {
  const dummyId = randomUUID()

  // 1a. Brak jakichkolwiek nagłówków auth / cookie
  const noAuth = await callProposalRoute(dummyId, {}, { auth: null })
  assert.equal(noAuth.res.status, 401)
  assert.equal(noAuth.res.headers.get('Cache-Control'), 'no-store')
  assert.ok(noAuth.res.headers.get('WWW-Authenticate'))
  assert.match(noAuth.json?.error, /Brak autoryzacji/i)

  // 1b. Błędny login w Basic auth
  const badUser = 'Basic ' + Buffer.from(`wronguser:${TEST_ADMIN_SECRET}`).toString('base64')
  const badUserRes = await callProposalRoute(dummyId, {}, { auth: badUser })
  assert.equal(badUserRes.res.status, 401)
  assert.equal(badUserRes.res.headers.get('Cache-Control'), 'no-store')

  // 1c. Błędne hasło w Basic auth
  const badPass = 'Basic ' + Buffer.from(`admin:wrongpassword`).toString('base64')
  const badPassRes = await callProposalRoute(dummyId, {}, { auth: badPass })
  assert.equal(badPassRes.res.status, 401)
  assert.equal(badPassRes.res.headers.get('Cache-Control'), 'no-store')

  // 1d. Błędny format ciasteczka sesji
  const badCookieRes = await callProposalRoute(dummyId, {}, {
    auth: null,
    cookie: `${ADMIN_SESSION_COOKIE}=malformed.cookie.value`,
  })
  assert.equal(badCookieRes.res.status, 401)
  assert.equal(badCookieRes.res.headers.get('Cache-Control'), 'no-store')

  // 1e. Ciasteczko podpisane innym sekretem
  const otherSecretToken = await createAdminSessionToken('other-secret-at-least-16-chars')
  const otherSecretRes = await callProposalRoute(dummyId, {}, {
    auth: null,
    cookie: `${ADMIN_SESSION_COOKIE}=${otherSecretToken}`,
  })
  assert.equal(otherSecretRes.res.status, 401)
})

// ---------------------------------------------------------------------------
// 2. POPRAWNE BASIC / COOKIE
// ---------------------------------------------------------------------------
test('2. Poprawne uwierzytelnienie Basic oraz cookie sesji', async () => {
  const { targetDate, responseTime } = getTomorrowProposalValues()
  const req = await createUrgentIntakeRequest({
    dayChoice: 'tomorrow',
    targetDate,
    rawPhone: '+48600111222',
    idempotencyKey: 'intake-auth-001',
  })

  // 2a. Poprawny Basic auth
  const basicRes = await callProposalRoute(req.id, {
    response: responseTime,
    idempotencyKey: 'prop-auth-basic-001',
    expectedVersion: 1,
  }, { auth: BASIC_AUTH })
  assert.equal(basicRes.res.status, 200)
  assert.equal(basicRes.json?.id, req.id)
  assert.equal(basicRes.json?.state, 'timeslot_proposed')

  // 2b. Poprawne cookie sesji (na nowym rekordzie)
  const reqCookie = await createUrgentIntakeRequest({
    dayChoice: 'tomorrow',
    targetDate,
    rawPhone: '+48600222333',
    idempotencyKey: 'intake-auth-002',
  })
  const token = await createAdminSessionToken(TEST_ADMIN_SECRET)
  assert.ok(token)

  const [y, m, d] = targetDate.split('-')
  const responseTimeCookie = `${d}.${m}.${y}.11:00`
  const cookieRes = await callProposalRoute(reqCookie.id, {
    response: responseTimeCookie,
    idempotencyKey: 'prop-auth-cookie-001',
    expectedVersion: 1,
  }, {
    auth: null,
    cookie: `${ADMIN_SESSION_COOKIE}=${token}`,
    origin: 'http://localhost:3000',
  })
  assert.equal(cookieRes.res.status, 200)
  assert.equal(cookieRes.json?.id, reqCookie.id)
  assert.equal(cookieRes.json?.state, 'timeslot_proposed')
})

// ---------------------------------------------------------------------------
// 3. OCHRONA PRZED OBCYM ORIGIN PRZY COOKIE
// ---------------------------------------------------------------------------
test('3. Ochrona przed obcym Origin / Referer przy uwierzytelnieniu cookie', async () => {
  const { targetDate, responseTime } = getTomorrowProposalValues()
  const req = await createUrgentIntakeRequest({
    dayChoice: 'tomorrow',
    targetDate,
    rawPhone: '+48600111222',
    idempotencyKey: 'intake-origin-001',
  })

  const token = await createAdminSessionToken(TEST_ADMIN_SECRET)

  // 3a. Obcy Origin z ciasteczkiem -> 403 Forbidden, brak modyfikacji store
  const foreignOriginRes = await callProposalRoute(req.id, {
    response: responseTime,
    idempotencyKey: 'prop-origin-foreign-001',
    expectedVersion: 1,
  }, {
    auth: null,
    cookie: `${ADMIN_SESSION_COOKIE}=${token}`,
    origin: 'https://evil-attacker.example.com',
  })
  assert.equal(foreignOriginRes.res.status, 403)
  assert.equal(foreignOriginRes.res.headers.get('Cache-Control'), 'no-store')
  assert.match(foreignOriginRes.json?.error, /Cross-Origin/i)

  // Weryfikacja: sklep nie został zmutowany
  const reqAfterForeign = await getUrgentIntakeRequest(req.id)
  assert.equal(reqAfterForeign?.state, 'pending_proposal')
  assert.equal(reqAfterForeign?.version, 1)

  // 3b. Obcy Referer z ciasteczkiem -> 403 Forbidden
  const foreignRefererRes = await callProposalRoute(req.id, {
    response: responseTime,
    idempotencyKey: 'prop-origin-foreign-002',
    expectedVersion: 1,
  }, {
    auth: null,
    cookie: `${ADMIN_SESSION_COOKIE}=${token}`,
    referer: 'https://phishing.example.com/exploit',
  })
  assert.equal(foreignRefererRes.res.status, 403)

  // 3c. Zgodny Origin z ciasteczkiem -> sukces 200
  const sameOriginRes = await callProposalRoute(req.id, {
    response: responseTime,
    idempotencyKey: 'prop-origin-same-001',
    expectedVersion: 1,
  }, {
    auth: null,
    cookie: `${ADMIN_SESSION_COOKIE}=${token}`,
    origin: 'http://localhost:3000',
  })
  assert.equal(sameOriginRes.res.status, 200)
  assert.equal(sameOriginRes.json?.state, 'timeslot_proposed')
})

// ---------------------------------------------------------------------------
// 4. WYŁĄCZONA BRAMKA SERWEROWA (SECTION16_ADMIN_PROPOSALS_ENABLED)
// ---------------------------------------------------------------------------
test('4. Wyłączona bramka serwerowa: domyślny brak uprawnień i brak mutacji store', async () => {
  const { targetDate, responseTime } = getTomorrowProposalValues()
  const req = await createUrgentIntakeRequest({
    dayChoice: 'tomorrow',
    targetDate,
    rawPhone: '+48600111222',
    idempotencyKey: 'intake-gate-001',
  })

  // 4a. Bramka niezdefiniowana (domyślnie wyłączona)
  delete process.env.SECTION16_ADMIN_PROPOSALS_ENABLED

  const disabledRes = await callProposalRoute(req.id, {
    response: responseTime,
    idempotencyKey: 'prop-gate-001',
    expectedVersion: 1,
  })
  assert.equal(disabledRes.res.status, 403)
  assert.equal(disabledRes.res.headers.get('Cache-Control'), 'no-store')
  assert.match(disabledRes.json?.error, /SECTION16_ADMIN_PROPOSALS_ENABLED jest wyłączona/i)

  // Weryfikacja: stan rekordu w bazie nie zmienił się
  const reqAfterDisabled = await getUrgentIntakeRequest(req.id)
  assert.equal(reqAfterDisabled?.state, 'pending_proposal')
  assert.equal(reqAfterDisabled?.version, 1)

  // 4b. Bramka ustawiona jawnie na false
  process.env.SECTION16_ADMIN_PROPOSALS_ENABLED = 'false'
  const explicitFalseRes = await callProposalRoute(req.id, {
    response: responseTime,
    idempotencyKey: 'prop-gate-002',
    expectedVersion: 1,
  })
  assert.equal(explicitFalseRes.res.status, 403)

  // 4c. Bramka włączona -> sukces
  process.env.SECTION16_ADMIN_PROPOSALS_ENABLED = 'true'
  const enabledRes = await callProposalRoute(req.id, {
    response: responseTime,
    idempotencyKey: 'prop-gate-003',
    expectedVersion: 1,
  })
  assert.equal(enabledRes.res.status, 200)
  assert.equal(enabledRes.json?.state, 'timeslot_proposed')
})

// ---------------------------------------------------------------------------
// 5. BŁĘDNY JSON / BODY / TYPY / EXTRA FIELDS / WALIDACJA UUID
// ---------------------------------------------------------------------------
test('5. Walidacja UUID, JSON, typów pól i ścisłe odrzucanie nadmiarowych pól', async () => {
  const { targetDate, responseTime } = getTomorrowProposalValues()
  const req = await createUrgentIntakeRequest({
    dayChoice: 'tomorrow',
    targetDate,
    rawPhone: '+48600111222',
    idempotencyKey: 'intake-validation-001',
  })

  // 5a. Błędny format UUID w parametrze URL
  const invalidUuids = ['123', 'not-a-uuid', '0000-invalid', randomUUID() + '-extra', '']
  for (const badId of invalidUuids) {
    const res = await callProposalRoute(badId, {
      response: responseTime,
      idempotencyKey: 'prop-uuid-test',
      expectedVersion: 1,
    })
    assert.equal(res.res.status, 400, `Oczekiwano 400 dla nieprawidłowego UUID: ${badId}`)
    assert.match(res.json?.error, /UUID/i)
  }

  // 5b. Niepoprawny format JSON (składniowy)
  const badJsonRes = await callProposalRoute(req.id, undefined, {
    rawBody: '{ "response": "13.10.2026.10:00", invalid-json }',
  })
  assert.equal(badJsonRes.res.status, 400)
  assert.match(badJsonRes.json?.error, /JSON/i)

  // 5c. Ciało żądania niebędące obiektem (np. tablica, string)
  const arrayBodyRes = await callProposalRoute(req.id, undefined, { rawBody: '["array", "not", "object"]' })
  assert.equal(arrayBodyRes.res.status, 400)

  // 5d. Brakujące wymagane pola
  const missingResponse = await callProposalRoute(req.id, {
    idempotencyKey: 'key-1',
    expectedVersion: 1,
  })
  assert.equal(missingResponse.res.status, 400)

  const missingIdemp = await callProposalRoute(req.id, {
    response: responseTime,
    expectedVersion: 1,
  })
  assert.equal(missingIdemp.res.status, 400)

  const missingVersion = await callProposalRoute(req.id, {
    response: responseTime,
    idempotencyKey: 'key-1',
  })
  assert.equal(missingVersion.res.status, 400)

  // 5e. Błędne typy: expectedVersion (string, ułamkowa, 0, ujemna, NaN)
  const badVersions = ['1', 1.5, 0, -1, NaN, null]
  for (const bv of badVersions) {
    const res = await callProposalRoute(req.id, {
      response: responseTime,
      idempotencyKey: 'key-bv',
      expectedVersion: bv,
    })
    assert.equal(res.res.status, 400, `Oczekiwano 400 dla błędnego expectedVersion: ${bv}`)
  }

  // 5f. Błędne typy: holdDurationMinutes (poza zakresem 5-120, ułamkowa, string)
  const badTtls = [4, 121, 30.5, '30', 0, -10]
  for (const bt of badTtls) {
    const res = await callProposalRoute(req.id, {
      response: responseTime,
      idempotencyKey: 'key-bt',
      expectedVersion: 1,
      holdDurationMinutes: bt,
    })
    assert.equal(res.res.status, 400, `Oczekiwano 400 dla błędnego holdDurationMinutes: ${bt}`)
  }

  // 5g. Błędny format response
  const badResponses = [
    '2026-10-13 10:00', // ISO format
    '13.10.2026', // brak godziny
    '13.10.2026.10:00:00', // sekundy
    ' 13.10.2026.10:00', // spacje wiodące
    '13.10.2026.10:00 ', // spacje końcowe
    'Termin: 13.10.2026.10:00', // prefiks tekstowy
  ]
  for (const br of badResponses) {
    const res = await callProposalRoute(req.id, {
      response: br,
      idempotencyKey: 'key-br',
      expectedVersion: 1,
    })
    assert.equal(res.res.status, 400, `Oczekiwano 400 dla błędnego response formatu: ${br}`)
  }

  // 5h. Nadmiarowe pola (extra fields) - ściśle odrzucane
  const extraFieldsCases = [
    { now: new Date().toISOString() },
    { payload: { custom: 'data' } },
    { status: 'confirmed' },
    { state: 'timeslot_proposed' },
    { rawPhone: '+48600111222' },
    { phoneNumber: '+48600111222' },
    { adapter: 'custom' },
    { unexpectedField: 'foobar' },
  ]
  for (const extra of extraFieldsCases) {
    const res = await callProposalRoute(req.id, {
      response: responseTime,
      idempotencyKey: 'key-extra',
      expectedVersion: 1,
      ...extra,
    })
    assert.equal(res.res.status, 400, `Oczekiwano 400 dla extra field: ${JSON.stringify(extra)}`)
    assert.match(res.json?.error, /Niedozwolone pole w żądaniu/i)
  }
})

// ---------------------------------------------------------------------------
// 6. POPRAWNA PROPOZYCJA I MINIMALNE DTO
// ---------------------------------------------------------------------------
test('6. Poprawna propozycja: założenie blokady i minimalne DTO bez PII/audytu', async () => {
  const { targetDate, responseTime } = getTomorrowProposalValues()
  const req = await createUrgentIntakeRequest({
    dayChoice: 'tomorrow',
    targetDate,
    rawPhone: '+48600111222',
    clientName: 'Jan Kowalski',
    clientNotes: 'Poufne notatki behawioralne klienta',
    idempotencyKey: 'intake-success-001',
  })

  const proposalRes = await callProposalRoute(req.id, {
    response: responseTime,
    idempotencyKey: 'prop-success-001',
    expectedVersion: 1,
    holdDurationMinutes: 45,
  })

  assert.equal(proposalRes.res.status, 200)
  assert.equal(proposalRes.res.headers.get('Cache-Control'), 'no-store')

  const dto = proposalRes.json
  assert.ok(dto)

  // Wymagane pola DTO
  assert.equal(dto.id, req.id)
  assert.equal(dto.state, 'timeslot_proposed')
  assert.equal(dto.version, 2)
  assert.equal(dto.isRetry, false)
  assert.ok(typeof dto.holdExpiresAt === 'string')
  assert.ok(dto.proposal)
  assert.equal(dto.proposal.raw, responseTime)
  assert.equal(dto.proposal.formattedDate, targetDate)
  assert.equal(dto.proposal.formattedTime, '10:00')

  // Ścisła weryfikacja: BRAK wycieku poufnych danych z rekordu i audytu
  assert.equal(dto.callerPhoneFingerprint, undefined, 'Nie oddawaj callerPhoneFingerprint')
  assert.equal(dto.callerPhoneMasked, undefined, 'Nie oddawaj callerPhoneMasked')
  assert.equal(dto.contactCiphertext, undefined, 'Nie oddawaj contactCiphertext')
  assert.equal(dto.clientName, undefined, 'Nie oddawaj clientName')
  assert.equal(dto.clientNotes, undefined, 'Nie oddawaj clientNotes')
  assert.equal(dto.paymentReference, undefined, 'Nie oddawaj paymentReference')
  assert.equal(dto.bookingId, undefined, 'Nie oddawaj bookingId')
  assert.equal(dto.events, undefined, 'Nie oddawaj zdarzeń audytowych')
  assert.equal(dto.payload, undefined, 'Nie oddawaj wewnętrznego payloadu')

  // Weryfikacja stanu w store
  const storedReq = await getUrgentIntakeRequest(req.id)
  assert.ok(storedReq)
  assert.equal(storedReq.state, 'timeslot_proposed')
  assert.equal(storedReq.version, 2)
  assert.equal(storedReq.proposedDate, targetDate)
  assert.equal(storedReq.proposedTime, '10:00')
  assert.equal(storedReq.holdExpiresAt, dto.holdExpiresAt)
})

// ---------------------------------------------------------------------------
// 7. IDENTYCZNE RETRY BEZ NOWEGO AUDYTU
// ---------------------------------------------------------------------------
test('7. Identyczne retry bez nowego audytu i bez inkrementacji wersji', async () => {
  const { targetDate, responseTime } = getTomorrowProposalValues()
  const req = await createUrgentIntakeRequest({
    dayChoice: 'tomorrow',
    targetDate,
    rawPhone: '+48600111222',
    idempotencyKey: 'intake-retry-001',
  })

  // Pierwsze wywołanie
  const first = await callProposalRoute(req.id, {
    response: responseTime,
    idempotencyKey: 'prop-retry-key-001',
    expectedVersion: 1,
    holdDurationMinutes: 30,
  })
  assert.equal(first.res.status, 200)
  assert.equal(first.json?.isRetry, false)
  assert.equal(first.json?.version, 2)

  const snapAfterFirst = await readSection16StoreSnapshot()
  const eventsForReqFirst = snapAfterFirst.urgentEvents.filter((e) => e.requestId === req.id)
  assert.equal(eventsForReqFirst.length, 2, 'request_created + timeslot_proposed')

  // Drugie wywołanie (dokładny retry z tym samym kluczem i parametrami)
  const retry = await callProposalRoute(req.id, {
    response: responseTime,
    idempotencyKey: 'prop-retry-key-001',
    expectedVersion: 1,
    holdDurationMinutes: 30,
  })
  assert.equal(retry.res.status, 200)
  assert.equal(retry.json?.isRetry, true)
  assert.equal(retry.json?.version, 2)
  assert.equal(retry.json?.holdExpiresAt, first.json?.holdExpiresAt)

  const snapAfterRetry = await readSection16StoreSnapshot()
  const eventsForReqRetry = snapAfterRetry.urgentEvents.filter((e) => e.requestId === req.id)
  assert.equal(eventsForReqRetry.length, 2, 'Brak utworzenia nowego zdarzenia w audycie!')
})

// ---------------------------------------------------------------------------
// 8. KONFLIKTY PAYLOAD I CAS (409 CONFLICT)
// ---------------------------------------------------------------------------
test('8. Konflikty CAS, payloadu oraz stanu zwracają 409 Conflict', async () => {
  const { targetDate, responseTime } = getTomorrowProposalValues()
  const req = await createUrgentIntakeRequest({
    dayChoice: 'tomorrow',
    targetDate,
    rawPhone: '+48600111222',
    idempotencyKey: 'intake-conflict-001',
  })

  // 8a. Konflikt CAS (expectedVersion !== aktualna wersja)
  const casConflict = await callProposalRoute(req.id, {
    response: responseTime,
    idempotencyKey: 'prop-cas-err-001',
    expectedVersion: 99,
  })
  assert.equal(casConflict.res.status, 409)
  assert.equal(casConflict.res.headers.get('Cache-Control'), 'no-store')

  // Zrealizuj pierwszą poprawną propozycję
  const okProposal = await callProposalRoute(req.id, {
    response: responseTime,
    idempotencyKey: 'prop-base-key-001',
    expectedVersion: 1,
  })
  assert.equal(okProposal.res.status, 200)

  // 8b. Konflikt payloadu: ten sam idempotencyKey, ale inna godzina
  const [y, m, d] = targetDate.split('-')
  const differentResponseTime = `${d}.${m}.${y}.11:00`
  const payloadConflict = await callProposalRoute(req.id, {
    response: differentResponseTime,
    idempotencyKey: 'prop-base-key-001',
    expectedVersion: 1,
  })
  assert.equal(payloadConflict.res.status, 409)
  assert.match(payloadConflict.json?.error, /idempotenc/i)

  // 8c. Konflikt stanu: próba nowej propozycji ze świeżym kluczem, gdy status to już timeslot_proposed
  const stateConflict = await callProposalRoute(req.id, {
    response: differentResponseTime,
    idempotencyKey: 'prop-fresh-key-on-existing',
    expectedVersion: 2,
  })
  assert.equal(stateConflict.res.status, 409)
})

// ---------------------------------------------------------------------------
// 9. BRAK REKORDU (404 NOT FOUND)
// ---------------------------------------------------------------------------
test('9. Nieistniejący rekord zwraca 404 Not Found', async () => {
  const { responseTime } = getTomorrowProposalValues()
  const nonExistentId = randomUUID()

  const notFoundRes = await callProposalRoute(nonExistentId, {
    response: responseTime,
    idempotencyKey: 'prop-notfound-001',
    expectedVersion: 1,
  })
  assert.equal(notFoundRes.res.status, 404)
  assert.equal(notFoundRes.res.headers.get('Cache-Control'), 'no-store')
  assert.match(notFoundRes.json?.error, /nie znaleziono/i)
})

// ---------------------------------------------------------------------------
// 10. EXPIRY (410 GONE)
// ---------------------------------------------------------------------------
test('10. Zgłoszenie przeterminowane (expiresAt w przeszłości) zwraca 410 Gone', async () => {
  const { targetDate, responseTime } = getTomorrowProposalValues()
  // expiresAt 1 godzinę w przeszłości
  const pastExpiry = new Date(Date.now() - 3600 * 1000).toISOString()

  const expiredReq = await createUrgentIntakeRequest({
    dayChoice: 'tomorrow',
    targetDate,
    rawPhone: '+48600111222',
    expiresAt: pastExpiry,
    idempotencyKey: 'intake-expired-001',
  })

  const expiredRes = await callProposalRoute(expiredReq.id, {
    response: responseTime,
    idempotencyKey: 'prop-expired-001',
    expectedVersion: 1,
  })
  assert.equal(expiredRes.res.status, 410)
  assert.equal(expiredRes.res.headers.get('Cache-Control'), 'no-store')
  assert.match(expiredRes.json?.error, /wygasło/i)
})

// ---------------------------------------------------------------------------
// 11. BRAK SKUTKÓW ZEWNĘTRZNYCH
// ---------------------------------------------------------------------------
test('11. Brak skutków zewnętrznych: brak rezerwacji kalendarza, płatności i wysyłki SMS', async () => {
  const { targetDate, responseTime } = getTomorrowProposalValues()
  const req = await createUrgentIntakeRequest({
    dayChoice: 'tomorrow',
    targetDate,
    rawPhone: '+48600111222',
    idempotencyKey: 'intake-isolation-001',
  })

  const res = await callProposalRoute(req.id, {
    response: responseTime,
    idempotencyKey: 'prop-isolation-001',
    expectedVersion: 1,
  })
  assert.equal(res.res.status, 200)

  // Weryfikacja: zgłoszenie nie ma powiązania z kalendarzem ani referencji płatności
  const updatedReq = await getUrgentIntakeRequest(req.id)
  assert.ok(updatedReq)
  assert.equal(updatedReq.bookingId, null, 'Zgłoszenie nie może mieć bookingId (brak integracji kalendarza)')
  assert.equal(updatedReq.paymentReference, null, 'Zgłoszenie nie może mieć paymentReference')

  // Weryfikacja snapshotu magazynu sekcji 16: brak nieautoryzowanych uprawnień i innych encji
  const snap = await readSection16StoreSnapshot()
  assert.equal(snap.talkEntitlements.length, 0, 'Zero wygenerowanych uprawnień rozmowy w tym etapie')
})

// ---------------------------------------------------------------------------
// 12. FOREIGN ORIGIN + SPOOFED FORWARDED HOST
// ---------------------------------------------------------------------------
test('12. Odrzucenie obcego Origin ze spoofowanym x-forwarded-host / Host oraz kontrola snapshotu', async () => {
  const { targetDate, responseTime } = getTomorrowProposalValues()
  const req = await createUrgentIntakeRequest({
    dayChoice: 'tomorrow',
    targetDate,
    rawPhone: '+48600111222',
    idempotencyKey: 'intake-spoof-001',
  })
  const token = await createAdminSessionToken(TEST_ADMIN_SECRET)
  const snapBefore = await readSection16StoreSnapshot()

  // 12a. Obcy Origin z ciasteczkiem i spoofowanym nagłówkiem x-forwarded-host / host
  const spoofCookieRes = await callProposalRoute(req.id, {
    response: responseTime,
    idempotencyKey: 'prop-spoof-cookie-001',
    expectedVersion: 1,
  }, {
    auth: null,
    cookie: `${ADMIN_SESSION_COOKIE}=${token}`,
    origin: 'https://attacker.example.com',
    headers: {
      'x-forwarded-host': 'attacker.example.com',
      'host': 'attacker.example.com',
    },
  })
  assert.equal(spoofCookieRes.res.status, 403)
  assert.equal(spoofCookieRes.res.headers.get('Cache-Control'), 'no-store')
  assert.match(spoofCookieRes.json?.error, /Cross-Origin/i)

  // 12b. Obcy Origin z Basic Auth i spoofowanym nagłówkiem x-forwarded-host / host
  const spoofBasicRes = await callProposalRoute(req.id, {
    response: responseTime,
    idempotencyKey: 'prop-spoof-basic-001',
    expectedVersion: 1,
  }, {
    auth: BASIC_AUTH,
    origin: 'https://attacker.example.com',
    headers: {
      'x-forwarded-host': 'attacker.example.com',
      'host': 'attacker.example.com',
    },
  })
  assert.equal(spoofBasicRes.res.status, 403)

  // 12c. Zgodność samej domeny bez schematu/portu (np. http zamiast https na domenie produkcyjnej)
  const mismatchSchemeRes = await callProposalRoute(req.id, {
    response: responseTime,
    idempotencyKey: 'prop-mismatch-scheme-001',
    expectedVersion: 1,
  }, {
    auth: null,
    cookie: `${ADMIN_SESSION_COOKIE}=${token}`,
    origin: 'http://regulskibehawiorysta.pl',
  })
  assert.equal(mismatchSchemeRes.res.status, 403)

  // Ścisła kontrola braku zmian w snapshocie magazynu danych
  const snapAfter = await readSection16StoreSnapshot()
  assert.deepEqual(snapBefore, snapAfter, 'Magazyn nie uległ żadnej zmianie po odrzuconych spoofowanych żądaniach')
})

// ---------------------------------------------------------------------------
// 13. COOKIE BEZ ORIGIN I BEZ REFERER (FAIL-CLOSED)
// ---------------------------------------------------------------------------
test('13. Cookie bez Origin oraz bez Referer: fail-closed 403 i brak zmian snapshotu', async () => {
  const { targetDate, responseTime } = getTomorrowProposalValues()
  const req = await createUrgentIntakeRequest({
    dayChoice: 'tomorrow',
    targetDate,
    rawPhone: '+48600111222',
    idempotencyKey: 'intake-cookie-no-origin-001',
  })
  const token = await createAdminSessionToken(TEST_ADMIN_SECRET)
  const snapBefore = await readSection16StoreSnapshot()

  // Żądanie z autoryzacją cookie, ale bez Origin i bez Referer
  const noOriginRefererRes = await callProposalRoute(req.id, {
    response: responseTime,
    idempotencyKey: 'prop-no-orig-ref-001',
    expectedVersion: 1,
  }, {
    auth: null,
    cookie: `${ADMIN_SESSION_COOKIE}=${token}`,
    origin: undefined,
    referer: undefined,
  })
  assert.equal(noOriginRefererRes.res.status, 403)
  assert.equal(noOriginRefererRes.res.headers.get('Cache-Control'), 'no-store')
  assert.match(noOriginRefererRes.json?.error, /Cross-Origin/i)

  const snapAfter = await readSection16StoreSnapshot()
  assert.deepEqual(snapBefore, snapAfter, 'Brak zmian snapshotu po fail-closed bez Origin/Referer')
})

// ---------------------------------------------------------------------------
// 14. ORIGIN NULL ORAZ MALFORMED ORIGIN
// ---------------------------------------------------------------------------
test('14. Origin null oraz malformed Origin odrzucane przy Cookie i Basic Auth (brak zmian snapshotu)', async () => {
  const { targetDate, responseTime } = getTomorrowProposalValues()
  const req = await createUrgentIntakeRequest({
    dayChoice: 'tomorrow',
    targetDate,
    rawPhone: '+48600111222',
    idempotencyKey: 'intake-origin-null-001',
  })
  const token = await createAdminSessionToken(TEST_ADMIN_SECRET)
  const snapBefore = await readSection16StoreSnapshot()

  // 14a. Origin 'null' z ciasteczkiem
  const nullCookieRes = await callProposalRoute(req.id, {
    response: responseTime,
    idempotencyKey: 'prop-null-cookie-001',
    expectedVersion: 1,
  }, {
    auth: null,
    cookie: `${ADMIN_SESSION_COOKIE}=${token}`,
    origin: 'null',
  })
  assert.equal(nullCookieRes.res.status, 403)

  // 14b. Origin 'null' z Basic Auth
  const nullBasicRes = await callProposalRoute(req.id, {
    response: responseTime,
    idempotencyKey: 'prop-null-basic-001',
    expectedVersion: 1,
  }, {
    auth: BASIC_AUTH,
    origin: 'null',
  })
  assert.equal(nullBasicRes.res.status, 403)

  // 14c. Malformed Origin z Basic Auth
  const malformedBasicRes = await callProposalRoute(req.id, {
    response: responseTime,
    idempotencyKey: 'prop-malformed-basic-001',
    expectedVersion: 1,
  }, {
    auth: BASIC_AUTH,
    origin: '://invalid-scheme-url',
  })
  assert.equal(malformedBasicRes.res.status, 403)

  // 14d. Malformed Origin z ciasteczkiem
  const malformedCookieRes = await callProposalRoute(req.id, {
    response: responseTime,
    idempotencyKey: 'prop-malformed-cookie-001',
    expectedVersion: 1,
  }, {
    auth: null,
    cookie: `${ADMIN_SESSION_COOKIE}=${token}`,
    origin: 'nie-jestem-adresem-url',
  })
  assert.equal(malformedCookieRes.res.status, 403)

  const snapAfter = await readSection16StoreSnapshot()
  assert.deepEqual(snapBefore, snapAfter, 'Snapshot nienaruszony po odrzuceniu null/malformed Origin')
})

// ---------------------------------------------------------------------------
// 15. FOREIGN BASIC ORAZ SEC-FETCH-SITE CROSS-SITE
// ---------------------------------------------------------------------------
test('15. Foreign Basic: obcy Origin oraz Sec-Fetch-Site cross-site odrzucane przy Basic Auth', async () => {
  const { targetDate, responseTime } = getTomorrowProposalValues()
  const req = await createUrgentIntakeRequest({
    dayChoice: 'tomorrow',
    targetDate,
    rawPhone: '+48600111222',
    idempotencyKey: 'intake-foreign-basic-001',
  })
  const snapBefore = await readSection16StoreSnapshot()

  // 15a. Poprawny Basic Auth, ale jawny obcy Origin
  const foreignBasicRes = await callProposalRoute(req.id, {
    response: responseTime,
    idempotencyKey: 'prop-f-basic-001',
    expectedVersion: 1,
  }, {
    auth: BASIC_AUTH,
    origin: 'https://evil-attacker.example.com',
  })
  assert.equal(foreignBasicRes.res.status, 403)
  assert.equal(foreignBasicRes.res.headers.get('Cache-Control'), 'no-store')
  assert.match(foreignBasicRes.json?.error, /Cross-Origin/i)

  // 15b. Poprawny Basic Auth, brak Origin, ale nagłówek Sec-Fetch-Site: cross-site
  const crossSiteBasicRes = await callProposalRoute(req.id, {
    response: responseTime,
    idempotencyKey: 'prop-cs-basic-001',
    expectedVersion: 1,
  }, {
    auth: BASIC_AUTH,
    origin: undefined,
    headers: {
      'sec-fetch-site': 'cross-site',
    },
  })
  assert.equal(crossSiteBasicRes.res.status, 403)

  // 15c. Poprawny Basic Auth z obcym nagłówkiem Referer
  const foreignRefBasicRes = await callProposalRoute(req.id, {
    response: responseTime,
    idempotencyKey: 'prop-fr-basic-001',
    expectedVersion: 1,
  }, {
    auth: BASIC_AUTH,
    origin: undefined,
    referer: 'https://evil-attacker.example.com/exploit',
  })
  assert.equal(foreignRefBasicRes.res.status, 403)

  const snapAfter = await readSection16StoreSnapshot()
  assert.deepEqual(snapBefore, snapAfter)
})

// ---------------------------------------------------------------------------
// 16. POPRAWNE COOKIE SAME-ORIGIN
// ---------------------------------------------------------------------------
test('16. Poprawne cookie same-origin: sukces z kontrolowanym localhost Origin i Referer', async () => {
  const { targetDate, responseTime } = getTomorrowProposalValues()
  const token = await createAdminSessionToken(TEST_ADMIN_SECRET)

  // 16a. Poprawne ciasteczko z kontrolowanym localhost Origin
  const req1 = await createUrgentIntakeRequest({
    dayChoice: 'tomorrow',
    targetDate,
    rawPhone: '+48600111222',
    idempotencyKey: 'intake-valid-cookie-001',
  })
  const validCookieOriginRes = await callProposalRoute(req1.id, {
    response: responseTime,
    idempotencyKey: 'prop-vc-orig-001',
    expectedVersion: 1,
  }, {
    auth: null,
    cookie: `${ADMIN_SESSION_COOKIE}=${token}`,
    origin: 'http://localhost:3000',
  })
  assert.equal(validCookieOriginRes.res.status, 200)
  assert.equal(validCookieOriginRes.json?.state, 'timeslot_proposed')
  assert.equal(validCookieOriginRes.json?.version, 2)

  // 16b. Poprawne ciasteczko bez Origin, ale z zaufanym same-origin Referer
  const req2 = await createUrgentIntakeRequest({
    dayChoice: 'tomorrow',
    targetDate,
    rawPhone: '+48600222333',
    idempotencyKey: 'intake-valid-cookie-002',
  })
  const [y, m, d] = targetDate.split('-')
  const responseTime16b = `${d}.${m}.${y}.11:00`
  const validCookieRefererRes = await callProposalRoute(req2.id, {
    response: responseTime16b,
    idempotencyKey: 'prop-vc-ref-001',
    expectedVersion: 1,
  }, {
    auth: null,
    cookie: `${ADMIN_SESSION_COOKIE}=${token}`,
    origin: undefined,
    referer: 'http://localhost:3000/admin/urgent-requests',
  })
  assert.equal(validCookieRefererRes.res.status, 200)
  assert.equal(validCookieRefererRes.json?.state, 'timeslot_proposed')
  assert.equal(validCookieRefererRes.json?.version, 2)
})

// ---------------------------------------------------------------------------
// 17. BASIC BEZ ORIGIN (DLA KLIENTÓW SERWEROWYCH)
// ---------------------------------------------------------------------------
test('17. Basic bez Origin/Referer: dopuszczony dla klientów serwerowych przy braku cross-site', async () => {
  const { targetDate, responseTime } = getTomorrowProposalValues()
  const req = await createUrgentIntakeRequest({
    dayChoice: 'tomorrow',
    targetDate,
    rawPhone: '+48600111222',
    idempotencyKey: 'intake-basic-server-001',
  })

  // Klient serwerowy wysyła Basic auth bez nagłówka origin i referer
  const serverClientRes = await callProposalRoute(req.id, {
    response: responseTime,
    idempotencyKey: 'prop-server-client-001',
    expectedVersion: 1,
  }, {
    auth: BASIC_AUTH,
    origin: undefined,
    referer: undefined,
    headers: {
      'sec-fetch-site': 'none',
    },
  })
  assert.equal(serverClientRes.res.status, 200)
  assert.equal(serverClientRes.json?.state, 'timeslot_proposed')
  assert.equal(serverClientRes.json?.version, 2)
})

// ---------------------------------------------------------------------------
// 18. WYMÓG CONTENT-TYPE: APPLICATION/JSON (ODRZUCANIE TEXT/PLAIN I FORM)
// ---------------------------------------------------------------------------
test('18. Wymóg Content-Type: application/json (odrzucenie text/plain i form bez efektów zewnętrznych)', async () => {
  const { targetDate, responseTime } = getTomorrowProposalValues()
  const req = await createUrgentIntakeRequest({
    dayChoice: 'tomorrow',
    targetDate,
    rawPhone: '+48600111222',
    idempotencyKey: 'intake-content-type-001',
  })
  const snapBefore = await readSection16StoreSnapshot()

  const validPayload = JSON.stringify({
    response: responseTime,
    idempotencyKey: 'prop-ct-test-001',
    expectedVersion: 1,
  })

  // 18a. Content-Type: text/plain
  const textPlainRes = await callProposalRoute(req.id, undefined, {
    rawBody: validPayload,
    headers: { 'content-type': 'text/plain' },
  })
  assert.equal(textPlainRes.res.status, 415)
  assert.equal(textPlainRes.res.headers.get('Cache-Control'), 'no-store')

  // 18b. Content-Type: application/x-www-form-urlencoded
  const formUrlencodedRes = await callProposalRoute(req.id, undefined, {
    rawBody: validPayload,
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
  })
  assert.equal(formUrlencodedRes.res.status, 415)

  // 18c. Content-Type: multipart/form-data
  const multipartRes = await callProposalRoute(req.id, undefined, {
    rawBody: validPayload,
    headers: { 'content-type': 'multipart/form-data; boundary=----WebKitFormBoundaryX' },
  })
  assert.equal(multipartRes.res.status, 415)

  // 18d. Brak Content-Type
  const noContentTypeHeaders = new Headers()
  noContentTypeHeaders.set('authorization', BASIC_AUTH)
  const noCtReq = new Request(`http://localhost:3000/api/admin/section16/urgent-requests/${req.id}/proposal`, {
    method: 'POST',
    headers: noContentTypeHeaders,
    body: validPayload,
  })
  const noCtRes = await POST(noCtReq, { params: Promise.resolve({ id: req.id }) })
  assert.equal(noCtRes.status, 415)

  // Weryfikacja: brak jakichkolwiek modyfikacji snapshotu magazynu
  const snapAfter = await readSection16StoreSnapshot()
  assert.deepEqual(snapBefore, snapAfter, 'Brak zmian snapshotu dla odrzuconych żądań o nieprawidłowym Content-Type')
})

// ---------------------------------------------------------------------------
// 19. IZOLACJA SIECIOWA: PRZECHWYCENIE FETCH WERYFIKUJE BRAK SIECI
// ---------------------------------------------------------------------------
test('19. Izolacja sieciowa: przechwycenie globalThis.fetch weryfikuje brak jakiejkolwiek komunikacji sieciowej', async () => {
  const { targetDate, responseTime } = getTomorrowProposalValues()
  const req = await createUrgentIntakeRequest({
    dayChoice: 'tomorrow',
    targetDate,
    rawPhone: '+48600111222',
    idempotencyKey: 'intake-fetch-intercept-001',
  })

  const originalFetch = globalThis.fetch
  let fetchCallCount = 0

  globalThis.fetch = async (...args: unknown[]) => {
    fetchCallCount++
    throw new Error(`BLOKADA SIECI: Niedozwolone wywołanie fetch(${String(args[0])})`)
  }

  try {
    const res = await callProposalRoute(req.id, {
      response: responseTime,
      idempotencyKey: 'prop-fetch-intercept-001',
      expectedVersion: 1,
      holdDurationMinutes: 30,
    })

    assert.equal(res.res.status, 200)
    assert.equal(fetchCallCount, 0, 'Wywołanie globalThis.fetch jest bezwzględnie zabronione (0 wywołań)')

    const updatedReq = await getUrgentIntakeRequest(req.id)
    assert.ok(updatedReq)
    assert.equal(updatedReq.state, 'timeslot_proposed')
    assert.equal(updatedReq.bookingId, null, 'Zgłoszenie nie może mieć bookingId (brak integracji kalendarza)')
    assert.equal(updatedReq.paymentReference, null, 'Zgłoszenie nie może mieć paymentReference')
  } finally {
    globalThis.fetch = originalFetch
  }
})

// ---------------------------------------------------------------------------
// 20. BEZPIECZNE LOGOWANIE BŁĘDÓW SERWERA (BRAK MESSAGE, STACK I DANYCH)
// ---------------------------------------------------------------------------
test('20. Bezpieczne logowanie błędów 500: stały komunikat bez stacka, message i danych backendu', async () => {
  const { responseTime } = getTomorrowProposalValues()
  const validId = randomUUID()

  const originalConsoleError = console.error
  const errorLogs: unknown[][] = []
  console.error = (...args: unknown[]) => {
    errorLogs.push(args)
  }

  try {
    const headers = new Headers()
    headers.set('authorization', BASIC_AUTH)
    headers.set('content-type', 'application/json')
    const req = new Request(`http://localhost:3000/api/admin/section16/urgent-requests/${validId}/proposal`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        response: responseTime,
        idempotencyKey: 'prop-err-sim-001',
        expectedVersion: 1,
      }),
    })

    const sensitiveMessage = 'SUPER_SECRET_BACKEND_TRACE_AND_PII'
    const rejectingParams = Promise.reject(new Error(sensitiveMessage))
    rejectingParams.catch(() => {})

    const res = await POST(req, { params: rejectingParams })
    assert.equal(res.status, 500)
    const json = await res.json()
    assert.equal(json.error, 'Wystąpił nieoczekiwany błąd serwera.')

    assert.ok(errorLogs.length > 0, 'Powinien zostać zapisany bezpieczny log serwera')
    for (const logArgs of errorLogs) {
      const joinedLog = logArgs.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')
      assert.doesNotMatch(joinedLog, new RegExp(sensitiveMessage), 'Log nie może zawierać wiadomości o błędzie ani poufnych danych!')
      assert.ok(!logArgs.some((arg) => arg instanceof Error), 'Log nie może przekazywać instancji Error!')
    }
  } finally {
    console.error = originalConsoleError
  }
})
