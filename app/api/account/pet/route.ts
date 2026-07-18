import { NextResponse } from 'next/server'
import { ConfigurationError } from '@/lib/server/env'
import { getAccountUser } from '@/lib/server/account-auth'
import { upsertAccountPet, type UpsertAccountPetInput } from '@/lib/server/account-store'
import { PRIVATE_NO_STORE_HEADERS } from '@/lib/server/request-protection'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: Request) {
  try {
    const user = await getAccountUser(request)
    const body = (await request.json()) as Partial<UpsertAccountPetInput>
    const species = body.species === 'kot' ? 'kot' : 'pies'
    const pet = await upsertAccountPet(user, {
      id: typeof body.id === 'string' ? body.id : null,
      name: typeof body.name === 'string' ? body.name : '',
      species,
      age: typeof body.age === 'string' ? body.age : '',
      behaviorNotes: typeof body.behaviorNotes === 'string' ? body.behaviorNotes : '',
    })

    return NextResponse.json({ ok: true, pet }, { headers: PRIVATE_NO_STORE_HEADERS })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nie udało się zapisać pupila.'
    const status = error instanceof ConfigurationError ? 401 : 400
    return NextResponse.json({ ok: false, error: message }, { status, headers: PRIVATE_NO_STORE_HEADERS })
  }
}
