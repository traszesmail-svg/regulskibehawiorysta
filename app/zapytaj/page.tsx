import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Clock3, PhoneCall, ShieldAlert, WalletCards } from 'lucide-react'
import { Schema } from '@/components/schema'
import { NotatnikPageShell, PUBLIC_SITE_NAV_ITEMS } from '@/components/NotatnikA'
import { ZapytajIntakeForm } from '@/components/ZapytajIntakeForm'
import { getBreadcrumbJsonLd, getFaqPageJsonLd, getServiceJsonLd } from '@/lib/schema'
import { buildMarketingMetadata } from '@/lib/seo'
import { PUBLIC_ZAPYTAJ_OFFER, formatPublicOfferPrice } from '@/lib/public-offer'
import { COAPE_POLSKA_LOGO, HOME_HERO_PHOTO, SPECIALIST_NAME, SPECIALIST_PUBLIC_STATUS } from '@/lib/site'

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
    question: 'Jak szybko odbędzie się rozmowa?',
    answer: 'Rozmawiamy w wybranym i potwierdzonym terminie z kalendarza za 79 zł. Jeśli w danym momencie dostępna jest opcja natychmiastowa, formularz wyraźnie to wskaże.',
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
      ctaHref="/zapytaj"
      ctaLabel="Zapytaj"
      showZapytajStatus={false}
      showZapytajHeaderCta
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
          <span className="zapytaj-kicker">KRZYSZTOF REGULSKI · BEHAWIORYSTA PSÓW I KOTÓW</span>
          <h1 id="zapytaj-page-title">
            Martwi Cię zachowanie psa lub kota?
          </h1>
          <p className="zapytaj-hero-lead">
            Opowiedz, co się dzieje. Podczas krótkiej rozmowy ustalimy pierwszy krok i to, czy potrzebna jest dalsza pomoc.
          </p>
          <div className="offer-facts" aria-label="Najważniejsze informacje">
            <div className="offer-fact">
              <span className="offer-fact__icon"><Clock3 aria-hidden="true" /></span>
              <span>Do 15 minut</span>
            </div>
            <div className="offer-fact">
              <span className="offer-fact__icon"><WalletCards aria-hidden="true" /></span>
              <span>{formatPublicOfferPrice(PUBLIC_ZAPYTAJ_OFFER.pricePln)}</span>
            </div>
            <div className="offer-fact">
              <span className="offer-fact__icon"><PhoneCall aria-hidden="true" /></span>
              <span>Telefonicznie</span>
            </div>
          </div>
          <div className="zapytaj-hero-actions">
            <a href="#formularz" className="notatnik-btn">
              Wybierz termin
              <ArrowRight size={17} strokeWidth={1.9} aria-hidden="true" />
            </a>
            <a href="/zapytaj-teraz" className="zapytaj-muted-link">
              Zapytaj o rozmowę dziś
            </a>
          </div>
          <div className="homepage-hero-proof" aria-label="Kwalifikacje specjalisty">
            <div className="homepage-hero-proof-specialist">
              <div className="homepage-hero-proof-logo-wrap">
                <Image
                  src={COAPE_POLSKA_LOGO.src}
                  alt={COAPE_POLSKA_LOGO.alt}
                  width={COAPE_POLSKA_LOGO.width}
                  height={COAPE_POLSKA_LOGO.height}
                  className="homepage-hero-proof-logo"
                />
              </div>
              <div className="homepage-hero-proof-copy">
                <strong className="homepage-hero-proof-name">{SPECIALIST_NAME}</strong>
                <div className="homepage-hero-proof-creds">
                  <span>{SPECIALIST_PUBLIC_STATUS}</span>
                  <span className="homepage-hero-proof-sep" aria-hidden="true">·</span>
                  <span>technik weterynarii</span>
                </div>
              </div>
            </div>
            <p className="homepage-hero-proof-note">
              Rozmowa bez kamery
              <span className="homepage-hero-proof-dot" aria-hidden="true">·</span>
              <Link href="/opinie" className="homepage-hero-proof-link">Zobacz opinie opiekunów</Link>
            </p>
          </div>
        </div>

        <figure className="zapytaj-hero-photo">
          <Image
            src={HOME_HERO_PHOTO.src}
            alt={HOME_HERO_PHOTO.alt}
            fill
            priority
            quality={86}
            sizes="(max-width: 760px) 100vw, 42vw"
          />
        </figure>
      </section>

      <div className="zapytaj-now-teaser-container">
        <section className="zapytaj-now-teaser" id="zapytaj-teraz" aria-labelledby="zapytaj-now-teaser-title">
          <Image className="zapytaj-now-teaser-image" src="/images/zapytaj-teraz/telefon-premium-v2.png" alt="" width={72} height={72} sizes="(max-width: 480px) 52px, 72px" />
          <div className="zapytaj-now-teaser-copy">
            <h2 id="zapytaj-now-teaser-title">Potrzebujesz pomocy teraz?</h2>
            <p>Sprawdź, czy jest taka możliwość.</p>
          </div>
          <Link className="zapytaj-now-teaser-cta" href="/zapytaj-teraz">Sprawdź możliwość rozmowy <ArrowRight size={17} aria-hidden="true" /></Link>
        </section>
      </div>

      <section className="zapytaj-process-section" id="jak-to-dziala" aria-labelledby="zapytaj-process-title">
        <div className="zapytaj-section-heading zapytaj-process-heading">
          <span className="zapytaj-kicker">JAK TO DZIAŁA</span>
          <h2 id="zapytaj-process-title">Jak to działa</h2>
          <Image
            src="/decor/leaf-transparent/leaf-top-right.png"
            alt=""
            width={150}
            height={124}
            className="zapytaj-process-leaf"
            aria-hidden="true"
          />
        </div>
        <div className="zapytaj-process-grid steps-list">
          <article className="step-item">
            <span className="zapytaj-process-number" aria-hidden="true">01</span>
            <div className="homepage-step-body"><h3>Opisujesz sytuację</h3><p>Kilka zdań o tym, co Cię niepokoi. Wspólnie porządkujemy fakty — bez pochopnych interpretacji i internetowych etykiet.</p></div>
          </article>
          <article className="step-item">
            <span className="zapytaj-process-number" aria-hidden="true">02</span>
            <div className="homepage-step-body"><h3>Rezerwujesz rozmowę</h3><p>Wybierasz dostępny termin i opłacasz rozmowę.</p></div>
          </article>
          <article className="step-item">
            <span className="zapytaj-process-number" aria-hidden="true">03</span>
            <div className="homepage-step-body"><h3>Rozmawiamy</h3><p>Ustalamy pierwszy realny krok. Jeśli temat jest szerszy, wskażę właściwy dalszy kierunek.</p></div>
          </article>
        </div>
      </section>

      <section className="zapytaj-intake-section" id="formularz" aria-labelledby="zapytaj-form-title">
        <div className="zapytaj-booking-heading">
          <span className="zapytaj-kicker">WYBIERZ TERMIN</span>
          <h2 id="zapytaj-form-title">Wybierz dzień i godzinę rozmowy</h2>
        </div>
        <div className="zapytaj-form-card">
          <ZapytajIntakeForm />
        </div>
        <p className="zapytaj-safety-note">
          <ShieldAlert size={18} strokeWidth={1.7} aria-hidden="true" />
          <span>Jeśli jest ból, uraz, nagła zmiana stanu albo zagrożenie, najpierw wybierz lekarza weterynarii lub pomoc alarmową.</span>
        </p>
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
