import assert from 'node:assert/strict'
import { test } from 'node:test'
import { normalizeCaseMapPrivateAnalyticsEvent } from '@/lib/case-map-analytics'

test('case map analytics keeps a strict first-party-only schema', () => {
  const started = normalizeCaseMapPrivateAnalyticsEvent('case_map_started', {
    map_path: 'fast',
    entry_source: 'instagram',
    answers: 'never store this',
    email: 'owner@example.com',
    case_map_id: '00000000-0000-4000-8000-000000000000',
  })

  assert.deepEqual(started, {
    eventType: 'case_map_started',
    pagePath: '/mapa-sprawy',
    properties: {
      map_path: 'fast',
      entry_source: 'instagram',
    },
  })
})

test('case map analytics rejects incomplete and unsafe event shapes', () => {
  assert.equal(
    normalizeCaseMapPrivateAnalyticsEvent('case_map_service_clicked', {
      map_path: 'long',
      service_key: 'konsultacja-30-min',
      cta_variant: 'external-url',
    }),
    null,
  )
  assert.equal(
    normalizeCaseMapPrivateAnalyticsEvent('case_map_booking_started', {
      service_key: 'konsultacja-30-min',
      entry_source: 'other',
    }),
    null,
  )
  assert.equal(
    normalizeCaseMapPrivateAnalyticsEvent('case_map_completed', {
      map_path: 'fast',
      service_key: 'unknown-service',
    }),
    null,
  )
})

test('case map booking arrival is always canonicalized without URL query data', () => {
  const booking = normalizeCaseMapPrivateAnalyticsEvent('case_map_booking_started', {
    service_key: 'kwadrans-na-juz',
    entry_source: 'case_map',
    page_path: '/book?answers=private&resume=secret',
  })

  assert.deepEqual(booking, {
    eventType: 'case_map_booking_started',
    pagePath: '/book',
    properties: {
      service_key: 'kwadrans-na-juz',
      entry_source: 'case_map',
    },
  })
})
