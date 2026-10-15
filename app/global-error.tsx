'use client'

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pl">
      <head>
        <title>Błąd strony | Regulski Behawiorysta</title>
      </head>
      <body style={{ margin: 0, background: '#fff', color: '#202820', fontFamily: 'system-ui, sans-serif' }}>
        <main aria-labelledby="global-error-title" style={{ maxWidth: '40rem', margin: '10vh auto', padding: '24px', lineHeight: 1.6 }}>
          <h1 id="global-error-title">Nie udało się otworzyć strony</h1>
          <p>Spróbuj ponownie. Jeśli problem wróci, odśwież stronę za chwilę.</p>
          <button type="button" onClick={() => reset()} style={{ padding: '12px 18px', font: 'inherit', cursor: 'pointer' }}>
            Spróbuj ponownie
          </button>
          <p>
            {/* A full navigation can recover even when the root layout or router failed. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/">Przejdź na stronę główną</a>
          </p>
        </main>
      </body>
    </html>
  )
}
