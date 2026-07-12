const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const outputDir = 'C:\\projekt\\apki\\plansze-gotowe-ig-v3';
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const brainDir = 'C:\\Users\\chris\\.gemini\\antigravity-cli\\brain\\d7441775-b8f2-4bce-8c26-cea649066171';

const bgMap = {
  smycz: path.join(brainDir, 'cover_smycz_1783850329844.jpg'),
  samotnosc: path.join(brainDir, 'cover_samotnosc_1783850337935.jpg'),
  kuweta: path.join(brainDir, 'cover_kuweta_1783850345788.jpg'),
  konsultacje: path.join(brainDir, 'cover_konsultacje_1783850360720.jpg'),
  quiz: path.join(brainDir, 'cover_quiz_1783850368356.jpg'),
  opinie: path.join(brainDir, 'cover_opinie_1783850376072.jpg')
};

const stories = [
  // Smycz
  { file: '01-smycz-00-okladka.png', bg: bgMap.smycz, cover: 'Smycz' }, 
  { file: '01-smycz-01.png', bg: bgMap.smycz, header: 'Spokojny spacer zaczyna\nsię, zanim smycz\nsię napnie.', text: 'Zwróć uwagę, przy jakim\ndystansie pies jeszcze\npotrafi iść spokojnie.', cta: 'Zapisz obserwację po spacerze.' },
  { file: '01-smycz-02.png', bg: bgMap.smycz, header: 'Węszenie nie jest\nstratą czasu.', text: 'Dla wielu psów to sposób na\nzbieranie informacji i obniżenie\nnapięcia.', cta: 'Daj psu kilka minut bez poganiania.' },
  { file: '01-smycz-03.png', bg: bgMap.smycz, header: 'Luźna smycz to\nkomunikacja, nie siłowanie.', text: 'Jeśli pies ciągnie, najpierw\nsprawdź tempo, bodźce\ni dystans.', cta: 'Zacznij od quizu w bio.' },
  
  // Samotnosc
  { file: '02-samotnosc-00-okladka.png', bg: bgMap.samotnosc, cover: 'Samotność' },
  { file: '02-samotnosc-01.png', bg: bgMap.samotnosc, header: 'Zanim ćwiczysz zostawanie,\nprzygotuj bezpieczne\nmiejsce.', text: 'Woda, legowisko i przewidywalność\nsą ważniejsze niż długa\npróba na siłę.', cta: 'Zacznij od krótkiej obserwacji.' },
  { file: '02-samotnosc-02.png', bg: bgMap.samotnosc, header: 'Nagranie pokazuje\nwięcej niż domysły.', text: 'Sprawdź, co dzieje się\nw pierwszych minutach po wyjściu.', cta: 'Nagraj 10-15 min spokojnego wyjścia.' },
  { file: '02-samotnosc-03.png', bg: bgMap.samotnosc, header: 'Samotność to nie zawsze\n"niegrzeczne zachowanie".', text: 'Najpierw zobacz poziom stresu,\npotem dobierz plan.', cta: 'Nagraj i opisz problem.' },
  
  // Kuweta
  { file: '03-kuweta-00-okladka.png', bg: bgMap.kuweta, cover: 'Kuweta' },
  { file: '03-kuweta-01.png', bg: bgMap.kuweta, header: 'Kot poza kuwetą?\nNajpierw zdrowie\ni warunki.', text: 'To nie musi być złośliwość.\nCzęsto to sygnał,\nże coś jest nie tak.', cta: 'Zacznij od wizyty weterynaryjnej.' },
  { file: '03-kuweta-02.png', bg: bgMap.kuweta, header: 'Obserwacja rutyny\njest ważniejsza niż\nszukanie winy.', text: 'Zapisz kiedy, gdzie i w jakich\nsytuacjach pojawia się problem.', cta: 'Sprawdź wzór, nie incydent.' },
  { file: '03-kuweta-03.png', bg: bgMap.kuweta, header: 'Kuweta potrzebuje\nspokoju, dostępu\ni przewidywalności.', text: 'Miejsce, liczba kuwet, żwirek\ni stres w domu mają znaczenie.', cta: 'Zacznij od quizu albo konsultacji.' },
  
  // Konsultacje
  { file: '04-konsultacje-00-okladka.png', bg: bgMap.konsultacje, cover: 'Konsultacje' },
  { file: '04-konsultacje-01.png', bg: bgMap.konsultacje, header: 'Konsultacja online to\nrozmowa o konkretach.', text: 'Porządkujemy sytuację spokojnie:\nfakty, emocje, zdrowie,\nśrodowisko i rutynę.', cta: 'Przygotuj opis problemu.' },
  { file: '04-konsultacje-02.png', bg: bgMap.konsultacje, header: 'Nagrania i notatki pomagają\nzobaczyć kontekst.', text: 'Nie szukamy szybkiej etykiety.\nSprawdzamy, co dzieje się\nprzed zachowaniem.', cta: 'Nagraj bezpieczną sytuację.' },
  { file: '04-konsultacje-03.png', bg: bgMap.konsultacje, header: 'Po konsultacji najważniejszy\njest pierwszy realny krok.', text: 'Plan ma pasować do zwierzęcia,\ndomu i możliwości opiekuna.', cta: 'Nie wiesz od czego zacząć? Quiz.' },
  
  // Quiz
  { file: '05-quiz-00-okladka.png', bg: bgMap.quiz, cover: 'Quiz' },
  { file: '05-quiz-01.png', bg: bgMap.quiz, header: 'Nie wiesz, od\nczego zacząć?', text: 'Quiz pomaga nazwać sytuację\ni dobrać spokojny pierwszy krok.', cta: 'Wejdź w quiz z linku w bio.' },
  { file: '05-quiz-02.png', bg: bgMap.quiz, header: 'Nie musisz znać\nprzyczyny od razu.', text: 'Wystarczy opisać to, co widzisz\nna co dzień.', cta: 'Wybierz sytuację z listy.' },
  { file: '05-quiz-03.png', bg: bgMap.quiz, header: 'Po quizie łatwiej wybrać\ndalszą ścieżkę.', text: 'Czasem wystarczy artykuł,\nczasem Kwadrans,\nczasem pełna konsultacja.', cta: 'Zacznij od quizu w bio.' },
  
  // Opinie
  { file: '06-opinie-00-okladka.png', bg: bgMap.opinie, cover: 'Opinie' },
  { file: '06-opinie-01.png', bg: bgMap.opinie, header: 'Opinie pokazują, jak\nwygląda współpraca.', text: 'Nie chodzi o obietnice efektu,\ntylko o zaufanie do procesu.', cta: 'Publikujemy tylko za zgodą.' },
  { file: '06-opinie-02.png', bg: bgMap.opinie, header: 'Prywatność jest ważniejsza\nniż mocny cytat.', text: 'Usuwamy dane i szczegóły,\nktóre mogłyby identyfikować\nopiekuna albo zwierzę.', cta: 'Zaufanie buduje też ostrożność.' },
  { file: '06-opinie-03.png', bg: bgMap.opinie, header: 'Dobra opinia nie zastępuje\ndiagnozy konkretnej sytuacji.', text: 'Może pokazać styl pracy:\nspokojny, uważny i oparty\nna kontekście.', cta: 'Rozpocznij od quizu.' }
];

async function generate() {
  for (const story of stories) {
    const inPath = story.bg;
    const outPath = path.join(outputDir, story.file);
    
    if (!fs.existsSync(inPath)) {
      console.log('Skipping missing bg file:', inPath);
      continue;
    }

    const resizedBgBuffer = await sharp(inPath)
      .resize(1080, 1920, { fit: 'cover' })
      .toBuffer();

    let svgImage = '';
    const fontFamily = 'Arial, Helvetica, sans-serif';

    if (story.cover) {
      svgImage = `
      <svg width="1080" height="1920">
        <rect x="140" y="700" width="800" height="300" rx="40" fill="#FDFBF7" fill-opacity="0.95" />
        <rect x="140" y="700" width="800" height="300" rx="40" fill="none" stroke="#B07B3F" stroke-width="4" />
        <text x="540" y="870" font-family="${fontFamily}" font-weight="bold" font-size="80" fill="#2F7667" text-anchor="middle" letter-spacing="4">
          ${story.cover.toUpperCase()}
        </text>
      </svg>
      `;
    } else {
      const headerLines = story.header.split('\n');
      const textLines = story.text.split('\n');
      
      // Zmieniamy marginesy tekstu, by nie dotykał ramki.
      // Wyśrodkujemy tekst, żeby wyglądał bardziej elegancko i "premium".
      const svgHeader = headerLines.map((l, i) => `<tspan x="540" text-anchor="middle" dy="${i === 0 ? 0 : 85}">${l}</tspan>`).join('');
      const svgText = textLines.map((l, i) => `<tspan x="540" text-anchor="middle" dy="${i === 0 ? 150 : 70}">${l}</tspan>`).join('');

      svgImage = `
      <svg width="1080" height="1920">
        <!-- Zmniejszamy prostokąt, by zrobić większy margines od brzegu ekranu -->
        <rect x="100" y="250" width="880" height="1520" rx="60" fill="#FDFBF7" fill-opacity="0.97" />
        <rect x="100" y="250" width="880" height="1520" rx="60" fill="none" stroke="#B07B3F" stroke-width="3" opacity="0.6" />
        
        <text x="540" y="440" font-family="${fontFamily}" font-weight="bold" font-size="64" fill="#2F7667">
          ${svgHeader}
        </text>
        
        <text x="540" y="700" font-family="${fontFamily}" font-weight="normal" font-size="46" fill="#2C3E35">
          ${svgText}
        </text>

        <!-- Zmieniamy wygląd i położenie przycisku CTA -->
        <rect x="160" y="1600" width="760" height="110" rx="55" fill="#2F7667" />
        <text x="540" y="1675" font-family="${fontFamily}" font-weight="bold" font-size="40" fill="#FDFBF7" text-anchor="middle">
          ${story.cta}
        </text>
      </svg>
      `;
    }

    await sharp(resizedBgBuffer)
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
