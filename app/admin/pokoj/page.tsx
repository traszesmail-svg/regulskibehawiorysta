import Link from 'next/link'
import { unstable_noStore as noStore } from 'next/cache'
import { AdminAccountRooms } from '@/components/AdminAccountRooms'
import { Header } from '@/components/Header'
import { listAccountRoomsForAdmin } from '@/lib/server/account-store'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminAccountRoomsPage() {
  noStore()

  let rooms: Awaited<ReturnType<typeof listAccountRoomsForAdmin>> = []
  let error: string | null = null

  try {
    rooms = await listAccountRoomsForAdmin()
  } catch (loadError) {
    error = loadError instanceof Error ? loadError.message : 'Nie udalo sie pobrac pokoi opiekuna.'
  }

  return (
    <main className="page-wrap" data-analytics-disabled="true">
      <div className="container">
        <Header />

        <section className="panel section-panel">
          <div className="section-head">
            <div>
              <div className="section-eyebrow">Panel specjalisty</div>
              <h1>Pokoj opiekuna: rozmowy i pliki</h1>
              <p className="hero-text">
                Tu widzisz konta klientow, pupile, przeslane pliki i rozmowy z aplikacji.
              </p>
            </div>
            <Link href="/admin" className="button button-ghost">
              Panel glowny
            </Link>
          </div>

          {error ? (
            <div className="form-error top-gap">{error}</div>
          ) : (
            <div className="top-gap">
              <AdminAccountRooms rooms={rooms} />
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
