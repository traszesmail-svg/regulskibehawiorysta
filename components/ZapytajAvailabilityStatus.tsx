'use client'

import { useEffect, useState } from 'react'

type LiveStatus = {
  status: 'unavailable' | 'offline' | 'available_now' | 'payment_pending' | 'in_call' | 'buffer'
  label: string
  message: string
  livePricePln: number
}

export function ZapytajAvailabilityStatus() {
  const [live, setLive] = useState<LiveStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const response = await fetch('/api/zapytaj/availability', { cache: 'no-store' })
        const payload = (await response.json()) as { live?: LiveStatus }
        if (mounted && payload.live) setLive(payload.live)
      } catch {
        if (mounted) {
          setLive({
            status: 'unavailable',
            label: 'Dostępność chwilowo niedostępna',
            message: 'Odśwież stronę lub wybierz zwykły termin rozmowy.',
            livePricePln: 104,
          })
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void load()
    const interval = window.setInterval(load, 20_000)
    return () => {
      mounted = false
      window.clearInterval(interval)
    }
  }, [])

  const isLiveChoice = live?.status === 'available_now' || live?.status === 'in_call'

  return (
    <div className="zapytaj-hero-live-status" data-zapytaj-live-status={live?.status ?? 'loading'} aria-live="polite">
      <span className="zapytaj-hero-live-status-dot" aria-hidden="true" />
      <span>
        <strong>{loading ? 'Sprawdzam dostępność…' : isLiveChoice ? `Zapytaj teraz · ${live!.livePricePln} zł` : 'Zapytaj w wybranym terminie · 79 zł'}</strong>
        <small>{loading ? 'Za chwilę pokażę aktualną opcję.' : isLiveChoice ? live!.message : 'Opcja teraz pojawia się tylko wtedy, gdy behawiorysta faktycznie jest dostępny.'}</small>
      </span>
      {isLiveChoice ? <a href="#formularz">Wybierz opcję teraz</a> : null}
    </div>
  )
}
