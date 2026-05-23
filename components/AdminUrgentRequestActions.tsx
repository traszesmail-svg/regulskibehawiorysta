'use client'

import { useState } from 'react'
import type { UrgentRequestedSlot } from '@/lib/urgent-now'

type AdminUrgentRequestActionsProps = {
  requestId: string
  disabled?: boolean
  requestedDate?: string | null
  requestedTime?: string | null
  requestedSlots?: UrgentRequestedSlot[]
}

function toLocalDateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function buildTodaySlots(requestedDate?: string | null, requestedTime?: string | null) {
  const today = requestedDate || toLocalDateInputValue(new Date())
  const requestedHour = requestedTime ? Number(requestedTime.slice(0, 2)) : NaN
  const baseHour = Number.isFinite(requestedHour) ? requestedHour : 10
  const startHour = Math.min(17, Math.max(8, baseHour - 1))

  return Array.from({ length: 5 }, (_, index) => {
    const hour = Math.min(21, startHour + index)
    return {
      date: today,
      time: `${String(hour).padStart(2, '0')}:00`,
    }
  }).filter((slot, index, all) => all.findIndex((item) => item.time === slot.time) === index)
}

export function AdminUrgentRequestActions({
  requestId,
  disabled = false,
  requestedDate = null,
  requestedTime = null,
  requestedSlots = [],
}: AdminUrgentRequestActionsProps) {
  const [proposedDate, setProposedDate] = useState(requestedDate ?? '')
  const [proposedTime, setProposedTime] = useState(requestedTime ?? '')
  const [responseNote, setResponseNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const todaySlots = requestedSlots.length > 0 ? requestedSlots : buildTodaySlots(requestedDate, requestedTime)

  async function handleRespond() {
    setLoading(true)
    setMessage('')
    setError('')

    try {
      const response = await fetch(`/api/admin/urgent-requests/${requestId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          proposedDate,
          proposedTime,
          responseNote,
        }),
      })

      const payload = (await response.json()) as { ok?: boolean; bookingHref?: string; error?: string }

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Nie udało się wysłać odpowiedzi.')
      }

      setMessage(`Wysłano klientowi link do płatności: ${payload.bookingHref ?? ''}`.trim())
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Nie udało się wysłać odpowiedzi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="booking-actions" data-urgent-request-actions={requestId}>
      <div className="booking-meta">Wybierz godzinę na dziś albo wpisz najbliższy realny termin.</div>
      <div className="urgent-admin-slots" aria-label="Szybki wybór godziny">
        {todaySlots.map((slot) => {
          const selected = proposedDate === slot.date && proposedTime === slot.time
          return (
            <button
              key={`${slot.date}-${slot.time}`}
              type="button"
              className={`button small-button ${selected ? 'button-primary' : 'button-ghost'}`}
              onClick={() => {
                setProposedDate(slot.date)
                setProposedTime(slot.time)
              }}
              disabled={disabled || loading}
            >
              {slot.time}
            </button>
          )
        })}
      </div>
      <input type="date" value={proposedDate} onChange={(event) => setProposedDate(event.target.value)} disabled={disabled || loading} />
      <input type="time" value={proposedTime} onChange={(event) => setProposedTime(event.target.value)} disabled={disabled || loading} />
      <input
        type="text"
        value={responseNote}
        onChange={(event) => setResponseNote(event.target.value)}
        placeholder="Opcjonalna wiadomość do klienta"
        disabled={disabled || loading}
      />
      <button type="button" className="button button-primary" onClick={handleRespond} disabled={disabled || loading}>
        {loading ? 'Wysyłam...' : 'Wyślij link do płatności'}
      </button>
      {message ? <span className="booking-meta">{message}</span> : null}
      {error ? <span className="booking-meta">{error}</span> : null}
    </div>
  )
}
