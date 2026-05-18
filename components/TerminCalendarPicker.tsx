'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState, type ReactNode } from 'react'
import { CalendarDays, Cat, Check, Clock3, Dog, Headphones, Lightbulb, PawPrint, Tag, Video } from 'lucide-react'
import { trackAnalyticsEvent } from '@/lib/analytics'

export type TerminCalendarSlot = {
  id: string
  date: string
  dateLabel: string
  time: string
  href: string | null
  serviceType: string
  serviceTitle: string
  state: 'available' | 'booked' | 'locked' | 'outside_window' | 'unavailable' | 'reserved_for_urgent'
  statusLabel: 'Dostępny' | 'Zajęte' | 'Niedostępne'
  reasonLabel: string
  isBookable: boolean
}

export type TerminCalendarDay = {
  date: string
  dayNumber: number
  monthLabel: string
  isInPrimaryMonth: boolean
  label: string
  availableSlotCount: number
  statusLabel: string
  slots: TerminCalendarSlot[]
}

export type TerminCalendarSummary = {
  serviceTitle: string
  serviceShortTitle: string
  serviceBadge: string
  problemLabel: string
  species: 'pies' | 'kot' | 'inne'
  modeLabel: string
  priceLabel: string
  slotSummary: string
  contactHref: string
}

type TerminCalendarPickerProps = {
  monthLabel: string
  slotCount: number
  days: TerminCalendarDay[]
  summary: TerminCalendarSummary
  choicePanel?: ReactNode
}

const weekdayLabels = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'] as const

function getSpeciesIcon(species: TerminCalendarSummary['species']) {
  if (species === 'kot') return Cat
  if (species === 'pies') return Dog
  return PawPrint
}

export function TerminCalendarPicker({ monthLabel, slotCount, days, summary, choicePanel }: TerminCalendarPickerProps) {
  const flatSlots = useMemo(() => days.flatMap((day) => day.slots.filter((slot) => slot.isBookable)), [days])
  const firstAvailableDay = days.find((day) => day.availableSlotCount > 0) ?? days.find((day) => day.isInPrimaryMonth) ?? days[0] ?? null
  const [selectedDayDate, setSelectedDayDate] = useState(firstAvailableDay?.date ?? '')
  const [selectedSlotId, setSelectedSlotId] = useState(flatSlots[0]?.id ?? '')
  const selectedDay = days.find((day) => day.date === selectedDayDate) ?? firstAvailableDay
  const selectedDayAvailableSlots = selectedDay?.slots.filter((slot) => slot.isBookable) ?? []
  const selectedSlot = selectedDayAvailableSlots.find((slot) => slot.id === selectedSlotId) ?? selectedDayAvailableSlots[0] ?? null
  const SpeciesIcon = getSpeciesIcon(summary.species)
  const ModeIcon = summary.modeLabel.toLowerCase().includes('video') ? Video : Headphones
  const speciesLabel = summary.species === 'kot' ? 'Kot' : summary.species === 'pies' ? 'Pies' : 'Do wyboru'
  const petVisualSrc = summary.species === 'kot' ? '/wybor/cat-choice-avatar.png' : '/wybor/dog-choice-avatar.png'
  const petVisualAlt = summary.species === 'kot' ? 'Spokojny kot' : 'Spokojny pies'

  function chooseDay(day: TerminCalendarDay) {
    setSelectedDayDate(day.date)
    setSelectedSlotId(day.slots.find((slot) => slot.isBookable)?.id ?? '')
  }

  function chooseSlot(slot: TerminCalendarSlot) {
    if (!slot.isBookable) {
      return
    }

    setSelectedSlotId(slot.id)
    trackAnalyticsEvent('booking_slot_selected', {
      location: 'termin-calendar',
      slot_id: slot.id,
      slot_date: slot.date,
      slot_time: slot.time,
      service: slot.serviceType,
    })
  }

  return (
    <div className="termin-calendar-layout">
      <div className="termin-calendar-board">
        <div className="termin-calendar-toolbar">
          <div>
            <span>1. Wybierz datę</span>
            <strong>{monthLabel}</strong>
          </div>
          <p>
            {slotCount > 0 ? `${slotCount} dostępnych terminów` : 'Brak dostępnych terminów'} / {summary.serviceBadge}
          </p>
        </div>

        <div className="termin-calendar-weekdays" aria-hidden="true">
          {weekdayLabels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>

        <div className="termin-calendar-grid" aria-label="Kalendarz dostępnych terminów">
          {days.map((day) => (
            <article
              key={day.date}
              className={`termin-calendar-day${day.availableSlotCount > 0 ? ' has-slots' : ''}${day.slots.length > 0 ? ' has-visible-slots' : ''}${day.isInPrimaryMonth ? '' : ' is-muted'}`}
            >
              <button
                type="button"
                className={`termin-calendar-date-button${selectedDay?.date === day.date ? ' is-selected' : ''}`}
                onClick={() => chooseDay(day)}
                aria-pressed={selectedDay?.date === day.date}
              >
                <span>
                  <strong>{day.dayNumber}</strong>
                  <small>{day.monthLabel}</small>
                </span>
                <em>{day.availableSlotCount > 0 ? `${day.availableSlotCount} terminów` : day.statusLabel}</em>
              </button>
            </article>
          ))}
        </div>

        <div className="termin-calendar-time-panel">
          <div className="termin-calendar-time-head">
            <h3>2. Wybierz godzinę</h3>
            <p>{selectedDay ? selectedDay.label : 'Brak wybranej daty'}</p>
          </div>
          {selectedDay && selectedDay.slots.length > 0 ? (
            <div className="termin-calendar-times">
              {selectedDay.slots.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  className={`termin-slot-button${selectedSlot?.id === slot.id ? ' is-selected' : ''}${slot.isBookable ? '' : ' is-disabled'} is-${slot.state}`}
                  aria-pressed={selectedSlot?.id === slot.id}
                  aria-label={`${slot.time}. ${slot.reasonLabel}`}
                  disabled={!slot.isBookable}
                  onClick={() => chooseSlot(slot)}
                >
                  <span>{slot.time}</span>
                  {!slot.isBookable ? <small>{slot.statusLabel}</small> : null}
                </button>
              ))}
            </div>
          ) : (
            <div className="termin-time-empty">Brak terminów w tym dniu.</div>
          )}
        </div>
        <div className="termin-calendar-hint-card">
          <span aria-hidden="true">
            <Lightbulb size={23} strokeWidth={1.85} />
          </span>
          <div>
            <strong>Nie wiesz, którą godzinę wybrać?</strong>
            <p>Wybierz moment, w którym możesz spokojnie skupić się na rozmowie. Szczegóły doprecyzujemy w formularzu.</p>
          </div>
        </div>
        <div className="termin-calendar-pet-visual" aria-hidden="true">
          <Image src={petVisualSrc} alt={petVisualAlt} fill sizes="(max-width: 680px) 320px, 360px" />
        </div>
        {choicePanel ? <div className="termin-calendar-choice-slot">{choicePanel}</div> : null}
      </div>

      <aside className="termin-calendar-summary" aria-label="Podsumowanie rezerwacji">
        <h2>Podsumowanie</h2>
        <div className="termin-calendar-summary-list">
          <span>
            <SpeciesIcon size={22} strokeWidth={1.8} aria-hidden="true" />
            <small>Gatunek</small>
            <strong>{speciesLabel}</strong>
          </span>
          <span>
            <PawPrint size={22} strokeWidth={1.8} aria-hidden="true" />
            <small>Temat konsultacji</small>
            <strong>{summary.problemLabel}</strong>
          </span>
          <span>
            <CalendarDays size={22} strokeWidth={1.8} aria-hidden="true" />
            <small>Data</small>
            <strong>{selectedSlot ? selectedSlot.dateLabel : 'Brak terminów'}</strong>
          </span>
          <span>
            <Clock3 size={22} strokeWidth={1.8} aria-hidden="true" />
            <small>Godzina</small>
            <strong>{selectedSlot ? selectedSlot.time : 'Brak terminów'}</strong>
          </span>
          <span>
            <ModeIcon size={22} strokeWidth={1.8} aria-hidden="true" />
            <small>Forma</small>
            <strong>{summary.modeLabel}</strong>
          </span>
          <span>
            <Tag size={22} strokeWidth={1.8} aria-hidden="true" />
            <small>Cena</small>
            <strong>{summary.priceLabel}</strong>
          </span>
        </div>

        <div className="termin-calendar-summary-note">
          <Check size={18} strokeWidth={2} aria-hidden="true" />
          <div>
            <strong>W ramach konsultacji otrzymasz:</strong>
            <ul>
              <li>{summary.slotSummary}</li>
              <li>Indywidualne wskazówki</li>
              <li>Podsumowanie zaleceń e-mail</li>
            </ul>
          </div>
        </div>

        {selectedSlot?.href ? (
          <Link href={selectedSlot.href} prefetch={false} className="notatnik-btn termin-summary-cta">
            <CalendarDays size={17} strokeWidth={1.9} aria-hidden="true" />
            <span>Zarezerwuj wybrany termin</span>
          </Link>
        ) : (
          <Link href={summary.contactHref} prefetch={false} className="notatnik-btn termin-summary-cta">
            <span>Opisz krótko, co się dzieje</span>
          </Link>
        )}
        <small>Płatność i rezerwacja online po wypełnieniu formularza.</small>
      </aside>
    </div>
  )
}
