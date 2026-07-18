import { NextResponse } from 'next/server'
import {
  CaseMapInputError,
  normalizeCaseMapPatchInput,
} from '@/lib/case-map'
import { getAccountUser } from '@/lib/server/account-auth'
import {
  CaseMapArchivedError,
  CaseMapConflictError,
  getCaseMapForUser,
  patchCaseMapForUser,
} from '@/lib/server/case-map-store'
import { ConfigurationError } from '@/lib/server/env'
import { PRIVATE_NO_STORE_HEADERS } from '@/lib/server/request-protection'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback
  const status = error instanceof ConfigurationError
    ? 401
    : error instanceof CaseMapArchivedError
      ? 409
      : error instanceof CaseMapConflictError
      ? 409
      : error instanceof CaseMapInputError
        ? 400
        : 500

  return NextResponse.json({ ok: false, error: message }, { status, headers: PRIVATE_NO_STORE_HEADERS })
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const user = await getAccountUser(request)
    const caseMap = await getCaseMapForUser(user, (await context.params).id)

    if (!caseMap) {
      return NextResponse.json({ ok: false, error: 'Nie znaleziono Mapy zachowania.' }, { status: 404, headers: PRIVATE_NO_STORE_HEADERS })
    }

    return NextResponse.json({ ok: true, caseMap }, { headers: PRIVATE_NO_STORE_HEADERS })
  } catch (error) {
    return errorResponse(error, 'Nie udało się pobrać Mapy zachowania.')
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await getAccountUser(request)
    const patch = normalizeCaseMapPatchInput(await request.json())
    const caseMap = await patchCaseMapForUser(user, (await context.params).id, patch)

    if (!caseMap) {
      return NextResponse.json({ ok: false, error: 'Nie znaleziono Mapy zachowania.' }, { status: 404, headers: PRIVATE_NO_STORE_HEADERS })
    }

    return NextResponse.json({ ok: true, caseMap }, { headers: PRIVATE_NO_STORE_HEADERS })
  } catch (error) {
    return errorResponse(error, 'Nie udało się zapisać Mapy zachowania.')
  }
}
