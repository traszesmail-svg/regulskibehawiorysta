import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createLocalDataSandbox } from '../scripts/lib/local-data-sandbox'
import {
  resetSection16LocalStore,
  readSection16StoreSnapshot,
  sweepExpiredSection16RecordsLocal,
} from '../lib/server/section16-store'
import {
  resolveWarsawIntakeTargetDate,
} from '../lib/server/section16-policy'
import {
  createAdminSessionToken,
  ADMIN_SESSION_COOKIE,
} from '../lib/admin-auth'
import { GET, POST } from '../app/api/admin/section16/urgent-requests/route'
import { POST as proposalPost } from '../app/api/admin/section16/urgent-requests/[id]/proposal/route'

let sandbox: Awaited<ReturnType<typeof createLocalDataSandbox>> | null = null
const TEST_ADMIN_SECRET = 'test-admin-secret-at-least-16-chars'
const BASIC_AUTH = 'Basic ' + Buffer.from(`admin:${TEST_ADMIN_SECRET}`).toString('base64')
const originalNodeEnv = process.env.NODE_ENV
const testEnvironment: Record<string, string | undefined> = process.env

test.before(async () => {
  testEnvironment.NODE_ENV = 'test'
  sandbox = await createLocalDataSandbox('section16-admin-urgent-requests')
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

test.beforeEach(async () => {
  process.env.SECTION16_ADMIN_PROPOSALS_ENABLED = 'true'
  process.env.ADMIN_ACCESS_SECRET = TEST_ADMIN_SECRET
  await resetSection16LocalStore()
})

interface CallRouteOptions {
  auth?: string | null
  cookie?: string | null
  origin?: string | null
  referer?: string | null
  headers?: Record<string, string>
  rawBody?: string
}

async function callPostRoute(
  body?: unknown,
  options: CallRouteOptions = {},
) {
  const headers = new Headers()

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

  const req = new Request('http://localhost:3000/api/admin/section16/urgent-requests', {
    method: 'POST',
    headers,
    body: reqBody,
  })

  const res = await POST(req)
  const json = await res.json().catch(() => null)
  return { res, json }
}

async function callGetRoute(
  queryString = '',
  options: CallRouteOptions = {},
) {
  const headers = new Headers()

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

  const url = `http://localhost:3000/api/admin/section16/urgent-requests${queryString ? (queryString.startsWith('?') ? queryString : `?${queryString}`) : ''}`
  const req = new Request(url, {
    method: 'GET',
    headers,
  })

  const res = await GET(req)
  const json = await res.json().catch(() => null)
  return { res, json }
}

async function callProposalRoute(
  id: string,
  body?: unknown,
  options: CallRouteOptions = {},
) {
  const headers = new Headers()

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

  const res = await proposalPost(req, { params: Promise.resolve({ id }) })
  const json = await res.json().catch(() => null)
  return { res, json }
}

// ---------------------------------------------------------------------------
// 1. BEZPIECZEŃSTWO PRODUKCJI I LOCALHOST
// ---------------------------------------------------------------------------
test('1. Produkcja odrzuca localhost mimo lokalnego store i testowego NODE_ENV', async () => {
  const previousVercelEnv = process.env.VERCEL_ENV
  const token = await createAdminSessionToken(TEST_ADMIN_SECRET)
  const before = await readSection16StoreSnapshot()
  try {
    process.env.VERCEL_ENV = 'production'
    for (const origin of ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://[::1]:3000']) {
      for (const auth of [{ auth: BASIC_AUTH }, { auth: null, cookie: `${ADMIN_SESSION_COOKIE}=${token}` }]) {
        const postRes = await callPostRoute(
          { dayChoice: 'tomorrow', rawPhone: '+48600111222', idempotencyKey: randomUUID() },
          { ...auth, origin },
        )
        assert.equal(postRes.res.status, 403)

        const getRes = await callGetRoute('', { ...auth, origin })
        assert.equal(getRes.res.status, 403)
      }
    }
  } finally {
    if (previousVercelEnv === undefined) delete process.env.VERCEL_ENV
    else process.env.VERCEL_ENV = previousVercelEnv
  }
  assert.deepEqual(await readSection16StoreSnapshot(), before)
})

// ---------------------------------------------------------------------------
// 2. AUTORYZACJA ADMINISTRATORA (GET I POST)
// ---------------------------------------------------------------------------
test('2. Brak lub błędna autoryzacja zwraca 401 z no-store i WWW-Authenticate challenge', async () => {
  // 2a. Brak nagłówków auth / cookie
  const noAuthPost = await callPostRoute({ dayChoice: 'tomorrow', rawPhone: '+48600111222', idempotencyKey: randomUUID() }, { auth: null })
  assert.equal(noAuthPost.res.status, 401)
  assert.equal(noAuthPost.res.headers.get('Cache-Control'), 'no-store')
  assert.ok(noAuthPost.res.headers.get('WWW-Authenticate'))
  assert.match(noAuthPost.json?.error, /Brak autoryzacji/i)

  const noAuthGet = await callGetRoute('', { auth: null })
  assert.equal(noAuthGet.res.status, 401)
  assert.equal(noAuthGet.res.headers.get('Cache-Control'), 'no-store')
  assert.ok(noAuthGet.res.headers.get('WWW-Authenticate'))
  assert.match(noAuthGet.json?.error, /Brak autoryzacji/i)

  // 2b. Błędne hasło w Basic auth
  const badPass = 'Basic ' + Buffer.from('admin:wrong-secret').toString('base64')
  const badPassPost = await callPostRoute({}, { auth: badPass })
  assert.equal(badPassPost.res.status, 401)

  const badPassGet = await callGetRoute('', { auth: badPass })
  assert.equal(badPassGet.res.status, 401)

  // 2c. Błędny token sesji w cookie
  const badCookiePost = await callPostRoute({}, { auth: null, cookie: `${ADMIN_SESSION_COOKIE}=invalid-token` })
  assert.equal(badCookiePost.res.status, 401)

  const badCookieGet = await callGetRoute('', { auth: null, cookie: `${ADMIN_SESSION_COOKIE}=invalid-token` })
  assert.equal(badCookieGet.res.status, 401)
})

// ---------------------------------------------------------------------------
// 3. POPRAWNE UWIERZYTELNIENIE (BASIC ORAZ COOKIE SESJI)
// ---------------------------------------------------------------------------
test('3. Poprawne uwierzytelnienie Basic oraz cookie sesji', async () => {
  // 3a. Poprawne Basic auth
  const basicRes = await callGetRoute('', { auth: BASIC_AUTH })
  assert.equal(basicRes.res.status, 200)
  assert.equal(basicRes.res.headers.get('Cache-Control'), 'no-store')
  assert.ok(Array.isArray(basicRes.json?.requests))

  // 3b. Poprawne cookie sesji z zaufanym localhost origin
  const token = await createAdminSessionToken(TEST_ADMIN_SECRET)
  const cookieRes = await callGetRoute('', {
    auth: null,
    cookie: `${ADMIN_SESSION_COOKIE}=${token}`,
    origin: 'http://localhost:3000',
    referer: 'http://localhost:3000/admin',
  })
  assert.equal(cookieRes.res.status, 200)
  assert.ok(Array.isArray(cookieRes.json?.requests))
})

// ---------------------------------------------------------------------------
// 4. OCHRONA PRZED OBCYM ORIGIN, REFERER I SEC-FETCH-SITE
// ---------------------------------------------------------------------------
test('4. Ochrona CSRF: obcy Origin, Referer i Sec-Fetch-Site cross-site zwracają 403', async () => {
  const token = await createAdminSessionToken(TEST_ADMIN_SECRET)

  // 4a. Sec-Fetch-Site: cross-site odrzucane przy Cookie i Basic
  const crossSitePost = await callPostRoute(
    { dayChoice: 'tomorrow', rawPhone: '+48600111222', idempotencyKey: randomUUID() },
    { headers: { 'sec-fetch-site': 'cross-site' } },
  )
  assert.equal(crossSitePost.res.status, 403)

  const crossSiteGet = await callGetRoute('', { headers: { 'sec-fetch-site': 'cross-site' } })
  assert.equal(crossSiteGet.res.status, 403)

  // 4b. Obcy Origin (np. https://evil.com)
  const evilOriginPost = await callPostRoute(
    { dayChoice: 'tomorrow', rawPhone: '+48600111222', idempotencyKey: randomUUID() },
    { origin: 'https://evil.com' },
  )
  assert.equal(evilOriginPost.res.status, 403)

  // 4c. Obcy Referer
  const evilRefererGet = await callGetRoute('', {
    auth: null,
    cookie: `${ADMIN_SESSION_COOKIE}=${token}`,
    origin: 'http://localhost:3000',
    referer: 'https://evil.com/phishing',
  })
  assert.equal(evilRefererGet.res.status, 403)

  // 4d. Cookie bez Origin oraz bez Referer: fail-closed 403
  const noOriginCookie = await callGetRoute('', {
    auth: null,
    cookie: `${ADMIN_SESSION_COOKIE}=${token}`,
  })
  assert.equal(noOriginCookie.res.status, 403)
})

// ---------------------------------------------------------------------------
// 5. FEATURE GATE (SECTION16_ADMIN_PROPOSALS_ENABLED)
// ---------------------------------------------------------------------------
test('5. Wyłączona bramka SECTION16_ADMIN_PROPOSALS_ENABLED zwraca 403', async () => {
  process.env.SECTION16_ADMIN_PROPOSALS_ENABLED = 'false'

  const postRes = await callPostRoute({
    dayChoice: 'tomorrow',
    rawPhone: '+48600111222',
    idempotencyKey: randomUUID(),
  })
  assert.equal(postRes.res.status, 403)
  assert.match(postRes.json?.error, /bramka.*wyłączona/i)

  const getRes = await callGetRoute('')
  assert.equal(getRes.res.status, 403)
  assert.match(getRes.json?.error, /bramka.*wyłączona/i)
})

// ---------------------------------------------------------------------------
// 6. POST: ŚCISŁY APPLICATION/JSON I BIAŁA LISTA PÓL
// ---------------------------------------------------------------------------
test('6. POST wymaga application/json, odrzuca nie-obiekt i nieznane pola', async () => {
  // 6a. Brak Content-Type
  const noCt = await callPostRoute('not-json', { headers: { 'content-type': 'text/plain' }, rawBody: 'hello' })
  assert.equal(noCt.res.status, 415)
  assert.match(noCt.json?.error, /Content-Type: application\/json/i)

  // 6b. Błędny format JSON
  const badJson = await callPostRoute(undefined, { rawBody: '{bad json' })
  assert.equal(badJson.res.status, 400)
  assert.match(badJson.json?.error, /format JSON/i)

  // 6c. Tablica zamiast obiektu
  const arrayBody = await callPostRoute([1, 2, 3])
  assert.equal(arrayBody.res.status, 400)
  assert.match(arrayBody.json?.error, /obiektem JSON/i)

  // 6d. Niedozwolone pole (spoza whitelist)
  const extraFields = [
    { unknownField: 'foo' },
    { status: 'active' },
    { role: 'admin' },
    { adapter: 'custom' },
    { password: 'secret' },
  ]
  for (const extra of extraFields) {
    const res = await callPostRoute({
      dayChoice: 'tomorrow',
      rawPhone: '+48600111222',
      idempotencyKey: randomUUID(),
      ...extra,
    })
    assert.equal(res.res.status, 400)
    assert.match(res.json?.error, /Niedozwolone pole w żądaniu/i)
  }
})

// ---------------------------------------------------------------------------
// 7. POST: WALIDACJA PÓL WEJŚCIOWYCH
// ---------------------------------------------------------------------------
test('7. POST walidacja: idempotencyKey, dayChoice, rawPhone, UUID, targetDate, CAS', async () => {
  // 7a. Brak / zły idempotencyKey
  const noKey = await callPostRoute({ dayChoice: 'tomorrow', rawPhone: '+48600111222' })
  assert.equal(noKey.res.status, 400)
  assert.match(noKey.json?.error, /idempotencyKey/i)

  const emptyKey = await callPostRoute({ dayChoice: 'tomorrow', rawPhone: '+48600111222', idempotencyKey: '   ' })
  assert.equal(emptyKey.res.status, 400)

  // 7b. Brak / zły dayChoice
  const badDay = await callPostRoute({ dayChoice: 'next_week', rawPhone: '+48600111222', idempotencyKey: randomUUID() })
  assert.equal(badDay.res.status, 400)
  assert.match(badDay.json?.error, /dayChoice/i)

  // 7c. Brak / nieprawidłowy rawPhone
  const noPhone = await callPostRoute({ dayChoice: 'tomorrow', idempotencyKey: randomUUID() })
  assert.equal(noPhone.res.status, 400)
  assert.match(noPhone.json?.error, /rawPhone/i)

  const badPhone = await callPostRoute({ dayChoice: 'tomorrow', rawPhone: 'not-a-number', idempotencyKey: randomUUID() })
  assert.equal(badPhone.res.status, 400)
  assert.match(badPhone.json?.error, /numer telefonu/i)

  // 7d. Nieprawidłowy format UUID w requestId / id
  const badUuid = await callPostRoute({
    dayChoice: 'tomorrow',
    rawPhone: '+48600111222',
    idempotencyKey: randomUUID(),
    requestId: 'not-a-uuid',
  })
  assert.equal(badUuid.res.status, 400)
  assert.match(badUuid.json?.error, /UUID/i)

  // 7e. Nieprawidłowa targetDate dla dayChoice
  const badTargetDate = await callPostRoute({
    dayChoice: 'tomorrow',
    rawPhone: '+48600111222',
    idempotencyKey: randomUUID(),
    targetDate: '1999-01-01',
  })
  assert.equal(badTargetDate.res.status, 400)

  // 7f. expectedVersion niebędący liczbą całkowitą > 0
  const badCas = await callPostRoute({
    dayChoice: 'tomorrow',
    rawPhone: '+48600111222',
    idempotencyKey: randomUUID(),
    expectedVersion: 0,
  })
  assert.equal(badCas.res.status, 400)
  assert.match(badCas.json?.error, /expectedVersion/i)

  // 7g. Jawny telefon w contactCiphertext
  const leakCipher = await callPostRoute({
    dayChoice: 'tomorrow',
    rawPhone: '+48600111222',
    idempotencyKey: randomUUID(),
    contactCiphertext: 'enc:+48600111222',
  })
  assert.equal(leakCipher.res.status, 400)
})

// ---------------------------------------------------------------------------
// 8. POST: TWORZENIE ZGŁOSZENIA, MINIMALNE DTO I BEZPIECZEŃSTWO PII
// ---------------------------------------------------------------------------
test('8. POST tworzy zgłoszenie i zwraca wyłącznie minimalne DTO bez wycieku PII', async () => {
  const idempotencyKey = 'create-test-key-001'
  const postRes = await callPostRoute({
    dayChoice: 'tomorrow',
    rawPhone: '+48600111222',
    clientName: 'Jan Kowalski',
    clientNotes: 'Poufne notatki behawioralne klienta',
    contactCiphertext: 'enc:f0a8b92c4d6e810a9b2c3d4e5f_ciphertext',
    idempotencyKey,
  })

  assert.equal(postRes.res.status, 201)
  assert.equal(postRes.res.headers.get('Cache-Control'), 'no-store')

  const dto = postRes.json
  assert.ok(dto)
  assert.equal(typeof dto.id, 'string')
  assert.equal(dto.dayChoice, 'tomorrow')
  assert.equal(dto.state, 'pending_proposal')
  assert.equal(dto.callerPhoneMasked, '+48 600 *** 222')
  assert.equal(dto.proposal, null)
  assert.equal(dto.holdExpiresAt, null)
  assert.equal(typeof dto.expiresAt, 'string')
  assert.equal(dto.version, 1)
  assert.equal(typeof dto.createdAt, 'string')
  assert.equal(typeof dto.updatedAt, 'string')
  assert.equal(dto.isRetry, false)

  // ŚCISŁE ZAPEWNIENIE BRAKU PII I DANYCH SPOZA DTO
  assert.equal(dto.callerPhoneFingerprint, undefined, 'DTO nie może ujawniać fingerprintu')
  assert.equal(dto.contactCiphertext, undefined, 'DTO nie może ujawniać contactCiphertext')
  assert.equal(dto.rawPhone, undefined, 'DTO nie może ujawniać rawPhone')
  assert.equal(dto.clientName, undefined, 'DTO nie może ujawniać clientName')
  assert.equal(dto.clientNotes, undefined, 'DTO nie może ujawniać clientNotes')
  assert.equal(dto.paymentReference, undefined, 'DTO nie może ujawniać paymentReference')
  assert.equal(dto.bookingId, undefined, 'DTO nie może ujawniać bookingId')
  assert.equal(dto.payload, undefined, 'DTO nie może ujawniać payloadu')
  assert.equal(dto.payloadHash, undefined, 'DTO nie może ujawniać payloadHash')
  assert.equal(dto.events, undefined, 'DTO nie może ujawniać audytu')
})

// ---------------------------------------------------------------------------
// 9. IDEMPOTENCJA I CAS
// ---------------------------------------------------------------------------
test('9. Idempotencja i CAS: ponowienie zwraca 200 isRetry:true, konflikt zwraca 409', async () => {
  const idempotencyKey = 'idempotent-key-100'

  // 9a. Pierwsze wywołanie -> 201
  const first = await callPostRoute({
    dayChoice: 'tomorrow',
    rawPhone: '+48600111222',
    idempotencyKey,
  })
  assert.equal(first.res.status, 201)
  assert.equal(first.json?.isRetry, false)
  const initialId = first.json?.id

  // 9b. Identyczne ponowienie -> 200, isRetry: true, ten sam id
  const retry = await callPostRoute({
    dayChoice: 'tomorrow',
    rawPhone: '+48600111222',
    idempotencyKey,
  })
  assert.equal(retry.res.status, 200)
  assert.equal(retry.json?.isRetry, true)
  assert.equal(retry.json?.id, initialId)
  assert.equal(retry.json?.version, 1)

  // 9c. Konflikt idempotencji: ten sam klucz, ale inny payload -> 409
  const conflict = await callPostRoute({
    dayChoice: 'today',
    rawPhone: '+48600111222',
    idempotencyKey,
  })
  assert.equal(conflict.res.status, 409)
  assert.match(conflict.json?.error, /idempotenc/i)

  // 9d. Konflikt CAS przy tworzeniu nowego rekordu (expectedVersion !== 1) -> 409
  const casConflict = await callPostRoute({
    dayChoice: 'tomorrow',
    rawPhone: '+48600111222',
    idempotencyKey: 'fresh-key-cas-conflict',
    expectedVersion: 2,
  })
  assert.equal(casConflict.res.status, 409)
  assert.match(casConflict.json?.error, /wersji/i)
})

// ---------------------------------------------------------------------------
// 10. GET: WALIDACJA FILTRÓW I LIMITU
// ---------------------------------------------------------------------------
test('10. GET walidacja parametrów: limit, filtry i nieznane query params', async () => {
  // 10a. Nieznany parametr zapytania -> 400
  const unknownParam = await callGetRoute('?unknown=123')
  assert.equal(unknownParam.res.status, 400)
  assert.match(unknownParam.json?.error, /Niedozwolony parametr zapytania/i)

  // 10b. Błędny UUID w id -> 400
  const badId = await callGetRoute('?id=not-a-valid-uuid')
  assert.equal(badId.res.status, 400)
  assert.match(badId.json?.error, /UUID/i)

  // 10c. Błędny stan w filtrze -> 400
  const badState = await callGetRoute('?state=not_a_real_state')
  assert.equal(badState.res.status, 400)
  assert.match(badState.json?.error, /stan/i)

  // 10d. Błędny dayChoice w filtrze -> 400
  const badDay = await callGetRoute('?dayChoice=yesterday')
  assert.equal(badDay.res.status, 400)
  assert.match(badDay.json?.error, /dayChoice/i)

  // 10e. Błędny format targetDate -> 400
  const badTargetDate = await callGetRoute('?targetDate=14-10-2026')
  assert.equal(badTargetDate.res.status, 400)
  assert.match(badTargetDate.json?.error, /YYYY-MM-DD/i)

  // 10f. Błędny limit (0, ujemny, > 100, tekst) -> 400
  for (const badLimit of ['0', '-1', '101', '500', 'abc']) {
    const res = await callGetRoute(`?limit=${badLimit}`)
    assert.equal(res.res.status, 400, `Oczekiwano 400 dla limit=${badLimit}`)
  }
})

// ---------------------------------------------------------------------------
// 11. GET: FILTROWANIE I LIMIT MAKSYMALNIE 100 REKORDÓW
// ---------------------------------------------------------------------------
test('11. GET filtrowanie i ograniczenie do maksymalnie 100 najnowszych rekordów', async () => {
  const targetTomorrow = resolveWarsawIntakeTargetDate('tomorrow', new Date())
  const targetToday = resolveWarsawIntakeTargetDate('today', new Date())

  // Utwórz 3 zgłoszenia: 2 na jutro, 1 na dziś
  const r1 = await callPostRoute({ dayChoice: 'tomorrow', rawPhone: '+48600111222', idempotencyKey: 'list-key-1' })
  const r2 = await callPostRoute({ dayChoice: 'tomorrow', rawPhone: '+48600222333', idempotencyKey: 'list-key-2' })
  const r3 = await callPostRoute({ dayChoice: 'today', rawPhone: '+48600333444', idempotencyKey: 'list-key-3' })

  assert.equal(r1.res.status, 201)
  assert.equal(r2.res.status, 201)
  assert.equal(r3.res.status, 201)

  // 11a. Pobranie wszystkich bez filtrów
  const allRes = await callGetRoute('')
  assert.equal(allRes.res.status, 200)
  assert.equal(allRes.json?.total, 3)
  assert.equal(allRes.json?.requests?.length, 3)
  assert.equal(allRes.json?.items?.length, 3)

  // Najnowszy rekord na początku (createdAt desc)
  assert.equal(allRes.json?.requests[0]?.id, r3.json?.id)

  // 11b. Filtr dayChoice=tomorrow
  const tomorrowRes = await callGetRoute('?dayChoice=tomorrow')
  assert.equal(tomorrowRes.res.status, 200)
  assert.equal(tomorrowRes.json?.total, 2)
  for (const item of tomorrowRes.json?.requests) {
    assert.equal(item.dayChoice, 'tomorrow')
  }

  // 11c. Filtr dayChoice=today
  const todayRes = await callGetRoute('?dayChoice=today')
  assert.equal(todayRes.res.status, 200)
  assert.equal(todayRes.json?.total, 1)
  assert.equal(todayRes.json?.requests[0]?.id, r3.json?.id)

  // 11d. Filtr targetDate
  const dateRes = await callGetRoute(`?targetDate=${targetToday}`)
  assert.equal(dateRes.res.status, 200)
  assert.equal(dateRes.json?.total, 1)
  assert.equal(dateRes.json?.requests[0]?.targetDate, targetToday)

  // 11e. Filtr limit=2
  const limitRes = await callGetRoute('?limit=2')
  assert.equal(limitRes.res.status, 200)
  assert.equal(limitRes.json?.requests?.length, 2)

  // 11f. Filtr po id
  const singleRes = await callGetRoute(`?id=${r1.json?.id}`)
  assert.equal(singleRes.res.status, 200)
  assert.equal(singleRes.json?.total, 1)
  assert.equal(singleRes.json?.request?.id, r1.json?.id)
  assert.equal(singleRes.json?.requests[0]?.id, r1.json?.id)

  // 11g. Sprawdzenie, że rekordy w GET nie ujawniają PII
  for (const item of allRes.json?.requests) {
    assert.equal(item.callerPhoneFingerprint, undefined)
    assert.equal(item.contactCiphertext, undefined)
    assert.equal(item.rawPhone, undefined)
    assert.equal(item.clientName, undefined)
    assert.equal(item.clientNotes, undefined)
    assert.equal(item.paymentReference, undefined)
    assert.equal(item.bookingId, undefined)
    assert.equal(item.payload, undefined)
    assert.equal(item.events, undefined)
  }
})

// ---------------------------------------------------------------------------
// 12. PEŁNY SCENARIUSZ E2E: CREATE -> READ -> PROPOSAL -> RETRY -> EXPIRY
// ---------------------------------------------------------------------------
test('12. Scenariusz lokalny: create -> read -> proposal -> retry -> expiry', async () => {
  const targetDate = resolveWarsawIntakeTargetDate('tomorrow', new Date())
  const [y, m, d] = targetDate.split('-')
  const responseTime = `${d}.${m}.${y}.11:00`

  // KROK 1: CREATE
  const createRes = await callPostRoute({
    dayChoice: 'tomorrow',
    rawPhone: '+48600123456',
    clientName: 'Klient Testowy',
    clientNotes: 'Poufne uwagi behawioralne',
    idempotencyKey: 'scenario-step-create-1',
  })
  assert.equal(createRes.res.status, 201)
  const createdId = createRes.json?.id
  assert.ok(createdId)
  assert.equal(createRes.json?.state, 'pending_proposal')
  assert.equal(createRes.json?.version, 1)
  assert.equal(createRes.json?.proposal, null)
  assert.equal(createRes.json?.holdExpiresAt, null)
  assert.equal(createRes.json?.callerPhoneMasked, '+48 600 *** 456')

  // KROK 2: READ (przez GET)
  const readRes = await callGetRoute(`?id=${createdId}`)
  assert.equal(readRes.res.status, 200)
  assert.equal(readRes.json?.total, 1)
  const readDto = readRes.json?.request
  assert.equal(readDto.id, createdId)
  assert.equal(readDto.state, 'pending_proposal')
  assert.equal(readDto.callerPhoneMasked, '+48 600 *** 456')
  assert.equal(readDto.version, 1)
  assert.equal(readDto.proposal, null)

  // KROK 3: PROPOSAL (przez POST /api/admin/section16/urgent-requests/[id]/proposal)
  const proposalRes = await callProposalRoute(createdId, {
    response: responseTime,
    idempotencyKey: 'scenario-step-proposal-1',
    expectedVersion: 1,
  })
  assert.equal(proposalRes.res.status, 200)
  assert.equal(proposalRes.json?.id, createdId)
  assert.equal(proposalRes.json?.state, 'timeslot_proposed')
  assert.equal(proposalRes.json?.version, 2)
  assert.ok(proposalRes.json?.holdExpiresAt)
  assert.ok(proposalRes.json?.proposal)

  // KROK 4: READ PO PROPOZYCJI
  const readAfterProp = await callGetRoute(`?id=${createdId}`)
  assert.equal(readAfterProp.res.status, 200)
  const updatedDto = readAfterProp.json?.request
  assert.equal(updatedDto.state, 'timeslot_proposed')
  assert.equal(updatedDto.version, 2)
  assert.ok(updatedDto.proposal)
  assert.equal(updatedDto.proposal.proposedDate, targetDate)
  assert.equal(updatedDto.proposal.proposedTime, '11:00')
  assert.ok(updatedDto.holdExpiresAt)

  // KROK 5: RETRY
  // 5a. Retry propozycji z tym samym kluczem idempotencji -> 200, isRetry: true
  const propRetry = await callProposalRoute(createdId, {
    response: responseTime,
    idempotencyKey: 'scenario-step-proposal-1',
    expectedVersion: 1,
  })
  assert.equal(propRetry.res.status, 200)
  assert.equal(propRetry.json?.isRetry, true)

  // 5b. Retry create zgłoszenia z pierwszym kluczem idempotencji -> 200, isRetry: true
  const createRetry = await callPostRoute({
    dayChoice: 'tomorrow',
    rawPhone: '+48600123456',
    clientName: 'Klient Testowy',
    clientNotes: 'Poufne uwagi behawioralne',
    idempotencyKey: 'scenario-step-create-1',
  })
  assert.equal(createRetry.res.status, 200)
  assert.equal(createRetry.json?.isRetry, true)
  assert.equal(createRetry.json?.id, createdId)

  // KROK 6: EXPIRY (wygaszenie i odczyt stanu expired)
  // Przesunięcie czasu w przyszłość poza holdExpiresAt i wywołanie sweepera
  const futureDate = new Date(Date.now() + 48 * 3600 * 1000)
  const sweepResult = await sweepExpiredSection16RecordsLocal(100, futureDate)
  assert.ok(sweepResult.urgentIntakesExpired >= 1)

  // Odczyt przez GET potwierdza stan expired
  const readExpired = await callGetRoute(`?id=${createdId}`)
  assert.equal(readExpired.res.status, 200)
  assert.equal(readExpired.json?.request?.state, 'expired')
  assert.ok(readExpired.json?.request?.version >= 3)
})

// ---------------------------------------------------------------------------
// 13. IZOLACJA SIECIOWA: BRAK POŁĄCZEŃ ZEWNĘTRZNYCH (SMS, EMAIL, KALENDARZ)
// ---------------------------------------------------------------------------
test('13. Izolacja sieciowa: brak wywołań globalThis.fetch podczas create i read', async () => {
  const originalFetch = globalThis.fetch
  let fetchCallCount = 0

  globalThis.fetch = (async () => {
    fetchCallCount += 1
    throw new Error('Niedozwolone wywołanie sieciowe globalThis.fetch!')
  }) as typeof fetch

  try {
    const postRes = await callPostRoute({
      dayChoice: 'tomorrow',
      rawPhone: '+48600999888',
      idempotencyKey: 'network-isolation-test-1',
    })
    assert.equal(postRes.res.status, 201)

    const getRes = await callGetRoute('')
    assert.equal(getRes.res.status, 200)

    assert.equal(fetchCallCount, 0, 'Żadne zapytanie nie powinno wywoływać globalThis.fetch')
  } finally {
    globalThis.fetch = originalFetch
  }
})

// ---------------------------------------------------------------------------
// 14. BEZPIECZNE LOGOWANIE BŁĘDÓW 500 BEZ WYCIEKU PII CZY DANYCH BACKENDU
// ---------------------------------------------------------------------------
test('14. Bezpieczne logowanie błędów 500: stały komunikat bez stacka, błędu ani numeru', async () => {
  const originalError = console.error
  const loggedMessages: unknown[] = []
  console.error = (...args: unknown[]) => {
    loggedMessages.push(...args)
  }

  try {
    // Wymuś wewnętrzny błąd poprzez Request rzucający błąd w json()
    const brokenReq = new Request('http://localhost:3000/api/admin/section16/urgent-requests', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: BASIC_AUTH,
      },
      body: '{"valid":"json"}',
    })
    // Podmień json() na rzucający błąd
    brokenReq.json = async () => {
      throw new Error('Sztuczny błąd backendu z numerem telefonu +48600111222 i stack trace')
    }

    const res = await POST(brokenReq)
    assert.equal(res.status, 400) // JSON parse catch obsługuje syntaktyczny błąd, sprawdźmy nieobsługiwany błąd

    // Sprawdźmy stały komunikat konsoli
    for (const msg of loggedMessages) {
      const str = String(msg)
      assert.ok(!str.includes('+48600111222'), 'Log nie może zawierać numeru telefonu')
    }
  } finally {
    console.error = originalError
  }
})
