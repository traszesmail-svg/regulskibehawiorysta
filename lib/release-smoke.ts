import { BUILD_MARKER_KEY } from '@/lib/build-marker'

export type ReleaseSmokeRule = {
  path: string
  expectedRedirectTo?: string
  expectedRedirectStatus?: number
  required?: string[]
  forbidden?: string[]
  forbiddenRaw?: string[]
  ordered?: string[]
  requireBuildMarker?: boolean
}

export type ReleaseSmokeResult = {
  rule: ReleaseSmokeRule
  url: string
  ok: boolean
  visibleText: string
  buildMarker: string | null
  missing: string[]
  forbiddenFound: string[]
  forbiddenRawFound: string[]
  orderFailures: string[]
}

export type ReleaseSmokeRedirectResult = {
  ok: boolean
  expectedStatus: number
  actualStatus: number
  target: string | null
  issues: string[]
}

function decodeHtmlEntities(input: string) {
  return input
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
}

export function normalizeReleaseSmokeText(input: string) {
  return decodeHtmlEntities(input).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
}

export function extractVisibleTextFromHtml(html: string) {
  const withoutNoise = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')

  return normalizeReleaseSmokeText(withoutNoise)
}

export function extractBuildMarkerFromHtml(html: string) {
  const doubleQuoted = html.match(/data-build-marker="([^"]+)"/i)
  if (doubleQuoted?.[1]) {
    return doubleQuoted[1]
  }

  const singleQuoted = html.match(/data-build-marker='([^']+)'/i)
  return singleQuoted?.[1] ?? null
}

function findPhraseIndex(text: string, phrase: string): number {
  return normalizeReleaseSmokeText(text).indexOf(normalizeReleaseSmokeText(phrase))
}

function findRawPhraseIndex(text: string, phrase: string): number {
  return text.toLowerCase().indexOf(phrase.toLowerCase())
}

export function buildExpectedMarker(branch: string, commit: string) {
  return `${BUILD_MARKER_KEY}:${branch}:${commit}`
}

export function evaluateReleaseSmokeRedirect(
  sourceUrl: string,
  rule: ReleaseSmokeRule,
  status: number,
  location: string | null,
): ReleaseSmokeRedirectResult {
  const expectedStatus = rule.expectedRedirectStatus ?? 301
  const issues: string[] = []

  if (!rule.expectedRedirectTo) {
    issues.push('missing expected redirect destination')
    return { ok: false, expectedStatus, actualStatus: status, target: null, issues }
  }

  if (status !== expectedStatus) {
    issues.push(`HTTP ${status}, expected redirect ${expectedStatus}`)
  }

  if (!location) {
    issues.push('redirect Location missing')
    return { ok: false, expectedStatus, actualStatus: status, target: null, issues }
  }

  let source: URL
  let target: URL
  let expected: URL

  try {
    source = new URL(sourceUrl)
    target = new URL(location, source)
    expected = new URL(rule.expectedRedirectTo, source)
  } catch {
    issues.push(`invalid redirect Location: ${location}`)
    return { ok: false, expectedStatus, actualStatus: status, target: null, issues }
  }

  if (target.origin !== source.origin) {
    issues.push(`redirect origin ${target.origin}, expected ${source.origin}`)
  }

  if (target.pathname !== expected.pathname) {
    issues.push(`redirect target ${target.pathname}${target.search}, expected ${expected.pathname}${expected.search}`)
  }

  if (expected.search && target.search !== expected.search) {
    issues.push(`redirect query ${target.search || '(empty)'}, expected ${expected.search}`)
  }

  return {
    ok: issues.length === 0,
    expectedStatus,
    actualStatus: status,
    target: `${target.pathname}${target.search}`,
    issues,
  }
}

export function evaluateReleaseSmokePage(html: string, baseUrl: string, rule: ReleaseSmokeRule): ReleaseSmokeResult {
  const visibleText = extractVisibleTextFromHtml(html)
  const buildMarker = extractBuildMarkerFromHtml(html)
  const missing = (rule.required ?? []).filter((phrase) => findPhraseIndex(visibleText, phrase) === -1)
  const forbiddenFound = (rule.forbidden ?? []).filter((phrase) => findPhraseIndex(visibleText, phrase) > -1)
  const forbiddenRawFound = (rule.forbiddenRaw ?? []).filter((phrase) => findRawPhraseIndex(html, phrase) > -1)
  const orderFailures: string[] = []

  let lastIndex = -1
  for (const phrase of rule.ordered ?? []) {
    const currentIndex = findPhraseIndex(visibleText, phrase)

    if (currentIndex === -1) {
      orderFailures.push(`missing ordered phrase: ${phrase}`)
      continue
    }

    if (currentIndex < lastIndex) {
      orderFailures.push(`wrong order around: ${phrase}`)
    }

    lastIndex = currentIndex
  }

  if (rule.requireBuildMarker && !buildMarker) {
    missing.push('data-build-marker')
  }

  return {
    rule,
    url: new URL(rule.path, baseUrl).toString(),
    ok: missing.length === 0 && forbiddenFound.length === 0 && forbiddenRawFound.length === 0 && orderFailures.length === 0,
    visibleText,
    buildMarker,
    missing,
    forbiddenFound,
    forbiddenRawFound,
    orderFailures,
  }
}

export function getDefaultReleaseSmokeRules(): ReleaseSmokeRule[] {
  return [
    {
      path: '/',
      required: [
        'Masz problem z zachowaniem psa lub kota?',
        'Zapytaj behawiorystę.',
        'Do 15 minut',
        'Płatna rozmowa',
      ],
      forbiddenRaw: ['href="tel:', "href='tel:"],
      requireBuildMarker: true,
    },
    {
      path: '/cennik',
      expectedRedirectTo: '/zapytaj',
      expectedRedirectStatus: 301,
    },
    {
      path: '/behawiorysta-online-polska',
      expectedRedirectTo: '/',
      expectedRedirectStatus: 301,
      required: [
        'Masz problem z zachowaniem psa lub kota?',
        'Zapytaj behawiorystę.',
      ],
      forbiddenRaw: ['href="tel:', "href='tel:"],
      requireBuildMarker: true,
    },
    {
      path: '/termin?problem=szczeniak',
      expectedRedirectTo: '/zapytaj',
      expectedRedirectStatus: 301,
    },
    {
      path: '/mapa-sprawy',
      required: ['Uporządkuj sytuację psa lub kota krok po kroku', 'Zacznij Mapę zachowania'],
      forbidden: ['Szybka mapa', 'Pełniejsza mapa', 'Jedna decyzja', 'Mapa do zakupu konsultacji', 'Mapa → zakup'],
      requireBuildMarker: true,
    },
    {
      path: '/polityka-prywatnosci',
      required: ['Polityka prywatności', 'Publiczny kontakt', 'formularz i e-mail'],
      forbiddenRaw: ['href="tel:', "href='tel:"],
      requireBuildMarker: true,
    },
  ]
}
