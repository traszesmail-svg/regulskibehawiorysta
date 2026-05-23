import Link from 'next/link'
import type { ReactNode } from 'react'
import { FileText, ShieldCheck } from 'lucide-react'
import { ReferencePageShell } from '@/components/ReferencePageShell'
import { Schema } from '@/components/schema'

export type LegalSummaryItem = {
  label: string
  value: string
}

export type LegalSection = {
  title: string
  body: ReactNode
}

type LegalPageLayoutProps = {
  eyebrow: string
  title: string
  intro: string
  summaryItems: LegalSummaryItem[]
  sections: LegalSection[]
  structuredData?: Record<string, unknown>[]
}

export function LegalPageLayout({
  eyebrow,
  title,
  intro,
  summaryItems,
  sections,
  structuredData = [],
}: LegalPageLayoutProps) {
  return (
    <ReferencePageShell className="reference-legal-page" ctaHref="/quiz" showFooterReviews={false}>
      {structuredData.length > 0 ? <Schema data={structuredData} /> : null}

      <section className="reference-hero reference-legal-hero">
        <div className="reference-hero-copy">
          <span className="reference-pill">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{intro}</p>
          <div className="reference-hero-actions">
            <Link href="/" prefetch={false} className="reference-btn reference-btn-primary">
              Wróć do strony głównej
            </Link>
            <Link href="/kontakt#formularz" prefetch={false} className="reference-btn reference-btn-secondary">
              Kontakt
            </Link>
          </div>
        </div>

        <aside className="reference-legal-summary" aria-label="Skrót dokumentu">
          <div className="reference-legal-summary-icon" aria-hidden="true">
            <FileText size={34} strokeWidth={1.7} />
          </div>
          <h2>Najważniejsze informacje</h2>
          <div className="reference-info-list">
            {summaryItems.map((item) => (
              <div key={item.label} className="reference-info-row">
                <ShieldCheck size={22} strokeWidth={1.7} aria-hidden="true" />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.value}</small>
                </span>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="reference-main-layout reference-main-layout-single">
        <div className="reference-content-column">
          <section className="reference-section-card reference-legal-document">
            {sections.map((section, index) => (
              <article key={section.title} className="reference-legal-section">
                <div className="reference-legal-number">{String(index + 1).padStart(2, '0')}</div>
                <div>
                  <h2>{section.title}</h2>
                  <div className="reference-legal-body">{section.body}</div>
                </div>
              </article>
            ))}
          </section>
        </div>
      </section>
    </ReferencePageShell>
  )
}
