'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { ChevronDown, Quote, Star } from 'lucide-react'

const COLLAPSED_REVIEW_COUNT = 6

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
  const [isExpanded, setIsExpanded] = useState(false)

  const reviewCountByFilter = useMemo(() => {
    return filters.reduce<Record<string, number>>((counts, filter) => {
      counts[filter] = reviews.filter((review) => review.categories.includes(filter)).length
      return counts
    }, {})
  }, [filters, reviews])

  const filteredReviews = useMemo(() => {
    if (!activeFilter) {
      return reviews
    }

    return reviews.filter((review) => review.categories.includes(activeFilter))
  }, [activeFilter, reviews])

  const visibleReviews = isExpanded ? filteredReviews : filteredReviews.slice(0, COLLAPSED_REVIEW_COUNT)
  const hasHiddenReviews = filteredReviews.length > COLLAPSED_REVIEW_COUNT

  function selectFilter(filter: string | null) {
    setActiveFilter(filter)
    setIsExpanded(false)
  }

  return (
    <section className="opinions-review-section" id="opinie">
      <div className="opinions-review-section-head">
        <span>Opinie po konsultacjach</span>
        <h2>Historie, które pokazują, jak zaczyna się spokojniejsza codzienność</h2>
        <p>
          Krótkie, anonimowe fragmenty opinii opiekunów psów i kotów. Pokazują, jak wygląda proces i co realnie pomaga po
          rozmowie.
        </p>
      </div>

      <div className="opinions-filter-bar" aria-label="Filtry opinii">
        <button
          type="button"
          className={activeFilter === null ? 'is-active' : undefined}
          aria-pressed={activeFilter === null}
          onClick={() => selectFilter(null)}
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
            onClick={() => selectFilter(filter)}
            data-opinion-filter={filter}
          >
            {filter} <span>{reviewCountByFilter[filter] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className={`opinions-review-window${isExpanded ? ' is-expanded' : ''}`} id="opinions-review-window">
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
      </div>

      {hasHiddenReviews || isExpanded ? (
        <button
          type="button"
          className="opinions-review-expand"
          aria-expanded={isExpanded}
          aria-controls="opinions-review-window"
          onClick={() => setIsExpanded((expanded) => !expanded)}
        >
          <span>{isExpanded ? 'Pokaż mniej opinii' : `Pokaż wszystkie opinie (${filteredReviews.length})`}</span>
          <ChevronDown size={19} strokeWidth={2} aria-hidden="true" />
        </button>
      ) : null}
    </section>
  )
}
