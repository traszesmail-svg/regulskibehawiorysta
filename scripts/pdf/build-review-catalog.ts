import { execFile } from 'node:child_process'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'
import * as cheerio from 'cheerio'
import { marked } from 'marked'
import { chromium } from 'playwright-core'
import sharp from 'sharp'
import {
  PRICE_AMOUNT_PLN,
  PRICE_LABEL,
  listMaterialyGuides,
  type MaterialyGuide,
} from '../../lib/materialy-catalog'

const execFileAsync = promisify(execFile)
const ROOT = process.cwd()
const OUTPUT_DIR = path.join(ROOT, 'do-przegladu', 'materialy-pdf-2026-07-21')
const AUDIT_DIR = path.join(ROOT, '.tmp', 'materialy-pdf-review-20260721')
const REVIEW_CATALOG = path.join(ROOT, 'content', 'guides', 'review-catalog.json')
const CSS_PATH = path.join(ROOT, 'content', 'guides', 'review-template', 'styles.css')

type ReviewGuide = MaterialyGuide & { reviewOnly?: boolean }

const sourceCandidates = (slug: string) => [
  path.join(ROOT, 'content', 'guides', 'items', slug, 'guide.md'),
  path.join(ROOT, 'content', 'guides', `final-${slug}`, 'guide.md'),
  path.join(ROOT, 'content', 'guides', `clean-${slug}`, 'guide.md'),
  path.join(ROOT, 'content', 'guides', 'sources', slug, 'guide.html'),
]

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function categoryLabel(category: ReviewGuide['category']) {
  if (category === 'dog') return 'Poradnik dla opiekuna psa'
  if (category === 'cat') return 'Poradnik dla opiekuna kota'
  return 'Poradnik dla opiekuna psa lub kota'
}

function formatLabel(guide: ReviewGuide) {
  if (guide.priceCode === 'free') return 'Spokojny start · bezpłatny materiał'
  if (guide.priceCode === 'p19') return 'Praktyczna instrukcja · 19 zł'
  if (guide.priceCode === 'p29') return 'Plan wdrożeniowy · 29 zł'
  if (guide.priceCode === 'p39') return 'Rozszerzony plan pracy · 39 zł'
  if (guide.priceCode === 'p49') return 'Program tematyczny · 49 zł'
  return 'Kompendium opiekuna · 59 zł'
}

function animalMark(category: ReviewGuide['category']) {
  const dog = '<path fill="currentColor" d="M18 73c0-16 8-27 22-33l7-17 10 12c17-1 29 7 34 23l11 6-8 11-9-4c-2 12-10 20-22 23l-2 18H50l-2-17H35l-4 17H20l3-26c-3-4-5-8-5-13Z"/>'
  const cat = '<path fill="currentColor" d="M31 48 25 23l18 13c7-3 15-3 22 0l18-13-6 26c7 8 10 18 8 29-2 16-14 29-30 31-20 2-37-14-37-34 0-10 4-19 13-27Zm14 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm23 0a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM45 81c7 6 15 6 23 0l-4-5c-5 4-10 4-15 0l-4 5Z"/>'
  const paths = category === 'dog' ? dog : category === 'cat' ? cat : `${dog}<g transform="translate(47 31) scale(.62)">${cat}</g>`
  return `<span class="animal-mark" aria-hidden="true"><svg viewBox="0 0 120 120">${paths}</svg></span>`
}

function stripSourceHero(html: string, guide: ReviewGuide) {
  const $ = cheerio.load(`<main id="source-root">${html}</main>`)
  const root = $('#source-root')
  root.find('script, style, nav, footer').remove()

  const firstCallout = root.find('table[data-kind="callout"]').first()
  if (firstCallout.length && firstCallout.find('ul').length && firstCallout.find('strong').length >= 2) {
    firstCallout.remove()
  }

  const normalizedTitle = guide.title.toLocaleLowerCase('pl').replace(/[^a-ząćęłńóśźż0-9]+/g, ' ').trim()
  let inspected = 0
  root.children().each((_index, node) => {
    if (inspected >= 4) return false
    const tag = node.tagName?.toLowerCase()
    if (tag && /^h[1-6]$/.test(tag)) {
      const text = $(node).text().toLocaleLowerCase('pl').replace(/[^a-ząćęłńóśźż0-9]+/g, ' ').trim()
      if (text === normalizedTitle) $(node).remove()
      return false
    }
    if (tag !== 'p') return false
    const text = $(node).text().toLocaleLowerCase('pl').replace(/[^a-ząćęłńóśźż0-9]+/g, ' ').trim()
    if (
      text === normalizedTitle ||
      normalizedTitle.startsWith(text) ||
      text.startsWith(normalizedTitle.slice(0, Math.min(30, normalizedTitle.length))) ||
      inspected < 3
    ) {
      $(node).remove()
      inspected += 1
      return
    }
    return false
  })

  root.find('h1').each((_index, node) => {
    const text = $(node).text().toLocaleLowerCase('pl').replace(/[^a-ząćęłńóśźż0-9]+/g, ' ').trim()
    if (text === normalizedTitle) $(node).remove()
  })

  return root.html() ?? ''
}

async function loadGuideBody(guide: ReviewGuide) {
  const candidate = await (async () => {
    for (const file of sourceCandidates(guide.slug)) {
      try {
        await fs.access(file)
        return file
      } catch {
        // Try the next source format.
      }
    }
    return null
  })()

  if (!candidate) throw new Error(`Brak źródła treści dla ${guide.slug}`)
  const source = await fs.readFile(candidate, 'utf8')
  const html = candidate.endsWith('.md') ? String(await marked.parse(source)) : source
  return { html: stripSourceHero(html, guide), source: path.relative(ROOT, candidate) }
}

function renderDocument(guide: ReviewGuide, css: string, bodyHtml: string) {
  const amount = PRICE_AMOUNT_PLN[guide.priceCode]
  const price = amount === 0 ? 'Bezpłatnie' : `${amount} zł`
  const highlights = guide.highlights.map((highlight) => `<li>${escapeHtml(highlight)}</li>`).join('')

  return `<!doctype html>
<html lang="pl">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(guide.title)} · Regulski Behawiorysta</title>
  <style>${css}</style>
</head>
<body data-price="${guide.priceCode}" data-category="${guide.category}">
  <section class="cover">
    <div class="cover-inner">
      <header class="cover-top">
        <span class="brand">Regulski Behawiorysta</span>
        <span class="edition">${escapeHtml(PRICE_LABEL[guide.priceCode])}</span>
      </header>
      <div class="cover-main">
        <div class="cover-kicker">${escapeHtml(formatLabel(guide))}</div>
        <h1>${escapeHtml(guide.title)}</h1>
        <p class="cover-subtitle">${escapeHtml(guide.subtitle)}</p>
        <p class="cover-promise">${escapeHtml(guide.shortPromise)}</p>
        <ul class="cover-highlights">${highlights}</ul>
      </div>
      ${animalMark(guide.category)}
      <footer class="cover-foot">
        <div class="cover-disclaimer"><strong>Materiał edukacyjny</strong>Nie zastępuje badania lekarsko-weterynaryjnego ani indywidualnej konsultacji.</div>
        <div><strong>${escapeHtml(categoryLabel(guide.category))}</strong>PDF do czytania i wydruku</div>
        <div><strong>${price}</strong>Krzysztof Regulski</div>
      </footer>
    </div>
  </section>
  <article class="document-body">
    ${bodyHtml}
  </article>
  <section class="document-end">
    <div class="end-card">
      <div>
        <span class="end-eyebrow">Co zrobić po przeczytaniu</span>
        <h2>Jeden spokojny krok jest lepszy niż pięć przypadkowych prób.</h2>
        <p>Wybierz jedną rzecz do obserwacji i jedną zmianę, którą możesz bezpiecznie wprowadzić. Jeśli sytuacja jest nagła, nasilona albo dotyczy zdrowia, zacznij od kontaktu z lekarzem weterynarii.</p>
        <div class="end-steps">
          <div class="end-step"><strong>1. Zapisz</strong>Co wydarzyło się przed zachowaniem i jak długo trwało.</div>
          <div class="end-step"><strong>2. Zmień jedną rzecz</strong>Ułatw środowisko, zwiększ dystans albo zmniejsz presję.</div>
          <div class="end-step"><strong>3. Sprawdź efekt</strong>Porównaj kilka podobnych sytuacji, nie tylko jedną próbę.</div>
        </div>
      </div>
      <div class="end-links"><strong>Potrzebujesz pomocy w swojej sytuacji?</strong><br />regulskibehawiorysta.pl/cennik · kontakt@regulskibehawiorysta.pl</div>
    </div>
    <p class="technical-note">© Krzysztof Regulski · Materiał do użytku własnego · regulskibehawiorysta.pl</p>
  </section>
</body>
</html>`
}

async function renderPreview(pdfPath: string, slug: string) {
  const prefix = path.join(AUDIT_DIR, slug)
  await execFileAsync('pdftoppm', ['-png', '-f', '1', '-l', '1', '-r', '92', pdfPath, prefix], { windowsHide: true })
  const generated = (await fs.readdir(AUDIT_DIR))
    .filter((file) => file.startsWith(`${slug}-`) && /-0*1\.png$/i.test(file))
    .sort((a, b) => a.localeCompare(b))[0]
  if (!generated) throw new Error(`Nie udało się wyrenderować podglądu okładki: ${slug}`)
  const firstPage = path.join(AUDIT_DIR, generated)
  const previewPath = path.join(AUDIT_DIR, `${slug}-cover.png`)
  await sharp(firstPage).resize({ width: 720 }).png({ compressionLevel: 9 }).toFile(previewPath)
  await fs.rm(firstPage, { force: true })
  return previewPath
}

async function main() {
  const reviewOnly = JSON.parse(await fs.readFile(REVIEW_CATALOG, 'utf8')) as MaterialyGuide[]
  const guides: ReviewGuide[] = [
    ...listMaterialyGuides(),
    ...reviewOnly.map((guide) => ({ ...guide, reviewOnly: true })),
  ]
  const onlyIndex = process.argv.indexOf('--slug')
  const onlySlug = onlyIndex >= 0 ? process.argv[onlyIndex + 1] : null
  const selected = onlySlug ? guides.filter((guide) => guide.slug === onlySlug) : guides
  if (!selected.length) throw new Error(`Nie znaleziono materiału: ${onlySlug}`)

  await fs.mkdir(OUTPUT_DIR, { recursive: true })
  await fs.mkdir(AUDIT_DIR, { recursive: true })
  const css = await fs.readFile(CSS_PATH, 'utf8')
  const browserPath = process.env.PLAYWRIGHT_CHROME
    ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  const browser = await chromium.launch({ headless: true, executablePath: browserPath })
  const manifest: Array<Record<string, unknown>> = []

  try {
    for (const guide of selected) {
      const { html: bodyHtml, source } = await loadGuideBody(guide)
      const document = renderDocument(guide, css, bodyHtml)
      const debugHtml = path.join(AUDIT_DIR, `${guide.slug}.html`)
      await fs.writeFile(debugHtml, document, 'utf8')
      const page = await browser.newPage()
      const outputPath = path.join(OUTPUT_DIR, guide.pdfFile)
      try {
        await page.setContent(document, { waitUntil: 'load' })
        await page.emulateMedia({ media: 'print' })
        await page.pdf({
          path: outputPath,
          format: 'A4',
          printBackground: true,
          preferCSSPageSize: true,
          displayHeaderFooter: false,
          margin: { top: '0', right: '0', bottom: '0', left: '0' },
        })
      } finally {
        await page.close()
      }

      const stat = await fs.stat(outputPath)
      const preview = await renderPreview(outputPath, guide.slug)
      manifest.push({
        slug: guide.slug,
        title: guide.title,
        price: PRICE_LABEL[guide.priceCode],
        source,
        file: guide.pdfFile,
        sizeKb: Math.round(stat.size / 1024),
        reviewOnly: guide.reviewOnly === true,
        preview: path.relative(ROOT, preview),
      })
      console.log(`OK  ${guide.slug.padEnd(46)} ${String(Math.round(stat.size / 1024)).padStart(5)} KB  ${source}`)
    }
  } finally {
    await browser.close()
  }

  await fs.writeFile(path.join(OUTPUT_DIR, '_manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  console.log(`\nGotowe: ${selected.length} PDF w ${OUTPUT_DIR}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
