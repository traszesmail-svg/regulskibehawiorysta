'use client'

import Link from 'next/link'
import { useEffect, useState, type FormEvent } from 'react'
import { addWarsawDateDays } from '@/lib/urgent-now-policy'

type IntakeState = 'checking' | 'open' | 'closed'

function warsawToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

function getMinimumTime(date: string) {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Warsaw', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  const current = Number(values.hour) * 60 + Number(values.minute)
  const rounded = Math.ceil(current / 30) * 30
  const time = `${String(Math.floor(rounded / 60)).padStart(2, '0')}:${String(rounded % 60).padStart(2, '0')}`
  return date === warsawToday() ? (time < '08:00' ? '08:00' : time) : '08:00'
}

export function ZapytajDzisForm() {
  const [state, setState] = useState<IntakeState>('checking')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [requestedDate, setRequestedDate] = useState('')
  const [requestedTime, setRequestedTime] = useState('')
  const [consent, setConsent] = useState(false)
  const [policy, setPolicy] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const today = warsawToday()
    const initialDate = getMinimumTime(today) <= '20:00' ? today : addWarsawDateDays(today, 1)
    setRequestedDate(initialDate)
    setRequestedTime(getMinimumTime(initialDate))
    fetch('/api/zapytaj-teraz', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data: { accepting?: boolean }) => setState(data.accepting === true ? 'open' : 'closed'))
      .catch(() => setState('closed'))
  }, [])

  function changeDate(date: string) {
    setRequestedDate(date)
    setRequestedTime(getMinimumTime(date))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/zapytaj-teraz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, message, requestedDate, requestedTime, consent, policy }),
      })
      const data = await response.json()
      if (!response.ok || !data.ok) {
        if (response.status === 409) setState('closed')
        setError(data.error ?? 'Nie udało się wysłać zgłoszenia. Spróbuj ponownie.')
        return
      }
      setSent(true)
    } catch {
      setError('Nie udało się połączyć z formularzem. Spróbuj ponownie.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="zapytaj-urgent zapytaj-urgent-standalone" id="zapytaj-o-rozmowe-dzis" aria-labelledby="zapytaj-dzis-title">
      <div className="zapytaj-urgent-intro">
        <span className="zapytaj-kicker">NAJSZYBSZY MOŻLIWY TERMIN</span>
        <h1 id="zapytaj-dzis-title">Zapytaj o pilny termin</h1>
        <p>Podaj, od kiedy możesz rozmawiać — dziś lub jutro. Zgłoszenie nie jest rezerwacją. Odpowiedź otrzymasz SMS-em.</p>
      </div>

      {state === 'checking' ? <p role="status">Sprawdzam możliwość przyjęcia zgłoszenia.</p> : null}
      {state === 'closed' ? (
        <div role="status" className="zapytaj-urgent-feedback">
          <p>Nie przyjmuję teraz zgłoszeń o pilny termin. Możesz wybrać termin w zwykłym kalendarzu.</p>
          <Link className="notatnik-btn" href="/zapytaj#formularz">Wybierz zwykły termin</Link>
        </div>
      ) : null}
      {state === 'open' && sent ? (
        <p role="status" className="zapytaj-urgent-feedback">Zgłoszenie zostało przyjęte. To nie jest rezerwacja — odpowiedź z propozycją terminu otrzymasz SMS-em.</p>
      ) : null}
      {state === 'open' && !sent ? (
        <form className="zapytaj-urgent-form" onSubmit={submit}>
          <div className="zapytaj-urgent-fields">
            <label>Imię<input required maxLength={120} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} /></label>
            <label>Numer telefonu<input required type="tel" maxLength={40} autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
            <label>Najwcześniejszy dzień<select required value={requestedDate} onChange={(event) => changeDate(event.target.value)}>
              <option value={warsawToday()} disabled={getMinimumTime(warsawToday()) > '20:00'}>Dziś</option>
              <option value={addWarsawDateDays(warsawToday(), 1)}>Jutro</option>
            </select></label>
            <label>Możesz rozmawiać od<input required type="time" min={getMinimumTime(requestedDate)} max="20:00" step={1800} value={requestedTime} onChange={(event) => setRequestedTime(event.target.value)} /></label>
            <label className="zapytaj-urgent-message">Krótko opisz sytuację<textarea required minLength={10} maxLength={600} rows={4} value={message} onChange={(event) => setMessage(event.target.value)} /></label>
          </div>
          <div className="zapytaj-urgent-consents">
            <label><input type="checkbox" required checked={consent} onChange={(event) => setConsent(event.target.checked)} /> Zgadzam się na kontakt telefoniczny w sprawie tego zgłoszenia.</label>
            <label><input type="checkbox" required checked={policy} onChange={(event) => setPolicy(event.target.checked)} /> Zapoznałem(-am) się z <Link href="/polityka-prywatnosci" target="_blank">polityką prywatności</Link>.</label>
          </div>
          <button className="notatnik-btn" type="submit" disabled={busy}>{busy ? 'Wysyłam…' : 'Wyślij zgłoszenie'}</button>
          {error ? <p role="alert" className="zapytaj-urgent-feedback">{error}</p> : null}
        </form>
      ) : null}
    </section>
  )
}
