export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { getLeadBookingById, updateLeadBooking } from '@/lib/server/lead-bookings'
import { verifyConfirmToken } from '@/lib/admin-confirm-token'
import { sendLeadBookingConfirmedEmail } from '@/lib/server/notifications'
import { createRoomPasswordSetupLink } from '@/lib/server/account-auth'

const SERVICE_DURATION_MINUTES: Record<string, number> = {
  'kwadrans-na-juz': 15,
  'szybka-konsultacja-15-min': 15,
  'konsultacja-30-min': 30,
  'konsultacja-behawioralna-online': 120,
}

function toGoogleCalendarDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function buildCalendarUrl(input: { title: string; details: string; location: string; startsAt: Date; endsAt: Date }): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: input.title,
    dates: `${toGoogleCalendarDate(input.startsAt)}/${toGoogleCalendarDate(input.endsAt)}`,
    details: input.details,
    location: input.location,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  let body: { token?: string; date?: string; time?: string }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { token, date, time } = body

  if (!token || !date || !time) {
    return NextResponse.json({ error: 'Brakuje pól: token, date, time.' }, { status: 400 })
  }

  if (!verifyConfirmToken(params.id, token)) {
    return NextResponse.json({ error: 'Nieprawidłowy token.' }, { status: 403 })
  }

  const booking = await getLeadBookingById(params.id)
  if (!booking) {
    return NextResponse.json({ error: 'Rezerwacja nie istnieje.' }, { status: 404 })
  }

  if (booking.status === 'paid') {
    return NextResponse.json({ ok: true, message: 'Już opłacona.' })
  }

  if (booking.status === 'cancelled') {
    return NextResponse.json({ error: 'Rezerwacja jest anulowana.' }, { status: 409 })
  }

  const durationMin = SERVICE_DURATION_MINUTES[booking.service] ?? 30
  const startIso = `${date}T${time}:00+02:00`
  const startDate = new Date(startIso)
  const endDate = new Date(startDate.getTime() + durationMin * 60 * 1000)
  const isFullConsultation = booking.service === 'konsultacja-behawioralna-online'
  const callRoomUrl = isFullConsultation ? booking.callRoomUrl ?? `https://meet.jit.si/regulski-${booking.id.substring(0, 8)}` : null
  const calendarUrl = buildCalendarUrl({
    title: `Konsultacja: ${booking.serviceLabel}`,
    details: `Konsultacja behawioralna z ${booking.name}.\n\nGatunek: ${booking.species === 'kot' ? 'Kot' : 'Pies'}\n\nOpis:\n${booking.description}`,
    location: callRoomUrl ?? 'Rozmowa telefoniczna',
    startsAt: startDate,
    endsAt: endDate,
  })

  await updateLeadBooking({
    id: params.id,
    status: 'paid',
    confirmedDate: date,
    confirmedTime: time,
    paidAt: new Date().toISOString(),
    callRoomUrl,
    calendarUrl,
  })

  let roomSetupUrl: string | null = null
  try {
    roomSetupUrl = await createRoomPasswordSetupLink(booking.email, `${new URL(request.url).origin}/login`)
  } catch (error) {
    console.error('[confirm-payment] room setup link failed', { id: params.id, error })
  }

  // Wyślij email do klienta
  const emailResult = await sendLeadBookingConfirmedEmail({
    name: booking.name,
    email: booking.email,
    serviceLabel: booking.serviceLabel,
    confirmedDate: date,
    confirmedTime: time,
    callRoomUrl,
    calendarUrl,
    roomSetupUrl,
  })

  console.info('[confirm-payment] booking confirmed', { id: params.id, emailStatus: emailResult.status })

  return NextResponse.json({ ok: true })
}
