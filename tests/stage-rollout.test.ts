import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'

function readSource(...segments: string[]) {
  return readFileSync(path.join(process.cwd(), ...segments), 'utf8')
}

test('stage 9 about page stays trust-first instead of turning into a problems or pricing page', () => {
  const source = readSource('app', 'o-mnie', 'page.tsx')

  assert.match(source, /const consultationHref = buildBookHref\(null, 'konsultacja-behawioralna-online'\)/)
  assert.match(source, /Jak wyglada konsultacja/)
  assert.match(source, /const workStyleCards = \[/)
  assert.match(source, /const trustCards = \[/)
  assert.match(source, /3 filary pracy/)
  assert.match(source, /3 publiczne sygnaly zaufania/)
  assert.doesNotMatch(source, /const problemCards = \[/)
  assert.doesNotMatch(source, /Problemy psa na spacerach/)
  assert.doesNotMatch(source, /Trudne zachowania psa w domu/)
})
