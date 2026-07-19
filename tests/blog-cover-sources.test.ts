import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const blogSource = readFileSync(path.join(process.cwd(), 'lib', 'blog.tsx'), 'utf8')
const mappingStart = blogSource.indexOf('const BLOG_COVER_BY_SLUG')
const mappingEnd = blogSource.indexOf('\nfunction getFallbackBlogCover', mappingStart)
const coverMapping = blogSource.slice(mappingStart, mappingEnd)

test('blog covers use unique external 16:10 image sources', () => {
  assert.ok(mappingStart >= 0, 'Blog cover mapping should exist')
  assert.ok(mappingEnd > mappingStart, 'Blog cover mapping should have a clear end')
  assert.doesNotMatch(coverMapping, /\/blog-covers\//)

  const covers = [...coverMapping.matchAll(
    /^  '([^']+)': \{\r?\n    src: '([^']+)',\r?\n    alt: '([^']+)',/gm,
  )].map(([, slug, src, alt]) => ({ slug, src, alt }))

  assert.equal(covers.length, 24)
  assert.equal(new Set(covers.map(({ slug }) => slug)).size, 24)
  assert.equal(new Set(covers.map(({ src }) => src)).size, 24)
  assert.ok(covers.every(({ alt }) => alt.trim().length >= 12))

  for (const { src } of covers) {
    const url = new URL(src)
    assert.equal(url.protocol, 'https:')
    assert.ok(['images.unsplash.com', 'images.pexels.com'].includes(url.hostname))
    assert.equal(url.searchParams.get('w'), '1600')
    assert.equal(url.searchParams.get('h'), '1000')
  }
})
