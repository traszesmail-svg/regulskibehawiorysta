import { execFile } from 'node:child_process'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'
import sharp from 'sharp'

const execFileAsync = promisify(execFile)
const ROOT = process.cwd()
const FREE_DIR = path.join(ROOT, 'content', 'guides', 'tier-system', 'free')
const OUTPUT_DIR = path.join(ROOT, 'do-przegladu', 'system-pdf5polek-2026-07-23', 'free-shelf')
const REVIEW_DIR = path.join(ROOT, '.tmp', 'free-shelf-20260723', 'review')

type Guide = { slug: string; targetPages: number }
type Manifest = { guides: Guide[] }

async function renderPage(pdf: string, slug: string, page: number, kind: string) {
  const prefix = path.join(REVIEW_DIR, `${slug}-${kind}`)
  await execFileAsync('pdftoppm', ['-png', '-singlefile', '-f', String(page), '-l', String(page), '-r', '82', pdf, prefix], { windowsHide: true })
  return `${prefix}.png`
}

async function contactSheet(files: string[], output: string) {
  const width = 350
  const height = 495
  const columns = 5
  const rows = 2
  const canvas = sharp({ create: { width: width * columns, height: height * rows, channels: 4, background: '#e8e4dc' } })
  const composites = await Promise.all(files.map(async (file, index) => ({
    input: await sharp(file).resize({ width, height, fit: 'contain', background: '#fffef9' }).png().toBuffer(),
    left: (index % columns) * width,
    top: Math.floor(index / columns) * height,
  })))
  await canvas.composite(composites).png().toFile(output)
}

async function main() {
  await fs.mkdir(REVIEW_DIR, { recursive: true })
  const manifest = JSON.parse(await fs.readFile(path.join(FREE_DIR, 'manifest.json'), 'utf8')) as Manifest
  const covers: string[] = []
  const content: string[] = []
  const endings: string[] = []

  for (const guide of manifest.guides) {
    const pdf = path.join(OUTPUT_DIR, `${guide.slug}.pdf`)
    covers.push(await renderPage(pdf, guide.slug, 1, 'cover'))
    content.push(await renderPage(pdf, guide.slug, 2, 'content'))
    endings.push(await renderPage(pdf, guide.slug, guide.targetPages, 'ending'))
  }

  await contactSheet(covers, path.join(OUTPUT_DIR, 'FREE-COVERS-5x2.png'))
  await contactSheet(content, path.join(OUTPUT_DIR, 'FREE-CONTENT-PAGES-5x2.png'))
  await contactSheet(endings, path.join(OUTPUT_DIR, 'FREE-ENDINGS-5x2.png'))
  console.log(`Gotowe plansze kontrolne: ${OUTPUT_DIR}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
