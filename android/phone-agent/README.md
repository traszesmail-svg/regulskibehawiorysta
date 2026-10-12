# Regulski Operator — Motorola One Vision (Android 7+)

Serwer Next.js i Supabase zarządzają rezerwacjami oraz trwałą kolejką. Telefon wysyła SMS-y w tle. Panel PWA na prywatnym telefonie zarządza Live i rezerwacjami. Wydanie 1.5.7 stanowiło fundament centrali, który został odrzucony w niezależnym odbiorze integracyjnym (brak produkcyjnego wywołania startu i rejestracji serwisu, brak runtime schedulera timeoutów, PII w logach, brak interfejsu obsługi/przerwania). Wydanie 1.5.8 domyka pełną integrację produkcyjną, scheduler runtime, prywatność i bezpieczny UI testowy.

## Kluczowe moduły aplikacji
1. **Centrala GSM z dwiema liniami (Wydanie 1.5.8 — domknięta integracja produkcyjna):**
   - Koordynator sesji `ConferenceSessionCoordinator`: procesowo-lokalny koordynator sesji, walidacja i normalizacja numerów wyłącznie w pamięci RAM sesji (zero zapisu na dysku, w SharedPreferences, heartbeat, logcat ani Supabase), pre-flight checks (`AndroidConferencePrerequisites`: rola dialera, SIM gotowa, uprawnienie `CALL_PHONE`, brak trwającego połączenia), rejestracja dokładnie jednego `TwoLegConferenceController` przed pierwszym `placeCall()`, blokada współbieżnych sesji, czyszczenie danych wrażliwych i wyrejestrowanie po stanie terminalnym, fail-closed po restarcie procesu.
   - Most `InCallServiceBridge` & `ProductionTelecomAdapter`: produkcyjna inicjacja pierwszej nogi klienta (`placeClientCall()`) i drugiej nogi (`placeOwnerCall()`), bezpieczne rozwiązanie wyścigu powstawania `AgentInCallService` bez fałszywych atrap, delegowanie akcji platformowych hold, conference, disconnect.
   - Lifecycle-safe scheduler `ConferenceRuntimeScheduler`: `ScheduledExecutorService` zarządzający timeoutem 45s na odebranie przez właściciela (`DIALING_OWNER`), timeoutem 15s na capability/merge (`OWNER_ACTIVE` / `MERGE_PENDING`), cyklicznym tickiem limitu konsultacji podczas `CONFERENCE_ACTIVE`, anulowaniem wszystkich zadań po wejściu w stan terminalny (`COMPLETED`, `FAILED`) lub ręcznym przerwaniu, idempotencją powiązaną z unikalnym ID sesji oraz bezwzględnym brakiem auto-redialu.
   - Automat stanu `TwoLegConferenceController`: `IDLE` → `DIALING_CLIENT` → `CLIENT_ACTIVE` → `CLIENT_HOLDING` → `DIALING_OWNER` → `OWNER_ACTIVE` → `MERGE_PENDING` → `CONFERENCE_ACTIVE` → `COMPLETED` / `FAILED`. Druga noga startuje wyłącznie po `Call.STATE_ACTIVE` i `Call.STATE_HOLDING` pierwszej nogi. Scalenie wyłącznie przy potwierdzonej zdolności `CAPABILITY_MERGE_CONFERENCE`.
   - Izolacja toru audio: przed zestawieniem konferencji wymuszane lokalne wyciszenie mikrofonu centrali (`setMuted(true)`) oraz utrzymanie toru na słuchawce (`ROUTE_EARPIECE`, brak przekierowania na speakerphone).
   - Ochrona prywatności: usunięto jakiekolwiek logowanie `Call.getDetails()`, `Uri`, numerów i obiektów platformowych Telecom. Wprowadzono statyczny test regresji PII `ConferencePrivacyAuditTest` gwarantujący czystość logcat.
   - Status konferencji GSM operatora: pozostaje jawnie **`UNVERIFIED_UNTIL_PHYSICAL_TWO_LEG_TEST`** (wymaga odrębnego, fizycznego testu z dwoma numerami).
2. **Kwalifikacja dialera i InCallService:**
   - Usługa `AgentInCallService` jest poprawnie zarejestrowana w `AndroidManifest.xml` z uprawnieniem `android.permission.BIND_INCALL_SERVICE` i metadaną `IN_CALL_SERVICE_UI=true`.
   - `MainActivity` deklaruje filtry `android.intent.action.DIAL` (w tym schemat `tel:`), co kwalifikuje aplikację do roli systemowej `RoleManager.ROLE_DIALER`.
   - Ekran `MainActivity` (Sekcja 2.5) prezentuje dedykowaną sekcję przygotowania centrali i przycisk żądania roli (`requestRoleIntent`), bez samowolnego nadawania roli przez ADB.
   - Bezpieczny interfejs testowy: jasne oznaczenie „Centrala sieciowa — Motorola nie jest aparatem rozmówcy”, wskaźniki gotowości (Default Dialer, SIM, CALL_PHONE, aktywne połączenie), dwustopniowa zgoda lokalna, podgląd stanu aktywnej sesji oraz duży przycisk awaryjny `PRZERWIJ I ROZŁĄCZ OBA POŁĄCZENIA` gwarantujący bezpieczne natychmiastowe rozłączenie obu linii.
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
- Motorola `ZY323XJ2V7` ma zainstalowane podpisane wydanie `1.5.8` / `10508` z zachowaniem danych aplikacji. Odbiór potwierdził:
  - `versionCode=10508, versionName=1.5.8`;
  - `CALL_PHONE=granted`, `ANSWER_PHONE_CALLS=granted`, `SEND_SMS=granted: false` (cofnięte);
  - `SmsQueueService` działa w trybie foreground (id 21);
  - Heartbeat potwierdzony przez serwer;
  - Rola dialera: `is_default_dialer=false` (domyślny: `com.google.android.dialer`); aplikacja wyświetla ekran żądania roli, rola nie została przyznana automatycznie przez ADB;
  - Aktywny stan Telecom: 0 połączeń (zero rzeczywistych połączeń).
- **Zdolność sieciowa SIM/operatora do scalania GSM:** pozostaje jawnie `UNVERIFIED_UNTIL_PHYSICAL_TWO_LEG_TEST`. Sama instalacja nie jest dowodem na obsługę konferencji przez operatora T-Mobile na danej karcie SIM.
- Produkcyjny klucz znajduje się poza repozytorium (`LocalApplicationData\RegulskiOperator\signing`), a hasło chronione jest przez Windows DPAPI `CurrentUser`. Wydania buduje wyłącznie `build-release.ps1`, a instaluje `install-release.ps1`.

## Pliki instalacyjne i testy
- Podpisane wydanie produkcyjne kandydata: `regulski-telefon-1.5.8.apk` (zbudowane przez `build-release.ps1`, zweryfikowane przez `apksigner` scheme v2/v3, zipalign 4).
- Testy jednostkowe i integracyjne JVM: `tests/run-all-jvm-tests.ps1` (4 zestawy testów: `ConferenceSessionCoordinatorTest`, `TwoLegConferenceControllerTest`, `ConferencePrivacyAuditTest`, `CallSessionGuardTest`).
- Testy serwerowe/operatora Node: 56 testów w 5 zestawach (`call-sessions-durability.test.ts`, `caller-classification.test.ts`, `operator-call-state-safety.test.ts`, `phone-agent-operator.test.ts`, `phone-agent-durability.test.ts`).
- [`XPERIA-SETUP.md`](XPERIA-SETUP.md) to historyczna instrukcja starszego urządzenia, nie aktualny dowód gotowości Motoroli.
