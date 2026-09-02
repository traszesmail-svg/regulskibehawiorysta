'use client'

import Link from 'next/link'
import { X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { trackAnalyticsEvent } from '@/lib/analytics'

const STORAGE_KEY = 'regulski-home-intro-popup-v1'

export function HomepageIntroPopup() {
  const [isVisible, setIsVisible] = useState(false)

  const dismiss = useCallback((reason: string) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, 'dismissed')
    } catch {}

    trackAnalyticsEvent('cta_click', {
      location: 'homepage-intro-popup',
      reason,
    })
    setIsVisible(false)
  }, [])

  useEffect(() => {
    // Enable force display via query parameter for testing/previewing
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('popup') === 'force') {
        const timer = window.setTimeout(() => setIsVisible(true), 700)
        return () => window.clearTimeout(timer)
      }
    }

    try {
      if (window.localStorage.getItem(STORAGE_KEY) === 'dismissed') {
        return
      }
    } catch (e) {
      // Don't return on error (e.g. Incognito mode / blocked storage).
      // Proceed to show the popup.
    }

    const timer = window.setTimeout(() => setIsVisible(true), 700)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!isVisible) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        dismiss('escape')
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [dismiss, isVisible])

  if (!isVisible) {
    return null
  }

  return (
    <div
      className="homepage-intro-popup"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          dismiss('backdrop')
        }
      }}
    >
      <section
        className="homepage-intro-popup-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="homepage-intro-popup-title"
      >
        <button type="button" className="homepage-intro-popup-close" onClick={() => dismiss('close')} aria-label="Zamknij okno">
          <X size={18} strokeWidth={2} aria-hidden="true" />
        </button>

        <figure className="homepage-intro-popup-visual">
          <picture>
            <source srcSet="/branding/homepage/home-intro-scene.webp" type="image/webp" />
            <img src="/branding/homepage/home-intro-scene.png" alt="" aria-hidden="true" />
          </picture>
        </figure>

        <div className="homepage-intro-popup-content">
          <p className="homepage-intro-popup-kicker">Zmartwiony opiekunie</p>
          <h2 id="homepage-intro-popup-title">Masz problem z psem albo kotem?</h2>
          <p>
            To właściwe miejsce, jeśli zachowanie zwierzęcia zaczęło martwić, powtarza się albo nie wiesz, od czego zacząć.
          </p>

          <div className="homepage-intro-popup-actions" aria-label="Wybierz pierwszy kierunek">
            <Link href="/zapytaj" prefetch={false} onClick={() => dismiss('zapytaj')}>
              Zapytaj behawiorystę — 79 zł
            </Link>
            <Link href="/mapa-sprawy" prefetch={false} className="is-secondary" onClick={() => dismiss('quiz')}>
              Nie wiesz, jak to nazwać? Otwórz mapę
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
