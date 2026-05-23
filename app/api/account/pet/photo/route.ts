import { NextResponse } from 'next/server'
import { ConfigurationError } from '@/lib/server/env'
import { getAccountUser } from '@/lib/server/account-auth'
import { uploadPetPhoto } from '@/lib/server/account-store'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: Request) {
  try {
    const user = await getAccountUser(request)
    const formData = await request.formData()
    const petId = String(formData.get('petId') ?? '').trim()
    const file = formData.get('file')

    if (!petId || !(file instanceof File)) {
      return NextResponse.json({ ok: false, error: 'Brak pupila albo pliku.' }, { status: 400 })
    }

    const pet = await uploadPetPhoto(user, petId, file)
    return NextResponse.json({ ok: true, pet })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nie udało się zapisać zdjęcia.'
    const status = error instanceof ConfigurationError ? 401 : 400
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}
