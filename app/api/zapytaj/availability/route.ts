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

export async function GET() {
  const dataMode = getDataModeStatus()
  let live = createZapytajLiveStatusDto('unavailable', {
    liveSlotId: null,
    enabledUntil: null,
    storageAvailable: false,
  })
  let slots: Array<{ id: string; date: string; time: string; label: string }> = []

  if (dataMode.isValid) {
    try {
      live = await getZapytajLiveStatus()
    } catch (error) {
      console.warn('[regulski-behawiorysta][zapytaj] live status unavailable', error)
    }

    try {
      const grouped = await listAvailability()
      slots = grouped.flatMap((group) =>
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
    } catch (error) {
      console.warn('[regulski-behawiorysta][zapytaj] scheduled availability unavailable', error)
    }
  }

  return NextResponse.json(
    {
      live,
      slots: slots.slice(0, 24),
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
