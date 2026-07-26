import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MaterialyOrderForm } from '@/components/MaterialyOrderForm'
import { NotatnikFinalCta, NotatnikPageShell, NotatnikSectionHead, PUBLIC_SITE_NAV_ITEMS } from '@/components/NotatnikA'
import { buildBookHref } from '@/lib/booking-routing'
import {
  PRICE_AMOUNT_PLN,
  PRICE_LABEL,
  categoryLabel,
  getMaterialyGuideCoverSrc,
  getMaterialyGuidePreviewSrcs,
  getPublishedMaterialyGuideBySlug,
  listPublishedMaterialyGuides,
} from '@/lib/materialy-catalog'
import { PUBLIC_OFFER_PRICE_LABELS } from '@/lib/public-offer-copy'
import { buildMarketingMetadata } from '@/lib/seo'

type MaterialyGuidePageProps = {
  params: Promise<{
    slug: string
  }>
}

const quickHref = buildBookHref(null, 'szybka-konsultacja-15-min', false)
const quickPriceLabel = PUBLIC_OFFER_PRICE_LABELS.quick

export function generateStaticParams() {
  return listPublishedMaterialyGuides().map((guide) => ({ slug: guide.slug }))
}

export async function generateMetadata({ params }: MaterialyGuidePageProps): Promise<Metadata> {
  const { slug } = await params
  const guide = getPublishedMaterialyGuideBySlug(slug)

  if (!guide) return {}

  return buildMarketingMetadata({
    title: `${guide.title} — PDF ${PRICE_LABEL[guide.priceCode]}`,
    path: `/materialy/${guide.slug}`,
    description: `${guide.subtitle}. ${guide.shortPromise}`,
  })
}

export default async function MaterialyGuidePage({ params }: MaterialyGuidePageProps) {
  const { slug } = await params
  const guide = getPublishedMaterialyGuideBySlug(slug)

  if (!guide) {
    notFound()
  }

  const coverSrc = getMaterialyGuideCoverSrc(guide)
  const previews = getMaterialyGuidePreviewSrcs(guide, 3)
  const isFree = guide.priceCode === 'free'

  return (
    <NotatnikPageShell
      tag="Materiały / PDF"
      navItems={PUBLIC_SITE_NAV_ITEMS}
      ctaHref={quickHref}
      ctaLabel={`Kwadrans / ${quickPriceLabel}`}
      footerPrimaryHref="/materialy"
      footerPrimaryLabel="Wróć do wszystkich PDF-ów"
      sideVisualVariant="materials"
      pageClassName="homepage-shell materialy-page materialy-detail-page"
      shellClassName="homepage-main materialy-shell"
    >
      <section className="notatnik-subhero compact-home-section">
        <div>
          <Link href="/materialy" prefetch={false} className="notatnik-inline-link">
            &larr; Wszystkie materiały
          </Link>
          <div className="notatnik-subhero-tag notatnik-mono">
            {categoryLabel(guide.category)} · {PRICE_LABEL[guide.priceCode]}
          </div>
          <h1>
            {guide.title}. <em>{guide.subtitle}</em>
          </h1>
          <p>{guide.shortPromise}</p>
          <p>
            <strong>Dla kogo:</strong> {guide.forWhom}
          </p>
          <ul style={{ margin: '22px 0 0', padding: '0 0 0 20px', color: 'var(--ink-quiet)', lineHeight: 1.75 }}>
            {guide.highlights.map((highlight) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ul>
        </div>

        <aside className="notatnik-material-detail-side">
          <div className="notatnik-material-detail-cover-card">
            <Image
              src={coverSrc}
              alt={`Okładka PDF: ${guide.title}`}
              fill
              priority
              sizes="(max-width: 760px) 82vw, 420px"
              className="notatnik-material-detail-cover-image"
              unoptimized
            />
          </div>
        </aside>
      </section>

      <section className="compact-home-section materialy-home-section materialy-home-section-alt">
        <NotatnikSectionHead index="I." kicker="Podgląd" title="Zajrzyj do środka przed pobraniem." />
        <div className="notatnik-material-preview-grid">
          {previews.map((src, index) => (
            <div key={src} className="notatnik-material-preview-page">
              <Image
                src={src}
                alt={`Podgląd strony ${index + 1}: ${guide.title}`}
                fill
                sizes="(max-width: 760px) 88vw, 29vw"
                className="notatnik-material-preview-image"
                unoptimized
              />
            </div>
          ))}
        </div>
      </section>

      <section id="zamow" className="compact-home-section materialy-home-section">
        <NotatnikSectionHead
          index="II."
          kicker={isFree ? 'Pobranie' : 'Zamówienie'}
          title={isFree ? 'Pobierz bezpłatny PDF.' : 'Zamów PDF za 19 zł.'}
        />
        <p style={{ maxWidth: '760px', color: 'var(--ink-quiet)' }}>
          {isFree
            ? 'Wpisz e-mail. Pobieranie rozpocznie się od razu, a na skrzynkę otrzymasz również zapasowy kod dostępu.'
            : 'Uzupełnij dane, przejdź do płatności i po jej potwierdzeniu pobierz materiał przez bezpieczny pokój dostępu.'}
        </p>
        <div className="top-gap-small">
          <MaterialyOrderForm
            productKind="guide"
            productSlug={guide.slug}
            productTitle={guide.title}
            priceLabel={PRICE_LABEL[guide.priceCode]}
            priceAmount={PRICE_AMOUNT_PLN[guide.priceCode]}
          />
        </div>
      </section>

      <NotatnikFinalCta
        title="Jeśli PDF nie wystarczy, <em>Kwadrans pomoże ustawić następny krok.</em>"
        copy="Materiał porządkuje pierwsze działania. Gdy sytuacja wraca, eskaluje albo dotyczy bezpieczeństwa, krótka rozmowa pomaga dobrać dalsze wsparcie."
        primaryHref={quickHref}
        primaryLabel={`Umów spokojny pierwszy krok / ${quickPriceLabel}`}
      />
    </NotatnikPageShell>
  )
}
