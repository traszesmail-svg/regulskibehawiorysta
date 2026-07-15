import Link from 'next/link'
import { unstable_noStore as noStore } from 'next/cache'
import { AdminAccountRooms } from '@/components/AdminAccountRooms'
import { AdminCaseMaps } from '@/components/AdminCaseMaps'
import { AdminPageShell } from '@/components/AdminPageShell'
import { listAccountRoomsForAdmin } from '@/lib/server/account-store'
import { listCaseMapsForConsultant } from '@/lib/server/case-map-store'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminAccountRoomsPage() {
  noStore()

  let rooms: Awaited<ReturnType<typeof listAccountRoomsForAdmin>> = []
  let caseMaps: Awaited<ReturnType<typeof listCaseMapsForConsultant>> = []
  let roomsError: string | null = null
  let caseMapsError: string | null = null

  try {
    rooms = await listAccountRoomsForAdmin()
  } catch (loadError) {
    roomsError = loadError instanceof Error ? loadError.message : 'Nie udało się pobrać pokoi opiekuna.'
  }

  try {
    caseMaps = await listCaseMapsForConsultant()
  } catch (loadError) {
    caseMapsError = loadError instanceof Error ? loadError.message : 'Nie udało się pobrać przekazanych Map sprawy.'
  }

  return (
    <AdminPageShell
      eyebrow="Panel specjalisty"
      title="Pokój opiekuna: rozmowy, pliki i Mapy spraw"
      description="Tu widzisz konta klientów, pupile, przesłane pliki, rozmowy oraz Mapy świadomie przekazane do przygotowania konsultacji."
      actions={
        <Link href="/admin" className="button button-ghost">
          Panel główny
        </Link>
      }
    >
      <section className="admin-operational-section top-gap">
        <div className="section-eyebrow">Formularze przed konsultacją</div>
        <h2>Przekazane Mapy spraw</h2>
        <p className="muted paragraph-gap">Pełna Mapa jest dostępna tutaj dopiero po dobrowolnym przekazaniu jej przez opiekuna przy rezerwacji.</p>
        {caseMapsError ? <div className="form-error top-gap">{caseMapsError}</div> : <div className="top-gap"><AdminCaseMaps caseMaps={caseMaps} /></div>}
      </section>
      <section className="top-gap">
        {roomsError ? <div className="form-error">{roomsError}</div> : <AdminAccountRooms rooms={rooms} />}
      </section>
    </AdminPageShell>
  )
}
