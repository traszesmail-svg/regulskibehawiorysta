'use client'

import { useEffect, useState } from 'react'
import { CreditCard, LockKeyhole, TicketCheck } from 'lucide-react'
import { trackAnalyticsEvent } from '@/lib/analytics'
import type { AnimalType, BookingStatus, ProblemType, QaCheckoutEligibility } from '@/lib/types'
import type { BookingServiceType } from '@/lib/booking-services'
import {
  buildCommerceBlikHref,
  formatCommercePrice,
  getManualAmountForProduct,
} from '@/lib/commerce'
import { PROMO_CODE_SERVICE_TYPE } from '@/lib/promo-codes'
import { CLINIC_PHONE_UPGRADE_PRICE_PLN } from '@/lib/pricing'
import { isValidPolishPhone } from '@/lib/phone'

interface PaymentActionsProps {
  bookingId: string
  accessToken: string
  amountLabel: string
  manualAmountLabel?: string | null
  roomAccessLabel: string
  paymentReference: string
  manualAvailable: boolean
  onlinePayment?: {
    available: boolean
    label: string
    buttonLabel: string
    description: string
    unavailableMessage: string
  }
  manualPhoneDisplay?: string | null
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

const disabledOnlinePayment = {
  available: false,
  label: 'Płatność online',
  buttonLabel: 'Zapłać online',
  description: 'Płatność online jest chwilowo niedostępna. Wybierz BLIK po instrukcji e-mail albo wróć później.',
  unavailableMessage:
    'Płatność online jest chwilowo niedostępna. Wybierz BLIK po instrukcji e-mail albo wróć później.',
}

export function PaymentActions({
  bookingId,
  accessToken,
  amountLabel,
  manualAmountLabel,
  roomAccessLabel,
  paymentReference,
  manualAvailable,
  onlinePayment,
  manualPhoneDisplay,
  manualInstructions,
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
  const effectiveOnlinePayment = onlinePayment ?? disabledOnlinePayment
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [promoValidated, setPromoValidated] = useState(false)
  const [promoRedeemed, setPromoRedeemed] = useState(false)
  const [promoChannel, setPromoChannel] = useState<'jitsi' | 'phone'>('jitsi')
  const [promoPhone, setPromoPhone] = useState('')
  const [selectedMethod, setSelectedMethod] = useState<'online' | 'manual' | 'promo'>(
    manualAvailable ? 'manual' : effectiveOnlinePayment.available ? 'online' : 'manual',
  )
  const [isClinicFlow, setIsClinicFlow] = useState(false)
  const [clinicName, setClinicName] = useState<string | null>(null)

  useEffect(() => {
    const storedCode = window.sessionStorage.getItem('clinicPromoCode')
    if (storedCode) {
      setPromoCode(storedCode)
      setSelectedMethod('promo')
      setIsClinicFlow(true)
      void fetch('/api/promo-codes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: storedCode }),
      })
        .then((res) => res.json())
        .then((payload: { ok?: boolean; clinicName?: string }) => {
          if (payload.ok) {
            setPromoValidated(true)
            if (payload.clinicName) setClinicName(payload.clinicName)
          } else {
            setIsClinicFlow(false)
            setSelectedMethod(manualAvailable ? 'manual' : effectiveOnlinePayment.available ? 'online' : 'manual')
          }
        })
        .catch(() => {
          setIsClinicFlow(false)
          setSelectedMethod(manualAvailable ? 'manual' : effectiveOnlinePayment.available ? 'online' : 'manual')
        })
    }
  }, [manualAvailable, effectiveOnlinePayment.available])

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
      setQaLoading(false)
    }
  }

  async function handlePromoSubmit() {
    if (!promoAvailable) {
      setError('Kod przekazany przez lecznicę działa tylko dla usługi Kwadrans z behawiorystą.')
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
      if (!promoValidated) {
        const response = await fetch('/api/promo-codes/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: promoCode }),
        })
        const payload = (await response.json()) as { ok?: boolean; error?: string; clinicName?: string }
        if (!response.ok || !payload.ok) {
          throw new Error(payload.error ?? 'Nie udało się sprawdzić kodu promocyjnego.')
        }
        setPromoValidated(true)
        if (payload.clinicName) setClinicName(payload.clinicName)
        setIsClinicFlow(true)
        setPromoLoading(false)
        return
      }

      if (promoChannel === 'phone' && !manualAvailable) {
        throw new Error('Dopłata jest dostępna wyłącznie jako BLIK na telefon. Ta metoda jest chwilowo niedostępna.')
      }

      if (promoChannel === 'phone' && !promoRedeemed) {
        if (!/^((0048|48)?[\s().-]*\d[\s().-]*){9,14}$/.test(promoPhone.trim())) {
          throw new Error('Podaj poprawny numer telefonu, aby wybrać rozmowę telefoniczną.')
        }

        const redeemResponse = await fetch('/api/promo-codes/redeem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId, accessToken, code: promoCode, consultationMode: 'jitsi' }),
        })
        const redeemPayload = (await redeemResponse.json()) as { redirectTo?: string; error?: string }
        if (!redeemResponse.ok || !redeemPayload.redirectTo) {
          throw new Error(redeemPayload.error ?? 'Nie udało się aktywować kodu promocyjnego.')
        }
        setPromoRedeemed(true)
      }

      if (promoChannel === 'jitsi') {
        const response = await fetch('/api/promo-codes/redeem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId, accessToken, code: promoCode, consultationMode: 'jitsi' }),
        })
        const payload = (await response.json()) as { redirectTo?: string; error?: string }
        if (!response.ok || !payload.redirectTo) {
          throw new Error(payload.error ?? 'Nie udało się użyć kodu promocyjnego.')
        }
        window.sessionStorage.removeItem('clinicPromoCode')
        window.location.assign(payload.redirectTo)
        return
      }

      const upgradeResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'clinic-phone-upgrade', bookingId, accessToken, phone: promoPhone }),
      })
      const upgradePayload = (await upgradeResponse.json()) as {
        orderNumber?: string
        viewerToken?: string
        redirectTo?: string
        error?: string
      }
      if (!upgradeResponse.ok || (!upgradePayload.redirectTo && !(upgradePayload.orderNumber && upgradePayload.viewerToken))) {
        throw new Error(upgradePayload.error ?? 'Nie udało się przygotować dopłaty telefonicznej.')
      }
      if (upgradePayload.orderNumber && upgradePayload.viewerToken) {
        window.location.assign(buildCommerceBlikHref(upgradePayload.orderNumber, upgradePayload.viewerToken))
        return
      }
      if (upgradePayload.redirectTo) {
        window.location.assign(upgradePayload.redirectTo)
        return
      }
      throw new Error('Nie udało się bezpiecznie przejść do dopłaty.')
    } catch (paymentError) {
      console.error('[regulski-behawiorysta][payment] promo code failed', paymentError)
      setError(paymentError instanceof Error ? paymentError.message : 'Wystąpił błąd obsługi kodu.')
      setPromoLoading(false)
    }
  }
  async function handleCommerceCheckout(method: 'online' | 'manual') {
    if (method === 'manual' && !manualAvailable) {
      setError(
        effectiveOnlinePayment.available
          ? 'BLIK po instrukcji e-mail jest chwilowo niedostępny. Wybierz płatność online albo napisz wiadomość.'
          : 'BLIK po instrukcji e-mail jest chwilowo niedostępny. Napisz wiadomość albo wróć później.',
      )
      return
    }

    if (method === 'online' && !effectiveOnlinePayment.available) {
      setError(effectiveOnlinePayment.unavailableMessage)
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
        viewerToken?: string
        onlineCheckoutUrl?: string
        redirectTo?: string
        error?: string
      }

      if (
        !response.ok ||
        (!payload.onlineCheckoutUrl && !payload.redirectTo && !(payload.orderNumber && payload.viewerToken))
      ) {
        throw new Error(payload.error ?? 'Nie udało się przygotować płatności.')
      }

      if (method === 'online' && payload.onlineCheckoutUrl) {
        window.location.assign(payload.onlineCheckoutUrl)
        return
      }

      if (method === 'manual' && payload.orderNumber && payload.viewerToken) {
        window.location.assign(buildCommerceBlikHref(payload.orderNumber, payload.viewerToken))
        return
      }

      if (payload.redirectTo) {
        window.location.assign(payload.redirectTo)
        return
      }

      throw new Error(payload.error ?? 'Nie udało się bezpiecznie przejść do płatności.')
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
  const selectedAmountLabel = isPromoSelected
    ? !promoValidated
      ? '—'
      : promoChannel === 'phone'
        ? formatCommercePrice(CLINIC_PHONE_UPGRADE_PRICE_PLN)
        : '0 zł'
    : isManualSelected
      ? blikAmountLabel
      : onlineAmountLabel

  return (
    <div className="payment-ref-action" data-payment-method-selected={selectedMethod}>
      {error ? <div className="error-box">{error}</div> : null}

      {!isClinicFlow ? (
        <div className="payment-ref-method-lead">
          <LockKeyhole aria-hidden="true" />
          <span>Najtaniej: BLIK po instrukcji e-mail, bez prowizji pośrednika. Po potwierdzeniu dostaniesz link do {roomAccessLabel}.</span>
        </div>
      ) : null}

      {!isClinicFlow ? (
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
          disabled={!effectiveOnlinePayment.available}
          role="radio"
          aria-checked={selectedMethod === 'online'}
        >
          <CreditCard aria-hidden="true" />
          <span>
            <strong>{effectiveOnlinePayment.label}</strong>
            <em>
              {effectiveOnlinePayment.available
                ? effectiveOnlinePayment.description
                : effectiveOnlinePayment.unavailableMessage}
            </em>
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
            <strong>Mam kod przekazany przez lecznicę</strong>
            <em>{promoAvailable ? 'Kod promocyjny zastępuje płatność dla Kwadransa' : 'Dostępne tylko dla Kwadransa'}</em>
          </span>
        </button>
        </div>
      ) : null}

      <div className="payment-ref-method-panel">
        {isClinicFlow ? (
          <>
            <style>{`
              .payment-ref-compact-intro h1,
              .payment-ref-compact-intro p:last-child { display: none !important; }
              .payment-ref-card-title { display: none !important; }
              .payment-ref-total { display: none !important; }
              .payment-ref-summary-list .payment-ref-summary-row:nth-child(4) { display: none !important; }
            `}</style>
            <div className="payment-ref-method-lead" style={{ background: 'var(--accent-light)', color: 'var(--accent-dark)', marginBottom: '1.5rem', borderRadius: '1rem', padding: '1.25rem' }}>
              <TicketCheck aria-hidden="true" style={{ width: '2rem', height: '2rem', marginBottom: '0.5rem' }} />
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem' }}>Darmowa konsultacja z lecznicy{clinicName ? ` ${clinicName}` : ''}</h3>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>Ten termin jest w pełni opłacony przez Twoją lecznicę. Wybierz dogodny sposób rozmowy bez dodatkowych ukrytych kosztów.</p>
            </div>
            <div className="payment-ref-field">
              <span>Kwota do zapłaty</span>
              <strong data-promo-amount="true" style={{ color: 'var(--accent-dark)' }}>{selectedAmountLabel}</strong>
            </div>
          </>
        ) : (
          <>
            <h3>
              {selectedMethod === 'online'
                ? 'Płatność online'
                : isPromoSelected
                  ? 'Kod przekazany przez lecznicę'
                  : 'BLIK po instrukcji e-mail'}
            </h3>
            <p>
              {selectedMethod === 'online'
                ? effectiveOnlinePayment.available
                  ? 'Po kliknięciu otworzy się bezpieczny checkout online z kartą oraz, gdy urządzenie je udostępnia, Apple Pay i Google Pay.'
                  : effectiveOnlinePayment.unavailableMessage
                : isPromoSelected
                  ? promoValidated
                    ? 'Kod jest poprawny. Teraz wybierz, czy rozmawiasz bezpłatnie przez Jitsi, czy dopłacasz do połączenia telefonicznego.'
                    : 'Wpisz kod przekazany przez lecznicę. Po sprawdzeniu wybierzesz sposób rozmowy.'
                  : 'Przejdziesz do instrukcji BLIK i zgłosisz wpłatę. To najtańsza ścieżka, bo nie dolicza prowizji pośrednika.'}
            </p>
            <div className="payment-ref-field">
              <span>Kwota</span>
              <strong data-promo-amount={isPromoSelected ? 'true' : 'false'}>{selectedAmountLabel}</strong>
            </div>
          </>
        )}
        {isPromoSelected ? (
          <>
            {!isClinicFlow ? (
              <label className="payment-ref-field payment-ref-code-field">
                <span>Kod promocyjny</span>
                <input
                  type="text"
                  value={promoCode}
                  onChange={(event) => {
                    setPromoCode(event.target.value)
                    setPromoValidated(false)
                    setPromoRedeemed(false)
                  }}
                  placeholder="VET-XXXX-XXXX"
                  autoCapitalize="characters"
                  autoComplete="off"
                  data-promo-code-input="true"
                />
              </label>
            ) : null}
            {promoValidated ? (
              <div className="payment-ref-channel-grid" role="radiogroup" aria-label="Kanał rozmowy" data-promo-channel-choice="true">
                <button type="button" className="payment-ref-method-tab" data-selected={promoChannel === 'jitsi' ? 'true' : 'false'} data-promo-channel="jitsi" onClick={() => setPromoChannel('jitsi')} role="radio" aria-checked={promoChannel === 'jitsi'}>
                  <span><strong>Jitsi — bez dopłaty</strong><em>Rozmowa online w bezpłatnym pokoju</em></span>
                </button>
                <button type="button" className="payment-ref-method-tab" data-selected={promoChannel === 'phone' ? 'true' : 'false'} data-promo-channel="phone" onClick={() => setPromoChannel('phone')} role="radio" aria-checked={promoChannel === 'phone'}>
                  <span><strong>Telefon — dopłata {formatCommercePrice(CLINIC_PHONE_UPGRADE_PRICE_PLN)}</strong><em>Numer telefonu jest wymagany. Po opłaceniu połączenie obsłuży Zadarma.</em></span>
                </button>
              </div>
            ) : null}
            {promoValidated && promoChannel === 'phone' ? (
              <>
                <label className="payment-ref-field">
                  <span>Numer telefonu (wymagany)</span>
                  <input type="tel" value={promoPhone} onChange={(event) => setPromoPhone(event.target.value)} placeholder="np. 500 600 700" autoComplete="tel" required data-promo-phone-input="true" />
                </label>
                <div className="payment-ref-field clinic-phone-upgrade-payment">
                  <span>Metoda dopłaty</span>
                  <strong>BLIK na telefon — {formatCommercePrice(CLINIC_PHONE_UPGRADE_PRICE_PLN)}</strong>
                  <small>{manualPhoneDisplay ? `Wyślij BLIK na numer ${manualPhoneDisplay}.` : 'Numer BLIK na telefon zobaczysz w instrukcji.'}</small>
                </div>
                {manualInstructions ? <p className="disclaimer">{manualInstructions}</p> : null}              </>
            ) : null}
          </>
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
          disabled={
            commerceLoading ||
            promoLoading ||
            (selectedMethod === 'manual' && !manualAvailable) ||
            (selectedMethod === 'online' && !effectiveOnlinePayment.available) ||
            (isPromoSelected && promoValidated && promoChannel === 'phone' && !manualAvailable)
          }
        >
          {commerceLoading || promoLoading
            ? isPromoSelected
              ? promoValidated ? 'Przygotowuję dalszy krok...' : 'Sprawdzam kod...'
              : 'Przygotowuję płatność...'
            : selectedMethod === 'online'
              ? `Zapłać kartą / Apple Pay / Google Pay - ${onlineAmountLabel}`
              : isPromoSelected
                ? !promoValidated
                  ? 'Sprawdź kod'
                  : promoChannel === 'jitsi'
                    ? 'Użyj kodu — Jitsi bez dopłaty'
                    : `Otwórz instrukcję BLIK na telefon - ${formatCommercePrice(CLINIC_PHONE_UPGRADE_PRICE_PLN)}`
                : `Zapłać BLIK po instrukcji - ${blikAmountLabel}`}
        </button>
      </div>
    </div>
  )
}
