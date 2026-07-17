export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { updatePendingTestimonialStatus } from '@/lib/server/testimonial-store'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: Request, props: Params) {
  const params = await props.params;
  const { id } = params

  try {
    const url = new URL(request.url)
    const action = url.searchParams.get('action')

    if (action !== 'publish' && action !== 'skip') {
      return NextResponse.json({ error: 'Nieprawidlowa akcja.' }, { status: 400 })
    }

    const status = action === 'publish' ? 'published' : 'skipped'
    await updatePendingTestimonialStatus(id, status)

    return NextResponse.json({ ok: true, status })
  } catch (error) {
    console.error('[admin/testimonials] update failed', error)
    return NextResponse.json({ error: 'Nie udało się zaktualizować statusu.' }, { status: 500 })
  }
}

export async function GET(request: Request, props: Params) {
  const params = await props.params;
  const { id } = params
  const url = new URL(request.url)
  const action = url.searchParams.get('action')

  if (action !== 'publish' && action !== 'skip') {
    return new Response('Nieprawidlowa akcja.', { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  }

  try {
    const status = action === 'publish' ? 'published' : 'skipped'
    await updatePendingTestimonialStatus(id, status)

    const label = action === 'publish' ? 'opublikowana' : 'odłożona'
    return new Response(
      `<!DOCTYPE html><html lang="pl"><head><meta charset="utf-8"><title>Opinia ${label}</title>
      <style>body{font-family:sans-serif;padding:40px;max-width:500px;margin:0 auto;color:#1f1a17}
      .ok{color:#1f7a1f;font-size:1.2em}a{color:#1f1a17}</style></head>
      <body><p class="ok">Opinia ${label}.</p>
      <p><a href="/admin/opinie">Przejdź do panelu opinii</a></p></body></html>`,
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    )
  } catch (error) {
    console.error('[admin/testimonials] update failed', error)
    return new Response('Błąd podczas aktualizacji statusu.', { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  }
}
