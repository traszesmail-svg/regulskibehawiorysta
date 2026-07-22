'use client'

import Image from 'next/image'
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
import {
  CASE_MAP_ICON_SOURCES,
  CASE_MAP_PATH_ICONS,
  CASE_MAP_SPECIES_ICONS,
  CASE_MAP_TOPIC_ICONS,
  getCaseMapQuestionOptionIcon,
  type CaseMapIconName,
} from '@/lib/case-map-icons'
import { getBookingServiceConfig } from '@/lib/booking-services'
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

function getStepInsight(sceneId: string, selection: string): StepInsight {
  if (sceneId === 'scope') {
    return {
      observation: `Na dziś wybierasz: ${selection}.`,
      bridge: 'Na końcu podpowiemy konsultację, od której warto zacząć.',
    }
  }

  if (sceneId === 'species') {
    return {
      observation: `Dotyczy: ${selection.toLowerCase()}.`,
      bridge: 'Dzięki temu konsultacja nie zacznie się od ogólników, tylko od właściwej codzienności zwierzęcia.',
    }
  }

  if (sceneId === 'topic') {
    return {
      observation: `Najbliższy temat: ${selection.toLowerCase()}.`,
      bridge: 'To zawęża rozmowę, ale nie przykleja zwierzęciu etykiety — w konsultacji sprawdzimy, co naprawdę się powtarza.',
    }
  }

  if (sceneId === 'case_focus') {
    return {
      observation: `Sprawa dotyczy: ${selection.toLowerCase()}.`,
      bridge: 'W konsultacji odniesiemy to do domu, rytmu i relacji, których nie da się opisać jednym wyborem.',
    }
  }

  if (sceneId === 'fast_onset') {
    return {
      observation: `Początek sytuacji: ${selection.toLowerCase()}.`,
      bridge: 'Czas pomaga ułożyć kolejność pytań; w konsultacji nie będziemy tracić czasu na nietrafione tropy.',
    }
  }

  if (sceneId === 'fast_frequency') {
    return {
      observation: `Rytm sytuacji: ${selection.toLowerCase()}.`,
      bridge: 'W konsultacji przełożymy tę powtarzalność na konkretne momenty dnia i warunki.',
    }
  }

  if (sceneId === 'fast_impact') {
    return {
      observation: `Wpływ na codzienność: ${selection}.`,
      bridge: 'To pomaga ustalić priorytet rozmowy, zamiast dokładać kolejne ogólne rady.',
    }
  }

  if (sceneId === 'fast_goal') {
    return {
      observation: `Dziś potrzebujesz: ${selection.toLowerCase()}.`,
      bridge: 'Dzięki temu łatwiej będzie wybrać konsultację odpowiednią do tej sytuacji.',
    }
  }

  return {
    observation: `Ważna wskazówka: ${selection.toLowerCase()}.`,
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
  const startedTrackingRef = useRef(false)
  const completedTrackingRef = useRef(false)
  const offerTrackingRef = useRef(false)

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
      title: 'Uporządkuj sytuację psa lub kota krok po kroku',
      helper: 'Odpowiedz na kilka pytań o to, co widzisz. Na końcu Mapa zbierze najważniejsze obserwacje i wskaże sensowny kolejny krok — bez zgadywania i bez stawiania diagnozy.',
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
  const heroImage = '/branding/section-heroes/behavior-map-observation-v1.webp'
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
    source,
    problemKey: initialProblemKey ?? null,
    triage: UNASSESSED_TRIAGE,
    currentQuestionId,
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
    source,
    problemKey: initialProblemKey ?? null,
    triage: UNASSESSED_TRIAGE,
    currentQuestionId,
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

  useEffect(() => {
    if (mode !== 'result' || !path || offerTrackingRef.current) return

    offerTrackingRef.current = true
    trackCaseMapPrivateAnalyticsEvent('case_map_offer_viewed', {
      map_path: path,
      service_key: recommendedServiceType,
    })
  }, [mode, path, recommendedServiceType])

  function setAnswer(question: CaseMapQuestion, value: string | number) {
    setAnswers((current) => ({ ...current, [question.id]: value }))
  }

  function choosePath(nextPath: CaseMapPath) {
    if (!startedTrackingRef.current) {
      startedTrackingRef.current = true
      trackCaseMapPrivateAnalyticsEvent('case_map_started', {
        map_path: nextPath,
        entry_source: source,
      })
    }
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
      if (path && !completedTrackingRef.current) {
        completedTrackingRef.current = true
        trackCaseMapPrivateAnalyticsEvent('case_map_completed', {
          map_path: path,
          service_key: recommendedServiceType,
        })
      }
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
    startedTrackingRef.current = false
    completedTrackingRef.current = false
    offerTrackingRef.current = false
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

  function prepareBookingHandoff(handoff = bookingHandoff, ctaVariant: 'primary' | 'alternate' = 'primary') {
    if (!handoff || !path) return
    writeCaseMapBookingHandoff(handoff)
    trackCaseMapPrivateAnalyticsEvent('case_map_service_clicked', {
      map_path: path,
      service_key: handoff.serviceType,
      cta_variant: ctaVariant,
    })
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
      ? 'Twoje odpowiedzi pokazują więcej niż jeden wątek. Dłuższa konsultacja pozwoli połączyć je w spokojną kolejność działań.'
      : 'Twoje odpowiedzi pokazują, od czego warto zacząć. Podczas konsultacji wspólnie przełożymy je na pierwszy sensowny krok.'
  const resultSignals = [
    { label: 'Co już widać', value: patternLabel ? `${topicLabel}: ${patternLabel}.` : `Wybrany obszar: ${topicLabel}.` },
    { label: 'Co doprecyzujemy', value: `${impactLabel ? `Wpływ na codzienność: ${impactLabel}. ` : ''}${longOnsetLabel ? `Opis początku: ${longOnsetLabel}.` : onsetLabel ? `Kontekst i to, dlaczego sytuacja ${onsetLabel.toLowerCase()}.` : 'Kontekst domu, rytmu i warunków, których nie widać po jednej odpowiedzi.'}` },
    { label: 'Cel rozmowy', value: goalLabel ?? (extendedConversation ? 'Ułożenie pełniejszego planu.' : 'Wybranie pierwszego sensownego kierunku.') },
  ]
  const offerBenefits = priorityConversation
    ? ['Nie zaczynamy od całej historii od zera.', 'Zaczynamy od najważniejszego fragmentu sytuacji.', 'Wychodzisz z uporządkowanym następnym krokiem.']
    : extendedConversation
      ? ['Łączymy obserwacje z różnych momentów dnia.', 'Ustalamy, co jest tłem, a co priorytetem.', 'Budujemy kierunek dalszego planu, nie pojedynczą poradę.']
      : ['Nie zaczynamy od zera — Mapa jest punktem startu.', 'Porządkujemy, co w tej sytuacji jest najważniejsze.', 'Wybieramy pierwszy kierunek działania dla jednego tematu.']
  const purchaseLabel = priorityConversation
    ? 'Wybierz termin · Kwadrans na już'
    : extendedConversation
      ? 'Wybierz termin · Dwa kwadranse'
      : 'Wybierz termin · Konsultacja 15 min'
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
        <div className={styles.flowProgress} aria-label={path && totalSteps ? `Krok ${activeStep} z ${totalSteps}` : path ? 'Początek wybranej Mapy zachowania' : 'Wybór wersji Mapy zachowania'}>
          <strong>{path && totalSteps ? <>{activeStep} <span>/ {totalSteps}</span></> : path ? 'Start' : 'Wybierz wersję'}</strong>
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
            <div className={styles.visualBadge}><MapIcon name="observe-eye" className={styles.visualBadgeIcon} /><span>Spokojnie, krok po kroku</span></div>
            <div className={styles.visualCaption}>
              <span>{species === 'kot' ? 'Kot i dom' : species === 'pies' ? 'Pies i codzienność' : 'Najpierw obserwacja'}</span>
              <strong>{species ? <>Przyjrzyjmy się<br />tej sytuacji.</> : <>Zbierzmy fakty.<br />Potem wybierzmy krok.</>}</strong>
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
                <span>Przygotowanie do rozmowy</span>
                <strong>{collectedObservations} z {questionScenes.length || 1} kroków</strong>
                <small>Twoje odpowiedzi pozwolą nam od razu skupić się na sytuacji, którą opisujesz.</small>
              </div>
            ) : null}

            <div className={styles.answerArea}>
              {currentScene.kind === 'scope' ? (
                <div className={styles.answerGrid}>
                  <button type="button" className={styles.answer} onClick={() => choosePath('fast')}>
                    <MapIcon name={CASE_MAP_PATH_ICONS.fast} className={styles.answerIcon} />
                    <span className={styles.answerCopy}><strong>Szybka mapa</strong><small>Kilka krótkich pytań i jasny kierunek rozmowy.</small></span>
                    <span className={styles.rowArrow} aria-hidden="true">›</span>
                  </button>
                  <button type="button" className={styles.answer} onClick={() => choosePath('long')}>
                    <MapIcon name={CASE_MAP_PATH_ICONS.long} className={styles.answerIcon} />
                    <span className={styles.answerCopy}><strong>Pełniejsza mapa</strong><small>Więcej miejsca na opis sytuacji, gdy chcesz poruszyć kilka wątków.</small></span>
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
                        <MapIcon name={CASE_MAP_SPECIES_ICONS[option]} className={styles.answerIcon} />
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
                    const iconName = CASE_MAP_TOPIC_ICONS[option.id]
                    return (
                      <button key={option.id} type="button" aria-pressed={selected} className={selected ? styles.answerSelected : styles.answer} onClick={() => chooseTopic(option.id)}>
                        <MapIcon name={iconName} className={styles.answerIcon} />
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
                      {currentQuestion.options?.map((option) => {
                        const selected = answers[currentQuestion.id] === option.id
                        const iconName = getCaseMapQuestionOptionIcon(currentQuestion.id, option.id)
                        return (
                          <button key={option.id} type="button" aria-pressed={selected} className={selected ? styles.answerSelected : styles.answer} onClick={() => setAnswer(currentQuestion, option.id)}>
                            <MapIcon name={iconName} className={styles.answerIcon} />
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
                <MapIcon name={path === 'long' ? 'map-full' : 'observe-eye'} className={styles.stepInsightIcon} />
                <div>
                  <span>Co to mówi o sytuacji</span>
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
            <div className={styles.resultSeal}><MapIcon name={priorityConversation ? 'safety-shield' : 'map-full'} className={styles.resultSealIcon} /></div>
            <div className={styles.resultVisualCaption}>{priorityConversation ? 'Twoja sytuacja. Rozmowa. Najbliższy krok.' : 'Twoja sytuacja. Rozmowa. Pierwszy krok.'}</div>
          </div>
          <div className={styles.resultContent}>
            <div className={styles.resultKicker}><MapIcon name={priorityConversation ? 'safety-shield' : extendedConversation ? 'map-full' : 'route-plan'} className={styles.kickerIcon} />Masz punkt startu do rozmowy</div>
            <h2>{resultTitle}</h2>
            <p className={styles.resultLead}>{resultLead}</p>

            <div className={styles.resultInsights} aria-label="Najważniejsze punkty do rozmowy">
              {resultSignals.map((signal) => <div key={signal.label}><span>{signal.label}</span><strong>{signal.value}</strong></div>)}
            </div>

            <div className={`${styles.purchaseCard} ${priorityConversation ? styles.purchaseCardPriority : ''}`}>
              <div className={styles.purchaseCardHeading}>
                <MapIcon name={priorityConversation ? 'safety-shield' : extendedConversation ? 'map-full' : 'route-plan'} className={styles.purchaseIcon} />
                <div>
                  <span>Proponowana konsultacja</span>
                  <strong>{recommendedService.title}</strong>
                </div>
              </div>
              <p>{priorityConversation ? 'Ta sytuacja zasługuje na szybszą rozmowę. Wybierz najbliższy termin — najważniejsze odpowiedzi dołączymy do tej rezerwacji.' : extendedConversation ? 'Wybierz termin dłuższej konsultacji. Najważniejsze odpowiedzi dołączymy do rezerwacji, aby rozmowa zaczęła się od Twojej sytuacji.' : 'Wybierz termin konsultacji. Najważniejsze odpowiedzi dołączymy do rezerwacji, aby rozmowa zaczęła się od Twojej sytuacji.'}</p>
              <ul>
                {offerBenefits.map((benefit) => <li key={benefit}><span aria-hidden="true">✓</span>{benefit}</li>)}
              </ul>
              <Link href={bookingHref} className={priorityConversation ? styles.priorityButton : styles.purchaseButton} onClick={() => prepareBookingHandoff(bookingHandoff, 'primary')}>{purchaseLabel} <span className={styles.directionGlyph} aria-hidden="true">→</span></Link>
              <small>Przy wyborze terminu wpiszesz e-mail. Najważniejsze odpowiedzi dołączymy do rezerwacji. Jeśli chcesz, Pełną Mapę możesz zapisać prywatnie w swoim Pokoju.</small>
            </div>

            <div className={styles.beforePurchaseCard}>
              <MapIcon name="observe-eye" className={styles.adviceIcon} />
              <div>
                <strong>Do czasu terminu</strong>
                <p>{report?.firstStep}</p>
              </div>
            </div>

            <div className={styles.alternativeActions}>
              <Link href={alternateBookingHref} className={styles.alternativeButton} onClick={() => prepareBookingHandoff(alternateBookingHandoff, 'alternate')}>{alternateLabel}</Link>
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
