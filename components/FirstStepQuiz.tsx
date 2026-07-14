'use client'

import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Cat,
  Check,
  CircleHelp,
  Compass,
  Eye,
  HeartPulse,
  House,
  PawPrint,
  ShieldCheck,
  TreePine,
  type LucideIcon,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { trackAnalyticsEvent } from '@/lib/analytics'
import { appendSearchParams, buildBookHref } from '@/lib/booking-routing'
import {
  createQuizBookingHandoff,
  writeQuizBookingHandoff,
} from '@/lib/quiz-booking-handoff'
import {
  getQuizProblemContext,
  getQuizQuestions,
  isQuizComplete,
  QUIZ_SERVICE_LABELS,
  resolveQuizResult,
  type QuizAnswers,
  type QuizQuestionId,
} from '@/lib/quiz-first-step'
import styles from './FirstStepQuiz.module.css'

type FirstStepQuizProps = {
  initialProblemKey?: string | null
  marketingParams?: Record<string, string>
}

const optionIcons: Record<string, LucideIcon> = {
  pies: PawPrint,
  kot: Cat,
  dog_walks: TreePine,
  dog_alone: House,
  dog_resources: ShieldCheck,
  dog_noise: HeartPulse,
  dog_change: CalendarDays,
  cat_litter: Cat,
  cat_touch: HeartPulse,
  cat_conflict: PawPrint,
  cat_change: CalendarDays,
  noise: HeartPulse,
  other: CircleHelp,
  yes: ShieldCheck,
  unsure: CircleHelp,
  no: Check,
  single: Compass,
  recurring: Eye,
  daily: CalendarDays,
  wide: PawPrint,
  not_applicable: CircleHelp,
}

function createInitialAnswers(initialProblemKey?: string | null) {
  const context = getQuizProblemContext(initialProblemKey)

  return {
    context,
    answers: {
      ...(context?.species ? { species: context.species } : {}),
      ...(context?.topic ? { topic: context.topic } : {}),
    } satisfies QuizAnswers,
  }
}

function getAnswerId(questionId: QuizQuestionId, optionId: string) {
  return `first-step-${questionId}-${optionId}`
}

export function FirstStepQuiz({ initialProblemKey, marketingParams }: FirstStepQuizProps) {
  const initial = useMemo(() => createInitialAnswers(initialProblemKey), [initialProblemKey])
  const [answers, setAnswers] = useState<QuizAnswers>(initial.answers)
  const [stepIndex, setStepIndex] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const quizRootRef = useRef<HTMLDivElement | null>(null)
  const questionHeadingRef = useRef<HTMLHeadingElement | null>(null)
  const resultHeadingRef = useRef<HTMLHeadingElement | null>(null)
  const didMountRef = useRef(false)

  const context = initial.context
  const questions = useMemo(() => getQuizQuestions(answers, context), [answers, context])
  const currentQuestion = questions[stepIndex]
  const isComplete = useMemo(() => isQuizComplete(answers, context), [answers, context])
  const result = useMemo(() => resolveQuizResult(answers, context), [answers, context])
  const bookingHandoff = useMemo(
    () => createQuizBookingHandoff({ answers, context, result }),
    [answers, context, result],
  )
  const bookingHref = bookingHandoff
    ? appendSearchParams(
        buildBookHref(bookingHandoff.problemType, bookingHandoff.serviceType, false, bookingHandoff.species),
        marketingParams,
      )
    : null
  const progressValue = showResult ? questions.length : Math.min(stepIndex + 1, questions.length)

  useEffect(() => {
    setAnswers(initial.answers)
    setStepIndex(0)
    setShowResult(false)
  }, [initial])

  useEffect(() => {
    if (stepIndex < questions.length) return
    setStepIndex(Math.max(questions.length - 1, 0))
  }, [questions.length, stepIndex])

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true
      return
    }

    const heading = showResult ? resultHeadingRef.current : questionHeadingRef.current
    heading?.focus({ preventScroll: true })
    quizRootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [showResult, stepIndex])

  function selectAnswer(questionId: QuizQuestionId, optionId: string) {
    setAnswers((current) => {
      if (questionId === 'species') {
        return { species: optionId }
      }

      if (questionId === 'topic') {
        return {
          ...(context?.species ? { species: context.species } : current.species ? { species: current.species } : {}),
          topic: optionId,
        }
      }

      return { ...current, [questionId]: optionId }
    })

    trackAnalyticsEvent('topic_selected', {
      location: 'quiz-first-step',
      question: questionId,
      answer: optionId,
      problem_key: context?.problemKey ?? null,
    })
  }

  function goNext() {
    if (!currentQuestion || !answers[currentQuestion.id]) return

    if (stepIndex >= questions.length - 1) {
      if (!isComplete || result.route === 'incomplete') return

      setShowResult(true)
      trackAnalyticsEvent('quiz_completed', {
        location: 'quiz-first-step',
        route: result.route,
        service: result.serviceKey ?? 'none',
        species: answers.species ?? context?.species ?? 'unknown',
        problem_key: context?.problemKey ?? null,
      })
      return
    }

    setStepIndex((current) => current + 1)
  }

  function goBack() {
    if (showResult) {
      setShowResult(false)
      setStepIndex(Math.max(questions.length - 1, 0))
      return
    }

    setStepIndex((current) => Math.max(current - 1, 0))
  }

  function resetQuiz() {
    setAnswers(initial.answers)
    setStepIndex(0)
    setShowResult(false)
  }

  if (!currentQuestion) return null

  if (showResult && result.route !== 'incomplete') {
    const service = result.serviceKey ? QUIZ_SERVICE_LABELS[result.serviceKey] : null

    return (
      <section ref={quizRootRef} className={styles.root} aria-labelledby="first-step-result-title">
        <div className={styles.resultFrame}>
          <motion.article
            className={styles.resultCard}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <div className={styles.resultEyebrow}>
              <Compass size={17} aria-hidden="true" />
              Twoja mapa pierwszego kroku
            </div>
            <h2 id="first-step-result-title" ref={resultHeadingRef} tabIndex={-1}>
              {result.title}
            </h2>
            <p className={styles.resultSummary}>{result.summary}</p>

            <div className={styles.guidanceGrid}>
              <article className={styles.guidanceCard}>
                <span className={styles.guidanceIcon} aria-hidden="true">
                  <Compass size={21} />
                </span>
                <h3>Co zrobić dziś</h3>
                <p>{result.firstStep}</p>
              </article>
              <article className={styles.guidanceCard}>
                <span className={styles.guidanceIcon} aria-hidden="true">
                  <ShieldCheck size={21} />
                </span>
                <h3>Czego nie dokładać</h3>
                <p>{result.avoid}</p>
              </article>
              <article className={styles.guidanceCard}>
                <span className={styles.guidanceIcon} aria-hidden="true">
                  <Eye size={21} />
                </span>
                <h3>Co obserwować</h3>
                <p>{result.observe}</p>
              </article>
            </div>

            <div className={styles.reasonBlock}>
              <strong>Dlaczego taki pierwszy krok</strong>
              <ul>
                {result.reasons.map((reason) => <li key={reason}>{reason}</li>)}
              </ul>
            </div>

            {result.articleHref || result.problemHref ? (
              <div className={styles.resourceBlock} aria-label="Materiały do dalszego uporządkowania tematu">
                <strong>Chcesz najpierw doczytać?</strong>
                <p>Przejrzyj krótki materiał albo stronę problemową, zanim zdecydujesz, czy potrzebujesz rozmowy.</p>
                <div className={styles.resourceLinks}>
                  {result.articleHref && result.articleLabel ? (
                    <Link href={result.articleHref} prefetch={false} className={styles.resourceLink}>
                      {result.articleLabel}
                      <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                  ) : null}
                  {result.problemHref && result.problemLabel ? (
                    <Link href={result.problemHref} prefetch={false} className={styles.resourceLink}>
                      {result.problemLabel}
                      <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}

            {service && bookingHref && bookingHandoff ? (
              <aside className={styles.serviceSuggestion} aria-label="Proponowany kolejny krok">
                <div>
                  <span>Jeśli chcesz omówić to ze mną</span>
                  <strong>{service.label}</strong>
                  <small>{service.duration} · {service.price}</small>
                </div>
                <Link
                  href={bookingHref}
                  prefetch={false}
                  className={styles.primaryAction}
                  onClick={() => {
                    writeQuizBookingHandoff(bookingHandoff)
                    trackAnalyticsEvent('cta_click', {
                      location: 'quiz-first-step-result',
                      service: result.serviceKey,
                      problem_key: context?.problemKey ?? null,
                    })
                  }}
                >
                  Wybierz termin
                  <ArrowRight size={19} aria-hidden="true" />
                </Link>
              </aside>
            ) : (
              <aside className={styles.safetyOutcome}>
                <ShieldCheck size={24} aria-hidden="true" />
                <span>{result.note}</span>
              </aside>
            )}

            {service ? <p className={styles.resultNote}>{result.note}</p> : null}

            <div className={styles.resultActions}>
              <button type="button" className={styles.secondaryAction} onClick={goBack}>
                <ArrowLeft size={18} aria-hidden="true" />
                Zmień odpowiedzi
              </button>
              <button type="button" className={styles.textAction} onClick={resetQuiz}>
                Zacznij od nowa
              </button>
            </div>
          </motion.article>

          <div className={styles.resultArt} aria-hidden="true">
            <span className={`${styles.orbit} ${styles.orbitOne}`} />
            <span className={`${styles.orbit} ${styles.orbitTwo}`} />
            <Image src="/faq/faq-hero-pets-transparent.png" alt="" width={520} height={340} sizes="(max-width: 760px) 84vw, 440px" />
          </div>
        </div>
      </section>
    )
  }

  const currentAnswer = answers[currentQuestion.id]

  return (
    <section ref={quizRootRef} className={styles.root} aria-labelledby="first-step-question-title">
      <div className={styles.introDeck} aria-hidden="true">
        <div className={styles.introCopy}>
          <span>Mapa pierwszego kroku</span>
          <strong>Spokojnie, bez etykiet i bez zgadywania.</strong>
          <small>Najpierw bezpieczeństwo, potem jeden pomocny ruch na dziś.</small>
        </div>
        <div className={styles.scene}>
          <span className={`${styles.orbit} ${styles.orbitOne}`} />
          <span className={`${styles.orbit} ${styles.orbitTwo}`} />
          <span className={styles.sceneSpark} />
          <Image
            className={styles.sceneImage}
            src="/faq/faq-hero-pets-transparent.png"
            alt=""
            width={520}
            height={340}
            sizes="(max-width: 760px) 70vw, 360px"
          />
        </div>
      </div>

      <div className={styles.progressHeader}>
        <div>
          <span>Krok {progressValue} z {questions.length}</span>
          <small>
            {currentQuestion.id === 'safety'
              ? 'Najpierw bezpieczeństwo'
              : currentQuestion.id === 'health'
                ? 'Sprawdzamy tło zdrowotne'
                : 'Kilka pytań dopasowanych do sytuacji'}
          </small>
        </div>
        <progress
          className={styles.progress}
          value={progressValue}
          max={questions.length}
          aria-label={`Postęp: krok ${progressValue} z ${questions.length}`}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.article
          key={`${currentQuestion.id}-${stepIndex}`}
          className={styles.card}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.24, ease: 'easeOut' }}
        >
          <span className={styles.questionPill}>Pytanie {progressValue}</span>
          <h2 id="first-step-question-title" ref={questionHeadingRef} tabIndex={-1}>
            {currentQuestion.title}
          </h2>
          {currentQuestion.helper ? <p className={styles.helper}>{currentQuestion.helper}</p> : null}

          <fieldset className={styles.options}>
            <legend className={styles.srOnly}>{currentQuestion.title}</legend>
            {currentQuestion.options.map((option) => {
              const selected = currentAnswer === option.id
              const Icon = optionIcons[option.id] ?? PawPrint
              const inputId = getAnswerId(currentQuestion.id, option.id)

              return (
                <label
                  key={option.id}
                  className={`${styles.option}${selected ? ` ${styles.optionSelected}` : ''}`}
                  htmlFor={inputId}
                >
                  <input
                    id={inputId}
                    className={styles.optionInput}
                    type="radio"
                    name={`first-step-${currentQuestion.id}`}
                    value={option.id}
                    checked={selected}
                    onChange={() => selectAnswer(currentQuestion.id, option.id)}
                  />
                  <span className={styles.optionSurface}>
                    <span className={styles.optionIcon} aria-hidden="true">
                      <Icon size={23} strokeWidth={1.8} />
                    </span>
                    <span className={styles.optionCopy}>
                      <strong>{option.label}</strong>
                      {option.helper ? <small>{option.helper}</small> : null}
                    </span>
                    <span className={styles.optionMark} aria-hidden="true">
                      {selected ? <Check size={15} strokeWidth={2.5} /> : null}
                    </span>
                  </span>
                </label>
              )
            })}
          </fieldset>

          <div className={styles.actions}>
            {stepIndex > 0 ? (
              <button type="button" className={styles.backAction} onClick={goBack}>
                <ArrowLeft size={18} aria-hidden="true" />
                Wróć
              </button>
            ) : (
              <span />
            )}
            <button type="button" className={styles.primaryAction} onClick={goNext} disabled={!currentAnswer}>
              {stepIndex >= questions.length - 1 ? 'Pokaż mój pierwszy krok' : 'Dalej'}
              <ArrowRight size={19} aria-hidden="true" />
            </button>
          </div>
        </motion.article>
      </AnimatePresence>

      <aside className={styles.privacyNote}>
        <ShieldCheck size={21} aria-hidden="true" />
        <span><strong>Bez udawanej diagnozy i bez odpowiedzi w linku.</strong> Przy rezerwacji przekazywany jest tylko zwięzły temat i wskazówka z mapy.</span>
      </aside>
    </section>
  )
}
