const WHATSAPP_HOSTS = new Set(['wa.me', 'api.whatsapp.com'])

/**
 * Accept only a real HTTPS WhatsApp entry point. The value is optional until
 * the owner supplies the actual support number/link; an empty or invalid value
 * must never render a dead or misleading customer action.
 */
export function normalizeWhatsAppSupportUrl(value: string | null | undefined): string | null {
  const rawValue = value?.trim() ?? ''
  if (!rawValue) return null

  try {
    const parsed = new URL(rawValue)
    const hostname = parsed.hostname.toLowerCase()

    if (parsed.protocol !== 'https:' || !WHATSAPP_HOSTS.has(hostname)) return null
    if (hostname === 'wa.me' && parsed.pathname === '/') return null
    if (hostname === 'api.whatsapp.com' && !parsed.pathname.startsWith('/send')) return null

    return parsed.toString()
  } catch {
    return null
  }
}
