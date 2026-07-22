import { execFile } from 'node:child_process'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'
import { chromium } from 'playwright-core'
import sharp from 'sharp'

const execFileAsync = promisify(execFile)
const ROOT = process.cwd()
const SYSTEM_DIR = path.join(ROOT, 'content', 'guides', 'tier-system')
const OUTPUT_DIR = path.join(ROOT, 'do-przegladu', 'system-pdf5polek-2026-07-22')
const AUDIT_DIR = path.join(ROOT, '.tmp', 'system-pdf5polek-20260722')

type Tier = {
  id: 'free' | 'p19' | 'p39' | 'p59'
  priceCode: string
  label: string
  priceLabel: string
  pageRange: string
  density: string
  art: string
  palette: Record<string, string>
}

type DemoPage = { kind: 'intro' | 'checklist' | 'plan' | 'map' | 'case' | 'workbook' | 'chapter'; title: string; eyebrow: string; copy: string }

const demos: Record<Tier['id'], { title: string; subtitle: string; promise: string; pages: DemoPage[] }> = {
  free: {
    title: 'Spokojny start',
    subtitle: 'Jak zauważyć problem i wybrać pierwszy bezpieczny krok',
    promise: 'Demonstrator najlżejszej półki: jedna obietnica, jasny język i szybkie narzędzie do obserwacji.',
    pages: [
      { kind: 'intro', eyebrow: '01 · Zobacz wzór', title: 'Najpierw obserwacja, potem działanie', copy: 'Dobra pierwsza strona nie obiecuje natychmiastowego rozwiązania. Pomaga opiekunowi nazwać sytuację, odróżnić fakt od interpretacji i wybrać jedną rzecz do sprawdzenia.' },
      { kind: 'checklist', eyebrow: '02 · Zapisz', title: 'Krótka karta obserwacji', copy: 'Jedna strona, którą można wydrukować i wypełnić bez przygotowania.' },
    ],
  },
  p19: {
    title: 'Praktyczny krok',
    subtitle: 'Poradnik jednego problemu z planem na najbliższe dni',
    promise: 'Jeden konkretny problem, mapa sytuacji, plan pierwszych prób i karta do pracy własnej.',
    pages: [
      { kind: 'chapter', eyebrow: 'Moduł I · Zorientuj się', title: 'Najpierw mapa, potem rada', copy: 'Półka 19 zł prowadzi przez jeden problem w krótkim, ale pełnym rytmie: rozpoznanie sytuacji, pierwsza zmiana, sprawdzenie efektu i decyzja o kolejnym kroku.' },
      { kind: 'intro', eyebrow: '01 · Uporządkuj temat', title: 'Nie zaczynaj od pięciu porad naraz', copy: 'Poradnik tej półki prowadzi od rozpoznania wzoru do jednego spokojnego eksperymentu. Układ jest szybszy do skanowania niż kompendium, ale daje więcej niż pojedyncza lista wskazówek.' },
      { kind: 'map', eyebrow: '02 · Rozróżnij', title: 'Mapa sytuacji przed pierwszą zmianą', copy: 'Zanim wybierzesz narzędzie, rozdziel kontekst, zachowanie, reakcję opiekuna i to, co dzieje się po zdarzeniu.' },
      { kind: 'plan', eyebrow: '03 · Wprowadź', title: 'Plan pierwszych trzech prób', copy: 'Mały plan działania z miejscem na warunek przerwania, porównanie prób i korektę kierunku.' },
      { kind: 'checklist', eyebrow: '04 · Sprawdź', title: 'Karta kontroli po zmianie', copy: 'Jedna strona pomaga zanotować kontekst, próg trudności, efekt i pytanie, które warto zabrać dalej.' },
      { kind: 'workbook', eyebrow: '05 · Zapisuj', title: 'Arkusz do pracy własnej', copy: 'Płatny poradnik zostawia opiekunowi narzędzie, do którego można wrócić po kilku dniach, bez zaczynania wszystkiego od początku.' },
    ],
  },
  p39: {
    title: 'Plan działania',
    subtitle: 'Od mapy sytuacji do planu pracy na 7 i 14 dni',
    promise: 'Demonstrator półki 39 zł: więcej warstw, decyzji i narzędzi roboczych, ale nadal lekki rytm strony.',
    pages: [
      { kind: 'chapter', eyebrow: 'Moduł I', title: 'Zobacz cały układ, nie tylko jeden objaw', copy: 'W tej półce rozdział otwiera zmianę tempa: czytelnik dostaje mapę, a nie tylko kolejną poradę.' },
      { kind: 'intro', eyebrow: '01 · Mapa problemu', title: 'Cztery pytania przed pierwszą zmianą', copy: 'Najpierw kontekst, potem hipoteza. Strona może prowadzić wzrok przez kilka poziomów bez stawania się tabelą instruktażową.' },
      { kind: 'map', eyebrow: '02 · Rozróżnij', title: 'Co może podtrzymywać wzór?', copy: 'Karty i krótkie definicje pomagają opiekunowi wybrać właściwy trop.' },
      { kind: 'plan', eyebrow: '03 · Pracuj', title: 'Rytm 7/14 dni', copy: 'Plan ma miejsce na obserwację, korektę i decyzję o kolejnym kroku.' },
      { kind: 'workbook', eyebrow: '04 · Zapisuj', title: 'Arkusz do pracy własnej', copy: 'Półka 39 zł daje już narzędzie, do którego można wracać przez kilka dni.' },
    ],
  },
  p59: {
    title: 'Kompendium premium',
    subtitle: 'Pełna mapa problemu, decyzji i pracy własnej opiekuna',
    promise: 'Demonstrator półki 59 zł: docelowo około 40–50 stron, z modułami, przypadkami, planszami i załącznikami.',
    pages: [
      { kind: 'chapter', eyebrow: 'Moduł I · Rama', title: 'Od pojedynczej sceny do całego systemu', copy: 'Najdroższa półka potrzebuje oddechu, ale także wyraźnej architektury. Czytelnik zawsze wie, gdzie jest i po co czyta kolejny fragment.' },
      { kind: 'intro', eyebrow: '01 · Zrozum', title: 'Jak czytać własny przypadek', copy: 'Dłuższy materiał może pomieścić niuanse, granice interpretacji, przykłady i spokojne ostrzeżenia bez upraszczania problemu do jednej przyczyny.' },
      { kind: 'map', eyebrow: '02 · Rozdziel', title: 'Warstwy sytuacji', copy: 'Rozbudowana mapa decyzji porządkuje środowisko, zachowanie, zdrowie, bezpieczeństwo i możliwości opiekuna.' },
      { kind: 'case', eyebrow: '03 · Zobacz przykład', title: 'Przypadek nie jest receptą', copy: 'Studium przypadku pokazuje sposób myślenia, a nie obiecuje, że identyczny plan zadziała w każdym domu.' },
      { kind: 'plan', eyebrow: '04 · Zaplanuj', title: 'Plan pracy z punktami kontrolnymi', copy: 'Długi PDF może prowadzić przez kolejne tygodnie, zostawiając miejsce na cofnięcie etapu i zmianę hipotezy.' },
      { kind: 'workbook', eyebrow: '05 · Pracuj', title: 'Załącznik roboczy', copy: 'Arkusze, dziennik i pytania do konsultacji są częścią wartości, a nie ozdobnikiem.' },
      { kind: 'workbook', eyebrow: '06 · Przygotuj rozmowę', title: 'Co zabrać na konsultację', copy: 'Końcowy moduł zbiera obserwacje i pomaga przekazać specjaliście fakty bez nadmiaru przypadkowych interpretacji.' },
    ],
  },
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

async function loadJson<T>(file: string): Promise<T> {
  return JSON.parse(await fs.readFile(file, 'utf8')) as T
}

async function imageData(relativePath: string) {
  const bytes = await fs.readFile(path.join(SYSTEM_DIR, relativePath))
  return `data:image/png;base64,${bytes.toString('base64')}`
}

async function brandAssetData(fileName: 'logo-regulski.png' | 'favicon-180.png') {
  const bytes = await fs.readFile(path.join(ROOT, 'public', 'branding', 'regulski-web', 'logos', fileName))
  return `data:image/png;base64,${bytes.toString('base64')}`
}

function footer(tier: Tier, brandMark: string, pageNumber: number, totalPages: number) {
  const context = tier.id === 'p19' ? `Praktyczny poradnik · ${escapeHtml(tier.priceLabel)}` : `Materiał demonstracyjny · ${escapeHtml(tier.priceLabel)}`
  return `<footer class="footer">
    <div class="footer-main">
      <span class="footer-brand"><img class="brand-mark footer-brand-mark" src="${brandMark}" alt="" /><strong>Regulski Behawiorysta</strong></span>
      <span class="footer-context">${context}</span>
      <span class="footer-page">${pageNumber} / ${totalPages}</span>
    </div>
    <div class="footer-note">Treść informacyjna — nie zastępuje badania ani indywidualnej konsultacji.</div>
  </footer>`
}

function cover(tier: Tier, demo: (typeof demos)[Tier['id']], art: string, brandLogo: string, brandMark: string, totalPages: number) {
  const kicker = tier.id === 'p19' ? `Praktyczny poradnik · ${escapeHtml(tier.pageRange)}` : `Demonstrator systemu · ${escapeHtml(tier.pageRange)}`
  const meta = tier.id === 'p19'
    ? '<div><strong>W środku</strong>Mapa sytuacji, plan prób i karta do pracy własnej.</div><div><strong>Rytm</strong>Zobacz, zaznacz, sprawdź i zdecyduj.</div><div><strong>Ważne</strong>Przy sygnałach zdrowotnych zacznij od lekarza weterynarii.</div>'
    : '<div><strong>Wspólny brand</strong>Logo, typografia, stopka i język wizualny Regulski.</div><div><strong>Docelowo</strong>' + escapeHtml(tier.pageRange) + '</div><div><strong>Zakres</strong>5 PDF-ów dla psa + 5 PDF-ów dla kota.</div>'
  return `<section class="page cover">
    <div class="topbar"><img class="brand-logo cover-brand-logo" src="${brandLogo}" alt="Regulski Behawiorysta" /><span class="tier-label">${escapeHtml(tier.label)} · ${escapeHtml(tier.priceLabel)}</span></div>
    <div class="cover-body">
      <div>
        <div class="kicker">${kicker}</div>
        <h1>${escapeHtml(demo.title)}</h1>
        <p class="subtitle">${escapeHtml(demo.subtitle)}</p>
        <p class="promise">${escapeHtml(demo.promise)}</p>
      </div>
      <img class="tier-art" src="${art}" alt="Wzorcowa ilustracja poziomu ${escapeHtml(tier.label)}" />
    </div>
    <div class="cover-meta">${meta}</div>
    ${footer(tier, brandMark, 1, totalPages)}
  </section>`
}

function bodyPage(tier: Tier, page: DemoPage, brandMark: string, pageNumber: number, totalPages: number, art: string) {
  if (page.kind === 'chapter') {
    return `<section class="page body-page chapter-page kind-chapter"><div class="page-head"><div><small>${escapeHtml(page.eyebrow)}</small><h2>${escapeHtml(page.title)}</h2></div><img class="brand-mark body-brand-mark" src="${brandMark}" alt="Regulski Behawiorysta" /></div><div class="chapter-rule"></div><p class="lead">${escapeHtml(page.copy)}</p><img class="tier-art" src="${art}" alt="Wzorcowa ilustracja otwarcia rozdziału" />${footer(tier, brandMark, pageNumber, totalPages)}</section>`
  }

  const head = `<div class="page-head"><div><small>${escapeHtml(page.eyebrow)}</small><h2>${escapeHtml(page.title)}</h2></div><img class="brand-mark body-brand-mark" src="${brandMark}" alt="Regulski Behawiorysta" /></div><p class="lead">${escapeHtml(page.copy)}</p>`
  let body = ''
  if (page.kind === 'intro') {
    const calloutTitle = tier.id === 'p19' ? 'Jedna zasada na start' : 'Reguła systemu'
    const toolTitle = tier.id === 'p19' ? 'Po co ta strona?' : 'Wizualna hierarchia'
    const toolCopy = tier.id === 'p19'
      ? 'Pomaga wybrać jedną zmianę, którą można spokojnie sprawdzić i porównać z kolejną próbą.'
      : 'Ta sama marka, ale inny rytm, gęstość informacji i liczba narzędzi na kolejnych półkach.'
    body = `${head}<div class="callout"><strong>${calloutTitle}</strong>Najpierw porządkujemy obserwację. Dopiero później wybieramy zmianę, którą da się bezpiecznie sprawdzić.</div><div class="illustration-strip"><img src="${art}" alt="Ilustracja praktycznego poradnika" /><div class="tool-card"><strong>${toolTitle}</strong>${toolCopy}</div></div>`
  } else if (page.kind === 'checklist') {
    body = `${head}<div class="check-grid">${['Co wydarzyło się przed zachowaniem?', 'Jak długo trwała sytuacja?', 'Co pomogło choć odrobinę?', 'Co pogorszyło napięcie?'].map((item) => `<div class="check-item">${escapeHtml(item)}</div>`).join('')}</div>`
  } else if (page.kind === 'plan') {
    body = `${head}<div class="plan-grid">${['Zapisz wzór', 'Zmień jedną rzecz', 'Sprawdź próg', 'Porównaj kilka prób', 'Zdecyduj o kolejnym kroku', 'Zostaw miejsce na korektę'].map((item, index) => `<div class="plan-step"><strong>${String(index + 1).padStart(2, '0')} · ${escapeHtml(item)}</strong><span>Krótki opis działania, obserwacji i warunku przejścia dalej.</span></div>`).join('')}</div>`
  } else if (page.kind === 'map') {
    body = `${head}<div class="map-grid">${['Środowisko', 'Zachowanie', 'Zdrowie', 'Bezpieczeństwo', 'Rytm dnia', 'Możliwości opiekuna'].map((item) => `<div class="map-item"><strong>${escapeHtml(item)}</strong>Nie każda warstwa ma tę samą wagę w każdym przypadku.</div>`).join('')}</div>`
  } else if (page.kind === 'case') {
    body = `${head}<div class="case-card"><strong>Przykład redakcyjny</strong><p>Opis sytuacji, obserwacji i kolejnych decyzji powinien pokazywać tok rozumowania. Nie powinien udawać diagnozy ani gotowej recepty dla każdego domu.</p></div><div class="callout"><strong>Granica bezpieczeństwa</strong>Jeżeli pojawiają się czerwone flagi zdrowotne, nagła zmiana lub realne zagrożenie, materiał kieruje do lekarza weterynarii lub konsultacji.</div>`
  } else {
    body = `${head}<div class="workbook-grid">${['Fakty', 'Hipoteza robocza', 'Jedna zmiana', 'Co obserwuję?', 'Kiedy przerwać?', 'Co zabieram na konsultację?'].map((item) => `<div class="workbook-field"><strong>${escapeHtml(item)}</strong><span>miejsce na własną notatkę</span></div>`).join('')}</div>`
  }
  return `<section class="page body-page kind-${page.kind}">${body}${footer(tier, brandMark, pageNumber, totalPages)}</section>`
}

function endPage(tier: Tier, brandMark: string, art: string, pageNumber: number, totalPages: number) {
  const endVisual = tier.id === 'p19' ? `<img class="end-art" src="${art}" alt="Ilustracja zamykająca praktyczny poradnik" />` : ''
  const eyebrow = tier.id === 'p19' ? 'Na zakończenie' : 'Stała końcówka serii'
  const copy = tier.id === 'p19'
    ? 'Na końcu zbierz w jednym miejscu: co obserwować, co zmienić i kiedy przejść do konsultacji. Dzięki temu kolejny krok wynika z faktów, a nie z przypadkowej porady.'
    : 'Finalny PDF będzie kończył się jasnym wyborem: co obserwować, co zmienić i kiedy przejść do konsultacji. Ta sekcja pozostaje wspólna dla marki, a szczegóły dopasujemy do treści konkretnego materiału.'
  return `<section class="page end-page">${endVisual}<div class="page-head"><div><small>${eyebrow}</small><h2>Jeden spokojny krok jest lepszy niż pięć przypadkowych prób.</h2></div><img class="brand-mark body-brand-mark" src="${brandMark}" alt="Regulski Behawiorysta" /></div><p>${copy}</p><div class="end-steps"><div class="end-step"><strong>1. Zapisz</strong>Fakty przed zachowaniem i po nim.</div><div class="end-step"><strong>2. Zmień jedną rzecz</strong>Mały, bezpieczny eksperyment zamiast chaosu.</div><div class="end-step"><strong>3. Sprawdź efekt</strong>Porównanie kilku podobnych sytuacji.</div></div><div class="end-contact"><strong>Regulski Behawiorysta</strong><br />regulskibehawiorysta.pl · kontakt@regulskibehawiorysta.pl<br />${escapeHtml(tier.label)} · ${escapeHtml(tier.priceLabel)}</div>${footer(tier, brandMark, pageNumber, totalPages)}</section>`
}

async function renderTier(tier: Tier, css: string) {
  const demo = demos[tier.id]
  const art = await imageData(tier.art)
  const brandLogo = await brandAssetData('logo-regulski.png')
  const brandMark = await brandAssetData('favicon-180.png')
  const totalPages = demo.pages.length + 2
  const html = `<!doctype html><html lang="pl"><head><meta charset="utf-8" /><title>${escapeHtml(demo.title)}</title><style>${css}</style></head><body class="tier-${tier.id}">${cover(tier, demo, art, brandLogo, brandMark, totalPages)}${demo.pages.map((page, index) => bodyPage(tier, page, brandMark, index + 2, totalPages, art)).join('')}${endPage(tier, brandMark, art, totalPages, totalPages)}</body></html>`
  const htmlPath = path.join(AUDIT_DIR, `${tier.id}.html`)
  await fs.writeFile(htmlPath, html, 'utf8')
  return { html, htmlPath }
}

async function renderPreview(pdfPath: string, slug: string) {
  const prefix = path.join(AUDIT_DIR, `${slug}-preview`)
  await execFileAsync('pdftoppm', ['-png', '-f', '1', '-l', '1', '-r', '92', pdfPath, prefix], { windowsHide: true })
  const generated = (await fs.readdir(AUDIT_DIR)).find((file) => file.startsWith(`${slug}-preview-`) && file.endsWith('.png'))
  if (!generated) throw new Error(`Brak podglądu dla ${slug}`)
  const source = path.join(AUDIT_DIR, generated)
  const output = path.join(AUDIT_DIR, `${slug}-cover.png`)
  await sharp(source).resize({ width: 560 }).png().toFile(output)
  await fs.rm(source, { force: true })
  return output
}

async function writeContactSheet(previews: string[]) {
  const width = 560
  const height = 792
  const canvas = sharp({ create: { width: width * 2, height: height * 2, channels: 4, background: '#eee9df' } })
  const composites = await Promise.all(previews.map(async (file, index) => ({ input: await sharp(file).resize({ width, height, fit: 'contain', background: '#fffdf8' }).png().toBuffer(), left: (index % 2) * width, top: Math.floor(index / 2) * height })))
  await canvas.composite(composites).png().toFile(path.join(OUTPUT_DIR, 'SYSTEM-COVERS-2x2.png'))
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true })
  await fs.mkdir(AUDIT_DIR, { recursive: true })
  const config = await loadJson<{ tiers: Tier[] }>(path.join(SYSTEM_DIR, 'config.json'))
  const css = await fs.readFile(path.join(SYSTEM_DIR, 'styles.css'), 'utf8')
  const browserPath = process.env.PLAYWRIGHT_CHROME ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  const browser = await chromium.launch({ headless: true, executablePath: browserPath })
  const manifest: Array<Record<string, unknown>> = []

  try {
    for (const tier of config.tiers) {
      const { html } = await renderTier(tier, css)
      const page = await browser.newPage()
      const pdfPath = path.join(OUTPUT_DIR, `demonstrator-${tier.id}.pdf`)
      try {
        await page.setContent(html, { waitUntil: 'load' })
        await page.emulateMedia({ media: 'print' })
        await page.pdf({ path: pdfPath, format: 'A4', printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false, margin: { top: '0', right: '0', bottom: '0', left: '0' } })
      } finally {
        await page.close()
      }
      const stat = await fs.stat(pdfPath)
      const preview = await renderPreview(pdfPath, tier.id)
      manifest.push({ id: tier.id, label: tier.label, price: tier.priceLabel, targetPages: tier.pageRange, demoPages: demos[tier.id].pages.length + 2, pdf: path.basename(pdfPath), sizeKb: Math.round(stat.size / 1024), preview: path.relative(ROOT, preview) })
      console.log(`OK  ${tier.id.padEnd(6)} ${String(Math.round(stat.size / 1024)).padStart(4)} KB  ${tier.label}`)
    }
  } finally {
    await browser.close()
  }

  const previews = manifest.map((item) => path.join(ROOT, String(item.preview)))
  await writeContactSheet(previews)
  await fs.writeFile(path.join(OUTPUT_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  await fs.writeFile(path.join(OUTPUT_DIR, 'README.md'), '# PDF5POLEK — pakiet demonstracyjny\n\nCztery demonstratory systemu do akceptacji przed produkcją pierwszych serii po 10 PDF-ów.\n\n- `demonstrator-free.pdf` — bezpłatny start\n- `demonstrator-p19.pdf` — krótki poradnik\n- `demonstrator-p39.pdf` — plan działania\n- `demonstrator-p59.pdf` — kompendium premium, docelowo około 40–50 stron\n- `SYSTEM-COVERS-2x2.png` — porównanie okładek\n')
  console.log(`\nGotowe: ${manifest.length} demonstratory w ${OUTPUT_DIR}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
