# Stan prac po resecie — Regulski Behawiorysta / Telefon A

Data zapisu: 2026-10-12

## Cel główny

Telefon A (Motorola One Vision `ZY323XJ2V7`) ma działać jako bezobsługowa centrala GSM:

1. dzwoni do klienta;
2. po twardym potwierdzeniu odebrania (`Call.STATE_ACTIVE`) zawiesza pierwszą linię;
3. dzwoni do właściciela;
4. po odebraniu przez właściciela scala obie linie przez konferencję operatora GSM;
5. rozmowa klient ↔ właściciel jest miksowana w sieci operatora, bez używania mikrofonu i głośnika Motoroli jako aparatu rozmówcy.

Nie wracać do wariantu, w którym człowiek rozmawia przez Motorolę. Telefon B pozostaje wyłącznie koncepcją awaryjną i nie jest obecnym zakresem.

## Aktualny Git i wdrożenie

- Repozytorium: `C:\projekt\regulskibehawiorysta`.
- Branch: `main`.
- Aktualny odebrany commit i `origin/main`: `cad8645650325243f16acf1328420d649ce53d28`.
- Commit: `feat(phone-agent): koordynator sesji centrali, scheduler runtime i bezpieczny UI (v1.5.8)`.
- Znane nieśledzone elementy użytkownika, których nie wolno usuwać ani dodawać bez decyzji właściciela:
  - `docs/`
  - `raportopus.md`
  - `supabase/migrations/20261010001_drop_unused_legacy_commerce_tables.sql`

## Telefon A — stan techniczny

- Wydanie: `1.5.8 / 10508`.
- AGY potwierdził podpisany build, instalację przyrostową, zachowanie danych, heartbeat, foreground `SmsQueueService`, `CALL_PHONE=true`, `ANSWER_PHONE_CALLS=true`, `SEND_SMS=false` i 0 aktywnych rozmów.
- Niezależny odbiór potwierdził produkcyjne podłączenie:
  - `ConferenceSessionCoordinator`;
  - pierwszą nogę przez `placeClientCall()`;
  - rejestrację aktywnego kontrolera przed pierwszym `placeCall`;
  - most do `AgentInCallService`;
  - drugą nogę po `STATE_ACTIVE` i `STATE_HOLDING`;
  - `conference/merge` po capability;
  - runtime scheduler: 45 s na właściciela, 15 s na merge oraz tick limitu rozmowy;
  - ręczny abort obu nóg;
  - fail-closed, brak auto-redialu i brak surowych numerów w logach.
- Aplikacja nadal nie jest domyślnym dialerem. Domyślny dialer ma zostać zmieniony świadomie przez właściciela wyłącznie na czas kontrolowanego testu.
- Podczas końcowego niezależnego odbioru urządzenie przestało być dostępne przez ADB. Po resecie najpierw ponownie podłączyć/odblokować Motorolę i potwierdzić wersję, uprawnienia, heartbeat, domyślny dialer i 0 aktywnych rozmów.

## Odbiór i testy

- `git diff --check cef70cb..cad8645`: PASS.
- JVM Android: PASS:
  - `CallSessionGuardTest`;
  - `TwoLegConferenceControllerTest` — 11 testów;
  - `ConferenceSessionCoordinatorTest` — 11 testów integracyjnych;
  - `ConferencePrivacyAuditTest`.
- Ukierunkowane testy Node: 56 PASS, 0 FAIL:
  - `phone-agent-operator`;
  - `operator-call-state-safety`;
  - `phone-agent-durability`;
  - `call-sessions-durability`;
  - `caller-classification`.
- W trakcie implementacji i odbioru wykonano 0 rzeczywistych połączeń i 0 SMS.

## Ważna historia odbioru

- Wersja 1.5.7 (`cef70cb`) została odrzucona jako kandydat do testu, ponieważ kontroler nie był podłączony produkcyjnie, timery nie działały runtime, a `Call.Details` mogło trafić do logcat.
- Wersja 1.5.8 (`cad8645`) naprawia te trzy blokery.
- Nie powtarzać pracy 1.5.7 ani nie uznawać zielonych testów samego kontrolera za dowód działania centrali.

## Supabase i funkcje planowane

- Incydent Supabase został usunięty jednym kontrolowanym restartem.
- Migracje sekcji 16 od `20261011005` do `20261011009` są wdrożone; 11009 ma wyłączną semantykę deadline.
- Sweep nie ma produkcyjnego crona i nie był uruchamiany produkcyjnie.
- `PHONE_AGENT_AUTO_PAYMENT_RECONCILIATION=false`.
- `SEND_SMS=false` / brak uprawnienia `SEND_SMS`.
- Funkcje pilne dziś/jutro, „Powiadom mnie”, briefing audio, pilot byłych klientów, kody lecznic i testowe 0,01 zł pozostają w planie. Nie uruchamiać ich ani kontaktu z klientami w ramach testu Telefonu A.

## Następny krok — wymaga właściciela

Nie zlecać kolejnego dużego etapu implementacyjnego przed fizycznym testem. Następny krok to jeden kontrolowany test dwóch nóg:

1. podłączyć i odblokować Motorolę; potwierdzić `1.5.8 / 10508`, heartbeat, uprawnienia, `SEND_SMS=false` i brak aktywnych rozmów;
2. właściciel świadomie przyznaje aplikacji `Regulski Operator` rolę domyślnego dialera;
3. właściciel lokalnie wpisuje numer pierwszej nogi testowej i swój numer jako drugą nogę; numerów nie zapisywać w repozytorium ani pamięci projektu;
4. wykonać dokładnie jeden test: klient testowy/IVR → odebranie → hold → połączenie do właściciela → odebranie → merge;
5. potwierdzić dwukierunkowy dźwięk klient ↔ właściciel oraz brak udziału mikrofonu/głośnika Motoroli;
6. sprawdzić przycisk `PRZERWIJ I ROZŁĄCZ OBA POŁĄCZENIA`;
7. po teście przywrócić Google Dialer jako domyślny dialer;
8. zapisać dowody stanów Telecom i wynik, bez surowych numerów.

Jeśli karta SIM T-Mobile lub modem nie udostępni `CAPABILITY_MERGE_CONFERENCE`, test kończy się fail-closed. Dopiero ten dowód uzasadnia rozważenie SIP/PBX; nie wdrażać alternatywy wcześniej.

## Status, którego wolno używać

- `CODE`: PASS.
- `FUNCTIONAL`: kandydat zintegrowany, ale fizyczna konferencja GSM nadal `UNVERIFIED_UNTIL_PHYSICAL_TWO_LEG_TEST`.
- `DEVICE`: instalacja 1.5.8 potwierdzona w raporcie AGY; wymagany ponowny odczyt ADB po podłączeniu.
- `DEPLOYMENT`: commit wypchnięty do `origin/main`; aplikacja zainstalowana według raportu AGY.
- Nie mówić, że centrala działa, dopóki rzeczywisty test dwóch nóg nie potwierdzi hold, drugiej linii, merge i audio sieciowego.
