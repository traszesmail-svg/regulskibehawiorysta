import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'

function readSource(...segments: string[]) {
  return readFileSync(path.join(process.cwd(), ...segments), 'utf8')
}

test('stage 3b keeps the fallback analytics banner delayed on desktop and scroll-gated on compact viewports', () => {
  const consentSource = readSource('components', 'AnalyticsConsent.tsx')
  const globalsSource = readSource('app', 'globals.css')

  assert.match(consentSource, /const FALLBACK_BANNER_DELAY_MS = 1400/)
  assert.match(consentSource, /const FALLBACK_BANNER_SCROLL_OFFSET = 64/)
  assert.match(consentSource, /const FALLBACK_BANNER_COMPACT_SCROLL_OFFSET = 200/)
  assert.match(consentSource, /const FALLBACK_BANNER_COMPACT_VIEWPORT_QUERY = '\(max-width: 540px\)'/)
  assert.match(
    consentSource,
    /const shouldShowFallbackBanner =\s*!isInternalPath && !isCaseMapPath && !isAccountPrivacyPath && !hasCookiebot && Boolean\(measurementId\) && consent === 'unset'/,
  )
  assert.match(consentSource, /window\.matchMedia\(FALLBACK_BANNER_COMPACT_VIEWPORT_QUERY\)\.matches/)
  assert.match(consentSource, /const scrollOffset = isCompactViewport\s+\? FALLBACK_BANNER_COMPACT_SCROLL_OFFSET\s+\: FALLBACK_BANNER_SCROLL_OFFSET/)
  assert.match(consentSource, /const timeoutId = isCompactViewport \? null : window\.setTimeout\(revealBanner, FALLBACK_BANNER_DELAY_MS\)/)
  assert.match(consentSource, /window\.scrollY > scrollOffset/)
  assert.match(consentSource, /data-consent-banner="fallback"/)
  assert.match(consentSource, /Analityka po Twojej zgodzie/)

  assert.match(globalsSource, /body\[data-consent-banner-visible='true'\]/)
  assert.match(globalsSource, /\.consent-banner \{/)
  assert.match(globalsSource, /position: fixed;/)
  assert.match(globalsSource, /width: min\(420px, calc\(100vw - 28px\)\);/)
  assert.match(globalsSource, /\.consent-actions \{/)
  assert.match(globalsSource, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/)
  assert.match(globalsSource, /@media \(max-width: 540px\)/)
})
