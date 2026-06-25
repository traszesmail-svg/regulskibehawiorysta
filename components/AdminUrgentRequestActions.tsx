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

const TIME_OPTIONS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
  '20:00'
]

export function AdminUrgentRequestActions({
  requestId,
  disabled = false,
  requestedDate = null,
  requestedTime = null,
  requestedSlots = [],
}: AdminUrgentRequestActionsProps) {
  const defaultDate = requestedDate || toLocalDateInputValue(new Date())
  const [proposedDate, setProposedDate] = useState(defaultDate)
  const [proposedTime, setProposedTime] = useState(requestedTime || '10:00')
  const [responseNote, setResponseNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

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
      <div className="booking-meta">Wybierz termin (data oraz godzina co 30 min) i zatwierdź.</div>
      
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr', margin: '8px 0' }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4, fontWeight: 600 }}>Data</label>
          <input 
            type="date" 
            value={proposedDate} 
            onChange={(event) => setProposedDate(event.target.value)} 
            disabled={disabled || loading} 
            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e1d6c8' }}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4, fontWeight: 600 }}>Godzina</label>
          <select 
            value={proposedTime} 
            onChange={(event) => setProposedTime(event.target.value)} 
            disabled={disabled || loading}
            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e1d6c8', background: '#fff' }}
          >
            {TIME_OPTIONS.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </div>
      </div>

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
