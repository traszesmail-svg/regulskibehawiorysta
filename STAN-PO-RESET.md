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

## Zdalny dostęp po USB — odczyt 13.10.2026

- Motorola `ZY323XJ2V7` była autoryzowana przez USB. `adb connect 100.118.102.42:5555` zestawił połączenie przez Tailscale; odczyt `adb -s 100.118.102.42:5555 shell getprop ro.serialno` zwrócił ten sam identyfikator urządzenia. Adres Tailscale: `motorola-one-vision.tail0fc3d4.ts.net`.
- Potwierdzono Android 11 oraz aplikację Operator `1.5.8 / 10508`. `CALL_PHONE` i `ANSWER_PHONE_CALLS` są przyznane, `SEND_SMS` jest cofnięte. Bateria podczas odbioru wzrosła z 18% do 21% przy zasilaniu USB.
- Na Wi-Fi zdalny ADB przez Tailscale działał. Po wyłączeniu Wi-Fi do próby sieci komórkowej Tailscale przestał odpowiadać; modem zgłaszał `EDGE`, więc dostęp przez LTE **nie został potwierdzony**. Wi-Fi przywrócono, a Tailscale ponownie odpowiadał. Ustawienie `preferred_network_mode=10,0` nie wskazuje na celowe ograniczenie do 2G; wymaga osobnej diagnostyki zasięgu/usługi danych SIM.
- Po przepięciu kabla z komputera do ładowarki sieciowej `adb devices -l` pokazał wyłącznie urządzenie sieciowe `100.118.102.42:5555`; zdalny odczyt baterii potwierdził `AC powered: true`, `USB powered: false`, 32%. Tailscale odpowiedział bezpośrednio przez Wi-Fi. To potwierdza diagnostykę bez kabla USB z komputerem.
- Aktualizacja 13.10.2026, 14:47 CEST: po ręcznym wyłączeniu Wi-Fi przez właściciela telefon zgłosił `Wi-Fi is disabled` i `gsm.network.type=LTE,Unknown`. ADB przez `100.118.102.42:5555` odczytał `ro.serialno=ZY323XJ2V7`, `AC powered: true`, `USB powered: false`, bateria 39%. Tailscale odpowiedział przez `DERP(waw)` w 56 ms; połączenie nie było bezpośrednie, ale diagnostyka ADB przez LTE działała. Wcześniejszy wynik EDGE dotyczył poprzedniej próby i nie jest już aktualnym ograniczeniem. Po restarcie urządzenia ADB TCP może wymagać ponownego włączenia; trwałość tego kanału po restarcie nie została potwierdzona.
- ADB TCP na porcie 5555 jest rozwiązaniem diagnostycznym do najbliższego restartu telefonu. Po restarcie może wymagać ponownego lokalnego włączenia lub parowania w opcjach programisty. Stały kanał pracy aplikacji to wychodzący heartbeat/API, niezależny od ADB. Ostatni odczyt produkcyjnego heartbeat podczas odbioru: 13.10.2026 14:28 CEST, wersja 1.5.8, Wi-Fi, `isDefaultDialer=false`.
- Ponowne połączenie, gdy telefon nie był restartowany: `adb connect 100.118.102.42:5555`, potem `adb -s 100.118.102.42:5555 devices` lub bezpieczny odczyt `shell getprop ro.build.version.release`. Nie uznawać zdalnego działania po LTE za gotowe przed udanym testem na danych komórkowych.
- Odbiór 13.10.2026, 15:17 CEST: przed restartem ADB przez Tailscale działał na `100.118.102.42:5555` (Motorola `ZY323XJ2V7`, Android 11, AC powered, USB powered false, bateria 81%, `SEND_SMS` nieaktywne). Po kontrolowanym `adb reboot` bez kabla urządzenie pozostało `offline` w ADB, a Tailscale pokazał `offline; last seen 7m ago`; heartbeat i zdalny kanał nie wróciły w obserwowanym oknie. Restart bez kabla: FAIL/UNVERIFIED. Nie wykonywano połączeń GSM ani SMS; test dwóch nóg pozostaje `UNVERIFIED_UNTIL_PHYSICAL_TWO_LEG_TEST`.
- Korekta odbioru punktu 1: lokalny test PDF użył ręcznej ścieżki `Zapłaciłem/am` i mailowego powiadomienia administratora. To nie jest docelowy model właściciela. Docelowo powiadomienie z aplikacji Revolut na Motoroli ma automatycznie rozliczać właściwą wpłatę; bez maila administracyjnego i bez ręcznego klikania. Obecny endpoint auto-rozliczania pozostaje wyłączony i wymaga osobnej implementacji oraz testu dla zamówień materiałowych.
- Wymóg punktu 2 po restarcie: telefon musi automatycznie wystartować Tailscale, odzyskać heartbeat oraz zapewnić dostęp diagnostyczny. Jeśli Android wymaga pierwszego ręcznego odblokowania, ADB nie spełnia kryterium bezobsługowości; trzeba przygotować bezpieczny mechanizm automatycznego odblokowania po restarcie albo przyjąć kanał aplikacyjny jako podstawowy i ADB pozostawić serwisowym.

## Aktualizacja odbioru telefonii GSM — 14.10.2026

- Próba z 14:18 przerwała się, ponieważ ActivityManager zabił Operatora z powodem `permissions revoked`; 9,332 s później Telecom odłączył `AgentInCallService` i przeszedł na awaryjny interfejs Google. To wyjaśnia wcześniejszy objaw. Nie zmieniono źródeł aplikacji.
- W kolejnej, pojedynczej próbie bez zmian uprawnień podczas połączenia aplikacja przeszła przez `ACTIVE`, `HOLDING` i wybranie drugiej nogi. Druga sesja IMS zakończyła się `callSessionStartFailed`, `end-cause 41` (`temporary failure` według 3GPP TS 24.008); właściciel potwierdził, że użyta druga karta/numer testowy nie działa. Automat rozłączył pierwszą nogę. Nie było merge ani testu audio; nie ponawiać na tej karcie do czasu naprawy/podmiany.
- Stan końcowy: Google Dialer domyślny, `SEND_SMS=false`, uprawnienia połączeń zachowane, Telecom idle. Brak wysłanych SMS i brak kolejnych prób połączeń. Autostart po restarcie pozostaje odłożony na koniec.

## Odbiór wizualny pokoju rozmowy — 14.10.2026

- Lokalny `npm run ui-smoke` zakończony exit code 0: telefoniczny, zablokowany wideo i aktywny pokój wideo przeszły. Obejrzano zrzuty 390×844 oraz 1280×960; widoki układają się poprawnie w viewportach, bez widocznego poziomego przepełnienia. `RESPONSIVE PASS`, `VISUAL PASS` dla układu.
- Smoke rejestrował hydration mismatch timera/nagłówka, gdy zegar klienta był celowo przesunięty względem czasu serwera. Jitsi headless nie ma wejścia audio (`gum.not_found`), a część zasobów blokuje testowy browser (`ERR_BLOCKED_BY_CLIENT`); to nie potwierdza działania ani awarii prawdziwego audio.
- Zmieniono wyłącznie `scripts/ui-smoke.ts`: warunkowe zrzuty ekranów, diagnostyka konsoli dla call room i izolowany kontekst `analytics consent=denied` dla zrzutów. Aplikacja, publiczne copy, produkcja i ustawienia telefonu nie były zmieniane.
- Rzeczywista rozmowa audio, merge GSM i dwie nogi pozostają nieodebrane z powodu niedziałającej drugiej karty testowej. Nie ponawiać połączeń na tej karcie.

## Aktualizacja automatycznego Revolut dla PDF — 14.10.2026

- Audyt wykazał, że ścieżka PDF robiła odczyt zamówienia, a następnie ogólne `fulfillCommerceOrder` bez unikalnego claimu; współbieżne powiadomienia mogły oba przejść walidację. Dodano RPC Supabase z blokadą wiersza, unikalnym fingerprintem i unikalnym zamówieniem oraz procesową blokadę dla lokalnego magazynu. Kody dostępu Supabase są generowane przez `randomBytes` w aplikacji i przekazywane do RPC; baza sprawdza format.
- Lokalny test syntetyczny: `tests/payment-reconciliation-safety.test.ts` 8/8 PASS; obejmuje duplikat tej samej transakcji, dwa ID na jedno zamówienie i ponowienie HTTP bez drugiego dostępu. `npx tsc --noEmit` i `git diff --check` PASS. Logi `phone_agent` z pozostałych testów dotyczą wyłącznie izolowanego local JSON sandboxa; test PDF potwierdza brak wpisu do kolejki SMS. E-maile pominięto z braku `RESEND_API_KEY`.
- Migracja `20261014001_atomic_revolut_commerce_reconciliation.sql` nie została zastosowana, kod nie został wdrożony i nie wykonano prawdziwej transakcji ani powiadomienia. Produkcyjna konfiguracja flagi opisana we wcześniejszym wpisie pozostaje osobną, aktualnie zastaną bramką; lokalny odbiór nie jest produkcyjnym odbiorem. Nie zmieniano flagi ani nie wykonywano zewnętrznych operacji.
### Aktualizacja wdrozenia 14.10.2026
- Deployment dpl_8art3FajWxBfVFcRBP2Kgim7A8Uj READY; domena regulskibehawiorysta.pl odpowiada HTTP 200, trasa telefonu bez autoryzacji 401.
- Migracja 20261014001 przeszla test PGlite dla sukcesu, replay, konkurujacych fingerprintow, braku kwoty i zlej kwoty. Nie zostala zastosowana na Supabase: zapytanie i lista migracji timeoutuja podczas tworzenia roli logowania. Kod produkcyjny fail-closed.
- Flagi automatycznego rozliczania nie zmieniano; biezacej wartosci nie potwierdzono. Nie bylo prawdziwej platnosci, powiadomienia z Motoroli, SMS ani telefonu.

### Pozostale zadania z planu
1. Zastosowac migracje 14001 po odzyskaniu polaczenia z Supabase; potwierdzic historie i kontrolowanie odebrac PDF/Revolut.
2. Naprawic lub wymienic druga karte; wykonac jeden kontrolowany test dwoch nog GSM z hold, merge, dwukierunkowym audio i awaryjnym rozlaczeniem.
3. Sprawdzic powrot Tailscale, heartbeat i diagnostyki po restarcie bez kabla oraz 24 h obserwacji zasilania. Autostart zostaje na koniec.
4. Odebrac prawdziwe audio; lokalny smoke i wizualny desktop/mobile sa zaliczone.
5. Pozniej odebrac bramke pilnego terminu, decyzje o uczestniku pilota i partnerze/brandingu. Bez SMS, platnosci testowych i kontaktu z klientami przed osobnymi decyzjami.
6. Na koncu dokonczyc niezawodnosc/autostart i przeglad prywatnych danych oraz synchronizacji konta Google.

### Stan po naprawie Supabase i punktach 1-2 — 14.10.2026

**Supabase / punkt 1 — PASS dla migracji i syntetycznego odbioru.**
- Przyczyna awarii: produkcyjne Vercel SUPABASE_SERVICE_ROLE_KEY miało literalną wartość pustego stringa ""; aplikacja działała w trybie Supabase, lecz nie miała poprawnego klucza serwerowego. W logach występowały timeouty zapytań i odpowiedzi Supabase 521.
- Wykonano jeden kontrolowany restart projektu Supabase. Aktualny stan projektu: ACTIVE_HEALTHY.
- Zmienną zastąpiono aktualnym kluczem service_role pobranym z projektu Supabase i zapisaną jako Vercel Sensitive. Wdrożono produkcyjnie: dpl_wwkJdc2SjBadZLUnsC4mpxm2YVut, status READY, alias regulskibehawiorysta.pl.
- Zastosowano wyłącznie oczekującą migrację 20261014001_atomic_revolut_commerce_reconciliation.sql; historia Supabase potwierdza wersję 20261014001. Tabela claimów ma RLS, a wykonanie RPC ma wyłącznie service_role.
- Odbiór bez realnych pieniędzy: syntetyczne zamówienie i rozliczenie przez produkcyjne RPC, claim PDF, odmowa błędnego e-maila, odmowa replayu oraz drugiego fingerprintu. Cały test wykonano w transakcji zakończonej ROLLBACK; w bazie nie pozostał claim testowy. tests/payment-reconciliation-safety.test.ts: 8/8. Produkcyjny endpoint dostępności odpowiada HTTP 200 i zwraca 132 terminy; endpoint powiadomień bez autoryzacji zwraca 401.
- Nie wykonano prawdziwej płatności Revolut, nie wysłano SMS i nie przetestowano odbioru prawdziwego powiadomienia z telefonu. To pozostaje osobną bramką finansową/telefoniczną. Status live=offline jest stanem usługi live; odczyt kalendarza działa.

**Telefonia / punkt 2 — BLOCKED sprzętowo, bez ponownego dzwonienia.**
- Telefon A jest dostępny przez USB ADB. gsm.sim.state=LOADED,ABSENT: pierwsza karta T-Mobile jest zarejestrowana w sieci, drugi slot nie ma karty. Telecom jest idle (mCallState=0).
- Zdalne ADB 100.118.102.42:5555 odrzuca połączenie, mimo wcześniejszej osiągalności telefonu przez Tailscale.
- Nie wykonano kolejnego połączenia. Włożyć/naprawić drugą kartę, potwierdzić jej rejestrację głosu, a potem wykonać jeden kontrolowany test dwóch nóg, hold, merge, audio i awaryjnego rozłączenia.

**Dalej z planu:** (3) diagnostyka odzyskiwania Tailscale/heartbeat po restarcie i 24 h obserwacji zasilania; (4) odbiór rzeczywistego audio po naprawie dwóch SIM; (5) decyzje i odbiór bramki pilnego terminu oraz pilota; (6) na końcu autostart i przegląd synchronizacji/prywatnych danych Google. Nie uruchomiono pilotu, SMS-ów do klientów ani prawdziwych płatności testowych.

### Korekta odbioru Supabase i telefonii — 14.10.2026

- Pusty `SUPABASE_SERVICE_ROLE_KEY` w Vercel wyjaśniał błąd autoryzacji aplikacji. Timeouty `EAUTHQUERY` podczas provisioningu roli puli Postgresa były osobnym objawem; ich przyczyna pozostaje nieustalona. Po kontrolowanym restarcie połączenie wróciło.
- Migracje `20261014001` i `20261014002` są zastosowane w Supabase. Migracja 14002 tworzy wspólną, atomową blokadę fingerprintu dla rozliczeń rezerwacji i PDF. Produkcyjny test syntetyczny potwierdził: rezerwacja rozliczona, identyczny fingerprint nie przyznał PDF; całość w `ROLLBACK`, bez pozostawionych danych testowych. Deployment `dpl_wwkJdc2SjBadZLUnsC4mpxm2YVut` ma status READY. Nie było prawdziwej płatności, maila ani SMS.
- Odbiór testu dwóch nóg pozostaje zablokowany przez niedziałający numer docelowy `452151983`, potwierdzony wcześniej przez właściciela. T-Mobile w slocie 1 telefonu A jest zarejestrowana i może inicjować połączenie. `LOADED,ABSENT` opisuje pusty slot 2 telefonu A i nie jest wymaganiem hold/merge. Zdalne ADB odrzuca połączenie, ale telefon jest dostępny przez USB. Nie ponawiano połączenia.
- **Następne zadania:** (3) test odzyskania Tailscale/heartbeat po restarcie i 24 h obserwacji; (4) prawdziwe audio po naprawie numeru; (5) decyzje dot. pilota i pilnego terminu; (6) na końcu autostart i przegląd prywatności/synchronizacji Google.
