import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getAdminAccessSecret, getAdminAuthChallengeHeaders, hasValidAdminAuthorization } from '@/lib/admin-auth'
import { markCaseMapReviewed } from '@/lib/server/case-map-store'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const secret = getAdminAccessSecret()
  if (!secret) return NextResponse.json({ ok: false, error: 'Brak konfiguracji dostępu administratora.' }, { status: 503 })

  if (!hasValidAdminAuthorization(headers().get('authorization'), secret)) {
    return NextResponse.json({ ok: false, error: 'Brak autoryzacji.' }, { status: 401, headers: getAdminAuthChallengeHeaders() })
  }

  try {
    const caseMap = await markCaseMapReviewed(params.id)
    if (!caseMap) return NextResponse.json({ ok: false, error: 'Nie znaleziono przekazanej Mapy zachowania.' }, { status: 404 })
    return NextResponse.json({ ok: true, caseMap: { id: caseMap.id, reviewedAt: caseMap.reviewedAt } })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Nie udało się oznaczyć Mapy jako przejrzanej.' }, { status: 400 })
  }
}
