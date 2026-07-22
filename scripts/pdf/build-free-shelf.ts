import { execFile } from 'node:child_process'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'
import { chromium } from 'playwright-core'
import { marked } from 'marked'

const execFileAsync = promisify(execFile)
const ROOT = process.cwd()
const SYSTEM_DIR = path.join(ROOT, 'content', 'guides', 'tier-system')
const FREE_DIR = path.join(SYSTEM_DIR, 'free')
const OUTPUT_DIR = path.join(ROOT, 'do-przegladu', 'system-pdf5polek-2026-07-22', 'free-shelf')
const AUDIT_DIR = path.join(ROOT, '.tmp', 'free-shelf-20260722')
const BODY_PAGE_CHAR_LIMIT = 2150

type Guide = {
  slug: string
  species: 'pies' | 'kot'
  title: string
  subtitle: string
  source: string
  art: string
  targetPages: number
  status: string
}

type Manifest = { tier: string; label: string; priceLabel: string; guides: Guide[] }

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function plainText(markdown: string) {
  return markdown
    .replace(/^#+\s+/gm, '')
    .replace(/[*_`]/g, '')
    .replace(/^[-*]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/\[[^\]]+\]\([^\)]+\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function splitPages(markdown: string) {
  return markdown
    .split(/\s*<!-- PAGE -->\s*/g)
    .map((part) => part.trim())
    .filter(Boolean)
}

function packArticlePages(pages: string[]) {
  const packed: string[] = []
  let current = ''
  let currentLength = 0

  for (const page of pages) {
    const length = plainText(page).length
    if (current && currentLength + length > BODY_PAGE_CHAR_LIMIT) {
      packed.push(current)
      current = page
      currentLength = length
      continue
    }
    current = current ? `${current}\n\n${page}` : page
    currentLength += length
  }

  if (current) packed.push(current)
  return packed
}

function firstHeading(markdown: string) {
  const match = markdown.match(/^##\s+(.+)$/m)
  return match?.[1]?.trim() ?? 'Pierwszy krok'
}

function withoutFirstHeading(markdown: string) {
  return markdown.replace(/^##\s+.+\n+/m, '').trim()
}

function footer(guide: Guide, brandMark: string, pageNumber: number, totalPages: number) {
  const speciesLabel = guide.species === 'pies' ? 'Pies' : 'Kot'
  return `<footer class="footer">
    <div class="footer-main">
      <span class="footer-brand"><img class="brand-mark footer-brand-mark" src="${brandMark}" alt="" /><strong>Regulski Behawiorysta</strong></span>
      <span class="footer-context">${speciesLabel} · materiał edukacyjny</span>
      <span class="footer-page">${pageNumber} / ${totalPages}</span>
    </div>
    <div class="footer-note">Treść informacyjna — nie zastępuje badania ani indywidualnej konsultacji.</div>
  </footer>`
}

function cover(guide: Guide, coverMarkdown: string, art: string, brandLogo: string, brandMark: string, totalPages: number) {
  const promise = plainText(coverMarkdown).replace(`${guide.title} ${guide.subtitle}`, '').trim()
  const speciesLabel = guide.species === 'pies' ? 'pies' : 'kot'
  return `<section class="page cover free-cover">
    <div class="topbar"><img class="brand-logo cover-brand-logo" src="${brandLogo}" alt="Regulski Behawiorysta" /><span class="tier-label">Bezpłatny start · ${speciesLabel}</span></div>
    <div class="cover-body">
      <div>
        <div class="kicker">Półka bezpłatna · pierwszy bezpieczny krok</div>
        <h1>${escapeHtml(guide.title)}</h1>
        <p class="subtitle">${escapeHtml(guide.subtitle)}</p>
        <p class="promise">${escapeHtml(promise)}</p>
      </div>
      <img class="tier-art" src="${art}" alt="Ilustracja wzorcowa dla materiału o zachowaniu zwierzęcia" />
    </div>
    <div class="cover-meta"><div><strong>Regulski Behawiorysta</strong>Ekspercka treść, prosty język i spokojny pierwszy krok.</div><div><strong>Zakres</strong>Krótki materiał do użycia od razu.</div><div><strong>Ważne</strong>Przy czerwonych flagach zdrowotnych kontakt z lekarzem weterynarii.</div></div>
    ${footer(guide, brandMark, 1, totalPages)}
  </section>`
}

function bodyPage(guide: Guide, markdown: string, art: string, brandMark: string, pageNumber: number, totalPages: number) {
  const heading = firstHeading(markdown)
  const rendered = marked.parse(withoutFirstHeading(markdown), { async: false })
  const speciesLabel = guide.species === 'pies' ? 'pies' : 'kot'
  const finalClass = pageNumber === totalPages ? ' final-free-page' : ''
  const sparseClass = plainText(markdown).length < 1350 ? ' sparse-free-page' : ''
  const topicVisual = sparseClass ? `<figure class="body-topic-visual"><img src="${art}" alt="Ilustracja do tematu ${escapeHtml(guide.title)}" /><figcaption>${escapeHtml(guide.subtitle)}</figcaption></figure>` : ''
  return `<section class="page body-page free-article-page${finalClass}${sparseClass}">
    <div class="page-head"><div><small>${escapeHtml(speciesLabel)} · bezpłatny start</small><h2>${escapeHtml(heading)}</h2></div><img class="brand-mark body-brand-mark" src="${brandMark}" alt="Regulski Behawiorysta" /></div>
    <div class="article-content">${rendered}</div>
    ${topicVisual}
    ${footer(guide, brandMark, pageNumber, totalPages)}
  </section>`
}

async function imageData(relativePath: string) {
  const bytes = await fs.readFile(path.join(SYSTEM_DIR, relativePath))
  return `data:image/png;base64,${bytes.toString('base64')}`
}

async function brandAssetData(fileName: 'logo-regulski.png' | 'favicon-180.png') {
  const bytes = await fs.readFile(path.join(ROOT, 'public', 'branding', 'regulski-web', 'logos', fileName))
  return `data:image/png;base64,${bytes.toString('base64')}`
}

const articleCss = `
.free-shelf-document .page { height: 297mm; min-height: 297mm; }
.free-cover .cover-body { grid-template-columns: minmax(0, 1fr) 62mm; }
.free-cover .cover h1 { max-width: 135mm; font-size: 32pt; }
.free-cover .promise { max-width: 116mm; }
.free-cover .tier-art { max-height: 126mm; }
.free-article-page { padding-top: 17mm; }
.free-article-page .page-head { margin-bottom: 8mm; }
.free-article-page .page-head h2 { max-width: 144mm; font-size: 23pt; line-height: 1.08; }
.free-article-page .article-content { max-width: 163mm; font-size: 10.1pt; line-height: 1.42; }
.free-article-page .article-content p { max-width: none; margin: 0 0 3.5mm; }
.free-article-page .article-content ul,
.free-article-page .article-content ol { margin: 1.5mm 0 4mm; padding-left: 7mm; }
.free-article-page .article-content li { margin: 1.3mm 0; }
.free-article-page .article-content h3 { margin: 4mm 0 1.6mm; font-size: 12pt; color: var(--dark); }
.free-article-page .article-content h2 { margin: 4.5mm 0 2mm; padding-top: 3mm; border-top: .3mm solid var(--line); color: var(--dark); font-size: 14.5pt; line-height: 1.15; break-after: avoid; }
.free-article-page .article-content blockquote { margin: 5mm 0; padding: 4mm 5mm; border-left: 1.1mm solid var(--accent); background: color-mix(in srgb, var(--soft) 72%, white); color: var(--dark); font-family: Georgia, serif; font-size: 11.2pt; line-height: 1.35; break-inside: avoid; }
.free-article-page .article-content blockquote p { margin: 0; }
.free-article-page .article-content strong { color: var(--dark); }
.free-article-page .article-content hr { border: 0; border-top: .3mm solid var(--line); margin: 4mm 0; }
.free-article-page .article-content input[type="checkbox"] { accent-color: var(--accent); }
.final-free-page { background: linear-gradient(180deg, var(--paper), color-mix(in srgb, var(--soft) 55%, white)); }
.free-shelf-document .topbar { align-items: center; padding-bottom: 4mm; }
.free-shelf-document .cover-brand-logo { width: 24mm; height: 24mm; object-fit: contain; border-radius: 3mm; background: #fffaf1; }
.free-shelf-document .body-brand-mark { width: 14mm; height: 9mm; object-fit: cover; object-position: 50% 0%; border-radius: 2.5mm; background: #fffaf1; border: .25mm solid color-mix(in srgb, var(--accent) 36%, transparent); }
.free-shelf-document .page-head { align-items: center; }
.free-shelf-document .footer { display: block; }
.free-shelf-document .footer-main { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: 5mm; }
.free-shelf-document .footer-brand { display: flex; align-items: center; gap: 2.2mm; min-width: 0; color: var(--ink); }
.free-shelf-document .footer-brand strong { font-size: 7.6pt; letter-spacing: .01em; white-space: nowrap; }
.free-shelf-document .footer-brand-mark { width: 10mm; height: 6.5mm; flex: 0 0 auto; object-fit: cover; object-position: 50% 0%; border-radius: 2mm; background: #fffaf1; border: .2mm solid color-mix(in srgb, var(--accent) 30%, transparent); }
.free-shelf-document .footer-context { text-align: center; white-space: nowrap; }
.free-shelf-document .footer-page { text-align: right; color: var(--ink); font-weight: 700; font-variant-numeric: tabular-nums; white-space: nowrap; }
.free-shelf-document .footer-note { margin-top: 1.4mm; color: var(--muted); font-size: 6.4pt; line-height: 1.2; }
.free-shelf-document .body-topic-visual { display: grid; grid-template-columns: 72mm minmax(0, 1fr); height: 53mm; margin: 7mm 0 0; overflow: hidden; border: .3mm solid var(--line); border-radius: 4mm; background: color-mix(in srgb, var(--soft) 60%, white); break-inside: avoid; }
.free-shelf-document .body-topic-visual img { width: 72mm; height: 53mm; object-fit: cover; mix-blend-mode: multiply; }
.free-shelf-document .body-topic-visual figcaption { display: flex; align-items: center; margin: 0; padding: 6mm; color: var(--dark); font-family: Georgia, "Times New Roman", serif; font-size: 13pt; line-height: 1.3; }
`

async function renderGuide(guide: Guide, css: string) {
  const markdown = await fs.readFile(path.join(FREE_DIR, guide.source), 'utf8')
  const sourcePages = splitPages(markdown)
  const pages = [sourcePages[0], ...packArticlePages(sourcePages.slice(1))]
  if (pages.length !== guide.targetPages) throw new Error(`${guide.slug}: oczekiwano ${guide.targetPages} stron, jest ${pages.length}`)
  const totalPages = pages.length
  const art = await imageData(`free/${guide.art}`)
  const brandLogo = await brandAssetData('logo-regulski.png')
  const brandMark = await brandAssetData('favicon-180.png')
  const html = `<!doctype html><html lang="pl"><head><meta charset="utf-8" /><title>${escapeHtml(guide.title)}</title><style>${css}${articleCss}</style></head><body class="tier-free free-shelf-document">${cover(guide, pages[0], art, brandLogo, brandMark, totalPages)}${pages.slice(1).map((page, index) => bodyPage(guide, page, art, brandMark, index + 2, totalPages)).join('')}</body></html>`
  const htmlPath = path.join(AUDIT_DIR, `${guide.slug}.html`)
  await fs.writeFile(htmlPath, html, 'utf8')
  return { html, htmlPath, pages: pages.length }
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true })
  await fs.mkdir(AUDIT_DIR, { recursive: true })
  const manifest = JSON.parse(await fs.readFile(path.join(FREE_DIR, 'manifest.json'), 'utf8')) as Manifest
  const css = await fs.readFile(path.join(SYSTEM_DIR, 'styles.css'), 'utf8')
  const browserPath = process.env.PLAYWRIGHT_CHROME ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  const browser = await chromium.launch({ headless: true, executablePath: browserPath })
  const results: Array<Record<string, unknown>> = []

  try {
    for (const guide of manifest.guides) {
      const { html, pages } = await renderGuide(guide, css)
      const page = await browser.newPage()
      const pdfPath = path.join(OUTPUT_DIR, `${guide.slug}.pdf`)
      try {
        await page.setContent(html, { waitUntil: 'load' })
        await page.emulateMedia({ media: 'print' })
        const overflows = await page.$$eval('.free-article-page', (nodes) => nodes.flatMap((node, index) => {
          const content = node.querySelector('.article-content')
          const footer = node.querySelector('.footer')
          if (!content || !footer) return [{ page: index + 2, overflowPx: -1 }]
          const contentBottom = content.getBoundingClientRect().bottom
          const safeBottom = footer.getBoundingClientRect().top - 16
          const overflowPx = Math.ceil(contentBottom - safeBottom)
          return overflowPx > 0 ? [{ page: index + 2, overflowPx }] : []
        }))
        if (overflows.length > 0) throw new Error(`${guide.slug}: przepełnienie strony ${JSON.stringify(overflows)}`)
        await page.pdf({ path: pdfPath, format: 'A4', printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false, margin: { top: '0', right: '0', bottom: '0', left: '0' } })
      } finally {
        await page.close()
      }
      const stat = await fs.stat(pdfPath)
      results.push({ slug: guide.slug, species: guide.species, title: guide.title, pages, sizeKb: Math.round(stat.size / 1024), pdf: path.basename(pdfPath) })
      console.log(`OK  ${guide.slug.padEnd(32)} ${String(pages).padStart(2)} str. ${String(Math.round(stat.size / 1024)).padStart(4)} KB`)
    }
  } finally {
    await browser.close()
  }

  await fs.writeFile(path.join(OUTPUT_DIR, 'manifest.json'), `${JSON.stringify({ tier: manifest.tier, generatedAt: new Date().toISOString(), guides: results }, null, 2)}\n`, 'utf8')
  await fs.writeFile(path.join(OUTPUT_DIR, 'README.md'), '# Półka bezpłatna — PDF5POLEK\n\nWersja redakcyjna 10 zatwierdzonych tematów. Ilustracja jest obecnie wzorcowym assetem półki; finalne ilustracje tematyczne powstaną po zamknięciu treści.\n')
  console.log(`\nGotowe: ${results.length} PDF-ów w ${OUTPUT_DIR}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
