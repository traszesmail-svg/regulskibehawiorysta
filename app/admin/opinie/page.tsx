import Link from 'next/link'
import { unstable_noStore as noStore } from 'next/cache'
import { AdminPageShell } from '@/components/AdminPageShell'
import { getTestimonialIssueLabel } from '@/lib/testimonials'
import { listPendingTestimonials } from '@/lib/server/testimonial-store'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' })
}

function isExternalUrl(value: string): boolean {
  return /^https?:\/\//i.test(value)
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Oczekuje',
  published: 'Opublikowana',
  skipped: 'Odłożona',
}

export default async function AdminOpiniePage() {
  noStore()

  let testimonials: Awaited<ReturnType<typeof listPendingTestimonials>> = []
  let loadError: string | null = null

  try {
    testimonials = await listPendingTestimonials()
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err)
  }

  const pending = testimonials.filter((t) => t.status === 'pending')
  const rest = testimonials.filter((t) => t.status !== 'pending')

  return (
    <AdminPageShell
      eyebrow="Opinie"
      title="Opinie klientów"
      actions={
        <Link href="/admin" className="button button-ghost">
          Panel admina
        </Link>
      }
    >
      <div className="summary-grid top-gap">
        <div className="summary-card">
          <div className="stat-label">Oczekujące</div>
          <div className="summary-value">{pending.length}</div>
        </div>
        <div className="summary-card">
          <div className="stat-label">Historia</div>
          <div className="summary-value">{rest.length}</div>
        </div>
      </div>

      {loadError && (
        <p className="error-box top-gap">Błąd ładowania danych: {loadError}</p>
      )}

      <section className="top-gap">
        <div className="section-eyebrow">Oczekujące na decyzję</div>
        <h2>Do sprawdzenia ({pending.length})</h2>

        {pending.length === 0 && !loadError && <p className="muted">Brak oczekujących opinii.</p>}

        {pending.length > 0 ? (
          <div className="booking-list top-gap">
            {pending.map((t) => (
              <article
                key={t.id}
                className="booking-row"
                style={{
                  background: '#fafaf8',
                  border: '1px solid #e9dfcf',
                  borderRadius: 12,
                  padding: '20px 24px',
                }}
              >
                <div>
                  <div className="booking-title">{t.displayName}</div>
                  <div className="booking-meta">{t.email}</div>
                  <div className="booking-meta">Kategoria: {getTestimonialIssueLabel(t.issueCategory)}</div>
                </div>

                <div className="booking-description">
                  <blockquote style={{ margin: 0, padding: '12px 16px', background: '#fff', borderLeft: '3px solid #d9cfc3', borderRadius: 6 }}>
                    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{t.opinion}</p>
                  </blockquote>
                  {t.photoUrl ? (
                    <p className="booking-meta" style={{ marginTop: 12 }}>
                      Zdjęcie:{' '}
                      {isExternalUrl(t.photoUrl) ? (
                        <a href={t.photoUrl} target="_blank" rel="noopener noreferrer">
                          {t.photoUrl}
                        </a>
                      ) : (
                        <span>{t.photoUrl}</span>
                      )}
                    </p>
                  ) : null}
                </div>

                <div className="booking-actions">
                  <span className="booking-meta">{formatDate(t.createdAt)}</span>
                  <a href={`/api/admin/testimonials/${t.id}?action=publish`} className="button button-primary small-button">
                    Opublikuj
                  </a>
                  <a href={`/api/admin/testimonials/${t.id}?action=skip`} className="button button-ghost small-button">
                    Odłóż
                  </a>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      {rest.length > 0 && (
        <section className="top-gap">
          <div className="section-eyebrow">Historia</div>
          <h2>Wszystkie decyzje ({rest.length})</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e9dfcf' }}>
                <th style={thStyle}>Imię</th>
                <th style={thStyle}>Kategoria</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Data</th>
              </tr>
            </thead>
            <tbody>
              {rest.map((t) => (
                <tr key={t.id} style={{ borderBottom: '1px solid #f0ebe3' }}>
                  <td style={tdStyle}>{t.displayName}</td>
                  <td style={tdStyle}>{getTestimonialIssueLabel(t.issueCategory)}</td>
                  <td style={tdStyle}>{STATUS_LABELS[t.status] ?? t.status}</td>
                  <td style={tdStyle}>{formatDate(t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </AdminPageShell>
  )
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 12px',
  color: '#6b625b',
  fontWeight: 600,
}

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  color: '#1f1a17',
}
