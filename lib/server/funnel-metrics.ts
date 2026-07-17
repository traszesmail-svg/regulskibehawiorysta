import type { BookingRecord, FunnelEventRecord, FunnelEventType } from '@/lib/types'
import { normalizeFunnelEventType } from '@/lib/server/funnel-events'

export const FUNNEL_METRIC_WINDOWS = ['24h', '7d', 'all'] as const
export type FunnelMetricWindow = (typeof FUNNEL_METRIC_WINDOWS)[number]

export const FUNNEL_STAGE_EVENT_TYPES = [
  'view_page',
  'funnel_entry_15_min',
  'funnel_entry_60_min',
  'booking_start',
  'booking_service_selected',
  'booking_slot_selected',
  'booking_form_started',
  'booking_form_submitted',
  'payment_viewed',
  'payment_started',
  'payment_marked_pending',
  'payment_completed',
  'booking_confirmed',
  'booking_drop',
  'confirmation_viewed',
  'call_room_viewed',
  'contact_form_started',
  'contact_form_submitted',
  'reject_cancel',
] as const satisfies readonly FunnelEventType[]

export type FunnelStageEventType = (typeof FUNNEL_STAGE_EVENT_TYPES)[number]
export type FunnelStageCounts = Record<FunnelStageEventType, number>

export const CASE_MAP_STAGE_EVENT_TYPES = [
  'case_map_started',
  'case_map_completed',
  'case_map_offer_viewed',
  'case_map_service_clicked',
  'case_map_booking_started',
] as const satisfies readonly FunnelEventType[]

export type CaseMapStageEventType = (typeof CASE_MAP_STAGE_EVENT_TYPES)[number]
export type CaseMapStageCounts = Record<CaseMapStageEventType, number>

export type FunnelBookingCounts = {
  total: number
  production: number
  qa: number
  pendingManualReview: number
  paid: number
  confirmed: number
  rejected: number
  failed: number
}

export type FunnelWindowSnapshot = {
  window: FunnelMetricWindow
  label: string
  from: string | null
  to: string
  eventCount: number
  qaEventCount: number
  stageCounts: FunnelStageCounts
  caseMap: {
    stageCounts: CaseMapStageCounts
    conversions: {
      startToCompleted: string
      completedToOffer: string
      offerToServiceClick: string
      serviceClickToBookingStart: string
    }
  }
  conversions: {
    viewToEntry15: string
    entry15ToBookingStart: string
    bookingStartToSlot: string
    slotToFormStart: string
    formStartToPayment: string
    paymentToPending: string
    paymentToCompleted: string
    completedToConfirmed: string
  }
  lastEventAt: string | null
}

export type FunnelMetricsSnapshot = {
  generatedAt: string
  totalEvents: number
  totalQaEvents: number
  bookingCounts: FunnelBookingCounts
  windows: FunnelWindowSnapshot[]
}

function createZeroStageCounts(): FunnelStageCounts {
  return {
    view_page: 0,
    funnel_entry_15_min: 0,
    funnel_entry_60_min: 0,
    booking_start: 0,
    booking_service_selected: 0,
    booking_slot_selected: 0,
    booking_form_started: 0,
    booking_form_submitted: 0,
    payment_viewed: 0,
    payment_started: 0,
    payment_marked_pending: 0,
    payment_completed: 0,
    booking_confirmed: 0,
    booking_drop: 0,
    confirmation_viewed: 0,
    call_room_viewed: 0,
    contact_form_started: 0,
    contact_form_submitted: 0,
    reject_cancel: 0,
  }
}

function createZeroCaseMapStageCounts(): CaseMapStageCounts {
  return {
    case_map_started: 0,
    case_map_completed: 0,
    case_map_offer_viewed: 0,
    case_map_service_clicked: 0,
    case_map_booking_started: 0,
  }
}

function formatPercentage(numerator: number, denominator: number): string {
  if (denominator <= 0) {
    return '—'
  }

  const ratio = Math.round((numerator / denominator) * 1000) / 10
  return `${ratio.toFixed(1)}%`
}

function getWindowStart(now: Date, window: FunnelMetricWindow): Date | null {
  if (window === 'all') {
    return null
  }

  const millis = window === '24h' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000
  return new Date(now.getTime() - millis)
}

function isEventInWindow(event: FunnelEventRecord, windowStart: Date | null, now: Date): boolean {
  const eventTime = Date.parse(event.createdAt)

  if (!Number.isFinite(eventTime)) {
    return false
  }

  if (windowStart && eventTime < windowStart.getTime()) {
    return false
  }

  if (eventTime > now.getTime()) {
    return false
  }

  return true
}

function isProductionEvent(event: FunnelEventRecord): boolean {
  return !event.qaBooking
}

function mapWindowLabel(window: FunnelMetricWindow): string {
  switch (window) {
    case '24h':
      return 'Ostatnie 24 h'
    case '7d':
      return 'Ostatnie 7 dni'
    default:
      return 'Cały czas'
  }
}

function createBookingCounts(bookings: BookingRecord[]): FunnelBookingCounts {
  const productionBookings = bookings.filter((booking) => !booking.qaBooking)
  const qaBookings = bookings.filter((booking) => booking.qaBooking)

  return {
    total: bookings.length,
    production: productionBookings.length,
    qa: qaBookings.length,
    pendingManualReview: productionBookings.filter((booking) => booking.paymentStatus === 'pending_manual_review').length,
    paid: productionBookings.filter((booking) => booking.paymentStatus === 'paid').length,
    confirmed: productionBookings.filter((booking) => booking.bookingStatus === 'confirmed' || booking.bookingStatus === 'done').length,
    rejected: productionBookings.filter(
      (booking) =>
        booking.paymentStatus === 'rejected' ||
        booking.bookingStatus === 'cancelled' ||
        booking.paymentStatus === 'refunded',
    ).length,
    failed: productionBookings.filter((booking) => booking.paymentStatus === 'failed').length,
  }
}

function buildConversions(stageCounts: FunnelStageCounts) {
  return {
    viewToEntry15: formatPercentage(stageCounts.funnel_entry_15_min, stageCounts.view_page),
    entry15ToBookingStart: formatPercentage(stageCounts.booking_start, stageCounts.funnel_entry_15_min),
    bookingStartToSlot: formatPercentage(stageCounts.booking_slot_selected, stageCounts.booking_start),
    slotToFormStart: formatPercentage(stageCounts.booking_form_started, stageCounts.booking_slot_selected),
    formStartToPayment: formatPercentage(stageCounts.payment_viewed, stageCounts.booking_form_started),
    paymentToPending: formatPercentage(stageCounts.payment_marked_pending, stageCounts.payment_viewed),
    paymentToCompleted: formatPercentage(stageCounts.payment_completed, stageCounts.payment_started),
    completedToConfirmed: formatPercentage(stageCounts.booking_confirmed, stageCounts.payment_completed),
  }
}

function buildCaseMapConversions(stageCounts: CaseMapStageCounts) {
  return {
    startToCompleted: formatPercentage(stageCounts.case_map_completed, stageCounts.case_map_started),
    completedToOffer: formatPercentage(stageCounts.case_map_offer_viewed, stageCounts.case_map_completed),
    offerToServiceClick: formatPercentage(stageCounts.case_map_service_clicked, stageCounts.case_map_offer_viewed),
    serviceClickToBookingStart: formatPercentage(stageCounts.case_map_booking_started, stageCounts.case_map_service_clicked),
  }
}

export function buildFunnelMetricsSnapshot({
  events,
  bookings,
  now = new Date(),
}: {
  events: FunnelEventRecord[]
  bookings: BookingRecord[]
  now?: Date
}): FunnelMetricsSnapshot {
  const windows = FUNNEL_METRIC_WINDOWS.map((window) => {
    const windowStart = getWindowStart(now, window)
    const stageCounts = createZeroStageCounts()
    const caseMapStageCounts = createZeroCaseMapStageCounts()
    let eventCount = 0
    let qaEventCount = 0
    let lastEventAt: string | null = null

    for (const event of events) {
      if (!isEventInWindow(event, windowStart, now)) {
        continue
      }

      if (event.qaBooking) {
        qaEventCount += 1
        continue
      }

      eventCount += 1
      lastEventAt = event.createdAt

      const normalizedType = normalizeFunnelEventType(event.eventType)
      if (normalizedType && normalizedType in stageCounts) {
        stageCounts[normalizedType as FunnelStageEventType] += 1
      }
      if (normalizedType && normalizedType in caseMapStageCounts) {
        caseMapStageCounts[normalizedType as CaseMapStageEventType] += 1
      }
    }

    return {
      window,
      label: mapWindowLabel(window),
      from: windowStart ? windowStart.toISOString() : null,
      to: now.toISOString(),
      eventCount,
      qaEventCount,
      stageCounts,
      caseMap: {
        stageCounts: caseMapStageCounts,
        conversions: buildCaseMapConversions(caseMapStageCounts),
      },
      conversions: buildConversions(stageCounts),
      lastEventAt,
    }
  })

  const totalEvents = events.filter(isProductionEvent).length
  const totalQaEvents = events.length - totalEvents

  return {
    generatedAt: now.toISOString(),
    totalEvents,
    totalQaEvents,
    bookingCounts: createBookingCounts(bookings),
    windows,
  }
}

function formatLine(label: string, value: string | number) {
  return `- ${label}: ${value}`
}

export function renderFunnelMetricsMarkdown(snapshot: FunnelMetricsSnapshot): string {
  const lines = [
    '# Raport Funnel Metrics',
    '',
    formatLine('Data generacji', snapshot.generatedAt),
    formatLine('Źródło', 'internal funnel ledger + bookings'),
    formatLine('Zdarzenia produkcyjne', snapshot.totalEvents),
    formatLine('Zdarzenia QA', snapshot.totalQaEvents),
    '',
    '## Bookingi operacyjne',
    formatLine('Wszystkie bookingi', snapshot.bookingCounts.total),
    formatLine('Bookingi produkcyjne', snapshot.bookingCounts.production),
    formatLine('Bookingi QA', snapshot.bookingCounts.qa),
    formatLine('Pending manual review', snapshot.bookingCounts.pendingManualReview),
    formatLine('Paid', snapshot.bookingCounts.paid),
    formatLine('Confirmed', snapshot.bookingCounts.confirmed),
    formatLine('Rejected / cancelled', snapshot.bookingCounts.rejected),
    formatLine('Failed', snapshot.bookingCounts.failed),
    '',
    '## Okna czasowe',
  ]

  for (const window of snapshot.windows) {
    lines.push(`### ${window.label}`)
    lines.push(formatLine('Zakres od', window.from ?? 'początek danych'))
    lines.push(formatLine('Zakres do', window.to))
    lines.push(formatLine('Zdarzenia produkcyjne', window.eventCount))
    lines.push(formatLine('Zdarzenia QA wykluczone', window.qaEventCount))
    lines.push(formatLine('View -> entry 15 min', window.conversions.viewToEntry15))
    lines.push(formatLine('Entry 15 min -> booking start', window.conversions.entry15ToBookingStart))
    lines.push(formatLine('Booking start -> slot', window.conversions.bookingStartToSlot))
    lines.push(formatLine('Slot -> form start', window.conversions.slotToFormStart))
    lines.push(formatLine('Form start -> payment', window.conversions.formStartToPayment))
    lines.push(formatLine('Payment -> pending', window.conversions.paymentToPending))
    lines.push(formatLine('Payment -> completed', window.conversions.paymentToCompleted))
    lines.push(formatLine('Completed -> confirmed', window.conversions.completedToConfirmed))
    lines.push(formatLine('Booking drop', window.stageCounts.booking_drop))
    lines.push(formatLine('Mapa start', window.caseMap.stageCounts.case_map_started))
    lines.push(formatLine('Mapa completed', window.caseMap.stageCounts.case_map_completed))
    lines.push(formatLine('Mapa offer viewed', window.caseMap.stageCounts.case_map_offer_viewed))
    lines.push(formatLine('Mapa service click', window.caseMap.stageCounts.case_map_service_clicked))
    lines.push(formatLine('Mapa booking started', window.caseMap.stageCounts.case_map_booking_started))
    lines.push(formatLine('Mapa start -> completed', window.caseMap.conversions.startToCompleted))
    lines.push(formatLine('Mapa completed -> offer', window.caseMap.conversions.completedToOffer))
    lines.push(formatLine('Mapa offer -> service click', window.caseMap.conversions.offerToServiceClick))
    lines.push(formatLine('Mapa service click -> booking start', window.caseMap.conversions.serviceClickToBookingStart))
    lines.push(formatLine('Ostatnie zdarzenie', window.lastEventAt ?? 'brak'))
    lines.push('')
  }

  return lines.join('\n')
}
