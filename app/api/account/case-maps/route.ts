import { NextResponse } from 'next/server'
import {
  CaseMapInputError,
  normalizeCaseMapCreateInput,
} from '@/lib/case-map'
import { getAccountUser } from '@/lib/server/account-auth'
import { listCaseMapsForUser, createCaseMap } from '@/lib/server/case-map-store'
import { ConfigurationError } from '@/lib/server/env'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback
  const status = error instanceof ConfigurationError
    ? 401
    : error instanceof CaseMapInputError
      ? 400
      : 500

  return NextResponse.json({ ok: false, error: message }, { status })
}

export async function GET(request: Request) {
  try {
    const user = await getAccountUser(request)
    const caseMaps = await listCaseMapsForUser(user)
    return NextResponse.json({ ok: true, caseMaps })
  } catch (error) {
    return errorResponse(error, 'Nie udało się pobrać Map sprawy.')
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAccountUser(request)
    const input = normalizeCaseMapCreateInput(await request.json())
    const caseMap = await createCaseMap(user, input)
    return NextResponse.json({ ok: true, caseMap }, { status: 201 })
  } catch (error) {
    return errorResponse(error, 'Nie udało się utworzyć Mapy zachowania.')
  }
}
