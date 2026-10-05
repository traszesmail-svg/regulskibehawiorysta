# Regulski Operator — Motorola One Vision (Android 7+)

Serwer Next.js i Supabase zarządzają rezerwacjami oraz trwałą kolejką. Telefon wysyła SMS-y w tle. Rozmowy w bieżącej aplikacji są uruchamiane i raportowane ręcznie. Panel PWA na prywatnym telefonie zarządza Live i rezerwacjami; jego link `tel:` wybiera numer na tym prywatnym telefonie.

## Kluczowe moduły aplikacji
1. **Sprawa, ręczne wybieranie i lokalny briefing:**
   - Pobranie opłaconej sprawy, podgląd danych i polski lektor przed rozmową.
   - Wydanie źródłowe `1.5.5`: numer jest wybierany dopiero po udanym przejęciu zadania; podwójne kliknięcie i idempotentne przejęcie nie wybierają go ponownie. Numer i uprawnienie CALL_PHONE są sprawdzane przed przejęciem.
   - Przejęta sprawa jest zachowywana po odtworzeniu ekranu. Niewysłany raport jest zapisywany lokalnie, można go ponowić tym samym przyciskiem, a po uruchomieniu aplikacji ponawiany jest tylko raport. Numer nie jest automatycznie wybierany ponownie.
   - Ręczne zakończenie wysyła jawne `manualCompletion=true`. Nie oznacza automatycznego wykrycia odebrania. Po `no_answer` serwer może przygotować drugą próbę po 2 minutach; to nie jest samoczynne wybieranie przez telefon.
   - Lektor korzysta z lokalnego kanału multimediów i nie wymusza głośności ani trybu rozmowy. Jest blokowany po przejęciu zadania. Nie jest mostem audio do zdalnej słuchawki właściciela.
   - Zamknięcie lokalnego podglądu wymaga potwierdzenia po sprawdzeniu panelu; nie kończy zadania na serwerze.
   - Stare `PhoneAgentService` i `AgentInCallService` nie są zarejestrowane w manifestcie. Limit liczony od odebrania, sygnały czasu, auto-rozłączanie, telekonferencja i bezobsługowy dialer pozostają niewdrożone. OFFHOOK nie dowodzi odebrania przez klienta.
2. **Heartbeat & Watchdog:**
   - Co 60s telefon wysyła heartbeat, baterię, ładowanie i wersję. Sieć i dialer mogą pozostać nieznane; panel pokazuje rzeczywiste dane.
   - Watchdog blokuje Live po 3 minutach bez meldunku i próbuje wysłać PUSH/e-mail do właściciela. Wymaga działającego chronionego harmonogramu. Błąd zapisu lub wyłączenia Live nie jest sukcesem; pominięty alert nie jest oznaczany jako wysłany.
3. **Kolejka SMS z karty SIM:**
   - Co 15s telefon pobiera oczekujące SMS-y (`/api/phone-agent/sms-queue`) i wysyła je z fizycznej karty SIM.
   - Obsługuje przypomnienia 60 min przed rozmową (z opcją przełożenia do 30 min przed startem), 15 min przed rozmową oraz potwierdzenia zaksięgowania płatności.
   - Callback modemu oznacza wysłanie, nie odbiór przez klienta. Dziennik ponawia raporty po awarii, nie samą niejednoznaczną wysyłkę. Autostart usługi SMS jest zapisany w BootReceiver.
4. **Odczyt powiadomień Revolut / BLIK (`RevolutNotificationListener`) — wyłączony:**
   - Techniczny moduł istnieje, lecz serwer domyślnie odrzuca automatyczne uzgadnianie wpłat.
   - Wpłaty BLIK potwierdza się ręcznie. Włączenie flagi pilotażowej wymaga osobnej decyzji po testach, ponieważ powiadomienie bankowe nie jest webhookiem płatniczym.
   - Automat wymaga prawdziwego bankowego `transactionId`, kwoty PLN, jednoznacznej rezerwacji i migracji ledgeru Supabase. Klucz/czas powiadomienia nie jest identyfikatorem bankowym. Listener wysyła je tylko jako metadane; bez bankowego ID wynik pozostaje do ręcznej weryfikacji.

## Granice gotowości
- Źródła i manifest nowego kandydata: `1.5.5` / `10505`. Kontrola ADB 05.10 potwierdziła Motorolę z `1.5.4` / `10504`, uruchomionym SmsQueueService, uprawnieniami SMS/CALL_PHONE i ładowaniem USB. Nowe wydanie nie jest jeszcze zainstalowane.
- `PHONE_CALL_PROVIDER=manual_sim` i `PHONE_AGENT_AUTO_PAYMENT_RECONCILIATION=false` pozostają bezpiecznymi ustawieniami domyślnymi.
- Endpoint watchdoga jest gotowy pod chroniony scheduler (`/api/cron/phone-agent-watchdog`), ale bez skonfigurowanego zewnętrznego harmonogramu nie działa samoczynnie.
- Budowanie APK produkcyjnego wymaga stałego klucza poza repozytorium: `PHONE_AGENT_KEYSTORE_PATH`, `PHONE_AGENT_KEYSTORE_ALIAS`, `PHONE_AGENT_KEYSTORE_PASSWORD`. Parametr `-AllowEphemeralTestSigning` służy wyłącznie do jednorazowego testu.
  Nie zastępuj klucza wydania nowym kluczem; aktualizacja musi zachować podpis oraz dane aplikacji. Test na urządzeniu obejmuje raport po utracie internetu, ponowne uruchomienie, odbiór SMS i rozmowę z potwierdzeniem właściciela.

## Pliki instalacyjne
- Niepodpisany kandydat z kontroli kompilacji: `../../output/operator-20261005/regulski-telefon-1.5.5-unsigned.apk`. Nie jest plikiem do instalacji. Poprzednie APK i klucz pozostają zachowane; nie są równoważnymi kopiami bieżącego wydania.
- Bezpieczny build tworzy nowy katalog i nowy plik; nie czyści wcześniejszego build ani nie nadpisuje starego APK:

```powershell
./build-apk.ps1 -UnsignedCandidate -BuildDirectory C:\projekt\regulskibehawiorysta\output\operator-build-qa -OutputApk C:\projekt\regulskibehawiorysta\output\operator-qa-unsigned.apk
# Po skonfigurowaniu dotychczasowego klucza, podpisane wydanie:
./build-apk.ps1 -OutputApk C:\projekt\regulskibehawiorysta\output\regulski-telefon-1.5.5-release.apk
```

- `tests/CallSessionGuardTest.java` sprawdza blokady podwójnego wybierania i raportowania na JVM. `tests/run-journal-tests.ps1` wymaga urządzenia i instaluje osobny pakiet testowy; samo skompilowanie aplikacji nie zastępuje tego testu.
- [`XPERIA-SETUP.md`](XPERIA-SETUP.md) to historyczna instrukcja starszego urządzenia, nie aktualny dowód gotowości Motoroli.
