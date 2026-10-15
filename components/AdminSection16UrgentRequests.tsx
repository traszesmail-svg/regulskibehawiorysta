'use client'

import React, { useCallback, useEffect, useState } from 'react'

export type UrgentIntakeState =
  | 'pending_proposal'
  | 'timeslot_proposed'
  | 'payment_confirmed'
  | 'expired'
  | 'cancelled'
  | 'rejected'

export type UrgentIntakeDayChoice = 'today' | 'tomorrow'

export interface UrgentIntakeAdminDto {
  id: string
  dayChoice: UrgentIntakeDayChoice
  targetDate: string
  callerPhoneMasked: string
  state: UrgentIntakeState
  proposal: {
    proposedDate: string
    proposedTime: string
    proposedTimeslotIso: string | null
  } | null
  holdExpiresAt: string | null
  expiresAt: string
  version: number
  createdAt: string
  updatedAt: string
}

export const STATE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Wszystkie stany' },
  { value: 'pending_proposal', label: 'Oczekuje na propozycję (pending_proposal)' },
  { value: 'timeslot_proposed', label: 'Zaproponowano termin (timeslot_proposed)' },
  { value: 'payment_confirmed', label: 'Płatność potwierdzona (payment_confirmed)' },
  { value: 'expired', label: 'Wygasło (expired)' },
  { value: 'cancelled', label: 'Anulowano (cancelled)' },
  { value: 'rejected', label: 'Odrzucono (rejected)' },
]

export const STATE_DISPLAY_LABELS: Record<string, string> = {
  pending_proposal: 'Oczekuje na propozycję',
  timeslot_proposed: 'Zaproponowano termin',
  payment_confirmed: 'Płatność potwierdzona',
  expired: 'Wygasło',
  cancelled: 'Anulowano',
  rejected: 'Odrzucono',
}

const DAY_CHOICE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Wszystkie dni' },
  { value: 'today', label: 'Dzisiaj (today)' },
  { value: 'tomorrow', label: 'Jutro (tomorrow)' },
]

const LIMIT_OPTIONS = [10, 25, 50, 100]

export function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `idemp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return iso
  }
}

export function getStatusPillClass(state: string): string {
  switch (state) {
    case 'payment_confirmed':
      return 'status-pill status-paid'
    case 'pending_proposal':
    case 'timeslot_proposed':
      return 'status-pill status-pending'
    case 'expired':
    case 'cancelled':
    case 'rejected':
      return 'status-pill'
    default:
      return 'status-pill'
  }
}

export function AdminSection16UrgentRequests() {
  // Requests list state
  const [items, setItems] = useState<UrgentIntakeAdminDto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<number | null>(null)

  // Filters state
  const [stateFilter, setStateFilter] = useState<string>('')
  const [dayChoiceFilter, setDayChoiceFilter] = useState<string>('')
  const [limitFilter, setLimitFilter] = useState<number>(50)

  // Create form state
  const [formDayChoice, setFormDayChoice] = useState<UrgentIntakeDayChoice>('today')
  const [rawPhone, setRawPhone] = useState<string>('')
  const [idempotencyKey, setIdempotencyKey] = useState<string>(generateIdempotencyKey)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitErrorCode, setSubmitErrorCode] = useState<number | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    setError(null)
    setErrorCode(null)

    try {
      const params = new URLSearchParams()
      if (stateFilter) params.set('state', stateFilter)
      if (dayChoiceFilter) params.set('dayChoice', dayChoiceFilter)
      if (limitFilter) params.set('limit', String(limitFilter))

      const queryString = params.toString()
      const url = `/api/admin/section16/urgent-requests${queryString ? `?${queryString}` : ''}`

      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        cache: 'no-store',
      })

      if (!res.ok) {
        setErrorCode(res.status)
        if (res.status === 403) {
          throw new Error('Funkcja jest wyłączona (bramka SECTION16_ADMIN_PROPOSALS_ENABLED jest nieaktywna).')
        }
        if (res.status === 401) {
          throw new Error('Brak autoryzacji administratora. Zaloguj się ponownie do panelu.')
        }
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Błąd serwera (${res.status}).`)
      }

      const data = await res.json()
      const list = Array.isArray(data.items)
        ? data.items
        : Array.isArray(data.requests)
          ? data.requests
          : []
      setItems(list)
    } catch (fetchErr) {
      const msg = fetchErr instanceof Error ? fetchErr.message : 'Nie udało się wczytać zgłoszeń.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [stateFilter, dayChoiceFilter, limitFilter])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError(null)
    setSubmitErrorCode(null)
    setSubmitSuccess(null)

    const trimmedPhone = rawPhone.trim()
    const trimmedIdemp = idempotencyKey.trim()

    if (!trimmedPhone) {
      setSubmitError('Pole numeru telefonu (rawPhone) jest wymagane.')
      setSubmitting(false)
      return
    }

    if (!trimmedIdemp) {
      setSubmitError('Pole klucza idempotencji (idempotencyKey) jest wymagane.')
      setSubmitting(false)
      return
    }

    try {
      const res = await fetch('/api/admin/section16/urgent-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          dayChoice: formDayChoice,
          rawPhone: trimmedPhone,
          idempotencyKey: trimmedIdemp,
        }),
      })

      if (!res.ok) {
        setSubmitErrorCode(res.status)
        if (res.status === 403) {
          throw new Error('Funkcja jest wyłączona (bramka SECTION16_ADMIN_PROPOSALS_ENABLED jest nieaktywna).')
        }
        if (res.status === 401) {
          throw new Error('Brak autoryzacji administratora. Zaloguj się ponownie.')
        }
        if (res.status === 409) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Konflikt stanu zgłoszenia lub klucza idempotencji (409 Conflict).')
        }
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Błąd serwera (${res.status}).`)
      }

      const createdDto = (await res.json()) as UrgentIntakeAdminDto & { isRetry?: boolean }

      // CRITICAL REQUIREMENT: Clear rawPhone from form memory on success!
      setRawPhone('')
      // Generate a fresh idempotencyKey for future requests
      setIdempotencyKey(generateIdempotencyKey())

      const retryLabel = createdDto.isRetry ? ' (ponowienie idempotentne)' : ''
      setSubmitSuccess(
        `Zgłoszenie zapisane pomyślnie${retryLabel}: ID ${createdDto.id}, data: ${createdDto.targetDate}, tel: ${createdDto.callerPhoneMasked}.`,
      )

      // Refresh list
      await fetchRequests()
    } catch (submitErr) {
      const msg = submitErr instanceof Error ? submitErr.message : 'Nie udało się utworzyć zgłoszenia.'
      setSubmitError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleResetFilters = () => {
    setStateFilter('')
    setDayChoiceFilter('')
    setLimitFilter(50)
  }

  const isFeatureDisabled = errorCode === 403 || submitErrorCode === 403

  return (
    <div className="section16-admin-container" data-testid="section16-admin-panel">
      {/* 1. Global Fail-closed Feature Gate Banner */}
      {isFeatureDisabled && (
        <div className="error-box top-gap" role="alert" data-testid="feature-disabled-alert">
          <strong>Funkcja jest wyłączona</strong>
          <p style={{ margin: '6px 0 0' }}>
            Bramka funkcji (SECTION16_ADMIN_PROPOSALS_ENABLED) jest wyłączona lub żądanie zostało zablokowane (403 Forbidden). Panel działa w trybie fail-closed.
          </p>
        </div>
      )}

      {/* 2. Global 401 Auth Error Banner */}
      {errorCode === 401 && (
        <div className="error-box top-gap" role="alert" data-testid="auth-error-alert">
          <strong>Brak autoryzacji</strong>
          <p style={{ margin: '6px 0 0' }}>
            Brak ważnej autoryzacji administratora (401 Unauthorized). Zaloguj się ponownie do panelu.
          </p>
        </div>
      )}

      {/* 3. Create Form Section */}
      <section className="top-gap" aria-labelledby="create-form-heading">
        <div className="section-eyebrow">Tworzenie zgłoszenia</div>
        <h2 id="create-form-heading">Nowe zgłoszenie sekcji 16</h2>
        <p className="muted paragraph-gap">
          Wprowadź wybór dnia, numer kontaktowy oraz klucz idempotencji. Po udanym zapisie pełny numer telefonu jest natychmiast usuwany z pamięci formularza, a w systemie widoczny jest tylko zamaskowany skrót.
        </p>

        <form className="form-grid top-gap-small" onSubmit={handleCreateSubmit} data-testid="create-request-form">
          <div>
            <label htmlFor="s16-form-dayChoice">Preferowany dzień (dayChoice)</label>
            <select
              id="s16-form-dayChoice"
              value={formDayChoice}
              onChange={(e) => setFormDayChoice(e.target.value as UrgentIntakeDayChoice)}
              disabled={submitting}
              data-testid="form-daychoice-select"
            >
              <option value="today">Dzisiaj (today)</option>
              <option value="tomorrow">Jutro (tomorrow)</option>
            </select>
          </div>

          <div>
            <label htmlFor="s16-form-phone">Numer telefonu (rawPhone)</label>
            <input
              id="s16-form-phone"
              type="tel"
              value={rawPhone}
              onChange={(e) => setRawPhone(e.target.value)}
              placeholder="np. 501 234 567 lub +48501234567"
              required
              autoComplete="off"
              disabled={submitting}
              data-testid="form-rawphone-input"
            />
          </div>

          <div className="full-width">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label htmlFor="s16-form-idempotency" style={{ margin: 0 }}>
                Klucz idempotencji (idempotencyKey)
              </label>
              <button
                type="button"
                className="button button-ghost"
                style={{ padding: '4px 10px', fontSize: '13px', minHeight: 'auto' }}
                onClick={() => setIdempotencyKey(generateIdempotencyKey())}
                disabled={submitting}
                data-testid="form-generate-key-btn"
              >
                Wygeneruj nowy klucz
              </button>
            </div>
            <input
              id="s16-form-idempotency"
              type="text"
              value={idempotencyKey}
              onChange={(e) => setIdempotencyKey(e.target.value)}
              maxLength={128}
              required
              disabled={submitting}
              data-testid="form-idempotency-input"
            />
          </div>

          <div className="full-width" style={{ marginTop: 8 }}>
            <button
              type="submit"
              className="button button-primary"
              disabled={submitting}
              data-testid="form-submit-btn"
            >
              {submitting ? 'Zapisywanie zgłoszenia...' : 'Utwórz zgłoszenie'}
            </button>
          </div>
        </form>

        {submitSuccess && (
          <div
            className="info-box top-gap-small"
            role="status"
            data-testid="create-success-message"
            style={{ fontWeight: 500 }}
          >
            {submitSuccess}
          </div>
        )}

        {submitError && (
          <div className="error-box top-gap-small" role="alert" data-testid="create-error-message">
            {submitError}
          </div>
        )}
      </section>

      {/* 4. Filters Section */}
      <section className="top-gap" aria-labelledby="filters-heading">
        <div className="section-eyebrow">Przeglądanie i filtry</div>
        <h2 id="filters-heading">Filtry zgłoszeń</h2>

        <div className="form-grid top-gap-small" data-testid="filters-container">
          <div>
            <label htmlFor="s16-filter-state">Stan (state)</label>
            <select
              id="s16-filter-state"
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              disabled={loading}
              data-testid="filter-state-select"
            >
              {STATE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="s16-filter-dayChoice">Dzień (dayChoice)</label>
            <select
              id="s16-filter-dayChoice"
              value={dayChoiceFilter}
              onChange={(e) => setDayChoiceFilter(e.target.value)}
              disabled={loading}
              data-testid="filter-daychoice-select"
            >
              {DAY_CHOICE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="s16-filter-limit">Limit wyników (limit)</label>
            <select
              id="s16-filter-limit"
              value={limitFilter}
              onChange={(e) => setLimitFilter(Number(e.target.value))}
              disabled={loading}
              data-testid="filter-limit-select"
            >
              {LIMIT_OPTIONS.map((l) => (
                <option key={l} value={l}>
                  {l} rekordów
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, minHeight: 54 }}>
            <button
              type="button"
              className="button button-primary"
              onClick={() => fetchRequests()}
              disabled={loading}
              data-testid="filter-refresh-btn"
            >
              {loading ? 'Odświeżanie...' : 'Odśwież listę'}
            </button>
            <button
              type="button"
              className="button button-ghost"
              onClick={handleResetFilters}
              disabled={loading}
              data-testid="filter-reset-btn"
            >
              Resetuj filtry
            </button>
          </div>
        </div>
      </section>

      {/* 5. Summary Statistics */}
      <div className="summary-grid top-gap" data-testid="summary-statistics">
        <div className="summary-card">
          <div className="stat-label">Wszystkich wczytanych</div>
          <div className="summary-value" data-testid="count-total">
            {items.length}
          </div>
        </div>
        <div className="summary-card">
          <div className="stat-label">Oczekuje na propozycję</div>
          <div className="summary-value" data-testid="count-pending-proposal">
            {items.filter((i) => i.state === 'pending_proposal').length}
          </div>
        </div>
        <div className="summary-card">
          <div className="stat-label">Zaproponowano termin</div>
          <div className="summary-value" data-testid="count-timeslot-proposed">
            {items.filter((i) => i.state === 'timeslot_proposed').length}
          </div>
        </div>
        <div className="summary-card">
          <div className="stat-label">Płatność potwierdzona</div>
          <div className="summary-value" data-testid="count-payment-confirmed">
            {items.filter((i) => i.state === 'payment_confirmed').length}
          </div>
        </div>
      </div>

      {/* 6. List / Error / Loading / Empty State */}
      <section className="top-gap" aria-labelledby="list-heading">
        <div className="section-eyebrow">Wyniki</div>
        <h2 id="list-heading">Zgłoszenia sekcji 16 ({items.length})</h2>

        {loading && (
          <div className="empty-box top-gap-small" data-testid="loading-state">
            Wczytywanie zgłoszeń sekcji 16...
          </div>
        )}

        {!loading && error && (
          <div className="error-box top-gap-small" role="alert" data-testid="list-error-state">
            {error}
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="empty-box top-gap-small" data-testid="empty-state">
            Brak zgłoszeń sekcji 16 spełniających wybrane kryteria.
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="booking-list top-gap-small" data-testid="requests-list">
            {items.map((req) => (
              <article
                key={req.id}
                className="booking-row"
                data-testid={`request-item-${req.id}`}
                style={{ display: 'grid', gap: 12 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <span className={getStatusPillClass(req.state)} data-testid="item-state-pill">
                      {STATE_DISPLAY_LABELS[req.state] ?? req.state}
                    </span>
                    <h3 style={{ margin: '6px 0 4px', fontSize: '18px' }} data-testid="item-heading">
                      Zgłoszenie: {req.dayChoice === 'today' ? 'Dziś' : 'Jutro'} ({req.targetDate})
                    </h3>
                    <div className="booking-meta" data-testid="item-meta">
                      <strong>Telefon (maskowany):</strong> {req.callerPhoneMasked}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', fontSize: '12px', color: 'rgba(31, 26, 23, 0.6)' }}>
                    <div>
                      ID: <span style={{ fontFamily: 'monospace' }}>{req.id}</span>
                    </div>
                    <div>Wersja: v{req.version}</div>
                  </div>
                </div>

                <div className="booking-description" style={{ fontSize: '14px', lineHeight: 1.6 }}>
                  <div>
                    <strong>Propozycja terminu:</strong>{' '}
                    {req.proposal
                      ? `${req.proposal.proposedDate} o godz. ${req.proposal.proposedTime}`
                      : 'Brak aktywnej propozycji'}
                  </div>
                  {req.holdExpiresAt && (
                    <div>
                      <strong>Blokada terminu wygasa:</strong> {formatDateTime(req.holdExpiresAt)}
                    </div>
                  )}
                  <div>
                    <strong>Zgłoszenie wygasa:</strong> {formatDateTime(req.expiresAt)}
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(31, 26, 23, 0.5)', marginTop: 4 }}>
                    Utworzono: {formatDateTime(req.createdAt)} · Zaktualizowano: {formatDateTime(req.updatedAt)}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
