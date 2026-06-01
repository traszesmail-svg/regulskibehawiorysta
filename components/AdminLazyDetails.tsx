'use client'

import { ReactNode, useState } from 'react'

type AdminLazyDetailsProps = {
  summary: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
  dataAttribute?: string
}

export function AdminLazyDetails({
  summary,
  children,
  className,
  contentClassName,
  dataAttribute,
}: AdminLazyDetailsProps) {
  const [shouldRender, setShouldRender] = useState(false)
  const dataProps = dataAttribute ? ({ [dataAttribute]: '' } as Record<string, string>) : {}

  return (
    <details
      className={className}
      onToggle={(event) => {
        if (event.currentTarget.open) {
          setShouldRender(true)
        }
      }}
      {...dataProps}
    >
      <summary>{summary}</summary>
      {shouldRender ? <div className={contentClassName}>{children}</div> : null}
    </details>
  )
}
