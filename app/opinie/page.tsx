import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { NotatnikPageShell, PUBLIC_SITE_NAV_ITEMS } from '@/components/NotatnikA'
import { OpinionsReviewGrid } from '@/components/OpinionsReviewGrid'
import { buildBookHref } from '@/lib/booking-routing'
import { getBreadcrumbJsonLd } from '@/lib/schema'
import { buildMarketingMetadata } from '@/lib/seo'
import { getOpinionServiceLabel, publicOpinionReviews } from '@/lib/opinion-reviews'
import { getCanonicalBaseUrl } from '@/lib/server/env'
import { SITE_NAME, SITE_TAGLINE } from '@/lib/site'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = buildMarketingMetadata({
  title: 'Opinie o konsultacjach behawioralnych',
  path: '/opinie',
  description:
    'Opinie opiekunów psów i kotów po konsultacjach behawioralnych. Historie, które pokazują spokojny proces zmiany.',
})

const bookingHref = buildBookHref(null, 'szybka-konsultacja-15-min')
const addOpinionHref = '/opinie/dodaj'

const filters = ['Pies', 'Kot'] as const


export default function OpinionsPage() {
  const baseUrl = getCanonicalBaseUrl()
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': new URL('/opinie#page', baseUrl).toString(),
      name: SITE_NAME,
      description: `${SITE_TAGLINE}. Opinie po konsultacjach behawioralnych online.`,
      url: new URL('/opinie', baseUrl).toString(),
      inLanguage: 'pl-PL',
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: publicOpinionReviews.length,
        itemListElement: publicOpinionReviews.map((review, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: `${review.name} — ${getOpinionServiceLabel(review.service)} — ${review.topic}`,
          description: review.text,
        })),
      },
    },
    getBreadcrumbJsonLd([
      { name: 'Strona główna', path: '/' },
      { name: 'Opinie', path: '/opinie' },
    ]),
  ]

  return (
    <NotatnikPageShell
      tag="Opinie"
      navItems={PUBLIC_SITE_NAV_ITEMS}
      ctaHref="/zapytaj"
      ctaLabel="Zapytaj behawiorystę – 79 zł"
      footerPrimaryHref="/zapytaj"
      footerPrimaryLabel="Zapytaj behawiorystę – 79 zł"
      showSideVisuals={false}
      pageClassName="opinions-showcase-page"
      shellClassName="opinions-showcase-shell"
      showFooterReviews={false}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <section className="opinions-editorial-hero" aria-labelledby="opinions-page-title">
        <div className="opinions-editorial-copy">
          <span className="opinions-editorial-eyebrow">Opinie po konsultacjach</span>
          <h1 id="opinions-page-title">Historie, które pokazują, jak zaczyna się spokojniejsza codzienność</h1>
          <p>Krótkie wypowiedzi opiekunów psów i kotów, udostępnione za zgodą. Pokazują, jak wygląda proces i co realnie pomaga po rozmowie.</p>
          <div className="opinions-editorial-proof">Wypowiedzi opiekunów po konsultacjach · publikowane za zgodą</div>
        </div>
        <figure className="opinions-editorial-photo">
          <Image
            src="/images/opinions/hero-reviews-premium-v1.png"
            alt="Opiekunka spędza spokojny czas z psem i kotem w domu"
            fill
            priority
            sizes="(max-width: 760px) 90vw, 48vw"
          />
        </figure>
      </section>

      <OpinionsReviewGrid filters={[...filters]} reviews={publicOpinionReviews} showIntro={false} />

      <section className="opinions-story-band">
        <div className="opinions-story-copy">
          <span className="opinions-editorial-eyebrow">Podziel się swoim doświadczeniem</span>
          <h2>Twoja historia może pomóc innym</h2>
          <p>Każda opinia wspiera innych opiekunów w podjęciu decyzji i daje im nadzieję na lepszą relację ze zwierzęciem.</p>
          <Link href={addOpinionHref} prefetch={false} className="opinions-story-button">
            Dodaj opinię <ArrowRight size={17} strokeWidth={1.8} />
          </Link>
        </div>
        <figure className="opinions-story-photo">
          <Image src="/images/opinions/review-submit-premium-v1.png" alt="" fill loading="lazy" sizes="(max-width: 760px) 90vw, 36vw" />
        </figure>
      </section>

    </NotatnikPageShell>
  )
}
