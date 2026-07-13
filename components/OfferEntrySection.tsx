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
    return `${COPY_SERVICE_NAMES.primary} to najprostszy start dla opiekuna psa, gdy chcesz omĂłwiÄ‡ jedno pytanie albo spokojnie ustaliÄ‡, od czego zaczÄ…Ä‡.`
  }

  if (species === 'kot') {
    return `${COPY_SERVICE_NAMES.primary} to najprostszy start dla opiekuna kota, gdy chcesz uporzÄ…dkowaÄ‡ temat i sprawdziÄ‡ najlepszy pierwszy krok.`
  }

  return `${COPY_SERVICE_NAMES.primary} to najprostszy start dla opiekuna psa lub kota, gdy chcesz uporzÄ…dkowaÄ‡ jeden temat i ruszyÄ‡ z wĹ‚aĹ›ciwego miejsca.`
}

function getFullConsultationDescription(species?: BookingSpecies | null) {
  if (species === 'pies') {
    return 'OkoĹ‚o 2h online dla psa przy temacie bardziej zĹ‚oĹĽonym, dĹ‚uĹĽej trwajÄ…cym albo obejmujÄ…cym kilka wÄ…tkĂłw.'
  }

  if (species === 'kot') {
    return 'OkoĹ‚o 2h online dla kota przy temacie szerszym, dĹ‚uĹĽej trwajÄ…cym albo obejmujÄ…cym kilka obszarĂłw naraz.'
  }

  return 'OkoĹ‚o 2h online dla sytuacji bardziej zĹ‚oĹĽonych, dĹ‚uĹĽej trwajÄ…cych albo wielowÄ…tkowych.'
}

export function OfferEntrySection({
  species = null,
  sectionId,
  eyebrow = 'Oferta',
  title = 'Trzy gĹ‚Ăłwne rozmowy: Kwadrans, Dwa kwadranse i PeĹ‚na konsultacja.',
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
          <div className="editorial-hero-meta" aria-label="Parametry usĹ‚ugi">
            {/* Kwadrans zostaje nazwÄ… usĹ‚ugi, a format idzie w descriptorze. */}
            <span>{COPY_SERVICE_NAMES.primaryDescriptor}</span>
            <span>{formatPricePln(PUBLIC_OFFER_PRICES.quick)}</span>
            <span>69 zĹ‚ / 15 min</span>
          </div>
          <p className="muted">Dla {speciesLabel}, gdy temat jest jeden albo chcesz spokojnie ustaliÄ‡ kierunek bez przechodzenia od razu do dĹ‚uĹĽszej konsultacji.</p>
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
          <p>Format dla tematĂłw szerszych, gdy 15 minut to za maĹ‚o, ale peĹ‚na konsultacja byĹ‚aby jeszcze zbyt szerokim startem.</p>
          <div className="editorial-hero-meta" aria-label="Parametry usĹ‚ugi poĹ›redniej">
            <span>30 min online</span>
            <span>{formatPricePln(PUBLIC_OFFER_PRICES.bridge)}</span>
            <span>szerszy zakres</span>
          </div>
          <p className="muted">Dla {speciesLabel}, gdy chcesz uporzÄ…dkowaÄ‡ 2-3 wÄ…tki i po rozmowie dostaÄ‡ krĂłtkÄ… notatkÄ™.</p>
          <div className="hero-actions top-gap-small">
            <Link href={bridgeHref} prefetch={false} className="button button-ghost">
              {COPY_CTA.bridge}
            </Link>
          </div>
        </article>

        <article className="summary-card tree-backed-card">
          <div className="section-eyebrow">PeĹ‚na konsultacja</div>
          <h3>PeĹ‚na konsultacja behawioralna</h3>
          <p>{getFullConsultationDescription(species)} Dostajesz analizÄ™ zachowania, prawdopodobnÄ… przyczynÄ™ problemu, plan dziaĹ‚ania i 14 dni komunikacji w pokoju klienta przy wdraĹĽaniu zaleceĹ„.</p>
          <div className="editorial-hero-meta" aria-label="Parametry usĹ‚ugi">
            <span>ok. 2h online</span>
            <span>{formatPricePln(PUBLIC_OFFER_PRICES.premium)}</span>
            <span>plan + 14 dni w pokoju klienta</span>
          </div>
          <p className="muted">Dla {speciesLabel}, gdy sytuacja trwa dĹ‚uĹĽej, wraca albo obejmuje kilka obszarĂłw naraz.</p>
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
        pomaga wtedy, gdy chcesz tylko krĂłtko doprecyzowaÄ‡ temat. JeĹ›li wolisz najpierw materiaĹ‚y, moĹĽesz przejĹ›Ä‡ do materiaĹ‚Ăłw PDF.
      </p>
      <p className="muted top-gap-small">{PUBLIC_OFFER_BOOKING_REASSURANCE}</p>
    </section>
  )
}

