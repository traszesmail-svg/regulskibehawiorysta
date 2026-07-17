import { NextResponse } from 'next/server'
import { recordFunnelEvent } from '@/lib/server/db'
import { isProductionDeployment } from '@/lib/server/env'
import {
  isInternalAnalyticsPagePath,
  normalizeFunnelEventProperties,
  normalizeFunnelEventType,
} from '@/lib/server/funnel-events'
import { normalizeCaseMapPrivateAnalyticsEvent } from '@/lib/case-map-analytics'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
    }
  }

  if (error && typeof error === 'object') {
    return Object.fromEntries(
      Object.entries(error).map(([key, value]) => [key, typeof value === 'string' ? value : JSON.stringify(value)]),
    )
  }

  return { message: String(error) }
}

function readErrorField(error: unknown, field: string): string | null {
  if (!error || typeof error !== 'object') {
    return null
  }

  const value = (error as Record<string, unknown>)[field]
  return typeof value === 'string' ? value : null
}

function isMissingFunnelEventsTable(error: unknown) {
  const code = readErrorField(error, 'code')
  const message = readErrorField(error, 'message')

  return code === 'PGRST205' || Boolean(message?.includes("table 'public.funnel_events'"))
}

export async function POST(request: Request) {
  const route = '/api/analytics/events'
  const start = Date.now()

  console.log(
    JSON.stringify({
      level: 'info',
      msg: 'start',
      route,
      requestId: request.headers.get('x-vercel-id'),
    }),
  )

  try {
    const body = (await request.json()) as Record<string, unknown>

    if (body.consent !== 'granted') {
      console.log(
        JSON.stringify({
          level: 'info',
          msg: 'done',
          route,
          ms: Date.now() - start,
          ignored: true,
          reason: 'consent',
        }),
      )
      return new NextResponse(null, { status: 204 })
    }

    const eventType = normalizeFunnelEventType(typeof body.eventType === 'string' ? body.eventType : null)

    if (!eventType) {
      console.log(
        JSON.stringify({
          level: 'info',
          msg: 'done',
          route,
          ms: Date.now() - start,
          ignored: true,
          reason: 'event_type',
        }),
      )
      return new NextResponse(null, { status: 204 })
    }

    const rawProperties = typeof body.properties === 'object' && body.properties && !Array.isArray(body.properties)
      ? (body.properties as Record<string, unknown>)
      : null
    const privateCaseMapEvent = normalizeCaseMapPrivateAnalyticsEvent(eventType, rawProperties)

    if (eventType.startsWith('case_map_') && !privateCaseMapEvent) {
      console.log(
        JSON.stringify({
          level: 'info',
          msg: 'done',
          route,
          ms: Date.now() - start,
          ignored: true,
          reason: 'case_map_payload',
        }),
      )
      return new NextResponse(null, { status: 204 })
    }

    const pagePath = privateCaseMapEvent?.pagePath ?? (typeof body.pagePath === 'string' ? body.pagePath : null)

    if (isInternalAnalyticsPagePath(pagePath)) {
      console.log(
        JSON.stringify({
          level: 'info',
          msg: 'done',
          route,
          ms: Date.now() - start,
          ignored: true,
          reason: 'internal_page',
          pagePath,
        }),
      )
      return new NextResponse(null, { status: 204 })
    }

    const properties = privateCaseMapEvent?.properties ?? normalizeFunnelEventProperties(rawProperties)

    const bookingId = privateCaseMapEvent
      ? null
      :
      typeof body.bookingId === 'string'
        ? body.bookingId
        : typeof body.booking_id === 'string'
          ? body.booking_id
          : typeof properties.booking_id === 'string'
            ? properties.booking_id
            : typeof properties.bookingId === 'string'
              ? properties.bookingId
              : null

    const qaBooking = privateCaseMapEvent ? false : Boolean(body.qaBooking ?? properties.qaBooking ?? properties.qa_booking)
    const location = privateCaseMapEvent
      ? null
      : typeof body.location === 'string'
        ? body.location
        : typeof properties.location === 'string'
          ? properties.location
          : null

    await recordFunnelEvent({
      eventType,
      bookingId,
      qaBooking,
      source: 'client',
      pagePath,
      location,
      properties,
    })

    console.log(
      JSON.stringify({
        level: 'info',
        msg: 'done',
        route,
        ms: Date.now() - start,
        eventType,
        qaBooking,
      }),
    )

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    if (isMissingFunnelEventsTable(error)) {
      console.warn(
        JSON.stringify({
          level: 'warn',
          msg: 'ignored',
          route,
          ms: Date.now() - start,
          reason: 'analytics_table_missing',
        }),
      )

      return NextResponse.json({ ok: false, ignored: true, reason: 'analytics_table_missing' }, { status: 202 })
    }

    console.error(
      JSON.stringify({
        level: 'error',
        msg: 'failed',
        route,
        ms: Date.now() - start,
        error: serializeError(error),
      }),
    )

    if (!isProductionDeployment()) {
      return NextResponse.json({ ok: false, ignored: true, reason: 'analytics_unavailable_local' }, { status: 202 })
    }

    return NextResponse.json({ error: 'Nie udało się zapisać zdarzenia.' }, { status: 500 })
  }
}
