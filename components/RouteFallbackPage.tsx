import { FUNNEL_CTA_LABELS } from '@/lib/funnel'
import { NotatnikFooter, NotatnikSideVisuals, NotatnikTopbar, PUBLIC_SITE_NAV_ITEMS } from '@/components/NotatnikA'

type RouteFallbackAction = {
  href: string
  label: string
  primary?: boolean
}

type RouteFallbackPageProps = {
  code: string
  eyebrow: string
  title: string
  description: string
  highlights: [string, string]
  actions: RouteFallbackAction[]
  footerCtaHref?: string
  footerCtaLabel?: string
  footerHeadline?: string
  footerDescription?: string
}

export function RouteFallbackPage({
  code,
  eyebrow,
  title,
  description,
  highlights,
  actions,
  footerCtaHref = '/book',
  footerCtaLabel = FUNNEL_CTA_LABELS.primary,
  footerHeadline = 'Wróć do sprawdzićonego punktu startu',
  footerDescription = 'Najprościej wrócić do strony głównej, wejść na stronę psa lub kota albo wybrać 15-minutową konsultację behawioralną.',
}: RouteFallbackPageProps) {
  return (
    <main className="notatnik-page marketing-page">
      <NotatnikSideVisuals />
      <div className="notatnik-shell">
        <NotatnikTopbar tag="Regulski" navItems={PUBLIC_SITE_NAV_ITEMS} showUtilityLinks={false} />

        <section className="panel section-panel hero-surface">
          <div className="header-trust-strip" aria-label="Regulski">
            <span className="header-trust-item">Regulski</span>
            <span className="header-trust-item">{eyebrow}</span>
            <span className="header-trust-item">Spokojny start</span>
            <span className="header-trust-item">Bez zgadywania</span>
          </div>

          <div className="top-gap-small">
            <span className="offer-price">{code}</span>
          </div>

          <h1>{title}</h1>
          <p className="hero-text">{description}</p>

          <div className="offer-detail-highlight-row top-gap">
            <div className="list-card tree-backed-card">
              <strong>{highlights[0]}</strong>
              <span>{highlights[1]}</span>
            </div>

            <div className="list-card tree-backed-card">
              <strong>Najbezpieczniej teraz</strong>
              <span>Wróć do strony głównej, strony psa lub kota albo wybierz 15-minutową konsultację behawioralną.</span>
            </div>
          </div>

          <div className="hero-actions top-gap">
            {actions.map((action) => (
              <a key={action.href} href={action.href} className={`button big-button${action.primary ? ' button-primary' : ' button-ghost'}`}>
                {action.label}
              </a>
            ))}
          </div>

          <div className="list-card tree-backed-card top-gap">
            <strong>{footerHeadline}</strong>
            <span>{footerDescription}</span>
            <span className="top-gap-small" style={{ display: 'block' }}>
              <a href={footerCtaHref} className="inline-link">
                {footerCtaLabel}
              </a>
            </span>
          </div>
        </section>

        <NotatnikFooter showReviews={false} />
      </div>
    </main>
  )
}
