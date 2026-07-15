import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  CaseMapInputError,
  normalizeCaseMapCreateInput,
  normalizeCaseMapPatchInput,
  normalizeCaseMapTriage,
  resolveCaseMapTriage,
  resolveCaseMapTriageWithAnswers,
} from '@/lib/case-map'

const neutralTriage = {
  activeDanger: 'no',
  injury: 'no',
  emergencyHealth: 'no',
  healthChange: 'no',
  escapeSelfharm: 'no',
  vulnerableContext: 'no',
  vetStatus: 'unknown',
} as const

test('case map triage stops at active safety risk before any service path', () => {
  const triage = normalizeCaseMapTriage({
    ...neutralTriage,
    activeDanger: 'yes',
    injury: 'yes',
    emergencyHealth: 'yes',
  })

  assert.equal(resolveCaseMapTriage(triage), 'SAFETY_NOW')
})

test('case map triage prioritizes human medical help over veterinary urgency', () => {
  const triage = normalizeCaseMapTriage({
    ...neutralTriage,
    injury: 'yes',
    emergencyHealth: 'yes',
  })

  assert.equal(resolveCaseMapTriage(triage), 'HUMAN_MEDICAL')
})

test('case map triage routes an urgent cat urinary signal to veterinary care', () => {
  const triage = normalizeCaseMapTriage({
    ...neutralTriage,
    emergencyHealth: 'yes',
  })

  assert.equal(resolveCaseMapTriage(triage), 'VET_URGENT')
})

test('case map triage keeps a health-first gate before any result or CTA', () => {
  const triage = normalizeCaseMapTriage({
    ...neutralTriage,
    healthChange: 'yes',
  })

  assert.equal(resolveCaseMapTriage(triage), 'VET_FIRST')
})

test('case map triage keeps a safety-priority record without presenting it as a diagnosis', () => {
  const triage = normalizeCaseMapTriage({
    ...neutralTriage,
    vulnerableContext: 'yes',
  })

  assert.equal(resolveCaseMapTriage(triage), 'SAFETY_PRIORITY')
})

test('case map rejects a dog topic for a cat before it can be saved', () => {
  assert.throws(
    () =>
      normalizeCaseMapCreateInput({
        species: 'kot',
        topic: 'dog_walks',
        path: 'fast',
        source: 'instagram',
        triage: neutralTriage,
        answers: {},
        consentVersion: '2026-07-14',
        marketingConsent: false,
      }),
    CaseMapInputError,
  )
})

test('case map keeps marketing consent independent from case consent', () => {
  const input = normalizeCaseMapCreateInput({
    species: 'pies',
    topic: 'dog_walks',
    path: 'fast',
    source: 'problem_page',
    problemKey: 'pies-szczeka-na-psy',
    triage: neutralTriage,
    answers: {
      case_focus: 'jedno zwierzę',
      case_urgent: 'yes',
      fast_impact: 2,
      case_description: 'Reakcja zaczyna się na widok psów z dystansu.',
    },
    currentQuestionId: 'walk_distance',
    consentVersion: '2026-07-14',
    privacyConsent: true,
    marketingConsent: false,
  })

  assert.equal(input.marketingConsent, false)
  assert.equal(input.answers.case_urgent, 'yes')
  assert.equal(input.answers.case_description, 'Reakcja zaczyna się na widok psów z dystansu.')
})

test('case map rejects unknown fields and nested payloads', () => {
  assert.throws(
    () =>
      normalizeCaseMapCreateInput({
        species: 'pies',
        topic: 'dog_walks',
        path: 'fast',
        source: 'direct',
        triage: neutralTriage,
        answers: {
          unknown_field: 'nie powinno przejść',
        },
        consentVersion: '2026-07-14',
        privacyConsent: true,
        marketingConsent: false,
      }),
    CaseMapInputError,
  )

  assert.throws(
    () =>
      normalizeCaseMapCreateInput({
        species: 'pies',
        topic: 'dog_walks',
        path: 'fast',
        source: 'direct',
        triage: neutralTriage,
        answers: {
          case_focus: { nested: 'nie' },
        },
        consentVersion: '2026-07-14',
        privacyConsent: true,
        marketingConsent: false,
      }),
    CaseMapInputError,
  )
})

test('case map patch requires a revision and a real change', () => {
  assert.throws(() => normalizeCaseMapPatchInput({ answers: {} }), CaseMapInputError)
  assert.throws(() => normalizeCaseMapPatchInput({ revision: 2 }), CaseMapInputError)

  const patch = normalizeCaseMapPatchInput({
    revision: 2,
    answers: { fast_goal: 'zrozumienie' },
    currentQuestionId: 'fast_goal',
  })

  assert.equal(patch.revision, 2)
  assert.equal(patch.answers?.fast_goal, 'zrozumienie')
})

test('case map keeps a conservative safety gate when a critical triage answer is unknown', () => {
  const triage = normalizeCaseMapTriage({
    ...neutralTriage,
    healthChange: 'unknown',
  })

  assert.equal(resolveCaseMapTriage(triage), 'SAFETY_PRIORITY')
})

test('case map escalates late topic-specific safety signals before a normal next step', () => {
  const triage = normalizeCaseMapTriage(neutralTriage)

  assert.equal(resolveCaseMapTriageWithAnswers(triage, { litter_urinary_symptoms: 'yes' }), 'VET_URGENT')
  assert.equal(resolveCaseMapTriageWithAnswers(triage, { touch_sudden_or_injury: 'yes' }), 'VET_FIRST')
  assert.equal(resolveCaseMapTriageWithAnswers(triage, { noise_escape: 'yes' }), 'SAFETY_PRIORITY')
})
