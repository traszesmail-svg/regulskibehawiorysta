'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  type CaseMapAnswers,
  type CaseMapPath,
  type CaseMapRecord,
  type CaseMapSpecies,
  type CaseMapTopic,
  type CaseMapTriageAnswers,
} from '@/lib/case-map'
import {
  CASE_MAP_FOCUS_QUESTION,
  getCaseMapPublicLongSections,
  getCaseMapShortFlowQuestions,
  type CaseMapQuestion,
} from '@/lib/case-map-questions'
import { getBookingServiceConfig } from '@/lib/booking-services'
import { appendSearchParams, buildBookHref } from '@/lib/booking-routing'
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
type FlowMode = 'flow' | 'result'
type Topic = { id: CaseMapTopic; label: string; helper: string }
type Scene = {
  id: string
  eyebrow: string
  title: string
  helper: string
  kind: 'scope' | 'species' | 'topic' | 'question'
  question?: CaseMapQuestion
  sectionTitle?: string
}

type QuestionScene = {
  question: CaseMapQuestion
  sectionTitle?: string
}

type StepInsight = {
  observation: string
  bridge: string
}

const UNASSESSED_TRIAGE: CaseMapTriageAnswers = {
  assessed: false,
  activeDanger: 'unknown',
  injury: 'unknown',
  emergencyHealth: 'unknown',
  healthChange: 'unknown',
  escapeSelfharm: 'unknown',
  vulnerableContext: 'unknown',
  vetStatus: 'unknown',
}

const SHORT_FLOW_STEP_COUNT = 8

const TOPICS: Record<CaseMapSpecies, Topic[]> = {
  pies: [
    { id: 'dog_walks', label: 'Spacer i reakcje na bodźce', helper: 'Mijanki, smycz, trasa i pobudzenie.' },
    { id: 'dog_alone', label: 'Zostawanie samemu', helper: 'Wyjścia, napięcie i powrót do spokoju.' },
    { id: 'dog_resources', label: 'Zasoby', helper: 'Jedzenie, zabawki, miejsce lub przejścia.' },
    { id: 'dog_noise', label: 'Hałas i nagłe bodźce', helper: 'Burza, fajerwerki lub dźwięki domu.' },
    { id: 'dog_change', label: 'Zmiana w domu lub rytmie', helper: 'Goście, opieka, nowy układ dnia lub przeprowadzka.' },
    { id: 'other', label: 'Inna sytuacja', helper: 'Nazwiemy ją własnymi słowami.' },
  ],
  kot: [
    { id: 'cat_litter', label: 'Kuweta', helper: 'Nawyk i komfort korzystania z kuwety.' },
    { id: 'cat_touch', label: 'Dotyk, głaskanie lub gryzienie', helper: 'Sygnały napięcia podczas kontaktu.' },
    { id: 'cat_conflict', label: 'Napięcie między kotami', helper: 'Blokowanie, zasoby, przejścia i relacje.' },
    { id: 'cat_change', label: 'Zmiana w domu lub rytmie', helper: 'Nowe zapachy, osoby lub przestrzeń.' },
    { id: 'noise', label: 'Hałas i nagłe bodźce', helper: 'Burza, fajerwerki lub dźwięki domu.' },
    { id: 'other', label: 'Inna sytuacja', helper: 'Nazwiemy ją własnymi słowami.' },
  ],
}

const QUESTION_ICON_SETS: Record<string, number[]> = {
  case_focus: [0, 5, 7],
  fast_onset: [3, 3, 3, 7],
  fast_frequency: [3, 3, 3, 7],
  fast_goal: [4, 2, 1, 6, 7, 7],
  walk_pattern: [2, 1, 1, 7],
  alone_first_signal: [2, 3, 5, 7],
  resource_signals: [4, 2, 1, 7],
  noise_recovery: [3, 3, 5, 7],
  change_symptoms: [5, 0, 3, 7],
  litter_problem: [0, 2, 1, 7],
  touch_context: [5, 0, 2, 7],
  conflict_pattern: [5, 3, 2, 7],
}

function isAnswered(value: unknown) {
  return value !== undefined && value !== null && value !== ''
}

function answerLabel(question: CaseMapQuestion | undefined, value: unknown) {
  if (!question || !isAnswered(value)) return null
  if (question.kind === 'text') return typeof value === 'string' ? value : null
  const option = question.options?.find((candidate) => candidate.id === value)
  return option?.label ?? String(value)
}

function answerExcerpt(value: unknown, maxLength = 160) {
  if (typeof value !== 'string') return null
  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized ? normalized.slice(0, maxLength) : null
}

function firstIncompleteScene(scenes: Scene[], answers: CaseMapAnswers, path: CaseMapPath | null, species: CaseMapSpecies | '', topic: CaseMapTopic | '') {
  return scenes.findIndex((scene) => {
    if (scene.kind === 'scope') return !path
    if (scene.kind === 'species') return !species
    if (scene.kind === 'topic') return !topic
    return !isAnswered(answers[scene.question?.id ?? scene.id])
  })
}

function getQuestionIconIndex(questionId: string, index: number) {
  return QUESTION_ICON_SETS[questionId]?.[index] ?? 7
}

function getTopicIconIndex(topic: CaseMapTopic) {
  if (topic === 'dog_walks') return 1
  if (topic === 'dog_alone') return 3
  if (topic === 'dog_resources') return 4
  if (topic === 'dog_noise' || topic === 'noise') return 2
  if (topic === 'cat_conflict') return 5
  if (topic === 'cat_litter') return 0
  if (topic === 'cat_touch') return 2
  if (topic === 'dog_change' || topic === 'cat_change') return 6
  return 7
}

function ImageGenIcon({ index, className = '' }: { index: number; className?: string }) {
  const column = index % 2
  const row = Math.floor(index / 2)
  const backgroundPosition = `${column === 0 ? '0%' : '100%'} ${(row / 3) * 100}%`

  return <span aria-hidden="true" className={className ? `${styles.generatedIcon} ${className}` : styles.generatedIcon} style={{ backgroundPosition }} />
}

function getStepInsight(sceneId: string, selection: string): StepInsight {
  if (sceneId === 'scope') {
    return {
      observation: `Wybrano zakres: ${selection}.`,
      bridge: 'Na końcu Mapa dopasuje usługę i przekaże jej krótki brief do formularza zakupu.',
    }
  }

  if (sceneId === 'species') {
    return {
      observation: `Dodaliśmy właściwy kontekst dla: ${selection.toLowerCase()}.`,
      bridge: 'Dzięki temu konsultacja nie zacznie się od ogólników, tylko od właściwej codzienności zwierzęcia.',
    }
  }

  if (sceneId === 'topic') {
    return {
      observation: `Nazwaliśmy obszar: ${selection.toLowerCase()}.`,
      bridge: 'To zawęża rozmowę, ale nie przykleja zwierzęciu etykiety — w konsultacji sprawdzimy, co naprawdę się powtarza.',
    }
  }

  if (sceneId === 'case_focus') {
    return {
      observation: `Wybraliśmy punkt widzenia tej sytuacji: ${selection.toLowerCase()}.`,
      bridge: 'W konsultacji odniesiemy go do domu, rytmu i relacji, których sam formularz nie pokaże.',
    }
  }

  if (sceneId === 'fast_onset') {
    return {
      observation: `Zapisaliśmy początek trudności: ${selection.toLowerCase()}.`,
      bridge: 'Czas pomaga ułożyć kolejność pytań; w konsultacji nie będziemy tracić czasu na nietrafione tropy.',
    }
  }

  if (sceneId === 'fast_frequency') {
    return {
      observation: `Zapisaliśmy rytm sytuacji: ${selection.toLowerCase()}.`,
      bridge: 'W konsultacji przełożymy tę powtarzalność na konkretne momenty dnia i warunki.',
    }
  }

  if (sceneId === 'fast_impact') {
    return {
      observation: `Zaznaczony wpływ na codzienność: ${selection}.`,
      bridge: 'To pomaga ustalić priorytet rozmowy, zamiast dokładać kolejne ogólne rady.',
    }
  }

  if (sceneId === 'fast_goal') {
    return {
      observation: `Cel po Mapie: ${selection.toLowerCase()}.`,
      bridge: 'Dzięki temu pokażemy właściwy formularz zakupu zamiast kazać wybierać usługę w ciemno.',
    }
  }

  return {
    observation: `Ten szczegół doprecyzowuje Mapę: ${selection.toLowerCase()}.`,
    bridge: 'W konsultacji zaczniemy od tego fragmentu zamiast od opowiadania całej historii od początku.',
  }
}

export function ShortBehaviorMapFlow({
  initialProblemKey,
  initialCaseMapId,
  marketingParams = {},
  source = initialProblemKey ? 'problem_page' : 'direct',
}: Props) {
  const context = useMemo(() => getQuizProblemContext(initialProblemKey), [initialProblemKey])
  const [path, setPath] = useState<CaseMapPath | null>(null)
  const [species, setSpecies] = useState<CaseMapSpecies | ''>(context?.species ?? '')
  const [topic, setTopic] = useState<CaseMapTopic | ''>(context?.topic ?? '')
  const [answers, setAnswers] = useState<CaseMapAnswers>({})
  const [sceneIndex, setSceneIndex] = useState(0)
  const [mode, setMode] = useState<FlowMode>('flow')
  const [resumeQuestionId, setResumeQuestionId] = useState<string | null>(null)
  const [resumeError, setResumeError] = useState('')
  const [savedCaseMap, setSavedCaseMap] = useState<StoredCaseMap | null>(null)
  const [showSave, setShowSave] = useState(false)
  const restoredLoginDraftRef = useRef(false)

  const shortQuestions = useMemo(() => topic ? getCaseMapShortFlowQuestions(topic) : [], [topic])
  const questionScenes = useMemo<QuestionScene[]>(() => {
    if (!topic || !path) return []
    if (path === 'fast') return shortQuestions.map((question) => ({ question }))

    return getCaseMapPublicLongSections(topic).flatMap((section) =>
      section.questions.map((question) => ({ question, sectionTitle: section.title })),
    )
  }, [path, shortQuestions, topic])
  const scenes = useMemo<Scene[]>(() => [
    {
      id: 'scope',
      eyebrow: 'Mapa zachowania',
      title: 'Ile chcesz dziś uporządkować?',
      helper: 'Wybierz zakres, który najlepiej pasuje do Twojej sytuacji. Obie wersje przygotują gotowy brief do formularza zakupu.',
      kind: 'scope',
    },
    {
      id: 'species',
      eyebrow: path === 'long' ? 'Pełniejsza mapa' : 'Szybka mapa',
      title: 'Kogo dotyczy ta sytuacja?',
      helper: 'Zaczniemy od prostego kontekstu, bez szukania idealnej odpowiedzi.',
      kind: 'species',
    },
    {
      id: 'topic',
      eyebrow: path === 'long' ? 'Pełniejsza mapa' : 'Szybka mapa',
      title: 'Co jest dziś najbliżej tego, co się dzieje?',
      helper: 'Wybierz najbliższy temat. Resztę doprecyzujesz po drodze.',
      kind: 'topic',
    },
    {
      id: CASE_MAP_FOCUS_QUESTION.id,
      eyebrow: path === 'long' ? 'Pełniejsza mapa' : 'Szybka mapa',
      title: CASE_MAP_FOCUS_QUESTION.title,
      helper: CASE_MAP_FOCUS_QUESTION.helper ?? '',
      kind: 'question',
      question: CASE_MAP_FOCUS_QUESTION,
    },
    ...questionScenes.map(({ question, sectionTitle }) => ({
      id: question.id,
      eyebrow: path === 'long' ? 'Pełniejsza mapa' : 'Szybka mapa',
      title: question.title,
      helper: question.helper ?? 'Jedna krótka odpowiedź pomoże ułożyć sensowny następny krok.',
      kind: 'question' as const,
      question,
      sectionTitle,
    })),
  ], [path, questionScenes])

  const currentScene = scenes[sceneIndex]
  const currentQuestion = currentScene?.question
  const currentComplete = Boolean(currentScene) && (
    currentScene.kind === 'scope'
      ? Boolean(path)
      : currentScene.kind === 'species'
      ? Boolean(species)
      : currentScene.kind === 'topic'
        ? Boolean(topic)
        : isAnswered(answers[currentQuestion?.id ?? currentScene.id])
  )
  const heroImage = species === 'kot'
    ? '/images/mapa-zachowania/hero-kot-v2.png'
    : '/images/mapa-zachowania/hero-pies-v2.png'
  const currentQuestionId = mode === 'result'
    ? null
    : currentScene?.kind === 'question'
      ? currentQuestion?.id ?? null
      : currentScene?.id ?? null
  const priorityConversation = answers.fast_goal === 'safety' || answers.fast_impact === 4
  const extendedConversation = path === 'long' || answers.fast_goal === 'full_plan'
  const recommendedServiceType: CaseMapBookingServiceType = priorityConversation
    ? 'kwadrans-na-juz'
    : extendedConversation
      ? 'konsultacja-30-min'
      : 'szybka-konsultacja-15-min'
  const recommendedService = getBookingServiceConfig(recommendedServiceType)
  const report = species && topic
    ? buildCaseMapReport({ species, topic, path: path ?? 'fast', triageState: 'PROCEED', answers })
    : null
  const bookingHandoff = createCaseMapBookingHandoff({
    species: species || null,
    topic: topic || null,
    path,
    answers,
    triageState: 'PROCEED',
    serviceType: recommendedServiceType,
    caseMapId: savedCaseMap?.id ?? null,
    shareWithConsultant: false,
  })
  const bookingHref = appendSearchParams(
    bookingHandoff ? buildBookHref(bookingHandoff.problemType, bookingHandoff.serviceType, false, bookingHandoff.species) : '/book',
    marketingParams,
  )
  const alternateServiceType: CaseMapBookingServiceType = priorityConversation || extendedConversation
    ? 'szybka-konsultacja-15-min'
    : 'konsultacja-30-min'
  const alternateService = getBookingServiceConfig(alternateServiceType)
  const alternateBookingHandoff = createCaseMapBookingHandoff({
    species: species || null,
    topic: topic || null,
    path,
    answers,
    triageState: 'PROCEED',
    serviceType: alternateServiceType,
    caseMapId: savedCaseMap?.id ?? null,
    shareWithConsultant: false,
  })
  const alternateBookingHref = appendSearchParams(
    alternateBookingHandoff ? buildBookHref(alternateBookingHandoff.problemType, alternateBookingHandoff.serviceType, false, alternateBookingHandoff.species) : '/book',
    marketingParams,
  )
  const contactHref = appendSearchParams('/kontakt', marketingParams)
  const topicQuestion = shortQuestions[3]
  const totalSteps = path === 'fast'
    ? SHORT_FLOW_STEP_COUNT
    : path === 'long' && topic
      ? Math.max(1, scenes.length - 1)
      : null
  const activeStep = mode === 'result' ? totalSteps ?? 0 : Math.max(0, sceneIndex)
  const progressSegmentCount = path === 'long' ? 10 : SHORT_FLOW_STEP_COUNT
  const completedSegments = path && totalSteps ? Math.round((activeStep / totalSteps) * progressSegmentCount) : 0
  const currentSelection = currentScene?.kind === 'scope'
    ? path === 'long' ? 'Pełniejsza mapa' : path === 'fast' ? 'Szybka mapa' : null
    : currentScene?.kind === 'species'
      ? species === 'pies' ? 'Pies' : species === 'kot' ? 'Kot' : null
      : currentScene?.kind === 'topic' && species && topic
        ? TOPICS[species].find((item) => item.id === topic)?.label ?? null
        : currentQuestion
          ? answerLabel(currentQuestion, answers[currentQuestion.id])
          : null
  const currentInsight = currentScene && currentSelection && currentComplete
    ? getStepInsight(currentScene.id, currentSelection)
    : null
  const collectedObservations = questionScenes.filter(({ question }) => isAnswered(answers[question.id])).length

  useEffect(() => {
    if (initialCaseMapId || restoredLoginDraftRef.current) return
    restoredLoginDraftRef.current = true
    const draft = readCaseMapLoginDraft()
    if (!draft) return

    setPath(draft.path)
    setSpecies(draft.species)
    setTopic(draft.topic)
    setAnswers({ ...draft.answers, case_path: draft.path })
    if (draft.stage === 'result') {
      setMode('result')
      return
    }
    setResumeQuestionId(null)
    setSceneIndex(Math.max(1, draft.questionIndex))
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
        setPath(caseMap.path)
        setSpecies(caseMap.species)
        setTopic(caseMap.topic)
        setAnswers({ ...caseMap.answers, case_path: caseMap.path })
        setSavedCaseMap({ id: caseMap.id, revision: caseMap.revision })
        if (caseMap.status === 'completed' || caseMap.currentQuestionId === '__result__') {
          setMode('result')
          return
        }
        setResumeQuestionId(caseMap.currentQuestionId)
      })
      .catch((reason) => {
        if (active) setResumeError(reason instanceof Error ? reason.message : 'Nie udało się otworzyć zapisanej Mapy zachowania.')
      })

    return () => {
      active = false
    }
  }, [initialCaseMapId])

  useEffect(() => {
    if (!resumeQuestionId || scenes.length === 0) return
    const resumedIndex = scenes.findIndex((scene) => scene.id === resumeQuestionId || scene.question?.id === resumeQuestionId)
    const fallbackIndex = firstIncompleteScene(scenes, answers, path, species, topic)
    setSceneIndex(resumedIndex >= 0 ? resumedIndex : Math.max(0, fallbackIndex))
    setResumeQuestionId(null)
  }, [answers, path, resumeQuestionId, scenes, species, topic])

  function setAnswer(question: CaseMapQuestion, value: string | number) {
    setAnswers((current) => ({ ...current, [question.id]: value }))
  }

  function choosePath(nextPath: CaseMapPath) {
    setPath(nextPath)
    setAnswers({ case_path: nextPath })
    setSceneIndex(1)
  }

  function chooseSpecies(nextSpecies: CaseMapSpecies) {
    setSpecies(nextSpecies)
    setTopic('')
    setAnswers({ case_path: path ?? 'fast' })
  }

  function chooseTopic(nextTopic: CaseMapTopic) {
    setTopic(nextTopic)
    setAnswers({ case_path: path ?? 'fast' })
  }

  function goNext() {
    if (!currentComplete) return
    if (sceneIndex >= scenes.length - 1) {
      setMode('result')
      return
    }
    setSceneIndex((current) => current + 1)
  }

  function goBack() {
    if (mode === 'result') {
      setMode('flow')
      setSceneIndex(Math.max(0, scenes.length - 1))
      return
    }
    setSceneIndex((current) => Math.max(0, current - 1))
  }

  function restart() {
    clearCaseMapLoginDraft()
    setPath(null)
    setSpecies(context?.species ?? '')
    setTopic(context?.topic ?? '')
    setAnswers({})
    setSceneIndex(0)
    setMode('flow')
    setSavedCaseMap(null)
    setShowSave(false)
    setResumeError('')
  }

  function preserveDraftForSignIn() {
    if (!species || !topic || !path) return
    writeCaseMapLoginDraft({
      version: 1,
      species,
      topic,
      answers,
      triage: UNASSESSED_TRIAGE,
      path,
      questionIndex: sceneIndex,
      stage: mode === 'result' ? 'result' : 'questions',
    })
  }

  function rememberCompleted(caseMap: StoredCaseMap) {
    clearCaseMapLoginDraft()
    setSavedCaseMap(caseMap)
  }

  function prepareBookingHandoff(handoff = bookingHandoff) {
    if (handoff) writeCaseMapBookingHandoff(handoff)
  }

  const topicLabel = species && topic ? TOPICS[species].find((item) => item.id === topic)?.label ?? 'wybrana sytuacja' : 'wybrana sytuacja'
  const longOnsetLabel = answerExcerpt(answers.intake_problem_start)
  const onsetLabel = answerLabel(shortQuestions[0], answers[shortQuestions[0]?.id ?? '']) ?? longOnsetLabel
  const impactLabel = answerLabel(shortQuestions[2], answers[shortQuestions[2]?.id ?? ''])
  const patternLabel = answerLabel(topicQuestion, answers[topicQuestion?.id ?? ''])
  const goalLabel = answerLabel(shortQuestions[4], answers[shortQuestions[4]?.id ?? '']) ?? answerExcerpt(answers.intake_goal)
  const resultTitle = priorityConversation
    ? 'Ta sytuacja zasługuje na szybszy następny krok.'
    : extendedConversation
      ? 'Ta sytuacja zasługuje na więcej niż krótką odpowiedź.'
      : 'Masz obraz sytuacji. Zmieńmy go w konkretny kierunek.'
  const resultLead = priorityConversation
    ? 'Mapa wskazuje, że najważniejsze jest teraz szybkie uporządkowanie sytuacji. Nie musisz dalej zbierać odpowiedzi samodzielnie.'
    : extendedConversation
      ? 'Zebrany materiał pokazuje więcej niż jeden wątek. Dłuższa konsultacja pozwoli połączyć je w spokojną kolejność działań.'
      : 'Mapa zebrała najważniejsze obserwacje. Nie zastępuje indywidualnej konsultacji — sprawia, że wchodzimy w nią od właściwego miejsca.'
  const resultSignals = [
    { label: 'Co już widać', value: patternLabel ? `${topicLabel}: ${patternLabel}.` : `Wybrany obszar: ${topicLabel}.` },
    { label: 'Co doprecyzujemy', value: `${impactLabel ? `Wpływ na codzienność: ${impactLabel}. ` : ''}${longOnsetLabel ? `Opis początku: ${longOnsetLabel}.` : onsetLabel ? `Kontekst i to, dlaczego sytuacja ${onsetLabel.toLowerCase()}.` : 'Kontekst domu, rytmu i warunków, których formularz nie pokaże.'}` },
    { label: 'Cel rozmowy', value: goalLabel ?? (extendedConversation ? 'Ułożenie pełniejszego planu.' : 'Wybranie pierwszego sensownego kierunku.') },
  ]
  const offerBenefits = priorityConversation
    ? ['Gotowy brief skraca wejście w temat.', 'Zaczynamy od najważniejszego fragmentu sytuacji.', 'Wychodzisz z uporządkowanym następnym krokiem.']
    : extendedConversation
      ? ['Łączymy obserwacje z różnych momentów dnia.', 'Ustalamy, co jest tłem, a co priorytetem.', 'Budujemy kierunek dalszego planu, nie pojedynczą poradę.']
      : ['Nie zaczynamy od zera — Mapa jest punktem startu.', 'Porządkujemy, co w tej sytuacji jest najważniejsze.', 'Wybieramy pierwszy kierunek działania dla jednego tematu.']
  const purchaseLabel = priorityConversation
    ? 'Przejdź do formularza zakupu · Kwadrans na już'
    : extendedConversation
      ? 'Przejdź do formularza zakupu · Dwa kwadranse'
      : 'Przejdź do formularza zakupu · Konsultacja 15 min'
  const alternateLabel = alternateServiceType === 'konsultacja-30-min'
    ? `Potrzebuję więcej czasu · ${alternateService.shortTitle}`
    : `Wolę zwykłą konsultację · ${alternateService.shortTitle}`
  const resultVisual = priorityConversation
    ? '/images/mapa-zachowania/result-priority-v1.png'
    : '/images/mapa-zachowania/result-plan-v1.png'

  return (
    <section className={styles.root} aria-labelledby="short-behavior-map-title">
      <header className={styles.flowHeader}>
        <Link href="/" className={styles.flowIdentity}><span className={styles.directionGlyph} aria-hidden="true">←</span><span>{path === 'long' ? 'Pełniejsza mapa' : path === 'fast' ? 'Szybka mapa' : 'Mapa zachowania'}</span></Link>
        <div className={styles.flowProgress} aria-label={path && totalSteps ? `Krok ${activeStep} z ${totalSteps}` : path ? 'Początek wybranej Mapy zachowania' : 'Wybór zakresu Mapy zachowania'}>
          <strong>{path && totalSteps ? <>{activeStep} <span>/ {totalSteps}</span></> : path ? 'Start' : 'Wybierz zakres'}</strong>
          <div className={styles.progressTrack} style={{ gridTemplateColumns: `repeat(${progressSegmentCount}, minmax(0, 1fr))` }} aria-hidden="true">
            {Array.from({ length: progressSegmentCount }, (_, index) => <span key={index} className={mode === 'result' || index < completedSegments ? styles.progressDone : path && index === completedSegments ? styles.progressCurrent : undefined} />)}
          </div>
        </div>
      </header>

      {resumeError ? <p className={styles.resumeError} role="alert">{resumeError}</p> : null}

      {mode === 'flow' && currentScene ? (
        <article className={styles.scene}>
          <div className={styles.visual} style={{ backgroundImage: `url(${heroImage})` }} aria-hidden="true">
            <div className={styles.visualShade} />
            <div className={styles.visualBadge}><ImageGenIcon index={2} className={styles.visualBadgeIcon} /><span>Spójrz i odpowiedz</span></div>
            <div className={styles.visualCaption}>
              <span>{species === 'kot' ? 'Kot i dom' : species === 'pies' ? 'Pies i codzienność' : 'Mapa zachowania'}</span>
              <strong>Jedna decyzja<br />na ekran.</strong>
            </div>
          </div>

          <div className={styles.questionPane}>
            <div className={styles.questionTopline}>
              <span>{currentScene.sectionTitle ?? currentScene.eyebrow}</span>
              <span>{path ? `Krok ${activeStep}` : 'Start'}</span>
            </div>
            <div className={styles.questionCopy}>
              <span className={styles.botanical} aria-hidden="true" />
              <h2 id="short-behavior-map-title">{currentScene.title}</h2>
              <p>{currentScene.helper}</p>
            </div>

            {path ? (
              <div className={styles.briefStatus}>
                <span>Mapa do zakupu konsultacji</span>
                <strong>{collectedObservations} / {questionScenes.length || 1} obserwacji</strong>
                <small>Gotowy brief zostanie dołączony do formularza zakupu.</small>
              </div>
            ) : null}

            <div className={styles.answerArea}>
              {currentScene.kind === 'scope' ? (
                <div className={styles.answerGrid}>
                  <button type="button" className={styles.answer} onClick={() => choosePath('fast')}>
                    <ImageGenIcon index={1} className={styles.answerIcon} />
                    <span className={styles.answerCopy}><strong>Szybka mapa</strong><small>Krótka droga przez najważniejsze obserwacje i dopasowanie pierwszej usługi.</small></span>
                    <span className={styles.rowArrow} aria-hidden="true">›</span>
                  </button>
                  <button type="button" className={styles.answer} onClick={() => choosePath('long')}>
                    <ImageGenIcon index={6} className={styles.answerIcon} />
                    <span className={styles.answerCopy}><strong>Pełniejsza mapa</strong><small>Więcej kontekstu przed zakupem dłuższej konsultacji i ułożeniem kolejności tematów.</small></span>
                    <span className={styles.rowArrow} aria-hidden="true">›</span>
                  </button>
                </div>
              ) : null}

              {currentScene.kind === 'species' ? (
                <div className={styles.answerGrid}>
                  {(['pies', 'kot'] as const).map((option) => {
                    const selected = species === option
                    return (
                      <button key={option} type="button" aria-pressed={selected} className={selected ? styles.answerSelected : styles.answer} onClick={() => chooseSpecies(option)}>
                        <ImageGenIcon index={option === 'pies' ? 0 : 5} className={styles.answerIcon} />
                        <span className={styles.answerCopy}><strong>{option === 'pies' ? 'Pies' : 'Kot'}</strong><small>{option === 'pies' ? 'Spacer, dom, odpoczynek i relacje.' : 'Dom, zasoby, kontakt i codzienny rytm.'}</small></span>
                        <span className={selected ? styles.selectionMark : styles.rowArrow} aria-hidden="true">{selected ? '✓' : '›'}</span>
                      </button>
                    )
                  })}
                </div>
              ) : null}

              {currentScene.kind === 'topic' && species ? (
                <div className={styles.answerGrid}>
                  {TOPICS[species].map((option) => {
                    const selected = topic === option.id
                    const iconIndex = getTopicIconIndex(option.id)
                    return (
                      <button key={option.id} type="button" aria-pressed={selected} className={selected ? styles.answerSelected : styles.answer} onClick={() => chooseTopic(option.id)}>
                        <ImageGenIcon index={iconIndex} className={styles.answerIcon} />
                        <span className={styles.answerCopy}><strong>{option.label}</strong><small>{option.helper}</small></span>
                        <span className={selected ? styles.selectionMark : styles.rowArrow} aria-hidden="true">{selected ? '✓' : '›'}</span>
                      </button>
                    )
                  })}
                </div>
              ) : null}

              {currentScene.kind === 'question' ? (
                <>
                  {currentQuestion?.kind === 'choice' ? (
                    <div className={styles.answerGrid}>
                      {currentQuestion.options?.map((option, index) => {
                        const selected = answers[currentQuestion.id] === option.id
                        const iconIndex = getQuestionIconIndex(currentQuestion.id, index)
                        return (
                          <button key={option.id} type="button" aria-pressed={selected} className={selected ? styles.answerSelected : styles.answer} onClick={() => setAnswer(currentQuestion, option.id)}>
                            <ImageGenIcon index={iconIndex} className={styles.answerIcon} />
                            <span className={styles.answerCopy}><strong>{option.label}</strong>{option.helper ? <small>{option.helper}</small> : null}</span>
                            <span className={selected ? styles.selectionMark : styles.rowArrow} aria-hidden="true">{selected ? '✓' : '›'}</span>
                          </button>
                        )
                      })}
                    </div>
                  ) : null}
                  {currentQuestion?.kind === 'scale' ? (
                    <div className={styles.scaleWrap}>
                      <p><span>{currentQuestion.minLabel}</span><span>{currentQuestion.maxLabel}</span></p>
                      <div className={styles.scaleGrid}>
                        {Array.from({ length: (currentQuestion.max ?? 0) - (currentQuestion.min ?? 0) + 1 }, (_, offset) => (currentQuestion.min ?? 0) + offset).map((number) => (
                          <button key={number} type="button" aria-pressed={answers[currentQuestion.id] === number} className={answers[currentQuestion.id] === number ? styles.scaleSelected : styles.scale} onClick={() => setAnswer(currentQuestion, number)}>{number}</button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {currentQuestion?.kind === 'text' ? (
                    <div className={styles.textWrap}>
                      <textarea value={String(answers[currentQuestion.id] ?? '')} maxLength={currentQuestion.maxLength} aria-label={currentQuestion.title} placeholder="Napisz tyle, ile chcesz — jedno zdanie wystarczy." onChange={(event) => setAnswer(currentQuestion, event.target.value)} />
                      <small>Możesz wpisać krótko. Nie podawaj danych wrażliwych.</small>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>

            {currentInsight ? (
              <aside className={styles.stepInsight} aria-live="polite">
                <ImageGenIcon index={path === 'long' ? 6 : 2} className={styles.stepInsightIcon} />
                <div>
                  <span>Co ta odpowiedź wnosi do Mapy</span>
                  <strong>{currentInsight.observation}</strong>
                  <p>{currentInsight.bridge}</p>
                </div>
              </aside>
            ) : null}

            <footer className={styles.navigation}>
              <button type="button" className={styles.backButton} onClick={goBack} disabled={sceneIndex === 0}><span className={styles.directionGlyph} aria-hidden="true">←</span> Wróć</button>
              <button type="button" className={styles.nextButton} onClick={goNext} disabled={!currentComplete}>{sceneIndex + 1 === scenes.length ? 'Zobacz swoją mapę' : 'Dalej'} <span className={styles.directionGlyph} aria-hidden="true">→</span></button>
            </footer>
          </div>
        </article>
      ) : null}

      {mode === 'result' ? (
        <article className={`${styles.result} ${priorityConversation ? styles.resultPriority : ''}`}>
          <div className={styles.resultVisual} style={{ backgroundImage: `url(${resultVisual})` }} aria-hidden="true">
            <div className={styles.visualShade} />
            <div className={styles.resultSeal}><ImageGenIcon index={priorityConversation ? 4 : 6} className={styles.resultSealIcon} /></div>
            <div className={styles.resultVisualCaption}>{priorityConversation ? 'Mapa → zakup → najbliższy krok' : 'Mapa → zakup → pierwszy plan'}</div>
          </div>
          <div className={styles.resultContent}>
            <div className={styles.resultKicker}><ImageGenIcon index={priorityConversation ? 4 : extendedConversation ? 1 : 6} className={styles.kickerIcon} />Mapa gotowa do zakupu konsultacji</div>
            <h2>{resultTitle}</h2>
            <p className={styles.resultLead}>{resultLead}</p>

            <div className={styles.resultInsights} aria-label="Co Mapa przygotowała do konsultacji">
              {resultSignals.map((signal) => <div key={signal.label}><span>{signal.label}</span><strong>{signal.value}</strong></div>)}
            </div>

            <div className={`${styles.purchaseCard} ${priorityConversation ? styles.purchaseCardPriority : ''}`}>
              <div className={styles.purchaseCardHeading}>
                <ImageGenIcon index={priorityConversation ? 4 : extendedConversation ? 1 : 6} className={styles.purchaseIcon} />
                <div>
                  <span>Dobieramy następny krok</span>
                  <strong>{recommendedService.title}</strong>
                </div>
              </div>
              <p>{priorityConversation ? 'Twoja Mapa prowadzi prosto do priorytetowego formularza zakupu — wybierzesz najbliższy realny termin dla tej sytuacji.' : extendedConversation ? 'Ta wersja daje więcej miejsca na połączenie wątków, które Mapa już uporządkowała.' : 'W formularzu zakupu wybierzesz usługę z gotową Mapą jako punktem startu.'}</p>
              <ul>
                {offerBenefits.map((benefit) => <li key={benefit}><span aria-hidden="true">✓</span>{benefit}</li>)}
              </ul>
              <Link href={bookingHref} className={priorityConversation ? styles.priorityButton : styles.purchaseButton} onClick={() => prepareBookingHandoff(bookingHandoff)}>{purchaseLabel} <span className={styles.directionGlyph} aria-hidden="true">→</span></Link>
              <small>Po wyborze terminu formularz otrzyma krótki brief z tej Mapy.</small>
            </div>

            <div className={styles.beforePurchaseCard}>
              <ImageGenIcon index={2} className={styles.adviceIcon} />
              <div>
                <strong>Do czasu terminu</strong>
                <p>{report?.firstStep}</p>
              </div>
            </div>

            <div className={styles.alternativeActions}>
              <Link href={alternateBookingHref} className={styles.alternativeButton} onClick={() => prepareBookingHandoff(alternateBookingHandoff)}>{alternateLabel}</Link>
              <Link href={contactHref} className={styles.contactButton}>Nie wiesz, co wybrać? Kontakt</Link>
            </div>

            {!savedCaseMap ? (
              <div className={styles.saveArea}>
                <button type="button" className={styles.saveToggle} onClick={() => setShowSave((current) => !current)}>{showSave ? 'Ukryj zapis' : 'Zapisz mapę w swoim Pokoju'}</button>
                {showSave && species && topic ? <CaseMapSaveCard species={species} topic={topic} path={path ?? 'fast'} triage={UNASSESSED_TRIAGE} answers={answers} currentQuestionId={currentQuestionId} initialProblemKey={initialProblemKey} source={source} onSaved={rememberCompleted} onRequestSignIn={preserveDraftForSignIn} /> : null}
              </div>
            ) : <p className={styles.savedNote}><span className={styles.selectionMark} aria-hidden="true">✓</span> Mapa została zapisana prywatnie w Twoim Pokoju.</p>}

            <div className={styles.resultBottom}>
              <button type="button" className={styles.backButton} onClick={goBack}><span className={styles.directionGlyph} aria-hidden="true">←</span> Wróć do odpowiedzi</button>
              <button type="button" className={styles.restartButton} onClick={restart}>Zacznij nową mapę</button>
            </div>
          </div>
        </article>
      ) : null}
    </section>
  )
}
