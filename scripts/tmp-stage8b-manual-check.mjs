import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'

const rootDir = process.cwd()
const port = 3413
const appUrl = `http://127.0.0.1:${port}`
const canonicalBase = 'https://regulskibehawiorysta.pl'

const routeChecks = [
  { route: '/bezplatne-materialy/pies-ile-ruchu-potrzebuje', heading: 'Czy Twój pies naprawdę potrzebuje więcej ruchu?' },
  {
    route: '/bezplatne-materialy/kot-zyje-w-napieciu',
    heading: 'Kot żyje w napięciu',
  },
  {
    route: '/bezplatne-materialy/30-zachowan',
    heading: '30 zachowań do obserwacji',
  },
  { route: '/opinie', heading: 'Co opiekunowie mówią o konsultacjach' },
  { route: '/o-mnie', heading: 'Krzysztof Regulski - behawiorysta psów i kotów' },
  {
    route: '/kontakt',
    heading: 'Napisz, jeśli masz pytanie przed rezerwacją albo chcesz sprawdzić dostępność terminów.',
  },
  { route: '/materialy', heading: 'Materialy - materiały do samodzielnej pracy' },
  { route: '/cennik', heading: 'Cennik i zakres konsultacji' },
  { route: '/konsultacja-behawioralna-online', heading: 'Konsultacja behawioralna online - jak to wygląda' },
  { route: '/behawiorysta-psow', heading: 'Behawiorysta psów online' },
  { route: '/behawiorysta-kotow', heading: 'Behawiorysta kotów online' },
  { route: '/psy/reaktywnosc-na-smyczy', heading: 'Reaktywność psa na smyczy' },
  { route: '/psy/lek-separacyjny', heading: 'Lęk separacyjny u psa' },
  { route: '/koty/zalatwianie-poza-kuweta', heading: 'Kot załatwia się poza kuwetą' },
  { route: '/koty/konflikt-miedzy-kotami', heading: 'Konflikt między kotami w domu' },
  { route: '/blog', heading: 'Teksty o zachowaniu psów i kotów - konkretnie, bez ogólników.' },
]

function normalizeHtmlText(input) {
  return input.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function extractH1(html) {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  return match ? normalizeHtmlText(match[1]) : ''
}

function extractCanonical(html) {
  const match = html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i)
  return match?.[1] ?? ''
}

async function waitForServer() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(appUrl, { cache: 'no-store' })
      if (response.status > 0) {
        return
      }
    } catch {}

    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  throw new Error('Stage 8B manual check server did not become ready in time.')
}

async function main() {
  let server = null

  try {
    server = spawn('cmd.exe', ['/c', 'npm', 'run', 'dev', '--', '--hostname', '127.0.0.1', '--port', String(port)], {
      cwd: rootDir,
      env: process.env,
      stdio: 'ignore',
      windowsHide: true,
    })

    await waitForServer()

    for (const check of routeChecks) {
      const response = await fetch(`${appUrl}${check.route}`, { cache: 'no-store' })
      const html = await response.text()
      assert.equal(response.status, 200, `${check.route} should return 200`)
      assert.equal(extractH1(html), check.heading, `${check.route} should expose expected H1`)
      console.log(JSON.stringify({ route: check.route, h1: extractH1(html), status: response.status }))
    }

    const dogMagnetHtml = await fetch(`${appUrl}/bezplatne-materialy/pies-ile-ruchu-potrzebuje`, { cache: 'no-store' }).then((res) => res.text())
    assert.equal(dogMagnetHtml.includes('Krótki FAQ przed pobraniem'), true)
    assert.equal(dogMagnetHtml.includes('To nie jest kolejny przypadkowy PDF do zapisania na później'), true)

    const thankYouHtml = await fetch(`${appUrl}/bezplatne-materialy/dziekuje?leadMagnet=pies-ile-ruchu-potrzebuje`, {
      cache: 'no-store',
    }).then((res) => res.text())
    assert.equal(thankYouHtml.includes('ruch, pobudzenie czy odpoczynek'), true)
    assert.equal(thankYouHtml.includes('noindex'), true)

    const pricingHtml = await fetch(`${appUrl}/cennik`, { cache: 'no-store' }).then((res) => res.text())
    assert.equal(pricingHtml.includes('Najczęstsze pytania przed rezerwacją'), true)
    assert.equal(pricingHtml.includes('Cennik ma porządkować decyzję, nie wywoływać presję'), true)

    const consultationHtml = await fetch(`${appUrl}/konsultacja-behawioralna-online`, { cache: 'no-store' }).then((res) => res.text())
    assert.equal(consultationHtml.includes('Najczęstsze pytania o konsultację online'), true)

    const dogBehavioristHtml = await fetch(`${appUrl}/behawiorysta-psow`, { cache: 'no-store' }).then((res) => res.text())
    assert.equal(dogBehavioristHtml.includes('Dwie sytuacje, z którymi opiekunowie psów zgłaszają się najczęściej'), true)

    const catBehavioristHtml = await fetch(`${appUrl}/behawiorysta-kotow`, { cache: 'no-store' }).then((res) => res.text())
    assert.equal(catBehavioristHtml.includes('Dwie sytuacje, w których uporządkowanie tematu daje największą ulgę'), true)

    const opinionsHtml = await fetch(`${appUrl}/opinie`, { cache: 'no-store' }).then((res) => res.text())
    assert.equal(opinionsHtml.includes('Ta strona ma wzmacniać decyzję, ale nie zastępować rozmowy'), true)

    const contactHtml = await fetch(`${appUrl}/kontakt`, { cache: 'no-store' }).then((res) => res.text())
    assert.equal(contactHtml.includes('Kontakt ma być spokojnym filtrem wejścia, nie osobnym lejkiem'), true)

    const essentialsHtml = await fetch(`${appUrl}/materialy`, { cache: 'no-store' }).then((res) => res.text())
    assert.equal(essentialsHtml.includes('Materialy ma wspierać decyzję, nie udawać nowej usługi'), true)

    const landingHtml = await fetch(`${appUrl}/psy/reaktywnosc-na-smyczy`, { cache: 'no-store' }).then((res) => res.text())
    assert.equal(landingHtml.includes('Jak wygląda punkt startu przy podobnym problemie'), true)
    assert.equal(landingHtml.includes('Na landingach problemowych trust ma tylko dopiąć decyzję'), true)

    const sitemapXml = await fetch(`${appUrl}/sitemap.xml`, { cache: 'no-store' }).then((res) => res.text())
    assert.equal(sitemapXml.includes('<loc>https://regulskibehawiorysta.pl/bezplatne-materialy/pies-ile-ruchu-potrzebuje</loc>'), true)
    assert.equal(sitemapXml.includes('/bezplatne-materialy/dziekuje'), false)

    const dogMagnetCanonical = extractCanonical(dogMagnetHtml)
    assert.equal(dogMagnetCanonical, `${canonicalBase}/bezplatne-materialy/pies-ile-ruchu-potrzebuje`)
  } finally {
    if (server) {
      server.kill()
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error)
  process.exitCode = 1
})
