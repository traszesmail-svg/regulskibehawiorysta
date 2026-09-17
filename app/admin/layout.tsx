import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Regulski Operator — Centrum Operacyjne Właściciela',
  description: 'Mobilny kokpit zarządzania konsultacjami, trybem Live i stacją telefoniczną.',
  manifest: '/admin-manifest.json',
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
