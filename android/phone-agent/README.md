# Regulski Operator — Motorola One Vision (Android 7+)

Serwer Next.js i Supabase zarządzają rezerwacjami oraz trwałą kolejką. Telefon wysyła SMS-y w tle. Panel PWA na prywatnym telefonie zarządza Live i rezerwacjami. W wydaniu 1.5.7 wdrożono fundament bezobsługowej centrali GSM z dwiema liniami (`TwoLegConferenceController`, `AgentInCallService`), kwalifikację do roli domyślnego dialera oraz kontrolowany ekran żądania roli.

## Kluczowe moduły aplikacji
1. **Fundament centrali GSM z dwiema liniami (Wydanie 1.5.7):**
   - Automat stanu `TwoLegConferenceController`: `IDLE` → `DIALING_CLIENT` → `CLIENT_ACTIVE` → `CLIENT_HOLDING` → `DIALING_OWNER` → `OWNER_ACTIVE` → `MERGE_PENDING` → `CONFERENCE_ACTIVE` → `COMPLETED` / `FAILED`.
   - Druga linia (do właściciela) może wystartować wyłącznie po twardym zdarzeniu `Call.STATE_ACTIVE` pierwszej linii (klienta) i jej zawieszeniu (`Call.STATE_HOLDING`). Sam `DIALING`, `CONNECTING` ani `OFFHOOK` nie uruchamia połączenia z właścicielem.
   - Scalenie (`merge/conference`) następuje wyłącznie przy potwierdzonej zdolności konferencji platformy Telecom (`Call.Details.CAPABILITY_MERGE_CONFERENCE` / conferenceable calls).
   - Izolacja toru audio: przed zestawieniem konferencji wymuszane jest lokalne wyciszenie mikrofonu centrali (`setMuted(true)`) oraz utrzymanie toru na słuchawce (`ROUTE_EARPIECE`, brak przekierowania na speakerphone). Audio klient ↔ właściciel ma być miksowane w sieci operatora GSM.
   - Fail-closed: jakikolwiek błąd, odrzucenie, timeout (45s na odebranie przez właściciela, 15s na merge) lub rozłączenie którejkolwiek nogi przed aktywną konferencją skutkuje natychmiastowym przerwaniem obu linii, stanem `FAILED`, brakiem fałszywego oznaczenia sukcesu i bezwzględnym brakiem automatycznego redialu.
   - Naliczanie czasu konsultacji: licznik startuje ściśle od zdarzenia `CONFERENCE_ACTIVE`; wybieranie, oczekiwanie, hold i merge nie zużywają limitu konsultacji.
   - Prywatność: `ConferencePhoneMasker` gwarantuje, że żaden surowy numer nie trafia do logów, raportów ani telemetrii.
   - **Status konferencji GSM operatora:** pozostaje jawnie **`UNVERIFIED_UNTIL_PHYSICAL_TWO_LEG_TEST`** (wymaga odrębnego, fizycznego testu z dwoma numerami).
2. **Kwalifikacja dialera i InCallService:**
   - Usługa `AgentInCallService` jest poprawnie zarejestrowana w `AndroidManifest.xml` z uprawnieniem `android.permission.BIND_INCALL_SERVICE` i metadaną `IN_CALL_SERVICE_UI=true`.
   - `MainActivity` deklaruje filtry `android.intent.action.DIAL` (w tym schemat `tel:`), co kwalifikuje aplikację do roli systemowej `RoleManager.ROLE_DIALER`.
   - Ekran `MainActivity` prezentuje dedykowaną sekcję przygotowania centrali i przycisk żądania roli (`requestRoleIntent`), bez samowolnego nadawania roli przez ADB. Automatyczne połączenia centrali są domyślnie wyłączone.
3. **Sprawa, ręczne wybieranie i lokalny briefing:**
   - Pobranie opłaconej sprawy, podgląd danych i polski lektor przed rozmową.
   - Numer jest wybierany dopiero po udanym przejęciu zadania; podwójne kliknięcie i idempotentne przejęcie nie wybierają go ponownie. Numer i uprawnienie CALL_PHONE są sprawdzane przed przejęciem.
   - Przejęta sprawa jest zachowywana po odtworzeniu ekranu. Niewysłany raport jest zapisywany lokalnie, można go ponowić tym samym przyciskiem.
   - Ręczne zakończenie wysyła jawne `manualCompletion=true`.
   - Lektor korzysta z lokalnego kanału multimediów i jest blokowany po przejęciu zadania.
4. **Heartbeat & Watchdog:**
   - Co 60s telefon wysyła heartbeat, baterię, ładowanie (`isCharging`), typ transportu sieci (`network`) oraz flagę domyślnego dialera (`isDefaultDialer`).
   - Watchdog blokuje Live po 3 minutach bez meldunku i próbuje wysłać powiadomienie do właściciela.
5. **Kolejka SMS z karty SIM:**
   - Co 15s telefon pobiera oczekujące SMS-y (`/api/phone-agent/sms-queue`) i wysyła je z fizycznej karty SIM (gdy włączona).
   - W standardowym trybie monitor-only uprawnienie `SEND_SMS` jest cofnięte w Androidzie (`granted=false`).
6. **Odczyt powiadomień Revolut / BLIK (`RevolutNotificationListener`) — wyłączony:**
   - Moduł techniczny nasłuchu powiadomień bankowych pozostaje wyłączony; serwer odrzuca automatyczne uzgadnianie wpłat (`PHONE_AGENT_AUTO_PAYMENT_RECONCILIATION=false`).

## Granice gotowości
- Motorola `ZY323XJ2V7` ma zainstalowane podpisane wydanie `1.5.7` / `10507` z zachowaniem danych aplikacji. Odbiór potwierdził:
  - `versionCode=10507, versionName=1.5.7`;
  - `CALL_PHONE=granted`, `ANSWER_PHONE_CALLS=granted`, `SEND_SMS=granted: false` (cofnięte);
  - `SmsQueueService` działa w trybie foreground (id 21);
  - Heartbeat potwierdzony przez serwer;
  - Rola dialera: `is_default_dialer=false` (domyślny: `com.google.android.dialer`); aplikacja wyświetla ekran żądania roli, rola nie została przyznana automatycznie;
  - Aktywny stan Telecom: 0 połączeń (zero rzeczywistych połączeń).
- **Zdolność sieciowa SIM/operatora do scalania GSM:** pozostaje jawnie `UNVERIFIED_UNTIL_PHYSICAL_TWO_LEG_TEST`. Sama instalacja nie jest dowodem na obsługę konferencji przez operatora T-Mobile na danej karcie SIM.
- Produkcyjny klucz znajduje się poza repozytorium (`LocalApplicationData\RegulskiOperator\signing`), a hasło chronione jest przez Windows DPAPI `CurrentUser`. Wydania buduje wyłącznie `build-release.ps1`, a instaluje `install-release.ps1`.

## Pliki instalacyjne i testy
- Podpisane wydanie produkcyjne kandydata: `regulski-telefon-1.5.7.apk` (zbudowane przez `build-release.ps1`, zweryfikowane przez `apksigner` scheme v2/v3, zipalign 4).
- Testy jednostkowe JVM automatu: `tests/run-all-jvm-tests.ps1` (11 testów `TwoLegConferenceControllerTest` sprawdzających brak 2. linii przed odebraniem 1., przejście hold/merge, brak merge bez capability, timeouty, brak wycieku numerów, start timera od conference active oraz brak auto-redialu).
- Testy na urządzeniu: `tests/run-journal-tests.ps1` (izolowany pakiet testowy na Motoroli `ZY323XJ2V7` — PASS prepare / PASS recover).
- [`XPERIA-SETUP.md`](XPERIA-SETUP.md) to historyczna instrukcja starszego urządzenia, nie aktualny dowód gotowości Motoroli.
