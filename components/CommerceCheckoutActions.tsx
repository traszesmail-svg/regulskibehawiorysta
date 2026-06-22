'use client'

import { useState } from 'react'
import { CreditCard, LockKeyhole, PlayCircle } from 'lucide-react'
import { formatCommercePrice } from '@/lib/commerce'

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
  productName: string
  onlineAmount: number
  manualAmount: number
  testModeAllowed: boolean
  onlinePayment: OnlinePaymentRuntime
}

export function CommerceCheckoutActions({
  orderNumber,
  productName,
  onlineAmount,
  manualAmount,
  testModeAllowed,
  onlinePayment,
}: Props) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState<'online' | 'manual' | 'mock' | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<'online' | 'manual'>('manual')

  async function startOnline(mock = false) {
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
        body: JSON.stringify({ orderNumber, mock }),
      })
      const payload = (await response.json()) as { url?: string; redirectTo?: string; error?: string }

      if (!response.ok) {
        throw new Error(payload.error ?? 'Nie udało się uruchomić płatności online.')
      }

      window.location.assign(payload.url ?? payload.redirectTo ?? `/oczekiwanie/${encodeURIComponent(orderNumber)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się uruchomić płatności.')
      setLoading(null)
    }
  }

  function startManual() {
    setError('')
    setLoading('manual')
    window.location.assign(`/platnosc/blik/${encodeURIComponent(orderNumber)}`)
  }

  return (
    <div className="payment-ref-action" data-payment-method-selected={selectedMethod}>
      <div className="payment-ref-method-lead">
        <LockKeyhole aria-hidden="true" />
        <span>Najtaniej: BLIK po instrukcji e-mail, bez prowizji pośrednika. Zamówienie pozostaje przypisane do numeru {orderNumber}.</span>
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
            <strong>BLIK po instrukcji e-mail</strong>
            <em>Najtaniej, bez prowizji operatora płatności</em>
            <small>polecane</small>
          </span>
        </button>
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
      </div>

      <div className="payment-ref-method-panel">
        <h3>{selectedMethod === 'online' ? 'Płatność online' : 'BLIK po instrukcji e-mail'}</h3>
        <p>
          {selectedMethod === 'online'
            ? 'Po kliknięciu otworzy się checkout online z kartą oraz, gdy urządzenie je udostępnia, Apple Pay i Google Pay. Dostęp aktywuje się po zaksięgowaniu płatności.'
            : 'Przejdziesz do instrukcji BLIK i zgłosisz wpłatę. To najtańsza ścieżka, bo nie dolicza prowizji pośrednika.'}
        </p>
        <div className="payment-ref-field">
          <span>Kwota online</span>
          <strong>{formatCommercePrice(onlineAmount)}</strong>
        </div>
        <div className="payment-ref-field">
          <span>BLIK po instrukcji</span>
          <strong>{formatCommercePrice(manualAmount)}</strong>
        </div>
      </div>

      <div className="payment-ref-submit-row">
        <button
          type="button"
          className="payment-ref-submit"
          data-payment-submit={selectedMethod === 'online' ? 'online' : 'manual'}
          onClick={() => (selectedMethod === 'online' ? startOnline(false) : startManual())}
          disabled={loading !== null || (selectedMethod === 'online' && !onlinePayment.available)}
        >
          {loading === 'online'
            ? 'Otwieram checkout...'
            : loading === 'manual'
                ? 'Otwieram BLIK...'
                : selectedMethod === 'online'
                  ? onlinePayment.buttonLabel
                  : `Zapłać BLIK po instrukcji - ${formatCommercePrice(manualAmount)}`}
        </button>
      </div>

      {testModeAllowed ? (
        <div className="payment-ref-test-card">
          <PlayCircle aria-hidden="true" />
          <span>
            <strong>Test bez realnej płatności</strong>
            <em>Symuluje udaną płatność online i dalszy krok po potwierdzeniu.</em>
          </span>
          <button
            type="button"
            className="payment-ref-secondary-button"
            onClick={() => startOnline(true)}
            disabled={loading !== null}
          >
            {loading === 'mock' ? 'Symuluję...' : 'Symuluj zakup online'}
          </button>
        </div>
      ) : null}

      {error ? <div className="error-box">{error}</div> : null}

      <div className="disclaimer">
        Zamówienie: <strong>{orderNumber}</strong>. Produkt: <strong>{productName}</strong>.
      </div>
    </div>
  )
}
