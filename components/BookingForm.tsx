'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, LockKeyhole } from 'lucide-react'
import { getBookingAnalyticsContextParams } from '@/lib/analytics-schema'
import { trackAnalyticsEvent } from '@/lib/analytics'
import {
  DEFAULT_BOOKING_SERVICE,
  type BookingServiceType,
} from '@/lib/booking-services'
import { appendSearchParams, buildPaymentHref, buildSlotHref } from '@/lib/booking-routing'
import { isCatProblemType } from '@/lib/data'
import { clearCaseMapBookingHandoff, readCaseMapBookingHandoff } from '@/lib/case-map-booking-handoff'
import { clearQuizBookingHandoff, readQuizBookingHandoff } from '@/lib/quiz-booking-handoff'
import type { CaseMapProfileSnapshot } from '@/lib/case-map'
import { AnimalType, ProblemType, QaCheckoutEligibility } from '@/lib/types'

export type BookingCreatedPayload = {
  bookingId: string
  accessToken: string
  paymentReference?: string | null
  amount?: number
  amountLabel?: string | null
  manualAmountLabel?: string | null
  customerEmailAvailable?: boolean
  qaEligibility?: QaCheckoutEligibility | null
}

interface BookingFormProps {
  problemType: ProblemType
  serviceType: BookingServiceType
  slotId: string
  slotLabel: string
  amountLabel: string
  qaBooking?: boolean
  sourcePage?: string
  submitLabel?: string
  submittingLabel?: string
  onBookingCreated?: (booking: BookingCreatedPayload) => void
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

function getMarketingParamsFromBrowser() {
  if (typeof window === 'undefined') return {}

  const params: Record<string, string> = {}
  const source = new URLSearchParams(window.location.search)
  const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'] as const

  for (const key of keys) {
    const value = source.get(key)?.trim()
    if (value && value.length <= 120) params[key] = value
  }

  return params
}

export function BookingForm({
  problemType,
  serviceType,
  slotId,
  slotLabel,
  amountLabel,
  qaBooking = false,
  sourcePage = '/form',
  submitLabel,
  submittingLabel,
  onBookingCreated,
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
  const [errorActionHref, setErrorActionHref] = useState<string | null>(null)
  const [quizBrief, setQuizBrief] = useState('')
  const [caseMapId, setCaseMapId] = useState('')
  const [shareCaseMap, setShareCaseMap] = useState(false)
  const [caseMapProfileSnapshot, setCaseMapProfileSnapshot] = useState<CaseMapProfileSnapshot | null>(null)
  const [saveCaseMapToProfile, setSaveCaseMapToProfile] = useState(false)
  const animalType = formCopy.animalType

  useEffect(() => {
    const mapHandoff = readCaseMapBookingHandoff({
      problemType,
      serviceType,
      species: isCatProblemType(problemType) ? 'kot' : 'pies',
    })
    const handoff = mapHandoff ?? readQuizBookingHandoff({
      problemType,
      serviceType,
      species: isCatProblemType(problemType) ? 'kot' : 'pies',
    })

    setQuizBrief(handoff?.brief ?? '')
    setCaseMapId(mapHandoff?.caseMapId ?? '')
    setShareCaseMap(mapHandoff?.shareWithConsultant ?? false)
    setCaseMapProfileSnapshot(mapHandoff?.profileSnapshot ?? null)
    setSaveCaseMapToProfile(false)
  }, [problemType, serviceType])

  useEffect(() => {
    if (qaBooking || trackedStartRef.current) {
      return
    }

    trackedStartRef.current = true
    trackAnalyticsEvent('booking_form_started', {
      slot_id: slotId,
      slot_time: slotLabel,
      source_page: sourcePage,
      ...getBookingAnalyticsContextParams({
        serviceType,
        animalType,
        problemType,
      }),
    })
  }, [animalType, problemType, qaBooking, serviceType, slotId, slotLabel, sourcePage])

  function isEmailValid(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  }

  function getSlotPickerHref() {
    return buildSlotHref(problemType, serviceType === DEFAULT_BOOKING_SERVICE ? null : serviceType, qaBooking)
  }

  function showError(message: string, actionHref: string | null = null) {
    setError(message)
    setErrorActionHref(actionHref)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setErrorActionHref(null)

    if (!ownerName.trim() || !email.trim()) {
      showError('Podaj imię i adres e-mail, żeby potwierdzić termin.')
      return
    }

    if (!isEmailValid(email.trim())) {
      showError('Podaj poprawny adres e-mail. Na ten adres wyślę potwierdzenie rozmowy.')
      return
    }

    if (description.trim().length < 10) {
      showError('Napisz krótko, co się dzieje i z czym potrzebujesz pomocy.')
      return
    }

    if (!termsAccepted || !earlyStartAccepted) {
      showError('Zaakceptuj regulamin, politykę prywatności i zgodę na rozpoczęcie usługi przed upływem 14 dni, żeby przejść dalej.')
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
          durationNotes: quizBrief || 'Nie podano w formularzu rezerwacji.',
          caseMapId: caseMapId || undefined,
          shareCaseMap,
          saveCaseMapToProfile: saveCaseMapToProfile && Boolean(caseMapProfileSnapshot),
          caseMapProfileSnapshot: saveCaseMapToProfile ? caseMapProfileSnapshot : undefined,
          description: normalizedDescription,
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
        paymentReference?: string | null
        amount?: number
        amountLabel?: string | null
        manualAmountLabel?: string | null
        customerEmailAvailable?: boolean
        qaEligibility?: QaCheckoutEligibility | null
        error?: string
        errorCode?: BookingApiErrorCode
      }

      if (!response.ok || !payload.bookingId || !payload.accessToken) {
        if (payload.errorCode === 'slot_unavailable' || (typeof payload.error === 'string' && isSlotUnavailableBookingMessage(payload.error))) {
          showError('Ten termin został właśnie zajęty. Wróć do listy terminów i wybierz inną godzinę rozmowy.', getSlotPickerHref())
        } else {
          showError(payload.error ?? 'Rezerwacja chwilowo jest niedostępna. Odśwież stronę za moment i spróbuj ponownie.')
        }
        setIsSubmitting(false)
        return
      }

      trackAnalyticsEvent('booking_form_submitted', {
        booking_id: payload.bookingId,
        slot_id: slotId,
        slot_time: slotLabel,
        source_page: sourcePage,
        ...getBookingAnalyticsContextParams({
          serviceType,
          animalType,
          problemType,
        }),
      })

      clearQuizBookingHandoff()
      clearCaseMapBookingHandoff()

      if (onBookingCreated) {
        onBookingCreated({
          bookingId: payload.bookingId,
          accessToken: payload.accessToken,
          paymentReference: payload.paymentReference ?? null,
          amount: payload.amount,
          amountLabel: payload.amountLabel ?? null,
          manualAmountLabel: payload.manualAmountLabel ?? null,
          customerEmailAvailable: payload.customerEmailAvailable,
          qaEligibility: payload.qaEligibility ?? null,
        })
        setIsSubmitting(false)
        return
      }

      router.push(
        appendSearchParams(
          buildPaymentHref(
            payload.bookingId,
            payload.accessToken,
            serviceType === DEFAULT_BOOKING_SERVICE ? null : serviceType,
            qaBooking,
          ),
          getMarketingParamsFromBrowser(),
        ),
      )
    } catch (submissionError) {
      console.error('[regulski-behawiorysta][booking-form] submit failed', submissionError)
      const message = submissionError instanceof Error ? submissionError.message : 'Wystąpił błąd formularza.'
      if (isSlotUnavailableBookingMessage(message)) {
        showError('Ten termin został właśnie zajęty. Wróć do listy terminów i wybierz inną godzinę rozmowy.', getSlotPickerHref())
      } else {
        showError(message)
      }
      setIsSubmitting(false)
    }
  }

  return (
    <form
      className="notatnik-form booking-details-form"
      action="/api/bookings"
      method="post"
      onSubmit={handleSubmit}
      data-booking-form="details"
      data-qa-booking={qaBooking ? 'true' : 'false'}
    >
      {qaBooking ? <div className="notatnik-callout">To jest rezerwacja testowa. Przejdziesz przez kontrolowaną płatność bez realnego obciążenia klienta.</div> : null}

      <input type="hidden" name="animalType" value={animalType} />
      <input type="hidden" name="problemType" value={problemType} />
      <input type="hidden" name="serviceType" value={serviceType} />
      <input type="hidden" name="slotId" value={slotId} />
      <input type="hidden" name="slotLabel" value={slotLabel} />
      <input type="hidden" name="petAge" value="Nie podano w formularzu rezerwacji." />
      <input type="hidden" name="durationNotes" value={quizBrief || 'Nie podano w formularzu rezerwacji.'} />
      {caseMapId ? <input type="hidden" name="caseMapId" value={caseMapId} /> : null}
      {shareCaseMap ? <input type="hidden" name="shareCaseMap" value="true" /> : null}
      {qaBooking ? <input type="hidden" name="qaBooking" value="true" /> : null}

      <div className="booking-details-field">
        <label htmlFor="booking-owner-name">Imię i nazwisko</label>
        <input
          id="booking-owner-name"
          name="ownerName"
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
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Wpisz swój adres e-mail"
          data-booking-field="email"
        />
      </div>

      <div className="booking-details-field booking-details-field-wide">
        {quizBrief ? (
          <div className="notatnik-callout">
            <strong>Kontekst z Mapy zachowania</strong>
            <p>{quizBrief}</p>
          </div>
        ) : null}
        <label htmlFor="booking-description">Krótko opisz, co się dzieje</label>
        <p>Wystarczą 2-3 proste zdania. Szczegóły będzie można dopisać później, już po rezerwacji.</p>
        <textarea
          id="booking-description"
          name="description"
          rows={4}
          maxLength={500}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Na przykład: od kilku dni kot załatwia się poza kuwetą i nie wiemy, od czego zacząć."
          data-booking-field="description"
        />
        <small>{description.length} / 500</small>
      </div>

      {caseMapProfileSnapshot ? (
        <label className="booking-details-consent" htmlFor="booking-save-case-map">
          <input
            id="booking-save-case-map"
            name="saveCaseMapToProfile"
            type="checkbox"
            value="true"
            checked={saveCaseMapToProfile}
            onChange={(event) => setSaveCaseMapToProfile(event.target.checked)}
          />
          <span>
            Chcę dobrowolnie zapisać pełną Mapę zachowania w prywatnym Pokoju powiązanym z tym adresem e-mail. Po rezerwacji
            dostanę instrukcję; Mapa trafi do Pokoju dopiero po zalogowaniu lub utworzeniu konta na ten sam e-mail. To nie jest
            zgoda marketingowa ani udostępnienie pełnej Mapy specjaliście.
          </span>
        </label>
      ) : null}

      <label className="booking-details-consent" htmlFor="booking-privacy">
        <input
          id="booking-privacy"
          name="consentTerms"
          type="checkbox"
          value="true"
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
          name="consentEarlyStart"
          type="checkbox"
          value="true"
          checked={earlyStartAccepted}
          onChange={(event) => setEarlyStartAccepted(event.target.checked)}
        />
        <span>
          Chcę, aby konsultacja rozpoczęła się przed upływem 14 dni. Rozumiem, że po jej wykonaniu tracę prawo
          odstąpienia od umowy w zakresie zrealizowanej usługi.
        </span>
      </label>

      {error ? (
        <div className="notatnik-callout notatnik-callout-error" role="alert" aria-live="assertive">
          <p>{error}</p>
          {errorActionHref ? (
            <Link href={errorActionHref} prefetch={false} className="booking-details-error-link">
              Wybierz inny termin
            </Link>
          ) : null}
        </div>
      ) : null}

      <button type="submit" className="booking-details-submit" disabled={isSubmitting} data-booking-submit="payment">
        <span>
          {isSubmitting
            ? submittingLabel ?? 'Przygotowuję płatność...'
            : qaBooking
              ? 'Przejdź do testowej płatności'
              : submitLabel ?? 'Przejdź do płatności'}
        </span>
        <ArrowRight size={18} strokeWidth={1.9} aria-hidden="true" />
      </button>

      <div className="booking-details-safe-note">
        <LockKeyhole size={13} strokeWidth={1.9} aria-hidden="true" />
        <span>
          Po wysłaniu danych trzymamy wybrany termin przez 15 minut na czas płatności. Po opłaceniu dostaniesz e-mail z
          potwierdzeniem. Do zapłaty w kolejnym kroku: {amountLabel}.
        </span>
      </div>
    </form>
  )
}
