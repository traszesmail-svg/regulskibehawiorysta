import Link from 'next/link'
import { unstable_noStore as noStore } from 'next/cache'
import { AdminAccountRooms } from '@/components/AdminAccountRooms'
import { AdminPageShell } from '@/components/AdminPageShell'
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
    error = loadError instanceof Error ? loadError.message : 'Nie udało się pobrać pokoi opiekuna.'
  }

  return (
    <AdminPageShell
      eyebrow="Panel specjalisty"
      title="Pokój opiekuna: rozmowy i pliki"
      description="Tu widzisz konta klientów, pupile, przesłane pliki i rozmowy z aplikacji."
      actions={
        <Link href="/admin" className="button button-ghost">
          Panel główny
        </Link>
      }
    >
      {error ? (
        <div className="form-error top-gap">{error}</div>
      ) : (
        <div className="top-gap">
          <AdminAccountRooms rooms={rooms} />
        </div>
      )}
    </AdminPageShell>
  )
}
