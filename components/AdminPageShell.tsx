'use client'

import type { ReactNode } from 'react'
import { Header } from '@/components/Header'

type AdminPageShellProps = {
  eyebrow: string
  title: string
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
}

export function AdminPageShell({
  eyebrow,
  title,
  description,
  actions,
  children,
  className,
}: AdminPageShellProps) {
  return (
    <main className="page-wrap" data-analytics-disabled="true">
      <div className="container">
        <Header />
        <section className={className ? `panel section-panel ${className}` : 'panel section-panel'}>
          <div className="section-head">
            <div>
              <div className="section-eyebrow">{eyebrow}</div>
              <h1>{title}</h1>
              {description ? <p className="hero-text">{description}</p> : null}
            </div>
            {actions ? <div className="hero-actions">{actions}</div> : null}
          </div>
          {children}
        </section>
      </div>
    </main>
  )
}
