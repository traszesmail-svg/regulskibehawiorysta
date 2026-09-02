'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { listPublishedMaterialyGuides } from '@/lib/materialy-catalog'
import { BookingStatus, PaymentStatus } from '@/lib/types'

const paidMaterialGuides = listPublishedMaterialyGuides().filter((guide) => guide.priceCode === 'p19')

interface AdminBookingActionsProps {
  bookingId: string
  bookingStatus: BookingStatus
  paymentStatus: PaymentStatus
  meetingUrl: string
  qaBooking: boolean
  liveMode?: boolean
  callId?: string | null
  callStatus?: string | null
  serviceType?: string | null
  hasConsultationAccess?: boolean
}

export function AdminBookingActions({
  bookingId,
  bookingStatus,
  paymentStatus,
  meetingUrl,
  qaBooking,
  liveMode = false,
  callId = null,
  callStatus = null,
  serviceType = null,
  hasConsultationAccess = false,
}: AdminBookingActionsProps) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [recommendedNextStep, setRecommendedNextStep] = useState('')
  const [recommendedMaterialSlug, setRecommendedMaterialSlug] = useState('')
  const [loadingAction, setLoadingAction] = useState<'approve' | 'reject' | 'done' | 'qa-confirm' | 'manual-call' | 'consultation-access' | null>(null)
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
      const response = await fetch(`/api/admin/bookings/${bookingId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recommendedNextStep: recommendedNextStep.trim() || 'Po tej rozmowie wdrażaj ustalenia i wróć do Pokoju, jeśli pojawią się nowe pytania.',
          recommendedMaterialSlug: recommendedMaterialSlug || null,
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

  async function handleManualCall() {
    setError('')
    setSuccess('')
    setLoadingAction('manual-call')

    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}/manual-call`, { method: 'POST' })
      const payload = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(payload.error ?? 'Nie udało się uruchomić połączenia.')
      refreshAdminPage('Uruchomiono ręczną próbę połączenia.')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Wystąpił błąd połączenia.')
    } finally {
      setLoadingAction(null)
    }
  }

  async function handleIssueConsultationAccess() {
    setError('')
    setSuccess('')
    setLoadingAction('consultation-access')

    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}/consultation-access`, { method: 'POST' })
      const payload = (await response.json()) as { error?: string; code?: string; emailStatus?: string }
      if (!response.ok || !payload.code) {
        throw new Error(payload.error ?? 'Nie udało się wydać kodu konsultacji.')
      }
      setSuccess(`Kod konsultacji: ${payload.code}. ${payload.emailStatus === 'sent' ? 'Wysłano e-mail klientowi.' : 'Kod zachowaj i przekaż klientowi ręcznie.'}`)
      startTransition(() => {
        router.refresh()
      })
    } catch (issueError) {
      setError(issueError instanceof Error ? issueError.message : 'Nie udało się wydać kodu konsultacji.')
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

      {liveMode && paymentStatus === 'paid' && !callId && callStatus !== 'calling' && callStatus !== 'active' && callStatus !== 'completed' ? (
        <button type="button" className="button button-primary small-button" data-admin-booking-action="manual-call" onClick={() => void handleManualCall()} disabled={loadingAction !== null || isRefreshing}>
          {loadingAction === 'manual-call' ? 'Łączę…' : 'Zadzwoń ręcznie'}
        </button>
      ) : null}

      {paymentStatus === 'paid' && bookingStatus === 'done' && serviceType !== 'konsultacja-behawioralna-online' ? (
        <button
          type="button"
          className="button button-ghost small-button"
          data-admin-booking-action="consultation-access"
          onClick={() => void handleIssueConsultationAccess()}
          disabled={loadingAction !== null || isRefreshing}
        >
          {loadingAction === 'consultation-access'
            ? 'Wydaję kod...'
            : hasConsultationAccess
              ? 'Wydaj nowy kod konsultacji'
              : 'Wydaj kod konsultacji'}
        </button>
      ) : null}

      {paymentStatus === 'paid' ? (
        <>
          <label className="admin-recommendation-field">
            <span>Co robić dalej dla klienta</span>
            <textarea
              value={recommendedNextStep}
              onChange={(event) => setRecommendedNextStep(event.target.value)}
              rows={3}
              placeholder="Np. rekomenduję pełną konsultację; możesz też wskazać konkretny PDF albo zalecenie weterynaryjne."
              disabled={loadingAction !== null || isRefreshing}
            />
          </label>
          <label className="admin-recommendation-field">
            <span>Jeden rekomendowany PDF (opcjonalnie)</span>
            <select
              value={recommendedMaterialSlug}
              onChange={(event) => setRecommendedMaterialSlug(event.target.value)}
              disabled={loadingAction !== null || isRefreshing}
            >
              <option value="">Bez rekomendacji PDF</option>
              {paidMaterialGuides.map((guide) => (
                <option key={guide.slug} value={guide.slug}>
                  {guide.title} · 19 zł
                </option>
              ))}
            </select>
            <small>Klient zobaczy go w Pokoju po zakończeniu rozmowy. Zakup będzie dostępny dopiero tam.</small>
          </label>
          <button
            type="button"
            className="button button-primary small-button"
            data-admin-booking-action="done"
            onClick={handleMarkDone}
            disabled={loadingAction !== null || isRefreshing}
          >
            {loadingAction === 'done'
              ? 'Zapisywanie...'
              : bookingStatus === 'done'
                ? 'Zapisz rekomendację w Pokoju'
                : 'Zakończ i pokaż podsumowanie'}
          </button>
        </>
      ) : null}

      {success ? <span className="booking-meta admin-action-success">{success}</span> : null}
      {error ? <span className="booking-meta admin-action-error">{error}</span> : null}
    </div>
  )
}
