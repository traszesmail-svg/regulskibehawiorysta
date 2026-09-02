'use client'

import { useEffect, useState } from 'react'
import type { ZapytajLiveStatusDto } from '@/lib/zapytaj-flow'

type NotificationSummary = {
  waiting: number | null
  attempted?: number
  sent?: number
  fallbackSent?: number
  failed?: number
  skipped?: number
  error?: string
}

type AdminZapytajLiveResponse = ZapytajLiveStatusDto & {
  error?: string
  notificationSummary?: NotificationSummary
}

export function AdminZapytajLiveControl() {
  const [status, setStatus] = useState<ZapytajLiveStatusDto | null>(null)
  const [notificationSummary, setNotificationSummary] = useState<NotificationSummary | null>(null)
  const [error, setError] = useState('')
  const [notificationNote, setNotificationNote] = useState('')
  const [loading, setLoading] = useState<'enable' | 'disable' | 'refresh' | null>('refresh')

  async function loadStatus() {
    setLoading('refresh')
    try {
      const response = await fetch('/api/admin/zapytaj/live', { cache: 'no-store' })
      const payload = (await response.json()) as AdminZapytajLiveResponse
      if (!response.ok) throw new Error(payload.error ?? 'Nie udało się odczytać statusu live.')
      setStatus(payload)
      setNotificationSummary(payload.notificationSummary ?? null)
      setError('')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Status live jest niedostępny.')
    } finally {
      setLoading(null)
    }
  }

  useEffect(() => {
    void loadStatus()
  }, [])

  async function changeAvailability(action: 'enable' | 'disable') {
    setLoading(action)
    setError('')
    try {
      const response = await fetch('/api/admin/zapytaj/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const payload = (await response.json()) as AdminZapytajLiveResponse
      if (!response.ok) throw new Error(payload.error ?? 'Nie udało się zmienić statusu live.')
      setStatus(payload)
      setNotificationSummary(payload.notificationSummary ?? null)
      if (payload.notificationSummary?.error) {
        setError(payload.notificationSummary.error)
        setNotificationNote('')
      } else if (action === 'enable' && (payload.notificationSummary?.attempted ?? 0) > 0) {
        setNotificationNote(
          `Powiadomienia: wysłano ${payload.notificationSummary?.sent ?? 0}, pominięto ${payload.notificationSummary?.skipped ?? 0}, błędne ${payload.notificationSummary?.failed ?? 0}.`,
        )
      } else {
        setNotificationNote('')
      }
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Nie udało się zmienić statusu live.')
    } finally {
      setLoading(null)
    }
  }

  const enabled = status?.status === 'available_now' || status?.status === 'in_call' || status?.status === 'payment_pending'

  return (
    <div className="list-card top-gap" data-admin-zapytaj-live>
      <div className="section-head">
        <div>
          <div className="section-eyebrow">Zapytaj teraz</div>
          <h3>Ręczna dostępność live</h3>
        </div>
        <span className={`status-pill ${enabled ? 'status-paid' : 'status-pending'}`}>{status?.label ?? 'Sprawdzam…'}</span>
      </div>
      <p className="muted paragraph-gap">Włączasz ją ręcznie na minimum godzinę. Przy aktywnej rozmowie system może pokazać klientowi najwyżej jedno następne okno; nie otwiera nieograniczonej kolejki.</p>
      <p className="admin-price-meta">{status?.message ?? 'Odczytuję status…'}{status?.enabledUntil ? ` Konfiguracja ważna do ${new Date(status.enabledUntil).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}.` : ''}</p>
      {notificationSummary?.waiting !== null && notificationSummary?.waiting !== undefined ? <p className="admin-price-meta">Oczekujące powiadomienia: {notificationSummary.waiting}. Przy włączeniu live SMS jest próbą główną, a e-mail może być awaryjnym fallbackiem.</p> : null}
      {notificationNote ? <div className="success-inline top-gap-small">{notificationNote}</div> : null}
      {status?.storageAvailable === false ? <div className="error-box top-gap-small">Brak bezpiecznego storage’u statusu. Live pozostaje wyłączone.</div> : null}
      {error ? <div className="error-box top-gap-small">{error}</div> : null}
      <div className="hero-actions top-gap-small">
        <button type="button" className="button button-primary" onClick={() => void changeAvailability('enable')} disabled={loading !== null || status?.storageAvailable === false}>
          {loading === 'enable' ? 'Włączam…' : 'Włącz na minimum godzinę'}
        </button>
        <button type="button" className="button button-ghost" onClick={() => void changeAvailability('disable')} disabled={loading !== null || !enabled}>
          {loading === 'disable' ? 'Wyłączam…' : 'Wyłącz przyjmowanie nowych'}
        </button>
        <button type="button" className="button button-ghost" onClick={() => void loadStatus()} disabled={loading !== null}>
          Odśwież
        </button>
      </div>
    </div>
  )
}
