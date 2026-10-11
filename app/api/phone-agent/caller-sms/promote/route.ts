import { NextRequest } from 'next/server'
import { handleCallerSmsPromoteRequest } from '@/lib/server/caller-sms-promote-handler'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: NextRequest) {
  return handleCallerSmsPromoteRequest(request)
}
