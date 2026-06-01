'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { AdminLazyDetails } from '@/components/AdminLazyDetails'
import { getWarsawNowBoundary, isFutureAvailabilitySlot } from '@/lib/data'
import { AvailabilitySlot } from '@/lib/types'

interface AdminAvailabilityManagerProps {
  slots: AvailabilitySlot[]
}

function sortSlots(slots: AvailabilitySlot[]): AvailabilitySlot[] {
  return [...slots].sort((left, right) =>
    `${left.bookingDate}T${left.bookingTime}`.localeCompare(`${right.bookingDate}T${right.bookingTime}`),
  )
}

function addDaysToDateKey(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0))

  return date.toISOString().slice(0, 10)
}

export function AdminAvailabilityManager({ slots }: AdminAvailabilityManagerProps) {
  const router = useRouter()
  const [bookingDate, setBookingDate] = useState('')
  const [bookingTime, setBookingTime] = useState('')
  const [error, setError] = useState('')
  const [loadingSlotId, setLoadingSlotId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleAddSlot(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookingDate, bookingTime }),
      })

      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? 'Nie udało się dodać slotu.')
      }

      setBookingDate('')
      setBookingTime('')
      router.refresh()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Wystąpił błąd dodawania slotu.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(slotId: string) {
    setError('')
    setLoadingSlotId(slotId)

    try {
      const response = await fetch(`/api/availability/${slotId}`, {
        method: 'DELETE',
      })

      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? 'Nie udało się usunąć slotu.')
      }

      router.refresh()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Wystąpił błąd usuwania slotu.')
    } finally {
      setLoadingSlotId(null)
    }
  }

  const orderedSlots = sortSlots(slots)
  const today = getWarsawNowBoundary().date
  const visibleDays = 7
  const visibleUntil = addDaysToDateKey(today, visibleDays)
  const futureSlots = orderedSlots.filter((slot) => isFutureAvailabilitySlot(slot.bookingDate, slot.bookingTime))
  const visibleSlots = futureSlots.filter((slot) => slot.bookingDate <= visibleUntil)
  const laterSlots = futureSlots.filter((slot) => slot.bookingDate > visibleUntil)

  function renderSlotList(items: AvailabilitySlot[]) {
    return (
      <div className="booking-list admin-slot-list">
        {items.map((slot) => {
          const disabled = slot.isBooked || Boolean(slot.lockedByBookingId)
          return (
            <div key={slot.id} className="booking-row admin-slot-row">
              <div>
                <div className="booking-title">
                  {slot.bookingDate} {slot.bookingTime}
                </div>
                <div className="booking-meta">
                  {slot.isBooked ? 'Termin opłacony' : slot.lockedByBookingId ? 'W trakcie płatności' : 'Wolny termin'}
                </div>
              </div>

              <div className="booking-description">
                {slot.isBooked
                  ? 'Termin jest przypisany do potwierdzonej konsultacji.'
                  : slot.lockedByBookingId
                    ? 'Termin jest chwilowo zablokowany, bo klient kończy płatność.'
                    : 'Termin jest widoczny w rezerwacji i gotowy do wyboru.'}
              </div>

              <div className="booking-actions">
                <button
                  type="button"
                  className="button button-ghost small-button"
                  onClick={() => handleDelete(slot.id)}
                  disabled={disabled || loadingSlotId === slot.id}
                >
                  {loadingSlotId === slot.id ? 'Usuwanie...' : 'Usuń termin'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="stack-gap top-gap">
      <form className="form-grid" onSubmit={handleAddSlot}>
        <div>
          <label>Data</label>
          <input type="date" value={bookingDate} onChange={(event) => setBookingDate(event.target.value)} required />
        </div>
        <div>
          <label>Godzina</label>
          <input type="time" value={bookingTime} onChange={(event) => setBookingTime(event.target.value)} required />
        </div>
        <div className="full-width">
          <button type="submit" className="button button-primary big-button" disabled={isSubmitting}>
            {isSubmitting ? 'Dodawanie...' : 'Dodaj termin'}
          </button>
        </div>
      </form>

      {error ? <div className="error-box">{error}</div> : null}

      <div>
        <div className="section-eyebrow">Najbliższe {visibleDays} dni</div>
        {visibleSlots.length === 0 ? <div className="empty-box">Brak przyszłych terminów w najbliższych 7 dniach.</div> : renderSlotList(visibleSlots)}
      </div>

      <AdminLazyDetails
        className="admin-disclosure"
        dataAttribute="data-admin-later-slots"
        summary={`Dalsze terminy (${laterSlots.length})`}
        contentClassName="top-gap-small"
      >
        {laterSlots.length === 0 ? <div className="empty-box">Brak dalszych terminów.</div> : renderSlotList(laterSlots)}
      </AdminLazyDetails>
    </div>
  )
}
