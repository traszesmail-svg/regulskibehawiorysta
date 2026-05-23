'use client'

import { useState } from 'react'
import { CreditCard, LockKeyhole } from 'lucide-react'
import type { AnimalType, BookingStatus, ProblemType, QaCheckoutEligibility } from '@/lib/types'
import type { BookingServiceType } from '@/lib/booking-services'
import { formatCommercePrice, getManualAmountForProduct } from '@/lib/commerce'

interface PaymentActionsProps {
  bookingId: string
  accessToken: string
  amountLabel: string
  manualAmountLabel?: string | null
  roomAccessLabel: string
  paymentReference: string
  manualAvailable: boolean
  manualPhoneDisplay?: string | null
  manualPaypalMeDisplay?: string | null
  manualPaypalMeHref?: string | null
  manualAccountName?: string | null
  manualInstructions?: string | null
  manualSummary: string
  customerEmailAvailable: boolean
  serviceType: BookingServiceType
  amount: number
  animalType: AnimalType
  problemType: ProblemType
  bookingStatus: BookingStatus
  qaBooking?: boolean
  qaEligibility?: QaCheckoutEligibility | null
}

export function PaymentActions({
  bookingId,
  accessToken,
  amountLabel,
  manualAmountLabel,
  roomAccessLabel,
  paymentReference,
  manualAvailable,
  amount,
  qaBooking = false,
  qaEligibility = null,
}: PaymentActionsProps) {
  const [error, setError] = useState('')
  const [qaLoading, setQaLoading] = useState(false)
  const [commerceLoading, setCommerceLoading] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<'online' | 'manual'>(manualAvailable ? 'manual' : 'online')
  const qaAvailable = Boolean(qaBooking && qaEligibility?.isAllowed)

  async function handleQaSubmit() {
    if (!qaAvailable) {
      setError(qaEligibility?.reason ?? qaEligibility?.summary ?? 'Testowa płatność jest chwilowo niedostępna.')
      return
    }

    setError('')
    setQaLoading(true)

    try {
      const response = await fetch('/api/payments/mock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId,
          accessToken,
        }),
      })
      const payload = (await response.json()) as { onlineCheckoutUrl?: string | null; redirectTo?: string; error?: string }

      if (!response.ok || (!payload.onlineCheckoutUrl && !payload.redirectTo)) {
        throw new Error(payload.error ?? 'Nie udało się uruchomić testowej płatności.')
      }

      window.location.assign(payload.onlineCheckoutUrl ?? payload.redirectTo)
    } catch (paymentError) {
      console.error('[regulski-behawiorysta][payment] qa checkout failed', paymentError)
      setError(paymentError instanceof Error ? paymentError.message : 'Wystąpił błąd testowej płatności.')
    } finally {
      setQaLoading(false)
    }
  }

  async function handleCommerceCheckout(method: 'online' | 'manual') {
    if (method === 'manual' && !manualAvailable) {
      setError('BLIK po instrukcji e-mail jest chwilowo niedostępny. Wybierz płatność online albo napisz wiadomość.')
      return
    }

    setError('')
    setCommerceLoading(true)

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          kind: 'consultation',
          bookingId,
          accessToken,
        }),
      })
      const payload = (await response.json()) as {
        orderNumber?: string
        onlineCheckoutUrl?: string | null
        redirectTo?: string
        error?: string
      }

      if (!response.ok || (!payload.onlineCheckoutUrl && !payload.redirectTo && !payload.orderNumber)) {
        throw new Error(payload.error ?? 'Nie udało się przygotować płatności.')
      }

      if (method === 'online' && payload.onlineCheckoutUrl) {
        window.location.assign(payload.onlineCheckoutUrl)
        return
      }

      if (method === 'manual' && payload.orderNumber) {
        window.location.assign(`/platnosc/blik/${encodeURIComponent(payload.orderNumber)}`)
        return
      }

      window.location.assign(payload.redirectTo ?? `/checkout?orderNumber=${encodeURIComponent(payload.orderNumber ?? '')}`)
    } catch (paymentError) {
      console.error('[commerce][payment] checkout create failed', paymentError)
      setError(paymentError instanceof Error ? paymentError.message : 'Wystąpił błąd przygotowania płatności.')
      setCommerceLoading(false)
    }
  }

  if (qaBooking) {
    return (
      <div className="stack-gap top-gap" data-payment-method-selected={qaAvailable ? 'qa' : 'none'}>
        {error ? <div className="error-box">{error}</div> : null}

        <div className="list-card accent-outline payment-next-card tree-backed-card">
          <strong>Kontrolowany test płatności</strong>
          <span>
            {qaEligibility?.summary ??
              'To jest rezerwacja testowa. Przejdziesz przez płatność bez realnego obciążenia i bez mieszania z produkcyjną sprzedażą.'}
          </span>
        </div>

        <div className="summary-grid">
          <div className="summary-card tree-backed-card">
            <div className="stat-label">Kwota konsultacji</div>
            <div className="summary-value">{amountLabel}</div>
          </div>
          <div className="summary-card tree-backed-card">
            <div className="stat-label">Referencja testowa</div>
            <div className="summary-value payment-reference-value">{qaEligibility?.paymentReference ?? paymentReference}</div>
          </div>
          <div className="summary-card tree-backed-card">
            <div className="stat-label">Potwierdzenie</div>
            <div className="summary-value payment-summary-value">Bez realnej płatności</div>
          </div>
        </div>

        <div className="summary-grid trust-grid">
          <div className="summary-card trust-card tree-backed-card">
            <strong>Jawny tryb testowy</strong>
            <span>Ta ścieżka działa tylko dla rezerwacji oznaczonych jako testowe.</span>
          </div>
          <div className="summary-card trust-card tree-backed-card">
            <strong>Blokada środowiskowa</strong>
            <span>TEST_CHECKOUT_ENABLED oraz allowlista kontaktów chronią przed publicznym 0 zł od prawdziwego ruchu.</span>
          </div>
          <div className="summary-card trust-card tree-backed-card">
            <strong>Panel admina</strong>
            <span>W panelu masz osobną akcję do ręcznego potwierdzania rezerwacji testowych.</span>
          </div>
        </div>

        {qaAvailable ? (
          <div className="hero-actions">
            <button
              type="button"
              className="button button-primary big-button"
              data-payment-submit="qa"
              onClick={handleQaSubmit}
              disabled={qaLoading}
            >
              {qaLoading ? 'Uruchamiam testową płatność...' : 'Uruchom testową płatność'}
            </button>
          </div>
        ) : (
          <div className="error-box">{qaEligibility?.reason ?? qaEligibility?.summary ?? 'Testowa płatność jest chwilowo zablokowana.'}</div>
        )}

        <div className="disclaimer">
          Ta ścieżka pozostaje odseparowana od normalnej sprzedaży. Jeśli to ma być test, sprawdź flagę QA, TEST_CHECKOUT_ENABLED i allowlistę kontaktu.
        </div>
      </div>
    )
  }

  const isManualSelected = selectedMethod === 'manual'
  const onlineAmountLabel = amountLabel || formatCommercePrice(amount)
  const blikAmountLabel = manualAmountLabel ?? formatCommercePrice(getManualAmountForProduct('consultation', amount))
  const selectedAmountLabel = isManualSelected ? blikAmountLabel : onlineAmountLabel

  return (
    <div className="payment-ref-action" data-payment-method-selected={selectedMethod}>
      {error ? <div className="error-box">{error}</div> : null}

      <div className="payment-ref-method-lead">
        <LockKeyhole aria-hidden="true" />
        <span>Najtaniej: BLIK po instrukcji e-mail, bez prowizji pośrednika. Po potwierdzeniu dostaniesz link do {roomAccessLabel}.</span>
      </div>

      <div className="payment-ref-method-tabs" role="radiogroup" aria-label="Metoda płatności">
        <button
          type="button"
          className="payment-ref-method-tab payment-ref-method-tab--blik"
          data-selected={isManualSelected ? 'true' : 'false'}
          data-payment-method="manual"
          onClick={() => setSelectedMethod('manual')}
          disabled={!manualAvailable}
          role="radio"
          aria-checked={isManualSelected}
        >
          <span className="payment-ref-blik-mark" aria-hidden="true">BLIK</span>
          <span>
            <strong>BLIK po instrukcji e-mail</strong>
            <em>{manualAvailable ? 'Najtaniej, bez prowizji operatora płatności' : 'Chwilowo niedostępne'}</em>
            <small>polecane</small>
          </span>
        </button>
        <button
          type="button"
          className="payment-ref-method-tab"
          data-selected={selectedMethod === 'online' ? 'true' : 'false'}
          data-payment-method="online"
          onClick={() => setSelectedMethod('online')}
          role="radio"
          aria-checked={selectedMethod === 'online'}
        >
          <CreditCard aria-hidden="true" />
          <span>
            <strong>Karta / Apple Pay / Google Pay</strong>
            <em>Płatność online; portfele zależą od urządzenia i przeglądarki</em>
          </span>
        </button>
      </div>

      <div className="payment-ref-method-panel">
        <h3>{selectedMethod === 'online' ? 'Płatność online' : 'BLIK po instrukcji e-mail'}</h3>
        <p>
          {selectedMethod === 'online'
            ? 'Po kliknięciu otworzy się bezpieczny checkout online z kartą oraz, gdy urządzenie je udostępnia, Apple Pay i Google Pay.'
            : 'Przejdziesz do instrukcji BLIK bez publicznego numeru. To najtańsza ścieżka, bo nie dolicza prowizji pośrednika.'}
        </p>
        <div className="payment-ref-field">
          <span>Kwota</span>
          <strong>{selectedAmountLabel}</strong>
        </div>
        <div className="payment-ref-field">
          <span>Referencja</span>
          <strong>{paymentReference}</strong>
        </div>
      </div>

      <div className="payment-ref-submit-row">
        <button
          type="button"
          className="payment-ref-submit"
          data-payment-submit={isManualSelected ? 'manual' : 'online'}
          onClick={() => handleCommerceCheckout(selectedMethod)}
          disabled={commerceLoading}
        >
          {commerceLoading
            ? 'Przygotowuję płatność...'
            : selectedMethod === 'online'
              ? `Zapłać kartą / Apple Pay / Google Pay - ${onlineAmountLabel}`
              : `Zapłać BLIK po instrukcji - ${blikAmountLabel}`}
        </button>
      </div>
    </div>
  )
}
