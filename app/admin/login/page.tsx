import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Panel właściciela', robots: { index: false, follow: false } }

export default async function AdminLoginPage({ searchParams }: { searchParams?: Promise<{ error?: string }> }) {
  const error = (await searchParams)?.error === '1'
  return (
    <main className="page-wrap" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <form action="/api/admin/session" method="post" className="list-card" style={{ width: 'min(100%, 360px)', padding: 24 }}>
        <div className="section-eyebrow">Panel właściciela</div>
        <h1 style={{ marginTop: 6 }}>Dostęp do zaplecza serwisu</h1>
        <p className="muted">Prywatny panel właściciela do obsługi serwisu. Konto opiekuna i PDF-y otwierają się na osobnych stronach.</p>
        <label style={{ display: 'grid', gap: 6, marginTop: 18 }}><span>Hasło panelu właściciela</span><input name="password" type="password" autoComplete="current-password" required autoFocus /></label>
        {error ? <p className="error-box" style={{ marginTop: 12 }}>Hasło jest nieprawidłowe.</p> : null}
        <button className="button button-primary" type="submit" style={{ marginTop: 16, width: '100%' }}>Otwórz panel właściciela</button>
      </form>
    </main>
  )
}
