'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getZapytajHeaderStatusLabel } from '@/lib/urgent-now-policy'
import { readZapytajAvailability } from '@/lib/zapytaj-availability-client'

type HeaderAvailability = { status: 'available' | 'full' | 'weekend' | 'in_progress' | 'unavailable' | 'offline' | 'online_with_slot' | 'online_without_slot' | 'unknown' }

export function ZapytajHeaderStatus() {
  const [availability, setAvailability] = useState<HeaderAvailability | null>(null)

  useEffect(() => {
    let active = true
    const refresh = async () => {
      try {
        const payload = await readZapytajAvailability<{ live?: unknown; urgentNow?: HeaderAvailability }>('/api/zapytaj/availability', {
          signal: AbortSignal.timeout(6_000),
        })
        if (!payload.live || !payload.urgentNow) throw new Error('availability unavailable')
        if (active) setAvailability(payload.urgentNow)
      } catch {
        if (active) setAvailability({ status: 'unavailable' })
      }
    }
    void refresh()
    const interval = window.setInterval(refresh, 30_000)
    return () => { active = false; window.clearInterval(interval) }
  }, [])

  const status = availability?.status ?? 'unknown'
  const label = availability
    ? getZapytajHeaderStatusLabel(availability.status)
    : 'Zapytaj teraz: sprawdzam dostępność'

  return <Link className="notatnik-urgent-status" href="/zapytaj-teraz" aria-live="polite" data-state={status}>{label}</Link>
}
