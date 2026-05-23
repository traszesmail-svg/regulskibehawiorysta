import assert from 'node:assert/strict'
import { spawn, type ChildProcess } from 'node:child_process'

const rootDir = process.cwd()
const port = 3412
const appUrl = `http://127.0.0.1:${port}`
const canonicalBase = 'https://regulskibehawiorysta.pl'
const retiredLocalSeoPath = `/behawiorysta-${['ol', 'sz', 'tyn'].join('')}`

const routeChecks = [
  { route: '/behawiorysta-online-polska', heading: 'Behawiorysta psów i kotów online' },
  { route: '/bezplatne-materialy/pies-ile-ruchu-potrzebuje', heading: 'Czy Twój pies naprawdę potrzebuje więcej ruchu?' },
  { route: '/bezplatne-materialy/kot-zyje-w-napieciu', heading: 'Kot żyje w napięciu' },
  { route: '/bezplatne-materialy/30-zachowan', heading: '30 zachowań do obserwacji' },
  { route: '/blog', heading: 'Teksty o zachowaniu psów i kotów - konkretnie, bez ogólników.' },
  { route: '/materialy', heading: 'Materialy - materiały do samodzielnej pracy' },
  { route: '/psy/reaktywnosc-na-smyczy', heading: 'Reaktywność psa na smyczy' },
  { route: '/koty/zalatwianie-poza-kuweta', heading: 'Kot załatwia się poza kuwetą' },
  { route: '/behawiorysta-psow', heading: 'Behawiorysta psów online' },
  { route: '/behawiorysta-kotow', heading: 'Behawiorysta kotów online' },
] as const

function normalizeHtmlText(input: string) {
  return input.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function extractH1(html: string) {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  return match ? normalizeHtmlText(match[1]) : ''
}

function extractCanonical(html: string) {
  const match = html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i)
  return match?.[1] ?? ''
}

function hasMeta(html: string, marker: string) {
  return html.includes(marker)
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

  throw new Error('Stage 7B manual check server did not become ready in time.')
}

async function main() {
  let server: ChildProcess | null = null

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
      assert.equal(response.status, 200, `${check.route} should return 200.`)
      assert.equal(extractH1(html), check.heading, `${check.route} should expose expected H1.`)
      console.log(JSON.stringify({ route: check.route, h1: extractH1(html), status: response.status }))
    }

    const redirectResponse = await fetch(`${appUrl}${retiredLocalSeoPath}`, {
      cache: 'no-store',
      redirect: 'manual',
    })
    assert.equal(redirectResponse.status, 308)
    assert.equal(redirectResponse.headers.get('location')?.endsWith('/behawiorysta-online-polska'), true)

    const polandHtml = await fetch(`${appUrl}/behawiorysta-online-polska`, { cache: 'no-store' }).then((response) => response.text())
    assert.equal(extractCanonical(polandHtml), `${canonicalBase}/behawiorysta-online-polska`)
    assert.equal(hasMeta(polandHtml, 'Behawiorysta psów i kotów online - cała Polska | Regulski'), true)

    const blogHtml = await fetch(`${appUrl}/blog`, { cache: 'no-store' }).then((response) => response.text())
    assert.equal(blogHtml.includes('Newsletter dla opiekunów psów i kotów'), true)

    const toolkitHtml = await fetch(`${appUrl}/materialy`, { cache: 'no-store' }).then((response) => response.text())
    assert.equal(toolkitHtml.includes('Osobne wejścia do bezpłatnych materiałów'), true)
    assert.equal(toolkitHtml.includes('Newsletter dla opiekunów psów i kotów'), true)

    const landingHtml = await fetch(`${appUrl}/psy/reaktywnosc-na-smyczy`, { cache: 'no-store' }).then((response) => response.text())
    assert.equal(landingHtml.includes('Jeśli chcesz zacząć lżej niż od rozmowy'), true)

    const newsletterSignupResponse = await fetch(`${appUrl}/api/growth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'newsletter',
        email: 'stage7b-newsletter@example.com',
        segment: 'pies',
        location: 'stage7b-script',
        sourcePage: '/blog',
      }),
    })
    assert.equal(newsletterSignupResponse.status, 200)

    const leadMagnetSignupResponse = await fetch(`${appUrl}/api/growth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'lead_magnet',
        email: 'stage7b-lead@example.com',
        leadMagnetSlug: 'pies-ile-ruchu-potrzebuje',
        location: 'stage7b-script',
        sourcePage: '/bezplatne-materialy/pies-ile-ruchu-potrzebuje',
      }),
    })
    const leadMagnetPayload = (await leadMagnetSignupResponse.json()) as { redirectTo?: string }
    assert.equal(leadMagnetSignupResponse.status, 200)
    assert.equal(leadMagnetPayload.redirectTo?.includes('/bezplatne-materialy/dziekuje?leadMagnet=pies-ile-ruchu-potrzebuje'), true)

    const fileResponse = await fetch(`${appUrl}/api/lead-magnet/pies-ile-ruchu-potrzebuje`, { cache: 'no-store' })
    assert.equal(fileResponse.status, 200)
    assert.equal((fileResponse.headers.get('content-type') ?? '').includes('application/pdf'), true)

    const thankYouHtml = await fetch(`${appUrl}/bezplatne-materialy/dziekuje?leadMagnet=pies-ile-ruchu-potrzebuje`, {
      cache: 'no-store',
    }).then((response) => response.text())
    assert.equal(thankYouHtml.includes('noindex'), true)

    const sitemapXml = await fetch(`${appUrl}/sitemap.xml`, { cache: 'no-store' }).then((response) => response.text())
    assert.equal(sitemapXml.includes(`${canonicalBase}${retiredLocalSeoPath}`), false)
    assert.equal(sitemapXml.includes('<loc>https://regulskibehawiorysta.pl/behawiorysta-online-polska</loc>'), true)
    assert.equal(sitemapXml.includes('<loc>https://regulskibehawiorysta.pl/bezplatne-materialy/pies-ile-ruchu-potrzebuje</loc>'), true)
    assert.equal(sitemapXml.includes('/bezplatne-materialy/dziekuje'), false)
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
