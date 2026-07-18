const DEFAULT_RETURN_PATH = '/pokoj'
const INTERNAL_ORIGIN = 'https://internal.regulskibehawiorysta.invalid'
const MAX_RETURN_PATH_LENGTH = 2_048

function decodeForSafetyCheck(value: string): string | null {
  let decoded = value

  // URLSearchParams already decodes once. Repeating a few times also catches
  // encoded protocol-relative paths supplied directly to the API.
  for (let index = 0; index < 4; index += 1) {
    try {
      const next = decodeURIComponent(decoded)
      if (next === decoded) return decoded
      decoded = next
    } catch {
      return null
    }
  }

  return decoded
}

/**
 * Allows only a relative path that cannot be interpreted as another origin by
 * either the browser or the server URL parser. Keep this module browser-safe:
 * it is shared by the client account form and the registration endpoint.
 */
export function getSafeInternalReturnPath(value: unknown, fallback = DEFAULT_RETURN_PATH) {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_RETURN_PATH_LENGTH || value !== value.trim()) {
    return fallback
  }

  if (!value.startsWith('/') || value.startsWith('//')) {
    return fallback
  }

  const decoded = decodeForSafetyCheck(value)
  if (
    !decoded ||
    !decoded.startsWith('/') ||
    decoded.startsWith('//') ||
    decoded.includes('\\') ||
    /[\u0000-\u001F\u007F]/.test(decoded)
  ) {
    return fallback
  }

  try {
    const parsed = new URL(value, INTERNAL_ORIGIN)
    return parsed.origin === INTERNAL_ORIGIN ? value : fallback
  } catch {
    return fallback
  }
}
