'use client'

import Link from 'next/link'
import { useMemo, useState, type FormEvent } from 'react'
import { trackAnalyticsEvent } from '@/lib/analytics'
import type { BookingServiceType } from '@/lib/booking-services'
import type { BookingSpecies } from '@/lib/booking-routing'
import {
  PUBLIC_OFFER_PAYMENT_EMAIL_STEP,
  PUBLIC_OFFER_BOOKING_PRIORITY_NOTE,
  PUBLIC_OFFER_BOOKING_PRIORITY_PROMPT,
} from '@/lib/public-offer-copy'
import { SlotPicker, type SlotPickerMode } from '@/components/SlotPicker'

type FormState = 'idle' | 'loading' | 'success' | 'error'

type BookRequestFormProps = {
  initialService: BookingServiceType
  initialSpecies: BookingSpecies | null
  entryService: BookingServiceType | null
}

type BookingRequestPayload = {
  service: BookingServiceType
  name: string
  email: string
  species: BookingSpecies
  description: string
  preferredSlots: string
  consentRodo: boolean
  consentRegulamin: boolean
  consentEarlyStart: boolean
  honeypot: string
}

const PRIMARY_SERVICE_OPTIONS: Array<{ value: Exclude<BookingServiceType, 'kwadrans-na-juz'>; label: string; price: string }> = [
  { value: 'szybka-konsultacja-15-min', label: '15-minutowa konsultacja behawioralna', price: '69 zĹ‚' },
  { value: 'konsultacja-30-min', label: 'Dwa kwadranse', price: '169 zĹ‚' },
  { value: 'konsultacja-behawioralna-online', label: 'PeĹ‚na konsultacja', price: '470 zĹ‚' },
]

const URGENT_SERVICE_OPTION = {
  value: 'kwadrans-na-juz' as const,
  label: 'Kwadrans na juĹĽ',
  price: '99 zĹ‚',
}

function getServiceOption(service: BookingServiceType) {
  if (service === 'kwadrans-na-juz') {
    return URGENT_SERVICE_OPTION
  }

  return PRIMARY_SERVICE_OPTIONS.find((option) => option.value === service) ?? PRIMARY_SERVICE_OPTIONS[0]
}

function isEmailValid(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function normalizeSingleLine(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

function normalizeLongText(value: string) {
  return value.replace(/\r\n/g, '\n').trim()
}

function createInitialForm(initialService: BookingServiceType, initialSpecies: BookingSpecies | null): BookingRequestPayload {
  return {
    service: initialService,
    name: '',
    email: '',
    species: initialSpecies ?? 'pies',
    description: '',
    preferredSlots: '',
    consentRodo: false,
    consentRegulamin: false,
    consentEarlyStart: false,
    honeypot: '',
  }
}

function getSelectedServiceIntro(service: BookingServiceType) {
  const option = getServiceOption(service)

  switch (service) {
    case 'konsultacja-30-min':
      return {
        title: `Wybrana rozmowa: ${option.label} / ${option.price}.`,
        copy: '30 min online, gdy temat ma kilka wÄ…tkĂłw. Masz wiÄ™cej czasu na kontekst, spokojniejsze zalecenia i decyzjÄ™, czy potrzebna jest peĹ‚na konsultacja.',
      }
    case 'konsultacja-behawioralna-online':
      return {
        title: `Wybrana rozmowa: ${option.label} / ${option.price}.`,
        copy: 'OkoĹ‚o 2h online dla spraw zĹ‚oĹĽonych: analiza zachowania, prawdopodobna przyczyna problemu, plan dziaĹ‚ania i 14 dni komunikacji w pokoju klienta przy wdraĹĽaniu zaleceĹ„.',
      }
    case 'kwadrans-na-juz':
      return {
        title: `Wybrana rozmowa: ${option.label} / ${option.price}.`,
        copy: 'To ten sam zakres co Kwadrans, ale z priorytetowÄ… odpowiedziÄ… i najbliĹĽszym realnym terminem. Dla spraw pilnych, ktĂłre nie wymagajÄ… dĹ‚uĹĽszej analizy.',
      }
    case 'szybka-konsultacja-15-min':
    default:
      return {
        title: `Wybrana rozmowa: ${option.label} / ${option.price}.`,
        copy: 'Kwadrans to 15 min audio bez kamery na jedno gĹ‚Ăłwne pytanie. Szybko porzÄ…dkujesz sytuacjÄ™ i dostajesz pierwszy kierunek dziaĹ‚ania.',
      }
  }
}

export function BookRequestForm({ initialService, initialSpecies, entryService }: BookRequestFormProps) {
  const [form, setForm] = useState<BookingRequestPayload>(() => createInitialForm(initialService, initialSpecies))
  const [status, setStatus] = useState<FormState>('idle')
  const [feedback, setFeedback] = useState('')
  const selectedService = useMemo(() => getServiceOption(form.service), [form.service])
  const selectedServiceIntro = useMemo(() => getSelectedServiceIntro(form.service), [form.service])
  const entryServiceOption = entryService ? getServiceOption(entryService) : null
  const isUrgentNow = form.service === 'kwadrans-na-juz'
  const showPriorityPrompt = form.service === 'szybka-konsultacja-15-min'
  const slotPickerMode: SlotPickerMode =
    form.service === 'konsultacja-behawioralna-online'
      ? 'full-consultation'
      : form.service === 'kwadrans-na-juz'
        ? 'urgent'
        : 'standard'
  const showEntryServiceBox = entryServiceOption !== null && entryService !== 'kwadrans-na-juz' && form.service !== entryService
  const showServiceChangeLegend = entryServiceOption !== null || isUrgentNow

  function updateField<K extends keyof BookingRequestPayload>(key: K, value: BookingRequestPayload[K]) {
    if (status !== 'idle') {
      setStatus('idle')
      setFeedback('')
    }

    setForm((current) => ({ ...current, [key]: value }))
  }

  function validate() {
    const name = normalizeSingleLine(form.name)
    const email = normalizeSingleLine(form.email)
    const description = normalizeLongText(form.description)
    const preferredSlots = normalizeLongText(form.preferredSlots)

    if (!name) {
      return 'Podaj imiÄ™.'
    }

    if (!email || !isEmailValid(email)) {
      return 'Podaj poprawny adres e-mail.'
    }

    if (description.length < 20 || description.length > 1000) {
      return 'Opis sytuacji powinien mieÄ‡ od 20 do 1000 znakĂłw.'
    }

    if (!isUrgentNow && !preferredSlots) {
      return 'Wybierz przynajmniej jeden termin z kalendarza.'
    }

    if (!form.consentRodo || !form.consentRegulamin || !form.consentEarlyStart) {
      return 'Zaznacz wszystkie wymagane zgody.'
    }

    return null
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const validationError = validate()

    if (validationError) {
      setStatus('error')
      setFeedback(validationError)
      return
    }

    setStatus('loading')
    setFeedback('')

    try {
      const response = await fetch('/api/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service: form.service,
          name: normalizeSingleLine(form.name),
          email: normalizeSingleLine(form.email),
          species: form.species,
          description: normalizeLongText(form.description),
          preferredSlots: isUrgentNow
            ? 'ChcÄ™ termin jak najszybciej - proszÄ™ o priorytetowÄ… odpowiedĹş z realnÄ… propozycjÄ… terminu.'
            : normalizeLongText(form.preferredSlots),
          consentRodo: form.consentRodo,
          consentRegulamin: form.consentRegulamin,
          consentEarlyStart: form.consentEarlyStart,
          honeypot: form.honeypot.trim(),
        }),
      })

      const payload = (await response.json()) as { ok?: boolean; error?: string; message?: string }

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Nie udaĹ‚o siÄ™ wysĹ‚aÄ‡ proĹ›by o rezerwacjÄ™.')
      }

      setStatus('success')
      setFeedback(payload.message ?? 'DostaĹ‚em TwojÄ… rezerwacjÄ™. SprawdĹş skrzynkÄ™ - wysĹ‚aĹ‚em kopiÄ™.')
      trackAnalyticsEvent('booking_form_submitted', {
        service_key: form.service,
        species: form.species,
      })
      setForm(createInitialForm(form.service, form.species))
    } catch (error) {
      setStatus('error')
      setFeedback(error instanceof Error ? error.message : 'Nie udaĹ‚o siÄ™ wysĹ‚aÄ‡ proĹ›by o rezerwacjÄ™.')
    }
  }

  if (status === 'success') {
    return (
      <div className="contact-form-card top-gap" role="status">
        <div className="notatnik-mono notatnik-kicker-spaced">Rezerwacja przyjÄ™ta</div>
        <h2>{isUrgentNow ? 'DostaĹ‚em TwojÄ… proĹ›bÄ™ o Kwadrans na juĹĽ.' : 'DostaĹ‚em TwojÄ… rezerwacjÄ™.'}</h2>
        <p>
          {isUrgentNow
            ? 'Twoja proĹ›ba o Kwadrans na juĹĽ dotarĹ‚a. Odpowiem priorytetowo z realnÄ… propozycjÄ… terminu i dalszym krokiem pĹ‚atnoĹ›ci. SprawdĹş skrzynkÄ™ - wysĹ‚aĹ‚em Ci kopiÄ™.'
            : 'W ciÄ…gu kilku godzin, miÄ™dzy 9 a 21, odezwÄ™ siÄ™ z potwierdzeniem terminu i dalszym krokiem pĹ‚atnoĹ›ci. SprawdĹş skrzynkÄ™ - wysĹ‚aĹ‚em Ci kopiÄ™.'}
        </p>
        <div className="notatnik-steps top-gap-small">
          <article className="notatnik-step">
            <div className="notatnik-step-number">01</div>
            <p>{isUrgentNow ? 'Wracam z szybkÄ… odpowiedziÄ… i pierwszÄ… wolnÄ… chwilÄ… na dziĹ›.' : 'Potwierdzam jeden z terminĂłw albo odsyĹ‚am najbliĹĽszÄ… alternatywÄ™.'}</p>
          </article>
          <article className="notatnik-step">
            <div className="notatnik-step-number">02</div>
            <p>{PUBLIC_OFFER_PAYMENT_EMAIL_STEP}</p>
          </article>
          <article className="notatnik-step">
            <div className="notatnik-step-number">03</div>
            <p>Po wpĹ‚acie potwierdzam rezerwacjÄ™ i odsyĹ‚am link do rozmowy.</p>
          </article>
        </div>
        <div className="notatnik-subhero-actions top-gap-small">
          <Link href="/" prefetch={false} className="notatnik-btn">
            WrĂłÄ‡ na stronÄ™ gĹ‚ĂłwnÄ…
          </Link>
          <button type="button" className="notatnik-btn notatnik-btn-ghost" onClick={() => setStatus('idle')}>
            WyĹ›lij kolejnÄ… proĹ›bÄ™
          </button>
        </div>
      </div>
    )
  }

  return (
    <form
      className="form-grid top-gap"
      onSubmit={handleSubmit}
      noValidate
      data-analytics-form="booking"
      data-analytics-form-start-event="booking_form_started"
      data-analytics-service={form.service}
      data-analytics-species={form.species}
    >
      <div className="info-box full-width contact-form-intro">
        <strong>{selectedServiceIntro.title}</strong> {selectedServiceIntro.copy}
      </div>

      {showEntryServiceBox && entryServiceOption ? (
        <div className="info-box full-width">
          <strong>Ten formularz otworzyĹ‚ siÄ™ z usĹ‚ugÄ…: {entryServiceOption.label}.</strong> NiĹĽej wybraĹ‚eĹ› juĹĽ innÄ… rozmowÄ™, wiÄ™c po wysĹ‚aniu proĹ›by zapisze siÄ™ aktualny wybĂłr.
        </div>
      ) : null}

      {isUrgentNow ? (
        <div className="info-box full-width">
          <strong>
            Wybrany tryb: {URGENT_SERVICE_OPTION.label} / {URGENT_SERVICE_OPTION.price}.
          </strong>{' '}
          To ten sam 15-minutowy format co zwykĹ‚y Kwadrans, ale z priorytetem i szybszym terminem.{' '}
          <button
            type="button"
            className="notatnik-inline-link"
            onClick={() => updateField('service', 'szybka-konsultacja-15-min')}
          >
            WrĂłÄ‡ do zwykĹ‚ego Kwadransu
          </button>
        </div>
      ) : null}

      <fieldset className="full-width form-field consent-stack">
        <legend className="field-legend">
          {showServiceChangeLegend ? 'ZmieĹ„ usĹ‚ugÄ™, jeĹ›li potrzebujesz innej rozmowy' : 'Wybierz usĹ‚ugÄ™'}
        </legend>
        {PRIMARY_SERVICE_OPTIONS.map((option) => (
          <label key={option.value} className="checkbox-card" htmlFor={`service-${option.value}`}>
            <input
              id={`service-${option.value}`}
              type="radio"
              name="service"
              checked={form.service === option.value}
              onChange={() => updateField('service', option.value)}
            />
            <span>
              {option.label} / {option.price}
            </span>
          </label>
        ))}
        <Link className="checkbox-card" href="/kwadrans-na-juz" prefetch={false}>
          <span>
            âšˇ {URGENT_SERVICE_OPTION.label} / {URGENT_SERVICE_OPTION.price} â€” termin na dziĹ›, sytuacje kryzysowe
          </span>
        </Link>
      </fieldset>

      {showPriorityPrompt ? (
        <div className="info-box full-width">
          <strong>Chcesz szybciej?</strong> {PUBLIC_OFFER_BOOKING_PRIORITY_PROMPT}{' '}
          <Link href="/kwadrans-na-juz" prefetch={false} className="notatnik-inline-link">
            PrzejdĹş do Kwadransu na juĹĽ
          </Link>
          <div className="field-help top-gap-small">{PUBLIC_OFFER_BOOKING_PRIORITY_NOTE}</div>
        </div>
      ) : null}

      <div className="form-field full-width">
        <label htmlFor="book-name">ImiÄ™</label>
        <input
          id="book-name"
          name="name"
          value={form.name}
          onChange={(event) => updateField('name', event.target.value)}
          autoComplete="name"
          placeholder="np. Anna"
        />
      </div>

      <div className="form-field full-width">
        <label htmlFor="book-email">E-mail</label>
        <input
          id="book-email"
          name="email"
          type="email"
          value={form.email}
          onChange={(event) => updateField('email', event.target.value)}
          autoComplete="email"
          inputMode="email"
          placeholder="np. anna@email.pl"
        />
      </div>

      <fieldset className="full-width form-field consent-stack">
        <legend className="field-legend">Gatunek</legend>
        <label className="checkbox-card" htmlFor="species-pies">
          <input
            id="species-pies"
            type="radio"
            name="species"
            checked={form.species === 'pies'}
            onChange={() => updateField('species', 'pies')}
          />
          <span>Pies</span>
        </label>
        <label className="checkbox-card" htmlFor="species-kot">
          <input
            id="species-kot"
            type="radio"
            name="species"
            checked={form.species === 'kot'}
            onChange={() => updateField('species', 'kot')}
          />
          <span>Kot</span>
        </label>
      </fieldset>

      <div className="full-width form-field">
        <label htmlFor="book-description">KrĂłtki opis sytuacji</label>
        <textarea
          id="book-description"
          name="description"
          rows={5}
          value={form.description}
          onChange={(event) => updateField('description', event.target.value.slice(0, 1000))}
          placeholder="Napisz, co dzieje siÄ™ teraz, od kiedy trwa problem i co najbardziej chcesz uporzÄ…dkowaÄ‡."
        />
        <div className="field-help">{form.description.length}/1000 znakĂłw</div>
      </div>

      <div className="full-width form-field">
        <label htmlFor="book-preferred-slots">Preferowane terminy</label>
        {isUrgentNow ? (
          <div className="info-box">ChcÄ™ termin jak najszybciej - proszÄ™ o priorytetowÄ… odpowiedĹş z realnÄ… propozycjÄ… terminu.</div>
        ) : (
          <>
            <SlotPicker
              onChange={(formatted) => updateField('preferredSlots', formatted)}
              mode={slotPickerMode}
              className="top-gap-small"
            />
            {form.preferredSlots ? (
              <input type="hidden" name="preferredSlots" value={form.preferredSlots} />
            ) : null}
          <div className="field-help" style={{ marginTop: '8px' }}>
            Kliknij dzieĹ„ i wybierz godzinÄ™. Dodaj 2-3 opcje na wszelki wypadek.
          </div>
        </>
      )}
      </div>

      <fieldset className="full-width form-field consent-stack">
        <legend className="field-legend">Wymagane zgody</legend>
        <label className="checkbox-card" htmlFor="book-consent-rodo">
          <input
            id="book-consent-rodo"
            type="checkbox"
            checked={form.consentRodo}
            onChange={(event) => updateField('consentRodo', event.target.checked)}
            required
          />
          <span>WyraĹĽam zgodÄ™ na przetwarzanie danych osobowych w celu obsĹ‚ugi rezerwacji.</span>
        </label>

        <label className="checkbox-card" htmlFor="book-consent-regulamin">
          <input
            id="book-consent-regulamin"
            type="checkbox"
            checked={form.consentRegulamin}
            onChange={(event) => updateField('consentRegulamin', event.target.checked)}
            required
          />
          <span>
            ZapoznaĹ‚em/am siÄ™ z{' '}
            <Link href="/regulamin" prefetch={false}>
              regulaminem
            </Link>{' '}
            oraz{' '}
            <Link href="/regulamin-pelna-konsultacja" prefetch={false}>
              regulaminem PeĹ‚nej konsultacji
            </Link>{' '}
            i akceptujÄ™ warunki.
          </span>
        </label>

        <label className="checkbox-card" htmlFor="book-consent-early-start">
          <input
            id="book-consent-early-start"
            type="checkbox"
            checked={form.consentEarlyStart}
            onChange={(event) => updateField('consentEarlyStart', event.target.checked)}
            required
          />
          <span>
            WyraĹĽam zgodÄ™ na rozpoczÄ™cie Ĺ›wiadczenia usĹ‚ugi przed upĹ‚ywem 14 dni i przyjmujÄ™ do wiadomoĹ›ci, ĹĽe po
            wykonaniu konsultacji tracÄ™ prawo odstÄ…pienia od umowy.
          </span>
        </label>
      </fieldset>

      <input
        id="book-company"
        name="company"
        type="text"
        value={form.honeypot}
        onChange={(event) => updateField('honeypot', event.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="sr-only"
      />

      {feedback ? (
        <div className={`info-box full-width ${status === 'error' ? 'error-box' : ''}`} role="status">
          {feedback}
        </div>
      ) : null}

      <div className="full-width">
        <button type="submit" className="button button-primary big-button" disabled={status === 'loading'}>
          {status === 'loading' ? `WysyĹ‚am proĹ›bÄ™ o ${selectedService.label.toLowerCase()}...` : 'WyĹ›lij proĹ›bÄ™ o rezerwacjÄ™'}
        </button>
      </div>
    </form>
  )
}

