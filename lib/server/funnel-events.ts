import { randomUUID } from 'node:crypto'
import type { FunnelEventInput, FunnelEventProperties, FunnelEventRecord, FunnelEventType } from '@/lib/types'

const FUNNEL_EVENT_TYPES = new Set<FunnelEventType>([
  'page_view',
  'view_page',
  'funnel_entry_15_min',
  'funnel_entry_60_min',
  'newsletter_signup',
  'lead_magnet_signup',
  'booking_start',
  'booking_service_selected',
  'booking_slot_selected',
  'booking_form_started',
  'booking_form_submitted',
  'payment_viewed',
  'payment_marked_pending',
  'payment_completed',
  'booking_confirmed',
  'booking_drop',
  'confirmation_viewed',
  'call_room_viewed',
  'contact_form_started',
  'contact_form_submitted',
  'hero_cta_click',
  'service_select',
  'slot_select',
  'form_start',
  'form_submit',
  'payment_start',
  'payment_reported',
  'payment_confirmed',
  'home_view',
  'dogs_page_view',
  'cta_click',
  'topic_selected',
  'slot_selected',
  'form_started',
  'payment_opened',
  'manual_pending',
  'paid',
  'confirmed',
  'reject_cancel',
  'payment_started',
  'payment_success',
  'payment_failed',
  'faq_open',
  'opinion_add',
  'room_entered',
  'quiz_completed',
  'notification_optin_submitted',
  'notification_optout_submitted',
])

export type FunnelEventQueryWindow = '24h' | '7d' | 'all'

export function isFunnelEventType(value: string): value is FunnelEventType {
  return FUNNEL_EVENT_TYPES.has(value as FunnelEventType)
}

export function normalizeFunnelEventType(value: string | null | undefined): FunnelEventType | null {
  if (!value) {
    return null
  }

  switch (value) {
    case 'page_view':
    case 'home_view':
    case 'dogs_page_view':
      return 'view_page'
    case 'hero_cta_click':
      return 'funnel_entry_15_min'
    case 'service_select':
      return 'booking_service_selected'
    case 'slot_select':
    case 'slot_selected':
      return 'booking_slot_selected'
    case 'form_start':
    case 'form_started':
      return 'booking_form_started'
    case 'form_submit':
      return 'booking_form_submitted'
    case 'payment_opened':
      return 'payment_viewed'
    case 'payment_start':
      return 'payment_started'
    case 'payment_reported':
    case 'manual_pending':
      return 'payment_marked_pending'
    case 'payment_confirmed':
    case 'paid':
    case 'payment_success':
      return 'payment_completed'
    case 'confirmed':
      return 'booking_confirmed'
    case 'room_entered':
      return 'call_room_viewed'
    default:
      return isFunnelEventType(value) ? value : null
  }
}

export function getFunnelEventTypes(): FunnelEventType[] {
  return Array.from(FUNNEL_EVENT_TYPES)
}

export function normalizeFunnelEventProperties(
  properties: Record<string, unknown> | null | undefined,
): FunnelEventProperties {
  if (!properties) {
    return {}
  }

  const normalized: FunnelEventProperties = {}

  for (const [key, value] of Object.entries(properties)) {
    if (typeof value === 'string') {
      if (value.trim().length > 0) {
        normalized[key] = value.trim()
      }
      continue
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      normalized[key] = value
      continue
    }

    if (value === null) {
      normalized[key] = null
    }
  }

  return normalized
}

export function createFunnelEventRecord(input: FunnelEventInput): FunnelEventRecord {
  const normalizedEventType = normalizeFunnelEventType(input.eventType) ?? input.eventType

  return {
    id: randomUUID(),
    eventType: normalizedEventType,
    bookingId: input.bookingId ?? null,
    qaBooking: Boolean(input.qaBooking),
    source: input.source ?? 'client',
    pagePath: input.pagePath ?? null,
    location: input.location ?? null,
    properties: input.properties ?? {},
    createdAt: input.createdAt ?? new Date().toISOString(),
  }
}

export function isInternalAnalyticsPagePath(pagePath: string | null | undefined): boolean {
  if (!pagePath) {
    return false
  }

  return (
    pagePath.startsWith('/admin') ||
    pagePath.startsWith('/_internal') ||
    pagePath.startsWith('/__internal') ||
    pagePath.startsWith('/qa-share') ||
    pagePath.startsWith('/api/')
  )
}
