import React from 'react'
import Link from 'next/link'
import { unstable_noStore as noStore } from 'next/cache'
import { AdminPageShell } from '@/components/AdminPageShell'
import { AdminSection16UrgentRequests } from '@/components/AdminSection16UrgentRequests'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function AdminSection16Page() {
  noStore()

  return (
    <AdminPageShell
      eyebrow="Sekcja 16"
      title="Pilne zgłoszenia sekcji 16"
      description="Bezpieczny panel administracyjny do tworzenia i odczytu zgłoszeń w modelu sekcji 16. Minimalne DTO, fail-closed, bez ujawniania danych PII."
      actions={
        <div className="hero-actions">
          <Link href="/admin" className="button button-ghost">
            Panel admina
          </Link>
        </div>
      }
    >
      <AdminSection16UrgentRequests />
    </AdminPageShell>
  )
}
