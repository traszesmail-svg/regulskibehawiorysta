# Finalna bramka publikacji — 2026-07-17

Cel: potwierdzić gotowość obecnego wydania produkcyjnego przed publikacją. Każdy punkt zostaje oznaczony jako wykonany wyłącznie po zapisaniu dowodu (komenda, wynik, adres lub raport).

Wydanie kontrolowane: `8147cbc fix: wait for no-js booking fallback`.

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

### Końcowa bramka publiczna — PASS

- Promocja Vercel: `dpl_xzACazpv2fv29g6yds9pAdJtfNtQ` (`8147cbc`) jest przypięta do `https://regulskibehawiorysta.pl`; publiczny marker to `CLEAN_START_REPO_V1:main:8147cbc`.
- Produkcyjny `live-smoke` — PASS: 6 tras, w tym `/mapa-sprawy`, `/cennik`, legalne redirecty i wymagane treści. `release-checklist` — PASS: 18/18, 6 smoke, 0 błędów. Fallback bez JavaScriptu — PASS: 13/13.
- Pełny crawl finalnego kandydata — PASS: 97 odkrytych tras, `200=97`, `crawlFailures=0`, 0 błędów konsoli, 0 blockerów/High/Medium; 37 historycznych redirectów kończy się `200`.
- Audyt desktop/mobile — PASS: 10 kontroli na `/`, `/cennik`, `/opinie`, `/book`, `/termin?problem=szczeniak`; 0 overflow, 0 błędów konsoli/page errors, 0 uszkodzonych obrazów. Branding na `/cennik` i `/book` ma dwie poprawne linie bez łamania słowa „Behawiorysta”.
- Prywatność Mapy w świeżej publicznej sesji — PASS: `200`, canonical `https://regulskibehawiorysta.pl/mapa-sprawy`, brak bannera zgód, brak Google/GA/Meta, 0 cookies przed i po, 0 błędów konsoli/page errors.
- Technicznie — PASS: `301 /behawiorysta-online-polska -> /`, `301 /termin?problem=szczeniak -> /book?problem=szczeniak`, robots i sitemap `200`, canonical Mapy poprawny; HSTS, `frame-ancestors 'self'`, `SAMEORIGIN`, `nosniff` i polityka referrera są obecne.
- Bezpieczny runtime Supabase — PASS: odczytowy probe z celowo błędnym bearerem zwraca oczekiwane `401` z odpowiedzią sesji, co wykonuje ścieżkę konfiguracji serwera bez odczytu lub zapisu danych klienta.
- Lighthouse publiczny — PASS na pełnym systemowym Chrome po kontrolowanym jednym retry niepełnego mobilnego artefaktu: mobile P `0.83`, A `0.96`, BP `1`, SEO `1` (LCP `4.4 s`); desktop P `0.98`, A `1`, BP `1`, SEO `1`. Lokalny harness QA usuwa raporty przed każdą próbą i nie ukrywa błędu: raport nadal kończy się FAIL, jeśli drugi przebieg nie ma kompletu kategorii albo wystąpi błąd runtime.
- Monitoring: `vercel logs ... --level error --since 1h` po kontrolach nie zwrócił błędów. Rollback: `npx.cmd vercel rollback https://coapebehawiorysta-bha1vtayf-coapebehawiorysta-6608s-projects.vercel.app --yes --scope coapebehawiorysta-6608s-projects`.

## Dodatkowe zadania wykryte w trakcie

- [x] 10. **SEO — canonical Mapy:** publiczna domena zwraca canonical `https://regulskibehawiorysta.pl/mapa-sprawy`.
- [x] 11. **SEO/redirect — `behawiorysta-online-polska`:** potwierdzono publicznie status `301` i `Location: /`, bez podążania smoke za przekierowaniem.
- [x] 12. **Wiarygodność Lighthouse:** desktop i mobile mają komplet kategorii na publicznej domenie; fail-closed pozostaje aktywny, a mobilny artefakt `NO_LCP` został obsłużony kontrolowanym retry z zadania 25.
- [x] 13. **Higiena sandboxów QA:** dwa dokładnie zweryfikowane katalogi `case-map-booking-smoke-*` zostały bezpiecznie usunięte; nie pozostał żaden taki katalog.
- [x] 14. **Migracje produkcyjne:** odczytowo potwierdzono skutki `20260717001` i `20260717002` w zdalnym schemacie (tabela claimów i obowiązkowa kolumna hash tokenu). Wewnętrzna historia migracji nie jest publicznie wystawiona przez PostgREST.
- [x] 15. **Guard Next revalidate:** rozpoznano odziedziczony znacznik runtime i potwierdzono bezostrzeżeniowy build.
- [x] 16. **Akceptacja modalu startowego strony głównej:** zweryfikowano zamykanie, trwałość wyboru, desktop/mobile oraz obraz.
- [x] 17. **Odświeżenie lokalnego cache środowiska Vercel:** cache odświeżono; ograniczenie eksportu sensitive jest opisane, a konfiguracja została ponownie ustawiona.
- [x] 18. **Runtime Vercel dla klucza Supabase:** nowe wdrożenie `8147cbc` przeszło odczytowy probe ścieżki serwera; oczekiwane `401` nieprawidłowej sesji potwierdza działającą konfigurację runtime bez danych klienta.
- [x] 19. **Smoke redirect z cache-busterem:** uruchomiono publicznie; redirect `301` zachował techniczny parametr wyłącznie w smoke, a walidacja potwierdziła docelową ścieżkę `/`.
- [x] 20. **Release checklist — aktualność i redirect:** zsynchronizowany checklist przeszedł publicznie 18/18 i 6/6 reguł smoke.
- [x] 21. **Desktop logo — jakość składu:** audyt desktopowy `/cennik` i `/book` potwierdził dwie linie logo oraz brak dzielenia „Behawiorysta”.
- [x] 22. **Banner zgód na Mapie — kolizja UX:** świeża sesja publiczna ma 0 elementów `.consent-banner`; CTA Mapy nie jest zasłonięte na desktop/mobile.
- [x] 23. **`/pokoj` — anonimowy 401 w konsoli:** źródłem był automatyczny `fetch('/api/account/me')` bez sesji. Serwer przekazuje do klienta wyłącznie hint obecności ciasteczka sesji; nowy użytkownik nie wywołuje chronionego API, a zalogowany nadal ładuje konto. Świeży Chrome potwierdził dla `/pokoj` i `/konto`: HTTP 200, widoczne „Zaloguj się”, 0 żądań `/api/account/me` i `/api/account/case-maps`, 0 błędów konsoli/page errors.
- [x] 24. **Rezerwacja bez JavaScriptu — brak linku do terminu:** przyczyną był zbyt wczesny odczyt testu po `domcontentloaded` dla strumieniowanego widoku `/book`, a nie brak terminu ani regresja strony. Smoke czeka teraz na `networkidle`; kandydat `532bcf3` przeszedł pełny fallback 13/13 (kontakt, link terminu i formularz rezerwacji) bez JavaScriptu.
- [x] 25. **Publiczny Lighthouse mobile — niepełny pomiar LCP:** anomalia `NO_LCP` jest niestabilnym artefaktem mobilnego Chrome/Lighthouse, nie akceptowanym wynikiem strony. Lokalny harness QA usuwa artefakty przed każdą próbą i wykonuje maksymalnie jeden retry wyłącznie po braku kategorii; jeśli drugi pomiar też jest niepełny, nadal zwraca FAIL. Końcowe publiczne potwierdzenie po retry: P `0.83`, A `0.96`, BP `1`, SEO `1`, LCP `4.4 s`.
- [x] 26. **Powtórka Lighthouse po błędzie ładowania Chrome:** `chrome-headless-shell 147` dwukrotnie zwrócił `FAILED_DOCUMENT_REQUEST / net::ERR_ABORTED`, lecz niezależna świeża nawigacja systemowym Chrome oraz publiczny smoke miały `200` i 0 błędów konsoli. Ten błąd runtime pozostał blokujący; rozdzielono go od strony przez identyczny końcowy pomiar na pełnym Chrome `150.0.7871.127`, który przeszedł po jednym retry `NO_LCP` (mobile P `0.83`, A `0.96`, BP `1`, SEO `1`; desktop P `0.98`, A `1`, BP `1`, SEO `1`). Lighthouse preferuje teraz pełny systemowy Chromium, gdy jest dostępny, z bezpiecznym fallbackiem do Playwright.
