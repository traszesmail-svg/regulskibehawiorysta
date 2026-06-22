import Link from 'next/link'
import { unstable_noStore as noStore } from 'next/cache'
import { AdminPageShell } from '@/components/AdminPageShell'
import { listLeadBookings } from '@/lib/server/lead-bookings'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const STATUS_LABELS: Record<string, string> = {
  pending: 'Oczekuje',
  awaiting_payment: 'Czeka na płatność',
  paid: 'Opłacona',
  cancelled: 'Anulowana',
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#b07b3f',
  awaiting_payment: '#2f7667',
  paid: '#1a5d3a',
  cancelled: '#8a3022',
}

export default async function AdminLeadBookingsPage() {
  noStore()
  const bookings = await listLeadBookings()

  return (
    <AdminPageShell
      eyebrow="Leady"
      title={`Lead bookings (${bookings.length})`}
      description="Rezerwacje email złożone przez formularz /book. Po potwierdzeniu terminu i otrzymaniu płatności oznacz je jako opłacone."
      actions={
        <Link href="/admin" className="button button-ghost">
          Panel admina
        </Link>
      }
    >
      {bookings.length === 0 ? (
        <p className="top-gap">Brak rezerwacji.</p>
      ) : (
        <div className="top-gap" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {bookings.map((booking) => (
            <article
              key={booking.id}
              style={{
                background: '#fff',
                border: '1px solid rgba(92, 76, 58, 0.12)',
                borderRadius: '12px',
                padding: '20px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: '999px',
                      background: `${STATUS_COLORS[booking.status]}15`,
                      color: STATUS_COLORS[booking.status],
                      fontSize: '12px',
                      fontWeight: '600',
                      marginBottom: '6px',
                    }}
                  >
                    {STATUS_LABELS[booking.status]}
                  </span>
                  <h3 style={{ margin: '4px 0', fontSize: '18px' }}>
                    {booking.serviceLabel} ({booking.servicePrice})
                  </h3>
                  <div style={{ fontSize: '14px', color: 'rgba(31, 26, 23, 0.7)' }}>
                    <strong>{booking.name}</strong> · {booking.email} · {booking.species === 'kot' ? 'Kot' : 'Pies'}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '12px', color: 'rgba(31, 26, 23, 0.5)' }}>
                  {new Date(booking.createdAt).toLocaleString('pl-PL')}
                  <br />
                  <span style={{ fontFamily: 'monospace' }}>{booking.id.substring(0, 8)}</span>
                </div>
              </div>

              <details style={{ marginTop: '12px' }}>
                <summary style={{ cursor: 'pointer', fontSize: '14px', color: '#2f7667' }}>Szczegóły</summary>
                <div style={{ paddingTop: '12px', fontSize: '14px' }}>
                  <p>
                    <strong>Preferowane terminy:</strong>
                    <br />
                    <span style={{ whiteSpace: 'pre-wrap' }}>{booking.preferredSlots}</span>
                  </p>
                  <p>
                    <strong>Opis sytuacji:</strong>
                    <br />
                    <span style={{ whiteSpace: 'pre-wrap' }}>{booking.description}</span>
                  </p>
                  {booking.confirmedDate && booking.confirmedTime && (
                    <p>
                      <strong>Potwierdzony termin:</strong> {booking.confirmedDate} {booking.confirmedTime}
                    </p>
                  )}
                  {booking.paymentLink && (
                    <p>
                      <strong>Link płatności:</strong>{' '}
                      <a href={booking.paymentLink} target="_blank" rel="noopener noreferrer">
                        {booking.paymentLink}
                      </a>
                    </p>
                  )}
                  {booking.callRoomUrl && (
                    <p>
                      <strong>Pokój rozmowy:</strong>{' '}
                      <a href={booking.callRoomUrl} target="_blank" rel="noopener noreferrer">
                        {booking.callRoomUrl}
                      </a>
                    </p>
                  )}
                  {booking.calendarUrl && (
                    <p>
                      <strong>Kalendarz:</strong>{' '}
                      <a href={booking.calendarUrl} target="_blank" rel="noopener noreferrer">
                        Otwórz w Google Calendar
                      </a>
                    </p>
                  )}
                </div>
              </details>

              <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                <Link
                  href={`/admin/lead-bookings/${booking.id}`}
                  style={{
                    padding: '8px 16px',
                    background: '#2f7667',
                    color: '#fff',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontSize: '14px',
                    fontWeight: '500',
                  }}
                >
                  Zarządzaj →
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </AdminPageShell>
  )
}
