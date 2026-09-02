import { ArrowRight, Check, Clock3 } from 'lucide-react'
import { NotatnikPageShell, PUBLIC_SITE_NAV_ITEMS } from '@/components/NotatnikA'
import { ZapytajIntakeForm } from '@/components/ZapytajIntakeForm'
import { buildTechnicalMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export function generateMetadata() {
  return buildTechnicalMetadata({
    title: 'Zapytaj behawiorystę — oferta grupowa',
    path: '/zapytaj/promocja',
    description: 'Jednorazowa oferta grupowa na krótką rozmowę z behawiorystą.',
    noIndex: true,
    follow: false,
  })
}

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? ''
}

export default async function CommunityPromotionPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const searchParams = await props.searchParams
  const initialPromotionCode = readParam(searchParams?.kod ?? searchParams?.code).trim().toUpperCase()

  return (
    <NotatnikPageShell
      tag="Oferta grupowa"
      navItems={PUBLIC_SITE_NAV_ITEMS}
      ctaHref="#formularz"
      ctaLabel="Zapytaj za 39,99 zł"
      footerPrimaryHref="#formularz"
      footerPrimaryLabel="Skorzystaj z oferty"
      showSideVisuals={false}
      pageClassName="zapytaj-page zapytaj-promotion-page"
      shellClassName="zapytaj-shell"
      footerVariant="home"
      showFooterReviews={false}
      topbarProfile="flow"
    >
      <section className="zapytaj-hero" aria-labelledby="zapytaj-promotion-title">
        <div className="zapytaj-hero-copy">
          <span className="zapytaj-kicker">OFERTA DLA GRUPY</span>
          <h1 id="zapytaj-promotion-title">
            Masz pytanie o zachowanie psa lub kota? <em>Zapytaj behawiorystę.</em>
          </h1>
          <p className="zapytaj-hero-lead">
            To ta sama krótka, płatna rozmowa, tylko z jednorazowym kodem otrzymanym w grupie. Opowiesz, co się dzieje,
            a ja pomogę uporządkować pierwszy krok.
          </p>
          <div className="zapytaj-hero-price">
            <Clock3 size={21} strokeWidth={1.7} aria-hidden="true" />
            <div>
              <strong>Do 15 minut · 39,99 zł</strong>
              <span>Oferta ważna do wyczerpania kodów kampanii.</span>
            </div>
          </div>
          <div className="zapytaj-hero-actions">
            <a href="#formularz" className="notatnik-btn">
              Wpisz opis i kod <ArrowRight size={17} strokeWidth={1.9} aria-hidden="true" />
            </a>
          </div>
        </div>

        <div className="zapytaj-promotion-note" role="note">
          <span className="zapytaj-kicker">WAŻNE</span>
          <h2>Co obejmuje oferta?</h2>
          <ul>
            <li><Check size={17} aria-hidden="true" /> jedna rozmowa telefoniczna w wybranym terminie</li>
            <li><Check size={17} aria-hidden="true" /> pierwszy konkretny kierunek po opisaniu sytuacji</li>
            <li><Check size={17} aria-hidden="true" /> dwa krótkie pytania po rozmowie, na początek</li>
          </ul>
          <p>Kod jest jednorazowy, przypisany do jednej osoby przez adres e-mail i nie łączy się z opcją „Zapytaj teraz”.</p>
        </div>
      </section>

      <section className="zapytaj-intake-section" id="formularz" aria-labelledby="zapytaj-promotion-form-title">
        <div className="zapytaj-intake-copy">
          <span className="zapytaj-kicker">ZACZNIJ OD OPISU</span>
          <h2 id="zapytaj-promotion-form-title">Opowiedz po swojemu</h2>
          <p>Nie musisz znać nazwy problemu ani rasy. Wystarczy opis codziennej sytuacji, kod z grupy i wybór terminu.</p>
        </div>
        <div className="zapytaj-form-card">
          <div className="zapytaj-form-card-head">
            <div>
              <span className="zapytaj-form-card-kicker">FORMULARZ OFERTY GRUPOWEJ</span>
              <h3>Rozmowa w zwykłym terminie</h3>
            </div>
            <strong>39,99 zł</strong>
          </div>
          <ZapytajIntakeForm promotionMode initialPromotionCode={initialPromotionCode} />
        </div>
      </section>
    </NotatnikPageShell>
  )
}
