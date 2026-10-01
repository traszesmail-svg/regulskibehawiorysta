'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { RefreshCw } from 'lucide-react'
import { trackAnalyticsEvent } from '@/lib/analytics'
import { addAvailabilityMonths, buildZapytajMonthDates } from '@/lib/zapytaj-availability-window'

type Species = 'pies' | 'kot' | ''
type FormStatus = 'idle' | 'loading' | 'error'
type NotificationChannel = 'sms' | 'email'
type NotificationStatus = 'idle' | 'loading' | 'success' | 'error'

type ScheduleSlot = { id: string; date: string; time: string; label: string }
type AvailabilityPayload = {
  live: unknown
  slots: ScheduleSlot[]
  window: { from: string; to: string; month: string; hasEarlier: boolean; hasLater: boolean; hasAnySlots: boolean }
  slotsError: boolean
}

type FormState = {
  name: string
  phone: string
  email: string
  species: Species
  description: string
  consentProcessing: boolean
  consentPolicy: boolean
  consentEarlyStart: boolean
}

const DESCRIPTION_MAX_LENGTH = 800
const COMMUNITY_PROMO_PRICE_LABEL = '39,99 zł'

const INITIAL_FORM: FormState = {
  name: '',
  phone: '',
  email: '',
  species: '',
  description: '',
  consentProcessing: false,
  consentPolicy: false,
  consentEarlyStart: false,
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

type ZapytajIntakeFormProps = {
  promotionMode?: boolean
  initialPromotionCode?: string
}

export function ZapytajIntakeForm({ promotionMode = false, initialPromotionCode = '' }: ZapytajIntakeFormProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [status, setStatus] = useState<FormStatus>('idle')
  const [feedback, setFeedback] = useState('')
  const [availability, setAvailability] = useState<AvailabilityPayload | null>(null)
  const [availabilityError, setAvailabilityError] = useState('')
  const [selectedSlotId, setSelectedSlotId] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedDay, setSelectedDay] = useState('')
  const [initialLoading, setInitialLoading] = useState(true)
  const [notificationChannel, setNotificationChannel] = useState<NotificationChannel>('sms')
  const [notificationConsent, setNotificationConsent] = useState(false)
  const [notificationStatus, setNotificationStatus] = useState<NotificationStatus>('idle')
  const [notificationFeedback, setNotificationFeedback] = useState('')
  const [showNotifyForm, setShowNotifyForm] = useState(false)
  const [notifyContact, setNotifyContact] = useState('')
  const [promotionCode, setPromotionCode] = useState(initialPromotionCode)
  const availabilityFrom = useRef('')
  const [visibleMonth, setVisibleMonth] = useState(() => getWarsawDateKey().slice(0, 7))

  async function refreshAvailability(showLoading = false, requestedFrom = availabilityFrom.current) {
    if (showLoading) setIsRefreshing(true)

    try {
      const query = requestedFrom ? `?from=${encodeURIComponent(requestedFrom)}` : ''
      const response = await fetch(`/api/zapytaj/availability${query}`, {
        cache: 'no-store',
        // The API may perform a second, bounded availability read after loading this month.
        // Keep the client deadline above the endpoint's two sequential 4s read limits.
        signal: AbortSignal.timeout(12_000),
      })
      const payload = (await response.json()) as AvailabilityPayload

      if (!response.ok || !payload.live || !Array.isArray(payload.slots) || !payload.window) {
        throw new Error('Nie udało się pobrać dostępności.')
      }

      setAvailability(payload)
      availabilityFrom.current = payload.window.from
      setVisibleMonth(payload.window.month)
      setAvailabilityError(
        payload.slotsError
          ? 'Nie udało się potwierdzić zwykłych terminów. Spróbuj ponownie za chwilę.'
          : '',
      )
      setSelectedSlotId((current) => {
        if (current && payload.slots.some((slot) => slot.id === current)) return current
        return ''
      })
    } catch (error) {
      setAvailability(null)
      setAvailabilityError(error instanceof Error ? error.message : 'Dostępność jest chwilowo niedostępna.')
    } finally {
      if (showLoading) setIsRefreshing(false)
      setInitialLoading(false)
    }
  }

  useEffect(() => {
    void refreshAvailability()
    const interval = window.setInterval(() => void refreshAvailability(), 20_000)
    return () => window.clearInterval(interval)
  }, [])

  const selectedSlot = useMemo(
    () => availability?.slots.find((slot) => slot.id === selectedSlotId) ?? null,
    [availability?.slots, selectedSlotId],
  )
  const availableDays = useMemo(() => {
    const counts = new Map<string, number>()
    for (const slot of availability?.slots ?? []) counts.set(slot.date, (counts.get(slot.date) ?? 0) + 1)
    const today = getWarsawDateKey()
    return buildZapytajMonthDates(availability?.window.month ?? '')
      .map((date) => date ? { date, count: counts.get(date) ?? 0, isPast: date < today } : null)
  }, [availability?.slots, availability?.window.month])
  const selectableDays = useMemo(
    () => availableDays.filter((day): day is { date: string; count: number; isPast: boolean } => day !== null && !day.isPast),
    [availableDays],
  )
  const activeDay = selectableDays.some((day) => day.date === selectedDay)
    ? selectedDay
    : selectableDays.find((day) => day.count > 0)?.date ?? selectableDays[0]?.date ?? ''
  const visibleSlots = useMemo(
    () => (availability?.slots ?? []).filter((slot) => slot.date === activeDay),
    [activeDay, availability?.slots],
  )

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setStatus('idle')
    setFeedback('')
    setForm((current) => ({ ...current, [field]: value }))
  }

  function moveCalendar(direction: -1 | 1) {
    if (!availability) return
    const nextMonth = addAvailabilityMonths(availability.window.month, direction)
    const nextFrom = `${nextMonth}-01`
    availabilityFrom.current = nextFrom
    setVisibleMonth(nextMonth)
    setSelectedDay('')
    setSelectedSlotId('')
    setStatus('idle')
    setFeedback('')
    void refreshAvailability(true, nextFrom)
  }

  function selectDay(nextDay: string) {
    setSelectedDay(nextDay)
    setSelectedSlotId('')
    setStatus('idle')
    setFeedback('')
  }

  function handleDayKeyDown(event: KeyboardEvent<HTMLButtonElement>, currentDay: string) {
    const currentIndex = selectableDays.findIndex((day) => day.date === currentDay)
    const lastIndex = selectableDays.length - 1
    let nextIndex: number

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = (currentIndex + 1) % selectableDays.length
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = (currentIndex - 1 + selectableDays.length) % selectableDays.length
        break
      case 'Home':
        nextIndex = 0
        break
      case 'End':
        nextIndex = lastIndex
        break
      default:
        return
    }

    event.preventDefault()
    const nextDay = selectableDays[nextIndex]
    if (!nextDay) return

    selectDay(nextDay.date)
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[nextIndex]
      ?.focus()
  }

  async function handleNotify() {
    if (notificationStatus === 'loading') return

    const contact = notifyContact.trim()
    if (!contact) {
      setNotificationStatus('error')
      setNotificationFeedback('Podaj numer telefonu lub adres e-mail.')
      return
    }

    if (!notificationConsent) {
      setNotificationStatus('error')
      setNotificationFeedback('Zaznacz zgodę na jednorazowe powiadomienie.')
      return
    }

    setNotificationStatus('loading')
    setNotificationFeedback('')

    const isContactEmail = isEmail(contact)
    const channel = isContactEmail ? 'email' : 'sms'

    try {
      const response = await fetch('/api/zapytaj/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: isContactEmail ? '' : contact,
          email: isContactEmail ? contact : null,
          channel,
          consentAvailability: notificationConsent,
        }),
      })
      const payload = (await response.json()) as { message?: string; error?: string }

      if (!response.ok) {
        throw new Error(payload.error ?? 'Nie udało się zapisać powiadomienia.')
      }

      setNotificationStatus('success')
      setNotificationFeedback('Gotowe. Dam Ci znać, gdy pojawi się wolny termin.')
    } catch (notificationError) {
      console.error('[regulski-behawiorysta][zapytaj] notification submit failed', notificationError)
      setNotificationStatus('error')
      setNotificationFeedback(notificationError instanceof Error ? notificationError.message : 'Wystąpił błąd. Spróbuj ponownie.')
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (status === 'loading') return

    if (!form.name.trim()) {
      setStatus('error')
      setFeedback('Podaj imię.')
      return
    }

    if (!/^\+?[0-9 ()-]{9,}$/.test(form.phone.trim())) {
      setStatus('error')
      setFeedback('Podaj poprawny numer telefonu, na który można oddzwonić.')
      return
    }

    if (!isEmail(form.email.trim())) {
      setStatus('error')
      setFeedback('Podaj poprawny adres e-mail.')
      return
    }

    if (!form.species) {
      setStatus('error')
      setFeedback('Wybierz, czy sprawa dotyczy psa czy kota.')
      return
    }

    if (form.description.trim().length < 20) {
      setStatus('error')
      setFeedback('Opisz krótko sytuację — najlepiej w 2–4 zdaniach.')
      return
    }

    if (promotionMode && !promotionCode.trim()) {
      setStatus('error')
      setFeedback('Wpisz kod otrzymany w grupie.')
      return
    }

    if (!selectedSlot) {
      setStatus('error')
      setFeedback('Wybierz termin rozmowy.')
      return
    }

    if (!form.consentProcessing || !form.consentPolicy || !form.consentEarlyStart) {
      setStatus('error')
      setFeedback('Zaznacz wszystkie zgody potrzebne do rezerwacji.')
      return
    }

    setStatus('loading')
    setFeedback('')
    trackAnalyticsEvent('booking_form_submitted', {
      source_page: '/zapytaj',
      species: form.species,
      problem_key: 'zapytaj-behawioryste',
      intent: promotionMode ? 'zapytaj-promocja' : 'zapytaj-termin',
    })

    try {
      const response = await fetch('/api/zapytaj', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          email: form.email,
          species: form.species,
          description: form.description,
          mode: 'scheduled',
          slotId: selectedSlotId,
          consentProcessing: form.consentProcessing,
          consentPolicy: form.consentPolicy,
          consentEarlyStart: form.consentEarlyStart,
          promoCode: promotionMode ? promotionCode.trim() : undefined,
        }),
      })
      const payload = (await response.json()) as { redirectTo?: string; error?: string }

      if (!response.ok || !payload.redirectTo) {
        throw new Error(payload.error ?? 'Nie udało się przygotować rezerwacji.')
      }

      window.location.assign(payload.redirectTo)
    } catch (submitError) {
      console.error('[regulski-behawiorysta][zapytaj] form submit failed', submitError)
      setStatus('error')
      setFeedback(submitError instanceof Error ? submitError.message : 'Wystąpił błąd. Spróbuj ponownie.')
      void refreshAvailability()
    }
  }

  return (
    <form className="zapytaj-form" onSubmit={handleSubmit} noValidate>
      {/* KROK 1: Wybór terminu rozmowy */}
      <section className="zapytaj-form-step" aria-labelledby="step-1-title">
        <div className="zapytaj-form-step-head">
          <span className="zapytaj-form-step-badge">1</span>
          <div>
            <h2 id="step-1-title" className="zapytaj-form-step-title">Wybierz dzień i godzinę</h2>
            <p className="zapytaj-form-step-desc">Możesz przeglądać kolejne miesiące i sprawdzić dostępne godziny.</p>
          </div>
        </div>

        <div className="zapytaj-availability" aria-live="polite">
          <div className="zapytaj-availability-head">
            <div>
              <span className="zapytaj-form-card-kicker">WOLNE TERMINY</span>
              <strong>Wybierz dzień, potem godzinę</strong>
            </div>
            <button type="button" className="zapytaj-refresh-button" onClick={() => void refreshAvailability(true)} disabled={isRefreshing}>
              <RefreshCw size={14} aria-hidden="true" />
              {isRefreshing ? 'Sprawdzam…' : 'Odśwież'}
            </button>
          </div>
          <p>{promotionMode ? 'Kod grupowy działa tylko przy rezerwacji zwykłego terminu.' : availabilityError || 'Pokazuję tylko godziny z wybranego dnia.'}</p>
        </div>

        <div className="zapytaj-calendar-navigation" aria-label="Nawigacja kalendarza">
          <button type="button" onClick={() => moveCalendar(-1)} disabled={!availability || !availability.window.hasEarlier || isRefreshing}>
            Poprzedni miesiąc
          </button>
          <strong aria-live="polite">{formatMonth(availability?.window.month ?? visibleMonth)}</strong>
          <button type="button" onClick={() => moveCalendar(1)} disabled={!availability || !availability.window.hasLater || isRefreshing}>
            Następny miesiąc
          </button>
        </div>

        <fieldset className="zapytaj-slot-field">
            <legend className="sr-only">Wybierz termin z listy</legend>
            {initialLoading ? (
              <p className="zapytaj-empty-slots" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RefreshCw size={15} className="animate-spin" aria-hidden="true" />
                <span>Sprawdzam dostępne terminy…</span>
              </p>
            ) : availabilityError && (!availability || availability.slotsError) ? (
              <div className="zapytaj-empty-slots-wrap">
                <p className="zapytaj-empty-slots" role="alert">
                  {availabilityError || 'Nie udało się sprawdzić dostępnych terminów. Spróbuj ponownie za chwilę.'}
                </p>
                <button
                  type="button"
                  className="homepage-avail-notify-trigger"
                  onClick={() => void refreshAvailability(true)}
                  disabled={isRefreshing}
                >
                  Spróbuj ponownie
                </button>
              </div>
            ) : availability ? (
              <>
              <div className="zapytaj-calendar-layout">
                <div className="zapytaj-calendar-month-panel">
                  <div className="zapytaj-calendar-weekdays" aria-hidden="true">
                    {['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'].map((label) => <span key={label}>{label}</span>)}
                  </div>
                  <div className="zapytaj-calendar-day-grid" role="radiogroup" aria-label="Wybierz dzień rozmowy">
                    {availableDays.map((day, index) => day ? (
                      <button
                        type="button"
                        key={day.date}
                        role="radio"
                        aria-checked={day.date === activeDay}
                        aria-label={`${formatCalendarDay(day.date)}${day.isPast ? ', termin minął' : day.count ? `, ${day.count} dostępnych godzin` : ', brak dostępnych godzin'}`}
                        tabIndex={day.date === activeDay ? 0 : -1}
                        disabled={day.isPast}
                        className={`zapytaj-calendar-day${day.date === activeDay ? ' is-selected' : ''}${day.count ? ' has-slots' : ''}${day.isPast ? ' is-past' : ''}`}
                        onClick={() => selectDay(day.date)}
                        onKeyDown={(event) => handleDayKeyDown(event, day.date)}
                      >
                        <span>{Number(day.date.slice(-2))}</span>
                        <small>{day.count || '—'}</small>
                      </button>
                    ) : <span key={`blank-${index}`} className="zapytaj-calendar-day-blank" aria-hidden="true" />)}
                  </div>
                </div>
                <div className="zapytaj-calendar-times-panel" aria-live="polite">
                  <p className="zapytaj-time-heading">{activeDay ? `Godziny · ${formatCalendarDay(activeDay)}` : 'Dostępne godziny'}</p>
                  {visibleSlots.length ? <div className="zapytaj-slot-grid">
                    {visibleSlots.map((slot) => (
                      <button type="button" key={slot.id} aria-label={`Wybierz ${slot.time}, ${formatCalendarDay(slot.date)}`} className={`zapytaj-slot-option${selectedSlotId === slot.id ? ' is-selected' : ''}`} onClick={() => setSelectedSlotId(slot.id)}>
                        {slot.time}
                      </button>
                    ))}
                  </div> : <div className="zapytaj-empty-slots-wrap">
                    <p className="zapytaj-empty-slots">
                      {availability.window.hasAnySlots && activeDay
                        ? `W dniu ${formatCalendarDay(activeDay)} nie ma wolnych godzin. Wybierz inny dzień w kalendarzu.`
                        : 'W tym miesiącu nie ma wolnych terminów. Wybierz inny miesiąc, aby sprawdzić dalsze daty.'}
                    </p>
                    {!availability.window.hasAnySlots && !availability.window.hasLater && !availability.window.hasEarlier && !showNotifyForm && notificationStatus !== 'success' && (
                      <button type="button" className="homepage-avail-notify-trigger" onClick={() => setShowNotifyForm(true)}>
                        Powiadom mnie o wolnym terminie
                      </button>
                    )}
                    {!availability.window.hasAnySlots && !availability.window.hasLater && !availability.window.hasEarlier && showNotifyForm && notificationStatus !== 'success' && (
                      <div className="homepage-avail-notify-form">
                        <div className="homepage-avail-notify-inputs">
                          <input type="text" value={notifyContact} onChange={(event) => { setNotifyContact(event.target.value); setNotificationStatus('idle'); setNotificationFeedback('') }} placeholder="Telefon lub e-mail" aria-label="Telefon lub e-mail do powiadomienia" className="homepage-avail-notify-input" required />
                          <button type="button" className="homepage-avail-notify-submit" onClick={() => void handleNotify()} disabled={notificationStatus === 'loading'}>
                            {notificationStatus === 'loading' ? 'Zapisuję…' : 'Zapisz'}
                          </button>
                        </div>
                        <label className="homepage-avail-notify-consent">
                          <input type="checkbox" checked={notificationConsent} onChange={(event) => { setNotificationConsent(event.target.checked); setNotificationStatus('idle'); setNotificationFeedback('') }} required />
                          <span>Zgadzam się na jednorazowe powiadomienie o dostępności.</span>
                        </label>
                        {notificationFeedback && notificationStatus === 'error' && <p className="homepage-avail-notify-error" role="alert">{notificationFeedback}</p>}
                      </div>
                    )}
                    {notificationStatus === 'success' && !availability.window.hasAnySlots && !availability.window.hasLater && !availability.window.hasEarlier && <p className="homepage-avail-notify-success" role="status">Gotowe. Dam Ci znać, gdy pojawi się wolny termin.</p>}
                  </div>}
                </div>
              </div>
              </>
            ) : (
              <div className="zapytaj-empty-slots-wrap">
                <p className="zapytaj-empty-slots">Brak wolnych terminów w kalendarzu.</p>
                {!showNotifyForm && notificationStatus !== 'success' && (
                  <button
                    type="button"
                    className="homepage-avail-notify-trigger"
                    onClick={() => setShowNotifyForm(true)}
                  >
                    Powiadom mnie o wolnym terminie
                  </button>
                )}
                {showNotifyForm && notificationStatus !== 'success' && (
                  <div className="homepage-avail-notify-form" style={{ marginTop: '12px' }}>
                    <div className="homepage-avail-notify-inputs">
                      <input
                        type="text"
                        value={notifyContact}
                        onChange={(e) => {
                          setNotifyContact(e.target.value)
                          setNotificationStatus('idle')
                          setNotificationFeedback('')
                        }}
                        placeholder="Telefon lub e-mail"
                        aria-label="Telefon lub e-mail do powiadomienia"
                        className="homepage-avail-notify-input"
                        required
                      />
                      <button
                        type="button"
                        className="homepage-avail-notify-submit"
                        onClick={() => void handleNotify()}
                        disabled={notificationStatus === 'loading'}
                      >
                        {notificationStatus === 'loading' ? 'Zapisuję…' : 'Zapisz'}
                      </button>
                    </div>
                    <label className="homepage-avail-notify-consent">
                      <input
                        type="checkbox"
                        checked={notificationConsent}
                        onChange={(e) => {
                          setNotificationConsent(e.target.checked)
                          setNotificationStatus('idle')
                          setNotificationFeedback('')
                        }}
                        required
                      />
                      <span>Zgadzam się na jednorazowe powiadomienie o dostępności.</span>
                    </label>
                    {notificationFeedback && notificationStatus === 'error' && (
                      <p className="homepage-avail-notify-error" role="alert">{notificationFeedback}</p>
                    )}
                  </div>
                )}
                {notificationStatus === 'success' && (
                  <p className="homepage-avail-notify-success" role="status" style={{ marginTop: '8px' }}>
                    Gotowe. Dam Ci znać, gdy pojawi się wolny termin.
                  </p>
                )}
              </div>
            )}
        </fieldset>
      </section>

      {selectedSlot ? <>
      <p className="zapytaj-selected-slot" role="status">Wybrany termin: <strong>{formatCalendarDay(selectedSlot.date)}, godz. {selectedSlot.time}</strong></p>

      {/* KROK 2: Twoje dane i zwierzę */}
      <section className="zapytaj-form-step" aria-labelledby="step-2-title">
        <div className="zapytaj-form-step-head">
          <span className="zapytaj-form-step-badge">2</span>
          <div>
            <h2 id="step-2-title" className="zapytaj-form-step-title">Twoje dane i zwierzę</h2>
            <p className="zapytaj-form-step-desc">Podaj dane, na które mam zadzwonić w wybranym terminie.</p>
          </div>
        </div>

        <div className="zapytaj-form-grid">
          {promotionMode ? (
            <div className="zapytaj-field zapytaj-field-wide">
              <label htmlFor="zapytaj-promo-code">Kod grupowy</label>
              <input
                id="zapytaj-promo-code"
                name="promoCode"
                type="text"
                value={promotionCode}
                onChange={(event) => { setPromotionCode(event.target.value.toUpperCase()); setStatus('idle'); setFeedback('') }}
                placeholder="GRP-XXXX-XXXX"
                autoCapitalize="characters"
                autoComplete="off"
                required
              />
              <small>Jednorazowy kod z grupy. Oferta dotyczy zwykłego terminu rozmowy.</small>
            </div>
          ) : null}
          <div className="zapytaj-field">
            <label htmlFor="zapytaj-name">Imię</label>
            <input id="zapytaj-name" name="name" value={form.name} onChange={(event) => updateField('name', event.target.value)} autoComplete="name" placeholder="np. Anna" />
          </div>
          <div className="zapytaj-field">
            <label htmlFor="zapytaj-phone">Telefon</label>
            <input id="zapytaj-phone" name="phone" type="tel" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} autoComplete="tel" placeholder="np. 500 600 700" />
          </div>
          <div className="zapytaj-field zapytaj-field-wide">
            <label htmlFor="zapytaj-email">E-mail</label>
            <input id="zapytaj-email" name="email" type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} autoComplete="email" placeholder="np. anna@email.pl" />
          </div>
          <fieldset className="zapytaj-field zapytaj-field-wide zapytaj-species-field">
            <legend>Sprawa dotyczy</legend>
            <div className="zapytaj-species-options">
              {(['pies', 'kot'] as const).map((species) => (
                <label key={species} className={`zapytaj-species-option${form.species === species ? ' is-selected' : ''}`}>
                  <input type="radio" name="species" value={species} checked={form.species === species} onChange={() => updateField('species', species)} />
                  <span>{species === 'pies' ? 'Pies' : 'Kot'}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </section>

      {/* KROK 3: Co się dzieje? */}
      <section className="zapytaj-form-step" aria-labelledby="step-3-title">
        <div className="zapytaj-form-step-head">
          <span className="zapytaj-form-step-badge">3</span>
          <div>
            <h2 id="step-3-title" className="zapytaj-form-step-title">Co się dzieje?</h2>
            <p className="zapytaj-form-step-desc">Krótki opis sytuacji pozwoli mi przygotować się przed połączeniem.</p>
          </div>
        </div>

        <div className="zapytaj-form-grid">
          <div className="zapytaj-field zapytaj-field-wide">
            <div className="zapytaj-label-row"><label htmlFor="zapytaj-description">Opisz w kilku zdaniach zachowanie psa lub kota</label><span>{form.description.length}/{DESCRIPTION_MAX_LENGTH}</span></div>
            <textarea id="zapytaj-description" name="description" rows={5} value={form.description} onChange={(event) => updateField('description', event.target.value.slice(0, DESCRIPTION_MAX_LENGTH))} placeholder="Co się dzieje, od kiedy i w jakich sytuacjach? Napisz też, co zostało już wypróbowane." maxLength={DESCRIPTION_MAX_LENGTH} />
            <small>Nie musisz znać fachowych pojęć ani przyczyny. Wystarczy opis codziennej sytuacji.</small>
          </div>
        </div>
      </section>

      {/* KROK 4: Zgody i przejście do płatności */}
      <section className="zapytaj-form-step" aria-labelledby="step-4-title">
        <div className="zapytaj-form-step-head">
          <span className="zapytaj-form-step-badge">4</span>
          <div>
            <h2 id="step-4-title" className="zapytaj-form-step-title">Zgody i przejście do płatności</h2>
            <p className="zapytaj-form-step-desc">Płatność online (BLIK) · natychmiastowa blokada terminu w kalendarzu.</p>
          </div>
        </div>

        <div className="zapytaj-consents">
          <label><input type="checkbox" checked={form.consentProcessing} onChange={(event) => updateField('consentProcessing', event.target.checked)} /><span>Wyrażam zgodę na przetwarzanie danych zgodnie z <Link href="/polityka-prywatnosci" target="_blank" rel="noopener noreferrer">polityką prywatności</Link>.</span></label>
          <label><input type="checkbox" checked={form.consentPolicy} onChange={(event) => updateField('consentPolicy', event.target.checked)} /><span>Akceptuję <Link href="/regulamin" target="_blank" rel="noopener noreferrer">regulamin</Link> usługi.</span></label>
          <label><input type="checkbox" checked={form.consentEarlyStart} onChange={(event) => updateField('consentEarlyStart', event.target.checked)} /><span>Proszę o rozpoczęcie płatnej rozmowy przed upływem 14 dni i przyjmuję, że po jej wykonaniu prawo odstąpienia może nie przysługiwać.</span></label>
        </div>

        {feedback ? <div className={`zapytaj-form-feedback${status === 'error' ? ' is-error' : ''}`} role="status">{feedback}</div> : null}

        <button type="submit" className="notatnik-btn zapytaj-form-submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'Przygotowuję rezerwację…' : promotionMode ? `Przejdź do płatności — ${COMMUNITY_PROMO_PRICE_LABEL}` : 'Wybierz termin — 79 zł'}
        </button>
        <p className="zapytaj-form-note">Po wysłaniu opisu przejdziesz do płatności BLIK. Termin jest wstępnie blokowany na 5 minut; po zgłoszeniu wpłaty czeka na ręczne potwierdzenie maksymalnie 24 godziny.</p>
      </section>
      </> : <p className="zapytaj-before-selection">Po wybraniu godziny pojawi się formularz danych i płatności.</p>}
    </form>
  )
}

function formatMonth(month: string) {
  return new Intl.DateTimeFormat('pl-PL', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${month}-15T12:00:00Z`))
}

function formatCalendarDay(date: string) {
  return new Intl.DateTimeFormat('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`))
}

function getWarsawDateKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}
