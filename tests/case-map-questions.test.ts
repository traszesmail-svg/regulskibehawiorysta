import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  CASE_MAP_TRIAGE_QUESTIONS,
  getCaseMapFastQuestions,
  getCaseMapLongSections,
  getCaseMapPublicLongSections,
  getCaseMapQuestionCount,
  getCaseMapShortFlowQuestions,
} from '@/lib/case-map-questions'

const topics = [
  'dog_walks',
  'dog_alone',
  'dog_resources',
  'dog_noise',
  'dog_change',
  'cat_litter',
  'cat_touch',
  'cat_conflict',
  'cat_change',
  'noise',
  'other',
] as const

test('every case map triage question keeps an honest unknown option where facts can be missing', () => {
  for (const question of CASE_MAP_TRIAGE_QUESTIONS) {
    assert.ok(question.options?.some((option) => option.id === 'unknown'), question.id)
  }
})

test('every supported topic has a focused fast module and a long interview extension', () => {
  for (const topic of topics) {
    assert.ok(getCaseMapFastQuestions(topic).length >= 10, topic)
    assert.equal(getCaseMapLongSections(topic).at(-1)?.id, 'topic-details')
    assert.ok(getCaseMapQuestionCount('long', topic) > getCaseMapQuestionCount('fast', topic))
  }
})

test('litter and safety questions do not hide urgent uncertainty behind a sales path', () => {
  const litter = getCaseMapFastQuestions('cat_litter').find((question) => question.id === 'litter_urinary_symptoms')
  assert.ok(litter?.options?.some((option) => option.id === 'unknown'))
  assert.ok(CASE_MAP_TRIAGE_QUESTIONS.some((question) => question.id === 'emergency_health'))
})

test('the public short map is compact and contains no health or injury triage fields', () => {
  const excludedIds = new Set([
    'active_danger',
    'injury',
    'emergency_health',
    'health_change',
    'escape_selfharm',
    'vulnerable_context',
    'vet_status',
    'litter_urinary_symptoms',
    'touch_sudden_or_injury',
    'resource_injury',
    'conflict_injury',
    'noise_escape',
    'walk_contact_history',
  ])

  for (const topic of topics) {
    const shortQuestions = getCaseMapShortFlowQuestions(topic)
    assert.equal(shortQuestions.length, 5, topic)
    assert.ok(shortQuestions.every((question) => !excludedIds.has(question.id)), topic)
  }
})

test('the public fuller map omits health, injury and triage sections for every topic', () => {
  const excludedSectionIds = new Set(['health-and-history'])
  const excludedQuestionIds = new Set([
    'active_danger',
    'injury',
    'emergency_health',
    'health_change',
    'escape_selfharm',
    'vulnerable_context',
    'vet_status',
    'litter_urinary_symptoms',
    'touch_sudden_or_injury',
    'resource_injury',
    'conflict_injury',
    'noise_escape',
    'walk_contact_history',
  ])

  for (const topic of topics) {
    const sections = getCaseMapPublicLongSections(topic)
    assert.ok(sections.length > 0, topic)
    assert.ok(sections.every((section) => !excludedSectionIds.has(section.id)), topic)
    assert.ok(sections.flatMap((section) => section.questions).every((question) => !excludedQuestionIds.has(question.id)), topic)
  }
})
