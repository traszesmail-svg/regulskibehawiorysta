import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { getOpinionServiceLabel, publicOpinionReviews } from '@/lib/opinion-reviews'

const read = (...segments: string[]) => readFileSync(path.join(process.cwd(), ...segments), 'utf8')

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
