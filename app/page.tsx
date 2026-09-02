import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { EditorialIndexTopbar } from '@/components/EditorialIndexTopbar'
import { FaqAccordion } from '@/components/FaqAccordion'
import { HomepageZapytajHero } from '@/components/HomepageZapytajHero'
import { NotatnikFooter } from '@/components/NotatnikA'
import { Schema } from '@/components/schema'
import { homepageProcessSteps } from '@/lib/homepage-data'
import { getBreadcrumbJsonLd, getFaqPageJsonLd, getServiceJsonLd } from '@/lib/schema'
import { buildHomeMetadata } from '@/lib/seo'
import { COAPE_POLSKA_LOGO, HOME_HERO_PHOTO } from '@/lib/site'
import {
  PUBLIC_FULL_CONSULTATION_OFFER,
  PUBLIC_THERAPY_OFFER,
  formatPublicOfferPrice,
} from '@/lib/public-offer'

export async function generateMetadata(): Promise<Metadata> {
  return buildHomeMetadata()
}

const routerFaqItems = [
  {
    question: 'Czy muszę znać nazwę problemu?',
    answer: 'Nie. Wystarczy własnymi słowami opisać, co robi pies albo kot, kiedy to się dzieje i co już było próbowane.',
  },
  {
    question: 'Co dostanę po rozmowie?',
    answer: 'Porządkujemy sytuację, wskazuję pierwszy praktyczny krok i mówię, co robić dalej. Jeśli temat wymaga szerszego procesu, wyjaśnię to wprost.',
  },
  {
    question: 'Czym różni się Zapytaj behawiorystę od pełnej konsultacji?',
    answer: 'Zapytaj behawiorystę to krótka, płatna rozmowa na pierwszy kierunek. Pełna konsultacja trwa około 90 minut i jest dostępna po indywidualnym zaproszeniu oraz osobnej płatności.',
  },
  {
    question: 'Czy pracujesz z psami i kotami?',
    answer: 'Tak. Rozmowa może dotyczyć zachowania psa lub kota, a opis sytuacji zaczynasz bez wybierania rasy i bez fachowych etykiet.',
  },
] as const

export default function HomePage() {
  const structuredData = [
    getBreadcrumbJsonLd([{ name: 'Strona główna', path: '/' }]),
    getServiceJsonLd({
      name: 'Behawiorysta psów i kotów online',
      description:
        'Wsparcie behawioralne online dla opiekunów psów i kotów. Pierwszym krokiem jest krótka, płatna rozmowa z behawiorystą, która porządkuje sytuację i wskazuje, co można zrobić dalej.',
      serviceUrl: '/zapytaj',
      offerCatalog: [
        {
          name: 'Zapytaj behawiorystę',
          description: 'Krótka, płatna rozmowa telefoniczna na pierwszy praktyczny kierunek.',
          url: '/zapytaj',
          price: 79,
        },
      ],
    }),
    getFaqPageJsonLd([...routerFaqItems]),
  ]

  return (
    <main className="notatnik-page homepage-shell homepage-sales-page">
      <Schema data={structuredData} />
      <div className="notatnik-shell homepage-main">
        <EditorialIndexTopbar />

        <section className="notatnik-router-hero-section homepage-sales-hero">
          <HomepageZapytajHero />
        </section>

        <section className="homepage-sales-proof" aria-label="Najważniejsze informacje o usłudze">
          <div>
            <strong>Do 15 minut</strong>
            <span>krótka rozmowa telefoniczna</span>
          </div>
          <div>
            <strong>79 zł</strong>
            <span>jasna cena pierwszego kroku</span>
          </div>
          <div>
            <strong>Co dalej?</strong>
            <span>konkretny kierunek po rozmowie</span>
          </div>
        </section>

        <section className="homepage-sales-process" id="jak-to-działa" aria-labelledby="homepage-process-title">
          <div className="homepage-sales-section-heading">
            <span>JAK ZACZĄĆ</span>
            <h2 id="homepage-process-title">Najpierw opowiedz. Potem ustalimy, co ma sens.</h2>
            <p>
              Nie musisz samodzielnie diagnozować psa ani kota. Płatna rozmowa służy temu, żeby spokojnie zebrać
              najważniejsze fakty i wybrać następny krok.
            </p>
          </div>
          <div className="homepage-sales-process-grid">
            {homepageProcessSteps.map((step) => (
              <article key={step.step}>
                <span className="homepage-sales-step-number">{step.step}</span>
                <h3>{step.title.replace(' i szukamy przyczyny', '')}</h3>
                <p>{step.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="homepage-sales-paths" aria-labelledby="homepage-paths-title">
          <div className="homepage-sales-section-heading">
            <span>CO MOŻE BYĆ DALEJ</span>
            <h2 id="homepage-paths-title">Jedna rozmowa nie udaje całego procesu</h2>
            <p>
              Jeśli po rozmowie potrzebny będzie szerszy plan, omówię z Tobą właściwą formę pracy. Nie kupujesz
              kolejnego etapu w ciemno.
            </p>
          </div>
          <div className="homepage-sales-path-grid">
            <article className="homepage-sales-path homepage-sales-path-primary">
              <span>PO INDYWIDUALNYM ZAPROSZENIU</span>
              <h3>{PUBLIC_FULL_CONSULTATION_OFFER.name}</h3>
              <p>
                Około 90 minut na szerszy kontekst, analizę sytuacji i plan działania. Po rozmowie możesz otrzymać
                osobny link do dostępnych terminów.
              </p>
              <strong>{formatPublicOfferPrice(PUBLIC_FULL_CONSULTATION_OFFER.pricePln)} · {PUBLIC_FULL_CONSULTATION_OFFER.durationLabel}</strong>
              <Link href="/konsultacja" prefetch={false}>
                Zobacz opis pełnej konsultacji <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </article>
            <article className="homepage-sales-path">
              <span>PO PEŁNEJ KONSULTACJI</span>
              <h3>{PUBLIC_THERAPY_OFFER.name}</h3>
              <p>
                Indywidualna ścieżka pracy ustalana dopiero wtedy, gdy pełna konsultacja pokaże, że regularne wsparcie
                będzie właściwym rozwiązaniem.
              </p>
              <Link href="/terapia" prefetch={false}>
                Zobacz możliwości terapii <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </article>
          </div>
        </section>

        <section className="homepage-sales-expert" aria-labelledby="homepage-expert-title">
          <div className="homepage-sales-expert-copy">
            <span>EKSPERCKIE WSPARCIE, LUDZKI JĘZYK</span>
            <h2 id="homepage-expert-title">Pomagam zrozumieć zachowanie, bez oceniania opiekuna.</h2>
            <p>
              Jestem Krzysztof Regulski — technik weterynarii, behawiorysta i trener zwierząt towarzyszących COAPE.
              W rozmowie układam fakty: emocje, zdrowie, środowisko, historię uczenia się i codzienną rutynę.
            </p>
            <p>
              To nie jest porada weterynaryjna ani obietnica szybkiego rozwiązania. To spokojny, konkretny początek,
              który pomaga przestać działać po omacku.
            </p>
            <Link href="/o-mnie" prefetch={false}>
              Poznaj moje podejście <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <div className="homepage-sales-expert-media">
            <figure>
              <Image
                src={HOME_HERO_PHOTO.src}
                alt={HOME_HERO_PHOTO.alt}
                fill
                loading="lazy"
                sizes="(max-width: 760px) 92vw, 40vw"
              />
            </figure>
            <div>
              <Image
                src={COAPE_POLSKA_LOGO.src}
                alt={COAPE_POLSKA_LOGO.alt}
                width={COAPE_POLSKA_LOGO.width}
                height={COAPE_POLSKA_LOGO.height}
                loading="lazy"
              />
              <span>Praca z psami i kotami online</span>
            </div>
          </div>
        </section>

        <section className="homepage-sales-map-bridge" aria-labelledby="homepage-map-title">
          <div>
            <span>NIE WIESZ, JAK TO NAZWAĆ?</span>
            <h2 id="homepage-map-title">Mapa zachowania pomoże uporządkować opis.</h2>
            <p>To pomocnicze pytania, nie diagnoza i nie wybór usługi za Ciebie.</p>
          </div>
          <Link href="/mapa-sprawy" prefetch={false}>
            Otwórz Mapę zachowania <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </section>

        <section className="homepage-sales-faq" aria-labelledby="homepage-faq-title">
          <div className="homepage-sales-section-heading">
            <span>NAJCZĘSTSZE PYTANIA</span>
            <h2 id="homepage-faq-title">Zanim zaczniesz</h2>
          </div>
          <FaqAccordion items={routerFaqItems.map((item) => ({ q: item.question, a: item.answer }))} />
        </section>

        <NotatnikFooter
          variant="home"
          primaryHref="/zapytaj#formularz"
          primaryLabel="Zapytaj behawiorystę — 79 zł"
          reviewLayout="editorial"
        />
      </div>
    </main>
  )
}
