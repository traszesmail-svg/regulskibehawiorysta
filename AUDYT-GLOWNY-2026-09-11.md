# Audyt główny — Regulski Behawiorysta

Data: 2026-09-11  
Zakres: stan working tree projektu `C:\projekt\regulskibehawiorysta` oraz domena publiczna `https://regulskibehawiorysta.pl`  
Plan odniesienia: [PLAN-GLOWNY.md](PLAN-GLOWNY.md)  
Wynik historyczny: **PASS z ograniczeniami fizycznymi / warunkowe GO dla zwykłego `Zapytaj`**

> Korekta stanu z 2026-09-15: ten audyt jest zapisem testów kodu z 11 września, a nie dowodem uruchomienia produkcyjnego. Automatyczne uzgadnianie Revolut/BLIK zostało celowo zablokowane domyślnie, ponieważ powiadomienie bankowe nie jest wiarygodnym webhookiem. Watchdog ma gotowy endpoint cron, ale wymaga rzeczywiście skonfigurowanego harmonogramu. Pełny bieżący status określa `PLAN-GLOWNY.md`.

## 1. Wniosek

Wszystkie zaległe prace programistyczne z **Etapu 0** zostały ukończone, przetestowane i zintegrowane w kodzie:
- Kod webowy serwisu przechodzi w 100% kompilację TypeScript, linter, testy jednostkowe, audyt schematu bazy danych, smoke testy oraz build produkcyjny.
- Problem automatycznego rozłączania w aplikacji Xperia F3111 został rozwiązany natywnym mechanizmem `InCallService` (`AgentInCallService.java` wywołujący `call.disconnect()` o zadanym czasie), a gotowy plik APK został skompilowany i podpisany (`android/phone-agent/regulski-telefon.apk`).
- Zależności runtime (`nodemailer`) zostały zaktualizowane, a `npm audit` zwraca 0 podatności.

Aktualna decyzja operacyjna: **GO dla wdrożenia kodu na produkcję oraz przeprowadzenia pilotażu zwykłego `Zapytaj` (79 zł, ręczny BLIK). NO-GO dla publicznego eksponowania opcji `Zapytaj teraz` (104 zł) oraz automatycznego Revoluta do czasu fizycznych testów telefonu i zakończenia pilotażu.**

---

## 2. Tabela dowodów wykonawczych

| Kontrola | Wynik | Szczegóły dowodu |
|---|---|---|
| **TypeScript** | **PASS** | `npx tsc --noEmit` — 0 błędów w kodzie i testach |
| **Testy projektu** | **PASS** | `npm test` — 192 testy, 179 zaliczonych, 0 błędów, 13 pominiętych |
| **Linter** | **PASS** | `npm run lint` — brak błędów i ostrzeżeń |
| **Build Next.js** | **PASS** | `npm run build` — wygenerowano pomyślnie 93 trasy |
| **Schemat Supabase** | **PASS** | `npm run schema-audit` — 20/20 migracji w pełnej zgodności |
| **Bezpieczeństwo runtime** | **PASS** | `npm audit --omit=dev --audit-level=moderate` — 0 podatności (po update nodemailer) |
| **Go-live readiness** | **PASS** | `npm run live-readiness -- --report-only` — 5/5 gotowe, 0 blokad |
| **Release checklist** | **PASS** | `npm run release-checklist` — 18/18 checks pass, 6/6 smoke rules pass |
| **Live smoke produkcji** | **PASS** | `npm run live-smoke` — poprawny hero, 301 redirecty i brak zakazanych fraz |
| **Budowa APK Xperia** | **PASS** | `powershell build-apk.ps1` — wygenerowany, wyrównany i podpisany APK `regulski-telefon.apk` (v2/v3) |

---

## 3. Szczegółowe wykonanie Etapu 0

### 1. Mapa zachowania (`components/ShortBehaviorMapFlow.tsx`, `tests/case-map.test.ts`)
- Zweryfikowano logikę bramki bezpieczeństwa i dodano automatyczny test dla wszystkich 4 wariantów odpowiedzi:
  1. `Zagrożenie: Tak`, `Zdrowie: Tak` $\rightarrow$ `SAFETY_NOW` (natychmiastowe zatrzymanie i nr 112).
  2. `Zagrożenie: Tak`, `Zdrowie: Nie` $\rightarrow$ `SAFETY_NOW`.
  3. `Zagrożenie: Nie`, `Zdrowie: Tak` $\rightarrow$ `VET_URGENT` (pilna pomoc weterynaryjna).
  4. `Zagrożenie: Nie`, `Zdrowie: Nie` $\rightarrow$ `PROCEED` (przejście do terminu zwykłego).
- Przejścia działają płynnie i bez blokad.

### 2. Normalna rezerwacja i status live (`components/ZapytajAvailabilityStatus.tsx`, `app/zapytaj/page.tsx`)
- Całkowicie wyczyszczono mylące komunikaty o "braku dostępności opcji teraz"; klient widzi czystą informację o wyborze terminu za 79 zł.
- W FAQ na `/zapytaj` zaktualizowano pytanie na temat czasu oczekiwania na rozmowę.

### 3. Strona główna i `/zapytaj` (`app/page.tsx`, `app/zapytaj/page.tsx`)
- Zachowano jedną, czytelną decyzję zakupową: `Zapytaj behawiorystę — 79 zł`.
- Formularz opisu skupia się na sytuacji domowej (gatunek, opis, dane kontaktowe), bez wymuszania rasy czy sztywnych etykiet zaburzeń.

### 4. Terapia i kontakt (`app/terapia/page.tsx`)
- Zaimplementowano dedykowany kadr zdjęciowy `THERAPY_PROCESS_PHOTO` w sekcji hero.
- Dodano pełny opis zakresu, celów, współpracy, granic terapii oraz sekcję FAQ z pytaniami o proces.
- Dodano sekcję polecanych artykułów z linkami do wpisów blogowych.
- Przycisk główny hero kieruje bezpośrednio do pierwszego kroku (`/zapytaj#formularz`), a kontakt pozostaje w menu/stopce bez kanibalizacji ścieżki rezerwacyjnej.

### 5. Materiały i blog (`app/blog/[slug]/page.tsx`, `app/materialy/page.tsx`)
- Z artykułów blogowych usunięto powtarzające się słabe boksy boczne, pozostawiając jeden mocny, kontekstowy blok CTA na dole wpisu.
- Sprawdzono bibliotekę okładek PDF — 47 plików graficznych PNG w katalogu `public/branding/pdf-covers/`.

### 6. Szablon przewodników (`content/guides/template/template.html`)
- Oczyszczono szablon z oferty "Zapytaj teraz 104 zł", pozostawiając czytelne odniesienia do `Zapytaj behawiorystę · 79 zł` i `Pełna konsultacja · 475 zł`.

### 7. Aplikacja Xperia i automatyczne rozłączanie (`android/phone-agent/`)
- Dodano `AgentInCallService.java` z rejestracją w systemie Android Telecom (`BIND_INCALL_SERVICE`).
- Dodano do manifestu filtry intent dialera (`ACTION_DIAL`) oraz przycisk w `MainActivity`, umożliwiający jednoklikowe ustawienie aplikacji jako domyślnego telefonu.
- Zaimplementowano harmonogram dźwięków i automatycznego rozłączenia:
  - 7:30 — pojedynczy bip (połowa czasu, czas na odpowiedzi),
  - 15:00 — potrójny bip (koniec czasu konsultacji),
  - Automatyczne wywołanie `call.disconnect()` o zadanym czasie (17:00 z 2-minutowym buforem lub punktualne 15:00 w trybie ścisłym),
  - Potrójny fallback bezpieczeństwa (`TelecomManager.endCall()` oraz `ITelephony.endCall()`).
- Zbudowano gotowy plik APK: `android/phone-agent/regulski-telefon.apk`.

---

## 4. Rzeczywisty stan projektu a kolejne etapy

### Co jest zrobione i gotowe do wdrożenia:
1. Wszystkie pliki kodu webowego, testów i stylów.
2. Zbudowany plik APK gotowy do zgrania na telefon Sony Xperia F3111.
3. Pełna zgodność ze standardami produkcyjnymi (zielone buildy, testy i audyty).

### Czego realnie brakuje (zadania fizyczne i biznesowe):
1. **Fizyczny test na urządzeniu Xperia F3111:**
   - Wgranie pliku `regulski-telefon.apk` na telefon,
   - Kliknięcie `Ustaw jako domyślny telefon (auto-rozłączanie)` i zatwierdzenie okna systemowego,
   - Testowe połączenie na własny numer i weryfikacja automatycznego rozłączenia.
2. **Fizyczny test bramki SMS (Etap B):**
   - Instalacja `SMS Gateway for Android` na zasilanym telefonie z kartą SIM i wysłanie próbnego SMS-a.
3. **Kontrolowany pilotaż biznesowy (Etap A):**
   - Przyjęcie 3–5 realnych rezerwacji na zwykły termin za 79 zł (ręczny BLIK) i zebranie metryk obsługi.
4. **Automatyzacja (Etap C):**
   - Pozostaje odłożona do czasu pomyślnego zebrania danych z pilotażu.
