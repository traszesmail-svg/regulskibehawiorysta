export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { buildPaymentHref } from '@/lib/booking-routing'
import { createAvailabilitySlot, createPendingBooking, getAvailabilitySlot, listUrgentNowRequests, respondUrgentNowRequest } from '@/lib/server/db'
import { getBaseUrl } from '@/lib/server/env'
import { sendUrgentNowResponseEmail } from '@/lib/server/notifications'
import { stripUrgentRequestedSlotsFromMessage } from '@/lib/urgent-now'

function normalizeSingleLine(value: unknown, maxLength: number) {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized.length > 0 ? normalized.slice(0, maxLength) : null
}

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const body = (await request.json()) as {
      proposedDate?: string
      proposedTime?: string
      responseNote?: string
    }

    const proposedDate = normalizeSingleLine(body.proposedDate, 32)
    const proposedTime = normalizeSingleLine(body.proposedTime, 16)
    const responseNote = normalizeSingleLine(body.responseNote, 500)

    if (!proposedDate || !proposedTime) {
      return NextResponse.json({ error: 'Podaj datę i godzinę odpowiedzi.' }, { status: 400 })
    }

    const requests = await listUrgentNowRequests()
    const urgentRequest = requests.find((item) => item.id === params.id)

    if (!urgentRequest) {
      return NextResponse.json({ error: 'Nie znaleziono prośby o Zapytaj teraz.' }, { status: 404 })
    }

    const slotId = `${proposedDate}-${proposedTime}`
    const existingSlot = await getAvailabilitySlot(slotId)
    const slot = existingSlot ?? (await createAvailabilitySlot(proposedDate, proposedTime))

    if (slot.isBooked || slot.lockedByBookingId) {
      return NextResponse.json({ error: 'Ten termin jest już zajęty. Wybierz inną godzinę.' }, { status: 409 })
    }

    const bookingResult = await createPendingBooking({
      ownerName: urgentRequest.name,
      serviceType: 'kwadrans-na-juz',
      problemType: urgentRequest.topicId,
      animalType: urgentRequest.species === 'kot' ? 'Kot' : 'Pies',
      petAge: 'Nie podano w prośbie o Zapytaj teraz.',
      durationNotes: 'Pilny termin wybrany przez opiekuna i potwierdzony przez admina.',
      description: stripUrgentRequestedSlotsFromMessage(urgentRequest.message),
      phone: urgentRequest.phone ?? null,
      email: urgentRequest.email,
      slotId: slot.id,
    })
    const bookingHref = buildPaymentHref(bookingResult.booking.id, bookingResult.accessToken, 'kwadrans-na-juz')
    const absoluteBookingHref = new URL(bookingHref, getBaseUrl()).toString()

    const updatedRequest = await respondUrgentNowRequest({
      id: urgentRequest.id,
      proposedDate,
      proposedTime,
      responseNote,
      availabilitySlotId: slot.id,
      bookingHref: absoluteBookingHref,
    })

    if (!updatedRequest) {
      return NextResponse.json({ error: 'Nie udało się zapisać odpowiedzi.' }, { status: 500 })
    }

    const emailResult = await sendUrgentNowResponseEmail({
      customerName: urgentRequest.name,
      customerEmail: urgentRequest.email,
      topic: urgentRequest.topicLabel,
      proposedDate,
      proposedTime,
      bookingHref: absoluteBookingHref,
      responseNote,
    })

    if (emailResult.status !== 'sent') {
      return NextResponse.json(
        { error: emailResult.reason ?? 'Nie udało się wysłać odpowiedzi do klienta.' },
        { status: 500 },
      )
    }

    return NextResponse.json({
      ok: true,
      request: updatedRequest,
      slot,
      bookingHref: absoluteBookingHref,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nie udało się odpowiedzieć na prośbę.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
