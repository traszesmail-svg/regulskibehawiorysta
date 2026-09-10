import { NextRequest, NextResponse } from 'next/server'
import { disableZapytajLive, enableZapytajLive, getZapytajLiveStatus } from '@/lib/server/zapytaj-live'
import { dispatchZapytajLiveNotifications } from '@/lib/server/zapytaj-notifications'
import { hasValidPhoneAgentAuthorization } from '@/lib/server/phone-agent'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function unauthorized() {
  return NextResponse.json({ error: 'Brak autoryzacji telefonu.' }, { status: 401 })
}

export async function GET(request: NextRequest) {
  if (!hasValidPhoneAgentAuthorization(request.headers.get('authorization'))) return unauthorized()
  try {
    return NextResponse.json(await getZapytajLiveStatus(), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Nie udało się odczytać statusu live.' }, { status: 503 })
  }
}

export async function POST(request: NextRequest) {
  if (!hasValidPhoneAgentAuthorization(request.headers.get('authorization'))) return unauthorized()
  try {
    const body = (await request.json()) as { action?: unknown }
    if (body.action === 'enable') {
      const status = await enableZapytajLive()
      void dispatchZapytajLiveNotifications().catch((error) => console.warn('[phone-agent] live notification dispatch failed', error))
      return NextResponse.json(status, { headers: { 'Cache-Control': 'no-store' } })
    }
    if (body.action === 'disable') {
      return NextResponse.json(await disableZapytajLive(), { headers: { 'Cache-Control': 'no-store' } })
    }
    return NextResponse.json({ error: 'Nieprawidłowa akcja live.' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Nie udało się zmienić statusu live.' }, { status: 503 })
  }
}
