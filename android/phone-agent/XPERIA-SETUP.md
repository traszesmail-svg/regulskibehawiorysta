# Xperia F3111 — Regulski Operator (dedykowany telefon stacjonarny)

Telefon Sony Xperia F3111 działa w trybie ciągłego zasilania pod ładowarką jako bezobsługowy wykonawca poleceń serwera („Regulski Operator”). Serwer jest mózgiem, Xperia fizycznym egzekutorem połączeń i SMS-ów.

### 1. Instalacja i pierwsze uruchomienie
1. Skopiuj i zainstaluj `regulski-telefon.apk` wyłącznie po zbudowaniu go stałym kluczem podpisu. Obecne dwa APK są identyczne; `regulski-operator.apk` nie jest oddzielnym wydaniem.
2. Przy pierwszym uruchomieniu przyznaj wymagane uprawnienia systemowe:
   - **Telefon i Zarządzanie połączeniami** (`CALL_PHONE`, `READ_PHONE_STATE`)
   - **Wiadomości SMS** (`SEND_SMS`)
3. Kliknij **„Ustaw jako domyślny telefon (auto-rozłączanie)”** i potwierdź w systemowym oknie Androida 7.
   - *Dlaczego to kluczowe:* Pozwala usłudze `AgentInCallService` na fizyczne, automatyczne rozłączenie rozmowy (`call.disconnect()`) punktualnie w 17:03 (lub 15:03 przy trybie ścisłym).
4. **Nie nadajaj dostępu do powiadomień Revolut/BLIK w pilotażu.** Automatyczne uzgadnianie wpłat jest domyślnie wyłączone; BLIK potwierdzaj ręcznie.

### 2. Konfiguracja serwera i autoryzacji
1. W aplikacji wpisz adres serwera: `https://regulskibehawiorysta.pl`
2. Wpisz token telefonu (`PHONE_AGENT_TOKEN` zgodny z konfiguracją środowiskową serwera).
3. Kliknij **„Zapisz i uruchom agenta”**.
4. Sprawdź testowe przyciski:
   - **„Wyślij Heartbeat”** — sprawdza natychmiastowy kontakt z serwerem i stan baterii/ładowania.
   - **„Sprawdź kolejkę SMS”** — natychmiast sprawdza i wysyła oczekujące SMS-y.

### 3. Ustawienia zasilania i stabilności Sony Xperia
1. Kliknij **„Wyłącz oszczędzanie baterii dla agenta”** i zezwól na brak optymalizacji.
2. W ustawieniach Androida Sony Xperia:
   - **Bateria / STAMINA:** Wyłącz tryb STAMINA lub dodaj Regulski Operator do wyjątków.
   - **Smart Cleaner:** Wyłącz automatyczne czyszczenie pamięci dla aplikacji.
   - **Autostart:** Aplikacja posiada odbiornik `BOOT_COMPLETED`, który po restarcie telefonu samorzutnie wznawia działanie usługi w tle `PhoneAgentService`.
3. Na pasku powiadomień Androida musi stale widnieć powiadomienie: **`Regulski Operator — usługa aktywna`**.

### 4. Działanie systemu i sekwencja czasowa
- **Heartbeat & Watchdog:** Co 60 sekund Xperia wysyła meldunek do serwera. Brak meldunku jest wykrywany dopiero przez skonfigurowany, chroniony scheduler wywołujący `/api/cron/phone-agent-watchdog`; bez niego watchdog nie działa automatycznie. Jeśli scheduler wykryje >3 minuty:
  - Automatycznie wyłącza dostępność konsultacji na żywo (`Zapytaj teraz`).
  - Wysyła natychmiastowy alert PUSH i e-mail awaryjny poza Xperię.
- **Kolejka SMS:**
  - Co 15 sekund aplikacja pobiera zadania z kolejki serwera i wysyła SMS-y z karty SIM.
  - Klient otrzymuje przypomnienie **60 minut przed rozmową** (z linkiem do przełożenia terminu do 30 min przed startem) oraz **15 minut przed rozmową** („miej telefon pod ręką”).
  - W pilotażu SMS potwierdzający płatność jest uruchamiany wyłącznie po ręcznym potwierdzeniu wpłaty.
- **Automatyczna sekwencja rozmowy (15 min + 2 min buforu):**
  - **0:00 – 0:03:** 3 sekundy na powitanie.
  - **0:03:** **1 sygnał dźwiękowy (bip)** — oficjalny start 15 minut meritum.
  - **7:33:** **2 sygnały dźwiękowe** — połowa czasu, przejście do sedna i zaleceń.
  - **15:03:** **3 sygnały dźwiękowe** — koniec części głównej, rozpoczęcie 2 minut podsumowania.
  - **16:55:** Dyskretne ostrzeżenie przed rozłączeniem.
  - **17:03:** Bezwzględne automatyczne rozłączenie połączenia przez aplikację.
- **Obsługa nieodebranych i przerwanych połączeń:**
  - Brak odebrania przez klienta w 45 sekund: licznik nie startuje, serwer planuje automatyczną 2. próbę za 2 minuty.
  - Przerwanie połączenia (< 14 min): pauza licznika, automatyczne ponowienie za 30 sekund.

### 5. Bezpieczeństwo
Nie wpisuj tokenu telefonu do notatek, SMS-ów ani repozytorium git. Nie włączaj `PHONE_CALL_PROVIDER=android_agent` na produkcji przed wykonaniem pełnego testu kontrolnego na numerze prywatnym.
