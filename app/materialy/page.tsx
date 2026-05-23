import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { NotatnikFinalCta, NotatnikPageShell, NotatnikSectionHead, PUBLIC_SITE_NAV_ITEMS } from '@/components/NotatnikA'
import { RegulskiWebHero } from '@/components/RegulskiWebHero'
import { buildBookHref } from '@/lib/booking-routing'
import { buildMarketingMetadata } from '@/lib/seo'
import {
  PRICE_LABEL,
  categoryLabel,
  getMaterialyGuideCoverSrc,
  getMaterialyGuidePreviewSrcs,
  listMaterialyGuides,
  type MaterialyGuide,
} from '@/lib/materialy-catalog'

export const metadata: Metadata = buildMarketingMetadata({
  title: 'Materiały PDF do pobrania | Regulski Behawiorysta',
  path: '/materialy',
  description:
    'Praktyczne materiały PDF dla opiekunów psów i kotów: obserwacja zachowań, napięcie, zostawanie samemu i przygotowanie do konsultacji.',
})

const quickHref = buildBookHref(null, 'szybka-konsultacja-15-min', false)

function MaterialyGuideCard({ guide }: { guide: MaterialyGuide }) {
  const coverSrc = getMaterialyGuideCoverSrc(guide)
  const previews = getMaterialyGuidePreviewSrcs(guide, 2)
  const ctaLabel = guide.priceCode === 'free' ? 'Jak pobrać PDF' : 'Zapytaj o PDF'

  return (
    <article className="notatnik-material-card notatnik-material-card-with-cover">
      <span className="notatnik-material-cover-link" aria-label={`Okładka ${guide.title}`}>
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
      </span>

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

      <Link href={guide.priceCode === 'free' ? '/materialy#jak-to-dziala' : '/kontakt#formularz'} prefetch={false}>
        {ctaLabel} &rarr;
      </Link>
    </article>
  )
}

export default function MaterialyLandingPage() {
  const guides = listMaterialyGuides()
  const catGuides = guides.filter((guide) => guide.category === 'cat')
  const dogGuides = guides.filter((guide) => guide.category === 'dog')
  const sharedGuides = guides.filter((guide) => guide.category === 'both')

  return (
    <NotatnikPageShell
      tag="Materiały / PDF"
      navItems={PUBLIC_SITE_NAV_ITEMS}
      ctaHref={quickHref}
      ctaLabel="Kwadrans / 69 zł"
      footerPrimaryHref={quickHref}
      footerPrimaryLabel="Kwadrans z behawiorystą"
      sideVisualVariant="materials"
    >
      <section className="notatnik-subhero">
        <div>
          <div className="notatnik-subhero-tag notatnik-mono">Materiały PDF</div>
          <h1>
            Materiały PDF dla opiekunów psów i kotów. <em>Praktyczne wsparcie przed rozmową i na co dzień.</em>
          </h1>
          <p>
            Wybierz krótki poradnik, zobacz opis i pobierz go po podaniu adresu e-mail. Materiały pomagają
            uporządkować obserwacje przed konsultacją i lepiej nazwać problem.
          </p>
          <div className="notatnik-subhero-actions">
            <Link href="#psy" prefetch={false} className="notatnik-btn">
              <span>Materiały dla psa</span>
              <span className="notatnik-btn-arrow" aria-hidden="true">
                &rarr;
              </span>
            </Link>
            <Link href="#koty" prefetch={false} className="notatnik-btn notatnik-btn-ghost">
              <span>Materiały dla kota</span>
            </Link>
          </div>
        </div>

        <div className="summary-card tree-backed-card regulski-web-summary-card">
          <RegulskiWebHero variant="materialy" priority />
          <div className="section-eyebrow">Dostęp</div>
          <h3>Pobranie przez e-mail i kod dostępu</h3>
          <p>
            Po wpisaniu imienia i e-maila wyślemy kod dostępu. Kod prowadzi do pokoju, w którym pobierzesz
            wybrany PDF.
          </p>
        </div>
      </section>

      {sharedGuides.length > 0 ? (
        <section id="start">
          <NotatnikSectionHead index="I." kicker="Start" title="Najszerszy materiał dla opiekuna psa albo kota." />
          <div className="notatnik-material-grid top-gap-small">
            {sharedGuides.map((guide) => (
              <MaterialyGuideCard key={guide.slug} guide={guide} />
            ))}
          </div>
        </section>
      ) : null}

      <section id="psy" style={{ background: 'var(--paper)' }}>
        <NotatnikSectionHead index="II." kicker="Psy" title="Materiały dla opiekunów psów." />
        <p style={{ maxWidth: '720px', color: 'var(--ink-quiet)' }}>
          Zostawanie samemu, smycz, goście, zasoby, niszczenie w domu, pobudzenie i pierwsze plany pracy ze szczeniakiem.
        </p>
        <div className="notatnik-material-grid top-gap-small">
          {dogGuides.map((guide) => (
            <MaterialyGuideCard key={guide.slug} guide={guide} />
          ))}
        </div>
      </section>

      <section id="koty">
        <NotatnikSectionHead index="III." kicker="Koty" title="Materiały dla opiekunów kotów." />
        <p style={{ maxWidth: '720px', color: 'var(--ink-quiet)' }}>
          Kuweta, napięcie między kotami, nocne i poranne miauczenie, chowanie się po zmianach oraz kontakt z człowiekiem.
        </p>
        <div className="notatnik-material-grid top-gap-small">
          {catGuides.map((guide) => (
            <MaterialyGuideCard key={guide.slug} guide={guide} />
          ))}
        </div>
      </section>

      <section id="jak-to-dziala" style={{ background: 'var(--paper)' }}>
        <NotatnikSectionHead index="IV." kicker="Jak to działa" title="Pobranie w 3 krokach." />
        <div className="notatnik-steps">
          <article className="notatnik-step">
            <div className="notatnik-step-number">01</div>
            <p>Wybierasz PDF i wpisujesz imię oraz e-mail. Przy bezpłatnych materiałach nie przechodzisz przez płatność.</p>
          </article>
          <article className="notatnik-step">
            <div className="notatnik-step-number">02</div>
            <p>System wysyła kod dostępu na e-mail i pokazuje numer zamówienia.</p>
          </article>
          <article className="notatnik-step">
            <div className="notatnik-step-number">03</div>
            <p>Wpisujesz kod na /dostep, przechodzisz do pokoju i pobierasz PDF.</p>
          </article>
        </div>
      </section>

      <NotatnikFinalCta
        title="Jeśli materiał nie wystarczy, <em>Kwadrans porządkuje temat w 15 minut.</em>"
        copy="PDF jest dobry jako spokojny start. Gdy objaw wraca albo łączy się z innymi wątkami, rozmowa szybciej ustawia priorytet."
        primaryHref={quickHref}
        primaryLabel="Umów spokojny pierwszy krok / 69 zł"
      />
    </NotatnikPageShell>
  )
}
