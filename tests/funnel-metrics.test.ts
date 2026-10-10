import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { BookingRecord, FunnelEventRecord } from '@/lib/types'
import { buildFunnelMetricsSnapshot, renderFunnelMetricsMarkdown } from '@/lib/server/funnel-metrics'

function makeEvent(
  eventType: FunnelEventRecord['eventType'],
  createdAt: string,
  qaBooking = false,
): FunnelEventRecord {
  return {
    id: `${eventType}-${createdAt}-${qaBooking ? 'qa' : 'prod'}`,
    eventType,
    bookingId: qaBooking ? 'qa-booking-1' : 'booking-1',
    qaBooking,
    source: 'client',
    pagePath: '/book',
    location: 'unit-test',
    properties: {},
    createdAt,
  }
}

function makeBooking(
  id: string,
  qaBooking: boolean,
  bookingStatus: BookingRecord['bookingStatus'],
  paymentStatus: BookingRecord['paymentStatus'],
): BookingRecord {
  return {
    id,
    userId: null,
    customerAccessTokenHash: '',
    ownerName: 'Test User',
    serviceType: 'szybka-konsultacja-15-min',
    animalType: 'Pies',
    problemType: 'szczeniak',
    petAge: '2 lata',
    durationNotes: 'Od 2 tygodni',
    description: 'Opis testowy do raportu funnel metrics.',
    phone: '',
    email: `${id}@example.com`,
    bookingDate: '2026-04-06',
    bookingTime: '10:00',
    slotId: `${id}-slot`,
    qaBooking,
    bookingStatus,
    paymentStatus,
    paymentMethod: paymentStatus === 'paid' ? 'manual' : null,
    paymentReference: null,
    amount: 69,
    meetingUrl: 'https://meet.example.com/test',
    createdAt: '2026-04-06T10:00:00.000Z',
    updatedAt: '2026-04-06T10:00:00.000Z',
    paidAt: paymentStatus === 'paid' ? '2026-04-06T10:05:00.000Z' : null,
    paymentReportedAt: paymentStatus === 'pending_manual_review' ? '2026-04-06T10:04:00.000Z' : null,
    paymentRejectedAt: paymentStatus === 'rejected' || paymentStatus === 'failed' ? '2026-04-06T10:06:00.000Z' : null,
    paymentRejectedReason: paymentStatus === 'rejected' ? 'Nie znaleziono wpłaty.' : null,
    cancelledAt: bookingStatus === 'cancelled' ? '2026-04-06T10:06:00.000Z' : null,
    expiredAt: bookingStatus === 'expired' ? '2026-04-06T10:06:00.000Z' : null,
    refundedAt: paymentStatus === 'refunded' ? '2026-04-06T10:06:00.000Z' : null,
    checkoutSessionId: null,
    paymentIntentId: null,
    payuOrderId: null,
    payuOrderStatus: null,
    customerPhoneNormalized: null,
    smsConfirmationStatus: null,
    smsConfirmationSentAt: null,
    smsProviderMessageId: null,
    smsErrorCode: null,
    smsErrorMessage: null,
    recommendedNextStep: null,
    reminderSent: false,
    prepVideoPath: null,
    prepVideoFilename: null,
    prepVideoSizeBytes: null,
    prepLinkUrl: null,
    prepNotes: null,
    prepUploadedAt: null,
  }
}

test('funnel metrics snapshot keeps QA out of production counts and renders the funnel', () => {
  const now = new Date('2026-04-06T12:00:00.000Z')
  const events: FunnelEventRecord[] = [
    makeEvent('view_page', '2026-04-06T09:00:00.000Z'),
    makeEvent('funnel_entry_15_min', '2026-04-06T09:01:00.000Z'),
    makeEvent('booking_start', '2026-04-06T09:02:00.000Z'),
    makeEvent('booking_slot_selected', '2026-04-06T09:03:00.000Z'),
    makeEvent('booking_form_started', '2026-04-06T09:04:00.000Z'),
    makeEvent('payment_viewed', '2026-04-06T09:05:00.000Z'),
    makeEvent('payment_started', '2026-04-06T09:05:30.000Z'),
    makeEvent('payment_marked_pending', '2026-04-06T09:06:00.000Z'),
    makeEvent('payment_completed', '2026-04-06T09:07:00.000Z'),
    makeEvent('booking_confirmed', '2026-04-06T09:08:00.000Z'),
    makeEvent('booking_drop', '2026-04-06T09:09:00.000Z'),
    makeEvent('case_map_started', '2026-04-06T09:10:00.000Z'),
    makeEvent('case_map_completed', '2026-04-06T09:10:10.000Z'),
    makeEvent('case_map_offer_viewed', '2026-04-06T09:10:20.000Z'),
    makeEvent('case_map_service_clicked', '2026-04-06T09:10:30.000Z'),
    makeEvent('case_map_booking_started', '2026-04-06T09:10:40.000Z'),
    makeEvent('reject_cancel', '2026-03-30T11:59:00.000Z'),
    makeEvent('view_page', '2026-04-06T09:10:00.000Z', true),
    makeEvent('payment_completed', '2026-04-06T09:11:00.000Z', true),
  ]
  const bookings: BookingRecord[] = [
    makeBooking('booking-1', false, 'pending_manual_payment', 'pending_manual_review'),
    makeBooking('booking-2', false, 'confirmed', 'paid'),
    makeBooking('booking-3', false, 'cancelled', 'failed'),
    makeBooking('booking-qa', true, 'confirmed', 'paid'),
  ]

  const snapshot = buildFunnelMetricsSnapshot({ events, bookings, now })
  const report = renderFunnelMetricsMarkdown(snapshot)
  const window24h = snapshot.windows.find((window) => window.window === '24h')
  const window7d = snapshot.windows.find((window) => window.window === '7d')
  const windowAll = snapshot.windows.find((window) => window.window === 'all')

  assert.equal(snapshot.totalEvents, 17)
  assert.equal(snapshot.totalQaEvents, 2)
  assert.equal(snapshot.bookingCounts.total, 4)
  assert.equal(snapshot.bookingCounts.production, 3)
  assert.equal(snapshot.bookingCounts.qa, 1)
  assert.equal(snapshot.bookingCounts.pendingManualReview, 1)
  assert.equal(snapshot.bookingCounts.paid, 1)
  assert.equal(snapshot.bookingCounts.confirmed, 1)
  assert.equal(snapshot.bookingCounts.rejected, 1)
  assert.equal(snapshot.bookingCounts.failed, 1)

  assert.equal(window24h?.eventCount, 16)
  assert.equal(window24h?.qaEventCount, 2)
  assert.equal(window24h?.stageCounts.view_page, 1)
  assert.equal(window24h?.stageCounts.booking_confirmed, 1)
  assert.equal(window24h?.stageCounts.booking_drop, 1)
  assert.equal(window24h?.conversions.viewToEntry15, '100.0%')
  assert.equal(window24h?.conversions.paymentToCompleted, '100.0%')
  assert.equal(window24h?.conversions.completedToConfirmed, '100.0%')
  assert.equal(window24h?.caseMap.stageCounts.case_map_started, 1)
  assert.equal(window24h?.caseMap.stageCounts.case_map_completed, 1)
  assert.equal(window24h?.caseMap.stageCounts.case_map_offer_viewed, 1)
  assert.equal(window24h?.caseMap.stageCounts.case_map_service_clicked, 1)
  assert.equal(window24h?.caseMap.stageCounts.case_map_booking_started, 1)
  assert.equal(window24h?.caseMap.conversions.startToCompleted, '100.0%')
  assert.equal(window24h?.caseMap.conversions.serviceClickToBookingStart, '100.0%')

  assert.equal(window24h?.lastEventAt, '2026-04-06T09:10:40.000Z')
  assert.equal(window7d?.lastEventAt, '2026-04-06T09:10:40.000Z')
  assert.equal(windowAll?.lastEventAt, '2026-04-06T09:10:40.000Z')

  assert.equal(window7d?.eventCount, 16)
  assert.equal(windowAll?.eventCount, 17)
  assert.match(report, /Raport Funnel Metrics/)
  assert.match(report, /Zdarzenia produkcyjne: 17/)
  assert.match(report, /Bookingi QA: 1/)
  assert.match(report, /Ostatnie 24 h/)
  assert.match(report, /Completed -> confirmed: 100.0%/)
  assert.match(report, /Booking drop: 1/)
  assert.match(report, /Mapa service click: 1/)
})

test('funnel metrics resolves the latest event date regardless of event ordering', () => {
  const now = new Date('2026-04-06T12:00:00.000Z')
  const e1 = makeEvent('view_page', '2026-04-06T08:00:00.000Z')
  const e2 = makeEvent('booking_start', '2026-04-06T10:00:00.000Z')
  const e3 = makeEvent('payment_completed', '2026-04-06T09:00:00.000Z')

  const ascending = [e1, e3, e2]
  const descending = [e2, e3, e1]
  const mixed = [e3, e1, e2]

  for (const list of [ascending, descending, mixed]) {
    const snapshot = buildFunnelMetricsSnapshot({ events: list, bookings: [], now })
    const w24h = snapshot.windows.find((w) => w.window === '24h')
    const w7d = snapshot.windows.find((w) => w.window === '7d')
    const wAll = snapshot.windows.find((w) => w.window === 'all')

    assert.equal(w24h?.lastEventAt, '2026-04-06T10:00:00.000Z')
    assert.equal(w7d?.lastEventAt, '2026-04-06T10:00:00.000Z')
    assert.equal(wAll?.lastEventAt, '2026-04-06T10:00:00.000Z')
  }
})

test('funnel metrics ignores newer QA events, invalid dates, and future events when determining lastEventAt', () => {
  const now = new Date('2026-04-06T12:00:00.000Z')
  const events = [
    makeEvent('view_page', '2026-04-06T10:00:00.000Z'),
    makeEvent('payment_completed', '2026-04-06T11:50:00.000Z', true),
    makeEvent('booking_start', 'invalid-date-string'),
    makeEvent('payment_completed', '2026-04-06T13:00:00.000Z'),
  ]

  const snapshot = buildFunnelMetricsSnapshot({ events, bookings: [], now })
  const w24h = snapshot.windows.find((w) => w.window === '24h')
  assert.equal(w24h?.lastEventAt, '2026-04-06T10:00:00.000Z')
  assert.equal(w24h?.eventCount, 1)
  assert.equal(w24h?.qaEventCount, 1)
})

test('funnel metrics sets lastEventAt to null for empty events or QA-only events', () => {
  const now = new Date('2026-04-06T12:00:00.000Z')

  const emptySnapshot = buildFunnelMetricsSnapshot({ events: [], bookings: [], now })
  for (const w of emptySnapshot.windows) {
    assert.equal(w.lastEventAt, null)
    assert.equal(w.eventCount, 0)
  }

  const qaOnlyEvents = [
    makeEvent('view_page', '2026-04-06T10:00:00.000Z', true),
    makeEvent('booking_start', '2026-04-06T11:00:00.000Z', true),
  ]
  const qaSnapshot = buildFunnelMetricsSnapshot({ events: qaOnlyEvents, bookings: [], now })
  for (const w of qaSnapshot.windows) {
    assert.equal(w.lastEventAt, null)
    assert.equal(w.eventCount, 0)
  }
})

test('event older than seven days affects only the all window', () => {
  const now = new Date('2026-04-06T12:00:00.000Z')
  const oldEvent = makeEvent('view_page', '2026-03-25T10:00:00.000Z')

  const snapshot = buildFunnelMetricsSnapshot({ events: [oldEvent], bookings: [], now })
  const w24h = snapshot.windows.find((w) => w.window === '24h')
  const w7d = snapshot.windows.find((w) => w.window === '7d')
  const wAll = snapshot.windows.find((w) => w.window === 'all')

  assert.equal(w24h?.lastEventAt, null)
  assert.equal(w24h?.eventCount, 0)
  assert.equal(w7d?.lastEventAt, null)
  assert.equal(w7d?.eventCount, 0)
  assert.equal(wAll?.lastEventAt, '2026-03-25T10:00:00.000Z')
  assert.equal(wAll?.eventCount, 1)
})

test('10:00Z wins over 11:00+02:00 because it is later in absolute time', () => {
  const now = new Date('2026-04-06T12:00:00.000Z')
  const utcEvent = makeEvent('booking_start', '2026-04-06T10:00:00.000Z')
  const offsetEvent = makeEvent('view_page', '2026-04-06T11:00:00+02:00')

  const snapshot1 = buildFunnelMetricsSnapshot({ events: [utcEvent, offsetEvent], bookings: [], now })
  const w1 = snapshot1.windows.find((w) => w.window === '24h')
  assert.equal(w1?.lastEventAt, '2026-04-06T10:00:00.000Z')

  const snapshot2 = buildFunnelMetricsSnapshot({ events: [offsetEvent, utcEvent], bookings: [], now })
  const w2 = snapshot2.windows.find((w) => w.window === '24h')
  assert.equal(w2?.lastEventAt, '2026-04-06T10:00:00.000Z')
})

test('counts, conversions, and input array mutation are preserved', () => {
  const now = new Date('2026-04-06T12:00:00.000Z')
  const events: FunnelEventRecord[] = [
    makeEvent('view_page', '2026-04-06T08:00:00.000Z'),
    makeEvent('funnel_entry_15_min', '2026-04-06T09:00:00.000Z'),
  ]
  const originalEventsCopy = [...events]

  const snapshot = buildFunnelMetricsSnapshot({ events, bookings: [], now })
  const w24h = snapshot.windows.find((w) => w.window === '24h')

  assert.equal(w24h?.eventCount, 2)
  assert.equal(w24h?.stageCounts.view_page, 1)
  assert.equal(w24h?.stageCounts.funnel_entry_15_min, 1)
  assert.equal(w24h?.conversions.viewToEntry15, '100.0%')
  assert.equal(w24h?.lastEventAt, '2026-04-06T09:00:00.000Z')

  assert.deepEqual(events, originalEventsCopy)
})
