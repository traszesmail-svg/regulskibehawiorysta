export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { issueConsultationAccessCode } from '@/lib/server/db'

export async function POST(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params

  try {
    const result = await issueConsultationAccessCode(params.id)

    return NextResponse.json({
      ok: true,
      code: result.code,
      expiresAt: result.expiresAt,
      emailStatus: result.email.status,
      emailReason: result.email.reason ?? null,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Nie udało się wydać kodu konsultacji.' },
      { status: 400 },
    )
  }
}
