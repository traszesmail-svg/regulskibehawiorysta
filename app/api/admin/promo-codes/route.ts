export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { createPromoCampaign, DEFAULT_PROMO_CODE_COUNT } from '@/lib/server/promo-codes'

export async function POST(request: Request) {
  let body: Record<string, unknown>

  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Niepoprawny format zapytania.' }, { status: 400 })
  }

  try {
    const result = await createPromoCampaign({
      clinicName: typeof body.clinicName === 'string' ? body.clinicName : '',
      logoSrc: typeof body.logoSrc === 'string' ? body.logoSrc : null,
      codeCount:
        typeof body.codeCount === 'number' || typeof body.codeCount === 'string'
          ? body.codeCount
          : DEFAULT_PROMO_CODE_COUNT,
      expiresAt: typeof body.expiresAt === 'string' ? body.expiresAt : null,
      kind: body.kind === 'community' ? 'community' : 'clinic',
    })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Nie udalo sie wygenerowac kodow.' },
      { status: 400 },
    )
  }
}
