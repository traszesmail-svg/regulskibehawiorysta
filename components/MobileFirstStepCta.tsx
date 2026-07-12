import Link from 'next/link'

type MobileFirstStepCtaProps = {
  eyebrow: string
  title: string
  copy: string
  primaryHref: string
  primaryLabel: string
  secondaryHref?: string
  secondaryLabel?: string
  meta?: string
}

export function MobileFirstStepCta({
  eyebrow,
  title,
  copy,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  meta,
}: MobileFirstStepCtaProps) {
  return (
    <aside className="mobile-first-step-cta" aria-label="Szybki pierwszy krok">
      <span className="mobile-first-step-cta-eyebrow">{eyebrow}</span>
      <strong>{title}</strong>
      <p>{copy}</p>
      {meta ? <small>{meta}</small> : null}
      <div className="mobile-first-step-cta-actions">
        <Link href={primaryHref} prefetch={false}>
          {primaryLabel}
        </Link>
        {secondaryHref && secondaryLabel ? (
          <Link href={secondaryHref} prefetch={false}>
            {secondaryLabel}
          </Link>
        ) : null}
      </div>
    </aside>
  )
}
