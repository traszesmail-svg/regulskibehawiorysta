import { approveManualPayment, rejectManualPayment } from '@/lib/server/manual-payments'
import { getBookingById } from '@/lib/server/db'
import { verifyManualPaymentReviewToken } from '@/lib/server/manual-payment-review'
import type { BookingRecord } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type HtmlOptions = {
  actionHref?: string
  actionLabel?: string
  redirectUrl?: string
}

type ReviewAction = 'approve' | 'reject'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildHtml(title: string, message: string, status: 'success' | 'error', options?: HtmlOptions) {
  const accent = status === 'success' ? '#0a5c36' : '#8a3022'
  const redirectTag = options?.redirectUrl
    ? `<meta http-equiv="refresh" content="0;url=${escapeHtml(options.redirectUrl)}" />`
    : ''
  const actionLink = options?.actionHref && options?.actionLabel
    ? `<p style="margin-top:24px;"><a href="${escapeHtml(options.actionHref)}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:${accent};color:#ffffff;text-decoration:none;font-weight:700;">${escapeHtml(options.actionLabel)}</a></p>`
    : ''

  return new Response(
    `<!doctype html>
      <html lang="pl">
        <head>
          <meta charset="utf-8" />
          <meta name="robots" content="noindex, nofollow" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${escapeHtml(title)}</title>
          ${redirectTag}
          <style>
            body { margin:0; font-family: Arial, sans-serif; background:#f8f4eb; color:#1f1a17; }
            main { min-height:100vh; display:grid; place-items:center; padding:24px; }
            article { max-width:640px; width:100%; background:#fff; border:1px solid #e9dfcf; border-radius:24px; padding:32px; box-shadow:0 18px 40px rgba(31,26,23,0.08); }
            .badge { display:inline-block; padding:8px 14px; border-radius:999px; background:${accent}; color:#fff; font-weight:700; margin-bottom:16px; }
            h1 { margin:0 0 12px; font-size:32px; line-height:1.1; }
            p { margin:0; line-height:1.7; }
          </style>
        </head>
        <body>
          <main>
            <article>
              <div class="badge">Regulski Behawiorysta</div>
              <h1>${escapeHtml(title)}</h1>
              <p>${escapeHtml(message)}</p>
              ${actionLink}
            </article>
          </main>
        </body>
      </html>`,
    {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
      status: status === 'success' ? 200 : 400,
    },
  )
}

function buildDecisionHtml(request: Request, booking: BookingRecord, action: ReviewAction) {
  const url = new URL(request.url)
  const submitLabel = action === 'approve' ? 'Potwierdź wpłatę' : 'Odrzuć zgłoszenie'
  const actionLabel = action === 'approve' ? 'potwierdzić wpłatę' : 'odrzucić zgłoszenie wpłaty'

  return new Response(
    `<!doctype html>
      <html lang="pl">
        <head>
          <meta charset="utf-8" />
          <meta name="robots" content="noindex, nofollow" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Potwierdź decyzję</title>
          <style>
            body { margin:0; font-family: Arial, sans-serif; background:#f8f4eb; color:#1f1a17; }
            main { min-height:100vh; display:grid; place-items:center; padding:24px; }
            article { max-width:640px; width:100%; background:#fff; border:1px solid #e9dfcf; border-radius:24px; padding:32px; box-shadow:0 18px 40px rgba(31,26,23,0.08); }
            .badge { display:inline-block; padding:8px 14px; border-radius:999px; background:#0a5c36; color:#fff; font-weight:700; margin-bottom:16px; }
            h1 { margin:0 0 12px; font-size:32px; line-height:1.1; }
            p { margin:0; line-height:1.7; }
            form { margin-top:24px; display:flex; gap:12px; flex-wrap:wrap; }
            button,a { display:inline-block; padding:12px 18px; border:0; border-radius:999px; background:#0a5c36; color:#ffffff; text-decoration:none; font-weight:700; cursor:pointer; }
            a { background:#f1eadf; color:#1f1a17; }
          </style>
        </head>
        <body>
          <main>
            <article>
              <div class="badge">Regulski Behawiorysta</div>
              <h1>Potwierdź decyzję</h1>
              <p>To jest rezerwacja ${escapeHtml(booking.id)}. Żeby ${escapeHtml(actionLabel)}, potwierdź decyzję przyciskiem poniżej. Samo otwarcie linku z e-maila niczego nie zmienia.</p>
              <form method="post" action="${escapeHtml(`${url.pathname}${url.search}`)}">
                <button type="submit">${escapeHtml(submitLabel)}</button>
                <a href="/admin">Wróć do panelu</a>
              </form>
            </article>
          </main>
        </body>
      </html>`,
    {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
      status: 200,
    },
  )
}

function isApprovedBooking(booking: BookingRecord) {
  return booking.paymentStatus === 'paid' && (booking.bookingStatus === 'confirmed' || booking.bookingStatus === 'done')
}

function isRejectedBooking(booking: BookingRecord) {
  return booking.paymentStatus === 'rejected' || booking.bookingStatus === 'cancelled'
}

function isPendingReviewBooking(booking: BookingRecord) {
  return booking.bookingStatus === 'pending_manual_payment' && booking.paymentStatus === 'pending_manual_review'
}

function buildApprovedResponse(booking: BookingRecord) {
  return buildHtml(
    'Wpłata potwierdzona',
    `Rezerwacja ${booking.id} jest opłacona. Otwieramy pokój rozmowy.`,
    'success',
    {
      redirectUrl: booking.meetingUrl,
      actionHref: booking.meetingUrl,
      actionLabel: 'Otwórz pokój rozmowy',
    },
  )
}

function buildRejectedResponse(booking: BookingRecord) {
  return buildHtml(
    'Nie ma wpłaty - wróć do płatności',
    `Dla rezerwacji ${booking.id} nie znaleziono wpłaty. Klient musi wrócić do płatności.`,
    'success',
  )
}

function buildResolvedResponse(booking: BookingRecord, action: ReviewAction): Response | null {
  if (isApprovedBooking(booking)) {
    return buildApprovedResponse(booking)
  }

  if (isRejectedBooking(booking)) {
    return buildRejectedResponse(booking)
  }

  if (!isPendingReviewBooking(booking)) {
    return buildHtml(
      action === 'approve' ? 'Zgłoszenie jest już zamknięte' : 'To zgłoszenie nie czeka już na decyzję',
      'Otwórz najnowszą wiadomość, jeśli klient zgłosił nową wpłatę do potwierdzenia.',
      'success',
    )
  }

  return null
}

async function readReviewRequest(request: Request): Promise<
  | { booking: BookingRecord; action: ReviewAction }
  | { response: Response }
> {
  const url = new URL(request.url)
  const bookingId = url.searchParams.get('bookingId')
  const action = url.searchParams.get('action')
  const token = url.searchParams.get('token')

  if (!bookingId || !(action === 'approve' || action === 'reject')) {
    return {
      response: buildHtml('Brak danych linku', 'Link do decyzji o płatności jest niekompletny.', 'error'),
    }
  }

  if (!UUID_PATTERN.test(bookingId)) {
    return {
      response: buildHtml('Link jest nieprawidłowy', 'Ten link nie pasuje do żadnej rezerwacji.', 'error'),
    }
  }

  let booking: BookingRecord | null = null
  try {
    booking = await getBookingById(bookingId)
  } catch (error) {
    console.error('[manual-payment-review] booking lookup failed', {
      bookingId,
      action,
      error: error instanceof Error ? error.message : String(error),
    })

    return {
      response: buildHtml('Nie udało się odczytać rezerwacji', 'Spróbuj ponownie za chwilę albo otwórz najnowszy mail z potwierdzeniem wpłaty.', 'error'),
    }
  }

  if (!booking) {
    return {
      response: buildHtml('Booking nie istnieje', 'Nie znaleziono rezerwacji przypisanej do tego linku.', 'error'),
    }
  }

  if (!verifyManualPaymentReviewToken(booking.id, action, booking.paymentReportedAt, token)) {
    return {
      response: buildHtml('Link jest nieprawidłowy', 'Ten link wygasł albo nie pasuje do ostatniego zgłoszenia wpłaty.', 'error'),
    }
  }

  return { booking, action }
}

export async function GET(request: Request) {
  const review = await readReviewRequest(request)

  if ('response' in review) {
    return review.response
  }

  const resolvedBeforeAction = buildResolvedResponse(review.booking, review.action)

  if (resolvedBeforeAction) {
    return resolvedBeforeAction
  }

  return buildDecisionHtml(request, review.booking, review.action)
}

export async function POST(request: Request) {
  const review = await readReviewRequest(request)

  if ('response' in review) {
    return review.response
  }

  const { booking, action } = review
  const resolvedBeforeAction = buildResolvedResponse(booking, action)

  if (resolvedBeforeAction) {
    return resolvedBeforeAction
  }

  try {
    if (action === 'approve') {
      const updated = await approveManualPayment(booking.id)
      return buildApprovedResponse(updated)
    }

    const updated = await rejectManualPayment(booking.id)
    return buildRejectedResponse(updated)
  } catch (error) {
    console.error('[manual-payment-review] decision failed', {
      bookingId: booking.id,
      action,
      error: error instanceof Error ? error.message : String(error),
    })

    const latestBooking = await getBookingById(booking.id)
    const resolvedAfterRace = latestBooking ? buildResolvedResponse(latestBooking, action) : null

    if (resolvedAfterRace) {
      return resolvedAfterRace
    }

    return buildHtml(
      action === 'approve' ? 'Nie udało się potwierdzić wpłaty' : 'Nie udało się zamknąć zgłoszenia',
      error instanceof Error ? error.message : 'Nie udało się wykonać decyzji o płatności.',
      'error',
    )
  }
}
