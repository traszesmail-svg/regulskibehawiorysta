import { ReviewsCarousel } from '@/components/ReviewsCarousel'
import { ReviewsGrid } from '@/components/ReviewsGrid'
import { reviews, aggregateRating } from '@/lib/reviews.config'

interface ReviewsSectionProps {
  variant?: 'carousel' | 'grid'
  showBadge?: boolean
  limit?: number
  title?: string
  subtitle?: string
}

export function ReviewsSection({
  variant = 'carousel',
  showBadge = true,
  limit = 8,
  title = 'Co mówią klienci',
  subtitle = 'Wypowiedzi opiekunów po konsultacjach, udostępnione za zgodą',
}: ReviewsSectionProps) {
  const displayReviews = reviews.slice(0, limit)

  return (
    <section className="py-16" style={{ background: 'var(--paper, #faf9f7)' }}>
      <div className="max-w-4xl mx-auto px-6">
        <header className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl mb-4" style={{ fontFamily: 'var(--font-display, Georgia, serif)', color: 'var(--ink, #1c1a18)' }}>
            {title}
          </h2>
          <p className="text-neutral-600 text-lg mb-6 max-w-xl mx-auto">{subtitle}</p>
          {showBadge && aggregateRating.reviewCount > 0 ? (
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-3 rounded-2xl border-2 border-neutral-200 bg-white px-5 py-3">
                <strong style={{ color: 'var(--ink, #1c1a18)' }}>{aggregateRating.ratingValue.toFixed(1)} / 5</strong>
                <span className="text-sm text-neutral-600">{aggregateRating.reviewCount} opinii w bazie</span>
              </div>
            </div>
          ) : null}
        </header>

        {variant === 'carousel' ? (
          <ReviewsCarousel reviews={displayReviews} />
        ) : (
          <ReviewsGrid reviews={displayReviews} initialCount={6} />
        )}
      </div>
    </section>
  )
}
