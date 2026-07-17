# Finalna bramka publikacji — 2026-07-17

Cel: potwierdzić gotowość obecnego wydania produkcyjnego przed publikacją. Każdy punkt zostaje oznaczony jako wykonany wyłącznie po zapisaniu dowodu (komenda, wynik, adres lub raport).

Wydanie kontrolowane: `3fdf845 feat: add private Map analytics and profile claims`.

## Plan podstawowy

- [x] 1. Ustalić bazę wydania: czysty Git, commit, marker buildu, deployment i możliwość rollbacku.
- [x] 2. Wykonać lokalną bramkę jakości kolejno: lint, testy, TypeScript, build oraz audyt schematu/migracji.
- [x] 3. Zweryfikować migracje i konfigurację danych bez ingerencji w produkcyjne dane klientów.
- [x] 4. Wykonać bezpieczny sandboxowy test flow: rezerwacja → płatność mock → potwierdzenie → konto → dobrowolne podpięcie Mapy.
- [ ] 5. Wykonać produkcyjny test funkcjonalny publicznych tras, CTA i przejść Mapa → termin/rezerwacja.
- [ ] 6. Zweryfikować prywatność i bezpieczeństwo: zgody analityczne, minimalizacja danych zdarzeń, token podpięcia profilu, brak danych w URL/logach.
- [ ] 7. Zweryfikować widok desktop/mobile, dostępność, polskie znaki, brak overflow i działanie nawigacji.
- [ ] 8. Zweryfikować SEO i technikalia: canonical, robots, sitemap, przekierowania, statusy HTTP i błędy runtime.
- [ ] 9. Sprawdzić monitoring/logi, przygotować rollback i sporządzić końcowy raport PASS/BLOCKER.

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

## Dodatkowe zadania wykryte w trakcie

- [ ] 10. **SEO — canonical Mapy:** poprawka self-canonical jest gotowa lokalnie; wdrożyć i zweryfikować canonical `https://regulskibehawiorysta.pl/mapa-sprawy` na docelowej domenie.
- [ ] 11. **SEO/redirect — `behawiorysta-online-polska`:** zachowanie zostało jasno opisane w smoke jako celowy redirect `301 → /`; po wdrożeniu potwierdzić status i `Location`, bez podążania testu za przekierowaniem.
- [ ] 12. **Wiarygodność Lighthouse:** harness naprawiono tak, aby błąd dokumentu lub brak kategorii kończył raport jako `FAIL`; po wdrożeniu wykonać niezależny audyt Playwright/Chrome desktop i mobile jako dowód widoku. Mobilny wynik Lighthouse z niekompletnymi kategoriami nie może zostać uznany za PASS.
- [ ] 13. **Higiena sandboxów QA:** po zakończeniu dowodów bezpiecznie usunąć dwa stare katalogi `case-map-booking-smoke-*` z katalogu tymczasowego. Bieżący `case-map-smoke` nie stworzył nowych pozostałości.
- [x] 14. **Migracje produkcyjne:** odczytowo potwierdzono skutki `20260717001` i `20260717002` w zdalnym schemacie (tabela claimów i obowiązkowa kolumna hash tokenu). Wewnętrzna historia migracji nie jest publicznie wystawiona przez PostgREST.
- [x] 15. **Guard Next revalidate:** rozpoznano odziedziczony znacznik runtime i potwierdzono bezostrzeżeniowy build.
- [x] 16. **Akceptacja modalu startowego strony głównej:** zweryfikowano zamykanie, trwałość wyboru, desktop/mobile oraz obraz.
- [x] 17. **Odświeżenie lokalnego cache środowiska Vercel:** cache odświeżono; ograniczenie eksportu sensitive jest opisane, a konfiguracja została ponownie ustawiona.
- [ ] 18. **BLOKER — runtime Vercel dla klucza Supabase:** po ponownym ustawieniu zweryfikowanego `SUPABASE_SERVICE_ROLE_KEY` wykonać nowe wdrożenie i odczytowy test runtime. Dopiero ten dowód zamknie bramkę publikacji dla `APP_DATA_MODE=supabase`.
- [ ] 19. **Smoke redirect z cache-busterem:** redirect `301` legalnie zachowuje parametr `__release_smoke`; smoke ma porównywać docelową ścieżkę, a nie cały URL z technicznym parametrem. Uruchomić go na produkcji po wdrożeniu.
- [ ] 20. **Release checklist — aktualność i redirect:** checklist ma nieaktualną dosłowną definicję `npm test` oraz podąża za redirectem zamiast dowodzić jego statusu i `Location`. Zsynchronizować go z package script i regułami redirectów, a potem uruchomić jako element bramki.
- [ ] 21. **Desktop logo — jakość składu:** na `/cennik` i `/book` nazwa `Behawiorysta` łamie się w środku mimo braku overflow. Ustabilizować skład logo we wspólnym nagłówku i zweryfikować desktop.
- [ ] 22. **Banner zgód na Mapie — kolizja UX:** na desktopowej nowej sesji banner zgód zasłania fragment dolnej karty wyboru Mapy. Skorygować pozycjonowanie/odstęp bez blokowania CTA i zweryfikować desktop/mobile.
- [ ] 23. **`/pokoj` — anonimowy 401 w konsoli:** pełny crawl finalnego kandydata wykrył po jednym błędzie konsoli desktop/mobile przy wejściu bez sesji. Ustalić źródło żądania, zachować publiczne wejście do logowania i usunąć niepotrzebny błąd konsoli przed promocją.
