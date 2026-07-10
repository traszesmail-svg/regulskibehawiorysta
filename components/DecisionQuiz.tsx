'use client'

import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  CircleHelp,
  Clock3,
  CloudLightning,
  Cat,
  Dog,
  HeartHandshake,
  Home,
  ListChecks,
  PawPrint,
  Route,
  SearchCheck,
  ShieldCheck,
  Stethoscope,
  Trees,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { trackAnalyticsEvent } from '@/lib/analytics'
import {
  QUIZ_QUESTIONS,
  QUIZ_SERVICE_LABELS,
  getQuizProblemContext,
  resolveQuizResult,
  type QuizAnswers,
  type QuizServiceKey,
} from '@/lib/quiz'

type DecisionQuizProps = {
  bookingHrefs: Record<QuizServiceKey, string>
  initialProblemKey?: string | null
}

type OptionVisual = {
  icon?: LucideIcon
  image?: string
  alt?: string
}

const optionVisuals: Record<string, OptionVisual> = {
  pies: { icon: Dog },
  kot: { icon: Cat },
  home_behavior: { icon: Home },
  walks: { icon: Trees },
  fear_stress: { icon: CloudLightning },
  relationships: { icon: Users },
  other: { icon: CircleHelp },
  none: { icon: ShieldCheck },
  tension: { icon: HeartHandshake },
  danger: { icon: ShieldCheck },
  no: { icon: Check },
  unclear: { icon: SearchCheck },
  yes: { icon: Stethoscope },
  fresh: { icon: CalendarClock },
  returning: { icon: Clock3 },
  long: { icon: ListChecks },
  rare: { icon: Clock3 },
  weekly: { icon: CalendarClock },
  daily: { icon: ListChecks },
  clear: { icon: SearchCheck },
  partial: { icon: Route },
  simple: { icon: Check },
  several: { icon: Route },
  multi_pet: { icon: PawPrint },
  some: { icon: ListChecks },
  many: { icon: SearchCheck },
  priority: { icon: Check },
  check: { icon: SearchCheck },
  plan: { icon: ListChecks },
  diagnosis: { icon: Stethoscope },
}

function OptionIcon({ optionId, selected }: { optionId: string; selected: boolean }) {
  const visual = optionVisuals[optionId] ?? { icon: PawPrint }

  if (visual.image) {
    return (
      <span className="quiz-option-image" aria-hidden="true">
        <Image src={visual.image} alt="" width={96} height={96} />
      </span>
    )
  }

  const Icon = visual.icon ?? PawPrint

  return (
    <span className="quiz-option-icon" aria-hidden="true" data-selected={selected ? 'true' : 'false'}>
      <Icon size={30} strokeWidth={1.9} />
    </span>
  )
}

export function DecisionQuiz({ bookingHrefs, initialProblemKey }: DecisionQuizProps) {
  const problemContext = getQuizProblemContext(initialProblemKey)
  const initialStepIndex = problemContext?.species
    ? Math.max(
        QUIZ_QUESTIONS.findIndex((question) => question.id === 'main_topic'),
        0,
      )
    : 0
  const [stepIndex, setStepIndex] = useState(initialStepIndex)
  const [answers, setAnswers] = useState<QuizAnswers>(() => ({
    ...(problemContext?.species ? { species: problemContext.species } : {}),
    ...(problemContext ? { problem_context: problemContext.problemKey } : {}),
  }))
  const [showResult, setShowResult] = useState(false)
  const autoAdvanceTimer = useRef<number | null>(null)
  const quizRootRef = useRef<HTMLDivElement | null>(null)
  const hasMountedRef = useRef(false)

  const currentQuestion = QUIZ_QUESTIONS[stepIndex]
  const questionTitle =
    problemContext && currentQuestion?.id === 'main_topic' ? 'Co dzieje się najczęściej?' : currentQuestion?.title
  const questionHelper =
    problemContext && currentQuestion?.id === 'main_topic'
      ? 'Wybierz najbliższy opis. Temat z linku zostanie dopięty do wyniku quizu.'
      : currentQuestion?.helper
  const result = useMemo(() => resolveQuizResult(answers), [answers])
  const resultMeta = QUIZ_SERVICE_LABELS[result.serviceKey]
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined
  const progress = ((showResult ? QUIZ_QUESTIONS.length : stepIndex + 1) / QUIZ_QUESTIONS.length) * 100

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true
      return
    }

    quizRootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [stepIndex, showResult])

  function clearAutoAdvance() {
    if (autoAdvanceTimer.current) {
      window.clearTimeout(autoAdvanceTimer.current)
      autoAdvanceTimer.current = null
    }
  }

  function completeQuiz(finalAnswers: QuizAnswers) {
    const finalResult = resolveQuizResult(finalAnswers)

    setShowResult(true)
    trackAnalyticsEvent('quiz_completed', {
      location: 'quiz',
      result: finalResult.serviceKey,
      species: finalAnswers.species ?? problemContext?.species ?? 'unknown',
      problem_key: finalAnswers.problem_context ?? problemContext?.problemKey ?? null,
    })
  }

  function scheduleAutoAdvance(questionId: string, nextAnswers: QuizAnswers) {
    clearAutoAdvance()

    const questionIndex = QUIZ_QUESTIONS.findIndex((question) => question.id === questionId)

    if (questionIndex === -1) {
      return
    }

    autoAdvanceTimer.current = window.setTimeout(() => {
      autoAdvanceTimer.current = null

      if (questionIndex >= QUIZ_QUESTIONS.length - 1) {
        completeQuiz(nextAnswers)
        return
      }

      setStepIndex((current) => (current === questionIndex ? current + 1 : current))
    }, 380)
  }

  function selectAnswer(questionId: string, optionId: string) {
    const nextAnswers = { ...answers, [questionId]: optionId }

    setAnswers(nextAnswers)

    trackAnalyticsEvent('topic_selected', {
      location: 'quiz',
      question: questionId,
      answer: optionId,
      problem_key: nextAnswers.problem_context ?? problemContext?.problemKey ?? null,
    })

    scheduleAutoAdvance(questionId, nextAnswers)
  }

  function goNext() {
    if (!currentQuestion || !currentAnswer) {
      return
    }

    clearAutoAdvance()

    if (stepIndex >= QUIZ_QUESTIONS.length - 1) {
      completeQuiz(answers)
      return
    }

    setStepIndex((current) => current + 1)
  }

  function goBack() {
    clearAutoAdvance()

    if (showResult) {
      setShowResult(false)
      setStepIndex(QUIZ_QUESTIONS.length - 1)
      return
    }

    setStepIndex((current) => Math.max(current - 1, 0))
  }

  if (!currentQuestion) {
    return null
  }

  if (showResult) {
    const bookingHref = bookingHrefs[result.serviceKey]

    return (
      <div ref={quizRootRef} className="decision-quiz decision-quiz-result">
        <article className="decision-quiz-result-card">
          <div className="quiz-question-pill">Wynik quizu</div>
          <h2>{result.title}</h2>
          <p>{result.summary}</p>

          {result.firstStep || result.avoid ? (
            <div className="decision-quiz-context-result">
              {result.firstStep ? (
                <div>
                  <strong>Pierwszy krok</strong>
                  <p>{result.firstStep}</p>
                </div>
              ) : null}
              {result.avoid ? (
                <div>
                  <strong>Czego nie robić na start</strong>
                  <p>{result.avoid}</p>
                </div>
              ) : null}
              <div className="decision-quiz-context-links">
                {result.articleHref ? (
                  <Link href={result.articleHref} prefetch={false}>
                    {result.articleLabel ?? 'Czytaj artykuł'}
                  </Link>
                ) : null}
                {result.problemHref ? (
                  <Link href={result.problemHref} prefetch={false}>
                    {result.problemLabel ?? 'Zobacz stronę problemową'}
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="decision-quiz-result-price" aria-label="Sugerowana konsultacja">
            <span>{resultMeta.label}</span>
            <strong>{resultMeta.price}</strong>
            <small>{resultMeta.duration}</small>
          </div>

          <ul className="decision-quiz-reasons">
            {result.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>

          <p className="field-help">{result.note}</p>

          <div className="quiz-actions">
            <Link
              href={bookingHref}
              prefetch={false}
              className="button button-primary big-button"
              onClick={() =>
                trackAnalyticsEvent('cta_click', {
                  location: 'quiz-result',
                  service: result.serviceKey,
                  problem_key: answers.problem_context ?? problemContext?.problemKey ?? null,
                })
              }
            >
              <span>Wybierz termin konsultacji</span>
              <ArrowRight size={22} strokeWidth={2.1} aria-hidden="true" />
            </Link>
            <button type="button" className="button button-ghost" onClick={goBack}>
              Zmień odpowiedzi
            </button>
          </div>
        </article>

        <article className="quiz-safe-note">
          <span className="quiz-option-icon" aria-hidden="true">
            <ShieldCheck size={28} strokeWidth={1.9} />
          </span>
          <span>
            <strong>Spokojny kolejny krok</strong>
            <small>Po kliknięciu wybierzesz termin i krótko opiszesz sytuację. Bez formularza na kilkanaście stron.</small>
          </span>
        </article>

        <div className="quiz-bottom-pets" aria-hidden="true">
          <Image src="/faq/faq-hero-pets-transparent.png" alt="" width={520} height={340} priority={false} />
        </div>
      </div>
    )
  }

  return (
    <div ref={quizRootRef} className="decision-quiz">
      <div className="decision-quiz-progress" aria-label="Postęp quizu">
        <div className="decision-quiz-progress-label">
          <span>Krok {stepIndex + 1} z {QUIZ_QUESTIONS.length}</span>
          {stepIndex > 0 ? (
            <button type="button" onClick={goBack}>
              <ArrowLeft size={18} strokeWidth={2} aria-hidden="true" />
              Wróć
            </button>
          ) : null}
        </div>
        <div className="decision-quiz-progress-bar">
          <i style={{ width: `${progress}%` }} />
        </div>
      </div>

      <article className="decision-quiz-card">
        <div className="quiz-question-pill">Pytanie {stepIndex + 1}</div>
        <h2>{questionTitle}</h2>
        {questionHelper ? <p className="muted">{questionHelper}</p> : null}

        <div className="decision-quiz-options" role="radiogroup" aria-label={questionTitle}>
          {currentQuestion.options.map((option) => {
            const selected = currentAnswer === option.id

            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`decision-quiz-option${selected ? ' is-selected' : ''}`}
                onClick={() => selectAnswer(currentQuestion.id, option.id)}
              >
                <OptionIcon optionId={option.id} selected={selected} />
                <span className="quiz-option-copy">
                  <strong>{option.label}</strong>
                  {option.helper ? <span>{option.helper}</span> : null}
                </span>
                <span className="quiz-option-radio" aria-hidden="true">
                  {selected ? <Check size={16} strokeWidth={2.4} /> : null}
                </span>
              </button>
            )
          })}
        </div>

        <div className="quiz-actions">
          <button type="button" className="button button-primary big-button" onClick={goNext} disabled={!currentAnswer}>
            <span>{stepIndex >= QUIZ_QUESTIONS.length - 1 ? 'Pokaż wynik' : 'Dalej'}</span>
            <ArrowRight size={22} strokeWidth={2.1} aria-hidden="true" />
          </button>
        </div>
      </article>

      <article className="quiz-safe-note">
        <span className="quiz-option-icon" aria-hidden="true">
          <ShieldCheck size={28} strokeWidth={1.9} />
        </span>
        <span>
          <strong>Twoje odpowiedzi są poufne</strong>
          <small>Nie zapisujemy danych bez Twojej zgody. Quiz służy tylko do dobrania najrozsądniejszej formy pomocy.</small>
        </span>
      </article>

      <div className="quiz-bottom-pets" aria-hidden="true">
        <Image src="/faq/faq-hero-pets-transparent.png" alt="" width={520} height={340} priority={false} />
      </div>
    </div>
  )
}
