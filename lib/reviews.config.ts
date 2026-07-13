import { opinionReviews } from '@/lib/opinion-reviews'

// Jedno źródło opinii dla strony /opinie, sekcji zaufania i danych Schema.org.
// Wpisy są dodawane ręcznie po akceptacji, dlatego nie pobieramy ich z zewnętrznego API.
export interface Review {
  id: string
  author: string
  location?: string
  petName?: string
  petType: 'dog' | 'cat' | 'other'
  problem: string
  rating: 1 | 2 | 3 | 4 | 5
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

export const reviews: Review[] = opinionReviews.map((review, index) => ({
  id: `opinia-${index + 1}`,
  author: review.name,
  petType: getPetType(review.categories),
  problem: review.service.trim() || review.categories[0] || 'opinia',
  rating: 5,
  text: review.text,
  source: 'direct',
  highlight: index < 6,
}))

export const aggregateRating = {
  ratingValue: reviews.length > 0 ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0,
  reviewCount: reviews.length,
  bestRating: 5,
  worstRating: 1,
}

export const highlightedReviews = reviews.filter((review) => review.highlight)
export const dogReviews = reviews.filter((review) => review.petType === 'dog')
export const catReviews = reviews.filter((review) => review.petType === 'cat')
export const fiveStarReviews = reviews.filter((review) => review.rating === 5)
