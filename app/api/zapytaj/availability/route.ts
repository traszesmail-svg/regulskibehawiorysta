import { NextResponse } from 'next/server'
import { listAvailability } from '@/lib/server/db'
import { getZapytajLiveStatus } from '@/lib/server/zapytaj-live'
import { isAvailabilitySlotBookableForService } from '@/lib/scheduling/rules'
import {
  createZapytajLiveStatusDto,
  isZapytajLiveSlot,
  ZAPYTAJ_LIVE_HOLD_MINUTES,
  ZAPYTAJ_MANUAL_CONFIRMATION_HOURS,
} from '@/lib/zapytaj-flow'
import { getDataModeStatus } from '@/lib/server/env'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const AVAILABILITY_READ_TIMEOUT_MS = 4_000

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

export async function GET() {
  const dataMode = getDataModeStatus()
  let live = createZapytajLiveStatusDto('unavailable', {
    liveSlotId: null,
    enabledUntil: null,
    storageAvailable: false,
  })
  let slots: Array<{ id: string; date: string; time: string; label: string }> = []
  let liveError = !dataMode.isValid
  let slotsError = !dataMode.isValid

  if (dataMode.isValid) {
    const [liveResult, slotsResult] = await Promise.allSettled([
      withTimeout(getZapytajLiveStatus(), 'Live availability read'),
      withTimeout(listAvailability(), 'Scheduled availability read'),
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
          .filter(
            (slot) =>
              !isZapytajLiveSlot(slot.id) &&
              isAvailabilitySlotBookableForService(slot, 'szybka-konsultacja-15-min'),
          )
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
  }

  return NextResponse.json(
    {
      live,
      slots: slots.slice(0, 24),
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
