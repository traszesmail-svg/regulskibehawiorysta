import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import React, { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { load } from 'cheerio'
import { NotatnikTopbar, PUBLIC_SITE_NAV_ITEMS } from '@/components/NotatnikA'
import { MainContentStart, SkipToContent } from '@/components/SkipToContent'
import { AccountAuthForm } from '@/components/AccountAuthForm'
import { CommerceAccessForm } from '@/components/CommerceAccessForm'
import { Footer } from '@/components/Footer'
import MaterialyLandingPage from '@/app/materialy/page'
import OpinionsPage from '@/app/opinie/page'
import GlobalError from '@/app/global-error'
import { SITE_PRODUCTION_URL } from '@/lib/site'
import { getOpinionServiceLabel, publicOpinionReviews } from '@/lib/opinion-reviews'

;(globalThis as unknown as { React: typeof React }).React = React

const read = (...segments: string[]) => readFileSync(path.join(process.cwd(), ...segments), 'utf8')

test('the shared brand link derives its accessible name from its complete visible label', () => {
  const $ = load(renderToStaticMarkup(createElement(NotatnikTopbar, { tag: 'Regulski', navItems: PUBLIC_SITE_NAV_ITEMS })))
  const brand = $('.notatnik-brand')
  assert.equal(brand.attr('href'), '/')
  assert.equal(brand.attr('aria-label'), undefined)
  assert.equal(brand.attr('aria-labelledby'), undefined)
  assert.equal(brand.find('.notatnik-brand-mark').text(), 'Regulski Behawiorysta')
  assert.deepEqual(brand.find('.notatnik-brand-tag > span').toArray().map((span) => $(span).text()), ['Terapia behawioralna dla', 'psów i kotów'])
})

test('footer legal links retain their labels and separators with touch targets above 24px', () => {
  const $ = load(renderToStaticMarkup(createElement(Footer, { showReviews: false })))
  assert.deepEqual($('.home-footer-legal a').toArray().map((link) => $(link).attr('href')), [
    '/login', '/admin', '/polityka-prywatnosci', '/regulamin', '/regulamin-pelna-konsultacja',
  ])
  const css = read('app', 'notatnik-a.css')
  const rule = css.match(/\.home-footer-legal a,\s*\.site-footer-legal a\s*\{([^}]+)\}/)?.[1]
  assert.ok(rule)
  assert.ok(Number(rule.match(/min-height:\s*(\d+)px/)?.[1]) >= 24)
  assert.ok(Number(rule.match(/min-width:\s*(\d+)px/)?.[1]) >= 24)
  assert.match(rule, /padding:\s*4px 2px/)
  assert.match(css, /\.home-footer-legal a \+ a::before,[\s\S]{0,100}content:\s*'\\2022'/)
})

test('the global error fallback owns its document and recovery controls without root-layout dependencies', () => {
  const source = read('app', 'global-error.tsx')
  assert.match(source, /^['"]use client['"]/)
  assert.doesNotMatch(source, /^import\s/m)

  let resets = 0
  const element = GlobalError({ error: new Error('private failure detail'), reset: () => { resets += 1 } })
  const $ = load(renderToStaticMarkup(element))
  assert.equal($('html').attr('lang'), 'pl')
  assert.equal($('body').length, 1)
  assert.equal($('main').attr('aria-labelledby'), $('h1').attr('id'))
  assert.equal($('button[type="button"]').text().trim(), 'Spróbuj ponownie')
  assert.equal($('a').attr('href'), '/')
  assert.ok($('title').text().length > 0)
  assert.doesNotMatch($('body').text(), /private failure detail/)

  const body = React.Children.toArray(element.props.children).find((child) => React.isValidElement(child) && child.type === 'body') as React.ReactElement
  const main = body.props.children as React.ReactElement
  const retry = React.Children.toArray(main.props.children).find((child) => React.isValidElement(child) && child.type === 'button') as React.ReactElement
  retry.props.onClick()
  assert.equal(resets, 1)
})

test('materials schema exactly describes the visible guide links without adding offers', () => {
  const $ = load(renderToStaticMarkup(createElement(MaterialyLandingPage)))
  const schemas = JSON.parse($('script[type="application/ld+json"]').text())
  const pageUrl = `${SITE_PRODUCTION_URL}/materialy`
  const visibleGuides = $('.materialy-showcase-card-link').toArray().map((card, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: $(card).find('strong').text(),
    url: new URL($(card).attr('href')!, SITE_PRODUCTION_URL).toString(),
  }))
  assert.ok(visibleGuides.length > 0)
  assert.deepEqual(schemas, [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': `${pageUrl}#page`,
      url: pageUrl,
      name: $('#materialy-title').text(),
      description: $('.materialy-visual-lead').text(),
      inLanguage: 'pl-PL',
      mainEntity: { '@id': `${pageUrl}#guides` },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      '@id': `${pageUrl}#guides`,
      itemListOrder: 'https://schema.org/ItemListUnordered',
      numberOfItems: visibleGuides.length,
      itemListElement: visibleGuides,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Strona główna', item: SITE_PRODUCTION_URL },
        { '@type': 'ListItem', position: 2, name: 'Materiały PDF', item: pageUrl },
      ],
    },
  ])
})

test('materials card and featured covers emit optimized responsive image URLs for existing local files', () => {
  const $ = load(renderToStaticMarkup(createElement(MaterialyLandingPage)))
  const covers = $('.materialy-showcase-cover-image, .materialy-visual-mini-cover')
  assert.equal($('.materialy-showcase-cover-image').length, $('.materialy-showcase-card-link').length)
  assert.equal($('.materialy-visual-mini-cover').length, 2)
  assert.ok(covers.length > 2)

  for (const cover of covers.toArray()) {
    const image = $(cover)
    const optimizedUrl = new URL(image.attr('src')!, SITE_PRODUCTION_URL)
    assert.equal(optimizedUrl.pathname, '/_next/image')
    const localSource = optimizedUrl.searchParams.get('url')!
    assert.match(localSource, /^\/branding\/pdf-covers\/[^/]+\.png$/)
    assert.ok(existsSync(path.join(process.cwd(), 'public', localSource)), localSource)
    assert.match(image.attr('srcset') ?? '', /\/_next\/image\?[^,]+\s\d+w/)
    assert.equal(image.attr('sizes'), image.hasClass('materialy-visual-mini-cover')
      ? '92px'
      : '(max-width: 620px) 64vw, (max-width: 1100px) 28vw, 190px')
  }
})

test('every materials card derives its accessible link name from visible content including its title', () => {
  const $ = load(renderToStaticMarkup(createElement(MaterialyLandingPage)))
  const cards = $('.materialy-showcase-card-link').toArray()
  assert.equal(cards.length, 16)
  for (const card of cards) {
    const title = $(card).find('.materialy-showcase-card-copy > strong').text()
    assert.ok(title.length > 0)
    assert.equal($(card).attr('aria-label'), undefined)
    assert.equal($(card).attr('aria-labelledby'), undefined)
    assert.ok($(card).text().includes(title))
  }
})

test('opinions renders from its static data without forcing dynamic rendering', () => {
  const source = read('app', 'opinie', 'page.tsx')
  assert.doesNotMatch(source, /export\s+const\s+dynamic\s*=\s*['"]force-dynamic['"]|next\/headers|noStore\(|connection\(/)
  const $ = load(renderToStaticMarkup(createElement(OpinionsPage)))
  const schemas = JSON.parse($('script[type="application/ld+json"]').text())
  assert.equal(schemas[0]['@type'], 'CollectionPage')
  assert.equal(schemas[0].mainEntity.numberOfItems, publicOpinionReviews.length)
  assert.equal($('#opinions-page-title').length, 1)
})

test('authentication and material access fields expose their autofill purposes', () => {
  const account = load(renderToStaticMarkup(createElement(AccountAuthForm)))
  assert.equal(account('input[type=email]').attr('autocomplete'), 'username')
  assert.equal(account('input[type=password]').attr('autocomplete'), 'current-password')

  const commerce = load(renderToStaticMarkup(createElement(CommerceAccessForm)))
  assert.equal(commerce('input[type=email]').attr('autocomplete'), 'email')
  assert.equal(commerce('input[type=text]').attr('autocomplete'), 'one-time-code')
})

test('small opinions text meets 4.5:1 contrast on the darkest possible light gradient backgrounds', () => {
  const css = read('app', 'globals.css')
  const luminance = (hex: string) => {
    const channels = hex.match(/../g)!.map((value) => parseInt(value, 16) / 255)
      .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
  }

  // Full radial tint over the base is darker than any location in the actual gradient.
  for (const [pattern, darkestBackground] of [
    [/\.opinions-editorial-eyebrow\s*\{\s*color:#([a-f\d]{6})/i, 'f4eee1'],
    [/\.opinions-showcase-page \.opinions-review-card small\s*\{\s*color:#([a-f\d]{6})/i, 'f1e7d8'],
  ] as const) {
    const foreground = css.match(pattern)?.[1]
    assert.ok(foreground)
    const ratio = (luminance(darkestBackground) + 0.05) / (luminance(foreground) + 0.05)
    assert.ok(ratio >= 4.5, `${foreground} on ${darkestBackground}: ${ratio}`)
  }
})

test('the shared navigation exposes one focusable skip target after all header controls', () => {
  const markup = renderToStaticMarkup(createElement(NotatnikTopbar, {
    tag: 'Regulski',
    navItems: PUBLIC_SITE_NAV_ITEMS,
  }))
  const $ = load(renderToStaticMarkup(createElement(SkipToContent)) + markup)
  const skipLink = $('.skip-to-content')
  const target = $(skipLink.attr('href')!)

  assert.equal(skipLink.text(), 'Przejdź do treści')
  assert.equal(target.length, 1)
  assert.equal(target.attr('tabindex'), '-1')
  assert.equal(target.prev().is('header'), true)
  assert.equal(target.closest('header, nav').length, 0)
  assert.equal(target.text(), 'Treść strony')
})

test('the root shell puts the skip link before route content and special headers expose the same target', () => {
  const root = read('app', 'layout.tsx')
  assert.ok(root.indexOf('<SkipToContent />') < root.indexOf('{children}'))
  assert.match(renderToStaticMarkup(createElement(MainContentStart)), /id="main-content"[^>]*tabindex="-1"/)

  for (const segments of [
    ['app', 'mapa-sprawy', 'page.tsx'],
    ['app', 'call', '[id]', 'page.tsx'],
    ['components', 'Header.tsx'],
  ]) {
    const source = read(...segments)
    assert.ok(source.indexOf('<MainContentStart />') > source.indexOf('</header>'), segments.join('/'))
  }
})

test('blog support CTAs do not send customers to the homepage', () => {
  const source = read('lib', 'blog.tsx')
  assert.match(source, /href: '\/zapytaj'/)
  assert.doesNotMatch(source, /label: ['"]Umów (?:pierwszy krok|konsultację)['"][\s\S]{0,220}href: ['"]\/['"]|href: ['"]\/['"][\s\S]{0,220}label: ['"]Umów (?:pierwszy krok|konsultację)['"]/)
  assert.match(source, /blog-content-primary-cta[\s\S]{0,180}href: '\/zapytaj'/)
})

test('blog does not mount a newsletter while newsletter distribution is paused', () => {
  assert.doesNotMatch(read('app', 'blog', 'page.tsx'), /NewsletterSignup|LeadMagnetGlobal|newsletter/i)
  assert.doesNotMatch(read('app', 'blog', '[slug]', 'page.tsx'), /NewsletterSignup|LeadMagnetGlobal|newsletter/i)
})

test('public reviews expose a current service label and a concrete topic', () => {
  assert.ok(publicOpinionReviews.length > 0)

  for (const review of publicOpinionReviews) {
    assert.notEqual(review.service, 'Dwa kwadranse (archiwalna usługa)')
    assert.ok(getOpinionServiceLabel(review.service).length > 0, review.name)
    assert.ok(review.topic.trim().length > 0, review.name)
  }
})

test('legacy slot and form entry points redirect to the current public start', () => {
  const middleware = read('middleware.ts')
  const slotPage = read('app', 'slot', 'page.tsx')

  assert.match(middleware, /pathname === '\/slot'/)
  assert.match(middleware, /new URL\('\/zapytaj', request\.url\)/)
  assert.match(middleware, /matcher: \['\/slot', '\/form'/)
  assert.match(slotPage, /redirect\(buildBookHref\(/)
  assert.match(slotPage, /redirect\(buildSlotHref\(/)
})

test('the map keeps both safety questions visible in the no-script fallback', () => {
  const source = read('app', 'mapa-sprawy', 'page.tsx')

  assert.match(source, /Czy istnieje bezpośrednie zagrożenie dla człowieka lub zwierzęcia\?/) 
  assert.match(source, /Czy doszło do pogryzienia, urazu albo nagłego pogorszenia zdrowia\?/) 
  assert.match(source, /href="\/zapytaj"/) 
})
