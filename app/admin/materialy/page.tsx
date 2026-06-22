import Link from 'next/link'
import { unstable_noStore as noStore } from 'next/cache'
import { AdminMaterialyOrders } from '@/components/AdminMaterialyOrders'
import { AdminPageShell } from '@/components/AdminPageShell'
import { listAllOrders } from '@/lib/server/materialy-storage'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminMaterialyPage() {
  noStore()
  const orders = await listAllOrders()
  orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return (
    <AdminPageShell
      eyebrow="Materiały"
      title="Zamówienia /materiały"
      description={
        <>
          Po wpływie BLIK kliknij „Potwierdź wpłatę i wyślij kod”. Klient dostanie 6-cyfrowy kod mailem i pobierze
          PDF na <Link href="/materialy/pobranie">/materialy/pobranie</Link>.
        </>
      }
      actions={
        <>
          <Link href="/admin" className="button button-ghost">
            Panel admina
          </Link>
          <Link href="/payment" className="button button-primary">
            Podgląd płatności
          </Link>
        </>
      }
    >
      <AdminMaterialyOrders initialOrders={orders} />
    </AdminPageShell>
  )
}
