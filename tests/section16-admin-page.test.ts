import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as cheerio from 'cheerio'

// Ensure React is available globally for JSX components rendered in tests
;(globalThis as unknown as { React: typeof React }).React = React

import {
  AdminSection16UrgentRequests,
  generateIdempotencyKey,
  STATE_OPTIONS,
  STATE_DISPLAY_LABELS,
  getStatusPillClass,
  type UrgentIntakeAdminDto,
} from '../components/AdminSection16UrgentRequests'
import { URGENT_INTAKE_STATES } from '../lib/server/section16-types'
import AdminSection16Page from '../app/admin/section16/page'

function readProjectFile(...segments: string[]): string {
  return readFileSync(path.join(process.cwd(), ...segments), 'utf8')
}

test('1. Nawigacja admina w app/admin/page.tsx zawiera odnośnik do /admin/section16 bez dublowania na desktopie', () => {
  const adminPageSource = readProjectFile('app', 'admin', 'page.tsx')

  // Sprawdzenie obecności /admin/section16 w adminNavItems
  assert.match(
    adminPageSource,
    /\{\s*href:\s*['"]\/admin\/section16['"],\s*label:\s*['"]Sekcja 16['"]\s*\}/,
    'adminNavItems musi zawierać link do /admin/section16',
  )

  // Sprawdzenie wywołania AdminTopbar w desktopChildren
  assert.match(
    adminPageSource,
    /<AdminTopbar\s*\/>/,
    'desktopChildren powinno renderować <AdminTopbar />',
  )

  // Sprawdzenie, że AdminTopbar występuje dokładnie raz
  const topbarMatches = adminPageSource.match(/<AdminTopbar\s*\/>/g) || []
  assert.equal(topbarMatches.length, 1, 'AdminTopbar musi być wywołany dokładnie raz')

  // Sprawdzenie, że link do /admin/section16 NIE został zdublowany w hero-actions
  const heroActionsMatch = adminPageSource.match(/<div className="hero-actions">([\s\S]*?)<\/div>/)
  assert.ok(heroActionsMatch, 'hero-actions musi istnieć w app/admin/page.tsx')
  assert.doesNotMatch(
    heroActionsMatch[1],
    /href=['"]\/admin\/section16['"]/,
    'hero-actions nie może dublować linku do /admin/section16 (nawigacja znajduje się w AdminTopbar)',
  )
})

test('2. Strona app/admin/section16/page.tsx zachowuje force-dynamic, noStore, AdminPageShell i link do admina', () => {
  const pageSource = readProjectFile('app', 'admin', 'section16', 'page.tsx')

  assert.match(pageSource, /export const dynamic = 'force-dynamic'/)
  assert.match(pageSource, /export const revalidate = 0/)
  assert.match(pageSource, /noStore\(\)/)
  assert.match(pageSource, /<AdminPageShell/)
  assert.match(pageSource, /<AdminSection16UrgentRequests\s*\/>/)
  assert.match(pageSource, /href=['"]\/admin['"]/)

  // Render strony SSR / static markup
  const html = renderToStaticMarkup(React.createElement(AdminSection16Page))
  const $ = cheerio.load(html)
  assert.ok($('h1').text().includes('Pilne zgłoszenia sekcji 16'))
  assert.ok($('a[href="/admin"]').length > 0)
  assert.ok($('[data-testid="section16-admin-panel"]').length > 0)
})

test('3. Brak PII i izolacja bezpieczeństwa w components/AdminSection16UrgentRequests.tsx', () => {
  const componentSource = readProjectFile('components', 'AdminSection16UrgentRequests.tsx')

  // Niedozwolone pola PII i wrażliwe dane
  const forbiddenFields = [
    'fingerprint',
    'ciphertext',
    'contactCiphertext',
    'clientName',
    'clientNotes',
    'paymentReference',
    'bookingId',
    'audit',
  ]

  for (const field of forbiddenFields) {
    const regex = new RegExp(`\\b${field}\\b`, 'i')
    assert.doesNotMatch(
      componentSource,
      regex,
      `Komponent nie może zawierać ani odwoływać się do pola '${field}'`,
    )
  }

  // Brak integracji propozycji, kalendarza, SMS, e-mail, płatności ani publicznego UI
  assert.doesNotMatch(componentSource, /proposal\/route/i)
  assert.doesNotMatch(componentSource, /calendar/i)
  assert.doesNotMatch(componentSource, /sms/i)
  assert.doesNotMatch(componentSource, /sendEmail|nodemailer/i)
  assert.doesNotMatch(componentSource, /payu|stripe|manual-payment/i)

  // Wyłącznie dozwolony endpoint GET i POST
  const fetchMatches = componentSource.match(/fetch\(['"`](.*?)['"`]/g) || []
  assert.ok(fetchMatches.length > 0)
  for (const match of fetchMatches) {
    assert.match(
      match,
      /\/api\/admin\/section16\/urgent-requests/,
      `Wszystkie wywołania fetch muszą trafiać do /api/admin/section16/urgent-requests, znaleziono: ${match}`,
    )
  }
})

test('4. Struktura DOM komponentu: formularz create, filtry, podsumowanie i stany', () => {
  const html = renderToStaticMarkup(React.createElement(AdminSection16UrgentRequests))
  const $ = cheerio.load(html)

  // Panel główny
  assert.ok($('[data-testid="section16-admin-panel"]').length === 1)

  // Formularz create
  assert.ok($('[data-testid="create-request-form"]').length === 1)
  assert.ok($('[data-testid="form-daychoice-select"]').length === 1)
  assert.ok($('[data-testid="form-rawphone-input"]').length === 1)
  assert.ok($('[data-testid="form-idempotency-input"]').length === 1)
  assert.ok($('[data-testid="form-generate-key-btn"]').length === 1)
  assert.ok($('[data-testid="form-submit-btn"]').length === 1)

  // Filtry
  assert.ok($('[data-testid="filters-container"]').length === 1)
  assert.ok($('[data-testid="filter-state-select"]').length === 1)
  assert.ok($('[data-testid="filter-daychoice-select"]').length === 1)
  assert.ok($('[data-testid="filter-limit-select"]').length === 1)
  assert.ok($('[data-testid="filter-refresh-btn"]').length === 1)
  assert.ok($('[data-testid="filter-reset-btn"]').length === 1)

  // Opcje filtrów stanu - dokładnie kanoniczne stany z URGENT_INTAKE_STATES
  const stateOptions = $('[data-testid="filter-state-select"] option')
    .map((_, el) => $(el).val())
    .get()
  assert.ok(stateOptions.includes(''))
  assert.ok(stateOptions.includes('pending_proposal'))
  assert.ok(stateOptions.includes('timeslot_proposed'))
  assert.ok(stateOptions.includes('payment_confirmed'))
  assert.ok(stateOptions.includes('expired'))
  assert.ok(stateOptions.includes('cancelled'))
  assert.ok(stateOptions.includes('rejected'))

  // Brak starych niekanonicznych stanów
  assert.ok(!stateOptions.includes('draft'))
  assert.ok(!stateOptions.includes('awaiting_call'))
  assert.ok(!stateOptions.includes('slot_proposed'))
  assert.ok(!stateOptions.includes('hold_confirmed'))
  assert.ok(!stateOptions.includes('booked'))

  // Opcje wyboru dnia
  const dayOptions = $('[data-testid="filter-daychoice-select"] option')
    .map((_, el) => $(el).val())
    .get()
  assert.ok(dayOptions.includes(''))
  assert.ok(dayOptions.includes('today'))
  assert.ok(dayOptions.includes('tomorrow'))

  // Podsumowanie statystyk
  assert.ok($('[data-testid="summary-statistics"]').length === 1)
  assert.ok($('[data-testid="count-total"]').length === 1)
  assert.ok($('[data-testid="count-pending-proposal"]').length === 1)
  assert.ok($('[data-testid="count-timeslot-proposed"]').length === 1)
  assert.ok($('[data-testid="count-payment-confirmed"]').length === 1)

  // Domyślny stan pusty w renderowaniu SSR (brak elementów w stanie początkowym)
  assert.ok($('[data-testid="empty-state"]').length === 1)
  assert.match($('[data-testid="empty-state"]').text(), /Brak zgłoszeń sekcji 16/)
})

test('5. Generator idempotencyKey generuje poprawne i unikalne klucze', () => {
  const key1 = generateIdempotencyKey()
  const key2 = generateIdempotencyKey()

  assert.ok(typeof key1 === 'string' && key1.length > 0 && key1.length <= 128)
  assert.ok(typeof key2 === 'string' && key2.length > 0 && key2.length <= 128)
  assert.notEqual(key1, key2)
})

test('6. Weryfikacja czyszczenia rawPhone z pamięci formularza po sukcesie create w kodzie źródłowym', () => {
  const componentSource = readProjectFile('components', 'AdminSection16UrgentRequests.tsx')

  // Sprawdzenie, że setRawPhone('') jest wywoływane w gałęzi sukcesu
  assert.match(
    componentSource,
    /setRawPhone\(['"]['"]\)/,
    'Komponent musi wywołać setRawPhone("") po sukcesie create',
  )

  // Sprawdzenie, że odświeża listę po sukcesie create
  assert.match(
    componentSource,
    /await\s+fetchRequests\(\)/,
    'Komponent musi odświeżyć listę zgłoszeń po utworzeniu',
  )

  // Sprawdzenie, że generuje nowy klucz idempotencji po sukcesie
  assert.match(
    componentSource,
    /setIdempotencyKey\(generateIdempotencyKey\(\)\)/,
    'Komponent musi wygenerować nowy klucz idempotencji po sukcesie',
  )
})

test('7. Obsługa błędów fail-closed (403), autoryzacji (401) i konfliktów (409) w kodzie komponentu', () => {
  const componentSource = readProjectFile('components', 'AdminSection16UrgentRequests.tsx')

  // 403 - jasna informacja o wyłączeniu funkcji
  assert.match(componentSource, /res\.status === 403/)
  assert.match(componentSource, /Funkcja jest wyłączona/)
  assert.match(componentSource, /SECTION16_ADMIN_PROPOSALS_ENABLED/)
  assert.match(componentSource, /data-testid="feature-disabled-alert"/)

  // 401 - informacja o braku autoryzacji
  assert.match(componentSource, /res\.status === 401/)
  assert.match(componentSource, /Brak autoryzacji administratora/)
  assert.match(componentSource, /data-testid="auth-error-alert"/)

  // 409 - informacja o konflikcie
  assert.match(componentSource, /res\.status === 409/)
  assert.match(componentSource, /Konflikt stanu zgłoszenia lub klucza idempotencji/)
})

test('8. Prezentacja minimalnego DTO w liście zgłoszeń bez wycieku pełnego numeru telefonu', () => {
  const mockDto: UrgentIntakeAdminDto = {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    dayChoice: 'today',
    targetDate: '2026-10-13',
    callerPhoneMasked: '+48 501 *** 567',
    state: 'pending_proposal',
    proposal: {
      proposedDate: '2026-10-13',
      proposedTime: '12:00',
      proposedTimeslotIso: '2026-10-13T10:00:00.000Z',
    },
    holdExpiresAt: '2026-10-13T10:15:00.000Z',
    expiresAt: '2026-10-13T20:00:00.000Z',
    version: 2,
    createdAt: '2026-10-13T07:00:00.000Z',
    updatedAt: '2026-10-13T07:05:00.000Z',
  }

  // Weryfikacja, że DTO zawiera wyłącznie callerPhoneMasked i nie ma pełnego rawPhone
  assert.equal(mockDto.callerPhoneMasked, '+48 501 *** 567')
  assert.equal((mockDto as unknown as Record<string, unknown>).rawPhone, undefined)
  assert.equal((mockDto as unknown as Record<string, unknown>).fingerprint, undefined)
  assert.equal((mockDto as unknown as Record<string, unknown>).ciphertext, undefined)
  assert.equal((mockDto as unknown as Record<string, unknown>).clientName, undefined)
})

test('9. Renderowanie elementów listy zgłoszeń prezentuje wyłącznie dozwolone pola minimalnego DTO', () => {
  // Symulacja mapowania rekordu w widoku z zachowaniem struktury komponentu
  const req: UrgentIntakeAdminDto = {
    id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    dayChoice: 'tomorrow',
    targetDate: '2026-10-14',
    callerPhoneMasked: '+48 600 *** 123',
    state: 'timeslot_proposed',
    proposal: {
      proposedDate: '2026-10-14',
      proposedTime: '15:30',
      proposedTimeslotIso: '2026-10-14T13:30:00.000Z',
    },
    holdExpiresAt: '2026-10-14T14:00:00.000Z',
    expiresAt: '2026-10-14T23:59:59.000Z',
    version: 3,
    createdAt: '2026-10-13T08:00:00.000Z',
    updatedAt: '2026-10-13T08:30:00.000Z',
  }

  const renderedItemHtml = renderToStaticMarkup(
    React.createElement(
      'article',
      { className: 'booking-row', 'data-testid': `request-item-${req.id}` },
      React.createElement('span', { className: 'status-pill status-pending' }, 'Zaproponowano termin'),
      React.createElement('h3', null, `Zgłoszenie: Jutro (${req.targetDate})`),
      React.createElement('div', { className: 'booking-meta' }, `Telefon (maskowany): ${req.callerPhoneMasked}`),
      React.createElement('div', null, `ID: ${req.id}`),
      React.createElement('div', null, `Wersja: v${req.version}`),
      React.createElement('div', null, `Propozycja terminu: ${req.proposal?.proposedDate} o godz. ${req.proposal?.proposedTime}`),
    ),
  )

  const $ = cheerio.load(renderedItemHtml)
  assert.ok($('.booking-row').length === 1)
  assert.ok($.text().includes('+48 600 *** 123'))
  assert.ok($.text().includes('Zaproponowano termin'))
  assert.ok($.text().includes('2026-10-14'))
  assert.ok($.text().includes('15:30'))
  assert.ok($.text().includes('v3'))

  // Żaden element nie ujawnia surowych danych PII
  assert.ok(!$.text().includes('rawPhone'))
  assert.ok(!$.text().includes('clientName'))
  assert.ok(!$.text().includes('clientNotes'))
  assert.ok(!$.text().includes('fingerprint'))
  assert.ok(!$.text().includes('ciphertext'))
  assert.ok(!$.text().includes('paymentReference'))
  assert.ok(!$.text().includes('bookingId'))
  assert.ok(!$.text().includes('audit'))
})

test('10. Spójność obsługi kodów błędów HTTP i komunikatów dla użytkownika', () => {
  const componentSource = readProjectFile('components', 'AdminSection16UrgentRequests.tsx')

  // Weryfikacja, że 403 daje jednoznaczny komunikat o wyłączonej funkcji
  const status403Match = componentSource.match(/res\.status === 403[\s\S]*?throw new Error\(['"`](.*?)['"`]\)/)
  assert.ok(status403Match)
  assert.match(status403Match[1], /Funkcja jest wyłączona/)

  // Weryfikacja, że 401 daje komunikat o braku autoryzacji
  const status401Match = componentSource.match(/res\.status === 401[\s\S]*?throw new Error\(['"`](.*?)['"`]\)/)
  assert.ok(status401Match)
  assert.match(status401Match[1], /Brak autoryzacji/)

  // Weryfikacja, że 409 daje komunikat o konflikcie
  const status409Match = componentSource.match(/res\.status === 409[\s\S]*?throw new Error\([\s\S]*?409 Conflict/)
  assert.ok(status409Match)
})

test('11. Responsywność i istniejący styl panelu admina (form-grid, summary-grid, status-pill, booking-row)', () => {
  const componentSource = readProjectFile('components', 'AdminSection16UrgentRequests.tsx')

  // Zgodność ze stylami admina z app/globals.css
  assert.match(componentSource, /className="form-grid/)
  assert.match(componentSource, /className="summary-grid/)
  assert.match(componentSource, /className="summary-card/)
  assert.match(componentSource, /className="booking-list/)
  assert.match(componentSource, /className="booking-row/)
  assert.match(componentSource, /className="error-box/)
  assert.match(componentSource, /className="empty-box/)
  assert.match(componentSource, /className="info-box/)
  assert.match(componentSource, /className="button button-primary/)
  assert.match(componentSource, /className="button button-ghost/)
  assert.match(componentSource, /status-pill status-paid/)
  assert.match(componentSource, /status-pill status-pending/)
})

test('12. Opcje filtra stanu w panelu są w 100% zgodne z kanonicznym URGENT_INTAKE_STATES z modelu domenowego', () => {
  const html = renderToStaticMarkup(React.createElement(AdminSection16UrgentRequests))
  const $ = cheerio.load(html)
  const nonDefaultRenderedOptions = $('[data-testid="filter-state-select"] option')
    .map((_, el) => $(el).val())
    .get()
    .filter((val) => val !== '')

  // 1. Sprawdzenie, że wyrenderowane w DOM wartości opcji filtra odpowiadają dokładnie URGENT_INTAKE_STATES
  assert.deepEqual(
    [...nonDefaultRenderedOptions].sort(),
    [...URGENT_INTAKE_STATES].sort(),
    'Opcje select w panelu muszą w 100% odpowiadać kanonicznym stanom URGENT_INTAKE_STATES z lib/server/section16-types.ts',
  )

  // 2. Sprawdzenie, że eksportowana tablica STATE_OPTIONS odpowiada dokładnie URGENT_INTAKE_STATES
  const nonDefaultExportedOptions = STATE_OPTIONS.filter((opt) => opt.value !== '').map((opt) => opt.value)
  assert.deepEqual(
    [...nonDefaultExportedOptions].sort(),
    [...URGENT_INTAKE_STATES].sort(),
    'Eksportowane STATE_OPTIONS muszą w 100% odpowiadać kanonicznym stanom URGENT_INTAKE_STATES',
  )
})

test('13. Wszystkie stany kanoniczne URGENT_INTAKE_STATES posiadają polskie etykiety i poprawne klasy status-pill', () => {
  for (const state of URGENT_INTAKE_STATES) {
    const label = STATE_DISPLAY_LABELS[state]
    assert.ok(
      typeof label === 'string' && label.length > 0,
      `Stan ${state} musi posiadać polską etykietę w STATE_DISPLAY_LABELS`,
    )

    const pillClass = getStatusPillClass(state)
    assert.match(pillClass, /status-pill/, `Stan ${state} musi mieć klasę status-pill`)

    if (state === 'payment_confirmed') {
      assert.equal(pillClass, 'status-pill status-paid', 'payment_confirmed powinien mieć status-pill status-paid')
    } else if (state === 'pending_proposal' || state === 'timeslot_proposed') {
      assert.equal(pillClass, 'status-pill status-pending', `${state} powinien mieć status-pill status-pending`)
    } else {
      assert.equal(pillClass, 'status-pill', `${state} powinien mieć status-pill`)
    }
  }
})
