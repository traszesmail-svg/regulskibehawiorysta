import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ContactPage from '@/app/kontakt/page'
import OpinionsPage from '@/app/opinie/page'
import generateRobots from '@/app/robots'
import { Footer } from '@/components/Footer'
import { SocialSection } from '@/components/SocialSection'
import { SocialProofSection } from '@/components/SocialProofSection'
import { buildBookHref, buildFormHref, buildPaymentHref, buildSlotHref, readClinicFlowSearchParam, readQaBookingSearchParam } from '@/lib/booking-routing'
import { BUILD_MARKER_KEY } from '@/lib/build-marker'
import { evaluateReleaseSmokeRedirect, getDefaultReleaseSmokeRules } from '@/lib/release-smoke'
import { getOrganizationJsonLd } from '@/lib/schema'
import { CAPBT_ORG_URL, INSTAGRAM_PROFILE_URL, SITE_PRODUCTION_URL } from '@/lib/site'
import { buildBookMetadata, buildHomeMetadata } from '@/lib/seo'
import { getDeployReadinessChecks, getGoLiveChecks, getVerifiedDeployReadinessChecks } from '@/lib/server/go-live'
import { getPaymentModeStatus } from '@/lib/server/env'
import { getAccountLoginRedirectUrl } from '@/lib/server/account-auth'
import { getSafeInternalReturnPath } from '@/lib/safe-return-path'
import { createInMemoryRequestRateLimiter } from '@/lib/server/request-protection'
import { isCommerceTestModeAllowed } from '@/lib/server/commerce-service'
import { getQaCheckoutEligibility, getQaCheckoutPaymentReference, getPublicManualPaymentConfig } from '@/lib/server/payment-options'
import { getOnlinePaymentRuntime, getOnlinePaymentRuntimeForConsultation } from '@/lib/server/online-payments'
import { buildTodayUrgentSlotCandidates, isTodayUrgentSlotCandidate } from '@/lib/urgent-now'
import { auditSupabaseSchemaText, getSupabaseSchemaAudit } from '@/scripts/lib/schema-audit'
import { getDefaultProductionEnvSnapshotPath } from '@/scripts/lib/env-file'

function readSource(...parts: string[]) {
  return readFileSync(path.join(process.cwd(), ...parts), 'utf8')
}

function countMatches(source: string, pattern: RegExp) {
  return Array.from(source.matchAll(pattern)).length
}

test('kwadrans na juz candidates stay on today between the next half-hour and 18:00', () => {
  const slots = buildTodayUrgentSlotCandidates(new Date('2026-05-15T13:17:00+02:00'))

  assert.deepEqual(
    slots.map((slot) => slot.id),
    [
      '2026-05-15-13:30',
      '2026-05-15-14:00',
      '2026-05-15-14:30',
      '2026-05-15-15:00',
      '2026-05-15-15:30',
    ],
  )
  assert.equal(isTodayUrgentSlotCandidate('2026-05-15', '14:00', new Date('2026-05-15T13:17:00+02:00')), true)
  assert.equal(isTodayUrgentSlotCandidate('2026-05-16', '14:00', new Date('2026-05-15T13:17:00+02:00')), false)
})

test('kwadrans na juz candidates never roll into tomorrow after 18:00', () => {
  assert.deepEqual(
    buildTodayUrgentSlotCandidates(new Date('2026-05-15T17:40:00+02:00')).map((slot) => slot.id),
    ['2026-05-15-18:00'],
  )
  assert.deepEqual(buildTodayUrgentSlotCandidates(new Date('2026-05-15T18:01:00+02:00')), [])
})

function withEnv(
  overrides: Record<string, string | null | undefined>,
  run: () => void | Promise<void>,
) {
  const previous = new Map<string, string | undefined>()
  const restore = () => {
    for (const [key, value] of previous.entries()) {
      if (typeof value === 'string') {
        process.env[key] = value
      } else {
        delete process.env[key]
      }
    }
  }

  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, process.env[key])

    if (typeof value === 'string') {
      process.env[key] = value
    } else {
      delete process.env[key]
    }
  }

  const result = run()

  if (result && typeof (result as Promise<void>).then === 'function') {
    return (result as Promise<void>).finally(restore)
  }

  restore()
}

test.skip('home hero stays short and decision-first', () => {
  const source = readSource('app', 'page.tsx')

  assert.match(source, /Najpierw porządek\. Potem zmiana\./)
  assert.match(source, /Jedna spokojna rozmowa wystarcza/)
  assert.match(source, /PDF będzie drugim krokiem, a nie pierwszym skrótem\./)
  assert.match(source, /15 minut na start/)
  assert.match(source, /PDF jako spokojny drugi krok/)
  assert.match(source, /30 min \/ pełna jako upgrade/)
  assert.match(source, /editorial-hero-grid/)
  assert.match(source, /editorial-entry-grid/)
  assert.match(source, /editorial-process-layout/)
  assert.match(source, /editorial-final-panel/)
  assert.match(source, /FUNNEL_PRIMARY_HREF/)
  assert.match(source, /FUNNEL_SECONDARY_LABEL/)
  assert.match(source, /FUNNEL_UPGRADE_LABEL/)
  assert.doesNotMatch(source, /Zacznij od PDF/)
  assert.doesNotMatch(source, /PDF jako nurture/)
})

test.skip('home hero uses the approved cutover assets', () => {
  const homeSource = readSource('app', 'page.tsx')
  const casesSource = JSON.parse(readSource('content', 'cases.json')) as Array<{ id: string; images: Array<{ src: string; alt: string }> }>
  const realCasesLoaderSource = readSource('lib', 'real-case-studies.ts')
  const headerSource = readSource('components', 'Header.tsx')
  const siteSource = readSource('lib', 'site.ts')

  assert.match(homeSource, /\/branding\/omnie-hero\.webp/)
  assert.match(homeSource, /editorial-home-page/)
  assert.match(homeSource, /editorial-hero-grid/)
  assert.match(homeSource, /editorial-entry-grid/)
  assert.match(homeSource, /editorial-process-layout/)
  assert.match(homeSource, /editorial-final-panel/)
  assert.match(realCasesLoaderSource, /cases\.json/)
  assert.equal(casesSource.length, 10)
  assert.equal(casesSource.every((caseStudy) => caseStudy.images.length === 2), true)
  assert.match(siteSource, /HOME_HERO_PHOTO/)
  assert.match(siteSource, /dog-puppy-home\.png/)
  assert.match(siteSource, /dog-kitchen-chaos\.png/)
  assert.match(siteSource, /home-cat-hidden\.png/)
  assert.match(siteSource, /home-help-stress\.png/)
  assert.doesNotMatch(siteSource, /specialist-krzysztof-portrait\.jpg/)
  assert.match(siteSource, /HOME_HELP_CHOICE_PHOTO/)
  assert.match(headerSource, /COAPE_LOGO/)
  assert.match(headerSource, /brand-sigil-svg/)
  assert.doesNotMatch(headerSource, /Krzysztof Regulski/)
  assert.match(headerSource, /brand-mark-coape/)
})

test.skip('home and opinions pages surface real social proof and local SEO', async () => {
  const homeSource = readSource('app', 'page.tsx')
  const opinionsSource = readSource('app', 'opinie', 'page.tsx')
  const homeMetadata = await buildHomeMetadata()
  const opinionsMarkup = renderToStaticMarkup(createElement(OpinionsPage))
  const socialPreviewMarkup = renderToStaticMarkup(createElement(SocialProofSection, { showSubmissionForm: false }))
  const socialFullMarkup = renderToStaticMarkup(createElement(SocialProofSection))

  assert.doesNotMatch(homeSource, /SocialProofSection/)
  assert.doesNotMatch(homeSource, /showSubmissionForm=\{false\}/)
  assert.match(opinionsSource, /SocialProofSection/)
  assert.match(opinionsSource, /buildMarketingMetadata/)
  assert.match(String(homeMetadata.openGraph?.siteName ?? ''), /Regulski \| Terapia behawioralna/)
  assert.match(opinionsMarkup, /real-case-grid/)
  assert.match(opinionsMarkup, /Historie opiekunów i efekty konsultacji/)
  assert.equal(countMatches(opinionsMarkup, /real-case-card/g), 10)
  assert.equal(countMatches(opinionsMarkup, /real-case-gallery-item/g), 20)
  assert.match(opinionsMarkup, /Dodaj swoją opinię do ręcznej weryfikacji/)
  assert.match(socialPreviewMarkup, /Historie opiekunów i efekty konsultacji/)
  assert.equal(countMatches(socialPreviewMarkup, /real-case-card/g), 10)
  assert.match(socialPreviewMarkup, /Publiczne źródła/)
  assert.match(socialPreviewMarkup, /Magazyn Weterynaryjny/)
  assert.match(socialPreviewMarkup, /Zobacz pełną sekcję opinii/)
  assert.match(socialFullMarkup, /Dodaj swoją opinię do ręcznej weryfikacji/)
  assert.match(socialFullMarkup, /Publiczne źródła/)
})

test('opinions page keeps dog cat depth, expandable reviews and upload form hooks', () => {
  const opinionsSource = readSource('app', 'opinie', 'page.tsx')
  const reviewsDataSource = readSource('lib', 'opinion-reviews.ts')
  const gridSource = readSource('components', 'OpinionsReviewGrid.tsx')
  const carouselSource = readSource('components', 'FinalReviewsQuoteCarousel.tsx')
  const footerSource = readSource('components', 'Footer.tsx')
  const addOpinionSource = readSource('app', 'opinie', 'dodaj', 'page.tsx')
  const uiSmokeSource = readSource('scripts', 'ui-smoke.ts')
  const cssSource = readSource('app', 'globals.css')
  const dogReviewCount = countMatches(reviewsDataSource, /categories:\s*\[[^\]]*'Pies'/g)
  const catReviewCount = countMatches(reviewsDataSource, /categories:\s*\[[^\]]*'Kot'/g)

  assert.equal(dogReviewCount >= 10, true)
  assert.equal(catReviewCount >= 10, true)
  assert.doesNotMatch(opinionsSource, /Anonimowe sytuacje startowe|opinions-case-snippets|REAL_CASE_STUDIES/)
  assert.match(gridSource, /data-opinion-filter/)
  assert.match(gridSource, /data-opinion-review/)
  assert.match(gridSource, /data-review-species/)
  assert.match(gridSource, /aria-expanded=\{isExpanded\}/)
  assert.match(gridSource, /Historie, które pokazują, jak zaczyna się spokojniejsza codzienność/)
  assert.match(uiSmokeSource, /Historie, które pokazują, jak zaczyna się spokojniejsza codzienność/)
  assert.match(carouselSource, /href="\/opinie"/)
  assert.match(carouselSource, /Math\.random\(\)/)
  assert.match(footerSource, /intervalMs=\{6000\}/)
  assert.match(cssSource, /\.opinions-story-photo::before\s*\{\s*content:\s*none/)
  assert.match(cssSource, /add-opinion-brand-card/)
  assert.match(addOpinionSource, /REGULSKI_WEB_BADGE_LOGO/)
  assert.match(addOpinionSource, /data-opinion-form="submit"/)
  assert.match(addOpinionSource, /data-opinion-photo-input="true"/)
  assert.match(addOpinionSource, /formData\.append\('photo', photoFile\)/)
  assert.doesNotMatch(addOpinionSource, /photoUrl/)
})

test('UI smoke keeps current public opinions and blog headings', () => {
  const uiSmokeSource = readSource('scripts', 'ui-smoke.ts')
  const blogSource = readSource('app', 'blog', 'page.tsx')
  const opinionsGridSource = readSource('components', 'OpinionsReviewGrid.tsx')

  assert.match(blogSource, /Wiedza, która pomaga spokojniej żyć z psem i kotem/)
  assert.match(opinionsGridSource, /Historie, które pokazują, jak zaczyna się spokojniejsza codzienność/)
  assert.match(uiSmokeSource, /Wiedza, która pomaga spokojniej żyć z psem i kotem/)
  assert.match(uiSmokeSource, /Historie, które pokazują, jak zaczyna się spokojniejsza codzienność/)
})

test('root layout metadata base is derived from the canonical runtime base url helper', () => {
  const layoutSource = readSource('app', 'layout.tsx')

  assert.match(layoutSource, /getCanonicalBaseUrl\(\)/)
  assert.doesNotMatch(layoutSource, /http:\/\/localhost:3000/)
})

test('home metadata stays service-first while keeping the canonical homepage path', async () => {
  const metadata = await buildHomeMetadata()
  const titleValue = metadata.title
  const title = typeof titleValue === 'string' ? titleValue : titleValue && 'absolute' in titleValue ? titleValue.absolute : null

  assert.equal(title, 'Regulski Behawiorysta | Konsultacje behawioralne psów i kotów')
  assert.equal(metadata.alternates?.canonical, '/')
  assert.match(String(metadata.description ?? ''), /Krótkie konsultacje behawioralne/)
  assert.match(String(metadata.openGraph?.title ?? ''), /Regulski Behawiorysta/)
})

test('book metadata is indexable and keeps the canonical booking path', async () => {
  const metadata = await buildBookMetadata()
  const robots = typeof metadata.robots === 'object' && metadata.robots !== null ? metadata.robots : null

  assert.equal(metadata.alternates?.canonical, '/book')
  assert.equal(robots, null)
  assert.match(String(metadata.title ?? ''), /Rezerwacja Kwadransa behawioralnego/)
})

test('case map metadata keeps its own canonical public path', () => {
  const mapSource = readSource('app', 'mapa-sprawy', 'page.tsx')

  assert.match(mapSource, /alternates:\s*\{\s*canonical:\s*'\/mapa-sprawy'/)
})

test('anonymous account pages do not probe the protected account endpoint without a session cookie', () => {
  const accountRoomSource = readSource('components', 'AccountRoomApp.tsx')
  const roomPageSource = readSource('app', 'pokoj', 'page.tsx')
  const accountPageSource = readSource('app', 'konto', 'page.tsx')

  assert.match(accountRoomSource, /initialSessionHint\?: boolean/)
  assert.match(accountRoomSource, /useState\(initialSessionHint\)/)
  assert.match(accountRoomSource, /if \(!initialSessionHint\) \{\s*setLoading\(false\)\s*return/)
  assert.match(roomPageSource, /cookies\(\)/)
  assert.match(roomPageSource, /ACCOUNT_ACCESS_COOKIE/)
  assert.match(roomPageSource, /<AccountRoomApp initialSessionHint=\{initialSessionHint\}/)
  assert.match(accountPageSource, /cookies\(\)/)
  assert.match(accountPageSource, /ACCOUNT_REFRESH_COOKIE/)
  assert.match(accountPageSource, /initialSessionHint=\{initialSessionHint\}/)
})

test('account confirmation redirects use the canonical app URL and establish the account cookie session', () => {
  const accountAuthSource = readSource('lib', 'server', 'account-auth.ts')
  const registerSource = readSource('app', 'api', 'account', 'auth', 'register', 'route.ts')
  const resetSource = readSource('app', 'api', 'account', 'auth', 'reset', 'route.ts')
  const leadConfirmationSource = readSource('app', 'api', 'admin', 'lead-bookings', '[id]', 'confirm-payment', 'route.ts')
  const formSource = readSource('components', 'AccountAuthForm.tsx')
  const confirmationRouteSource = readSource('app', 'api', 'account', 'auth', 'confirm', 'route.ts')

  assert.match(accountAuthSource, /new URL\('\/login', getBaseUrl\(\)\)/)
  assert.match(accountAuthSource, /supabase\.auth\.setSession/)
  assert.match(registerSource, /getAccountLoginRedirectUrl\(returnTo\)/)
  assert.doesNotMatch(registerSource, /headers\.get\('origin'\)/)
  assert.match(resetSource, /getAccountLoginRedirectUrl\(\)/)
  assert.match(leadConfirmationSource, /getAccountLoginRedirectUrl\(\)/)
  assert.match(formSource, /type === 'signup'/)
  assert.match(formSource, /refresh_token/)
  assert.match(formSource, /\/api\/account\/auth\/confirm/)
  assert.match(confirmationRouteSource, /confirmAccountSession/)
  assert.match(confirmationRouteSource, /setAccountSessionCookies/)

  withEnv(
    {
      VERCEL_ENV: 'production',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    },
    () => {
      assert.equal(getAccountLoginRedirectUrl('/pokoj'), 'https://regulskibehawiorysta.pl/login?returnTo=%2Fpokoj')
    },
  )
})

test('account return paths stay same-origin after query parsing and repeated URL decoding', () => {
  assert.equal(getSafeInternalReturnPath('/pokoj'), '/pokoj')
  assert.equal(getSafeInternalReturnPath('/mapa-sprawy?source=email'), '/mapa-sprawy?source=email')

  for (const unsafePath of [
    '//evil.example',
    '/\\evil.example',
    '/%5C%5Cevil.example',
    '/%2F%2Fevil.example',
    '/%252F%252Fevil.example',
    'https://evil.example',
    ' /pokoj',
  ]) {
    assert.equal(getSafeInternalReturnPath(unsafePath), '/pokoj')
  }
})

test('account and access request limiter is isolated by endpoint and client fingerprint', () => {
  const limiter = createInMemoryRequestRateLimiter()
  const policy = { key: 'account-login', limit: 2, windowMs: 60_000 }
  const firstClient = new Request('https://regulskibehawiorysta.pl/api/account/auth/login', {
    headers: { 'x-forwarded-for': '203.0.113.10' },
  })
  const secondClient = new Request('https://regulskibehawiorysta.pl/api/account/auth/login', {
    headers: { 'x-forwarded-for': '203.0.113.11' },
  })

  assert.deepEqual(limiter.consume(firstClient, policy, 1_000), { allowed: true })
  assert.deepEqual(limiter.consume(firstClient, policy, 1_001), { allowed: true })
  assert.deepEqual(limiter.consume(firstClient, policy, 1_002), { allowed: false, retryAfterSeconds: 60 })
  assert.deepEqual(limiter.consume(secondClient, policy, 1_002), { allowed: true })
  assert.deepEqual(limiter.consume(firstClient, policy, 61_001), { allowed: true })
})

test('account and access routes explicitly prevent private response storage', () => {
  const accountAuthRoutes = [
    readSource('app', 'api', 'account', 'auth', 'login', 'route.ts'),
    readSource('app', 'api', 'account', 'auth', 'register', 'route.ts'),
    readSource('app', 'api', 'account', 'auth', 'reset', 'route.ts'),
    readSource('app', 'api', 'account', 'auth', 'confirm', 'route.ts'),
    readSource('app', 'api', 'account', 'auth', 'update-password', 'route.ts'),
  ]
  const privateAccountRoutes = [
    readSource('app', 'api', 'account', 'me', 'route.ts'),
    readSource('app', 'api', 'account', 'messages', 'route.ts'),
    readSource('app', 'api', 'account', 'pet', 'route.ts'),
    readSource('app', 'api', 'account', 'case-maps', 'route.ts'),
  ]
  const accessRoutes = [
    readSource('app', 'api', 'access', 'verify', 'route.ts'),
    readSource('app', 'api', 'access', 'download', 'route.ts'),
  ]

  for (const routeSource of [...accountAuthRoutes, ...privateAccountRoutes, ...accessRoutes]) {
    assert.match(routeSource, /PRIVATE_NO_STORE_HEADERS/)
  }

  for (const routeSource of [...accountAuthRoutes, ...accessRoutes]) {
    assert.match(routeSource, /consumeRequestRateLimit/)
  }
})

test('release smoke validates the intentional legacy online-page redirect without following it', () => {
  const rule = getDefaultReleaseSmokeRules().find((item) => item.path === '/behawiorysta-online-polska')

  assert.equal(rule?.expectedRedirectTo, '/')
  assert.equal(rule?.expectedRedirectStatus, 301)
})

test('release redirect evaluator accepts a same-origin cache-busted redirect and rejects unsafe targets', () => {
  const rule = getDefaultReleaseSmokeRules().find((item) => item.path === '/behawiorysta-online-polska')
  assert.ok(rule)

  const passed = evaluateReleaseSmokeRedirect(
    'https://regulskibehawiorysta.pl/behawiorysta-online-polska?__release_smoke=1',
    rule,
    301,
    '/?__release_smoke=1',
  )
  assert.equal(passed.ok, true)
  assert.deepEqual(passed.issues, [])
  assert.equal(passed.target, '/?__release_smoke=1')

  const external = evaluateReleaseSmokeRedirect(
    'https://regulskibehawiorysta.pl/behawiorysta-online-polska',
    rule,
    301,
    'https://example.test/',
  )
  assert.equal(external.ok, false)
  assert.match(external.issues.join(' | '), /redirect origin/)

  const wrongStatus = evaluateReleaseSmokeRedirect(
    'https://regulskibehawiorysta.pl/behawiorysta-online-polska',
    rule,
    302,
    '/',
  )
  assert.equal(wrongStatus.ok, false)
  assert.match(wrongStatus.issues.join(' | '), /HTTP 302/)
})

test('home keeps animal category choices problem-first without price badges', () => {
  const selectorSource = readSource('components', 'HomepageServiceSelector.tsx')
  const introPopupSource = readSource('components', 'HomepageIntroPopup.tsx')
  const bookPageSource = readSource('app', 'book', 'page.tsx')
  const choicePageSource = readSource('app', 'wybor', 'page.tsx')
  const pricingPageSource = readSource('app', 'cennik', 'page.tsx')
  const pricingCssSource = readSource('app', 'notatnik-a.css')

  assert.match(selectorSource, /title: 'Mam psa'/)
  assert.match(selectorSource, /title: 'Mam kota'/)
  assert.match(selectorSource, /title: 'Nie wiem, co wybrać'/)
  assert.doesNotMatch(selectorSource, /Umów pierwszy krok 69 zł/)
  assert.match(selectorSource, /href="\/kwadrans-na-juz"/)
  assert.match(selectorSource, /Znajdź termin dla spraw pilnych!/)
  assert.doesNotMatch(selectorSource, /router-choice-price/)
  assert.doesNotMatch(selectorSource, /od 69 z/)
  assert.match(introPopupSource, /To właściwe miejsce/)
  assert.match(introPopupSource, /Nie wiem, od czego zacząć/)
  assert.doesNotMatch(introPopupSource, /Ĺ|Ä|Ă|ďż˝/)
  assert.doesNotMatch(choicePageSource, /entryPriceLabel/)
  assert.doesNotMatch(choicePageSource, /pricingStrip/)
  assert.doesNotMatch(choicePageSource, /choicePrice/)
  assert.match(pricingPageSource, /pricing-2026-offer-action/)
  assert.match(pricingCssSource, /grid-template-columns: 72px minmax\(0, 1fr\) minmax\(156px, 172px\)/)
  assert.match(pricingCssSource, /\.router-urgent-cta\s*{[\s\S]*text-align: center/)
  assert.match(pricingCssSource, /\.router-urgent-cta span\s*{[\s\S]*width: 100%/)
  assert.match(bookPageSource, /generateMetadata/)
  assert.match(bookPageSource, /index: false/)
  assert.match(bookPageSource, /follow: true/)
})

test('audit priority fixes keep booking copy, no-js contact and technical SEO aligned', () => {
  const pricingPageSource = readSource('app', 'cennik', 'page.tsx')
  const pricingContentSource = readSource('app', 'cennik', 'pricing-page-content.tsx')
  const blogCostSource = readSource('content', 'blog-mvp', '12-wpis-ile-kosztuje-konsultacja-behawioralna.md')
  const bookingCalendarSource = readSource('components', 'BookingSlotCalendar.tsx')
  const formatSource = readSource('app', 'format-konsultacji', 'page.tsx')
  const contactFormSource = readSource('components', 'ContactLeadForm.tsx')
  const nextConfigSource = readSource('next.config.mjs')

  assert.doesNotMatch(`${pricingPageSource}\n${pricingContentSource}`, /Kwadrans priorytetowy/)
  assert.match(`${pricingPageSource}\n${pricingContentSource}`, /Kwadrans na już/)
  assert.match(pricingPageSource, /Potwierdzenie płatności na życzenie/)
  assert.match(pricingPageSource, /Link do rozmowy po potwierdzeniu płatności/)

  assert.doesNotMatch(blogCostSource, /Pełna godzinna konsultacja|od razu godzinna konsultacja/)
  assert.match(blogCostSource, /około 2h/)
  assert.match(blogCostSource, /około 2-godzinna konsultacja/)

  assert.match(bookingCalendarSource, /Kiedy termin jest pewny\?/)
  assert.match(bookingCalendarSource, /Jitsi albo pokoju rozmowy/)
  assert.match(bookingCalendarSource, /obsługi w godzinach 9-21/)
  assert.match(bookingCalendarSource, /\) : null}\s*<section className="termin-bottom-section compact-home-section">/)
  assert.doesNotMatch(bookingCalendarSource, /Po rezerwacji dostaniesz krótkie potwierdzenie i dalsze kroki mailowo/)

  assert.match(formatSource, /buildTechnicalMetadata/)
  assert.match(formatSource, /noIndex: true/)
  assert.match(formatSource, /follow: true/)

  assert.match(contactFormSource, /CONTACT_SUCCESS_MESSAGE/)
  assert.match(contactFormSource, /URGENT_CONTACT_SUCCESS_MESSAGE/)
  assert.match(contactFormSource, /initialStatus/)
  assert.match(contactFormSource, /action="\/api\/contact"/)

  assert.match(nextConfigSource, /X-Content-Type-Options/)
  assert.match(nextConfigSource, /Referrer-Policy/)
  assert.match(nextConfigSource, /Permissions-Policy/)
  assert.match(nextConfigSource, /X-Frame-Options/)
  assert.match(nextConfigSource, /Content-Security-Policy/)
})

test('organization schema uses the configured public contact email', () => {
  withEnv(
    {
      REGULSKI_CONTACT_EMAIL: 'kontakt+public@example.com',
    },
    () => {
      const schema = getOrganizationJsonLd() as { email?: string }

      assert.equal(schema.email, 'kontakt+public@example.com')
    },
  )
})

test('robots block all crawling outside production and expose sitemap on production', () => {
  withEnv(
    {
      VERCEL_ENV: 'preview',
      VERCEL_URL: 'preview-example.vercel.app',
    },
    () => {
      const previewRobots = generateRobots()

      assert.deepEqual(previewRobots, {
        rules: [
          {
            userAgent: '*',
            disallow: ['/'],
          },
        ],
      })
    },
  )

  withEnv(
    {
      VERCEL_ENV: 'production',
      VERCEL_URL: 'regulskibehawiorysta.pl',
    },
    () => {
      const productionRobots = generateRobots()

      assert.equal(productionRobots.sitemap, `${SITE_PRODUCTION_URL}/sitemap.xml`)
      assert.equal(productionRobots.host, SITE_PRODUCTION_URL)
    },
  )
})

test('service-page architecture keeps one broad online landing and redirects helper seo routes', () => {
  const growthLayerSource = readSource('lib', 'growth-layer.ts')
  const nextConfigSource = readSource('next.config.mjs')
  const uiSmokeSource = readSource('scripts', 'ui-smoke.ts')

  assert.match(growthLayerSource, /path: '\/'/)
  assert.match(growthLayerSource, /title: 'Behawiorysta psów i kotów online - cała Polska'/)
  assert.match(growthLayerSource, /href: '\/'/)

  assert.match(nextConfigSource, /source: '\/behawiorysta-psow'/)
  assert.match(nextConfigSource, /source: '\/behawiorysta-kotow'/)
  assert.match(nextConfigSource, /source: '\/psy'/)
  assert.match(nextConfigSource, /source: '\/koty'/)
  assert.match(nextConfigSource, /destination: '\/'/)

  assert.match(uiSmokeSource, /path: '\/behawiorysta-psow'/)
  assert.match(uiSmokeSource, /path: '\/behawiorysta-kotow'/)
  assert.match(uiSmokeSource, /verifyRedirectRoute\(page, '\/koty', '\/problemy', \/Mapa problemów\/i\)/)
  assert.match(uiSmokeSource, /verifyRedirectRoute\(page, '\/psy', '\/problemy', \/Mapa problemów\/i\)/)
  assert.match(uiSmokeSource, /if \(!hasExpectedDestination\(page\.url\(\)\)\)/)
})

test('copy governance keeps Kwadrans as the primary service name and format as supporting detail', () => {
  const copyGovernanceSource = readSource('lib', 'copy-governance.ts')
  const offerEntrySource = readSource('components', 'OfferEntrySection.tsx')
  const bookingServiceInfoCardSource = readSource('components', 'BookingServiceInfoCard.tsx')
  const contactSource = readSource('app', 'kontakt', 'page.tsx')
  const bookSource = readSource('app', 'book', 'page.tsx')
  const seoSource = readSource('lib', 'seo.ts')

  assert.match(copyGovernanceSource, /primary: '15-minutowa konsultacja behawioralna'/)
  assert.match(copyGovernanceSource, /primaryDescriptor: '15 min połączenia telefonicznego'/)
  assert.match(copyGovernanceSource, /primaryLead: '15-minutowa konsultacja behawioralna to połączenie telefoniczne/)

  assert.match(offerEntrySource, /COPY_SERVICE_NAMES\.primaryDescriptor/)
  assert.match(offerEntrySource, /Kwadrans zostaje nazwą usługi/)

  assert.match(bookingServiceInfoCardSource, /const isPhoneService = service\.mode === 'phone'/)
  assert.match(bookingServiceInfoCardSource, /połączenie telefoniczne/)
  assert.match(bookingServiceInfoCardSource, /Jitsi/)

  assert.match(contactSource, /Napisz krótko, co się dzieje/)
  assert.doesNotMatch(contactSource, /<h3>Kwadrans z behawiorysta<\/h3>/)
  assert.doesNotMatch(contactSource, /contact-booking-panel/)
  assert.match(bookSource, /BookingSlotCalendar/)
  assert.match(seoSource, /15-minutowego połączenia telefonicznego/)
})

test('book page keeps a distinct jump-to-form CTA for explicit services', () => {
  const bookSource = readSource('app', 'book', 'page.tsx')
  const seoSource = readSource('lib', 'seo.ts')
  const bookingCalendarSource = readSource('components', 'BookingSlotCalendar.tsx')
  const funnelSource = readSource('lib', 'funnel.ts')

  assert.match(bookSource, /import \{ BookingSlotCalendar \} from '@\/components\/BookingSlotCalendar'/)
  assert.match(bookSource, /return <BookingSlotCalendar searchParams=\{searchParams\} \/>/)
  assert.match(bookSource, /buildBookMetadata/)
  assert.match(seoSource, /path: '\/book'/)
  assert.match(bookingCalendarSource, /Dwóch kwadrans/)
  assert.match(funnelSource, /Pełna konsultacja/)
})

test('Mapa zachowania speaks to the owner instead of exposing internal funnel language', () => {
  const mapSource = readSource('components', 'ShortBehaviorMapFlow.tsx')
  const bookingFormSource = readSource('components', 'BookingForm.tsx')
  const accountAuthFormSource = readSource('components', 'AccountAuthForm.tsx')
  const analyticsConsentSource = readSource('components', 'AnalyticsConsent.tsx')
  const analyticsSource = readSource('lib', 'case-map-analytics.ts')
  const analyticsRouteSource = readSource('app', 'api', 'analytics', 'events', 'route.ts')
  const profileClaimStoreSource = readSource('lib', 'server', 'case-map-profile-claims.ts')
  const profileClaimMigrationSource = readSource(
    'supabase',
    'migrations',
    '20260717001_case_map_analytics_and_profile_claims.sql',
  )

  assert.match(mapSource, /Uporządkuj sytuację psa lub kota krok po kroku/)
  assert.match(mapSource, /Zbierzmy fakty\.<br \/>Potem wybierzmy krok\./)
  assert.match(mapSource, /Przygotowanie do rozmowy/)
  assert.match(mapSource, /Twoje odpowiedzi pozwolą nam od razu skupić się na sytuacji/)
  assert.match(mapSource, /Wybierz termin · Konsultacja 15 min/)
  assert.match(mapSource, /Najważniejsze odpowiedzi dołączymy do rezerwacji/)
  assert.match(mapSource, /Jeśli chcesz, Pełną Mapę możesz zapisać prywatnie w swoim Pokoju/)
  assert.doesNotMatch(mapSource, /Jedna decyzja na ekran/)
  assert.doesNotMatch(mapSource, /Mapa do zakupu konsultacji/)
  assert.doesNotMatch(mapSource, /gotowy brief do formularza zakupu/)
  assert.doesNotMatch(mapSource, /Gotowy brief zostanie dołączony do formularza zakupu/)
  assert.doesNotMatch(mapSource, /Mapa gotowa do zakupu konsultacji/)
  assert.doesNotMatch(mapSource, /Mapa → zakup/)
  assert.doesNotMatch(mapSource, /Pełną Mapę zachowasz prywatnie w swoim Pokoju po zalogowaniu/)
  assert.match(mapSource, /trackCaseMapPrivateAnalyticsEvent\('case_map_started'/)
  assert.match(mapSource, /trackCaseMapPrivateAnalyticsEvent\('case_map_completed'/)
  assert.match(mapSource, /trackCaseMapPrivateAnalyticsEvent\('case_map_offer_viewed'/)
  assert.match(mapSource, /trackCaseMapPrivateAnalyticsEvent\('case_map_service_clicked'/)
  assert.match(bookingFormSource, /saveCaseMapToProfile/)
  assert.match(bookingFormSource, /zgoda marketingowa ani udostępnienie pełnej Mapy specjaliście/)
  assert.match(analyticsSource, /case_map_booking_started/)
  assert.match(analyticsRouteSource, /normalizeCaseMapPrivateAnalyticsEvent/)
  assert.match(analyticsRouteSource, /const location = privateCaseMapEvent\s*\? null/)
  assert.match(analyticsConsentSource, /isCaseMapPath/)
  assert.match(analyticsConsentSource, /shouldShowFallbackBanner =\s*!isInternalPath && !isCaseMapPath/)
  assert.match(analyticsConsentSource, /ga-disable-\$\{measurementId\}/)
  assert.match(analyticsConsentSource, /!isGenericAnalyticsDisabledPath/)
  assert.match(analyticsConsentSource, /keepCaseMapOutOfSpaHistoryTracking/)
  assert.match(analyticsConsentSource, /addEventListener\('popstate'/)
  assert.match(profileClaimStoreSource, /CASE_MAP_PROFILE_CLAIM_TTL_DAYS = 30/)
  assert.match(profileClaimStoreSource, /user\.email_confirmed_at/)
  assert.match(profileClaimStoreSource, /claim_token_hash/)
  assert.match(accountAuthFormSource, /case-map-claim/)
  assert.match(accountAuthFormSource, /caseMapClaimToken/)
  assert.match(profileClaimMigrationSource, /regulski_delete_expired_case_map_profile_claims/)
  assert.match(profileClaimMigrationSource, /regulski-case-map-profile-claims-cleanup/)
  assert.match(profileClaimMigrationSource, /cron\.schedule/)
})

test('booking form intro follows the selected service instead of a generic booking lead', () => {
  const bookingFormSource = readSource('components', 'BookRequestForm.tsx')

  assert.match(bookingFormSource, /function getSelectedServiceIntro/)
  assert.match(bookingFormSource, /Wybrana rozmowa: \$\{option\.label\} \/ \$\{option\.price\}\./)
  assert.match(bookingFormSource, /30 min połączenia telefonicznego, gdy temat ma kilka wątków/)
  assert.match(bookingFormSource, /Około 2h przez Jitsi.*14 dni komunikacji/)
  assert.doesNotMatch(bookingFormSource, /PUBLIC_OFFER_BOOKING_LEAD/)
  assert.doesNotMatch(bookingFormSource, /PUBLIC_OFFER_BOOKING_REASSURANCE/)
})

test('home, dogs and cats pages keep canonical service routing and current entry layouts', () => {
  const homeSource = readSource('app', 'page.tsx')
  const nextConfigSource = readSource('next.config.mjs')
  const funnelActionsSource = readSource('components', 'FunnelPrimaryActions.tsx')
  const serviceDecisionSource = readSource('components', 'ServiceDecisionSection.tsx')

  assert.match(serviceDecisionSource, /strony usługi online/)
  assert.match(funnelActionsSource, /serviceHref\?: string/)
  assert.match(funnelActionsSource, /Jeśli chcesz najpierw zobaczyć pełny opis usługi/)

  assert.match(homeSource, /serviceLandingHref = '\/'/)
  assert.doesNotMatch(homeSource, /href=\{serviceLandingHref\}/)
  assert.doesNotMatch(homeSource, /pelnego opisu konsultacji online/)
  assert.doesNotMatch(homeSource, /<ServiceDecisionSection/)
  assert.match(homeSource, /Behawiorysta ps/)

  assert.match(nextConfigSource, /source: '\/psy'/)
  assert.match(nextConfigSource, /source: '\/psy\/:path\*'/)
  assert.match(nextConfigSource, /source: '\/koty'/)
  assert.match(nextConfigSource, /source: '\/koty\/:path\*'/)
  assert.match(nextConfigSource, /destination: '\/'/)
})

test.skip('offer and booking pages keep quick-scan language', () => {
  const offerPage = readSource('app', 'oferta', 'page.tsx')
  const pdfListingPage = readSource('app', 'oferta', 'poradniki-pdf', 'page.tsx')
  const bookingPage = readSource('app', 'book', 'page.tsx')
  const offersSource = readSource('lib', 'offers.ts')

  assert.match(offerPage, /Zacznij od 15 min\. PDF zostaje drugim krokiem, a dłuższy format trzecim\./)
  assert.match(offerPage, /Najprostszy pierwszy krok to konsultacja 15 min\./)
  assert.match(offerPage, /PDF jako drugi krok/)
  assert.match(offerPage, /30 min \/ pełna jako upgrade/)
  assert.match(offerPage, /Konsultacja 15 min/)
  assert.match(offerPage, /FUNNEL_SECONDARY_LABEL/)
  assert.match(offerPage, /FUNNEL_UPGRADE_LABEL/)
  assert.match(offerPage, /Najpierw 15 min\. PDF jako drugi krok\. 30 min \/ pełna konsultacja jako upgrade\./)
  assert.doesNotMatch(offerPage, /PDF jako nurture/)
  assert.doesNotMatch(offerPage, /Najprostszy pierwszy ruch to spokojny materiał PDF\./)
  assert.match(pdfListingPage, /Poradniki PDF/)
  assert.match(pdfListingPage, /Materiały PDF do uporządkowania tematu\./)
  assert.match(pdfListingPage, /Po konsultacji 15 min/)
  assert.match(pdfListingPage, /Między krokami/)
  assert.match(pdfListingPage, /Pakiety gdy potrzebujesz szerzej/)
  assert.match(pdfListingPage, /Książki jako uzupełnienie/)
  assert.match(pdfListingPage, /Kocia półka PDF/)
  assert.match(pdfListingPage, /Psia półka PDF/)
  assert.match(pdfListingPage, /Pakiety dla kotów/)
  assert.match(pdfListingPage, /Polecane książki papierowe/)
  assert.match(pdfListingPage, /href=\"#koty-pdf\"/)
  assert.match(pdfListingPage, /Umów 15 min/)
  assert.match(pdfListingPage, /Zobacz materiały PDF/)
  assert.match(offersSource, /whenToChoose: 'Gdy chcesz spokojnie wrócić do tematu albo uporządkować zalecenia we własnym tempie\.'/)

  assert.match(bookingPage, /Wybierz temat na 15 min/)
  assert.match(bookingPage, /Wybierz temat najbliższy sytuacji\./)
  assert.match(bookingPage, /Nie musisz znać dokładnej nazwy problemu\./)
  assert.match(bookingPage, /Inny problem lub temat pokrewny/)
  assert.doesNotMatch(bookingPage, /Temat mieszany\?/)
  assert.doesNotMatch(bookingPage, /Wybierz temat mieszany/)
  assert.doesNotMatch(bookingPage, /Nie wiem, od czego zacz.*ć/)
  assert.doesNotMatch(bookingPage, /przejdź do kategorii dla kota/i)
  assert.match(bookingPage, /Następny krok/)
  assert.match(bookingPage, /Najpierw wybierasz temat\./)
  assert.match(bookingPage, /Potem pokazuję terminy i kolejny krok\./)
  assert.doesNotMatch(bookingPage, /Mam kota/)
  assert.doesNotMatch(bookingPage, /@\/components\/PricingDisclosure/)
  assert.doesNotMatch(bookingPage, /SPECIALIST_NAME/)
  assert.doesNotMatch(bookingPage, /SPECIALIST_CREDENTIALS/)
  assert.doesNotMatch(bookingPage, /Jak wygląda rezerwacja/)
  assert.doesNotMatch(bookingPage, /Nie wiesz, co wybrać\?/)
  assert.doesNotMatch(bookingPage, /PayU/)

  assert.match(offersSource, /return offer\.detailCtaLabel \?\? 'Zobacz szczegóły'/)
  assert.match(offersSource, /primaryCtaLabel: 'Umów 15 min'/)
  assert.match(offersSource, /primaryCtaLabel: 'Opisz krótko, co się dzieje'/)
  assert.match(offersSource, /priceLabel: formatPricePln\(119\)/)
  assert.match(offersSource, /priceLabel: formatPricePln\(350\)/)
  assert.doesNotMatch(offersSource, /Czy to dla Ciebie\?/)
  assert.doesNotMatch(offersSource, /Szerszy start/)
  assert.doesNotMatch(offersSource, /kwalifikacja/)
  assert.doesNotMatch(offersSource, /forma pracy/)
  assert.doesNotMatch(offersSource, /obszar problemowy/)
})

test.skip('offer, slot and form copy stay accented', () => {
  const offersSource = readSource('lib', 'offers.ts').normalize('NFC')
  const slotPage = readSource('app', 'slot', 'page.tsx').normalize('NFC')
  const bookingForm = readSource('components', 'BookingForm.tsx').normalize('NFC')

  assert.match(offersSource, /Więcej czasu/)
  assert.match(offersSource, /Gdy wiesz, że 15 min będzie za krótkie/)
  assert.match(offersSource, /Pełniejszy start dla trudniejszej sprawy\./)
  assert.match(offersSource, /Gdy problem trwa długo, dotyczy kilku obszarów albo chcesz od razu wejść w pełniejszą analizę\./)
  assert.match(offersSource, /Od razu rezerwujesz dłuższy termin online zamiast zaczynać od samego formularza kontaktowego\./)
  assert.match(offersSource, /Gdy chcesz spokojnie wrócić do tematu albo uporządkować zalecenia we własnym tempie\./)
  assert.match(offersSource, /priceLabel: formatPricePln\(119\)/)
  assert.match(offersSource, /priceLabel: formatPricePln\(350\)/)
  assert.match(slotPage, /Potrzebuję pomocy/)
  assert.match(bookingForm, /To pomoże lepiej wykorzystać/)
  assert.match(bookingForm, /Krótki opis sytuacji/)
  assert.match(bookingForm, /Ty i zwierzak\?/)
  assert.doesNotMatch(bookingForm, /albo PayU/)
})

test.skip('pdf listing page follows the cat problem-path architecture', () => {
  const pdfListingPage = readSource('app', 'oferta', 'poradniki-pdf', 'page.tsx')
  const pdfGuidePage = readSource('app', 'oferta', 'poradniki-pdf', '[guideSlug]', 'page.tsx')
  const pdfBundlePage = readSource('app', 'oferta', 'poradniki-pdf', 'pakiety', '[bundleSlug]', 'page.tsx')

  assert.match(pdfListingPage, /Poradniki PDF/)
  assert.match(pdfListingPage, /Materiały PDF do uporządkowania tematu\./)
  assert.match(pdfListingPage, /Po konsultacji 15 min/)
  assert.match(pdfListingPage, /Między krokami/)
  assert.match(pdfListingPage, /Pakiety gdy potrzebujesz szerzej/)
  assert.match(pdfListingPage, /Książki jako uzupełnienie/)
  assert.match(pdfListingPage, /Zobacz koty/)
  assert.match(pdfListingPage, /Zobacz psy/)
  assert.match(pdfListingPage, /Umów 15 min/)
  assert.match(pdfListingPage, /Polecane książki papierowe/)
  assert.match(pdfListingPage, /Zobacz materiały PDF/)
  assert.doesNotMatch(pdfListingPage, /pdf-stage-hero-grid/)
  assert.doesNotMatch(pdfListingPage, /pdf-stage-entry-grid/)
  assert.doesNotMatch(pdfListingPage, /offer-section-block-start/)
  assert.doesNotMatch(pdfListingPage, /offer-section-block-moretime/)
  assert.doesNotMatch(pdfListingPage, /offer-section-block-further/)
  assert.doesNotMatch(pdfListingPage, /PDF-y dla psów/)
  assert.doesNotMatch(pdfListingPage, /PDF-y dla kotów/)

  assert.match(pdfGuidePage, /offer-detail-layout pdf-detail-layout/)
  assert.match(pdfGuidePage, /offer-detail-cta-band/)
  assert.match(pdfGuidePage, /buildPdfInquiryHref\(\{ guideSlug: guide\.slug \}\)/)
  assert.doesNotMatch(pdfGuidePage, /compact-sales-cta/)

  assert.match(pdfBundlePage, /offer-detail-layout pdf-detail-layout/)
  assert.match(pdfBundlePage, /offer-detail-cta-band/)
  assert.match(pdfBundlePage, /buildPdfInquiryHref\(\{ bundleSlug: bundle\.slug \}\)/)
  assert.doesNotMatch(pdfBundlePage, /compact-sales-cta/)
})

test.skip('contact, header, footer and legal pages stay aligned with the public booking flow', () => {
  const contactSource = readSource('app', 'kontakt', 'page.tsx')
  const contactFormSource = readSource('components', 'ContactLeadForm.tsx')
  const headerSource = readSource('components', 'Header.tsx')
  const footerSource = readSource('components', 'Footer.tsx')
  const legalLayoutSource = readSource('components', 'LegalPageLayout.tsx')
  const privacySource = readSource('app', 'polityka-prywatnosci', 'page.tsx')
  const termsSource = readSource('app', 'regulamin', 'page.tsx')
  const contactMarkup = renderToStaticMarkup(createElement(ContactPage, { searchParams: Promise.resolve({}) }))
  const footerMarkup = renderToStaticMarkup(createElement(Footer))

  assert.match(contactSource, /Najprostszy start to 15 min audio\./)
  assert.match(contactSource, /Jeśli nie rezerwujesz od razu, wyślij krótką wiadomość\./)
  assert.match(contactSource, /Kanały publiczne/)
  assert.match(contactSource, /ContactLeadForm/)
  assert.match(contactFormSource, /\/api\/contact/)
  assert.match(contactFormSource, /form_started/)
  assert.match(contactMarkup, /Krótka wiadomość/)
  assert.match(contactSource, /Krótka wiadomość ma sens wtedy/)
  assert.match(contactSource, /Profile publiczne/)
  assert.match(privacySource, /WhatsApp\/Meta, PayPal\.me, obsługa BLIK/)
  assert.match(privacySource, /operatora płatności online, PayPal\.me albo w ramach ręcznej\s+obsługi BLIK/)
  assert.match(termsSource, /Termin jest pewny dopiero po potwierdzeniu płatności/)
  assert.match(privacySource, /LegalPageLayout/)
  assert.match(termsSource, /LegalPageLayout/)
  assert.match(legalLayoutSource, /legal-stage-layout/)
  assert.match(legalLayoutSource, /legal-summary-grid/)
  assert.match(legalLayoutSource, /legal-section-grid/)
  assert.match(legalLayoutSource, /legal-support-panel/)
  assert.match(legalLayoutSource, /primaryHref = '\/kontakt'/)
  assert.match(legalLayoutSource, /showFooterReviews=\{false\}/)
  assert.doesNotMatch(privacySource, /legal-panel/)
  assert.doesNotMatch(termsSource, /legal-panel/)

  assert.match(headerSource, /href: '\/oferta'/)
  assert.match(headerSource, /href: '\/oferta\/poradniki-pdf'/)
  assert.match(headerSource, /Um.*w 15 min/)
  assert.doesNotMatch(headerSource, /label: 'Koty'/)
  assert.doesNotMatch(headerSource, /label: 'Pobyty'/)

  assert.match(footerSource, /variant = 'lean'/)
  assert.match(footerSource, /Polityka prywatno.*ci/)
  assert.match(footerSource, /Regulamin/)
  assert.doesNotMatch(footerSource, /Formy współpracy/)
  assert.doesNotMatch(footerMarkup, /Marka i kontakt/)
})

test.skip('social trust surfaces keep CAPBT and Instagram together', () => {
  const homeSource = readSource('app', 'page.tsx')
  const footerSource = readSource('components', 'Footer.tsx')
  const socialSource = readSource('components', 'SocialSection.tsx')
  const legalLayoutSource = readSource('components', 'LegalPageLayout.tsx')
  const siteSource = readSource('lib', 'site.ts')
  const leanFooterMarkup = renderToStaticMarkup(createElement(Footer))
  const landingFooterMarkup = renderToStaticMarkup(createElement(Footer, { variant: 'landing' }))
  const fullFooterMarkup = renderToStaticMarkup(createElement(Footer, { variant: 'full' }))
  const socialMarkup = renderToStaticMarkup(createElement(SocialSection))

  assert.match(siteSource, /INSTAGRAM_PROFILE_URL/)
  assert.match(siteSource, /instagram\.com\/coapebehawiorysta/)
  assert.match(homeSource, /INSTAGRAM_PROFILE_URL/)
  assert.match(homeSource, /sameAs: \[COAPE_ORG_URL, CAPBT_ORG_URL, CAPBT_PROFILE_URL, INSTAGRAM_PROFILE_URL\]/)
  assert.match(homeSource, /COAPE \/ CAPBT/)
  assert.match(homeSource, /editorial-home-footer/)
  assert.match(homeSource, /editorial-home-footer-links/)
  assert.match(footerSource, /INSTAGRAM_PROFILE_URL/)
  assert.match(socialSource, /INSTAGRAM_PROFILE_URL/)
  assert.match(legalLayoutSource, /INSTAGRAM_PROFILE_URL/)
  assert.match(leanFooterMarkup, /behawioryscicoape\.pl\/behawiorysta\/Regulski/)
  assert.match(leanFooterMarkup, /instagram\.com\/coapebehawiorysta/)
  assert.match(landingFooterMarkup, /behawioryscicoape\.pl\/behawiorysta\/Regulski/)
  assert.match(landingFooterMarkup, /instagram\.com\/coapebehawiorysta/)
  assert.match(fullFooterMarkup, /behawioryscicoape\.pl\/behawiorysta\/Regulski/)
  assert.match(fullFooterMarkup, /instagram\.com\/coapebehawiorysta/)
  assert.match(socialMarkup, /behawioryscicoape\.pl\/behawiorysta\/Regulski/)
  assert.match(socialMarkup, /instagram\.com\/coapebehawiorysta/)
})

test.skip('cat entry stays short and decision-led', () => {
  const catPage = readSource('app', 'koty', 'page.tsx')
  const siteSource = readSource('lib', 'site.ts')

  assert.match(catPage, /Zacznij od krótkiej konsultacji i sprawdź, co będzie najlepszym kolejnym krokiem\./)
  assert.match(catPage, /Spokojny pierwszy krok przy problemach kota/)
  assert.match(catPage, /Spokojny pierwszy krok przy problemach kota\. Zacznij od 15 min, a PDF potraktuj jako drugi krok i materiał pomocniczy między etapami\./)
  assert.match(catPage, /dynamic = 'force-dynamic'/)
  assert.match(catPage, /path: '\/koty'/)
  assert.match(catPage, /SpeciesShopPage/)
  assert.match(catPage, /species=\"koty\"/)
  assert.match(siteSource, /cat-kuweta\.png/)
  assert.match(siteSource, /cat-conflict\.png/)
  assert.match(siteSource, /cat-destruction\.png/)
  assert.match(siteSource, /cat-stress\.png/)
  assert.match(siteSource, /cat-night\.png/)
  assert.match(siteSource, /therapy-animals\.png/)
})

test('qa checkout routing stays isolated and allowlist-gated', () => {
  assert.equal(readQaBookingSearchParam('1'), true)
  assert.equal(readQaBookingSearchParam('true'), true)
  assert.equal(readQaBookingSearchParam('qa'), true)
  assert.equal(readQaBookingSearchParam('yes'), true)
  assert.equal(readQaBookingSearchParam('0'), false)
  assert.equal(readQaBookingSearchParam(undefined), false)
  assert.equal(readClinicFlowSearchParam('1'), true)
  assert.equal(readClinicFlowSearchParam('true'), true)
  assert.equal(readClinicFlowSearchParam('0'), false)

  assert.equal(buildBookHref(null, null, true), '/book?qa=1')
  assert.equal(buildBookHref('kot-stres', null, false, 'kot', true), '/book?problem=kot-stres&species=kot&clinic=1')
  assert.equal(buildSlotHref('szczeniak', null, true), '/book?problem=szczeniak&qa=1')
  assert.equal(buildFormHref('szczeniak', 'slot-123', 'konsultacja-30-min', true), '/form?problem=szczeniak&slotId=slot-123&service=konsultacja-30-min&qa=1')
  assert.equal(buildPaymentHref('booking-123', 'access-token', 'konsultacja-30-min', true), '/payment?bookingId=booking-123&access=access-token&service=konsultacja-30-min&qa=1')

  withEnv(
    {
      APP_PAYMENT_MODE: 'mock',
      TEST_CHECKOUT_ENABLED: 'true',
      QA_CHECKOUT_EMAIL_ALLOWLIST: 'qa@example.com',
      QA_CHECKOUT_PHONE_ALLOWLIST: '',
      VERCEL_ENV: 'production',
    },
    () => {
      const allowed = getQaCheckoutEligibility({
        id: 'booking-123',
        qaBooking: true,
        email: 'qa@example.com',
        phone: '500000000',
      })

      assert.equal(allowed.isAllowed, true)
      assert.equal(allowed.paymentReference, getQaCheckoutPaymentReference('booking-123'))
      assert.match(allowed.summary, /QA/)

      const blockedByFlag = getQaCheckoutEligibility({
        id: 'booking-123',
        qaBooking: false,
        email: 'qa@example.com',
        phone: '500000000',
      })

      assert.equal(blockedByFlag.isAllowed, false)
      assert.match(blockedByFlag.summary, /QA/)
    },
  )

  withEnv(
    {
      APP_PAYMENT_MODE: 'mock',
      TEST_CHECKOUT_ENABLED: 'true',
      QA_CHECKOUT_EMAIL_ALLOWLIST: '',
      QA_CHECKOUT_PHONE_ALLOWLIST: '',
      VERCEL_ENV: 'production',
    },
    () => {
      const blocked = getQaCheckoutEligibility({
        id: 'booking-456',
        qaBooking: true,
        email: 'not-allowed@example.com',
        phone: '500000000',
      })

      assert.equal(blocked.isAllowed, false)
      assert.match(blocked.reason ?? '', /produkcji/)
    },
  )
})

test('qa booking schema fallback keeps public booking inserts alive', () => {
  const supabaseStoreSource = readSource('lib', 'server', 'supabase-store.ts')

  assert.match(supabaseStoreSource, /qaSchemaMode/)
  assert.match(supabaseStoreSource, /shouldRetryWithoutQaBooking/)
  assert.match(supabaseStoreSource, /withoutQaBooking/)
  assert.match(supabaseStoreSource, /getBookingInsertPayload/)
  assert.match(supabaseStoreSource, /applyLegacyBookingSelectFallback/)
})

test('booking form shows normalized slot conflict copy instead of raw api errors', () => {
  const bookingFormSource = readSource('components', 'BookingForm.tsx')
  const bookingApiErrorsSource = readSource('lib', 'server', 'booking-api-errors.ts')
  const bookingRouteSource = readSource('app', 'api', 'bookings', 'route.ts')

  assert.match(bookingFormSource, /normalizeBookingErrorMessage/)
  assert.match(bookingFormSource, /isSlotUnavailableBookingMessage/)
  assert.match(bookingFormSource, /Ten termin został właśnie zajęty/)
  assert.match(bookingApiErrorsSource, /SLOT_UNAVAILABLE_MESSAGE/)
  assert.match(bookingApiErrorsSource, /getPublicFeatureUnavailableMessage\('booking'\)/)
  assert.match(bookingRouteSource, /errorCode: failure\.code/)
  assert.match(bookingFormSource, /booking-early-start/)
  assert.match(bookingFormSource, /consentEarlyStart/)
  assert.match(bookingRouteSource, /consentEarlyStart/)
  assert.match(bookingRouteSource, /zgodę na rozpoczęcie usługi przed upływem 14 dni/)
  assert.doesNotMatch(bookingFormSource, /data-booking-field="phone"/)
  assert.doesNotMatch(bookingFormSource, /phone:\s*['"]/)
  assert.doesNotMatch(bookingRouteSource, /body\.phone/)
  assert.doesNotMatch(bookingRouteSource, /numer telefonu/)
})

test('urgent request response keeps the urgent service, price and callback phone', () => {
  const responseSource = readSource('app', 'api', 'admin', 'urgent-requests', '[id]', 'respond', 'route.ts')

  assert.match(responseSource, /serviceType: 'kwadrans-na-juz'/)
  assert.match(responseSource, /phone: urgentRequest\.phone \?\? null/)
  assert.match(responseSource, /buildPaymentHref\(bookingResult\.booking\.id, bookingResult\.accessToken, 'kwadrans-na-juz'\)/)
  assert.doesNotMatch(responseSource, /serviceType: 'szybka-konsultacja-15-min'/)
})

test('cat topic images exist in the dedicated catalog', () => {
  const assetPaths = [
    ['public', 'images', 'cutover', 'cat-kuweta.png'],
    ['public', 'images', 'cutover', 'cat-conflict.png'],
    ['public', 'images', 'cutover', 'cat-destruction.png'],
    ['public', 'images', 'cutover', 'cat-stress.png'],
    ['public', 'images', 'cutover', 'cat-night.png'],
  ]

  for (const parts of assetPaths) {
    assert.doesNotThrow(() => readFileSync(path.join(process.cwd(), ...parts)))
  }
})

test.skip('booking funnel sources keep canonical routing and standardized analytics events', () => {
  const homeSource = readSource('app', 'page.tsx')
  const stickyCtaSource = readSource('components', 'HomeMobileStickyCta.tsx')
  const contactSource = readSource('app', 'kontakt', 'page.tsx')
  const slotSource = readSource('app', 'slot', 'page.tsx')
  const bookSource = readSource('app', 'book', 'page.tsx')
  const catsSource = readSource('app', 'koty', 'page.tsx')
  const formSource = readSource('app', 'form', 'page.tsx')
  const legacyProblemSource = readSource('app', 'problem', 'page.tsx')
  const headerSource = readSource('components', 'Header.tsx')
  const footerSource = readSource('components', 'Footer.tsx')
  const bookingFormSource = readSource('components', 'BookingForm.tsx')
  const paymentActionsSource = readSource('components', 'PaymentActions.tsx')
  const confirmationSource = readSource('app', 'confirmation', 'page.tsx')
  const callRoomSource = readSource('components', 'CallRoom.tsx')

  assert.match(slotSource, /buildFormHref\(problem, slot\.id, serviceQuery, qaBooking\)/)
  assert.match(slotSource, /prefetch=\{false\}/)
  assert.match(slotSource, /getProblemLabel\(problem\)/)
  assert.match(bookSource, /buildSlotHref\(item\.id, serviceQuery, qaBooking\)/)
  assert.match(bookSource, /DOG_PROBLEM_OPTIONS/)
  assert.match(bookSource, /prefetch=\{false\}/)
  assert.doesNotMatch(bookSource, /przejdź do kategorii dla kota/i)
  assert.doesNotMatch(bookSource, /data-problem="kot"/)
  assert.match(formSource, /buildSlotHref\(problem, serviceQuery, qaBooking\)/)
  assert.match(legacyProblemSource, /buildSlotHref\(problem, null, qaBooking\)/)
  assert.doesNotMatch(legacyProblemSource, /\/book\?problem=/)
  assert.doesNotMatch(formSource, /PayU/)
  assert.match(formSource, /wpłaty ręcznej/)

  assert.match(homeSource, /buildHomeMetadata/)
  assert.match(homeSource, /AnalyticsEventOnMount/)
  assert.match(homeSource, /funnel_entry_15_min/)
  assert.match(stickyCtaSource, /data-analytics-event="funnel_entry_15_min"/)
  assert.match(stickyCtaSource, /data-home-sticky-cta="start"/)
  assert.match(contactSource, /contact-lead-general/)
  assert.match(contactSource, /contact-lead-resource/)
  assert.match(contactSource, /contact-lead-reschedule/)
  assert.match(contactSource, /contact-lead-guide/)
  assert.match(contactSource, /contact-lead-bundle/)

  assert.match(slotSource, /data-analytics-event="booking_slot_selected"/)
  assert.doesNotMatch(slotSource, /data-analytics-event="slot_select"/)
  assert.match(bookSource, /eventName="booking_service_selected"/)
  assert.match(catsSource, /eventName="booking_service_selected"/)
  assert.match(headerSource, /data-analytics-event="funnel_entry_15_min"/)
  assert.match(footerSource, /data-analytics-event="funnel_entry_15_min"/)
  assert.match(bookingFormSource, /booking_form_started/)
  assert.match(bookingFormSource, /isCatProblemType\(problemType\)/)
  assert.doesNotMatch(bookingFormSource, /problemType === 'kot'/)
  assert.match(paymentActionsSource, /payment_started/)
  assert.doesNotMatch(paymentActionsSource, /'payment_start'/)
  assert.match(confirmationSource, /confirmation_viewed/)
  assert.doesNotMatch(paymentActionsSource, /PayU jako druga opcja|Zapłać online PayU|albo PayU|PayU wróci/)
  assert.doesNotMatch(confirmationSource, /Wrocilismy z PayU/)
  assert.match(confirmationSource, /Status rezerwacji jest jeszcze domykany/)
  assert.match(callRoomSource, /call_room_viewed/)
})

test.skip('payment, confirmation and call sources keep visible fallbacks instead of silent failure', () => {
  const paymentPageSource = readSource('app', 'payment', 'page.tsx')
  const paymentActionsSource = readSource('components', 'PaymentActions.tsx')
  const confirmationSource = readSource('app', 'confirmation', 'page.tsx')
  const manualPaymentRouteSource = readSource('app', 'api', 'payments', 'manual', 'route.ts')
  const callPageSource = readSource('app', 'call', '[id]', 'page.tsx')

  assert.match(paymentPageSource, /customerEmailAvailable/)
  assert.match(paymentPageSource, /customerEmailStatus/)
  assert.match(paymentPageSource, /payment_viewed/)
  assert.match(paymentPageSource, /AnalyticsEventOnMount/)
  assert.match(paymentActionsSource, /customerEmailAvailable/)
  assert.match(confirmationSource, /customerEmailStatus/)
  assert.match(paymentPageSource, /CustomerEmailStatusNotice/)
  assert.match(confirmationSource, /CustomerEmailStatusNotice/)
  assert.match(paymentPageSource, /data-customer-email-state/)
  assert.match(confirmationSource, /data-customer-email-state/)
  assert.match(paymentPageSource, /wpłaty ręcznej/)
  assert.doesNotMatch(paymentPageSource, /PayU jest dostępne od razu|Gdy płatność online PayU wróci|albo PayU/)
  assert.match(paymentActionsSource, /zachowaj ten link/i)
  assert.match(paymentPageSource, /poka.*emy link do \$\{roomAccessLabel\} bezpo.*rednio na stronie potwierdzenia/i)
  assert.match(confirmationSource, /poka.*emy aktywny link do \$\{roomAccessLabel\} bezpo.*rednio na tej stronie/i)
  assert.match(manualPaymentRouteSource, /adminNotice/)
  assert.match(confirmationSource, /adminNotice/)
  assert.match(confirmationSource, /automatyczne powiadomienie obs.*ugi/i)
  assert.match(confirmationSource, /onlineSyncWarning/)
  assert.match(confirmationSource, /\[regulski-behawiorysta\]\[confirmation\] stripe return finalize failed/)
  assert.match(confirmationSource, /\[regulski-behawiorysta\]\[confirmation\] payu return sync failed/)
  assert.match(callPageSource, /flowError/)
  assert.match(callPageSource, /\[regulski-behawiorysta\]\[call\] failed to load booking/)
  assert.match(callPageSource, /Nie udało się wczytać pokoju rozmowy|Nie udało się wczytać pokoju rozmowy/)
})

test('owner booking notification is sent only after payment report or paid confirmation', () => {
  const supabaseStoreSource = readSource('lib', 'server', 'supabase-store.ts')
  const localStoreSource = readSource('lib', 'server', 'local-store.ts')
  const manualPaymentSource = readSource('lib', 'server', 'manual-payments.ts')

  assert.doesNotMatch(supabaseStoreSource, /sendBookingOwnerNotificationEmail/)
  assert.doesNotMatch(localStoreSource, /sendBookingOwnerNotificationEmail/)
  assert.match(supabaseStoreSource, /sendBookingPaymentConfirmedOwnerEmail\(booking\)/)
  assert.match(localStoreSource, /sendBookingPaymentConfirmedOwnerEmail\(booking\)/)
  assert.match(manualPaymentSource, /sendManualPaymentReportedAdminEmailWithTimeout\(updatedBooking/)
})

test('commerce checkout uses Naffy runtime and refuses silent admin notification failures', () => {
  const checkoutSource = readSource('app', 'checkout', 'page.tsx')
  const checkoutActionsSource = readSource('components', 'CommerceCheckoutActions.tsx')
  const onlineRouteSource = readSource('app', 'api', 'payments', 'online', 'create-checkout', 'route.ts')
  const onlineRuntimeSource = readSource('lib', 'server', 'online-payments.ts')
  const reportRouteSource = readSource('app', 'api', 'orders', '[orderNumber]', 'report-payment', 'route.ts')
  const adminConfirmRouteSource = readSource('app', 'api', 'admin', 'confirm-payment', '[token]', 'route.ts')
  const manualReviewRouteSource = readSource('app', 'manual-payment', 'review', 'route.ts')
  const blikActionsSource = readSource('components', 'CommerceBlikActions.tsx')

  assert.match(checkoutSource, /getOnlinePaymentRuntime/)
  assert.match(checkoutSource, /getOnlinePaymentRuntime\(order\)/)
  assert.doesNotMatch(checkoutSource, /stripeAvailable/)
  assert.match(checkoutActionsSource, /onlinePayment\.buttonLabel/)
  assert.match(checkoutActionsSource, /payment-ref-method-tabs/)
  assert.match(onlineRuntimeSource, /NAFFY_PAYMENT_URL/)
  assert.match(onlineRuntimeSource, /NAFFY_CHECKOUT_URL/)
  assert.match(onlineRuntimeSource, /NAFFY_CONSULTATION_QUICK_URL/)
  assert.match(onlineRuntimeSource, /NAFFY_CONSULTATION_URGENT_URL/)
  assert.match(onlineRuntimeSource, /NAFFY_CONSULTATION_30_URL/)
  assert.match(onlineRuntimeSource, /NAFFY_CONSULTATION_FULL_URL/)
  assert.match(onlineRouteSource, /buildNaffyCheckoutUrl/)
  assert.match(onlineRouteSource, /getOnlinePaymentRuntime\(order\)/)
  assert.match(onlineRouteSource, /provider: 'naffy'/)
  assert.match(reportRouteSource, /emailResult\.status !== 'sent'/)
  assert.match(reportRouteSource, /adminNotificationReason/)
  assert.match(blikActionsSource, /adminNotification[\s\S]+!== 'sent'/)
  assert.match(adminConfirmRouteSource, /export async function GET/)
  assert.match(adminConfirmRouteSource, /export async function POST/)
  assert.match(adminConfirmRouteSource, /Samo otwarcie linku z e-maila niczego nie zmienia/)
  assert.match(adminConfirmRouteSource, /Otwórz pokój rozmowy/)
  assert.match(manualReviewRouteSource, /export async function GET/)
  assert.match(manualReviewRouteSource, /export async function POST/)
  assert.match(manualReviewRouteSource, /Samo otwarcie linku z e-maila niczego nie zmienia/)
  assert.match(manualReviewRouteSource, /method="post"/)
  assert.match(manualReviewRouteSource, /UUID_PATTERN/)
  assert.doesNotMatch(
    manualReviewRouteSource.slice(
      manualReviewRouteSource.indexOf('export async function GET'),
      manualReviewRouteSource.indexOf('export async function POST'),
    ),
    /approveManualPayment|rejectManualPayment/,
  )

  withEnv(
    {
      COMMERCE_TEST_MODE: '1',
      VERCEL_ENV: 'production',
      NODE_ENV: 'production',
    },
    () => {
      assert.equal(isCommerceTestModeAllowed(), false)
    },
  )
})

test('commerce payment pages use the responsive payment reference and flow layouts', () => {
  const checkoutSource = readSource('app', 'checkout', 'page.tsx')
  const paymentSource = readSource('app', 'payment', 'page.tsx')
  const blikSource = readSource('app', 'platnosc', 'blik', '[orderNumber]', 'page.tsx')
  const waitingSource = readSource('app', 'oczekiwanie', '[orderNumber]', 'page.tsx')
  const globalStyles = readSource('app', 'globals.css')
  const notatnikStyles = readSource('app', 'notatnik-a.css')

  assert.match(checkoutSource, /<PaymentReferenceLayout/)
  assert.match(checkoutSource, /variant="compact"/)
  assert.match(checkoutSource, /payment-ref-checkout-content/)
  assert.match(paymentSource, /<PaymentReferenceLayout/)
  assert.match(paymentSource, /variant="compact"/)
  assert.match(paymentSource, /data-payment-state=/)

  for (const source of [blikSource, waitingSource]) {
    assert.match(source, /pageClassName="commerce-flow-page"/)
  }

  assert.match(globalStyles, /payment-ref-page/)
  assert.match(globalStyles, /payment-ref-grid/)
  assert.match(globalStyles, /payment-ref-method-tabs/)
  assert.match(globalStyles, /payment-ref-page--compact/)
  assert.match(notatnikStyles, /commerce-flow-page \.notatnik-shell/)
  assert.match(notatnikStyles, /calc\(100vw - 64px\)/)
})

test('public manual payment stays available when only BLIK phone is configured', () => {
  const originalBlikPhone = process.env.MANUAL_PAYMENT_BLIK_PHONE
  const originalPaypalMe = process.env.MANUAL_PAYMENT_PAYPAL_ME

  process.env.MANUAL_PAYMENT_BLIK_PHONE = '500600700'
  delete process.env.MANUAL_PAYMENT_PAYPAL_ME

    try {
      const manual = getPublicManualPaymentConfig()

      assert.equal(manual.isAvailable, true)
      assert.equal(manual.phoneDisplay, null)
      assert.equal(manual.paypalMeDisplay, null)
      assert.equal(manual.paypalMeUrl, null)
      assert.match(manual.summary, /Wpłata ręczna jest dostępna z ręcznym potwierdzeniem do 60 minut/i)
    } finally {
    if (typeof originalBlikPhone === 'string') {
      process.env.MANUAL_PAYMENT_BLIK_PHONE = originalBlikPhone
    } else {
      delete process.env.MANUAL_PAYMENT_BLIK_PHONE
    }

    if (typeof originalPaypalMe === 'string') {
      process.env.MANUAL_PAYMENT_PAYPAL_ME = originalPaypalMe
    } else {
      delete process.env.MANUAL_PAYMENT_PAYPAL_ME
    }
  }
})

test('manual payment mode still allows online payment when Naffy checkout is configured', () => {
  withEnv(
    {
      APP_PAYMENT_MODE: 'manual',
      MANUAL_PAYMENT_BLIK_PHONE: '500600700',
      MANUAL_PAYMENT_PAYPAL_ME_URL: null,
      NAFFY_PAYMENT_URL: 'https://pay.example/checkout',
      STRIPE_SECRET_KEY: null,
      VERCEL_ENV: 'production',
    },
    () => {
      const paymentMode = getPaymentModeStatus()
      const onlinePayment = getOnlinePaymentRuntime(null)

      assert.equal(paymentMode.isValid, true)
      assert.equal(paymentMode.active, 'manual')
      assert.equal(paymentMode.usesFallback, false)
      assert.deepEqual(paymentMode.missing, [])
      assert.match(paymentMode.summary, /APP_PAYMENT_MODE=manual/)
      assert.match(paymentMode.summary, /ręczna|ręcznym/i)
      assert.equal(onlinePayment.provider, 'naffy')
      assert.equal(onlinePayment.available, true)
      assert.equal(onlinePayment.naffyUrl, 'https://pay.example/checkout')
    },
  )
})

test('online payment runtime stays available when auto mode falls back to active manual payments', () => {
  withEnv(
    {
      APP_PAYMENT_MODE: 'auto',
      MANUAL_PAYMENT_BLIK_PHONE: '500600700',
      MANUAL_PAYMENT_PAYPAL_ME_URL: null,
      NAFFY_PAYMENT_URL: 'https://pay.example/checkout',
      STRIPE_SECRET_KEY: null,
      VERCEL_ENV: 'production',
    },
    () => {
      const paymentMode = getPaymentModeStatus()
      const onlinePayment = getOnlinePaymentRuntime(null)

      assert.equal(paymentMode.isValid, true)
      assert.equal(paymentMode.active, 'manual')
      assert.equal(paymentMode.usesFallback, true)
      assert.equal(onlinePayment.provider, 'naffy')
      assert.equal(onlinePayment.available, true)
      assert.equal(onlinePayment.naffyUrl, 'https://pay.example/checkout')
    },
  )
})

test.skip('release smoke rules track the current home and booking copy', () => {
  const rules = getDefaultReleaseSmokeRules()
  const homeRule = rules.find((rule) => rule.path === '/')
  const opinionsRule = rules.find((rule) => rule.path === '/opinie')
  const offerRule = rules.find((rule) => rule.path === '/oferta')
  const bookRule = rules.find((rule) => rule.path === '/book')
  const catsRule = rules.find((rule) => rule.path === '/koty')
  const termsRule = rules.find((rule) => rule.path === '/regulamin')
  const privacyRule = rules.find((rule) => rule.path === '/polityka-prywatnosci')

  assert.ok(homeRule)
  assert.ok(opinionsRule)
  assert.ok(offerRule)
  assert.ok(bookRule)
  assert.ok(catsRule)
  assert.ok(termsRule)
  assert.ok(privacyRule)

  const homeRequired = homeRule?.required ?? []

  assert.equal(homeRequired.some((phrase) => phrase.includes('Konsultacje')), true)
  assert.equal(homeRequired.some((phrase) => phrase.includes('Spokojny pierwszy krok')), true)
  assert.equal(homeRequired.some((phrase) => phrase.includes('15 minut na start')), true)
  assert.equal(homeRequired.some((phrase) => phrase.includes('Zobacz materiały PDF')), true)
  assert.equal(homeRequired.some((phrase) => phrase.includes('Umów 15 min')), true)
  assert.equal(homeRequired.some((phrase) => phrase.includes('Konsultacja 30 min / pełna')), true)
  assert.equal(homeRequired.some((phrase) => phrase.includes('COAPE / CAPBT')), true)
  assert.equal(homeRequired.some((phrase) => phrase.includes('osobiste konsultacje')), true)
  assert.equal(homeRequired.some((phrase) => phrase.includes('online')), true)
  assert.equal(homeRequired.some((phrase) => phrase.includes('Dwa obrazkowe kierunki, bez napięcia')), true)
  assert.equal(homeRequired.some((phrase) => phrase.includes('Opinie opiekunów')), true)
  assert.equal(homeRequired.some((phrase) => phrase.includes('Kilka głosów po pierwszym kroku')), true)
  assert.equal(homeRequired.some((phrase) => phrase.includes('Poradniki PDF')), true)
  assert.equal(homeRequired.some((phrase) => phrase.includes('PDF będzie obok jako materiał pomocniczy.')), true)
  assert.equal(homeRequired.some((phrase) => phrase.includes('Potrzebujesz pomocy przy problemach psa lub kota?')), true)
  assert.equal(homeRule?.forbidden?.includes('Udost\u0119pnij znajomemu'), true)
  assert.deepEqual(homeRule?.ordered, [
    'Regulski | Terapia behawioralna',
    'Konsultacje dla psów i kotów',
    'Spokojny pierwszy krok przy problemach psa lub kota',
    'Umów 15 min',
    'Zobacz materiały PDF',
    'Opinie opiekunów',
    'Kilka głosów po pierwszym kroku',
    'Poradniki PDF',
    'PDF będzie obok jako materiał pomocniczy.',
    'Potrzebujesz pomocy przy problemach psa lub kota?',
  ])

  assert.equal(opinionsRule?.required?.includes('Historie opiekunów i efekty konsultacji'), true)
  assert.equal(opinionsRule?.required?.includes('Publiczne źródła'), true)
  assert.equal(opinionsRule?.required?.includes('Zweryfikowane opinie pojawią się po ręcznej akceptacji'), true)
  assert.equal(opinionsRule?.required?.includes('Dodaj swoją opinię do ręcznej weryfikacji'), true)
  assert.equal(opinionsRule?.required?.includes('Start: smycz i pobudzenie'), true)
  assert.equal(opinionsRule?.required?.includes('Start: kuweta po zmianie'), true)
  assert.equal(opinionsRule?.forbidden?.includes('Udost\u0119pnij znajomemu'), true)

  assert.equal(offerRule?.required?.includes('Zacznij od 15 min. PDF zostaje drugim krokiem, a dłuższy format trzecim.'), true)
  assert.equal(offerRule?.required?.includes('Konsultacja 15 min'), true)
  assert.equal(offerRule?.required?.includes('PDF jako drugi krok'), true)
  assert.equal(offerRule?.required?.includes('30 min / pełna jako upgrade'), true)
  assert.equal(offerRule?.required?.includes('Poradniki PDF'), true)
  assert.equal(offerRule?.required?.includes('Najprostszy pierwszy krok to konsultacja 15 min.'), true)
  assert.equal(offerRule?.required?.includes('Zobacz materiały PDF'), true)
  assert.deepEqual(offerRule?.ordered, [
    'Zacznij od 15 min. PDF zostaje drugim krokiem, a dłuższy format trzecim.',
    'Najprostszy pierwszy krok to konsultacja 15 min.',
    'Zobacz materiały PDF',
    'Konsultacja 15 min',
    '30 min / pełna jako upgrade',
    'Dalsze opcje',
  ])

  assert.equal(bookRule?.required?.includes('Wybierz temat na 15 min'), true)
  assert.equal(bookRule?.required?.includes('Wybierz temat najbliższy sytuacji.'), true)
  assert.equal(bookRule?.required?.includes('Szczeniak i młody pies'), true)
  assert.equal(bookRule?.required?.includes('Problemy separacyjne'), true)
  assert.equal(bookRule?.required?.includes('Spacer i reakcje'), true)
  assert.equal(bookRule?.required?.includes('Pobudzenie i pogoń'), true)
  assert.equal(bookRule?.required?.includes('Agresja i obrona zasobów'), true)
  assert.equal(bookRule?.required?.includes('Inny problem lub temat pokrewny'), true)
  assert.equal(bookRule?.required?.includes('Nie musisz znać dokładnej nazwy problemu.'), true)
  assert.equal(bookRule?.forbidden?.includes('Kot i trudne zachowania'), true)
  assert.equal(bookRule?.forbidden?.includes('Wybierz temat mieszany'), true)
  assert.equal(bookRule?.forbidden?.includes('Temat mieszany?'), true)
  assert.equal(bookRule?.forbidden?.includes('Dogoterapia'), true)

  assert.equal(catsRule?.required?.includes('Spokojny pierwszy krok przy problemach kota'), true)
  assert.equal(catsRule?.required?.includes('Zacznij od krótkiej konsultacji i sprawdź, co będzie najlepszym kolejnym krokiem'), true)
  assert.equal(catsRule?.required?.includes('Umów 15 min'), true)
  assert.equal(catsRule?.required?.includes('Zobacz materiały PDF'), true)
  assert.equal(catsRule?.required?.includes('Materiały PDF do spokojnego powrotu do zaleceń.'), true)
  assert.equal(catsRule?.required?.includes('Polecane książki papierowe'), true)
  assert.equal(catsRule?.required?.includes('Konsultacja 30 min / pełna'), true)
  assert.equal(catsRule?.required?.includes('Kuweta i zachowania toaletowe'), true)
  assert.equal(catsRule?.required?.includes('Konflikt między kotami'), true)
  assert.equal(catsRule?.required?.includes('Dotyk, pielęgnacja i obrona'), true)
  assert.equal(catsRule?.required?.includes('Lęk, stres i wycofanie'), true)
  assert.equal(catsRule?.required?.includes('Nocna aktywność i rytm dnia'), true)
  assert.equal(catsRule?.forbidden?.includes('Wybierz temat dla kota i od razu przejdź do terminu.'), true)
  assert.equal(catsRule?.forbidden?.includes('Kuweta i dom'), true)
  assert.equal(catsRule?.forbidden?.includes('Relacja i przestrzeń'), true)
  assert.equal(catsRule?.forbidden?.includes('Kot i kuweta'), true)
  assert.equal(catsRule?.forbidden?.includes('Dotyk, gryzienie i pielęgnacja'), true)
  assert.equal(catsRule?.forbidden?.includes('Kot lękowy, napięty albo wycofany'), true)
  assert.equal(catsRule?.forbidden?.includes('Budzi dom po nocy'), true)

  assert.equal(termsRule?.required?.includes('Zasady rezerwacji i realizacji usług'), true)
  assert.equal(termsRule?.required?.includes('Masz pytanie o rezerwację albo płatność?'), true)
  assert.equal(termsRule?.required?.includes('Publiczny profil CAPBT / COAPE'), true)
  assert.equal(termsRule?.forbidden?.includes('Pobyty'), true)

  assert.equal(privacyRule?.required?.includes('Jak przetwarzane s\u0105 dane w marce Regulski | Terapia behawioralna'), true)
  assert.equal(privacyRule?.required?.includes('Potrzebujesz sprawdzić dane albo proces kontaktu?'), true)
  assert.equal(privacyRule?.required?.includes('Publiczny profil CAPBT / COAPE'), true)
  assert.equal(privacyRule?.forbidden?.includes('Pobyty'), true)
})

test('go-live checks expose external blockers for Resend testing mode and PayU sandbox', () => {
  withEnv(
    {
      RESEND_API_KEY: 're_test_key',
      RESEND_FROM_EMAIL: 'Regulski Behawiorysta <onboarding@resend.dev>',
      REGULSKI_CONTACT_EMAIL: 'kontakt@regulskibehawiorysta.pl',
      PAYU_MODE: 'auto',
      PAYU_ENVIRONMENT: 'sandbox',
      PAYU_CLIENT_ID: 'sandbox-client',
      PAYU_CLIENT_SECRET: 'sandbox-secret',
      PAYU_POS_ID: 'sandbox-pos',
      PAYU_SECOND_KEY: 'sandbox-second',
    },
    () => {
      const checks = getGoLiveChecks()
      const emailCheck = checks.find((check) => check.id === 'customer-email')
      const payuCheck = checks.find((check) => check.id === 'payu-online')

      assert.equal(emailCheck?.state, 'blocked')
      assert.equal(emailCheck?.tone, 'attention')
      assert.match(emailCheck?.summary ?? '', /resend\.dev testing mode/i)
      assert.match(emailCheck?.nextStep ?? '', /Zweryfikuj domenę nadawcy w Resend/i)

      assert.equal(payuCheck?.state, 'blocked')
      assert.equal(payuCheck?.tone, 'attention')
      assert.match(payuCheck?.summary ?? '', /PAYU_ENVIRONMENT=sandbox/)
      assert.match(payuCheck?.nextStep ?? '', /produkcyjne klucze/i)
      assert.match(payuCheck?.nextStep ?? '', /payu-smoke:production/i)
    },
  )
})

test('go-live checks mark verified Resend and production PayU as ready', () => {
  withEnv(
    {
      RESEND_API_KEY: 're_live_key',
      RESEND_FROM_EMAIL: 'Regulski Behawiorysta <kontakt@regulskibehawiorysta.pl>',
      REGULSKI_CONTACT_EMAIL: 'kontakt@regulskibehawiorysta.pl',
      PAYU_MODE: 'auto',
      PAYU_ENVIRONMENT: 'production',
      PAYU_CLIENT_ID: 'live-client',
      PAYU_CLIENT_SECRET: 'live-secret',
      PAYU_POS_ID: 'live-pos',
      PAYU_SECOND_KEY: 'live-second',
    },
    () => {
      const checks = getGoLiveChecks()
      const emailCheck = checks.find((check) => check.id === 'customer-email')
      const payuCheck = checks.find((check) => check.id === 'payu-online')

      assert.equal(emailCheck?.state, 'ready')
      assert.equal(emailCheck?.tone, 'ready')
      assert.match(emailCheck?.summary ?? '', /gotowa z aktualnej konfiguracji Resend/i)

      assert.equal(payuCheck?.state, 'ready')
      assert.equal(payuCheck?.tone, 'ready')
      assert.match(payuCheck?.summary ?? '', /środowiska production/i)
    },
  )
})

test('go-live checks mark Gmail SMTP customer email delivery as ready', () => {
  withEnv(
    {
      MAIL_PROVIDER: 'gmail',
      CUSTOMER_EMAIL_MODE: 'auto',
      GMAIL_SMTP_USER: 'kontakt@regulskibehawiorysta.pl',
      GMAIL_SMTP_APP_PASSWORD: 'gmail-app-password',
      GMAIL_FROM_EMAIL: 'kontakt@regulskibehawiorysta.pl',
      PAYU_ENVIRONMENT: 'production',
      PAYU_CLIENT_ID: 'live-client',
      PAYU_CLIENT_SECRET: 'live-secret',
      PAYU_POS_ID: 'live-pos',
      PAYU_SECOND_KEY: 'live-second',
    },
    () => {
      const checks = getGoLiveChecks()
      const emailCheck = checks.find((check) => check.id === 'customer-email')

      assert.equal(emailCheck?.state, 'ready')
      assert.equal(emailCheck?.tone, 'ready')
      assert.match(emailCheck?.summary ?? '', /Gmail SMTP/i)
    },
  )
})

test('go-live checks include schema sync as a release gate', () => {
  const checks = getGoLiveChecks()
  const schemaCheck = checks.find((check) => check.id === 'schema-sync')

  assert.equal(schemaCheck?.state, 'ready')
  assert.equal(schemaCheck?.tone, 'ready')
  assert.match(schemaCheck?.summary ?? '', /Canonical Supabase schema/i)
  assert.match(schemaCheck?.nextStep ?? '', /booking\/payment\/QA schema/i)
})

test('go-live checks flag disabled customer emails as attention while PayU disabled stays ready', () => {
  withEnv(
    {
      CUSTOMER_EMAIL_MODE: 'disabled',
      REGULSKI_CONTACT_EMAIL: 'kontakt@regulskibehawiorysta.pl',
      PAYU_MODE: 'disabled',
      PAYU_ENVIRONMENT: 'sandbox',
      PAYU_CLIENT_ID: 'sandbox-client',
      PAYU_CLIENT_SECRET: 'sandbox-secret',
      PAYU_POS_ID: 'sandbox-pos',
      PAYU_SECOND_KEY: 'sandbox-second',
    },
    () => {
      const checks = getGoLiveChecks()
      const emailCheck = checks.find((check) => check.id === 'customer-email')
      const payuCheck = checks.find((check) => check.id === 'payu-online')

      assert.equal(emailCheck?.state, 'disabled')
      assert.equal(emailCheck?.tone, 'attention')
      assert.match(emailCheck?.summary ?? '', /świadomie wyłączone/i)
      assert.match(emailCheck?.nextStep ?? '', /CUSTOMER_EMAIL_MODE=auto/i)

      assert.equal(payuCheck?.state, 'ready')
      assert.equal(payuCheck?.tone, 'ready')
      assert.match(payuCheck?.summary ?? '', /PayU online jest świadomie wyłączone/i)
    },
  )
})

test('deploy readiness checks fail on local fallback and localhost base url', () => {
  withEnv(
    {
      APP_DATA_MODE: 'local',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      NEXT_PUBLIC_SUPABASE_URL: null,
      SUPABASE_SERVICE_ROLE_KEY: null,
      RESEND_API_KEY: 're_test_key',
      RESEND_FROM_EMAIL: 'Regulski Behawiorysta <onboarding@resend.dev>',
      REGULSKI_CONTACT_EMAIL: 'kontakt@regulskibehawiorysta.pl',
      PAYU_ENVIRONMENT: 'sandbox',
      PAYU_CLIENT_ID: 'sandbox-client',
      PAYU_CLIENT_SECRET: 'sandbox-secret',
      PAYU_POS_ID: 'sandbox-pos',
      PAYU_SECOND_KEY: 'sandbox-second',
    },
    () => {
      const checks = getDeployReadinessChecks()
      const dataCheck = checks.find((check) => check.id === 'data-runtime')
      const urlCheck = checks.find((check) => check.id === 'app-url')

      assert.equal(dataCheck?.tone, 'attention')
      assert.match(dataCheck?.summary ?? '', /localnego fallbacku JSON|local JSON fallback/i)

      assert.equal(urlCheck?.tone, 'attention')
    },
  )
})

test('deploy readiness checks pass for live-like runtime, url, Resend and PayU', () => {
  withEnv(
    {
      APP_DATA_MODE: 'supabase',
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_live_example',
      NEXT_PUBLIC_APP_URL: SITE_PRODUCTION_URL,
      RESEND_API_KEY: 're_live_key',
      RESEND_FROM_EMAIL: 'Regulski Behawiorysta <kontakt@regulskibehawiorysta.pl>',
      REGULSKI_CONTACT_EMAIL: 'kontakt@regulskibehawiorysta.pl',
      PAYU_ENVIRONMENT: 'production',
      PAYU_CLIENT_ID: 'live-client',
      PAYU_CLIENT_SECRET: 'live-secret',
      PAYU_POS_ID: 'live-pos',
      PAYU_SECOND_KEY: 'live-second',
    },
    () => {
      const checks = getDeployReadinessChecks()
      const blockingChecks = checks.filter((check) => check.tone === 'attention')

      assert.equal(blockingChecks.length, 0)
      assert.equal(checks.length >= 5, true)
    },
  )
})

test('verified deploy readiness can block a syntactically valid URL when external probe fails', async () => {
  const originalFetch = globalThis.fetch
  const blockedResponse = new Response('Protected', { status: 401 })

  globalThis.fetch = async () => blockedResponse

  try {
    await withEnv(
      {
      APP_DATA_MODE: 'supabase',
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_live_example',
      NEXT_PUBLIC_APP_URL: SITE_PRODUCTION_URL,
      CUSTOMER_EMAIL_MODE: 'disabled',
      REGULSKI_CONTACT_EMAIL: 'kontakt@regulskibehawiorysta.pl',
      PAYU_MODE: 'disabled',
    },
      async () => {
        const checks = await getVerifiedDeployReadinessChecks()
        const urlCheck = checks.find((check) => check.id === 'app-url')

        assert.equal(urlCheck?.tone, 'attention')
        assert.match(urlCheck?.summary ?? '', /HTTP 401/i)
        assert.match(urlCheck?.nextStep ?? '', /401\/SSO/i)
      },
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('verified deploy readiness accepts a sensitive-secret snapshot when production Auth rejects a controlled invalid session', async () => {
  const originalFetch = globalThis.fetch

  globalThis.fetch = async (input) => {
    const target = input instanceof URL ? input.href : typeof input === 'string' ? input : input.url
    const url = new URL(target)

    if (url.pathname === '/') {
      return new Response('OK', { status: 200 })
    }

    if (url.pathname === '/api/account/me') {
      return Response.json({ ok: false, error: 'Sesja konta opiekuna wygasla albo jest niepoprawna.' }, { status: 401 })
    }

    return new Response('Not found', { status: 404 })
  }

  try {
    await withEnv(
      {
        APP_DATA_MODE: 'supabase',
        NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: null,
        NEXT_PUBLIC_APP_URL: SITE_PRODUCTION_URL,
        CUSTOMER_EMAIL_MODE: 'disabled',
        REGULSKI_CONTACT_EMAIL: 'kontakt@regulskibehawiorysta.pl',
        PAYU_MODE: 'disabled',
      },
      async () => {
        const checks = await getVerifiedDeployReadinessChecks()
        const dataCheck = checks.find((check) => check.id === 'data-runtime')

        assert.equal(dataCheck?.tone, 'ready')
        assert.match(dataCheck?.summary ?? '', /runtime produkcyjny potwierdza Supabase Auth/i)
      },
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('live clickthrough keeps legal pages inside public production QA', () => {
  const liveClickthroughSource = readSource('scripts', 'live-clickthrough-report.ts')

  assert.match(liveClickthroughSource, /assertPublicSiteNavVisible/)
  assert.match(liveClickthroughSource, /\/book\?service=konsultacja-30-min/)
  assert.match(liveClickthroughSource, /\/book\?service=konsultacja-behawioralna-online/)
  assert.match(liveClickthroughSource, /Przejdz do formularza: Dwa kwadranse/)
  assert.match(liveClickthroughSource, /Przejdz do formularza: Pelna konsultacja/)
  assert.match(liveClickthroughSource, /\/psy\/reaktywnosc-na-smyczy/)
  assert.match(liveClickthroughSource, /\/materialy\/pies-sam-w-domu/)
  assert.match(liveClickthroughSource, /\/materialy/)
  assert.match(liveClickthroughSource, /\/regulamin/)
  assert.match(liveClickthroughSource, /\/polityka-prywatnosci/)
  assert.match(liveClickthroughSource, /oferta -> payment \/ 30 min CTA/)
  assert.match(liveClickthroughSource, /oferta -> slot \/ online CTA/)
  assert.match(liveClickthroughSource, /api\/payments\/manual/)
  assert.match(liveClickthroughSource, /konsultacja-30-min/)
  assert.match(liveClickthroughSource, /konsultacja-behawioralna-online/)
  assert.match(liveClickthroughSource, /CAPBT/)
  assert.match(liveClickthroughSource, /a\[href\^="tel:"\]/)
  assert.match(liveClickthroughSource, /Stare linki nawigacji nadal są widoczne/)
})

test('footer keeps a hidden build marker without exposing technical copy to the client', () => {
  const originalBranch = process.env.VERCEL_GIT_COMMIT_REF
  const originalCommit = process.env.VERCEL_GIT_COMMIT_SHA

  process.env.VERCEL_GIT_COMMIT_REF = 'main'
  process.env.VERCEL_GIT_COMMIT_SHA = 'fa5563d1234567890abcdef'

  try {
    const markup = renderToStaticMarkup(createElement(Footer))
    const legalMarkup = renderToStaticMarkup(createElement(Footer, { showReviews: false }))

    assert.doesNotMatch(markup, /Wersja serwisu/)
    assert.doesNotMatch(markup, /main \/ fa5563d/)
    assert.match(markup, new RegExp(`data-build-marker="${BUILD_MARKER_KEY}:main:fa5563d"`))
    assert.doesNotMatch(legalMarkup, /CO MÓWIĄ OPIEKUNOWIE/)
  } finally {
    if (typeof originalBranch === 'string') {
      process.env.VERCEL_GIT_COMMIT_REF = originalBranch
    } else {
      delete process.env.VERCEL_GIT_COMMIT_REF
    }

    if (typeof originalCommit === 'string') {
      process.env.VERCEL_GIT_COMMIT_SHA = originalCommit
    } else {
      delete process.env.VERCEL_GIT_COMMIT_SHA
    }
  }
})

test('funnel loading shell stays lightweight without duplicating header or footer', () => {
  const loadingSource = readSource('components', 'FunnelLoadingPage.tsx')

  assert.match(loadingSource, /loading-panel-light/)
  assert.doesNotMatch(loadingSource, /@\/components\/Header/)
  assert.doesNotMatch(loadingSource, /@\/components\/Footer/)
  assert.doesNotMatch(loadingSource, /<Header/)
  assert.doesNotMatch(loadingSource, /<Footer/)
})

test.skip('contact page keeps the compact identity block next to the action panel', () => {
  const markup = renderToStaticMarkup(createElement(ContactPage, { searchParams: Promise.resolve({}) }))

  assert.match(markup, /Piszesz do mnie/)
  assert.match(markup, /Krzysztof Regulski/)
  assert.match(markup, /COAPE \/ CAPBT/)
  assert.doesNotMatch(markup, /specialist-krzysztof-wide\.jpg/)
})

test('admin page renders explicit go-live status cards', () => {
  const adminSource = readSource('app', 'admin', 'page.tsx')
  const qaReportSource = readSource('app', '__internal', 'qa-report', 'page.tsx')

  assert.match(adminSource, /getGoLiveChecks/)
  assert.match(adminSource, /Go-live/)
  assert.match(adminSource, /Stan go-live/)
  assert.match(adminSource, /goLiveChecks\.map/)
  assert.match(adminSource, /Stan: \{check\.state\}/)
  assert.match(adminSource, /Dalej: \{check\.nextStep\}/)
  assert.match(adminSource, /Analityka i operacje/)
  assert.match(adminSource, /funnelMetricsSnapshot/)
  assert.match(adminSource, /Promise\.allSettled/)
  assert.match(adminSource, /dataLoadErrors/)
  assert.match(adminSource, /data-analytics-disabled="true"/)
  assert.match(qaReportSource, /data-analytics-disabled="true"/)
  assert.match(qaReportSource, /readLatestQaReport/)
})

test('build script keeps explicit no-cache lint before next build', () => {
  const packageJson = JSON.parse(readSource('package.json')) as {
    scripts?: Record<string, string>
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
  }

  assert.equal(packageJson.scripts?.build, 'npm run lint && next build --no-lint')
  assert.equal(packageJson.scripts?.lint, 'eslint . --no-cache')
  assert.equal(packageJson.scripts?.['funnel-metrics'], 'node --import tsx scripts/funnel-metrics.ts')
  assert.equal(packageJson.scripts?.['live-booking-matrix'], 'node --import tsx scripts/live-booking-matrix.ts')
  assert.equal(packageJson.scripts?.['live-readiness'], 'node --import tsx scripts/live-readiness.ts')
  assert.equal(packageJson.scripts?.['payu-smoke:production'], 'node --import tsx scripts/payu-smoke.ts --production')
  assert.equal(packageJson.scripts?.['schema-audit'], 'node scripts/schema-audit.js')
  assert.equal(packageJson.scripts?.['stage9-performance-audit'], 'node --import tsx scripts/stage9-performance-audit.ts')
  assert.equal(packageJson.scripts?.['js-off-smoke'], 'node --import tsx scripts/js-off-smoke.ts')
  assert.equal(packageJson.scripts?.['lighthouse:report'], 'node --import tsx scripts/lighthouse-report.ts')
  assert.equal(packageJson.scripts?.['full-public-crawl'], 'node --import tsx scripts/full-public-crawl.ts')
  assert.equal(packageJson.scripts?.['release-checklist'], 'node --import tsx scripts/release-checklist.ts')
  assert.equal(packageJson.dependencies?.next, '^15.5.18')
  assert.equal(packageJson.dependencies?.nodemailer, '^9.0.3')
  assert.equal(packageJson.devDependencies?.['eslint-config-next'], '^15.5.18')
  assert.equal(packageJson.devDependencies?.lighthouse, '^13.4.0')
})

test('Next 15 request APIs await dynamic request data', () => {
  const caseMapReviewSource = readSource('app', 'api', 'admin', 'case-maps', '[id]', 'review', 'route.ts')
  const leadBookingsSource = readSource('app', 'api', 'admin', 'lead-bookings', 'route.ts')
  const leadBookingSource = readSource('app', 'api', 'admin', 'lead-bookings', '[id]', 'route.ts')
  const callSource = readSource('app', 'call', '[id]', 'page.tsx')
  const checkoutSource = readSource('app', 'checkout', 'page.tsx')
  const confirmationSource = readSource('app', 'confirmation', 'page.tsx')
  const accountSource = readSource('app', 'konto', 'page.tsx')
  const waitingSource = readSource('app', 'oczekiwanie', '[orderNumber]', 'page.tsx')
  const paymentSource = readSource('app', 'payment', 'page.tsx')
  const roomSource = readSource('app', 'pokoj', 'page.tsx')

  for (const source of [caseMapReviewSource, leadBookingsSource, leadBookingSource, callSource, checkoutSource, confirmationSource, waitingSource, paymentSource]) {
    assert.match(source, /await headers\(\)/)
  }
  assert.match(accountSource, /await cookies\(\)/)
  assert.match(roomSource, /await cookies\(\)/)
  assert.match(leadBookingSource, /async function checkAuth\(\)/)
  assert.match(waitingSource, /async function buildRequestReviewUrl/)
})

test('local JSON store gives concurrent writes unique atomic temp paths', () => {
  const localStoreSource = readSource('lib', 'server', 'local-store.ts')

  assert.match(localStoreSource, /import \{ randomUUID \} from 'node:crypto'/)
  assert.match(localStoreSource, /const tempFilePath = `\$\{filePath\}\.\$\{process\.pid\}\.\$\{randomUUID\(\)\}\.tmp`/)
  assert.match(localStoreSource, /if \(JSON\.stringify\(normalized\) !== JSON\.stringify\(source\)\) \{\s+await persistStore\(normalized\)/)
})

test('stage 9 performance guardrails keep priority images, lazy media, layout checks, and screenshots wired', () => {
  const homeSource = readSource('app', 'page.tsx')
  const opinionsSource = readSource('app', 'opinie', 'page.tsx')
  const reviewGridSource = readSource('components', 'OpinionsReviewGrid.tsx')
  const pricingSource = readSource('app', 'cennik', 'page.tsx')
  const cssSource = readSource('app', 'notatnik-a.css')
  const stage9Source = readSource('scripts', 'stage9-performance-audit.ts')
  const lighthouseSource = readSource('scripts', 'lighthouse-report.ts')
  const browserPathSource = readSource('scripts', 'lib', 'browser-path.ts')

  assert.doesNotMatch(homeSource, /quality=\{100\}/)
  assert.match(homeSource, /quality=\{86\}/)
  assert.match(homeSource, /loading="lazy"/)
  assert.match(opinionsSource, /home-bg-cat-1to1\.webp" alt="" fill loading="lazy"/)
  assert.match(reviewGridSource, /fill loading="lazy" sizes="58px"/)
  assert.match(pricingSource, /faq-help-illustration-clean\.png" alt="" width=\{355\} height=\{208\} loading="lazy"/)
  assert.match(cssSource, /Stage 9 layout guardrails/)
  assert.match(cssSource, /overflow-wrap: anywhere/)
  assert.match(cssSource, /contain: layout paint/)
  assert.match(stage9Source, /stage9-performance-audit/)
  assert.match(stage9Source, /horizontalOverflow/)
  assert.match(stage9Source, /controlOverflows/)
  assert.match(stage9Source, /page\.screenshot/)
  assert.match(lighthouseSource, /LIGHTHOUSE_MAX_ATTEMPTS = 2/)
  assert.match(lighthouseSource, /missing Lighthouse categories:/)
  assert.match(lighthouseSource, /retrying once/)
  assert.match(lighthouseSource, /rm\(`\$\{outputBase\}\.report\.html`, \{ force: true \}\)/)
  assert.match(lighthouseSource, /return \{ \.\.\.result, attempts: attempt \}/)
  assert.match(lighthouseSource, /resolveBrowserExecutablePath\(\{ preferSystem: true \}\)/)
  assert.match(browserPathSource, /preferSystem\?: boolean/)
  assert.match(browserPathSource, /if \(preferSystem && systemPath\)/)
})

test('stage 10 funnel aliases, drop tracking, and release checklist are wired', () => {
  const typesSource = readSource('lib', 'types.ts')
  const funnelEventsSource = readSource('lib', 'server', 'funnel-events.ts')
  const funnelMetricsSource = readSource('lib', 'server', 'funnel-metrics.ts')
  const analyticsSource = readSource('lib', 'analytics.ts')
  const bookingCalendarSource = readSource('components', 'BookingSlotCalendar.tsx')
  const calendarSource = readSource('components', 'TerminCalendarPicker.tsx')
  const paymentActionsSource = readSource('components', 'PaymentActions.tsx')
  const blikActionsSource = readSource('components', 'CommerceBlikActions.tsx')
  const waitingStatusSource = readSource('components', 'CommerceWaitingStatus.tsx')
  const adminSource = readSource('app', 'admin', 'page.tsx')
  const releaseChecklistSource = readSource('scripts', 'release-checklist.ts')
  const fullPublicCrawlSource = readSource('scripts', 'full-public-crawl.ts')
  const nextConfigSource = readSource('next.config.mjs')

  for (const eventName of [
    'hero_cta_click',
    'service_select',
    'slot_select',
    'form_start',
    'form_submit',
    'payment_start',
    'payment_reported',
    'payment_confirmed',
    'booking_drop',
  ]) {
    assert.match(typesSource, new RegExp(`'${eventName}'`))
    assert.match(funnelEventsSource, new RegExp(`'${eventName}'`))
    assert.match(analyticsSource, new RegExp(eventName))
  }

  assert.match(funnelEventsSource, /case 'service_select':\s+return 'booking_service_selected'/)
  assert.match(funnelEventsSource, /case 'payment_start':\s+return 'payment_started'/)
  assert.match(funnelEventsSource, /case 'payment_reported':\s+case 'manual_pending':\s+return 'payment_marked_pending'/)
  assert.match(funnelEventsSource, /case 'payment_confirmed':\s+case 'paid':/)
  assert.match(funnelMetricsSource, /booking_drop/)
  assert.match(analyticsSource, /BOOKING_PROGRESS_STORAGE_KEY/)
  assert.match(analyticsSource, /flushStoredBookingDrop/)
  assert.match(analyticsSource, /getPublicAnalyticsEventName/)
  assert.match(bookingCalendarSource, /eventName="booking_start"/)
  assert.match(bookingCalendarSource, /eventName="booking_service_selected"/)
  assert.match(calendarSource, /trackSlotSelect\(slot, 'termin-nearest-slots'\)/)
  assert.match(calendarSource, /trackSlotSelect\(selectedSlot, 'termin-summary'\)/)
  assert.match(paymentActionsSource, /trackPaymentStart/)
  assert.match(paymentActionsSource, /trackAnalyticsEvent\('payment_started'/)
  assert.match(blikActionsSource, /trackAnalyticsEvent\('payment_reported'/)
  assert.match(waitingStatusSource, /trackAnalyticsEvent\('payment_confirmed'/)
  assert.match(adminSource, /window\.stageCounts\.booking_drop/)
  assert.match(releaseChecklistSource, /latest-release-checklist\.md/)
  assert.match(releaseChecklistSource, /tests\/case-map-analytics\.test\.ts/)
  assert.match(releaseChecklistSource, /evaluateReleaseSmokeRedirect/)
  assert.match(releaseChecklistSource, /stage9-performance-audit/)
  assert.match(releaseChecklistSource, /full-public-crawl/)
  assert.match(fullPublicCrawlSource, /source === 'crawl' && resolved\.search/)
  assert.match(fullPublicCrawlSource, /canonicalUrl/)
  assert.match(fullPublicCrawlSource, /--no-follow/)
  assert.match(fullPublicCrawlSource, /--no-screenshots/)
  assert.match(fullPublicCrawlSource, /digits\.length === 9/)
  assert.match(fullPublicCrawlSource, /horizontalOverflowPx > 2/)
  assert.match(nextConfigSource, /source: '\/booking',\s+destination: '\/book'/)
})

test('live booking matrix keeps a ten-attempt production report', () => {
  const source = readSource('scripts', 'live-booking-matrix.ts')

  assert.match(source, /MATRIX_ATTEMPTS/)
  assert.match(source, /latest-live-booking-matrix\.md/)
  assert.match(source, /Proby zaliczone/)
})

test('booking and contact flows keep resilient fallback selectors', () => {
  const contactFormSource = readSource('components', 'ContactLeadForm.tsx')
  const contactRouteSource = readSource('app', 'api', 'contact', 'route.ts')
  const bookingRouteSource = readSource('app', 'api', 'bookings', 'route.ts')
  const calendarSource = readSource('components', 'TerminCalendarPicker.tsx')
  const bookingFormSource = readSource('components', 'BookingForm.tsx')
  const jsOffSmokeSource = readSource('scripts', 'js-off-smoke.ts')
  const uiSmokeSource = readSource('scripts', 'ui-smoke.ts')
  const cssSource = readSource('app', 'notatnik-a.css')
  const liveClickthroughSource = readSource('scripts', 'live-clickthrough-report.ts')
  const liveBookingMatrixSource = readSource('scripts', 'live-booking-matrix.ts')

  assert.match(contactFormSource, /action="\/api\/contact"/)
  assert.match(contactFormSource, /method="post"/)
  assert.match(contactFormSource, /type="radio"/)
  assert.match(contactRouteSource, /request\.formData\(\)/)
  assert.match(contactRouteSource, /NextResponse\.redirect/)

  assert.match(bookingFormSource, /action="\/api\/bookings"/)
  assert.match(bookingFormSource, /method="post"/)
  assert.match(bookingFormSource, /name="ownerName"/)
  assert.match(bookingFormSource, /name="slotId"/)
  assert.match(bookingRouteSource, /request\.formData\(\)/)
  assert.match(bookingRouteSource, /buildPaymentHref/)
  assert.match(bookingRouteSource, /NextResponse\.redirect/)
  assert.match(jsOffSmokeSource, /javaScriptEnabled: false/)
  assert.match(jsOffSmokeSource, /waitUntil: 'networkidle'/)
  assert.match(jsOffSmokeSource, /resolveBrowserExecutablePath\(\{ preferSystem: true \}\)/)
  assert.match(jsOffSmokeSource, /form\[action="\/api\/bookings"\]\[method="post"\]/)

  assert.match(calendarSource, /data-nearest-slot-link="true"/)
  assert.match(calendarSource, /data-selected-slot-link="true"/)
  assert.match(cssSource, /\.termin-nearest-slots\s*\{\s*display:\s*grid\s*!important/)
  assert.doesNotMatch(cssSource, /\.termin-calendar-weekdays,\s*[\r\n]+\s*\.termin-calendar-grid\s*\{\s*display:\s*none\s*!important/)
  assert.ok(calendarSource.indexOf('1. Najbliższe terminy') < calendarSource.indexOf('2. Wybierz datę'))
  assert.ok(calendarSource.indexOf('2. Wybierz datę') < calendarSource.indexOf('3. Wybierz godzinę'))

  assert.match(bookingFormSource, /buildSlotHref/)
  assert.match(bookingFormSource, /booking-details-error-link/)
  assert.match(liveClickthroughSource, /data-selected-slot-link/)
  assert.match(liveBookingMatrixSource, /buildAttemptStartPath/)
  assert.match(uiSmokeSource, /await slotLink\.click\(\)/)
  assert.match(uiSmokeSource, /new URL\(publicPage\.url\(\)\)\.pathname, '\/book'/)
  assert.match(uiSmokeSource, /bookingForm\.locator\('input\[name="slotId"\]'\)/)
  assert.match(uiSmokeSource, /room-stage-live/)
  assert.match(uiSmokeSource, /room-stage-locked/)
  assert.match(uiSmokeSource, /Telefoniczny pokój konsultacji/)
  assert.match(uiSmokeSource, /phoneRoomMode, 'phone'/)
  assert.match(uiSmokeSource, /videoRoomLockedFlowVerified/)
  assert.match(uiSmokeSource, /videoRoomLiveFlowVerified/)
  assert.match(uiSmokeSource, /clock\.install/)
  assert.match(uiSmokeSource, /clock\.runFor\(2200\)/)
  assert.match(uiSmokeSource, /buildScheduleAvailabilitySeed/)
  assert.match(uiSmokeSource, /entry\.time === '08:15'/)
  assert.match(uiSmokeSource, /getBookingServiceRoomDurationMinutes\('konsultacja-behawioralna-online'\)/)
  assert.match(uiSmokeSource, /getByText\(\/Pok\[óo\]j aktywny\|Rozmowa zakończona\/i\)\.first\(\)/)
  assert.doesNotMatch(uiSmokeSource, /return\s*\n\s*await startRoomTimerWithRetry/)
  assert.match(uiSmokeSource, /Call room did not expose a live or locked access state/)
  assert.match(uiSmokeSource, /page\.goto: Timeout/)
  assert.match(uiSmokeSource, /taskkill\.exe/)
  assert.match(uiSmokeSource, /\['\/pid', String\(pid\), '\/T', '\/F'\]/)
})

test('telephone room keeps its customer-facing preparation copy in Polish', () => {
  const callRoomSource = readSource('components', 'CallRoom.tsx')

  assert.match(callRoomSource, /Jak to działa\?/)
  assert.doesNotMatch(callRoomSource, /How does it work\?/)
})

test('payu smoke script supports a production checkout target without sandbox defaults', () => {
  const source = readSource('scripts', 'payu-smoke.ts')

  assert.match(source, /--production/)
  assert.match(source, /PAYU_SMOKE_ENVIRONMENT/)
  assert.match(source, /PAYU_SMOKE_URL/)
  assert.match(source, /readArg\('--url'\)/)
  assert.match(source, /resolvePayuSmokeTargetUrl/)
  assert.match(source, /smokeEnvironment === 'production'/)
  assert.match(source, /Tryb production wymaga publicznego URL/)
  assert.match(source, /ALLOWED_PAYU_SANDBOX_HOSTS/)
  assert.match(source, /isProductionRedirectHost/)
  assert.match(source, /secure\.snd\.payu\.com/)
  assert.match(source, /\/api\/bookings\/\$\{bookingId\}\/status/)
  assert.match(source, /paymentMethod === 'payu'/)
  assert.match(source, /payuOrderId/)
  assert.match(source, /payuOrderStatus/)
})

test('booking status api exposes payu metadata for controlled rollout smoke', () => {
  const source = readSource('app', 'api', 'bookings', '[id]', 'status', 'route.ts')

  assert.match(source, /paymentMethod: booking\.paymentMethod \?\? null/)
  assert.match(source, /paymentReference: booking\.paymentReference \?\? null/)
  assert.match(source, /payuOrderId: booking\.payuOrderId \?\? null/)
  assert.match(source, /payuOrderStatus: booking\.payuOrderStatus \?\? null/)
})

test('live readiness script writes the expected QA artifact and supports report-only mode', () => {
  const source = readSource('scripts', 'live-readiness.ts')

  assert.match(source, /getVerifiedDeployReadinessChecks/)
  assert.match(source, /latest-live-readiness\.md/)
  assert.match(source, /--report-only/)
  assert.match(source, /Applied default production env snapshot/)
  assert.match(source, /Zrodlo env:/)
  assert.match(source, /Go-live readiness detected blockers/)
  assert.match(source, /Stan: \$\{check\.state\}/)
})

test('go-live source keeps the verified external URL probe path', () => {
  const source = readSource('lib', 'server', 'go-live.ts')

  assert.match(source, /async function probePublicAppUrl/)
  assert.match(source, /getVerifiedDeployReadinessChecks/)
  assert.match(source, /Publiczny URL nie odpowiada poprawnie dla ruchu zewnętrznego/)
  assert.match(source, /npm run live-smoke/)
})

test('schema audit keeps the canonical production schema shape in sync', () => {
  const audit = getSupabaseSchemaAudit()
  const schemaSource = readSource('supabase', 'schema.sql')
  const brokenAudit = auditSupabaseSchemaText(
    schemaSource.replace('qa_booking boolean not null default false', 'qa_booking boolean not null'),
  )

  assert.equal(audit.ok, true)
  assert.equal(audit.missingFiles.length, 0)
  assert.equal(audit.missingMarkers.length, 0)
  assert.equal(brokenAudit.ok, false)
  assert.match(brokenAudit.summary, /qa_booking/)
})

test('default production env snapshot path prefers the current production snapshot', () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'regulski-behawiorysta-live-readiness-'))

  try {
    const vercelDir = path.join(tempRoot, '.vercel')
    mkdirSync(vercelDir, { recursive: true })
    const localSnapshotPath = path.join(vercelDir, '.env.production.local')
    const currentSnapshotPath = path.join(vercelDir, '.env.production.current')
    writeFileSync(localSnapshotPath, 'PAYU_ENVIRONMENT=sandbox\n', 'utf8')
    writeFileSync(currentSnapshotPath, `NEXT_PUBLIC_APP_URL=${SITE_PRODUCTION_URL}\n`, 'utf8')

    assert.equal(getDefaultProductionEnvSnapshotPath(tempRoot), currentSnapshotPath)
  } finally {
    rmSync(tempRoot, { recursive: true, force: true })
  }
})

test('consultation payment runtime resolves service-specific Naffy checkout without a global link', () => {
  withEnv(
    {
      APP_PAYMENT_MODE: 'manual',
      MANUAL_PAYMENT_BLIK_PHONE: '500600700',
      NAFFY_CONSULTATION_30_URL: 'https://pay.example/dwa-kwadranse',
      NAFFY_PAYMENT_URL: undefined,
      NAFFY_CHECKOUT_URL: undefined,
      STRIPE_SECRET_KEY: undefined,
    },
    () => {
      const onlinePayment = getOnlinePaymentRuntimeForConsultation('konsultacja-30-min')

      assert.equal(onlinePayment.provider, 'naffy')
      assert.equal(onlinePayment.available, true)
      assert.equal(onlinePayment.naffyUrl, 'https://pay.example/dwa-kwadranse')
    },
  )
})

test('clinic code funnel reveals phone surcharge only after validation and keeps public entry consistent', () => {
  const paymentSource = readSource('components', 'PaymentActions.tsx')
  const clinicEntrySource = readSource('components', 'ClinicCodeEntry.tsx')
  const clinicPageSource = readSource('app', 'lecznica', 'page.tsx')
  const choicePageSource = readSource('app', 'wybor', 'page.tsx')
  const formatPageSource = readSource('app', 'format-konsultacji', 'page.tsx')
  const bookingSource = readSource('components', 'BookingSlotCalendar.tsx')
  const clinicIdentitySource = readSource('components', 'ClinicBookingIdentity.tsx')
  const choiceStylesSource = readSource('app', 'wybor', 'wybor.module.css')
  const contactSource = readSource('app', 'kontakt', 'page.tsx')
  const homeSource = readSource('app', 'page.tsx')
  const pricingSource = readSource('app', 'cennik', 'page.tsx')
  const termsSource = readSource('app', 'regulamin', 'page.tsx')
  const privacySource = readSource('app', 'polityka-prywatnosci', 'page.tsx')
  const callRoomSource = readSource('components', 'CallRoom.tsx')
  const orderRouteSource = readSource('app', 'api', 'orders', 'route.ts')

  assert.match(homeSource, /homepage-clinic-entry/)
  assert.match(homeSource, /href="\/lecznica"/)
  assert.match(pricingSource, /Program dla klientów lecznic/)
  assert.doesNotMatch(pricingSource, /clinic-program-pricing-title[\s\S]{0,600}9 zł/)
  assert.match(clinicPageSource, /Lecznice uczestniczące w programie/)
  assert.match(clinicEntrySource, /sessionStorage\.setItem\('clinicPromoCode'/)
  assert.match(clinicEntrySource, /\/wybor\?clinic=1/)
  assert.match(choicePageSource, /data-clinic-animal-choice/)
  assert.match(choicePageSource, /animal=dog&clinic=1/)
  assert.match(choicePageSource, /animal=cat&clinic=1/)
  assert.ok(formatPageSource.includes('buildBookHref(problem, service, false, species, clinicFlow)'))
  assert.match(bookingSource, /readClinicFlowSearchParam/)
  assert.match(bookingSource, /priceLabel: clinicFlow \? '0 /)
  assert.match(clinicIdentitySource, /data-clinic-booking-identity/)
  assert.match(choiceStylesSource, /\.catPage \.heroImage img[\s\S]{0,160}object-fit: contain/)
  assert.match(contactSource, /approach-animals-v1\.png/)
  assert.match(contactSource, /COAPE_POLSKA_LOGO/)
  assert.match(paymentSource, /promoValidated \? \(/)
  assert.match(paymentSource, /data-promo-channel="phone"/)
  assert.match(paymentSource, /data-promo-phone-input="true"/)
  assert.match(paymentSource, /required/)
  assert.match(paymentSource, /kind: 'clinic-phone-upgrade'/)
  assert.match(paymentSource, /consultationMode: 'jitsi'/)
  assert.match(orderRouteSource, /body\.kind === 'clinic-phone-upgrade'/)
  assert.match(callRoomSource, /consultationMode === 'phone'/)
  assert.match(termsSource, /Brak zapłaty albo brak potwierdzenia dopłaty telefonicznej nie odbiera prawa do wariantu Jitsi/)
  assert.match(privacySource, /Numer telefonu jest wymagany i zapisywany wyłącznie wtedy/)
  assert.match(privacySource, /nie otrzymuje automatycznie danych klienta/)
})
