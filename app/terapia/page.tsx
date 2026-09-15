import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, BookOpen, HelpCircle } from 'lucide-react'
import { Schema } from '@/components/schema'
import { NotatnikPageShell, PUBLIC_SITE_NAV_ITEMS } from '@/components/NotatnikA'
import { getBreadcrumbJsonLd, getFaqPageJsonLd, getServiceJsonLd } from '@/lib/schema'
import { buildMarketingMetadata } from '@/lib/seo'
import { PUBLIC_THERAPY_OFFER } from '@/lib/public-offer'
import { THERAPY_PROCESS_PHOTO } from '@/lib/site'

const THERAPY_FAQ_ITEMS = [
  {
    question: 'Czy mogę od razu wykupić pakiet terapii?',
    answer: 'Nie sprzedaję gotowych pakietów w ciemno. Terapia jest kontynuacją po pełnej konsultacji, gdy oboje wiemy, jaki jest cel i czy dłuższa współpraca ma sens.',
  },
  {
    question: 'Ile trwa proces terapeutyczny?',
    answer: 'Długość zależy od natury problemu i tempa wprowadzania zmian w środowisku. Pracujemy etapami z regularną oceną efektów w codziennym rytmie zwierzęcia.',
  },
  {
    question: 'Kiedy terapia nie jest właściwym krokiem?',
    answer: 'Przy ostrym bólu, urazie, nagłym pogorszeniu stanu zdrowia lub bezpośrednim zagrożeniu bezpieczeństwa. Wtedy pierwszym krokiem jest lekarz weterynarii lub zabezpieczenie otoczenia.',
  },
  {
    question: 'Jak wygląda kontakt w trakcie terapii?',
    answer: 'Zasady kontaktu, kanał oraz terminy sprawdzania postępów ustalamy indywidualnie po konsultacji, bez obietnic stałej dostępności na telefon.',
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
      ctaLabel="Zacznij od Zapytaj"
      footerPrimaryHref="/zapytaj#formularz"
      footerPrimaryLabel="Zapytaj behawiorystę"
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
        <div>
          <span className="zapytaj-kicker">DŁUŻSZA PRACA, GDY JEST NA NIĄ PRZESTRZEŃ</span>
          <h1 id="therapy-title">Terapia behawioralna</h1>
          <p>
            Terapia nie jest kolejnym produktem do wybrania z listy. To indywidualna ścieżka pracy: jej cel, tempo,
            forma kontaktu i dostępność ustalamy dopiero wtedy, gdy znamy sytuację z pełnej konsultacji.
          </p>
          <a href="/zapytaj#formularz" className="notatnik-btn">
            Zacznij od Zapytaj <ArrowRight size={17} aria-hidden="true" />
          </a>
        </div>
        <figure className="canonical-service-hero-art canonical-service-photo">
          <Image
            src={THERAPY_PROCESS_PHOTO.src}
            alt={THERAPY_PROCESS_PHOTO.alt}
            fill
            priority
            sizes="(max-width: 980px) 92vw, 34vw"
          />
          <figcaption>
            <strong>Spokojna, indywidualna praca.</strong>
            <small>Dopasowana do rytmu domu po pełnej konsultacji.</small>
          </figcaption>
        </figure>
      </section>

      <section className="canonical-service-explanation" aria-labelledby="therapy-access-title">
        <div className="canonical-service-heading">
          <span className="zapytaj-kicker">DOSTĘP PO PEŁNEJ KONSULTACJI</span>
          <h2 id="therapy-access-title">Najpierw rozpoznanie, potem wspólna praca</h2>
          <p>
            Po pełnej konsultacji otrzymujesz jasną informację, czy terapia jest dobrym kolejnym krokiem. Jeśli tak,
            ustalamy ją indywidualnie. Terminy i zakres ustalamy po rozmowie, bez zakupu gotowego pakietu w ciemno.
          </p>
        </div>
        <div className="canonical-service-steps">
          <article>
            <h3>Pełna konsultacja</h3>
            <p>Najpierw zbieramy kontekst i ustalamy realny cel pracy.</p>
          </article>
          <article>
            <h3>Indywidualna propozycja</h3>
            <p>Forma i tempo wynikają z sytuacji, a nie z gotowego pakietu.</p>
          </article>
          <article>
            <h3>Kontakt ustalony z góry</h3>
            <p>Wiesz, czego dotyczy wsparcie i kiedy możesz z niego skorzystać.</p>
          </article>
        </div>
      </section>

      <section className="canonical-service-explanation" aria-labelledby="therapy-fit-title">
        <div className="canonical-service-heading">
          <span className="zapytaj-kicker">ZAKRES I GRANICE</span>
          <h2 id="therapy-fit-title">Dla kogo jest terapia — a kiedy potrzebny jest inny krok</h2>
          <p>Terapia ma sens, gdy po pełnej konsultacji znamy wzór zachowania, warunki w domu i cel możliwy do sprawdzenia. Nie zastępuje pilnej pomocy lekarskiej ani interwencji przy bezpośrednim zagrożeniu.</p>
        </div>
        <div className="canonical-service-steps">
          <article><h3>Może być właściwa</h3><p>Gdy problem powtarza się, wymaga zmian w środowisku i spokojnego wdrażania kolejnych kroków.</p></article>
          <article><h3>Najpierw lekarz lub bezpieczeństwo</h3><p>Przy bólu, urazie, nagłej zmianie zdrowia albo ryzyku dla człowieka lub zwierzęcia.</p></article>
          <article><h3>Cel bez obietnic</h3><p>Ustalamy, co ma się zmienić w codziennym funkcjonowaniu, zamiast obiecywać szybkie „naprawienie” zwierzęcia.</p></article>
        </div>
      </section>

      <section className="canonical-service-explanation" aria-labelledby="therapy-work-title">
        <div className="canonical-service-heading">
          <span className="zapytaj-kicker">JAK WYGLĄDA WSPÓŁPRACA</span>
          <h2 id="therapy-work-title">Kolejne kroki są dobierane do sytuacji</h2>
          <p>Po konsultacji otrzymujesz propozycję celu, pierwszych zmian i sposobu kontaktu. W toku pracy wracamy do obserwacji oraz sprawdzamy, czy plan rzeczywiście pomaga w domu.</p>
        </div>
        <div className="canonical-service-steps">
          <article><h3>1. Ustalamy priorytet</h3><p>Nie zmieniamy wszystkiego naraz; wybieramy krok, który najpierw poprawi bezpieczeństwo lub komfort.</p></article>
          <article><h3>2. Wdrażasz i obserwujesz</h3><p>Zmiany mają być możliwe do wykonania w Twoim rytmie dnia, z miejscem na pytania i korektę.</p></article>
          <article><h3>3. Oceniamy efekt</h3><p>Patrzymy na trend, nie na pojedynczy dobry albo trudny dzień, i uczciwie decydujemy o dalszej pracy.</p></article>
        </div>
      </section>

      <section className="canonical-service-explanation" aria-labelledby="therapy-faq-title">
        <div className="canonical-service-heading">
          <span className="zapytaj-kicker">NAJCZĘSTSZE PYTANIA</span>
          <h2 id="therapy-faq-title">Pytania o terapię behawioralną</h2>
        </div>
        <div className="zapytaj-faq-list" style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'left' }}>
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
        <div className="canonical-service-steps">
          {RELATED_ARTICLES.map((article) => (
            <article key={article.href}>
              <h3>{article.title}</h3>
              <p>{article.lead}</p>
              <Link href={article.href} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '10px', color: 'var(--accent)', fontWeight: 600, fontSize: '14px' }}>
                Czytaj artykuł <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="canonical-service-note" aria-label="Ważna informacja">
        <strong>Jeśli dopiero szukasz pierwszego kroku</strong>
        <p>Zacznij od krótkiej rozmowy. Nie musisz od razu decydować o terapii.</p>
        <a href="/zapytaj#formularz">Zapytaj behawiorystę <ArrowRight size={16} aria-hidden="true" /></a>
      </section>
    </NotatnikPageShell>
  )
}
