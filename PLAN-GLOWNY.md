# Plan główny — Regulski Behawiorysta

Data aktualizacji: 2026-10-05

Aktualny zakres Operatora i panelu właściciela: [PLAN-OPERATOR-2026-09-16.md](PLAN-OPERATOR-2026-09-16.md). Ustalenia z 16.09 opisują docelową automatyzację. Nie są dowodem wdrożenia ani testu fizycznego. Stan bieżący wynika z kontroli kodu, produkcji i urządzenia, rozliczanych osobno.
Status: dokument kanoniczny dla dalszych decyzji i wdrożeń  
Historyczne audyty i wycofane koncepcje: lokalne archiwum `C:\projekt\regulskibehawiorysta-archiwum-20261005` (poza repozytorium).

## 1. Decyzja nadrzędna

Ustalenie użytkownika z 05.10.2026: obecna treść publiczna i układ strony są przyjętą, stałą bazą. Dalsza praca dotyczy Operatora oraz drobnych mechanizmów i napraw technicznych. Nie wznawiamy przebudowy strony, zmiany treści ani dawnych koncepcji na podstawie archiwalnych planów i audytów; takie zmiany wymagają nowej decyzji użytkownika. Porządki w repozytorium i wdrożeniach mają zachowywać przyjętą treść i wygląd.

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
- Docelowy rozdział urządzeń: Motorola One Vision jako stacja bazowa, właściciel zarządza przez PWA / `/admin` na prywatnym telefonie. Obecnie modem SMS działa w tle, lecz inicjowanie i raportowanie rozmów w aplikacji Android wymaga obsługi człowieka. Przycisk `tel:` w panelu wybiera numer na urządzeniu, na którym otwarto panel; nie steruje zdalnie Motorolą.

## 3. Kolejność prac

### Etap 0 — przyjęta strona publiczna

Publiczna treść i układ są przyjęte. Poniższe prace publiczne są zapisane historycznie; nie oznaczają odbioru automatyzacji telefonu:
1. **Mapa zachowania [WYKONANE]:** naprawiono przejście po pytaniach bezpieczeństwa i zweryfikowano testem jednostkowym (`tests/case-map.test.ts`) wszystkie 4 warianty odpowiedzi (`SAFETY_NOW`, `VET_URGENT`, `PROCEED`).
2. **Normalna rezerwacja [WYKONANE]:** usunięto komunikaty o niedostępności live przy wyłączonym live; klient widzi czysty wybór zwykłego terminu za 79 zł.
3. **Strona główna i `/zapytaj` [WYKONANE]:** utrzymano jedną jasną decyzję zakupową (79 zł); na `/zapytaj` uporządkowano FAQ i formularz opisu sytuacji (bez narzucania ras czy sztywnych etykiet).
4. **Terapia i kontakt [WYKONANE]:** wdrożono dedykowane zdjęcie `THERAPY_PROCESS_PHOTO`, pełny opis procesu i granic terapii, sekcję FAQ ze schematem Schema.org, powiązane artykuły blogowe oraz główne CTA kierujące prosto do `/zapytaj#formularz`.
5. **Materiały i blog [WYKONANE]:** w artykułach blogowych usunięto rozpraszające boksy boczne i wdrożono jeden silny, kontekstowy blok CTA na dole; zweryfikowano bibliotekę okładek PDF.
6. **PDF v2 i szablony [WYKONANE]:** oczyszczono `content/guides/template/template.html` z wzmianek o ofercie 104 zł.
7. **Android — granica odbioru:** aktualne źródła i manifest nie uruchamiają `AgentInCallService` ani starego `PhoneAgentService`. Obecność tych plików nie dowodzi działającego auto-rozłączania. Lektor jest lokalnym briefingiem; przekazanie głosu do słuchawki właściciela przez połączenie GSM nie jest potwierdzone.
8. **Weryfikacja:** wyniki testów i identyfikator wdrożenia podaje się dla konkretnego wydania, bez przenoszenia starych wyników na bieżący kod.

### Etap A — kontrolowany pilot zwykłego `Zapytaj` — STATUS: WYMAGA TESTU FIZYCZNEGO

Przyjąć 3–5 prawdziwych rezerwacji zwykłego terminu za 79 zł, z ręcznym BLIK-iem i ręcznym potwierdzeniem (lub opłatą online).
Mechanizm przypomnień SMS (60 min i 15 min) i briefing istnieją w kodzie. Pilot obejmuje potwierdzenie odbioru SMS i telefonu przez użytkownika, stanów rezerwacji oraz trwałości po restarcie i utracie internetu. Nie przeprowadzać prób na numerach klientów.

### Etap B — telefon i panel — STATUS: CZĘŚCIOWO POTWIERDZONE

1. **Heartbeat i Watchdog serwera (`/api/phone-agent/heartbeat`, `/api/cron/phone-agent-watchdog`):**
   - Kod wysyła meldunki co 60 sekund. Kontrola produkcji 05.10 wykazała świeże meldunki wersji `1.5.4`, poziom baterii 97–99% i ładowanie. Sieć i status domyślnego dialera były nieznane (`null`).
   - Stan jest zapisywany w `phone_agent_state` w Supabase. Odpowiedź sukcesu musi oznaczać udany trwały zapis, a nie fallback pamięci procesu.
   - Endpoint watchdoga i migracja schedulera istnieją. Sam kod migracji nie dowodzi bieżącego uruchamiania `pg_cron`; wymagana jest kontrola harmonogramu i historii wykonania.
2. **Kolejka SMS z karty SIM (`/api/phone-agent/sms-queue`):**
   - Serwer kolejkuje treści w `phone_agent_sms_queue`, a Motorola co 15 sekund pobiera i fizycznie wysyła je z karty SIM z callbackiem modemu.
   - Atomowe pobieranie przez PostgreSQL `for update skip locked` uniemożliwia podwójne wysłanie.
3. **Centrum mobilne na `/admin`:**
   - Widok baterii, zasięgu i statusu Motoroli, kolejki SMS oraz najbliższej opłaconej rozmowy z szybkim wybieraniem.

### Etap C — płatności — STATUS: RĘCZNY BLIK, AUTOMAT WYŁĄCZONY

- Ręczne potwierdzanie BLIK jest aktywne. Produkcja: `PHONE_AGENT_AUTO_PAYMENT_RECONCILIATION=false`, `PHONE_CALL_PROVIDER=manual_sim`, `SMS_PROVIDER=phone_agent`, `APP_DATA_MODE=supabase`.
- Audyt 05.10 wykazał niebezpieczne dopasowanie po samym nazwisku, wspólnym telefonie i możliwość powtórnego użycia powiadomienia. Poprawki wymagają testów regresji i trwałego ledgeru transakcji w Supabase.
- Migracja `20261005001_revolut_payment_reconciliation_ledger.sql` jest warunkiem ochrony między instancjami. Bez potwierdzonej migracji oraz kontrolowanego pilota automat pozostaje wyłączony. Powiadomienie Revolut nie jest webhookiem bankowym.

## 4. Bramka akceptacji

- główna oferta i CTA mówią prawdę o `Zapytaj`, cenie i kanale telefonu;
- zwykły termin, blokada, ręczny BLIK, potwierdzenie i idempotencja zachowują właściwe statusy;
- live jest pokazywany tylko przy realnej dostępności włączonej przez właściciela;
- Pokój udostępnia dane i pytania dopiero po właściwym zakończeniu rozmowy;
- publiczne widoki nie mają błędów konsoli, uszkodzonych obrazów ani poziomego overflow;
- Motorola stale melduje się jako online i wysyła SMS-y z potwierdzeniami oraz przypomnieniami.

## 5. Aktualny status i decyzja operacyjna

- **Stan sprawdzony 05.10:** produkcja odbiera meldunki telefonu `1.5.4`. Pod koniec kontroli Motorola była dostępna przez ADB: wersja `1.5.4`, usługa SMS na pierwszym planie, ładowanie USB i uprawnienia SMS/połączeń. Nie potwierdzono obecnego odbioru SMS/rozmowy, restartu, automatycznego dialera, limitu czasu ani telekonferencji. Przygotowano źródła i kompilację niepodpisanego kandydata `1.5.5`; podpisanie i instalacja wymagają dotychczasowego klucza z hasłem. Nie oznaczamy kandydata jako zainstalowanego.
- **Zatwierdzona kolejność:**
  1. Poprawki backendu, uwierzytelnienia panelu i aktualności statusów; testy lokalne oraz wdrożenie bez włączania automatu wpłat.
  2. Odtwarzalne wydanie Androida, podpis dotychczasowym kluczem i kontrolowana instalacja po uzyskaniu dostępu do urządzenia.
  3. Próbna rezerwacja z udziałem właściciela na uzgodniony numer prywatny.
  4. Uruchomienie komercyjnego pilotażu zwykłego `Zapytaj 15 min` za 79 zł (3–5 rezerwacji).
  5. Tryb Live „Zapytaj teraz” (104 zł) sterowany z prywatnego telefonu właściciela.
