import { execFile } from 'node:child_process'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'
import * as cheerio from 'cheerio'
import { chromium } from 'playwright-core'

const execFileAsync = promisify(execFile)
const ROOT = process.cwd()
const SYSTEM = path.join(ROOT, 'content', 'guides', 'tier-system')
const OUTPUT = path.join(ROOT, 'do-przegladu', 'system-pdf5polek-2026-07-23', 'p19-shelf')
const TMP = path.join(ROOT, '.tmp', 'p19-shelf-20260723')

type Guide = { slug: string; species: 'pies' | 'kot'; title: string; subtitle: string; source: string }
const guides: Guide[] = [
  { slug: 'pies-sam-w-domu', species: 'pies', title: 'Pies sam w domu', subtitle: 'Jak rozpoznać próg trudności i zacząć spokojne rozstania', source: 'content/guides/items/pies-sam-w-domu/guide.md' },
  { slug: 'pies-reaktywny-na-spacerze', species: 'pies', title: 'Pies reaktywny na spacerze', subtitle: 'Mapa dystansu, bodźców i pierwszych bezpiecznych prób', source: 'content/guides/clean-pies-reaktywny-na-spacerze/guide.md' },
  { slug: 'pies-broni-zasobow', species: 'pies', title: 'Pies broni zasobów', subtitle: 'Bezpieczeństwo domu i plan bez odbierania na siłę', source: 'content/guides/items/pies-broni-zasobow/guide.md' },
  { slug: 'pies-szczeka-na-gosci', species: 'pies', title: 'Pies szczeka na gości', subtitle: 'Plan wejścia, dystansu i spokojnej obsługi wizyty', source: 'content/guides/sources/pies-szczeka-na-gosci/source.html' },
  { slug: 'pies-niszczy-w-domu', species: 'pies', title: 'Pies niszczy w domu', subtitle: 'Jak rozdzielić nudę, napięcie i trudność z samotnością', source: 'content/guides/items/pies-niszczy-w-domu/guide.md' },
  { slug: 'kot-kuweta-pierwszy-plan', species: 'kot', title: 'Kot i kuweta', subtitle: 'Pierwszy plan działania przy problemie poza kuwetą', source: 'content/guides/clean-kot-i-kuweta-pierwszy-plan-dzialania/guide.md' },
  { slug: 'kot-zyje-w-napieciu', species: 'kot', title: 'Kot żyje w napięciu', subtitle: 'Jak czytać sygnały stresu i odciążyć środowisko', source: 'content/guides/sources/kot-zyje-w-napieciu/source.html' },
  { slug: 'konflikt-miedzy-kotami', species: 'kot', title: 'Konflikt między kotami', subtitle: 'Od napięcia w domu do pierwszych zmian w zasobach', source: 'content/guides/clean-konflikt-miedzy-kotami-w-domu/guide.md' },
  { slug: 'kot-gryzie-przy-glaskaniu', species: 'kot', title: 'Kot gryzie przy głaskaniu', subtitle: 'Granice dotyku, sygnały ostrzegawcze i bezpieczna zmiana', source: 'content/guides/sources/kot-gryzie-przy-glaskaniu/source.html' },
  { slug: 'kot-chowa-sie-po-zmianach', species: 'kot', title: 'Kot chowa się po zmianach', subtitle: 'Plan adaptacji po remoncie, przeprowadzce lub nowym domowniku', source: 'content/guides/sources/kot-chowa-sie-po-zmianach/source.html' },
]

const escape = (v: string) => v.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
async function data(file: string) { return `data:image/png;base64,${(await fs.readFile(file)).toString('base64')}` }
function footer(n: number, total: number, mark: string, species: string) { return `<footer class="footer"><div class="footer-main"><span class="footer-brand"><img class="brand-mark footer-brand-mark" src="${mark}" alt=""/><strong>Regulski Behawiorysta</strong></span><span class="footer-context">${species} · praktyczny poradnik · 19 zł</span><span class="footer-page">${n} / ${total}</span></div><div class="footer-note">Treść informacyjna — nie zastępuje badania ani indywidualnej konsultacji.</div></footer>` }
function chunks(source: string, markdown: boolean) {
  const html = markdown ? source.replace(/^## (.+)$/gm, '<h2>$1</h2>').replace(/^### (.+)$/gm, '<h3>$1</h3>').replace(/^- (.+)$/gm, '<li>$1</li>').replace(/\n\n/g, '</p><p>') : source
  const $ = cheerio.load(`<main>${html}</main>`)
  $('script,style,nav,footer').remove()
  const groups: string[] = []; let current = ''; let size = 0
  $('main').children().each((_i, node) => { const item = $.html(node); const next = $(node).text().replace(/\s+/g, ' ').length; if (current && size + next > 1900) { groups.push(current); current = ''; size = 0 } current += item; size += next })
  if (current) groups.push(current)
  return groups.filter((g) => cheerio.load(g).text().trim().length > 80)
}
function page(title: string, body: string, n: number, total: number, mark: string, species: string) { return `<section class="page body-page"><div class="page-head"><div><small>${species} · praktyczny poradnik</small><h2>${escape(title)}</h2></div><img class="brand-mark body-brand-mark" src="${mark}" alt=""/></div><div class="p19-article">${body}</div>${footer(n,total,mark,species)}</section>` }
function toolsPage(title: string, rows: string[], n: number, total: number, mark: string, species: string) { return page(title, `<div class="workbook-grid">${rows.map((r) => `<div class="workbook-field"><strong>${escape(r)}</strong><span>miejsce na własną notatkę</span></div>`).join('')}</div>`,n,total,mark,species) }
async function main() {
  await fs.mkdir(OUTPUT,{recursive:true}); await fs.mkdir(TMP,{recursive:true})
  const css = await fs.readFile(path.join(SYSTEM,'styles.css'),'utf8')
  const logo = await data(path.join(ROOT,'public','branding','regulski-web','logos','logo-regulski.png'))
  const mark = await data(path.join(ROOT,'public','branding','regulski-web','logos','favicon-180.png'))
  const art = await data(path.join(SYSTEM,'art','tier-19-layout-v3.png'))
  const browser = await chromium.launch({headless:true, executablePath: process.env.PLAYWRIGHT_CHROME ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'})
  const manifest: unknown[] = []
  try { for (const guide of guides) {
    const raw = await fs.readFile(path.join(ROOT,guide.source),'utf8'); const body = chunks(raw,guide.source.endsWith('.md'))
    const article = body.slice(0,8); const extraTools = Math.max(0, 8 - (article.length + 4)); const total = article.length + 4 + extraTools; const species = guide.species === 'pies' ? 'Pies' : 'Kot'
    const cover = `<section class="page cover"><div class="topbar"><img class="brand-logo cover-brand-logo" src="${logo}" alt="Regulski Behawiorysta"/><span class="tier-label">Praktyczny poradnik · 19 zł</span></div><div class="cover-body"><div><div class="kicker">${species} · jeden problem · spokojny plan</div><h1>${escape(guide.title)}</h1><p class="subtitle">${escape(guide.subtitle)}</p><p class="promise">Mapa sytuacji, pierwsze bezpieczne zmiany i arkusz, do którego można wrócić po kilku dniach.</p></div><img class="tier-art" src="${art}" alt="Ilustracja serii praktycznych poradników"/></div><div class="cover-meta"><div><strong>W środku</strong>Rozpoznanie wzoru, plan prób i karta obserwacji.</div><div><strong>Rytm</strong>Zobacz, zmień jedną rzecz, sprawdź efekt.</div><div><strong>Ważne</strong>Przy sygnałach zdrowotnych zacznij od lekarza weterynarii.</div></div>${footer(1,total,mark,species)}</section>`
    const extraPages = [
      toolsPage('Plan na 7 dni',['Dzień 1 — obraz wyjściowy','Dzień 2–3 — najłatwiejsza zmiana','Dzień 4–5 — powtórzenie bez zwiększania presji','Dzień 6–7 — porównanie i decyzja'],article.length+4,total,mark,species),
      toolsPage('Pytania do dalszej konsultacji',['Co jest faktem, a co interpretacją?','Jak wygląda zdrowie, sen i apetyt?','Który warunek najbardziej zmienia reakcję?','Jakie nagranie lub notatkę warto przygotować?'],article.length+5,total,mark,species),
      toolsPage('Karta kontroli po zmianie',['Co zmieniło się w zachowaniu?','Co nie zadziałało lub zwiększyło napięcie?','Czy próg trudności był właściwy?','Jaki jest następny najmniejszy krok?'],article.length+6,total,mark,species),
    ].slice(0, extraTools)
    const pages = [cover,...article.map((v,i)=>page(`Moduł ${i+1}: ${cheerio.load(v)('h2').first().text() || 'Praktyczny krok'}`,v,i+2,total,mark,species)),toolsPage('Mapa sytuacji i próg trudności',['Co dokładnie dzieje się przed zachowaniem?','Jaki jest pierwszy sygnał napięcia?','Co choć trochę ułatwia sytuację?','Kiedy przerywam próbę?'],article.length+2,total,mark,species),toolsPage('Plan trzech spokojnych prób',['Próba 1 — najłatwiejszy wariant','Próba 2 — co zmieniam?','Próba 3 — co porównuję?','Decyzja na kolejny tydzień'],article.length+3,total,mark,species),...extraPages,`<section class="page end-page"><div class="page-head"><div><small>Na zakończenie</small><h2>Jeden spokojny krok jest lepszy niż pięć przypadkowych prób.</h2></div><img class="brand-mark body-brand-mark" src="${mark}" alt=""/></div><p>Wybierz jedną rzecz do obserwacji i jedną zmianę, którą możesz bezpiecznie wprowadzić. Jeśli sytuacja jest nagła, nasilona lub dotyczy zdrowia, zacznij od lekarza weterynarii.</p><div class="end-contact"><strong>Regulski Behawiorysta</strong><br/>regulskibehawiorysta.pl · kontakt@regulskibehawiorysta.pl</div>${footer(total,total,mark,species)}</section>`]
    const html = `<!doctype html><html lang="pl"><head><meta charset="utf-8"/><title>${escape(guide.title)}</title><style>${css}.p19-article{font-size:10pt;line-height:1.42;max-width:163mm}.p19-article h2{font-size:16pt;margin:4mm 0 2mm;color:var(--dark)}.p19-article h3{font-size:12pt;margin:3mm 0 1mm}.p19-article p{margin:0 0 3mm}.p19-article li{margin:1mm 0}.p19-article ul,.p19-article ol{margin:2mm 0 3mm;padding-left:7mm}</style></head><body class="tier-p19">${pages.join('')}</body></html>`
    const pdf = path.join(OUTPUT,`${guide.slug}.pdf`); const p = await browser.newPage(); await p.setContent(html,{waitUntil:'load'}); await p.emulateMedia({media:'print'}); await p.pdf({path:pdf,format:'A4',printBackground:true,preferCSSPageSize:true,margin:{top:'0',right:'0',bottom:'0',left:'0'}}); await p.close();
    await execFileAsync('qpdf',['--check',pdf],{windowsHide:true}); const { stdout } = await execFileAsync('pdfinfo',[pdf],{windowsHide:true}); const pageCount = Number(stdout.match(/^Pages:\s+(\d+)$/m)?.[1]); if (!Number.isInteger(pageCount) || pageCount < 8 || pageCount > 14) throw new Error(`${guide.slug}: nieprawidłowa liczba stron ${pageCount}`); manifest.push({ ...guide,pdf:path.basename(pdf),pages: pageCount }); console.log(`OK ${guide.slug} ${pageCount} str.`)
  }} finally { await browser.close() }
  await fs.writeFile(path.join(OUTPUT,'manifest.json'),JSON.stringify({tier:'p19',generatedAt:new Date().toISOString(),guides:manifest},null,2)+'\n'); await fs.writeFile(path.join(OUTPUT,'README.md'),'# Półka 19 zł\n\n10 praktycznych poradników: 5 dla psa i 5 dla kota. Każdy PDF przeszedł kontrolę składni qpdf.\n')
}
main().catch((e)=>{console.error(e);process.exitCode=1})
