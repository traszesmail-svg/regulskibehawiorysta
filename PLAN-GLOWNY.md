# Plan główny — Regulski Behawiorysta

Data aktualizacji: 2026-09-16

Aktualny zakres Operatora i panelu właściciela: [PLAN-OPERATOR-2026-09-16.md](PLAN-OPERATOR-2026-09-16.md). Ustalenia z 16.09 o Motoroli, automatycznych SMS-ach, dostępności online i docelowej automatyzacji Revolut zastępują starsze ograniczenia zakresu w tym dokumencie. Wykonanie i testy są rozliczane osobno; karta SIM czeka na doładowanie.
Status: dokument kanoniczny dla dalszych decyzji i wdrożeń  
Powiązany audyt: [AUDYT-GLOWNY-2026-09-11.md](AUDYT-GLOWNY-2026-09-11.md) (poprzedni: [AUDYT-GLOWNY-2026-09-07.md](AUDYT-GLOWNY-2026-09-07.md))

## 1. Decyzja nadrzędna

Główną ścieżką serwisu jest `Zapytaj behawiorystę — 15 min`. To samodzielna, płatna rozmowa telefoniczna za **79 zł** w zwykłym terminie. Klient płaci za rozmowę i pierwszy konkretny kierunek; nie jest to zaliczka ani ukryty formularz kwalifikacyjny do pełnej konsultacji.

`Zapytaj teraz` kosztuje **104 zł** wyłącznie wtedy, gdy behawiorysta rzeczywiście włączy dostępność live. Przy braku bezpiecznie potwierdzonej dostępności klient widzi zwykłe terminy, bez komunikatu o niedostępnym live. Aktualny stan produkcyjny live to `offline`, więc nie wolno obiecywać natychmiastowej rozmowy.

Pełna konsultacja (**475 zł**) jest osobną usługą, udostępnianą indywidualnym kodem po `Zapytaj`. Terapia może być kolejnym krokiem dopiero po pełnej konsultacji. Hotel jest ścieżką warunkową po formularzu kwalifikacyjnym, a nie automatycznym terminarzem.

Ten dokument jest właściwym planem dla aktualnego zakresu, ponieważ obejmuje nie tylko wygląd strony, ale też rzeczywisty model `Zapytaj`: termin, cenę, ręczny BLIK, statusy rozmowy, Pokój klienta, pytania po rozmowie, rekomendację materiału, bezpieczeństwo Mapy i granice Zadarmy.

## 2. Zasady produktu i komunikacji

- Na pierwszym ekranie i w głównym CTA priorytet ma `Zapytaj behawiorystę`.
- Formularz nie wymaga rasy ani sztywnej etykiety problemu; wystarczy opis sytuacji, gatunek i dane potrzebne do kontaktu.
- Zwykły termin i live są dwoma sposobami skorzystania z tej samej rozmowy; live nie jest osobną diagnozą ani otwartą kolejką.
- `Mapa zachowania` jest opcjonalną pomocą dla osoby niezdecydowanej, nie obowiązkową bramką sprzedażową. Zawiera najpierw pytania bezpieczeństwa.
- Przy zagrożeniu człowieka, zwierzęcia, urazie lub nagłym problemie zdrowotnym pierwszeństwo ma właściwa pomoc, nie rekomendacja płatnej usługi.
- Blog i materiały PDF wspierają edukację oraz decyzję o konsultacji. Nie konkurują z główną usługą.
- Po zakończonym `Zapytaj` behawiorysta może opublikować krótkie podsumowanie, maksymalnie dwa pytania uzupełniające ważne przez 7 dni oraz jedną trafną rekomendację materiału albo dalszej ścieżki.
- Ręczny BLIK pozostaje aktywnym mechanizmem płatności. Zwykły termin jest blokowany na 5 minut, a zgłoszona płatność czeka na ręczną decyzję maksymalnie 24 godziny.
- PayU i automatyczne potwierdzanie wpłat z prywatnego Revoluta pozostają wyłączone. Odczyt e-maila nie jest traktowany jak webhook płatniczy.
- Podstawowym kanałem telefonicznym jest własny, stale zasilany telefon Android (Motorola One Vision) z kartą SIM T-Mobile i numerem firmowym. Rozmowy przychodzące trafiają bezpośrednio na ten telefon; automatyczne SMS-y potwierdzające i przypomnienia są wysyłane przez jego bramkę SMS modemu.
- Zadarma pozostaje wyłącznie kanałem awaryjnym. Nie jest warunkiem startu pilota, nie jest domyślnym numerem dla klienta i nie uruchamiamy jej automatyki przed testem awaryjnym.
- Rozdział urządzeń: Motorola One Vision działa jako bezobsługowa stacja bazowa (modem SIM, dialer, lektor TTS pod zasilaniem). Właściciel zarządza rezerwacjami, podglądem kolejki i przełącznikiem Live z poziomu swojego prywatnego telefonu przez PWA / mobilny panel `/admin`. Motorola nie wymaga obsługi ekranowej przez człowieka.

## 3. Kolejność prac

### Etap 0 — zaległe poprawki strony i aplikacji Android — STATUS: WYKONANE I WDROŻONE PRODUKCYJNIE

Wszystkie zadania programistyczne, konfiguracja widoków, testy jednostkowe oraz budowa aplikacji operatora zostały zrealizowane i potwierdzone:
1. **Mapa zachowania [WYKONANE]:** naprawiono przejście po pytaniach bezpieczeństwa i zweryfikowano testem jednostkowym (`tests/case-map.test.ts`) wszystkie 4 warianty odpowiedzi (`SAFETY_NOW`, `VET_URGENT`, `PROCEED`).
2. **Normalna rezerwacja [WYKONANE]:** usunięto komunikaty o niedostępności live przy wyłączonym live; klient widzi czysty wybór zwykłego terminu za 79 zł.
3. **Strona główna i `/zapytaj` [WYKONANE]:** utrzymano jedną jasną decyzję zakupową (79 zł); na `/zapytaj` uporządkowano FAQ i formularz opisu sytuacji (bez narzucania ras czy sztywnych etykiet).
4. **Terapia i kontakt [WYKONANE]:** wdrożono dedykowane zdjęcie `THERAPY_PROCESS_PHOTO`, pełny opis procesu i granic terapii, sekcję FAQ ze schematem Schema.org, powiązane artykuły blogowe oraz główne CTA kierujące prosto do `/zapytaj#formularz`.
5. **Materiały i blog [WYKONANE]:** w artykułach blogowych usunięto rozpraszające boksy boczne i wdrożono jeden silny, kontekstowy blok CTA na dole; zweryfikowano bibliotekę okładek PDF.
6. **PDF v2 i szablony [WYKONANE]:** oczyszczono `content/guides/template/template.html` z wzmianek o ofercie 104 zł.
7. **Motorola — rozmowa, TTS i auto-rozłączanie [WYKONANE]:**
   - Zaimplementowano `AgentInCallService.java` (`InCallService`) z automatycznym wywołaniem `call.disconnect()` oraz lektora TTS (`TextToSpeech` pl-PL) czytającego briefing sprawy (opiekun, zwierzak, problem) przed połączeniem.
   - Skompilowano, wyrównano i podpisano produkcyjny pakiet APK kluczem `operator-release.keystore`.
8. **Testy i build [WYKONANE]:** TypeScript 0 błędów, 189 testów pass, Next.js build bez błędów wdrożony na Vercel (`regulskibehawiorysta.pl`).

### Etap A — kontrolowany pilot zwykłego `Zapytaj` — STATUS: GOTOWY DO ROZPOCZĘCIA

Przyjąć 3–5 prawdziwych rezerwacji zwykłego terminu za 79 zł, z ręcznym BLIK-iem i ręcznym potwierdzeniem (lub opłatą online).
Automatyczne przypomnienia SMS (60 min i 15 min) są wysyłane z karty SIM Motoroli.
Behawiorysta przed połączeniem odsłuchuje głosowy briefing z lektora.

### Etap B — Motorola One Vision „Regulski Operator” — STATUS: AKTYWNY I PODŁĄCZONY

1. **Heartbeat i Watchdog serwera (`/api/phone-agent/heartbeat`, `/api/cron/phone-agent-watchdog`):**
   - Motorola co 60 sekund melduje poziom baterii (100%), stan zasilania (charging) i wersję aplikacji.
   - Serwer rejestruje stan w `phone_agent_state` w Supabase w ułamku sekundy (asynchroniczny meldunek).
   - Supabase `pg_cron` uruchamia watchdog co minutę; telefon jest stale widziany jako online.
2. **Kolejka SMS z karty SIM (`/api/phone-agent/sms-queue`):**
   - Serwer kolejkuje treści w `phone_agent_sms_queue`, a Motorola co 15 sekund pobiera i fizycznie wysyła je z karty SIM z callbackiem modemu.
   - Atomowe pobieranie przez PostgreSQL `for update skip locked` uniemożliwia podwójne wysłanie.
3. **Centrum mobilne na `/admin`:**
   - Widok baterii, zasięgu i statusu Motoroli, kolejki SMS oraz najbliższej opłaconej rozmowy z szybkim wybieraniem.

### Etap C — Płatności Revolut / BLIK — STATUS: DOPASOWANIE ZREFAKTORYZOWANE

- Zaimplementowano bezpieczne dopasowywanie wpłat Revolut (weryfikacja kwoty, pełnego nazwiska i deduplikacji, bez niebezpiecznego zgadywania FIFO).
- Wersja produkcyjna gotowa na weryfikację pilotażową.

## 4. Bramka akceptacji

- główna oferta i CTA mówią prawdę o `Zapytaj`, cenie i kanale telefonu;
- zwykły termin, blokada, ręczny BLIK, potwierdzenie i idempotencja zachowują właściwe statusy;
- live jest pokazywany tylko przy realnej dostępności włączonej przez właściciela;
- Pokój udostępnia dane i pytania dopiero po właściwym zakończeniu rozmowy;
- publiczne widoki nie mają błędów konsoli, uszkodzonych obrazów ani poziomego overflow;
- Motorola stale melduje się jako online i wysyła SMS-y z potwierdzeniami oraz przypomnieniami.

## 5. Aktualny status i decyzja operacyjna

- **Stan bieżący:** Motorola One Vision podłączona pod stałym zasilaniem USB, karta T-Mobile aktywna, baza Supabase `ACTIVE_HEALTHY`, serwer Vercel produkcyjny zoptymalizowany pod kątem timeoutów.
- **Zatwierdzona kolejność:**
  1. Aktualizacja planów (ZROBIONE).
  2. Aktualizacja APK 1.5.1 na Motoroli (autostart po restarcie, odporność na `SpannableString` w Revolut).
  3. Próbna rezerwacja z udziałem właściciela na numer prywatny (+48505848889).
  4. Uruchomienie komercyjnego pilotażu zwykłego `Zapytaj 15 min` za 79 zł (3–5 rezerwacji).
  5. Tryb Live „Zapytaj teraz” (104 zł) sterowany z prywatnego telefonu właściciela.
