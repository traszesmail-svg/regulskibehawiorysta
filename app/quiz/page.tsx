import type { Metadata } from 'next'
import { Clock3, HeartHandshake, ShieldCheck } from 'lucide-react'
import { DecisionQuiz } from '@/components/DecisionQuiz'
import { NotatnikPageShell, PUBLIC_SITE_NAV_ITEMS } from '@/components/NotatnikA'
import { Schema } from '@/components/schema'
import { buildBookHref } from '@/lib/booking-routing'
import { getBreadcrumbJsonLd } from '@/lib/schema'
import { buildMarketingMetadata } from '@/lib/seo'

export const metadata: Metadata = buildMarketingMetadata({
  title: 'Quiz - dobierz pierwszy krok',
  path: '/quiz',
  description:
    'Prosty quiz dla opiekunów psów i kotów: odpowiedz na kilka pytań i sprawdź, jaka konsultacja będzie najspokojniejszym pierwszym krokiem.',
})

const bookingHrefs = {
  kwadrans: buildBookHref(null, 'szybka-konsultacja-15-min'),
  'dwa-kwadranse': buildBookHref(null, 'konsultacja-30-min'),
  'pelna-konsultacja': buildBookHref(null, 'konsultacja-behawioralna-online'),
} as const

const quizBenefits = [
  { icon: ShieldCheck, title: 'Bez zobowiązań' },
  { icon: Clock3, title: 'Zajmie 2-3 minuty' },
  { icon: HeartHandshake, title: 'Dla psa i kota' },
] as const

export default function QuizPage() {
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

      <div className="quiz-reference-stage">
        <section className="quiz-reference-card" aria-labelledby="quiz-title">
          <div className="quiz-reference-hero">
            <div className="section-eyebrow">Quiz</div>
            <h1 id="quiz-title">Dobierzmy najlepszy pierwszy krok</h1>
            <p>
              Odpowiedz na kilka prostych pytań. Na końcu podpowiem, czy wystarczy krótka rozmowa, dłuższa konsultacja
              czy spokojne doprecyzowanie sytuacji.
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

          <DecisionQuiz bookingHrefs={bookingHrefs} />
        </section>
      </div>
    </NotatnikPageShell>
  )
}
