# Finalna bramka publikacji — 2026-07-17

Cel: potwierdzić gotowość obecnego wydania produkcyjnego przed publikacją. Każdy punkt zostaje oznaczony jako wykonany wyłącznie po zapisaniu dowodu (komenda, wynik, adres lub raport).

Wydanie kontrolowane: `119d958 fix: complete next 15 release hardening`.

## Plan podstawowy

- [x] 1. Ustalić bazę wydania: czysty Git, commit, marker buildu, deployment i możliwość rollbacku.
- [x] 2. Wykonać lokalną bramkę jakości kolejno: lint, testy, TypeScript, build oraz audyt schematu/migracji.
- [x] 3. Zweryfikować migracje i konfigurację danych bez ingerencji w produkcyjne dane klientów.
- [x] 4. Wykonać bezpieczny sandboxowy test flow: rezerwacja → płatność mock → potwierdzenie → konto → dobrowolne podpięcie Mapy.
- [x] 5. Wykonać produkcyjny test funkcjonalny publicznych tras, CTA i przejść Mapa → termin/rezerwacja.
- [x] 6. Zweryfikować prywatność i bezpieczeństwo: zgody analityczne, minimalizacja danych zdarzeń, token podpięcia profilu, brak danych w URL/logach.
- [x] 7. Zweryfikować widok desktop/mobile, dostępność, polskie znaki, brak overflow i działanie nawigacji.
- [x] 8. Zweryfikować SEO i technikalia: canonical, robots, sitemap, przekierowania, statusy HTTP i błędy runtime.
- [x] 9. Sprawdzić monitoring/logi, przygotować rollback i sporządzić końcowy raport PASS/BLOCKER.

## Dowody i odkrycia

_Wyniki będą dopisywane pod odpowiednimi punktami. Każdy nowy problem lub brakujący test zostanie dopisany na końcu tej sekcji jako kolejny punkt do wykonania._

### 1. Baza wydania — wykonano

- Git: `main...origin/main`, commit `3fdf845ea4e4db2cf096712bc253dac684efb3b2` (`feat: add private Map analytics and profile claims`). Jedyną zmianą roboczą jest ten plik planu QA.
- Produkcja: `dpl_2NLfKg9TMeCWpbPKNQn14eLqaXPB`, status `Ready`, adres wdrożenia `https://coapebehawiorysta-bha1vtayf-coapebehawiorysta-6608s-projects.vercel.app`.
- Rollback: poprzednie gotowe wdrożenia produkcyjne są zachowane w Vercel; najbliższe poprzednie to `https://coapebehawiorysta-k6ceg8wad-coapebehawiorysta-6608s-projects.vercel.app`.

### 1A. Stan produkcji po wznowieniu — 2026-07-18

- Git: `main...origin/main` wskazuje `119d958` (`fix: complete next 15 release hardening`).
- Produkcja: `dpl_AKPtCTwpK7KG3kifgYuZhgJC3hBr`, status `Ready`; aliasy obejmują `https://regulskibehawiorysta.pl` oraz `https://www.regulskibehawiorysta.pl`.
- Publiczny marker z `/mapa-sprawy`: `CLEAN_START_REPO_V1:main:119d958`.

### 2. Lokalna bramka jakości — wykonano

- `npm.cmd run lint` — PASS, 0 błędów.
- `npm.cmd run test` — PASS, 118 zaliczonych, 0 niezaliczonych, 13 pominiętych.
- `npx.cmd tsc --noEmit` — PASS.
- `npm.cmd run build` — PASS.
- `npm.cmd run schema-audit` — PASS; kanoniczny schemat i osiem wymaganych migracji rolloutu są zgodne. Dodatkowy statyczny audyt 23 plików SQL nie znalazł pustych migracji, duplikatów prefiksów, znaczników konfliktu ani NUL.
- Po naprawie zadania 15 powtórzony build przeszedł bez ostrzeżenia `patch target not found`.

### 4. Bezpieczny sandbox Mapy i rezerwacji — wykonano

- Testy modułowe Mapy — PASS: 28/28 (`case-map`, pytania, handoff, analityka).
- `npm run case-map-smoke` — PASS (`CASE_MAP_BOOKING_SMOKE_OK`): lokalny sandbox wymusza `APP_DATA_MODE=local`, `APP_PAYMENT_MODE=mock`, wyłącza e-maile i nie dotyka danych produkcyjnych.
- Smoke potwierdził pięć prywatnych zdarzeń Mapy, brak odpowiedzi/briefu/e-maila/ID rezerwacji w analityce, przekazanie skróconego briefu oraz domyślnie odznaczony zapis pełnej Mapy.

### 3. Migracje i konfiguracja danych — wykonano odczytowo

- Produkcyjny REST z rolą serwisową potwierdził `200` dla tabeli `case_map_profile_claims` wraz z kolumną `claim_token_hash`; to jest efekt migracji `20260717001` i `20260717002`.
- Produkcyjny REST potwierdził `200` dla bezpiecznego, pustego odczytu `funnel_events` z typem `case_map_started`.
- Tabela historii `supabase_migrations.schema_migrations` nie jest celowo wystawiona przez PostgREST (`406`, tylko `public` i `graphql_public` są dostępne). Nie wykonywano żadnego zapisu, testowej rezerwacji ani zapytania zmieniającego dane produkcyjne.

### 15. Guard Next revalidate — wykonano

- `scripts/patch-next-revalidate.js` rozpoznaje teraz zarówno bieżący znacznik projektu, jak i odziedziczony `__behawior15PatchedRevalidateTag`, który jest obecny w zainstalowanym runtime Next `14.2.35`.
- Bezpośrednie uruchomienie skryptu zakończyło się bez ostrzeżenia, a końcowy `npm.cmd run build` nie zgłosił już `patch target not found`.

### 16. Modal startowy strony głównej — wykonano

- Test przeglądarkowy desktop: modal pojawia się w nowej sesji, przycisk zamknięcia działa i wybór pozostaje po odświeżeniu strony.
- Test przeglądarkowy mobile: klawisz Escape zamyka modal; obraz modalowy wczytał się poprawnie (`960×640`). Zachowanie jest celowym onboardingiem wyświetlanym po około 700 ms, nie błędem renderowania.

### 17. Lokalny cache środowiska Vercel — wykonano z ograniczeniem narzędzia

- Wykonano świeży `vercel env pull` dla produkcji. CLI nie eksportuje wartości oznaczonych jako sensitive, więc brak klucza w lokalnym pliku po odświeżeniu nie jest dowodem jego braku w Vercel.
- Wartość `SUPABASE_SERVICE_ROLE_KEY` została ponownie ustawiona w środowisku produkcyjnym Vercel przez bezpieczną komendę nadpisującą. Potwierdzenie runtime zostaje warunkiem zadania 18 i nastąpi po nowym wdrożeniu.

### 19. Smoke redirect z cache-busterem — poprawka lokalna gotowa

- Wykryto, że prawidłowy redirect zachowuje techniczny parametr `__release_smoke`; wspólna walidacja sprawdza teraz status, `Location`, ten sam origin i docelową ścieżkę, bez fałszywego błędu przez cache-buster.
- `npm.cmd run live-smoke -- --url https://regulskibehawiorysta.pl --expected-branch main --expected-commit 3fdf845` — PASS; potwierdził `301` oraz `/?__release_smoke=...`.

### 20. Release checklist — poprawka lokalna gotowa

- Checklist zsynchronizowano z aktualnym `npm test` (w tym `tests/case-map-analytics.test.ts`) i przełączono na tę samą ręczną walidację redirectu co live smoke.
- `npm.cmd run release-checklist -- --base-url https://regulskibehawiorysta.pl` — PASS: 18 kontroli, 6 tras smoke, 0 błędów; raport jawnie pokazuje `PASS /behawiorysta-online-polska: redirect 301 -> /`.

### Publiczna bramka poprzedniego wydania — PASS (`c210a6a`)

- Wdrożenie Vercel: `dpl_E2n1URmpdDjczXk9dM7AWJuyUPtn` (`c210a6a`) jest przypięte do `https://regulskibehawiorysta.pl`; publiczny marker to `CLEAN_START_REPO_V1:main:c210a6a`.
- Produkcyjny `live-smoke` — PASS: 6 tras, w tym `/mapa-sprawy`, `/cennik`, legalne redirecty i wymagane treści. `release-checklist` — PASS: 18/18, 6 smoke, 0 błędów. Fallback bez JavaScriptu — PASS: 13/13.
- Pełny crawl finalnego kandydata — PASS: 97 odkrytych tras, `200=97`, `crawlFailures=0`, 0 błędów konsoli, 0 blockerów/High/Medium; 37 historycznych redirectów kończy się `200`.
- Audyt desktop/mobile — PASS: 10 kontroli na `/`, `/cennik`, `/opinie`, `/book`, `/termin?problem=szczeniak`; 0 overflow, 0 błędów konsoli/page errors, 0 uszkodzonych obrazów. Branding na `/cennik` i `/book` ma dwie poprawne linie bez łamania słowa „Behawiorysta”.
- Prywatność Mapy w świeżej publicznej sesji — PASS: `200`, canonical `https://regulskibehawiorysta.pl/mapa-sprawy`, brak bannera zgód, brak Google/GA/Meta, 0 cookies przed i po, 0 błędów konsoli/page errors.
- Technicznie — PASS: `301 /behawiorysta-online-polska -> /`, `301 /termin?problem=szczeniak -> /book?problem=szczeniak`, robots i sitemap `200`, canonical Mapy poprawny; HSTS, `frame-ancestors 'self'`, `SAMEORIGIN`, `nosniff` i polityka referrera są obecne.
- Bezpieczny runtime Supabase — PASS: odczytowy probe z celowo błędnym bearerem zwraca oczekiwane `401` z odpowiedzią sesji, co wykonuje ścieżkę konfiguracji serwera bez odczytu lub zapisu danych klienta.
- Lighthouse publiczny — PASS na pełnym systemowym Chrome i Lighthouse `13.4.0`: mobile P `0.81`, A `0.96`, BP `1`, SEO `1` (LCP `4.5 s`); desktop P `0.98`, A `1`, BP `1`, SEO `1` (LCP `1.0 s`). Lokalny harness QA usuwa raporty przed każdą próbą i nie ukrywa błędu: raport nadal kończy się FAIL, jeśli drugi przebieg nie ma kompletu kategorii albo wystąpi błąd runtime.
- Monitoring: `vercel logs ... --level error --since 1h` po kontrolach nie zwrócił błędów. Rollback: `npx.cmd vercel rollback https://coapebehawiorysta-bha1vtayf-coapebehawiorysta-6608s-projects.vercel.app --yes --scope coapebehawiorysta-6608s-projects`.

## Dodatkowe zadania wykryte w trakcie

- [x] 10. **SEO — canonical Mapy:** publiczna domena zwraca canonical `https://regulskibehawiorysta.pl/mapa-sprawy`.
- [x] 11. **SEO/redirect — `behawiorysta-online-polska`:** potwierdzono publicznie status `301` i `Location: /`, bez podążania smoke za przekierowaniem.
- [x] 12. **Wiarygodność Lighthouse:** desktop i mobile mają komplet kategorii na publicznej domenie; fail-closed pozostaje aktywny, a mobilny artefakt `NO_LCP` został obsłużony kontrolowanym retry i aktualizacją kompatybilności z zadania 28.
- [x] 13. **Higiena sandboxów QA:** dwa dokładnie zweryfikowane katalogi `case-map-booking-smoke-*` zostały bezpiecznie usunięte; nie pozostał żaden taki katalog.
- [x] 14. **Migracje produkcyjne:** odczytowo potwierdzono skutki `20260717001` i `20260717002` w zdalnym schemacie (tabela claimów i obowiązkowa kolumna hash tokenu). Wewnętrzna historia migracji nie jest publicznie wystawiona przez PostgREST.
- [x] 15. **Guard Next revalidate:** rozpoznano odziedziczony znacznik runtime i potwierdzono bezostrzeżeniowy build.
- [x] 16. **Akceptacja modalu startowego strony głównej:** zweryfikowano zamykanie, trwałość wyboru, desktop/mobile oraz obraz.
- [x] 17. **Odświeżenie lokalnego cache środowiska Vercel:** cache odświeżono; ograniczenie eksportu sensitive jest opisane, a konfiguracja została ponownie ustawiona.
- [x] 18. **Runtime Vercel dla klucza Supabase:** nowe wdrożenie `c210a6a` przeszło odczytowy probe ścieżki serwera; oczekiwane `401` nieprawidłowej sesji potwierdza działającą konfigurację runtime bez danych klienta.
- [x] 19. **Smoke redirect z cache-busterem:** uruchomiono publicznie; redirect `301` zachował techniczny parametr wyłącznie w smoke, a walidacja potwierdziła docelową ścieżkę `/`.
- [x] 20. **Release checklist — aktualność i redirect:** zsynchronizowany checklist przeszedł publicznie 18/18 i 6/6 reguł smoke.
- [x] 21. **Desktop logo — jakość składu:** audyt desktopowy `/cennik` i `/book` potwierdził dwie linie logo oraz brak dzielenia „Behawiorysta”.
- [x] 22. **Banner zgód na Mapie — kolizja UX:** świeża sesja publiczna ma 0 elementów `.consent-banner`; CTA Mapy nie jest zasłonięte na desktop/mobile.
- [x] 23. **`/pokoj` — anonimowy 401 w konsoli:** źródłem był automatyczny `fetch('/api/account/me')` bez sesji. Serwer przekazuje do klienta wyłącznie hint obecności ciasteczka sesji; nowy użytkownik nie wywołuje chronionego API, a zalogowany nadal ładuje konto. Świeży Chrome potwierdził dla `/pokoj` i `/konto`: HTTP 200, widoczne „Zaloguj się”, 0 żądań `/api/account/me` i `/api/account/case-maps`, 0 błędów konsoli/page errors.
- [x] 24. **Rezerwacja bez JavaScriptu — brak linku do terminu:** przyczyną był zbyt wczesny odczyt testu po `domcontentloaded` dla strumieniowanego widoku `/book`, a nie brak terminu ani regresja strony. Smoke czeka teraz na `networkidle`; kandydat `532bcf3` przeszedł pełny fallback 13/13 (kontakt, link terminu i formularz rezerwacji) bez JavaScriptu.
- [x] 25. **Publiczny Lighthouse mobile — niepełny pomiar LCP:** anomalia `NO_LCP` jest nieakceptowanym wynikiem strony. Lokalny harness QA usuwa artefakty przed każdą próbą i wykonuje maksymalnie jeden retry wyłącznie po braku kategorii; jeśli drugi pomiar też jest niepełny, nadal zwraca FAIL. Końcowe publiczne potwierdzenie po aktualizacji kompatybilności: P `0.81`, A `0.96`, BP `1`, SEO `1`, LCP `4.5 s`.
- [x] 26. **Powtórka Lighthouse po błędzie ładowania Chrome:** `chrome-headless-shell 147` dwukrotnie zwrócił `FAILED_DOCUMENT_REQUEST / net::ERR_ABORTED`, lecz niezależna świeża nawigacja systemowym Chrome oraz publiczny smoke miały `200` i 0 błędów konsoli. Ten błąd runtime pozostał blokujący; Lighthouse preferuje teraz pełny systemowy Chromium, gdy jest dostępny, z bezpiecznym fallbackiem do Playwright.
- [x] 27. **Post-deploy fallback rezerwacji bez JavaScriptu:** po wdrożeniu `c210a6a` `chrome-headless-shell 147` zwrócił 7 fałszywych braków formularza `POST /api/bookings` (kontakt 5/5 i link do terminu były poprawne). Niezależny publiczny HTML zawiera formularz i wszystkie pola, a ten sam smoke na pełnym Chrome przeszedł `13/13`. Smoke bez JavaScriptu preferuje teraz pełny systemowy Chromium, gdy jest dostępny, z fallbackiem do Playwright; wynik końcowy `13/13` bez ręcznej zmiennej środowiskowej jest wymaganym dowodem.
- [x] 28. **Końcowy Lighthouse mobile — powtarzalny `NO_LCP`:** niezależny `PerformanceObserver` w pełnym Chrome wykazał prawidłowe LCP H1 około `0.87 s`, więc nie był to brak realnego renderu strony. Przyczyną była kompatybilność Lighthouse `13.1.0` z Chrome `150`; izolowany i repozytoryjny test na Lighthouse `13.4.0` zwrócił pełne kategorie bez zwiększania retry (mobile P `0.81`, A `0.96`, BP `1`, SEO `1`, LCP `4.5 s`; desktop P `0.98`, A `1`, BP `1`, SEO `1`, LCP `1.0 s`). Zależność QA została zaktualizowana do `^13.4.0`.
- [x] 29. **Audyt zależności runtime:** zaktualizowano `next` do `15.5.20`, `nodemailer` do `9.0.3` oraz przechodni `postcss` do `8.5.12`; końcowy `npm audit --omit=dev --json` ma `0` wszystkich podatności.
- [x] 30. **Migracja linta przed Next 16:** `npx eslint . --no-cache` przeszedł bez błędów. Skrypty `lint` i `build` używają teraz natywnego ESLint CLI z trybem bez cache, więc bramka nie wywołuje zdeprecjonowanego `next lint`.
- [x] 31. **Migracja API requestu Next 15:** wszystkie wskazane `headers()`/`cookies()` są awaitowane; końcowe TypeScript i build przeszły.
- [x] 32. **Pełny audyt zależności deweloperskich:** bezpieczne aktualizacje usunęły wszystkie high/critical (`0`); pozostało `17 moderate` i `1 low` wyłącznie tranzytywnie pod `lighthouse@13.4.0` (QA/dev). NPM proponuje wyłącznie łamiący downgrade do `lighthouse@12.6.1`, więc nie cofnięto wymaganej kompatybilności z Chrome; runtime ma `0`.
- [x] 33. **Migracja dynamicznych `params` Next 15:** oficjalny codemod `next-async-request-api` przeprowadził 46 plików, a TypeScript i build potwierdziły awaitowane `params`/`searchParams`.
- [x] 34. **Konfiguracja Next 15:** `typedRoutes` oraz `outputFileTracingIncludes` przeniesiono na wspierany poziom konfiguracji; build nie zgłasza już ostrzeżenia konfiguracji.
- [x] 35. **Guard patcha runtime Next:** patch dla Next 14 był martwy po aktualizacji i został usunięty wraz z `prebuild`; build nie zgłasza już ostrzeżenia celu patcha.
- [x] 36. **Stabilność lokalnego UI smoke dla redirectów:** cele `/koty` i `/psy` oraz kolejność oczekiwania URL są aktualne; pełny E2E przeszedł.
- [x] 37. **Aktualność selektora opinii w UI smoke:** selector używa bieżącego H1, a regresja testowa jest zielona.
- [x] 38. **Aktualność selektora blogu w UI smoke:** selector używa bieżącego H1, a regresja testowa jest zielona.
- [x] 39. **Aktualność przejścia terminu w UI smoke:** E2E sprawdza formularz inline `/book` i ukryty `slotId`; pełny flow przeszedł.
- [x] 40. **Aktualność oczekiwania pokoju rozmowy w UI smoke:** zdiagnozowano prawdziwy wariant telefoniczny i rozdzielono go od stanów wideo; kontrola dostępu pozostała pełna.
- [x] 41. **Retry lokalnego startu UI smoke:** kontrolowany timeout `page.goto` jest retryable tylko w ramach dwóch prób.
- [x] 42. **Higiena procesów lokalnego UI smoke:** harness zamyka teraz całe drzewo własnego serwera; po końcowym E2E nie ma osieroconych procesów repo.
- [x] 43. **Diagnostyka stanu pokoju w UI smoke:** źródłem rozjazdu był poprawny panel telefoniczny bez `.room-stage`; test weryfikuje jego komunikat, status i brak iframe.
- [x] 44. **Pełne pokrycie wariantów pokoju konsultacji w UI smoke:** telefon, zablokowane wideo i aktywne wideo są sprawdzane wraz z Jitsi, licznikiem, zakończeniem i ponownym wejściem.
- [x] 45. **Zgodny z terminarzem slot pełnej konsultacji w UI smoke:** używany jest przyszły slot `08:15` z kanonicznego seeda harmonogramu.
- [x] 46. **Czas pokoju pełnej konsultacji w UI smoke:** długość jest pobierana z `getBookingServiceRoomDurationMinutes`; E2E potwierdził ruch licznika `120:00 → 119:57`.
- [x] 47. **Jednoznaczny selektor stanu zakończonego pokoju:** asercja obsługuje równoległy przycisk i status końcowy bez strict-mode.
- [x] 48. **Atomowy zapis lokalnego sandboxu:** tymczasowe ścieżki używają `randomUUID`, z regresją w testach.
- [x] 49. **Odczyt lokalnego sandboxu bez zbędnego zapisu:** `readStore()` zapisuje wyłącznie po rzeczywistej zmianie normalizacyjnej; powtórzony sandbox Mapy przeszedł `CASE_MAP_BOOKING_SMOKE_OK` bez `EPERM`.
- [x] 50. **Ostrzeżenie builda Edge:** porównanie z `HEAD` potwierdza, że dotyczy wyłącznie dziewięciu istniejących generatorów Open Graph z `runtime = 'edge'`; nie jest regresją tej migracji, a build produkcyjny jest poprawny.
- [x] 51. **Lokalny smoke produkcyjny:** serwer `next start` potwierdził trasy `/`, `/mapa-sprawy`, `/book`, redirect i fallback bez JS `13/13`; release smoke przeszedł na celowym lokalnym markerze `CLEAN_START_REPO_V1:local:local`.
- [x] 52. **Runtime Supabase Auth po deployu:** dla produkcyjnego `119d958` odczytowy probe `GET /api/account/me` z celowo błędnym bearerem zwrócił oczekiwane `401` z komunikatem o niepoprawnej sesji, bez `500` ani błędu konfiguracji. `vercel logs --level error --since 1h` nie zwrócił błędów. Nie utworzono rezerwacji ani nie wysłano e-maila.
- [x] 53. **Celowe wyłączenie linta wewnątrz `next build`:** komunikat `Linting is disabled` pochodzi z zamierzonego `next build --no-lint`; natywny `npm run lint` zawsze wykonuje się wcześniej i końcowo przeszedł bez błędów.

### Bramka lokalnego kandydata — PASS

- `npx tsc --noEmit` — PASS.
- `npm run test` — PASS: 122 zaliczonych, 0 niezaliczonych, 13 pominiętych.
- `npm run lint`, `npm run schema-audit`, `npm run case-map-smoke`, `npm run ui-smoke`, `npm run build` — PASS.
- UI E2E potwierdził flow płatności ręcznej, oba warianty pokoju i końcowe sprzątanie procesów.
- `npm audit --omit=dev --json` — 0/0; pełny audit ma wyłącznie opisany w zadaniu 32 dev-only pozostały poziom moderate/low, bez high/critical.

### Zadania wykryte w trakcie weryfikacji publicznej

- [x] 54. **Aktualność kontraktu release checklist po migracji linta:** statyczne oczekiwania zsynchronizowano z `eslint . --no-cache` oraz `npm run lint && next build --no-lint`; publiczny checklist przeszedł ponownie 18/18 i smoke 6/6.
- [x] 55. **Domknięcie pełnego crawla publicznego:** pełny przebieg z domyślnym oczekiwaniem `networkidle` po 15 s na każdy wariant strony przekroczył zewnętrzny limit 20 minut bez raportu. Crawl renderuje teraz desktop i mobile równolegle, wykonuje konfigurowalne krótkie oczekiwanie po `domcontentloaded` oraz screenshot viewportu (pełna strona pozostaje opcją QA). Końcowy publiczny raport przeszedł w 384 s: 98 tras, 200=98, 0 awarii, 0 błędów konsoli i 0 overflowu.
- [x] 56. **Tytuł po redirectcie `/slot → /book`:** niezależny HTML i stabilna nawigacja Chrome potwierdziły poprawny tytuł `Rezerwacja Kwadransa behawioralnego | Regulski Behawiorysta`; crawler czeka teraz na ponowne ustawienie `document.title` wyłącznie, gdy redirect chwilowo je wyczyści. Końcowy crawl nie ma już medium findingów.
- [x] 57. **Świeża sesja prywatności Mapy:** pierwsza asercja QA błędnie zakładała, że na ekranie startowym są naraz dwa CTA; zgodny z flow widok startowy ma widoczną `Szybką mapę`, a `Pełniejsza mapa` występuje później w ścieżce. Desktop i mobile potwierdziły: HTTP 200, widoczna Szybka mapa, 0 bannerów zgód, 0 żądań GA/GTM/Meta i 0 overflowu.
- [x] 58. **Rzeczywista gotowość warstwy danych po deployu:** lokalny snapshot `live-readiness` był fałszywie negatywny, ponieważ Vercel nie eksportuje wartości sensitive. Produkcyjny endpoint Auth przechodzi przez `getSupabaseServerConfig()` i zwrócił domenowy `401` niepoprawnej sesji, a nie błąd brakującej konfiguracji; potwierdzono też nazwę `SUPABASE_SERVICE_ROLE_KEY` w środowisku Vercel oraz brak błędów runtime. Endpoint `/api/availability` nie był wywoływany, ponieważ jego jedyna metoda `POST` tworzy slot; zachowano brak zapisu danych klienta.

### Bramka końcowa po wznowieniu — PASS techniczny

- Lokalnie po wznowieniu: `npm run lint`, `npx tsc --noEmit`, `npm run test` (122/0/13), `npm run schema-audit` i `npm run build` — PASS.
- Publicznie po wznowieniu: release checklist — PASS, 18 kontroli i 6 tras smoke; świeży pełny crawl — PASS w 369,7 s: 98 tras, `200=98`, 0 awarii, 0 blockerów/High/Medium i 0 overflowu.
- Zakres PASS nie obejmuje celowej, rzeczywistej rezerwacji produkcyjnej ani wysyłki e-maila; takie działanie wymagałoby osobnej zgody i sprzątania danych QA.
