import Link from 'next/link'
import { notFound } from 'next/navigation'
import { unstable_noStore as noStore } from 'next/cache'
import { Header } from '@/components/Header'
import { LeadBookingActions } from '@/components/LeadBookingActions'
import { getLeadBookingById } from '@/lib/server/lead-bookings'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const STATUS_LABELS: Record<string, string> = {
  pending: 'Oczekuje na potwierdzenie terminu',
  awaiting_payment: 'Czeka na płatność',
  paid: 'Opłacona',
  cancelled: 'Anulowana',
}

export default async function AdminLeadBookingDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  noStore()
  const booking = await getLeadBookingById(params.id)

  if (!booking) notFound()

  return (
    <>
      <Header />
      <main className="container" style={{ maxWidth: '900px', padding: '32px 20px' }}>
        <div style={{ marginBottom: '20px' }}>
          <Link href="/admin/lead-bookings" style={{ color: '#2f7667' }}>
            ← Wszystkie rezerwację
          </Link>
        </div>

        <article
          style={{
            background: '#fff',
            border: '1px solid rgba(92, 76, 58, 0.12)',
            borderRadius: '12px',
            padding: '24px',
          }}
        >
          <h1 style={{ fontSize: '24px', margin: '0 0 8px 0' }}>
            {booking.serviceLabel} ({booking.servicePrice})
          </h1>
          <p style={{ color: 'rgba(31, 26, 23, 0.6)', fontSize: '14px', margin: 0 }}>
            Status: <strong>{STATUS_LABELS[booking.status]}</strong>
          </p>

          <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid rgba(92, 76, 58, 0.1)' }} />

          <h2 style={{ fontSize: '18px', marginTop: 0 }}>Klient</h2>
          <dl style={{ fontSize: '15px', lineHeight: 1.8, margin: '0 0 24px 0' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <dt style={{ minWidth: '160px', color: 'rgba(31, 26, 23, 0.6)' }}>Imię:</dt>
              <dd style={{ margin: 0 }}>
                <strong>{booking.name}</strong>
              </dd>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <dt style={{ minWidth: '160px', color: 'rgba(31, 26, 23, 0.6)' }}>E-mail:</dt>
              <dd style={{ margin: 0 }}>
                <a href={`mailto:${booking.email}`} style={{ color: '#2f7667' }}>
                  {booking.email}
                </a>
              </dd>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <dt style={{ minWidth: '160px', color: 'rgba(31, 26, 23, 0.6)' }}>Gatunek:</dt>
              <dd style={{ margin: 0 }}>{booking.species === 'kot' ? 'Kot' : 'Pies'}</dd>
            </div>
          </dl>

          <h3 style={{ fontSize: '15px', marginBottom: '8px' }}>Preferowane terminy:</h3>
          <p
            style={{
              fontSize: '14px',
              whiteSpace: 'pre-wrap',
              background: 'rgba(245, 241, 234, 0.6)',
              padding: '12px',
              borderRadius: '8px',
              margin: '0 0 16px 0',
            }}
          >
            {booking.preferredSlots}
          </p>

          <h3 style={{ fontSize: '15px', marginBottom: '8px' }}>Opis sytuacji:</h3>
          <p
            style={{
              fontSize: '14px',
              whiteSpace: 'pre-wrap',
              background: 'rgba(245, 241, 234, 0.6)',
              padding: '12px',
              borderRadius: '8px',
              margin: '0 0 24px 0',
            }}
          >
            {booking.description}
          </p>

          <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid rgba(92, 76, 58, 0.1)' }} />

          <h2 style={{ fontSize: '18px' }}>Akcje</h2>
          <LeadBookingActions booking={booking} />

          <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid rgba(92, 76, 58, 0.1)' }} />

          <p style={{ fontSize: '13px', color: 'rgba(31, 26, 23, 0.5)' }}>
            ID: <code>{booking.id}</code>
            <br />
            Token klienta: <code>{booking.accessToken}</code>
            <br />
            Utworzono: {new Date(booking.createdAt).toLocaleString('pl-PL')} | Zaktualizowano:{' '}
            {new Date(booking.updatedAt).toLocaleString('pl-PL')}
          </p>
        </article>
      </main>
    </>
  )
}
