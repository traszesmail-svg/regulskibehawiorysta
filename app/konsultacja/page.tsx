import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, CalendarDays, Clock3, Compass, Layers, MessageSquareText, PhoneCall, Video, WalletCards } from 'lucide-react'
import { Schema } from '@/components/schema'
import { NotatnikPageShell, PUBLIC_SITE_NAV_ITEMS } from '@/components/NotatnikA'
import { getBreadcrumbJsonLd, getFaqPageJsonLd, getServiceJsonLd } from '@/lib/schema'
import { buildMarketingMetadata } from '@/lib/seo'
import { PUBLIC_FULL_CONSULTATION_OFFER, formatPublicOfferPrice } from '@/lib/public-offer'
import { COAPE_POLSKA_LOGO, SPECIALIST_NAME, SPECIALIST_PUBLIC_STATUS } from '@/lib/site'

const CONSULTATION_FAQ_ITEMS = [
  {
    question: 'Dlaczego pełna konsultacja wymaga wcześniejszej rozmowy?',
    answer:
      'Nie sprzedaję długiego procesu w ciemno. Krótka rozmowa Zapytaj (79 zł) pozwala sprawdzić, czy problem faktycznie wymaga 90-minutowej analizy, czy wystarczą prostsze zmiany w domu.',
  },
  {
    question: 'Jak przygotować się do pełnej konsultacji?',
    answer:
      'Po otrzymaniu indywidualnego linku do rezerwacji poproszę Cię o krótkie nagrania wideo sytuacji, plan dnia zwierzaka oraz ewentualną historię weterynaryjną. Otrzymasz jasną listę wskazówek.',
  },
  {
    question: 'Czy konsultacja odbywa się przez kamerę?',
    answer:
      'Tak, pełna konsultacja to spotkanie online z wideo. Widzimy się, omawiamy zachowanie i wspólnie analizujemy nagrania oraz środowisko domowe.',
  },
  {
    question: 'Co otrzymuję po konsultacji?',
    answer:
      'Otrzymujesz pisemne podsumowanie indywidualnego planu działania, zestaw kroków do wdrożenia w domu oraz ustalony kontakt do oceny postępów.',
  },
] as const

export const metadata: Metadata = buildMarketingMetadata({
  title: 'Pełna konsultacja',
  path: '/konsultacja',
  description:
    'Pełna konsultacja behawioralna dla psów i kotów: około 90 minut, szersza analiza sytuacji i plan działania. Dostęp po wcześniejszej rozmowie i indywidualnym kodzie.',
})

export default async function ConsultationPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const rawCode = params?.code
  const accessCode = (Array.isArray(rawCode) ? rawCode[0] : rawCode)?.trim() ?? ''

  // Earlier private invitations opened this public explanation URL. Keep those
  // links working while removing the public code-entry form.
  if (accessCode) {
    redirect(`/konsultacja/rezerwacja?code=${encodeURIComponent(accessCode)}`)
  }

  return (
    <NotatnikPageShell
      tag="Dalszy etap"
      navItems={PUBLIC_SITE_NAV_ITEMS}
      ctaHref="/zapytaj#formularz"
      ctaLabel="Zapytaj · 79 zł"
      footerPrimaryHref="/zapytaj#formularz"
      footerPrimaryLabel="Zapytaj behawiorystę – 79 zł"
      showSideVisuals={false}
      pageClassName="canonical-service-page consultation-page"
      shellClassName="canonical-service-shell"
      footerVariant="home"
      showFooterReviews={false}
      topbarProfile="flow"
    >
      <Schema
        data={[
          getBreadcrumbJsonLd([
            { name: 'Strona główna', path: '/' },
            { name: 'Pełna konsultacja', path: '/konsultacja' },
          ]),
          getServiceJsonLd({
            name: PUBLIC_FULL_CONSULTATION_OFFER.name,
            description: PUBLIC_FULL_CONSULTATION_OFFER.summary,
            serviceUrl: '/konsultacja',
            offerPrice: PUBLIC_FULL_CONSULTATION_OFFER.pricePln,
          }),
          getFaqPageJsonLd([...CONSULTATION_FAQ_ITEMS]),
        ]}
      />

      <section className="canonical-service-hero" aria-labelledby="consultation-title">
        <div className="canonical-service-hero-copy">
          <span className="zapytaj-kicker">DLA SPRAW, KTÓRE WYMAGAJĄ SZERSZEGO KONTEKSTU</span>
          <h1 id="consultation-title">Pełna konsultacja</h1>
          <p className="canonical-service-lead">
            To spokojniejszy, pełny proces: przyglądamy się historii zachowania, codziennym warunkom i temu, co
            może utrzymywać problem. Potem układamy plan działania możliwy do wdrożenia w Twoim domu.
          </p>

          <div className="offer-facts" aria-label="Najważniejsze informacje">
            <div className="offer-fact">
              <span className="offer-fact__icon"><Clock3 aria-hidden="true" /></span>
              <span>Około 90 minut</span>
            </div>
            <div className="offer-fact">
              <span className="offer-fact__icon"><WalletCards aria-hidden="true" /></span>
              <span>{formatPublicOfferPrice(PUBLIC_FULL_CONSULTATION_OFFER.pricePln)}</span>
            </div>
            <div className="offer-fact">
              <span className="offer-fact__icon"><Video aria-hidden="true" /></span>
              <span>Spotkanie online</span>
            </div>
          </div>

          <div className="canonical-service-hero-actions">
            <a href="/zapytaj#formularz" className="notatnik-btn">
              <span>Zacznij od Zapytaj — 79 zł</span>
              <ArrowRight size={17} strokeWidth={1.9} aria-hidden="true" />
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
              Spotkanie online na żywo z kamerą
              <span className="homepage-hero-proof-dot" aria-hidden="true">·</span>
              <Link href="/opinie" className="homepage-hero-proof-link">Zobacz opinie opiekunów</Link>
            </p>
          </div>
        </div>

        <figure className="canonical-service-hero-art canonical-service-photo">
          <Image
            src="/branding/section-heroes/consultation-home-style-v2.png"
            alt="Opiekunka podczas spokojnej konsultacji online z behawiorystą, z psem przy boku"
            fill
            priority
            sizes="(max-width: 980px) 92vw, 38vw"
          />
        </figure>
      </section>

      <section className="canonical-service-explanation consultation-process-section" id="jak-dostac-termin" aria-labelledby="consultation-access-title">
        <div className="canonical-service-heading">
          <span className="zapytaj-kicker">JAK ROZPOCZĄĆ</span>
          <h2 id="consultation-access-title">Pełna konsultacja zaczyna się po pierwszej rozmowie</h2>
          <p>
            Nie sprzedaję długiego procesu w ciemno. Podczas krótkiej rozmowy sprawdzam, czy pełna konsultacja
            ma sens i jaki zakres będzie uczciwy. Jeśli ją rekomenduję, otrzymujesz dedykowany link do kalendarza.
          </p>
        </div>

        <div className="canonical-service-steps steps-editorial">
          <article className="step-editorial-item">
            <div className="consultation-step-top">
              <span className="consultation-step-icon" aria-hidden="true"><MessageSquareText size={22} /></span>
              <span className="step-editorial-num">01</span>
            </div>
            <div>
              <h3>Zapytaj behawiorystę</h3>
              <p>Krótka, wstępna rozmowa (79 zł) pozwala ocenić problem i ustalić, czy potrzebny jest pełny proces.</p>
            </div>
          </article>
          <article className="step-editorial-item">
            <div className="consultation-step-top">
              <span className="consultation-step-icon" aria-hidden="true"><CalendarDays size={22} /></span>
              <span className="step-editorial-num">02</span>
            </div>
            <div>
              <h3>Link do rezerwacji w aplikacji</h3>
              <p>Gdy rekomenduję konsultację, otrzymujesz indywidualny link do dostępnych terminów.</p>
            </div>
          </article>
          <article className="step-editorial-item">
            <div className="consultation-step-top">
              <span className="consultation-step-icon" aria-hidden="true"><Video size={22} /></span>
              <span className="step-editorial-num">03</span>
            </div>
            <div>
              <h3>Rezerwacja i plan działania</h3>
              <p>Wybierasz dogodny termin, opłacasz konsultację (475 zł) i otrzymujesz wytyczne do przygotowania.</p>
            </div>
          </article>
        </div>
      </section>

      <section className="canonical-service-explanation consultation-value-section consultation-care-section" aria-labelledby="consultation-value-title">
        <div className="canonical-service-heading">
          <span className="zapytaj-kicker">CO OBEJMUJE PROCES</span>
          <h2 id="consultation-value-title">Czas na kontekst, plan i spokojną decyzję</h2>
          <p>Dłuższe spotkanie to przestrzeń na dokładne zrozumienie przyczyn zachowania Twojego psa lub kota.</p>
        </div>
        <div className="consultation-value-grid">
          <article className="consultation-value-card">
            <span className="consultation-value-icon" aria-hidden="true"><Clock3 size={20} /></span>
            <h3>Około 90 minut rozmowy</h3>
            <p>Spokojny czas na omówienie historii psa lub kota bez presji zegarka i powierzchownych rad.</p>
          </article>
          <article className="consultation-value-card">
            <span className="consultation-value-icon" aria-hidden="true"><Layers size={20} /></span>
            <h3>Analiza zachowania i domu</h3>
            <p>Przeglądamy nagrania wideo, codzienne nawyki domowników i wyzwalacze emocji zwierzęcia.</p>
          </article>
          <article className="consultation-value-card">
            <span className="consultation-value-icon" aria-hidden="true"><Compass size={20} /></span>
            <h3>Plan możliwy do wdrożenia</h3>
            <p>Konkretne ćwiczenia i zmiany w środowisku, dobrane do Twojego trybu życia i możliwości.</p>
          </article>
          <article className="consultation-value-card">
            <span className="consultation-value-icon" aria-hidden="true"><MessageSquareText size={20} /></span>
            <h3>Ustalony kontakt po spotkaniu</h3>
            <p>Sprawdzamy reakcję zwierzęcia na pierwsze zmiany i w razie potrzeby korygujemy wybrane kroki.</p>
          </article>
        </div>
      </section>

      <section className="canonical-service-explanation consultation-faq-section" aria-labelledby="consultation-faq-title">
        <div className="canonical-service-heading">
          <span className="zapytaj-kicker">NAJCZĘSTSZE PYTANIA</span>
          <h2 id="consultation-faq-title">Pytania o pełną konsultację</h2>
        </div>
        <div className="zapytaj-faq-list" style={{ maxWidth: '820px', margin: '0 auto', textAlign: 'left' }}>
          {CONSULTATION_FAQ_ITEMS.map((item) => (
            <details key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="canonical-service-note consultation-contact-note" aria-label="Pierwszy krok">
        <strong>Jeśli dopiero szukasz pierwszego kontaktu</strong>
        <p>Nie musisz od razu rezerwować 90-minutowego spotkania. Zacznij od krótkiej rozmowy telefonicznej.</p>
        <div className="consultation-contact-facts" aria-label="Informacje o pierwszej rozmowie">
          <span><PhoneCall size={17} aria-hidden="true" /> Telefonicznie</span>
          <span><Clock3 size={17} aria-hidden="true" /> Do 15 minut</span>
        </div>
        <a href="/zapytaj#formularz" className="notatnik-btn">
          <span>Zapytaj behawiorystę — 79 zł</span>
          <ArrowRight size={16} aria-hidden="true" />
        </a>
        <div className="consultation-contact-photo">
          <Image
            src="/branding/section-heroes/consultation-first-contact.png"
            alt="Kobieta rozmawia przez telefon, a obok spokojnie odpoczywa jej pies"
            width={1024}
            height={1024}
            sizes="(max-width: 760px) 100vw, 42vw"
          />
        </div>
      </section>
    </NotatnikPageShell>
  )
}
