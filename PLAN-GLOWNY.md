# Plan główny — Regulski Behawiorysta

Data aktualizacji: 2026-09-15
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
- Podstawowym kanałem telefonicznym jest własny, stale zasilany telefon Android z kartą SIM i numerem firmowym. Rozmowy przychodzące trafiają bezpośrednio na ten telefon; automatyczne SMS-y potwierdzające będą wysyłane przez jego bramkę SMS. Skala pilota to kilka wiadomości dziennie.
- Zadarma pozostaje wyłącznie kanałem awaryjnym. Nie jest warunkiem startu pilota, nie jest domyślnym numerem dla klienta i nie uruchamiamy jej automatyki przed testem awaryjnym.
- Aplikacja właściciela na Xperia F3111 pokazuje opis opłaconej sprawy, kolejkę i przełącznik live. Telefon z kartą SIM sam inicjuje rozmowę po wyraźnym włączeniu live; panel `/admin` pozostaje zapasowym widokiem operacyjnym.

## 3. Kolejność prac

### Etap 0 — zaległe poprawki strony i aplikacji Xperia — STATUS: WYKONANE W KODZIE / GOTOWY APK

Wszystkie zadania programistyczne, konfiguracja widoków, testy jednostkowe oraz budowa aplikacji Xperia zostały zrealizowane i potwierdzone w [AUDYT-GLOWNY-2026-09-11.md](AUDYT-GLOWNY-2026-09-11.md). Do pełnego zamknięcia etapu pozostał wyłącznie test fizyczny na urządzeniu Xperia F3111.

1. **Mapa zachowania [WYKONANE]:** naprawiono przejście po pytaniach bezpieczeństwa i zweryfikowano testem jednostkowym (`tests/case-map.test.ts`) wszystkie 4 warianty odpowiedzi (`SAFETY_NOW`, `VET_URGENT`, `PROCEED`).
2. **Normalna rezerwacja [WYKONANE]:** usunięto komunikaty o niedostępności live przy wyłączonym live; klient widzi czysty wybór zwykłego terminu za 79 zł.
3. **Strona główna i `/zapytaj` [WYKONANE]:** utrzymano jedną jasną decyzję zakupową (79 zł); na `/zapytaj` uporządkowano FAQ i formularz opisu sytuacji (bez narzucania ras czy sztywnych etykiet).
4. **Terapia i kontakt [WYKONANE]:** wdrożono dedykowane zdjęcie `THERAPY_PROCESS_PHOTO`, pełny opis procesu i granic terapii, sekcję FAQ ze schematem Schema.org, powiązane artykuły blogowe oraz główne CTA kierujące prosto do `/zapytaj#formularz`.
5. **Materiały i blog [WYKONANE]:** w artykułach blogowych usunięto rozpraszające boksy boczne i wdrożono jeden silny, kontekstowy blok CTA na dole; zweryfikowano bibliotekę okładek PDF.
6. **PDF v2 i szablony [WYKONANE]:** oczyszczono `content/guides/template/template.html` z wzmianek o ofercie 104 zł.
7. **Xperia — rozmowa i auto-rozłączanie [WYKONANE W KODZIE / ZBUDOWANY APK]:**
   - Zaimplementowano `AgentInCallService.java` (`InCallService`) z automatycznym wywołaniem `call.disconnect()` o zadanym czasie (17:00 lub 15:00 w trybie ścisłym) oraz potrójnym fallbackiem.
   - W `MainActivity.java` dodano przycisk natychmiastowego ustawienia jako domyślny telefon (`TelecomManager.ACTION_CHANGE_DEFAULT_DIALER`).
   - Skompilowano, wyrównano i podpisano produkcyjny pakiet APK: `android/phone-agent/regulski-telefon.apk`.
8. **Testy, build i test Xperia:**
   - **Kod, testy, build [WYKONANE]:** TypeScript 0 błędów, 192 testy (179 pass, 0 fail), Next.js build 93 trasy bez błędów, schemat 20/20 migracji, npm audit 0 podatności, smoke testy produkcji PASS.
   - **Fizyczny test Xperia [DO WYKONANIA PRZEZ OPERATORA]:** wgranie pliku `regulski-telefon.apk` na Sony Xperia F3111, ustawienie jako domyślny telefon i weryfikacja automatycznego rozłączenia na połączeniu testowym. Do tego czasu `PHONE_CALL_PROVIDER=android_agent` pozostaje wyłączony.

### Etap A — kontrolowany pilot zwykłego `Zapytaj`

Przyjąć 3–5 prawdziwych rezerwacji zwykłego terminu za 79 zł, z ręcznym BLIK-iem i ręcznym potwierdzeniem. `Zapytaj teraz`, automatyczny Revolut i test Zadarmy nie wchodzą do tego pilotażu.

Przy każdym przypadku zapisać wyłącznie wewnętrzny identyfikator rezerwacji oraz:

- czy klient rozumiał różnicę między `Zapytaj` a pełną konsultacją;
- czy płatność została poprawnie obsłużona;
- ile trwało potwierdzenie;
- czy pojawił się problem z terminem, potwierdzeniem, linkiem lub kontaktem telefonicznym.

Nie zapisywać w planie imion, telefonów, adresów e-mail ani opisów problemów.

Pilot zatrzymać natychmiast przy podwójnym terminie, potwierdzeniu bez pewnej wpłaty, złej cenie, niedziałającym linku, braku informacji dla klienta albo niejasności co do zakresu usługi.

### Etap B — Xperia „Regulski Operator” (telefon i bramka SMS) — STATUS: WYKONANE W KODZIE / ZBUDOWANY APK
Wdrożono architekturę, w której telefon Sony Xperia F3111 działa pod stałym zasilaniem jako dedykowany wykonawca („Regulski Operator”), a serwer zarządza logiką:
1. **Heartbeat i Watchdog serwera (`/api/phone-agent/heartbeat`, `/api/phone-agent/watchdog`):**
   - Xperia co 60 sekund melduje poziom naładowania, stan zasilania, sieć GSM i status dialera.
   - Jeśli serwer nie otrzyma meldunku przez > 3 minuty: automatycznie blokuje dostępność `Zapytaj teraz` (`offline`) i wysyła niezależny alert push + e-mail (Resend) poza Xperię.
2. **Kolejka SMS z karty SIM (`/api/phone-agent/sms-queue`):**
   - Serwer generuje i kolejkuje treści SMS, a Xperia co 15 sekund pobiera i fizycznie wysyła je z karty SIM.
   - Zaimplementowano automatyczne przypomnienia: 60 minut przed rozmową (z linkiem do przełożenia terminu wygasającym 30 min przed startem) oraz 15 minut przed rozmową („miej telefon pod ręką”), a także potwierdzenia płatności.
3. **Sekwencja czasowa rozmowy i automatyczne rozłączanie:**
   - 0:00–0:03: 3 sekundy na powitanie -> 0:03: 1 bip (start 15 min merytorycznych) -> 7:33: 2 bipy (sedno) -> 15:03: 3 bipy (2 minuty na podsumowanie) -> 16:55: dyskretne ostrzeżenie -> 17:03: bezwzględne rozłączenie rozmowy (`call.disconnect()`).
   - Obsługa braku odebrania (45s timeout -> próba 2 za 2 min) oraz zerwania połączenia (< 14 min -> reconnect za 30s).
4. **Instalator APK:** Zbudowano, wyrównano i podpisano [`regulski-operator.apk`](file:///C:/projekt/regulskibehawiorysta/android/phone-agent/regulski-operator.apk).

### Etap C — Automatyczne uzgadnianie wpłat Revolut / BLIK — STATUS: WYŁĄCZONE
Techniczny moduł odczytu powiadomień istnieje, ale nie jest metodą potwierdzania płatności. Powiadomienie bankowe nie jest webhookiem i nie daje wystarczającego dowodu, zwłaszcza gdy kilka osób płaci tę samą kwotę.

- `PHONE_AGENT_AUTO_PAYMENT_RECONCILIATION=false` jest ustawieniem domyślnym; endpoint automatyzacji odmawia działania bez jawnej flagi pilotażowej.
- W pilotażu każdą wpłatę BLIK potwierdza operator ręcznie.
- Ewentualny powrót do automatyzacji wymaga osobnej decyzji, dowodu wiarygodnego identyfikatora przelewu oraz testu przypadków kolizji.

### Etap D — Poprawki jakościowe i bramka wydania — STATUS: ZREALIZOWANE
- Pełna zgodność TypeScript: 0 błędów (`npx tsc --noEmit`).
- Pełny zestaw testów: 198 testów (185 passed, 0 failed, 13 skipped).
- Next.js build: pomyślna kompilacja wszystkich 97 tras produkcyjnych.
- Dokumentacja wdrożeniowa: zaktualizowano [`XPERIA-SETUP.md`](file:///C:/projekt/regulskibehawiorysta/android/phone-agent/XPERIA-SETUP.md) oraz [`README.md`](file:///C:/projekt/regulskibehawiorysta/android/phone-agent/README.md).

## 4. Bramka akceptacji

Za wykonane można uznać tylko to, co ma dowód w aktualnym audycie i nie narusza ograniczeń poniżej:

- główna oferta i CTA mówią prawdę o `Zapytaj`, cenie i kanale telefonu;
- zwykły termin, blokada, ręczny BLIK, potwierdzenie i idempotencja zachowują właściwe statusy;
- live jest pokazywany tylko przy realnej dostępności, a przy jej braku nie konkuruje ze zwykłą rezerwacją;
- Mapa zatrzymuje się na bezpieczeństwie przed ścieżką usługową;
- Pokój udostępnia dane i pytania dopiero po właściwym zakończeniu rozmowy;
- stare adresy prowadzą do aktualnej ścieżki bez martwych stron;
- publiczne widoki nie mają błędów konsoli, uszkodzonych obrazów ani poziomego overflow;
- bramka produkcyjna nie ukrywa nieprzetestowanego telefonu, SMS-ów, płatności ani automatyzacji.

## 5. Aktualny status

Szczegółowe dowody z audytu znajdują się w [AUDYT-GLOWNY-2026-09-11.md](AUDYT-GLOWNY-2026-09-11.md) (poprzedni: [AUDYT-GLOWNY-2026-09-07.md](AUDYT-GLOWNY-2026-09-07.md)).

Decyzja operacyjna na teraz:
- **WARUNKOWE GO:** po zacommitowaniu i wdrożeniu zweryfikowanego kodu można rozpocząć kontrolowany pilotaż zwykłego `Zapytaj` za 79 zł (ręczny BLIK, ręczne potwierdzenie).
- **NO-GO:** `Zapytaj teraz` (104 zł), automatyczny Revolut/BLIK, automatyczne SMS-y i `PHONE_CALL_PROVIDER=android_agent` pozostają wyłączone do czasu pomyślnego fizycznego testu Xperii, działającego chronionego harmonogramu watchdoga i pilotażu. Zadarma jest wyłącznie kanałem awaryjnym.

Historyczne plany i stare raporty zostały skonsolidowane albo usunięte z głównego katalogu. Dokumenty treści, poradników i materiały operacyjne niezwiązane z planem projektu pozostają poza tym porządkiem.
