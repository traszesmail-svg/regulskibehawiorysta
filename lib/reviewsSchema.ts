import type { Review } from './reviews.config'

/**
 * Reviews are rendered as visible content on /opinie. We deliberately expose
 * them as an ItemList rather than Review/AggregateRating markup: the previous
 * global review schema was duplicated across every route and produced invalid
 * Search Console enhancements.
 */
export function generateReviewsSchema(
  reviews: Review[],
  _aggregateRating: { ratingValue: number; reviewCount: number; bestRating: number; worstRating: number } | null,
  business: { name: string; url: string; image?: string } = {
    name: 'Krzysztof Regulski — Behawiorysta zwierzęcy',
    url: 'https://regulskibehawiorysta.pl/opinie',
  },
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `Opinie — ${business.name}`,
    url: business.url,
    ...(business.image ? { image: business.image } : {}),
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: reviews.length,
      itemListElement: reviews.map((review, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: `${review.author} — ${review.problem}`,
        description: review.text,
      })),
    },
  }
}

export function generateSingleReviewSchema(review: Review, businessName: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: `${review.author} — ${businessName}`,
    text: review.text,
    about: review.problem,
  }
}
