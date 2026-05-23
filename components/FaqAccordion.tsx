'use client'

import { useState } from 'react'

type FaqItem = {
  q: string
  a: string
}

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({})

  return (
    <div className="faq-list top-gap">
      {items.map((item, index) => {
        const panelId = `faq-panel-${index}`
        const headingId = `faq-heading-${index}`
        const isOpen = openItems[item.q] ?? false

        return (
          <article key={item.q} className="faq-item">
            <h3 id={headingId} className="faq-heading">
              <button
                type="button"
                className="faq-trigger"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenItems((current) => ({ ...current, [item.q]: !isOpen }))}
              >
                <span>{item.q}</span>
                <span className="faq-chevron" aria-hidden="true">+</span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={headingId}
              className="faq-answer"
              hidden={!isOpen}
            >
              {item.a}
            </div>
          </article>
        )
      })}
    </div>
  )
}
