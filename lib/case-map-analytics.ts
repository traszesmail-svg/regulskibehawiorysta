import { trackPrivateAnalyticsEvent } from '@/lib/analytics'
import type { FunnelEventProperties, FunnelEventType } from '@/lib/types'

export const CASE_MAP_PRIVATE_EVENT_TYPES = [
  'case_map_started',
  'case_map_completed',
  'case_map_offer_viewed',
  'case_map_service_clicked',
  'case_map_booking_started',
] as const satisfies readonly FunnelEventType[]

export type CaseMapPrivateEventType = (typeof CASE_MAP_PRIVATE_EVENT_TYPES)[number]
export type CaseMapAnalyticsPath = 'fast' | 'long'
export type CaseMapAnalyticsSource = 'direct' | 'problem_page' | 'instagram'
export type CaseMapAnalyticsService =
  | 'szybka-konsultacja-15-min'
  | 'kwadrans-na-juz'
  | 'konsultacja-30-min'

type CaseMapAnalyticsInput = Record<string, unknown> | null | undefined

const PRIVATE_EVENT_SET = new Set<CaseMapPrivateEventType>(CASE_MAP_PRIVATE_EVENT_TYPES)
const PATH_SET = new Set<CaseMapAnalyticsPath>(['fast', 'long'])
const SOURCE_SET = new Set<CaseMapAnalyticsSource>(['direct', 'problem_page', 'instagram'])
const SERVICE_SET = new Set<CaseMapAnalyticsService>([
  'szybka-konsultacja-15-min',
  'kwadrans-na-juz',
  'konsultacja-30-min',
])

function isCaseMapPrivateEventType(value: unknown): value is CaseMapPrivateEventType {
  return typeof value === 'string' && PRIVATE_EVENT_SET.has(value as CaseMapPrivateEventType)
}

function readPath(value: unknown): CaseMapAnalyticsPath | null {
  return typeof value === 'string' && PATH_SET.has(value as CaseMapAnalyticsPath)
    ? value as CaseMapAnalyticsPath
    : null
}

function readSource(value: unknown): CaseMapAnalyticsSource | null {
  return typeof value === 'string' && SOURCE_SET.has(value as CaseMapAnalyticsSource)
    ? value as CaseMapAnalyticsSource
    : null
}

function readService(value: unknown): CaseMapAnalyticsService | null {
  return typeof value === 'string' && SERVICE_SET.has(value as CaseMapAnalyticsService)
    ? value as CaseMapAnalyticsService
    : null
}

/**
 * Strictly normalizes the only properties that a Map event may carry. It is
 * used on both sides of the request, so answers, short briefs, ids and e-mail
 * cannot be accidentally admitted into the analytics ledger.
 */
export function normalizeCaseMapPrivateAnalyticsEvent(
  eventType: unknown,
  properties: CaseMapAnalyticsInput,
): { eventType: CaseMapPrivateEventType; pagePath: '/mapa-sprawy' | '/book'; properties: FunnelEventProperties } | null {
  if (!isCaseMapPrivateEventType(eventType)) {
    return null
  }

  const input = properties && typeof properties === 'object' && !Array.isArray(properties)
    ? properties
    : {}

  if (eventType === 'case_map_started') {
    const mapPath = readPath(input.map_path)
    const entrySource = readSource(input.entry_source)
    if (!mapPath || !entrySource) return null
    return { eventType, pagePath: '/mapa-sprawy', properties: { map_path: mapPath, entry_source: entrySource } }
  }

  if (eventType === 'case_map_completed' || eventType === 'case_map_offer_viewed') {
    const mapPath = readPath(input.map_path)
    const serviceKey = readService(input.service_key)
    if (!mapPath || !serviceKey) return null
    return { eventType, pagePath: '/mapa-sprawy', properties: { map_path: mapPath, service_key: serviceKey } }
  }

  if (eventType === 'case_map_service_clicked') {
    const mapPath = readPath(input.map_path)
    const serviceKey = readService(input.service_key)
    const ctaVariant = input.cta_variant === 'primary' || input.cta_variant === 'alternate'
      ? input.cta_variant
      : null
    if (!mapPath || !serviceKey || !ctaVariant) return null
    return {
      eventType,
      pagePath: '/mapa-sprawy',
      properties: { map_path: mapPath, service_key: serviceKey, cta_variant: ctaVariant },
    }
  }

  const serviceKey = readService(input.service_key)
  if (!serviceKey || input.entry_source !== 'case_map') return null
  return {
    eventType,
    pagePath: '/book',
    properties: { service_key: serviceKey, entry_source: 'case_map' },
  }
}

export function trackCaseMapPrivateAnalyticsEvent(
  eventType: CaseMapPrivateEventType,
  properties: CaseMapAnalyticsInput,
) {
  const normalized = normalizeCaseMapPrivateAnalyticsEvent(eventType, properties)
  if (!normalized) return

  // Measurement must never interrupt the owner-facing Map if a browser blocks
  // beacon/fetch APIs or a privacy extension alters globals.
  try {
    trackPrivateAnalyticsEvent(normalized.eventType, normalized.pagePath, normalized.properties)
  } catch {}
}
