import { NextResponse } from 'next/server'
import type { OpinionReview } from '@/components/OpinionsReviewGrid'
import { opinionReviews } from '@/app/opinie/page'

export const revalidate = 86400

type Review = {
  id: string
  author: string
  petName: string | null
  petType: 'dog' | 'cat' | 'other'
  problem: string
  rating: 1 | 2 | 3 | 4 | 5
  date: string
  text: string
  source: 'file' | 'google' | 'direct' | 'email'
}

function mapOpinionReviewToReview(review: OpinionReview): Review {
  const problem = review.service.trim() || review.categories[0] || 'opinia'
  const petType: Review['petType'] = review.categories.includes('Pies')
    ? 'dog'
    : review.categories.includes('Kot')
      ? 'cat'
      : 'other'

  return {
    id: `${review.name}-${review.service}`,
    author: review.name,
    petName: null,
    petType,
    problem,
    rating: 5,
    date: new Date().toISOString(),
    text: review.text,
    source: 'direct',
  }
}

function buildAggregateRating(items: Review[]) {
  return {
    ratingValue: items.length > 0 ? items.reduce((sum, item) => sum + item.rating, 0) / items.length : 0,
    reviewCount: items.length,
    bestRating: 5,
    worstRating: 1,
  }
}

export async function GET() {
  const mappedReviews = opinionReviews.map(mapOpinionReviewToReview)

  return NextResponse.json({
    reviews: mappedReviews,
    aggregateRating: buildAggregateRating(mappedReviews),
    source: 'opinions-page',
  })
}
