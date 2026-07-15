import {
  isCaseMapTopicForSpecies,
  normalizeCaseMapAnswers,
  type CaseMapAnswers,
  type CaseMapPath,
  type CaseMapSpecies,
  type CaseMapTopic,
  type CaseMapTriageAnswers,
} from '@/lib/case-map'

export const CASE_MAP_LOGIN_DRAFT_KEY = 'regulski.case-map-login-draft.v1'

export type CaseMapLoginDraft = {
  version: 1
  species: CaseMapSpecies
  topic: CaseMapTopic
  answers: CaseMapAnswers
  triage: Partial<CaseMapTriageAnswers>
  path: CaseMapPath | null
  questionIndex: number
  stage: 'start' | 'triage' | 'path' | 'save-choice' | 'questions' | 'result'
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function getBrowserSessionStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isStage(value: unknown): value is CaseMapLoginDraft['stage'] {
  return value === 'start' || value === 'triage' || value === 'path' || value === 'save-choice' || value === 'questions' || value === 'result'
}

function parseDraft(value: unknown): CaseMapLoginDraft | null {
  if (!isRecord(value) || value.version !== 1) return null
  const species = value.species === 'pies' || value.species === 'kot' ? value.species : null
  if (!species || !isCaseMapTopicForSpecies(species, value.topic) || !isRecord(value.answers) || !isRecord(value.triage)) return null
  if (value.path !== null && value.path !== 'fast' && value.path !== 'long') return null
  if (!Number.isInteger(value.questionIndex) || (value.questionIndex as number) < 0 || !isStage(value.stage)) return null

  try {
    return {
      version: 1,
      species,
      topic: value.topic,
      answers: normalizeCaseMapAnswers(value.answers),
      triage: value.triage as Partial<CaseMapTriageAnswers>,
      path: value.path,
      questionIndex: value.questionIndex as number,
      stage: value.stage,
    }
  } catch {
    return null
  }
}

export function writeCaseMapLoginDraft(draft: CaseMapLoginDraft, storage = getBrowserSessionStorage()) {
  if (!storage) return false
  try {
    storage.setItem(CASE_MAP_LOGIN_DRAFT_KEY, JSON.stringify(draft))
    return true
  } catch {
    return false
  }
}

export function readCaseMapLoginDraft(storage = getBrowserSessionStorage()) {
  if (!storage) return null
  try {
    const raw = storage.getItem(CASE_MAP_LOGIN_DRAFT_KEY)
    if (!raw) return null
    const draft = parseDraft(JSON.parse(raw))
    if (!draft) storage.removeItem(CASE_MAP_LOGIN_DRAFT_KEY)
    return draft
  } catch {
    try {
      storage.removeItem(CASE_MAP_LOGIN_DRAFT_KEY)
    } catch {
      // A disabled storage must not block the public flow.
    }
    return null
  }
}

export function clearCaseMapLoginDraft(storage = getBrowserSessionStorage()) {
  if (!storage) return
  try {
    storage.removeItem(CASE_MAP_LOGIN_DRAFT_KEY)
  } catch {
    // A disabled storage must not block the public flow.
  }
}
