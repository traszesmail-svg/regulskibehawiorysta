import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  CASE_MAP_BOOKING_HANDOFF_KEY,
  CASE_MAP_BOOKING_HANDOFF_TTL_MS,
  clearCaseMapBookingHandoff,
  createCaseMapBookingHandoff,
  readCaseMapBookingHandoff,
  writeCaseMapBookingHandoff,
} from '@/lib/case-map-booking-handoff'
import {
  CASE_MAP_LOGIN_DRAFT_KEY,
  readCaseMapLoginDraft,
  writeCaseMapLoginDraft,
} from '@/lib/case-map-login-draft'
import { buildCaseMapHref } from '@/lib/case-map-routing'
import { buildCaseMapReport } from '@/lib/case-map-report'

class MemoryStorage {
  private values = new Map<string, string>()

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string) {
    this.values.set(key, value)
  }

  removeItem(key: string) {
    this.values.delete(key)
  }
}

test('case map handoff keeps a short brief and only attaches a saved map after explicit sharing', () => {
  const handoff = createCaseMapBookingHandoff({
    species: 'pies',
    topic: 'dog_walks',
    path: 'long',
    triageState: 'PROCEED',
    caseMapId: '11111111-1111-4111-8111-111111111111',
    shareWithConsultant: true,
    answers: {
      case_focus: 'one_animal',
      case_description: 'Reakcja zaczyna się na widok psa z dystansu.',
      intake_health_history: 'Nie umieszczaj tej odpowiedzi w briefie.',
    },
    now: 100,
  })

  assert.ok(handoff)
  assert.equal(handoff.caseMapId, '11111111-1111-4111-8111-111111111111')
  assert.equal(handoff.shareWithConsultant, true)
  assert.match(handoff.brief, /Reakcja zaczyna się/)
  assert.doesNotMatch(handoff.brief, /Nie umieszczaj/)

  const privateHandoff = createCaseMapBookingHandoff({
    species: 'pies',
    topic: 'dog_walks',
    path: 'fast',
    triageState: 'PROCEED',
    caseMapId: '11111111-1111-4111-8111-111111111111',
    answers: {},
  })
  assert.equal(privateHandoff?.caseMapId, null)
  assert.equal(privateHandoff?.shareWithConsultant, false)
  assert.equal(privateHandoff?.serviceType, 'szybka-konsultacja-15-min')
})

test('case map handoff keeps the priority Kwadrans na już service when explicitly requested', () => {
  const handoff = createCaseMapBookingHandoff({
    species: 'pies',
    topic: 'dog_walks',
    path: 'fast',
    triageState: 'PROCEED',
    serviceType: 'kwadrans-na-juz',
    answers: { case_focus: 'one_animal' },
    now: 2_000,
  })

  assert.ok(handoff)
  assert.equal(handoff.serviceType, 'kwadrans-na-juz')

  const storage = new MemoryStorage()
  assert.equal(writeCaseMapBookingHandoff(handoff, storage), true)
  assert.equal(
    readCaseMapBookingHandoff({ storage, serviceType: 'kwadrans-na-juz', now: 2_001 })?.serviceType,
    'kwadrans-na-juz',
  )
  assert.equal(readCaseMapBookingHandoff({ storage, serviceType: 'szybka-konsultacja-15-min', now: 2_001 }), null)
})

test('case map handoff expires and the temporary login draft restores only normalized answers', () => {
  const storage = new MemoryStorage()
  const handoff = createCaseMapBookingHandoff({
    species: 'kot',
    topic: 'cat_litter',
    path: 'fast',
    triageState: 'PROCEED',
    answers: {},
    now: 1_000,
  })
  assert.ok(handoff)
  assert.equal(writeCaseMapBookingHandoff(handoff, storage), true)
  assert.equal(readCaseMapBookingHandoff({ storage, now: 1_001 })?.problemType, 'kot-kuweta')
  assert.equal(readCaseMapBookingHandoff({ storage, now: 1_000 + CASE_MAP_BOOKING_HANDOFF_TTL_MS + 1 }), null)
  assert.equal(storage.getItem(CASE_MAP_BOOKING_HANDOFF_KEY), null)

  assert.equal(writeCaseMapLoginDraft({
    version: 1,
    species: 'kot',
    topic: 'cat_litter',
    answers: { case_focus: 'one_animal' },
    triage: { activeDanger: 'no' },
    path: 'fast',
    questionIndex: 2,
    stage: 'questions',
  }, storage), true)
  assert.deepEqual(readCaseMapLoginDraft(storage)?.answers, { case_focus: 'one_animal' })
  assert.ok(storage.getItem(CASE_MAP_LOGIN_DRAFT_KEY))
  clearCaseMapBookingHandoff(storage)
})

test('legacy and campaign links resolve to the canonical Map without carrying unrelated data', () => {
  const href = buildCaseMapHref({
    problem: 'pies-szczeka-na-psy',
    utm_source: 'instagram',
    utm_campaign: 'wakacje',
    answers: 'nie-wolno-w-url',
  })
  const url = new URL(href, 'https://example.test')

  assert.equal(url.pathname, '/mapa-sprawy')
  assert.equal(url.searchParams.get('problem'), 'pies-szczeka-na-psy')
  assert.equal(url.searchParams.get('utm_source'), 'instagram')
  assert.equal(url.searchParams.get('utm_campaign'), 'wakacje')
  assert.equal(url.searchParams.has('answers'), false)
})

test('case map report gives bounded guidance and puts health before behaviour work', () => {
  const proceed = buildCaseMapReport({
    species: 'pies',
    topic: 'dog_resources',
    path: 'fast',
    triageState: 'PROCEED',
    answers: {
      case_focus: 'one_animal',
      case_description: 'Warczanie przy misce.',
    },
  })
  assert.match(proceed.summary, /Warczanie przy misce/)
  assert.match(proceed.firstStep, /nie próbuj odbierać/i)
  assert.match(proceed.avoid, /nie testuj granic/i)

  const healthGate = buildCaseMapReport({
    species: 'kot',
    topic: 'cat_litter',
    path: 'long',
    triageState: 'VET_FIRST',
    answers: {},
  })
  assert.match(healthGate.firstStep, /weterynaryjną/i)
  assert.doesNotMatch(healthGate.firstStep, /diagnoz/i)
})

test('canonical Map link keeps only allowed parameters', () => {
  const url = new URL(buildCaseMapHref({ problem: 'pies-szczeka-na-psy', utm_source: 'instagram', utm_campaign: 'wakacje', answers: 'nie-wolno-w-url' }), 'https://example.test')
  assert.equal(url.pathname, '/mapa-sprawy')
  assert.equal(url.searchParams.get('problem'), 'pies-szczeka-na-psy')
  assert.equal(url.searchParams.get('utm_source'), 'instagram')
  assert.equal(url.searchParams.get('utm_campaign'), 'wakacje')
  assert.equal(url.searchParams.has('answers'), false)
})
