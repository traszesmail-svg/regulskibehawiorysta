import Link from 'next/link'
import { getServiceAnalyticsParams } from '@/lib/analytics-schema'
import { COPY_CTA } from '@/lib/copy-governance'

type HeroAudioSoftCtaProps = {
  href: string
  analyticsLocation: string
  analyticsEvent?: string
  className?: string
  ariaLabel?: string
  kicker?: string
  title?: string
  copy?: string
}

type ProofChipIconKind = 'camera-off' | 'clock' | 'direction'

const proofChips = [
  { label: 'Bez kamery', icon: 'camera-off' },
  { label: '15 minut', icon: 'clock' },
  { label: 'Krótka rozmowa', icon: 'direction' },
] as const satisfies ReadonlyArray<{ label: string; icon: ProofChipIconKind }>

function ProofChipIcon({ kind }: { kind: ProofChipIconKind }) {
  switch (kind) {
    case 'camera-off':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M4.5 5.5 19.5 18.5" />
          <path d="M10.1 8H8.2A2.7 2.7 0 0 0 5.5 10.7v4.1a2.7 2.7 0 0 0 2.7 2.7h7.6a2.7 2.7 0 0 0 1.58-.5" />
          <path d="m14.5 10.7 4-2.2v6.8l-3.23-1.77" />
          <path d="M14.8 8.3h.95a2.7 2.7 0 0 1 2.7 2.7" />
        </svg>
      )
    case 'clock':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="7.25" />
          <path d="M12 8.4v4.1l2.7 1.7" />
        </svg>
      )
    case 'direction':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M12 5.25 7.35 11.4h3v7.35h3.3V11.4h3Z" />
        </svg>
      )
  }

  return null
}

export function HeroAudioSoftCta({
  href,
  analyticsLocation,
  analyticsEvent = 'funnel_entry_15_min',
  className,
  ariaLabel = 'Otwórz 15-minutową konsultację behawioralną',
  kicker = 'Zapytaj behawiorystę',
  title = 'Krótka rozmowa, po której łatwiej ustalić pierwszy krok.',
  copy = 'Bez kamery. Po rozmowie wiesz, co zrobić teraz i czy potrzebujesz czegoś więcej.',
}: HeroAudioSoftCtaProps) {
  const quickService = getServiceAnalyticsParams('szybka-konsultacja-15-min')

  return (
    <Link
      href={href}
      prefetch={false}
      className={className ? `hero-soft-audio-card ${className}` : 'hero-soft-audio-card'}
      data-analytics-event={analyticsEvent}
      data-analytics-location={analyticsLocation}
      data-analytics-cta-label={COPY_CTA.primary}
      data-analytics-service="szybka-konsultacja-15-min"
      data-analytics-service-name={String(quickService.service_name)}
      data-analytics-service-duration={String(quickService.service_duration)}
      data-analytics-service-price={String(quickService.service_price)}
      aria-label={ariaLabel}
    >
      <span className="hero-soft-audio-body">
        <span className="hero-soft-audio-kicker">{kicker}</span>
        <span className="hero-soft-audio-title">{title}</span>
        <span className="hero-soft-audio-copy">{copy}</span>
      </span>

      <span className="hero-soft-audio-proofs" aria-label="Najważniejsze informacje o rozmowie audio">
        {proofChips.map((item) => (
          <span key={item.label} className="hero-soft-audio-chip">
            <span className="hero-soft-audio-chip-icon" aria-hidden="true">
              <ProofChipIcon kind={item.icon} />
            </span>
            <span>{item.label}</span>
          </span>
        ))}
      </span>
    </Link>
  )
}
