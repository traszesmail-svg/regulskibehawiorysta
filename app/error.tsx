'use client'

import Link from 'next/link'

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main-content" tabIndex={-1} className="page-wrap" role="alert" aria-labelledby="page-error-title">
      <section className="account-room-card">
        <h1 id="page-error-title">Nie udało się otworzyć tej strony</h1>
        <p>Spróbuj ponownie. Jeśli problem wróci, wróć na stronę główną i skontaktuj się z nami.</p>
        <div className="homepage-hero-actions">
          <button className="button button-primary" onClick={() => reset()} type="button">
            Spróbuj ponownie
          </button>
          <Link className="button button-secondary" href="/">
            Strona główna
          </Link>
        </div>
      </section>
    </main>
  )
}
