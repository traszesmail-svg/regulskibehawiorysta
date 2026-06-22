'use client'

import { useDeferredValue, useState } from 'react'
import { AdminBookingActions } from '@/components/AdminBookingActions'
import {
  formatDateLabel,
  formatDateTimeLabel,
  getBookingStatusLabel,
  getPaymentStatusLabel,
  getProblemLabel,
} from '@/lib/data'
import { formatPreparationFileSize, hasPreparationMaterials } from '@/lib/preparation'
import type { BookingRecord, PaymentMethod } from '@/lib/types'

type BookingFilter = 'all' | 'manual_review' | 'paid' | 'unpaid' | 'closed' | 'qa'

type AdminBookingListProps = {
  bookings: BookingRecord[]
  enableFilters?: boolean
}

const bookingFilters: Array<{ value: BookingFilter; label: string }> = [
  { value: 'all', label: 'Wszystkie' },
  { value: 'manual_review', label: 'Do potwierdzenia' },
  { value: 'paid', label: 'Opłacone' },
  { value: 'unpaid', label: 'Nieopłacone' },
  { value: 'closed', label: 'Zamknięte' },
  { value: 'qa', label: 'QA' },
]

function getPaymentMethodLabel(value: PaymentMethod | string | null | undefined) {
  switch (value) {
    case 'manual':
      return 'BLIK do potwierdzenia'
    case 'payu':
      return 'PayU'
    case 'stripe':
      return 'Stripe legacy'
    case 'mock':
      return 'Mock QA'
    case 'promo':
      return 'Kod promocyjny'
    default:
      return 'Jeszcze nie wybrano'
  }
}

function formatCreatedAtLabel(value: string | null | undefined) {
  if (!value) {
    return 'brak daty'
  }

  return `${formatDateLabel(value.slice(0, 10))}, ${value.slice(11, 16)}`
}

function getPaymentStatusClass(booking: BookingRecord) {
  if (booking.paymentStatus === 'paid') {
    return 'status-paid'
  }

  if (booking.paymentStatus === 'failed' || booking.paymentStatus === 'rejected' || booking.paymentStatus === 'refunded') {
    return 'status-done'
  }

  return 'status-pending'
}

function getBookingStatusClass(booking: BookingRecord) {
  if (booking.bookingStatus === 'done') {
    return 'status-done'
  }

  if (booking.bookingStatus === 'confirmed') {
    return 'status-paid'
  }

  return 'status-pending'
}

function bookingMatchesFilter(booking: BookingRecord, filter: BookingFilter) {
  switch (filter) {
    case 'manual_review':
      return booking.paymentStatus === 'pending_manual_review'
    case 'paid':
      return booking.paymentStatus === 'paid'
    case 'unpaid':
      return booking.paymentStatus === 'unpaid'
    case 'closed':
      return (
        booking.bookingStatus === 'done' ||
        booking.bookingStatus === 'cancelled' ||
        booking.bookingStatus === 'expired' ||
        booking.paymentStatus === 'failed' ||
        booking.paymentStatus === 'rejected' ||
        booking.paymentStatus === 'refunded'
      )
    case 'qa':
      return Boolean(booking.qaBooking)
    default:
      return true
  }
}

function getBookingHaystack(booking: BookingRecord) {
  return [
    booking.id,
    booking.ownerName,
    booking.email,
    booking.phone,
    booking.animalType,
    booking.petAge,
    booking.durationNotes,
    booking.description,
    getProblemLabel(booking.problemType),
    getBookingStatusLabel(booking.bookingStatus),
    getPaymentStatusLabel(booking.paymentStatus),
    getPaymentMethodLabel(booking.paymentMethod),
    booking.paymentReference,
    booking.payuOrderId,
    booking.meetingUrl,
    booking.prepLinkUrl,
    booking.prepNotes,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function csvEscape(value: string | number | boolean | null | undefined) {
  const normalized = value == null ? '' : String(value)
  return `"${normalized.replaceAll('"', '""')}"`
}

function buildBookingsCsv(bookings: BookingRecord[]) {
  const header = [
    'ID',
    'Problem',
    'Termin',
    'Imie',
    'Email',
    'Telefon',
    'Zwierze',
    'Status bookingu',
    'Status platnosci',
    'Metoda platnosci',
    'Payment reference',
    'PayU order ID',
    'Meeting URL',
    'Prep link',
    'Prep notes',
  ]

  const rows = bookings.map((booking) =>
    [
      booking.id,
      getProblemLabel(booking.problemType),
      formatDateTimeLabel(booking.bookingDate, booking.bookingTime),
      booking.ownerName,
      booking.email,
      booking.phone,
      booking.animalType,
      getBookingStatusLabel(booking.bookingStatus),
      getPaymentStatusLabel(booking.paymentStatus),
      getPaymentMethodLabel(booking.paymentMethod),
      booking.paymentReference,
      booking.payuOrderId,
      booking.meetingUrl,
      booking.prepLinkUrl,
      booking.prepNotes,
    ]
      .map(csvEscape)
      .join(','),
  )

  return [header.map(csvEscape).join(','), ...rows].join('\r\n')
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function AdminBookingList({ bookings, enableFilters = true }: AdminBookingListProps) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<BookingFilter>('all')
  const deferredQuery = useDeferredValue(query)
  const normalizedQuery = deferredQuery.trim().toLowerCase()
  const showFilters = enableFilters && bookings.length > 1
  const filteredBookings = bookings.filter((booking) => {
    if (!bookingMatchesFilter(booking, filter)) {
      return false
    }

    return normalizedQuery ? getBookingHaystack(booking).includes(normalizedQuery) : true
  })

  function handleExportCsv() {
    downloadCsv(`admin-bookings-${filter}.csv`, buildBookingsCsv(filteredBookings))
  }

  return (
    <div className="admin-booking-list-shell">
      {showFilters ? (
        <div className="admin-booking-filters" aria-label="Filtry rezerwacji">
          <label className="admin-filter-field">
            <span>Szukaj</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Mail, imię, ID, opis..."
            />
          </label>
          <label className="admin-filter-field admin-filter-field-compact">
            <span>Status</span>
            <select value={filter} onChange={(event) => setFilter(event.target.value as BookingFilter)}>
              {bookingFilters.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <div className="admin-filter-result">
            <strong>{filteredBookings.length}</strong>
            <span>z {bookings.length}</span>
          </div>
          {query || filter !== 'all' ? (
            <button
              type="button"
              className="button button-ghost small-button"
              onClick={() => {
                setQuery('')
                setFilter('all')
              }}
            >
              Wyczyść
            </button>
          ) : null}
          <button
            type="button"
            className="button button-ghost small-button"
            onClick={handleExportCsv}
            disabled={filteredBookings.length === 0}
          >
            Eksport CSV
          </button>
        </div>
      ) : null}

      {filteredBookings.length === 0 ? (
        <div className="empty-box">Brak rezerwacji dla wybranych filtrów.</div>
      ) : (
        <div className="booking-list admin-booking-list">
          {filteredBookings.map((booking) => (
            <article
              key={booking.id}
              className="booking-row admin-booking-row admin-booking-row-compact"
              data-booking-id={booking.id}
              data-booking-email={booking.email}
              data-booking-status={booking.bookingStatus}
              data-payment-status={booking.paymentStatus}
              data-booking-qa={booking.qaBooking ? 'true' : 'false'}
            >
              <div className="admin-booking-main">
                <div className="booking-title">{getProblemLabel(booking.problemType)}</div>
                <div className="booking-meta">{formatDateTimeLabel(booking.bookingDate, booking.bookingTime)}</div>
                <div className="booking-meta">
                  {booking.ownerName} · {booking.email} · {booking.animalType}
                </div>
                <div className="admin-booking-chip-row">
                  <span className="admin-booking-chip">{booking.phone || 'brak telefonu'}</span>
                  {booking.qaBooking ? <span className="admin-booking-chip admin-booking-chip-warn">QA</span> : null}
                  {hasPreparationMaterials(booking) ? <span className="admin-booking-chip">materiały</span> : null}
                </div>
              </div>

              <div className="admin-booking-state">
                <div className="admin-booking-status-row">
                  <span className={`status-pill ${getBookingStatusClass(booking)}`}>
                    {getBookingStatusLabel(booking.bookingStatus)}
                  </span>
                  <span className={`status-pill ${getPaymentStatusClass(booking)}`}>
                    {getPaymentStatusLabel(booking.paymentStatus)}
                  </span>
                </div>

                <details className="admin-row-details">
                  <summary>Szczegóły</summary>
                  <div className="admin-row-details-body">
                    <div>
                      <strong>Opis</strong>
                      <span>{booking.description || 'Brak opisu.'}</span>
                    </div>
                    <div>
                      <strong>Utworzono</strong>
                      <span>{formatCreatedAtLabel(booking.createdAt)}</span>
                    </div>
                    <div>
                      <strong>Metoda płatności</strong>
                      <span>{getPaymentMethodLabel(booking.paymentMethod)}</span>
                    </div>
                    {booking.paymentReference ? (
                      <div>
                        <strong>Tytuł / ID płatności</strong>
                        <span>{booking.paymentReference}</span>
                      </div>
                    ) : null}
                    {booking.payuOrderId ? (
                      <div>
                        <strong>PayU orderId</strong>
                        <span>{booking.payuOrderId}</span>
                      </div>
                    ) : null}
                    {booking.paymentRejectedReason ? (
                      <div>
                        <strong>Powód odrzucenia</strong>
                        <span>{booking.paymentRejectedReason}</span>
                      </div>
                    ) : null}
                    <div>
                      <strong>Materiały</strong>
                      <span>
                        {hasPreparationMaterials(booking)
                          ? 'Dodano materiały przygotowawcze.'
                          : 'Bez dodatkowych materiałów.'}
                      </span>
                    </div>
                    {booking.prepVideoPath ? (
                      <div>
                        <strong>Nagranie</strong>
                        <a href={`/api/bookings/${booking.id}/prep/video`} target="_blank" rel="noopener noreferrer" className="prep-inline-link">
                          {booking.prepVideoFilename ?? 'Otwórz nagranie'}
                          {booking.prepVideoSizeBytes ? ` (${formatPreparationFileSize(booking.prepVideoSizeBytes)})` : ''}
                        </a>
                      </div>
                    ) : null}
                    {booking.prepLinkUrl ? (
                      <div>
                        <strong>Link</strong>
                        <a href={booking.prepLinkUrl} target="_blank" rel="noopener noreferrer" className="prep-inline-link">
                          {booking.prepLinkUrl}
                        </a>
                      </div>
                    ) : null}
                    {booking.prepNotes ? (
                      <div>
                        <strong>Notatki</strong>
                        <span>{booking.prepNotes}</span>
                      </div>
                    ) : null}
                  </div>
                </details>
              </div>

              <AdminBookingActions
                bookingId={booking.id}
                bookingStatus={booking.bookingStatus}
                paymentStatus={booking.paymentStatus}
                meetingUrl={booking.meetingUrl}
                qaBooking={Boolean(booking.qaBooking)}
              />
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
