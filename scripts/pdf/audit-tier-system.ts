import { execFileSync } from 'node:child_process'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const OUTPUT_DIR = path.join(ROOT, 'do-przegladu', 'system-pdf5polek-2026-07-22')
const REPORT = path.join(OUTPUT_DIR, 'audit.json')

function run(command: string, args: string[]) {
  return execFileSync(command, args, { cwd: ROOT, encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
}

function pages(file: string) {
  const info = run('pdfinfo', [file])
  const match = info.match(/^Pages:\s+(\d+)$/m)
  if (!match) throw new Error(`Brak liczby stron: ${file}`)
  return Number(match[1])
}

function textLength(file: string, page: number) {
  return run('pdftotext', ['-f', String(page), '-l', String(page), file, '-']).replace(/\f/g, '').replace(/\s+/g, ' ').trim().length
}

async function main() {
  const files = (await fs.readdir(OUTPUT_DIR)).filter((file) => file.startsWith('demonstrator-') && file.endsWith('.pdf')).sort()
  const rows = files.map((file) => {
    const absolute = path.join(OUTPUT_DIR, file)
    const count = pages(absolute)
    run('qpdf', ['--check', absolute])
    const lowTextPages = Array.from({ length: count }, (_, index) => index + 1).filter((page) => textLength(absolute, page) < 20)
    return { file, pages: count, lowTextPages }
  })
  const report = { generatedAt: new Date().toISOString(), pdfCount: rows.length, totalPages: rows.reduce((sum, row) => sum + row.pages, 0), files: rows }
  await fs.writeFile(REPORT, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify(report, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

