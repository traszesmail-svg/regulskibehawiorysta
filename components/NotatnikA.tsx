import Link from 'next/link'
import Image from 'next/image'
import { Zap } from 'lucide-react'
import { Footer } from '@/components/Footer'
import { NotatnikMobileMenu } from '@/components/NotatnikMobileMenu'
import { ThemeToggle } from '@/components/ThemeToggle'
import { INSTAGRAM_PROFILE_URL } from '@/lib/site'
import { REGULSKI_WEB_BADGE_LOGO } from '@/lib/regulski-web-assets'

export type NotatnikNavItem = {
  href: string
  label: string
}

export const PUBLIC_SITE_NAV_ITEMS: readonly NotatnikNavItem[] = [
  { href: '/o-mnie', label: 'O mnie' },
  { href: '/cennik', label: 'Cennik' },
  { href: '/faq', label: 'FAQ' },
  { href: '/blog', label: 'Blog' },
  { href: '/kontakt', label: 'Kontakt' },
  { href: '/pokoj', label: 'Twój pokój' },
]

export const PUBLIC_BOOKING_FLOW_NAV_ITEMS: readonly NotatnikNavItem[] = PUBLIC_SITE_NAV_ITEMS

export const PUBLIC_SITE_TOPBAR_CTA = {
  href: '/mapa-sprawy',
  label: 'Mapa zachowania',
} as const

export type NotatnikTopbarProfile = 'site' | 'flow'

type NotatnikTopbarProps = {
  tag: string
  navItems: readonly NotatnikNavItem[]
  ctaHref?: string
  ctaLabel?: string
  ctaVariant?: 'solid' | 'ghost' | 'accent'
  showUtilityLinks?: boolean
  profile?: NotatnikTopbarProfile
}

type NotatnikSectionHeadProps = {
  index: string
  kicker?: string
  title: string
}

type NotatnikFinalCtaProps = {
  title: string
  copy?: string
  primaryHref: string
  primaryLabel: string
  secondaryHref?: string
  secondaryLabel?: string
}

type NotatnikFooterProps = {
  primaryHref?: string
  primaryLabel?: string
  variant?: 'landing' | 'lean' | 'full' | 'home' | 'legal'
  showReviews?: boolean
  reviewSpecies?: 'dog' | 'cat' | 'all'
  reviewLayout?: 'carousel' | 'editorial'
}

type NotatnikPageShellProps = {
  tag: string
  navItems: readonly NotatnikNavItem[]
  ctaHref: string
  ctaLabel: string
  footerPrimaryHref: string
  footerPrimaryLabel: string
  sideVisualVariant?: NotatnikSideVisualVariant
  showSideVisuals?: boolean
  pageClassName?: string
  shellClassName?: string
  footerVariant?: 'landing' | 'lean' | 'full' | 'home' | 'legal'
  showFooterReviews?: boolean
  analyticsDisabled?: boolean
  topbarProfile?: NotatnikTopbarProfile
  children: React.ReactNode
}

export type NotatnikSideVisualVariant = 'home' | 'mixed' | 'dog' | 'cat' | 'materials' | 'blog' | 'about' | 'pricing' | 'contact' | 'booking'

const DOG_SIDE_VISUAL = '/images/homepage/home-bg-dog-1to1.webp'
const CAT_SIDE_VISUAL = '/images/homepage/home-bg-cat-1to1.webp'

function NotatnikButtonArrow() {
  return (
    <span className="notatnik-btn-arrow" aria-hidden="true">
      &rarr;
    </span>
  )
}

function InstagramGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.25" y="3.25" width="17.5" height="17.5" rx="5.25" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4.1" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" />
    </svg>
  )
}

function NotatnikBrandLockup() {
  return (
    <Link href="/" prefetch={false} className="notatnik-brand" aria-label="Wróć na stronę główną Regulski Behawiorysta">
      <span className="notatnik-brand-credential" aria-hidden="true">
        <Image src={REGULSKI_WEB_BADGE_LOGO} alt="" width={180} height={180} priority />
      </span>
      <span className="notatnik-brand-copy">
        <span className="notatnik-brand-mark">Regulski Behawiorysta</span>
        <span className="notatnik-brand-tag">
          <span>Terapia behawioralna dla</span>
          <span>psów i kotów</span>
        </span>
      </span>
    </Link>
  )
}

export function NotatnikTopbar({
  navItems = PUBLIC_SITE_NAV_ITEMS,
  ctaHref,
  ctaLabel,
  showUtilityLinks = true,
  profile = 'site',
}: NotatnikTopbarProps) {
  const hasNavItems = navItems.length > 0
  const resolvedCtaHref = profile === 'site' ? PUBLIC_SITE_TOPBAR_CTA.href : (ctaHref ?? PUBLIC_SITE_TOPBAR_CTA.href)
  const resolvedCtaLabel = profile === 'site' ? PUBLIC_SITE_TOPBAR_CTA.label : (ctaLabel ?? PUBLIC_SITE_TOPBAR_CTA.label)
  const resolvedShowUtilityLinks = profile === 'site' ? true : showUtilityLinks

  return (
    <header id="notatnik-topbar" className={`notatnik-topbar notatnik-topbar-${profile}`} data-topbar-profile={profile}>
      <NotatnikBrandLockup />

      {hasNavItems ? (
        <nav className="notatnik-nav" aria-label="Główne sekcje">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} prefetch={false}>
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}

      <div className="notatnik-topbar-actions">
        <Link href={resolvedCtaHref} prefetch={false} className="notatnik-topbar-quick-help">
          <Zap size={16} strokeWidth={2.1} aria-hidden="true" />
          <span>{resolvedCtaLabel}</span>
        </Link>
        {resolvedShowUtilityLinks ? <ThemeToggle /> : null}
        {resolvedShowUtilityLinks ? (
          <a
            href={INSTAGRAM_PROFILE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="notatnik-social-link"
            aria-label="Otwórz Instagram"
          >
            <InstagramGlyph />
          </a>
        ) : null}
      </div>

      {hasNavItems ? <NotatnikMobileMenu navItems={navItems} ctaHref={resolvedCtaHref} ctaLabel={resolvedCtaLabel} /> : null}
    </header>
  )
}

const SIDE_VISUALS: Record<NotatnikSideVisualVariant, { left: string; right: string }> = {
  home: {
    left: DOG_SIDE_VISUAL,
    right: CAT_SIDE_VISUAL,
  },
  mixed: {
    left: DOG_SIDE_VISUAL,
    right: CAT_SIDE_VISUAL,
  },
  dog: {
    left: DOG_SIDE_VISUAL,
    right: CAT_SIDE_VISUAL,
  },
  cat: {
    left: DOG_SIDE_VISUAL,
    right: CAT_SIDE_VISUAL,
  },
  materials: {
    left: DOG_SIDE_VISUAL,
    right: CAT_SIDE_VISUAL,
  },
  blog: {
    left: DOG_SIDE_VISUAL,
    right: CAT_SIDE_VISUAL,
  },
  about: {
    left: DOG_SIDE_VISUAL,
    right: CAT_SIDE_VISUAL,
  },
  pricing: {
    left: DOG_SIDE_VISUAL,
    right: CAT_SIDE_VISUAL,
  },
  contact: {
    left: DOG_SIDE_VISUAL,
    right: CAT_SIDE_VISUAL,
  },
  booking: {
    left: DOG_SIDE_VISUAL,
    right: CAT_SIDE_VISUAL,
  },
}

export function NotatnikSideVisuals({ variant = 'mixed' }: { variant?: NotatnikSideVisualVariant }) {
  const visuals = SIDE_VISUALS[variant]

  return (
    <>
      <div
        className="notatnik-side-visual notatnik-side-visual-left"
        aria-hidden="true"
      >
        <span
          className="notatnik-side-visual-image"
          aria-hidden="true"
          style={{
            backgroundImage: `url(${visuals.left})`,
            backgroundPosition: 'right 18%',
            backgroundSize: 'cover',
          }}
        />
      </div>
      <div
        className="notatnik-side-visual notatnik-side-visual-right"
        aria-hidden="true"
      >
        <span
          className="notatnik-side-visual-image"
          aria-hidden="true"
          style={{
            backgroundImage: `url(${visuals.right})`,
            backgroundPosition: 'left 18%',
            backgroundSize: 'cover',
          }}
        />
      </div>
    </>
  )
}

export function NotatnikSectionHead({ index, kicker, title }: NotatnikSectionHeadProps) {
  return (
    <div className="notatnik-section-head">
      <div className="notatnik-section-index">{index}</div>
      <div className="notatnik-section-head-copy">
        {kicker ? <div className="notatnik-mono">{kicker}</div> : null}
        <h2>{title}</h2>
      </div>
    </div>
  )
}

export function NotatnikFinalCta({
  title,
  copy,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: NotatnikFinalCtaProps) {
  return (
    <section className="notatnik-final site-help-cta">
      <div className="site-help-cta-copy">
        <h2 dangerouslySetInnerHTML={{ __html: title }} />
        {copy ? <p>{copy}</p> : null}
        <div className="notatnik-final-actions site-help-cta-actions">
          <Link href={primaryHref} prefetch={false} className="notatnik-btn">
            <span>{primaryLabel}</span>
            <NotatnikButtonArrow />
          </Link>
          {secondaryHref && secondaryLabel ? (
            <Link href={secondaryHref} prefetch={false} className="notatnik-btn notatnik-btn-ghost">
              <span>{secondaryLabel}</span>
            </Link>
          ) : null}
        </div>
      </div>
      <div className="site-help-cta-image" aria-hidden="true">
        <Image src="/faq/faq-help-illustration-clean.png" alt="" width={355} height={208} sizes="(max-width: 760px) 58vw, 210px" />
      </div>
    </section>
  )
}

export function NotatnikFooter({
  primaryHref,
  primaryLabel,
  variant = 'home',
  showReviews = true,
  reviewSpecies = 'all',
  reviewLayout = 'carousel',
}: NotatnikFooterProps) {
  return (
    <Footer
      variant={variant}
      ctaHref={primaryHref}
      ctaLabel={primaryLabel}
      showReviews={showReviews}
      reviewSpecies={reviewSpecies}
      reviewLayout={reviewLayout}
    />
  )
}

export function NotatnikPageShell({
  tag,
  navItems,
  ctaHref,
  ctaLabel,
  footerPrimaryHref,
  footerPrimaryLabel,
  sideVisualVariant = 'mixed',
  showSideVisuals = true,
  pageClassName,
  shellClassName,
  footerVariant = 'home',
  showFooterReviews = false,
  analyticsDisabled = false,
  topbarProfile = 'site',
  children,
}: NotatnikPageShellProps) {
  return (
    <main
      className={pageClassName ? `notatnik-page ${pageClassName}` : 'notatnik-page'}
      data-analytics-disabled={analyticsDisabled ? 'true' : undefined}
    >
      {showSideVisuals ? <NotatnikSideVisuals variant={sideVisualVariant} /> : null}
      <div className={shellClassName ? `notatnik-shell ${shellClassName}` : 'notatnik-shell'}>
        <NotatnikTopbar tag={tag} navItems={navItems} ctaHref={ctaHref} ctaLabel={ctaLabel} profile={topbarProfile} />
        {children}
        <NotatnikFooter
          primaryHref={footerPrimaryHref}
          primaryLabel={footerPrimaryLabel}
          variant={footerVariant}
          showReviews={showFooterReviews}
        />
      </div>
    </main>
  )
}
