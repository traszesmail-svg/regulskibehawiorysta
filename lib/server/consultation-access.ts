import { randomBytes } from 'node:crypto'
import { hashCustomerAccessToken } from '@/lib/server/customer-access'

export const CONSULTATION_ACCESS_WINDOW_DAYS = 30

export function normalizeConsultationAccessCode(value: string | null | undefined) {
  return (value ?? '').trim().toUpperCase().replace(/\s+/g, '')
}

export function hashConsultationAccessCode(value: string) {
  return hashCustomerAccessToken(normalizeConsultationAccessCode(value))
}

export function createConsultationAccessCode() {
  const rawCode = `RB-${randomBytes(5).toString('hex').toUpperCase()}`

  return {
    rawCode,
    codeHash: hashConsultationAccessCode(rawCode),
  }
}

export function getConsultationAccessExpiry(now = new Date()) {
  return new Date(now.getTime() + CONSULTATION_ACCESS_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()
}

export function isConsultationAccessValid(expiresAt: string | null | undefined, usedAt?: string | null) {
  return !usedAt && Boolean(expiresAt) && Date.parse(expiresAt as string) > Date.now()
}
