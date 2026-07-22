import { execFileSync } from 'node:child_process'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const FREE_DIR = path.join(ROOT, 'content', 'guides', 'tier-system', 'free')
const OUTPUT_DIR = path.join(ROOT, 'do-przegladu', 'system-pdf5polek-2026-07-22', 'free-shelf')
const REPORT = path.join(OUTPUT_DIR, 'audit.json')

type Guide = { slug: string; title: string; targetPages: number }
type Manifest = { guides: Guide[] }

function run(command: string, args: string[]) {
  return execFileSync(command, args, { cwd: ROOT, encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
}

function pageCount(file: string) {
  const info = run('pdfinfo', [file])
  const match = info.match(/^Pages:\s+(\d+)$/m)
  if (!match) throw new Error(`Brak liczby stron: ${file}`)
  return Number(match[1])
}

function pageText(file: string, page: number) {
  return run('pdftotext', ['-f', String(page), '-l', String(page), file, '-']).replace(/\f/g, '').replace(/\s+/g, ' ').trim()
}

async function main() {
  const manifest = JSON.parse(await fs.readFile(path.join(FREE_DIR, 'manifest.json'), 'utf8')) as Manifest
  const rows = manifest.guides.map((guide) => {
    const file = `${guide.slug}.pdf`
    const absolute = path.join(OUTPUT_DIR, file)
    const pages = pageCount(absolute)
    run('qpdf', ['--check', absolute])
    const texts = Array.from({ length: pages }, (_, index) => pageText(absolute, index + 1))
    const lowTextPages = texts.map((text, index) => ({ page: index + 1, chars: text.length })).filter((item) => item.chars < 80)
    const badEncodingPages = texts.map((text, index) => ({ page: index + 1, text })).filter((item) => /�|Ã|Â|â€|ï¿½/.test(item.text)).map((item) => item.page)
    const missingFooterPages = texts.map((text, index) => ({ page: index + 1, text })).filter((item) => !item.text.includes('Regulski Behawiorysta')).map((item) => item.page)
    return { file, expectedPages: guide.targetPages, pages, pageCountOk: pages === guide.targetPages, lowTextPages, badEncodingPages, missingFooterPages }
  })
  const report = {
    generatedAt: new Date().toISOString(),
    pdfCount: rows.length,
    totalPages: rows.reduce((sum, row) => sum + row.pages, 0),
    allPageCountsOk: rows.every((row) => row.pageCountOk),
    allTextChecksOk: rows.every((row) => row.lowTextPages.length === 0 && row.badEncodingPages.length === 0 && row.missingFooterPages.length === 0),
    files: rows,
  }
  await fs.writeFile(REPORT, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify(report, null, 2))
  if (!report.allPageCountsOk || !report.allTextChecksOk) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
