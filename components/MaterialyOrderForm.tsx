'use client'

import { useState } from 'react'
import Link from 'next/link'

type Props = {
  productKind: 'guide' | 'bundle'
  productSlug: string
  productTitle: string
  priceLabel: string
  priceAmount: number
}

type SubmitState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'free-ok'; orderId: string; downloadUrl: string | null }
  | { status: 'error'; message: string }

export function MaterialyOrderForm({ productKind, productSlug, productTitle, priceLabel, priceAmount }: Props) {
  const isFree = priceAmount === 0
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [website, setWebsite] = useState('')
  const [consentProcessing, setConsentProcessing] = useState(false)
  const [consentPolicy, setConsentPolicy] = useState(false)
  const [state, setState] = useState<SubmitState>({ status: 'idle' })

  function startDownload(downloadUrl: string) {
    const anchor = document.createElement('a')
    anchor.href = downloadUrl
    anchor.download = ''
    anchor.rel = 'noopener'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (state.status === 'submitting') return
    setState({ status: 'submitting' })

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          kind: 'ebook',
          productKind,
          productSlug,
          name: isFree ? name || email.split('@')[0] || 'Czytelnik' : name,
          email,
          notes,
          website,
          consentProcessing: isFree ? true : consentProcessing,
          consentPolicy: isFree ? true : consentPolicy,
        }),
      })
      const data = (await res.json()) as Record<string, unknown>

      if (!res.ok) {
        setState({ status: 'error', message: typeof data.error === 'string' ? data.error : 'Coś poszło nie tak.' })
        return
      }

      if (data.free === true) {
        const downloadUrl = typeof data.downloadUrl === 'string' ? data.downloadUrl : null
        if (downloadUrl) {
          startDownload(downloadUrl)
        }
        setState({ status: 'free-ok', orderId: String(data.orderNumber ?? data.orderId), downloadUrl })
        return
      }

      window.location.assign(String(data.redirectTo ?? '/checkout'))
    } catch {
      setState({ status: 'error', message: 'Brak połączenia. Spróbuj ponownie.' })
    }
  }

  if (state.status === 'free-ok') {
    return (
      <div className="materialy-success">
        <h2>Pobieranie rozpoczęte</h2>
        <p>
          PDF powinien pobrać się automatycznie. Wysłałem też kod dostępu na <strong>{email}</strong>, gdyby trzeba
          było wrócić do pliku później.
        </p>
        <div className="hero-actions">
          {state.downloadUrl ? (
            <a href={state.downloadUrl} className="notatnik-btn">
              <span>Pobierz PDF ponownie</span>
              <span className="notatnik-btn-arrow" aria-hidden="true">
                &rarr;
              </span>
            </a>
          ) : null}
          <Link href="/dostep" className="notatnik-btn notatnik-btn-ghost">
            <span>Wpisz kod z maila</span>
          </Link>
        </div>
        <p className="field-help">
          Numer zamówienia: <code>{state.orderId}</code>.
        </p>
      </div>
    )
  }

  return (
    <form className="materialy-form" onSubmit={handleSubmit} noValidate data-free-download={isFree ? 'true' : 'false'}>
      <p className="form-summary">
        Zamawiasz: <strong>{productTitle}</strong> - <strong>{priceLabel}</strong>
        {!isFree && ' (w kolejnym kroku dostaniesz instrukcję płatności)'}
      </p>

      {!isFree ? (
        <label>
          Imię
          <input
            type="text"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={120}
            autoComplete="given-name"
          />
        </label>
      ) : null}

      <label>
        E-mail
        <input
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          maxLength={160}
          autoComplete="email"
          placeholder="twoj@email.pl"
        />
      </label>

      {!isFree ? (
        <label>
          Krótka notatka (opcjonalnie)
          <textarea
            name="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={1200}
            rows={3}
          />
        </label>
      ) : null}

      <input
        type="text"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="sr-only"
      />

      {isFree ? (
        <p className="field-help free-download-note">
          Po wpisaniu e-maila PDF pobierze się od razu. Link i kod zapasowy wyślę też na skrzynkę. Dane obsługuję
          zgodnie z{' '}
          <Link href="/polityka-prywatnosci" className="notatnik-inline-link">
            polityką prywatności
          </Link>
          .
        </p>
      ) : (
        <>
          <label className="consent-line" aria-label="Wyrażam zgodę na przetwarzanie danych zgodnie z polityką prywatności.">
            <input
              type="checkbox"
              checked={consentProcessing}
              onChange={(e) => setConsentProcessing(e.target.checked)}
              required
            />
            <span>
              Wyrażam zgodę na przetwarzanie danych zgodnie z{' '}
              <Link href="/polityka-prywatnosci" className="notatnik-inline-link">
                polityką prywatności
              </Link>
              .
            </span>
          </label>

          <label className="consent-line" aria-label="Zapoznałem się z polityką prywatności i regulaminem.">
            <input
              type="checkbox"
              checked={consentPolicy}
              onChange={(e) => setConsentPolicy(e.target.checked)}
              required
            />
            <span>
              Zapoznałem się z{' '}
              <Link href="/polityka-prywatnosci" className="notatnik-inline-link">
                polityką prywatności
              </Link>{' '}
              i{' '}
              <Link href="/regulamin" className="notatnik-inline-link">
                regulaminem
              </Link>
              .
            </span>
          </label>
        </>
      )}

      {state.status === 'error' ? <p className="form-error">{state.message}</p> : null}

      <button type="submit" className="notatnik-btn" disabled={state.status === 'submitting'}>
        <span>{state.status === 'submitting' ? 'Przygotowuję...' : isFree ? 'Pobierz PDF' : 'Przejdź do płatności'}</span>
        {state.status !== 'submitting' ? (
          <span className="notatnik-btn-arrow" aria-hidden="true">
            &rarr;
          </span>
        ) : null}
      </button>
    </form>
  )
}
