'use client'

import { useState, type FormEvent } from 'react'
import { trackAnalyticsEvent } from '@/lib/analytics'
import { PUBLIC_OFFER_PAYMENT_METHODS } from '@/lib/public-offer-copy'

type PdfOrderFormProps = {
  itemType: 'guide' | 'bundle'
  itemSlug: string
  itemTitle: string
  itemPrice: string
}

type FormState = 'idle' | 'loading' | 'success' | 'error'

export function PdfOrderForm({ itemType, itemSlug, itemTitle, itemPrice }: PdfOrderFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [consentProcessing, setConsentProcessing] = useState(false)
  const [consentPolicy, setConsentPolicy] = useState(false)
  const [website, setWebsite] = useState('')
  const [status, setStatus] = useState<FormState>('idle')
  const [feedback, setFeedback] = useState('')

  const isSubmitting = status === 'loading'

  function resetForm() {
    setName('')
    setEmail('')
    setNotes('')
    setConsentProcessing(false)
    setConsentPolicy(false)
    setWebsite('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!name.trim()) {
      setStatus('error')
      setFeedback('Podaj imię.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setStatus('error')
      setFeedback('Podaj poprawny adres e-mail.')
      return
    }

    if (!consentProcessing || !consentPolicy) {
      setStatus('error')
      setFeedback('Zaznacz zgody na kontakt i politykę prywatności.')
      return
    }

    setStatus('loading')
    setFeedback('')

    try {
      const response = await fetch('/api/pdf-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemType,
          itemSlug,
          name: name.trim(),
          email: email.trim(),
          notes: notes.trim(),
          website: website.trim(),
          consentProcessing,
          consentPolicy,
        }),
      })

      const payload = (await response.json()) as { ok?: boolean; message?: string; error?: string }

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Nie udało się wysłać zamówienia. Spróbuj ponownie później.')
      }

      setStatus('success')
      setFeedback(payload.message ?? `Dziękuję. Wysłałem potwierdzenie mailowe z dalszym krokiem płatności: ${PUBLIC_OFFER_PAYMENT_METHODS}.`)
      trackAnalyticsEvent('pdf_order_submitted', {
        item_type: itemType,
        item_slug: itemSlug,
      })
      resetForm()
    } catch (error) {
      setStatus('error')
      setFeedback(error instanceof Error ? error.message : 'Nie udało się wysłać zamówienia. Spróbuj ponownie później.')
    }
  }

  return (
    <form
      className="form-grid top-gap"
      onSubmit={handleSubmit}
      noValidate
      data-analytics-form="pdf_order"
      data-analytics-form-start-event="pdf_order_started"
      data-analytics-item-type={itemType}
      data-analytics-item-slug={itemSlug}
    >
      <div className="info-box full-width">
        Zamówienie dotyczy: <strong>{itemTitle}</strong> ({itemPrice}). Po wysłaniu formularza dostajesz mail z dalszym krokiem płatności: {PUBLIC_OFFER_PAYMENT_METHODS}. Numer do BLIK nie jest publikowany na stronie.
      </div>

      <div className="form-field">
        <label htmlFor="pdf-order-name">Imię</label>
        <input id="pdf-order-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="np. Anna" autoComplete="name" />
      </div>

      <div className="form-field">
        <label htmlFor="pdf-order-email">E-mail</label>
        <input
          id="pdf-order-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="np. anna@email.pl"
          autoComplete="email"
        />
      </div>

      <div className="full-width form-field">
        <label htmlFor="pdf-order-notes">Krótka wiadomość</label>
        <textarea
          id="pdf-order-notes"
          rows={4}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Jeśli chcesz, dopisz krótko, czego dotyczy sytuacja albo czy wolisz PayPal albo BLIK po instrukcji e-mail."
        />
      </div>

      <fieldset className="full-width form-field consent-stack">
        <legend className="field-legend">Zgody</legend>

        <label className="checkbox-card" htmlFor="pdf-order-consent-processing">
          <input
            id="pdf-order-consent-processing"
            type="checkbox"
            checked={consentProcessing}
            onChange={(event) => setConsentProcessing(event.target.checked)}
          />
          <span>Wyrażam zgodę na przetwarzanie danych w celu obsługi zamówienia PDF.</span>
        </label>

        <label className="checkbox-card" htmlFor="pdf-order-consent-policy">
          <input
            id="pdf-order-consent-policy"
            type="checkbox"
            checked={consentPolicy}
            onChange={(event) => setConsentPolicy(event.target.checked)}
          />
          <span>Akceptuję politykę prywatności i regulamin w zakresie potrzebnym do kontaktu.</span>
        </label>
      </fieldset>

      <div
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 'auto',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        }}
        aria-hidden="true"
      >
        <label htmlFor="pdf-order-website">Strona internetowa</label>
        <input
          id="pdf-order-website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>

      {feedback ? (
        <div className={`info-box full-width ${status === 'error' ? 'error-box' : ''}`} role="status">
          {feedback}
        </div>
      ) : null}

      <div className="full-width">
        <button type="submit" className="button button-primary big-button" disabled={isSubmitting}>
          {isSubmitting ? 'Wysyłam zamówienie...' : `Zamów ${itemType === 'bundle' ? 'pakiet PDF' : 'PDF'}`}
        </button>
      </div>
    </form>
  )
}
