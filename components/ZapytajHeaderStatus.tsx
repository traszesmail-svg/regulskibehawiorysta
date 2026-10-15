'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getZapytajHeaderStatusLabel } from '@/lib/urgent-now-policy'
import { subscribeZapytajAvailability } from '@/lib/zapytaj-availability-polling'

type HeaderAvailability = { status: 'available' | 'full' | 'weekend' | 'in_progress' | 'unavailable' | 'offline' | 'online_with_slot' | 'online_without_slot' | 'unknown' }

export function ZapytajHeaderStatus() {
  const [availability, setAvailability] = useState<HeaderAvailability | null>(null)

  useEffect(() => {
    return subscribeZapytajAvailability<{ live?: unknown; urgentNow?: HeaderAvailability }>({
      onData: (payload) => {
        if (!payload.live || !payload.urgentNow) throw new Error('availability unavailable')
        setAvailability(payload.urgentNow)
      },
      onError: () => setAvailability({ status: 'unavailable' }),
    })
  }, [])

  const status = availability?.status ?? 'unknown'
  const label = availability
    ? getZapytajHeaderStatusLabel(availability.status)
    : 'Zapytaj teraz: sprawdzam dostępność'

  return <Link className="notatnik-urgent-status" href="/zapytaj-teraz" aria-live="polite" data-state={status}>{label}</Link>
}
