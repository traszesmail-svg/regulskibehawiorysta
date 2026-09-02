import Image from 'next/image'
import Link from 'next/link'
import { NotatnikFooter, NotatnikSideVisuals, NotatnikTopbar, PUBLIC_SITE_NAV_ITEMS } from '@/components/NotatnikA'
import { BookShelfCard, BundleShelfCard, PdfShelfCard, ShopAnchorNav } from '@/components/ShopCatalog'
import { FUNNEL_SECONDARY_LABEL, FUNNEL_UPGRADE_HREF, FUNNEL_UPGRADE_LABEL } from '@/lib/offers'
import {
  SHOP_BOOK_CARDS,
  SHOP_BUNDLE_SHELF_CARDS,
  SHOP_PDF_CARDS,
  type ShopSpecies,
  type ShopBundleShelfCard,
  type ShopPdfCard,
  getShopHeroEyebrow,
  getShopBookShelfTitle,
  getShopHeroLead,
  getShopHeroSecondaryNote,
  getShopHeroTitle,
} from '@/lib/shop-catalog'

export function SpeciesShopPage({
  species,
  heroImage,
  consultHref,
}: {
  species: ShopSpecies
  heroImage: { src: string; alt: string; width: number; height: number }
  consultHref: string
}) {
  const pdfCards = SHOP_PDF_CARDS[species]
  const bookCards = SHOP_BOOK_CARDS[species]
  const speciesBundleCards = SHOP_BUNDLE_SHELF_CARDS[species]
  const speciesLabel = species === 'koty' ? 'kotów' : 'psów'
  const pdfCardsOnly = pdfCards.filter((card) => card.kind === 'pdf')
  const bundleCardsOnly = pdfCards.filter((card) => card.kind === 'pakiet')
  const pdfShelfHref = '/materialy'
  const speciesAnchors = [
    { href: `#${species}-konsultacja`, label: 'Zapytaj behawiorystę' },
    { href: `#${species}-pdf`, label: 'Materiały PDF' },
    { href: `#${species}-pakiety`, label: 'Pakiety PDF' },
    { href: '#ksiazki', label: 'Książki' },
  ]

  const dogFunnelSections = species === 'psy'
    ? [
        {
          id: `${species}-start`,
          eyebrow: 'Darmowy start',
          title: 'Najpierw jeden spokojny start.',
          intro: 'Darmowy materiał prowadzi do najbardziej odpowiednich starterów i core, bez pokazywania wszystkiego naraz.',
          cards: pdfCardsOnly.filter((card) => card.kindLabel === 'Darmowy start'),
        },
        {
          id: `${species}-starter`,
          eyebrow: 'Startery',
          title: 'Pierwsza siatka sprzedażowa.',
          intro: 'Startery są wyżej niż core i prowadzą do dalszego uporządkowania problemu.',
          cards: pdfCardsOnly.filter((card) => card.kindLabel === 'Starter PDF' || card.kindLabel === 'Starter-core PDF'),
        },
        {
          id: `${species}-core`,
          eyebrow: 'Core',
          title: 'Głębsze PDF-y podzielone problemowo.',
          intro: 'To miejsce dla materiałów, które idą dalej niż pierwszy objaw i porządkują głębszy problem.',
          cards: pdfCardsOnly.filter((card) => card.kindLabel === 'Core PDF'),
        },
        {
          id: `${species}-bundles`,
          eyebrow: 'Pakiety',
          title: 'Pakiety jako szerszy ruch.',
          intro: 'Pakiety łączą kilka PDF-ów w jeden, prostszy wybór dla osób, które chcą wejść szerzej.',
          cards: speciesBundleCards,
          bundle: true,
        },
        {
          id: `${species}-specialist`,
          eyebrow: 'Specjalistyczne',
          title: 'Pies do pracy z ludźmi? niżej, jako materiał ekspercki.',
          intro: 'Ten PDF nie jest pierwszym wybórem. Siedzi niżej, bo ma służyć bardziej precyzyjnej ocenie i dalszej decyzji.',
          cards: pdfCardsOnly.filter((card) => card.kindLabel === 'Specjalistyczny PDF'),
        },
      ]
    : []

  function renderDogSectionCards(section: { bundle?: boolean; cards: any[] }) {
    if ('bundle' in section && section.bundle) {
      return (
        <div className="card-grid three-up shop-pdf-grid top-gap">
          {section.cards.map((card) => (
            <BundleShelfCard key={card.slug} bundle={card} />
          ))}
        </div>
      )
    }

    return (
      <div className="card-grid three-up shop-pdf-grid top-gap">
        {section.cards.map((card) => (
          <PdfShelfCard key={card.slug} card={card} />
        ))}
      </div>
    )
  }

  return (
    <main className="page-wrap marketing-page">
      <NotatnikSideVisuals variant={species === 'koty' ? 'cat' : 'dog'} />
      <div className="container">
        <NotatnikTopbar tag="Regulski" navItems={PUBLIC_SITE_NAV_ITEMS} showUtilityLinks={false} />

        <section className="panel section-panel hero-surface shop-hero-panel">
          <div className="shop-hero-grid">
            <div className="shop-hero-copy">
              <div className="shop-hero-eyebrow">{getShopHeroEyebrow(species)}</div>
              <h1>{getShopHeroTitle(species)}</h1>
              <p className="hero-text">{getShopHeroLead()}</p>
              <div className="shop-hero-note tree-backed-card">
                <strong>PDF pomaga porządkować temat między krokami.</strong>
                <span>{getShopHeroSecondaryNote()}</span>
              </div>

              <div className="hero-actions top-gap">
                <Link href={pdfShelfHref} prefetch={false} className="button button-primary big-button">
                  {FUNNEL_SECONDARY_LABEL}
                </Link>
                <Link href={consultHref} prefetch={false} className="button button-ghost big-button">
                  Umów 15 min
                </Link>
              </div>
            </div>

            <aside className="shop-hero-media tree-backed-card">
              <Image
                src={heroImage.src}
                alt={heroImage.alt}
                width={heroImage.width}
                height={heroImage.height}
                sizes="(max-width: 980px) 100vw, 38vw"
                priority
                loading="eager"
                fetchPriority="high"
                className="shop-hero-image"
              />
            </aside>
          </div>
        </section>

        <section className="panel section-panel shop-navigation-panel leafy-section top-gap">
          <div className="shop-navigation-copy">
            <div className="section-eyebrow">Półki sklepu</div>
            <h2>Najpierw konsultacja 15 min. PDF jako drugi krok, książki niżej jako uzupełnienie.</h2>
          </div>
          <ShopAnchorNav items={speciesAnchors} />
        </section>

        <section className="panel section-panel shop-section leafy-section top-gap" id={`${species}-pdf`} aria-labelledby={`${species}-pdf-title`}>
          <div className="shop-section-head">
            <div>
              <div className="section-eyebrow">PDF dla {speciesLabel}</div>
              <h2 id={`${species}-pdf-title`}>Materiały PDF do spokojnego powrotu do zaleceń.</h2>
            </div>
            <p className="offer-section-intro">
              To dobry drugi krok po konsultacji 15 min albo spokojny materiał, do którego możesz wracać we własnym tempie. Układ prowadzi od
              pierwszego ruchu do kolejnego kroku bez katalogowego chaosu.
            </p>
          </div>

          {species === 'psy' ? (
            <div className="stack-gap top-gap">
              {dogFunnelSections.map((section) => (
                <section key={section.id} className="shop-section-subpanel" id={section.id}>
                  <div className="shop-section-subhead">
                    <strong>{section.eyebrow}</strong>
                    <span>{section.intro}</span>
                  </div>
                  {renderDogSectionCards(section)}
                </section>
              ))}
            </div>
          ) : (
            <>
              <div className="shop-section-subhead">
                <strong>PDF-y</strong>
                <span>Własne materiały, które porządkują temat bez marketplace chaosu.</span>
              </div>

              <div className="card-grid three-up shop-pdf-grid top-gap">
                {pdfCardsOnly.map((card) => (
                  <PdfShelfCard key={card.slug} card={card} />
                ))}
              </div>

              <div className="shop-section-subhead top-gap" id={`${species}-pakiety`}>
                <strong>Pakiety PDF</strong>
                <span>Szersze wejście dla osób, które chcą od razu uporządkować kilka wątków.</span>
              </div>

              <div className="card-grid three-up shop-pdf-grid top-gap">
                {bundleCardsOnly.map((card) => (
                  <PdfShelfCard key={card.slug} card={card} />
                ))}
              </div>
            </>
          )}
        </section>

        <section className="panel section-panel shop-books-section leafy-section top-gap" id="ksiazki" aria-labelledby="ksiazki-title">
          <div className="shop-section-head">
            <div>
              <div className="section-eyebrow">Książki papierowe</div>
              <h2 id="ksiazki-title">{getShopBookShelfTitle(species)}</h2>
            </div>
            <p className="offer-section-intro">
              To dodatkowa półka. Linki prowadzą do Amazonu i są oznaczone jako afiliacyjne.
            </p>
          </div>

          <div className="shop-books-rail">
            {bookCards.map((book) => (
              <BookShelfCard key={book.slug} book={book} />
            ))}
          </div>
        </section>

        <section className="panel section-panel shop-consult-panel site-help-cta top-gap" id={`${species}-konsultacja`}>
          <div className="site-help-cta-copy shop-consult-copy">
            <div className="section-eyebrow">Zapytaj behawiorystę</div>
            <h2>Jeśli temat wraca, jest złożony albo trwa długo, przejdź do pełnej konsultacji.</h2>
            <p className="hero-text">
              Zapytaj behawiorystę porządkuje pierwszy kierunek. Gdy problemów jest kilka, temat wraca mimo prób albo potrzeba szerszego
              planu, lepsza będzie pełna konsultacja.
            </p>
            <strong className="site-help-cta-note">Najpierw Zapytaj behawiorystę, potem PDF, a przy większej złożoności pełna konsultacja.</strong>
            <span className="site-help-cta-support">Wybierz Zapytaj behawiorystę, jeśli chcesz szybko sprawdzić kierunek. PDF jest materiałem wspierającym, a pełna konsultacja pojawia się przy większej złożoności.</span>
            <div className="hero-actions site-help-cta-actions top-gap">
              <Link href={consultHref} prefetch={false} className="button button-primary">
                Zapytaj behawiorystę
              </Link>
              <Link href={`#${species}-pdf`} prefetch={false} className="button button-ghost">
                Zobacz materiały PDF
              </Link>
            </div>
            <p className="muted top-gap-small">
              Upgrade: <Link href={FUNNEL_UPGRADE_HREF} prefetch={false} className="inline-link">{FUNNEL_UPGRADE_LABEL}</Link>
            </p>
          </div>
          <div className="site-help-cta-image" aria-hidden="true">
            <Image src="/faq/faq-help-illustration-clean.png" alt="" width={355} height={208} sizes="(max-width: 760px) 58vw, 210px" />
          </div>
        </section>

        <NotatnikFooter showReviews={false} />
      </div>
    </main>
  )
}
