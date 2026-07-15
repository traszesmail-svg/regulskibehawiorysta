import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import {
  CalendarDays,
  ChevronRight,
  Clock,
  CreditCard,
  Globe2,
  Headphones,
  HelpCircle,
  LockKeyhole,
  Mail,
  MessageCircle,
  PawPrint,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  UserRound,
  Video,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { NotatnikFooter, NotatnikTopbar, PUBLIC_SITE_NAV_ITEMS } from '@/components/NotatnikA'
import { ThemeToggle } from '@/components/ThemeToggle'
import { CAPBT_PROFILE_URL, getPublicContactDetails } from '@/lib/site'
import { REGULSKI_WEB_LOGO } from '@/lib/regulski-web-assets'

export type PaymentReferenceSummaryIcon =
  | 'calendar'
  | 'form'
  | 'problem'
  | 'duration'
  | 'receipt'
  | 'order'

export type PaymentReferenceSummaryRow = {
  icon: PaymentReferenceSummaryIcon
  label: string
  value: string
}

type PaymentReferenceLayoutProps = {
  eyebrow?: string
  title: string
  lead: string
  heroImage?: 'dog' | 'cat'
  variant?: 'default' | 'compact'
  summaryTitle?: string
  summaryRows: PaymentReferenceSummaryRow[]
  lineItemLabel: string
  lineItemAmount: string
  totalLabel?: string
  children: ReactNode
}

const navItems = [
  { href: '/o-mnie', label: 'O mnie' },
  { href: '/cennik', label: 'Cennik' },
  { href: '/blog', label: 'Blog' },
  { href: '/kontakt', label: 'Kontakt' },
] as const

const bookingFlowSteps = ['Termin', 'Godzina', 'Dane', 'Płatność'] as const

const summaryIconMap: Record<PaymentReferenceSummaryIcon, LucideIcon> = {
  calendar: CalendarDays,
  form: Video,
  problem: HelpCircle,
  duration: Clock,
  receipt: ReceiptText,
  order: CreditCard,
}

function PaymentReferenceHeader() {
  return (
    <header className="payment-ref-header">
      <Link href="/" prefetch={false} className="payment-ref-brand" aria-label="Regulski Behawiorysta - strona główna">
        <span className="payment-ref-brand-logo" aria-hidden="true">
          <Image src={REGULSKI_WEB_LOGO} alt="" width={512} height={512} priority />
        </span>
        <span className="payment-ref-brand-copy">
          <strong>Regulski Behawiorysta</strong>
          <span>Krzysztof Regulski</span>
        </span>
      </Link>
      <nav className="payment-ref-nav" aria-label="Nawigacja">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} prefetch={false}>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="payment-ref-actions">
        <Link href="/mapa-sprawy" prefetch={false} className="payment-ref-primary-link">
          <Zap aria-hidden="true" />
          Mapa zachowania
        </Link>
        <Link href="/kontakt" prefetch={false} className="payment-ref-round-link" aria-label="Kontakt">
          <UserRound aria-hidden="true" />
        </Link>
        <ThemeToggle />
      </div>
    </header>
  )
}

function PaymentReferenceHero({
  eyebrow,
  title,
  lead,
  heroImage = 'dog',
}: {
  eyebrow?: string
  title: string
  lead: string
  heroImage?: 'dog' | 'cat'
}) {
  const imageSrc = heroImage === 'cat' ? '/images/homepage/home-bg-cat-1to1.webp' : '/images/homepage/home-bg-dog-1to1.webp'
  const imageAlt =
    heroImage === 'cat'
      ? 'Kot w spokojnym leśnym kadrze jako ilustracja konsultacji behawioralnej'
      : 'Pies w leśnym kadrze jako ilustracja konsultacji behawioralnej'

  return (
    <section className="payment-ref-hero">
      <div className="payment-ref-hero-copy">
        {eyebrow ? (
          <div className="payment-ref-pill">
            <LockKeyhole aria-hidden="true" />
            {eyebrow}
          </div>
        ) : null}
        <h1>{title}</h1>
        <p>{lead}</p>
      </div>
      <div className="payment-ref-hero-media" aria-hidden="true">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          priority
          sizes="(max-width: 900px) 86vw, 420px"
          className="payment-ref-hero-image"
        />
      </div>
    </section>
  )
}

function PaymentReferenceSummary({
  title = 'Podsumowanie rezerwacji',
  rows,
  lineItemLabel,
  lineItemAmount,
  totalLabel,
}: {
  title?: string
  rows: PaymentReferenceSummaryRow[]
  lineItemLabel: string
  lineItemAmount: string
  totalLabel?: string
}) {
  return (
    <aside className="payment-ref-summary">
      <h2>{title}</h2>
      <div className="payment-ref-summary-list">
        {rows.map((row) => {
          const Icon = summaryIconMap[row.icon]

          return (
            <div key={`${row.label}-${row.value}`} className="payment-ref-summary-row">
              <Icon className="payment-ref-summary-icon" aria-hidden={true} />
              <span>
                <strong>{row.label}</strong>
                <em>{row.value}</em>
              </span>
            </div>
          )
        })}
      </div>
      <div className="payment-ref-total">
        <div className="payment-ref-total-line">
          <span>{lineItemLabel}</span>
          <strong>{lineItemAmount}</strong>
        </div>
        <div className="payment-ref-total-line payment-ref-total-final">
          <span>{totalLabel ?? 'Razem do zapłaty'}</span>
          <strong>{lineItemAmount}</strong>
        </div>
      </div>
      <div className="payment-ref-safety">
        <ShieldCheck aria-hidden="true" />
        <span>
          <strong>Bezpiecznie i przez e-mail</strong>
          <em>Termin jest pewny po potwierdzeniu płatności. Po potwierdzeniu dostajesz dalszy krok i link do rozmowy.</em>
        </span>
      </div>
    </aside>
  )
}

function PaymentReferenceTrustStrip() {
  const items = [
    {
      icon: ShieldCheck,
      title: 'Bezpieczeństwo',
      copy: 'Dane i płatność są prowadzone przez chronione ścieżki.',
    },
    {
      icon: RefreshCw,
      title: 'Potwierdzenie od razu',
      copy: 'Po płatności dostajesz dalszy krok i status rezerwacji.',
    },
    {
      icon: CalendarDays,
      title: 'Termin zarezerwowany',
      copy: 'Wybrany slot zostaje przypisany do Twojej konsultacji.',
    },
    {
      icon: MessageCircle,
      title: 'Wsparcie',
      copy: 'Kontakt prowadzimy przez e-mail i formularz.',
    },
    {
      icon: PawPrint,
      title: 'Zmiana lub odwołanie',
      copy: 'Zasady zmiany terminu są opisane w regulaminie usługi.',
    },
  ] as const

  return (
    <section className="payment-ref-trust" aria-label="Najważniejsze informacje">
      {items.map((item) => {
        const Icon = item.icon

        return (
          <article key={item.title}>
            <span className="payment-ref-trust-icon">
              <Icon aria-hidden="true" />
            </span>
            <strong>{item.title}</strong>
            <p>{item.copy}</p>
          </article>
        )
      })}
    </section>
  )
}

function PaymentReferenceQuote() {
  return (
    <section className="payment-ref-quote">
      <div className="payment-ref-quote-copy">
        <span aria-hidden="true">“</span>
        <p>
          Po rozmowie wiedziałam, co zrobić najpierw, a co zostawić na później. Zamiast chaosu pojawił się konkretny plan.
        </p>
        <strong>Opiekunka po konsultacji</strong>
      </div>
      <div className="payment-ref-quote-media" aria-hidden="true">
        <Image
          src="/images/homepage/home-bg-dog-1to1.webp"
          alt=""
          fill
          sizes="(max-width: 820px) 0px, 320px"
          className="payment-ref-quote-image"
        />
      </div>
    </section>
  )
}

function PaymentReferenceContact() {
  const contact = getPublicContactDetails()

  return (
    <section className="payment-ref-contact" aria-label="Kontakt">
      <span className="payment-ref-contact-icon">
        <Headphones aria-hidden="true" />
      </span>
      <div>
        <h2>Masz pytania?</h2>
        <p>Napisz do mnie - pomogę dobrać właściwy następny krok.</p>
      </div>
      <a href={`mailto:${contact.email}`} className="payment-ref-contact-item">
        <Mail aria-hidden="true" />
        {contact.email}
      </a>
      <span className="payment-ref-contact-item">
        <Globe2 aria-hidden="true" />
        Online w całej Polsce
      </span>
    </section>
  )
}

function PaymentReferenceFooter() {
  const contact = getPublicContactDetails()

  return (
    <footer className="payment-ref-footer">
      <Link href="/" prefetch={false} className="payment-ref-brand payment-ref-footer-brand" aria-label="Regulski Behawiorysta">
        <span className="payment-ref-brand-logo" aria-hidden="true">
          <Image src={REGULSKI_WEB_LOGO} alt="" width={512} height={512} />
        </span>
        <span className="payment-ref-brand-copy">
          <strong>Regulski Behawiorysta</strong>
          <span>Krzysztof Regulski - behawiorysta zwierzęcy</span>
        </span>
      </Link>
      <nav className="payment-ref-footer-links" aria-label="Linki stopki">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} prefetch={false}>
            {item.label}
          </Link>
        ))}
        <Link href="/polityka-prywatnosci" prefetch={false}>
          Polityka prywatności
        </Link>
        <Link href="/regulamin" prefetch={false}>
          Regulamin
        </Link>
        <a href={CAPBT_PROFILE_URL} target="_blank" rel="noopener noreferrer">
          Profil COAPE/CAPBT
        </a>
      </nav>
      <div className="payment-ref-footer-contact">
        <a href={`mailto:${contact.email}`}>
          <Mail aria-hidden="true" />
          {contact.email}
        </a>
        <span>
          <Globe2 aria-hidden="true" />
          Online w całej Polsce
        </span>
      </div>
    </footer>
  )
}

export function PaymentReferenceLayout({
  eyebrow = 'Bezpieczna płatność',
  title,
  lead,
  heroImage = 'dog',
  variant = 'default',
  summaryTitle,
  summaryRows,
  lineItemLabel,
  lineItemAmount,
  totalLabel,
  children,
}: PaymentReferenceLayoutProps) {
  const isCompact = variant === 'compact'

  return (
    <main className={isCompact ? 'payment-ref-page payment-ref-page--compact' : 'payment-ref-page'}>
      <div className="payment-ref-shell">
        <NotatnikTopbar tag="Regulski" navItems={PUBLIC_SITE_NAV_ITEMS} showUtilityLinks={false} />
        {isCompact ? (
          <section className="payment-ref-compact-intro">
            <div className="payment-ref-booking-stage" aria-label="Etap rezerwacji">
              <div className="termin-breadcrumb">
                <CalendarDays size={15} strokeWidth={1.85} aria-hidden="true" />
                <span>Wybór terminu</span>
              </div>
              <div className="termin-step-track booking-flow-step-track" aria-label="Etapy rezerwacji">
                {bookingFlowSteps.map((step, index) => (
                  <span key={step} className={index === 3 ? 'is-active' : ''}>
                    <strong>{index + 1}</strong>
                    {step}
                  </span>
                ))}
              </div>
            </div>
            {eyebrow ? (
              <div className="payment-ref-pill">
                <LockKeyhole aria-hidden="true" />
                {eyebrow}
              </div>
            ) : null}
            <h1>{title}</h1>
            <p>{lead}</p>
          </section>
        ) : (
          <PaymentReferenceHero eyebrow={eyebrow} title={title} lead={lead} heroImage={heroImage} />
        )}
        <section className="payment-ref-grid" aria-label="Płatność i podsumowanie">
          <div className="payment-ref-card">{children}</div>
          <PaymentReferenceSummary
            title={summaryTitle}
            rows={summaryRows}
            lineItemLabel={lineItemLabel}
            lineItemAmount={lineItemAmount}
            totalLabel={totalLabel}
          />
        </section>
        {isCompact ? null : (
          <>
            <PaymentReferenceTrustStrip />
            <PaymentReferenceQuote />
            <PaymentReferenceContact />
          </>
        )}
        <NotatnikFooter showReviews={false} />
      </div>
    </main>
  )
}

export function PaymentReferenceCardTitle({
  title,
  children,
}: {
  title: string
  children?: ReactNode
}) {
  return (
    <div className="payment-ref-card-title">
      <h2>{title}</h2>
      {children ? <p>{children}</p> : null}
    </div>
  )
}

export function PaymentReferenceInlineLink({
  href,
  children,
}: {
  href: string
  children: ReactNode
}) {
  return (
    <Link href={href} prefetch={false} className="payment-ref-inline-link">
      {children}
      <ChevronRight aria-hidden="true" />
    </Link>
  )
}
