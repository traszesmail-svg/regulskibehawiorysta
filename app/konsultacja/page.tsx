import type { Metadata } from 'next'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { Schema } from '@/components/schema'
import { NotatnikPageShell, PUBLIC_SITE_NAV_ITEMS } from '@/components/NotatnikA'
import { getBreadcrumbJsonLd, getServiceJsonLd } from '@/lib/schema'
import { buildMarketingMetadata } from '@/lib/seo'
import { PUBLIC_FULL_CONSULTATION_OFFER, formatPublicOfferPrice } from '@/lib/public-offer'
import { SPECIALIST_ONLINE_PHOTO } from '@/lib/site'
import { getConsultationAccessByCode } from '@/lib/server/db'

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
  const accessBooking = accessCode ? await getConsultationAccessByCode(accessCode) : null

  return (
    <NotatnikPageShell
      tag="Dalszy etap"
      navItems={PUBLIC_SITE_NAV_ITEMS}
      ctaHref="/zapytaj#formularz"
      ctaLabel="Najpierw zapytaj"
      footerPrimaryHref="/zapytaj#formularz"
      footerPrimaryLabel="Zapytaj behawiorystę"
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
        ]}
      />

      <section className="canonical-service-hero" aria-labelledby="consultation-title">
        <div>
          <span className="zapytaj-kicker">DLA SPRAW, KTÓRE WYMAGAJĄ SZERSZEGO KONTEKSTU</span>
          <h1 id="consultation-title">Pełna konsultacja</h1>
          <p>
            To spokojniejszy, pełny proces: przyglądamy się historii zachowania, codziennym warunkom i temu, co
            może utrzymywać problem. Potem układamy plan działania możliwy do wdrożenia w Twoim domu.
          </p>
          <div className="canonical-service-price">
            <strong>{formatPublicOfferPrice(PUBLIC_FULL_CONSULTATION_OFFER.pricePln)}</strong>
            <span>· {PUBLIC_FULL_CONSULTATION_OFFER.durationLabel}</span>
          </div>
          <a href="/zapytaj#formularz" className="notatnik-btn">
            Zacznij od Zapytaj <ArrowRight size={17} aria-hidden="true" />
          </a>
        </div>
        <figure className="canonical-service-hero-art canonical-service-photo">
          <Image
            src={SPECIALIST_ONLINE_PHOTO.src}
            alt="Pies i kot odpoczywają spokojnie w domowym otoczeniu"
            fill
            priority
            sizes="(max-width: 980px) 92vw, 34vw"
          />
          <figcaption>
            <strong>Najpierw rozumienie sytuacji.</strong>
            <small>Potem decyzja o dalszej pracy.</small>
          </figcaption>
        </figure>
      </section>

      <section className="canonical-service-explanation" aria-labelledby="consultation-access-title">
        <div className="canonical-service-heading">
          <span className="zapytaj-kicker">JAK DOSTAĆ TERMIN?</span>
          <h2 id="consultation-access-title">Pełna konsultacja zaczyna się po pierwszej rozmowie</h2>
          <p>
            Nie chcę sprzedawać długiego procesu w ciemno. Po usłyszeniu Twojej sytuacji mówię, czy pełna konsultacja
            ma sens i jaki zakres będzie uczciwy. Jeśli ją rekomenduję, wysyłam Ci osobny link do dostępnych terminów.
            Konsultacja jest osobną usługą i jest opłacana przy rezerwacji.
          </p>
        </div>
        <div className="canonical-service-steps">
          <article>
            <h3>1. Zapytaj</h3>
            <p>Płacisz osobno za krótką rozmowę i pierwszy kierunek.</p>
          </article>
          <article>
            <h3>2. Otrzymujesz link</h3>
            <p>Po rozmowie wysyłam link do terminów, jeśli pełna konsultacja jest właściwym krokiem.</p>
          </article>
          <article>
            <h3>3. Rezerwujesz termin</h3>
            <p>Wybierasz termin i opłacasz pełną konsultację — 475 zł.</p>
          </article>
        </div>
      </section>

      <section className="canonical-service-value" aria-labelledby="consultation-value-title">
        <span className="zapytaj-kicker">CO OBEJMUJE PROCES</span>
        <h2 id="consultation-value-title">Czas na kontekst, plan i decyzję</h2>
        <div className="canonical-service-value-grid">
          <p>około 90 minut rozmowy online</p>
          <p>analiza informacji o zachowaniu i środowisku</p>
          <p>plan działania dopasowany do sytuacji</p>
          <p>ustalone wsparcie po konsultacji</p>
        </div>
      </section>

      <section className="canonical-service-access" aria-labelledby="consultation-access-form-title">
        <div className="canonical-service-heading">
          <span className="zapytaj-kicker">DOSTĘP PO ROZMOWIE</span>
          <h2 id="consultation-access-form-title">Masz zaproszenie od behawiorysty?</h2>
          <p>
            Jeśli po rozmowie otrzymałeś kod zaproszenia, wpisz go tutaj. Przejdziesz wtedy do dostępnych terminów pełnej konsultacji.
          </p>
        </div>
        {accessBooking ? (
          <div className="canonical-service-access-confirmed">
            <p>
              Kod jest aktywny dla adresu <strong>{accessBooking.email}</strong>. Możesz przejść do wyboru terminu.
            </p>
            <a
              href={`/konsultacja/rezerwacja?code=${encodeURIComponent(accessCode)}`}
              className="notatnik-btn"
            >
              Wybierz termin konsultacji <ArrowRight size={17} aria-hidden="true" />
            </a>
          </div>
        ) : (
          <form action="/konsultacja/rezerwacja" method="get" className="canonical-service-access-form">
            <label htmlFor="consultation-access-code">Kod zaproszenia</label>
            <div>
              <input
                id="consultation-access-code"
                name="code"
                placeholder="np. RB-AB12CD34EF"
                autoComplete="one-time-code"
                required
              />
              <button type="submit" className="notatnik-btn">
                Sprawdź kod <ArrowRight size={17} aria-hidden="true" />
              </button>
            </div>
            {accessCode ? <p className="form-error">Ten kod jest nieprawidłowy, wykorzystany albo wygasł.</p> : null}
          </form>
        )}
      </section>
    </NotatnikPageShell>
  )
}
