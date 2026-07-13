import Link from 'next/link'
import { buildBookHref, type BookingSpecies } from '@/lib/booking-routing'
import { COPY_CTA, COPY_HELPERS, COPY_SERVICE_NAMES } from '@/lib/copy-governance'
import { formatPricePln } from '@/lib/pricing'
import {
  PUBLIC_OFFER_BOOKING_LEAD,
  PUBLIC_OFFER_BOOKING_REASSURANCE,
  PUBLIC_OFFER_FULL_CONSULTATION_VALUE,
  PUBLIC_OFFER_PRIORITY_VARIANT_NOTE,
  PUBLIC_OFFER_PRICES,
} from '@/lib/public-offer-copy'

type OfferEntrySectionProps = {
  species?: BookingSpecies | null
  sectionId?: string
  eyebrow?: string
  title?: string
  description?: string
}

function getSpeciesLabel(species?: BookingSpecies | null) {
  if (species === 'pies') {
    return 'psa'
  }

  if (species === 'kot') {
    return 'kota'
  }

  return 'psa lub kota'
}

function getAudioDescription(species?: BookingSpecies | null) {
  if (species === 'pies') {
    return `${COPY_SERVICE_NAMES.primary} to najprostszy start dla opiekuna psa, gdy chcesz omówić jedno pytanie albo spokojnie ustalić, od czego zacząć.`
  }

  if (species === 'kot') {
    return `${COPY_SERVICE_NAMES.primary} to najprostszy start dla opiekuna kota, gdy chcesz uporządkować temat i sprawdzić najlepszy pierwszy krok.`
  }

  return `${COPY_SERVICE_NAMES.primary} to najprostszy start dla opiekuna psa lub kota, gdy chcesz uporządkować jeden temat i ruszyć z właściwego miejsca.`
}

function getFullConsultationDescription(species?: BookingSpecies | null) {
  if (species === 'pies') {
    return 'Około 2h online dla psa przy temacie bardziej złożonym, dłużej trwającym albo obejmującym kilka wątków.'
  }

  if (species === 'kot') {
    return 'Około 2h online dla kota przy temacie szerszym, dłużej trwającym albo obejmującym kilka obszarów naraz.'
  }

  return 'Około 2h online dla sytuacji bardziej złożonych, dłużej trwających albo wielowątkowych.'
}

export function OfferEntrySection({
  species = null,
  sectionId,
  eyebrow = 'Oferta',
  title = 'Trzy główne rozmowy: Kwadrans, Dwa kwadranse i Pełna konsultacja.',
  description = PUBLIC_OFFER_BOOKING_LEAD,
}: OfferEntrySectionProps) {
  const audioHref = buildBookHref(null, 'szybka-konsultacja-15-min', false, species)
  const bridgeHref = buildBookHref(null, 'konsultacja-30-min', false, species)
  const fullConsultationHref = buildBookHref(null, 'konsultacja-behawioralna-online', false, species)
  const messageHref = species ? `/kontakt?species=${species}#formularz` : '/kontakt#formularz'
  const speciesLabel = getSpeciesLabel(species)

  return (
    <section className="panel section-panel editorial-section" id={sectionId}>
      <div className="editorial-section-head">
        <div className="editorial-section-head-copy">
          <div className="section-eyebrow">{eyebrow}</div>
          <h2>{title}</h2>
        </div>
        <p className="editorial-section-lead">{description}</p>
      </div>

      <div className="hero-actions editorial-final-actions top-gap-small">
        <Link href={audioHref} prefetch={false} className="button button-primary big-button">
          {COPY_CTA.primary}
        </Link>
        <Link href="/cennik" prefetch={false} className="prep-inline-link">
          Zobacz cennik
        </Link>
      </div>

      <div className="card-grid three-up top-gap">
        <article className="summary-card tree-backed-card">
          <div className="section-eyebrow">{COPY_SERVICE_NAMES.primary}</div>
          <h3>{COPY_SERVICE_NAMES.primary}</h3>
          <p>{getAudioDescription(species)}</p>
          <div className="editorial-hero-meta" aria-label="Parametry usługi">
            {/* Kwadrans zostaje nazwą usługi, a format idzie w descriptorze. */}
            <span>{COPY_SERVICE_NAMES.primaryDescriptor}</span>
            <span>{formatPricePln(PUBLIC_OFFER_PRICES.quick)}</span>
            <span>69 zł / 15 min</span>
          </div>
          <p className="muted">Dla {speciesLabel}, gdy temat jest jeden albo chcesz spokojnie ustalić kierunek bez przechodzenia od razu do dłuższej konsultacji.</p>
          <p className="muted">{PUBLIC_OFFER_PRIORITY_VARIANT_NOTE}</p>
          <div className="hero-actions top-gap-small">
            <Link href={audioHref} prefetch={false} className="button button-primary">
              {COPY_CTA.primary}
            </Link>
          </div>
        </article>

        <article className="summary-card tree-backed-card">
          <div className="section-eyebrow">{COPY_SERVICE_NAMES.bridge}</div>
          <h3>{COPY_SERVICE_NAMES.bridge}</h3>
          <p>Format dla tematów szerszych, gdy 15 minut to za mało, ale pełna konsultacja byłaby jeszcze zbyt szerokim startem.</p>
          <div className="editorial-hero-meta" aria-label="Parametry usługi pośredniej">
            <span>30 min online</span>
            <span>{formatPricePln(PUBLIC_OFFER_PRICES.bridge)}</span>
            <span>szerszy zakres</span>
          </div>
          <p className="muted">Dla {speciesLabel}, gdy chcesz uporządkować 2-3 wątki i po rozmowie dostać krótką notatkę.</p>
          <div className="hero-actions top-gap-small">
            <Link href={bridgeHref} prefetch={false} className="button button-ghost">
              {COPY_CTA.bridge}
            </Link>
          </div>
        </article>

        <article className="summary-card tree-backed-card">
          <div className="section-eyebrow">Pełna konsultacja</div>
          <h3>Pełna konsultacja behawioralna</h3>
          <p>{getFullConsultationDescription(species)} Dostajesz analizę zachowania, prawdopodobną przyczynę problemu, plan działania i 14 dni komunikacji w pokoju klienta przy wdrażaniu zaleceń.</p>
          <div className="editorial-hero-meta" aria-label="Parametry usługi">
            <span>ok. 2h online</span>
            <span>{formatPricePln(PUBLIC_OFFER_PRICES.premium)}</span>
            <span>plan + 14 dni w pokoju klienta</span>
          </div>
          <p className="muted">Dla {speciesLabel}, gdy sytuacja trwa dłużej, wraca albo obejmuje kilka obszarów naraz.</p>
          <p className="muted">{PUBLIC_OFFER_FULL_CONSULTATION_VALUE}</p>
          <div className="hero-actions top-gap-small">
            <Link href={fullConsultationHref} prefetch={false} className="button button-ghost">
              {COPY_CTA.consultation}
            </Link>
          </div>
        </article>
      </div>

      <p className="muted top-gap-small">
        {COPY_HELPERS.startFromAudio}{' '}
        <Link href={messageHref} prefetch={false} className="prep-inline-link">
          {COPY_CTA.contact.toLowerCase()}
        </Link>{' '}
        pomaga wtedy, gdy chcesz tylko krótko doprecyzować temat. Jeśli wolisz najpierw materiały, możesz przejść do materiałów PDF.
      </p>
      <p className="muted top-gap-small">{PUBLIC_OFFER_BOOKING_REASSURANCE}</p>
    </section>
  )
}

