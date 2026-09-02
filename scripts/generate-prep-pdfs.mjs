/**
 * Generuje PDFy przygotowawcze z plików Markdown w content/prep-guides/
 * Wynik trafia do public/prep-guides/
 * Uruchom: node scripts/generate-prep-pdfs.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const __dir = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dir, '..')
const INPUT_DIR = join(ROOT, 'content', 'prep-guides')
const OUTPUT_DIR = join(ROOT, 'public', 'prep-guides')

const SLUGS = [
  'kwadrans',
  'kwadrans-na-juz',
  'konsultacja-30-min',
  'konsultacja-behawioralna-online',
]

const SERVICE_LABELS = {
  'kwadrans': 'Zapytaj behawiorystę (do 15 min)',
  'kwadrans-na-juz': 'Zapytaj teraz (do 15 min · dostępność na żywo)',
  'konsultacja-30-min': 'Starszy wariant rozmowy (materiał archiwalny)',
  'konsultacja-behawioralna-online': 'Pełna konsultacja behawioralna (około 90 min)',
}

function mdToHtml(md) {
  const lines = md.split('\n')
  let html = ''
  let inList = false

  for (const line of lines) {
    if (line.startsWith('# ')) {
      if (inList) { html += '</ul>\n'; inList = false }
      html += `<h1>${esc(line.slice(2))}</h1>\n`
    } else if (line.startsWith('## ')) {
      if (inList) { html += '</ul>\n'; inList = false }
      html += `<h2>${esc(line.slice(3))}</h2>\n`
    } else if (line.startsWith('### ')) {
      if (inList) { html += '</ul>\n'; inList = false }
      html += `<h3>${esc(line.slice(4))}</h3>\n`
    } else if (line.startsWith('---')) {
      if (inList) { html += '</ul>\n'; inList = false }
      html += `<hr>\n`
    } else if (line.startsWith('- ')) {
      if (!inList) { html += '<ul>\n'; inList = true }
      html += `<li>${inlineMd(line.slice(2))}</li>\n`
    } else if (line.trim() === '') {
      if (inList) { html += '</ul>\n'; inList = false }
      html += '\n'
    } else {
      if (inList) { html += '</ul>\n'; inList = false }
      html += `<p>${inlineMd(line)}</p>\n`
    }
  }

  if (inList) html += '</ul>\n'
  return html
}

function esc(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function inlineMd(str) {
  return esc(str)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
}

function buildHtmlPage(slug, content) {
  const serviceLabel = SERVICE_LABELS[slug] ?? slug
  return `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', Georgia, serif;
    font-size: 13px;
    line-height: 1.7;
    color: #1f1a17;
    background: #fff;
    padding: 36px 44px 44px;
    max-width: 680px;
    margin: 0 auto;
  }

  .header {
    border-bottom: 2px solid #1f1a17;
    padding-bottom: 14px;
    margin-bottom: 28px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }

  .header-brand {
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #6b625b;
    font-weight: 600;
  }

  .header-service {
    font-size: 11px;
    color: #6b625b;
    text-align: right;
  }

  h1 {
    font-size: 20px;
    font-weight: 700;
    line-height: 1.25;
    margin-bottom: 20px;
    color: #1f1a17;
  }

  h2 {
    font-size: 14px;
    font-weight: 700;
    margin-top: 24px;
    margin-bottom: 8px;
    color: #1f1a17;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  h3 {
    font-size: 13px;
    font-weight: 700;
    margin-top: 16px;
    margin-bottom: 6px;
    color: #3d342e;
  }

  p {
    margin-bottom: 10px;
    color: #2c2520;
  }

  ul {
    margin: 6px 0 12px 18px;
  }

  li {
    margin-bottom: 4px;
    color: #2c2520;
  }

  hr {
    border: none;
    border-top: 1px solid #e9dfcf;
    margin: 22px 0;
  }

  strong { font-weight: 700; }
  em { font-style: italic; color: #4a3f38; }

  .footer {
    margin-top: 36px;
    padding-top: 14px;
    border-top: 1px solid #e9dfcf;
    font-size: 10px;
    color: #9b8f88;
    display: flex;
    justify-content: space-between;
  }

  .callout {
    background: #f6f3ee;
    border-left: 3px solid #6f5a48;
    padding: 10px 14px;
    margin: 14px 0;
    border-radius: 0 6px 6px 0;
    font-size: 12px;
  }
</style>
</head>
<body>
  <div class="header">
    <div class="header-brand">Regulski Behawiorysta · Krzysztof Regulski</div>
    <div class="header-service">${esc(serviceLabel)}</div>
  </div>

  <div class="content">
    ${mdToHtml(content)}
  </div>

  <div class="footer">
    <span>regulskibehawiorysta.pl</span>
    <span>Poradnik przygotowawczy · Regulski Behawiorysta</span>
  </div>
</body>
</html>`
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true })

  const playwrightChromiumPath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

  const browser = await chromium.launch({
    executablePath: playwrightChromiumPath,
    headless: true,
  })

  const page = await browser.newPage()

  for (const slug of SLUGS) {
    const mdPath = join(INPUT_DIR, `${slug}.md`)
    const outPath = join(OUTPUT_DIR, `${slug}.pdf`)

    let content
    try {
      content = readFileSync(mdPath, 'utf-8')
    } catch {
      console.error(`Brak pliku: ${mdPath}`)
      continue
    }

    const html = buildHtmlPage(slug, content)
    await page.setContent(html, { waitUntil: 'networkidle' })

    await page.pdf({
      path: outPath,
      format: 'A4',
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      printBackground: true,
    })

    console.log(`✓ ${slug}.pdf`)
  }

  await browser.close()
  console.log(`\nPDFy zapisane w: public/prep-guides/`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
