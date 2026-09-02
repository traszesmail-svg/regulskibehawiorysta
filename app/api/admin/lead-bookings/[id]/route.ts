export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getAdminAccessSecret, hasValidAdminAuthorization } from '@/lib/admin-auth'
import {
  getLeadBookingById,
  updateLeadBooking,
  type LeadBookingStatus,
} from '@/lib/server/lead-bookings'
import { buildGoogleCalendarUrlForEvent, parseWarsawDateTime } from '@/lib/server/google-calendar'

async function checkAuth() {
  const secret = getAdminAccessSecret()
  if (!secret) {
    return { ok: false as const, response: NextResponse.json({ error: 'Admin secret not configured.' }, { status: 503 }) }
  }
  const authHeader = (await headers()).get('authorization')
  if (!hasValidAdminAuthorization(authHeader, secret)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Unauthorized' }, {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="admin"' },
      }),
    }
  }
  return { ok: true as const }
}

export async function GET(_: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await checkAuth()
  if (!auth.ok) return auth.response

  const booking = await getLeadBookingById(params.id)
  if (!booking) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ booking })
}

const VALID_STATUSES: LeadBookingStatus[] = ['pending', 'awaiting_payment', 'paid', 'cancelled']
const SERVICE_DURATION_MINUTES: Record<string, number> = {
  'kwadrans-na-juz': 15,
  'szybka-konsultacja-15-min': 15,
  'konsultacja-30-min': 30,
  'konsultacja-behawioralna-online': 90,
}

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await checkAuth()
  if (!auth.ok) return auth.response

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const existing = await getLeadBookingById(params.id)
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const update: Parameters<typeof updateLeadBooking>[0] = { id: params.id }

  if (typeof body.status === 'string') {
    if (!VALID_STATUSES.includes(body.status as LeadBookingStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    update.status = body.status as LeadBookingStatus
  }

  if (typeof body.confirmedDate === 'string') update.confirmedDate = body.confirmedDate
  if (typeof body.confirmedTime === 'string') update.confirmedTime = body.confirmedTime
  if (typeof body.paymentLink === 'string') update.paymentLink = body.paymentLink
  if (typeof body.paymentMethod === 'string') update.paymentMethod = body.paymentMethod
  if (typeof body.callRoomUrl === 'string') update.callRoomUrl = body.callRoomUrl
  if (typeof body.adminNotes === 'string') update.adminNotes = body.adminNotes

  // When marked as paid: set paidAt, generate calendar URL and call room
  if (update.status === 'paid' || (existing.status !== 'paid' && body.markPaid === true)) {
    update.status = 'paid'
    update.paidAt = new Date().toISOString()

    const date = update.confirmedDate ?? existing.confirmedDate
    const time = update.confirmedTime ?? existing.confirmedTime

    if (date && time) {
      const durationMin = SERVICE_DURATION_MINUTES[existing.service] ?? 30
      const startDate = parseWarsawDateTime(date, time)
      const endDate = new Date(startDate.getTime() + durationMin * 60 * 1000)

      const calendarUrl = buildGoogleCalendarUrlForEvent({
        title: `Konsultacja: ${existing.serviceLabel}`,
        details: `Konsultacja behawioralna z ${existing.name}.\n\nGatunek: ${existing.species === 'kot' ? 'Kot' : 'Pies'}\n\nOpis sytuacji:\n${existing.description}`,
        location: update.callRoomUrl ?? existing.callRoomUrl ?? 'Online (Jitsi)',
        startsAt: startDate,
        endsAt: endDate,
      })
      update.calendarUrl = calendarUrl

      // Auto-generate Jitsi room URL if not provided
      if (!update.callRoomUrl && !existing.callRoomUrl) {
        update.callRoomUrl = `https://meet.jit.si/regulski-${existing.id.substring(0, 8)}`
      }
    }
  }

  const updated = await updateLeadBooking(update)
  return NextResponse.json({ booking: updated })
}
