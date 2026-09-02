import type { Metadata } from 'next'
import Image from 'next/image'
import { ArrowRight, Check, ShieldAlert } from 'lucide-react'
import { Schema } from '@/components/schema'
import { NotatnikPageShell, PUBLIC_SITE_NAV_ITEMS } from '@/components/NotatnikA'
import { ZapytajIntakeForm } from '@/components/ZapytajIntakeForm'
import { ZapytajAvailabilityStatus } from '@/components/ZapytajAvailabilityStatus'
import { getBreadcrumbJsonLd, getFaqPageJsonLd, getServiceJsonLd } from '@/lib/schema'
import { buildMarketingMetadata } from '@/lib/seo'
import { PUBLIC_ZAPYTAJ_OFFER, formatPublicOfferPrice } from '@/lib/public-offer'

const FAQ_ITEMS = [
  {
    question: 'Ile trwa rozmowa?',
    answer: 'Publicznie mówimy o rozmowie do 15 minut. Techniczny limit połączenia jest dłuższy, ale nie jest osobną obietnicą usługi.',
  },
  {
    question: 'Co dostanę po rozmowie?',
    answer: 'Uporządkujemy, co może mieć znaczenie, wskażę pierwszy praktyczny krok i powiem, co robić dalej. Nie obiecuję rozwiązania całego problemu w tej rozmowie.',
  },
  {
    question: 'Czy muszę znać nazwę problemu?',
    answer: 'Nie. W formularzu wystarczy opis sytuacji: co się dzieje, od kiedy, w jakich okolicznościach i co zostało już wypróbowane.',
  },
  {
    question: 'Czym Zapytaj różni się od konsultacji?',
    answer: 'Zapytaj to krótki, płatny pierwszy kierunek. Pełna konsultacja trwa około 90 minut i jest dostępna dopiero po indywidualnym zaproszeniu oraz osobnej płatności.',
  },
  {
    question: 'Czy mogę zapytać teraz?',
    answer: 'Opcja „teraz” będzie widoczna tylko wtedy, gdy behawiorysta faktycznie włączy dostępność live. W innym przypadku wybierasz zwykły termin za 79 zł.',
  },
  {
    question: 'A jeśli sytuacja wygląda na zdrowotną albo nagłą?',
    answer: 'Rozmowa behawioralna nie zastępuje lekarza weterynarii ani pomocy alarmowej. Przy nagłej zmianie stanu, bólu, urazie lub zagrożeniu najpierw skontaktuj się z właściwą pomocą.',
  },
] as const

export const metadata: Metadata = buildMarketingMetadata({
  title: 'Zapytaj behawiorystę',
  path: '/zapytaj',
  description:
    'Krótka, płatna rozmowa z behawiorystą dla opiekunów psów i kotów. Opisz sytuację, uporządkuj problem i dowiedz się, co możesz zrobić dalej.',
})

export default function ZapytajPage() {
  const structuredData = [
    getBreadcrumbJsonLd([
      { name: 'Strona główna', path: '/' },
      { name: 'Zapytaj behawiorystę', path: '/zapytaj' },
    ]),
    getServiceJsonLd({
      name: PUBLIC_ZAPYTAJ_OFFER.name,
      description: PUBLIC_ZAPYTAJ_OFFER.summary,
      serviceUrl: '/zapytaj',
      offerPrice: PUBLIC_ZAPYTAJ_OFFER.pricePln,
    }),
    getFaqPageJsonLd([...FAQ_ITEMS]),
  ]

  return (
    <NotatnikPageShell
      tag="Pierwszy krok"
      navItems={PUBLIC_SITE_NAV_ITEMS}
      ctaHref="/zapytaj#formularz"
      ctaLabel={`Zapytaj — ${formatPublicOfferPrice(PUBLIC_ZAPYTAJ_OFFER.pricePln)}`}
      footerPrimaryHref="/zapytaj#formularz"
      footerPrimaryLabel={`Zapytaj behawiorystę — ${formatPublicOfferPrice(PUBLIC_ZAPYTAJ_OFFER.pricePln)}`}
      showSideVisuals={false}
      pageClassName="zapytaj-page"
      shellClassName="zapytaj-shell"
      footerVariant="home"
      showFooterReviews={false}
      topbarProfile="flow"
    >
      <Schema data={structuredData} />

      <section className="zapytaj-hero" aria-labelledby="zapytaj-page-title">
        <div className="zapytaj-hero-copy">
          <span className="zapytaj-kicker">KRÓTKI PIERWSZY KROK</span>
          <h1 id="zapytaj-page-title">
            Masz problem z psem lub kotem? <em>Zapytaj behawiorystę.</em>
          </h1>
          <p className="zapytaj-hero-lead">
            Opowiedz, co dzieje się z Twoim psem lub kotem. W krótkiej rozmowie uporządkujemy sytuację i ustalimy,
            co możesz zrobić dalej.
          </p>
          <div className="zapytaj-hero-price">
            <div>
              <strong>{PUBLIC_ZAPYTAJ_OFFER.durationLabel} · {formatPublicOfferPrice(PUBLIC_ZAPYTAJ_OFFER.pricePln)}</strong>
              <span>Rozmowa telefoniczna na pierwszy, konkretny kierunek.</span>
            </div>
          </div>
          <ZapytajAvailabilityStatus />
          <div className="zapytaj-hero-actions">
            <a href="#formularz" className="notatnik-btn">
              Zapytaj behawiorystę — {formatPublicOfferPrice(PUBLIC_ZAPYTAJ_OFFER.pricePln)}
              <ArrowRight size={17} strokeWidth={1.9} aria-hidden="true" />
            </a>
            <a href="#jak-to-dziala" className="zapytaj-muted-link">
              Zobacz, jak to działa
            </a>
          </div>
        </div>

        <figure className="zapytaj-hero-photo">
          {/* This is the approved existing portrait asset, not a treatment scene. */}
          <Image
            src="/branding/omnie.png"
            alt="Krzysztof Regulski trzyma kota na rękach"
            fill
            priority
            sizes="(max-width: 760px) 100vw, 42vw"
          />
          <figcaption>Rozmowa z behawiorystą, bez zgadywania i bez gotowej etykiety problemu.</figcaption>
        </figure>
      </section>

      <section className="zapytaj-process-section" id="jak-to-dziala" aria-labelledby="zapytaj-process-title">
        <div className="zapytaj-section-heading">
          <span className="zapytaj-kicker">PROSTY PRZEBIEG</span>
          <h2 id="zapytaj-process-title">Jak to działa?</h2>
        </div>
        <div className="zapytaj-process-grid">
          <article>
            <span>01</span>
            <h3>Opisujesz problem</h3>
            <p>Kilka zdań wystarczy. Nie musisz znać nazwy problemu ani przyczyny.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Opłacasz rozmowę</h3>
            <p>Po formularzu pojawi się osobny krok płatności i potwierdzenia.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Rozmawiasz z behawiorystą</h3>
            <p>Do 15 minut telefonicznie, w zwykłym terminie albo live, jeśli jest realna dostępność.</p>
          </article>
          <article>
            <span>04</span>
            <h3>Wiesz, co robić dalej</h3>
            <p>Dostajesz pierwszy kierunek i informację, czy potrzebny jest kolejny etap.</p>
          </article>
        </div>
      </section>

      <section className="zapytaj-intake-section" id="formularz" aria-labelledby="zapytaj-form-title">
        <div className="zapytaj-intake-copy">
          <span className="zapytaj-kicker">ZACZNIJ OD OPISU</span>
          <h2 id="zapytaj-form-title">Napisz, co się dzieje</h2>
          <p>
            To nie jest test ani diagnoza. Chcę najpierw zobaczyć sytuację Twoimi oczami: co się dzieje, od kiedy,
            w jakich momentach i co już było próbowane.
          </p>
          <ul>
            <li><Check size={17} aria-hidden="true" /> pies albo kot — bez pytania o rasę</li>
            <li><Check size={17} aria-hidden="true" /> opis własnymi słowami, bez wybierania etykiety</li>
            <li><Check size={17} aria-hidden="true" /> telefon potrzebny do rozmowy i e-mail do potwierdzeń</li>
          </ul>
          <div className="zapytaj-safety-note">
            <ShieldAlert size={20} strokeWidth={1.7} aria-hidden="true" />
            <span>Jeśli jest ból, uraz, nagła zmiana stanu albo zagrożenie, najpierw wybierz lekarza weterynarii lub pomoc alarmową.</span>
          </div>
        </div>
        <div className="zapytaj-form-card">
          <div className="zapytaj-form-card-head">
            <div>
              <span className="zapytaj-form-card-kicker">FORMULARZ USŁUGI</span>
              <h3>Opowiedz po swojemu</h3>
            </div>
            <strong>{formatPublicOfferPrice(PUBLIC_ZAPYTAJ_OFFER.pricePln)}</strong>
          </div>
          <ZapytajIntakeForm />
        </div>
      </section>

      <section className="zapytaj-value-section" aria-labelledby="zapytaj-value-title">
        <div className="zapytaj-section-heading">
          <span className="zapytaj-kicker">CO WYNIESIESZ Z ROZMOWY</span>
          <h2 id="zapytaj-value-title">Pierwszy klucz, nie obietnica całej terapii</h2>
        </div>
        <div className="zapytaj-value-grid">
          <article>
            <h3>Porządkujesz fakty</h3>
            <p>Oddzielamy to, co rzeczywiście widzisz, od szybkich interpretacji i internetowych etykiet.</p>
          </article>
          <article>
            <h3>Dostajesz pierwszy krok</h3>
            <p>Wiesz, co warto sprawdzić lub zmienić najpierw, bez udawania gotowego planu terapii.</p>
          </article>
          <article>
            <h3>Wiesz, co dalej</h3>
            <p>Jeśli temat jest szerszy, mogę wskazać pełną konsultację albo inny właściwy kierunek.</p>
          </article>
        </div>
      </section>

      <section className="zapytaj-next-section" aria-labelledby="zapytaj-next-title">
        <div className="zapytaj-section-heading">
          <span className="zapytaj-kicker">DALSZE MOŻLIWOŚCI</span>
          <h2 id="zapytaj-next-title">Nie każda sprawa potrzebuje tego samego procesu</h2>
        </div>
        <div className="zapytaj-next-grid">
          <article>
            <span className="zapytaj-next-label">PO INDYWIDUALNYM ZAPROSZENIU</span>
            <h3>Pełna konsultacja</h3>
            <p>Około 90 minut, szerszy kontekst i plan działania. Po rozmowie możesz otrzymać osobny link do dostępnych terminów i opłacić ten etap.</p>
            <a href="/konsultacja">Zobacz opis pełnej konsultacji <ArrowRight size={16} aria-hidden="true" /></a>
          </article>
          <article>
            <span className="zapytaj-next-label">PO PEŁNEJ KONSULTACJI</span>
            <h3>Terapia behawioralna</h3>
            <p>Indywidualna, dłuższa ścieżka pracy ustalana po pełnej konsultacji. Zakres i terminy dobieramy do sytuacji.</p>
            <a href="/terapia">Zobacz możliwości terapii <ArrowRight size={16} aria-hidden="true" /></a>
          </article>
        </div>
      </section>

      <section className="zapytaj-faq-section" aria-labelledby="zapytaj-faq-title">
        <div className="zapytaj-section-heading">
          <span className="zapytaj-kicker">NAJCZĘSTSZE PYTANIA</span>
          <h2 id="zapytaj-faq-title">Zanim wyślesz opis</h2>
        </div>
        <div className="zapytaj-faq-list">
          {FAQ_ITEMS.map((item) => (
            <details key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </NotatnikPageShell>
  )
}
