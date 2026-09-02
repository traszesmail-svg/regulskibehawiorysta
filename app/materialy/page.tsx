import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  CloudDownload,
  CreditCard,
  FileText,
  PawPrint,
  ShoppingCart,
} from 'lucide-react'
import { NotatnikPageShell, PUBLIC_SITE_NAV_ITEMS } from '@/components/NotatnikA'
import { buildMarketingMetadata } from '@/lib/seo'
import { PUBLIC_OFFER_PRICE_LABELS } from '@/lib/public-offer-copy'
import {
  PRICE_LABEL,
  categoryLabel,
  getMaterialyGuideCoverSrc,
  listPublishedMaterialyGuides,
  type MaterialyGuide,
} from '@/lib/materialy-catalog'

export const metadata: Metadata = buildMarketingMetadata({
  title: 'Materiały PDF do pobrania',
  path: '/materialy',
  description:
    'Praktyczne materiały PDF dla opiekunów psów i kotów: obserwacja zachowań, napięcie, zostawanie samemu i przygotowanie do konsultacji.',
})

const quickHref = '/zapytaj#formularz'
const quickPriceLabel = PUBLIC_OFFER_PRICE_LABELS.quick

function MaterialyGuideCard({ guide }: { guide: MaterialyGuide }) {
  const detailHref = `/materialy/${guide.slug}`
  const isFree = guide.priceCode === 'free'

  return (
    <article className="materialy-showcase-card">
      <Link
        href={detailHref}
        prefetch={false}
        className="materialy-showcase-card-link"
        aria-label={`Zobacz PDF: ${guide.title}`}
      >
        <span className="materialy-showcase-cover">
          <Image
            src={getMaterialyGuideCoverSrc(guide)}
            alt={`Okładka PDF: ${guide.title}`}
            fill
            sizes="(max-width: 620px) 64vw, (max-width: 1100px) 28vw, 190px"
            className="materialy-showcase-cover-image"
            unoptimized
          />
          <span className={`materialy-showcase-price${isFree ? ' is-free' : ''}`}>
            {PRICE_LABEL[guide.priceCode]}
          </span>
        </span>

        <span className="materialy-showcase-card-copy">
          <span className="materialy-showcase-species">{categoryLabel(guide.category)}</span>
          <strong>{guide.title}</strong>
          <span className="materialy-showcase-promise">{guide.shortPromise}</span>
        </span>

        <span className="materialy-showcase-card-footer">
          <span>{isFree ? 'Bezpłatny PDF' : 'Wymaga wcześniejszej rozmowy'} · {guide.previewPageCount} strony podglądu</span>
          <span className="materialy-showcase-card-action" aria-hidden="true">
            {isFree ? <ArrowDownToLine size={18} strokeWidth={1.8} /> : <ArrowRight size={18} strokeWidth={1.8} />}
          </span>
        </span>
      </Link>
    </article>
  )
}

function MaterialyShelf({
  id,
  eyebrow,
  title,
  copy,
  guides,
  tone = 'light',
}: {
  id: string
  eyebrow: string
  title: string
  copy: string
  guides: MaterialyGuide[]
  tone?: 'light' | 'sage'
}) {
  return (
    <section id={id} className={`materialy-showcase-section materialy-showcase-section-${tone}`}>
      <header className="materialy-showcase-heading">
        <span>{eyebrow}</span>
        <h2>{title}</h2>
        <p>{copy}</p>
        <div className="materialy-showcase-divider" aria-hidden="true">
          <i />
          <PawPrint size={18} strokeWidth={1.6} />
          <i />
        </div>
        <small>
          {guides.filter((guide) => guide.category === 'dog').length} materiałów dla psów ·{' '}
          {guides.filter((guide) => guide.category === 'cat').length} materiałów dla kotów
        </small>
      </header>

      <p className="materialy-showcase-swipe">Przesuń, aby zobaczyć kolejne materiały →</p>
      <div className="materialy-showcase-grid">
        {guides.map((guide) => (
          <MaterialyGuideCard key={guide.slug} guide={guide} />
        ))}
      </div>
    </section>
  )
}

export default function MaterialyLandingPage() {
  const guides = listPublishedMaterialyGuides()
  const freeGuides = guides.filter((guide) => guide.priceCode === 'free')
  const p19Guides = guides.filter((guide) => guide.priceCode === 'p19')
  const featuredGuides = [freeGuides[0], freeGuides[5]].filter(
    (guide): guide is MaterialyGuide => Boolean(guide),
  )

  return (
    <NotatnikPageShell
      tag="Materiały / PDF"
      navItems={PUBLIC_SITE_NAV_ITEMS}
      ctaHref={quickHref}
      ctaLabel={`Zapytaj / ${quickPriceLabel}`}
      footerPrimaryHref={quickHref}
      footerPrimaryLabel="Zapytaj behawiorystę"
      pageClassName="homepage-shell materialy-page materialy-showcase-page"
      shellClassName="homepage-main materialy-shell materialy-showcase-shell"
    >
      <section className="materialy-visual-hero" aria-labelledby="materialy-title">
        <div className="materialy-visual-hero-copy">
          <span className="materialy-visual-kicker">
            <FileText size={16} strokeWidth={1.8} aria-hidden="true" />
            Materiały PDF
          </span>
          <h1 id="materialy-title">Materiały PDF dla opiekunów psów i kotów</h1>
          <p className="materialy-visual-lead">Praktyczne wsparcie przed rozmową i na co dzień.</p>
          <p className="materialy-visual-copy">
            Wybierz bezpłatny materiał na start albo zobacz płatne PDF-y za 19 zł, które dobieram po rozmowie.
            Proste wskazówki, gotowe do wdrożenia wtedy, gdy potrzebujesz spokojnego pierwszego kroku.
          </p>
          <div className="materialy-visual-actions">
            <Link href="#p19" prefetch={false} className="materialy-visual-primary">
              <span>Zobacz plany po rozmowie</span>
              <ArrowDownToLine size={18} strokeWidth={1.8} aria-hidden="true" />
            </Link>
            <Link href="#jak-to-dziala" prefetch={false} className="materialy-visual-secondary">
              <span>Jak to działa?</span>
              <ArrowRight size={18} strokeWidth={1.8} aria-hidden="true" />
            </Link>
          </div>
          <div className="materialy-visual-stats" aria-label="Zawartość katalogu">
            <span><strong>16</strong> aktywnych PDF-ów</span>
            <span><strong>6</strong> bezpłatnych</span>
            <span><strong>10</strong> po 19 zł</span>
          </div>
        </div>

        <figure className="materialy-visual-art">
          <Image
            src="/branding/materialy/materialy-hero-guardian-pets-v1.webp"
            alt="Opiekunka siedząca spokojnie z psem i kotem pośród notatek i delikatnych roślin"
            fill
            priority
            sizes="(max-width: 860px) 92vw, 48vw"
          />
        </figure>

        <aside className="materialy-visual-featured" aria-label="Polecany początek">
          <span className="materialy-visual-featured-kicker">Polecany początek</span>
          <div className="materialy-visual-featured-product">
            <div className="materialy-visual-mini-covers" aria-hidden="true">
              {featuredGuides.map((guide) => (
                <span key={guide.slug}>
                  <Image
                    src={getMaterialyGuideCoverSrc(guide)}
                    alt=""
                    fill
                    sizes="92px"
                    className="materialy-visual-mini-cover"
                    unoptimized
                  />
                </span>
              ))}
            </div>
            <div>
              <strong>6 bezpłatnych materiałów</strong>
              <small>3 dla psa · 3 dla kota</small>
            </div>
          </div>
          <ul>
            <li>
              <Check size={17} strokeWidth={2} aria-hidden="true" />
              <span>Podgląd przed pobraniem</span>
            </li>
            <li>
              <Check size={17} strokeWidth={2} aria-hidden="true" />
              <span>Konkretne wskazówki na start</span>
            </li>
            <li>
              <Check size={17} strokeWidth={2} aria-hidden="true" />
              <span>Plik do spokojnego powrotu</span>
            </li>
          </ul>
          <Link href="#bezplatne" prefetch={false}>
            Zacznij od bezpłatnych PDF-ów <ArrowRight size={16} strokeWidth={1.8} aria-hidden="true" />
          </Link>
        </aside>
      </section>

      <MaterialyShelf
        id="p19"
        eyebrow="Plany po rozmowie · 19 zł"
        title="10 konkretnych PDF-ów do wdrożenia."
        copy="Po Zapytaj behawiorysta może wskazać jeden materiał dopasowany do sprawy. Kupisz go później w swoim Pokoju — bez otwartego sklepu i przypadkowego wyboru."
        guides={p19Guides}
        tone="sage"
      />

      <MaterialyShelf
        id="bezplatne"
        eyebrow="Materiały · bezpłatne"
        title="6 krótkich PDF-ów na spokojny początek."
        copy="Szybko porządkują najważniejsze informacje i pomagają bezpiecznie zacząć działać."
        guides={freeGuides}
      />

      <section id="jak-to-dziala" className="materialy-process" aria-labelledby="materialy-process-title">
        <header>
          <span>Jak to działa</span>
          <h2 id="materialy-process-title">Pobranie w 3 krokach.</h2>
        </header>
        <div className="materialy-process-grid">
          <article>
            <strong>01</strong>
            <span className="materialy-process-icon" aria-hidden="true">
              <ShoppingCart size={22} strokeWidth={1.6} />
            </span>
            <p>Wybierz materiał i otwórz jego stronę z opisem oraz podglądem.</p>
          </article>
          <article>
            <strong>02</strong>
            <span className="materialy-process-icon" aria-hidden="true">
              <CreditCard size={22} strokeWidth={1.6} />
            </span>
            <p>Bezpłatny PDF pobierzesz od razu. Płatny materiał kupisz dopiero po wcześniejszym Zapytaj, gdy pojawi się rekomendacja w Pokoju.</p>
          </article>
          <article>
            <strong>03</strong>
            <span className="materialy-process-icon" aria-hidden="true">
              <CloudDownload size={22} strokeWidth={1.6} />
            </span>
            <p>Pobierz plik i wracaj do niego wtedy, gdy Ty i Twoje zwierzę potrzebujecie wsparcia.</p>
          </article>
        </div>
      </section>

      <section className="materialy-consultation-band" aria-labelledby="materialy-consultation-title">
        <div className="materialy-consultation-mark" aria-hidden="true">
          <PawPrint size={54} strokeWidth={1.25} />
        </div>
        <div>
          <h2 id="materialy-consultation-title">
            Jeśli materiał nie wystarczy, <em>Zapytaj behawiorystę i uporządkuj temat w 15 minut.</em>
          </h2>
          <p>PDF to dobry start, ale rozmowa jest najprostszym sposobem na ustalenie priorytetu i ewentualnego dalszego materiału.</p>
        </div>
        <Link href={quickHref} prefetch={false}>
          <span>Zapytaj behawiorystę</span>
          <ArrowRight size={18} strokeWidth={1.8} aria-hidden="true" />
        </Link>
      </section>
    </NotatnikPageShell>
  )
}
