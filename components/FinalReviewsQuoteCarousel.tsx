'use client'

import React, { useEffect, useState } from 'react'
import type { Review } from '@/lib/reviews.config'

type FinalReviewsQuoteCarouselProps = {
  reviews: Review[]
  intervalMs?: number
}

export function FinalReviewsQuoteCarousel({ reviews, intervalMs = 4000 }: FinalReviewsQuoteCarouselProps) {
  const visibleReviews = reviews.slice(0, 4)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (visibleReviews.length <= 1) {
      return
    }

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % visibleReviews.length)
    }, intervalMs)

    return () => window.clearInterval(timer)
  }, [intervalMs, visibleReviews.length])

  const review = visibleReviews[index]

  if (!review) {
    return null
  }

  const reviewAuthor = review.petName ? `${review.author} i ${review.petName}` : review.author
  const reviewSignature = review.problem ? `${reviewAuthor} - ${review.problem}` : reviewAuthor

  return (
    <section className="notatnik-final notatnik-final-reviews" aria-label="Opinie opiekunów po rozmowie">
      <h2 className="notatnik-final-review-kicker">Co mówią opiekunowie po rozmowie?</h2>
      <blockquote key={review.id} className="notatnik-final-review-quote">
        <p>&ldquo;{review.text}&rdquo;</p>
        <footer>
          <strong>{reviewSignature}</strong>
        </footer>
      </blockquote>

      {visibleReviews.length > 1 ? (
        <div className="notatnik-final-review-dots" aria-hidden="true">
          {visibleReviews.map((item, dotIndex) => (
            <span key={item.id} className={dotIndex === index ? 'is-active' : ''} />
          ))}
        </div>
      ) : null}
    </section>
  )
}
