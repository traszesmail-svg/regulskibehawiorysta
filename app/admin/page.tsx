import Link from 'next/link'
import { unstable_noStore as noStore } from 'next/cache'
import { AdminAvailabilityManager } from '@/components/AdminAvailabilityManager'
import { AdminBookingList } from '@/components/AdminBookingList'
import { AdminLazyDetails } from '@/components/AdminLazyDetails'
import { AdminPricingManager } from '@/components/AdminPricingManager'
import { AdminUrgentRequestActions } from '@/components/AdminUrgentRequestActions'
import { BookingReminderOptIn } from '@/components/BookingReminderOptIn'
import { getBuildMarkerSnapshot } from '@/lib/build-marker'
import { UNPAID_BOOKING_EXPIRY_HOURS, isUnpaidBookingExpired } from '@/lib/booking-expiry'
import {
  compareDateAndTime,
  formatDateLabel,
  getWarsawNowBoundary,
} from '@/lib/data'
import { listAllOrders } from '@/lib/server/materialy-storage'
import { buildFunnelMetricsSnapshot } from '@/lib/server/funnel-metrics'
import { getActiveConsultationPrice, listAvailabilityAdmin, listBookings, listFunnelEvents, listUrgentNowRequests } from '@/lib/server/db'
import { getRuntimeModeSnapshot } from '@/lib/server/env'
import { getGoLiveChecks } from '@/lib/server/go-live'
import { getPaymentOptionsSummary } from '@/lib/server/payment-options'
import { listPromoCampaigns } from '@/lib/server/promo-codes'
import { readLatestQaReport } from '@/lib/server/qa-report'
import { listPendingTestimonials } from '@/lib/server/testimonial-store'
import { createAdminPushToken } from '@/lib/server/admin-push-token'
import { parseUrgentRequestedSlotsFromMessage, stripUrgentRequestedSlotsFromMessage } from '@/lib/urgent-now'
import { listAccountRoomsForAdmin } from '@/lib/server/account-store'
import type { BookingRecord } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function formatDataLoadError(label: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return `${label}: ${message}`
}

function isPastBooking(booking: BookingRecord, now = new Date()) {
  const boundary = getWarsawNowBoundary(now)

  return compareDateAndTime(booking.bookingDate, booking.bookingTime, boundary.date, boundary.time) < 0
}

function sortByBookingTimeAsc(left: BookingRecord, right: BookingRecord) {
  const bySlot = compareDateAndTime(left.bookingDate, left.bookingTime, right.bookingDate, right.bookingTime)

  return bySlot === 0 ? right.createdAt.localeCompare(left.createdAt) : bySlot
}

function sortByBookingTimeDesc(left: BookingRecord, right: BookingRecord) {
  return sortByBookingTimeAsc(right, left)
}

function createAdminBookingGroups(bookings: BookingRecord[], now = new Date()) {
  const needsAction: BookingRecord[] = []
  const upcoming: BookingRecord[] = []
  const unpaidFresh: BookingRecord[] = []
  const archive: BookingRecord[] = []
  const qa: BookingRecord[] = []

  for (const booking of bookings) {
    const staleUnpaid = isUnpaidBookingExpired(booking, now)

    if (booking.qaBooking) {
      qa.push(booking)
      continue
    }

    if (
      staleUnpaid ||
      booking.bookingStatus === 'done' ||
      booking.bookingStatus === 'cancelled' ||
      booking.bookingStatus === 'expired' ||
      booking.paymentStatus === 'failed' ||
      booking.paymentStatus === 'rejected' ||
      booking.paymentStatus === 'refunded' ||
      (booking.paymentStatus === 'paid' && isPastBooking(booking, now))
    ) {
      archive.push(booking)
      continue
    }

    if (booking.paymentStatus === 'pending_manual_review') {
      needsAction.push(booking)
      continue
    }

    if (booking.paymentStatus === 'paid') {
      upcoming.push(booking)
      continue
    }

    unpaidFresh.push(booking)
  }

  return {
    needsAction: needsAction.sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    upcoming: upcoming.sort(sortByBookingTimeAsc),
    unpaidFresh: unpaidFresh.sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    archive: archive.sort(sortByBookingTimeDesc),
    qa: qa.sort(sortByBookingTimeDesc),
  }
}

const adminNavItems = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/lead-bookings', label: 'Leady' },
  { href: '/admin/materialy', label: 'Materiały' },
  { href: '/admin/promocje', label: 'Kody' },
  { href: '/admin/pokoj', label: 'Pokoje' },
  { href: '#inbox', label: 'Inbox' },
  { href: '#terminy', label: 'Terminy' },
  { href: '#system', label: 'System' },
]

function AdminTopbar() {
  return (
    <header className="admin-topbar" aria-label="Nawigacja panelu admina">
      <Link href="/admin" className="admin-topbar-brand">
        <span>RBH Admin</span>
        <small>rezerwacje i operacje</small>
      </Link>
      <nav className="admin-topbar-nav" aria-label="Sekcje panelu">
        {adminNavItems.map((item) => (
          <Link key={item.href} href={item.href} className="admin-topbar-link">
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}

function AdminBookingSection({
  title,
  eyebrow,
  description,
  emptyLabel,
  bookings,
}: {
  title: string
  eyebrow: string
  description?: string
  emptyLabel: string
  bookings: BookingRecord[]
}) {
  return (
    <div className="admin-operational-section top-gap" data-admin-booking-section={eyebrow}>
      <div className="section-eyebrow">{eyebrow}</div>
      <h2>{title}</h2>
      {description ? <p className="muted paragraph-gap">{description}</p> : null}
      {bookings.length === 0 ? <div className="empty-box">{emptyLabel}</div> : <AdminBookingList bookings={bookings} />}
    </div>
  )
}

export default async function AdminPage() {
  noStore()
  const runtime = getRuntimeModeSnapshot()
  const paymentOptions = getPaymentOptionsSummary()
  const goLiveChecks = getGoLiveChecks()
  const buildMarker = getBuildMarkerSnapshot()
  const latestQaReport = await readLatestQaReport()
  let urgentRequests: Awaited<ReturnType<typeof listUrgentNowRequests>> = []
  let bookings: Awaited<ReturnType<typeof listBookings>> = []
  let availability: Awaited<ReturnType<typeof listAvailabilityAdmin>> = []
  let funnelEvents: Awaited<ReturnType<typeof listFunnelEvents>> = []
  let price: Awaited<ReturnType<typeof getActiveConsultationPrice>> | null = null
  let rooms: Awaited<ReturnType<typeof listAccountRoomsForAdmin>> = []
  let materialOrders: Awaited<ReturnType<typeof listAllOrders>> = []
  let testimonials: Awaited<ReturnType<typeof listPendingTestimonials>> = []
  let promoCampaigns: Awaited<ReturnType<typeof listPromoCampaigns>> = []
  let funnelMetricsSnapshot: ReturnType<typeof buildFunnelMetricsSnapshot> | null = null
  const dataLoadErrors: string[] = []

  if (runtime.data.isValid) {
    const [
      bookingsResult,
      availabilityResult,
      funnelEventsResult,
      priceResult,
      urgentRequestsResult,
      roomsResult,
      materialOrdersResult,
      testimonialsResult,
      promoCampaignsResult,
    ] = await Promise.allSettled([
      listBookings(),
      listAvailabilityAdmin(),
      listFunnelEvents(),
      getActiveConsultationPrice(),
      listUrgentNowRequests(),
      listAccountRoomsForAdmin(),
      listAllOrders(),
      listPendingTestimonials(),
      listPromoCampaigns(),
    ])

    if (bookingsResult.status === 'fulfilled') {
      bookings = bookingsResult.value
    } else {
      dataLoadErrors.push(formatDataLoadError('bookings', bookingsResult.reason))
    }

    if (availabilityResult.status === 'fulfilled') {
      availability = availabilityResult.value
    } else {
      dataLoadErrors.push(formatDataLoadError('availability', availabilityResult.reason))
    }

    if (funnelEventsResult.status === 'fulfilled') {
      funnelEvents = funnelEventsResult.value
    } else {
      dataLoadErrors.push(formatDataLoadError('funnel_events', funnelEventsResult.reason))
    }

    if (priceResult.status === 'fulfilled') {
      price = priceResult.value
    } else {
      dataLoadErrors.push(formatDataLoadError('pricing', priceResult.reason))
    }

    if (urgentRequestsResult.status === 'fulfilled') {
      urgentRequests = urgentRequestsResult.value
    } else {
      dataLoadErrors.push(formatDataLoadError('urgent_now_requests', urgentRequestsResult.reason))
    }

    if (roomsResult.status === 'fulfilled') {
      rooms = roomsResult.value
    } else {
      dataLoadErrors.push(formatDataLoadError('account_rooms', roomsResult.reason))
    }

    if (materialOrdersResult.status === 'fulfilled') {
      materialOrders = materialOrdersResult.value
    } else {
      dataLoadErrors.push(formatDataLoadError('material_orders', materialOrdersResult.reason))
    }

    if (testimonialsResult.status === 'fulfilled') {
      testimonials = testimonialsResult.value
    } else {
      dataLoadErrors.push(formatDataLoadError('testimonials', testimonialsResult.reason))
    }

    if (promoCampaignsResult.status === 'fulfilled') {
      promoCampaigns = promoCampaignsResult.value
    } else {
      dataLoadErrors.push(formatDataLoadError('promo_campaigns', promoCampaignsResult.reason))
    }

    funnelMetricsSnapshot = buildFunnelMetricsSnapshot({
      events: funnelEvents,
      bookings,
      now: new Date(),
    })
  }
  const bookingCounts =
    funnelMetricsSnapshot?.bookingCounts ?? {
      total: bookings.length,
      production: bookings.filter((booking) => !booking.qaBooking).length,
      qa: bookings.filter((booking) => booking.qaBooking).length,
      pendingManualReview: bookings.filter((booking) => booking.paymentStatus === 'pending_manual_review').length,
      paid: bookings.filter((booking) => booking.paymentStatus === 'paid').length,
      confirmed: bookings.filter((booking) => booking.bookingStatus === 'confirmed' || booking.bookingStatus === 'done').length,
      rejected: bookings.filter(
        (booking) =>
          booking.paymentStatus === 'rejected' ||
          booking.bookingStatus === 'cancelled' ||
          booking.paymentStatus === 'refunded',
      ).length,
      failed: bookings.filter((booking) => booking.paymentStatus === 'failed').length,
    }
  const pendingUrgentCount = urgentRequests.filter((request) => request.status === 'new').length
  const openConversationCount = rooms.reduce(
    (total, room) => total + room.conversations.filter((conversation) => conversation.status === 'open').length,
    0,
  )
  const pendingMaterialOrdersCount = materialOrders.filter((order) => order.status === 'pending').length
  const pendingTestimonialsCount = testimonials.filter((testimonial) => testimonial.status === 'pending').length
  const activePromoCampaignCount = promoCampaigns.filter((campaign) => campaign.activeCount > 0).length
  const goLiveReadyCount = goLiveChecks.filter((check) => check.tone === 'ready').length
  const goLiveAttentionCount = goLiveChecks.length - goLiveReadyCount
  const priceUpdatedAtLabel = price?.updatedAt
    ? `${formatDateLabel(price.updatedAt.slice(0, 10))}, ${price.updatedAt.slice(11, 16)}`
    : null
  const pushPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || null
  const adminPushToken = createAdminPushToken()
  const bookingGroups = createAdminBookingGroups(bookings)
  const dataLoadIssue =
    dataLoadErrors.length > 0
      ? `Nie wszystkie dane panelu mogły się załadować: ${dataLoadErrors.join(' | ')}`
      : null
  const inboxCards = [
    {
      href: '#terminy',
      label: 'Do potwierdzenia',
      value: bookingCounts.pendingManualReview,
      note: 'Wpłaty BLIK i manual review',
    },
    {
      href: '#terminy',
      label: 'Pilne zgłoszenia',
      value: pendingUrgentCount,
      note: 'Kwadrans na już do odpowiedzi',
    },
    {
      href: '/admin/pokoj',
      label: 'Otwartych rozmów',
      value: openConversationCount,
      note: 'Pokoje opiekunów z aktywną rozmową',
    },
    {
      href: '/admin/materialy',
      label: 'Zamówień PDF',
      value: pendingMaterialOrdersCount,
      note: 'Zamówienia czekające na potwierdzenie',
    },
    {
      href: '/admin/opinie',
      label: 'Opinii do decyzji',
      value: pendingTestimonialsCount,
      note: 'Opinie oczekujące na publikację',
    },
    {
      href: '/admin/promocje',
      label: 'Aktywnych kampanii',
      value: activePromoCampaignCount,
      note: 'Pule kodów promocyjnych',
    },
  ]

  return (
    <main className="page-wrap" data-analytics-disabled="true">
      <div className="container">
        <AdminTopbar />

        <section className="panel section-panel">
          <div className="section-head">
            <div>
              <div className="section-eyebrow">Panel specjalisty</div>
              <h1>Rezerwacje, płatności i terminy</h1>
            </div>
            <div className="hero-actions">
              <Link href="/admin/promocje" className="button button-ghost">
                Kody dla lecznic
              </Link>
              <Link href="/admin/pokoj" className="button button-ghost">
                Pokoje opiekunów
              </Link>
              <Link href="/book" className="button button-primary">
              Przejdź do ścieżki klienta
              </Link>
            </div>
          </div>

          <div className="summary-grid top-gap">
            <div className="summary-card">
              <div className="stat-label">Do potwierdzenia</div>
              <div className="summary-value">{bookingGroups.needsAction.length}</div>
            </div>
            <div className="summary-card">
              <div className="stat-label">Najbliższe rozmowy</div>
              <div className="summary-value">{bookingGroups.upcoming.length}</div>
            </div>
            <div className="summary-card">
              <div className="stat-label">Nieopłacone poniżej 24h</div>
              <div className="summary-value">{bookingGroups.unpaidFresh.length}</div>
            </div>
            <div className="summary-card">
              <div className="stat-label">Archiwum</div>
              <div className="summary-value">{bookingGroups.archive.length}</div>
            </div>
            <div className="summary-card">
              <div className="stat-label">Testowe QA</div>
              <div className="summary-value">{bookingGroups.qa.length}</div>
            </div>
            <div className="summary-card">
              <div className="stat-label">Pilne prośby</div>
              <div className="summary-value">{urgentRequests.length}</div>
            </div>
          </div>

          {dataLoadIssue ? <div className="error-box top-gap">{dataLoadIssue}</div> : null}

          {pushPublicKey && adminPushToken ? (
            <BookingReminderOptIn
              role="owner"
              publicKey={pushPublicKey}
              ownerToken={adminPushToken}
              targetUrl="/admin"
              className="top-gap"
            />
          ) : null}

          <section className="panel section-panel top-gap" id="inbox">
            <div className="section-head">
              <div>
                <div className="section-eyebrow">Inbox operacyjny</div>
                <h2>Zadania do przejrzenia</h2>
              </div>
              <span className={`status-pill ${dataLoadErrors.length === 0 ? 'status-paid' : 'status-pending'}`}>
                {dataLoadErrors.length === 0 ? 'Brak błędów danych' : `${dataLoadErrors.length} błędów danych`}
              </span>
            </div>

            {dataLoadIssue ? <div className="error-box top-gap">{dataLoadIssue}</div> : null}

            <div className="summary-grid top-gap">
              {inboxCards.map((card) => (
                <Link key={card.label} href={card.href} className="summary-card">
                  <div className="stat-label">{card.label}</div>
                  <div className="summary-value">{card.value}</div>
                  <div className="admin-price-meta">{card.note}</div>
                </Link>
              ))}
            </div>

            <div className="list-card top-gap">
              <strong>QA i deploy</strong>
              <span>
                {latestQaReport.exists
                  ? latestQaReport.updatedAt
                    ? `Ostatni raport QA: ${formatDateLabel(latestQaReport.updatedAt.slice(0, 10))}, ${latestQaReport.updatedAt.slice(11, 16)}.`
                    : 'Raport QA istnieje, ale nie ma daty aktualizacji.'
                  : 'Brak zapisanego raportu QA.'}{' '}
                <Link href="/__internal/qa-report" prefetch={false}>
                  Otwórz raport
                </Link>
              </span>
            </div>
          </section>

          <AdminBookingSection
            eyebrow="Wpłaty"
            title="Do potwierdzenia wpłaty"
            description="Tu zostają tylko rezerwacje, przy których klient zgłosił BLIK lub wpłatę i trzeba kliknąć potwierdzenie albo odrzucenie."
            emptyLabel="Brak wpłat czekających na decyzję."
            bookings={bookingGroups.needsAction}
          />

          <AdminBookingSection
            eyebrow="Najbliższe"
            title="Najbliższe rozmowy"
            description="Opłacone i przyszłe konsultacje. Stare oraz zakończone wpisy są niżej w archiwum."
            emptyLabel="Brak nadchodzących opłaconych rozmów."
            bookings={bookingGroups.upcoming}
          />

          <AdminBookingSection
            eyebrow="Rezerwacja"
            title={`Nieopłacone rezerwacje do ${UNPAID_BOOKING_EXPIRY_HOURS}h`}
            description="Po 24 godzinach nieopłacone rezerwacje wygasają i schodzą z głównego widoku."
            emptyLabel="Brak świeżych nieopłaconych rezerwacji."
            bookings={bookingGroups.unpaidFresh}
          />

          <AdminLazyDetails
            className="admin-disclosure top-gap"
            dataAttribute="data-admin-booking-archive"
            summary={`Archiwum (${bookingGroups.archive.length})`}
            contentClassName="top-gap-small"
          >
            {bookingGroups.archive.length === 0 ? (
              <div className="empty-box">Archiwum jest puste.</div>
            ) : (
              <AdminBookingList bookings={bookingGroups.archive.slice(0, 80)} />
            )}
          </AdminLazyDetails>

          <AdminLazyDetails
            className="admin-disclosure top-gap"
            dataAttribute="data-admin-booking-qa"
            summary={`Testowe QA (${bookingGroups.qa.length})`}
            contentClassName="top-gap-small"
          >
            {bookingGroups.qa.length === 0 ? (
              <div className="empty-box">Brak bookingów testowych.</div>
            ) : (
              <AdminBookingList bookings={bookingGroups.qa.slice(0, 80)} />
            )}
          </AdminLazyDetails>

          <div className="top-gap">
            <div className="section-eyebrow">Kwadrans na już</div>
            <h2>Prośby o pilny termin</h2>
            <p className="muted paragraph-gap">
              Klient wpisuje preferowaną datę i godzinę przez formularz. Tutaj dodajesz termin do kalendarza i od razu odsyłasz mu gotowy link.
            </p>

            {urgentRequests.length === 0 ? (
              <div className="list-card tree-backed-card">Brak aktywnych próśb o Kwadrans na już.</div>
            ) : (
              <div className="booking-list">
                {urgentRequests.map((request) => {
                  const requestedSlots = parseUrgentRequestedSlotsFromMessage(request.message, {
                    date: request.requestedDate,
                    time: request.requestedTime,
                  })

                  return (
                    <div key={request.id} className="booking-row" data-urgent-request-id={request.id}>
                    <div>
                      <div className="booking-title">{request.topicLabel}</div>
                      <div className="booking-meta">
                        {request.name} - {request.email} - {request.species}
                      </div>
                        <div className="booking-meta">
                          Wybrane godziny: {requestedSlots.map((slot) => `${slot.date} ${slot.time}`).join(', ')}
                        </div>
                      <div className="booking-meta">Status: {request.status === 'responded' ? 'odpowiedziano' : 'nowa prośba'}</div>
                    </div>
                    <div className="booking-description">
                        <div>{stripUrgentRequestedSlotsFromMessage(request.message)}</div>
                      {request.proposedDate && request.proposedTime ? (
                        <div className="booking-meta top-gap-small">
                          Odeslany termin: {request.proposedDate} {request.proposedTime}
                        </div>
                      ) : null}
                      {request.bookingHref ? <div className="booking-meta">Link: {request.bookingHref}</div> : null}
                    </div>
                    <AdminUrgentRequestActions
                      requestId={request.id}
                      disabled={request.status === 'responded'}
                      requestedDate={request.requestedDate}
                      requestedTime={request.requestedTime}
                      requestedSlots={requestedSlots}
                    />
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="top-gap">
            <div className="section-eyebrow">Cena konsultacji</div>
            <h2>Aktywna cena dla nowych rezerwacji</h2>
            <p className="muted paragraph-gap">Nowa cena dotyczy tylko kolejnych bookingów. Opłacone lub zapisane wcześniej rezerwację zachowują swoją historyczną kwotę.</p>
            {runtime.data.isValid && price ? (
              <AdminPricingManager currentAmount={price.amount} currentLabel={price.formattedAmount} updatedAtLabel={priceUpdatedAtLabel} />
            ) : (
              <div className="error-box">Zmiana ceny jest zablokowana: {runtime.data.summary}</div>
            )}
          </div>

        </section>

        <section className="panel section-panel admin-system-panel" id="system">
          <div className="section-head">
            <div>
              <div className="section-eyebrow">System</div>
              <h2>Go-live, analityka i deploy</h2>
            </div>
            <span className={`status-pill ${goLiveAttentionCount === 0 ? 'status-paid' : 'status-pending'}`}>
              {goLiveReadyCount}/{goLiveChecks.length} ready
            </span>
          </div>

          <div className="summary-grid top-gap">
            <div className="summary-card tree-backed-card">
              <div className="stat-label">Tryb danych</div>
              <div className="summary-value">{runtime.data.isValid ? 'OK' : 'Blokada'}</div>
              <span>{runtime.data.summary}</span>
            </div>
            <div className="summary-card tree-backed-card">
              <div className="stat-label">Płatności live</div>
              <div className="summary-value">{runtime.payment.isValid ? 'OK' : 'Mock'}</div>
              <span>{runtime.payment.summary}</span>
              <span>{paymentOptions.summary}</span>
            </div>
            <div className="summary-card tree-backed-card">
              <div className="stat-label">Build</div>
              <div className="summary-value">{goLiveAttentionCount}</div>
              <span>Elementy wymagające uwagi</span>
              <span>Marker: {buildMarker.value}</span>
            </div>
          </div>

          <AdminLazyDetails
            className="admin-disclosure top-gap"
            summary={`Go-live (${goLiveReadyCount}/${goLiveChecks.length})`}
            contentClassName="top-gap-small"
          >
              <div className="section-eyebrow">Go-live</div>
              <h2>Stan go-live</h2>
              <p className="muted paragraph-gap">
                Te karty pokazują, czy customer email i PayU są aktywnie włączone. Gdy są celowo wyłączone, live działa na manual payment.
              </p>
              <div className="summary-grid">
                {goLiveChecks.map((check) => (
                  <div
                    key={check.id}
                    className={`list-card tree-backed-card${check.tone === 'ready' ? '' : ' accent-outline'}`}
                  >
                    <span className={`status-pill ${check.tone === 'ready' ? 'status-paid' : 'status-pending'}`}>{check.statusLabel}</span>
                    <strong>{check.label}</strong>
                    <span>Stan: {check.state}</span>
                    <span>{check.summary}</span>
                    <span>Dalej: {check.nextStep}</span>
                  </div>
                ))}
              </div>
          </AdminLazyDetails>

          <AdminLazyDetails className="admin-disclosure top-gap" summary="Analityka i rytuał deploy" contentClassName="top-gap-small">
              <div className="section-eyebrow">Analityka i operacje</div>
              <h2>First-party KPI i rytuał przed deployem</h2>
              <p className="muted paragraph-gap">
                Źródłem prawdy jest wewnętrzny ledger eventów i statusy bookingów. GA4 pozostaje opcjonalne i consent-gated.
              </p>

              {runtime.data.isValid && funnelMetricsSnapshot ? (
                <>
                  <div className="summary-grid">
                    <div className="summary-card tree-backed-card">
                      <div className="stat-label">Eventy produkcyjne</div>
                      <div className="summary-value">{funnelMetricsSnapshot.totalEvents}</div>
                      <span>QA wykluczone: {funnelMetricsSnapshot.totalQaEvents}</span>
                    </div>
                    <div className="summary-card tree-backed-card">
                      <div className="stat-label">Bookingi produkcyjne</div>
                      <div className="summary-value">{bookingCounts.production}</div>
                      <span>QA bookingi: {bookingCounts.qa}</span>
                    </div>
                    <div className="summary-card tree-backed-card">
                      <div className="stat-label">QA checkout</div>
                      <div className="summary-value">{bookingCounts.qa}</div>
                      <span>{paymentOptions.qa}</span>
                    </div>
                  </div>

                  <div className="summary-grid top-gap">
                    {funnelMetricsSnapshot.windows.map((window) => (
                      <div key={window.window} className="summary-card tree-backed-card">
                        <div className="stat-label">{window.label}</div>
                        <div className="summary-value">{window.eventCount}</div>
                        <span>
                          View {window.stageCounts.view_page} · Entry 15 min {window.stageCounts.funnel_entry_15_min} · Booking start {window.stageCounts.booking_start} · Service {window.stageCounts.booking_service_selected} · Slot {window.stageCounts.booking_slot_selected}
                        </span>
                        <span>
                          Form {window.stageCounts.booking_form_started} · Payment viewed {window.stageCounts.payment_viewed} · Payment started {window.stageCounts.payment_started} · Pending {window.stageCounts.payment_marked_pending} · Completed {window.stageCounts.payment_completed} · Confirmed {window.stageCounts.booking_confirmed} · Drop {window.stageCounts.booking_drop}
                        </span>
                        <span>
                          {window.conversions.viewToEntry15} view→entry 15 min · {window.conversions.entry15ToBookingStart} entry→booking start · {window.conversions.completedToConfirmed} completed→confirmed
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="error-box">Analityka jest zablokowana: {runtime.data.summary}</div>
              )}

              <div className="stack-gap top-gap">
                <div className="list-card tree-backed-card">
                  <strong>Ostatni raport QA</strong>
                  <span>
                    {latestQaReport.exists
                      ? `${latestQaReport.updatedAt ?? 'brak daty'} · ${latestQaReport.filePath}`
                      : 'Brak wygenerowanego raportu QA.'}
                  </span>
                </div>
                <div className="list-card tree-backed-card">
                  <strong>Rytuał przed deployem</strong>
                  <span>npm run funnel-metrics · npm run release-checklist · npm run stage9-performance-audit · npm run full-public-crawl</span>
                  <span>Wejścia wewnętrzne: /admin oraz /__internal/qa-report.</span>
                </div>
                <div className="list-card tree-backed-card">
                  <strong>Aktualny sygnał readiness</strong>
                  <span>{goLiveChecks.find((check) => check.tone === 'attention')?.summary ?? 'Wszystkie kontrole są zielone.'}</span>
                  <span>{goLiveChecks.find((check) => check.tone === 'attention')?.nextStep ?? 'Nie ma blokad przed deployem.'}</span>
                </div>
              </div>
          </AdminLazyDetails>
        </section>

        <section className="panel section-panel" id="terminy">
          <AdminLazyDetails
            className="admin-disclosure"
            dataAttribute="data-admin-availability-panel"
            summary={`Zarządzanie terminami (${availability.length})`}
            contentClassName="top-gap-small"
          >
              <div className="section-eyebrow">Zarządzanie terminami</div>
              <h2>Wolne godziny jednego specjalisty</h2>
              <p className="muted paragraph-gap">Tutaj dodajesz i usuwasz terminy. Rezerwacji w trakcie płatności albo opłaconej nie da się usunąć.</p>
              {runtime.data.isValid ? (
                <AdminAvailabilityManager slots={availability} />
              ) : (
                <div className="error-box">Zarządzanie terminami jest zablokowane: {runtime.data.summary}</div>
              )}
          </AdminLazyDetails>
        </section>
      </div>
    </main>
  )
}
