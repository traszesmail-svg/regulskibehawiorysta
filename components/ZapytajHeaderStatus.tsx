'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getZapytajHeaderStatusLabel } from '@/lib/urgent-now-policy'

type HeaderAvailability = { status: 'available' | 'full' | 'weekend' | 'in_progress' | 'unavailable' | 'offline' | 'online_with_slot' | 'online_without_slot' | 'unknown' }

export function ZapytajHeaderStatus() {
  const [availability, setAvailability] = useState<HeaderAvailability | null>(null)

  useEffect(() => {
    let active = true
    const refresh = async () => {
      try {
        const response = await fetch('/api/zapytaj/availability', { cache: 'no-store' })
        if (!response.ok) throw new Error('availability unavailable')
        const payload = await response.json()
        if (!response.ok || !payload.live || !payload.urgentNow) throw new Error('availability unavailable')
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
