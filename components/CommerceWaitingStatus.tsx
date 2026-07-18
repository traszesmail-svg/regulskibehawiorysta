'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { trackAnalyticsEvent } from '@/lib/analytics'
import { buildCommerceOrderStatusHref } from '@/lib/commerce'

type StatusPayload = {
  status: string
  ready: boolean
  readyUrl: string | null
  readyLabel: string | null
  readyText: string | null
  accessReady: boolean
  accessCode: string | null
  accessUrl: string | null
  testAdminConfirmUrl: string | null
  error?: string
}

type Props = {
  orderNumber: string
  viewerToken: string
  initialStatus: string
  initialAccessCode: string | null
  initialAccessUrl: string | null
  initialReady: boolean
  initialReadyUrl: string | null
  initialReadyLabel: string
  initialReadyText: string | null
  initialTestAdminConfirmUrl: string | null
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'created':
      return 'oczekuje na wybór płatności'
    case 'waiting_manual_payment':
      return 'czeka na wpłatę BLIK'
    case 'payment_reported':
      return 'wpłata zgłoszona'
    case 'paid':
    case 'access_sent':
      return 'opłacone'
    case 'cancelled':
      return 'anulowane'
    case 'expired':
      return 'wygasło'
    default:
      return status
  }
}

function getStatusTitle(status: string) {
  return status === 'payment_reported' || status === 'paid' || status === 'access_sent'
    ? 'Zgłoszenie płatności zostało wysłane'
    : 'Płatność nie została jeszcze potwierdzona'
}

export function CommerceWaitingStatus({
  orderNumber,
  viewerToken,
  initialStatus,
  initialAccessCode,
  initialAccessUrl,
  initialReady,
  initialReadyUrl,
  initialReadyLabel,
  initialReadyText,
  initialTestAdminConfirmUrl,
}: Props) {
  const [status, setStatus] = useState(initialStatus)
  const [accessCode, setAccessCode] = useState(initialAccessCode)
  const [accessUrl, setAccessUrl] = useState(initialAccessUrl)
  const [ready, setReady] = useState(initialReady)
  const [readyUrl, setReadyUrl] = useState(initialReadyUrl)
  const [readyLabel, setReadyLabel] = useState(initialReadyLabel)
  const [readyText, setReadyText] = useState(initialReadyText)
  const [testAdminConfirmUrl, setTestAdminConfirmUrl] = useState(initialTestAdminConfirmUrl)
  const [error, setError] = useState('')
  const previousStatusRef = useRef(initialStatus)
  const confirmedTrackedRef = useRef(false)

  useEffect(() => {
    if (previousStatusRef.current !== status && status === 'payment_reported') {
      trackAnalyticsEvent('payment_reported', {
        order_number: orderNumber,
        source_page: '/oczekiwanie',
        payment_method: 'manual_blik',
      })
    }

    previousStatusRef.current = status
  }, [orderNumber, status])

  useEffect(() => {
    const isReadyStatus = ready || status === 'paid' || status === 'access_sent'
    if (!isReadyStatus || confirmedTrackedRef.current) {
      return
    }

    confirmedTrackedRef.current = true
    trackAnalyticsEvent('payment_confirmed', {
      order_number: orderNumber,
      source_page: '/oczekiwanie',
      status,
    })
  }, [orderNumber, ready, status])

  useEffect(() => {
    if (ready && readyUrl) return

    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(buildCommerceOrderStatusHref(orderNumber, viewerToken), {
          cache: 'no-store',
        })
        const payload = (await response.json()) as StatusPayload
        if (!response.ok) throw new Error(payload.error ?? 'Nie udało się sprawdzić statusu.')
        setStatus(payload.status)
        setTestAdminConfirmUrl(payload.testAdminConfirmUrl)

        if (payload.ready && payload.readyUrl) {
          setReady(true)
          setReadyUrl(payload.readyUrl)
          setReadyLabel(payload.readyLabel ?? 'Przejdź dalej')
          setReadyText(payload.readyText ?? null)
          setAccessCode(payload.accessCode)
          setAccessUrl(payload.accessUrl)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Nie udało się sprawdzić statusu.')
      }
    }, 4000)

    return () => window.clearInterval(timer)
  }, [orderNumber, ready, readyUrl, viewerToken])

  if (ready && readyUrl) {
    return (
      <div className="list-card accent-outline tree-backed-card top-gap">
        <strong>Dostęp jest aktywny</strong>
        <span>{readyText ?? 'Płatność została potwierdzona. Możesz przejść dalej.'}</span>
        {accessCode && accessUrl ? (
          <span>
            Kod dostępu: <code>{accessCode}</code>
          </span>
        ) : null}
        <Link href={readyUrl} className="button button-primary big-button">
          {readyLabel}
        </Link>
      </div>
    )
  }

  return (
    <div className="list-card tree-backed-card top-gap commerce-status-card">
      <strong>{getStatusTitle(status)}</strong>
      <span>
        Aktualny status: <code>{getStatusLabel(status)}</code>.
      </span>
      <span>Nie musisz odświeżać strony, status sprawdzi się automatycznie.</span>
      {testAdminConfirmUrl ? (
        <div className="list-card accent-outline tree-backed-card">
          <strong>Tryb testowy</strong>
          <span>Ten link symuluje kliknięcie przycisku „Potwierdzam płatność” z maila administratora.</span>
          <a href={testAdminConfirmUrl} className="button button-ghost" target="_blank" rel="noreferrer">
            Potwierdź płatność testowo
          </a>
        </div>
      ) : null}
      {error ? <span className="form-error">{error}</span> : null}
    </div>
  )
}
