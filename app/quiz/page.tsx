import type { Metadata } from 'next'
import { Clock3, HeartHandshake, ShieldCheck } from 'lucide-react'
import { FirstStepQuiz } from '@/components/FirstStepQuiz'
import { NotatnikPageShell, PUBLIC_SITE_NAV_ITEMS } from '@/components/NotatnikA'
import { ReferenceHeroLeaf } from '@/components/ReferencePageShell'
import { Schema } from '@/components/schema'
import { getQuizProblemContext } from '@/lib/quiz-first-step'
import { getBreadcrumbJsonLd } from '@/lib/schema'
import { buildMarketingMetadata } from '@/lib/seo'
import styles from './quiz.module.css'

export const metadata: Metadata = buildMarketingMetadata({
  title: 'Quiz - dobierz pierwszy krok',
  path: '/quiz',
  description:
    'Krótka mapa pierwszego kroku dla opiekunów psów i kotów: sprawdź bezpieczeństwo, zobacz co zrobić dziś i dopiero potem zdecyduj o rozmowie.',
})


type QuizSearchParams = {
  problem?: string | string[]
  utm_source?: string | string[]
  utm_medium?: string | string[]
  utm_campaign?: string | string[]
  utm_content?: string | string[]
}

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function getMarketingParams(searchParams?: QuizSearchParams) {
  const params: Record<string, string> = {}
  const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'] as const

  for (const key of keys) {
    const value = getSingleParam(searchParams?.[key])?.trim()
    if (value && value.length <= 120) params[key] = value
  }

  return params
}
const quizBenefits = [
  { icon: ShieldCheck, title: 'Bez zobowiązań' },
  { icon: Clock3, title: 'Około 2 minuty' },
  { icon: HeartHandshake, title: 'Dla psa i kota' },
] as const

export default function QuizPage({ searchParams }: { searchParams?: QuizSearchParams }) {
  const problemContext = getQuizProblemContext(getSingleParam(searchParams?.problem))
  const marketingParams = getMarketingParams(searchParams)
  return (
    <NotatnikPageShell
      tag="Quiz"
      navItems={PUBLIC_SITE_NAV_ITEMS}
      ctaHref="/quiz"
      ctaLabel="Quiz"
      footerPrimaryHref="/quiz"
      footerPrimaryLabel="Quiz"
      sideVisualVariant="mixed"
      pageClassName="quiz-page"
    >
      <Schema
        data={getBreadcrumbJsonLd([
          { name: 'Strona główna', path: '/' },
          { name: 'Quiz', path: '/quiz' },
        ])}
      />
      <ReferenceHeroLeaf />

      <div className="quiz-reference-stage">
        <section className="quiz-reference-card" aria-labelledby="quiz-title">
          <div className="quiz-reference-hero">
            <div className="section-eyebrow">Quiz</div>
            <h1 id="quiz-title">{problemContext?.heroTitle ?? 'Znajdźmy spokojny pierwszy krok'}</h1>
            <p>
              {problemContext?.heroCopy ??
                'W mniej niż 2 minuty sprawdzisz bezpieczeństwo, nazwiesz sytuację własnymi słowami i dostaniesz prostą wskazówkę na dziś. To nie jest diagnoza ani test „czy zwierzę jest agresywne”.'}
            </p>
          </div>

          <div className="quiz-benefit-strip" aria-label="Co daje quiz">
            {quizBenefits.map((benefit) => {
              const Icon = benefit.icon

              return (
                <div className="quiz-benefit-item" key={benefit.title}>
                  <span className="quiz-benefit-icon" aria-hidden="true">
                    <Icon size={30} strokeWidth={1.9} />
                  </span>
                  <strong>{benefit.title}</strong>
                </div>
              )
            })}
          </div>

          <div id="quiz-start" className={`quiz-start-anchor first-step-quiz-anchor ${styles.quizAnchor}`}>
            <FirstStepQuiz initialProblemKey={problemContext?.problemKey} marketingParams={marketingParams} />
          </div>
        </section>
      </div>
    </NotatnikPageShell>
  )
}
