'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  resolveCaseMapTriage,
  type CaseMapAnswers,
  type CaseMapPath,
  type CaseMapRecord,
  type CaseMapSpecies,
  type CaseMapTopic,
  type CaseMapTriageAnswers,
  type CaseMapTriageState,
} from '@/lib/case-map'
import { CASE_MAP_PUBLIC_SAFETY_QUESTIONS } from '@/lib/case-map-questions'
import {
  CASE_MAP_ICON_SOURCES,
  getCaseMapQuestionOptionIcon,
  type CaseMapIconName,
} from '@/lib/case-map-icons'
import { appendSearchParams, buildBookHref } from '@/lib/booking-routing'
import { trackCaseMapPrivateAnalyticsEvent } from '@/lib/case-map-analytics'
import { createCaseMapBookingHandoff, writeCaseMapBookingHandoff, type CaseMapBookingServiceType } from '@/lib/case-map-booking-handoff'
import { clearCaseMapLoginDraft, readCaseMapLoginDraft, writeCaseMapLoginDraft } from '@/lib/case-map-login-draft'
import { buildCaseMapReport } from '@/lib/case-map-report'
import { getQuizProblemContext } from '@/lib/quiz-first-step'
import { CaseMapSaveCard } from './CaseMapSaveCard'
import styles from './ShortBehaviorMapFlow.module.css'

type Props = {
  initialProblemKey?: string | null
  initialCaseMapId?: string | null
  marketingParams?: Record<string, string>
  source?: 'direct' | 'problem_page' | 'instagram'
}

type StoredCaseMap = Pick<CaseMapRecord, 'id' | 'revision'>
type SafetyAnswer = 'yes' | 'no'

const MAP_PATH: CaseMapPath = 'fast'
const RECOMMENDED_SERVICE_TYPE: CaseMapBookingServiceType = 'szybka-konsultacja-15-min'

const EMPTY_TRIAGE: CaseMapTriageAnswers = {
  assessed: false,
  scope: 'public_safety',
  activeDanger: 'unknown',
  injury: 'unknown',
  emergencyHealth: 'unknown',
  healthChange: 'unknown',
  escapeSelfharm: 'unknown',
  vulnerableContext: 'unknown',
  vetStatus: 'unknown',
}

function readSafetyAnswer(value: unknown): SafetyAnswer | '' {
  return value === 'yes' || value === 'no' ? value : ''
}

function triageFromAnswers(answers: CaseMapAnswers): CaseMapTriageAnswers {
  const activeDanger = readSafetyAnswer(answers.active_danger)
  const injury = readSafetyAnswer(answers.injury)
  const emergencyHealth = readSafetyAnswer(answers.emergency_health)
  const healthChange = readSafetyAnswer(answers.health_change)
  const scope = answers.triage_scope === 'full' ? 'full' : 'public_safety'

  return {
    ...EMPTY_TRIAGE,
    assessed: answers.triage_assessed === false
      ? false
      : scope === 'public_safety'
        ? Boolean(activeDanger && emergencyHealth)
        : Boolean(activeDanger && (injury || emergencyHealth || healthChange)),
    scope,
    activeDanger: activeDanger || 'unknown',
    injury: injury || 'unknown',
    emergencyHealth: emergencyHealth || 'unknown',
    healthChange: healthChange || 'unknown',
    escapeSelfharm: readSafetyAnswer(answers.escape_selfharm) || 'unknown',
    vulnerableContext: readSafetyAnswer(answers.vulnerable_context) || 'unknown',
    vetStatus: answers.vet_status === 'seen' || answers.vet_status === 'not_seen' ? answers.vet_status : 'unknown',
  }
}

function mergeTriageAnswers(answers: CaseMapAnswers, triage: Partial<CaseMapTriageAnswers>) {
  const merged = { ...answers }
  const safetyValues: Array<[string, unknown]> = [
    ['active_danger', triage.activeDanger],
    ['emergency_health', triage.emergencyHealth],
  ]

  for (const [key, value] of safetyValues) {
    if (value === 'yes' || value === 'no') merged[key] = value
  }

  if (triage.scope === 'full' || triage.scope === 'public_safety') merged.triage_scope = triage.scope

  return merged
}

function urgentResultFor(state: Exclude<CaseMapTriageState, 'PROCEED'>) {
  if (state === 'SAFETY_NOW') {
    return {
      title: 'Najpierw zadbaj o bezpieczeństwo.',
      lead: 'Jeśli teraz istnieje bezpośrednie zagrożenie dla człowieka lub zwierzęcia, przerwij sytuację, zwiększ dystans i skontaktuj się z numerem 112.',
      advice: 'Nie kontynuuj teraz Mapy ani ćwiczeń. Najpierw bezpiecznie przerwij sytuację i poproś o pilną pomoc.',
    }
  }

  if (state === 'HUMAN_MEDICAL') {
    return {
      title: 'Najpierw pilna pomoc dla człowieka.',
      lead: 'Po pogryzieniu lub urazie człowieka skontaktuj się z właściwą pomocą medyczną i zabezpiecz sytuację.',
      advice: 'Mapa nie zastępuje pomocy medycznej. Do rozmowy o zachowaniu wrócisz dopiero po opanowaniu sytuacji.',
    }
  }

  if (state === 'VET_URGENT' || state === 'VET_FIRST') {
    return {
      title: 'Najpierw pilna pomoc weterynaryjna.',
      lead: 'Pogryzienie, uraz albo nagłe pogorszenie zdrowia wymagają pilnego kontaktu z weterynarzem lub kliniką całodobową.',
      advice: 'Mapa nie diagnozuje i nie zastępuje badania. Nie czekaj na poradę behawioralną, jeśli stan zwierzęcia nagle się pogorszył.',
    }
  }

  return {
    title: 'Najpierw zadbaj o bezpieczeństwo.',
    lead: 'Ta odpowiedź wymaga pilnej ostrożności. Nie będziemy prowadzić Cię dalej przez zwykłą ścieżkę Mapy.',
    advice: 'Przerwij sytuację, zwiększ dystans i skorzystaj z właściwej pilnej pomocy.',
  }
}

function MapIcon({ name, className = '' }: { name: CaseMapIconName; className?: string }) {
  return (
    <Image
      aria-hidden="true"
      alt=""
      className={className ? `${styles.generatedIcon} ${className}` : styles.generatedIcon}
      draggable={false}
      height={512}
      sizes="(max-width: 700px) 39px, 48px"
      src={CASE_MAP_ICON_SOURCES[name]}
      width={512}
    />
  )
}

export function ShortBehaviorMapFlow({
  initialProblemKey,
  initialCaseMapId,
  marketingParams = {},
  source = initialProblemKey ? 'problem_page' : 'direct',
}: Props) {
  const context = useMemo(() => getQuizProblemContext(initialProblemKey), [initialProblemKey])
  const [species, setSpecies] = useState<CaseMapSpecies | ''>(context?.species ?? '')
  const [topic, setTopic] = useState<CaseMapTopic | ''>(context?.topic ?? '')
  const [answers, setAnswers] = useState<CaseMapAnswers>({})
  const [mode, setMode] = useState<'flow' | 'result'>('flow')
  const [savedTriageState, setSavedTriageState] = useState<CaseMapTriageState | null>(null)
  const [savedCaseMap, setSavedCaseMap] = useState<StoredCaseMap | null>(null)
  const [showSave, setShowSave] = useState(false)
  const [resumeError, setResumeError] = useState('')
  const restoredLoginDraftRef = useRef(false)
  const startedTrackingRef = useRef(false)
  const completedTrackingRef = useRef(false)
  const offerTrackingRef = useRef(false)

  const triage = useMemo(() => triageFromAnswers(answers), [answers])
  const derivedTriageState = triage.assessed ? resolveCaseMapTriage(triage) : null
  const triageState = derivedTriageState ?? savedTriageState
  const allSafetyAnswered = CASE_MAP_PUBLIC_SAFETY_QUESTIONS.every((question) => Boolean(readSafetyAnswer(answers[question.id])))
  const report = species && topic && triageState
    ? buildCaseMapReport({ species, topic, path: MAP_PATH, triageState, answers })
    : null
  const bookingHandoff = triageState === 'PROCEED'
    ? createCaseMapBookingHandoff({
        species: species || null,
        topic: topic || null,
        path: MAP_PATH,
        answers,
        triageState,
        serviceType: RECOMMENDED_SERVICE_TYPE,
        caseMapId: savedCaseMap?.id ?? null,
        shareWithConsultant: false,
        source,
        problemKey: initialProblemKey ?? null,
        triage,
        currentQuestionId: null,
      })
    : null
  const bookingHref = appendSearchParams(
    bookingHandoff
      ? buildBookHref(bookingHandoff.problemType, bookingHandoff.serviceType, false, bookingHandoff.species)
      : '/zapytaj',
    marketingParams,
  )
  const resultState = triageState ?? 'SAFETY_PRIORITY'
  const safeResult = resultState === 'PROCEED'
  const urgentResult = safeResult ? null : urgentResultFor(resultState)
  const heroImage = '/branding/section-heroes/behavior-map-observation-v1.webp'
  const resultVisual = safeResult
    ? '/images/mapa-zachowania/result-plan-v1.png'
    : '/images/mapa-zachowania/result-priority-v1.png'

  useEffect(() => {
    if (initialCaseMapId || restoredLoginDraftRef.current) return
    restoredLoginDraftRef.current = true
    const draft = readCaseMapLoginDraft()
    if (!draft) return

    const restoredAnswers = {
      ...mergeTriageAnswers(draft.answers, draft.triage),
      // Drafts created before the public safety scope existed are legacy
      // full-triage drafts and must keep their conservative interpretation.
      triage_scope: draft.triage.scope === 'public_safety' ? 'public_safety' : 'full',
    }
    setSpecies(draft.species)
    setTopic(draft.topic)
    setAnswers({ ...restoredAnswers, case_path: MAP_PATH })
    if (draft.stage === 'result') setMode('result')
  }, [initialCaseMapId])

  useEffect(() => {
    if (!initialCaseMapId) return
    let active = true

    void fetch('/api/account/case-maps/' + encodeURIComponent(initialCaseMapId))
      .then(async (response) => {
        const payload = (await response.json()) as { caseMap?: CaseMapRecord; error?: string }
        if (!response.ok || !payload.caseMap) throw new Error(payload.error ?? 'Nie udało się otworzyć zapisanej Mapy zachowania.')
        return payload.caseMap
      })
      .then((caseMap) => {
        if (!active) return
        if (caseMap.status === 'archived') throw new Error('Ta Mapa zachowania została zarchiwizowana i nie można jej już wznowić.')
        setSpecies(caseMap.species)
        setTopic(caseMap.topic)
        setAnswers({
          ...mergeTriageAnswers(caseMap.answers, {}),
          case_path: MAP_PATH,
          // A missing marker means an older full Map record, not a new public
          // two-question gate.
          triage_scope: caseMap.answers.triage_scope === 'public_safety' ? 'public_safety' : 'full',
        })
        setSavedCaseMap({ id: caseMap.id, revision: caseMap.revision })
        setSavedTriageState(caseMap.triageState)
        if (caseMap.status === 'completed' || caseMap.currentQuestionId === '__result__') setMode('result')
      })
      .catch((reason) => {
        if (active) setResumeError(reason instanceof Error ? reason.message : 'Nie udało się otworzyć zapisanej Mapy zachowania.')
      })

    return () => {
      active = false
    }
  }, [initialCaseMapId])

  useEffect(() => {
    if (mode !== 'result' || triageState !== 'PROCEED' || offerTrackingRef.current) return

    offerTrackingRef.current = true
    trackCaseMapPrivateAnalyticsEvent('case_map_offer_viewed', {
      map_path: MAP_PATH,
      service_key: RECOMMENDED_SERVICE_TYPE,
    })
  }, [mode, triageState])

  function markStarted() {
    if (startedTrackingRef.current) return
    startedTrackingRef.current = true
    trackCaseMapPrivateAnalyticsEvent('case_map_started', {
      map_path: MAP_PATH,
      entry_source: source,
    })
  }

  function setSafetyAnswer(questionId: string, value: SafetyAnswer) {
    markStarted()
    setSavedTriageState(null)
    setAnswers((current) => ({ ...current, case_path: MAP_PATH, [questionId]: value }))
  }

  function goNext() {
    if (!allSafetyAnswered) return
    const nextTriage = triageFromAnswers(answers)
    const nextState = resolveCaseMapTriage(nextTriage)
    setSavedTriageState(null)
    if (nextState === 'PROCEED' && !completedTrackingRef.current) {
      completedTrackingRef.current = true
      trackCaseMapPrivateAnalyticsEvent('case_map_completed', {
        map_path: MAP_PATH,
        service_key: RECOMMENDED_SERVICE_TYPE,
      })
    }
    setMode('result')
  }

  function goBack() {
    if (mode === 'result') setMode('flow')
  }

  function restart() {
    clearCaseMapLoginDraft()
    setSpecies(context?.species ?? '')
    setTopic(context?.topic ?? '')
    setAnswers({})
    setMode('flow')
    setSavedTriageState(null)
    setSavedCaseMap(null)
    setShowSave(false)
    setResumeError('')
    startedTrackingRef.current = false
    completedTrackingRef.current = false
    offerTrackingRef.current = false
  }

  function preserveDraftForSignIn() {
    if (!species || !topic) return
    writeCaseMapLoginDraft({
      version: 1,
      species,
      topic,
      answers,
      triage,
      path: MAP_PATH,
      questionIndex: 0,
      stage: 'result',
    })
  }

  function rememberCompleted(caseMap: StoredCaseMap) {
    clearCaseMapLoginDraft()
    setSavedCaseMap(caseMap)
  }

  function prepareBookingHandoff() {
    if (!bookingHandoff) return
    writeCaseMapBookingHandoff(bookingHandoff)
    trackCaseMapPrivateAnalyticsEvent('case_map_service_clicked', {
      map_path: MAP_PATH,
      service_key: bookingHandoff.serviceType,
      cta_variant: 'primary',
    })
  }

  return (
    <section className={styles.root} aria-labelledby="short-behavior-map-title" data-map-stage={mode}>
      <header className={styles.flowHeader}>
        <Link href="/" className={styles.flowIdentity}>
          <span className={styles.directionGlyph} aria-hidden="true">←</span>
          <span>Mapa zachowania</span>
        </Link>
        <div className={styles.flowProgress} aria-label={mode === 'result' ? 'Etap 2 z 2' : 'Etap 1 z 2'}>
          <strong>{mode === 'result' ? <>2 <span>/ 2</span></> : <>1 <span>/ 2</span></>}</strong>
          <div className={styles.progressTrack} style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }} aria-hidden="true">
            <span className={styles.progressDone} />
            <span className={mode === 'result' ? styles.progressDone : styles.progressCurrent} />
          </div>
        </div>
      </header>

      {resumeError ? <p className={styles.resumeError} role="alert">{resumeError}</p> : null}

      {mode === 'flow' ? (
        <article className={styles.scene} data-map-screen="safety">
          <div className={styles.visual} style={{ backgroundImage: `url(${heroImage})` }} aria-hidden="true">
            <div className={styles.visualShade} />
            <div className={styles.visualBadge}>
              <MapIcon name="observe-eye" className={styles.visualBadgeIcon} />
              <span>Spokojnie, krok po kroku</span>
            </div>
            <div className={styles.visualCaption}>
              <span>Najpierw bezpieczeństwo</span>
              <strong>Zbierzmy fakty.<br />Potem wybierzmy krok.</strong>
            </div>
          </div>

          <div className={styles.questionPane}>
            <div className={styles.questionTopline}>
              <span>Bramka bezpieczeństwa</span>
              <span>Etap 1</span>
            </div>
            <div className={styles.questionCopy}>
              <span className={styles.botanical} aria-hidden="true" />
              <h2 id="short-behavior-map-title">Zanim zaczniemy</h2>
              <p>Odpowiedz na dwa krótkie pytania. Jeśli sytuacja jest pilna, wskażemy właściwą pomoc zamiast prowadzić Cię dalej przez Mapę.</p>
            </div>

            <div className={`${styles.answerArea} ${styles.safetyAnswerArea}`}>
              <div className={styles.safetyQuestions}>
                {CASE_MAP_PUBLIC_SAFETY_QUESTIONS.map((question) => (
                  <fieldset key={question.id} className={styles.safetyQuestion} data-safety-question={question.id}>
                    <legend>{question.title}</legend>
                    {question.helper ? <p>{question.helper}</p> : null}
                    <div className={styles.safetyOptions}>
                      {question.options?.map((option) => {
                        const selected = answers[question.id] === option.id
                        return (
                          <button
                            key={option.id}
                            type="button"
                            aria-pressed={selected}
                            className={selected ? styles.answerSelected : styles.answer}
                            onClick={() => setSafetyAnswer(question.id, option.id as SafetyAnswer)}
                          >
                            <MapIcon name={getCaseMapQuestionOptionIcon(question.id, option.id)} className={styles.answerIcon} />
                            <span className={styles.answerCopy}><strong>{option.label}</strong></span>
                            <span className={selected ? styles.selectionMark : styles.rowArrow} aria-hidden="true">{selected ? '✓' : '→'}</span>
                          </button>
                        )
                      })}
                    </div>
                  </fieldset>
                ))}
              </div>
            </div>

            <footer className={styles.navigation}>
              <button type="button" className={styles.backButton} onClick={() => undefined} disabled>
                <span className={styles.directionGlyph} aria-hidden="true">←</span> Wróć
              </button>
              <button type="button" className={styles.nextButton} onClick={goNext} disabled={!allSafetyAnswered} data-map-action="continue">
                Dalej <span className={styles.directionGlyph} aria-hidden="true">→</span>
              </button>
            </footer>
          </div>
        </article>
      ) : (
        <article
          className={`${styles.result} ${safeResult ? '' : styles.resultPriority}`}
          data-map-screen="result"
          data-map-triage={resultState}
        >
          <div className={styles.resultVisual} style={{ backgroundImage: `url(${resultVisual})` }} aria-hidden="true">
            <div className={styles.visualShade} />
            <div className={styles.resultSeal}>
              <MapIcon name={safeResult ? 'route-plan' : 'safety-shield'} className={styles.resultSealIcon} />
            </div>
            <div className={styles.resultVisualCaption}>{safeResult ? 'Spokojny pierwszy krok' : 'Najpierw pilna pomoc'}</div>
          </div>

          <div className={styles.resultContent}>
            <div className={styles.resultKicker}>
              <MapIcon name={safeResult ? 'route-plan' : 'safety-shield'} className={styles.kickerIcon} />
              {safeResult ? 'Pierwszy spokojny krok' : 'Najpierw bezpieczeństwo'}
            </div>

            {safeResult ? (
              <>
                <h2>Najlepszy pierwszy krok to spokojna rozmowa z behawiorystą.</h2>
                <p className={styles.resultLead}>Opowiesz o sytuacji i dowiesz się, co możesz zrobić dalej.</p>

                {report ? (
                  <div className={styles.summaryGrid}>
                    <div><span>Temat do rozmowy</span><strong>{report.title}</strong></div>
                    <div><span>Pierwsza obserwacja</span><strong>{report.firstStep}</strong></div>
                  </div>
                ) : null}

                <div className={styles.purchaseCard}>
                  <div className={styles.purchaseCardHeading}>
                    <MapIcon name="route-plan" className={styles.purchaseIcon} />
                    <div>
                      <span>Jedna usługa na początek</span>
                      <strong>Zapytaj behawiorystę</strong>
                    </div>
                  </div>
                  <p>Wybierz zwykły termin za 79 zł albo opcję „Zapytaj teraz” za 104 zł, jeśli jest aktualnie dostępna.</p>
                  <ul>
                    <li><span aria-hidden="true">✓</span>Opowiesz, co dzieje się w domu.</li>
                    <li><span aria-hidden="true">✓</span>Otrzymasz pierwszy kierunek działania.</li>
                    <li><span aria-hidden="true">✓</span>Zakres dalszej pracy ustalimy dopiero po rozmowie.</li>
                  </ul>
                  <Link href={bookingHref} className={styles.purchaseButton} onClick={prepareBookingHandoff} data-map-action="booking">
                    Wybierz sposób rozmowy <span className={styles.directionGlyph} aria-hidden="true">→</span>
                  </Link>
                  <small>Mapa jest krótką pomocą. Nie zastępuje rozmowy ani diagnozy.</small>
                </div>

                {report ? (
                  <div className={styles.beforePurchaseCard}>
                    <MapIcon name="observe-eye" className={styles.adviceIcon} />
                    <div><strong>Do czasu rozmowy</strong><p>{report.firstStep}</p></div>
                  </div>
                ) : null}

                {species && topic ? (
                  <div className={styles.saveArea}>
                    {!savedCaseMap ? (
                      <>
                        <button type="button" className={styles.saveToggle} onClick={() => setShowSave((current) => !current)}>
                          {showSave ? 'Ukryj zapis' : 'Zapisz tę Mapę w swoim Pokoju'}
                        </button>
                        {showSave ? (
                          <CaseMapSaveCard
                            species={species}
                            topic={topic}
                            path={MAP_PATH}
                            triage={triage}
                            answers={answers}
                            currentQuestionId={null}
                            initialProblemKey={initialProblemKey}
                            source={source}
                            onSaved={rememberCompleted}
                            onRequestSignIn={preserveDraftForSignIn}
                          />
                        ) : null}
                      </>
                    ) : <p className={styles.savedNote}><span className={styles.selectionMark} aria-hidden="true">✓</span> Mapa została zapisana prywatnie w Twoim Pokoju.</p>}
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <h2>{urgentResult?.title ?? 'Najpierw zadbaj o bezpieczeństwo.'}</h2>
                <p className={styles.resultLead}>{urgentResult?.lead}</p>
                <div className={`${styles.adviceCard} ${styles.urgentAdviceCard}`}>
                  <MapIcon name="safety-shield" className={styles.adviceIcon} />
                  <div><strong>Nie kontynuuj zwykłej ścieżki</strong><p>{urgentResult?.advice}</p></div>
                </div>
              </>
            )}

            <div className={styles.resultBottom}>
              <button type="button" className={styles.backButton} onClick={goBack}>
                <span className={styles.directionGlyph} aria-hidden="true">←</span> Wróć do pytań
              </button>
              <button type="button" className={styles.restartButton} onClick={restart}>Zacznij ponownie</button>
            </div>
          </div>
        </article>
      )}
    </section>
  )
}
