'use client'

import { useDeferredValue, useMemo, useState, useTransition } from 'react'
import type { MaterialyOrder } from '@/lib/server/materialy-storage'

type Props = {
  initialOrders: MaterialyOrder[]
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' })
}

function statusLabel(status: MaterialyOrder['status']): string {
  switch (status) {
    case 'pending':
      return 'Oczekuje wpłaty'
    case 'paid':
      return 'Opłacone — kod wysłany'
    case 'used':
      return 'Wykorzystane (3/3)'
    case 'cancelled':
      return 'Anulowane'
  }
}

function csvEscape(value: string | number | boolean | null | undefined) {
  const normalized = value == null ? '' : String(value)
  return `"${normalized.replaceAll('"', '""')}"`
}

function getOrderSearchHaystack(order: MaterialyOrder) {
  return [
    order.id,
    order.customerName,
    order.customerEmail,
    order.customerPhone,
    order.productKind,
    order.productSlug,
    order.code,
    order.priceLabel,
    order.notes,
    statusLabel(order.status),
    formatDate(order.createdAt),
    formatDate(order.paidAt),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function buildOrdersCsv(orders: MaterialyOrder[]) {
  const header = [
    'ID',
    'Status',
    'Cena',
    'Utworzono',
    'Opłacono',
    'Wykorzystania',
    'Imię',
    'E-mail',
    'Telefon',
    'Typ',
    'Produkt',
    'Kod',
    'Notatki',
  ]

  const rows = orders.map((order) =>
    [
      order.id,
      statusLabel(order.status),
      order.priceLabel,
      order.createdAt,
      order.paidAt,
      order.usedCount,
      order.customerName,
      order.customerEmail,
      order.customerPhone ?? '',
      order.productKind,
      order.productSlug,
      order.code ?? '',
      order.notes ?? '',
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

export function AdminMaterialyOrders({ initialOrders }: Props) {
  const [orders, setOrders] = useState<MaterialyOrder[]>(initialOrders)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query.trim().toLowerCase())
  const [, startTransition] = useTransition()

  async function refresh() {
    setError(null)

    try {
      const res = await fetch('/api/admin/materialy/list', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { orders: MaterialyOrder[] }
      setOrders(data.orders)
    } catch (e) {
      setError(`Nie udało się odświeżyć listy: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  function handleRefresh() {
    startTransition(() => {
      void refresh()
    })
  }

  async function confirm(orderId: string) {
    if (busyId) return
    if (!window.confirm(`Potwierdzić wpłatę dla ${orderId}? Klient dostanie kod mailem.`)) return

    setBusyId(orderId)
    setError(null)

    try {
      const res = await fetch('/api/admin/materialy/confirm', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderId }),
      })
      const data = (await res.json()) as Record<string, unknown>
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Coś poszło nie tak.')
        return
      }
      handleRefresh()
    } catch (e) {
      setError(`Błąd sieci: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusyId(null)
    }
  }

  const filteredOrders = useMemo(() => {
    if (!deferredQuery) {
      return orders
    }

    return orders.filter((order) => getOrderSearchHaystack(order).includes(deferredQuery))
  }, [deferredQuery, orders])

  const pending = filteredOrders.filter((order) => order.status === 'pending')
  const paid = filteredOrders.filter((order) => order.status === 'paid' || order.status === 'used')

  function handleExportCsv() {
    downloadCsv('admin-materialy.csv', buildOrdersCsv(filteredOrders))
  }

  return (
    <div className="admin-materialy">
      {error && <div className="admin-error">{error}</div>}

      <div className="admin-materialy-toolbar">
        <label className="admin-materialy-search">
          <span>Szukaj</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ID, e-mail, telefon, produkt, kod, notatki..."
          />
        </label>

        <div className="admin-materialy-toolbar-actions">
          <div className="admin-materialy-toolbar-count">
            <strong>{filteredOrders.length}</strong>
            <span>z {orders.length} zamówień</span>
          </div>
          {query ? (
            <button type="button" className="button button-ghost small-button" onClick={() => setQuery('')}>
              Wyczyść
            </button>
          ) : null}
          <button
            type="button"
            className="button button-ghost small-button"
            onClick={handleExportCsv}
            disabled={filteredOrders.length === 0}
          >
            Eksport CSV
          </button>
          <button type="button" className="button button-ghost small-button" onClick={handleRefresh}>
            Odśwież
          </button>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="admin-empty">Brak zamówień dla wybranego filtra.</div>
      ) : (
        <>
          <div className="admin-section">
            <h2>Oczekuje wpłaty ({pending.length})</h2>
            {pending.length === 0 && <p className="admin-quiet">Brak nowych zamówień do potwierdzenia.</p>}
            <ul className="admin-orders">
              {pending.map((o) => (
                <li key={o.id} className="admin-order">
                  <div className="admin-order-head">
                    <code>{o.id}</code>
                    <span className="admin-tag">{statusLabel(o.status)}</span>
                    <span>{o.priceLabel}</span>
                    <span className="admin-quiet">{formatDate(o.createdAt)}</span>
                  </div>
                  <div className="admin-order-body">
                    <p>
                      <strong>{o.customerName}</strong> · {o.customerEmail}
                      {o.customerPhone && <> · {o.customerPhone}</>}
                    </p>
                    <p>
                      {o.productKind === 'bundle' ? 'Pakiet' : 'PDF'}: <code>{o.productSlug}</code>
                    </p>
                    {o.notes && <p className="admin-quiet">„{o.notes}&quot;</p>}
                  </div>
                  <div className="admin-order-actions">
                    <button type="button" onClick={() => confirm(o.id)} disabled={busyId === o.id}>
                      {busyId === o.id ? 'Wysyłam…' : 'Potwierdź wpłatę i wyślij kod'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="admin-section">
            <h2>Opłacone ({paid.length})</h2>
            {paid.length === 0 && <p className="admin-quiet">Brak opłaconych zamówień w historii.</p>}
            <ul className="admin-orders">
              {paid.map((o) => (
                <li key={o.id} className="admin-order">
                  <div className="admin-order-head">
                    <code>{o.id}</code>
                    <span className="admin-tag">{statusLabel(o.status)}</span>
                    <span>{o.priceLabel}</span>
                    <span className="admin-quiet">opłac.: {formatDate(o.paidAt)}</span>
                    <span className="admin-quiet">pobrań: {o.usedCount}/3</span>
                  </div>
                  <div className="admin-order-body">
                    <p>
                      <strong>{o.customerName}</strong> · {o.customerEmail}
                    </p>
                    <p>
                      {o.productKind === 'bundle' ? 'Pakiet' : 'PDF'}: <code>{o.productSlug}</code> · kod{' '}
                      <code>{o.code ?? '—'}</code>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      <style jsx>{`
        .admin-materialy {
          margin-top: 24px;
        }
        .admin-error {
          background: #fde0e0;
          border: 1px solid #cc6655;
          padding: 12px 16px;
          border-radius: 6px;
          margin-bottom: 16px;
        }
        .admin-materialy-toolbar {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-end;
          flex-wrap: wrap;
          margin-bottom: 24px;
        }
        .admin-materialy-search {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 260px;
          flex: 1 1 320px;
          color: #5e4a3c;
          font-size: 14px;
        }
        .admin-materialy-search input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d9c7b4;
          border-radius: 6px;
          background: #fff;
          color: #1f1a17;
          font: inherit;
        }
        .admin-materialy-toolbar-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .admin-materialy-toolbar-count {
          display: flex;
          flex-direction: column;
          gap: 2px;
          color: #8b6f5a;
          font-size: 13px;
          min-width: 96px;
        }
        .admin-materialy-toolbar-count strong {
          font-size: 18px;
          color: #1f1a17;
        }
        .admin-empty {
          background: #faf6f0;
          border: 1px solid #e5d8c6;
          border-radius: 6px;
          padding: 16px;
          color: #5e4a3c;
        }
        .admin-section {
          margin-bottom: 32px;
        }
        .admin-section h2 {
          font-size: 18px;
          margin: 0 0 12px;
          color: #1f1a17;
        }
        .admin-quiet {
          color: #8b6f5a;
          font-size: 13px;
        }
        .admin-orders {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .admin-order {
          background: #faf6f0;
          border: 1px solid #e5d8c6;
          border-radius: 6px;
          padding: 12px 16px;
        }
        .admin-order-head {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
          margin-bottom: 8px;
        }
        .admin-order-head code {
          background: #fff;
          padding: 2px 6px;
          border-radius: 3px;
          font-weight: 600;
        }
        .admin-tag {
          background: #c9a37a;
          color: #fff;
          padding: 2px 8px;
          border-radius: 3px;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .admin-order-body p {
          margin: 4px 0;
        }
        .admin-order-body code {
          background: #fff;
          padding: 1px 4px;
          border-radius: 2px;
          font-size: 12px;
        }
        .admin-order-actions {
          margin-top: 12px;
        }
        .admin-order-actions button {
          background: #1f1a17;
          color: #fff;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 600;
        }
        .admin-order-actions button:disabled {
          opacity: 0.5;
          cursor: wait;
        }
      `}</style>
    </div>
  )
}
