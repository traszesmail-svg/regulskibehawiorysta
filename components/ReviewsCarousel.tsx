'use client'

import { useEffect, useRef, useState, type TouchEvent } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ReviewCard } from '@/components/ReviewCard'
import type { Review } from '@/lib/reviews.config'

interface ReviewsCarouselProps {
  reviews: Review[]
  autoplay?: boolean
  autoplayDelay?: number
  maxItems?: number
}

export function ReviewsCarousel({
  reviews,
  autoplay = false,
  autoplayDelay = 7000,
  maxItems = 3,
}: ReviewsCarouselProps) {
  const visibleReviews = reviews.slice(0, maxItems)
  const total = visibleReviews.length
  const [index, setIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const touchStart = useRef<number | null>(null)

  const hasMultipleReviews = total > 1
  const activeReview = visibleReviews[index] ?? visibleReviews[0]

  function goNext() {
    if (!hasMultipleReviews) {
      return
    }

    setIndex((current) => (current + 1) % total)
  }

  function goPrev() {
    if (!hasMultipleReviews) {
      return
    }

    setIndex((current) => (current - 1 + total) % total)
  }

  function goTo(nextIndex: number) {
    setIndex(Math.max(0, Math.min(nextIndex, total - 1)))
  }

  useEffect(() => {
    if (!autoplay || isPaused || !hasMultipleReviews) {
      return
    }

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % total)
    }, autoplayDelay)
    return () => window.clearInterval(timer)
  }, [autoplay, autoplayDelay, isPaused, hasMultipleReviews, total])

  function onTouchStart(event: TouchEvent) {
    touchStart.current = event.touches[0]?.clientX ?? null
  }

  function onTouchEnd(event: TouchEvent) {
    if (touchStart.current === null) {
      return
    }

    const diff = touchStart.current - (event.changedTouches[0]?.clientX ?? touchStart.current)
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        goNext()
      } else {
        goPrev()
      }
    }
    touchStart.current = null
  }

  if (!activeReview) {
    return null
  }

  return (
    <div
      className="relative reviews-carousel"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="reviews-carousel-frame">
        <ReviewCard key={activeReview.id} review={activeReview} variant="featured" />
      </div>

      {hasMultipleReviews ? (
        <>
          <button
            type="button"
            onClick={goPrev}
            className="reviews-carousel-button reviews-carousel-button-prev"
            aria-label="Poprzednia opinia"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={goNext}
            className="reviews-carousel-button reviews-carousel-button-next"
            aria-label="Następna opinia"
          >
            <ChevronRight size={20} />
          </button>

          <div className="reviews-carousel-dots" aria-label="Wybierz opinię">
            {visibleReviews.map((review, dotIndex) => (
              <button
                key={review.id}
                type="button"
                onClick={() => goTo(dotIndex)}
                className={dotIndex === index ? 'is-active' : ''}
                aria-label={`Opinia ${dotIndex + 1}`}
                aria-current={dotIndex === index ? 'true' : undefined}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}
