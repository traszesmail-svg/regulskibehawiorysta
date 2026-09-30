import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  BedDouble,
  CalendarRange,
  House,
  MessageCircleMore,
  Route,
  SlidersHorizontal,
} from 'lucide-react'
import { Schema } from '@/components/schema'
import { NotatnikFinalCta, NotatnikPageShell, PUBLIC_SITE_NAV_ITEMS } from '@/components/NotatnikA'
import { getBreadcrumbJsonLd, getFaqPageJsonLd, getServiceJsonLd } from '@/lib/schema'
import { buildMarketingMetadata } from '@/lib/seo'
import { PUBLIC_THERAPY_OFFER, PUBLIC_ZAPYTAJ_OFFER, formatPublicOfferPrice } from '@/lib/public-offer'
import { COAPE_POLSKA_LOGO, SPECIALIST_NAME, SPECIALIST_PUBLIC_STATUS } from '@/lib/site'

const THERAPY_FAQ_ITEMS = [
  {
    question: 'Od czego zaczyna się terapia?',
    answer:
      'Od pełnej konsultacji behawioralnej. Na jej podstawie ustalamy, czy długoterminowa terapia jest właściwym krokiem, jaki powinna mieć zakres oraz jak zorganizować wymaganą wizytę domową.',
  },
  {
    question: 'Jak długo trwa terapia i jak często się kontaktujemy?',
    answer:
      'Proces trwa minimum rok. Częstotliwość rozmów, spotkań i kontaktu przez WhatsApp dobieramy indywidualnie do pacjenta, postępów oraz możliwości opiekuna.',
  },
  {
    question: 'Czy pobyt w hotelu jest częścią każdej terapii?',
    answer:
      'Nie. Hotel socjalizacyjno-terapeutyczny może zostać włączony do procesu, jeśli odpowiada potrzebom zwierzęcia i zostanie ono zakwalifikowane do tej formy pracy. Zakres oraz warunki ustalamy indywidualnie.',
  },
] as const

export const metadata: Metadata = buildMarketingMetadata({
  title: 'Terapia behawioralna',
  path: '/terapia',
  description:
    'Długoterminowa terapia behawioralna psów i kotów. Minimum rok, wizyta domowa na terenie całej Polski i indywidualnie ustalany zakres opieki.',
})

export default function TherapyPage() {
  return (
    <NotatnikPageShell
      tag="Indywidualna ścieżka"
      navItems={PUBLIC_SITE_NAV_ITEMS}
      ctaHref="/zapytaj#formularz"
      ctaLabel={`Zapytaj · ${formatPublicOfferPrice(PUBLIC_ZAPYTAJ_OFFER.pricePln)}`}
      footerPrimaryHref="/zapytaj#formularz"
      footerPrimaryLabel={`Zapytaj behawiorystę – ${formatPublicOfferPrice(PUBLIC_ZAPYTAJ_OFFER.pricePln)}`}
      showSideVisuals={false}
      pageClassName="canonical-service-page therapy-page therapy-premium-page"
      shellClassName="canonical-service-shell"
      footerVariant="home"
      showFooterReviews={false}
      topbarProfile="flow"
    >
      <Schema
        data={[
          getBreadcrumbJsonLd([
            { name: 'Strona główna', path: '/' },
            { name: 'Terapia behawioralna', path: '/terapia' },
          ]),
          getServiceJsonLd({
            name: PUBLIC_THERAPY_OFFER.name,
            description: PUBLIC_THERAPY_OFFER.summary,
            serviceUrl: '/terapia',
          }),
          getFaqPageJsonLd([...THERAPY_FAQ_ITEMS]),
        ]}
      />

      <section className="canonical-service-hero therapy-premium-hero" aria-labelledby="therapy-title">
        <div className="canonical-service-hero-copy">
          <span className="zapytaj-kicker">DŁUGOTERMINOWA OPIEKA BEHAWIORALNA</span>
          <h1 id="therapy-title">Terapia wspierająca zmianę w codziennym życiu</h1>
          <p className="canonical-service-lead">
            Minimum roczny proces oparty na diagnozie, obserwacji i pracy w codziennym środowisku zwierzęcia.
            Nie korzystamy z gotowego schematu — kolejne etapy dopasowujemy do pacjenta i życia jego opiekuna.
          </p>

          <div className="offer-facts therapy-premium-facts" aria-label="Najważniejsze informacje o terapii">
            <div className="offer-fact therapy-premium-fact">
              <span className="offer-fact__icon"><CalendarRange aria-hidden="true" /></span>
              <span><strong>Minimum rok</strong><small>praca, obserwacja i korekty planu</small></span>
            </div>
            <div className="offer-fact therapy-premium-fact">
              <span className="offer-fact__icon"><House aria-hidden="true" /></span>
              <span><strong>Wizyta domowa</strong><small>realizowana na terenie całej Polski</small></span>
            </div>
            <div className="offer-fact therapy-premium-fact">
              <span className="offer-fact__icon"><SlidersHorizontal aria-hidden="true" /></span>
              <span><strong>Indywidualny zakres</strong><small>według potrzeb konkretnego pacjenta</small></span>
            </div>
          </div>

          <div className="canonical-service-hero-actions">
            <Link href="/konsultacja" className="notatnik-btn">
              <span>Poznaj pełną konsultację</span>
              <ArrowRight size={17} strokeWidth={1.9} aria-hidden="true" />
            </Link>
            <a href="#zakres-opieki" className="zapytaj-muted-link">Zobacz zakres opieki</a>
          </div>
        </div>

        <div className="therapy-process-panel" aria-labelledby="therapy-process-title">
          <div className="therapy-process-panel__intro">
            <span>METODYCZNY PROCES</span>
            <h2 id="therapy-process-title">Od rozpoznania przyczyn do zmiany, która działa w codziennym życiu</h2>
          </div>
          <ol className="therapy-process-track">
            <li>
              <span className="therapy-process-icon" aria-hidden="true"><Route size={24} strokeWidth={1.7} /></span>
              <span className="therapy-process-number">01</span>
              <strong>Pełna konsultacja</strong>
              <p>Diagnoza i prawdopodobna etiologia zachowania.</p>
            </li>
            <li>
              <span className="therapy-process-icon" aria-hidden="true"><SlidersHorizontal size={24} strokeWidth={1.7} /></span>
              <span className="therapy-process-number">02</span>
              <strong>Plan terapii</strong>
              <p>Konkretne działania dopasowane do pacjenta i opiekuna.</p>
            </li>
            <li>
              <span className="therapy-process-icon" aria-hidden="true"><House size={24} strokeWidth={1.7} /></span>
              <span className="therapy-process-number">03</span>
              <strong>Wizyta domowa</strong>
              <p>Obserwacja zachowania w naturalnym środowisku.</p>
            </li>
            <li>
              <span className="therapy-process-icon" aria-hidden="true"><MessageCircleMore size={24} strokeWidth={1.7} /></span>
              <span className="therapy-process-number">04</span>
              <strong>Praca w czasie</strong>
              <p>Kontakt, ocena postępów i rozwijanie kolejnych etapów.</p>
            </li>
          </ol>
        </div>

        <div className="therapy-specialist-bar" aria-label="Osoba prowadząca terapię i jej kwalifikacje">
          <div className="therapy-specialist-bar__identity">
            <span>Terapię prowadzi</span>
            <strong>{SPECIALIST_NAME}</strong>
            <p>{SPECIALIST_PUBLIC_STATUS} · technik weterynarii</p>
          </div>
          <div className="therapy-specialist-bar__logo">
            <Image
              src={COAPE_POLSKA_LOGO.src}
              alt={COAPE_POLSKA_LOGO.alt}
              width={COAPE_POLSKA_LOGO.width}
              height={COAPE_POLSKA_LOGO.height}
            />
          </div>
          <Link href="/opinie" className="therapy-opinions-link">
            Zobacz opinie opiekunów <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section className="canonical-service-explanation therapy-care-section" id="zakres-opieki" aria-labelledby="therapy-care-title">
        <div className="therapy-care-intro">
          <div className="canonical-service-heading">
            <span className="zapytaj-kicker">OPIEKA DOPASOWANA DO PACJENTA</span>
            <h2 id="therapy-care-title">Zakres terapii wynika z potrzeb zwierzęcia</h2>
            <p>Łączymy te formy pracy, które w danej sytuacji mają uzasadnienie. Ich częstotliwość oraz warunki ustalamy indywidualnie.</p>
          </div>
          <div className="therapy-care-commitment">
            <CalendarRange size={28} strokeWidth={1.6} aria-hidden="true" />
            <strong>12+ miesięcy</strong>
            <span>ciągłości, obserwacji i korekt planu</span>
          </div>
        </div>

        <div className="therapy-care-grid" role="list">
          <article className="therapy-care-item" role="listitem">
            <span className="therapy-care-icon" aria-hidden="true"><House size={25} strokeWidth={1.7} /></span>
            <div>
              <h3>Wizyta w domu</h3>
              <p>Jest wymaganą częścią procesu. Pozwala zobaczyć zwierzę w codziennym środowisku i może odbyć się na terenie całej Polski.</p>
            </div>
          </article>
          <article className="therapy-care-item" role="listitem">
            <span className="therapy-care-icon" aria-hidden="true"><MessageCircleMore size={25} strokeWidth={1.7} /></span>
            <div>
              <h3>Kontakt w trakcie terapii</h3>
              <p>WhatsApp, rozmowy telefoniczne i spotkania odbywają się według zasad i częstotliwości ustalonych dla danego procesu.</p>
            </div>
          </article>
          <article className="therapy-care-item" role="listitem">
            <span className="therapy-care-icon" aria-hidden="true"><Route size={25} strokeWidth={1.7} /></span>
            <div>
              <h3>Plan rozwijany w czasie</h3>
              <p>Oceniamy postępy i dostosowujemy kolejne etapy, aby rozwiązania pasowały do pacjenta oraz życia jego opiekuna.</p>
            </div>
          </article>
          <article className="therapy-care-item" role="listitem">
            <span className="therapy-care-icon" aria-hidden="true"><BedDouble size={25} strokeWidth={1.7} /></span>
            <div>
              <h3>Hotel socjalizacyjno-terapeutyczny</h3>
              <p>Może zostać włączony do procesu zależnie od potrzeb zwierzęcia i kwalifikacji do tej formy pracy.</p>
            </div>
          </article>
        </div>
      </section>

      <section className="canonical-service-explanation therapy-faq-section" aria-labelledby="therapy-faq-title">
        <div className="canonical-service-heading">
          <span className="zapytaj-kicker">NAJCZĘSTSZE PYTANIA</span>
          <h2 id="therapy-faq-title">Przed rozpoczęciem współpracy</h2>
        </div>
        <div className="zapytaj-faq-list therapy-faq-list">
          {THERAPY_FAQ_ITEMS.map((item) => (
            <details key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <NotatnikFinalCta
        title="Ustalmy, jaki zakres opieki będzie potrzebny."
        copy="Po rozmowie i analizie sytuacji dobieramy dalszy plan, wizytę domową oraz zakres współpracy."
        primaryHref="/zapytaj#formularz"
        primaryLabel={`Zapytaj behawiorystę · ${formatPublicOfferPrice(PUBLIC_ZAPYTAJ_OFFER.pricePln)}`}
        secondaryHref="/konsultacja"
        secondaryLabel="Poznaj pełną konsultację"
      />
    </NotatnikPageShell>
  )
}
