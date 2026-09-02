import type { Metadata } from 'next'
import { ZapytajRecoveryPicker } from '@/components/ZapytajRecoveryPicker'
import { listAvailability, getBookingByRecoveryAccess } from '@/lib/server/db'
import { isAvailabilitySlotBookableForService } from '@/lib/scheduling/rules'
import { isZapytajLiveSlot } from '@/lib/zapytaj-flow'

export const metadata: Metadata = {
  title: 'Dodatkowy termin rozmowy | Regulski Behawiorysta',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

type SearchParams = Promise<{ bookingId?: string; token?: string }>

export default async function ZapytajRecoveryPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const bookingId = params.bookingId?.trim() ?? ''
  const token = params.token?.trim() ?? ''
  const booking = bookingId && token ? await getBookingByRecoveryAccess(bookingId, token) : null

  if (!booking) {
    return (
      <main className="page-wrap">
        <div className="container">
          <section className="panel centered-panel">
            <h1>Link jest nieprawidłowy albo wygasł</h1>
            <p className="muted">Napisz do behawiorysty, a sprawdzę ręcznie, czy mogę zaproponować termin.</p>
          </section>
        </div>
      </main>
    )
  }

  const groups = booking.callRecoveryUsed ? [] : await listAvailability()
  const slots = groups
    .flatMap((group) => group.slots
      .filter((slot) => !isZapytajLiveSlot(slot.id) && isAvailabilitySlotBookableForService(slot, 'szybka-konsultacja-15-min'))
      .map((slot) => ({
        id: slot.id,
        date: slot.bookingDate,
        time: slot.bookingTime,
        label: `${group.label} · ${slot.bookingTime}`,
      })))
    .slice(0, 24)

  return (
    <main className="page-wrap">
      <div className="container">
        <section className="panel centered-panel" style={{ maxWidth: '720px', margin: '0 auto' }}>
          <div className="section-eyebrow">Zapytaj behawiorystę</div>
          <h1>Wybierz dodatkowy termin rozmowy</h1>
          <p className="muted paragraph-gap">
            To jednorazowa możliwość po dwóch nieodebranych próbach. Nie wykonuj ponownej płatności — wybierz termin, który realnie możesz odebrać.
          </p>
          <ZapytajRecoveryPicker bookingId={booking.id} token={token} slots={slots} alreadyUsed={Boolean(booking.callRecoveryUsed)} />
        </section>
      </div>
    </main>
  )
}
