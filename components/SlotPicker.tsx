'use client'

import { useMemo, useState } from 'react'

export type SlotPickerMode = 'standard' | 'urgent' | 'full-consultation'

type SlotPickerProps = {
  onChange: (formatted: string) => void
  mode?: SlotPickerMode
  className?: string
}

const CONFIRMED_TIMES = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30']

const QUESTION_TIMES = [
  '12:20',
  '12:40',
  '13:00',
  '13:20',
  '13:40',
  '14:00',
  '14:20',
  '14:40',
  '15:00',
  '15:20',
  '15:40',
  '16:00',
  '16:20',
  '16:40',
]

const BOOKED_STANDARD: Record<number, string[]> = {
  0: ['07:30', '07:00'],
  1: ['07:30', '07:00'],
  2: ['07:30', '07:00'],
  3: ['07:30', '07:00'],
  4: ['07:30', '07:00'],
}

const BOOKED_FULL: Record<number, string[]> = {
  0: ['06:00'],
  1: ['06:00'],
  2: ['06:00'],
  3: ['06:00'],
  4: ['06:00'],
  5: ['07:00'],
}

const PL_DAYS = ['pon', 'wt', 'śr', 'czw', 'pt', 'sob']

function jsToWeekIndex(date: Date): number {
  const day = date.getDay()
  return day === 0 ? 6 : day - 1
}

function dayLabel(date: Date): string {
  return `${PL_DAYS[jsToWeekIndex(date)]} ${date.getDate()}.${String(date.getMonth() + 1).padStart(2, '0')}`
}

function slotId(date: Date, time: string): string {
  return `${date.toISOString().slice(0, 10)}-${time}`
}

function formatForField(selected: string[], days: Date[]): string {
  return selected
    .map((id) => {
      const dateStr = id.slice(0, 10)
      const time = id.slice(11)
      const day = days.find((candidate) => candidate.toISOString().slice(0, 10) === dateStr)
      return day ? `${dayLabel(day)} godz. ${time}` : id
    })
    .join('; ')
}

function addDays(base: Date, offset: number): Date {
  const date = new Date(base)
  date.setDate(date.getDate() + offset)
  date.setHours(0, 0, 0, 0)
  return date
}

function getStandardDays(minDaysAhead: number, count: number): Date[] {
  const days: Date[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let offset = minDaysAhead

  while (days.length < count) {
    const candidate = addDays(today, offset)
    if (jsToWeekIndex(candidate) < 5) {
      days.push(candidate)
    }
    offset += 1
  }

  return days
}

function getUrgentDays(): Date[] {
  const days: Date[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i <= 2; i += 1) {
    const candidate = addDays(today, i)
    if (jsToWeekIndex(candidate) < 5) {
      days.push(candidate)
    }
  }

  return days
}

function getFullConsultDays(count: number): Date[] {
  const days: Date[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let offset = 1

  while (days.length < count) {
    const candidate = addDays(today, offset)
    if (jsToWeekIndex(candidate) !== 6) {
      days.push(candidate)
    }
    offset += 1
  }

  return days.slice(0, count)
}

function formatFreeLabel(confirmedCount: number, pendingCount: number) {
  const freeLabel = confirmedCount === 1 ? '1 wolny termin' : `${confirmedCount} wolne terminy`
  return pendingCount > 0 ? `${freeLabel} + ${pendingCount} do potwierdzenia` : freeLabel
}

export function SlotPicker({ onChange, mode = 'standard', className }: SlotPickerProps) {
  const days = useMemo(() => {
    if (mode === 'urgent') return getUrgentDays()
    if (mode === 'full-consultation') return getFullConsultDays(10)
    return getStandardDays(4, 14)
  }, [mode])

  const [activeDay, setActiveDay] = useState<Date | null>(null)
  const [selected, setSelected] = useState<string[]>([])

  function toggleSlot(id: string) {
    let next: string[]

    if (selected.includes(id)) {
      next = selected.filter((value) => value !== id)
    } else if (selected.length >= 3) {
      next = [...selected.slice(1), id]
    } else {
      next = [...selected, id]
    }

    setSelected(next)
    onChange(formatForField(next, days))
  }

  function getConfirmedTimes(date: Date): string[] {
    if (mode === 'full-consultation') {
      return jsToWeekIndex(date) === 5 ? ['10:00'] : ['09:00']
    }

    return CONFIRMED_TIMES
  }

  function getQuestionTimes(): string[] {
    return mode === 'urgent' ? QUESTION_TIMES : []
  }

  function getBookedTimes(date: Date): string[] {
    if (mode === 'full-consultation') return BOOKED_FULL[jsToWeekIndex(date)] ?? []
    return BOOKED_STANDARD[jsToWeekIndex(date)] ?? []
  }

  return (
    <div className={className}>
      {mode === 'full-consultation' && (
        <div className="field-help" style={{ marginBottom: '10px' }}>
          Pełna konsultacja: pon.-pt. 09:00, sobota 10:00. Termin potwierdzam w ciągu 24 godzin.
        </div>
      )}
      {mode === 'urgent' && (
        <div className="field-help" style={{ marginBottom: '10px' }}>
          Terminy oznaczone ? wymagają potwierdzenia. Odpowiadam priorytetowo w godzinach dyżuru.
        </div>
      )}

      <div className="slot-picker-days">
        {days.map((day) => {
          const confirmed = getConfirmedTimes(day)
          const question = getQuestionTimes()
          const isActive = activeDay?.toISOString().slice(0, 10) === day.toISOString().slice(0, 10)
          const hasSelected = confirmed.some((time) => selected.includes(slotId(day, time)))

          return (
            <button
              key={day.toISOString()}
              type="button"
              className={`slot-day-btn${isActive ? ' slot-day-btn--active' : ''}${hasSelected ? ' slot-day-btn--picked' : ''}`}
              onClick={() => setActiveDay(isActive ? null : day)}
              aria-expanded={isActive}
            >
              <span className="slot-day-label">{dayLabel(day)}</span>
              <span className="slot-day-count">{formatFreeLabel(confirmed.length, question.length)}</span>
            </button>
          )
        })}
      </div>

      {activeDay &&
        (() => {
          const confirmed = getConfirmedTimes(activeDay)
          const question = getQuestionTimes()
          const booked = getBookedTimes(activeDay)
          const allTimes = [...booked, ...confirmed].sort()

          return (
            <div className="slot-times">
              <div className="slot-times-label">
                {dayLabel(activeDay)} — {confirmed.length === 1 ? '1 wolny termin' : `${confirmed.length} wolne terminy`}
                {question.length > 0 && `, ${question.length} do potwierdzenia`}
              </div>
              <div className="slot-times-grid">
                {allTimes.map((time) => {
                  const isConfirmed = confirmed.includes(time)
                  const id = slotId(activeDay, time)
                  const isPicked = selected.includes(id)

                  return (
                    <button
                      key={time}
                      type="button"
                      disabled={!isConfirmed}
                      aria-pressed={isPicked}
                      className={`slot-time-chip${!isConfirmed ? ' slot-time-chip--booked' : ''}${isPicked ? ' slot-time-chip--picked' : ''}`}
                      onClick={() => isConfirmed && toggleSlot(id)}
                    >
                      {time}
                      {!isConfirmed && <span className="slot-time-chip-tag">zajęte</span>}
                      {isPicked && <span className="slot-time-chip-tag">✓</span>}
                    </button>
                  )
                })}

                {question.length > 0 && (
                  <>
                    <div className="slot-times-section-label" style={{ gridColumn: '1/-1', marginTop: 8, fontSize: 12, opacity: 0.7 }}>
                      Terminy oznaczone ? wymagają potwierdzenia — odpowiadam priorytetowo w godzinach dyżuru.
                    </div>
                    {question.map((time) => {
                      const id = slotId(activeDay, time)
                      const isPicked = selected.includes(id)

                      return (
                        <button
                          key={`q-${time}`}
                          type="button"
                          aria-pressed={isPicked}
                          className={`slot-time-chip slot-time-chip--question${isPicked ? ' slot-time-chip--picked' : ''}`}
                          onClick={() => toggleSlot(id)}
                        >
                          {time}
                          <span className="slot-time-chip-tag">?</span>
                          {isPicked && <span className="slot-time-chip-tag">✓</span>}
                        </button>
                      )
                    })}
                  </>
                )}
              </div>
            </div>
          )
        })()}

      {selected.length > 0 && (
        <div className="slot-summary">
          <strong>Wybrane terminy:</strong> {formatForField(selected, days)}
          {selected.length < 2 && <span className="slot-summary-hint"> — możesz dodać jeszcze 1-2 opcje</span>}
        </div>
      )}
    </div>
  )
}
