'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { Review } from '@/lib/reviews.config'

type FinalReviewsQuoteCarouselProps = {
  reviews: Review[]
  intervalMs?: number
  initialIndex?: number
  sourceUrl?: string
  layout?: 'carousel' | 'editorial'
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function FinalReviewsQuoteCarousel({
  reviews,
  intervalMs = 6000,
  initialIndex = 0,
  sourceUrl,
  layout = 'carousel',
}: FinalReviewsQuoteCarouselProps) {
  const [visibleReviews, setVisibleReviews] = useState(() => reviews)
  const trackRef = useRef<HTMLDivElement | null>(null)
  const [index, setIndex] = useState(() => {
    if (visibleReviews.length === 0) {
      return 0
    }

    return Math.max(0, Math.min(initialIndex, visibleReviews.length - 1))
  })

  useEffect(() => {
    setVisibleReviews(shuffleArray(reviews))
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

        const shuffled = shuffleArray(nextReviews)
        setVisibleReviews(shuffled)
        setIndex(Math.floor(Math.random() * shuffled.length))
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
        if (layout === 'editorial') {
          return (current + 1) % visibleReviews.length
        }

        const randomOffset = 1 + Math.floor(Math.random() * (visibleReviews.length - 1))
        return (current + randomOffset) % visibleReviews.length
      })
    }, intervalMs)

    return () => window.clearInterval(timer)
  }, [intervalMs, layout, visibleReviews.length])

  useEffect(() => {
    if (layout === 'editorial') {
      return
    }

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
  }, [index, layout])

  const review = visibleReviews[index]

  if (!review) {
    return null
  }

  const moveReviews = (direction: -1 | 1) => {
    setIndex((current) => (current + direction + visibleReviews.length) % visibleReviews.length)
  }

  const editorialReviews = Array.from(
    { length: Math.min(3, visibleReviews.length) },
    (_, offset) => visibleReviews[(index + offset) % visibleReviews.length],
  )

  if (layout === 'editorial') {
    return (
      <section
        className="notatnik-final notatnik-final-reviews is-editorial"
        aria-label="Opinie opiekunów po rozmowie"
      >
        <div className="notatnik-final-review-heading">
          <div className="notatnik-final-review-heading-copy">
            <p className="notatnik-final-review-eyebrow">Prawdziwe historie opiekunów</p>
            <h2 className="notatnik-final-review-kicker">
              <Link href="/opinie" prefetch={false}>Co mówią opiekunowie po rozmowie?</Link>
            </h2>
          </div>

          {visibleReviews.length > 1 ? (
            <div className="notatnik-final-review-controls" aria-label="Sterowanie opiniami">
              <button type="button" onClick={() => moveReviews(-1)} aria-label="Pokaż poprzednie opinie">
                <span aria-hidden="true">&larr;</span>
              </button>
              <button type="button" onClick={() => moveReviews(1)} aria-label="Pokaż następne opinie">
                <span aria-hidden="true">&rarr;</span>
              </button>
            </div>
          ) : null}
        </div>

        <div
          className="notatnik-final-review-track"
          ref={trackRef}
          aria-live="polite"
          aria-label="Wybrane opinie opiekunów"
        >
          {editorialReviews.map((item) => {
            const itemAuthor = item.petName ? `${item.author} i ${item.petName}` : item.author

            return (
              <blockquote key={item.id} className="notatnik-final-review-quote is-active">
                <span className="notatnik-final-review-mark" aria-hidden="true">&ldquo;</span>
                <p>{item.text}</p>
                <footer>
                  <strong>{itemAuthor}</strong>
                  <span aria-hidden="true">&middot;</span>
                  <span>{item.problem}</span>
                </footer>
              </blockquote>
            )
          })}
        </div>
      </section>
    )
  }

  return (
    <section className="notatnik-final notatnik-final-reviews" aria-label="Opinie opiekunów po rozmowie">
      <style>{`
        .notatnik-final-review-quote {
          margin: 0 auto !important;
        }
      `}</style>
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
