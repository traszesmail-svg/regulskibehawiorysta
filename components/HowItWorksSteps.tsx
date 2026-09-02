import { Icon, type IconName } from '@/components/icons-config'

interface Step {
  num: number
  icon: IconName
  title: string
  desc: string
  highlight?: boolean
  withVideoOff?: boolean
}

const steps: Step[] = [
  { num: 1, icon: 'layout-list', title: 'Opisz, co się dzieje', desc: 'Zacznij od Zapytaj behawiorystę. Jeśli sytuacja wymaga szerszego procesu, pełna konsultacja jest kolejnym krokiem.' },
  { num: 2, icon: 'message-square-text', title: 'Opisz sytuację', desc: 'Krótko: co dzieje się w domu lub na spacerze i jak reaguje pupil.' },
  { num: 3, icon: 'headphones', title: 'Rozmowa audio', desc: 'Słuchawki w uszach, kamera wyłączona - spokojnie i bez stresu.', withVideoOff: true },
  { num: 4, icon: 'check', title: 'Wiesz co dalej', desc: 'Konkretny pierwszy krok, który możesz zacząć od razu.', highlight: true },
]

export function HowItWorksSteps() {
  return (
    <section className="notatnik-process-row">
      {steps.map((step) => (
        <article key={step.num} className={step.highlight ? 'notatnik-process-card is-highlighted' : 'notatnik-process-card'}>
          <header className="notatnik-process-card-head">
            <div className="notatnik-process-icon">
              <Icon name={step.icon} size={28} strokeWidth={2.25} />

              {step.withVideoOff ? (
                <div className="notatnik-process-video-off">
                  <Icon name="video-off" size={12} strokeWidth={3} />
                </div>
              ) : null}
            </div>
            <div className="notatnik-process-number">{step.num}</div>
          </header>
          <h3>{step.title}</h3>
          <p>{step.desc}</p>
        </article>
      ))}
    </section>
  )
}
