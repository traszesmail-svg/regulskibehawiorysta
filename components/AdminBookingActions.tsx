'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { BookingStatus, PaymentStatus } from '@/lib/types'

interface AdminBookingActionsProps {
  bookingId: string
  bookingStatus: BookingStatus
  paymentStatus: PaymentStatus
  meetingUrl: string
  qaBooking: boolean
}

export function AdminBookingActions({
  bookingId,
  bookingStatus,
  paymentStatus,
  meetingUrl,
  qaBooking,
}: AdminBookingActionsProps) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loadingAction, setLoadingAction] = useState<'approve' | 'reject' | 'done' | 'qa-confirm' | null>(null)
  const [isRefreshing, startTransition] = useTransition()

  function refreshAdminPage(message: string) {
    setSuccess(message)
    startTransition(() => {
      router.refresh()
    })
  }

  async function handleMarkDone() {
    setError('')
    setSuccess('')
    setLoadingAction('done')

    try {
      const response = await fetch(`/api/bookings/${bookingId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recommendedNextStep: 'Pełna konsultacja lub dalsza terapia według potrzeb klienta.',
        }),
      })

      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? 'Nie udało się oznaczyć konsultacji jako done.')
      }

      refreshAdminPage('Konsultacja oznaczona jako zakończona.')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Wystąpił błąd akcji admina.')
    } finally {
      setLoadingAction(null)
    }
  }

  async function handleManualPaymentAction(action: 'approve' | 'reject') {
    setError('')
    setSuccess('')
    setLoadingAction(action)

    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}/manual-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          reason: action === 'reject' ? 'Nie znaleziono wpłaty.' : undefined,
        }),
      })

      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? 'Nie udało się zaktualizować płatności.')
      }

      refreshAdminPage(action === 'approve' ? 'Płatność potwierdzona.' : 'Wpłata odrzucona.')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Wystąpił błąd akcji admina.')
    } finally {
      setLoadingAction(null)
    }
  }

  async function handleQaConfirm() {
    setError('')
    setSuccess('')
    setLoadingAction('qa-confirm')

    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}/qa-confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? 'Nie udało się potwierdzić QA bookingu.')
      }

      refreshAdminPage('Booking QA potwierdzony.')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Wystąpił błąd akcji admina.')
    } finally {
      setLoadingAction(null)
    }
  }

  async function handleCopyMeetingUrl() {
    setError('')
    setSuccess('')

    try {
      await navigator.clipboard.writeText(meetingUrl)
      setSuccess('Link do rozmowy skopiowany.')
    } catch {
      setError('Nie udało się skopiować linku do rozmowy.')
    }
  }

  return (
    <div className="booking-actions" data-admin-booking-actions={bookingId}>
      <a href={meetingUrl} target="_blank" rel="noopener noreferrer" className="button button-ghost small-button">
        Link do rozmowy
      </a>
      <button type="button" className="button button-ghost small-button" onClick={handleCopyMeetingUrl} disabled={isRefreshing}>
        Kopiuj link
      </button>

      {paymentStatus === 'pending_manual_review' ? (
        <>
          <button
            type="button"
            className="button button-primary small-button"
            data-admin-manual-action="approve"
            onClick={() => handleManualPaymentAction('approve')}
            disabled={loadingAction !== null || isRefreshing}
          >
            {loadingAction === 'approve' ? 'Potwierdzam...' : 'Potwierdź płatność'}
          </button>
          <button
            type="button"
            className="button button-ghost small-button"
            data-admin-manual-action="reject"
            onClick={() => handleManualPaymentAction('reject')}
            disabled={loadingAction !== null || isRefreshing}
          >
            {loadingAction === 'reject' ? 'Odrzucam...' : 'Odrzuć wpłatę'}
          </button>
        </>
      ) : null}

      {qaBooking && paymentStatus !== 'paid' ? (
        <button
          type="button"
          className="button button-primary small-button"
          data-admin-booking-action="qa-confirm"
          onClick={handleQaConfirm}
          disabled={loadingAction !== null || isRefreshing}
        >
          {loadingAction === 'qa-confirm' ? 'Potwierdzam QA...' : 'Potwierdź QA'}
        </button>
      ) : null}

      {paymentStatus === 'paid' && bookingStatus !== 'done' ? (
        <button
          type="button"
          className="button button-primary small-button"
          data-admin-booking-action="done"
          onClick={handleMarkDone}
          disabled={loadingAction !== null || isRefreshing}
        >
          {loadingAction === 'done' ? 'Zapisywanie...' : 'Oznacz jako zakończoną'}
        </button>
      ) : null}

      {success ? <span className="booking-meta admin-action-success">{success}</span> : null}
      {error ? <span className="booking-meta admin-action-error">{error}</span> : null}
    </div>
  )
}
