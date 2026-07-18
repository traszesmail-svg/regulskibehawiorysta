'use client'

import { useState } from 'react'
import { trackAnalyticsEvent } from '@/lib/analytics'
import { buildCommerceWaitingHref } from '@/lib/commerce'

type Props = {
  orderNumber: string
  viewerToken: string
  phoneDisplay?: string | null
}

export function CommerceBlikActions({ orderNumber, viewerToken, phoneDisplay }: Props) {
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function copyOrderNumber() {
    try {
      await navigator.clipboard.writeText(orderNumber)
      setCopied(true)
    } catch {
      setError('Nie udało się skopiować numeru zamówienia. Skopiuj go ręcznie.')
    }
  }

  async function reportPayment() {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(orderNumber)}/report-payment`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ viewerToken }),
      })
      const payload = (await response.json()) as {
        redirectTo?: string
        error?: string
        adminNotification?: 'sent' | 'already_reported' | 'failed'
        adminNotificationReason?: string | null
      }

      if (!response.ok) {
        throw new Error(payload.error ?? 'Nie udało się zgłosić płatności.')
      }

      if (
        payload.adminNotification &&
        payload.adminNotification !== 'sent' &&
        payload.adminNotification !== 'already_reported'
      ) {
        throw new Error(
          payload.adminNotificationReason
            ? `Zgłoszenie zapisane, ale mail do behawiorysty nie wyszedł: ${payload.adminNotificationReason}`
            : 'Zgłoszenie zapisane, ale mail do behawiorysty nie wyszedł.',
        )
      }

      trackAnalyticsEvent('payment_reported', {
        order_number: orderNumber,
        source_page: '/platnosc/blik',
        payment_method: 'manual_blik',
      })
      window.location.assign(payload.redirectTo ?? buildCommerceWaitingHref(orderNumber, viewerToken))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się zgłosić płatności.')
      setLoading(false)
    }
  }

  return (
    <div className="stack-gap">
      <div className="summary-grid">
        <div className="summary-card tree-backed-card">
          <div className="stat-label">Instrukcja BLIK</div>
          <div className="summary-value">{phoneDisplay ?? 'Brak numeru'}</div>
        </div>
        <div className="summary-card tree-backed-card">
          <div className="stat-label">Tytuł przelewu</div>
          <div className="summary-value payment-reference-value">{orderNumber}</div>
        </div>
      </div>

      <div className="hero-actions centered-actions">
        <button type="button" className="button button-ghost big-button" onClick={copyOrderNumber}>
          {copied ? 'Skopiowano' : 'Kopiuj numer zamówienia'}
        </button>
        <button type="button" className="button button-primary big-button" onClick={reportPayment} disabled={loading}>
          {loading ? 'Wysyłam zgłoszenie...' : 'Zapłaciłem/am'}
        </button>
      </div>

      {error ? <div className="error-box">{error}</div> : null}
    </div>
  )
}
