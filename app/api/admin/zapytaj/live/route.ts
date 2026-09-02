export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { disableZapytajLive, enableZapytajLive, getZapytajLiveStatus } from '@/lib/server/zapytaj-live'
import {
  dispatchZapytajLiveNotifications,
  listSubscribedZapytajLiveNotifications,
} from '@/lib/server/zapytaj-notifications'

export async function GET() {
  try {
    const status = await getZapytajLiveStatus()
    let waiting: number | null = null

    try {
      waiting = (await listSubscribedZapytajLiveNotifications()).length
    } catch (error) {
      console.warn('[regulski-behawiorysta][admin][zapytaj] notification count unavailable', error)
    }

    return NextResponse.json(
      { ...status, notificationSummary: { waiting } },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Nie udało się odczytać statusu live.' },
      { status: 503 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { action?: string }
    const status = body.action === 'enable' ? await enableZapytajLive() : body.action === 'disable' ? await disableZapytajLive() : null

    if (!status) {
      return NextResponse.json({ error: 'Nieprawidłowa akcja dostępności live.' }, { status: 400 })
    }

    if (body.action === 'enable') {
      try {
        const notificationSummary = await dispatchZapytajLiveNotifications()
        return NextResponse.json(
          { ...status, notificationSummary },
          { headers: { 'Cache-Control': 'no-store' } },
        )
      } catch (error) {
        console.warn('[regulski-behawiorysta][admin][zapytaj] notification dispatch unavailable', error)
        return NextResponse.json(
          {
            ...status,
            notificationSummary: {
              waiting: null,
              attempted: 0,
              sent: 0,
              fallbackSent: 0,
              failed: 0,
              skipped: 0,
              error: 'Powiadomienia nie zostały wysłane. Sprawdź konfigurację storage i kanału SMS/e-mail.',
            },
          },
          { headers: { 'Cache-Control': 'no-store' } },
        )
      }
    }

    return NextResponse.json(
      { ...status, notificationSummary: { waiting: null } },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Nie udało się zmienić dostępności live.' },
      { status: 503 },
    )
  }
}
