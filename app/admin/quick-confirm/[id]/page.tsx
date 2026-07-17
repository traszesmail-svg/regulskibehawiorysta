import { notFound } from 'next/navigation'
import { getLeadBookingById } from '@/lib/server/lead-bookings'
import { verifyConfirmToken } from '@/lib/admin-confirm-token'
import { QuickConfirmForm } from './QuickConfirmForm'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Parsuje pierwszy slot z tekstu "Poniedziałek 14.04 godz. 10:00; ..."
// albo z raw ID "2026-04-14-10:00"
function parseFirstSlot(preferredSlots: string): { date: string; time: string } | null {
  if (!preferredSlots) return null
  const first = preferredSlots.split(';')[0].trim()

  // Raw format: "2026-04-14-10:00"
  const rawMatch = first.match(/^(\d{4}-\d{2}-\d{2})-(\d{2}:\d{2})$/)
  if (rawMatch) return { date: rawMatch[1], time: rawMatch[2] }

  // Formatted: "Poniedziałek 14.04 godz. 10:00"
  const fmtMatch = first.match(/(\d{1,2})\.(\d{2})\s+godz\.\s+(\d{2}:\d{2})/)
  if (fmtMatch) {
    const day = fmtMatch[1].padStart(2, '0')
    const month = fmtMatch[2]
    const time = fmtMatch[3]
    const year = new Date().getFullYear()
    // Jeśli miesiąc już minął w tym roku, użyj przyszłego roku
    const candidate = new Date(`${year}-${month}-${day}`)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const finalYear = candidate < today ? year + 1 : year
    return { date: `${finalYear}-${month}-${day}`, time }
  }

  return null
}

export default async function QuickConfirmPage(
  props: {
    params: Promise<{ id: string }>
    searchParams?: Promise<Record<string, string | undefined>>
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const token = searchParams?.token ?? ''
  const valid = verifyConfirmToken(params.id, token)

  if (!valid) {
    return (
      <main style={{ maxWidth: '520px', margin: '80px auto', padding: '32px 20px', fontFamily: 'sans-serif' }}>
        <h1 style={{ color: '#8a3022' }}>Nieprawidłowy link</h1>
        <p>Link wygasł albo jest nieprawidłowy. Otwórz panel admina bezpośrednio.</p>
      </main>
    )
  }

  const booking = await getLeadBookingById(params.id)
  if (!booking) notFound()

  if (booking.status === 'paid') {
    return (
      <main style={{ maxWidth: '520px', margin: '80px auto', padding: '32px 20px', fontFamily: 'sans-serif' }}>
        <h1 style={{ color: '#2f7667' }}>✓ Już potwierdzone</h1>
        <p>Ta rezerwacja jest już oznaczona jako opłacona.</p>
        <p><strong>{booking.name}</strong> — {booking.serviceLabel}</p>
        {booking.confirmedDate && <p>Termin: {booking.confirmedDate} {booking.confirmedTime}</p>}
      </main>
    )
  }

  if (booking.status === 'cancelled') {
    return (
      <main style={{ maxWidth: '520px', margin: '80px auto', padding: '32px 20px', fontFamily: 'sans-serif' }}>
        <h1 style={{ color: '#8a3022' }}>Rezerwacja anulowana</h1>
        <p>Ta rezerwacja została wcześniej anulowana.</p>
      </main>
    )
  }

  // Pre-filluj datę: najpierw z confirmedDate (jeśli admin już ustawił), potem z wyboru klienta
  const parsedSlot = parseFirstSlot(booking.preferredSlots ?? '')
  const defaultDate = booking.confirmedDate ?? parsedSlot?.date ?? ''
  const defaultTime = booking.confirmedTime ?? parsedSlot?.time ?? ''
  const slotWasParsed = !booking.confirmedDate && Boolean(parsedSlot)

  return (
    <main style={{ maxWidth: '520px', margin: '80px auto', padding: '32px 20px', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '22px', marginBottom: '4px' }}>Potwierdź płatność</h1>
      <p style={{ color: '#666', marginTop: 0, marginBottom: '24px' }}>
        {booking.name} · {booking.serviceLabel} ({booking.servicePrice})
      </p>

      <div style={{ background: '#f5f1ea', borderRadius: '10px', padding: '14px 16px', marginBottom: '24px', fontSize: '14px' }}>
        <strong>Termin wybrany przez klienta:</strong>
        <div style={{ marginTop: '6px', fontWeight: 600 }}>{booking.preferredSlots}</div>
      </div>

      <QuickConfirmForm
        bookingId={booking.id}
        token={token}
        defaultDate={defaultDate}
        defaultTime={defaultTime}
        slotWasParsed={slotWasParsed}
      />
    </main>
  )
}
