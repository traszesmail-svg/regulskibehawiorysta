import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { BookOpen, PenLine, Route, ShieldCheck, UserRound } from 'lucide-react'
import { FinalReviewsQuoteCarousel } from '@/components/FinalReviewsQuoteCarousel'
import { getBuildMarkerSnapshot } from '@/lib/build-marker'
import { REGULSKI_WEB_LOGO } from '@/lib/regulski-web-assets'
import { catReviews, dogReviews, reviews } from '@/lib/reviews.config'
import {
  CAPBT_PROFILE_URL,
  COAPE_ORG_URL,
  SITE_HEADER_BRAND,
  SPECIALIST_NAME,
} from '@/lib/site'

type FooterProps = {
  variant?: 'landing' | 'lean' | 'full' | 'home' | 'legal'
  ctaHref?: string
  ctaLabel?: string
  secondaryHref?: string
  secondaryLabel?: string
  showReviews?: boolean
  reviewSpecies?: 'dog' | 'cat' | 'all'
  reviewLayout?: 'carousel' | 'editorial'
  sectionBasePath?: '/' | '/blog' | '/psy' | '/koty' | '/opinie' | '/o-mnie' | '/faq' | '/kontakt' | '/materialy'
}

const FOOTER_NAV_ITEMS = [
  { href: '/zapytaj', label: 'Zapytaj', icon: ShieldCheck },
  { href: '/konsultacja', label: 'Konsultacja', icon: Route },
  { href: '/terapia', label: 'Terapia', icon: UserRound },
  { href: '/materialy', label: 'Materiały', icon: BookOpen },
  { href: '/blog', label: 'Blog', icon: PenLine },
] as const

const FOOTER_LEGAL_LINKS = [
  { href: '/polityka-prywatnosci', label: 'Polityka prywatności' },
  { href: '/regulamin', label: 'Regulamin' },
  { href: '/regulamin-pelna-konsultacja', label: 'Regulamin Pełnej konsultacji' },
] as const

function FooterLegalLinks({ className }: { className: string }) {
  return (
    <nav className={className} aria-label="Linki prawne">
      {FOOTER_LEGAL_LINKS.map((item) => (
        <Link key={item.href} href={item.href} prefetch={false}>
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  )
}

export function Footer(props: FooterProps) {
  const buildMarker = getBuildMarkerSnapshot()
  const footerReviews = props.reviewSpecies === 'dog' ? dogReviews : props.reviewSpecies === 'cat' ? catReviews : reviews
  const compactFooterVariants: Array<FooterProps['variant'] | undefined> = ['landing', 'lean', 'full', 'home', 'legal', undefined]
  const useCompactFooter = compactFooterVariants.includes(props.variant)
  const showReviews = props.showReviews !== false
  const reviewSourceUrl = props.reviewSpecies === 'all' ? '/api/reviews' : undefined
  const initialIndex = footerReviews.length > 1 ? Math.floor(Math.random() * footerReviews.length) : 0

  if (useCompactFooter) {
    return (
      <>
        {showReviews ? (
          <FinalReviewsQuoteCarousel
            reviews={footerReviews}
            intervalMs={6000}
            initialIndex={initialIndex}
            sourceUrl={reviewSourceUrl}
            layout={props.reviewLayout}
          />
        ) : null}
        <footer className="site-footer site-footer-home-compact" aria-label="Stopka" data-build-marker={buildMarker.value}>
          <nav className="home-footer-link-grid" aria-label="Nawigacja w stopce">
            {FOOTER_NAV_ITEMS.map((item) => {
              const Icon = item.icon

              return (
                <Link key={item.href} href={item.href} prefetch={false} className="home-footer-link">
                  <Icon size={23} strokeWidth={1.65} aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="home-footer-credits">
            <span>&copy; 2026 {SPECIALIST_NAME}</span>
            <FooterLegalLinks className="home-footer-legal" />
          </div>
        </footer>
      </>
    )
  }

  return (
    <>
      {showReviews ? (
        <FinalReviewsQuoteCarousel
          reviews={footerReviews}
          intervalMs={6000}
          initialIndex={initialIndex}
          sourceUrl={reviewSourceUrl}
          layout={props.reviewLayout}
        />
      ) : null}
      <footer className="site-footer" aria-label="Stopka" data-build-marker={buildMarker.value}>
        <div className="site-footer-grid">
          <div className="site-footer-brand">
            <Link href="/" prefetch={false} className="site-footer-brand-lockup" aria-label="Wróć na stronę główną Regulski Behawiorysta">
              <span className="site-footer-brand-mark">
                <Image src={REGULSKI_WEB_LOGO} alt="" width={512} height={512} />
              </span>
              <span className="site-footer-brand-copy">
                <span>{SITE_HEADER_BRAND}</span>
                <small>
                  Krzysztof Regulski - behawiorysta zwierzęcy, doświadczony technik weterynarii i dietetyk.
                  Pomagam opiekunom psów i kotów zrozumieć zachowanie, znaleźć możliwą przyczynę i wybrać
                  pierwszy krok bez presji, kar i zgadywania.
                </small>
              </span>
            </Link>
          </div>

          <div className="site-footer-meta">
            <div className="site-footer-nav">
              <div className="section-eyebrow">Nawigacja</div>
              <div className="site-footer-links">
                {FOOTER_NAV_ITEMS.map((item) => {
                  const Icon = item.icon

                  return (
                    <Link key={item.href} href={item.href} prefetch={false} className="site-footer-link">
                      <span className="site-footer-link-icon" aria-hidden="true">
                        <Icon size={15} strokeWidth={1.9} />
                      </span>
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="site-footer-bottom">
          <div className="site-footer-credit-block">
            <div className="site-footer-credentials" aria-label="Akredytacje i organizacje">
              <Link href={COAPE_ORG_URL} target="_blank" rel="noopener noreferrer" aria-label="Otwórz stronę COAPE">
                <Image src="/branding/credentials/coape-logo.jpg" alt="COAPE" width={220} height={72} />
              </Link>
              <Link href={CAPBT_PROFILE_URL} target="_blank" rel="noopener noreferrer" aria-label="Otwórz profil CAPBT">
                <Image src="/branding/credentials/capbt-logo.png" alt="CAPBT" width={162} height={72} />
              </Link>
            </div>
            <div className="site-footer-credit">
              <span>&copy; 2026 {SPECIALIST_NAME}</span>
            </div>
          </div>

          <FooterLegalLinks className="site-footer-legal" />
        </div>
      </footer>
    </>
  )
}
