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
    makeEvent('payment_marked_pending', '2026-04-06T09:06:00.000Z'),
    makeEvent('payment_completed', '2026-04-06T09:07:00.000Z'),
    makeEvent('booking_confirmed', '2026-04-06T09:08:00.000Z'),
    makeEvent('reject_cancel', '2026-03-30T11:59:00.000Z'),
    makeEvent('view_page', '2026-04-06T09:09:00.000Z', true),
    makeEvent('payment_completed', '2026-04-06T09:10:00.000Z', true),
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

  assert.equal(snapshot.totalEvents, 10)
  assert.equal(snapshot.totalQaEvents, 2)
  assert.equal(snapshot.bookingCounts.total, 4)
  assert.equal(snapshot.bookingCounts.production, 3)
  assert.equal(snapshot.bookingCounts.qa, 1)
  assert.equal(snapshot.bookingCounts.pendingManualReview, 1)
  assert.equal(snapshot.bookingCounts.paid, 1)
  assert.equal(snapshot.bookingCounts.confirmed, 1)
  assert.equal(snapshot.bookingCounts.rejected, 1)
  assert.equal(snapshot.bookingCounts.failed, 1)

  assert.equal(window24h?.eventCount, 9)
  assert.equal(window24h?.qaEventCount, 2)
  assert.equal(window24h?.stageCounts.view_page, 1)
  assert.equal(window24h?.stageCounts.booking_confirmed, 1)
  assert.equal(window24h?.conversions.viewToEntry15, '100.0%')
  assert.equal(window24h?.conversions.completedToConfirmed, '100.0%')

  assert.equal(window7d?.eventCount, 9)
  assert.equal(windowAll?.eventCount, 10)
  assert.match(report, /Raport Funnel Metrics/)
  assert.match(report, /Zdarzenia produkcyjne: 10/)
  assert.match(report, /Bookingi QA: 1/)
  assert.match(report, /Ostatnie 24 h/)
  assert.match(report, /Completed -> confirmed: 100.0%/)
})
