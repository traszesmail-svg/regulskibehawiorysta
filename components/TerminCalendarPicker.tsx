'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { CalendarDays, Cat, Check, Clock3, Dog, Headphones, Lightbulb, PawPrint, Tag, Video } from 'lucide-react'
import { BookingForm, type BookingCreatedPayload } from '@/components/BookingForm'
import { PaymentActions } from '@/components/PaymentActions'
import { trackAnalyticsEvent } from '@/lib/analytics'
import type { BookingServiceType } from '@/lib/booking-services'
import type { AnimalType, ProblemType } from '@/lib/types'

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
  serviceType: BookingServiceType
  problemType: ProblemType
  problemLabel: string
  species: 'pies' | 'kot' | 'inne'
  animalType: AnimalType
  modeLabel: string
  priceLabel: string
  priceAmount: number
  slotSummary: string
  contactHref: string
  roomAccessLabel: string
  qaBooking: boolean
}

export type TerminCalendarPaymentConfig = {
  manualAvailable: boolean
  manualPhoneDisplay?: string | null
  manualPaypalMeDisplay?: string | null
  manualPaypalMeHref?: string | null
  manualAccountName?: string | null
  manualInstructions?: string | null
  manualSummary: string
}

type TerminCalendarPickerProps = {
  monthLabel: string
  slotCount: number
  days: TerminCalendarDay[]
  summary: TerminCalendarSummary
  paymentConfig: TerminCalendarPaymentConfig
  choicePanel?: ReactNode
}

const weekdayLabels = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'] as const

function getSpeciesIcon(species: TerminCalendarSummary['species']) {
  if (species === 'kot') return Cat
  if (species === 'pies') return Dog
  return PawPrint
}

export function TerminCalendarPicker({ monthLabel, slotCount, days, summary, paymentConfig, choicePanel }: TerminCalendarPickerProps) {
  const allVisibleSlots = useMemo(() => days.flatMap((day) => day.slots), [days])
  const flatSlots = useMemo(() => allVisibleSlots.filter((slot) => slot.isBookable), [allVisibleSlots])
  const isUrgentBooking = summary.serviceType === 'kwadrans-na-juz'
  const nearestSlots = isUrgentBooking ? allVisibleSlots : flatSlots.slice(0, 5)
  const firstAvailableDay = days.find((day) => day.availableSlotCount > 0) ?? days.find((day) => day.isInPrimaryMonth) ?? days[0] ?? null
  const [selectedDayDate, setSelectedDayDate] = useState(firstAvailableDay?.date ?? '')
  const [selectedSlotId, setSelectedSlotId] = useState(flatSlots[0]?.id ?? '')
  const [createdBooking, setCreatedBooking] = useState<BookingCreatedPayload | null>(null)
  const inlineFlowRef = useRef<HTMLElement | null>(null)
  const selectedDay = days.find((day) => day.date === selectedDayDate) ?? firstAvailableDay
  const selectedDayAvailableSlots = selectedDay?.slots.filter((slot) => slot.isBookable) ?? []
  const selectedSlot = selectedDayAvailableSlots.find((slot) => slot.id === selectedSlotId) ?? selectedDayAvailableSlots[0] ?? null
  const SpeciesIcon = getSpeciesIcon(summary.species)
  const ModeIcon = summary.modeLabel.toLowerCase().includes('video') ? Video : Headphones
  const speciesLabel = summary.species === 'kot' ? 'Kot' : summary.species === 'pies' ? 'Pies' : 'Do wyboru'
  const petVisualSrc = summary.species === 'kot' ? '/wybor/cat-choice-avatar.png' : '/wybor/dog-choice-avatar.png'
  const petVisualAlt = summary.species === 'kot' ? 'Spokojny kot' : 'Spokojny pies'

  useEffect(() => {
    setCreatedBooking(null)
  }, [selectedSlotId])

  function scrollToInlineFlow() {
    window.requestAnimationFrame(() => {
      inlineFlowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  function chooseDay(day: TerminCalendarDay) {
    setSelectedDayDate(day.date)
    setSelectedSlotId(day.slots.find((slot) => slot.isBookable)?.id ?? '')
  }

  function trackSlotSelect(slot: TerminCalendarSlot, location: string) {
    trackAnalyticsEvent('booking_slot_selected', {
      location,
      slot_id: slot.id,
      slot_date: slot.date,
      slot_time: slot.time,
      service: slot.serviceType,
    })
  }

  function chooseSlot(slot: TerminCalendarSlot) {
    if (!slot.isBookable) {
      return
    }

    setSelectedSlotId(slot.id)
    trackSlotSelect(slot, 'termin-calendar')
  }

  function activateSlotInline(slot: TerminCalendarSlot) {
    if (!slot.isBookable) {
      return
    }

    setSelectedDayDate(slot.date)
    setSelectedSlotId(slot.id)
    scrollToInlineFlow()
  }

  function handleNearestSlotClick(event: MouseEvent<HTMLAnchorElement>, slot: TerminCalendarSlot) {
    event.preventDefault()
    trackSlotSelect(slot, 'termin-nearest-slots')
    activateSlotInline(slot)
  }

  function handleSummarySlotClick(event: MouseEvent<HTMLAnchorElement>, selectedSlot: TerminCalendarSlot) {
    event.preventDefault()
    trackSlotSelect(selectedSlot, 'termin-summary')
    activateSlotInline(selectedSlot)
  }

  function handleBookingCreated(booking: BookingCreatedPayload) {
    setCreatedBooking(booking)
    scrollToInlineFlow()
  }

  const inlineFlowStep = createdBooking ? 2 : selectedSlot ? 1 : 0

  return (
    <div className={`termin-calendar-layout${isUrgentBooking ? ' termin-calendar-layout-urgent' : ''}`}>
      <div className="termin-calendar-board">
        {isUrgentBooking || nearestSlots.length > 0 ? (
          <section className="termin-nearest-slots" aria-label="Najbliższe dostępne terminy">
            <div className="termin-nearest-slots-head">
              <span>{isUrgentBooking ? 'Najbliższe terminy' : '1. Najbliższe terminy'}</span>
              <strong>Wybierz od razu, jeśli chcesz szybciej przejść dalej.</strong>
            </div>
            <div className="termin-nearest-slot-list">
              {nearestSlots.map((slot) =>
                slot.href && slot.isBookable ? (
                  <Link
                    key={slot.id}
                    href={slot.href}
                    prefetch={false}
                    className="termin-nearest-slot-link"
                    data-nearest-slot-link="true"
                    data-slot-id={slot.id}
                    onClick={(event) => handleNearestSlotClick(event, slot)}
                  >
                    <span>{slot.dateLabel}</span>
                    <strong>{slot.time}</strong>
                    <small>{slot.serviceTitle}</small>
                  </Link>
                ) : (
                  <span key={slot.id} className="termin-nearest-slot-link is-disabled" aria-disabled="true">
                    <span>{slot.dateLabel}</span>
                    <strong>{slot.time}</strong>
                    <small>{slot.statusLabel}</small>
                  </span>
                ),
              )}
            </div>
          </section>
        ) : null}

        {isUrgentBooking && nearestSlots.length === 0 ? (
          <p className="termin-nearest-empty">Brak wolnego okna dziś i jutro. Opisz krótko, co się dzieje.</p>
        ) : null}

        {!isUrgentBooking ? <div className="termin-calendar-toolbar">
          <div>
            <span>2. Wybierz datę</span>
            <strong>{monthLabel}</strong>
          </div>
          <p>
            {slotCount > 0 ? `${slotCount} dostępnych terminów` : 'Brak dostępnych terminów'} / {summary.serviceBadge}
          </p>
        </div> : null}

        {!isUrgentBooking ? <div className="termin-calendar-weekdays" aria-hidden="true">
          {weekdayLabels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div> : null}

        {!isUrgentBooking ? <div className="termin-calendar-grid" aria-label="Kalendarz dostępnych terminów">
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
                data-calendar-date={day.date}
              >
                <span>
                  <strong>{day.dayNumber}</strong>
                  <small>{day.monthLabel}</small>
                </span>
                <em>{day.availableSlotCount > 0 ? `${day.availableSlotCount} terminów` : day.statusLabel}</em>
              </button>
            </article>
          ))}
        </div> : null}

        {!isUrgentBooking ? <div className="termin-calendar-time-panel">
          <div className="termin-calendar-time-head">
            <h3>3. Wybierz godzinę</h3>
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
                  data-slot-id={slot.id}
                  data-slot-time={slot.time}
                >
                  <span>{slot.time}</span>
                  {!slot.isBookable ? <small>{slot.statusLabel}</small> : null}
                </button>
              ))}
            </div>
          ) : (
            <div className="termin-time-empty">Brak terminów w tym dniu.</div>
          )}
        </div> : null}
        {!isUrgentBooking ? <div className="termin-calendar-hint-card">
          <span aria-hidden="true">
            <Lightbulb size={23} strokeWidth={1.85} />
          </span>
          <div>
            <strong>Nie wiesz, którą godzinę wybrać?</strong>
            <p>Wybierz moment, w którym możesz spokojnie skupić się na rozmowie. Szczegóły doprecyzujemy w formularzu.</p>
          </div>
        </div> : null}
        {!isUrgentBooking ? <div className="termin-calendar-pet-visual" aria-hidden="true">
          <Image src={petVisualSrc} alt={petVisualAlt} fill sizes="(max-width: 680px) 320px, 360px" />
        </div> : null}
        {!isUrgentBooking && choicePanel ? <div className="termin-calendar-choice-slot">{choicePanel}</div> : null}
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
          <Link
            href={selectedSlot.href}
            prefetch={false}
            className="notatnik-btn termin-summary-cta"
            data-selected-slot-link="true"
            data-slot-id={selectedSlot.id}
            onClick={(event) => handleSummarySlotClick(event, selectedSlot)}
          >
            <CalendarDays size={17} strokeWidth={1.9} aria-hidden="true" />
            <span>Uzupełnij dane</span>
          </Link>
        ) : (
          <Link href={summary.contactHref} prefetch={false} className="notatnik-btn termin-summary-cta">
            <span>Opisz krótko, co się dzieje.</span>
          </Link>
        )}
        <small>Dane i płatność pojawią się niżej, bez otwierania osobnego ekranu.</small>
      </aside>

      <section
        ref={inlineFlowRef}
        id="rezerwacja"
        className="termin-inline-booking-flow"
        data-inline-booking-flow="true"
        data-inline-booking-state={createdBooking ? 'payment' : selectedSlot ? 'details' : 'slot'}
        aria-live="polite"
      >
        <div className="termin-inline-flow-head">
          <div>
            <span className="termin-inline-flow-eyebrow">Rezerwacja bez przeładowania strony</span>
            <h2>{createdBooking ? 'Wybierz płatność albo wpisz kod' : 'Uzupełnij dane do wybranego terminu'}</h2>
            <p>
              {selectedSlot
                ? `${selectedSlot.dateLabel}, ${selectedSlot.time}. Dane i płatność zostają w tym samym widoku.`
                : 'Wybierz dzień i godzinę, a formularz pojawi się tutaj.'}
            </p>
          </div>
          <div className="termin-inline-flow-steps" aria-label="Etapy rezerwacji w tym widoku">
            {['Termin', 'Dane', 'Płatność'].map((step, index) => (
              <span key={step} className={index === inlineFlowStep ? 'is-active' : index < inlineFlowStep ? 'is-complete' : ''}>
                <strong>{index + 1}</strong>
                {step}
              </span>
            ))}
          </div>
        </div>

        {selectedSlot ? (
          <div className="termin-inline-flow-body">
            {createdBooking ? (
              <div className="termin-inline-payment-panel">
                <div className="notatnik-callout">
                  Termin jest zapisany i trzymany na czas płatności. Możesz użyć kodu od lecznicy albo przejść standardową płatnością.
                </div>
                <PaymentActions
                  bookingId={createdBooking.bookingId}
                  accessToken={createdBooking.accessToken}
                  amountLabel={createdBooking.amountLabel ?? summary.priceLabel}
                  manualAmountLabel={createdBooking.manualAmountLabel ?? null}
                  paymentReference={createdBooking.paymentReference ?? `B15-${createdBooking.bookingId.replace(/-/g, '').slice(0, 12).toUpperCase()}`}
                  manualAvailable={paymentConfig.manualAvailable}
                  manualPhoneDisplay={paymentConfig.manualPhoneDisplay}
                  manualPaypalMeDisplay={paymentConfig.manualPaypalMeDisplay}
                  manualPaypalMeHref={paymentConfig.manualPaypalMeHref}
                  manualAccountName={paymentConfig.manualAccountName}
                  manualInstructions={paymentConfig.manualInstructions}
                  manualSummary={paymentConfig.manualSummary}
                  customerEmailAvailable={createdBooking.customerEmailAvailable ?? true}
                  serviceType={summary.serviceType}
                  amount={createdBooking.amount ?? summary.priceAmount}
                  animalType={summary.animalType}
                  problemType={summary.problemType}
                  bookingStatus="pending"
                  qaBooking={summary.qaBooking}
                  qaEligibility={createdBooking.qaEligibility ?? null}
                  sourcePage="/book"
                  roomAccessLabel={summary.roomAccessLabel}
                />
              </div>
            ) : (
              <BookingForm
                key={selectedSlot.id}
                problemType={summary.problemType}
                serviceType={summary.serviceType}
                slotId={selectedSlot.id}
                slotLabel={`${selectedSlot.dateLabel}, ${selectedSlot.time}`}
                amountLabel={summary.priceLabel}
                qaBooking={summary.qaBooking}
                sourcePage="/book"
                submitLabel="Dalej"
                submittingLabel="Zapisuję termin..."
                onBookingCreated={handleBookingCreated}
              />
            )}
          </div>
        ) : (
          <div className="termin-inline-flow-empty">
            <CalendarDays size={24} strokeWidth={1.8} aria-hidden="true" />
            <span>Najpierw wybierz dostępny termin z kalendarza.</span>
          </div>
        )}
      </section>
    </div>
  )
}
