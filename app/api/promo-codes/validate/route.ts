export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { PROMO_CODE_SERVICE_TYPE, validatePromoCodeForService } from '@/lib/server/promo-codes'

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Niepoprawny format zapytania.' }, { status: 400 })
  }

  const code = typeof body.code === 'string' ? body.code : ''
  try {
    const result = await validatePromoCodeForService(code, PROMO_CODE_SERVICE_TYPE)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Nie udało się sprawdzić kodu.' },
      { status: 400 },
    )
  }
}