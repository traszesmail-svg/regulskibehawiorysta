// Generator Schema.org JSON-LD dla opinii — gwiazdki w Google SERP

import type { Review } from './reviews.config';

interface AggregateRating {
  ratingValue: number;
  reviewCount: number;
  bestRating: number;
  worstRating: number;
}

interface BusinessConfig {
  name: string;
  url: string;
  image: string;
}

const DEFAULT_BUSINESS: BusinessConfig = {
  name: 'Krzysztof Regulski — Behawiorysta zwierzęcy',
  url: 'https://regulskibehawiorysta.pl',
  image: 'https://regulskibehawiorysta.pl/og-image.png',
};

export function generateReviewsSchema(
  reviews: Review[],
  aggregateRating: AggregateRating,
  business: BusinessConfig = DEFAULT_BUSINESS,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': business.url,
    name: business.name,
    url: business.url,
    image: business.image,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: aggregateRating.ratingValue.toFixed(1),
      reviewCount: aggregateRating.reviewCount,
      bestRating: aggregateRating.bestRating,
      worstRating: aggregateRating.worstRating,
    },
    review: reviews.map(r => ({
      '@type': 'Review',
      reviewRating: {
        '@type': 'Rating',
        ratingValue: r.rating,
        bestRating: 5,
        worstRating: 1,
      },
      author: {
        '@type': 'Person',
        name: r.author,
      },
      ...(r.date && { datePublished: r.date }),
      reviewBody: r.text,
      ...(r.location && {
        itemReviewed: {
          '@type': 'Place',
          name: r.location,
        },
      }),
    })),
  };
}

export function generateSingleReviewSchema(review: Review, businessName: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Review',
    itemReviewed: {
      '@type': 'Person',
      name: businessName,
    },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: review.rating,
      bestRating: 5,
    },
    author: {
      '@type': 'Person',
      name: review.author,
    },
    ...(review.date && { datePublished: review.date }),
    reviewBody: review.text,
  };
}
