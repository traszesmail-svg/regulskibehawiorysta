'use client'

import { useEffect, useState } from 'react'

export function BookingTimer({ createdAt, holdMinutes = 5 }: { createdAt: string; holdMinutes?: number }) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null)

  useEffect(() => {
    const createdTime = new Date(createdAt).getTime()
    const expiryTime = createdTime + holdMinutes * 60 * 1000

    const updateTimer = () => {
      const now = Date.now()
      const diff = Math.max(0, Math.floor((expiryTime - now) / 1000))
      setTimeLeft(diff)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [createdAt, holdMinutes])

  if (timeLeft === null) return null

  if (timeLeft <= 0) {
    return (
      <div className="notatnik-callout notatnik-callout-error booking-timer-expired">
        Czas na dokończenie płatności minął. Twój termin mógł wrócić do kalendarza.
      </div>
    )
  }

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const formattedSeconds = seconds.toString().padStart(2, '0')

  return (
    <div className="notatnik-callout booking-timer-active" style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '3px solid #ff8a24' }}>
      <span>Trzymamy Twój termin jeszcze przez:</span>
      <strong style={{ fontSize: '16px', color: '#e76d10', fontFamily: 'var(--font-mono)' }}>
        {minutes}:{formattedSeconds}
      </strong>
    </div>
  )
}
