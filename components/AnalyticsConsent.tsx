'use client'

import Script from 'next/script'
import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  AnalyticsConsentState,
  persistAnalyticsConsent,
  readAnalyticsConsent,
  trackAnalyticsEvent,
} from '@/lib/analytics'

type AnalyticsConsentProps = {
  measurementId?: string | null
  cookiebotDomainGroupId?: string | null
}

const FALLBACK_BANNER_DELAY_MS = 1400
const FALLBACK_BANNER_SCROLL_OFFSET = 64
const FALLBACK_BANNER_COMPACT_SCROLL_OFFSET = 200
const FALLBACK_BANNER_COMPACT_VIEWPORT_QUERY = '(max-width: 540px)'

declare global {
  interface Window {
    Cookiebot?: {
      consent?: {
        statistics?: boolean
      }
    }
  }
}

function readCookiebotStatisticsConsent(): AnalyticsConsentState {
  if (typeof window === 'undefined') {
    return 'unset'
  }

  const statisticsConsent = window.Cookiebot?.consent?.statistics

  if (statisticsConsent === true) {
    return 'granted'
  }

  if (statisticsConsent === false) {
    return 'denied'
  }

  return 'unset'
}

export function AnalyticsConsent({ measurementId, cookiebotDomainGroupId }: AnalyticsConsentProps) {
  const [consent, setConsent] = useState<AnalyticsConsentState>('unset')
  const [isFallbackBannerReady, setIsFallbackBannerReady] = useState(false)
  const pathname = usePathname() ?? '/'
  const searchParams = useSearchParams()
  const hasCookiebot = Boolean(cookiebotDomainGroupId)
  const isInternalPath = pathname.startsWith('/admin') || pathname.startsWith('/__internal') || pathname.startsWith('/api')
  const isCaseMapPath = pathname === '/mapa-sprawy'
  const isAccountPrivacyPath = pathname === '/login' || pathname === '/pokoj' || pathname.startsWith('/konto')
  const isGenericAnalyticsDisabledPath = isInternalPath || isCaseMapPath || isAccountPrivacyPath
  const shouldShowFallbackBanner =
    !isInternalPath && !isAccountPrivacyPath && !hasCookiebot && Boolean(measurementId) && consent === 'unset'

  useEffect(() => {
    if (!measurementId || isInternalPath || isAccountPrivacyPath) {
      return
    }

    if (hasCookiebot) {
      const syncCookiebotConsent = () => {
        const nextConsent = readCookiebotStatisticsConsent()

        if (nextConsent === 'granted' || nextConsent === 'denied') {
          persistAnalyticsConsent(nextConsent)
        }

        setConsent(nextConsent)
      }

      syncCookiebotConsent()
      window.addEventListener('CookiebotOnConsentReady', syncCookiebotConsent)
      window.addEventListener('CookiebotOnAccept', syncCookiebotConsent)
      window.addEventListener('CookiebotOnDecline', syncCookiebotConsent)

      return () => {
        window.removeEventListener('CookiebotOnConsentReady', syncCookiebotConsent)
        window.removeEventListener('CookiebotOnAccept', syncCookiebotConsent)
        window.removeEventListener('CookiebotOnDecline', syncCookiebotConsent)
      }
    }

    setConsent(readAnalyticsConsent())
  }, [hasCookiebot, isAccountPrivacyPath, isInternalPath, measurementId])

  useEffect(() => {
    if (!measurementId || typeof window === 'undefined') {
      return
    }

    const key = `ga-disable-${measurementId}`
    Reflect.set(window, key, isCaseMapPath || isAccountPrivacyPath)
  }, [isAccountPrivacyPath, isCaseMapPath, measurementId])

  useEffect(() => {
    if (!measurementId || typeof window === 'undefined') {
      return
    }

    const keepCaseMapOutOfSpaHistoryTracking = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return
      }

      const link = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>('a[href]')
      if (!link || (link.target && link.target !== '_self') || link.hasAttribute('download')) {
        return
      }

      const destination = new URL(link.href, window.location.href)
      if (destination.origin !== window.location.origin || destination.pathname !== '/mapa-sprawy') {
        return
      }

      // GA enhanced measurement can observe History API changes before React
      // effects on the destination route run. A document navigation lets the
      // Map boot with GA absent from the first byte instead.
      event.preventDefault()
      event.stopPropagation()
      window.location.assign(destination.href)
    }

    document.addEventListener('click', keepCaseMapOutOfSpaHistoryTracking, true)
    return () => document.removeEventListener('click', keepCaseMapOutOfSpaHistoryTracking, true)
  }, [measurementId])

  useEffect(() => {
    if (!measurementId || typeof window === 'undefined') {
      return
    }

    const blockPrivacyRouteBeforeAnalyticsHistoryListeners = () => {
      const privateRoute = window.location.pathname === '/mapa-sprawy' ||
        window.location.pathname === '/login' ||
        window.location.pathname === '/pokoj' ||
        window.location.pathname.startsWith('/konto')

      if (privateRoute) {
        Reflect.set(window, `ga-disable-${measurementId}`, true)
      }
    }

    // This listener is installed before the afterInteractive GA tag. It also
    // protects browser Back/Forward navigation, which does not pass through an
    // anchor click handler.
    window.addEventListener('popstate', blockPrivacyRouteBeforeAnalyticsHistoryListeners)
    return () => window.removeEventListener('popstate', blockPrivacyRouteBeforeAnalyticsHistoryListeners)
  }, [measurementId])

  useEffect(() => {
    if (!measurementId || isGenericAnalyticsDisabledPath) {
      return
    }

    const startedForms = new WeakSet<HTMLFormElement>()

    function handleTrackedClick(event: MouseEvent) {
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-analytics-event]')

      if (!target) {
        return
      }

      if (target.closest('[data-analytics-disabled="true"]')) {
        return
      }

      const eventName = target.dataset.analyticsEvent
      if (!eventName) {
        return
      }

      const trackedLink = target.closest<HTMLAnchorElement>('a[href]')

      trackAnalyticsEvent(eventName, {
        location: target.dataset.analyticsLocation,
        source_page: target.dataset.analyticsSourcePage ?? pathname,
        target_href: target.dataset.analyticsTargetHref ?? trackedLink?.getAttribute('href'),
        campaign: target.dataset.analyticsCampaign,
        problem_key: target.dataset.analyticsProblem,
        species: target.dataset.analyticsSpecies,
        service_key: target.dataset.analyticsService,
        service_name: target.dataset.analyticsServiceName,
        service_duration: target.dataset.analyticsServiceDuration,
        service_price: target.dataset.analyticsServicePrice,
        cta_label: target.dataset.analyticsCtaLabel,
        item_type: target.dataset.analyticsItemType,
        item_slug: target.dataset.analyticsItemSlug,
        slot_date: target.dataset.analyticsSlotDate,
        slot_time: target.dataset.analyticsSlotTime,
      })
    }

    function handleTrackedFormStart(event: FocusEvent) {
      const form = (event.target as HTMLElement | null)?.closest<HTMLFormElement>('form[data-analytics-form]')

      if (!form || startedForms.has(form)) {
        return
      }

      startedForms.add(form)
      trackAnalyticsEvent(form.dataset.analyticsFormStartEvent ?? 'form_started', {
        form_name: form.dataset.analyticsForm,
        source_page: pathname,
        service_key: form.dataset.analyticsService,
        species: form.dataset.analyticsSpecies,
        item_type: form.dataset.analyticsItemType,
        item_slug: form.dataset.analyticsItemSlug,
      })
    }

    document.addEventListener('click', handleTrackedClick)
    document.addEventListener('focusin', handleTrackedFormStart)
    return () => {
      document.removeEventListener('click', handleTrackedClick)
      document.removeEventListener('focusin', handleTrackedFormStart)
    }
  }, [isGenericAnalyticsDisabledPath, measurementId, pathname])

  useEffect(() => {
    if (!measurementId || consent !== 'granted' || isGenericAnalyticsDisabledPath) {
      return
    }

    const query = pathname === '/mapa-sprawy' ? '' : searchParams?.toString()

    trackAnalyticsEvent('view_page', {
      source_page: pathname,
      page_path: query ? `${pathname}?${query}` : pathname,
    })
  }, [consent, isGenericAnalyticsDisabledPath, measurementId, pathname, searchParams])

  useEffect(() => {
    if (!shouldShowFallbackBanner) {
      setIsFallbackBannerReady(false)
      return
    }

    let revealed = false
    const isCompactViewport =
      typeof window.matchMedia === 'function' && window.matchMedia(FALLBACK_BANNER_COMPACT_VIEWPORT_QUERY).matches
    const scrollOffset = isCompactViewport
      ? FALLBACK_BANNER_COMPACT_SCROLL_OFFSET
      : FALLBACK_BANNER_SCROLL_OFFSET

    const revealBanner = () => {
      if (revealed) {
        return
      }

      revealed = true
      setIsFallbackBannerReady(true)
    }

    const timeoutId = isCompactViewport ? null : window.setTimeout(revealBanner, FALLBACK_BANNER_DELAY_MS)

    const handleScroll = () => {
      if (window.scrollY > scrollOffset) {
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId)
        }
        revealBanner()
      }
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
      }
      window.removeEventListener('scroll', handleScroll)
    }
  }, [shouldShowFallbackBanner])

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    if (shouldShowFallbackBanner && isFallbackBannerReady) {
      document.body.setAttribute('data-consent-banner-visible', 'true')
      return () => document.body.removeAttribute('data-consent-banner-visible')
    }

    document.body.removeAttribute('data-consent-banner-visible')
  }, [isFallbackBannerReady, shouldShowFallbackBanner])

  if (isInternalPath || isAccountPrivacyPath || (!measurementId && !hasCookiebot)) {
    return null
  }

  function updateConsent(value: Exclude<AnalyticsConsentState, 'unset'>) {
    persistAnalyticsConsent(value)
    setConsent(value)
  }

  return (
    <>
      {hasCookiebot ? (
        <Script
          id="Cookiebot"
          src="https://consent.cookiebot.com/uc.js"
          data-cbid={cookiebotDomainGroupId}
          data-blockingmode="auto"
          strategy="afterInteractive"
        />
      ) : null}

      {measurementId && consent === 'granted' && !isGenericAnalyticsDisabledPath ? (
        <>
          <Script
            id="ga4-script"
            src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){window.dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              gtag('config', '${measurementId}', { anonymize_ip: true });
            `}
          </Script>
        </>
      ) : null}

      {shouldShowFallbackBanner && isFallbackBannerReady ? (
        <div
          className="consent-banner"
          data-consent-banner="fallback"
          role="dialog"
          aria-labelledby="consent-title"
          aria-describedby="consent-copy"
          aria-modal="false"
        >
          <div className="consent-copy">
            <strong id="consent-title">Analityka po Twojej zgodzie</strong>
            <span id="consent-copy">
              Statystyki włączam dopiero po decyzji. Pomagają mi sprawdzać, skąd trafiasz na stronę i czy formularze oraz rezerwacja działają poprawnie.
            </span>
          </div>
          <div className="consent-actions">
            <button type="button" className="button button-ghost small-button" onClick={() => updateConsent('denied')}>
              Odrzuć
            </button>
            <button type="button" className="button button-primary small-button" onClick={() => updateConsent('granted')}>
              Akceptuję analitykę
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
