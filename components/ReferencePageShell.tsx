import Link from 'next/link'
import Image from 'next/image'
import type { ReactNode } from 'react'
import { CalendarCheck, Globe2, Mail, ShieldCheck } from 'lucide-react'
import { NotatnikFooter, NotatnikTopbar, PUBLIC_SITE_NAV_ITEMS } from '@/components/NotatnikA'
import { REGULSKI_WEB_LOGO } from '@/lib/regulski-web-assets'
import { CAPBT_PROFILE_URL, INSTAGRAM_PROFILE_URL, getPublicContactDetails } from '@/lib/site'

type ReferencePageShellProps = {
  className?: string
  ctaHref: string
  ctaLabel?: string
  showHeroLeaf?: boolean
  showFooterReviews?: boolean
  children: ReactNode
}

type ReferenceFinalCtaProps = {
  title: string
  copy: string
  primaryHref: string
  primaryLabel: string
  secondaryHref: string
  secondaryLabel: string
}

export function ReferencePageShell({
  className,
  ctaHref,
  ctaLabel,
  showHeroLeaf = false,
  showFooterReviews = false,
  children,
}: ReferencePageShellProps) {
  const isCaseMapCta = ctaHref === '/mapa-sprawy' || ctaHref.startsWith('/mapa-sprawy?')
  const resolvedCtaLabel = ctaLabel ?? (isCaseMapCta ? 'Mapa zachowania' : 'Umów konsultację')

  return (
    <main className={className ? `notatnik-page reference-page ${className}` : 'notatnik-page reference-page'}>
      <div className="notatnik-shell reference-shell">
        <NotatnikTopbar
          tag="Regulski"
          navItems={PUBLIC_SITE_NAV_ITEMS}
          ctaHref={ctaHref}
          ctaLabel={resolvedCtaLabel}
          showUtilityLinks={false}
        />
        {showHeroLeaf ? <ReferenceHeroLeaf /> : null}
        {children}
        <NotatnikFooter showReviews={showFooterReviews} />
      </div>
    </main>
  )
}

export function ReferenceHeroLeaf() {
  return (
    <span className="reference-hero-leaf-anchor" aria-hidden="true">
      <span className="reference-hero-leaf" />
    </span>
  )
}

export function ReferenceFinalCta({
  title,
  copy,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: ReferenceFinalCtaProps) {
  return (
    <section className="reference-final-cta">
      <div className="reference-final-icon" aria-hidden="true">
        <CalendarCheck size={30} strokeWidth={1.9} />
      </div>
      <div className="reference-final-copy">
        <h2>{title}</h2>
        <p>{copy}</p>
      </div>
      <div className="reference-final-actions">
        <Link href={primaryHref} prefetch={false} className="reference-btn reference-btn-primary">
          {primaryLabel}
        </Link>
        <Link href={secondaryHref} prefetch={false} className="reference-btn reference-btn-secondary">
          {secondaryLabel}
        </Link>
      </div>
    </section>
  )
}

export function ReferenceContactCard({ title = 'Kontakt' }: { title?: string }) {
  const contact = getPublicContactDetails()

  return (
    <aside className="reference-side-card reference-contact-card">
      <h2>{title}</h2>
      <div className="reference-info-list">
        {contact.email ? (
          <a href={`mailto:${contact.email}`} className="reference-info-row">
            <Mail size={22} strokeWidth={1.7} aria-hidden="true" />
            <span>
              <strong>E-mail</strong>
              <small>{contact.email}</small>
            </span>
          </a>
        ) : null}
        <div className="reference-info-row">
          <CalendarCheck size={22} strokeWidth={1.7} aria-hidden="true" />
          <span>
            <strong>Odpowiedź</strong>
            <small>1-2 dni robocze</small>
          </span>
        </div>
        <a href={INSTAGRAM_PROFILE_URL} target="_blank" rel="noopener noreferrer" className="reference-info-row">
          <Globe2 size={22} strokeWidth={1.7} aria-hidden="true" />
          <span>
            <strong>Instagram</strong>
            <small>@regulskibehawiorysta</small>
          </span>
        </a>
        <a href={CAPBT_PROFILE_URL} target="_blank" rel="noopener noreferrer" className="reference-info-row">
          <Globe2 size={22} strokeWidth={1.7} aria-hidden="true" />
          <span>
            <strong>Profil COAPE</strong>
            <small>behawioryscicoape.pl/Regulski</small>
          </span>
        </a>
      </div>
    </aside>
  )
}

export function ReferenceFooter() {
  const contact = getPublicContactDetails()

  return (
    <footer className="reference-footer" aria-label="Stopka">
      <Link href="/" prefetch={false} className="reference-footer-brand" aria-label="Strona główna Regulski">
        <span className="reference-footer-logo" aria-hidden="true">
          <Image src={REGULSKI_WEB_LOGO} alt="" width={512} height={512} />
        </span>
        <span>
          <strong>Regulski</strong>
          <small>Terapia behawioralna</small>
        </span>
      </Link>

      <nav className="reference-footer-nav" aria-label="Nawigacja w stopce">
        <Link href="/mapa-sprawy" prefetch={false}>Mapa zachowania</Link>
        <Link href="/cennik" prefetch={false}>Cennik</Link>
        <Link href="/o-mnie" prefetch={false}>O mnie</Link>
        <Link href="/blog" prefetch={false}>Blog</Link>
        <Link href="/kontakt" prefetch={false}>Kontakt</Link>
        <Link href="/polityka-prywatnosci" prefetch={false}>Polityka prywatności</Link>
        <Link href="/regulamin" prefetch={false}>Regulamin</Link>
      </nav>

      <div className="reference-footer-social" aria-label="Linki publiczne">
        <a href={CAPBT_PROFILE_URL} target="_blank" rel="noopener noreferrer" aria-label="Profil COAPE">
          <ShieldCheck size={18} strokeWidth={1.8} />
        </a>
        <a href={INSTAGRAM_PROFILE_URL} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
          <Globe2 size={18} strokeWidth={1.8} />
        </a>
      </div>

      <div className="reference-footer-contact">
        {contact.email ? (
          <a href={`mailto:${contact.email}`}>
            <Mail size={16} strokeWidth={1.7} aria-hidden="true" />
            {contact.email}
          </a>
        ) : null}
        <span>
          <Globe2 size={16} strokeWidth={1.7} aria-hidden="true" />
          Online w całej Polsce
        </span>
      </div>
    </footer>
  )
}
