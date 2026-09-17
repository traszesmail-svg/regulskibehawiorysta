'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { OwnerPocketDashboard } from '@/components/OwnerPocketDashboard'
import type { OperatorStatusData } from '@/components/AdminOperatorMobileCard'
import type { BookingRecord } from '@/lib/types'

type AdminViewSwitcherProps = {
  operatorData: OperatorStatusData | null
  upcomingBookings: BookingRecord[]
  needsActionBookings: BookingRecord[]
  desktopChildren: ReactNode
}

export function AdminViewSwitcher({
  operatorData,
  upcomingBookings,
  needsActionBookings,
  desktopChildren,
}: AdminViewSwitcherProps) {
  // Tryb domyślny: 'mobile' dla czystego i intuicyjnego kokpitu, 'desktop' dla pełnego panelu
  const [viewMode, setViewMode] = useState<'mobile' | 'desktop'>('mobile')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('admin_view_preference')
    if (saved === 'desktop' || saved === 'mobile') {
      setViewMode(saved)
    } else {
      // Jeśli ekran mniejszy niż 860px (np. telefon lub tablet), domyślnie czysty kokpit
      if (typeof window !== 'undefined' && window.innerWidth < 860) {
        setViewMode('mobile')
      } else {
        setViewMode('desktop')
      }
    }
  }, [])

  function switchMode(mode: 'mobile' | 'desktop') {
    setViewMode(mode)
    try {
      localStorage.setItem('admin_view_preference', mode)
    } catch {}
  }

  return (
    <div>
      {/* Przełącznik widoków na samej górze */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 8,
          marginBottom: 16,
          background: '#f3f4f6',
          padding: '4px',
          borderRadius: 14,
          maxWidth: 400,
          margin: '0 auto 16px auto',
        }}
      >
        <button
          type="button"
          onClick={() => switchMode('mobile')}
          style={{
            flex: 1,
            padding: '8px 14px',
            fontSize: '0.88rem',
            fontWeight: viewMode === 'mobile' ? 700 : 500,
            borderRadius: 10,
            border: 'none',
            background: viewMode === 'mobile' ? '#ffffff' : 'transparent',
            color: viewMode === 'mobile' ? '#1e5c51' : '#6b7280',
            boxShadow: viewMode === 'mobile' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          📱 Kokpit (Prosty)
        </button>
        <button
          type="button"
          onClick={() => switchMode('desktop')}
          style={{
            flex: 1,
            padding: '8px 14px',
            fontSize: '0.88rem',
            fontWeight: viewMode === 'desktop' ? 700 : 500,
            borderRadius: 10,
            border: 'none',
            background: viewMode === 'desktop' ? '#ffffff' : 'transparent',
            color: viewMode === 'desktop' ? '#1e5c51' : '#6b7280',
            boxShadow: viewMode === 'desktop' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          🖥️ Pełne narzędzia
        </button>
      </div>

      {viewMode === 'mobile' ? (
        <OwnerPocketDashboard
          operatorData={operatorData}
          upcomingBookings={upcomingBookings}
          needsActionBookings={needsActionBookings}
          onSwitchToDesktop={() => switchMode('desktop')}
        />
      ) : (
        desktopChildren
      )}
    </div>
  )
}
