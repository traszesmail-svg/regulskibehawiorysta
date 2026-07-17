export const dynamic = 'force-dynamic'
export const revalidate = 0

import { fulfillCommerceOrderAndNotify } from '@/lib/server/commerce-service'
import type { CommerceOrder } from '@/lib/commerce'
import {
  getCommerceOrder,
  getCommerceOrderByConfirmationToken,
  rejectCommerceManualPayment,
} from '@/lib/server/commerce-store'

type AdminDecision = 'approve' | 'reject'

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function html(title: string, body: string, status: 200 | 400 = 200) {
  return new Response(
    `<!doctype html>
      <html lang="pl">
        <head>
          <meta charset="utf-8" />
          <meta name="robots" content="noindex, nofollow" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${escapeHtml(title)}</title>
          <style>
            body{margin:0;font-family:Arial,sans-serif;background:#f8f4eb;color:#1f1a17}
            main{min-height:100vh;display:grid;place-items:center;padding:24px}
            article{max-width:680px;background:#fff;border:1px solid #e9dfcf;border-radius:24px;padding:32px;box-shadow:0 18px 40px rgba(31,26,23,.08)}
            h1{margin:0 0 12px;font-size:30px;line-height:1.15}
            p{line-height:1.7}
            form{margin-top:22px;display:flex;gap:12px;flex-wrap:wrap}
            button,a{border:0;border-radius:999px;padding:12px 18px;font-weight:700;text-decoration:none;cursor:pointer}
            button{background:#2f7667;color:#fff}
            a{background:#f1eadf;color:#1f1a17}
          </style>
        </head>
        <body><main><article><h1>${escapeHtml(title)}</h1>${body}</article></main></body>
      </html>`,
    {
      status,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
      },
    },
  )
}

function messageHtml(message: string) {
  return `<p>${escapeHtml(message)}</p>`
}

function actionLinkHtml(href: string, label: string) {
  return `<p><a href="${escapeHtml(href)}">${escapeHtml(label)}</a></p>`
}

function clientIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    null
}

function readDecision(request: Request): AdminDecision {
  return new URL(request.url).searchParams.get('action') === 'reject' ? 'reject' : 'approve'
}

function alreadyConfirmedMessage(productType: string) {
  return productType === 'consultation'
    ? 'Konsultacja była już potwierdzona. Ponowne kliknięcie nie wysyła kolejnych maili.'
    : 'Kod dostępu został już wysłany do klienta. Ponowne kliknięcie nie tworzy nowego kodu.'
}

function confirmedMessage(productType: string) {
  return productType === 'consultation'
    ? 'Konsultacja została potwierdzona. Klient dostał mail z terminem i linkiem do rozmowy, a behawiorysta dostał osobne potwierdzenie z plikiem kalendarza.'
    : 'Kod dostępu został wysłany do klienta.'
}

function consultationRoomUrl(order: CommerceOrder) {
  if (order.productType !== 'consultation' || !order.meta.bookingId) {
    return null
  }

  return `/call/${encodeURIComponent(order.meta.bookingId)}${order.meta.bookingAccessToken ? `?access=${encodeURIComponent(order.meta.bookingAccessToken)}` : ''}`
}

function confirmedBody(order: CommerceOrder, alreadyConfirmed = false) {
  const roomUrl = consultationRoomUrl(order)
  const message = alreadyConfirmed ? alreadyConfirmedMessage(order.productType) : confirmedMessage(order.productType)

  return `${messageHtml(message)}${roomUrl ? actionLinkHtml(roomUrl, 'Otwórz pokój rozmowy') : ''}`
}

function decisionHtml(request: Request, action: AdminDecision, orderNumber: string) {
  const url = new URL(request.url)
  const submitLabel = action === 'reject' ? 'Odrzuć płatność' : 'Potwierdź płatność'
  const actionLabel = action === 'reject' ? 'odrzucić zgłoszenie płatności' : 'potwierdzić płatność'

  return html(
    'Potwierdź decyzję',
    `<p>To jest zamówienie <strong>${escapeHtml(orderNumber)}</strong>. Żeby ${escapeHtml(actionLabel)}, potwierdź decyzję przyciskiem poniżej. Samo otwarcie linku z e-maila niczego nie zmienia.</p>
      <form method="post" action="${escapeHtml(`${url.pathname}${url.search}`)}">
        <button type="submit">${escapeHtml(submitLabel)}</button>
        <a href="/admin">Wróć do panelu</a>
      </form>`,
  )
}

async function renderCurrentTokenState(request: Request, token: string) {
  const action = readDecision(request)
  const order = await getCommerceOrderByConfirmationToken(token)

  if (!order) {
    return html('Link jest nieprawidłowy', messageHtml('Nie znaleziono zamówienia przypisanego do tego tokenu.'), 400)
  }

  if (order.adminConfirmationTokenUsedAt && (order.status === 'access_sent' || order.status === 'paid')) {
    return html('Płatność była już potwierdzona', confirmedBody(order, true))
  }

  if (order.adminConfirmationTokenUsedAt) {
    return html('Link był już użyty', messageHtml('Ta decyzja została już wykonana. Token jest jednorazowy.'), 400)
  }

  return decisionHtml(request, action, order.orderNumber)
}

export async function GET(request: Request, props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  return renderCurrentTokenState(request, params.token)
}

export async function POST(request: Request, props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  const action = readDecision(request)
  const order = await getCommerceOrderByConfirmationToken(params.token)

  if (!order) {
    return html('Link jest nieprawidłowy', messageHtml('Nie znaleziono zamówienia przypisanego do tego tokenu.'), 400)
  }

  if (order.adminConfirmationTokenUsedAt && (order.status === 'access_sent' || order.status === 'paid')) {
    return html('Płatność była już potwierdzona', confirmedBody(order, true))
  }

  if (order.adminConfirmationTokenUsedAt) {
    return html('Link był już użyty', messageHtml('Ta decyzja została już wykonana. Token jest jednorazowy.'), 400)
  }

  try {
    if (action === 'reject') {
      await rejectCommerceManualPayment(order.orderNumber, {
        adminTokenUsedAt: new Date().toISOString(),
        adminIp: clientIp(request),
        adminUserAgent: request.headers.get('user-agent'),
      })

      return html('Płatność odrzucona', messageHtml('Zamówienie zostało oznaczone jako anulowane. Dostęp nie został wydany.'))
    }

    const confirmedOrder = await fulfillCommerceOrderAndNotify(order.orderNumber, 'blik_phone', {
      adminTokenUsedAt: new Date().toISOString(),
      adminIp: clientIp(request),
      adminUserAgent: request.headers.get('user-agent'),
    })

    return html('Płatność potwierdzona', confirmedBody(confirmedOrder))
  } catch (error) {
    console.error('[commerce][admin-confirm-payment] decision failed', {
      orderNumber: order.orderNumber,
      action,
      status: order.status,
      tokenPrefix: params.token.slice(0, 8),
      error: error instanceof Error ? error.message : String(error),
    })

    const latestOrder = await getCommerceOrder(order.orderNumber)
    if (latestOrder?.adminConfirmationTokenUsedAt && (latestOrder.status === 'access_sent' || latestOrder.status === 'paid')) {
      return html('Płatność potwierdzona', confirmedBody(latestOrder))
    }

    if (latestOrder?.adminConfirmationTokenUsedAt && latestOrder.status === 'cancelled') {
      return html('Płatność odrzucona', messageHtml('Zamówienie było już oznaczone jako anulowane. Dostęp nie został wydany.'))
    }

    return html(
      'Nie udało się wykonać decyzji',
      messageHtml(error instanceof Error ? error.message : 'Wystąpił błąd potwierdzenia płatności.'),
      400,
    )
  }
}
