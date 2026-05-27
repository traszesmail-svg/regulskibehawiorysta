'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ChevronDown, Zap } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { trackAnalyticsEvent } from '@/lib/analytics'
import {
  homepageAnimalQuestion,
  homepageProblemOptionsByAnimal,
  homepageSelectorRecommendations,
  homepageUrgencyQuestion,
  resolveHomepageSelectorRecommendation,
  type HomepageSelectorAnswers,
  type HomepageSelectorAnimal,
  type HomepageSelectorOption,
  type HomepageSelectorQuestion,
  type HomepageSelectorQuestionId,
  type HomepageSelectorRecommendationKey,
} from '@/lib/homepage-data'

const problemToBookingProblem: Record<string, string> = {
  dog_walk: 'spacer',
  dog_separation: 'separacja',
  puppy: 'szczeniak',
  dog_aggression: 'agresja',
  dog_barking_arousal: 'pobudzenie',
  dog_other: 'inne',
  cat_litter: 'kot-kuweta',
  cat_stress: 'kot-wycofanie',
  cat_conflict: 'kot-konflikt',
  cat_vocalization: 'kot-wokalizacja',
  cat_change: 'kot-zmiany-w-domu',
  cat_other: 'inne',
}

function getAnimal(value: string | undefined): HomepageSelectorAnimal | null {
  if (value === 'dog' || value === 'cat') {
    return value
  }

  return null
}

function buildSelectorHref(answers: HomepageSelectorAnswers, resultKey: HomepageSelectorRecommendationKey) {
  const recommendation = homepageSelectorRecommendations[resultKey]
  const problem = answers.problem ? problemToBookingProblem[answers.problem] ?? 'inne' : null
  const species = answers.animal === 'cat' ? 'kot' : answers.animal === 'dog' ? 'pies' : null
  const params = new URLSearchParams()

  params.set('service', recommendation.service)

  if (problem) {
    params.set('problem', problem)
  }

  if (species) {
    params.set('species', species)
  }

  return `/book?${params.toString()}`
}

function buildProblemQuestion(animal: HomepageSelectorAnimal | null): HomepageSelectorQuestion {
  const isCat = animal === 'cat'

  return {
    id: 'problem',
    label: '2',
    title: 'Co najbardziej przypomina Waszą sytuację?',
    helper: isCat ? 'Wybierz najbliższy koci sygnał.' : 'Wybierz najbliższą psią sytuację.',
    options: animal ? homepageProblemOptionsByAnimal[animal] : [],
  }
}

const heroChoices = [
  {
    id: 'dog',
    title: 'Mam psa',
    copy: 'Coś dzieje się na spacerach, w domu albo w kontakcie z ludźmi i psami.',
    href: '/wybor?animal=dog',
  },
  {
    id: 'cat',
    title: 'Mam kota',
    copy: 'Kuweta, napięcie, stres, drugi kot albo zmiana w domu.',
    href: '/wybor?animal=cat',
  },
  {
    id: 'unknown',
    title: 'Nie wiem, co wybrać',
    copy: 'Przeprowadź mnie przez kilka pytań i pokaż najrozsądniejszy pierwszy krok.',
    href: '/quiz',
  },
] as const

const heroChoiceDisplay: Record<(typeof heroChoices)[number]['id'], { title: string; copy: string }> = {
  dog: {
    title: 'Mam psa',
    copy: 'Coś dzieje się na spacerach, w domu albo w kontakcie z ludźmi i psami.',
  },
  cat: {
    title: 'Mam kota',
    copy: 'Kuweta, napięcie, stres, drugi kot albo zmiana w domu.',
  },
  unknown: {
    title: 'Nie wiem, co wybrać',
    copy: 'Przeprowadź mnie przez kilka pytań i pokaż najrozsądniejszy pierwszy krok.',
  },
}

function RouterChoiceIcon({ choiceId }: { choiceId: (typeof heroChoices)[number]['id'] }) {
  if (choiceId === 'dog') {
    return (
      <Image
        className="router-choice-silhouette router-choice-silhouette-dog"
        src="/branding/homepage/choice-dog-clean.png"
        alt=""
        width={438}
        height={384}
      />
    )
  }

  if (choiceId === 'cat') {
    return (
      <Image
        className="router-choice-silhouette router-choice-silhouette-cat"
        src="/branding/homepage/choice-cat-clean.png"
        alt=""
        width={404}
        height={466}
      />
    )
  }

  return (
    <Image
      className="router-choice-silhouette router-choice-silhouette-question"
      src="/branding/homepage/choice-question-clean.png"
      alt=""
      width={324}
      height={324}
    />
  )
}

type HomepageServiceSelectorProps = {
  mode?: 'home' | 'quiz'
  initialAnimal?: HomepageSelectorAnimal | null
  animalHrefBase?: '/wybor' | '/quiz'
}

export function HomepageServiceSelector({ mode = 'home', initialAnimal = null, animalHrefBase = '/wybor' }: HomepageServiceSelectorProps) {
  const [answers, setAnswers] = useState<HomepageSelectorAnswers>(() => (initialAnimal ? { animal: initialAnimal } : {}))
  const [completedSignature, setCompletedSignature] = useState('')
  const showHero = mode === 'home'

  const animal = getAnimal(answers.animal)
  const questions = useMemo(() => [homepageAnimalQuestion, buildProblemQuestion(animal), homepageUrgencyQuestion], [animal])
  const problemQuestion = questions[1]
  const urgencyQuestion = questions[2]
  const isComplete = questions.every((question) => answers[question.id])
  const resultKey = useMemo(() => resolveHomepageSelectorRecommendation(answers), [answers])
  const recommendation = homepageSelectorRecommendations[resultKey]
  const resultHref = buildSelectorHref(answers, resultKey)

  useEffect(() => {
    if (!initialAnimal) {
      return
    }

    setAnswers((current) => (current.animal === initialAnimal ? current : { animal: initialAnimal }))
  }, [initialAnimal])

  function chooseAnswer(questionId: HomepageSelectorQuestionId, option: HomepageSelectorOption) {
    const nextAnswers: HomepageSelectorAnswers =
      questionId === 'animal'
        ? { animal: option.id }
        : {
            ...answers,
            [questionId]: option.id,
          }
    const signature = questions.map((question) => nextAnswers[question.id] ?? '').join('|')

    setAnswers(nextAnswers)

    trackAnalyticsEvent('topic_selected', {
      location: 'home-router',
      question: questionId,
      answer: option.id,
    })

    if (questions.every((question) => nextAnswers[question.id]) && signature !== completedSignature) {
      setCompletedSignature(signature)
      trackAnalyticsEvent('quiz_completed', {
        location: 'home-router',
        result: resolveHomepageSelectorRecommendation(nextAnswers),
        animal: nextAnswers.animal ?? 'unknown',
      })
    }
  }

  function chooseAnimal(option: HomepageSelectorOption) {
    chooseAnswer('animal', option)
  }

  return (
    <div className={`homepage-router${showHero ? '' : ' homepage-router-quiz'}`} id="wybór">
      {showHero ? (
        <div className="router-hero-stage">
          <header className="router-hero-copy">
            <figure className="router-mobile-hero-visual" aria-label="Spokojny pies i kot w jasnym, domowym świetle">
              <Image
                src="/images/mobile-header-pies-kot-reference.png"
                alt="Spokojny pies i kot leżą obok siebie w jasnym, ciepłym świetle"
                width={885}
                height={432}
                priority
                sizes="(max-width: 760px) calc(100vw - 44px), 1px"
              />
            </figure>
            <div className="router-hero-intro">
              <div className="router-hero-text">
                <h1 className="router-reference-title">Behawiorysta psów i kotów online — spokojny pierwszy krok</h1>
                <p className="router-reference-copy router-hero-lede">
                  <span>Nie musisz znać fachowej nazwy problemu.</span>
                  <span>Opisz, co dzieje się w domu, na spacerze albo przy kuwecie.</span>
                  <span>Pomogę Ci zrozumieć przyczynę i wybrać najlepszy kolejny krok.</span>
                </p>
              </div>

            </div>
            <div className="router-choice-grid" aria-label="Wybierz kierunek">
              {heroChoices.map((choice) => (
                <Link
                  key={choice.id}
                  href={choice.href}
                  prefetch={false}
                  className="router-choice-card"
                  onClick={() =>
                    trackAnalyticsEvent('cta_click', {
                      location: 'home-router-choice',
                      choice: choice.id,
                    })
                  }
                >
                  <span className="router-choice-icon" aria-hidden="true">
                    <RouterChoiceIcon choiceId={choice.id} />
                  </span>
                  <strong>{heroChoiceDisplay[choice.id].title}</strong>
                  {choice.id === 'unknown' ? <em className="router-choice-quiz-label">Quiz</em> : null}
                  <span className="router-choice-copy">
                    <span>{heroChoiceDisplay[choice.id].copy}</span>
                    {choice.id === 'dog' || choice.id === 'cat' ? <span className="router-choice-price">od 69 zł</span> : null}
                  </span>
                  <ArrowRight className="router-choice-arrow" size={18} strokeWidth={1.8} aria-hidden="true" />
                </Link>
              ))}
            </div>
            <div className="router-hero-service-actions" aria-label="Szybki wybór rozmowy">
              <Link
                href="/kwadrans-na-juz"
                prefetch={false}
                className="notatnik-btn notatnik-btn-urgent router-methodology-cta router-service-cta router-urgent-cta"
                onClick={() =>
                  trackAnalyticsEvent('cta_click', {
                    location: 'home-router-service-cta',
                    service: 'kwadrans-na-juz',
                  })
                }
              >
                <Zap size={22} strokeWidth={2.2} aria-hidden="true" />
                <span>Znajdź termin dla spraw pilnych!</span>
              </Link>
            </div>
            <p className="router-reference-copy router-choice-microcopy">
              Nie musisz diagnozować psa ani kota. Wystarczy, że opiszesz, co widzisz na co dzień.
            </p>
          </header>
        </div>
      ) : null}

      {!showHero ? (
        <section className="home-guided-selector" aria-labelledby="home-guided-selector-title">
          <div className="home-guided-copy">
            <h2 id="home-guided-selector-title">Quiz</h2>
          </div>
          <div className="home-guided-grid">
            <article className="home-guided-step">
              <div className="home-guided-step-head">
                <span>1</span>
                <strong>Kogo dotyczy sytuacja?</strong>
              </div>
              <div className="home-guided-animal-options">
                {homepageAnimalQuestion.options.map((option) => (
                  <Link
                    key={option.id}
                    href={`${animalHrefBase}?animal=${option.id}`}
                    prefetch={false}
                    scroll={false}
                    className={answers.animal === option.id ? 'is-selected' : ''}
                    aria-current={answers.animal === option.id ? 'true' : undefined}
                    onClick={() => chooseAnimal(option)}
                  >
                    {option.id === 'dog' ? <RouterChoiceIcon choiceId="dog" /> : <RouterChoiceIcon choiceId="cat" />}
                    <span>{option.label}</span>
                  </Link>
                ))}
              </div>
            </article>

            <article className="home-guided-step">
              <div className="home-guided-step-head">
                <span>2</span>
                <strong>Co najbardziej przypomina Waszą sytuację?</strong>
              </div>
              <p>Wybierz temat z listy dopasowanej do Twojego zwierzęcia.</p>
              <label className="home-guided-select">
                <select
                  value={answers.problem ?? ''}
                  disabled={!animal}
                  onChange={(event) => {
                    const option = problemQuestion.options.find((item) => item.id === event.target.value)
                    if (option) chooseAnswer('problem', option)
                  }}
                >
                  <option value="">{animal ? 'Wybierz...' : 'Najpierw wybierz psa albo kota'}</option>
                  {problemQuestion.options.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={17} strokeWidth={1.9} aria-hidden="true" />
              </label>
            </article>

            <article className="home-guided-step">
              <div className="home-guided-step-head">
                <span>3</span>
                <strong>Jak bardzo potrzebujesz teraz uporządkowania?</strong>
              </div>
              <div className="home-guided-urgency-options">
                {urgencyQuestion.options.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={answers.urgency === option.id ? 'is-selected' : ''}
                    aria-pressed={answers.urgency === option.id}
                    onClick={() => chooseAnswer('urgency', option)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </article>

            <aside className="home-guided-result" aria-live="polite">
              <div className="home-guided-result-copy">
                <span>Najrozsądniejszy pierwszy krok</span>
                <h3>{isComplete ? recommendation.title : 'Wybierz 3 odpowiedzi'}</h3>
                <p>{isComplete ? recommendation.summary : 'Po ostatniej odpowiedzi pokażę rozmowę, cenę i spokojny następny krok.'}</p>
              </div>

              <div className="home-guided-price-card" aria-label="Cena rekomendowanej rozmowy">
                <small>{isComplete ? recommendation.duration : 'Cena i rozmowa'}</small>
                <strong>{isComplete ? recommendation.price : 'po wyborze'}</strong>
              </div>

              <div className="home-guided-result-action">
                {isComplete ? (
                  <Link
                    href={resultHref}
                    prefetch={false}
                    className="notatnik-btn notatnik-btn-accent"
                    onClick={() =>
                      trackAnalyticsEvent('cta_click', {
                        location: 'home-router-result',
                        service: recommendation.service,
                      })
                    }
                  >
                    <span>{recommendation.ctaLabel}</span>
                  </Link>
                ) : (
                  <button type="button" className="notatnik-btn notatnik-btn-accent" disabled>
                    <span>Pokaż mi, od czego zacząć</span>
                  </button>
                )}
              </div>
            </aside>
          </div>
        </section>
      ) : null}
    </div>
  )
}
