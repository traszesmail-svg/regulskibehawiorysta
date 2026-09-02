'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Clock3, PhoneCall, RefreshCw } from 'lucide-react'
import { trackAnalyticsEvent } from '@/lib/analytics'

type Species = 'pies' | 'kot' | ''
type ConversationMode = 'scheduled' | 'live'
type FormStatus = 'idle' | 'loading' | 'error'
type NotificationChannel = 'sms' | 'email'
type NotificationStatus = 'idle' | 'loading' | 'success' | 'error'

type LiveStatus = {
  status: 'unavailable' | 'offline' | 'available_now' | 'payment_pending' | 'in_call' | 'buffer'
  label: string
  message: string
  livePricePln: number
  liveSlotId: string | null
  enabledUntil: string | null
  storageAvailable: boolean
}

type ScheduleSlot = { id: string; date: string; time: string; label: string }
type AvailabilityPayload = {
  live: LiveStatus
  slots: ScheduleSlot[]
  holdMinutes: number
  manualConfirmationHours: number
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

function getLiveOptionLabel(live: LiveStatus) {
  return live.status === 'in_call' ? 'Zarezerwuj następne okno' : 'Zapytaj teraz'
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
  const [mode, setMode] = useState<ConversationMode>('scheduled')
  const [selectedSlotId, setSelectedSlotId] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [notificationChannel, setNotificationChannel] = useState<NotificationChannel>('sms')
  const [notificationConsent, setNotificationConsent] = useState(false)
  const [notificationStatus, setNotificationStatus] = useState<NotificationStatus>('idle')
  const [notificationFeedback, setNotificationFeedback] = useState('')
  const [promotionCode, setPromotionCode] = useState(initialPromotionCode)

  async function refreshAvailability(showLoading = false) {
    if (showLoading) setIsRefreshing(true)

    try {
      const response = await fetch('/api/zapytaj/availability', { cache: 'no-store' })
      const payload = (await response.json()) as AvailabilityPayload

      if (!response.ok || !payload.live || !Array.isArray(payload.slots)) {
        throw new Error('Nie udało się pobrać dostępności.')
      }

      setAvailability(payload)
      setAvailabilityError('')
      setSelectedSlotId((current) => {
        if (current && payload.slots.some((slot) => slot.id === current)) return current
        return payload.slots[0]?.id ?? ''
      })
    } catch (error) {
      setAvailabilityError(error instanceof Error ? error.message : 'Dostępność jest chwilowo niedostępna.')
    } finally {
      if (showLoading) setIsRefreshing(false)
    }
  }

  useEffect(() => {
    void refreshAvailability()
    const interval = window.setInterval(() => void refreshAvailability(), 20_000)
    return () => window.clearInterval(interval)
  }, [])

  const live = availability?.live ?? null
  const liveAvailable = !promotionMode && Boolean(live?.liveSlotId && (live.status === 'available_now' || live.status === 'in_call'))
  const selectedSlot = useMemo(
    () => availability?.slots.find((slot) => slot.id === selectedSlotId) ?? null,
    [availability?.slots, selectedSlotId],
  )

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setStatus('idle')
    setFeedback('')
    setForm((current) => ({ ...current, [field]: value }))
  }

  function selectMode(nextMode: ConversationMode) {
    if (promotionMode && nextMode === 'live') return

    setStatus('idle')
    setFeedback('')
    setMode(nextMode)
    if (nextMode === 'live' && live?.liveSlotId) setSelectedSlotId(live.liveSlotId)
    if (nextMode === 'scheduled' && selectedSlotId === live?.liveSlotId) setSelectedSlotId(availability?.slots[0]?.id ?? '')
  }

  async function handleNotify() {
    if (notificationStatus === 'loading') return

    if (!notificationConsent) {
      setNotificationStatus('error')
      setNotificationFeedback('Zaznacz zgodę na jednorazowe powiadomienie.')
      return
    }

    if (notificationChannel === 'sms' && !/^\+?[0-9 ()-]{9,}$/.test(form.phone.trim())) {
      setNotificationStatus('error')
      setNotificationFeedback('Podaj poprawny numer telefonu do powiadomienia SMS.')
      return
    }

    if (notificationChannel === 'email' && !isEmail(form.email.trim())) {
      setNotificationStatus('error')
      setNotificationFeedback('Podaj poprawny adres e-mail do powiadomienia.')
      return
    }

    setNotificationStatus('loading')
    setNotificationFeedback('')

    try {
      const fallbackEmail = isEmail(form.email.trim()) ? form.email.trim() : ''
      const response = await fetch('/api/zapytaj/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: form.phone,
          email: fallbackEmail || null,
          channel: notificationChannel,
          consentAvailability: notificationConsent,
        }),
      })
      const payload = (await response.json()) as { message?: string; error?: string }

      if (!response.ok) {
        throw new Error(payload.error ?? 'Nie udało się zapisać powiadomienia.')
      }

      setNotificationStatus('success')
      setNotificationFeedback(payload.message ?? 'Powiadomienie zostało zapisane.')
      setNotificationConsent(false)
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

    if (mode === 'scheduled' && !selectedSlot) {
      setStatus('error')
      setFeedback('Wybierz termin rozmowy.')
      return
    }

    if (mode === 'live' && !liveAvailable) {
      setStatus('error')
      setFeedback('Okno live właśnie zniknęło. Odśwież dostępność albo wybierz zwykły termin.')
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
      intent: promotionMode ? 'zapytaj-promocja' : mode === 'live' ? 'zapytaj-live' : 'zapytaj-termin',
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
          mode,
          slotId: mode === 'live' ? live?.liveSlotId : selectedSlotId,
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
      <div className="zapytaj-availability" aria-live="polite">
        <div className="zapytaj-availability-head">
          <div>
            <span className="zapytaj-form-card-kicker">DOSTĘPNOŚĆ ROZMOWY</span>
            <strong>{promotionMode ? 'Zwykłe terminy rozmowy' : live?.label ?? 'Sprawdzam dostępność…'}</strong>
          </div>
          <button type="button" className="zapytaj-refresh-button" onClick={() => void refreshAvailability(true)} disabled={isRefreshing}>
            <RefreshCw size={14} aria-hidden="true" />
            {isRefreshing ? 'Sprawdzam…' : 'Odśwież'}
          </button>
        </div>
        <p>{promotionMode ? 'Kod grupowy działa tylko przy rezerwacji zwykłego terminu.' : availabilityError || live?.message || 'Za chwilę pokażę wolne opcje rozmowy.'}</p>
        {!promotionMode && liveAvailable ? (
          <button type="button" className={`zapytaj-live-option${mode === 'live' ? ' is-selected' : ''}`} onClick={() => selectMode('live')}>
            <PhoneCall size={18} aria-hidden="true" />
            <span>
              <strong>{getLiveOptionLabel(live!)} — {live!.livePricePln} zł</strong>
              <small>{live?.status === 'in_call' ? 'Jedno następne okno, bez tworzenia kolejki bez końca.' : 'Po potwierdzeniu wpłaty połączenie uruchomi się automatycznie.'}</small>
            </span>
          </button>
        ) : null}
      </div>

      <div className="zapytaj-form-choice-head">
        <div>
          <span className="zapytaj-form-card-kicker">WYBIERZ SPOSÓB</span>
          <strong>{mode === 'live' ? 'Rozmowa teraz' : 'Rozmowa w wybranym terminie'}</strong>
        </div>
        <span className="zapytaj-form-choice-price">{promotionMode ? COMMUNITY_PROMO_PRICE_LABEL : mode === 'live' ? '104 zł' : '79 zł'}</span>
      </div>

      <div className="zapytaj-mode-grid" role="radiogroup" aria-label="Sposób rozmowy">
        <button type="button" role="radio" aria-checked={mode === 'scheduled'} className={`zapytaj-mode-option${mode === 'scheduled' ? ' is-selected' : ''}`} onClick={() => selectMode('scheduled')}>
          <Clock3 size={17} aria-hidden="true" />
          <span><strong>Wybieram termin</strong><small>{promotionMode ? `${COMMUNITY_PROMO_PRICE_LABEL} · oferta z kodem` : '79 zł · zwykła rezerwacja'}</small></span>
        </button>
        {!promotionMode ? (
          <button type="button" role="radio" aria-checked={mode === 'live'} className={`zapytaj-mode-option${mode === 'live' ? ' is-selected' : ''}`} onClick={() => selectMode('live')} disabled={!liveAvailable}>
            <PhoneCall size={17} aria-hidden="true" />
            <span><strong>Zapytaj teraz</strong><small>{liveAvailable ? '104 zł · tylko przy realnej dostępności' : 'Obecnie niedostępne'}</small></span>
          </button>
        ) : null}
      </div>

      {mode === 'scheduled' ? (
        <fieldset className="zapytaj-slot-field">
          <legend>Wybierz termin rozmowy</legend>
          {availability?.slots.length ? (
            <div className="zapytaj-slot-grid">
              {availability.slots.map((slot) => (
                <button type="button" key={slot.id} className={`zapytaj-slot-option${selectedSlotId === slot.id ? ' is-selected' : ''}`} onClick={() => setSelectedSlotId(slot.id)}>
                  {slot.label}
                </button>
              ))}
            </div>
          ) : (
            <p className="zapytaj-empty-slots">Nie ma jeszcze zwykłych terminów. Odśwież stronę później.</p>
          )}
        </fieldset>
      ) : (
        <div className="zapytaj-live-confirmation"><PhoneCall size={17} aria-hidden="true" /><span>Rezerwujesz najbliższe dostępne okno live. Termin zostanie zajęty dopiero na czas płatności.</span></div>
      )}

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
        <div className="zapytaj-field zapytaj-field-wide">
          <div className="zapytaj-label-row"><label htmlFor="zapytaj-description">Opisz krótko, co się dzieje z Twoim psem lub kotem</label><span>{form.description.length}/{DESCRIPTION_MAX_LENGTH}</span></div>
          <textarea id="zapytaj-description" name="description" rows={6} value={form.description} onChange={(event) => updateField('description', event.target.value.slice(0, DESCRIPTION_MAX_LENGTH))} placeholder="Co się dzieje, od kiedy i w jakich sytuacjach? Napisz też, co zostało już wypróbowane." maxLength={DESCRIPTION_MAX_LENGTH} />
          <small>Nie musisz znać nazwy problemu ani przyczyny. Wystarczy opis codziennej sytuacji.</small>
        </div>
      </div>

      {!promotionMode && live && !liveAvailable ? (
        <div className="zapytaj-notification-box">
          <div className="zapytaj-notification-copy">
            <span className="zapytaj-form-card-kicker">POWIADOMIENIE O LIVE</span>
            <strong>Nie chcesz sprawdzać strony? Zostaw kontakt.</strong>
            <p>Gdy włączę rozmowę teraz, system spróbuje wysłać Ci jednorazową wiadomość. To nie rezerwuje miejsca.</p>
          </div>
          <div className="zapytaj-notification-channels" role="radiogroup" aria-label="Kanał powiadomienia">
            <button type="button" role="radio" aria-checked={notificationChannel === 'sms'} className={notificationChannel === 'sms' ? 'is-selected' : ''} onClick={() => setNotificationChannel('sms')}>
              SMS <small>preferowany</small>
            </button>
            <button type="button" role="radio" aria-checked={notificationChannel === 'email'} className={notificationChannel === 'email' ? 'is-selected' : ''} onClick={() => setNotificationChannel('email')}>
              E-mail
            </button>
          </div>
          <label className="zapytaj-notification-consent">
            <input type="checkbox" checked={notificationConsent} onChange={(event) => { setNotificationConsent(event.target.checked); setNotificationStatus('idle'); setNotificationFeedback('') }} />
            <span>Zgadzam się na jednorazowe powiadomienie o dostępności zgodnie z <Link href="/polityka-prywatnosci" target="_blank" rel="noopener noreferrer">polityką prywatności</Link>.</span>
          </label>
          <button type="button" className="zapytaj-notification-submit" onClick={() => void handleNotify()} disabled={notificationStatus === 'loading'}>
            {notificationStatus === 'loading' ? 'Zapisuję…' : 'Zapisz powiadomienie'}
          </button>
          {notificationFeedback ? <div className={`zapytaj-notification-feedback${notificationStatus === 'error' ? ' is-error' : ''}`} role="status">{notificationFeedback}</div> : null}
        </div>
      ) : null}

      <div className="zapytaj-consents">
        <label><input type="checkbox" checked={form.consentProcessing} onChange={(event) => updateField('consentProcessing', event.target.checked)} /><span>Wyrażam zgodę na przetwarzanie danych zgodnie z <Link href="/polityka-prywatnosci" target="_blank" rel="noopener noreferrer">polityką prywatności</Link>.</span></label>
        <label><input type="checkbox" checked={form.consentPolicy} onChange={(event) => updateField('consentPolicy', event.target.checked)} /><span>Akceptuję <Link href="/regulamin" target="_blank" rel="noopener noreferrer">regulamin</Link> usługi.</span></label>
        <label><input type="checkbox" checked={form.consentEarlyStart} onChange={(event) => updateField('consentEarlyStart', event.target.checked)} /><span>Proszę o rozpoczęcie płatnej rozmowy przed upływem 14 dni i przyjmuję, że po jej wykonaniu prawo odstąpienia może nie przysługiwać.</span></label>
      </div>

      {feedback ? <div className={`zapytaj-form-feedback${status === 'error' ? ' is-error' : ''}`} role="status">{feedback}</div> : null}

      <button type="submit" className="notatnik-btn zapytaj-form-submit" disabled={status === 'loading'}>
        {status === 'loading' ? 'Przygotowuję rezerwację…' : promotionMode ? `Przejdź do płatności — ${COMMUNITY_PROMO_PRICE_LABEL}` : mode === 'live' ? 'Zapytaj teraz — 104 zł' : 'Wybierz termin — 79 zł'}
      </button>
      <p className="zapytaj-form-note">Po wysłaniu opisu przejdziesz do płatności BLIK. Termin jest wstępnie blokowany na 5 minut; po zgłoszeniu wpłaty czeka na ręczne potwierdzenie maksymalnie 24 godziny.</p>
    </form>
  )
}
