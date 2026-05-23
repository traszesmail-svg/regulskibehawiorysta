import { NextRequest, NextResponse } from 'next/server'
import { buildFormHref, isBookingSpecies } from '@/lib/booking-routing'
import { getProblemSpecies, isProblemType } from '@/lib/data'
import { createAvailabilitySlot, getAvailabilitySlot } from '@/lib/server/db'
import { isTodayUrgentSlotCandidate } from '@/lib/urgent-now'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function readQaFlag(value: string | null) {
  return ['1', 'true', 'qa', 'yes'].includes(value?.trim().toLowerCase() ?? '')
}

function redirectToKwadrans(request: NextRequest, params: Record<string, string | null | undefined>) {
  const url = new URL('/kwadrans-na-juz', request.url)

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value)
    }
  }

  return NextResponse.redirect(url)
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const problem = url.searchParams.get('problem')
  const speciesParam = url.searchParams.get('species')
  const date = url.searchParams.get('date')
  const time = url.searchParams.get('time')
  const qaBooking = readQaFlag(url.searchParams.get('qa'))

  if (!isProblemType(problem)) {
    return redirectToKwadrans(request, { species: speciesParam, error: 'topic' })
  }

  const species = isBookingSpecies(speciesParam) ? speciesParam : getProblemSpecies(problem)

  if (species !== getProblemSpecies(problem)) {
    return redirectToKwadrans(request, { species, error: 'topic' })
  }

  if (!date || !time || !isTodayUrgentSlotCandidate(date, time)) {
    return redirectToKwadrans(request, { species, problem, error: 'expired' })
  }

  const slotId = `${date}-${time}`
  let slot = await getAvailabilitySlot(slotId)

  if (!slot) {
    try {
      slot = await createAvailabilitySlot(date, time)
    } catch {
      slot = await getAvailabilitySlot(slotId)
    }
  }

  if (!slot || slot.isBooked || slot.lockedByBookingId) {
    return redirectToKwadrans(request, { species, problem, error: 'unavailable' })
  }

  const target = new URL(
    buildFormHref(problem, slot.id, 'kwadrans-na-juz', qaBooking, species),
    request.url,
  )

  return NextResponse.redirect(target)
}
