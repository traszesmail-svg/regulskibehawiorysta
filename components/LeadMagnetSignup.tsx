'use client'

import React, { useState, type FormEvent } from 'react'
import { trackAnalyticsEvent } from '@/lib/analytics'
import type { LeadMagnet } from '@/lib/growth-layer'

type FormState = 'idle' | 'loading' | 'success' | 'error'

type LeadMagnetSignupProps = {
  magnet: LeadMagnet
  location: string
  sourcePage: string
  compact?: boolean
  className?: string
}

function isEmailValid(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function LeadMagnetSignup({
  magnet,
  location,
  sourcePage,
  compact = false,
  className,
}: LeadMagnetSignupProps) {
  const [email, setEmail] = useState('')
  const [marketingOptIn, setMarketingOptIn] = useState(false)
  const [website, setWebsite] = useState('')
  const [status, setStatus] = useState<FormState>('idle')
  const [feedback, setFeedback] = useState('')

  function startDownload(downloadUrl: string) {
    const anchor = document.createElement('a')
    anchor.href = downloadUrl
    anchor.download = ''
    anchor.rel = 'noopener'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!isEmailValid(email.trim())) {
      setStatus('error')
      setFeedback('Podaj poprawny adres e-mail.')
      return
    }

    setStatus('loading')
    setFeedback('')

    try {
      const response = await fetch('/api/growth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          kind: 'lead_magnet',
          email: email.trim(),
          leadMagnetSlug: magnet.slug,
          location,
          sourcePage,
          marketingOptIn,
          website,
        }),
      })

      const payload = (await response.json()) as {
        ok?: boolean
        downloadUrl?: string
        redirectTo?: string
        emailDelivery?: 'sent' | 'skipped' | 'failed'
        error?: string
        message?: string
      }

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Nie udało się zapisać do pobrania materiału.')
      }

      trackAnalyticsEvent('lead_magnet_signup', {
        location,
        source_page: sourcePage,
        lead_magnet_slug: magnet.slug,
      })

      if (payload.downloadUrl) {
        startDownload(payload.downloadUrl)
        setStatus('success')
        setFeedback(
          payload.message ??
            'Pobieranie rozpocznie się za chwilę. Materiał możesz pobrać bezpośrednio z tej strony.',
        )
        setEmail('')
        setMarketingOptIn(false)
        setWebsite('')

        if (payload.redirectTo) {
          window.setTimeout(() => {
            window.location.assign(payload.redirectTo as string)
          }, 900)
        }
        return
      }

      if (payload.redirectTo) {
        window.location.assign(payload.redirectTo)
        return
      }

      setStatus('success')
      setFeedback(payload.message ?? 'Zapis przyjęty.')
      setEmail('')
      setMarketingOptIn(false)
      setWebsite('')
    } catch (error) {
      setStatus('error')
      setFeedback(error instanceof Error ? error.message : 'Nie udało się zapisać do pobrania materiału.')
    }
  }

  return (
    <article className={className ?? 'summary-card tree-backed-card'}>
      <div className="section-eyebrow">Bezpłatny materiał</div>
      <h3>{magnet.title}</h3>
      <p className="muted">{magnet.lead}</p>

      <ul className="premium-bullet-list top-gap-small">
        {magnet.bullets.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <form className={`form-grid top-gap${compact ? ' compact-form-grid' : ''}`} onSubmit={handleSubmit} noValidate>
        <div className="form-field">
          <label htmlFor={`lead-magnet-email-${magnet.slug}-${location}`}>E-mail</label>
          <input
            id={`lead-magnet-email-${magnet.slug}-${location}`}
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="twoj@email.pl"
            autoComplete="email"
          />
        </div>

        <div className="sr-only" aria-hidden="true">
          <label htmlFor={`lead-magnet-website-${magnet.slug}-${location}`}>Strona internetowa</label>
          <input
            id={`lead-magnet-website-${magnet.slug}-${location}`}
            name="website"
            type="text"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
            autoComplete="off"
            tabIndex={-1}
          />
        </div>

        <div className="full-width hero-actions top-gap-small">
          <button type="submit" className="button button-primary" disabled={status === 'loading'}>
            {status === 'loading' ? 'Przygotowuję...' : magnet.ctaLabel}
          </button>
        </div>

        <label className="full-width field-help" htmlFor={`lead-magnet-marketing-${magnet.slug}-${location}`}>
          <input
            id={`lead-magnet-marketing-${magnet.slug}-${location}`}
            name="marketingOptIn"
            type="checkbox"
            checked={marketingOptIn}
            onChange={(event) => setMarketingOptIn(event.target.checked)}
          />{' '}
          Opcjonalnie: zgadzam się na maksymalnie dwa dodatkowe e-maile z praktycznymi wskazówkami do tego materiału
          (po około 3 i 7 dniach). Zgoda nie jest potrzebna do pobrania PDF; z każdej wiadomości można wypisać się
          jednym kliknięciem.
        </label>

        <div className="full-width field-help">
          Materiał będzie dostępny od razu na tej stronie. Dodatkowy link e-mail wysyłamy tylko wtedy, gdy wysyłka się
          powiedzie.
        </div>

        {feedback ? (
          <div className={`full-width info-box ${status === 'error' ? 'error-box' : ''}`}>
            <span>{feedback}</span>
          </div>
        ) : null}
      </form>
    </article>
  )
}
