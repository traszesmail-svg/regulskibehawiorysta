export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { deleteAvailabilitySlot } from '@/lib/server/db'
import { ConfigurationError } from '@/lib/server/env'

export async function DELETE(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    await deleteAvailabilitySlot(params.id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nie udało się usunąć slotu.'
    return NextResponse.json({ error: message }, { status: error instanceof ConfigurationError ? 503 : 400 })
  }
}
