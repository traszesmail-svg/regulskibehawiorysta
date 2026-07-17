import { readFile } from 'fs/promises'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import {
  buildPreparationVideoStoragePath,
  canAccessPreparationMaterials,
  PREPARATION_STORAGE_BUCKET,
} from '@/lib/preparation'
import { getBookingForViewer } from '@/lib/server/db'
import {
  ConfigurationError,
  getPublicFeatureUnavailableMessage,
  resolveDataMode,
  getSupabaseServerConfig,
} from '@/lib/server/env'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

function resolveAccessToken(request: Request): string | null {
  return new URL(request.url).searchParams.get('access')
}

function getLocalVideoAbsolutePath(bookingId: string) {
  return path.join(process.cwd(), 'data', 'prep-materials', ...buildPreparationVideoStoragePath(bookingId).split('/'))
}

function getSupabaseAdmin() {
  const config = getSupabaseServerConfig('odczyt materiałów przygotowawczych')

  return createClient(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const booking = await getBookingForViewer(params.id, resolveAccessToken(request), request.headers.get('authorization'))

    if (!booking) {
      return NextResponse.json({ error: 'Ten link do nagrania jest nieprawidłowy albo wygasł.' }, { status: 403 })
    }

    if (!canAccessPreparationMaterials(booking)) {
      return NextResponse.json(
        { error: 'Materiały do sprawy są dostępne dopiero po potwierdzonej płatności.' },
        { status: 409 },
      )
    }

    if (!booking.prepVideoPath) {
      return NextResponse.json({ error: 'Do tej rezerwacji nie dodano jeszcze nagrania.' }, { status: 404 })
    }

    if (resolveDataMode('odczyt materiałów przygotowawczych') === 'supabase') {
      const supabase = getSupabaseAdmin()
      const { data, error } = await supabase.storage
        .from(PREPARATION_STORAGE_BUCKET)
        .createSignedUrl(booking.prepVideoPath, 60 * 10)

      if (error || !data?.signedUrl) {
        throw error ?? new Error('Nie udało się przygotować dostępu do nagrania.')
      }

      return NextResponse.redirect(data.signedUrl)
    }

    const fileBuffer = await readFile(getLocalVideoAbsolutePath(booking.id))

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `inline; filename="${booking.prepVideoFilename ?? 'nagranie.mp4'}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    const message = error instanceof ConfigurationError
      ? getPublicFeatureUnavailableMessage('materials')
      : error instanceof Error
        ? error.message
        : 'Nie udało się pobrać nagrania.'
    const isMissingFile =
      typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'

    return NextResponse.json(
      { error: isMissingFile ? 'Nie znaleziono nagrania dla tej rezerwacji.' : message },
      { status: isMissingFile ? 404 : error instanceof ConfigurationError ? 503 : 500 },
    )
  }
}
