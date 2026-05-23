'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { Quote, Star } from 'lucide-react'

export type OpinionReview = {
  name: string
  service: string
  text: string
  avatar: string
  categories: string[]
}

type OpinionsReviewGridProps = {
  filters: string[]
  reviews: OpinionReview[]
}

export function OpinionsReviewGrid({ filters, reviews }: OpinionsReviewGridProps) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null)

  const reviewCountByFilter = useMemo(() => {
    return filters.reduce<Record<string, number>>((counts, filter) => {
      counts[filter] = reviews.filter((review) => review.categories.includes(filter)).length
      return counts
    }, {})
  }, [filters, reviews])

  const visibleReviews = useMemo(() => {
    if (!activeFilter) {
      return reviews
    }

    return reviews.filter((review) => review.categories.includes(activeFilter))
  }, [activeFilter, reviews])

  return (
    <section className="opinions-review-section" id="opinie">
      <div className="opinions-review-section-head">
        <span>Opinie po konsultacjach</span>
        <h2>Psy i koty, realne sytuacje, bez pełnych danych klientów</h2>
        <p>
          Imiona są skrócone lub anonimowe. Publikuję tylko takie fragmenty, które pomagają zrozumieć proces i nie udają
          pełnej dokumentacji sprawy.
        </p>
      </div>

      <div className="opinions-filter-bar" aria-label="Filtry opinii">
        <button
          type="button"
          className={activeFilter === null ? 'is-active' : undefined}
          aria-pressed={activeFilter === null}
          onClick={() => setActiveFilter(null)}
          data-opinion-filter="Wszystkie"
        >
          Wszystkie <span>{reviews.length}</span>
        </button>
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            className={filter === activeFilter ? 'is-active' : undefined}
            aria-pressed={filter === activeFilter}
            onClick={() => setActiveFilter(filter)}
            data-opinion-filter={filter}
          >
            {filter} <span>{reviewCountByFilter[filter] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="opinions-review-grid" aria-live="polite">
        {visibleReviews.map((review) => {
          const species = review.categories.includes('Pies') ? 'pies' : review.categories.includes('Kot') ? 'kot' : 'inne'

          return (
            <article
              key={`${review.name}-${review.service}`}
              className="opinions-review-card"
              data-opinion-review="true"
              data-review-species={species}
            >
              <div className="opinions-review-stars" aria-label="Ocena 5 na 5">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} size={18} fill="currentColor" strokeWidth={1.4} />
                ))}
              </div>
              <Quote className="opinions-review-quote" size={34} strokeWidth={2} aria-hidden="true" />
              <p>{review.text}</p>
              <footer>
                <span className="opinions-review-avatar">
                  <Image src={review.avatar} alt="" fill loading="lazy" sizes="58px" />
                </span>
                <span>
                  <strong>{review.name}</strong>
                  <small>{review.service}</small>
                </span>
              </footer>
            </article>
          )
        })}
      </div>
    </section>
  )
}
