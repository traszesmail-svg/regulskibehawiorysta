import { redirect } from 'next/navigation'
import { appendSearchParams } from '@/lib/booking-routing'

function readSearchParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

export default async function LegacyConfirmPage(
  props: {
    searchParams?: Promise<Record<string, string | string[] | undefined>>
  }
) {
  const searchParams = await props.searchParams;
  const id = readSearchParam(searchParams?.id)

  if (id) {
    redirect(appendSearchParams(`/confirmation?bookingId=${encodeURIComponent(id)}`, searchParams, ['id']))
  }

  redirect(appendSearchParams('/book', searchParams, ['id']))
}
