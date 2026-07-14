import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  getQuizProblemContext,
  getQuizQuestions,
  isQuizComplete,
  resolveQuizResult,
  type QuizAnswers,
} from '@/lib/quiz-first-step'

function ids(answers: QuizAnswers, problemKey?: string) {
  return getQuizQuestions(answers, getQuizProblemContext(problemKey)).map((question) => question.id)
}

test('safety is a hard gate, not an input to a paid recommendation', () => {
  const answers: QuizAnswers = {
    species: 'pies',
    topic: 'dog_walks',
    safety: 'yes',
  }

  const result = resolveQuizResult(answers)

  assert.equal(result.route, 'safety_first')
  assert.equal(result.serviceKey, undefined)
  assert.deepEqual(ids(answers), ['species', 'topic', 'safety'])
})

test('uncertain health flags route to veterinary-first guidance before a consultation offer', () => {
  const answers: QuizAnswers = {
    species: 'pies',
    topic: 'dog_noise',
    safety: 'no',
    health: 'unsure',
  }

  const result = resolveQuizResult(answers)

  assert.equal(result.route, 'vet_first')
  assert.equal(result.serviceKey, undefined)
  assert.deepEqual(ids(answers), ['species', 'topic', 'safety', 'health'])
})

test('cat litter red flags always override a normal consultation path', () => {
  const answers: QuizAnswers = {
    species: 'kot',
    topic: 'cat_litter',
    safety: 'no',
    health: 'no',
    detail: 'red_flag',
  }

  const result = resolveQuizResult(answers)

  assert.equal(result.route, 'vet_first')
  assert.equal(result.serviceKey, undefined)
})

test('walks ask about walks and never force a resource-guarding answer', () => {
  const answers: QuizAnswers = {
    species: 'pies',
    topic: 'dog_walks',
    safety: 'no',
    health: 'no',
  }

  const detailQuestion = getQuizQuestions(answers, null).find((question) => question.id === 'detail')

  assert.equal(detailQuestion?.title, 'Co jest najbliższe temu, co widzisz na spacerze?')
  assert.doesNotMatch(detailQuestion?.options.map((option) => option.label).join(' ') ?? '', /Miska|Kanapa|gryzak/i)
})

test('noise asks about noise and never forces a separation question', () => {
  const answers: QuizAnswers = {
    species: 'pies',
    topic: 'dog_noise',
    safety: 'no',
    health: 'no',
  }

  const detailQuestion = getQuizQuestions(answers, null).find((question) => question.id === 'detail')

  assert.equal(detailQuestion?.title, 'Co jest teraz najtrudniejszym bodźcem?')
  assert.doesNotMatch(detailQuestion?.options.map((option) => option.label).join(' ') ?? '', /nieobecność|samemu/i)
})

test('cat touch asks about touch and never assumes another cat is involved', () => {
  const answers: QuizAnswers = {
    species: 'kot',
    topic: 'cat_touch',
    safety: 'no',
    health: 'no',
  }

  const detailQuestion = getQuizQuestions(answers, null).find((question) => question.id === 'detail')

  assert.equal(detailQuestion?.title, 'Kiedy kot najczęściej pokazuje napięcie?')
  assert.doesNotMatch(detailQuestion?.options.map((option) => option.label).join(' ') ?? '', /inny kot|kotami/i)
})

test('one clear, low-risk context recommends a short directional conversation', () => {
  const result = resolveQuizResult({
    species: 'pies',
    topic: 'dog_walks',
    safety: 'no',
    health: 'no',
    detail: 'pulling',
    impact: 'single',
  })

  assert.equal(result.route, 'short_consultation')
  assert.equal(result.serviceKey, 'kwadrans')
})

test('completed quiz teaches before it sells a service', () => {
  const result = resolveQuizResult(
    {
      species: 'pies',
      topic: 'dog_walks',
      safety: 'no',
      health: 'no',
      detail: 'distance',
      impact: 'single',
    },
    getQuizProblemContext('pies-szczeka-na-psy'),
  )

  assert.equal(result.route, 'short_consultation')
  assert.equal(result.articleHref, '/blog/dlaczego-moj-pies-szczeka-na-inne-psy')
  assert.equal(result.problemHref, '/problemy/pies-szczeka-na-psy')
})

test('a recurring issue recommends enough time to connect the observations', () => {
  const result = resolveQuizResult({
    species: 'kot',
    topic: 'cat_change',
    safety: 'no',
    health: 'no',
    detail: 'routine',
    impact: 'recurring',
  })

  assert.equal(result.route, 'observe_first')
  assert.equal(result.serviceKey, 'dwa-kwadranse')
})

test('daily or multi-context issues recommend a fuller interview without a numeric score', () => {
  const result = resolveQuizResult({
    species: 'pies',
    topic: 'dog_resources',
    safety: 'no',
    health: 'no',
    detail: 'food',
    impact: 'wide',
  })

  assert.equal(result.route, 'full_consultation')
  assert.equal(result.serviceKey, 'pelna-konsultacja')
  assert.match(result.summary, /kilka wątków/i)
})

test('a themed Instagram entry hides redundant species and topic questions', () => {
  const context = getQuizProblemContext('kot-gryzie-przy-glaskaniu')
  const questions = getQuizQuestions(
    {
      species: 'kot',
      topic: 'cat_touch',
      safety: 'no',
      health: 'no',
    },
    context,
  )

  assert.deepEqual(questions.map((question) => question.id), ['safety', 'health', 'detail', 'impact'])
})

test('an incomplete path never produces a paid recommendation', () => {
  const answers: QuizAnswers = {
    species: 'pies',
    topic: 'dog_walks',
    safety: 'no',
  }
  const result = resolveQuizResult(answers)

  assert.equal(isQuizComplete(answers), false)
  assert.equal(result.route, 'incomplete')
  assert.equal(result.serviceKey, undefined)
})

test('every supported topic has its own detail question and a safe non-matching option', () => {
  const topics: Array<[QuizAnswers['species'], QuizAnswers['topic']]> = [
    ['pies', 'dog_walks'],
    ['pies', 'dog_alone'],
    ['pies', 'dog_resources'],
    ['pies', 'dog_noise'],
    ['pies', 'dog_change'],
    ['kot', 'cat_litter'],
    ['kot', 'cat_touch'],
    ['kot', 'cat_conflict'],
    ['kot', 'cat_change'],
    ['kot', 'noise'],
    ['pies', 'other'],
    ['kot', 'other'],
  ]

  for (const [species, topic] of topics) {
    const detail = getQuizQuestions({ species, topic, safety: 'no', health: 'no' }, null).find(
      (question) => question.id === 'detail',
    )

    assert.ok(detail, `${topic} should have a detail question`)
    assert.ok(detail.options.some((option) => option.id === 'not_applicable'), `${topic} should allow a non-match`)
  }
})

test('a changed animal cannot keep a stale topic from the previous branch', () => {
  const answers: QuizAnswers = { species: 'kot', topic: 'dog_walks', safety: 'no' }
  const questionIds = getQuizQuestions(answers, null).map((question) => question.id)

  assert.equal(isQuizComplete(answers), false)
  assert.equal(questionIds.includes('detail'), false)
})

test('Instagram problem keys tolerate surrounding whitespace and casing', () => {
  assert.equal(getQuizProblemContext('  KOT-GRYZIE-PRZY-GLASKANIU ')?.topic, 'cat_touch')
})
