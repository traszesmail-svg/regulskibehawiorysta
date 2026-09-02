import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'public', 'poradniki');
mkdirSync(OUT, { recursive: true });

const ARIAL = 'C:/Windows/Fonts/arial.ttf';
const ARIAL_BOLD = 'C:/Windows/Fonts/arialbd.ttf';

const C = {
  accent: rgb(0.29, 0.553, 0.478),
  accentLight: rgb(0.91, 0.953, 0.941),
  ink: rgb(0.11, 0.102, 0.094),
  muted: rgb(0.353, 0.337, 0.314),
  white: rgb(1, 1, 1),
  bg: rgb(0.98, 0.976, 0.969),
};

async function makePdf(outFile, buildFn) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle('Regulski Behawiorysta');
  doc.setAuthor('Krzysztof Regulski - COAPE/CAPBT');
  const boldBytes = readFileSync(ARIAL_BOLD);
  const regularBytes = readFileSync(ARIAL);
  const bold = await doc.embedFont(boldBytes);
  const regular = await doc.embedFont(regularBytes);
  const fonts = { bold, regular };
  await buildFn(doc, fonts);
  const bytes = await doc.save();
  writeFileSync(join(OUT, outFile), bytes);
  console.log('OK', outFile);
}

function addPage(doc) {
  return doc.addPage([595, 842]);
}

function header(page, fonts) {
  page.drawRectangle({ x: 0, y: 822, width: 595, height: 20, color: C.accent });
  page.drawText('regulskibehawiorysta.pl', {
    x: 30, y: 826, size: 8, font: fonts.regular, color: C.white,
  });
}

function footer(page, fonts, pageNum) {
  page.drawLine({ start: { x: 30, y: 30 }, end: { x: 565, y: 30 }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
  page.drawText('Krzysztof Regulski - behawiorysta COAPE/CAPBT', {
    x: 30, y: 16, size: 7, font: fonts.regular, color: C.muted,
  });
  page.drawText(String(pageNum), {
    x: 560, y: 16, size: 7, font: fonts.regular, color: C.muted,
  });
}

function accentBox(page, x, y, w, h) {
  page.drawRectangle({ x, y: y - h + 4, width: w, height: h, color: C.accentLight, borderColor: C.accent, borderWidth: 0.5 });
}

function wrapText(text, maxChars) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length > maxChars) {
      if (line) lines.push(line.trim());
      line = word;
    } else {
      line = (line + ' ' + word).trim();
    }
  }
  if (line) lines.push(line.trim());
  return lines.length ? lines : [''];
}

// =====================================================================
// PDF 1: 30 zachowań
// =====================================================================
await makePdf('30-zachowan.pdf', async (doc, fonts) => {
  let page = addPage(doc);
  page.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: C.bg });
  page.drawRectangle({ x: 0, y: 742, width: 595, height: 100, color: C.accent });
  page.drawText('DARMOWY PORADNIK', { x: 30, y: 820, size: 10, font: fonts.bold, color: C.white });
  page.drawText('KRZYSZTOF REGULSKI  -  COAPE / CAPBT', { x: 30, y: 750, size: 9, font: fonts.regular, color: C.white });
  page.drawText('30 zachowań', { x: 30, y: 680, size: 52, font: fonts.bold, color: C.ink });
  page.drawText('do obserwacji', { x: 30, y: 618, size: 52, font: fonts.bold, color: C.accent });
  page.drawText('Sygnały u psa i kota - co naprawde znacza', { x: 30, y: 585, size: 15, font: fonts.regular, color: C.muted });
  page.drawRectangle({ x: 30, y: 480, width: 240, height: 80, color: C.accentLight, borderColor: C.accent, borderWidth: 1 });
  page.drawText('Co znajdziesz w środku:', { x: 42, y: 545, size: 10, font: fonts.bold, color: C.ink });
  ['15 sygnałów psa + interpretacja', '15 sygnałów kota + interpretacja', 'Kiedy reagować, kiedy obserwować', 'Kiedy do behawiorysty'].forEach((t, i) => {
    page.drawText('- ' + t, { x: 42, y: 527 - i * 14, size: 9, font: fonts.regular, color: C.ink });
  });
  page.drawText('regulskibehawiorysta.pl', { x: 30, y: 60, size: 10, font: fonts.bold, color: C.accent });
  page.drawText('konsultację behawioralne psów i kotów online', { x: 30, y: 45, size: 9, font: fonts.regular, color: C.muted });

  // Strona 2 - Wstęp
  page = addPage(doc);
  page.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: C.white });
  header(page, fonts);
  page.drawText('Wstęp', { x: 30, y: 790, size: 20, font: fonts.bold, color: C.accent });
  const wstep = [
    'Ta lista powstała po wielu rozmowach z opiekunami psów i kotów,',
    'którzy pytali mnie: "Czy to normalne?" - i często nie wiedzieli,',
    'że warto bylo wczesniej reagować.',
    '',
    'Nie jest to lista diagnoz. To zbior sygnałów, które warto znać -',
    'żeby wiedzieć, kiedy zachowanie zwierzęcia jest komunikatem,',
    'a kiedy powodem do kontaktu z lekarzem weterynarii lub behawiorystą.',
    '',
    'Jak korzystać z tej listy:',
    '- Przejrzyj ją spokojnie - nie szukaj problemów na siłę.',
    '- Jeśli widzisz kilka sygnałów naraz - warto porozmawiać.',
    '- Jedno zachowanie nie jest diagnozą behawioralną. Kontekst jest wszystkim.',
    '- Nagła zmiana zachowania: zawsze najpierw weterynarz.',
  ];
  wstep.forEach((line, i) => {
    page.drawText(line, { x: 30, y: 758 - i * 16, size: 10, font: fonts.regular, color: C.ink });
  });
  footer(page, fonts, 2);

  // Strona 3 - Pies część 1
  page = addPage(doc);
  page.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: C.white });
  header(page, fonts);
  page.drawRectangle({ x: 30, y: 775, width: 200, height: 22, color: C.accent });
  page.drawText('Pies - 15 sygnałów (1-8)', { x: 38, y: 781, size: 11, font: fonts.bold, color: C.white });

  const dogBehaviors = [
    ['1. Oblizywanie pyska', 'Sygnał uspokajający, stres lub napięcie. Nie mylic z oblizywaniem po jedzeniu.'],
    ['2. Ziewanie poza snem', 'Stres, nie zmęczenie. Często w sytuacjach nowych lub napiecia.'],
    ['3. Odwracanie głowy', '"Nie szukam konfliktu" - sygnał deeskalacji. Szanuj to.'],
    ['4. Sztywnienie ciała', 'Alarm. Pies przygotowuje się do reakcji. Nie ignoruj.'],
    ['5. Widoczne białka oczu', 'Duży stres lub dyskomfort. Daj przestrzeń.'],
    ['6. Drapanie się bez powodu', 'Sygnał uspokajający lub przekierowanie uwagi.'],
    ['7. Spuszczone uszy + ogon', 'Submisja lub strach. Nie wymuszaj kontaktu.'],
    ['8. Merdanie nisko i szybko', 'Nie zawsze radość - mieszane uczucia, ostrożność.'],
  ];

  let y = 755;
  dogBehaviors.forEach(([name, desc]) => {
    page.drawText(name, { x: 30, y, size: 10, font: fonts.bold, color: C.ink });
    const lines = wrapText(desc, 80);
    lines.forEach((line, j) => {
      page.drawText(line, { x: 44, y: y - 13 - j * 12, size: 9, font: fonts.regular, color: C.muted });
    });
    y -= 13 + lines.length * 12 + 8;
  });
  footer(page, fonts, 3);

  // Strona 4 - Pies część 2
  page = addPage(doc);
  page.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: C.white });
  header(page, fonts);
  page.drawRectangle({ x: 30, y: 775, width: 200, height: 22, color: C.accent });
  page.drawText('Pies - sygnały 9-15', { x: 38, y: 781, size: 11, font: fonts.bold, color: C.white });

  const dogBehaviors2 = [
    ['9. Warczenie', 'Jasny komunikat. NIE karać - warczenie to ostrzeżenie. Karanie usuwa sygnał, nie problem.'],
    ['10. Niechęć do ulubionego jedzenia', 'Stres lub choroba. Wymaga uwagi.'],
    ['11. Częste załatwianie się', 'Może być stres lub problem zdrowotny - weterynarz.'],
    ['12. Niszczenie kiedy sam', 'Lęk separacyjny vs. nuda - różne podejścia. Obserwuj kontekst.'],
    ['13. Chowanie się stale', 'Jeśli regularne - niepokojące. Ból, stres, choroba.'],
    ['14. Głośne wzdychanie', 'Kontekst decyduje: relaks albo frustracja.'],
    ['15. Łuk przy podejsciu', 'Chęć zaangazowania, ale ostrozna. Zaproś, nie wymuszaj.'],
  ];

  y = 755;
  dogBehaviors2.forEach(([name, desc]) => {
    page.drawText(name, { x: 30, y, size: 10, font: fonts.bold, color: C.ink });
    const lines = wrapText(desc, 80);
    lines.forEach((line, j) => {
      page.drawText(line, { x: 44, y: y - 13 - j * 12, size: 9, font: fonts.regular, color: C.muted });
    });
    y -= 13 + lines.length * 12 + 8;
  });

  accentBox(page, 30, y - 10, 535, 55);
  page.drawText('Wazne przy warczeniu:', { x: 40, y: y - 20, size: 10, font: fonts.bold, color: C.accent });
  page.drawText('Pies który nie warczy, nie "jest grzeczny" - może nauczył się,', { x: 40, y: y - 35, size: 9, font: fonts.regular, color: C.ink });
  page.drawText('że ostrzeganie nic nie daje. To jest bardziej niebezpieczne.', { x: 40, y: y - 48, size: 9, font: fonts.regular, color: C.ink });
  footer(page, fonts, 4);

  // Strona 5 - Kot część 1
  page = addPage(doc);
  page.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: C.white });
  header(page, fonts);
  page.drawRectangle({ x: 30, y: 775, width: 200, height: 22, color: C.accent });
  page.drawText('Kot - 15 sygnałów (1-8)', { x: 38, y: 781, size: 11, font: fonts.bold, color: C.white });

  const catBehaviors = [
    ['1. Mruczenie', 'Zadowolenie, ALE też ból lub stres. Kontekst jest kluczowy.'],
    ['2. Powolne mruganie', '"Ufam ci" - odpowiedz tym samym. Komunikat pozytywny.'],
    ['3. Machanie końcówką ogona', 'Irytacja, nie radość. Daj przestrzeń.'],
    ['4. Płaskie uszy do tyłu', 'Strach lub agresja obronna. Nie zbliżaj się.'],
    ['5. Spłaszczenie ciała', 'Strach lub silny stres.'],
    ['6. Ogon w kształt U', 'Strach lub bolesność.'],
    ['7. Uniesiony ogon prosto', 'Pozytywne powitanie, otwartość na kontakt.'],
    ['8. Drapanie mebli', 'Naturalne. Dostarcz drapaka w dobrym miejscu.'],
  ];

  y = 755;
  catBehaviors.forEach(([name, desc]) => {
    page.drawText(name, { x: 30, y, size: 10, font: fonts.bold, color: C.ink });
    const lines = wrapText(desc, 80);
    lines.forEach((line, j) => {
      page.drawText(line, { x: 44, y: y - 13 - j * 12, size: 9, font: fonts.regular, color: C.muted });
    });
    y -= 13 + lines.length * 12 + 8;
  });
  footer(page, fonts, 5);

  // Strona 6 - Kot część 2
  page = addPage(doc);
  page.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: C.white });
  header(page, fonts);
  page.drawRectangle({ x: 30, y: 775, width: 200, height: 22, color: C.accent });
  page.drawText('Kot - sygnały 9-15', { x: 38, y: 781, size: 11, font: fonts.bold, color: C.white });

  const catBehaviors2 = [
    ['9. Sikanie poza kuweta', 'ZAWSZE: 1) weterynarz, 2) sprawdź kuwetę, 3) stres/środowisko.'],
    ['10. Spreyowanie', 'Komunikacja terytorialna. Często stres lub koty w domu.'],
    ['11. Mlaskanie przy oknie', 'Frustracja łowiecka - daj zabawy węchowe/ruchowe.'],
    ['12. Ukrywanie się', 'Stres, nowość lub choroba. Jeśli stale - niepokojące.'],
    ['13. Nadmierne lizanie ciała', 'Stres, ból lub alergia. Obserwuj lokalizację.'],
    ['14. Ataki na łydki i ręce', 'Niedobór bodźców łowieckich. Zabawa 2× dziennie.'],
    ['15. Regularne wymioty', 'Nie norma. Weterynarz - różne przyczyny.'],
  ];

  y = 755;
  catBehaviors2.forEach(([name, desc]) => {
    page.drawText(name, { x: 30, y, size: 10, font: fonts.bold, color: C.ink });
    const lines = wrapText(desc, 80);
    lines.forEach((line, j) => {
      page.drawText(line, { x: 44, y: y - 13 - j * 12, size: 9, font: fonts.regular, color: C.muted });
    });
    y -= 13 + lines.length * 12 + 8;
  });
  footer(page, fonts, 6);

  // Strona 7 - Kiedy do behawiorysty
  page = addPage(doc);
  page.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: C.white });
  header(page, fonts);
  page.drawText('Kiedy skontaktować się z behawiorystą?', { x: 30, y: 790, size: 16, font: fonts.bold, color: C.ink });

  const signals = [
    'Zachowanie trwa ponad 4 tygodnie mimo zmian w środowisku',
    'Pojawiło się nagle - sprawdź najpierw u lekarza weterynarii',
    'Wyraźnie się nasila w czasie',
    'Pies / kot przestaje jeść, pić, lub rani siebie',
    'Konflikt między zwierzętami w domu',
    'Coraz trudniej Ci z tym emocjonalnie radzić',
  ];

  page.drawText('Sygnały, które wymagaja konsultacji:', { x: 30, y: 758, size: 11, font: fonts.bold, color: C.accent });
  y = 738;
  signals.forEach((s) => {
    page.drawText('-', { x: 30, y, size: 10, font: fonts.bold, color: C.accent });
    const lines = wrapText(s, 75);
    lines.forEach((line, j) => {
      page.drawText(line, { x: 44, y: y - j * 13, size: 10, font: fonts.regular, color: C.ink });
    });
    y -= lines.length * 13 + 8;
  });

  y -= 20;
  accentBox(page, 30, y - 10, 535, 80);
  page.drawText('Umów spokojny pierwszy krok', { x: 40, y: y - 20, size: 13, font: fonts.bold, color: C.accent });
  page.drawText('Zapytaj behawiorystę 79 zl  -  Zapytaj teraz 104 zl  -  Pełna konsultacja 475 zl', { x: 40, y: y - 38, size: 9, font: fonts.regular, color: C.ink });
  page.drawText('Bez kary, bez przymusu. Pierwszy krok nie musi być duży.', { x: 40, y: y - 53, size: 9, font: fonts.regular, color: C.muted });
  page.drawText('regulskibehawiorysta.pl/zapytaj', { x: 40, y: y - 68, size: 10, font: fonts.bold, color: C.accent });
  footer(page, fonts, 7);

  // Tylna okladka
  page = addPage(doc);
  page.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: C.accent });
  page.drawText('Krzysztof Regulski', { x: 30, y: 750, size: 32, font: fonts.bold, color: C.white });
  page.drawText('behawiorysta zwierzecy', { x: 30, y: 712, size: 16, font: fonts.regular, color: C.white });
  ['Certyfikat COAPE / CAPBT', 'Technik weterynarii', 'Praca bez kar i przymusu'].forEach((t, i) => {
    page.drawText('- ' + t, { x: 30, y: 670 - i * 22, size: 12, font: fonts.regular, color: C.white });
  });
  page.drawText('kontakt@regulskibehawiorysta.pl', { x: 30, y: 120, size: 11, font: fonts.regular, color: C.white });
  page.drawText('regulskibehawiorysta.pl', { x: 30, y: 98, size: 14, font: fonts.bold, color: C.white });
});

// =====================================================================
// PDF 2: Pies sam w domu
// =====================================================================
await makePdf('pies-sam-w-domu.pdf', async (doc, fonts) => {
  let page = addPage(doc);
  page.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: C.bg });
  page.drawRectangle({ x: 0, y: 742, width: 595, height: 100, color: C.accent });
  page.drawText('DARMOWY PORADNIK', { x: 30, y: 820, size: 10, font: fonts.bold, color: C.white });
  page.drawText('KRZYSZTOF REGULSKI  -  COAPE / CAPBT', { x: 30, y: 750, size: 9, font: fonts.regular, color: C.white });
  page.drawText('Pies sam w domu', { x: 30, y: 680, size: 42, font: fonts.bold, color: C.ink });
  page.drawText('7 kroków do spokoju', { x: 30, y: 630, size: 30, font: fonts.bold, color: C.accent });
  page.drawText('Wprowadzenie do pracy z lękiem separacyjnym', { x: 30, y: 598, size: 13, font: fonts.regular, color: C.muted });
  page.drawRectangle({ x: 30, y: 490, width: 240, height: 85, color: C.accentLight, borderColor: C.accent, borderWidth: 1 });
  page.drawText('W tym poradniku:', { x: 42, y: 558, size: 10, font: fonts.bold, color: C.ink });
  ['Jak rozpoznać lek (nie nude)', '7 kroków stopniowego przyzwyczajania', 'Najczęstsze błędy opiekunów', 'Plan na pierwsze 14 dni'].forEach((t, i) => {
    page.drawText('- ' + t, { x: 42, y: 540 - i * 14, size: 9, font: fonts.regular, color: C.ink });
  });
  page.drawText('regulskibehawiorysta.pl', { x: 30, y: 60, size: 10, font: fonts.bold, color: C.accent });

  // Strona 2 - Nuda vs Lęk
  page = addPage(doc);
  page.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: C.white });
  header(page, fonts);
  page.drawText('Nuda czy lęk? Jak odróżnić', { x: 30, y: 790, size: 18, font: fonts.bold, color: C.ink });
  const nudaLek = [
    ['NUDA', ['Niszczenie gdy pies ma energię', 'Kradnie rzeczy i gryzie', 'Spokojny przy wyjściu', 'Wita radosnie po powrocie']],
    ['LĘK SEPARACYJNY', ['Niszczenie przy drzwiach/oknach', 'Wyje, szczeka, skowyczy', 'Niepokój przed wyjściem', 'Hiper-przywiązanie do opiekuna']],
  ];
  let y = 760;
  nudaLek.forEach(([title, items]) => {
    page.drawRectangle({ x: 30, y: y - 5, width: 250, height: 22, color: title === 'NUDA' ? rgb(0.9, 0.9, 0.9) : C.accent });
    page.drawText(title, { x: 40, y: y, size: 11, font: fonts.bold, color: title === 'NUDA' ? C.ink : C.white });
    y -= 25;
    items.forEach((item) => {
      page.drawText('- ' + item, { x: 40, y, size: 9, font: fonts.regular, color: C.ink });
      y -= 15;
    });
    y -= 15;
  });
  footer(page, fonts, 2);

  // Strony 3-4 - 7 kroków
  const steps = [
    ['Krok 1: Obserwacja bez oceniania', 'Przez 3-5 dni obserwuj bez zmieniania. Nagraj wideo przez 30 min po wyjściu. To twoj punkt startowy.'],
    ['Krok 2: Cwicz rozstania w domu', 'Wyjdź do innego pokoju. Wróć zanim pies zareaguje. Zwiększaj czas o kilka sekund dziennie.'],
    ['Krok 3: Zneutralizuj sygnały wyjścia', 'Klucze, kurtka, buty - ubieraj je losowo bez wychodzenia. Pies uczy się, że to nie = samotność.'],
    ['Krok 4: Progi nie są szczytami', 'Wychodź za drzwi na 1 sekundę. Wróć. Pies spokojny? Następnym razem 2 sekundy. Nie spiesz się.'],
    ['Krok 5: Aktywizacja przed wyjściem', '20-30 minut zabawy wechowej lub fizycznej. Zmęczony pies łatwiej odpuszcza.'],
    ['Krok 6: Bezpieczne miejsce', 'Boks / mata / pokój - nie więzienie, ale azyl. Buduj pozytywne skojarzenie przez kilka tygodni.'],
    ['Krok 7: Konsekwencja i cierpliwość', 'Postęp nie jest liniowy. Regres po weekendzie jest normalny. Kluczowa jest regularność, nie długość sesji.'],
  ];

  for (let p = 0; p < 2; p++) {
    page = addPage(doc);
    page.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: C.white });
    header(page, fonts);
    page.drawText('7 kroków stopniowego przyzwyczajania', { x: 30, y: 790, size: 15, font: fonts.bold, color: C.ink });
    y = 760;
    const chunk = steps.slice(p * 3, p * 3 + (p === 0 ? 3 : 4));
    chunk.forEach(([title, desc]) => {
      page.drawRectangle({ x: 30, y: y - 5, width: 535, height: 18, color: C.accentLight });
      page.drawText(title, { x: 38, y: y - 1, size: 10, font: fonts.bold, color: C.accent });
      y -= 22;
      const lines = wrapText(desc, 85);
      lines.forEach((line) => {
        page.drawText(line, { x: 38, y, size: 9, font: fonts.regular, color: C.ink });
        y -= 13;
      });
      y -= 12;
    });
    footer(page, fonts, p + 3);
  }

  // Strona 5 - Plan 14 dni
  page = addPage(doc);
  page.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: C.white });
  header(page, fonts);
  page.drawText('Plan na pierwsze 14 dni', { x: 30, y: 790, size: 18, font: fonts.bold, color: C.ink });
  const plan = [
    ['Dni 1-3', 'Obserwacja + nagranie. Żadnych zmian.'],
    ['Dni 4-7', 'Ćwiczenia w domu. Rozstania 1-30 sekund.'],
    ['Dni 8-10', 'Progi (1-5 minut). Neutralizuj sygnały wyjścia.'],
    ['Dni 11-14', 'Stopniowo do 15-20 minut. Oceniaj spokój, nie czas.'],
  ];
  y = 758;
  plan.forEach(([days, desc]) => {
    page.drawText(days, { x: 30, y, size: 11, font: fonts.bold, color: C.accent });
    page.drawText(desc, { x: 120, y, size: 10, font: fonts.regular, color: C.ink });
    y -= 22;
  });

  y -= 20;
  accentBox(page, 30, y - 10, 535, 80);
  page.drawText('Potrzebujesz indywidualnego planu?', { x: 40, y: y - 22, size: 12, font: fonts.bold, color: C.accent });
  page.drawText('Jeśli po 14 dniach nie widzisz poprawy - to czas na konsultację.', { x: 40, y: y - 40, size: 9, font: fonts.regular, color: C.ink });
  page.drawText('regulskibehawiorysta.pl/zapytaj', { x: 40, y: y - 58, size: 10, font: fonts.bold, color: C.accent });
  footer(page, fonts, 5);
});

// =====================================================================
// PDF 3: Pierwszy tydzień z kotem
// =====================================================================
await makePdf('pierwszy-tydzien-z-kotem.pdf', async (doc, fonts) => {
  let page = addPage(doc);
  page.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: C.bg });
  page.drawRectangle({ x: 0, y: 742, width: 595, height: 100, color: C.accent });
  page.drawText('DARMOWY PORADNIK', { x: 30, y: 820, size: 10, font: fonts.bold, color: C.white });
  page.drawText('KRZYSZTOF REGULSKI  -  COAPE / CAPBT', { x: 30, y: 750, size: 9, font: fonts.regular, color: C.white });
  page.drawText('Pierwszy tydzień', { x: 30, y: 680, size: 42, font: fonts.bold, color: C.ink });
  page.drawText('z kotem', { x: 30, y: 632, size: 42, font: fonts.bold, color: C.accent });
  page.drawText('Checklist + plan na pierwsze 7 dni', { x: 30, y: 598, size: 13, font: fonts.regular, color: C.muted });
  page.drawRectangle({ x: 30, y: 490, width: 240, height: 85, color: C.accentLight, borderColor: C.accent, borderWidth: 1 });
  page.drawText('Co znajdziesz w środku:', { x: 42, y: 558, size: 10, font: fonts.bold, color: C.ink });
  ['Lista zakupów (10 pozycji)', 'Pokój bezpieczny - jak zorganizować', 'Wprowadzenie krok po kroku', 'Drukowana checklist 7 dni'].forEach((t, i) => {
    page.drawText('- ' + t, { x: 42, y: 540 - i * 14, size: 9, font: fonts.regular, color: C.ink });
  });
  page.drawText('regulskibehawiorysta.pl', { x: 30, y: 60, size: 10, font: fonts.bold, color: C.accent });

  // Lista zakupów
  page = addPage(doc);
  page.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: C.white });
  header(page, fonts);
  page.drawText('Lista zakupów - 10 niezbędnych rzeczy', { x: 30, y: 790, size: 16, font: fonts.bold, color: C.ink });
  const zakupy = [
    ['1. Kuweta', 'Otwarta lub zamknięta. Min. 1,5x długość ciała kota.'],
    ['2. Żwirek', 'Na początek: bentonitowy, bez zapachu. Zmiana stopniowa.'],
    ['3. Drapak wysoki', 'Min. 90 cm. Stabilny. Przy miejscu do spania.'],
    ['4. Miseczki', 'Płytkie, szerokie - koty nie lubią wąsami dotykać krawędzi.'],
    ['5. Fontanna wody', 'Koty piją więcej z ruchomej wody. Zalecane.'],
    ['6. Transporter', 'Musi być zawsze dostępny - nie tylko na wizyty u wet.'],
    ['7. Legowisko', 'Ciepłe, z bokami. Kilka opcji - kot wybierze.'],
    ['8. Zabawki', 'Wędka z piórem + mysz do noszenia. Min. 2x dziennie 10-15 min.'],
    ['9. Strefa wspinaczki', 'Półki, drzewko - koty potrzebują wysokości.'],
    ['10. Feliway (opcjonalnie)', 'Redukuje stres przy przeprowadzce.'],
  ];
  let y = 760;
  zakupy.forEach(([name, desc]) => {
    page.drawText(name, { x: 30, y, size: 10, font: fonts.bold, color: C.ink });
    const lines = wrapText(desc, 78);
    lines.forEach((line, j) => {
      page.drawText(line, { x: 44, y: y - 13 - j * 12, size: 9, font: fonts.regular, color: C.muted });
    });
    y -= 13 + lines.length * 12 + 6;
  });
  footer(page, fonts, 2);

  // Plan 7 dni
  page = addPage(doc);
  page.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: C.white });
  header(page, fonts);
  page.drawText('Plan na pierwsze 7 dni', { x: 30, y: 790, size: 18, font: fonts.bold, color: C.ink });
  const planKot = [
    ['Dzień 1', 'Pokój bezpieczny. Karmienie bez nacisku. Zostaw w spokoju.'],
    ['Dni 2-3', 'Krótkie wizyty bez wymuszania kontaktu. Daj inicjatywę kotowi.'],
    ['Dni 4-5', 'Stopniowo otwierasz drzwi do reszty mieszkania.'],
    ['Dni 6-7', 'Eksploracja w swoim tempie. Zabawy wędką 2x dziennie.'],
  ];
  y = 755;
  planKot.forEach(([day, desc]) => {
    page.drawRectangle({ x: 30, y: y - 3, width: 80, height: 18, color: C.accent });
    page.drawText(day, { x: 38, y: y, size: 10, font: fonts.bold, color: C.white });
    page.drawText(desc, { x: 122, y: y, size: 9, font: fonts.regular, color: C.ink });
    y -= 28;
  });

  y -= 20;
  accentBox(page, 30, y - 10, 535, 75);
  page.drawText('Ważna zasada pierwszego tygodnia:', { x: 40, y: y - 22, size: 11, font: fonts.bold, color: C.accent });
  page.drawText('Nie przyspieszaj socjalizacji. Kot który dostał czas - łatwiej ufa.', { x: 40, y: y - 38, size: 9, font: fonts.regular, color: C.ink });
  page.drawText('Kot który byl zmuszany - może potrzebowac miesięcy.', { x: 40, y: y - 52, size: 9, font: fonts.regular, color: C.ink });
  y -= 100;
  page.drawText('Pytania? Umów spokojny pierwszy krok:', { x: 30, y, size: 11, font: fonts.bold, color: C.ink });
  page.drawText('regulskibehawiorysta.pl/zapytaj', { x: 30, y: y - 18, size: 11, font: fonts.bold, color: C.accent });
  footer(page, fonts, 3);
});

console.log('\nWszystkie PDFy gotowe w public/poradniki/');
