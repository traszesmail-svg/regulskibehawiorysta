'use client'

import { useEffect, useState } from 'react'
import { PawPrint } from 'lucide-react'

function getClinicInitials(name: string) {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (words.length > 1) {
    return words
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? '')
      .join('')
  }

  return name.trim().slice(0, 2).toUpperCase() || 'L'
}

export function ClinicBookingIdentity() {
  const [clinicName, setClinicName] = useState('Lecznica partnerska')
  const [clinicLogoSrc, setClinicLogoSrc] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const storedCode = window.sessionStorage.getItem('clinicPromoCode')
    const storedName = window.sessionStorage.getItem('clinicPromoName')
    const storedLogo = window.sessionStorage.getItem('clinicPromoLogo')

    if (storedName) {
      setClinicName(storedName)
    }
    if (storedLogo) {
      setClinicLogoSrc(storedLogo)
    }

    if (!storedCode) {
      return () => {
        cancelled = true
      }
    }

    void fetch('/api/promo-codes/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: storedCode }),
    })
      .then((response) => response.json() as Promise<{ ok?: boolean; clinicName?: string | null; clinicLogoSrc?: string | null }>)
      .then((payload) => {
        if (!cancelled && payload.ok && payload.clinicName) {
          setClinicName(payload.clinicName)
          if (payload.clinicLogoSrc) {
            window.sessionStorage.setItem('clinicPromoLogo', payload.clinicLogoSrc)
          } else {
            window.sessionStorage.removeItem('clinicPromoLogo')
          }
          setClinicLogoSrc(payload.clinicLogoSrc ?? null)
        }
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="clinic-booking-identity" data-clinic-booking-identity="true">
      <span className="clinic-booking-identity-mark" aria-hidden="true">
        {clinicLogoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- clinic logos are campaign-configured and may be hosted outside the app domain.
          <img
            src={clinicLogoSrc}
            alt=""
            onError={() => {
              window.sessionStorage.removeItem('clinicPromoLogo')
              setClinicLogoSrc(null)
            }}
          />
        ) : (
          <>
            <PawPrint size={21} strokeWidth={1.9} />
            <small>{getClinicInitials(clinicName)}</small>
          </>
        )}
      </span>
      <span className="clinic-booking-identity-copy">
        <small>Program bezpłatnych konsultacji</small>
        <strong>{clinicName}</strong>
      </span>
    </div>
  )
}
