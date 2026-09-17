'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { PhoneAgentDeviceState } from '@/lib/server/phone-agent-store'
import type { ZapytajLiveStatusDto } from '@/lib/zapytaj-flow'

export type OperatorStatusData = {
  device: PhoneAgentDeviceState
  live: ZapytajLiveStatusDto
  smsSummary: {
    pendingCount: number
    sentCount: number
    failedCount: number
    recentErrors: Array<{
      id: string
      phone: string
      type: string
      error: string | null
      createdAt: string
    }>
    recentMessages: Array<{
      id: string
      phone: string
      message: string
      type: string
      status: string
      scheduledFor: string
      sentAt: string | null
      error: string | null
    }>
  }
  nextUpcomingBooking: {
    id: string
    ownerName: string
    phone: string
    animalType: string
    bookingDate: string
    bookingTime: string
    serviceType: string | null
    callStatus: string | null
    description: string
    durationNotes: string
  } | null
  pendingManualPaymentsCount: number
  updatedAt: string
}

export function AdminOperatorMobileCard({ initialData }: { initialData?: OperatorStatusData | null }) {
  const [data, setData] = useState<OperatorStatusData | null>(initialData ?? null)
  const [loadingAction, setLoadingAction] = useState<'enable' | 'disable' | 'refresh' | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [liveCountdown, setLiveCountdown] = useState<string | null>(null)
  const [showInstallHelp, setShowInstallHelp] = useState(false)

  async function fetchStatus() {
    try {
      const res = await fetch('/api/admin/operator/status', { cache: 'no-store' })
      if (!res.ok) throw new Error(`Błąd HTTP ${res.status}`)
      const json = (await res.json()) as OperatorStatusData
      setData(json)
    } catch {
      // Keep existing data on background poll failure
    }
  }

  useEffect(() => {
    const timer = setInterval(() => {
      void fetchStatus()
    }, 15000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!data?.live?.enabledUntil) {
      setLiveCountdown(null)
      return
    }

    const updateTimer = () => {
      const remainingMs = new Date(data.live.enabledUntil!).getTime() - Date.now()
      if (remainingMs <= 0) {
        setLiveCountdown('Czas minął')
        return
      }
      const totalSeconds = Math.floor(remainingMs / 1000)
      const minutes = Math.floor(totalSeconds / 60)
      const seconds = totalSeconds % 60
      setLiveCountdown(`${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`)
    }

    updateTimer()
    const timer = setInterval(updateTimer, 1000)
    return () => clearInterval(timer)
  }, [data?.live?.enabledUntil])

  async function handleToggleLive(action: 'enable' | 'disable') {
    setLoadingAction(action)
    setActionError(null)
    setActionSuccess(null)
    try {
      const res = await fetch('/api/admin/zapytaj/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? 'Błąd zmiany statusu')
      setActionSuccess(action === 'enable' ? 'Dostępność Live włączona na 1 godzinę.' : 'Dostępność Live wyłączona.')
      await fetchStatus()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Nie udało się zmienić dostępności')
    } finally {
      setLoadingAction(null)
    }
  }

  async function handleRefresh() {
    setLoadingAction('refresh')
    setActionError(null)
    try {
      await fetchStatus()
    } finally {
      setLoadingAction(null)
    }
  }

  const device = data?.device
  const live = data?.live
  const isOnline = Boolean(device?.isOnline)
  const isLiveActive = live?.status === 'available_now' || live?.status === 'in_call' || live?.status === 'payment_pending'

  const formatLastSeen = (seconds: number | null | undefined) => {
    if (seconds === null || seconds === undefined) return 'brak danych'
    if (seconds < 60) return `${seconds}s temu`
    const mins = Math.floor(seconds / 60)
    return `${mins} min temu`
  }

  return (
    <div className="list-card operator-mobile-card top-gap-small" data-admin-operator-card>
      {/* Nagłówek z przyciskiem instalacji i odświeżenia */}
      <div className="section-head" style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="section-eyebrow" style={{ color: 'var(--brand, #4a8d7a)', fontWeight: 700 }}>
            Centrum Operacyjne Właściciela
          </div>
          <h2 style={{ fontSize: '1.25rem', margin: '2px 0 0 0' }}>Panel Mobilny & Tryb Live</h2>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            className="button button-ghost"
            style={{ fontSize: '0.8rem', padding: '6px 10px' }}
            onClick={() => setShowInstallHelp((prev) => !prev)}
            title="Jak dodać aplikację do ekranu telefonu"
          >
            📲 Aplikacja
          </button>
          <button
            type="button"
            className="button button-ghost"
            style={{ fontSize: '0.8rem', padding: '6px 10px' }}
            onClick={() => void handleRefresh()}
            disabled={loadingAction !== null}
          >
            {loadingAction === 'refresh' ? '…' : 'Odśwież'}
          </button>
        </div>
      </div>

      {/* Pomoc dodania do ekranu telefonu (PWA) */}
      {showInstallHelp ? (
        <div
          style={{
            background: '#f4f8f7',
            border: '1px solid #cce3dc',
            borderRadius: 12,
            padding: '12px 14px',
            marginBottom: 12,
            fontSize: '0.85rem',
            lineHeight: 1.45,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6, color: '#1e5c51' }}>
            📲 Jak zainstalować ten panel jako osobną aplikację na Twoim telefonie:
          </div>
          <div style={{ marginBottom: 4 }}>
            <strong>• Android (Chrome):</strong> Kliknij menu <strong>⋮</strong> w prawym górnym rogu ➔ wybierz <strong>„Zainstaluj aplikację”</strong> lub <strong>„Dodaj do ekranu głównego”</strong>.
          </div>
          <div style={{ marginBottom: 6 }}>
            <strong>• iPhone (Safari):</strong> Kliknij ikonę Udostępnij <strong>⎋</strong> na dole ➔ wybierz <strong>„Do ekranu początkowego”</strong>.
          </div>
          <div style={{ fontSize: '0.78rem', color: '#555' }}>
            Dzięki temu panel otwiera się jednym kliknięciem w osobnym oknie bez pasków przeglądarki.
          </div>
        </div>
      ) : null}

      {actionError ? <div className="error-box" style={{ marginBottom: 10 }}>{actionError}</div> : null}
      {actionSuccess ? <div className="success-inline" style={{ marginBottom: 10 }}>{actionSuccess}</div> : null}

      {/* Grid 1: Status telefonu i stan Live */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 12,
          marginBottom: 12,
        }}
      >
        {/* Kafelek Motoroli */}
        <div
          style={{
            background: isOnline ? 'rgba(74, 141, 122, 0.08)' : 'rgba(217, 83, 79, 0.08)',
            border: `1px solid ${isOnline ? 'rgba(74, 141, 122, 0.3)' : 'rgba(217, 83, 79, 0.3)'}`,
            borderRadius: 14,
            padding: '12px 14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>📱 Motorola One Vision (Stacja SIM)</span>
            <span
              className={`status-pill ${isOnline ? 'status-paid' : 'status-pending'}`}
              style={{ padding: '2px 8px', fontSize: '0.75rem' }}
            >
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>

          <div style={{ fontSize: '0.82rem', display: 'grid', gap: 3, color: 'var(--ink, #222)' }}>
            <div>
              <strong>Meldunek:</strong> {formatLastSeen(device?.lastSeenSeconds)}
            </div>
            <div>
              <strong>Bateria:</strong>{' '}
              {device?.batteryLevel !== null && device?.batteryLevel !== undefined ? `${device.batteryLevel}%` : 'brak'}
              {device?.isCharging ? ' ⚡ (ładowanie USB)' : ''}
            </div>
            <div>
              <strong>Wersja APK:</strong> {device?.appVersion || 'v1.5.2'}
            </div>
          </div>
        </div>

        {/* Kafelek Dostępności Live z dużym przyciskiem */}
        <div
          style={{
            background: isLiveActive ? 'rgba(40, 167, 69, 0.09)' : 'rgba(108, 117, 125, 0.08)',
            border: `2px solid ${isLiveActive ? '#28a745' : 'rgba(108, 117, 125, 0.2)'}`,
            borderRadius: 14,
            padding: '12px 14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>⚡ Tryb Live („Zapytaj teraz”)</span>
            <span
              className={`status-pill ${isLiveActive ? 'status-paid' : 'status-pending'}`}
              style={{ padding: '2px 8px', fontSize: '0.75rem', fontWeight: 700 }}
            >
              {isLiveActive ? 'AKTYWNY' : 'WYŁĄCZONY'}
            </span>
          </div>

          <div style={{ fontSize: '0.82rem', marginBottom: 8 }}>
            {isLiveActive ? (
              <div>
                <span style={{ color: '#155724', fontWeight: 600 }}>Jesteś widoczny dla klientów na stronie głównej!</span>
                {liveCountdown ? (
                  <div style={{ marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 6, background: '#28a745', color: '#fff', padding: '3px 8px', borderRadius: 6, fontSize: '0.78rem', fontWeight: 700 }}>
                    Pozostało: {liveCountdown}
                  </div>
                ) : null}
              </div>
            ) : (
              <span style={{ color: 'var(--muted, #666)' }}>Klienci widzą tylko standardowe terminy z kalendarza.</span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="button button-primary"
              style={{
                flex: 1,
                padding: '10px 14px',
                fontSize: '0.88rem',
                fontWeight: 700,
                minHeight: 44,
                backgroundColor: isLiveActive ? '#1e5c51' : '#28a745',
              }}
              onClick={() => void handleToggleLive('enable')}
              disabled={loadingAction !== null}
            >
              {loadingAction === 'enable' ? 'Włączam…' : isLiveActive ? 'Przedłuż (+1h)' : '🟢 Włącz Live (1h)'}
            </button>
            {isLiveActive ? (
              <button
                type="button"
                className="button button-ghost"
                style={{
                  padding: '10px 14px',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  minHeight: 44,
                  borderColor: '#d9534f',
                  color: '#d9534f',
                }}
                onClick={() => void handleToggleLive('disable')}
                disabled={loadingAction !== null}
              >
                {loadingAction === 'disable' ? 'Wyłączam…' : 'Wyłącz'}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Grid 2: Kolejka SMS i Najbliższa rozmowa */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 12,
        }}
      >
        {/* Kolejka SMS modemu */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.6)',
            border: '1px solid rgba(92, 76, 58, 0.14)',
            borderRadius: 14,
            padding: '12px 14px',
          }}
        >
          <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: 6 }}>
            📩 Kolejka SMS Karty SIM (T-Mobile)
          </div>
          <div style={{ display: 'flex', gap: 14, fontSize: '0.85rem' }}>
            <div>
              <strong>W kolejce:</strong> {data?.smsSummary.pendingCount ?? 0}
            </div>
            <div>
              <strong>Wysłane:</strong> {data?.smsSummary.sentCount ?? 0}
            </div>
            <div style={{ color: (data?.smsSummary.failedCount ?? 0) > 0 ? '#d9534f' : 'inherit' }}>
              <strong>Błędy:</strong> {data?.smsSummary.failedCount ?? 0}
            </div>
          </div>

          {(data?.smsSummary.recentErrors?.length ?? 0) > 0 ? (
            <div
              style={{
                marginTop: 8,
                padding: '6px 8px',
                background: 'rgba(217, 83, 79, 0.08)',
                borderRadius: 8,
                fontSize: '0.75rem',
                color: '#c9302c',
              }}
            >
              <strong>Ostatni błąd SMS:</strong> {data?.smsSummary.recentErrors[0]?.error} ({data?.smsSummary.recentErrors[0]?.phone})
            </div>
          ) : null}

          {(data?.smsSummary.recentMessages?.length ?? 0) > 0 ? (
            <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
              <strong style={{ fontSize: '0.8rem' }}>Ostatnie wiadomości</strong>
              {data!.smsSummary.recentMessages.map((sms) => (
                <div key={sms.id} style={{ background: '#f8faf9', borderRadius: 8, padding: '8px 10px', fontSize: '0.78rem', lineHeight: 1.4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                    <span><strong>{sms.phone}</strong> · {sms.type}</span>
                    <span style={{ color: sms.status === 'failed' ? '#c9302c' : sms.status === 'sent' ? '#16724f' : '#6b7280', fontWeight: 700 }}>
                      {sms.status === 'sent' ? 'WYSŁANO' : sms.status === 'failed' ? 'BŁĄD' : sms.status === 'claimed' ? 'W TRAKCIE' : 'OCZEKUJE'}
                    </span>
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{sms.message}</div>
                  {sms.error ? <div style={{ color: '#c9302c', marginTop: 4 }}>Błąd: {sms.error}</div> : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Najbliższa opłacona konsultacja z bezpośrednim dzwonieniem z telefonu */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.6)',
            border: '1px solid rgba(92, 76, 58, 0.14)',
            borderRadius: 14,
            padding: '12px 14px',
          }}
        >
          <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: 6 }}>
            📞 Najbliższa Opłacona Rozmowa
          </div>
          {data?.nextUpcomingBooking ? (
            <div style={{ fontSize: '0.85rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e5c51' }}>
                {data.nextUpcomingBooking.bookingDate} o godz. {data.nextUpcomingBooking.bookingTime}
              </div>
              <div style={{ color: 'var(--muted, #555)', margin: '3px 0' }}>
                {data.nextUpcomingBooking.ownerName} • {data.nextUpcomingBooking.animalType}
              </div>
              {data.nextUpcomingBooking.description ? (
                <div style={{ marginTop: 8, padding: '8px 10px', background: '#f8faf9', borderRadius: 8, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                  <strong>Opis rozmowy:</strong> {data.nextUpcomingBooking.description}
                  {data.nextUpcomingBooking.durationNotes ? <div style={{ marginTop: 5 }}><strong>Dodatkowe informacje:</strong> {data.nextUpcomingBooking.durationNotes}</div> : null}
                </div>
              ) : null}
              <div style={{ marginTop: 8 }}>
                <a
                  href={`tel:${data.nextUpcomingBooking.phone}`}
                  className="button button-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px 16px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    minHeight: 40,
                    textDecoration: 'none',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                >
                  📞 Zadzwoń z tego telefonu: {data.nextUpcomingBooking.phone}
                </a>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '0.82rem', color: 'var(--muted, #666)' }}>
              Brak nadchodzących opłaconych konsultacji.
            </div>
          )}
        </div>
      </div>

      {/* Płatności do potwierdzenia - jeśli są */}
      {(data?.pendingManualPaymentsCount ?? 0) > 0 ? (
        <div
          style={{
            marginTop: 12,
            padding: '10px 14px',
            background: 'rgba(240, 173, 78, 0.15)',
            border: '1px solid rgba(240, 173, 78, 0.4)',
            borderRadius: 12,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.85rem',
          }}
        >
          <span>
            ⚠️ <strong>{data?.pendingManualPaymentsCount}</strong> płatności czeka na weryfikację (BLIK / przelew).
          </span>
          <Link href="#terminy" className="button button-ghost" style={{ padding: '6px 10px', fontSize: '0.78rem' }}>
            Przejdź do wpłat
          </Link>
        </div>
      ) : null}
    </div>
  )
}
