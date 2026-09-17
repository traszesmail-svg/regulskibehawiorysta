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
  } | null
  pendingManualPaymentsCount: number
  updatedAt: string
}

export function AdminOperatorMobileCard({ initialData }: { initialData?: OperatorStatusData | null }) {
  const [data, setData] = useState<OperatorStatusData | null>(initialData ?? null)
  const [loadingAction, setLoadingAction] = useState<'enable' | 'disable' | 'refresh' | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

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
      setActionSuccess(action === 'enable' ? 'Dostępność live włączona na 1 godzinę.' : 'Dostępność live wyłączona.')
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
      <div className="section-head" style={{ marginBottom: 12 }}>
        <div>
          <div className="section-eyebrow" style={{ color: 'var(--brand, #4a8d7a)', fontWeight: 700 }}>
            Centrum Operacyjne Właściciela
          </div>
          <h2 style={{ fontSize: '1.25rem', margin: '2px 0 0 0' }}>Motorola & Dostępność Live</h2>
        </div>
        <button
          type="button"
          className="button button-ghost"
          style={{ fontSize: '0.85rem', padding: '6px 12px' }}
          onClick={() => void handleRefresh()}
          disabled={loadingAction !== null}
        >
          {loadingAction === 'refresh' ? '…' : 'Odśwież'}
        </button>
      </div>

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
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>📱 Motorola One Vision</span>
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
              {device?.isCharging ? ' ⚡ (ładowanie)' : ''}
            </div>
            <div>
              <strong>Sieć:</strong> {device?.network || 'brak danych'}
            </div>
            {device?.isDefaultDialer === false ? (
              <div style={{ color: '#d9534f', fontWeight: 600 }}>⚠️ Nie jest domyślnym dialerem!</div>
            ) : null}
          </div>
        </div>

        {/* Kafelek Dostępności Live */}
        <div
          style={{
            background: isLiveActive ? 'rgba(40, 167, 69, 0.08)' : 'rgba(108, 117, 125, 0.08)',
            border: `1px solid ${isLiveActive ? 'rgba(40, 167, 69, 0.3)' : 'rgba(108, 117, 125, 0.2)'}`,
            borderRadius: 14,
            padding: '12px 14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>⚡ Dostępność Live</span>
            <span
              className={`status-pill ${isLiveActive ? 'status-paid' : 'status-pending'}`}
              style={{ padding: '2px 8px', fontSize: '0.75rem' }}
            >
              {live?.label ?? 'Sprawdzam…'}
            </span>
          </div>

          <div style={{ fontSize: '0.82rem', marginBottom: 10 }}>
            {live?.message ?? 'Odczytuję status…'}
            {live?.enabledUntil ? (
              <div style={{ marginTop: 2, fontWeight: 600 }}>
                Ważne do:{' '}
                {new Date(live.enabledUntil).toLocaleTimeString('pl-PL', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            ) : null}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="button button-primary"
              style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }}
              onClick={() => void handleToggleLive('enable')}
              disabled={loadingAction !== null}
            >
              {loadingAction === 'enable' ? 'Włączam…' : 'Włącz (1h)'}
            </button>
            <button
              type="button"
              className="button button-ghost"
              style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }}
              onClick={() => void handleToggleLive('disable')}
              disabled={loadingAction !== null || !isLiveActive}
            >
              {loadingAction === 'disable' ? 'Wyłączam…' : 'Wyłącz'}
            </button>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted, #666)', marginTop: 6, lineHeight: 1.3 }}>
            Stan potwierdzony przez serwer. Połączenie telefonu z siecią nie oznacza automatycznie Twojej dostępności.
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
            📩 Kolejka SMS Modemu Motoroli
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
              <strong>Ostatni błąd SMS:</strong> {data?.smsSummary.recentErrors[0]?.error} (
              {data?.smsSummary.recentErrors[0]?.phone})
            </div>
          ) : null}
        </div>

        {/* Najbliższa opłacona konsultacja */}
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
              <div style={{ fontWeight: 700 }}>
                {data.nextUpcomingBooking.bookingDate} o godz. {data.nextUpcomingBooking.bookingTime}
              </div>
              <div style={{ color: 'var(--muted, #555)', margin: '2px 0' }}>
                {data.nextUpcomingBooking.ownerName} ({data.nextUpcomingBooking.animalType})
              </div>
              <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <a
                  href={`tel:${data.nextUpcomingBooking.phone}`}
                  className="button button-ghost"
                  style={{ padding: '4px 10px', fontSize: '0.8rem', textDecoration: 'none' }}
                >
                  📞 Zadzwoń: {data.nextUpcomingBooking.phone}
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
          <Link href="#terminy" className="button button-ghost" style={{ padding: '4px 8px', fontSize: '0.78rem' }}>
            Przejdź do wpłat
          </Link>
        </div>
      ) : null}
    </div>
  )
}
