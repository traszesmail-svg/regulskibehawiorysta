import { getOpinionServiceLabel, publicOpinionReviews } from '@/lib/opinion-reviews'

// Jedno źródło opinii dla strony /opinie, sekcji zaufania i danych Schema.org.
// Wpisy są dodawane ręcznie po akceptacji, dlatego nie pobieramy ich z zewnętrznego API.
export interface Review {
  id: string
  author: string
  location?: string
  petName?: string
  petType: 'dog' | 'cat' | 'other'
  problem: string
  service: string
  rating?: 1 | 2 | 3 | 4 | 5
  date?: string
  text: string
  source: 'file' | 'google' | 'direct' | 'email'
  consultationType?: 'kwadrans' | 'standardowa' | 'wyjazdowa'
  highlight?: boolean
}

function getPetType(categories: readonly string[]): Review['petType'] {
  if (categories.includes('Pies')) return 'dog'
  if (categories.includes('Kot')) return 'cat'
  return 'other'
}

export const reviews: Review[] = publicOpinionReviews.map((review, index) => ({
  id: `opinia-${index + 1}`,
  author: review.name,
  petType: getPetType(review.categories),
  problem: review.topic.trim() || review.categories[0] || 'opinia',
  service: getOpinionServiceLabel(review.service),
  text: review.text,
  source: 'direct',
  highlight: index < 6,
}))

const ratedReviews = reviews.filter(
  (review): review is Review & { rating: 1 | 2 | 3 | 4 | 5 } => typeof review.rating === 'number',
)

export const aggregateRating = {
  ratingValue: ratedReviews.length > 0 ? ratedReviews.reduce((sum, review) => sum + review.rating, 0) / ratedReviews.length : 0,
  reviewCount: ratedReviews.length,
  bestRating: 5,
  worstRating: 1,
}

export const highlightedReviews = reviews.filter((review) => review.highlight)
export const dogReviews = reviews.filter((review) => review.petType === 'dog')
export const catReviews = reviews.filter((review) => review.petType === 'cat')
export const fiveStarReviews = ratedReviews.filter((review) => review.rating === 5)
