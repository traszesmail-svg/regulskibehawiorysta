'use client'

import Link from 'next/link'
import { useEffect, useState, type FormEvent } from 'react'
import { getProblemOptionsForSpecies, getPublicServicePriceLabel, type FunnelSpecies } from '@/lib/funnel'
import { readZapytajAvailability } from '@/lib/zapytaj-availability-client'

type UrgentAvailability = { status: 'available' | 'full' | 'weekend' | 'in_progress' | 'unavailable' | 'unknown' | 'offline' | 'online_with_slot' | 'online_without_slot'; acceptedCount: number; dailyLimit: number; date?: string | null; liveSlotAvailable?: boolean }

type ZapytajNaJuzFormProps = { standalone?: boolean }

export function ZapytajNaJuzForm({ standalone = false }: ZapytajNaJuzFormProps) {
  const [availability, setAvailability] = useState<UrgentAvailability | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [species, setSpecies] = useState<FunnelSpecies>('pies')
  const [topicId, setTopicId] = useState('')
  const [message, setMessage] = useState('')
  const [contactPreference, setContactPreference] = useState<'payment_link' | 'notify_only'>('payment_link')
  const [consentProcessing, setConsentProcessing] = useState(false)
  const [consentPolicy, setConsentPolicy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')
  const [notifyContact, setNotifyContact] = useState('')
  const [notifyChannel, setNotifyChannel] = useState<'sms' | 'email'>('sms')
  const [notifyConsent, setNotifyConsent] = useState(false)
  const [notifyFeedback, setNotifyFeedback] = useState('')
  const [notifyError, setNotifyError] = useState('')
  const [notifyLoading, setNotifyLoading] = useState(false)

  const topics = getProblemOptionsForSpecies(species)
  const selectedTopicId = topics.some((topic) => topic.id === topicId) ? topicId : topics[0]?.id ?? ''

  useEffect(() => {
    let active = true
    const refresh = async () => {
      try {
        const payload = await readZapytajAvailability<{ urgentNow?: UrgentAvailability }>('/api/zapytaj/availability', {
          signal: AbortSignal.timeout(6_000),
        })
        if (active) setAvailability(payload.urgentNow ?? { status: 'unavailable', acceptedCount: 0, dailyLimit: 2 })
      } catch {
        if (active) setAvailability({ status: 'unknown', acceptedCount: 0, dailyLimit: 2 })
      }
    }
    void refresh()
    const interval = window.setInterval(refresh, 30_000)
    return () => { active = false; window.clearInterval(interval) }
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setFeedback('')
    try {
      const response = await fetch('/api/urgent-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email, species, topicId: selectedTopicId, message, contactPreference, targetDate: availability?.date, consentProcessing, consentPolicy }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.ok) {
        setError(payload.error ?? 'Nie udało się wysłać zgłoszenia.')
        if (response.status === 409 && typeof payload.error === 'string' && payload.error.toLowerCase().includes('limit')) setAvailability((current) => ({ ...current, status: 'full', acceptedCount: current?.dailyLimit ?? 2, dailyLimit: current?.dailyLimit ?? 2 }))
        return
      }
      setFeedback(payload.message ?? 'Zgłoszenie zostało przyjęte.')
      setName(''); setPhone(''); setEmail(''); setMessage(''); setConsentProcessing(false); setConsentPolicy(false)
    } catch {
      setError('Nie udało się połączyć z formularzem. Spróbuj ponownie.')
    } finally {
      setLoading(false)
    }
  }

  async function submitNotification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotifyLoading(true); setNotifyError(''); setNotifyFeedback('')
    try {
      const response = await fetch('/api/zapytaj/notify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: notifyChannel, phone: notifyChannel === 'sms' ? notifyContact : '', email: notifyChannel === 'email' ? notifyContact : '', consentAvailability: notifyConsent }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? 'Nie udało się zapisać powiadomienia.')
      setNotifyFeedback(payload.message ?? 'Zapisano prośbę o powiadomienie.')
      setNotifyContact(''); setNotifyConsent(false)
    } catch (error) {
      setNotifyError(error instanceof Error ? error.message : 'Nie udało się zapisać powiadomienia.')
    } finally {
      setNotifyLoading(false)
    }
  }

  const hasLiveWindow = availability?.status === 'offline'
  const queueFull = availability?.status === 'full'
  const stateCopy = availability?.status === 'available' || availability?.status === 'offline'
    ? `Okno rozmowy nie jest aktywne. Najbliższy dostępny dzień: ${availability.date ?? 'do potwierdzenia'}. Godzinę potwierdzi operator.`
    : availability?.status === 'full'
      ? `Limit zgłoszeń na ${availability.date ?? 'najbliższy dostępny dzień'} jest już wykorzystany. Możesz wybrać tylko powiadomienie o dostępności.`
      : availability?.status === 'weekend'
        ? 'Zapytaj teraz jest dostępne w dni robocze. Wybierz termin w kalendarzu lub zapisz się na powiadomienie.'
      : availability?.status === 'in_progress'
          ? 'Trwa rozmowa albo oczekiwanie na płatność. Wybierz termin w kalendarzu lub zapisz się na powiadomienie.'
        : availability?.status === 'online_with_slot'
          ? 'Jest dostępna konkretna godzina. Wybierz ją w kalendarzu, aby przejść do rezerwacji i płatności.'
          : availability?.status === 'online_without_slot'
            ? 'Okno rozmowy jest aktywne, ale nie ma dostępnej godziny. Nie pobieramy płatności bez wybranego terminu.'
        : availability?.status === 'unavailable'
          ? 'Okno „Zapytaj teraz” jest nieaktywne. Wybierz termin w kalendarzu lub zapisz się na powiadomienie o dostępności.'
          : availability?.status === 'unknown'
            ? 'Nie udało się teraz sprawdzić statusu „Zapytaj teraz”. Nie wysyłaj zgłoszenia linkowego; wybierz termin w kalendarzu albo zapisz się na powiadomienie.'
          : 'Sprawdzam dostępność. Formularz pojawi się po potwierdzeniu aktywnego okna.'
  const canSubmit = hasLiveWindow && !queueFull && availability?.status !== 'unknown'
  useEffect(() => {
    if (queueFull) setContactPreference('notify_only')
  }, [queueFull])

  return (
    <section className={`zapytaj-urgent${hasLiveWindow ? ' is-open' : ' is-closed'}${standalone ? ' zapytaj-urgent-standalone' : ''}`} id={standalone ? undefined : 'zapytaj-teraz'} aria-labelledby="zapytaj-urgent-title">
      <div className="zapytaj-urgent-intro">
        <span className="zapytaj-kicker">SZYBSZA ŚCIEŻKA · DNI ROBOCZE</span>
        {standalone ? <h1 id="zapytaj-urgent-title">Zapytaj teraz</h1> : <h2 id="zapytaj-urgent-title">Zapytaj teraz</h2>}
        <p>Rozmowa trwa do 15 minut i kosztuje {getPublicServicePriceLabel('kwadrans-na-juz')}. Okno dostępności włączam ręcznie na godzinę w dni robocze między 8:00 a 20:00. Po potwierdzeniu godziny operator wyśle indywidualny link do płatności albo samo powiadomienie — zgodnie z Twoim wyborem.</p>
        <p className="zapytaj-urgent-state" role="status">{stateCopy}</p>
        <p className="zapytaj-urgent-note">Zgłoszenie nie rezerwuje terminu. Indywidualny link do płatności przychodzi dopiero po potwierdzeniu godziny. Kolejka linkowa obejmuje maksymalnie dwie osoby w danym dniu; powiadomienie nie zajmuje miejsca w tej kolejce. Po tym dniu wybierz termin w zwykłym kalendarzu.</p>
        {!hasLiveWindow ? <Link className="zapytaj-urgent-alt" href="/zapytaj#formularz">Wybierz termin w kalendarzu</Link> : null}
        {!hasLiveWindow || queueFull ? (
          <form className="zapytaj-urgent-notify" onSubmit={submitNotification}>
            <strong>Powiadom mnie, gdy będzie dostępne „Zapytaj teraz”</strong>
            <label>Kanał powiadomienia<select value={notifyChannel} onChange={(event) => setNotifyChannel(event.target.value as 'sms' | 'email')}><option value="sms">SMS</option><option value="email">E-mail</option></select></label>
            <label>{notifyChannel === 'sms' ? 'Numer telefonu' : 'Adres e-mail'}<input required type={notifyChannel === 'sms' ? 'tel' : 'email'} value={notifyContact} onChange={(event) => setNotifyContact(event.target.value)} autoComplete={notifyChannel === 'sms' ? 'tel' : 'email'} /></label>
            <label className="zapytaj-urgent-notify-consent"><input type="checkbox" checked={notifyConsent} onChange={(event) => setNotifyConsent(event.target.checked)} required /> Zgadzam się na jednorazowe powiadomienie o dostępności. Nie rezerwuje ono terminu.</label>
            <button className="zapytaj-urgent-notify-button" type="submit" disabled={notifyLoading}>{notifyLoading ? 'Zapisuję…' : 'Zapisz powiadomienie'}</button>
            {notifyError ? <span role="alert">{notifyError}</span> : null}
            {notifyFeedback ? <span role="status">{notifyFeedback}</span> : null}
          </form>
        ) : null}
      </div>

      {hasLiveWindow && !queueFull ? <form className="zapytaj-urgent-form" onSubmit={submit}>
        <div className="zapytaj-urgent-fields">
          <label>Imię<input required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" /></label>
          <label>Telefon<input required type="tel" maxLength={40} value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" /></label>
          <label>E-mail<input required type="email" maxLength={160} value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label>
          <label>Gatunek zwierzęcia<select value={species} onChange={(event) => { setSpecies(event.target.value as FunnelSpecies); setTopicId('') }}><option value="pies">Pies</option><option value="kot">Kot</option></select></label>
          <label>Temat<select value={selectedTopicId} onChange={(event) => setTopicId(event.target.value)}>{topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.title}</option>)}</select></label>
          <label className="zapytaj-urgent-message">Krótko opisz sytuację<textarea required minLength={10} maxLength={600} rows={3} value={message} onChange={(event) => setMessage(event.target.value)} /></label>
        </div>

        <fieldset className="zapytaj-urgent-preference">
          <legend>Jak mam się z Tobą skontaktować?</legend>
          <label><input type="radio" name="zapytaj-teraz-contact-preference" value="payment_link" checked={contactPreference === 'payment_link'} disabled={queueFull} onChange={() => setContactPreference('payment_link')} /> Chcę otrzymać indywidualny link po potwierdzeniu godziny</label>
          <label><input type="radio" name="zapytaj-teraz-contact-preference" value="notify_only" checked={contactPreference === 'notify_only'} onChange={() => setContactPreference('notify_only')} /> Tylko powiadomienie o dostępności</label>
          <small>Link nie jest wysyłany automatycznie. Po ustaleniu rzeczywistej godziny wysyła go operator. Ostateczną rezerwację potwierdza płatność.</small>
        </fieldset>

        <div className="zapytaj-urgent-consents">
          <label><input type="checkbox" checked={consentProcessing} onChange={(event) => setConsentProcessing(event.target.checked)} required /> Zgadzam się na kontakt w sprawie tego zgłoszenia na podany telefon i e-mail.</label>
          <label><input type="checkbox" checked={consentPolicy} onChange={(event) => setConsentPolicy(event.target.checked)} required /> Zapoznałem(-am) się z <Link href="/polityka-prywatnosci" target="_blank">polityką prywatności</Link>.</label>
        </div>
        <button className="notatnik-btn" type="submit" disabled={!canSubmit || loading}>{loading ? 'Wysyłam…' : 'Wyślij zgłoszenie'}</button>
        {error ? <p className="zapytaj-urgent-feedback" role="alert">{error} {error.includes('limit') || error.includes('Lim') ? <Link href="/zapytaj#formularz">Przejdź do zwykłych terminów i powiadomień</Link> : null}</p> : null}
        {feedback ? <p className="zapytaj-urgent-feedback" role="status">{feedback}</p> : null}
      </form> : null}
    </section>
  )
}
