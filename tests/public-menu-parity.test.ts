import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const read = (...segments: string[]) => readFileSync(path.join(process.cwd(), ...segments), 'utf8')

test('public pages resolve one canonical topbar CTA and utility set', () => {
  const source = read('components', 'NotatnikA.tsx')

  assert.match(source, /PUBLIC_SITE_TOPBAR_CTA = \{\s*href: '\/mapa-sprawy',\s*label: 'Mapa zachowania'/)
  assert.match(source, /profile = 'site'/)
  assert.match(source, /profile === 'site' \? PUBLIC_SITE_TOPBAR_CTA\.href/)
  assert.match(source, /profile === 'site' \? PUBLIC_SITE_TOPBAR_CTA\.label/)
  assert.match(source, /profile === 'site' \? true : showUtilityLinks/)
  assert.match(source, /data-topbar-profile=\{profile\}/)
})

test('transactional routes explicitly retain their contextual topbar profile', () => {
  const pageShellRoutes = [
    ['app', 'konto', 'page.tsx'],
    ['app', 'oczekiwanie', '[orderNumber]', 'page.tsx'],
    ['app', 'pokoj', 'page.tsx'],
    ['app', 'platnosc', 'blik', '[orderNumber]', 'page.tsx'],
    ['app', 'dostep', 'page.tsx'],
    ['app', 'login', 'page.tsx'],
  ]

  for (const route of pageShellRoutes) {
    assert.match(read(...route), /topbarProfile="flow"/, `${route.join('/')} should use the flow topbar`)
  }

  assert.match(read('app', 'form', 'page.tsx'), /profile="flow"/)
  assert.match(read('components', 'PaymentReferenceLayout.tsx'), /profile="flow"/)
})

test('final CSS contract restores desktop navigation and mobile hamburger consistently', () => {
  const css = read('app', 'notatnik-a.css')
  const canonicalStart = css.lastIndexOf('/* Canonical top menu.')
  const legacyDesktopHide = css.lastIndexOf('.notatnik-page .notatnik-nav {\n  display: none!important')

  assert.ok(canonicalStart > legacyDesktopHide, 'canonical menu rules must come after legacy route overrides')
  const canonicalCss = css.slice(canonicalStart)

  assert.match(canonicalCss, /@media \(min-width: 1180px\)[\s\S]*?\.notatnik-nav,[\s\S]*?display: flex !important/)
  assert.match(canonicalCss, /@media \(min-width: 1180px\)[\s\S]*?\.notatnik-mobile-menu[\s\S]*?display: none !important/)
  assert.match(canonicalCss, /@media \(max-width: 1179px\)[\s\S]*?\.notatnik-nav,[\s\S]*?display: none !important/)
  assert.match(canonicalCss, /@media \(max-width: 1179px\)[\s\S]*?\.notatnik-mobile-menu[\s\S]*?display: block !important/)
})
