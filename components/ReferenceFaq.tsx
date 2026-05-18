'use client'

import Image from 'next/image'
import Link from 'next/link'
import {
  CalendarDays,
  Cat,
  ChevronDown,
  ChevronRight,
  Clock3,
  HandHeart,
  Leaf,
  MapPin,
  MessageCircle,
  Minus,
  Monitor,
  PawPrint,
  Plus,
  Sparkles,
  WalletCards,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { trackAnalyticsEvent } from '@/lib/analytics'
import { referenceFaqCategories, referenceFaqItems, type ReferenceFaqCategory } from '@/lib/reference-faq'

type ReferenceFaqProps = {
  contactHref: string
}

const INITIAL_VISIBLE_ITEMS = 5
const FEATURED_FAQ_IDS = [
  'krótka-wiadomość-zamiast-konsultacji',
  'czas-odpowiedzi',
  'czy-tylko-online',
  'przygotowanie',
  'plan-pracy',
]

function formatQuestionCount(count: number) {
  if (count === 1) return '1 pytanie'
  if (count > 1 && count < 5) return `${count} pytania`

  return `${count} pytań`
}

function CategoryIcon({ icon }: { icon: (typeof referenceFaqCategories)[number]['icon'] }) {
  if (icon === 'calendar') return <CalendarDays size={26} strokeWidth={1.8} aria-hidden="true" />
  if (icon === 'paw') return <PawPrint size={26} strokeWidth={1.8} aria-hidden="true" />
  if (icon === 'cat') return <Cat size={26} strokeWidth={1.8} aria-hidden="true" />
  if (icon === 'payment') return <WalletCards size={26} strokeWidth={1.8} aria-hidden="true" />
  if (icon === 'screen') return <Monitor size={26} strokeWidth={1.8} aria-hidden="true" />

  return <HandHeart size={26} strokeWidth={1.8} aria-hidden="true" />
}

export function ReferenceFaq({ contactHref }: ReferenceFaqProps) {
  const [activeCategory, setActiveCategory] = useState<ReferenceFaqCategory | 'all'>('all')
  const [openId, setOpenId] = useState(referenceFaqItems[0]?.id ?? '')
  const [showAll, setShowAll] = useState(false)

  const categoryById = useMemo(() => {
    return referenceFaqCategories.reduce<Record<ReferenceFaqCategory, (typeof referenceFaqCategories)[number]>>(
      (categories, category) => {
        categories[category.id] = category

        return categories
      },
      {} as Record<ReferenceFaqCategory, (typeof referenceFaqCategories)[number]>,
    )
  }, [])

  const categoryCounts = useMemo(() => {
    return referenceFaqCategories.reduce<Record<ReferenceFaqCategory, number>>((counts, category) => {
      counts[category.id] = referenceFaqItems.filter((item) => item.category === category.id).length

      return counts
    }, {} as Record<ReferenceFaqCategory, number>)
  }, [])

  const filteredItems = useMemo(() => {
    return referenceFaqItems.filter((item) => {
      return activeCategory === 'all' || item.category === activeCategory
    })
  }, [activeCategory])

  const orderedItems = useMemo(() => {
    if (activeCategory !== 'all') return filteredItems

    const featuredRank = new Map(FEATURED_FAQ_IDS.map((id, index) => [id, index]))

    return [...filteredItems].sort((first, second) => {
      const firstRank = featuredRank.get(first.id) ?? Number.MAX_SAFE_INTEGER
      const secondRank = featuredRank.get(second.id) ?? Number.MAX_SAFE_INTEGER

      return firstRank - secondRank
    })
  }, [activeCategory, filteredItems])

  const visibleItems =
    activeCategory === 'all' && !showAll
      ? orderedItems.slice(0, INITIAL_VISIBLE_ITEMS)
      : orderedItems

  const currentTitle =
    activeCategory === 'all' ? 'Popularne pytania' : categoryById[activeCategory]?.label ?? 'Popularne pytania'

  useEffect(() => {
    if (visibleItems.length === 0) {
      setOpenId('')
      return
    }

    if (!visibleItems.some((item) => item.id === openId)) {
      setOpenId(visibleItems[0].id)
    }
  }, [openId, visibleItems])

  function selectCategory(categoryId: ReferenceFaqCategory) {
    setActiveCategory((currentCategory) => (currentCategory === categoryId ? 'all' : categoryId))
    setShowAll(false)
  }

  function toggleOpen(id: string, question: string, index: number) {
    const nextId = openId === id ? '' : id
    setOpenId(nextId)

    if (nextId) {
      trackAnalyticsEvent('faq_open', { location: 'reference-faq', question, index: index + 1 })
    }
  }

  return (
    <>
      <section className="reference-hero reference-faq-hero">
        <div className="reference-hero-copy reference-faq-hero-copy">
          <span className="reference-pill">FAQ</span>
          <h1>Najczęstsze pytania i odpowiedzi</h1>
          <p>
            Zebrałem najczęstsze pytania opiekunów psów i kotów. Jeśli nie znajdziesz odpowiedzi, opisz sytuację
            własnymi słowami. Chętnie pomogę!
          </p>
        </div>
        <div className="reference-faq-hero-art" aria-hidden="true">
          <Image
            src="/faq/faq-hero-pets-cutout.png"
            alt=""
            fill
            priority
            sizes="(max-width: 760px) 90vw, 430px"
            className="reference-faq-hero-image"
          />
        </div>
        <span className="reference-faq-leaves reference-faq-leaves-top" aria-hidden="true" />
        <span className="reference-faq-leaves reference-faq-leaves-left" aria-hidden="true" />
        <span className="reference-faq-paw-mark" aria-hidden="true">
          <PawPrint size={42} strokeWidth={1.7} />
        </span>
      </section>

      <section className="reference-category-grid" aria-label="Kategorie FAQ">
        {referenceFaqCategories.map((category) => (
          <button
            key={category.id}
            type="button"
            className={`reference-category-card${activeCategory === category.id ? ' is-active' : ''}`}
            onClick={() => selectCategory(category.id)}
            aria-pressed={activeCategory === category.id}
          >
            <span className="reference-category-icon">
              <CategoryIcon icon={category.icon} />
            </span>
            <span>
              <strong>{category.label}</strong>
              <small>{formatQuestionCount(categoryCounts[category.id] ?? 0)}</small>
            </span>
            <ChevronRight className="reference-category-arrow" size={24} strokeWidth={1.8} aria-hidden="true" />
          </button>
        ))}
      </section>

      <section className="reference-main-layout reference-faq-layout">
        <div className="reference-faq-list-wrap">
          <h2>
            <Sparkles size={28} strokeWidth={1.8} aria-hidden="true" />
            {currentTitle}
          </h2>
          <div className="reference-faq-list">
            {visibleItems.length > 0 ? (
              visibleItems.map((item, index) => {
                const isOpen = openId === item.id

                return (
                  <article key={item.id} className={`reference-faq-item${isOpen ? ' is-open' : ''}`}>
                    <button
                      type="button"
                      className="reference-faq-question"
                      aria-expanded={isOpen}
                      aria-controls={`faq-answer-${item.id}`}
                      onClick={() => toggleOpen(item.id, item.question, index)}
                    >
                      <span className="reference-faq-number">{String(index + 1).padStart(2, '0')}</span>
                      <span>{item.question}</span>
                      {isOpen ? <Minus size={21} aria-hidden="true" /> : <Plus size={21} aria-hidden="true" />}
                    </button>
                    <div id={`faq-answer-${item.id}`} className="reference-faq-answer" hidden={!isOpen}>
                      <p>{item.answer}</p>
                    </div>
                  </article>
                )
              })
            ) : (
              <div className="reference-faq-empty">
                Nie znalazłem takiego pytania. Opisz sytuację krótko w formularzu, a dobiorę najlepszy pierwszy krok.
              </div>
            )}
          </div>
          {activeCategory === 'all' && orderedItems.length > INITIAL_VISIBLE_ITEMS ? (
            <button type="button" className="reference-show-all" onClick={() => setShowAll((value) => !value)}>
              {showAll ? 'Pokaż mniej pytań' : 'Zobacz wszystkie pytania'}
              <ChevronDown size={16} strokeWidth={1.8} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </section>

      <section className="reference-side-card reference-quick-answers-card">
        <h2>Szybkie odpowiedzi</h2>
        <div className="reference-info-list reference-quick-grid">
          <div className="reference-info-row">
            <Clock3 size={25} strokeWidth={1.7} aria-hidden="true" />
            <span>
              <strong>Odpowiadam w 1-2 dni robocze</strong>
              <small>Zwykle odpisuję w ciągu 1-2 dni roboczych.</small>
            </span>
          </div>
          <div className="reference-info-row">
            <HandHeart size={25} strokeWidth={1.7} aria-hidden="true" />
            <span>
              <strong>Psy i koty</strong>
              <small>Pracuję z psami i kotami w każdym wieku.</small>
            </span>
          </div>
          <div className="reference-info-row">
            <PawPrint size={25} strokeWidth={1.7} aria-hidden="true" />
            <span>
              <strong>Bez oceniania</strong>
              <small>Każda sytuacja jest inna. Zaczynamy od faktów i spokojnego pierwszego kroku.</small>
            </span>
          </div>
          <div className="reference-info-row">
            <MapPin size={25} strokeWidth={1.7} aria-hidden="true" />
            <span>
              <strong>Online w całej Polsce</strong>
              <small>Spokojna rozmowa bez stresu dla zwierzęcia.</small>
            </span>
          </div>
        </div>
        <span className="reference-faq-leaves reference-faq-leaves-bottom" aria-hidden="true" />
      </section>

      <section className="reference-final-cta reference-faq-final-cta">
        <div className="reference-final-copy">
          <h2>Nie znalazłeś odpowiedzi?</h2>
          <p>Opisz krótko sytuację, a pomogę dobrać najlepszy pierwszy krok.</p>
          <div className="reference-final-actions">
            <Link href={contactHref} prefetch={false} className="reference-btn reference-btn-primary">
              <MessageCircle size={20} strokeWidth={1.8} aria-hidden="true" />
              Opisz krótko sytuację
            </Link>
            <Link href="/" prefetch={false} className="reference-btn reference-btn-secondary">
              <Leaf size={20} strokeWidth={1.8} aria-hidden="true" />
              Pomóż mi dobrać pierwszy krok
            </Link>
          </div>
        </div>
        <span className="reference-faq-help-sprite" aria-hidden="true" />
      </section>
    </>
  )
}
