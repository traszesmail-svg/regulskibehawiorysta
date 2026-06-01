import { createHmac, timingSafeEqual } from 'node:crypto'
import { getAdminAccessSecret } from '@/lib/admin-auth'

const ADMIN_PUSH_TOKEN_PURPOSE = 'regulski-owner-push-subscribe-v1'

export function createAdminPushToken(): string | null {
  const secret = getAdminAccessSecret()

  if (!secret) {
    return null
  }

  return createHmac('sha256', secret).update(ADMIN_PUSH_TOKEN_PURPOSE).digest('base64url')
}

export function hasValidAdminPushToken(token: string | null | undefined): boolean {
  const expected = createAdminPushToken()

  if (!expected || !token) {
    return false
  }

  const left = Buffer.from(token)
  const right = Buffer.from(expected)

  return left.length === right.length && timingSafeEqual(left, right)
}
