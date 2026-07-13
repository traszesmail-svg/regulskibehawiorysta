import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  GraduationCap,
  Leaf,
  PawPrint,
  ShieldCheck,
} from 'lucide-react'
import { NotatnikPageShell, PUBLIC_SITE_NAV_ITEMS } from '@/components/NotatnikA'
import { OpinionsReviewGrid, type OpinionReview } from '@/components/OpinionsReviewGrid'
import { buildBookHref } from '@/lib/booking-routing'
import { getBreadcrumbJsonLd } from '@/lib/schema'
import { buildMarketingMetadata } from '@/lib/seo'
import { opinionReviews } from '@/lib/opinion-reviews'
import { getCanonicalBaseUrl } from '@/lib/server/env'
import {
  PUBLIC_CONTACT_EMAIL_FALLBACK,
  SITE_NAME,
  SITE_TAGLINE,
  SPECIALIST_NAME,
  getPublicContactDetails,
} from '@/lib/site'

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


const proofItems = [
  {
    title: 'Bezpieczeństwo',
    copy: 'Spokojna praca bez przemocy, straszenia i dominowania.',
    icon: ShieldCheck,
  },
  {
    title: 'Wiedza i doświadczenie',
    copy: 'Praktyka oparta na nauce i wieloletniej pracy.',
    icon: GraduationCap,
  },
  {
    title: 'Empatia i zrozumienie',
    copy: 'Wsparcie dla Ciebie i Twojego zwierzęcia.',
    icon: PawPrint,
  },
  {
    title: 'Konkret po rozmowie',
    copy: 'Pierwszy krok, którego opiekun naprawdę może spróbować w swoim domu.',
    icon: Leaf,
  },
] as const

export default function OpinionsPage() {
  const baseUrl = getCanonicalBaseUrl()
  const contact = getPublicContactDetails()
  const email = contact.email ?? PUBLIC_CONTACT_EMAIL_FALLBACK
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: SITE_NAME,
      description: `${SITE_TAGLINE}. Opinie po konsultacjach behawioralnych online.`,
      url: new URL('/opinie', baseUrl).toString(),
      serviceType: 'Konsultacja behawioralna online',
      provider: {
        '@type': 'Person',
        name: SPECIALIST_NAME,
      },
      areaServed: [{ '@type': 'Country', name: 'Polska' }],
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '5.0',
        reviewCount: String(opinionReviews.length),
        bestRating: '5',
      },
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email,
        areaServed: [{ '@type': 'Country', name: 'Polska' }],
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
      ctaHref="/quiz"
      ctaLabel="Quiz"
      footerPrimaryHref={bookingHref}
      footerPrimaryLabel="Umów spokojny pierwszy krok"
      showSideVisuals={false}
      pageClassName="opinions-showcase-page"
      shellClassName="opinions-showcase-shell"
      showFooterReviews={false}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <OpinionsReviewGrid filters={[...filters]} reviews={opinionReviews} />

        <section className="opinions-story-band">
          <div className="opinions-story-copy">
            <Leaf size={58} strokeWidth={1.1} />
            <div>
              <h2>Twoja historia może pomóc innym</h2>
              <p>Każda opinia wspiera innych opiekunów w podjęciu decyzji i daje im nadzieję na lepszą relację ze zwierzęciem.</p>
              <Link href={addOpinionHref} prefetch={false} className="opinions-story-button">
                Dodaj opinię <ArrowRight size={17} strokeWidth={1.8} />
              </Link>
            </div>
          </div>
          <div className="opinions-story-photo" aria-hidden="true">
            <Image src="/images/homepage/home-bg-cat-1to1.webp" alt="" fill loading="lazy" sizes="(max-width: 860px) 90vw, 390px" />
          </div>
        </section>

        <section className="opinions-proof-strip" aria-label="Dlaczego opiekunowie wracają do spokojnego procesu">
          {proofItems.map((item) => {
            const Icon = item.icon

            return (
              <article key={item.title} className="opinions-proof-item">
                <span>
                  <Icon size={32} strokeWidth={1.55} />
                </span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.copy}</p>
                </div>
              </article>
            )
          })}
        </section>

    </NotatnikPageShell>
  )
}
