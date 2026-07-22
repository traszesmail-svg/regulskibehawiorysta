import { promises as fs } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = process.cwd()
const ART_DIR = path.join(ROOT, 'content', 'guides', 'review-art')
const PLATE_DIR = path.join(ART_DIR, 'plates')
const SCENE_DIR = path.join(ART_DIR, 'scenes')
const ORNAMENT_DIR = path.join(ART_DIR, 'ornaments')

const plates: Array<{ file: string; names: string[] }> = [
  {
    file: 'dog-home-and-skills.png',
    names: ['dog-alone-door', 'dog-guest-arrival', 'dog-safe-distance', 'dog-resource-choice', 'dog-nosework-rest', 'dog-settle-mat'],
  },
  {
    file: 'cat-home-and-relations.png',
    names: ['cat-litter-calm', 'cat-high-safe', 'cats-separate-resources', 'cat-grooming-boundary', 'cat-dawn-window', 'cat-adoption-hide'],
  },
  {
    file: 'puppy-adoption-and-enrichment.png',
    names: ['puppy-sleep', 'puppy-redirect-toy', 'puppy-greeting', 'adopted-dog-room', 'adopted-cat-base', 'dog-cat-enrichment'],
  },
  {
    file: 'seasonal-travel-and-observation.png',
    names: ['thunder-shelter', 'petsitter-handover', 'routine-clock', 'travel-car-safe', 'observation-notes', 'dog-cat-new-room'],
  },
  {
    file: 'dog-walk-and-observation.png',
    names: ['dog-long-line', 'dog-bicycle-distance', 'dog-sniff-decompress', 'dog-window-rest', 'dog-post-exercise', 'dog-body-language-notes'],
  },
  {
    file: 'cat-space-and-routines.png',
    names: ['litter-layout', 'cats-routes', 'cats-play', 'cat-touch-choice', 'cat-night-routine', 'cat-home-change'],
  },
]

const ornamentNames = [
  'botanical-sprig',
  'paired-leaves',
  'seed-pods',
  'paw-trail',
  'contour-lines',
  'quiet-arch',
  'observation-circles',
  'forest-branch',
  'safe-doorway',
  'moon-and-dawn',
  'rain-and-shelter',
  'woven-texture',
]

async function cropGrid(input: string, outputDir: string, names: string[], columns: number, rows: number) {
  const image = sharp(input)
  const metadata = await image.metadata()
  if (!metadata.width || !metadata.height) throw new Error(`Brak wymiarów obrazu: ${input}`)

  const cellWidth = metadata.width / columns
  const cellHeight = metadata.height / rows
  const padX = Math.round(cellWidth * 0.045)
  const padY = Math.round(cellHeight * 0.045)
  const width = Math.floor(cellWidth - padX * 2)
  const height = Math.floor(cellHeight - padY * 2)

  for (let index = 0; index < names.length; index += 1) {
    const column = index % columns
    const row = Math.floor(index / columns)
    const left = Math.max(0, Math.round(column * cellWidth + padX))
    const top = Math.max(0, Math.round(row * cellHeight + padY))
    await sharp(input)
      .extract({ left, top, width, height })
      .resize(960, 960, { fit: 'cover' })
      .webp({ quality: 90, effort: 6 })
      .toFile(path.join(outputDir, `${names[index]}.webp`))
  }
}

async function main() {
  await fs.mkdir(SCENE_DIR, { recursive: true })
  await fs.mkdir(ORNAMENT_DIR, { recursive: true })

  for (const plate of plates) {
    await cropGrid(path.join(PLATE_DIR, plate.file), SCENE_DIR, plate.names, 3, 2)
    console.log(`OK  ${plate.file} -> ${plate.names.length} scen`)
  }
  await cropGrid(path.join(PLATE_DIR, 'decorative-motifs.png'), ORNAMENT_DIR, ornamentNames, 4, 3)
  console.log(`OK  decorative-motifs.png -> ${ornamentNames.length} ozdobników`)

  const sceneCount = (await fs.readdir(SCENE_DIR)).filter((file) => file.endsWith('.webp')).length
  const ornamentCount = (await fs.readdir(ORNAMENT_DIR)).filter((file) => file.endsWith('.webp')).length
  console.log(`Gotowe: ${sceneCount} scen i ${ornamentCount} ozdobników.`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
