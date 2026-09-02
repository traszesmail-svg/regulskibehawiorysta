'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type RecoverySlot = {
  id: string
  date: string
  time: string
  label: string
}

type ZapytajRecoveryPickerProps = {
  bookingId: string
  token: string
  slots: RecoverySlot[]
  alreadyUsed: boolean
}

export function ZapytajRecoveryPicker({ bookingId, token, slots, alreadyUsed }: ZapytajRecoveryPickerProps) {
  const router = useRouter()
  const [selectedSlotId, setSelectedSlotId] = useState(slots[0]?.id ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedSlotId) return
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/zapytaj/recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, token, slotId: selectedSlotId }),
      })
      const payload = (await response.json()) as { error?: string; redirectTo?: string }
      if (!response.ok || !payload.redirectTo) throw new Error(payload.error ?? 'Nie udało się zapisać terminu.')
      router.push(payload.redirectTo)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Nie udało się zapisać terminu.')
      setLoading(false)
    }
  }

  if (alreadyUsed) {
    return <p className="form-success">Dodatkowy termin został już wybrany. Otwórz pokój rezerwacji z potwierdzenia.</p>
  }

  if (slots.length === 0) {
    return <p className="muted">Nie ma teraz wolnego terminu do wyboru. Napisz bezpośrednio do behawiorysty — sprawdzę możliwości ręcznie.</p>
  }

  return (
    <form onSubmit={handleSubmit} className="account-form">
      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
        <span>Wybierz jeden dodatkowy termin</span>
        <select
          value={selectedSlotId}
          onChange={(event) => setSelectedSlotId(event.target.value)}
          disabled={loading}
          style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
        >
          {slots.map((slot) => <option key={slot.id} value={slot.id}>{slot.label}</option>)}
        </select>
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      <button type="submit" className="button button-primary" disabled={loading || !selectedSlotId}>
        {loading ? 'Zapisuję termin...' : 'Zapisz dodatkowy termin'}
      </button>
    </form>
  )
}
