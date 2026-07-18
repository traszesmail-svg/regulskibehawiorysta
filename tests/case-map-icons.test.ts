import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import {
  CASE_MAP_ICON_SOURCES,
  CASE_MAP_PATH_ICONS,
  CASE_MAP_QUESTION_OPTION_ICONS,
  CASE_MAP_SPECIES_ICONS,
  CASE_MAP_TOPIC_ICONS,
  getCaseMapQuestionOptionIcon,
  hasExplicitCaseMapQuestionOptionIcon,
} from '@/lib/case-map-icons'
import {
  CASE_MAP_FOCUS_QUESTION,
  CASE_MAP_PATH_OPTIONS,
  getCaseMapPublicLongSections,
  getCaseMapShortFlowQuestions,
  type CaseMapQuestion,
} from '@/lib/case-map-questions'

const topics = [
  'dog_walks',
  'dog_alone',
  'dog_resources',
  'dog_noise',
  'dog_change',
  'cat_litter',
  'cat_touch',
  'cat_conflict',
  'cat_change',
  'noise',
  'other',
] as const

function publicChoiceQuestions() {
  const byId = new Map<string, CaseMapQuestion>()

  for (const topic of topics) {
    const questions = [
      CASE_MAP_FOCUS_QUESTION,
      ...getCaseMapShortFlowQuestions(topic),
      ...getCaseMapPublicLongSections(topic).flatMap((section) => section.questions),
    ]

    for (const question of questions) {
      if (question.kind === 'choice' && !byId.has(question.id)) byId.set(question.id, question)
    }
  }

  return [...byId.values()]
}

test('public Mapa zachowania gives every choice an explicit, semantic icon', () => {
  const questions = publicChoiceQuestions()
  assert.equal(questions.length, 32)

  for (const question of questions) {
    for (const option of question.options ?? []) {
      const context = `${question.id}.${option.id}`
      assert.equal(hasExplicitCaseMapQuestionOptionIcon(question.id, option.id), true, `missing icon mapping for ${context}`)

      const icon = getCaseMapQuestionOptionIcon(question.id, option.id)
      assert.equal(icon === 'unknown', option.id === 'unknown', `${context} must use the question-mark only for a real unknown answer`)
    }
  }
})

test('question-mark is never assigned to a non-unknown option', () => {
  for (const [questionId, options] of Object.entries(CASE_MAP_QUESTION_OPTION_ICONS)) {
    for (const [optionId, icon] of Object.entries(options)) {
      if (icon === 'unknown') assert.equal(optionId, 'unknown', `${questionId}.${optionId}`)
    }
  }
})

test('entry choices use named, covered icon assets', () => {
  for (const option of CASE_MAP_PATH_OPTIONS) {
    assert.ok(CASE_MAP_PATH_ICONS[option.id])
  }

  assert.deepEqual(Object.keys(CASE_MAP_SPECIES_ICONS).sort(), ['kot', 'pies'])
  assert.deepEqual(Object.keys(CASE_MAP_TOPIC_ICONS).sort(), [...topics].sort())
})

test('every runtime icon source is a versioned local PNG', () => {
  for (const [iconName, source] of Object.entries(CASE_MAP_ICON_SOURCES)) {
    assert.match(source, /^\/images\/mapa-zachowania\/icons-v3\/[a-z-]+-v1\.png$/, iconName)
    const relativePath = source.replace(/^\//, '').split('/')
    assert.equal(existsSync(path.join(process.cwd(), 'public', ...relativePath)), true, `${iconName} asset is missing`)
  }
})

test('the component no longer uses the numeric answer-icon sprite', () => {
  const component = readFileSync(path.join(process.cwd(), 'components', 'ShortBehaviorMapFlow.tsx'), 'utf8')
  const css = readFileSync(path.join(process.cwd(), 'components', 'ShortBehaviorMapFlow.module.css'), 'utf8')

  assert.match(component, /getCaseMapQuestionOptionIcon/)
  assert.doesNotMatch(component, /ImageGenIcon|QUESTION_ICON_SETS|getQuestionIconIndex|getTopicIconIndex|answer-icons-v2\.png/)
  assert.doesNotMatch(css, /answer-icons-v2\.png/)
})
