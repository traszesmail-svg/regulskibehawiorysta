import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { NextResponse } from 'next/server'
import { getLeadMagnetBySlug } from '@/lib/active-lead-magnets'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type LeadMagnetFileRouteProps = {
  params: Promise<{
    slug: string
  }>
}

export async function GET(_request: Request, props: LeadMagnetFileRouteProps) {
  const params = await props.params;
  const magnet = getLeadMagnetBySlug(params.slug)

  if (!magnet) {
    return NextResponse.json({ error: 'Nie znaleziono materiału.' }, { status: 404 })
  }

  if (magnet.asset.kind === 'text') {
    return new NextResponse(magnet.asset.body, {
      status: 200,
      headers: {
        'Content-Type': magnet.asset.mimeType,
        'Content-Disposition': `attachment; filename="${magnet.asset.fileName}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  }

  try {
    const buffer = await readFile(path.join(process.cwd(), magnet.asset.relativeFilePath))

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': magnet.asset.mimeType,
        'Content-Disposition': `attachment; filename="${magnet.asset.fileName}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Materiał jest chwilowo niedostępny.' }, { status: 503 })
  }
}
