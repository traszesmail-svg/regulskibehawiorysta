type FunnelLoadingPageProps = {
  eyebrow: string
  title: string
  message: string
}

export function FunnelLoadingPage({ eyebrow, title, message }: FunnelLoadingPageProps) {
  return (
    <main id="main-content" tabIndex={-1} className="page-wrap marketing-page funnel-loading-shell" aria-live="polite">
      <div className="container">
        <section className="panel centered-panel hero-surface loading-panel loading-panel-light booking-flow-panel">
          <div className="funnel-loading-head">
            <div className="section-eyebrow">{eyebrow}</div>
            <div className="funnel-loading-pill">Przygotowuję następny krok</div>
          </div>

          <div className="funnel-loading-orb" aria-hidden="true" />

          <h1>{title}</h1>
          <p className="hero-text compact-panel-text">{message}</p>

          <div className="loading-line-stack">
            <div className="loading-line loading-line-wide" />
            <div className="loading-line" />
          </div>

          <div className="loading-card-grid top-gap">
            <div className="loading-card tree-backed-card" />
            <div className="loading-card tree-backed-card" />
            <div className="loading-card tree-backed-card" />
          </div>
        </section>
      </div>
    </main>
  )
}
