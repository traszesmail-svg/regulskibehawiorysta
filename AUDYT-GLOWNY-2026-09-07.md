# Audyt główny — `Zapytaj behawiorystę`

Data: 2026-09-07  
Zakres: aktualny working tree projektu `C:\projekt\regulskibehawiorysta` oraz publiczna domena `https://regulskibehawiorysta.pl`  
Plan odniesienia: [PLAN-GLOWNY.md](PLAN-GLOWNY.md)  
Wynik: **PASS z ograniczeniami / GO tylko dla zwykłego `Zapytaj`**

## 1. Wniosek

Zweryfikowanym planem nadrzędnym jest `PLAN-GLOWNY.md`, a główną usługą jest `Zapytaj behawiorystę — 15 min`, nie wcześniejszy plan „Kwadrans na już” oparty na własnej karcie SIM. Aktualny kod, publiczne copy, ceny i testy są ustawione wokół:

- zwykłego terminu telefonicznego za 79 zł;
- `Zapytaj teraz` za 104 zł tylko przy realnym live;
- ręcznego BLIK-a i ręcznego potwierdzenia;
- pełnej konsultacji jako osobnej ścieżki po decyzji behawiorysty.

Produkcja nie udaje dostępności live: API zwraca `live: offline`, 24 zwykłe terminy, blokadę 5 minut i limit ręcznego potwierdzenia 24 godziny. To jest zgodne z planem i bezpieczniejsze niż oznaczenie nieprzetestowanego telefonu jako gotowego.

## 2. Dowody wykonawcze

| Kontrola | Wynik | Dowód |
|---|---|---|
| Testy projektu | PASS | `npm test`: 192 testy, 179 zaliczonych, 0 błędów, 13 pominiętych |
| Lint | PASS | `npm run lint` oraz lint uruchamiany przez build |
| Build | PASS | `npm run build`, Next.js wygenerował 93 strony |
| Schema Supabase | PASS | `npm run schema-audit`, kanoniczny schemat i wymagane migracje są zgodne |
| Zależności runtime | PASS | `npm audit --omit=dev --audit-level=moderate`: 0 podatności |
| Go-live readiness | PASS | `npm run live-readiness -- --report-only`: 5/5 gotowe, 0 blokad |
| Lokalny pełny crawl | PASS | 79 adresów, 79 odpowiedzi HTTP 200, 0 błędów crawl, brak automatycznych high/medium |
| Produkcyjny pełny crawl | PASS | 90 adresów, 90 odpowiedzi HTTP 200, 0 błędów crawl, brak automatycznych high/medium |
| Produkcyjny Stage 9 | PASS | 16 kontroli desktop/mobile, 0 failures, 0 warnings |
| Renderowanie | PASS | `/`, `/zapytaj`, `/konsultacja`, `/terapia`, `/opinie`, `/cennik`, `/mapa-sprawy`, `/blog`; brak poziomego overflow i błędów konsoli |

Raporty maszynowe pozostają w ignorowanym katalogu `qa-reports/`, w tym `qa-reports/stage9-performance-audit/report.md` oraz raporty crawl’a z 2026-09-07.

## 3. Odniesienie do planu głównego

### Oferta i ścieżka główna — PASS

Publiczne `/zapytaj` odpowiada HTTP 200, pokazuje `Zapytaj behawiorystę`, zwykły termin, cenę 79 zł i formularz. Strona główna ma tę usługę jako główny pierwszy krok. `/cennik` działa jako aktualna powierzchnia oferty, a stare wejścia są kierowane do obecnych adresów.

Źródła: `app/zapytaj/page.tsx`, `components/ZapytajIntakeForm.tsx`, `lib/offers.ts`, testy `public-surface-regressions` i `public-menu-parity`.

### Płatność, blokada i statusy — PASS w zakresie testów — brak dowodu realnej wpłaty

Testy potwierdzają zwykły termin za 79 zł, pięciominutową blokadę, stan `pending_manual_payment`, ręczne przejście do `confirmed:paid`, idempotencję ponownego potwierdzenia oraz ręczny fallback. Produkcyjny tryb płatności pozostaje ręczny.

Nie wykonano prawdziwego przelewu/BLIK-a ani potwierdzenia z rzeczywistego konta. Dlatego audyt nie oznacza realnej płatności jako zweryfikowanej.

Źródła: `lib/server/manual-payments.ts`, `app/api/payments/manual/route.ts`, testy `commerce-payment-security`, `booking-api-errors`, `zapytaj-call-flow`.

### Live i Zadarma — NO-GO dla uruchomienia live

Produkcja zwraca:

```text
live.status = offline
live.livePricePln = 104
live.liveSlotId = null
storageAvailable = true
slots = 24
holdMinutes = 5
manualConfirmationHours = 24
```

To poprawny stan ochronny. Nie wykonano prawdziwego telefonu Zadarma, pomiaru opóźnienia, limitu 17 minut, retry ani pełnego ręcznego fallbacku na numerze produkcyjnym. Testy lokalne sprawdzają logikę i symulowane odpowiedzi, ale nie zastępują testu z realnym numerem.

### Mapa bezpieczeństwa — PASS

Mapa ma dwie jawne kwestie bezpieczeństwa przed wynikiem i ścieżką płatnej usługi. Testy potwierdzają, że ryzyko człowieka, uraz/nagłe pogorszenie zdrowia oraz niepewność zdrowotna nie są przykrywane zwykłą rekomendacją `Zapytaj`.

Źródła: `app/mapa-sprawy/page.tsx`, `components/ShortBehaviorMapFlow.tsx`, `lib/case-map.ts`, `lib/case-map-questions.ts`, testy `case-map*`.

### Pokój, pytania i rekomendacje — PASS w zakresie kodu i testów

Dostęp do podsumowania i dokładnie dwóch pytań pojawia się dopiero po zakończeniu rozmowy i publikacji podsumowania; ważność pytań wynosi 7 dni. Pełna konsultacja i terapia mają odrębne warunki dostępu. WhatsApp nie tworzy martwego CTA przy pustej albo niebezpiecznej konfiguracji.

### Stare adresy, SEO i publiczne widoki — PASS z oczekiwanymi redirectami

Pełny lokalny crawl znalazł 79 adresów i wszystkie zakończyły się HTTP 200. Niezależny pełny crawl produkcji znalazł 90 adresów i również zakończył się wynikiem 90/90 HTTP 200 oraz 0 błędów crawl. Redirecty dotyczą oczyszczonych wejść, m.in. `/slot`, `/form`, `/book`, `/cennik`, `/cennik/pelny`, `/psy`, `/koty` i starych pakietów materiałów. Nie wykryto błędów konsoli, błędów strony, anomalii kodowania, publicznego telefonu ani poziomego overflow.

Na lokalnym serwerze `/slot` i `/form` wskazują host `localhost`, ponieważ lokalny `NEXT_PUBLIC_APP_URL` ma tę wartość. Nie jest to błąd produkcji, gdzie adres kanoniczny to `https://regulskibehawiorysta.pl`, ale warto ujednolicić konfigurację lokalną przed testami linków zwrotnych.

### Mobile i desktop — PASS

Produkcyjny Stage 9 obejmujący 8 kluczowych tras na dwóch viewportach dał 16/16 kontroli, 0 błędów konsoli, 0 błędów strony, 0 uszkodzonych obrazów oraz 0 px poziomego overflow. Ręcznie obejrzane renderingi `/zapytaj` desktop/mobile i Mapy mobile potwierdziły czytelny hero, cenę, formularz, stan dostępności i kolejność bramki bezpieczeństwa.

## 4. Otwarte ograniczenia

1. `npx tsc --noEmit` zgłasza trzy błędy typów wyłącznie w testach: `tests/case-map-icons.test.ts:81` oraz `tests/zapytaj-call-flow.test.ts:90,105`. Build produkcyjny przechodzi, bo te testy nie są częścią kompilowanego grafu aplikacji; nie należy jednak nazywać pełnego TypeScript clean, dopóki błędy nie zostaną poprawione.
2. Nie zweryfikowano prawdziwej płatności, telefonu Zadarma, limitu 17 minut, retry ani automatycznego live.
3. Automatyczne potwierdzanie z prywatnego Revoluta nie jest wdrożone i nie jest warunkiem pilota zwykłego `Zapytaj`.
4. `NEXT_PUBLIC_WHATSAPP_SUPPORT_URL` pozostaje pusty na produkcji; przygotowana jest walidacja, ale nie oznacza to uruchomienia kanału WhatsApp.

## 5. Decyzja po audycie

**GO:** ograniczony pilot zwykłego `Zapytaj behawiorystę` za 79 zł, z ręcznym BLIK-iem i ręcznym potwierdzeniem.  
**NO-GO:** `Zapytaj teraz`, publiczna obietnica live, automatyczny Revolut i uznanie telefonu Zadarma za zweryfikowany — do czasu osobnych testów.

Nie zmieniano kodu aplikacji podczas tego audytu. Uporządkowano wyłącznie dokumentację: ten raport oraz [PLAN-GLOWNY.md](PLAN-GLOWNY.md) są jedynymi aktualnymi dokumentami planu/audytu projektu w głównym katalogu.
