import { unstable_noStore as noStore } from 'next/cache'
import { readLatestQaReport } from '@/lib/server/qa-report'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminQaReportPage() {
  noStore()
  const report = await readLatestQaReport()

  return (
    <main className="page-wrap" data-analytics-disabled="true">
      <div className="container">
        <section className="panel section-panel">
          <div className="section-head">
            <div>
              <div className="section-eyebrow">Wewnętrzny raport QA</div>
              <h1>Raport techniczny</h1>
            </div>
          </div>

          <div className="stack-gap top-gap">
            <div className="list-card">
              <strong>Status artefaktu</strong>
              <span>{report.exists ? 'Raport znaleziony w repo.' : 'Raport nie istnieje jeszcze w repo.'}</span>
            </div>
            <div className="list-card">
              <strong>Ścieżka źródłowa</strong>
              <span>{report.filePath}</span>
            </div>
            <div className="list-card">
              <strong>Ostatnia aktualizacja</strong>
              <span>{report.updatedAt ?? 'brak'}</span>
            </div>
          </div>

          <pre
            className="top-gap"
            style={{
              whiteSpace: 'pre-wrap',
              overflowX: 'auto',
              borderRadius: '24px',
              border: '1px solid rgba(30, 41, 59, 0.12)',
              background: 'rgba(248, 250, 252, 0.92)',
              padding: '1.5rem',
              fontSize: '0.95rem',
              lineHeight: 1.7,
            }}
          >
            {report.content}
          </pre>
        </section>
      </div>
    </main>
  )
}
