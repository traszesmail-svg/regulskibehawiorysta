export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { buildPaymentHref } from '@/lib/booking-routing'
import { createAvailabilitySlot, createPendingBooking, getAvailabilitySlot, listUrgentNowRequests, respondUrgentNowRequest } from '@/lib/server/db'
import { getBaseUrl } from '@/lib/server/env'
import { sendUrgentNowAvailabilityNoticeEmail, sendUrgentNowResponseEmail } from '@/lib/server/notifications'
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
      manualResponse?: boolean
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
    if (!urgentRequest.species) {
      if (body.manualResponse !== true) {
        return NextResponse.json({ error: 'To zgłoszenie wymaga ręcznej obsługi.' }, { status: 409 })
      }
      if (urgentRequest.status === 'responded') return NextResponse.json({ error: 'Ta prośba została już oznaczona jako obsłużona.' }, { status: 409 })
      const updatedRequest = await respondUrgentNowRequest({
        id: urgentRequest.id,
        proposedDate,
        proposedTime,
        responseNote: responseNote ?? 'Operator wysłał klientowi SMS z propozycją terminu.',
      })
      if (!updatedRequest) return NextResponse.json({ error: 'Nie udało się zapisać odpowiedzi.' }, { status: 500 })
      return NextResponse.json({ ok: true, request: updatedRequest })
    }
    if (urgentRequest.status === 'responded') {
      if (urgentRequest.contactPreference !== 'notify_only' && urgentRequest.bookingHref) {
        const emailResult = await sendUrgentNowResponseEmail({
          customerName: urgentRequest.name,
          customerEmail: urgentRequest.email,
          topic: urgentRequest.topicLabel,
          proposedDate: urgentRequest.proposedDate ?? proposedDate,
          proposedTime: urgentRequest.proposedTime ?? proposedTime,
          bookingHref: urgentRequest.bookingHref,
          responseNote: urgentRequest.responseNote,
        })
        if (emailResult.status !== 'sent') {
          return NextResponse.json({ error: emailResult.reason ?? 'Nie udało się ponownie wysłać linku.' }, { status: 500 })
        }
        return NextResponse.json({ ok: true, request: urgentRequest, bookingHref: urgentRequest.bookingHref })
      }
      return NextResponse.json({ error: 'Ta prośba została już obsłużona.' }, { status: 409 })
    }

    if (urgentRequest.contactPreference === 'notify_only') {
      const slot = await getAvailabilitySlot(`${proposedDate}-${proposedTime}`)
      if (!slot || slot.isBooked || slot.lockedByBookingId) {
        return NextResponse.json({ error: 'Wybierz wolną godzinę z kalendarza. Nie wysłano powiadomienia.' }, { status: 409 })
      }
      const emailResult = await sendUrgentNowAvailabilityNoticeEmail({
        customerName: urgentRequest.name,
        customerEmail: urgentRequest.email,
        topic: urgentRequest.topicLabel,
        proposedDate,
        proposedTime,
        responseNote,
      })
      if (emailResult.status !== 'sent') {
        return NextResponse.json({ error: emailResult.reason ?? 'Nie udało się wysłać powiadomienia.' }, { status: 500 })
      }
      const updatedRequest = await respondUrgentNowRequest({
        id: urgentRequest.id,
        proposedDate,
        proposedTime,
        responseNote,
        availabilitySlotId: null,
        bookingHref: null,
      })
      if (!updatedRequest) return NextResponse.json({ error: 'Nie udało się zapisać odpowiedzi.' }, { status: 500 })
      return NextResponse.json({ ok: true, request: updatedRequest, bookingHref: null })
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
