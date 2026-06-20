'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { Review } from '@/lib/reviews.config'

type FinalReviewsQuoteCarouselProps = {
  reviews: Review[]
  intervalMs?: number
  initialIndex?: number
  sourceUrl?: string
}

export function FinalReviewsQuoteCarousel({
  reviews,
  intervalMs = 6000,
  initialIndex = 0,
  sourceUrl,
}: FinalReviewsQuoteCarouselProps) {
  const [visibleReviews, setVisibleReviews] = useState(reviews)
  const trackRef = useRef<HTMLDivElement | null>(null)
  const [index, setIndex] = useState(() => {
    if (visibleReviews.length === 0) {
      return 0
    }

    return Math.max(0, Math.min(initialIndex, visibleReviews.length - 1))
  })

  useEffect(() => {
    setVisibleReviews(reviews)
  }, [reviews])

  useEffect(() => {
    if (!sourceUrl) {
      return
    }

    let cancelled = false

    void fetch(sourceUrl, { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: unknown) => {
        if (cancelled || !payload || typeof payload !== 'object') {
          return
        }

        const nextReviews = Array.isArray((payload as { reviews?: unknown }).reviews)
          ? ((payload as { reviews: Review[] }).reviews ?? [])
          : []

        if (nextReviews.length === 0) {
          return
        }

        setVisibleReviews(nextReviews)
        setIndex(Math.floor(Math.random() * nextReviews.length))
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [sourceUrl])

  useEffect(() => {
    if (visibleReviews.length <= 1) {
      return
    }

    const timer = window.setInterval(() => {
      setIndex((current) => {
        const randomOffset = 1 + Math.floor(Math.random() * (visibleReviews.length - 1))
        return (current + randomOffset) % visibleReviews.length
      })
    }, intervalMs)

    return () => window.clearInterval(timer)
  }, [intervalMs, visibleReviews.length])

  useEffect(() => {
    const track = trackRef.current
    if (!track) {
      return
    }

    const card = track.children.item(index) as HTMLElement | null
    if (!card) {
      return
    }

    track.scrollTo({
      left: card.offsetLeft - Math.max(0, (track.clientWidth - card.clientWidth) / 2),
      behavior: 'smooth',
    })
  }, [index])

  const review = visibleReviews[index]

  if (!review) {
    return null
  }

  return (
    <section className="notatnik-final notatnik-final-reviews" aria-label="Opinie opiekunów po rozmowie">
      <h2 className="notatnik-final-review-kicker">
        <Link href="/opinie" prefetch={false}>Co mówią opiekunowie po rozmowie?</Link>
      </h2>
      <div className="notatnik-final-review-track" ref={trackRef} tabIndex={0} aria-label="Przewijane opinie opiekunów">
        {visibleReviews.map((item, itemIndex) => {
          const itemAuthor = item.petName ? `${item.author} i ${item.petName}` : item.author
          const itemSignature = item.problem ? `${itemAuthor} - ${item.problem}` : itemAuthor

          return (
            <blockquote key={item.id} className={`notatnik-final-review-quote${itemIndex === index ? ' is-active' : ''}`}>
              <p>&ldquo;{item.text}&rdquo;</p>
              <footer>
                <strong>{itemSignature}</strong>
              </footer>
            </blockquote>
          )
        })}
      </div>

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
