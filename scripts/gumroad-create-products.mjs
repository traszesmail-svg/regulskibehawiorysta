/**
 * Tworzy produkty Gumroad — tylko płatne konsultacje (redirect do systemu rezerwacji)
 * Uruchom gdy Chrome jest otwarty z --remote-debugging-port=9222
 */

import { chromium } from 'playwright-core'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dir = dirname(fileURLToPath(import.meta.url))
const BOOKING_URL = 'https://regulskibehawiorysta.pl/book'

const PRODUCTS = [
  {
    name: 'Kwadrans z behawiorystą — konsultacja online 15 min',
    price: '69',
    description: `15 minut rozmowy audio bez kamery z behawiorystą. Jedno konkretne pytanie, jasny kierunek działania.

Co dostaniesz:
— Jeden konkretny następny krok (nie listę 12 ćwiczeń)
— Odpowiedź na najważniejsze pytanie o Twoje zwierzę
— Ocenę, czy wystarczy ten format, czy lepsza będzie dłuższa konsultacja

Jak to działa:
1. Kupujesz tutaj i dostajesz link do systemu rezerwacji
2. Wybierasz termin (dostępne od 4. dnia, codziennie 8:00–12:00 + 17:00)
3. Płacisz BLIK i dostajesz potwierdzenie terminu oraz link do pokoju rozmowy

Dla kogo: właściciele psów lub kotów z jednym konkretnym problemem behawioralnym.`,
  },
  {
    name: 'Kwadrans na już — priorytetowa konsultacja online 15 min',
    price: '99',
    description: `15 minut rozmowy audio z priorytetem — termin dzisiaj, jutro lub pojutrze.

Co dostaniesz:
— Termin w ciągu 3 dni (godz. 8:00–12:00 lub 17:00)
— Jeden konkretny następny krok w Twojej sytuacji
— Potwierdzenie terminu w ciągu 15 minut od zgłoszenia

Terminy ze znakiem „?" (godz. 12:20–16:40) wymagają potwierdzenia dostępności. Odpowiedź w ciągu 15 minut w godzinach dyżuru (8:00–18:00).

Jak to działa:
1. Kupujesz tutaj i dostajesz link do rezerwacji
2. Wybierasz termin na dziś, jutro lub pojutrze
3. Płatność BLIK odblokowuje link do pokoju rozmowy`,
  },
  {
    name: 'Dwa Kwadranse z behawiorystą — konsultacja online 30 min',
    price: '169',
    description: `30 minut rozmowy online — gdy jeden Kwadrans to za mało, a pełna konsultacja jeszcze przed Tobą.

Co dostaniesz:
— Pełniejszy obraz sytuacji (czas na historię i kontekst)
— Diagnozę behawioralną opartą na informacjach z rozmowy
— Konkretny plan działania na najbliższe 2 tygodnie

Jak to działa:
1. Kupujesz tutaj i dostajesz link do systemu rezerwacji
2. Wybierasz termin (od 4. dnia, codziennie 8:00–12:00 + 17:00)
3. Płatność BLIK odblokowuje link do pokoju

Dla kogo: problem trwa od jakiegoś czasu lub chcesz spokojnie przejść przez sytuację bez pośpiechu 15-minutowego formatu.`,
  },
  {
    name: 'Pełna konsultacja behawioralna online — około 90 minut',
    price: '475',
    description: `Kompleksowe spotkanie online trwające około 90 minut — od historii zwierzęcia do gotowego planu działania.

Co dostaniesz:
— Pełny wywiad behawioralny
— Diagnozę behawioralną opartą na informacjach z rozmowy: co może napędzać zachowanie
— Pisemny plan działania wysłany e-mailem po spotkaniu
— 7 dni konsultacji tekstowych przez WhatsApp

Terminy: poniedziałek–piątek godz. 09:00, sobota godz. 10:00.
Potwierdzenie terminu do 24 h od rezerwacji.

Jak to działa:
1. Kupujesz tutaj i dostajesz link do systemu rezerwacji
2. Rezerwujesz termin i opłacasz BLIK
3. Dostajesz link do pokoju rozmowy

Dla kogo: problem jest złożony, trwa długo lub dotyczy kilku zachowań naraz.`,
  },
]

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function createProduct(page, product, index) {
  console.log(`\n[${index + 1}/${PRODUCTS.length}] ${product.name}`)

  await page.goto('https://app.gumroad.com/products/new')
  await page.waitForLoadState('networkidle')
  await wait(2000)

  // Digital product jest domyślnie zaznaczony — pomijamy wybór typu
  // (Call wymaga płatnego planu Gumroad)

  // Nazwa — pierwszy input type=text
  const inputs = page.locator('input[type="text"]')
  const nameInput = inputs.nth(0)
  await nameInput.waitFor({ timeout: 10000 })
  await nameInput.fill(product.name)
  await wait(300)

  // Cena — drugi input type=text
  const priceInput = inputs.nth(1)
  if (await priceInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await priceInput.fill(product.price)
    await wait(300)
  }

  // Kliknij Next: Customize
  const nextBtn = page.locator('button:has-text("Next")')
  if (await nextBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await nextBtn.click()
    await page.waitForLoadState('networkidle')
    await wait(2000)
    console.log(`  → customize step`)
  }

  // Opis
  const descEditors = [
    page.locator('div[contenteditable="true"]').first(),
    page.locator('textarea').first(),
  ]
  for (const editor of descEditors) {
    if (await editor.isVisible({ timeout: 2000 }).catch(() => false)) {
      await editor.click()
      await wait(300)
      await editor.press('Control+a')
      await wait(100)
      await editor.fill(product.description)
      console.log(`  opis: dodany`)
      break
    }
  }

  // Publish
  const publishBtn = page.locator('button:has-text("Publish"), button:has-text("Save changes"), button:has-text("Save")').first()
  if (await publishBtn.isVisible({ timeout: 8000 }).catch(() => false)) {
    await publishBtn.click()
    await page.waitForLoadState('networkidle')
    await wait(2000)
  }

  const finalUrl = page.url()
  console.log(`  ✓ URL: ${finalUrl}`)
  return finalUrl
}

async function main() {
  const browser = await chromium.connectOverCDP('http://localhost:9222')
  const context = browser.contexts()[0]
  const page = context.pages()[0]

  await page.goto('https://app.gumroad.com/products')
  await page.waitForLoadState('networkidle')

  if (page.url().includes('login')) {
    console.error('Niezalogowany. Zaloguj się do Gumroad i uruchom ponownie.')
    process.exit(1)
  }

  console.log('✓ Zalogowany do Gumroad')
  console.log(`Tworzę ${PRODUCTS.length} produktów...\n`)

  const results = []
  for (let i = 0; i < PRODUCTS.length; i++) {
    try {
      const url = await createProduct(page, PRODUCTS[i], i)
      results.push({ name: PRODUCTS[i].name, url, ok: true })
    } catch (err) {
      console.error(`  ✗ ${err.message}`)
      results.push({ name: PRODUCTS[i].name, ok: false, error: err.message })
    }
    await wait(1500)
  }

  console.log('\n══════════════════════════════════')
  console.log('PODSUMOWANIE:')
  for (const r of results) {
    console.log(`${r.ok ? '✓' : '✗'} ${r.name}${r.url ? ' → ' + r.url : ''}`)
  }

  await browser.close()
}

main().catch(e => { console.error(e.message); process.exit(1) })
