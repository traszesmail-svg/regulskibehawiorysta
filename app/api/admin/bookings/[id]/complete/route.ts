export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getPublishedMaterialyGuideBySlug } from '@/lib/materialy-catalog'
import { getAdminAccessSecret, hasValidAdminAuthorization } from '@/lib/admin-auth'
import { getBookingForViewer, markBookingDone } from '@/lib/server/db'
import { ConfigurationError } from '@/lib/server/env'

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const authorization = request.headers.get('authorization')

  if (!hasValidAdminAuthorization(authorization, getAdminAccessSecret())) {
    return NextResponse.json({ error: 'Brak autoryzacji.' }, { status: 401 })
  }

  try {
    const body = (await request.json()) as {
      recommendedNextStep?: unknown
      recommendedMaterialSlug?: unknown
    }
    const viewerBooking = await getBookingForViewer(params.id, null, authorization)

    if (!viewerBooking) {
      return NextResponse.json({ error: 'Nie znaleziono rezerwacji.' }, { status: 404 })
    }

    const canComplete =
      viewerBooking.paymentStatus === 'paid' &&
      (viewerBooking.bookingStatus === 'confirmed' || viewerBooking.bookingStatus === 'done')

    if (!canComplete) {
      return NextResponse.json(
        { error: 'Rozmowę można zakończyć dopiero po potwierdzonej płatności i aktywnej rezerwacji.' },
        { status: 409 },
      )
    }

    const recommendedNextStepInput = typeof body.recommendedNextStep === 'string'
      ? body.recommendedNextStep.trim().slice(0, 1000)
      : ''
    const recommendedMaterialSlugInput = typeof body.recommendedMaterialSlug === 'string'
      ? body.recommendedMaterialSlug.trim()
      : ''

    if (recommendedMaterialSlugInput) {
      const guide = getPublishedMaterialyGuideBySlug(recommendedMaterialSlugInput)
      if (!guide || guide.priceCode !== 'p19') {
        return NextResponse.json({ error: 'Wybrany PDF nie jest aktywnym materiałem płatnym.' }, { status: 400 })
      }
    }

    const recommendedNextStep = recommendedNextStepInput || (
      viewerBooking.bookingStatus === 'done'
        ? viewerBooking.recommendedNextStep ?? 'Po tej rozmowie wdrażaj ustalenia i wróć do Pokoju, jeśli pojawią się nowe pytania.'
        : 'Po tej rozmowie wdrażaj ustalenia i wróć do Pokoju, jeśli pojawią się nowe pytania.'
    )
    const recommendedMaterialSlug = Object.prototype.hasOwnProperty.call(body, 'recommendedMaterialSlug')
      ? recommendedMaterialSlugInput || null
      : viewerBooking.recommendedMaterialSlug ?? null

    const booking = await markBookingDone(
      params.id,
      recommendedNextStep || 'Po tej rozmowie wdrażaj ustalenia i wróć do Pokoju, jeśli pojawią się nowe pytania.',
      recommendedMaterialSlug || null,
    )

    if (!booking) {
      return NextResponse.json({ error: 'Nie znaleziono rezerwacji.' }, { status: 404 })
    }

    return NextResponse.json({
      ok: true,
      recommendedMaterialSlug: booking.recommendedMaterialSlug ?? null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nie udało się zakończyć rozmowy.'
    return NextResponse.json({ error: message }, { status: error instanceof ConfigurationError ? 503 : 500 })
  }
}
