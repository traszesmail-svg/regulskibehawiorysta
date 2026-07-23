'use client'

import { useState } from 'react'
import { CreditCard, LockKeyhole, PlayCircle } from 'lucide-react'
import { buildCommerceBlikHref, buildCommerceWaitingHref, formatCommercePrice } from '@/lib/commerce'

type OnlinePaymentRuntime = {
  provider: 'naffy' | 'stripe' | 'none'
  available: boolean
  label: string
  buttonLabel: string
  description: string
  unavailableMessage: string
  naffyUrl: string | null
}

type Props = {
  orderNumber: string
  viewerToken: string
  productName: string
  onlineAmount: number
  manualAmount: number
  testModeAllowed: boolean
  onlinePayment: OnlinePaymentRuntime
  manualOnly?: boolean
}

export function CommerceCheckoutActions({
  orderNumber,
  viewerToken,
  productName,
  onlineAmount,
  manualAmount,
  testModeAllowed,
  onlinePayment,
  manualOnly = false,
}: Props) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState<'online' | 'manual' | 'mock' | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<'online' | 'manual'>('manual')

  async function startOnline(mock = false) {
    if (manualOnly) {
      setError('Ta dopłata jest dostępna wyłącznie jako BLIK na telefon.')
      return
    }
    if (!mock && !onlinePayment.available) {
      setError(onlinePayment.unavailableMessage)
      return
    }

    setError('')
    setLoading(mock ? 'mock' : 'online')
    try {
      const response = await fetch('/api/payments/online/create-checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderNumber, viewerToken, mock }),
      })
      const payload = (await response.json()) as { url?: string; redirectTo?: string; error?: string }
      if (!response.ok) throw new Error(payload.error ?? 'Nie udało się uruchomić płatności online.')
      window.location.assign(payload.url ?? payload.redirectTo ?? buildCommerceWaitingHref(orderNumber, viewerToken))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się uruchomić płatności.')
      setLoading(null)
    }
  }

  function startManual() {
    setError('')
    setLoading('manual')
    window.location.assign(buildCommerceBlikHref(orderNumber, viewerToken))
  }

  return (
    <div className="payment-ref-action" data-payment-method-selected={manualOnly ? 'manual' : selectedMethod}>
      <div className="payment-ref-method-lead">
        <LockKeyhole aria-hidden="true" />
        <span>
          {manualOnly
            ? 'Dopłata telefoniczna jest realizowana wyłącznie jako BLIK na telefon. Zgłoszenie wpłaty nie blokuje bezpłatnego Jitsi.'
            : `Najtaniej: BLIK po instrukcji e-mail, bez prowizji pośrednika. Zamówienie pozostaje przypisane do numeru ${orderNumber}.`}
        </span>
      </div>

      <div className="payment-ref-method-tabs" role="radiogroup" aria-label="Metoda płatności">
        <button
          type="button"
          className="payment-ref-method-tab payment-ref-method-tab--blik"
          data-selected={selectedMethod === 'manual' ? 'true' : 'false'}
          data-payment-method="manual"
          onClick={() => setSelectedMethod('manual')}
          role="radio"
          aria-checked={selectedMethod === 'manual'}
        >
          <span className="payment-ref-blik-mark" aria-hidden="true">BLIK</span>
          <span>
            <strong>{manualOnly ? 'BLIK na telefon' : 'BLIK po instrukcji e-mail'}</strong>
            <em>{manualOnly ? 'Dopłata do kanału telefonicznego' : 'Najtaniej, bez prowizji operatora płatności'}</em>
            {!manualOnly ? <small>polecane</small> : null}
          </span>
        </button>
        {!manualOnly ? (
          <button
            type="button"
            className="payment-ref-method-tab"
            data-selected={selectedMethod === 'online' ? 'true' : 'false'}
            data-payment-method="online"
            onClick={() => setSelectedMethod('online')}
            disabled={!onlinePayment.available}
            role="radio"
            aria-checked={selectedMethod === 'online'}
          >
            <CreditCard aria-hidden="true" />
            <span>
              <strong>{onlinePayment.label}</strong>
              <em>{onlinePayment.available ? onlinePayment.description : onlinePayment.unavailableMessage}</em>
            </span>
          </button>
        ) : null}
      </div>

      <div className="payment-ref-method-panel">
        <h3>{manualOnly ? 'BLIK na telefon' : selectedMethod === 'online' ? 'Płatność online' : 'BLIK po instrukcji e-mail'}</h3>
        <p>
          {manualOnly
            ? 'Wyślij dopłatę BLIK na telefon. Po zgłoszeniu wpłaty nadal zachowujesz bezpłatny dostęp do Jitsi; telefon zostanie włączony dopiero po potwierdzeniu wpłaty.'
            : selectedMethod === 'online'
              ? 'Po kliknięciu otworzy się checkout online z kartą oraz, gdy urządzenie je udostępnia, Apple Pay i Google Pay. Dostęp aktywuje się po zaksięgowaniu płatności.'
              : 'Przejdziesz do instrukcji BLIK i zgłosisz wpłatę. To najtańsza ścieżka, bo nie dolicza prowizji pośrednika.'}
        </p>
        <div className="payment-ref-field">
          <span>{manualOnly ? 'Dopłata BLIK na telefon' : 'Kwota online'}</span>
          <strong>{formatCommercePrice(manualOnly ? manualAmount : onlineAmount)}</strong>
        </div>
        {!manualOnly ? (
          <div className="payment-ref-field">
            <span>BLIK po instrukcji</span>
            <strong>{formatCommercePrice(manualAmount)}</strong>
          </div>
        ) : null}
      </div>

      <div className="payment-ref-submit-row">
        <button
          type="button"
          className="payment-ref-submit"
          data-payment-submit={manualOnly ? 'manual' : selectedMethod === 'online' ? 'online' : 'manual'}
          onClick={() => (manualOnly ? startManual() : selectedMethod === 'online' ? startOnline(false) : startManual())}
          disabled={loading !== null || (!manualOnly && selectedMethod === 'online' && !onlinePayment.available)}
        >
          {loading === 'online'
            ? 'Otwieram checkout...'
            : loading === 'manual'
              ? 'Otwieram instrukcję BLIK...'
              : manualOnly
                ? `Otwórz instrukcję BLIK na telefon - ${formatCommercePrice(manualAmount)}`
                : selectedMethod === 'online'
                  ? onlinePayment.buttonLabel
                  : `Zapłać BLIK po instrukcji - ${formatCommercePrice(manualAmount)}`}
        </button>
      </div>

      {testModeAllowed && !manualOnly ? (
        <div className="payment-ref-test-card">
          <PlayCircle aria-hidden="true" />
          <span>
            <strong>Test bez realnej płatności</strong>
            <em>Symuluje udaną płatność online i dalszy krok po potwierdzeniu.</em>
          </span>
          <button type="button" className="payment-ref-secondary-button" onClick={() => startOnline(true)} disabled={loading !== null}>
            {loading === 'mock' ? 'Symuluję...' : 'Symuluj zakup online'}
          </button>
        </div>
      ) : null}

      {error ? <div className="error-box">{error}</div> : null}
      <div className="disclaimer">Zamówienie: <strong>{orderNumber}</strong>. Produkt: <strong>{productName}</strong>.</div>
    </div>
  )
}