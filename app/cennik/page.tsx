import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  HeartHandshake,
  HelpCircle,
  Leaf,
  Mail,
  ShieldCheck,
  Sprout,
  Star,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { MobileFirstStepCta } from '@/components/MobileFirstStepCta'
import { ReferencePageShell } from '@/components/ReferencePageShell'
import { Schema } from '@/components/schema'
import { getBreadcrumbJsonLd, getServiceJsonLd } from '@/lib/schema'
import { buildMarketingMetadata } from '@/lib/seo'
import { getPublicContactDetails } from '@/lib/site'
import type { PublicBookingServiceType } from '@/lib/funnel'
import { PUBLIC_OFFER_PRICE_LABELS } from '@/lib/public-offer-copy'
import { PRICE_PROMOTION_LABEL, WEEKLY_PRICE_VALIDITY_COPY } from '@/lib/pricing'
import {
  bookHref,
  getDirectBookingHref,
  getPricingOfferCatalog,
  pricingCards,
  pricingFaqItems,
} from './pricing-page-content'

export const metadata: Metadata = buildMarketingMetadata({
  title: 'Cennik konsultacji behawioralnych',
  path: '/cennik',
  description:
    `Zapytaj behawiorystę ${PUBLIC_OFFER_PRICE_LABELS.quick}, Zapytaj teraz ${PUBLIC_OFFER_PRICE_LABELS.urgent} i Pełna konsultacja ${PUBLIC_OFFER_PRICE_LABELS.premium}. W każdej usłudze analiza zachowania oparta na danych od opiekuna.`,
})

type PricingVisual = {
  title: string
  copy: string
  icon: LucideIcon
  featured?: boolean
}

const offerVisuals: Partial<Record<PublicBookingServiceType, PricingVisual>> = {
  'szybka-konsultacja-15-min': {
    title: 'Zapytaj behawiorystę',
    copy: 'Rozmowa telefoniczna do 15 minut. Szybko porządkujesz sytuację i dostajesz pierwszy kierunek działania oraz dwa pytania po rozmowie.',
    icon: Clock,
  },
  'kwadrans-na-juz': {
    title: 'Zapytaj teraz',
    copy: 'Ten sam zakres co Zapytaj behawiorystę, ale z priorytetową odpowiedzią i najbliższym realnym terminem telefonicznym.',
    icon: Clock,
    featured: true,
  },
  'konsultacja-30-min': {
    title: 'Starszy wariant rozmowy',
    copy: 'Wariant historyczny zachowany wyłącznie dla zgodności technicznej. Aktualny pierwszy krok to Zapytaj behawiorystę.',
    icon: Clock,
  },
  'konsultacja-behawioralna-online': {
    title: 'Pełna konsultacja',
    copy: 'Około 90 minut przez Jitsi dla spraw złożonych: analiza zachowania, prawdopodobna przyczyna problemu, plan działania i 14 dni komunikacji w pokoju klienta.',
    icon: Leaf,
  },
}

const benefits = [
  {
    title: 'Jasny pierwszy krok',
    copy: 'Szybko wiesz, co robić i od czego zacząć.',
    icon: Sprout,
  },
  {
    title: 'Analiza oparta na danych',
    copy: 'Układam fakty, nie domysły. Plan dostosowany do Ciebie i Twojego psa lub kota.',
    icon: BarChart3,
  },
  {
    title: 'Spokojne wsparcie',
    copy: 'Bez oceniania. Wspieram z empatią i szacunkiem do Waszej relacji.',
    icon: HeartHandshake,
  },
]

export default function PricingPage() {
  const contact = getPublicContactDetails()

  return (
    <ReferencePageShell className="reference-pricing-page pricing-2026-page" ctaHref={bookHref} showHeroLeaf>
      <Schema
        data={[
          getBreadcrumbJsonLd([
            { name: 'Strona główna', path: '/' },
            { name: 'Cennik', path: '/cennik' },
          ]),
          getServiceJsonLd({
            name: 'Cennik rozmów behawioralnych - psy i koty',
            description:
              'Oferta rozmów: Zapytaj behawiorystę, Zapytaj teraz i Pełna konsultacja online.',
            serviceUrl: '/cennik',
            offerCatalog: getPricingOfferCatalog(),
          }),
        ]}
      />

      <div className="pricing-2026-shell">
        <section className="pricing-2026-hero" aria-labelledby="pricing-2026-title">
          <div className="pricing-2026-hero-copy">
            <span className="pricing-2026-pill">Cennik</span>
            <h1 id="pricing-2026-title">Wybierz rozmowę dopasowaną do sytuacji</h1>
            <p>Bez presji, bez oceniania. Daj mi 15 minut, a powiem Ci, od czego zacząć.</p>
            <div className="pricing-2026-trust-row" aria-label="Najważniejsze informacje">
              <span>
                <ShieldCheck aria-hidden="true" />
                Empatycznie i konkretnie
              </span>
              <span>
                <Clock aria-hidden="true" />
                Telefonicznie lub przez Jitsi - wygodnie - konkretnie
              </span>
              <span>
                <Mail aria-hidden="true" />
                Potwierdzenie płatności na życzenie
              </span>
              <span>
                <CheckCircle2 aria-hidden="true" />
                Link do rozmowy po potwierdzeniu płatności
              </span>
            </div>
            <MobileFirstStepCta
              eyebrow="Najprostszy start"
              title={`Zapytaj behawiorystę / ${PUBLIC_OFFER_PRICE_LABELS.quick}`}
              copy="Jeśli chcesz szybko uporządkować sytuację, zacznij od rozmowy telefonicznej do 15 minut."
              meta="Dla psa i kota. Połączenie telefoniczne."
              primaryHref={getDirectBookingHref('szybka-konsultacja-15-min')}
              primaryLabel="Wybieram Zapytaj behawiorystę"
              secondaryHref="/#wybór"
              secondaryLabel="Pomóż mi wybrać"
            />
          </div>
          <div className="pricing-2026-hero-media" aria-hidden="true">
            <Image
              src="/branding/section-heroes/pricing-choice-v1.webp"
              alt="Pies i kot obok przygotowanego telefonu i notatnika do konsultacji"
              width={1536}
              height={1024}
              sizes="(max-width: 760px) 100vw, 343px"
              priority
            />
          </div>
        </section>

        <section className="pricing-2026-offers" id="formaty" aria-label="Formaty rozmów i ceny">
          {pricingCards.map((card) => {
            const visual = offerVisuals[card.service]

            if (!visual) {
              return null
            }

            const Icon = visual.icon

            return (
              <article
                key={card.service}
                className={`pricing-2026-offer${visual.featured ? ' is-featured' : ''}`}
              >
                {visual.featured ? (
                  <span className="pricing-2026-offer-label">
                    <Star size={13} fill="currentColor" aria-hidden="true" />
                    Najczęściej wybierane
                  </span>
                ) : null}
                <span className="pricing-2026-icon-wrap" aria-hidden="true">
                  <Icon />
                </span>
                <div className="pricing-2026-offer-copy">
                  <h2>{visual.title}</h2>
                  <p>{visual.copy}</p>
                </div>
                <div className="pricing-2026-offer-action">
                  <span className="pricing-2026-promo-label">{PRICE_PROMOTION_LABEL}</span>
                  <strong className="pricing-2026-price">{card.price}</strong>
                  <small className="pricing-2026-validity">{WEEKLY_PRICE_VALIDITY_COPY}</small>
                  <Link
                    href={getDirectBookingHref(card.service)}
                    prefetch={false}
                    className={`pricing-2026-btn ${
                      visual.featured ? 'pricing-2026-btn-primary' : 'pricing-2026-btn-secondary'
                    }`}
                    aria-label={`${card.cta}: ${card.price}`}
                  >
                    Wybieram
                  </Link>
                </div>
              </article>
            )
          })}
          <p className="pricing-2026-online-note">
            <CheckCircle2 aria-hidden="true" />
            Zapytaj behawiorystę i Zapytaj teraz odbywają się telefonicznie. Pełna konsultacja odbywa się przez Jitsi.
          </p>
        </section>

        <section className="pricing-2026-clinic-program" aria-labelledby="clinic-program-pricing-title">
          <div>
            <span className="pricing-2026-pill">Program dla klientów lecznic</span>
            <h2 id="clinic-program-pricing-title">Masz jednorazowy kod do Zapytaj behawiorystę?</h2>
            <p>Wpisz kod, a następnie wybierz gatunek, temat i termin. Sposób rozmowy wybierzesz później, po potwierdzeniu kodu.</p>
          </div>
          <Link href="/lecznica" prefetch={false} className="pricing-2026-btn pricing-2026-btn-secondary">
            Wpisz kod przekazany przez lecznicę
          </Link>
        </section>
        <section className="pricing-2026-benefits" aria-label="Co dostajesz w rozmowie">
          {benefits.map((benefit) => {
            const Icon = benefit.icon

            return (
              <article key={benefit.title} className="pricing-2026-benefit">
                <span className="pricing-2026-small-icon" aria-hidden="true">
                  <Icon />
                </span>
                <h2>{benefit.title}</h2>
                <p>{benefit.copy}</p>
              </article>
            )
          })}
        </section>

        <section className="pricing-2026-diagnosis">
          <div>
            <h2>W każdej usłudze dostajesz analizę zachowania opartą na danych</h2>
            <p>
              To nie jest przypadkowa porada z internetu. Analizuję opis sytuacji, odpowiedzi z
              formularza, historię zachowania i kontekst domu lub spacerów. Jeśli masz nagrania,
              pomagają szybciej ustalić, co naprawdę może napędzać zachowanie i od czego zacząć.
            </p>
            <Link href={bookHref} prefetch={false} className="pricing-2026-btn pricing-2026-btn-primary">
              Pomóż mi dobrać pierwszy krok
            </Link>
          </div>
        </section>

        <section className="pricing-2026-help site-help-cta">
          <div className="site-help-cta-copy">
            <h2>Nie wiesz, czego potrzebujesz?</h2>
            <p>Zacznij od krótkiej rozmowy - wspólnie wybierzemy najlepszą opcję.</p>
            <div className="pricing-2026-help-actions site-help-cta-actions">
              <Link href={bookHref} prefetch={false} className="pricing-2026-btn pricing-2026-btn-primary">
                Pomóż mi dobrać usługę
              </Link>
              <Link href="/blog" prefetch={false} className="pricing-2026-btn pricing-2026-btn-secondary">
                Zobacz przykładowe sytuacje
              </Link>
            </div>
          </div>
          <div className="site-help-cta-image pricing-2026-help-illustration" aria-hidden="true">
            <Image src="/faq/faq-help-illustration-clean.png" alt="" width={355} height={208} loading="lazy" sizes="(max-width: 760px) 58vw, 210px" />
          </div>
        </section>

        <section className="pricing-2026-faq-contact">
          <div className="pricing-2026-faq">
            <h2>Najczęstsze pytania</h2>
            <div className="pricing-2026-faq-list">
              {pricingFaqItems.map((item, index) => (
                <details key={item.question} open={index === 0}>
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </div>

          <aside className="pricing-2026-question-card">
            <h2>Masz pytania?</h2>
            <p>Sprawdź odpowiedzi na najczęstsze pytania o konsultacje i proces współpracy.</p>
            <Link href="/faq" prefetch={false} className="pricing-2026-btn pricing-2026-btn-secondary">
              Zobacz FAQ
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </aside>
        </section>

        <div className="pricing-2026-contact-strip" aria-label="Kontakt i bezpieczeństwo">
          {contact.email ? (
            <a href={`mailto:${contact.email}`}>
              <Mail aria-hidden="true" />
              {contact.email}
            </a>
          ) : null}
          <span>
            <HelpCircle aria-hidden="true" />
            Odpowiedź 1-2 dni robocze
          </span>
          <span>
            <ShieldCheck aria-hidden="true" />
            Bezpiecznie i poufnie
          </span>
        </div>
      </div>
    </ReferencePageShell>
  )
}

