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
import { motion, AnimatePresence } from 'framer-motion'
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
  yes_good: { icon: Check },
  yes_bad: { icon: Stethoscope },
  vocalization: { icon: CloudLightning },
  destruction: { icon: ShieldCheck },
  elimination: { icon: Home },
  pacing: { icon: Route },
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
  const [answers, setAnswers] = useState<QuizAnswers>(() => ({
    ...(problemContext?.species ? { species: problemContext.species } : {}),
    ...(problemContext?.mainTopic ? { main_topic: problemContext.mainTopic } : {}),
    ...(problemContext ? { problem_context: problemContext.problemKey } : {}),
  }))
  const [stepIndex, setStepIndex] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisText, setAnalysisText] = useState('Koreluję odpowiedzi...')
  const autoAdvanceTimer = useRef<number | null>(null)
  const quizRootRef = useRef<HTMLDivElement | null>(null)
  const hasMountedRef = useRef(false)

  useEffect(() => {
    if (!isAnalyzing) return
    quizRootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

    const texts = [
      'Koreluję odpowiedzi...',
      'Oceniam ryzyko środowiskowe...',
      'Dobieram najbezpieczniejszy plan...'
    ]
    
    let textIndex = 0
    const interval = setInterval(() => {
      textIndex++
      if (textIndex < texts.length) {
        setAnalysisText(texts[textIndex])
      }
    }, 800)

    const finishTimeout = setTimeout(() => {
      clearInterval(interval)
      setIsAnalyzing(false)
      setShowResult(true)
    }, 2400)

    return () => {
      clearInterval(interval)
      clearTimeout(finishTimeout)
    }
  }, [isAnalyzing])

  const activeQuestions = useMemo(() => {
    return QUIZ_QUESTIONS.filter(q => {
      if (!q.condition) return true
      return q.condition(answers, problemContext ?? null)
    })
  }, [answers, problemContext])

  const currentQuestion = activeQuestions[stepIndex]
  const questionTitle =
    problemContext && currentQuestion?.id === 'main_topic' ? 'Co dzieje się najczęściej?' : currentQuestion?.title
  const questionHelper =
    problemContext && currentQuestion?.id === 'main_topic'
      ? 'Wybierz najbliższy opis. Temat z linku zostanie dopięty do wyniku quizu.'
      : currentQuestion?.helper
  const result = useMemo(() => resolveQuizResult(answers), [answers])
  const resultMeta = QUIZ_SERVICE_LABELS[result.serviceKey]
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined
  const progress = ((showResult ? activeQuestions.length : stepIndex + 1) / activeQuestions.length) * 100

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

    setIsAnalyzing(true)
    trackAnalyticsEvent('quiz_completed', {
      location: 'quiz',
      result: finalResult.serviceKey,
      species: finalAnswers.species ?? problemContext?.species ?? 'unknown',
      problem_key: finalAnswers.problem_context ?? problemContext?.problemKey ?? null,
    })
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

    clearAutoAdvance()

    autoAdvanceTimer.current = window.setTimeout(() => {
      autoAdvanceTimer.current = null

      const nextActiveQuestions = QUIZ_QUESTIONS.filter(q => {
        if (!q.condition) return true
        return q.condition(nextAnswers, problemContext ?? null)
      })

      const questionIndex = nextActiveQuestions.findIndex((q) => q.id === questionId)
      
      if (questionIndex === -1) return

      if (questionIndex >= nextActiveQuestions.length - 1) {
        completeQuiz(nextAnswers)
      } else {
        setStepIndex(questionIndex + 1)
      }
    }, 380)
  }

  function goNext() {
    if (!currentQuestion || !currentAnswer) {
      return
    }

    clearAutoAdvance()

    if (stepIndex >= activeQuestions.length - 1) {
      completeQuiz(answers)
      return
    }

    setStepIndex((current) => current + 1)
  }

  function goBack() {
    clearAutoAdvance()

    if (showResult) {
      setShowResult(false)
      setStepIndex(activeQuestions.length - 1)
      return
    }

    setStepIndex((current) => Math.max(current - 1, 0))
  }

  if (!currentQuestion) {
    return null
  }

  if (isAnalyzing) {
    return (
      <div ref={quizRootRef} className="decision-quiz decision-quiz-labor">
        <motion.div 
          className="decision-quiz-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
            style={{ width: 48, height: 48, borderRadius: '50%', border: '4px solid var(--border)', borderTopColor: 'var(--brand-main)', marginBottom: '2rem' }}
          />
          <AnimatePresence mode="wait">
            <motion.h2
              key={analysisText}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              style={{ textAlign: 'center', margin: 0 }}
            >
              {analysisText}
            </motion.h2>
          </AnimatePresence>
        </motion.div>
      </div>
    )
  }

  if (showResult) {
    let bookingHref = bookingHrefs[result.serviceKey]
    try {
      const isAbsolute = bookingHref.startsWith('http')
      const url = new URL(bookingHref, isAbsolute ? undefined : window.location.origin)
      const answersText = Object.entries(answers)
          .filter(([k]) => k !== 'problem_context')
          .map(([k, v]) => `${k}: ${v}`)
          .join(' | ')
      url.searchParams.set('notes', `[Z quizu] ${answersText}`)
      bookingHref = isAbsolute ? url.toString() : `${url.pathname}${url.search}`
    } catch(e) {
      // fallback to original if parsing fails
    }

    return (
      <div ref={quizRootRef} className="decision-quiz decision-quiz-result">
        <motion.article 
          className="decision-quiz-result-card"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
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
        </motion.article>

        <motion.article 
          className="quiz-safe-note"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <span className="quiz-option-icon" aria-hidden="true">
            <ShieldCheck size={28} strokeWidth={1.9} />
          </span>
          <span>
            <strong>Spokojny kolejny krok</strong>
            <small>Po kliknięciu wybierzesz termin i krótko opiszesz sytuację. Bez formularza na kilkanaście stron.</small>
          </span>
        </motion.article>

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
          <span>Krok {stepIndex + 1} z {activeQuestions.length}</span>
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

      <AnimatePresence mode="wait">
        <motion.article 
          key={stepIndex}
          className="decision-quiz-card"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
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
            <span>{stepIndex >= activeQuestions.length - 1 ? 'Pokaż wynik' : 'Dalej'}</span>
            <ArrowRight size={22} strokeWidth={2.1} aria-hidden="true" />
          </button>
        </div>
        </motion.article>
      </AnimatePresence>

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
