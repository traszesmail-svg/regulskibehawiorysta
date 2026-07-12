const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputDir = 'C:\\projekt\\apki\\plansze-wyroznienia-2026-07-12';
const outputDir = 'C:\\projekt\\apki\\plansze-gotowe-ig';
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

const stories = [
  // Smycz
  { file: '01-smycz-00-okladka.png' }, 
  {
    file: '01-smycz-01.png',
    header: 'Spokojny spacer zaczyna\nsię, zanim smycz\nsię napnie.',
    text: 'Zwróć uwagę, przy jakim\ndystansie pies jeszcze\npotrafi iść spokojnie.',
    cta: 'Zapisz obserwację po spacerze.'
  },
  {
    file: '01-smycz-02.png',
    header: 'Węszenie nie jest\nstratą czasu.',
    text: 'Dla wielu psów to sposób na\nzbieranie informacji i obniżenie\nnapięcia.',
    cta: 'Daj psu kilka minut bez poganiania.'
  },
  {
    file: '01-smycz-03.png',
    header: 'Luźna smycz to\nkomunikacja, nie siłowanie.',
    text: 'Jeśli pies ciągnie, najpierw\nsprawdź tempo, bodźce\ni dystans.',
    cta: 'Zacznij od quizu w bio.'
  },
  // Samotnosc
  { file: '02-samotnosc-00-okladka.png' },
  {
    file: '02-samotnosc-01.png',
    header: 'Zanim ćwiczysz zostawanie,\nprzygotuj bezpieczne\nmiejsce.',
    text: 'Woda, legowisko i przewidywalność\nsą ważniejsze niż długa\npróba na siłę.',
    cta: 'Zacznij od krótkiej obserwacji.'
  },
  {
    file: '02-samotnosc-02.png',
    header: 'Nagranie pokazuje\nwięcej niż domysły.',
    text: 'Sprawdź, co dzieje się\nw pierwszych minutach po wyjściu.',
    cta: 'Nagraj 10-15 min spokojnego wyjścia.'
  },
  {
    file: '02-samotnosc-03.png',
    header: 'Samotność to nie zawsze\n"niegrzeczne zachowanie".',
    text: 'Najpierw zobacz poziom stresu,\npotem dobierz plan.',
    cta: 'Nagraj i opisz problem.'
  },
  // Kuweta
  { file: '03-kuweta-00-okladka.png' },
  {
    file: '03-kuweta-01.png',
    header: 'Kot poza kuwetą?\nNajpierw zdrowie\ni warunki.',
    text: 'To nie musi być złośliwość.\nCzęsto to sygnał,\nże coś jest nie tak.',
    cta: 'Zacznij od wizyty weterynaryjnej.'
  },
  {
    file: '03-kuweta-02.png',
    header: 'Obserwacja rutyny\njest ważniejsza niż\nszukanie winy.',
    text: 'Zapisz kiedy, gdzie i w jakich\nsytuacjach pojawia się problem.',
    cta: 'Sprawdź wzór, nie incydent.'
  },
  {
    file: '03-kuweta-03.png',
    header: 'Kuweta potrzebuje\nspokoju, dostępu\ni przewidywalności.',
    text: 'Miejsce, liczba kuwet, żwirek\ni stres w domu mają znaczenie.',
    cta: 'Zacznij od quizu albo konsultacji.'
  },
  // Konsultacje
  { file: '04-konsultacje-00-okladka.png' },
  {
    file: '04-konsultacje-01.png',
    header: 'Konsultacja online to\nrozmowa o konkretach.',
    text: 'Porządkujemy sytuację spokojnie:\nfakty, emocje, zdrowie,\nśrodowisko i rutynę.',
    cta: 'Przygotuj opis problemu.'
  },
  {
    file: '04-konsultacje-02.png',
    header: 'Nagrania i notatki pomagają\nzobaczyć kontekst.',
    text: 'Nie szukamy szybkiej etykiety.\nSprawdzamy, co dzieje się\nprzed zachowaniem.',
    cta: 'Nagraj bezpieczną sytuację.'
  },
  {
    file: '04-konsultacje-03.png',
    header: 'Po konsultacji najważniejszy\njest pierwszy realny krok.',
    text: 'Plan ma pasować do zwierzęcia,\ndomu i możliwości opiekuna.',
    cta: 'Nie wiesz od czego zacząć? Quiz.'
  },
  // Quiz
  { file: '05-quiz-00-okladka.png' },
  {
    file: '05-quiz-01.png',
    header: 'Nie wiesz, od\nczego zacząć?',
    text: 'Quiz pomaga nazwać sytuację\ni dobrać spokojny pierwszy krok.',
    cta: 'Wejdź w quiz z linku w bio.'
  },
  {
    file: '05-quiz-02.png',
    header: 'Nie musisz znać\nprzyczyny od razu.',
    text: 'Wystarczy opisać to, co widzisz\nna co dzień.',
    cta: 'Wybierz sytuację z listy.'
  },
  {
    file: '05-quiz-03.png',
    header: 'Po quizie łatwiej wybrać\ndalszą ścieżkę.',
    text: 'Czasem wystarczy artykuł,\nczasem Kwadrans,\nczasem pełna konsultacja.',
    cta: 'Zacznij od quizu w bio.'
  },
  // Opinie
  { file: '06-opinie-00-okladka.png' },
  {
    file: '06-opinie-01.png',
    header: 'Opinie pokazują, jak\nwygląda współpraca.',
    text: 'Nie chodzi o obietnice efektu,\ntylko o zaufanie do procesu.',
    cta: 'Publikujemy tylko za zgodą.'
  },
  {
    file: '06-opinie-02.png',
    header: 'Prywatność jest ważniejsza\nniż mocny cytat.',
    text: 'Usuwamy dane i szczegóły,\nktóre mogłyby identyfikować\nopiekuna albo zwierzę.',
    cta: 'Zaufanie buduje też ostrożność.'
  },
  {
    file: '06-opinie-03.png',
    header: 'Dobra opinia nie zastępuje\ndiagnozy konkretnej sytuacji.',
    text: 'Może pokazać styl pracy:\nspokojny, uważny i oparty\nna kontekście.',
    cta: 'Rozpocznij od quizu.'
  }
];

async function generate() {
  for (const story of stories) {
    const inPath = path.join(inputDir, story.file);
    const outPath = path.join(outputDir, story.file);
    
    if (!fs.existsSync(inPath)) {
      console.log('Skipping missing file', story.file);
      continue;
    }

    if (!story.header) {
      // Just copy covers
      fs.copyFileSync(inPath, outPath);
      console.log('Copied cover', story.file);
      continue;
    }

    // SVG Overlay
    const headerLines = story.header.split('\n');
    const textLines = story.text.split('\n');
    
    const svgHeader = headerLines.map((l, i) => `<tspan x="100" dy="${i === 0 ? 0 : 75}">${l}</tspan>`).join('');
    const svgText = textLines.map((l, i) => `<tspan x="100" dy="${i === 0 ? 120 : 55}">${l}</tspan>`).join('');

    const svgImage = `
    <svg width="1080" height="1920">
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:rgba(0,0,0,0.55);stop-opacity:1" />
          <stop offset="40%" style="stop-color:rgba(0,0,0,0);stop-opacity:1" />
          <stop offset="70%" style="stop-color:rgba(0,0,0,0);stop-opacity:1" />
          <stop offset="100%" style="stop-color:rgba(0,0,0,0.75);stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="1080" height="1920" fill="url(#grad1)" />
      
      <!-- Nagłówek -->
      <text x="100" y="320" font-family="sans-serif" font-weight="bold" font-size="64" fill="#ffffff" style="text-shadow: 0 2px 10px rgba(0,0,0,0.6);">
        ${svgHeader}
      </text>
      
      <!-- Tekst -->
      <text x="100" y="470" font-family="sans-serif" font-size="46" fill="#f4f4f4" style="text-shadow: 0 2px 8px rgba(0,0,0,0.6);">
        ${svgText}
      </text>

      <!-- CTA -->
      <rect x="100" y="1720" width="880" height="110" rx="55" fill="#3A5F45" />
      <text x="540" y="1790" font-family="sans-serif" font-weight="bold" font-size="42" fill="#ffffff" text-anchor="middle">
        ${story.cta}
      </text>
    </svg>
    `;

    await sharp(inPath)
      .composite([{
        input: Buffer.from(svgImage),
        top: 0,
        left: 0,
      }])
      .toFile(outPath);
      
    console.log('Generated', story.file);
  }
  console.log('Gotowe! Zapisano w:', outputDir);
}

generate().catch(console.error);
