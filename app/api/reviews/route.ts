import { NextResponse } from 'next/server'
import { getOpinionServiceLabel, publicOpinionReviews, type OpinionReview } from '@/lib/opinion-reviews'

export const revalidate = 86400

type Review = {
  id: string
  author: string
  petName: string | null
  petType: 'dog' | 'cat' | 'other'
  problem: string
  service: string
  rating?: 1 | 2 | 3 | 4 | 5
  date: string | null
  text: string
  source: 'file' | 'google' | 'direct' | 'email'
}

function mapOpinionReviewToReview(review: OpinionReview): Review {
  const problem = review.topic.trim() || review.categories[0] || 'opinia'
  const petType: Review['petType'] = review.categories.includes('Pies')
    ? 'dog'
    : review.categories.includes('Kot')
      ? 'cat'
      : 'other'

  return {
    id: `${review.name}-${review.service}-${review.topic}`,
    author: review.name,
    petName: null,
    petType,
    problem,
    service: getOpinionServiceLabel(review.service),
    date: null,
    text: review.text,
    source: 'direct',
  }
}

function buildAggregateRating(items: Review[]) {
  const ratedItems = items.filter((item): item is Review & { rating: 1 | 2 | 3 | 4 | 5 } => typeof item.rating === 'number')

  if (ratedItems.length === 0) {
    return null
  }

  return {
    ratingValue: ratedItems.reduce((sum, item) => sum + item.rating, 0) / ratedItems.length,
    reviewCount: ratedItems.length,
    bestRating: 5,
    worstRating: 1,
  }
}

export async function GET() {
  const mappedReviews = publicOpinionReviews.map(mapOpinionReviewToReview)

  return NextResponse.json({
    reviews: mappedReviews,
    aggregateRating: buildAggregateRating(mappedReviews),
    source: 'opinions-page',
  })
}
