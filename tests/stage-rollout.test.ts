import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'

function readSource(...segments: string[]) {
  return readFileSync(path.join(process.cwd(), ...segments), 'utf8')
}

test('stage 7 essentials page exposes the three concrete starter materials without placeholder copy', () => {
  const source = readSource('app', 'niezbednik', 'page.tsx')

  assert.match(source, /5 pierwszych krokow, gdy pies szczeka na spacerach/)
  assert.match(source, /Checklista kuweta - krok po kroku/)
  assert.match(source, /Jak przygotowac sie do konsultacji behawioralnej/)
  assert.match(source, /\/bezplatne-materialy\/\$\{item\.magnet\.slug\}/)
  assert.doesNotMatch(source, /Sekcja jest rozwijana etapami/i)
  assert.doesNotMatch(source, /To nie jest pelny sklep/i)
})

test('stage 8 pricing page adds trust, CTA support and FAQ for Kwadrans and payment', () => {
  const source = readSource('app', 'cennik', 'page.tsx')

  assert.match(source, /pricingFaqItems/)
  assert.match(source, /PUBLIC_OFFER_BOOKING_PROCESS/)
  assert.match(source, /PUBLIC_OFFER_START_GUIDE/)
  assert.match(source, /Czym jest Kwadrans z behawiorysta\?/)
  assert.match(source, /Jak wyglada platnosc\?/)
  assert.match(source, /Najczestsze pytania o uslugi i platnosc\./)
})

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

test('stage 10 dogs and consultation pages use clearer conversion copy and preparation checklist', () => {
  const dogsSource = readSource('app', 'psy', 'page.tsx')
  const consultationSource = readSource('app', 'konsultacja-behawioralna-online', 'page.tsx')

  assert.match(dogsSource, /Twoj pies zachowuje sie w sposob, <em>ktory Cie niepokoi<\/em>\./)
  assert.match(dogsSource, /Nie musisz\s+wiedziec, jak to nazwac\./)
  assert.match(dogsSource, /Wystarczy, ze opiszesz, co sie dzieje\./)
  assert.match(dogsSource, /Problemy psie - lista\./)
  assert.match(dogsSource, /Nie widzisz swojego tematu na liscie\? Zacznij od Kwadransu\./)
  assert.match(dogsSource, /Ktory format dla psa ma sens na start\./)
  assert.match(dogsSource, /Niezbednik dla opiekuna psa/)
  assert.match(consultationSource, /const consultationFaqItems: TrustFaqItem\[\] = \[/)
  assert.match(consultationSource, /const consultationSummaryCards = \[/)
  assert.match(consultationSource, /const consultationDecisionCards = \[/)
  assert.match(consultationSource, /Pelna konsultacja w skrocie/)
  assert.match(consultationSource, /Jedna zasada wyboru przed rezerwacja\./)
  assert.match(consultationSource, /okolo 2h online, diagnoza i 7 dni wsparcia/)
  assert.match(consultationSource, /material przygotowujacy/)
})

test('stage 10 cats and local online pages keep the same simplified conversion structure', () => {
  const catsSource = readSource('app', 'koty', 'page.tsx')
  const localSeoSource = readSource('app', 'behawiorysta-online-polska', 'page.tsx')

  assert.match(catsSource, /Twoj kot zachowuje sie w sposob, <em>ktory Cie niepokoi<\/em>\./)
  assert.match(catsSource, /Nie\s+oceniam\./)
  assert.match(catsSource, /Szukam przyczyny, nie winy\./)
  assert.match(catsSource, /Problemy kocie - lista\./)
  assert.match(catsSource, /Przy naglej zmianie zachowania albo problemie z kuweta pierwszym krokiem bywa weterynarz\./)
  assert.match(catsSource, /Ktory format dla kota ma sens na start\./)
  assert.match(catsSource, /Niezbednik dla opiekuna kota/)
  assert.match(localSeoSource, /const pageEntryCards = \[/)
  assert.match(localSeoSource, /const onlineDecisionCards = \[/)
  assert.match(localSeoSource, /3 wejscia online/)
  assert.match(localSeoSource, /Jedna logika wyboru przed rezerwacja\./)
  assert.match(localSeoSource, /Przejdz do oferty/)
})
