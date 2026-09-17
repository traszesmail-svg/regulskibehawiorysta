export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { getPhoneAgentDeviceState, listSmsQueue } from '@/lib/server/phone-agent-store'
import { getZapytajLiveStatus } from '@/lib/server/zapytaj-live'
import { listBookings } from '@/lib/server/db'
import { compareDateAndTime, getWarsawNowBoundary } from '@/lib/data'
import type { BookingRecord } from '@/lib/types'

function isPastBooking(booking: BookingRecord, now = new Date()) {
  const boundary = getWarsawNowBoundary(now)
  return compareDateAndTime(booking.bookingDate, booking.bookingTime, boundary.date, boundary.time) < 0
}

function sortByBookingTimeAsc(left: BookingRecord, right: BookingRecord) {
  const bySlot = compareDateAndTime(left.bookingDate, left.bookingTime, right.bookingDate, right.bookingTime)
  return bySlot === 0 ? right.createdAt.localeCompare(left.createdAt) : bySlot
}

export async function GET() {
  try {
    const [deviceState, liveStatus, smsQueue, bookings] = await Promise.all([
      getPhoneAgentDeviceState(),
      getZapytajLiveStatus(),
      listSmsQueue(50),
      listBookings().catch(() => [] as BookingRecord[]),
    ])

    const now = new Date()
    const upcomingPaid = bookings
      .filter((b) => !b.qaBooking && b.paymentStatus === 'paid' && b.bookingStatus !== 'done' && b.bookingStatus !== 'cancelled' && !isPastBooking(b, now))
      .sort(sortByBookingTimeAsc)

    const nextUpcomingBooking = upcomingPaid[0]
      ? {
          id: upcomingPaid[0].id,
          ownerName: upcomingPaid[0].ownerName,
          phone: upcomingPaid[0].customerPhoneNormalized ?? upcomingPaid[0].phone,
          animalType: upcomingPaid[0].animalType,
          bookingDate: upcomingPaid[0].bookingDate,
          bookingTime: upcomingPaid[0].bookingTime,
          serviceType: upcomingPaid[0].serviceType,
          callStatus: upcomingPaid[0].callStatus,
        }
      : null

    const pendingManualPaymentsCount = bookings.filter(
      (b) => !b.qaBooking && b.paymentStatus === 'pending_manual_review',
    ).length

    const pendingCount = smsQueue.filter((item) => item.status === 'pending' || item.status === 'claimed').length
    const sentCount = smsQueue.filter((item) => item.status === 'sent').length
    const failedCount = smsQueue.filter((item) => item.status === 'failed').length
    const recentErrors = smsQueue
      .filter((item) => item.status === 'failed' && Boolean(item.error))
      .slice(0, 5)
      .map((item) => ({
        id: item.id,
        phone: item.phone,
        type: item.type,
        error: item.error,
        createdAt: item.createdAt,
      }))

    return NextResponse.json(
      {
        device: deviceState,
        live: liveStatus,
        smsSummary: {
          pendingCount,
          sentCount,
          failedCount,
          recentErrors,
        },
        nextUpcomingBooking,
        pendingManualPaymentsCount,
        updatedAt: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Nie udało się pobrać statusu operatora.' },
      { status: 500 },
    )
  }
}
