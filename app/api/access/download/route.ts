export const dynamic = 'force-dynamic'
export const revalidate = 0

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { NextResponse } from 'next/server'
import {
  getMaterialyBundleBySlug,
  getMaterialyGuideBySlug,
} from '@/lib/materialy-catalog'
import {
  canUseCommerceAccess,
  getCommerceOrderByAccessCode,
  recordCommerceAccessUse,
} from '@/lib/server/commerce-store'
import { PRIVATE_NO_STORE_HEADERS, consumeRequestRateLimit } from '@/lib/server/request-protection'

const PDF_DIR = path.join(process.cwd(), 'content', 'guides', 'pdf')
const ACCESS_DOWNLOAD_RATE_LIMIT = { key: 'access-download', limit: 60, windowMs: 15 * 60 * 1000 } as const

function safePdfPath(filename: string): string | null {
  const resolved = path.resolve(PDF_DIR, filename)
  return resolved.startsWith(PDF_DIR) ? resolved : null
}

export async function GET(request: Request) {
  const rateLimit = consumeRequestRateLimit(request, ACCESS_DOWNLOAD_RATE_LIMIT)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Za dużo pobrań w krótkim czasie. Spróbuj ponownie później.' },
      { status: 429, headers: { ...PRIVATE_NO_STORE_HEADERS, 'Retry-After': String(rateLimit.retryAfterSeconds) } },
    )
  }

  const url = new URL(request.url)
  const code = url.searchParams.get('code')?.trim().toUpperCase() ?? ''
  const email = url.searchParams.get('email')?.trim().toLowerCase() ?? ''
  const partRaw = url.searchParams.get('part') ?? '0'
  const part = Number.parseInt(partRaw, 10)

  const order = await getCommerceOrderByAccessCode(code, email)

  if (!order || order.productType !== 'ebook' || !canUseCommerceAccess(order)) {
    return NextResponse.json({ error: 'Kod jest nieprawidłowy albo wygasł.' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS })
  }

  let pdfFile: string | null = null

  if (order.meta.productKind === 'guide' && order.meta.productSlug) {
    const guide = getMaterialyGuideBySlug(order.meta.productSlug)
    pdfFile = guide?.pdfFile ?? null
  }

  if (order.meta.productKind === 'bundle' && order.meta.productSlug) {
    const bundle = getMaterialyBundleBySlug(order.meta.productSlug)
    const guideSlug = bundle?.guideSlugs[Number.isFinite(part) ? part : 0]
    const guide = guideSlug ? getMaterialyGuideBySlug(guideSlug) : null
    pdfFile = guide?.pdfFile ?? null
  }

  if (!pdfFile) {
    return NextResponse.json({ error: 'Materiał nie jest dostępny.' }, { status: 410, headers: PRIVATE_NO_STORE_HEADERS })
  }

  const filePath = safePdfPath(pdfFile)
  if (!filePath) {
    return NextResponse.json({ error: 'Niepoprawna ścieżka pliku.' }, { status: 500, headers: PRIVATE_NO_STORE_HEADERS })
  }

  let buffer: Buffer
  try {
    buffer = await fs.readFile(filePath)
  } catch {
    return NextResponse.json({ error: 'Plik PDF nie został znaleziony.' }, { status: 410, headers: PRIVATE_NO_STORE_HEADERS })
  }

  await recordCommerceAccessUse(order.orderNumber)

  return new NextResponse(buffer, {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="${pdfFile}"`,
      ...PRIVATE_NO_STORE_HEADERS,
    },
  })
}
