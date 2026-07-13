import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  QUIZ_BOOKING_HANDOFF_KEY,
  QUIZ_BOOKING_HANDOFF_TTL_MS,
  clearQuizBookingHandoff,
  createQuizBookingHandoff,
  readQuizBookingHandoff,
  writeQuizBookingHandoff,
} from '@/lib/quiz-booking-handoff'
import { getQuizProblemContext, resolveQuizResult, type QuizAnswers } from '@/lib/quiz-first-step'

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

test('quiz booking handoff keeps only a normalized topic and generated brief', () => {
  const answers: QuizAnswers = {
    species: 'kot',
    topic: 'cat_touch',
    safety: 'no',
    health: 'no',
    detail: 'petting',
    impact: 'single',
  }
  const result = resolveQuizResult(answers)
  const handoff = createQuizBookingHandoff({ answers, context: null, result, now: 100 })

  assert.deepEqual(handoff && {
    species: handoff.species,
    problemType: handoff.problemType,
    serviceType: handoff.serviceType,
  }, {
    species: 'kot',
    problemType: 'kot-dotyk',
    serviceType: 'szybka-konsultacja-15-min',
  })
  assert.doesNotMatch(handoff?.brief ?? '', /petting|detail|impact/i)
})

test('handoff expires, validates its booking target and can be cleared', () => {
  const storage = new MemoryStorage()
  const context = getQuizProblemContext('pies-nie-zostaje-sam')
  const answers: QuizAnswers = {
    species: 'pies',
    topic: 'dog_alone',
    safety: 'no',
    health: 'no',
    detail: 'short',
    impact: 'recurring',
  }
  const handoff = createQuizBookingHandoff({ answers, context, result: resolveQuizResult(answers, context), now: 1_000 })

  assert.ok(handoff)
  assert.equal(writeQuizBookingHandoff(handoff, storage), true)
  assert.equal(
    readQuizBookingHandoff({
      problemType: 'separacja',
      serviceType: 'konsultacja-30-min',
      species: 'pies',
      storage,
      now: 1_001,
    })?.brief,
    handoff.brief,
  )
  assert.equal(
    readQuizBookingHandoff({ problemType: 'spacer', storage, now: 1_001 }),
    null,
  )

  assert.equal(readQuizBookingHandoff({ storage, now: 1_000 + QUIZ_BOOKING_HANDOFF_TTL_MS + 1 }), null)
  assert.equal(storage.getItem(QUIZ_BOOKING_HANDOFF_KEY), null)

  assert.equal(writeQuizBookingHandoff(handoff, storage), true)
  clearQuizBookingHandoff(storage)
  assert.equal(storage.getItem(QUIZ_BOOKING_HANDOFF_KEY), null)
})
