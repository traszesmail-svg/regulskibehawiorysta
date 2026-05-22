# Raport główny audytu - 2026-05-21

Status: **NO-GO przed poprawkami**. Ten raport jest kontrolny. Naprawy nie zostały rozpoczęte.

## Porządek w raportach

Stare i przejściowe raporty zostały usunięte z `qa-reports`. Aktualny zestaw jest w:

- `qa-reports/AKTUALNY-AUDYT-2026-05-21/`
- `qa-reports/AKTUALNY-AUDYT-2026-05-21/evidence/`

## Zakres audytu

- Live: `https://regulskibehawiorysta.pl`
- Treść i logika: 75 tras, w tym 24 artykuły.
- Typografia i odstępy: 68 tras x 3 viewporty = 204 próbki.
- Viewporty typografii: desktop 1365 px, mobile 390 px, mobile 320 px.
- Rygor typografii: pełne ładowanie stron, media nieblokowane, oczekiwanie na `document.fonts.ready`.
- Rezerwacje: 30 rezerwacji w lokalnym sandboxie, bez produkcyjnych maili/SMS/płatności.

## Krytyczne ustalenia

### 1. `Kwadrans na już` zapisuje 69 zł zamiast 99 zł

Test 30 rezerwacji technicznie przeszedł: 30/30 utworzonych, 30/30 zapisanych, 30/30 potwierdzonych/opłaconych w sandboxie.

Blokada: 8/8 rezerwacji `kwadrans-na-juz` dostało `69 zł`, a powinno `99 zł`.

Dowód:

- `evidence/mass-30-bookings.json`
- Status testu: `FAIL_PRICE_MISMATCH`

Prawdopodobne źródło:

- `lib/funnel.ts` ma `kwadrans-na-juz` jako `priceAmount: 99`.
- `lib/booking-services.ts` zwraca `quickConsultationPrice` dla wszystkiego poza 30 min i pełną konsultacją, więc pilny kwadrans wpada w cenę zwykłego kwadransa.

### 2. Braki polskich znaków w aplikacji/konto/pokój

Do poprawy:

- `/login`
- `/konto`
- `/pokoj`
- `/dostep`
- `/materialy/pobranie`
- komunikat Basic Auth w adminie/internal: `Dostep do panelu specjalisty wymaga autoryzacji.`

Źródła najbliżej problemów:

- `app/login/page.tsx`
- `components/AccountAuthForm.tsx`
- `components/AccountRoomApp.tsx`
- `app/dostep/page.tsx`
- `app/pokoj/page.tsx`
- `middleware.ts`

### 3. Mobile: realne błędy wizualne

- `/opinie`, 320 px: biały CTA w sekcji `Twoja historia może pomóc innym` wygląda jak puste pole bez widocznego tekstu.
- `/kontakt`, 320 px: `kontakt@regulskibehawiorysta.pl` wychodzi poza fallback formularza.
- `/checkout` i `/payment`, 320 px: `Do ustalenia` łamie się jako `Do ustaleni a`.

Dowody:

- `evidence/opinie-iphone-se-320.png`
- `evidence/kontakt-iphone-se-320.png`
- `evidence/checkout-iphone-se-320.png`
- `evidence/payment-iphone-se-320.png`

## Wynik dodatkowego audytu typografii i odstępów

### Cennik

Podejrzenie, że `cennik` ma inne czcionki, jest częściowo trafne wizualnie, ale technicznie H1 używa tej samej rodziny co większość strony: `Fraunces`.

Różnica bierze się z:

- zielonego koloru nagłówka zamiast ciemniejszego/neutralnego tonu z części strony,
- innej skali mobile: `/cennik` ma H1 `34 px` na 320 px, strona główna ma `45 px`,
- innego układu hero i kart ofertowych,
- bardziej „panelowego” rytmu odstępów.

Próbki:

- `/`: H1 desktop `60.1 px`, mobile 320 `45 px`, `Fraunces`.
- `/cennik`: H1 desktop `58 px`, mobile 320 `34 px`, `Fraunces`.
- `/cennik/pelny`: H1 desktop `62.8 px`, mobile 320 `45 px`, `Fraunces`.

Wniosek: `/cennik` nie ma innej rodziny fontu, ale wymaga ujednolicenia skali i rytmu z resztą głównych stron.

### Prawdziwe odchylenia typograficzne

- `/materialy`, `/niezbednik`, `/przybornik`, `/zamow-pdf`: H1 używa `Inter`, podczas gdy dominujący H1 strony używa `Fraunces`. To realny drift po stronie materiałów/PDF.
- `/opinie/dodaj`: H1 ma `24 px` na desktopie i `sans-serif`, czyli jest za mały i poza systemem nagłówków.
- `/format-konsultacji`: H1 ma `34 px` desktop i `30 px` mobile. To wygląda jak osobny tryb aplikacyjny/wizard; akceptowalne tylko jeśli świadomie traktujemy to jako narzędzie, nie pełną stronę marketingową.
- Strony prawne mają bardzo duże H1 około `73.7 px` desktop. Nie jest to błąd techniczny, ale odstaje od spokojniejszej skali treści formalnych.
- `/kontakt` ma H1 `78 px` desktop. Jest czytelny, ale należy go sprawdzić przy porządkowaniu globalnej skali, bo jest najwyższy w zestawie.

### Co nie jest realnym błędem

- Duża liczba alertów `section-overlap-gap` wynika z tego, że automat liczy zagnieżdżone sekcje i karty jako sekcje równorzędne. Ręczne screeny `/`, `/cennik`, `/cennik/pelny`, `/format-konsultacji` nie pokazują globalnego zapadania się layoutu.
- `/sitemap-0.xml` został złapany przez automat jako trasa, ale to XML, nie strona użytkownika. Nie traktuję go jako błąd UX.
- Artykuły blogowe mają spójną skalę H1: około `32 px` desktop i `31-32 px` mobile.

## Ceny

Nie znalazłem w aktualnym publicznym kodzie starych cen `109` ani `349`.

Spójne publicznie:

- Kwadrans: `69 zł`
- Kwadrans na już: `99 zł`
- Dwa kwadranse: `169 zł`
- Pełna konsultacja: `470 zł`

Niespójność jest w logice zapisu rezerwacji dla `kwadrans-na-juz`, nie w większości publicznego copy.

## Artefakty

- Główny raport: `RAPORT-GLOWNY.md`
- Plan napraw i kontroli: `PLAN-NAPRAW-I-KONTROLI-2026-05-21.md`
- Dowody graficzne: `evidence/*.png`
- Test 30 rezerwacji: `evidence/mass-30-bookings.json`
- Pełny JSON audytu treści: `evidence/content-full-audit.json`
- Surowe wyniki typografii: `raw/typografia/*.json`

