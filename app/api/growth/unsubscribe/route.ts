import { NextResponse } from 'next/server'
import { unsubscribeGrowthSignupByToken } from '@/lib/server/growth-signups'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderPage(title: string, body: string) {
  return `<!doctype html>
<html lang="pl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex,nofollow" />
    <title>${escapeHtml(title)} | Regulski Behawiorysta</title>
  </head>
  <body style="margin:0;background:#f5f1e9;color:#1f1a17;font-family:Arial,Helvetica,sans-serif;line-height:1.55;">
    <main style="max-width:620px;margin:72px auto;padding:0 20px;">
      <section style="background:#fffdf8;border:1px solid #e2d6c6;border-radius:20px;padding:32px;box-shadow:0 12px 36px rgba(62,45,30,.08);">
        ${body}
      </section>
    </main>
  </body>
</html>`
}

function htmlResponse(html: string, status = 200) {
  return new NextResponse(html, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow',
    },
  })
}

function getTokenFromUrl(request: Request) {
  return new URL(request.url).searchParams.get('token')?.trim() ?? ''
}

async function getTokenFromRequest(request: Request) {
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? ''

  if (contentType.includes('application/json')) {
    const body = (await request.json()) as { token?: unknown }
    return typeof body.token === 'string' ? body.token.trim() : ''
  }

  const formData = await request.formData()
  const token = formData.get('token')
  return typeof token === 'string' ? token.trim() : ''
}

function renderConfirmation(token: string) {
  return renderPage(
    'Wypisanie z dodatkowych wskazówek',
    `<p style="margin:0 0 8px;color:#6f5a48;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Materiały bezpłatne</p>
     <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.15;margin:0 0 16px;">Wyłączyć dodatkowe wiadomości?</h1>
     <p style="margin:0 0 24px;">Wyłączymy wyłącznie dwa dodatkowe e-maile z praktycznymi wskazówkami do pobranego materiału. Link do PDF i wiadomość z materiałem pozostaną bez zmian.</p>
     <form method="post" action="/api/growth/unsubscribe">
       <input type="hidden" name="token" value="${escapeHtml(token)}" />
       <button type="submit" style="border:0;border-radius:10px;background:#174d35;color:#fff;padding:12px 18px;font:inherit;font-weight:700;cursor:pointer;">Tak, wypisz mnie z dodatkowych wiadomości</button>
     </form>`,
  )
}

function renderSuccess() {
  return renderPage(
    'Dodatkowe wiadomości wyłączone',
    `<p style="margin:0 0 8px;color:#6f5a48;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Materiały bezpłatne</p>
     <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.15;margin:0 0 16px;">Dodatkowe wiadomości są wyłączone</h1>
     <p style="margin:0;">Nie wyślemy kolejnych wskazówek do tego materiału. Jeśli link był już użyty wcześniej, nie musisz robić nic więcej.</p>`,
  )
}

function renderInvalidRequest() {
  return renderPage(
    'Link do wypisania jest niepełny',
    `<h1 style="font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.15;margin:0 0 16px;">Ten link do wypisania jest niepełny</h1>
     <p style="margin:0;">Otwórz ponownie link z wiadomości e-mail. Jeśli problem się powtarza, odpowiedz na tę wiadomość.</p>`,
  )
}

export async function GET(request: Request) {
  const token = getTokenFromUrl(request)

  if (token.length < 32) {
    return htmlResponse(renderInvalidRequest(), 400)
  }

  // GET nie zmienia zgody, aby skanery linków nie wypisywały odbiorcy automatycznie.
  return htmlResponse(renderConfirmation(token))
}

export async function POST(request: Request) {
  try {
    const token = await getTokenFromRequest(request)

    if (token.length < 32) {
      return htmlResponse(renderInvalidRequest(), 400)
    }

    await unsubscribeGrowthSignupByToken(token)
    // Taka sama odpowiedź dla już użytego i nieznanego tokenu nie ujawnia danych zapisu.
    return htmlResponse(renderSuccess())
  } catch (error) {
    console.error('[regulski-behawiorysta][growth-unsubscribe] unsubscribe failed', error)
    return htmlResponse(
      renderPage(
        'Nie udało się zapisać zmiany',
        `<h1 style="font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.15;margin:0 0 16px;">Nie udało się jeszcze wyłączyć wiadomości</h1>
         <p style="margin:0;">Spróbuj ponownie za chwilę albo odpowiedz na wiadomość e-mail, z której otworzyłeś ten link.</p>`,
      ),
      500,
    )
  }
}
