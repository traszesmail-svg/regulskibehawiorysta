import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  FOLLOW_UP_QUESTION_COUNT,
  FOLLOW_UP_QUESTION_WINDOW_DAYS,
  getInitialQuestionsRemaining,
  getQuestionsExpiresAt,
  isQuestionsAccessExpired,
  resolveQuestionsExpiresAt,
} from '@/lib/question-access'

test('short paid conversations receive exactly two follow-up questions', () => {
  assert.equal(getInitialQuestionsRemaining('szybka-konsultacja-15-min'), FOLLOW_UP_QUESTION_COUNT)
  assert.equal(getInitialQuestionsRemaining('kwadrans-na-juz'), FOLLOW_UP_QUESTION_COUNT)
  assert.equal(getInitialQuestionsRemaining('konsultacja-30-min'), FOLLOW_UP_QUESTION_COUNT)
  assert.equal(getInitialQuestionsRemaining('konsultacja-behawioralna-online'), 0)
})

test('question access expires exactly seven days after publication', () => {
  const publishedAt = '2026-09-02T08:00:00.000Z'
  const expiresAt = getQuestionsExpiresAt(publishedAt)

  assert.equal(expiresAt, '2026-09-09T08:00:00.000Z')
  assert.equal(isQuestionsAccessExpired(expiresAt, Date.parse('2026-09-09T07:59:59.999Z')), false)
  assert.equal(isQuestionsAccessExpired(expiresAt, Date.parse('2026-09-09T08:00:00.000Z')), true)
  assert.equal(FOLLOW_UP_QUESTION_WINDOW_DAYS, 7)
})

test('pending bookings do not receive an expiry before the call is completed', () => {
  assert.equal(resolveQuestionsExpiresAt({
    serviceType: 'szybka-konsultacja-15-min',
    bookingStatus: 'confirmed',
    questionsExpiresAt: null,
    updatedAt: '2026-09-02T08:00:00.000Z',
  }), null)
})

test('completed legacy short bookings get a deterministic compatibility expiry', () => {
  assert.equal(resolveQuestionsExpiresAt({
    serviceType: 'szybka-konsultacja-15-min',
    bookingStatus: 'done',
    questionsExpiresAt: null,
    updatedAt: '2026-09-02T08:00:00.000Z',
  }), '2026-09-09T08:00:00.000Z')
})
