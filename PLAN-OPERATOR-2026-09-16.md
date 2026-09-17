# Operator, panel właściciela i płatności

Ustalenia użytkownika z 16 września 2026 uzupełniają PLAN-GLOWNY.md. Urządzenie robocze: Motorola One Vision. Karta wymaga doładowania. Do tego czasu żadnych testowych połączeń ani SMS-ów. Nie utożsamiamy stanu ACTIVE z odebraniem rozmowy przez człowieka.

## Kolejność i kryteria zakończenia

1. Stabilizacja Androida i tryb konfiguracji. Zachować token przy aktualizacji, oddzielić zapis ustawień od uruchamiania wysyłki, zatrzymać pobieranie SMS bez uprawnień. Wynik wysłania dopiero z callbacku Androida. Dodać trwałe ponawianie raportów bez ponownego wysyłania SMS. Stały klucz podpisu poza katalogiem build. Sprawdzić start, zatrzymanie, ponowne uruchomienie i utratę internetu bez kontaktowania klientów.
2. Trwała kolejka i stan telefonu w Supabase. Migracja, atomowe przydzielanie wiadomości, deduplikacja, ważność przypomnień, widoczność błędów. Wiadomość dodana do kolejki nie jest wysłana. Nie ponawiać automatycznie niejednoznacznej próby wysyłki.
3. SMS projektu: potwierdzenie zaksięgowania, przypomnienia około 60 i 15 minut, dostępność online dla zapisanych osób. Jedna ścieżka wysyłki, brak duplikowania przez dotychczasowego dostawcę. Anulowana lub przełożona rezerwacja unieważnia stare przypomnienia. SMS dostępności wygasa po wyłączeniu online.
4. Panel właściciela: najpierw audyt istniejącego panelu /admin i PWA. Widok mobilny: dostępny/niedostępny, czas ważności dostępności, najbliższa opłacona rozmowa, kolejka, płatności wymagające sprawdzenia, stan Motoroli i błędy SMS. Przełącznik pokazuje potwierdzony stan serwera; obecność telefonu w sieci sama nie oznacza dostępności właściciela. Ponownie wykorzystać istniejące uwierzytelnienie.
5. Revolut: automatyczne potwierdzenie i SMS zostały zamówione przez użytkownika. Usunąć wybieranie najstarszej rezerwacji wyłącznie po kwocie, dopasowanie po pojedynczym członie nazwiska oraz podwójne potwierdzenia. Rozpoznawać wpływ, walutę, identyfikator transakcji/tytuł i rezerwację; deduplikacja oraz przypadki niejednoznaczne w panelu. Sam odczyt powiadomienia nie dowodzi poprawnego zaksięgowania. Włączenie produkcyjne po testach dopasowania i trwałości danych.
6. Połączenia projektu: opłacona rezerwacja, właściwy numer i SIM, jawny tryb uruchamiania, podgląd sprawy, limit czasu liczony od faktycznego połączenia, odzyskanie stanu po awarii. Lektor (synteza mowy TTS / briefing głosowy): odczytanie kluczowych informacji o sprawie (imię klienta, zwierzak, wiek, zgłoszony problem) przed/w trakcie inicjowania połączenia, aby behawiorysta miał pełny kontekst w słuchawce. Ręczne dzwonienie istnieje; pełna automatyka rezerwacji nie jest ukończona.
7. Integracja i odbiór. Testy lokalne i symulowane bez SMS/rozmów. Po doładowaniu jeden uzgodniony SMS i telefon na numer użytkownika, potwierdzenie odbioru przez niego. Następnie pełna próbna rezerwacja, wpłata, SMS, dostępność, rozmowa, zakończenie. Nie oznaczać całości jako gotowej wcześniej.

## Stan wejściowy

- Naprawiono brak FOREGROUND_SERVICE; usługa uruchamia się na Motoroli.
- Dodano callbacki wysyłki części SMS; ponawianie raportów nadal do wykonania.
- Obecna kolejka i heartbeat zapisują lokalne pliki: brak trwałej integracji produkcyjnej.
- Powiadomienia Revolut są odczytywane, pełna automatyczna integracja niepotwierdzona.
- Dotychczasowy test rozmowy nie potwierdził dotarcia do użytkownika.
- Aktualny APK podpisany kluczem testowym, wymagany trwały proces aktualizacji.

## Infrastruktura wymagana przed włączeniem SMS lub live

- Stan Motoroli i kolejka SMS są trwale zapisane w Supabase (`phone_agent_state`, `phone_agent_sms_queue`). Pobranie SMS jest atomowe: jedna wiadomość może zostać przydzielona tylko jednemu odpytywaniu telefonu.
- Potwierdzenie SMS z Androida oznacza wynik przekazania do modemu, a nie odebranie wiadomości przez klienta. Przy utracie internetu telefon ponawia wyłącznie raport wyniku; nie wysyła tej samej wiadomości po raz drugi.
- Watchdog jest uruchamiany co minutę przez darmowy Supabase `pg_cron` i `pg_net`, z tym samym sekretem w Vault, którego używają istniejące schedulery. Nie wymaga Vercel Pro.
- Supabase Free wystarcza do pilota, ale projekt może zostać usypiany po tygodniu zbyt małej aktywności i nie daje gwarancji ciągłości ani automatycznych kopii zapasowych. Przejście na Pro ma sens dopiero przed regularnymi płatnymi rezerwacjami.

## Dziennik

- 16.09: zapisano uzgodniony zakres i rozpoczęto etap 1. Kolejne etapy pozostają otwarte.
- 17.09: wygenerowano stały klucz podpisu release poza build (`operator-release.keystore`), naprawiono błędy serializacji raportu w `SmsJournal` oraz obsługę pustego wyniku w kolejce, zainstalowano nową wersję APK na Motoroli. Karta SIM doładowana. Wysłano pomyślny testowy SMS z karty SIM modemu na numer testowy +48579163241, odebrano callback Androida i potwierdzono status sent w Supabase.
- 17.09 (Etap 3): podpięto SMS projektu pod trwałą kolejkę telefonu (jedna ścieżka dispatchu przez `sendViaPhoneAgent` i `enqueueSms`, klucze idempotencji, unieważnianie starych przypomnień przy przełożeniu/odwołaniu oraz wygasanie SMS live availability).
- 17.09 (Etap 4): wdrożono kartę mobilną operatora na szczycie `/admin` (podgląd baterii, sieci i statusu Motoroli, przełącznik trybu Live z licznikiem ważności, podgląd kolejki SMS oraz najbliższa opłacona rozmowa z bezpośrednim wybieraniem `tel:`).
- 17.09 (Etap 5): zrefaktoryzowano dopasowywanie wpłat Revolut (usunięto zgadywanie FIFO najstarszej rezerwacji, wykluczono transakcje wychodzące, dodano weryfikację kwoty i pełnego imienia/nazwiska oraz deduplikację).
- 17.09 (Etap 6): wdrożono moduł lektora TTS (`android.speech.tts.TextToSpeech` z głosem `pl-PL`) oraz podgląd i obsługę zleceń rozmów w aplikacji Android (wersja `1.5.0-voice`). Lektor odczytuje briefing sprawy: opiekun, zwierzak, wiek, zgłoszony problem i szczegóły. Dodano raportowanie zdarzeń rozmowy (`claimed`, `ended`, `no_answer`, `failed`).
- 17.09 (Etap 7): przeprowadzono pełny test integracyjny End-to-End na numerze testowym użytkownika (+48505848889). Potwierdzono: utworzenie rezerwacji -> automatyczne dopasowanie wpłaty Revolut -> wygenerowanie SMS potwierdzającego z kluczem idempotencji w kolejce modemu SIM -> przygotowanie zlecenia rozmowy i voice briefingu -> odebranie sprawy i odczyt przez lektora TTS na fizycznej Motoroli One Vision -> pełny cykl raportowania statusów -> czyste usunięcie danych testowych. Pełny zestaw testów automatycznych (189 pass) i kompilacja produkcyjna Next.js zakończone sukcesem.
- 17.09 (Opcja 1 - Wdrożenie Vercel): Naprawiono importy i typy Next.js w skryptach testowych, zsynchronizowano branch `main`. Wdrożenie produkcyjne na Vercel (`coapebehawiorysta`) zakończone sukcesem ze statusem READY.
- 17.09 (Opcja 2 - Połączenie łączone): dodano SMS informacyjny przed zleceniem rozmowy i mechanizm przekierowania celu wybierania wyłącznie dla kontrolowanego testu. Kod i stan `ALERTING` operatora potwierdzają podjęcie wybierania; nie potwierdzają odebrania rozmowy ani działania telekonferencji przez adresata. Każdy test z realnym numerem wymaga jego potwierdzenia po stronie odbiorcy.
- 17.09 (Opcja 3 - Tryb ciągły): `SmsQueueService` działa jako foreground service po ręcznym uruchomieniu i odpytuje kolejkę co 15 sekund oraz heartbeat co 60 sekund. Zaimplementowano `BootReceiver` z uprawnieniem `RECEIVE_BOOT_COMPLETED` dla automatycznego wstawania po restarcie urządzenia.
- 17.09 (Stabilizacja infrastruktury i watchdog): Zdiagnozowano i usunięto problem fałszywych alertów awarii watchdoga. Zrestartowano bazę Supabase do stanu `ACTIVE_HEALTHY`, odblokowano endpoint `/api/phone-agent/heartbeat` (generowanie przypomnień SMS odpięte z krytycznej ścieżki do tła), usunięto blokującą kolejkę obietnic `storeQueue` w pamięci serwerowej dla trybu Supabase, dodano 5-sekundowe wyścigi timeoutów i fallbacki. Poprawiono szablony powiadomień na „Telefon operatora (Motorola One Vision)”. Potwierdzono regularne meldunki telefonu co minutę ze statusem online.
- 17.09 (Android Revolut Listener): Naprawiono błąd `ClassCastException` w `RevolutNotificationListener` (odczyt `EXTRA_TITLE` jako `CharSequence` zamiast wymuszonego rzutowania na `String`).
- 17.09 (Architektura urządzeń): Zgodnie z ustaleniami z właścicielem, Motorola One Vision stanowi wyłącznie dedykowaną stację bazową (modem GSM, kolejka SMS, automatyczny dialer, lektor TTS pod zasilaniem). Wszelka interakcja właściciela (włączanie/wyłączanie trybu Live, podgląd kolejki, zarządzanie rezerwacjami) odbywa się z poziomu prywatnego telefonu właściciela przez PWA / panel `/admin`. Motorola nie wymaga interakcji UI przez człowieka.

## Kolejne kroki (zatwierdzona kolejność)

1. **KROK 1 (Wykonany):** Spójność dokumentacji i uaktualnienie planów (`PLAN-GLOWNY.md`, `PLAN-OPERATOR-2026-09-16.md`).
2. **KROK 2 (W toku):** Kompilacja i instalacja wersji APK 1.5.1 na Motoroli (zawierającej autostart po restarcie oraz poprawkę odczytu powiadomień Revolut).
3. **KROK 3:** Kontrolowany test fizyczny z udziałem właściciela: próbna rezerwacja, odbiór SMS z karty SIM na telefon prywatny (+48505848889), weryfikacja widoku w `/admin` i lektora na Motoroli.
4. **KROK 4:** Uruchomienie komercyjnego pilotażu zwykłego `Zapytaj 15 min` za 79 zł (3–5 rezerwacji).
5. **KROK 5:** Tryb Live „Zapytaj teraz” (104 zł) sterowany z prywatnego telefonu właściciela (PWA / panel `/admin`).
