'use client'

import { useEffect, useMemo, useState } from 'react'
import { HardNavLink } from '@/components/HardNavLink'
import { FUNNEL_CTA_LABELS } from '@/lib/funnel'
import { startVisiblePolling } from '@/components/visible-polling'

interface ConfirmationStatusWatcherProps {
  active: boolean
  bookingId: string
  accessToken?: string | null
  currentState: string
  intervalMs?: number
  roomAccessLabel?: string
}

export function ConfirmationStatusWatcher({
  active,
  bookingId,
  accessToken,
  currentState,
  intervalMs = 7000,
  roomAccessLabel = 'pokój rozmowy',
}: ConfirmationStatusWatcherProps) {
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(Math.ceil(intervalMs / 1000))
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pollFailureCount, setPollFailureCount] = useState(0)
  const [pollWarning, setPollWarning] = useState<string | null>(null)
  const statusUrl = useMemo(() => {
    const searchParams = new URLSearchParams()

    if (accessToken) {
      searchParams.set('access', accessToken)
    }

    const query = searchParams.toString()
    return `/api/bookings/${bookingId}/status${query ? `?${query}` : ''}`
  }, [accessToken, bookingId])

  useEffect(() => {
    if (!active) {
      return
    }

    let cancelled = false
    let lastKnownState = currentState

    setSecondsUntilRefresh(Math.ceil(intervalMs / 1000))
    const refresh = () =>
      fetch(statusUrl, { cache: 'no-store' })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(`Status request failed with ${response.status}.`)
          }

          return (await response.json()) as {
            bookingStatus: string
            paymentStatus: string
          }
        })
        .then((payload) => {
          if (cancelled) {
            return
          }

          setPollFailureCount(0)
          setPollWarning(null)

          const nextState = `${payload.bookingStatus}:${payload.paymentStatus}`

          if (nextState !== lastKnownState) {
            lastKnownState = nextState
            setIsRefreshing(true)
            window.location.reload()
          }
        })
        .catch((error) => {
          if (cancelled) {
            return
          }

          console.warn('[regulski-behawiorysta][confirmation-status] polling failed', error)
          setPollFailureCount((current) => {
            const next = current + 1

            if (next >= 2) {
              setPollWarning(
                'Automatyczne sprawdzanie statusu ma chwilowy problem. Możesz odświeżyć stronę ręcznie albo wrócić tu za chwilę. Rezerwacja nadal jest zapisana.',
              )
            }

            return next
          })
        })
    const stopPolling = startVisiblePolling(refresh, intervalMs, { immediate: false })

    const countdownTimer = window.setInterval(() => {
      setSecondsUntilRefresh((current) => (current <= 1 ? Math.ceil(intervalMs / 1000) : current - 1))
    }, 1000)

    return () => {
      cancelled = true
      stopPolling()
      window.clearInterval(countdownTimer)
    }
  }, [active, currentState, intervalMs, statusUrl])

  if (!active) {
    return null
  }

  return (
    <div className="top-gap stack-gap">
      <div className="list-card accent-outline tree-backed-card">
        <strong>Sprawdzamy status automatycznie</strong>
        <span>{`Ta strona odświeża się sama co kilka sekund. Po potwierdzeniu wpłaty od razu pokaże potwierdzenie, ${roomAccessLabel} i dalszą instrukcję.`}</span>
        <span>{isRefreshing ? 'Aktualizuję status...' : `Kolejne sprawdzenie za ok. ${secondsUntilRefresh} s.`}</span>
      </div>

      {pollWarning ? (
        <div className="error-box tree-backed-card">
          <strong>Nie przegapisz zmiany statusu</strong>
          <span>
            {pollWarning} Zanotowano {pollFailureCount} nieudane sprawdzenia z rzędu.
          </span>
          <div className="hero-actions top-gap">
            <button type="button" className="button button-ghost" onClick={() => window.location.reload()}>
              Odśwież teraz
            </button>
            <HardNavLink href="/kontakt#formularz" className="button button-primary">
              {FUNNEL_CTA_LABELS.contact}
            </HardNavLink>
          </div>
        </div>
      ) : null}
    </div>
  )
}
