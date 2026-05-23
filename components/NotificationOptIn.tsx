'use client'

import Link from 'next/link'

type NotificationOptInProps = {
  sourcePage: string
  location: string
  context?: string
  recommendedService?: string
}

function buildContactHref({ sourcePage, location, context, recommendedService }: NotificationOptInProps) {
  const params = new URLSearchParams()
  params.set('sourcePage', sourcePage)
  params.set('location', location)

  if (context) {
    params.set('context', context)
  }

  if (recommendedService) {
    params.set('service', recommendedService)
  }

  return `/kontakt?${params.toString()}#formularz`
}

export function NotificationOptIn(props: NotificationOptInProps) {
  const contactHref = buildContactHref(props)

  return (
    <article className="summary-card tree-backed-card notification-optin-card">
      <div className="section-eyebrow">Kontakt mailowy</div>
      <h3>Chcesz wrócić do wyniku później?</h3>
      <p className="muted">
        Napisz przez formularz kontaktowy. Odpowiedź wróci na podany adres e-mail, bez zapisu numeru telefonu.
      </p>

      <div className="hero-actions top-gap-small">
        <Link href={contactHref} className="button button-ghost" prefetch={false}>
          Przejdź do formularza
        </Link>
      </div>
    </article>
  )
}
