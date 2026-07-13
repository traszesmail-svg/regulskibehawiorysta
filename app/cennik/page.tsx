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
    'Kwadrans 69 zł, Kwadrans na już 99 zł, Dwa kwadranse 169 zł i Pełna konsultacja 470 zł. W każdej usłudze analiza zachowania oparta na danych od opiekuna.',
})

type PricingVisual = {
  title: string
  copy: string
  icon: LucideIcon
  featured?: boolean
}

const offerVisuals: Partial<Record<PublicBookingServiceType, PricingVisual>> = {
  'szybka-konsultacja-15-min': {
    title: 'Kwadrans',
    copy: '15 min audio bez kamery na jedno główne pytanie. Szybko porządkujesz sytuację i dostajesz pierwszy kierunek działania.',
    icon: Clock,
  },
  'kwadrans-na-juz': {
    title: 'Kwadrans na już',
    copy: 'Ten sam zakres co Kwadrans, ale z priorytetową odpowiedzią i najbliższym realnym terminem. Dla spraw pilnych, które nie wymagają dłuższej analizy.',
    icon: Clock,
    featured: true,
  },
  'konsultacja-30-min': {
    title: 'Dwa kwadranse',
    copy: '30 min online, gdy temat ma kilka wątków. Więcej czasu na kontekst, spokojniejsze zalecenia i decyzję, czy potrzebna jest pełna konsultacja.',
    icon: Clock,
  },
  'konsultacja-behawioralna-online': {
    title: 'Pełna konsultacja',
    copy: 'Około 2h online dla spraw złożonych: analiza zachowania, prawdopodobna przyczyna problemu, plan działania i 14 dni komunikacji w pokoju klienta.',
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
              'Formaty rozmowy: Kwadrans, Kwadrans na już, Dwa kwadranse i Pełna konsultacja online.',
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
                Online - wygodnie - skutecznie
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
              title="Kwadrans / 69 zł"
              copy="Jeśli chcesz szybko uporządkować jedno pytanie, zacznij od 15 minut audio bez kamery."
              meta="Dla psa i kota. Online."
              primaryHref={getDirectBookingHref('szybka-konsultacja-15-min')}
              primaryLabel="Wybieram Kwadrans"
              secondaryHref="/quiz"
              secondaryLabel="Nie wiem, quiz"
            />
          </div>
          <div className="pricing-2026-hero-media" aria-hidden="true">
            <Image
              src="/pricing/pricing-hero-photo-card.png"
              alt=""
              width={343}
              height={340}
              sizes="(max-width: 760px) 100vw, 343px"
              priority
            />
          </div>
        </section>

        <section className="pricing-2026-offers" aria-label="Formaty rozmów i ceny">
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
                  <strong className="pricing-2026-price">{card.price}</strong>
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
            Wszystkie rozmowy odbywają się online.
          </p>
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

