import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { NotatnikFinalCta, NotatnikPageShell, NotatnikSectionHead, PUBLIC_SITE_NAV_ITEMS } from '@/components/NotatnikA'
import { RegulskiWebHero } from '@/components/RegulskiWebHero'
import { buildBookHref } from '@/lib/booking-routing'
import { buildMarketingMetadata } from '@/lib/seo'
import { PUBLIC_OFFER_PRICE_LABELS } from '@/lib/public-offer-copy'
import {
  PRICE_LABEL,
  categoryLabel,
  getMaterialyGuideCoverSrc,
  getMaterialyGuidePreviewSrcs,
  listPublishedMaterialyGuides,
  type MaterialyGuide,
} from '@/lib/materialy-catalog'

export const metadata: Metadata = buildMarketingMetadata({
  title: 'Materiały PDF do pobrania',
  path: '/materialy',
  description:
    'Praktyczne materiały PDF dla opiekunów psów i kotów: obserwacja zachowań, napięcie, zostawanie samemu i przygotowanie do konsultacji.',
})

const quickHref = buildBookHref(null, 'szybka-konsultacja-15-min', false)
const quickPriceLabel = PUBLIC_OFFER_PRICE_LABELS.quick

function MaterialyGuideCard({ guide }: { guide: MaterialyGuide }) {
  const coverSrc = getMaterialyGuideCoverSrc(guide)
  const previews = getMaterialyGuidePreviewSrcs(guide, 2)
  const detailHref = `/materialy/${guide.slug}`
  const ctaLabel = guide.priceCode === 'free' ? 'Zobacz i pobierz PDF' : 'Zobacz PDF'

  return (
    <article className="notatnik-material-card notatnik-material-card-with-cover">
      <Link href={detailHref} prefetch={false} className="notatnik-material-cover-link" aria-label={`Zobacz PDF: ${guide.title}`}>
        <span className="notatnik-material-cover-frame">
          <Image
            src={coverSrc}
            alt={`Okładka PDF: ${guide.title}`}
            fill
            sizes="(max-width: 760px) 58vw, (max-width: 1100px) 24vw, 180px"
            className="notatnik-material-cover-image"
            unoptimized
          />
        </span>
      </Link>

      <div className="notatnik-material-tag notatnik-mono">
        {categoryLabel(guide.category)} · {PRICE_LABEL[guide.priceCode]}
      </div>
      <h3>{guide.title}</h3>
      <p style={{ minHeight: '3.7em' }}>{guide.subtitle}</p>

      <div className="notatnik-material-preview-strip" aria-label={`Podgląd PDF: ${guide.title}`}>
        {previews.map((src, index) => (
          <span key={src} className="notatnik-material-preview-thumb">
            <Image
              src={src}
              alt={`Podgląd strony ${index + 1}: ${guide.title}`}
              fill
              sizes="72px"
              className="notatnik-material-preview-image"
              unoptimized
            />
          </span>
        ))}
      </div>

      <ul style={{ margin: '10px 0 14px', padding: '0 0 0 16px', fontSize: '13px', color: 'var(--ink-quiet)' }}>
        {guide.highlights.map((highlight) => (
          <li key={highlight}>{highlight}</li>
        ))}
      </ul>

      <Link href={detailHref} prefetch={false}>
        {ctaLabel} &rarr;
      </Link>
    </article>
  )
}

export default function MaterialyLandingPage() {
  const guides = listPublishedMaterialyGuides()
  const freeGuides = guides.filter((guide) => guide.priceCode === 'free')
  const p19Guides = guides.filter((guide) => guide.priceCode === 'p19')

  return (
    <NotatnikPageShell
      tag="Materiały / PDF"
      navItems={PUBLIC_SITE_NAV_ITEMS}
      ctaHref={quickHref}
      ctaLabel={`Kwadrans / ${quickPriceLabel}`}
      footerPrimaryHref={quickHref}
      footerPrimaryLabel="Kwadrans z behawiorystą"
      sideVisualVariant="materials"
      pageClassName="homepage-shell materialy-page"
      shellClassName="homepage-main materialy-shell"
    >
      <section className="notatnik-subhero materialy-home-hero compact-home-section">
        <div>
          <div className="notatnik-subhero-tag notatnik-mono">Materiały PDF</div>
          <h1>
            Materiały PDF dla opiekunów psów i kotów. <em>Praktyczne wsparcie przed rozmową i na co dzień.</em>
          </h1>
          <p>
            Wybierz bezpłatny poradnik albo rozszerzony materiał za 19 zł. Każdy PDF ma własną stronę z opisem,
            podglądem wnętrza i prostym formularzem pobrania lub zamówienia.
          </p>
          <div className="notatnik-subhero-actions">
            <Link href="#bezplatne" prefetch={false} className="notatnik-btn">
              <span>Bezpłatne PDF-y</span>
              <span className="notatnik-btn-arrow" aria-hidden="true">
                &rarr;
              </span>
            </Link>
            <Link href="#p19" prefetch={false} className="notatnik-btn notatnik-btn-ghost">
              <span>PDF-y po 19 zł</span>
            </Link>
          </div>
        </div>

        <div className="summary-card tree-backed-card regulski-web-summary-card materialy-home-sidecard">
          <RegulskiWebHero variant="materialy" priority />
          <div className="section-eyebrow">Dostęp</div>
          <h3>Podgląd, pobranie i bezpieczny powrót do pliku</h3>
          <p>
            Bezpłatny PDF pobierzesz po wpisaniu e-maila. Przy materiale za 19 zł przejdziesz do płatności,
            a po jej potwierdzeniu otrzymasz dostęp do pliku.
          </p>
        </div>
      </section>

      <section id="bezplatne" className="compact-home-section materialy-home-section">
        <NotatnikSectionHead index="I." kicker="Bezpłatne" title="10 krótkich PDF-ów na konkretne sytuacje." />
        <p style={{ maxWidth: '720px', color: 'var(--ink-quiet)' }}>
          Materiały dla opiekunów psów i kotów. Każdy możesz przejrzeć i pobrać bez płatności.
        </p>
        <div className="notatnik-material-grid top-gap-small">
          {freeGuides.map((guide) => (
            <MaterialyGuideCard key={guide.slug} guide={guide} />
          ))}
        </div>
      </section>

      <section id="p19" className="compact-home-section materialy-home-section materialy-home-section-alt">
        <NotatnikSectionHead index="II." kicker="19 zł" title="10 rozszerzonych planów pierwszego działania." />
        <p style={{ maxWidth: '720px', color: 'var(--ink-quiet)' }}>
          Konkretne materiały o samotności, spacerach, gościach, zasobach, kuwecie, napięciu i relacjach między kotami.
        </p>
        <div className="notatnik-material-grid top-gap-small">
          {p19Guides.map((guide) => (
            <MaterialyGuideCard key={guide.slug} guide={guide} />
          ))}
        </div>
      </section>

      <section id="jak-to-dziala" className="compact-home-section materialy-home-section">
        <NotatnikSectionHead index="III." kicker="Jak to działa" title="Pobranie w 3 krokach." />
        <div className="notatnik-steps">
          <article className="notatnik-step">
            <div className="notatnik-step-number">01</div>
            <p>Otwierasz stronę wybranego PDF-u i sprawdzasz opis oraz podgląd jego wnętrza.</p>
          </article>
          <article className="notatnik-step">
            <div className="notatnik-step-number">02</div>
            <p>Przy bezpłatnym materiale wpisujesz e-mail. Przy PDF-ie za 19 zł uzupełniasz formularz i przechodzisz do płatności.</p>
          </article>
          <article className="notatnik-step">
            <div className="notatnik-step-number">03</div>
            <p>Bezpłatny plik pobiera się od razu. Po płatności dostajesz kod do pokoju, z którego pobierzesz kupiony PDF.</p>
          </article>
        </div>
      </section>

      <NotatnikFinalCta
        title="Jeśli materiał nie wystarczy, <em>Kwadrans porządkuje temat w 15 minut.</em>"
        copy="PDF jest dobry jako spokojny start. Gdy objaw wraca albo łączy się z innymi wątkami, rozmowa szybciej ustawia priorytet."
        primaryHref={quickHref}
        primaryLabel={`Umów spokojny pierwszy krok / ${quickPriceLabel}`}
      />
    </NotatnikPageShell>
  )
}
