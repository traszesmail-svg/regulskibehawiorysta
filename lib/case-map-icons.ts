import type { CaseMapPath, CaseMapSpecies, CaseMapTopic } from '@/lib/case-map'

/**
 * Autorskie, wersjonowane ikony dla publicznej Mapy zachowania.
 *
 * Nazwy są celowo semantyczne, a nie liczbowe: komponent nie ma już wiedzy
 * o położeniu grafiki w sprite'cie i każda odpowiedź może dostać właściwy
 * motyw. Pliki są rasterami PNG z przezroczystym tłem, przygotowanymi dla
 * ciasnych kart odpowiedzi w przepływie.
 */
export const CASE_MAP_ICON_SOURCES = {
  'dog-profile': '/images/mapa-zachowania/icons-v3/dog-profile-v1.png',
  'cat-profile': '/images/mapa-zachowania/icons-v3/cat-profile-v1.png',
  'route-plan': '/images/mapa-zachowania/icons-v3/route-plan-v1.png',
  'map-full': '/images/mapa-zachowania/icons-v3/map-full-v1.png',
  'observe-eye': '/images/mapa-zachowania/icons-v3/observe-eye-v1.png',
  'time-loop': '/images/mapa-zachowania/icons-v3/time-loop-v1.png',
  'safety-shield': '/images/mapa-zachowania/icons-v3/safety-shield-v1.png',
  unknown: '/images/mapa-zachowania/icons-v3/unknown-v1.png',
  'leash-walk': '/images/mapa-zachowania/icons-v3/leash-walk-v1.png',
  'alone-door': '/images/mapa-zachowania/icons-v3/alone-door-v1.png',
  'resources-set': '/images/mapa-zachowania/icons-v3/resources-set-v1.png',
  'sound-wave': '/images/mapa-zachowania/icons-v3/sound-wave-v1.png',
  'home-routine': '/images/mapa-zachowania/icons-v3/home-routine-v1.png',
  'litter-box': '/images/mapa-zachowania/icons-v3/litter-box-v1.png',
  'hand-care': '/images/mapa-zachowania/icons-v3/hand-care-v1.png',
  'territory-corridor': '/images/mapa-zachowania/icons-v3/territory-corridor-v1.png',
  'distance-rings': '/images/mapa-zachowania/icons-v3/distance-rings-v1.png',
  'body-language': '/images/mapa-zachowania/icons-v3/body-language-v1.png',
  'boundary-warning': '/images/mapa-zachowania/icons-v3/boundary-warning-v1.png',
  'rest-nest': '/images/mapa-zachowania/icons-v3/rest-nest-v1.png',
  'bond-pair': '/images/mapa-zachowania/icons-v3/bond-pair-v1.png',
  'child-approach': '/images/mapa-zachowania/icons-v3/child-approach-v1.png',
  'other-pet': '/images/mapa-zachowania/icons-v3/other-pet-v1.png',
  'video-recording': '/images/mapa-zachowania/icons-v3/video-recording-v1.png',
  'case-notes': '/images/mapa-zachowania/icons-v3/case-notes-v1.png',
  'adult-approach': '/images/mapa-zachowania/icons-v3/adult-approach-v1.png',
  'unusual-pattern': '/images/mapa-zachowania/icons-v3/unusual-pattern-v1.png',
} as const

export type CaseMapIconName = keyof typeof CASE_MAP_ICON_SOURCES

type OptionIconMap = Readonly<Record<string, CaseMapIconName>>

export const CASE_MAP_PATH_ICONS = {
  fast: 'route-plan',
  long: 'map-full',
} as const satisfies Record<CaseMapPath, CaseMapIconName>

export const CASE_MAP_SPECIES_ICONS = {
  pies: 'dog-profile',
  kot: 'cat-profile',
} as const satisfies Record<CaseMapSpecies, CaseMapIconName>

export const CASE_MAP_TOPIC_ICONS = {
  dog_walks: 'leash-walk',
  dog_alone: 'alone-door',
  dog_resources: 'resources-set',
  dog_noise: 'sound-wave',
  dog_change: 'home-routine',
  cat_litter: 'litter-box',
  cat_touch: 'hand-care',
  cat_conflict: 'territory-corridor',
  cat_change: 'home-routine',
  noise: 'sound-wave',
  other: 'case-notes',
} as const satisfies Record<CaseMapTopic, CaseMapIconName>

/**
 * Pełne, jawne pokrycie wszystkich odpowiedzi wyboru dostępnych publicznie.
 * Pytajnik pojawia się wyłącznie przy rzeczywistej odpowiedzi "Nie wiem".
 */
export const CASE_MAP_QUESTION_OPTION_ICONS = {
  case_focus: {
    one_pet: 'observe-eye',
    relationship: 'bond-pair',
    unknown: 'unknown',
  },
  fast_onset: {
    sudden: 'time-loop',
    recent: 'time-loop',
    longer: 'time-loop',
    unknown: 'unknown',
  },
  fast_frequency: {
    single: 'time-loop',
    weekly: 'time-loop',
    daily: 'time-loop',
    unknown: 'unknown',
  },
  walk_pattern: {
    staring: 'observe-eye',
    barking: 'sound-wave',
    pulling: 'leash-walk',
    unknown: 'unknown',
  },
  fast_goal: {
    safety: 'safety-shield',
    understanding: 'observe-eye',
    specific: 'route-plan',
    change: 'home-routine',
    full_plan: 'map-full',
    unknown: 'unknown',
  },
  intake_media_permission: {
    yes: 'video-recording',
    later: 'video-recording',
    no: 'video-recording',
  },
  walk_goal: {
    passing: 'leash-walk',
    distance: 'distance-rings',
    pace: 'leash-walk',
    unknown: 'unknown',
  },
  walk_distance: {
    far: 'distance-rings',
    close: 'distance-rings',
    variable: 'distance-rings',
    unknown: 'unknown',
  },
  alone_first_signal: {
    vocalization: 'sound-wave',
    pacing: 'body-language',
    destruction: 'alone-door',
    unknown: 'unknown',
  },
  alone_evidence: {
    recording: 'video-recording',
    neighbor_report: 'bond-pair',
    after_return: 'observe-eye',
    unknown: 'unknown',
  },
  alone_symptoms: {
    yes: 'rest-nest',
    no: 'alone-door',
    unknown: 'unknown',
  },
  alone_recovery: {
    quick: 'rest-nest',
    slow: 'time-loop',
    unknown: 'unknown',
  },
  resource_signals: {
    freeze: 'body-language',
    growl: 'sound-wave',
    bite: 'boundary-warning',
    unknown: 'unknown',
  },
  resource_item: {
    food: 'resources-set',
    place: 'rest-nest',
    touch: 'hand-care',
    unknown: 'unknown',
  },
  resource_approach: {
    adult: 'adult-approach',
    child: 'child-approach',
    animal: 'other-pet',
    unknown: 'unknown',
  },
  noise_recovery: {
    minutes: 'time-loop',
    hours: 'time-loop',
    until_next: 'time-loop',
    unknown: 'unknown',
  },
  noise_source: {
    storm: 'sound-wave',
    home: 'home-routine',
    outside: 'sound-wave',
    unknown: 'unknown',
  },
  noise_signals: {
    hide: 'rest-nest',
    panic: 'body-language',
    vocal: 'sound-wave',
    unknown: 'unknown',
  },
  change_symptoms: {
    withdrawal: 'rest-nest',
    reactivity: 'body-language',
    routine: 'home-routine',
    litter: 'litter-box',
    unknown: 'unknown',
  },
  change_type: {
    move: 'home-routine',
    care: 'bond-pair',
    people: 'bond-pair',
    routine: 'home-routine',
    unknown: 'unknown',
  },
  change_relationship: {
    yes: 'bond-pair',
    no: 'bond-pair',
    unknown: 'unknown',
  },
  change_stability: {
    yes: 'home-routine',
    no: 'home-routine',
    unknown: 'unknown',
  },
  litter_problem: {
    outside: 'litter-box',
    avoidance: 'litter-box',
    frequency: 'time-loop',
    unknown: 'unknown',
  },
  litter_cat_count: {
    clear: 'territory-corridor',
    partial: 'territory-corridor',
    unknown: 'unknown',
  },
  litter_change: {
    yes: 'litter-box',
    no: 'litter-box',
    unknown: 'unknown',
  },
  touch_context: {
    petting: 'hand-care',
    handling: 'hand-care',
    approach: 'adult-approach',
    unknown: 'unknown',
  },
  touch_area: {
    yes: 'body-language',
    no: 'body-language',
    unknown: 'unknown',
  },
  touch_signals: {
    tail: 'body-language',
    leave: 'alone-door',
    bite: 'boundary-warning',
    unknown: 'unknown',
  },
  conflict_pattern: {
    blocking: 'territory-corridor',
    chasing: 'territory-corridor',
    hiding: 'rest-nest',
    unknown: 'unknown',
  },
  conflict_locations: {
    yes: 'territory-corridor',
    no: 'territory-corridor',
    unknown: 'unknown',
  },
  conflict_access_loss: {
    yes: 'territory-corridor',
    no: 'territory-corridor',
    unknown: 'unknown',
  },
  other_pattern: {
    yes: 'unusual-pattern',
    no: 'case-notes',
    unknown: 'unknown',
  },
} as const satisfies Readonly<Record<string, OptionIconMap>>

const CASE_MAP_QUESTION_OPTION_ICON_LOOKUP: Readonly<Record<string, OptionIconMap>> = CASE_MAP_QUESTION_OPTION_ICONS

export function hasExplicitCaseMapQuestionOptionIcon(questionId: string, optionId: string) {
  return Boolean(CASE_MAP_QUESTION_OPTION_ICON_LOOKUP[questionId]?.[optionId])
}

/**
 * The public data is covered by the mapping above and protected by a test.
 * A neutral observation mark is a safe rendering guard for a future option;
 * it deliberately is not the uncertainty question-mark icon.
 */
export function getCaseMapQuestionOptionIcon(questionId: string, optionId: string): CaseMapIconName {
  return CASE_MAP_QUESTION_OPTION_ICON_LOOKUP[questionId]?.[optionId] ?? 'unusual-pattern'
}
