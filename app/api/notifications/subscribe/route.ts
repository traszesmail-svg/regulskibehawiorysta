export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    {
      error:
        'Powiadomienia SMS i WhatsApp są wyłączone dla nowych zapisów. Skorzystaj z formularza kontaktowego albo newslettera e-mail.',
    },
    { status: 410 },
  )
}
