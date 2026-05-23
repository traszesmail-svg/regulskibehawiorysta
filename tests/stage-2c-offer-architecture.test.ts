import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'

function readSource(...segments: string[]) {
  return readFileSync(path.join(process.cwd(), ...segments), 'utf8')
}

test('stage 2c keeps dog and cat entry pages on the three main public formats', () => {
  const dogsSource = readSource('app', 'psy', 'page.tsx')
  const catsSource = readSource('app', 'koty', 'page.tsx')

  assert.match(dogsSource, /Kwadrans 69 zl, Dwa kwadranse 169 zl i Pelna konsultacja 470 zl\./)
  assert.match(catsSource, /Kwadrans 69 zl, Dwa kwadranse 169 zl i Pelna konsultacja 470 zl\./)

  assert.match(dogsSource, /Dla psa obowiazuje ta sama logika 3 formatow\./)
  assert.match(catsSource, /Dla kota obowiazuje ta sama logika 3 formatow\./)
  assert.match(dogsSource, /Kwadrans na juz \(99 zl\) - ten sam format, priorytet i najblizszy realny termin\./)
  assert.match(catsSource, /Kwadrans na juz \(99 zl\) - ten sam format, priorytet i najblizszy realny termin\./)
  assert.match(dogsSource, /pelnego opisu konsultacji online/)
  assert.match(catsSource, /pelnego opisu konsultacji online/)

  assert.doesNotMatch(dogsSource, /const urgentHref =/)
  assert.doesNotMatch(catsSource, /const urgentHref =/)
  assert.doesNotMatch(dogsSource, /name: 'Kwadrans na juz'/)
  assert.doesNotMatch(catsSource, /name: 'Kwadrans na juz'/)
  assert.doesNotMatch(dogsSource, /Kwadrans na juz przy pilnym temacie/)
  assert.doesNotMatch(catsSource, /Kwadrans na juz przy pilnym temacie/)
  assert.doesNotMatch(dogsSource, /Kwadrans na juz daje ten sam zakres szybciej/)
  assert.doesNotMatch(catsSource, /Kwadrans na juz daje ten sam zakres szybciej/)
  assert.doesNotMatch(dogsSource, /logika 4 uslug/)
  assert.doesNotMatch(catsSource, /logika 4 uslug/)
})
