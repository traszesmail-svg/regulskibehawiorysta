'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, LockKeyhole } from 'lucide-react'
import { getBookingAnalyticsContextParams } from '@/lib/analytics-schema'
import { trackAnalyticsEvent } from '@/lib/analytics'
import {
  DEFAULT_BOOKING_SERVICE,
  type BookingServiceType,
} from '@/lib/booking-services'
import { buildPaymentHref } from '@/lib/booking-routing'
import { isCatProblemType } from '@/lib/data'
import { AnimalType, ProblemType } from '@/lib/types'

interface BookingFormProps {
  problemType: ProblemType
  serviceType: BookingServiceType
  slotId: string
  slotLabel: string
  amountLabel: string
  qaBooking?: boolean
}

type BookingApiErrorCode = 'slot_unavailable' | 'booking_unavailable'

function getProblemFormCopy(problemType: ProblemType) {
  return {
    animalType: isCatProblemType(problemType) ? ('Kot' as AnimalType) : ('Pies' as AnimalType),
  }
}

function normalizeBookingErrorMessage(value: string) {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[łŁ]/g, 'l')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function isSlotUnavailableBookingMessage(value: string) {
  const normalized = normalizeBookingErrorMessage(value)

  return (
    normalized.includes('wybrany termin') &&
    (normalized.includes('nie jest już dostępny') ||
      normalized.includes('nie jest dostępny') ||
      normalized.includes('zostal przed chwila zajety') ||
      normalized.includes('zostal zajety') ||
      normalized.includes('slot no longer available') ||
      normalized.includes('already booked') ||
      normalized.includes('already reserved') ||
      normalized.includes('locked by booking id'))
  )
}

export function BookingForm({
  problemType,
  serviceType,
  slotId,
  slotLabel,
  amountLabel,
  qaBooking = false,
}: BookingFormProps) {
  const router = useRouter()
  const formCopy = getProblemFormCopy(problemType)
  const trackedStartRef = useRef(false)
  const [ownerName, setOwnerName] = useState('')
  const [description, setDescription] = useState('')
  const [email, setEmail] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [earlyStartAccepted, setEarlyStartAccepted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const animalType = formCopy.animalType

  useEffect(() => {
    if (qaBooking || trackedStartRef.current) {
      return
    }

    trackedStartRef.current = true
    trackAnalyticsEvent('booking_form_started', {
      slot_id: slotId,
      slot_time: slotLabel,
      source_page: '/form',
      ...getBookingAnalyticsContextParams({
        serviceType,
        animalType,
        problemType,
      }),
    })
  }, [animalType, problemType, qaBooking, serviceType, slotId, slotLabel])

  function isEmailValid(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!ownerName.trim() || !email.trim()) {
      setError('Podaj imię i adres e-mail, żeby potwierdzić termin.')
      return
    }

    if (!isEmailValid(email.trim())) {
      setError('Podaj poprawny adres e-mail. Na ten adres wyślę potwierdzenie rozmowy.')
      return
    }

    if (description.trim().length < 10) {
      setError('Napisz jednym zdaniem, z czym chcesz wejść na rozmowę.')
      return
    }

    if (!termsAccepted || !earlyStartAccepted) {
      setError('Zaakceptuj regulamin, politykę prywatności i zgodę na rozpoczęcie usługi przed upływem 14 dni, żeby przejść dalej.')
      return
    }

    setIsSubmitting(true)
    const normalizedDescription = description.trim()

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ownerName,
          serviceType,
          problemType,
          animalType,
          petAge: 'Nie podano w formularzu rezerwacji.',
          durationNotes: 'Nie podano w formularzu rezerwacji.',
          description: normalizedDescription,
          phone: '',
          email,
          slotId,
          qaBooking,
          consentTerms: termsAccepted,
          consentEarlyStart: earlyStartAccepted,
        }),
      })

      const payload = (await response.json()) as {
        bookingId?: string
        accessToken?: string
        error?: string
        errorCode?: BookingApiErrorCode
      }

      if (!response.ok || !payload.bookingId || !payload.accessToken) {
        if (payload.errorCode === 'slot_unavailable' || (typeof payload.error === 'string' && isSlotUnavailableBookingMessage(payload.error))) {
          setError('Ten termin został właśnie zajęty. Wróć do listy terminów i wybierz inną godzinę rozmowy.')
        } else {
          setError(payload.error ?? 'Rezerwacja chwilowo jest niedostępna. Odśwież stronę za moment i spróbuj ponownie.')
        }
        setIsSubmitting(false)
        return
      }

      trackAnalyticsEvent('booking_form_submitted', {
        booking_id: payload.bookingId,
        slot_id: slotId,
        slot_time: slotLabel,
        source_page: '/form',
        ...getBookingAnalyticsContextParams({
          serviceType,
          animalType,
          problemType,
        }),
      })

      router.push(
        buildPaymentHref(
          payload.bookingId,
          payload.accessToken,
          serviceType === DEFAULT_BOOKING_SERVICE ? null : serviceType,
          qaBooking,
        ),
      )
    } catch (submissionError) {
      console.error('[regulski-behawiorysta][booking-form] submit failed', submissionError)
      const message = submissionError instanceof Error ? submissionError.message : 'Wystąpił błąd formularza.'
      if (isSlotUnavailableBookingMessage(message)) {
        setError('Ten termin został właśnie zajęty. Wróć do listy terminów i wybierz inną godzinę rozmowy.')
      } else {
        setError(message)
      }
      setIsSubmitting(false)
    }
  }

  return (
    <form className="notatnik-form booking-details-form" onSubmit={handleSubmit} data-booking-form="details" data-qa-booking={qaBooking ? 'true' : 'false'}>
      {qaBooking ? <div className="notatnik-callout">To jest rezerwacja testowa. Przejdziesz przez kontrolowaną płatność bez realnego obciążenia klienta.</div> : null}

      <input type="hidden" name="animalType" value={animalType} />
      <input type="hidden" name="slotLabel" value={slotLabel} />

      <div className="booking-details-field">
        <label htmlFor="booking-owner-name">Imię i nazwisko</label>
        <input
          id="booking-owner-name"
          value={ownerName}
          onChange={(event) => setOwnerName(event.target.value)}
          placeholder="Wpisz swoje imię i nazwisko"
          data-booking-field="owner-name"
        />
      </div>

      <div className="booking-details-field">
        <label htmlFor="booking-email">Adres e-mail</label>
        <input
          id="booking-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Wpisz swój adres e-mail"
          data-booking-field="email"
        />
      </div>

      <div className="booking-details-field booking-details-field-wide">
        <label htmlFor="booking-description">Krótki opis problemu</label>
        <p>Wystarczy kilka zdań. Szczegóły możesz dopisać później w materiałach przed rozmową.</p>
        <textarea
          id="booking-description"
          rows={4}
          maxLength={500}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Napisz jednym zdaniem, z czym chcesz wejść na rozmowę."
          data-booking-field="description"
        />
        <small>{description.length} / 500</small>
      </div>

      <label className="booking-details-consent" htmlFor="booking-privacy">
        <input
          id="booking-privacy"
          type="checkbox"
          checked={termsAccepted}
          onChange={(event) => setTermsAccepted(event.target.checked)}
        />
        <span>
          Akceptuję{' '}
          <a href="/regulamin" target="_blank" rel="noopener noreferrer">
            regulamin usługi
          </a>{' '}
          i zapoznałem/am się z{' '}
          <a href="/polityka-prywatnosci" target="_blank" rel="noopener noreferrer">
            polityką prywatności
          </a>
          .
        </span>
      </label>

      <label className="booking-details-consent" htmlFor="booking-early-start">
        <input
          id="booking-early-start"
          type="checkbox"
          checked={earlyStartAccepted}
          onChange={(event) => setEarlyStartAccepted(event.target.checked)}
        />
        <span>
          Żądam rozpoczęcia świadczenia usługi przed upływem 14 dni i przyjmuję do wiadomości, że po wykonaniu konsultacji
          utracę prawo odstąpienia od umowy w zakresie wykonanej usługi.
        </span>
      </label>

      {error ? <div className="notatnik-callout notatnik-callout-error">{error}</div> : null}

      <button type="submit" className="booking-details-submit" disabled={isSubmitting} data-booking-submit="payment">
        <span>
          {isSubmitting
            ? 'Blokuję termin...'
            : qaBooking
              ? 'Blokuję termin i przechodzę do testowej płatności'
              : 'Blokuję termin i przechodzę dalej'}
        </span>
        <ArrowRight size={18} strokeWidth={1.9} aria-hidden="true" />
      </button>

      <div className="booking-details-safe-note">
        <LockKeyhole size={13} strokeWidth={1.9} aria-hidden="true" />
        <span>
          Po wysłaniu danych blokujemy wybrany termin na 15 minut. Rezerwacja jest pewna po opłaceniu i potwierdzeniu
          płatności. Do zapłaty w kolejnym kroku: {amountLabel}.
        </span>
      </div>
    </form>
  )
}
