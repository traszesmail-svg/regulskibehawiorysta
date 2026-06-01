'use client'

import { useState } from 'react'
import { CreditCard, LockKeyhole, TicketCheck } from 'lucide-react'
import { trackAnalyticsEvent } from '@/lib/analytics'
import type { AnimalType, BookingStatus, ProblemType, QaCheckoutEligibility } from '@/lib/types'
import type { BookingServiceType } from '@/lib/booking-services'
import { formatCommercePrice, getManualAmountForProduct } from '@/lib/commerce'
import { PROMO_CODE_SERVICE_TYPE } from '@/lib/promo-codes'

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
  sourcePage?: string
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
  serviceType,
  animalType,
  problemType,
  bookingStatus,
  qaBooking = false,
  qaEligibility = null,
  sourcePage = '/payment',
}: PaymentActionsProps) {
  const [error, setError] = useState('')
  const [qaLoading, setQaLoading] = useState(false)
  const [commerceLoading, setCommerceLoading] = useState(false)
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [selectedMethod, setSelectedMethod] = useState<'online' | 'manual' | 'promo'>(manualAvailable ? 'manual' : 'online')
  const qaAvailable = Boolean(qaBooking && qaEligibility?.isAllowed)
  const promoAvailable = serviceType === PROMO_CODE_SERVICE_TYPE

  function trackPaymentStart(method: 'qa' | 'online' | 'manual' | 'promo') {
    trackAnalyticsEvent('payment_started', {
      booking_id: bookingId,
      source_page: sourcePage,
      payment_method: method,
      service_type: serviceType,
      animal_type: animalType,
      problem_type: problemType,
      booking_status: bookingStatus,
      amount,
      qa_booking: qaBooking,
    })
  }

  async function handleQaSubmit() {
    if (!qaAvailable) {
      setError(qaEligibility?.reason ?? qaEligibility?.summary ?? 'Testowa płatność jest chwilowo niedostępna.')
      return
    }

    setError('')
    setQaLoading(true)
    trackPaymentStart('qa')

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
      const redirectUrl = payload.onlineCheckoutUrl ?? payload.redirectTo

      if (!response.ok || !redirectUrl) {
        throw new Error(payload.error ?? 'Nie udało się uruchomić testowej płatności.')
      }

      window.location.assign(redirectUrl)
    } catch (paymentError) {
      console.error('[regulski-behawiorysta][payment] qa checkout failed', paymentError)
      setError(paymentError instanceof Error ? paymentError.message : 'Wystąpił błąd testowej płatności.')
    } finally {
      setQaLoading(false)
    }
  }

  async function handlePromoSubmit() {
    if (!promoAvailable) {
      setError('Kod od lecznicy dziala tylko dla uslugi Kwadrans z behawiorysta.')
      return
    }

    if (!promoCode.trim()) {
      setError('Wpisz kod promocyjny.')
      return
    }

    setError('')
    setPromoLoading(true)
    trackPaymentStart('promo')

    try {
      const response = await fetch('/api/promo-codes/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId,
          accessToken,
          code: promoCode,
        }),
      })
      const payload = (await response.json()) as { redirectTo?: string; error?: string }

      if (!response.ok || !payload.redirectTo) {
        throw new Error(payload.error ?? 'Nie udalo sie uzyc kodu promocyjnego.')
      }

      window.location.assign(payload.redirectTo)
    } catch (paymentError) {
      console.error('[regulski-behawiorysta][payment] promo code failed', paymentError)
      setError(paymentError instanceof Error ? paymentError.message : 'Wystapil blad uzycia kodu.')
      setPromoLoading(false)
    }
  }

  async function handleCommerceCheckout(method: 'online' | 'manual') {
    if (method === 'manual' && !manualAvailable) {
      setError('BLIK po instrukcji e-mail jest chwilowo niedostępny. Wybierz płatność online albo napisz wiadomość.')
      return
    }

    setError('')
    setCommerceLoading(true)
    trackPaymentStart(method)

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
  const isPromoSelected = selectedMethod === 'promo'
  const onlineAmountLabel = amountLabel || formatCommercePrice(amount)
  const blikAmountLabel = manualAmountLabel ?? formatCommercePrice(getManualAmountForProduct('consultation', amount))
  const selectedAmountLabel = isPromoSelected ? '0 zl' : isManualSelected ? blikAmountLabel : onlineAmountLabel

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
        <button
          type="button"
          className="payment-ref-method-tab"
          data-selected={isPromoSelected ? 'true' : 'false'}
          data-payment-method="promo"
          onClick={() => setSelectedMethod('promo')}
          disabled={!promoAvailable}
          role="radio"
          aria-checked={isPromoSelected}
        >
          <TicketCheck aria-hidden="true" />
          <span>
            <strong>Mam kod od lecznicy</strong>
            <em>{promoAvailable ? 'Kod promocyjny zastępuje płatność dla Kwadransa' : 'Dostępne tylko dla Kwadransa'}</em>
          </span>
        </button>
      </div>

      <div className="payment-ref-method-panel">
        <h3>{selectedMethod === 'online' ? 'Płatność online' : isPromoSelected ? 'Kod promocyjny' : 'BLIK po instrukcji e-mail'}</h3>
        <p>
          {selectedMethod === 'online'
            ? 'Po kliknięciu otworzy się bezpieczny checkout online z kartą oraz, gdy urządzenie je udostępnia, Apple Pay i Google Pay.'
            : isPromoSelected
              ? 'Wpisz kod przekazany przez lecznicę. Po poprawnym użyciu termin zostanie potwierdzony bez płatności.'
              : 'Przejdziesz do instrukcji BLIK bez publicznego numeru. To najtańsza ścieżka, bo nie dolicza prowizji pośrednika.'}
        </p>
        <div className="payment-ref-field">
          <span>Kwota</span>
          <strong>{selectedAmountLabel}</strong>
        </div>
        {isPromoSelected ? (
          <label className="payment-ref-field payment-ref-code-field">
            <span>Kod promocyjny</span>
            <input
              type="text"
              value={promoCode}
              onChange={(event) => setPromoCode(event.target.value)}
              placeholder="VET-XXXX-XXXX"
              autoCapitalize="characters"
              autoComplete="off"
            />
          </label>
        ) : (
          <div className="payment-ref-field">
            <span>Referencja</span>
            <strong>{paymentReference}</strong>
          </div>
        )}
      </div>

      <div className="payment-ref-submit-row">
        <button
          type="button"
          className="payment-ref-submit"
          data-payment-submit={isPromoSelected ? 'promo' : isManualSelected ? 'manual' : 'online'}
          onClick={() => {
            if (isPromoSelected) {
              void handlePromoSubmit()
              return
            }

            void handleCommerceCheckout(isManualSelected ? 'manual' : 'online')
          }}
          disabled={commerceLoading || promoLoading}
        >
          {commerceLoading || promoLoading
            ? isPromoSelected
              ? 'Sprawdzam kod...'
              : 'Przygotowuję płatność...'
            : selectedMethod === 'online'
              ? `Zapłać kartą / Apple Pay / Google Pay - ${onlineAmountLabel}`
              : isPromoSelected
                ? 'Użyj kodu i potwierdź termin'
                : `Zapłać BLIK po instrukcji - ${blikAmountLabel}`}
        </button>
      </div>
    </div>
  )
}
