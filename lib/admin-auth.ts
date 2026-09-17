export const ADMIN_BASIC_AUTH_USERNAME = 'admin'
export const ADMIN_ACCESS_SECRET_ENV = 'ADMIN_ACCESS_SECRET'
export const ADMIN_BASIC_AUTH_REALM = 'Regulski Behawiorysta Admin'
export const ADMIN_SESSION_COOKIE = 'rb_admin_session'
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30

function readAdminAccessSecret(): string | null {
  const value = process.env[ADMIN_ACCESS_SECRET_ENV]?.trim()
  return value ? value : null
}

function decodeBase64(value: string): string | null {
  try {
    if (typeof atob === 'function') {
      return atob(value)
    }

    if (typeof Buffer !== 'undefined') {
      return Buffer.from(value, 'base64').toString('utf8')
    }

    return null
  } catch {
    return null
  }
}

function safeCompare(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false
  }

  let mismatch = 0

  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }

  return mismatch === 0
}

export function getAdminAccessSecret(): string | null {
  return readAdminAccessSecret()
}

export function hasValidAdminPassword(password: string | null | undefined, secret = readAdminAccessSecret()) {
  return Boolean(secret && password && safeCompare(password, secret))
}

function toBase64Url(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '')
}

async function signAdminSession(payload: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return toBase64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))))
}

export async function createAdminSessionToken(secret = readAdminAccessSecret()) {
  if (!secret) return null
  const expiresAt = Math.floor(Date.now() / 1000) + ADMIN_SESSION_TTL_SECONDS
  const payload = `v1.${expiresAt}`
  return `${payload}.${await signAdminSession(payload, secret)}`
}

export async function hasValidAdminSession(token: string | undefined, secret = readAdminAccessSecret()) {
  if (!secret || !token) return false
  const [version, expiresAtRaw, signature, ...extra] = token.split('.')
  const expiresAt = Number(expiresAtRaw)
  if (version !== 'v1' || extra.length || !Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return false
  return safeCompare(signature, await signAdminSession(`v1.${expiresAt}`, secret))
}

export function getAdminAuthChallengeHeaders(): Record<string, string> {
  return {
    'WWW-Authenticate': `Basic realm="${ADMIN_BASIC_AUTH_REALM}", charset="UTF-8"`,
    'Cache-Control': 'no-store',
  }
}

export function hasValidAdminAuthorization(authHeader: string | null, secret = readAdminAccessSecret()): boolean {
  if (!secret || !authHeader || !authHeader.startsWith('Basic ')) {
    return false
  }

  const encoded = authHeader.slice('Basic '.length).trim()
  const decoded = decodeBase64(encoded)

  if (!decoded) {
    return false
  }

  const separatorIndex = decoded.indexOf(':')

  if (separatorIndex === -1) {
    return false
  }

  const username = decoded.slice(0, separatorIndex)
  const password = decoded.slice(separatorIndex + 1)

  return safeCompare(username, ADMIN_BASIC_AUTH_USERNAME) && safeCompare(password, secret)
}
