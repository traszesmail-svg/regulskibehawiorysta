import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Clock3, Compass, Layers, PhoneCall, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react'
import { Schema } from '@/components/schema'
import { NotatnikPageShell, PUBLIC_SITE_NAV_ITEMS } from '@/components/NotatnikA'
import { getBreadcrumbJsonLd, getFaqPageJsonLd, getServiceJsonLd } from '@/lib/schema'
import { buildMarketingMetadata } from '@/lib/seo'
import { PUBLIC_THERAPY_OFFER } from '@/lib/public-offer'
import { THERAPY_PROCESS_PHOTO, COAPE_POLSKA_LOGO, SPECIALIST_NAME, SPECIALIST_PUBLIC_STATUS } from '@/lib/site'

const THERAPY_FAQ_ITEMS = [
  {
    question: 'Czy mogę od razu wykupić pakiet terapii?',
    answer:
      'Nie sprzedaję gotowych pakietów w ciemno. Terapia jest kontynuacją po pełnej konsultacji, gdy oboje wiemy, jaki jest cel i czy dłuższa współpraca ma sens.',
  },
  {
    question: 'Ile trwa proces terapeutyczny?',
    answer:
      'Długość zależy od natury problemu i tempa wprowadzania zmian w środowisku. Pracujemy etapami z regularną oceną efektów w codziennym rytmie zwierzęcia.',
  },
  {
    question: 'Kiedy terapia nie jest właściwym krokiem?',
    answer:
      'Przy ostrym bólu, urazie, nagłym pogorszeniu stanu zdrowia lub bezpośrednim zagrożeniu bezpieczeństwa. Wtedy pierwszym krokiem jest lekarz weterynarii lub zabezpieczenie otoczenia.',
  },
  {
    question: 'Jak wygląda kontakt w trakcie terapii?',
    answer:
      'Zasady kontaktu, kanał oraz terminy sprawdzania postępów ustalamy indywidualnie po konsultacji, bez obietnic stałej dostępności na telefon.',
  },
] as const

const RELATED_ARTICLES = [
  {
    title: 'Kiedy behawiorysta, kiedy trener psa?',
    href: '/blog/kiedy-behawiorysta-kiedy-trener-psa',
    lead: 'Różnice między pracą nad emocjami a nauką konkretnych umiejętności.',
  },
  {
    title: 'Behawiorysta, zoopsycholog, trener — do kogo się zgłosić?',
    href: '/blog/behawiorysta-zoopsycholog-trener-do-kogo-sie-zglosic',
    lead: 'Jak dobrać właściwego specjalistę do sytuacji w domu.',
  },
  {
    title: 'Jak wygląda konsultacja behawioralna online?',
    href: '/blog/jak-wyglada-konsultacja-behawioralna-online',
    lead: 'Przebieg, przygotowanie materiałów wideo i plan pierwszych kroków.',
  },
] as const

export const metadata: Metadata = buildMarketingMetadata({
  title: 'Terapia behawioralna',
  path: '/terapia',
  description:
    'Indywidualna terapia behawioralna psów i kotów, ustalana po pełnej konsultacji. Zakres, forma i dostępność zależą od konkretnej sytuacji.',
})

export default function TherapyPage() {
  return (
    <NotatnikPageShell
      tag="Indywidualna ścieżka"
      navItems={PUBLIC_SITE_NAV_ITEMS}
      ctaHref="/zapytaj#formularz"
      ctaLabel="Zapytaj behawiorystę – 79 zł"
      footerPrimaryHref="/zapytaj#formularz"
      footerPrimaryLabel="Zapytaj behawiorystę – 79 zł"
      showSideVisuals={false}
      pageClassName="canonical-service-page therapy-page"
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

      <section className="canonical-service-hero" aria-labelledby="therapy-title">
        <div className="canonical-service-hero-copy">
          <span className="zapytaj-kicker">DŁUŻSZA PRACA, GDY JEST NA NIĄ PRZESTRZEŃ</span>
          <h1 id="therapy-title">Terapia behawioralna</h1>
          <p className="canonical-service-lead">
            Terapia nie jest kolejnym produktem do kupienia w ciemno. To indywidualna ścieżka pracy: jej cel, tempo,
            formę kontaktu i dostępność ustalamy dopiero wtedy, gdy znamy sytuację z pełnej konsultacji.
          </p>

          <div className="offer-facts" aria-label="Najważniejsze informacje">
            <div className="offer-fact">
              <span className="offer-fact__icon"><Compass aria-hidden="true" /></span>
              <span>Indywidualny plan</span>
            </div>
            <div className="offer-fact">
              <span className="offer-fact__icon"><Clock3 aria-hidden="true" /></span>
              <span>Praca etapami</span>
            </div>
            <div className="offer-fact">
              <span className="offer-fact__icon"><PhoneCall aria-hidden="true" /></span>
              <span>Po konsultacji</span>
            </div>
          </div>

          <div className="canonical-service-hero-actions">
            <a href="/zapytaj#formularz" className="notatnik-btn">
              <span>Zacznij od Zapytaj — 79 zł</span>
              <ArrowRight size={17} strokeWidth={1.9} aria-hidden="true" />
            </a>
            <a href="#kiedy-terapia" className="zapytaj-muted-link">
              Kiedy terapia ma sens?
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
              Indywidualne podejście
              <span className="homepage-hero-proof-dot" aria-hidden="true">·</span>
              <Link href="/opinie" className="homepage-hero-proof-link">Zobacz opinie opiekunów</Link>
            </p>
          </div>
        </div>

        <figure className="canonical-service-hero-art canonical-service-photo">
          <Image
            src={THERAPY_PROCESS_PHOTO.src}
            alt={THERAPY_PROCESS_PHOTO.alt}
            fill
            priority
            sizes="(max-width: 980px) 92vw, 38vw"
          />
        </figure>
      </section>

      <section className="canonical-service-explanation" id="kiedy-terapia" aria-labelledby="therapy-sense-title">
        <div className="canonical-service-heading">
          <span className="zapytaj-kicker">KIERUNEK I ZASADY</span>
          <h2 id="therapy-sense-title">Kiedy terapia ma sens?</h2>
          <p>
            Nie każda sytuacja wymaga długiego procesu. Wspólna praca terapeutyczna ma uzasadnienie wtedy, gdy problem
            nie zamyka się w jednej prostej zmianie i wymaga czasu na obserwację reakcji zwierzęcia.
          </p>
        </div>
        <div className="therapy-sense-cards-grid">
          <article className="therapy-sense-card">
            <span className="therapy-sense-card-icon" aria-hidden="true">
              <Layers size={22} strokeWidth={1.8} />
            </span>
            <h3>Problem wymaga pracy etapami</h3>
            <p>Złożone zachowania wymagają stopniowego wprowadzania zmian w środowisku i codziennej rutynie domowej.</p>
          </article>
          <article className="therapy-sense-card">
            <span className="therapy-sense-card-icon" aria-hidden="true">
              <Clock3 size={22} strokeWidth={1.8} />
            </span>
            <h3>Potrzebna jest obserwacja zmian w czasie</h3>
            <p>Sprawdzamy, jak zwierzę reaguje na modyfikacje w bezpiecznym tempie, bez pośpiechu i bez zbędnej presji.</p>
          </article>
          <article className="therapy-sense-card">
            <span className="therapy-sense-card-icon" aria-hidden="true">
              <Compass size={22} strokeWidth={1.8} />
            </span>
            <h3>Wcześniejsza konsultacja wskazała dalszą drogę</h3>
            <p>Dopiero po dokładnym omówieniu sytuacji w pełnej konsultacji ustalamy, czy dłuższy proces ma uzasadnienie.</p>
          </article>
        </div>
      </section>

      <section className="canonical-service-explanation" aria-labelledby="therapy-access-title">
        <div className="canonical-service-heading">
          <span className="zapytaj-kicker">DOSTĘP PO PEŁNEJ KONSULTACJI</span>
          <h2 id="therapy-access-title">Najpierw rozpoznanie, potem wspólna praca</h2>
          <p>
            Po pełnej konsultacji otrzymujesz jasną informację, czy terapia jest dobrym kolejnym krokiem.
            Terminy i zakres ustalamy bezpośrednio po rozmowie, bez konieczności kupowania gotowego pakietu z góry.
          </p>
        </div>
        <div className="canonical-service-steps steps-editorial">
          <article className="step-editorial-item">
            <span className="step-editorial-num">01</span>
            <div>
              <h3>Pełna konsultacja</h3>
              <p>Najpierw zbieramy dokładny kontekst, analizujemy nagrania i ustalamy realny cel wspólnej pracy.</p>
            </div>
          </article>
          <article className="step-editorial-item">
            <span className="step-editorial-num">02</span>
            <div>
              <h3>Indywidualna propozycja</h3>
              <p>Forma i tempo wynikają bezpośrednio z potrzeb psa lub kota, a nie ze sztucznego, gotowego schematu.</p>
            </div>
          </article>
          <article className="step-editorial-item">
            <span className="step-editorial-num">03</span>
            <div>
              <h3>Kontakt ustalony z góry</h3>
              <p>Dokładnie wiesz, jakiego obszaru dotyczy wsparcie, jak raportujesz postępy i kiedy wspólnie oceniamy efekty.</p>
            </div>
          </article>
        </div>
      </section>

      <section className="canonical-service-explanation" aria-labelledby="therapy-fit-title">
        <div className="canonical-service-heading">
          <span className="zapytaj-kicker">ZAKRES I GRANICE</span>
          <h2 id="therapy-fit-title">Dla kogo jest terapia — a kiedy potrzebny jest inny krok</h2>
          <p>
            Terapia ma sens, gdy po pełnej konsultacji znamy wzorzec zachowania, warunki domowe i cel możliwy do
            weryfikacji. Nie zastępuje pilnej pomocy lekarskiej ani doraźnego zabezpieczenia otoczenia.
          </p>
        </div>
        <div className="therapy-fit-grid">
          <article className="therapy-fit-card is-positive">
            <div className="therapy-fit-badge">
              <CheckCircle2 size={16} aria-hidden="true" />
              <span>Właściwy krok</span>
            </div>
            <h3>Gdy problem wymaga czasu i rutyny</h3>
            <p>Gdy zachowanie powtarza się, wynika z emocji i wymaga cierpliwych zmian środowiskowych wdrażanych krok po kroku.</p>
          </article>
          <article className="therapy-fit-card is-urgent">
            <div className="therapy-fit-badge">
              <ShieldAlert size={16} aria-hidden="true" />
              <span>Najpierw lekarz</span>
            </div>
            <h3>Gdy w grę wchodzi ból lub nagła zmiana</h3>
            <p>Przy nagłej zmianie zachowania, objawach bólowych, urazie lub bezpośrednim zagrożeniu dla domowników.</p>
          </article>
          <article className="therapy-fit-card is-neutral">
            <div className="therapy-fit-badge">
              <Sparkles size={16} aria-hidden="true" />
              <span>Uczciwy cel</span>
            </div>
            <h3>Bez obietnic „naprawienia” psa lub kota</h3>
            <p>Ustalamy, co ma się realnie zmienić w codziennym komforcie życia, zamiast składać nierealistyczne obietnice.</p>
          </article>
        </div>
      </section>

      <section className="canonical-service-explanation" aria-labelledby="therapy-work-title">
        <div className="canonical-service-heading">
          <span className="zapytaj-kicker">JAK WYGLĄDA WSPÓŁPRACA</span>
          <h2 id="therapy-work-title">Kolejne kroki są dobierane do sytuacji</h2>
          <p>
            Po konsultacji otrzymujesz propozycję celu, pierwszych zmian i sposobu kontaktu. W toku pracy wracamy
            do obserwacji oraz sprawdzamy, czy plan rzeczywiście pomaga w codziennym życiu.
          </p>
        </div>
        <div className="canonical-service-steps steps-editorial">
          <article className="step-editorial-item">
            <span className="step-editorial-num">01</span>
            <div>
              <h3>Ustalamy priorytet</h3>
              <p>Nie zmieniamy wszystkiego naraz; wybieramy krok, który najpierw poprawi bezpieczeństwo lub komfort zwierzęcia.</p>
            </div>
          </article>
          <article className="step-editorial-item">
            <span className="step-editorial-num">02</span>
            <div>
              <h3>Wdrażasz i obserwujesz</h3>
              <p>Zmiany są dopasowane do Twojego planu dnia, z przestrzenią na bieżące pytania i elastyczną korektę.</p>
            </div>
          </article>
          <article className="step-editorial-item">
            <span className="step-editorial-num">03</span>
            <div>
              <h3>Oceniamy efekt</h3>
              <p>Patrzymy na trwały trend, nie na pojedynczy trudny dzień, i wspólnie decydujemy o kolejnych etapach pracy.</p>
            </div>
          </article>
        </div>
      </section>

      <section className="canonical-service-explanation" aria-labelledby="therapy-faq-title">
        <div className="canonical-service-heading">
          <span className="zapytaj-kicker">NAJCZĘSTSZE PYTANIA</span>
          <h2 id="therapy-faq-title">Pytania o terapię behawioralną</h2>
        </div>
        <div className="zapytaj-faq-list" style={{ maxWidth: '820px', margin: '0 auto', textAlign: 'left' }}>
          {THERAPY_FAQ_ITEMS.map((item) => (
            <details key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="canonical-service-explanation" aria-labelledby="therapy-articles-title">
        <div className="canonical-service-heading">
          <span className="zapytaj-kicker">WARTO PRZECZYTAĆ</span>
          <h2 id="therapy-articles-title">Materiały pomocne przed decyzją</h2>
          <p>Krótkie wprowadzenie do tego, jak pracujemy i czego się spodziewać.</p>
        </div>
        <div className="therapy-articles-grid">
          {RELATED_ARTICLES.map((article) => (
            <article key={article.href} className="therapy-article-card">
              <h3>{article.title}</h3>
              <p>{article.lead}</p>
              <Link href={article.href} className="therapy-article-link">
                <span>Czytaj artykuł</span>
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="canonical-service-note" aria-label="Ważna informacja">
        <strong>Jeśli dopiero szukasz pierwszego kroku</strong>
        <p>Zacznij od krótkiej rozmowy. Nie musisz od razu decydować o terapii ani kupować długiego procesu.</p>
        <a href="/zapytaj#formularz" className="notatnik-btn">
          <span>Zacznij od Zapytaj — 79 zł</span>
          <ArrowRight size={16} aria-hidden="true" />
        </a>
      </section>
    </NotatnikPageShell>
  )
}
