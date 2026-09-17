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
