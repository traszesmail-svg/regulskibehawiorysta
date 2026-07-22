import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const REVIEW_DIR = path.join(ROOT, 'do-przegladu', 'materialy-pdf-2026-07-21')
const REPORT_JSON = path.join(REVIEW_DIR, '_raport-kontroli.json')
const REPORT_TXT = path.join(REVIEW_DIR, '_raport-kontroli.txt')

type PdfAudit = {
  file: string
  pages: number
  sizeKb: number
  sha256: string
  qpdfOk: boolean
  blankPages: number[]
  lowTextPages: Array<{ page: number; characters: number }>
}

function run(command: string, args: string[]) {
  return execFileSync(command, args, {
    cwd: ROOT,
    encoding: 'utf8',
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

function pageCount(file: string) {
  const info = run('pdfinfo', [file])
  const match = info.match(/^Pages:\s+(\d+)$/m)
  if (!match) throw new Error(`Nie udało się odczytać liczby stron: ${file}`)
  return Number(match[1])
}

function normalizedPageText(file: string, page: number) {
  return run('pdftotext', ['-f', String(page), '-l', String(page), file, '-'])
    .replace(/\f/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

async function auditPdf(file: string): Promise<PdfAudit> {
  const absolute = path.join(REVIEW_DIR, file)
  const bytes = await fs.readFile(absolute)
  const pages = pageCount(absolute)
  let qpdfOk = true
  try {
    run('qpdf', ['--check', absolute])
  } catch {
    qpdfOk = false
  }

  const blankPages: number[] = []
  const lowTextPages: Array<{ page: number; characters: number }> = []
  for (let page = 1; page <= pages; page += 1) {
    const characters = normalizedPageText(absolute, page).length
    if (characters < 8) blankPages.push(page)
    else if (characters < 80) lowTextPages.push({ page, characters })
  }

  return {
    file,
    pages,
    sizeKb: Math.round(bytes.byteLength / 1024),
    sha256: createHash('sha256').update(bytes).digest('hex'),
    qpdfOk,
    blankPages,
    lowTextPages,
  }
}

async function main() {
  const files = (await fs.readdir(REVIEW_DIR))
    .filter((file) => file.toLowerCase().endsWith('.pdf'))
    .sort((a, b) => a.localeCompare(b, 'pl'))
  const audits: PdfAudit[] = []
  for (const file of files) {
    const result = await auditPdf(file)
    audits.push(result)
    const status = result.qpdfOk && result.blankPages.length === 0 ? 'OK' : 'BŁĄD'
    console.log(`${status.padEnd(5)} ${file.padEnd(55)} ${String(result.pages).padStart(2)} stron`)
  }

  const duplicateHashes = [...new Set(audits.map((item) => item.sha256).filter((hash, index, list) => list.indexOf(hash) !== index))]
  const failed = audits.filter((item) => !item.qpdfOk || item.blankPages.length > 0)
  const pageTotal = audits.reduce((sum, item) => sum + item.pages, 0)
  const report = {
    generatedAt: new Date().toISOString(),
    directory: path.relative(ROOT, REVIEW_DIR),
    pdfCount: audits.length,
    pageTotal,
    failedCount: failed.length,
    duplicateHashes,
    files: audits,
  }
  await fs.writeFile(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

  const textReport = [
    'KONTROLA TECHNICZNA PDF - MATERIAŁY DO PRZEGLĄDU',
    '',
    `Folder: ${path.relative(ROOT, REVIEW_DIR)}`,
    `Liczba PDF: ${audits.length}`,
    `Łączna liczba stron: ${pageTotal}`,
    `Pliki z błędem lub pustą stroną: ${failed.length}`,
    `Duplikaty binarne: ${duplicateHashes.length}`,
    '',
    ...audits.map((item) => {
      const notes = [
        item.qpdfOk ? 'qpdf OK' : 'qpdf BŁĄD',
        item.blankPages.length ? `puste strony: ${item.blankPages.join(', ')}` : 'bez pustych stron',
        item.lowTextPages.length ? `strony z małą ilością tekstu: ${item.lowTextPages.map((entry) => `${entry.page} (${entry.characters})`).join(', ')}` : 'bez podejrzanie krótkich stron',
      ]
      return `${item.file} | ${item.pages} stron | ${item.sizeKb} KB | ${notes.join(' | ')}`
    }),
    '',
    failed.length === 0 ? 'WYNIK: komplet przeszedł kontrolę techniczną.' : 'WYNIK: komplet wymaga poprawek.',
  ].join('\r\n')
  await fs.writeFile(REPORT_TXT, textReport, 'utf8')

  if (failed.length || duplicateHashes.length) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
