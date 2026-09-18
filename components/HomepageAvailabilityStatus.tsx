'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { CheckCircle2, RefreshCw } from 'lucide-react'

type LiveStatus = {
  status: 'unavailable' | 'offline' | 'available_now' | 'payment_pending' | 'in_call' | 'buffer'
  label: string
  message: string
  livePricePln: number
  liveSlotId: string | null
}

type ScheduleSlot = { id: string; date: string; time: string; label: string }

type AvailabilityPayload = {
  live: LiveStatus
  slots: ScheduleSlot[]
}

type NotificationStatus = 'idle' | 'loading' | 'success' | 'error'

export function HomepageAvailabilityStatus() {
  const [availability, setAvailability] = useState<AvailabilityPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  // Notification state
  const [showNotifyForm, setShowNotifyForm] = useState(false)
  const [notifyContact, setNotifyContact] = useState('')
  const [notifyConsent, setNotifyConsent] = useState(false)
  const [notifyStatus, setNotifyStatus] = useState<NotificationStatus>('idle')
  const [notifyFeedback, setNotifyFeedback] = useState('')

  // Preview override for deterministic testing and required screenshots
  const [previewMode, setPreviewMode] = useState<'live' | 'empty' | 'error' | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const preview = params.get('preview_availability')
      if (preview === 'live' || preview === 'empty' || preview === 'error') {
        setPreviewMode(preview)
      }
    }

    let mounted = true
    async function fetchAvailability() {
      try {
        const response = await fetch('/api/zapytaj/availability', { cache: 'no-store' })
        if (!response.ok) throw new Error('Błąd pobierania dostępności')
        const data = (await response.json()) as AvailabilityPayload
        if (mounted) {
          setAvailability(data)
          setHasError(false)
          setLoading(false)
        }
      } catch {
        if (mounted) {
          setHasError(true)
          setLoading(false)
        }
      }
    }

    void fetchAvailability()
    const interval = window.setInterval(fetchAvailability, 20_000)
    return () => {
      mounted = false
      window.clearInterval(interval)
    }
  }, [])

  async function handleNotifySubmit(e: FormEvent) {
    e.preventDefault()
    if (!notifyContact.trim()) {
      setNotifyStatus('error')
      setNotifyFeedback('Podaj numer telefonu lub adres e-mail.')
      return
    }

    if (!notifyConsent) {
      setNotifyStatus('error')
      setNotifyFeedback('Zaznacz zgodę na jednorazowe powiadomienie.')
      return
    }

    setNotifyStatus('loading')
    setNotifyFeedback('')

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notifyContact.trim())
    const channel = isEmail ? 'email' : 'sms'

    try {
      const res = await fetch('/api/zapytaj/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: isEmail ? '' : notifyContact.trim(),
          email: isEmail ? notifyContact.trim() : null,
          channel,
          consentAvailability: notifyConsent,
        }),
      })

      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Nie udało się zapisać powiadomienia.')

      setNotifyStatus('success')
    } catch (err) {
      setNotifyStatus('error')
      setNotifyFeedback(err instanceof Error ? err.message : 'Wystąpił błąd. Spróbuj ponownie.')
    }
  }

  const isLiveNow = previewMode === 'live' || (
    previewMode === null &&
    Boolean(availability?.live?.liveSlotId) &&
    (availability?.live?.status === 'available_now' || availability?.live?.status === 'in_call')
  )

  const slots = previewMode === 'empty' || previewMode === 'error' ? [] : (availability?.slots ?? [])
  const hasNextSlot = !isLiveNow && slots.length > 0
  const isErrorState = previewMode === 'error' || (hasError && !availability && previewMode === null)

  return (
    <div className="homepage-hero-availability" aria-live="polite">
      {loading && !previewMode ? (
        <div className="homepage-avail-badge is-loading">
          <RefreshCw size={13} className="animate-spin" aria-hidden="true" />
          <span>Sprawdzam dostępność…</span>
        </div>
      ) : isErrorState ? (
        <div className="homepage-avail-badge is-loading">
          <span>Sprawdzam dostępne terminy…</span>
        </div>
      ) : isLiveNow ? (
        <div className="homepage-avail-badge is-live">
          <span className="homepage-avail-dot is-live-dot" aria-hidden="true" />
          <span><strong>Dostępny teraz</strong> — możesz rozpocząć rozmowę</span>
        </div>
      ) : hasNextSlot ? (
        <div className="homepage-avail-badge is-scheduled">
          <span className="homepage-avail-dot is-scheduled-dot" aria-hidden="true" />
          <span>Najbliższy wolny termin: <strong>{slots[0].label}</strong></span>
        </div>
      ) : (
        <div className="homepage-avail-empty-wrap">
          <div className="homepage-avail-empty-row">
            <div className="homepage-avail-badge is-empty">
              <span className="homepage-avail-dot is-empty-dot" aria-hidden="true" />
              <span>Brak wolnych terminów</span>
            </div>
            {!showNotifyForm && notifyStatus !== 'success' && (
              <button
                type="button"
                className="homepage-avail-notify-trigger"
                onClick={() => setShowNotifyForm(true)}
              >
                Powiadom mnie o wolnym terminie
              </button>
            )}
          </div>

          {showNotifyForm && notifyStatus !== 'success' && (
            <form className="homepage-avail-notify-form" onSubmit={handleNotifySubmit} noValidate>
              <div className="homepage-avail-notify-inputs">
                <input
                  type="text"
                  value={notifyContact}
                  onChange={(e) => {
                    setNotifyContact(e.target.value)
                    setNotifyStatus('idle')
                    setNotifyFeedback('')
                  }}
                  placeholder="Telefon lub e-mail"
                  aria-label="Telefon lub e-mail do powiadomienia"
                  className="homepage-avail-notify-input"
                  required
                />
                <button
                  type="submit"
                  className="homepage-avail-notify-submit"
                  disabled={notifyStatus === 'loading'}
                >
                  {notifyStatus === 'loading' ? 'Zapisuję…' : 'Zapisz'}
                </button>
              </div>

              <label className="homepage-avail-notify-consent">
                <input
                  type="checkbox"
                  checked={notifyConsent}
                  onChange={(e) => {
                    setNotifyConsent(e.target.checked)
                    setNotifyStatus('idle')
                    setNotifyFeedback('')
                  }}
                  required
                />
                <span>Zgadzam się na jednorazowe powiadomienie o wolnym terminie.</span>
              </label>

              {notifyFeedback && notifyStatus === 'error' ? (
                <p className="homepage-avail-notify-error" role="alert">{notifyFeedback}</p>
              ) : null}
            </form>
          )}

          {notifyStatus === 'success' && (
            <div className="homepage-avail-notify-done" role="status">
              <CheckCircle2 size={15} aria-hidden="true" />
              <span>Gotowe. Dam Ci znać, gdy pojawi się wolny termin.</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
