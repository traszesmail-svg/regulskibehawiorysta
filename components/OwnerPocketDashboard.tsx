'use client'

import { useState, useEffect } from 'react'
import type { OperatorStatusData } from '@/components/AdminOperatorMobileCard'
import type { BookingRecord } from '@/lib/types'
import { useRouter } from 'next/navigation'

type OwnerPocketDashboardProps = {
  operatorData: OperatorStatusData | null
  upcomingBookings: BookingRecord[]
  needsActionBookings: BookingRecord[]
  onSwitchToDesktop?: () => void
}

export function OwnerPocketDashboard({
  operatorData: initialOperatorData,
  upcomingBookings,
  needsActionBookings,
  onSwitchToDesktop,
}: OwnerPocketDashboardProps) {
  const router = useRouter()
  const [data, setData] = useState<OperatorStatusData | null>(initialOperatorData)
  const [liveLoading, setLiveLoading] = useState(false)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [liveCountdown, setLiveCountdown] = useState<string | null>(null)

  // Auto-refresh status co 10 sekund
  async function refreshStatus() {
    try {
      const res = await fetch('/api/admin/operator/status', { cache: 'no-store' })
      if (res.ok) {
        const json = (await res.json()) as OperatorStatusData
        setData(json)
      }
    } catch {
      // Ignoruj przejściowe błędy sieci w tle
    }
  }

  useEffect(() => {
    const timer = setInterval(refreshStatus, 10000)
    return () => clearInterval(timer)
  }, [])

  // Timer odliczający dostępność Live
  useEffect(() => {
    if (!data?.live?.enabledUntil) {
      setLiveCountdown(null)
      return
    }

    const updateTimer = () => {
      const remainingMs = new Date(data.live.enabledUntil!).getTime() - Date.now()
      if (remainingMs <= 0) {
        setLiveCountdown('Wygasła')
        return
      }
      const totalSec = Math.floor(remainingMs / 1000)
      const m = Math.floor(totalSec / 60)
      const s = totalSec % 60
      setLiveCountdown(`${m} min ${s < 10 ? '0' : ''}${s} s`)
    }

    updateTimer()
    const timer = setInterval(updateTimer, 1000)
    return () => clearInterval(timer)
  }, [data?.live?.enabledUntil])

  // Przełączanie trybu Live
  async function handleToggleLive(action: 'enable' | 'disable') {
    setLiveLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/zapytaj/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const raw = await res.text()
      let payload: { error?: string } = {}
      try { payload = JSON.parse(raw) as { error?: string } } catch {}
      if (!res.ok) throw new Error(payload.error ?? (res.status === 401 ? 'Sesja panelu wygasła. Odśwież stronę i zaloguj się ponownie.' : 'Błąd zmiany Live'))
      setMessage(action === 'enable' ? '🟢 Tryb Live WŁĄCZONY na 1 godzinę.' : '⚪ Tryb Live wyłączony.')
      await refreshStatus()
      router.refresh()
    } catch (e: any) {
      setMessage(`❌ ${e.message}`)
    } finally {
      setLiveLoading(false)
    }
  }

  // Szybkie zatwierdzenie płatności BLIK jednym kliknięciem
  async function handleApprovePayment(bookingId: string) {
    setApprovingId(bookingId)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/manual-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })
      if (!res.ok) throw new Error('Nie udało się zatwierdzić wpłaty')
      setMessage('✅ Wpłata zatwierdzona! Klient otrzymał potwierdzenie.')
      router.refresh()
    } catch (e: any) {
      setMessage(`❌ ${e.message}`)
    } finally {
      setApprovingId(null)
    }
  }

  const live = data?.live
  const isLiveActive = live?.status === 'available_now' || live?.status === 'in_call' || live?.status === 'payment_pending'
  const device = data?.device
  const isDeviceOnline = Boolean(device?.isOnline)
  const nextBooking = data?.nextUpcomingBooking

  // Dzisiejsza data w formacie YYYY-MM-DD
  const todayIso = new Date().toISOString().slice(0, 10)
  const todayAppointments = upcomingBookings.filter((b) => b.bookingDate === todayIso)

  return (
    <div style={{ maxWidth: 540, margin: '0 auto', padding: '12px 4px 60px 4px', fontFamily: 'system-ui, -apple-system, sans-serif', display: 'flex', flexDirection: 'column' }}>
      
      {/* 1. MINIMALISTYCZNY NAGŁÓWEK */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, padding: '0 8px', order: 0 }}>
        <div>
          <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1e5c51', fontWeight: 700 }}>
            Centrum Operacyjne
          </div>
          <h1 style={{ fontSize: '1.45rem', margin: '2px 0 0 0', fontWeight: 800, color: '#222' }}>
            Cześć, Piotr 👋
          </h1>
        </div>
        <button
          type="button"
          onClick={() => { void refreshStatus(); router.refresh() }}
          style={{
            background: '#f0f3f2',
            border: 'none',
            borderRadius: 20,
            padding: '8px 14px',
            fontSize: '0.82rem',
            fontWeight: 600,
            color: '#1e5c51',
            cursor: 'pointer',
          }}
        >
          Odśwież
        </button>
      </header>

      {/* Komunikat o akcji (toast/banner) */}
      {message ? (
        <div
          style={{
            background: message.startsWith('❌') ? '#fdf2f2' : '#f0f9f4',
            border: `1px solid ${message.startsWith('❌') ? '#f8b4b4' : '#b7eb8f'}`,
            color: message.startsWith('❌') ? '#9b1c1c' : '#1e5c51',
            padding: '10px 14px',
            borderRadius: 12,
            marginBottom: 14,
            fontSize: '0.9rem',
            fontWeight: 600,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            order: 1,
          }}
        >
          <span>{message}</span>
          <button
            type="button"
            onClick={() => setMessage(null)}
            style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: 'inherit' }}
          >
            ✕
          </button>
        </div>
      ) : null}

      {/* ========================================================================= */}
      {/* 4. DOSTĘPNOŚĆ LIVE                                                        */}
      {/* ========================================================================= */}
      <div
        style={{
          background: isLiveActive ? 'linear-gradient(135deg, #1e5c51 0%, #2a7c6e 100%)' : '#ffffff',
          color: isLiveActive ? '#ffffff' : '#222222',
          border: isLiveActive ? 'none' : '2px solid #e0e0e0',
          borderRadius: 20,
          padding: '20px 18px',
          boxShadow: isLiveActive ? '0 8px 24px rgba(30, 92, 81, 0.25)' : '0 2px 8px rgba(0,0,0,0.05)',
          marginBottom: 16,
          order: 4,
          transition: 'all 0.3s ease',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                display: 'inline-block',
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: isLiveActive ? '#4ade80' : '#9ca3af',
                boxShadow: isLiveActive ? '0 0 10px #4ade80' : 'none',
              }}
            />
            <span style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
              {isLiveActive ? 'JESTEŚ DOSTĘPNY NA ŻYWO' : 'TRYB LIVE: WYŁĄCZONY'}
            </span>
          </div>
          {isLiveActive && liveCountdown ? (
            <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: 12, fontSize: '0.85rem', fontWeight: 700 }}>
              ⏳ {liveCountdown}
            </span>
          ) : null}
        </div>

        <p style={{ margin: '0 0 16px 0', fontSize: '0.88rem', opacity: isLiveActive ? 0.9 : 0.75, lineHeight: 1.4 }}>
          {isLiveActive
            ? 'Klienci widzą na stronie głównej, że możesz odebrać telefon w ciągu kilku minut.'
            : 'Włącz, gdy masz wolną chwilę i chcesz przyjąć natychmiastową rozmowę (104 zł).'}
        </p>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            disabled={liveLoading}
            onClick={() => void handleToggleLive('enable')}
            style={{
              flex: 2,
              padding: '14px 18px',
              fontSize: '1rem',
              fontWeight: 700,
              borderRadius: 14,
              border: 'none',
              background: isLiveActive ? '#ffffff' : '#1e5c51',
              color: isLiveActive ? '#1e5c51' : '#ffffff',
              cursor: liveLoading ? 'wait' : 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
          >
            {liveLoading ? 'Czekaj…' : isLiveActive ? '⚡ Przedłuż o +1h' : '🟢 WŁĄCZ LIVE NA 1 GODZINĘ'}
          </button>

          {isLiveActive ? (
            <button
              type="button"
              disabled={liveLoading}
              onClick={() => void handleToggleLive('disable')}
              style={{
                flex: 1,
                padding: '14px',
                fontSize: '0.95rem',
                fontWeight: 600,
                borderRadius: 14,
                border: '1px solid rgba(255,255,255,0.4)',
                background: 'transparent',
                color: '#ffffff',
                cursor: liveLoading ? 'wait' : 'pointer',
              }}
            >
              Wyłącz
            </button>
          ) : null}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. KARTA: WPŁATY DO POTWIERDZENIA (BLIK / REVOLUT) - TYLKO GDY SĄ!        */}
      {/* ========================================================================= */}
      {needsActionBookings.length > 0 ? (
        <div
          style={{
            background: '#fffbeb',
            border: '2px solid #f59e0b',
            borderRadius: 18,
            padding: '16px',
            marginBottom: 16,
            order: 2,
            boxShadow: '0 4px 14px rgba(245, 158, 11, 0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: '1.2rem' }}>⚠️</span>
            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#92400e' }}>
              Wpłaty do zatwierdzenia ({needsActionBookings.length})
            </span>
          </div>

          {needsActionBookings.map((b) => (
            <div
              key={b.id}
              style={{
                background: '#ffffff',
                borderRadius: 12,
                padding: '12px 14px',
                marginTop: 8,
                border: '1px solid #fde68a',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111' }}>{b.ownerName}</div>
                  <div style={{ fontSize: '0.82rem', color: '#666', marginTop: 2 }}>
                    Kwota: <strong>{b.amount ?? 79} zł</strong> • {b.animalType}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={approvingId === b.id}
                  onClick={() => void handleApprovePayment(b.id)}
                  style={{
                    background: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 10,
                    padding: '8px 14px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: approvingId === b.id ? 'wait' : 'pointer',
                  }}
                >
                  {approvingId === b.id ? '…' : '✓ Zatwierdź wpłatę'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* ========================================================================= */}
      {/* 3. KARTA: NAJBLIŻSZA ROZMOWA                                              */}
      {/* ========================================================================= */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 20,
          padding: '18px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
          marginBottom: 16,
          order: 3,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1e5c51' }}>
            Najbliższa rozmowa
          </span>
          {nextBooking ? (
            <span style={{ background: '#ecfdf5', color: '#065f46', padding: '3px 10px', borderRadius: 10, fontSize: '0.8rem', fontWeight: 700 }}>
              OPŁACONA
            </span>
          ) : null}
        </div>

        {nextBooking ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e5c51' }}>
                godz. {nextBooking.bookingTime}
              </span>
              <span style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: 600 }}>
                ({nextBooking.bookingDate})
              </span>
            </div>

            <div style={{ background: '#f9fafb', borderRadius: 14, padding: '12px 14px', marginBottom: 14, fontSize: '0.9rem' }}>
              <div style={{ fontWeight: 700, color: '#111827', fontSize: '1rem', marginBottom: 4 }}>
                👤 {nextBooking.ownerName}
              </div>
              <div style={{ color: '#4b5563', marginBottom: 4 }}>
                🐾 <strong>Zwierzak:</strong> {nextBooking.animalType}
              </div>
              {nextBooking.description ? (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #e5e7eb', color: '#374151', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                  <strong>Opis rozmowy:</strong> {nextBooking.description}
                  {nextBooking.durationNotes ? <div style={{ marginTop: 5 }}><strong>Dodatkowe informacje:</strong> {nextBooking.durationNotes}</div> : null}
                </div>
              ) : null}
            </div>

            <a
              href={`tel:${nextBooking.phone}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                background: '#10b981',
                color: '#ffffff',
                textDecoration: 'none',
                padding: '14px 20px',
                borderRadius: 14,
                fontSize: '1.05rem',
                fontWeight: 800,
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>📞</span>
              <span>ZADZWOŃ: {nextBooking.phone}</span>
            </a>
          </div>
        ) : (
          <div style={{ padding: '16px 8px', textAlign: 'center', color: '#6b7280' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>✨</div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Brak nadchodzących rozmów</div>
            <div style={{ fontSize: '0.82rem', marginTop: 4 }}>Wszystkie bieżące sprawy są zrealizowane.</div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. OSTATNIE SMS-Y Z KARTY SIM                                             */}
      {/* ========================================================================= */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 18,
          padding: '16px',
          border: '1px solid #e5e7eb',
          marginBottom: 16,
          order: 5,
        }}
      >
        <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#374151', marginBottom: 10 }}>
          📩 Ostatnie SMS-y z Motoroli
        </div>
        {(data?.smsSummary.recentMessages?.length ?? 0) > 0 ? (
          <div style={{ display: 'grid', gap: 9 }}>
            {data!.smsSummary.recentMessages.map((sms) => (
              <div key={sms.id} style={{ background: '#f8faf9', borderRadius: 11, padding: '10px 12px', fontSize: '0.84rem', lineHeight: 1.45 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 5 }}>
                  <span><strong>{sms.phone}</strong> · {sms.type}</span>
                  <span style={{ color: sms.status === 'failed' ? '#b91c1c' : sms.status === 'sent' ? '#16724f' : '#6b7280', fontWeight: 800 }}>
                    {sms.status === 'sent' ? 'WYSŁANO' : sms.status === 'failed' ? 'BŁĄD' : sms.status === 'claimed' ? 'W TRAKCIE' : 'OCZEKUJE'}
                  </span>
                </div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{sms.message}</div>
                {sms.error ? <div style={{ color: '#b91c1c', marginTop: 5 }}>Błąd: {sms.error}</div> : null}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>Brak SMS-ów w ostatnich wpisach kolejki.</div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 6. POZOSTAŁE ROZMOWY NA DZISIAJ (JEŚLI WIĘCEJ NIŻ 1)                       */}
      {/* ========================================================================= */}
      {todayAppointments.length > 1 ? (
        <div
          style={{
            background: '#ffffff',
            borderRadius: 18,
            padding: '16px',
            border: '1px solid #e5e7eb',
            marginBottom: 16,
            order: 6,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#374151', marginBottom: 10 }}>
            📅 Inne rozmowy na dzisiaj ({todayAppointments.length}):
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {todayAppointments.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#f9fafb',
                  padding: '10px 12px',
                  borderRadius: 10,
                  fontSize: '0.85rem',
                }}
              >
                <div>
                  <strong>{item.bookingTime}</strong> • {item.ownerName} ({item.animalType})
                </div>
                <a
                  href={`tel:${item.phone}`}
                  style={{
                    color: '#10b981',
                    textDecoration: 'none',
                    fontWeight: 700,
                    padding: '4px 8px',
                  }}
                >
                  📞 Zadzwoń
                </a>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* ========================================================================= */}
      {/* 6. DYSKRETNY PASEK SPRZĘTU (MOTOROLA SIM)                                 */}
      {/* ========================================================================= */}
      <div
        style={{
          background: '#f3f4f6',
          borderRadius: 14,
          padding: '10px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.8rem',
          color: '#4b5563',
          marginBottom: 20,
          order: 7,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: isDeviceOnline ? '#10b981' : '#ef4444' }} />
          <span>Motorola SIM: <strong>{isDeviceOnline ? 'ONLINE' : 'OFFLINE'}</strong></span>
        </div>
        <div>
          Bateria: <strong>{device?.batteryLevel ?? 100}% {device?.isCharging ? '⚡' : ''}</strong>
        </div>
        <div>
          SMS: <strong>{data?.smsSummary.sentCount ?? 0} wysłano</strong>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 7. PRZYCISK PRZEŁĄCZENIA NA PEŁNY PANEL DESKTOP                           */}
      {/* ========================================================================= */}
      {onSwitchToDesktop ? (
        <div style={{ textAlign: 'center', order: 8 }}>
          <button
            type="button"
            onClick={onSwitchToDesktop}
            style={{
              background: 'none',
              border: '1px dashed #9ca3af',
              borderRadius: 12,
              padding: '10px 18px',
              fontSize: '0.85rem',
              color: '#6b7280',
              fontWeight: 600,
              cursor: 'pointer',
              width: '100%',
            }}
          >
            ⚙️ Pokaż pełny kalendarz i narzędzia zaawansowane
          </button>
        </div>
      ) : null}

    </div>
  )
}
