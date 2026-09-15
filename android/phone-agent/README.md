# Regulski Operator — aplikacja telefonu Sony Xperia F3111 (Android 7+)

Dedykowana aplikacja właściciela na telefonie Sony Xperia F3111 działającym w trybie ciągłego zasilania pod ładowarką. Xperia jest fizycznym egzekutorem połączeń i SMS-ów, podczas gdy serwer (`Next.js` + `Supabase`) zarządza logiką biznesową.

## Kluczowe moduły aplikacji
1. **Domyślny Dialer i automatyczne rozłączanie (`AgentInCallService`):**
   - Po nadaniu uprawnienia domyślnego telefonu, aplikacja kontroluje cykl życia połączenia.
   - Po odebraniu rozmowy (OFFHOOK):
     - **0:03:** 1 bip (start 15 minut merytorycznych).
     - **7:33:** 2 bipy (połowa czasu, przejście do sedna).
     - **15:03:** 3 bipy (rozpoczęcie 2 minut podsumowania).
     - **16:55:** Dyskretny sygnał ostrzegawczy.
     - **17:03:** Bezwzględne fizyczne rozłączenie rozmowy (`call.disconnect()`).
   - W przypadku braku odebrania w 45s: zgłoszenie `no_answer`, serwer planuje próbę 2 za 2 minuty.
   - W przypadku zerwania rozmowy (< 14 min): zgłoszenie `dropped`, serwer planuje ponowienie za 30 sekund.
2. **Heartbeat & Watchdog:**
   - Co 60s Xperia raportuje poziom baterii, status ładowania, stan sieci GSM i dialera na endpoint `/api/phone-agent/heartbeat`.
   - W razie braku meldunku przez > 3 minuty serwer automatycznie blokuje `Zapytaj teraz` i wysyła alert PUSH oraz e-mail poza Xperię.
3. **Kolejka SMS z karty SIM:**
   - Co 15s Xperia pobiera z serwera oczekujące SMS-y (`/api/phone-agent/sms-queue`) i wysyła je z fizycznej karty SIM.
   - Obsługuje przypomnienia 60 min przed rozmową (z opcją przełożenia do 30 min przed startem), 15 min przed rozmową oraz potwierdzenia zaksięgowania płatności.
4. **Odczyt powiadomień Revolut / BLIK (`RevolutNotificationListener`) — wyłączony:**
   - Techniczny moduł istnieje, lecz serwer domyślnie odrzuca automatyczne uzgadnianie wpłat.
   - Wpłaty BLIK potwierdza się ręcznie. Włączenie flagi pilotażowej wymaga osobnej decyzji po testach, ponieważ powiadomienie bankowe nie jest webhookiem płatniczym.

## Granice gotowości
- APK jest kandydatem do testu, nie potwierdzeniem działania na Xperii.
- `PHONE_CALL_PROVIDER=manual_sim` i `PHONE_AGENT_AUTO_PAYMENT_RECONCILIATION=false` pozostają bezpiecznymi ustawieniami domyślnymi.
- Endpoint watchdoga jest gotowy pod chroniony scheduler (`/api/cron/phone-agent-watchdog`), ale bez skonfigurowanego zewnętrznego harmonogramu nie działa samoczynnie.
- Budowanie APK produkcyjnego wymaga stałego klucza poza repozytorium: `PHONE_AGENT_KEYSTORE_PATH`, `PHONE_AGENT_KEYSTORE_ALIAS`, `PHONE_AGENT_KEYSTORE_PASSWORD`. Parametr `-AllowEphemeralTestSigning` służy wyłącznie do jednorazowego testu.

## Pliki instalacyjne
- APK do testu: `regulski-telefon.apk`. Nie używaj identycznej kopii `regulski-operator.apk` jako osobnego artefaktu wydania.
- Szczegółowa instrukcja wdrożenia krok po kroku: [`XPERIA-SETUP.md`](file:///C:/projekt/regulskibehawiorysta/android/phone-agent/XPERIA-SETUP.md)
