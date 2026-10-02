import { NextResponse } from 'next/server'
import { hasAvailabilityAfter, listAvailabilityBetween, listUrgentNowRequests, listBookings } from '@/lib/server/db'
import { getZapytajLiveStatus } from '@/lib/server/zapytaj-live'
import { isAvailabilitySlotBookableForService } from '@/lib/scheduling/rules'
import { isFutureAvailabilitySlot } from '@/lib/data'
import {
  createZapytajLiveStatusDto,
  isZapytajLiveSlot,
  ZAPYTAJ_LIVE_HOLD_MINUTES,
  ZAPYTAJ_MANUAL_CONFIRMATION_HOURS,
} from '@/lib/zapytaj-flow'
import { getDataModeStatus } from '@/lib/server/env'
import { addWarsawDateDays, countActiveUrgentDayBookings, countZapytajNowPaymentLinkRequestsForDate, getWarsawDateAndDay, getZapytajNowPublicStatus, URGENT_NOW_DAILY_LIMIT } from '@/lib/urgent-now-policy'
import { resolveZapytajAvailabilityWindow, sliceZapytajAvailabilityWindow } from '@/lib/zapytaj-availability-window'
import { withAvailabilityReadDeadline } from '@/lib/server/availability-read-context'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const AVAILABILITY_READ_TIMEOUT_MS = 4_000
const sharedAvailabilityReads = new Map<string, Promise<unknown>>()

function sharePendingRead<T>(key: string, read: () => Promise<T>): Promise<T> {
  const existing = sharedAvailabilityReads.get(key) as Promise<T> | undefined
  if (existing) return existing

  const pending = withAvailabilityReadDeadline(read, AVAILABILITY_READ_TIMEOUT_MS)
  sharedAvailabilityReads.set(key, pending)
  void pending.then(
    () => { if (sharedAvailabilityReads.get(key) === pending) sharedAvailabilityReads.delete(key) },
    () => { if (sharedAvailabilityReads.get(key) === pending) sharedAvailabilityReads.delete(key) },
  )
  return pending
}

async function withTimeout<T>(promise: Promise<T>, label: string, timeoutMs = AVAILABILITY_READ_TIMEOUT_MS): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
          timeoutMs,
        )
      }),
    ])
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams
  const requestedFromValues = searchParams.getAll('from')
  const today = getWarsawDateAndDay().date
  const window = requestedFromValues.length > 1
    ? null
    : resolveZapytajAvailabilityWindow(requestedFromValues[0] ?? null, today)

  if (!window) {
    return NextResponse.json({ error: 'Nieprawidłowy zakres kalendarza.' }, { status: 400, headers: { 'Cache-Control': 'no-store, max-age=0' } })
  }

  const dataMode = getDataModeStatus()
  let live = createZapytajLiveStatusDto('unavailable', {
    liveSlotId: null,
    enabledUntil: null,
    storageAvailable: false,
  })
  let slots: Array<{ id: string; date: string; time: string; label: string }> = []
  let hasLaterSlots = false
  let liveError = !dataMode.isValid
  let slotsError = !dataMode.isValid
  let urgentNow: { status: 'available' | 'full' | 'weekend' | 'in_progress' | 'unavailable' | 'offline' | 'online_with_slot' | 'online_without_slot' | 'unknown'; acceptedCount: number; dailyLimit: number; date: string | null; liveSlotAvailable: boolean } = {
    status: 'unknown', acceptedCount: 0, dailyLimit: URGENT_NOW_DAILY_LIMIT, date: null, liveSlotAvailable: false,
  }

  if (dataMode.isValid) {
    const [liveResult, slotsResult, urgentResult, laterSlotsResult, urgentCalendarResult, bookingsResult] = await Promise.allSettled([
      withTimeout(sharePendingRead('live', getZapytajLiveStatus), 'Live availability read'),
      withTimeout(
        sharePendingRead(`scheduled:${window.from}:${window.to}`, () => listAvailabilityBetween(window.from, window.to)),
        'Scheduled availability read',
      ),
      withTimeout(sharePendingRead('urgent-requests', listUrgentNowRequests), 'Urgent request capacity read'),
      withTimeout(sharePendingRead(`later:${window.to}`, () => hasAvailabilityAfter(window.to)), 'Later scheduled availability read'),
      withTimeout(sharePendingRead(`urgent-calendar:${today}`, () => listAvailabilityBetween(today, addWarsawDateDays(today, 60))), 'Urgent target date read'),
      withTimeout(sharePendingRead('urgent-bookings', listBookings), 'Urgent bookings read'),
    ])

    if (liveResult.status === 'fulfilled') {
      live = liveResult.value
    } else {
      liveError = true
      console.warn('[regulski-behawiorysta][zapytaj] live status unavailable', liveResult.reason)
    }

    if (slotsResult.status === 'fulfilled') {
      slots = slotsResult.value.flatMap((group) =>
        group.slots
          .filter((slot) => {
            const selectedLiveSlot = live.status === 'available_now' && slot.id === live.liveSlotId && isZapytajLiveSlot(slot.id)
            return selectedLiveSlot
              ? !slot.isBooked && !slot.lockedByBookingId && isFutureAvailabilitySlot(slot.bookingDate, slot.bookingTime)
              : !isZapytajLiveSlot(slot.id) && isAvailabilitySlotBookableForService(slot, 'szybka-konsultacja-15-min')
          })
          .map((slot) => ({
            id: slot.id,
            date: slot.bookingDate,
            time: slot.bookingTime,
            label: `${group.label} · ${slot.bookingTime}`,
          })),
      )
    } else {
      slotsError = true
      console.warn('[regulski-behawiorysta][zapytaj] scheduled availability unavailable', slotsResult.reason)
    }

    if (slotsResult.status === 'fulfilled') {
      if (laterSlotsResult.status === 'fulfilled') {
        hasLaterSlots = laterSlotsResult.value
      } else {
        slotsError = true
        console.warn('[regulski-behawiorysta][zapytaj] later scheduled availability unavailable', laterSlotsResult.reason)
      }
    }

    if (urgentResult.status === 'fulfilled') {
      const now = new Date()
      const { date: today, isWeekend } = getWarsawDateAndDay(now)
      const availableGroups = urgentCalendarResult.status === 'fulfilled'
        ? urgentCalendarResult.value.filter((group) => group.slots.some((slot) => !isZapytajLiveSlot(slot.id) && isAvailabilitySlotBookableForService(slot, 'szybka-konsultacja-15-min', now)))
        : []
      const targetGroup = availableGroups[0]
      const targetDate = targetGroup?.date ?? null
      const liveSlotAvailable = live.status === 'available_now' && Boolean(live.liveSlotId && urgentCalendarResult.status === 'fulfilled' && urgentCalendarResult.value.some((group) => group.slots.some((slot) => slot.id === live.liveSlotId && isZapytajLiveSlot(slot.id) && !slot.isBooked && !slot.lockedByBookingId && isFutureAvailabilitySlot(slot.bookingDate, slot.bookingTime, now))))
      const requestCount = targetDate ? countZapytajNowPaymentLinkRequestsForDate(urgentResult.value, targetDate) : 0
      const activeBookingsCount = targetDate && bookingsResult.status === 'fulfilled' && urgentCalendarResult.status === 'fulfilled'
        ? countActiveUrgentDayBookings(bookingsResult.value, urgentCalendarResult.value.flatMap((group) => group.slots), targetDate, now)
        : 0
      const acceptedCount = requestCount + activeBookingsCount
      const status = isWeekend
        ? 'weekend'
        : live.status === 'available_now'
          ? getZapytajNowPublicStatus(live.status, acceptedCount, now, liveSlotAvailable)
          : targetDate && acceptedCount >= URGENT_NOW_DAILY_LIMIT
          ? 'full'
          : targetDate
            ? getZapytajNowPublicStatus(live.status, acceptedCount, now, liveSlotAvailable)
            : 'unavailable'
      urgentNow = {
        status,
        acceptedCount,
        dailyLimit: URGENT_NOW_DAILY_LIMIT,
        date: targetDate,
        liveSlotAvailable,
      }
    } else {
      urgentNow.status = 'unknown'
      console.warn('[regulski-behawiorysta][zapytaj] urgent request capacity unavailable', urgentResult.reason)
    }
    if (urgentCalendarResult.status === 'rejected' || bookingsResult.status === 'rejected') urgentNow.status = 'unknown'
    if (liveResult.status === 'rejected') urgentNow.status = 'unknown'
  }

  const groupedSlots = slots.reduce<Array<{ date: string; label: string; slots: typeof slots }>>((groups, slot) => {
    const group = groups.find((item) => item.date === slot.date)
    if (group) group.slots.push(slot)
    else groups.push({ date: slot.date, label: slot.label.split(' · ')[0] ?? slot.date, slots: [slot] })
    return groups
  }, [])
  const pagedAvailability = sliceZapytajAvailabilityWindow(groupedSlots, window, today)

  return NextResponse.json(
    {
      live,
      urgentNow,
      slots: pagedAvailability.slots,
      window: { ...window, hasEarlier: pagedAvailability.hasEarlier, hasLater: hasLaterSlots, hasAnySlots: pagedAvailability.hasAnySlots },
      liveError,
      slotsError,
      holdMinutes: ZAPYTAJ_LIVE_HOLD_MINUTES,
      manualConfirmationHours: ZAPYTAJ_MANUAL_CONFIRMATION_HOURS,
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    },
  )
}
