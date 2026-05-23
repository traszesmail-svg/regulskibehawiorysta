'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import { trackAnalyticsEvent } from '@/lib/analytics'
import { type FunnelSpecies } from '@/lib/funnel'
import { URGENT_NOW_INTENT, isUrgentNowIntent } from '@/lib/urgent-now'

type FormState = 'idle' | 'loading' | 'success' | 'error'
type Species = FunnelSpecies
type SelectedSpecies = Species | ''

type SubmissionPayload = {
  name: string
  contact: string
  species: SelectedSpecies
  message: string
  requestedDate: string
  requestedTime: string
  website: string
  consentProcessing: boolean
  consentPolicy: boolean
}

const MESSAGE_MAX_LENGTH = 500

function createInitialForm(species: SelectedSpecies = ''): SubmissionPayload {
  return {
    name: '',
    contact: '',
    species,
    message: '',
    requestedDate: '',
    requestedTime: '',
    website: '',
    consentProcessing: false,
    consentPolicy: false,
  }
}

function isEmailValid(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function normalizeShortText(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function normalizeLongText(value: string): string {
  return value.replace(/\r\n/g, '\n').trim()
}

function normalizeSpeciesPreset(value: string | null): Species | null {
  if (value === 'pies' || value === 'kot') {
    return value
  }

  return null
}

export function ContactLeadForm() {
  const searchParams = useSearchParams()
  const presetSpecies = normalizeSpeciesPreset(searchParams?.get('species') ?? null)
  const intent = searchParams?.get('intent') ?? searchParams?.get('service') ?? null
  const presetDate = searchParams?.get('requestedDate') ?? null
  const presetTime = searchParams?.get('requestedTime') ?? null
  const wasSentByFallback = searchParams?.get('sent') === '1'
  const fallbackError = searchParams?.get('error') ?? null
  const isUrgentNow = isUrgentNowIntent(intent)
  const [form, setForm] = useState<SubmissionPayload>({
    ...createInitialForm(presetSpecies ?? ''),
    requestedDate: presetDate ?? '',
    requestedTime: presetTime ?? '',
  })
  const [status, setStatus] = useState<FormState>('idle')
  const [feedback, setFeedback] = useState('')
  const startedRef = useRef(false)
  const messageLength = form.message.length
  const isSubmitDisabled = status === 'loading'

  useEffect(() => {
    if (!presetSpecies) {
      return
    }

    setForm((current) => {
      if (current.species === presetSpecies) {
        return current
      }

      return {
        ...current,
        species: presetSpecies,
      }
    })
  }, [presetSpecies])

  useEffect(() => {
    if (wasSentByFallback) {
      setStatus('success')
      setFeedback(
        isUrgentNow
          ? 'Dziękuję. Prośba o Kwadrans na już została przyjęta. Odpowiem priorytetowo na podany adres e-mail z realną propozycją terminu.'
          : 'Dziękuję za wiadomość. Wiadomość trafiła do mnie. Odpowiem na podany adres e-mail.',
      )
      return
    }

    if (fallbackError) {
      setStatus('error')
      setFeedback(fallbackError)
    }
  }, [fallbackError, isUrgentNow, wasSentByFallback])

  function markStarted() {
    if (startedRef.current) {
      return
    }

    startedRef.current = true
    trackAnalyticsEvent('contact_form_started', {
      source_page: '/kontakt',
      species: form.species,
      intent: isUrgentNow ? URGENT_NOW_INTENT : 'contact',
    })
  }

  function updateField<K extends keyof SubmissionPayload>(key: K, value: SubmissionPayload[K]) {
    markStarted()

    if (status === 'success') {
      setStatus('idle')
      setFeedback('')
    }

    setForm((current) => ({ ...current, [key]: value }))
  }

  function chooseSpecies(species: Species) {
    markStarted()

    if (status === 'success') {
      setStatus('idle')
      setFeedback('')
    }

    setForm((current) => ({
      ...current,
      species,
    }))
  }

  function validate(): string | null {
    const normalizedName = normalizeShortText(form.name)
    const normalizedContact = normalizeShortText(form.contact)
    const normalizedMessage = normalizeLongText(form.message)

    if (!normalizedName) {
      return 'Podaj imię.'
    }

    if (!normalizedContact || !isEmailValid(normalizedContact)) {
      return 'Podaj poprawny adres e-mail.'
    }

    if (!form.species) {
      return 'Wybierz psa albo kota.'
    }

    if (normalizedMessage.length < 20) {
      return 'Opisz sytuację w 2-4 zdaniach.'
    }

    if (normalizedMessage.length > MESSAGE_MAX_LENGTH) {
      return 'Skróć opis sytuacji do krótkiej wiadomości.'
    }

    if (isUrgentNow && (!form.requestedDate || !form.requestedTime)) {
      return 'Przy Kwadransie na już podaj preferowaną datę i godzinę.'
    }

    if (!form.consentProcessing || !form.consentPolicy) {
      return 'Zaznacz zgody na kontakt i akceptację polityki prywatności.'
    }

    return null
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    markStarted()

    const validationError = validate()

    if (validationError) {
      setStatus('error')
      setFeedback(validationError)
      return
    }

    const selectedSpecies = form.species

    if (!selectedSpecies) {
      setStatus('error')
      setFeedback('Wybierz psa albo kota.')
      return
    }

    setStatus('loading')
    setFeedback('')

    const normalizedMessage = normalizeLongText(form.message)

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: normalizeShortText(form.name),
          email: normalizeShortText(form.contact),
          contact: normalizeShortText(form.contact),
          species: selectedSpecies,
          topicId: 'inne',
          topic: 'Wiadomość z formularza kontaktowego',
          message: normalizedMessage,
          requestedDate: isUrgentNow ? form.requestedDate : null,
          requestedTime: isUrgentNow ? form.requestedTime : null,
          intent: isUrgentNow ? URGENT_NOW_INTENT : null,
          service: isUrgentNow ? URGENT_NOW_INTENT : null,
          website: form.website.trim(),
          consentProcessing: form.consentProcessing,
          consentPolicy: form.consentPolicy,
        }),
      })

      const payload = (await response.json()) as { ok?: boolean; message?: string; error?: string }

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Nie udało się wysłać wiadomości. Spróbuj ponownie później.')
      }

      trackAnalyticsEvent('contact_form_submitted', {
        source_page: '/kontakt',
        species: selectedSpecies,
        problem_key: 'kontakt',
        intent: isUrgentNow ? URGENT_NOW_INTENT : 'contact',
      })

      setStatus('success')
      setFeedback(
        payload.message ??
          (isUrgentNow
            ? 'Dziękuję. Prośba o Kwadrans na już została przyjęta. Odpowiem priorytetowo na podany adres e-mail z realną propozycją terminu.'
            : 'Dziękuję za wiadomość. Wiadomość trafiła do mnie. Odpowiem na podany adres e-mail.'),
      )
      setForm(createInitialForm(presetSpecies ?? ''))
      startedRef.current = false
    } catch (error) {
      setStatus('error')
      setFeedback(error instanceof Error ? error.message : 'Nie udało się wysłać wiadomości. Spróbuj ponownie później.')
    }
  }

  const submitLabel =
    status === 'loading'
      ? isUrgentNow
        ? 'Wysyłam prośbę...'
        : 'Wysyłam...'
      : status === 'success'
        ? isUrgentNow
          ? 'Wyślij kolejną prośbę'
          : 'Wyślij kolejną'
        : isUrgentNow
          ? 'Wyślij'
          : 'Wyślij'

  return (
    <form className="form-grid top-gap" action="/api/contact" method="post" onSubmit={handleSubmit} noValidate>
      <input type="hidden" name="topicId" value="inne" />
      <input type="hidden" name="topic" value="Wiadomość z formularza kontaktowego" />
      {isUrgentNow ? (
        <>
          <input type="hidden" name="intent" value={URGENT_NOW_INTENT} />
          <input type="hidden" name="service" value={URGENT_NOW_INTENT} />
        </>
      ) : null}
      <fieldset className="full-width form-field contact-species-field">
        <legend>Gatunek</legend>
        <div className="contact-species-toggle" aria-label="Wybierz gatunek">
          <label
            className={`contact-species-card${form.species === 'pies' ? ' is-selected' : ''}`}
          >
            <input
              className="sr-only contact-species-radio"
              type="radio"
              name="species"
              value="pies"
              checked={form.species === 'pies'}
              onChange={() => chooseSpecies('pies')}
              onFocus={markStarted}
              required
            />
            <Image src="/branding/homepage/choice-dog-clean.png" alt="" width={44} height={38} aria-hidden="true" />
            <span>Pies</span>
          </label>
          <label
            className={`contact-species-card${form.species === 'kot' ? ' is-selected' : ''}`}
          >
            <input
              className="sr-only contact-species-radio"
              type="radio"
              name="species"
              value="kot"
              checked={form.species === 'kot'}
              onChange={() => chooseSpecies('kot')}
              onFocus={markStarted}
              required
            />
            <Image src="/branding/homepage/choice-cat-clean.png" alt="" width={40} height={46} aria-hidden="true" />
            <span>Kot</span>
          </label>
        </div>
      </fieldset>

      <div className="form-field">
        <label htmlFor="contact-name">Imię</label>
        <input
          id="contact-name"
          name="name"
          value={form.name}
          onChange={(event) => updateField('name', event.target.value)}
          onFocus={markStarted}
          placeholder="np. Anna"
          autoComplete="name"
        />
      </div>

      <div className="form-field">
        <label htmlFor="contact-contact">E-mail</label>
        <input
          id="contact-contact"
          name="contact"
          type="email"
          value={form.contact}
          onChange={(event) => updateField('contact', event.target.value)}
          onFocus={markStarted}
          placeholder="np. anna@email.pl"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="off"
          enterKeyHint="next"
          spellCheck={false}
        />
      </div>

      {isUrgentNow ? (
        <>
          <div className="form-field">
            <label htmlFor="contact-requested-date">Preferowana data</label>
            <input
              id="contact-requested-date"
              name="requestedDate"
              type="date"
              value={form.requestedDate}
              onChange={(event) => updateField('requestedDate', event.target.value)}
              onFocus={markStarted}
            />
          </div>

          <div className="form-field">
            <label htmlFor="contact-requested-time">Preferowana godzina</label>
            <input
              id="contact-requested-time"
              name="requestedTime"
              type="time"
              value={form.requestedTime}
              onChange={(event) => updateField('requestedTime', event.target.value)}
              onFocus={markStarted}
            />
          </div>
        </>
      ) : null}

      <div className="full-width form-field">
        <div className="contact-message-label-row">
          <label htmlFor="contact-message">{isUrgentNow ? 'Krótki opis i kontekst terminu' : 'Krótki opis sytuacji'}</label>
          <span className="contact-message-count" aria-live="polite">
            {messageLength}/{MESSAGE_MAX_LENGTH}
          </span>
        </div>
        <textarea
          id="contact-message"
          name="message"
          rows={4}
          value={form.message}
          onChange={(event) => updateField('message', event.target.value.slice(0, MESSAGE_MAX_LENGTH))}
          onFocus={markStarted}
          placeholder={
            isUrgentNow
              ? 'Napisz w 2-4 zdaniach, czego dotyczy temat i czy wskazana data/godzina są sztywne czy orientacyjne.'
              : 'Napisz po ludzku, co się dzieje: od kiedy trwa sytuacja, kiedy się pojawia, co już próbowaliście i co najbardziej Cię martwi.'
          }
          enterKeyHint="send"
          maxLength={MESSAGE_MAX_LENGTH}
        />
      </div>

      <fieldset className="full-width form-field consent-stack">
        <label className="checkbox-card" htmlFor="contact-consent-processing">
          <input
            id="contact-consent-processing"
            name="consentProcessing"
            type="checkbox"
            checked={form.consentProcessing}
            onChange={(event) => updateField('consentProcessing', event.target.checked)}
            onFocus={markStarted}
            required
          />
          <span>
            Wyrażam zgodę na przetwarzanie danych zgodnie z{' '}
            <Link href="/polityka-prywatnosci" target="_blank" rel="noopener noreferrer">
              polityką prywatności
            </Link>
            .
          </span>
        </label>

        <label className="checkbox-card" htmlFor="contact-consent-policy">
          <input
            id="contact-consent-policy"
            name="consentPolicy"
            type="checkbox"
            checked={form.consentPolicy}
            onChange={(event) => updateField('consentPolicy', event.target.checked)}
            onFocus={markStarted}
            required
          />
          <span>
            Zapoznałem się z{' '}
            <Link href="/polityka-prywatnosci" target="_blank" rel="noopener noreferrer">
              polityką prywatności
            </Link>{' '}
            i{' '}
            <Link href="/regulamin" target="_blank" rel="noopener noreferrer">
              regulaminem
            </Link>
            .
          </span>
        </label>
      </fieldset>

      <input
        id="contact-website"
        name="website"
        type="text"
        value={form.website}
        onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="sr-only"
      />

      {feedback ? (
        <div className={`info-box full-width ${status === 'error' ? 'error-box' : ''}`} role="status">
          <p>{feedback}</p>
          {status === 'success' ? (
            <div className="contact-success-next">
              <p>W międzyczasie możesz zajrzeć do materiałów. Są tam bezpłatne PDF-y, przewodniki i gotowe ścieżki tematyczne.</p>
              <div>
                <Link href="/materialy" prefetch={false} className="prep-inline-link">
                  Zobacz materiały
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="full-width">
        <button type="submit" className="button button-primary big-button" disabled={isSubmitDisabled}>
          {submitLabel}
        </button>
      </div>
    </form>
  )
}
