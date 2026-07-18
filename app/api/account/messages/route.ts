import { NextResponse } from 'next/server'
import { ConfigurationError } from '@/lib/server/env'
import { getAccountUser } from '@/lib/server/account-auth'
import { createAccountMessage } from '@/lib/server/account-store'
import { PRIVATE_NO_STORE_HEADERS } from '@/lib/server/request-protection'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: Request) {
  try {
    const user = await getAccountUser(request)
    const formData = await request.formData()
    const file = formData.get('file')
    const result = await createAccountMessage(user, {
      body: String(formData.get('body') ?? ''),
      conversationId: String(formData.get('conversationId') ?? '') || null,
      petId: String(formData.get('petId') ?? '') || null,
      file: file instanceof File ? file : null,
    })

    return NextResponse.json({ ok: true, ...result }, { headers: PRIVATE_NO_STORE_HEADERS })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nie udało się wysłać wiadomości.'
    const status = error instanceof ConfigurationError ? 401 : 400
    return NextResponse.json({ ok: false, error: message }, { status, headers: PRIVATE_NO_STORE_HEADERS })
  }
}
