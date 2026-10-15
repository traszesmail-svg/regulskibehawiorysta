# Plan na jutro — Operator, Motorola i odbiór produkcyjny

## Stan bieżący — 10.10.2026

- Motorola `ZY323XJ2V7` jest dostępna przez ADB; zainstalowano podpisane wydanie Operatora `1.5.6` / `10506`, z zachowaniem danych aplikacji.
- `SmsQueueService` działa jako usługa foreground. `CALL_PHONE` i `ANSWER_PHONE_CALLS` są przyznane (`granted=true`); `SEND_SMS` pozostaje cofnięte (`granted=false`). Telefon działa w bezpiecznym trybie monitor-only (nasłuch kolejki bez wysyłki SMS z karty SIM).
- Heartbeat zapisuje się trwale w Supabase. O 18:54 czasu warszawskiego serwer zapisał wersję `1.5.6`, baterię `100%`, ładowanie `true` (`is_charging=true`), sieć `Wi-Fi` oraz `is_default_dialer=false`; logcat potwierdza odpowiedź serwera. Wcześniejsze błędy meldunku ustały po odzyskaniu dostępności bazy.
- Po wdrożeniu nie pojawiły się nowe wpisy SMS. Kolejka ma `pending=0`, `claimed=0`, `sent=8`, `failed=5`; ostatni wysłany SMS to uzgodniony test z 08.10. Nie ponawiać go.
- Publiczny endpoint dostępności (`/api/zapytaj/availability`) zwraca HTTP `200`. Migracja `20261010002` usunęła redundantny indeks `availability_date_idx` przy zachowaniu klucza unikalnego `availability_booking_date_booking_time_key`. `PHONE_AGENT_AUTO_PAYMENT_RECONCILIATION` pozostaje `false`.
- Rozmowa kontrolna nie została wykonana. Następny krok fizyczny wymaga osobnej zgody właściciela, wskazanego numeru kontrolnego i udziału odbiorcy. Nie kontaktować klientów.

Poniższe sekcje zachowują historię realizacji. W razie sprzeczności obowiązuje najnowsza sekcja stanu.

Data planu: **2026-10-06**

Stan bazowy zapisany: **2026-10-05**

Repozytorium: `C:\projekt\regulskibehawiorysta`

Branch: `main`
Aktualny commit lokalnie, na GitHubie i produkcji: `3b2ef152bbff03cfff4667a1bae9536342f4b0df` (`Harden operator phone and payment workflows`)

## 1. Decyzja nadrzędna

Publiczna treść, oferta i układ strony są zaakceptowaną bazą i pozostają zamrożone. Dalsza praca dotyczy Operatora, Motoroli, płatności, trwałości danych oraz drobnych napraw technicznych. Nie wracamy do starych koncepcji, dawnych landingów, Gumroad, Naffy, przebudowy strony ani zmian copy bez nowej, wyraźnej decyzji właściciela.

Ręczny BLIK pozostaje bezpieczną ścieżką produkcyjną. Automatyczne księgowanie powiadomień Revolut pozostaje wyłączone do czasu wdrożenia i odbioru wszystkich zabezpieczeń. Nie traktować samego istnienia kodu, migracji, endpointu lub historycznego testu jako potwierdzenia bieżącego działania na produkcji.

## 2. Stan wydania 05.10.2026

### Git, GitHub i produkcja

- `HEAD`, `origin/main` i wdrożenie Vercel wskazują ten sam commit `3b2ef152`.
- Deployment Vercel `dpl_9aMnywUChTStnch9MDFXrYi14oSP` ma status `READY` i obsługuje `regulskibehawiorysta.pl` oraz `www.regulskibehawiorysta.pl`.
- Porównano pliki źródłowe wydania: **1723/1723 zgodne z lokalnym commitem**, bez braków i różnic.
- W paczce Vercel nie ma Androida, APK, kluczy podpisu, plików Codex, `tmp`, `output` ani `raportopus.md`.
- Produkcja zachowuje:
  - `APP_DATA_MODE=supabase`,
  - `SMS_PROVIDER=phone_agent`,
  - `PHONE_CALL_PROVIDER=manual_sim`,
  - `PHONE_AGENT_AUTO_PAYMENT_RECONCILIATION=false`.
- Sesja panelu została sprawdzona na produkcji: logowanie zwraca bezpieczne cookie, zapytanie do `/api/admin/lead-bookings` ma `200` z cookie i `401` bez cookie.
- Publiczna strona główna zwraca `200`.
- Nie wykonywano na produkcji próbnej płatności, SMS-u, rozmowy ani mutacji prawdziwych rezerwacji.

### Repozytorium po sprzątaniu

- Dawne koncepcje, nieużywane integracje Gumroad i Naffy, tymczasowe zasoby oraz zbędne przekierowania zostały wcześniej usunięte zgodnie z decyzją właściciela.
- Android, klucze podpisu, APK, lokalne środowiska, katalogi robocze i pliki agentów są wykluczone z wdrożenia strony.
- Wcześniejsze porządki odzyskały około **2,78 GiB** miejsca.
- Aktualny `git status` pokazuje tylko `?? raportopus.md`. Plik jest pozostawiony nietknięty, poza commitem i poza wdrożeniem. Nie wdrażać zawartych w nim propozycji, ponieważ publiczny wygląd i copy są zamrożone.
- W `tmp/operator-fixes-20261005` pozostało około **1,87 MB** własnych plików testowych. Są wykluczone z Git i Vercel. Automatyczna kontrola zablokowała ich zbiorcze usunięcie; jutro można je usunąć dopiero po ponownym sprawdzeniu `git ls-files` i dokładnego celu.
- Zachować artefakt: `output/operator-20261005/regulski-telefon-1.5.5-unsigned.apk` — 30 539 B. To kandydat niepodpisany, a nie wersja produkcyjna.

### Weryfikacja wydania

- Pełne testy: **253 razem / 241 zaliczone / 12 pominiętych / 0 błędów**.
- ESLint: zaliczony bez błędów.
- TypeScript `tsc --noEmit`: zaliczony.
- Produkcyjny build Next.js: zaliczony.
- `git diff --check`: zaliczony.
- Audyt schematu: zaliczony z nowym ledgerem płatności.
- Android 1.5.5: kompilacja Java/D8, kontrola `aapt`, `zipalign` i test `CallSessionGuard` zaliczone.
- Panel sprawdzony w Chrome przy 1440, 390 i 360 px: brak przepełnienia, błędów strony i problemów z długimi etykietami.
- Sprawdzono stany panelu: dostępność, obsługa rozmowy, oczekiwanie na wpłatę, wygaśnięcie Live, nieaktualne dane oraz błąd połączenia.

## 3. Co działa obecnie

### Panel właściciela i Live

- Logowanie hasłem tworzy trwałą, podpisaną sesję `HttpOnly`, `Secure`, `SameSite=Strict` ważną maksymalnie 30 dni.
- Wszystkie poprawione akcje administratora akceptują sesję panelu, a nie wyłącznie nagłówek Basic Auth.
- Panel działa na komputerze i urządzeniu mobilnym/PWA.
- Widoczne są stan Motoroli, bateria, ładowanie, wersja aplikacji, kolejka SMS, błędy oraz najbliższa opłacona rozmowa.
- Status telefonu i Live starzeją się po stronie klienta. Błąd pobrania lub przeterminowane dane nie pozostawiają fałszywego napisu `ONLINE`.
- Panel rozróżnia dostępność, obsługę rozmowy, potwierdzanie wpłaty i stan niepotwierdzony.
- Obsługiwana rozmowa i potwierdzanie wpłaty nie są ukrywane tylko dlatego, że wygasło okno Live.
- Włączenie, przedłużenie, wyłączenie i automatyczne wygaśnięcie Live pozostają dostępne.
- Przycisk `tel:` wykonuje połączenie z urządzenia, na którym otwarto panel. Nie steruje zdalnie Motorolą.

### Rezerwacje i obsługa po rozmowie

- Zwykłe `Zapytaj behawiorystę — 15 min` kosztuje 79 zł.
- `Zapytaj teraz` kosztuje 104 zł wyłącznie po świadomym włączeniu dostępności Live.
- Zwykły termin jest blokowany na 5 minut, a ręcznie zgłoszona wpłata może czekać na decyzję maksymalnie 24 godziny.
- Panel pozwala zatwierdzić albo odrzucić ręcznie zgłoszoną wpłatę.
- Po rozmowie można oznaczyć sprawę jako zakończoną, zapisać rekomendowany następny krok do 1000 znaków, wskazać jeden materiał PDF za 19 zł i wydać kod do pełnej konsultacji za 475 zł.
- Pokój klienta oraz dwa pytania ważne przez 7 dni są osobnymi mechanizmami.
- Nie istnieje osobny, pełny dokument podsumowujący rozmowę. Nie przedstawiać pola rekomendacji jako pełnego raportu.
- Istnieją także mechanizmy kalendarza, cen, kodów, materiałów PDF, opinii, pilnych zgłoszeń i pokoi klienta.

### SMS i heartbeat Motoroli

- Motorola odpytuje kolejkę SMS co około 15 sekund i wysyła heartbeat co około 60 sekund.
- Stan telefonu i kolejka są przechowywane w Supabase.
- Pobieranie SMS jest atomowe; jeden wpis nie powinien zostać przydzielony równolegle dwóm procesom.
- Działają klucze idempotencji, anulowanie starych przypomnień po zmianie lub anulowaniu rezerwacji oraz wygaszanie powiadomień o Live.
- System przygotowuje potwierdzenie płatności oraz przypomnienia około 60 i 15 minut przed terminem.
- Status `sent` oznacza potwierdzenie przekazania wiadomości do modemu Androida. Nie dowodzi doręczenia ani przeczytania SMS-u przez klienta.
- Heartbeat zwraca sukces dopiero po trwałym zapisie. Błąd Supabase nie jest maskowany stanem przechowywanym w pamięci procesu.
- Generowanie przypomnień jest oczekiwane; błąd kolejki nie jest już zgłaszany jako pełny sukces heartbeat.
- Ostatnia kontrola produkcji wykazała świeży heartbeat aplikacji 1.5.4, ładowanie i około 96% baterii.

### Zdarzenia rozmów

- Serwer stosuje kontrolowane przejścia stanów z warunkiem oczekiwanego poprzedniego stanu.
- Zadanie może zostać pobrane tylko dla opłaconej, aktywnej rezerwacji telefonicznej.
- Powtórne zgłoszenie tego samego bezpiecznego zdarzenia jest idempotentne.
- `pending -> ended` jest odrzucane.
- `dialing -> active` wymaga zdarzenia rozpoczęcia w nowym kliencie Android.
- `active -> completed` kończy rozmowę.
- Zainstalowany Android 1.5.4 nie wysyła zdarzenia `started` ani flagi `manualCompletion`. Serwer zachowuje zgodność wyłącznie przy jawnej konfiguracji `PHONE_CALL_PROVIDER=manual_sim` i pozwala ręcznie zakończyć `dialing -> completed`, bez wymyślania czasu odebrania.
- W trybie `android_agent` zakończenie bez potwierdzenia rozpoczęcia nadal jest odrzucane.
- Po braku odpowiedzi kod może zaplanować drugą próbę za 2 minuty; po technicznym przerwaniu aktywnej rozmowy może zaplanować wznowienie za 30 sekund. Obecna aplikacja nie jest jednak bezobsługowym autodialerem.

### Android — kandydat 1.5.5

- Sprawdza numer telefonu i uprawnienie `CALL_PHONE` przed przejęciem zadania.
- Najpierw potwierdza przejęcie zadania na serwerze, dopiero potem pozwala wybrać numer.
- Chroni przed podwójnym kliknięciem, równoległym przejęciem i ponownym wybraniem już przejętego zadania.
- Zachowuje lokalnie identyfikator sprawy, telefon, briefing, szczegóły i stan przejęcia.
- Zachowuje niewysłany raport wyniku i ponawia raport po odzyskaniu połączenia, bez ponownego inicjowania telefonu.
- Lokalny briefing TTS używa kanału multimediów. Nie zmienia maksymalnej głośności, trybu rozmowy ani DSP.
- Briefing jest blokowany po przejęciu sprawy i zatrzymywany przed połączeniem.
- Ręczne połączenie pozostaje osobną funkcją.
- Listener Revolut przekazuje czas i klucz powiadomienia, ale nie posiada potwierdzonego identyfikatora transakcji bankowej.
- Build jest odtwarzalny w izolowanym katalogu. Produkcyjny build wymaga dotychczasowego klucza; skrypt nie tworzy po cichu nowego klucza i nie nadpisuje starego APK.

## 4. Czego nie wolno obecnie uznać za gotowe

- Kandydat Android 1.5.5 nie jest podpisany ani zainstalowany. Motorola nadal używa wersji 1.5.4.
- Nie przeprowadzono dla 1.5.5 fizycznego testu instalacji, restartu, utraty internetu, SMS-u i rozmowy.
- Nie potwierdzono domyślnego dialera, zdalnego uruchamiania rozmowy z panelu, mostu głosowego, telekonferencji ani TTS w słuchawce właściciela.
- Nie potwierdzono automatycznego liczenia 7:30, 15:00 i 17:00 od faktycznego odebrania ani automatycznego rozłączania.
- Stare klasy `PhoneAgentService` i `AgentInCallService` nie są zarejestrowane w bieżącym manifeście. Samo pozostawienie plików źródłowych nie oznacza działającej funkcji.
- Nie potwierdzono, że harmonogram watchdoga faktycznie działa cyklicznie w Supabase. Istnienie endpointu i SQL nie wystarcza.
- Migracja ledgeru Revolut nie została wykonana na produkcji.
- Listener Androida nie dostarcza jeszcze pewnego zewnętrznego identyfikatora transakcji bankowej.
- Ledger zapobiega ponownemu użyciu tej samej transakcji, lecz jego claim i aktualizacja rezerwacji nie tworzą jeszcze jednej atomowej operacji. Równoległe anulowanie może wyprzedzić aktualizację płatności.
- Zadarma pozostaje kodowaną ścieżką awaryjną i nie jest aktywnym dostawcą połączeń.
- Nie wolno przeprowadzać prób na numerach klientów ani wysyłać rzeczywistych wiadomości bez kontrolowanego odbioru.

## 5. Naprawy wykonane 05.10

- Usunięto pamięciowy fallback, który po awarii Supabase mógł sugerować fałszywy stan telefonu `ONLINE`.
- Dodano timeouty dla odczytu i zapisu heartbeat oraz odpowiedzi `503` przy awarii trwałego magazynu.
- Usunięto sukces zanim zakończy się przygotowanie przypomnień SMS.
- Uszczelniono przejścia stanów rozmowy i ich odporność na powtórzenia oraz wyścigi.
- Zachowano zgodność API z ręcznym raportem ze starego APK 1.5.4 w produkcyjnym trybie `manual_sim`.
- Uszczelniono dopasowanie Revolut: wyłącznie dodatnia kwota PLN, jedna jednoznaczna kwota, prawidłowy identyfikator transakcji, UUID albo jednoznaczny pełny numer telefonu.
- Usunięto dopasowanie po samym nazwisku, kwocie lub najstarszej rezerwacji.
- Dodano trwały fingerprint i unikalny ledger transakcji; brak migracji powoduje bezpieczne odrzucenie automatu.
- Wymuszono ręczną weryfikację przypadków niejednoznacznych.
- Poprawiono sesję panelu we wszystkich objętych akcjach administratora.
- Dodano wspólny polling bez nakładania zapytań, timeout, anulowanie po odmontowaniu i ochronę przed nadpisaniem świeżych danych starym wynikiem.
- Usunięto fikcyjne `100%` baterii, fikcyjną wersję APK oraz fałszywe potwierdzenia dostępności.
- Poprawiono etykiety zajętości i błędów w widoku desktopowym oraz mobilnym.
- Dodano strażnika sesji rozmowy i trwałe przechowywanie niewysłanego raportu w Androidzie.
- Test `homepage-live-availability` otrzymał izolowany katalog danych i nie modyfikuje już śledzonych plików `data/*.json`.

## 6. Plan prac na 06.10.2026

### Krok 1 — dostęp do istniejącego klucza podpisu

Warunek: wskazać lokalną konfigurację istniejącego klucza bez wklejania hasła do rozmowy:

- `PHONE_AGENT_KEYSTORE_PATH`,
- `PHONE_AGENT_KEYSTORE_ALIAS`,
- `PHONE_AGENT_KEYSTORE_PASSWORD`.

Nie tworzyć nowego klucza produkcyjnego, ponieważ Android nie pozwoli zaktualizować zainstalowanej aplikacji podpisanej innym kluczem. Nie usuwać istniejącego `android/phone-agent/operator-release.keystore`.

Kryterium zakończenia: podpisany APK 1.5.5 zweryfikowany narzędziem podpisu, zgodny package name i wersja `10505 / 1.5.5`.

### Krok 2 — instalacja 1.5.5 bez kontaktowania klientów

- Przed instalacją odczytać bieżący package/version, uprawnienia i aktywną usługę.
- Zainstalować APK jako aktualizację, bez czyszczenia danych aplikacji.
- Potwierdzić zachowanie tokenu i ustawień.
- Sprawdzić ręczne uruchomienie i zatrzymanie monitorowania SMS.
- Sprawdzić heartbeat, wersję 1.5.5, baterię i ładowanie w panelu.
- Wykonać restart aplikacji i kontrolowany restart telefonu; sprawdzić `BootReceiver` i usługę pierwszoplanową.
- Nie pobierać prawdziwej sprawy, nie wysyłać SMS-u i nie dzwonić na numer klienta w tej fazie.

Kryterium zakończenia: 1.5.5 działa na Motoroli po restarcie, zachowuje konfigurację, wysyła heartbeat i nie wykonuje niezamówionych działań.

### Krok 3 — dostęp administracyjny do Supabase

Warunek: wskazać istniejące połączenie administracyjne lub lokalny plik konfiguracji, bez publikowania sekretów.

- Wykonać migrację `supabase/migrations/20261005001_revolut_payment_reconciliation_ledger.sql`.
- Zweryfikować tabelę claimów, ograniczenie unikalności, funkcję RPC, prawa dostępu i brak dostępu `anon`/`authenticated`.
- Sprawdzić aktywny `pg_cron`/`pg_net` watchdoga oraz historię wykonań.
- Nie włączać jeszcze automatu Revolut.

Kryterium zakończenia: migracja rzeczywiście istnieje w produkcyjnej bazie, RPC działa wyłącznie z właściwymi uprawnieniami, a harmonogram watchdoga ma potwierdzoną historię wykonań.

### Krok 4 — domknięcie atomowości płatności

Przed włączeniem automatu połączyć claim transakcji i warunkową aktualizację rezerwacji w jednej transakcji/RPC albo wprowadzić równoważny warunek CAS obejmujący oczekiwane statusy rezerwacji i płatności.

Minimalne testy:

- ta sama transakcja równolegle nie księguje dwa razy,
- anulowanie rezerwacji pomiędzy odczytem a księgowaniem nie jest nadpisywane,
- brak migracji lub błąd bazy kończy się ręczną weryfikacją,
- dwie rezerwacje z tą samą kwotą nie są zgadywane,
- wiele UUID lub numerów telefonu w jednym powiadomieniu nie księguje płatności,
- błędna waluta, transakcja wychodząca, kwota ujemna/zerowa i niejednoznaczny format są odrzucane.

Kryterium zakończenia: automat nadal pozostaje `false`, ale cały mechanizm przechodzi testy współbieżności i awarii bez możliwości błędnego uznania wpłaty.

### Krok 5 — kontrolowany test fizyczny

Wymaga udziału właściciela i wskazanego numeru testowego. Nie używać numerów klientów.

Kolejność:

1. Utworzyć oznaczoną rezerwację testową.
2. Sprawdzić ręczny BLIK i ręczne zatwierdzenie w panelu.
3. Wysłać dokładnie jeden uzgodniony SMS testowy i potwierdzić odbiór po stronie adresata.
4. Sprawdzić callback modemu, status kolejki i brak duplikatu po utracie internetu.
5. Pobrać sprawę na Motoroli 1.5.5.
6. Odtworzyć briefing TTS lokalnie.
7. Wykonać jedną uzgodnioną rozmowę testową.
8. Sprawdzić `claimed`, `started`, `ended`, ponowienie raportu po utracie internetu oraz brak ponownego wybierania numeru.
9. Sprawdzić zakończenie sprawy, rekomendację, kod konsultacji i pokój klienta.
10. Usunąć wyłącznie dane utworzone przez kontrolowany test.

Kryterium zakończenia: odbiorca potwierdza SMS i rozmowę, panel pokazuje prawidłowe stany, a logi nie zawierają duplikatów ani nieuprawnionych przejść.

### Krok 6 — decyzja o pilotażu

Po zaliczeniu kroków 1–5 uruchomić mały, ręcznie nadzorowany pilotaż 3–5 zwykłych rezerwacji `Zapytaj` po 79 zł. Automatyczny Revolut i pełne bezobsługowe połączenia nie są warunkiem tego pilotażu. Tryb Live za 104 zł włączać wyłącznie świadomie z panelu, kiedy operator jest faktycznie dostępny.

## 7. Drobne porządki na jutro

- Ponownie sprawdzić, że `tmp/operator-fixes-20261005` znajduje się dokładnie pod workspace i nie zawiera plików śledzonych przez Git; następnie usunąć tylko ten katalog testowy i podać faktycznie odzyskane miejsce.
- Zostawić `raportopus.md` poza Git i wdrożeniem do osobnej decyzji właściciela. Rekomendacja: przenieść go później do archiwum poza repo, ponieważ dotyczy publicznego audytu, który nie jest aktywnym kierunkiem prac.
- Zachować niepodpisany APK 1.5.5 do czasu wytworzenia podpisanej wersji; po udanym podpisaniu i instalacji zdecydować, czy kandydat unsigned nadal jest potrzebny.
- Po pracy sprawdzić `git status`, `origin/main`, commit Vercel, status `READY` i zgodność źródeł. Nie dodawać do commita danych testowych, sekretów, kluczy, APK ani plików tymczasowych.

## 8. Zasady bezpieczeństwa i raportowania

- `queued` nie oznacza wysłanego SMS-u, `sent` nie oznacza doręczonego, a heartbeat nie oznacza zdolności wykonania rozmowy.
- `phone_agent_active` jest stanem serwera; dopiero potwierdzone zdarzenie z właściwego klienta może oznaczać odebranie połączenia.
- Nie uruchamiać `PHONE_AGENT_AUTO_PAYMENT_RECONCILIATION=true` przed migracją, atomowym księgowaniem i kontrolowanym odbiorem.
- Nie uruchamiać lokalnie aplikacji z rzeczywistym `.env.local`, jeśli test może dokonać płatności, wysłać SMS, zadzwonić lub zmienić Supabase. Do testów używać izolowanego środowiska z pustymi sekretami i lokalnym magazynem.
- Nie odwiedzać testowo produkcyjnego `/kwadrans-na-juz/start`, ponieważ żądanie może tworzyć rzeczywisty stan rezerwacji.
- Nie raportować instalacji, migracji, harmonogramu, SMS-u, rozmowy ani automatu jako działających bez sprawdzenia rzeczywistego rezultatu.
- Każdy commit ma obejmować wyłącznie cel etapu. Publiczne copy i układ pozostają poza zakresem.

## 9. Szybka lista startowa na jutro

1. Sprawdzić `git status`, `git log -1`, `origin/main` i wdrożenie Vercel.
2. Potwierdzić świeży heartbeat Motoroli bez wykonywania mutacji.
3. Uzyskać lokalny dostęp do hasła istniejącego klucza podpisu.
4. Podpisać i zweryfikować APK 1.5.5.
5. Zainstalować aktualizację z zachowaniem danych i wykonać testy bez SMS/rozmów.
6. Uzyskać dostęp administracyjny do SQL Supabase.
7. Wdrożyć i zweryfikować ledger oraz watchdog.
8. Domknąć atomowe księgowanie przed jakąkolwiek decyzją o automacie.
9. Wykonać kontrolowany test fizyczny dopiero z udziałem właściciela.
10. Po pozytywnym odbiorze zdecydować o pilotażu 3–5 rezerwacji.

## 10. Rekomendacja końcowa

Najbezpieczniejsza kolejność to: **podpis i instalacja 1.5.5 → weryfikacja telefonu bez kontaktowania klientów → migracja i kontrola Supabase → atomowość płatności → jeden kontrolowany SMS i telefon → mały ręcznie nadzorowany pilotaż**.

Obecne wydanie strony i panelu jest gotową bazą dla tej pracy. Nie ma powodu zmieniać publicznego wyglądu ani treści. Największe pozostałe ryzyka znajdują się w fizycznym odbiorze Androida, dostępie administracyjnym do Supabase i przyszłym automatycznym księgowaniu, nie w warstwie publicznej strony.

## 11. Stan wykonania — 07.10.2026

### Wykonane

- Odświeżono stan Git i urządzenia. Motorola jest podłączona jako `motorola_one_vision`; zainstalowany pakiet `pl.regulski.phoneagent` nadal ma `versionCode=10504` i `versionName=1.5.4`.
- Zweryfikowano niepodpisany kandydat `output/operator-20261005/regulski-telefon-1.5.5-unsigned.apk`: pakiet `pl.regulski.phoneagent`, `versionCode=10505`, `versionName=1.5.5`.
- Odczytano SHA-256 certyfikatu zainstalowanej aplikacji bez zmieniania telefonu. Nie podpisano ani nie instalowano kandydata.
- Domknięto krok 4 w kodzie: nowa migracja `20261007001_atomic_revolut_payment_reconciliation.sql` dodaje transakcyjne RPC z blokadą wiersza, fingerprintem i CAS na kwotę oraz dozwolone statusy. Serwer korzysta z jednej operacji zamiast osobnego claimu i aktualizacji rezerwacji.
- Błąd lub brak RPC kończy endpoint odpowiedzią `503` i `requiresManualReview: true`.
- Lokalny `.env.local` miał niebezpieczną wartość automatu `true`; zmieniono ją na `false`. Pobrana konfiguracja produkcyjna pozostawała `false`.
- Testy: `payment-reconciliation-safety` 5/5, `phone-agent-operator` 10/10, `tsc --noEmit`, audyt schematu i `git diff --check` — zaliczone.
- Usunięto wyłącznie `tmp/operator-fixes-20261005` po potwierdzeniu, że zawierał 45 plików, 1 872 111 B i zero plików śledzonych przez Git. Pomiar wolnego miejsca wzrósł o 1 966 080 B.
- Bieżący odczyt `origin/main` nadal wskazuje `3b2ef152bbff03cfff4667a1bae9536342f4b0df`; deployment `dpl_9aMnywUChTStnch9MDFXrYi14oSP` nadal ma status `Ready` i aliasy produkcyjne. Dzisiejsze zmiany nie zostały zacommitowane ani wdrożone.

### Nadal zablokowane

- Krok 1: istniejący keystore jest obecny, ale brak lokalnej konfiguracji `PHONE_AGENT_KEYSTORE_PATH`, `PHONE_AGENT_KEYSTORE_ALIAS` i `PHONE_AGENT_KEYSTORE_PASSWORD`. Nie tworzono nowego klucza.
- Krok 2: 1.5.5 nie jest podpisany ani zainstalowany. Przed uruchomieniem usługi trzeba zapewnić izolację od produkcyjnej kolejki SMS; `BootReceiver` może rozpocząć monitoring po restarcie.
- Krok 3: brak administracyjnego połączenia SQL. Odczyt REST ledgeru nie odpowiedział w limicie czasu, więc nie potwierdzono ani nie wykluczono wdrożenia wcześniejszej migracji. Nie uruchamiano watchdoga.
- Nowa migracja nie została wdrożona na PostgreSQL. Lokalne testy nie dowodzą działania blokad, transakcji ani uprawnień RPC w produkcji.
- Kroki 5–6 wymagają wskazanego przez właściciela numeru testowego, świadomego udziału w jednym SMS-ie i połączeniu oraz osobnej decyzji o pilotażu.

### Następny bezpieczny krok

Udostępnić lokalnie konfigurację istniejącego klucza podpisu oraz administracyjne połączenie SQL bez publikowania sekretów. Następnie podpisać i zweryfikować APK, wdrożyć migracje w kolejności, odczytem sprawdzić prawa RPC i historię watchdoga, a dopiero potem przygotować izolowany odbiór urządzenia.

### Aktualizacja po awarii Supabase i porządkach

- Projekt `beh2` został uruchomiony ponownie przez oficjalny endpoint Supabase i wrócił do `ACTIVE_HEALTHY`.
- Produkcyjny `/api/zapytaj/availability` ponownie zwraca `storageAvailable: true`, `liveError: false`, `slotsError: false` oraz rzeczywiste terminy.
- Inwentarz wykazał bazę o rozmiarze około 47 MB. Dane użytkowe były małe; głównym zbędnym zbiorem była historia `cron.job_run_details`: 160 465 wpisów i około 32 MB.
- Usunięto 113 939 technicznych wpisów `pg_cron` starszych niż 14 dni, zachowując historię potrzebną do diagnostyki. Wykonano `VACUUM (ANALYZE)`.
- Wdrożono migracje `20261005001`, `20261007001`, `20261007002` i `20261007003`. Historia lokalna i zdalna jest zgodna.
- Retencja `regulski-cron-history-retention` działa codziennie o `03:17` i zachowuje 14 dni historii.
- RPC płatnicze oraz funkcja retencji mają `EXECUTE=false` dla `anon` i `authenticated`, a `EXECUTE=true` wyłącznie dla `service_role`.
- Automatyczne uzgadnianie Revolut pozostaje wyłączone. Nadal otwarte są podpisanie i instalacja APK 1.5.5 oraz kontrolowany test fizyczny.

## 12. Stan wykonania — 08.10.2026

### Potwierdzone dzisiaj

- `HEAD` i `origin/main` nadal wskazują `3b2ef152`; bieżące zmiany Operatora pozostają lokalne i nie zostały wdrożone jako nowe wydanie aplikacji webowej.
- Deployment `dpl_9aMnywUChTStnch9MDFXrYi14oSP` nadal ma status `Ready` i obsługuje domeny produkcyjne.
- `supabase migration list` potwierdziło zgodność lokalną i zdalną migracji `20261005001`, `20261007001`, `20261007002` i `20261007003`. Migracji nie uruchamiano ponownie.
- Pełny pakiet testów webowych zakończył się wynikiem **262 / 250 zaliczonych / 12 pominiętych / 0 błędów**. ESLint, `tsc --noEmit` i `git diff --check` również przeszły.
- Test JVM `CallSessionGuard` oraz izolowany test dziennika SMS na Motoroli przeszły (`PASS prepare`, `PASS recover`). Pakiet testowy nie miał uprawnień SMS/rozmów i został odinstalowany.
- Zbudowano świeży, wyrównany kandydat `output/operator-20261008/regulski-telefon-1.5.5-unsigned.apk`: pakiet `pl.regulski.phoneagent`, `versionCode=10505`, `versionName=1.5.5`, SHA-256 `9AED17EE8C054A32855DBCC26600EA577B3A907BBE91A9969B8E3D3CAD194645`. Kandydat pozostaje niepodpisany i nie wolno go instalować.
- Zainstalowana aplikacja 1.5.4 i zachowany lokalny APK 1.5.4 mają ten sam certyfikat SHA-256: `d5e49138019e81dc8dc625f613663392e4205a42e86df4b3b7036d14de0ad824`.

### Aktualny stan telefonu i blokada

- Motorola jest widoczna przez ADB jako `motorola_one_vision`; nadal ma `1.5.4 / 10504`, a `SmsQueueService` i listener powiadomień są uruchomione.
- Ostatni trwały heartbeat w Supabase pochodzi z `2026-10-07T10:17:17.38Z`. Przy kontroli 08.10 miał około 18 godzin, dlatego telefonu nie można uznać za `ONLINE`, mimo połączenia przez USB.
- Istnieją klucze `operator-release.keystore`, `operator-v2.keystore` oraz przechowywany poza repozytorium `C:\Users\chris\AppData\Local\RegulskiOperator\signing\motorola-current.keystore`. Użytkownik nie ustanawiał dla nich hasła. Historia wykonania wykazała, że wcześniejsza automatyzacja utworzyła i używała tych kluczy, lecz nie zachowała konfiguracji klucza, którym 21.09 podpisano zainstalowane 1.5.4. To błąd wcześniejszego procesu wydawniczego, a nie brak danych po stronie właściciela.
- Nie podpisano i nie instalowano 1.5.5. Nie tworzono nowego klucza i nie próbowano aktualizacji innym certyfikatem.

### Następny krok wymagający właściciela

Nie udało się odzyskać konfiguracji klucza odpowiadającego certyfikatowi `d5e491...ad824`, dlatego aktualizacja `adb install -r` z zachowaniem danych jest zablokowana. Przygotowano zweryfikowany wariant `output/operator-20261008/regulski-telefon-1.5.5-rekey.apk`, podpisany zachowanym kluczem `motorola-current.keystore`. Produkcja ma zero oczekujących/przejętych SMS-ów i zero aktywnych/oczekujących rozmów telefonu, a konfigurację serwera można odtworzyć z lokalnego środowiska. Jednorazowa reinstalacja tym kluczem wymaga jednak świadomej zgody, ponieważ usuwa lokalne dane starej aplikacji. Jeden SMS, jedna rozmowa i pilotaż 3–5 rezerwacji nadal wymagają wskazanego numeru testowego i świadomego udziału właściciela.

## 13. Odbiór Operatora 1.5.5 — 08.10.2026

- Właściciel zatwierdził kontrolowaną reinstalację po utracie konfiguracji historycznego klucza przez wcześniejszy proces wydawniczy.
- Utworzono nowy stały klucz produkcyjny poza repozytorium. Losowe hasło jest przechowywane wyłącznie jako zaszyfrowany blob Windows DPAPI `CurrentUser`; metadane nie zawierają hasła. Kolejne wydania należy budować przez `android/phone-agent/build-release.ps1`.
- Finalny artefakt `output/operator-20261008/regulski-telefon-1.5.5-production.apk` ma pakiet `pl.regulski.phoneagent`, `versionCode=10505`, `versionName=1.5.5`, SHA-256 `96C984FF4DC35E1F1F50016E481B91EEA5CB3AF7B2D54958B4B70BFEFD1369AF` i certyfikat SHA-256 `f55c84bf8a98f7f13ba83b0ed5561ba1065a28d28adf6fac116addfdbae712c3`. Podpis v2/v3 i `zipalign` przeszły.
- Stara aplikacja 1.5.4 została zatrzymana i odinstalowana, a 1.5.5 zainstalowana na Motoroli `ZY323XJ2V7`. Przywrócono `CALL_PHONE`, `ANSWER_PHONE_CALLS`, listener powiadomień i wyjątek optymalizacji baterii. `SEND_SMS` pozostaje jawnie nieprzyznane.
- Operator działa w trybie monitorowania bez wysyłki SMS. Przed i po reinstalacji kolejka miała `pending=0`, `claimed=0`, `sent=7`, `failed=5`; nie wystąpiło przejęcie ani wysłanie SMS podczas odbioru.
- Początkowy brak heartbeat wynikał z wyłączonego Wi-Fi i braku aktywnej sieci domyślnej telefonu. Włączono zapisaną sieć `CGA2121`; serwer potwierdził meldunek 1.5.5 o `2026-10-08T05:07:07.307Z`.
- Automatyczne uzgadnianie Revolut pozostaje wyłączone. Kontrolowany SMS, rozmowa i pilotaż nie zostały uruchomione.

## 14. Kontrolowany SMS — 08.10.2026

- Na wskazany przez właściciela numer testowy wysłano dokładnie jeden SMS o treści oznaczonej jako kontrolny test techniczny. Wpis `7c6e1e8d-bf56-4c34-a7fa-f0b40bb8490a` przeszedł `pending -> claimed -> sent`; modem zgłosił `sent_at=2026-10-08T05:22:44.941Z`. Ten status potwierdza wysłanie przez modem, nie doręczenie do odbiorcy.
- Po teście kolejka miała `pending=0` i `claimed=0`. Na 08.10 nie było potwierdzonych rezerwacji mogących wygenerować przypomnienie.
- Przed cofnięciem tymczasowego uprawnienia `SEND_SMS` połączenie USB/ADB ponownie zniknęło. Rozmowa testowa nie została uruchomiona. Do czasu odzyskania ADB należy nacisnąć w aplikacji `Zatrzymaj operatora`; po odzyskaniu połączenia trzeba cofnąć `SEND_SMS`, uruchomić monitorowanie bez SMS i dopiero potem wykonać jedną rozmowę kontrolną.

## 15. Plan funkcjonalny — połączenia przychodzące, oddzwanianie po przerwaniu i kontrolowane testy SMS

### 15.1. Stan faktyczny i obecne ograniczenia techniczne
- **Bieżący stan urządzenia i aplikacji:** Motorola `ZY323XJ2V7` z zainstalowanym wydaniem Operatora `1.5.6` ma trwale zaraportowane `is_default_dialer=false`. Uprawnienie `SEND_SMS` pozostaje cofnięte (`granted=false`), aplikacja działa w bezpiecznym trybie monitor-only (nasłuch kolejki bez wysyłki), a połączenia są skonfigurowane jako `PHONE_CALL_PROVIDER=manual_sim`.
- **Brak wdrożonego automatu przychodzącego:** W systemie nie ma wdrożonej ani zarejestrowanej bezobsługowej usługi `InCallService`, automatycznego IVR, dwuliniowej telekonferencji ani mostka telekomunikacyjnego (voice bridge) zestawiającego klienta z właścicielem.
- **Brak wykrywania odebrania i wznawiania czasu:** Nie istnieje zweryfikowany mechanizm wykrywania fizycznego odebrania połączenia przez obie strony, pomiaru przerw w transmisji głosu ani automatycznego zatrzymywania i wznawiania naliczania czasu konsultacji.
- **Status funkcjonalności:** Funkcja ta jest **wymaganiem technicznym i biznesowym, a nie gotową ani uśpioną możliwością**. Samo występowanie historycznych klas w kodzie lub dawnych szkiców serwisów nie oznacza działającej usługi.

### 15.2. Model stanów sesji i trwałość danych
- **Model danych sesji (`call_sessions`):**
  - `call_session_id` (UUID) — unikalny identyfikator techniczny sesji połączenia.
  - `booking_id` (UUID) — klucz powiązanej rezerwacji konsultacji w Supabase.
  - `caller_phone_fingerprint` (TEXT) oraz `caller_phone_masked` (TEXT) — bezpieczna identyfikacja dzwoniącego: deterministyczny HMAC/fingerprint (bez zapisu surowego numeru w call_sessions i logach) oraz zamaskowana wskazówka audytowa (np. `+48 600 *** 700`), zabezpieczone pod kątem RODO i polityki prywatności.
  - `limit_seconds` (INTEGER) — całkowity limit czasu trwania konsultacji (domyślnie 900 s).
  - `answered_at` (TIMESTAMPTZ) — potwierdzony moment odebrania połączenia przez strony.
  - `interrupted_at` (TIMESTAMPTZ) — potwierdzony moment technicznego lub sieciowego przerwania aktywnej konsultacji.
  - `resume_window_expires_at` (TIMESTAMPTZ) — znacznik wygaśnięcia okna na oddzwonienie po przerwaniu (np. 15 minut od interrupted_at).
  - `elapsed_seconds` (INTEGER) — łączny efektywny czas trwania połączonej rozmowy przed przerwaniem (w sekundach).
  - `remaining_seconds` (INTEGER) — pozostały limit czasu konsultacji (np. `limit_seconds - elapsed_seconds` dla konsultacji 15-minutowej).
  - `version` (INTEGER) — numer wersji do ochrony współbieżności i atomowych aktualizacji CAS.
  - `idempotency_key` (VARCHAR) — unikalny klucz operacji zabezpieczający przed duplikacją zdarzeń.
  - `state` — aktualny stan automatu.
- **Dopuszczalne statusy sesji:**
  - `active` — aktywna, trwająca konsultacja telefoniczna z klientem.
  - `interrupted` — potwierdzone przerwanie aktywnej rozmowy przed upływem limitu czasu.
  - `waiting_for_owner` — klient oddzwonił w oknie ważności; aktywna sprawa została rozpoznana; klient słyszy komunikat o oczekiwaniu; trwa sygnalizacja do właściciela.
  - `bridging` — faza zestawiania dwustronnego mostka audio pomiędzy klientem a właścicielem.
  - `resumed` — mostek skutecznie zestawiony; konsultacja wznowiona; czas jest dalej odliczany z zachowanej puli `remaining_seconds`.
  - `completed` — konsultacja zakończona (wyczerpanie limitu czasu lub formalne rozłączenie po zrealizowaniu sprawy).
  - `failed` — błąd techniczny zestawienia, brak dostępności właściciela po wyczerpaniu prób lub wygaśnięcie dopuszczalnego okna na oddzwonienie.
- **Zasada rozliczania czasu:**
  - Czas oczekiwania klienta na linii w stanach `waiting_for_owner` oraz `bridging` **bezwzględnie nie zużywa limitu konsultacji**.
  - Pula `remaining_seconds` zmniejsza się wyłącznie podczas aktywnego, połączonego dialogu stron (`active` oraz `resumed`).
- **Idempotencja i audyt zdarzeń:**
  - Każde przejście stanu i zdarzenie telefoniczne jest rejestrowane w trwałym dzienniku audytowym `call_session_events` z unikalnym kluczem idempotencji.
  - Aktualizacje stanu sesji wymagają transakcyjnych blokad wiersza (CAS / row-level lock w PostgreSQL/Supabase), aby wykluczyć wyścigi i duplikację webhooków sieciowych.

### 15.3. Rozdzielenie scenariuszy połączeń przychodzących
- **Scenariusz A: Rozpoznany callback aktywnej konsultacji (oddzwonienie po przerwaniu)**
  1. *Warunek:* Połączenie przychodzące z numeru powiązanego z rezerwacją w stanie `interrupted` w ramach dopuszczalnego okna powrotu (np. do 15 minut od potwierdzonego `interrupted_at`).
  2. *Komunikat dla klienta:* Klient natychmiast słyszy komunikat głosowy informujący o rozpoznaniu aktywnej konsultacji i oczekiwaniu na ponowne połączenie z behawiorystą.
  3. *Kontakt z właścicielem:* System sygnalizuje połączenie Operatora z właścicielem i przechodzi w fazę zestawiania (`bridging`).
  4. *Wznowienie konsultacji:* Po skutecznym zestawieniu obu stron stan sesji przechodzi w `resumed`. Konsultacja jest kontynuowana z czasem `remaining_seconds` liczonym dokładnie od potwierdzonego momentu przerwania.
  5. *Ochrona limitu:* Czas oczekiwania na połączenie z właścicielem nie pomniejsza limitu klienta.
- **Scenariusz B: Połączenie nieuprawnione lub nowe (brak aktywnej konsultacji)**
  1. *Warunek:* Połączenie przychodzące z numeru, dla którego nie ma aktywnej, opłaconej i przerwanej rezerwacji w bieżącym oknie czasowym (nowy numer, sprawa zakończona, brak opłaty lub termin w innym czasie).
  2. *Komunikat głosowy:* Dzwoniący słyszy komunikat, że bezpośrednia rozmowa z behawiorystą wymaga wcześniejszego wybrania i opłacenia terminu w serwisie.
  3. *Zakaz łączenia:* **Bezwzględny zakaz automatycznego łączenia dzwoniącego z właścicielem** — ochrona czasu i spokoju właściciela. Połączenie zostaje rozłączone po komunikacie.
  4. *Idempotentny SMS z linkiem:* Po rozłączeniu system może zarejestrować w kolejce dokładnie jeden, idempotentny SMS kierujący do oficjalnego wyboru terminu w usłudze „Zapytaj behawiorystę”.
  5. *Limit antyspamowy:* Obowiązuje ścisły limit maksymalnie 1 SMS na dany numer w ciągu 24 godzin, niezależnie od liczby kolejnych prób połączeń.

### 15.4. Bramka decyzji architektonicznej (Decision Gate)
- **Ograniczenia bieżącego trybu `manual_sim`:**
  - Obecna architektura oparta o pojedynczą kartę SIM w smartfonie Motorola może nie zapewniać technicznej możliwości realizacji stabilnego, dwustronnego mostka głosowego (jednoczesne odebranie linii przychodzącej od klienta, zawieszenie jej, zestawienie połączenia do właściciela i zmostkowanie strumieni audio na poziomie hardware/modemu GSM).
- **Porównanie wariantów przed podjęciem decyzji:**
  - *Wariant 1 (Android Default Dialer / InCallService):*
    Wymaga zmiany konfiguracji telefonu na `is_default_dialer=true`, implementacji pełnego `InCallService`, obsługi `TelecomManager`, `Conferenceable` i uprawnień systemowych dialera. Niesie krytyczne ryzyko blokad ze strony operatora GSM, braku obsługi multi-party call w danej taryfie, degradacji jakości audio oraz niestabilności na fizycznym urządzeniu.
  - *Wariant 2 (Kontrolowany dostawca telekomunikacyjny / Chmurowy IVR / SIP Trunk):*
    Ruch przychodzący kierowany jest na dedykowany numer obsługiwany przez profesjonalną platformę telekomunikacyjną (np. Zadarma PBX / Twilio / trunk SIP). Platforma zapewnia odtwarzanie zapowiedzi głosowych, webhooki do Supabase z precyzyjnymi znacznikami czasu odebrania i rozłączenia, stabilne mostkowanie połączeń do telefonu właściciela oraz bezwzględne rozłączanie po wyczerpaniu limitu sekund.
- **Rygor bramki decyzyjnej:** Nie wolno deklarować wykonalności wariantu opartego na aplikacji Android bez fizycznego testu technicznego na urządzeniu i potwierdzenia obsługi przez kartę SIM. W razie jakichkolwiek ograniczeń sprzętowych lub operatora GSM, Wariant 2 stanowi właściwą ścieżkę realizacji.

### 15.5. Kolejność etapów wdrożenia
1. **Etap 1 — Serwerowy model sesji i idempotencja:** Zaprojektowanie i wdrożenie tabel `call_sessions` i `call_session_events` w Supabase, obsługa transakcyjnych funkcji RPC w PostgreSQL z blokadami wiersza i kluczami idempotencji.
2. **Etap 2 — Klasyfikacja numeru i polityka prywatności:** Implementacja logiki dopasowywania dzwoniącego do rezerwacji, normalizacja E.164, maskowanie numerów w logach audytowych i weryfikacja zgodności z RODO.
3. **Etap 3 — Generator bezpiecznego SMS:** Przygotowanie bezpiecznego szablonu wiadomości z oficjalnym linkiem do „Zapytaj behawiorystę”, obsługa idempotencji oraz limitera wysyłek (rate limit: max 1 SMS / 24h na numer).
4. **Etap 4 — Kontrolowany test SMS:** Wykonanie pojedynczego testu SMS ściśle według zasad właściciela (wyłącznie na wskazany numer kontrolny właściciela, dokładnie 1 element kolejki na scenariusz, tekst oznaczony jako test techniczny, rozróżnienie modem sent od doręczenia).
5. **Etap 5 — Prototyp inbound / IVR bez klientów:** Uruchomienie testowych zapowiedzi głosowych i klasyfikacji połączeń przychodzących w środowisku laboratoryjnym bez udziału numerów klientów.
6. **Etap 6 — Mostkowanie i wznowienie czasu:** Implementacja logiki zestawiania mostka audio, wstrzymywania licznika przy przerwaniu oraz wznawiania odliczania `remaining_seconds` po skutecznym połączeniu stron.
7. **Etap 7 — Test fizyczny z właścicielem:** Kontrolowany test ze wskazanym numerem kontrolnym właściciela z symulacją zerwania rozmowy, oddzwonienia przez klienta, odsłuchania komunikatu oczekiwania, zmostkowania z właścicielem i potwierdzenia zachowania pozostałego limitu czasu.
8. **Etap 8 — Mały pilot produkcyjny:** Uruchomienie ograniczonego pilotażu (3–5 rezerwacji) wyłącznie po formalnej, pisemnej zgodzie właściciela i pozytywnym odbiorze wszystkich etapów 1–7.

### 15.6. Kryteria odbioru, obsługa błędów, limity i ręczna ścieżka awaryjna
- **Kryteria odbioru:**
  - Czas klasyfikacji dzwoniącego i podjęcia decyzji przez automat poniżej 1,5 sekundy.
  - Dla połączeń nieuprawnionych: 100% skuteczności odcięcia połączenia od telefonu właściciela; odtworzenie komunikatu IVR; zakolejkowanie maksymalnie jednego SMS-a w oknie 24 godzin.
  - Dla uprawnionego callbacku: natychmiastowy komunikat o oczekiwaniu dla klienta; skuteczna sygnalizacja do właściciela; wznowienie sesji z czasem `remaining_seconds = limit - elapsed_seconds`.
  - Czas spędzony w stanach `waiting_for_owner` oraz `bridging` nie jest odliczany od limitu konsultacji.
  - Brak niezamaskowanych numerów telefonów i danych osobowych w publicznych logach i audycie.
- **Przypadki błędów i obsługa awaryjna:**
  - *Właściciel nie odpowiada / zajęty podczas próby zestawienia mostka:* Klient otrzymuje komunikat o chwilowej niedostępności behawiorysty i prośbie o kontakt przez panel; sesja nie traci pozostałego czasu; właściciel otrzymuje powiadomienie o przerwanej sprawie w panelu.
  - *Kolejne zerwanie w trakcie wznowionej sesji:* Zapisanie nowego `interrupted_at`, aktualizacja `elapsed_seconds` i możliwość ponownego callbacku w ramach bieżącego okna czasowego.
  - *Przekroczenie okna na oddzwonienie (np. > 15 minut):* Automatyczne przejście w stan `failed` / wygaśnięcie okna; wznowienie wymaga ręcznej decyzji w panelu, co chroni przed niekontrolowanymi połączeniami po godzinach.
  - *Niedostępność bazy Supabase przy nadejściu połączenia:* Automat stosuje zasadę *fail-closed* — odtwarza bezpieczny komunikat o problemie technicznym i rozłącza, nie łącząc z właścicielem.
- **Limity antyspamowe i ochrona sieci:**
  - Maksymalnie 1 SMS z linkiem do „Zapytaj” na dany numer w ciągu 24 godzin.
  - Ochrona przed zalewem połączeń (rate limiting częstotliwości prób połączeń z jednego numeru).
  - **Bezwzględny zakaz automatycznego ponownego wybierania numeru (auto-redial)** po niepewnym rezultacie połączenia lub technicznym błędzie sieci.
- **Obowiązek ręcznej ścieżki awaryjnej (Manual Fallback):**
  - Panel administracyjny musi stale prezentować stan przerwanych konsultacji, zarejestrowany czas `elapsed_seconds` oraz pozostały limit.
  - Właściciel zachowuje w panelu możliwość ręcznego zresetowania limitu, ręcznego zainicjowania połączenia wychodzącego, przedłużenia czasu lub oznaczenia sprawy jako zrealizowanej.
  - Jakakolwiek niespójność automatu nie może uniemożliwić ręcznego dokończenia konsultacji z poziomu panelu.

### 15.7. Zasady bezpieczeństwa i zakres autoryzacji
- **Zgoda właściciela na testy SMS podczas nieobecności:** Właściciel zezwala na kontrolowane testy SMS wyłącznie pod rygorem bezwzględnego spełnienia wszystkich warunków:
  1. Wysyłka dozwolona wyłącznie na uprzednio wskazany numer kontrolny należący do właściciela lub wskazanego uczestnika testu.
  2. Dokładnie jeden element kolejki na dany scenariusz testowy.
  3. Treść wiadomości musi być jednoznacznie oznaczona jako kontrolny test techniczny.
  4. Całkowity zakaz wysyłki do jakichkolwiek numerów klientów.
  5. Brak ślepego ponawiania wysyłek.
  6. Ścisłe rozróżnienie potwierdzenia przyjęcia przez modem (`sent`) od faktycznego doręczenia sieciowego (`delivered`).
- **Wyłączenia ze zgody:** Zgoda ta **nie obejmuje**:
  - wykonywania połączeń testowych,
  - automatycznego mostkowania połączeń,
  - kontaktowania klientów,
  - uruchamiania pilotażu,
  - włączania automatycznego księgowania Revolut (`PHONE_AGENT_AUTO_PAYMENT_RECONCILIATION` pozostaje `false`).
- **Zasady bieżącego etapu prac:**
  - Nie wprowadzać zmian w sekcji zweryfikowanego stanu 1.5.6 ani we wcześniejszych sekcjach `PLAN-NA-JUTRO.md`.
  - Nie modyfikować publicznego copy, layoutu ani żadnych innych plików produkcyjnych.
  - Nie wysyłać żadnych wiadomości SMS ani nie inicjować połączeń telefonicznych.
  - Nie wdrażać, nie commitować i nie pushować zmian do repozytorium zdalnego.

## 16. Docelowy model „Zapytaj teraz”, rozmów kontrolnych i partnerstw z lecznicami

### 16.1. Decyzja produktowa dotycząca wejścia do usługi
- Usunąć „Zapytaj” z górnego paska oraz zrezygnować z publicznego wskaźnika `ONLINE` / dostępności behawiorysty. Zmiana nie może zostać wdrożona przed przygotowaniem i odbiorem nowych, czytelnych wejść do dwóch poniższych ścieżek.
- Klient wybiera jedną z dwóch jednoznacznych opcji:
  1. **„Potrzebuję pilnej pomocy dziś lub jutro”** — prośba o konkretny pilny termin.
  2. **„Powiadom mnie, gdy behawiorysta będzie dostępny”** — zapis na jednorazowe powiadomienie o możliwości rozpoczęcia płatnej rozmowy.
- Brak płatności oznacza brak potwierdzonej rezerwacji, brak wpisu w kalendarzu oraz brak automatycznego prawa do rozmowy. Wyjątkiem może być wyłącznie prawidłowo rozliczony kod partnerski pokrywający 100% ceny.
- Publiczny interfejs nie może sugerować natychmiastowego połączenia, dopóki system nie ma potwierdzonej dostępności, płatności i technicznej możliwości zestawienia rozmowy.

### 16.2. Ścieżka A — pilny termin dziś lub jutro
1. Klient wybiera `dzisiaj` albo `jutro`, podaje minimalny wymagany zakres danych i wysyła prośbę o termin pilny.
2. Właściciel otrzymuje jeden SMS z informacją o nowej prośbie i wybranym dniu. Wiadomość nie może zawierać nadmiarowych danych wrażliwych.
3. Właściciel odpowiada wyłącznie datą i godziną w kanonicznym formacie `DD.MM.RRRR.HH:MM`, np. `01.12.2026.12:15`.
4. Parser akceptuje tylko dokładny format, prawidłową datę i przyszłą godzinę zgodną z dozwolonym dniem. Każda odpowiedź niejednoznaczna ma zostać odrzucona z czytelną informacją dla właściciela; system nie może zgadywać terminu.
5. Po poprawnej odpowiedzi system zakłada krótką, wygasającą blokadę terminu i wysyła klientowi jeden bezpieczny, jednorazowy link do płatności.
6. Dopiero potwierdzona i idempotentnie rozliczona płatność zmienia blokadę w rezerwację oraz dodaje termin do kalendarza właściciela.
7. Brak płatności przed wygaśnięciem zwalnia termin. Konflikt kalendarza, powtórzony webhook lub spóźniona płatność muszą być obsługiwane fail-closed, bez podwójnej rezerwacji.

### 16.3. Ścieżka B — powiadomienie o dostępności
1. Klient zapisuje się na jednorazowe powiadomienie, nie widząc publicznego statusu online.
2. Gdy właściciel świadomie oznaczy gotowość do obsługi, system wybiera oczekujące zgłoszenia zgodnie z ustaloną kolejnością i wysyła ograniczony czasowo link do płatności.
3. Po potwierdzeniu płatności właściciel otrzymuje powiadomienie, a klient uzyskuje czasowo ograniczone uprawnienie do rozmowy.
4. Sposób rozpoczęcia rozmowy wymaga osobnej decyzji i odbioru technicznego:
   - system zestawia kontrolowane połączenie, albo
   - klient sam dzwoni z numeru rozpoznawanego jako opłacona, aktywna sesja.
5. Samodzielne połączenie klienta nie może otwierać stałego dostępu do prywatnego czasu właściciela. Uprawnienie musi być związane z opłaconą rezerwacją, numerem/fingerprintem, oknem czasowym i pozostałym limitem rozmowy.
6. Bezpieczna ścieżka ręczna pozostaje dostępna, jeżeli automatyczne zestawienie lub rozpoznanie numeru nie zadziała.

### 16.4. Briefing właściciela i komunikaty dla klienta
- Podczas oczekiwania na zestawienie rozmowy właściciel słyszy syntetyczny briefing sprawy: identyfikator rezerwacji, temat, krótki opis klienta, wybrany wariant usługi oraz pozostały limit czasu. Nie odczytywać zbędnych danych wrażliwych.
- Klient przed właściwym połączeniem słyszy krótkie zasady konsultacji, informację o długości rozmowy, rozpoczęciu naliczania dopiero po faktycznym zestawieniu stron oraz o zachowaniu niewykorzystanego czasu po potwierdzonym przerwaniu.
- Komunikat przed rozmową wyjaśnia znaczenie każdego sygnału dźwiękowego używanego podczas konsultacji, w szczególności ostrzeżeń o zbliżającym się końcu czasu.
- Komunikat informuje również, ile pytań uzupełniających przysługuje klientowi po rozmowie, w jakim terminie można je zadać i jaką drogą. Liczba pytań i okres ważności muszą wynikać z zatwierdzonej oferty, a nie z założenia technicznego.
- Oczekiwanie, briefing, komunikaty organizacyjne oraz stany `waiting_for_owner` i `bridging` nie pomniejszają opłaconego czasu konsultacji.
- Dokładne momenty sygnałów, ich brzmienie, liczba pytań i treści nagrań są parametrami wymagającymi zatwierdzenia właściciela oraz testu zrozumiałości. Sygnały nie mogą zagłuszać rozmowy ani być mylone z awarią sieci.

### 16.5. Kontrolowany pilotaż z byłymi klientami
- Celem pilotażu jest sprawdzenie całego procesu na zamkniętej grupie byłych klientów świadomie wybranych przez właściciela.
- Właściciel dostarcza finalną, zamkniętą listę numerów oraz potwierdza podstawę kontaktu, zgodę uczestników lub inną właściwą podstawę prawną. Sam status „były klient” nie jest automatycznie zgodą na marketing ani testy telefoniczne.
- Operator kontaktuje wyłącznie numery z zatwierdzonej listy, w dozwolonych godzinach i według zatwierdzonego skryptu. Na początku rozmowy jasno przedstawia podmiot i informuje, że jest to test techniczny systemu.
- Po rozmowie system może wysłać dokładnie jeden SMS z oficjalnym, bezpiecznym linkiem do wyboru terminu. Brak odebrania połączenia nie upoważnia automatycznie do serii ponowień lub SMS-ów.
- W wybranym dniu Operator wykonuje zaplanowane połączenie testowe, odtwarza wymagane komunikaty i realizuje wyłącznie uzgodniony scenariusz.
- Obowiązują: możliwość natychmiastowej rezygnacji, lista „nie kontaktować”, ograniczenie liczby prób, brak ślepego ponawiania, maskowanie numerów w logach i audyt wyniku każdego etapu.
- Startować od jednego świadomego uczestnika. Rozszerzenie grupy jest dozwolone dopiero po odbiorze pierwszego pełnego scenariusza.
- Ta sekcja jest planem, a nie bieżącą zgodą na połączenia. Uruchomienie wymaga osobno: listy numerów, zatwierdzonego tekstu, godzin testu i wyraźnego polecenia właściciela.

### 16.6. Kody partnerskie dla lecznic weterynaryjnych
- Każda lecznica może otrzymać własny kod partnerski z rabatem 30%, 50% albo 100%, terminem ważności, limitem użyć i jednoznacznym identyfikatorem partnera.
- Klient wysyła kod SMS-em na oficjalny numer Operatora. System normalizuje treść, sprawdza kod po stronie serwera i stosuje limity zapobiegające zgadywaniu kodów oraz zalewaniu SMS-ami.
- Prawidłowy kod powoduje wysłanie jednego zwrotnego SMS-a z bezpiecznym, jednorazowym linkiem do dedykowanego terminarza.
- Strona partnerska pokazuje zatwierdzone logo lecznicy, cenę podstawową, wysokość rabatu i kwotę końcową. Logo i nazwa mogą być publikowane dopiero po otrzymaniu właściwego pliku oraz zgody partnera.
- Rabat jest obliczany wyłącznie po stronie serwera na podstawie aktywnej ceny usługi. Parametry URL ani dane z przeglądarki nie mogą ustalać rabatu.
- Dla rabatu 30% lub 50% termin zostaje potwierdzony po opłaceniu pozostałej kwoty.
- Dla rabatu 100% nie uruchamiać bramki płatniczej i nie oznaczać rezerwacji fałszywie jako zwykłej płatności klienta. Użyć osobnego, audytowalnego statusu typu `partner_covered` / „pokryte kodem partnerskim”.
- Jeden kod nie może zostać wykorzystany poza ustalonym zakresem ani wielokrotnie przez powtórzenie webhooka lub odświeżenie linku. Wymagane są idempotencja, limity per kod/per numer, wygaśnięcie linku i ręczna możliwość zablokowania kodu.
- Główna publiczna strona nie otrzymuje automatycznie brandingu partnera. Logo lecznicy występuje tylko w zatwierdzonym, dedykowanym przepływie partnerskim.
- Przed implementacją właściciel rozstrzyga: kto finansuje rabat, czy lecznica ma limit miesięczny, czy kody są wspólne czy jednorazowe, jakie dane i raporty otrzymuje partner oraz jak wygląda rozliczenie podatkowe i księgowe.

### 16.7. Kolejność realizacji nowego modelu
1. **Decyzje biznesowe i treści:** zatwierdzić format SMS z terminem, czas blokady, teksty komunikatów, momenty sygnałów, liczbę pytań, zasady samodzielnego dzwonienia, skrypt pilota i reguły finansowania kodów.
2. **Model danych i bezpieczeństwo:** zaprojektować trwałe, idempotentne rekordy próśb pilnych, propozycji terminu, blokad, powiadomień online, uprawnień do rozmowy, kampanii testowych, partnerów i użyć kodów.
3. **Ścieżka pilnego terminu:** wdrożyć wybór dziś/jutro, SMS do właściciela, ścisły parser odpowiedzi, blokadę terminu, link płatniczy oraz wpis do kalendarza dopiero po płatności.
4. **Ścieżka powiadomienia online:** wdrożyć kolejkę oczekujących, ręczne oznaczenie gotowości, jednorazowy link płatniczy i czasowe uprawnienie do rozmowy.
5. **Zmiana publicznej nawigacji:** usunąć „Zapytaj” z górnego paska i publiczny status online dopiero po odbiorze obu nowych wejść oraz sprawdzeniu desktop/mobile, dostępności i analityki.
6. **Audio i telefonia:** wdrożyć briefing, zasady dla klienta, sygnały czasu i obsługę pytań po rozstrzygnięciu bramki Android Default Dialer kontra kontrolowany dostawca SIP/IVR.
7. **Pilot jednej osoby:** przeprowadzić pełny scenariusz z jednym zatwierdzonym uczestnikiem i zebrać dowody techniczne oraz jakościowe.
8. **Partner leczniczy:** uruchomić jeden kod jednej lecznicy w środowisku kontrolowanym, osobno sprawdzając rabaty 30%, 50% i 100%.
9. **Ograniczony pilot produkcyjny:** rozszerzyć zakres dopiero po pozytywnym odbiorze wcześniejszych etapów i odrębnej zgodzie właściciela.

### 16.8. Kryteria odbioru i aktualny zakres zgody
- Każda zmiana stanu ma klucz idempotencji i pełny audyt bez surowych numerów telefonu w publicznych logach.
- Żaden SMS, webhook płatniczy ani ponowienie żądania nie może stworzyć dwóch rezerwacji, dwóch wpisów w kalendarzu lub dwóch uprawnień do rozmowy.
- Termin nie jest potwierdzony przed płatnością, z wyjątkiem jawnie rozliczonego rabatu partnerskiego 100%.
- Czas oczekiwania i komunikatów nie zużywa czasu konsultacji; sygnały oraz pytania uzupełniające są zgodne z zatwierdzoną ofertą.
- Publiczne usunięcie nawigacji/statusu wymaga odbioru funkcjonalnego, responsywnego i wizualnego na desktopie i urządzeniu mobilnym.
- Bieżąca zgoda obejmuje wyłącznie zapisanie i dopracowanie planu. Nie obejmuje wysyłania SMS-ów, wykonywania połączeń, kontaktowania byłych klientów, uruchamiania kodów lecznic, zmiany publicznego interfejsu ani rozpoczęcia pilotażu.

### 16.9. Pilot testowy płatności (0,01 zł), uprawnień i materiałów PDF (zapis na przyszłość)
- **Grupa docelowa:** wyłącznie świadomie zatwierdzeni uczestnicy projektu testowego.
- **Dostęp i linki:** po umówieniu rozmowy uczestnicy otrzymują oficjalny link do dedykowanej strony testowej.
- **Kwota testowa (0,01 zł):** testowa rezerwacja/rozmowa oraz każdy wskazany testowy PDF mają ustaloną cenę `0,01 zł`, aby zweryfikować pełny przepływ transakcyjny: płatność, idempotentne nadanie dostępu i pobranie materiału.
- **Dostęp do materiałów PDF:** plik PDF staje się dostępny dopiero po idempotentnym potwierdzeniu płatności, wyłącznie przez ograniczony czasowo / jednorazowy bezpieczny link, z pełnym audytem bez danych wrażliwych.
- **Bramka regulaminowa i kwotowa operatora:** przed techniczną realizacją należy bezwzględnie zweryfikować minimalną kwotę transakcji oraz regulamin operatora płatności. Jeśli kwota `0,01 zł` nie jest dopuszczalna przez operatora, należy użyć najniższej dozwolonej kwoty lub formalnego trybu sandbox/test — kategorycznie nie wolno udawać realnej płatności.
- **Księgowość i oznaczenia:** należy formalnie uwzględnić zasady księgowania, dokument sprzedaży / ewentualny zwrot oraz jednoznaczne oznaczenie transakcji etykietą `TEST`.
- **Rygor uprawnień i status:** ten zapis stanowi wyłącznie formalną specyfikację planistyczną na przyszłość i NIE upoważnia obecnie do tworzenia produktów, inicjowania płatności, generowania i wysyłania linków ani do jakiegokolwiek kontaktu z uczestnikami. Realizacja nastąpi w osobnym etapie po odrębnym odbiorze technicznym.

### 16.10. Status techniczny (2026-10-12)
- **Model danych i ACL:** bazowy model danych (migracja `20261011005`) oraz rygorystyczne uprawnienia append-only / fail-closed (migracja `20261011006`) zostały wdrożone na produkcji.
- **Kolejka availability i uprawnienia do rozmowy:** mechanizm kolejki „Powiadom mnie” (Stage 3) oraz bezpieczne nadawanie jednego uprawnienia do rozmowy z opłaconej oferty z migracją `20261011007` (Stage 4) zostały wdrożone i formalnie odebrane.
- **Stage 5 — atomowe wygaszanie rekordów:** idempotentny, ograniczony (batch-limited), współbieżnie bezpieczny (`FOR UPDATE SKIP LOCKED`) sweep dla `urgent_intake_requests`, `availability_notification_requests` i `consultation_talk_entitlements` został wdrożony na linked Supabase (migracja `20261011008`) i formalnie odebrany technicznie w trybie read-only. RPC `public.sweep_expired_section16_records` pozostaje bez harmonogramu cron i nie było uruchamiane produkcyjnie. Usunięto rozbieżność semantyczną w local JSON fallback (odrzucenie operacji po terminie działa w pełnym parytecie z PostgreSQL: reject without mutation przed jawnym sweepem).
- **Semantyka wygaszania (migracja 11009):** migracja `20261011009_section16_exclusive_deadline_semantics.sql` została wdrożona w linked Supabase, wprowadzając ścisłą semantykę terminów wygaszania dla rekordów sekcji 16.
- **Telefon A — kandydat centrali GSM (wydanie 1.5.8 / 10508):** wydanie 1.5.7 zostało odrzucone w niezależnym odbiorze integracyjnym z powodu braków w podłączeniu produkcyjnym (brak produkcyjnego wywołania startu i rejestracji serwisu, brak runtime schedulera timeoutów, wyciek `Call.getDetails()` do logów, brak interfejsu obsługi aktywnej sesji/przerwania). Wydanie 1.5.8 zamknęło wszystkie 6 zidentyfikowanych braków: zaimplementowano procesowo-lokalny koordynator `ConferenceSessionCoordinator` z pre-flight checks (`AndroidConferencePrerequisites`), walidacją numerów wyłącznie w pamięci RAM sesji (zero zapisu na dysku, w SharedPreferences, heartbeat czy Supabase), rejestracją kontrolera przed pierwszym `placeCall()` i blokadą sesji współbieżnych. Połączono `InCallServiceBridge` z `ProductionTelecomAdapter` rozwiązując bezpiecznie wyścig startu serwisu. Wdrożono lifecycle-safe scheduler `ConferenceRuntimeScheduler` (timeouty 45s i 15s, tick limitu, anulowanie po stanie terminalnym, idempotencja per session ID, brak auto-redialu). Usunięto PII i `Call.getDetails()` z logcat oraz dodano audyt statyczny `ConferencePrivacyAuditTest`. W `MainActivity` (Sekcja 2.5) dodano bezpieczny interfejs testowy z dwuetapową zgodą, podglądem sesji i przyciskiem `PRZERWIJ I ROZŁĄCZ OBA POŁĄCZENIA`. Potwierdzono 4 pakiety testów JVM oraz 56 testów Node. Zbudowano i zainstalowano podpisane wydanie `1.5.8 / 10508` na Motoroli `ZY323XJ2V7` (`CALL_PHONE=true`, `ANSWER_PHONE_CALLS=true`, `SEND_SMS=false`, foreground `SmsQueueService`, heartbeat OK, 0 połączeń Telecom). Status integracyjny: `INTEGRATED_CANDIDATE_READY_FOR_OWNER_ROLE_AND_TWO_LEG_TEST`. Zdolność sieciowa operatora do konferencji GSM pozostaje: `UNVERIFIED_UNTIL_PHYSICAL_TWO_LEG_TEST`. W zadaniu wykonano 0 połączeń.
- **Bramki bezpieczeństwa bezwzględnie zachowane:** brak zgody na wysyłanie SMS, wykonywanie połączeń telefonicznych, realne płatności, kontakt z klientami, pilotaż, zmiany publicznego UI oraz produkcyjny harmonogram cron.

### 16.10.1. Lokalny odbiór endpointu propozycji pilnego terminu (2026-10-12)
- Dodano `POST /api/admin/section16/urgent-requests/[id]/proposal`: autoryzacja administratora, kontrola Origin dla cookie i Basic Auth, ścisły JSON, idempotencja, kontrola wersji i minimalna odpowiedź bez danych klienta. Logi błędów nie zawierają obiektów wyjątków ani danych backendu.
- Odbiór lokalny: 21/21 testów endpointu, TypeScript i kontrola różnic PASS. Sprawdzono także odrzucanie localhost w produkcji mimo lokalnego magazynu danych, brak zmian po odrzuceniu żądania i brak wywołań sieciowych w teście poprawnej propozycji.
- `SECTION16_ADMIN_PROPOSALS_ENABLED` pozostaje domyślnie wyłączone. Brak wdrożenia. Endpoint zapisuje propozycję i termin wygaśnięcia w modelu sekcji 16; nie rezerwuje miejsca w publicznym kalendarzu, nie wysyła SMS ani e-maili i nie uruchamia płatności.
- Dalsza integracja nadal wymaga podłączenia zgłoszeń i obsługi administracyjnej do tego modelu oraz osobnego odbioru konfliktów kalendarza i wykonania zewnętrznego. Starsza ścieżka `urgent_now_requests` nie została zastąpiona.

### 16.10.2. Propozycja prac nocnych bez udziału właściciela (2026-10-12) i raport poranny (2026-10-13)
- **Status:** zakończono lokalne prace nocne w etapach 1–4 oraz audyt etapu 5; etap 5 (Model B blokady kalendarza) pozostaje **W TOKU w AGY-1** (nieukończony). Domknięto raport poranny (etap 6). Wszystkie prace i testy wykonano wyłącznie lokalnie na danych syntetycznych. Brak deployu, brak migracji na produkcji, brak operacji na danych klientów.
- **Ustalenie z kodu:** istnieje zakup poleconego PDF przez `/api/account/materials/recommendation` i checkout oraz strona BLIK na telefon. Publiczny `/api/materialy/order` odrzuca płatne materiały, a stary formularz PDF jest wycofany. Przepływ zakupu po rekomendacji został potwierdzony lokalnie na danych syntetycznych, bez realnej płatności i bez wdrożenia. Domyślnym zakresem jest domknięcie zakupu po rekomendacji; otwarcie publicznej sprzedaży bez konsultacji stanowi osobną zmianę oferty.
1. **Priorytet: pełny zakup PDF przez BLIK na telefon.** Prześledzić polecenie materiału, cenę serwerową, utworzenie zamówienia, instrukcję przelewu na skonfigurowany numer, zgłoszenie wpłaty, ręczne potwierdzenie przez administratora i nadanie dostępu. Naprawić wykryte braki lokalnie. Nie żądać sześciocyfrowego kodu BLIK ani nie uznawać kliknięcia „zapłaciłem” za potwierdzoną wpłatę. Odbiór: pełny scenariusz na danych syntetycznych; brak pliku przed zatwierdzeniem; dokładnie jedno uprawnienie po zatwierdzeniu.
2. **Bezpieczny dostęp do PDF i trwałość zamówień.** Sprawdzić ochronę plików, powiązanie dostępu z właściwym klientem i materiałem, istniejące terminy ważności, powtórzenia i równoległe żądania, anulowanie oraz restart procesu. Zidentyfikować używane magazyny danych i naprawić potwierdzone błędy w aktywnej ścieżce. Odbiór: cudzy token, nieopłacone lub wygasłe zamówienie nie udostępnia pliku; poprawny klient pobiera właściwy PDF. Migracje przygotować i testować lokalnie, bez uruchamiania ich na produkcji.
3. **Odbiór zakupu PDF w przeglądarce.** Sprawdzić rzeczywiste ekrany desktop/mobile: wejście z rekomendacji, checkout, instrukcję BLIK, oczekiwanie i pobranie. Usunąć potwierdzone błędy funkcjonalne i drobne usterki responsywności, zachowując ofertę i istniejącą oprawę. Odbiór obejmuje wyrenderowane widoki i pobrany plik, a nie wyłącznie HTTP 200 lub build.
4. **Kolejny fragment ścieżki pilnego terminu.** Po lokalnym odbiorze endpointu propozycji przygotować brakujące wejście administracyjne do tworzenia/odczytu zgłoszeń w modelu sekcji 16, używając istniejących zasad dostępu i idempotencji. Najpierw ustalić jeden konkretny zakres; nie przenosić automatycznie starego przepływu ani nie otwierać publicznego UI. Odbiór: lokalny scenariusz zgłoszenie → propozycja → ponowienie → wygaśnięcie, bez SMS, płatności i zapisów w zewnętrznym kalendarzu.
5. **Granice czasu i konfliktów rezerwacji.** Zbadać konkretną granicę pomiędzy propozycją sekcji 16 a istniejącym kalendarzem; sprawdzić zajęty termin, równoczesne propozycje, spóźnione zatwierdzenie i zmianę czasu. Implementować tylko reguły już rozstrzygnięte w planie. Nierozstrzygnięte zasady biznesowe opisać do porannej decyzji i kontynuować inne niezależne prace.
6. **Domknięcie raportu porannego.** Odebrano wyniki etapów 1–4 oraz audyt etapu 5 (szczegóły w raporcie poniżej). Wyraźnie oddzielono działanie lokalne od produkcyjnego i symulację zatwierdzenia BLIK od faktycznej wpłaty.
- **Zakres pracy bez kolejnych akceptacji:** odczyty, lokalna implementacja i naprawy, testy z izolowanym magazynem i danymi syntetycznymi, lokalne sprawdzenia przeglądarkowe oraz przygotowanie migracji i instrukcji wdrożenia. Rzeczywiste płatności, potwierdzanie wpłat klientów, kontakt z klientami, automatyczne księgowanie Revolut, wdrożenie i uruchomienie produkcyjnych harmonogramów nie są częścią tego nocnego planu. Zgoda na testowe połączenia pozostaje ważna, lecz pełnego testu dwóch linii nie wykonuje się bez odbierającego uczestnika.
- **Odłożone zgodnie z poleceniem właściciela:** diagnostyka alarmów/baterii/Tailscale według 16.11; konfiguracja Google i prywatnych danych na samym końcu według 16.12. Praca nocna wymaga działającej stacji PRACA DWA i obsługi callbacków; zakres końcowy zależy od wyników odbioru, nie od zadeklarowanej liczby godzin.

#### Raport poranny — odebrany stan po pracach nocnych (13.10.2026)
- **Zakup poleconego PDF:**
  - Zrealizowano i odebrano lokalnie pełny przepływ zakupu: endpoint POST (`/api/account/materials/recommendation`), checkout, instrukcja płatności BLIK na telefon (`/platnosc/blik/[orderNumber]`), ręczne zgłoszenie wpłaty przez klienta (`POST /api/orders/[orderNumber]/report-payment`), ekran oczekiwania (`/oczekiwanie/[orderNumber]`) oraz dostęp do pliku po ręcznym potwierdzeniu wpłaty przez administratora (`/api/access/download`).
  - Kliknięcie przez klienta przycisku „Zapłaciłem/am” nie potwierdza wpłaty i nie odblokowuje dostępu; rejestruje wyłącznie intencję/zgłoszenie wpłaty (`payment_reported`), a dostęp wymaga ręcznego zatwierdzenia przez administratora.
- **Naprawa pętli accessUrl i błędu ekranu BLIK przy problemie z e-mailem:**
  - Naprawiono pętlę `accessUrl` na ścieżce materiałów.
  - Usunięto błąd, w którym zapisane pomyślnie w bazie zgłoszenie `payment_reported` przy niedostarczonym e-mailu powiadomienia do administratora zatrzymywało klienta na ekranie BLIK z fałszywym błędem.
  - Odbiór przeglądarkowy potwierdził prawidłowe przejście klienta na stronę `/oczekiwanie/[orderNumber]` przy `adminNotification=failed`, z zachowaniem pól transakcyjnych `paidAt=null` i `accessSentAt=null`.
- **Bezpieczny dostęp do PDF i trwałość zamówień:**
  - Dostęp do materiału PDF bezwzględnie wymaga podania właściwego adresu e-mail oraz unikalnego kodu; wpisy z pustym, błędnym lub cudzym e-mailem są odrzucane bez wycieku danych.
  - Zaimplementowano limity pobrań oraz atomowy claim uprawnienia (`claim_commerce_access`) eliminujący wyścigi równoległych żądań.
  - Zamówienia w stanach `cancelled` oraz `expired` działają fail-closed — nie udostępniają pliku.
  - Migracja bazodanowa `20261013001` (`supabase/migrations/20261013001_commerce_access_claim.sql`) jest tylko przygotowana i zweryfikowana lokalnie; **NIE została wdrożona** na bazie produkcyjnej.
- **Panel /admin/section16:**
  - Przygotowano i odebrano lokalnie panel do tworzenia i odczytu zgłoszeń w kanonicznym modelu sekcji 16.
  - Zaimplementowano wyłącznie kanoniczne stany: `pending_proposal`, `timeslot_proposed`, `payment_confirmed`, `expired`, `cancelled`, `rejected`.
  - Widoki desktop oraz mobile, a także link w `/admin` (topbar i nawigacja bez duplikacji na desktopie) zostały odebrane lokalnie.
  - Endpointy administracyjne oraz panel pozostają **niewdrożone**, a feature gate (`SECTION16_ADMIN_PROPOSALS_ENABLED`) pozostaje domyślnie wyłączony.
- **Testy odbiorcze (lokalne na danych syntetycznych):**
  - Section16: **150/150 testów PASS** (model autonomiczny, przepływ availability, wygaszanie sweep, uprawnienia rozmowy, przepływ pilny, endpointy propozycji i zgłoszeń, widok panelu).
  - Po poprawce płatności: **28/28 testów PASS** (bezpieczeństwo zgłoszenia płatności, bezpieczeństwo reconciliation Revolut, atomowy dostęp PDF, rekomendacje materiałów).
  - Statyczna weryfikacja kodu: **TypeScript (`tsc --noEmit`) PASS** oraz **ESLint (`npm run lint`) PASS**.
  - Wszystkie powyższe testy zostały przeprowadzone wyłącznie lokalnie na danych syntetycznych w środowisku izolowanym.
- **Audyt konfliktów i zatwierdzony Model B (W TOKU w AGY-1):**
  - Audyt granic czasu i konfliktów wykazał ryzyko powstania podwójnego terminu pomiędzy propozycją pilną Sekcji 16 a wspólnym publicznym kalendarzem dostępności.
  - Właściciel w dniu 2026-10-13 zatwierdził **Model B**: aktywna propozycja Section16 musi blokować wspólną publiczną dostępność; zajęty slot ma być odrzucany, wygaśnięcie lub anulowanie zwalnia blokadę, a zmiana terminu (reschedule) ma być atomowa.
  - **Implementacja tego etapu jest W TOKU w AGY-1 i nie wolno jej opisać jako ukończonej** — prace trwają, a blokada kalendarza nie jest zakończona.
- **Bramki produkcyjne i stan nienaruszony:**
  - Brak deployu (brak nowych wydań na Vercel).
  - Brak realnych płatności oraz brak potwierdzeń wpłat rzeczywistych klientów.
  - Brak wysyłki wiadomości SMS, brak połączeń telefonicznych i brak jakiegokolwiek kontaktu z klientami.

### 16.11. Telefon A — niezawodność pracy bez nadzoru (etap późniejszy)
- **Moment realizacji:** wrócić do tego etapu po kontrolowanym teście dwóch linii i przed uznaniem Motoroli za centralę, która może stale pracować na ładowarce bez nadzoru. Nie traktować tego jako następnego kroku ani jako zgody na uruchomienie połączeń lub pilotażu.
- **Alarm e-mail „Regulski Behawiorysta nie działa”:** ustalić, który monitor wysyła komunikat, jaki warunek go wyzwala i czy dotyczy strony, aplikacji Operatora, heartbeat, sieci czy samego telefonu. Porównać czas alarmu z faktyczną dostępnością usługi, stanem ładowania, poziomem baterii (także przy wskazaniu około 50%) i ostatnim poprawnym meldunkiem. Rozróżnić rzeczywistą awarię od fałszywego alarmu; poprawić przyczynę i sprawdzić, czy powiadomienie jasno wskazuje niesprawny element.
- **Wyłączanie telefonu przy około 30% baterii:** zebrać obserwacje z momentu wyłączenia i po ponownym uruchomieniu; sprawdzić stan akumulatora i kalibrację wskazania, ładowarkę, kabel, port, temperaturę, zasilanie oraz zdarzenia systemowe. Nie zakładać, że sam procent baterii dowodzi sprawności zasilania. Ustalić i usunąć przyczynę nieoczekiwanych wyłączeń przed pracą bez nadzoru.
- **Checklista ustawień do odczytu i oceny (minimum 20):** przed zmianami zapisać aktualne wartości, oczekiwane działanie, ryzyko i sposób przywrócenia. Dobierać ustawienia pod Androida 11 i tę Motorolę; nie zakładać, że każda pozycja istnieje.
  1. Kondycja baterii, nagłe spadki procentów i wyłączenia przy około 30%.
  2. Temperatura baterii i urządzenia podczas ładowania oraz pracy sieciowej.
  3. Zachowanie po pełnym naładowaniu i długim pozostawieniu na zasilaniu.
  4. Zasilacz i kabel: stabilność, odpowiednia moc, przerwy i spadki ładowania.
  5. Port ładowania: luzy, zabrudzenie, przerwy po poruszeniu wtyczką.
  6. Wyjątki optymalizacji baterii dla aplikacji Operatora.
  7. Optymalizacja baterii dla Tailscale i wpływ Doze/App Standby.
  8. Ograniczenia pracy w tle i automatyczne ubijanie aplikacji przez Motorolę.
  9. Autostart Operatora po restarcie systemu.
  10. Autostart i automatyczne odtworzenie tunelu Tailscale po restarcie.
  11. Stan Tailscale: zalogowana właściwa tożsamość, węzeł online i brak nieoczekiwanego wygaśnięcia dostępu.
  12. Tailscale ACL i zakres dostępu do Motoroli ograniczony do potrzeb administracyjnych.
  13. Tailscale: dostępność po Wi-Fi, zmianie sieci i odnowieniu DHCP.
  14. Tailscale: automatyczne wznowienie po chwilowej utracie internetu i po wybudzeniu.
  15. Tailscale: test dostępu po restarcie bez ręcznego otwierania aplikacji.
  16. Tailscale VPN jako zawsze włączony — ocenić zgodność i zachowanie fail-closed przed ewentualnym włączeniem.
  17. Wi-Fi: automatyczne łączenie z właściwą, zabezpieczoną siecią.
  18. Wi-Fi: zachowanie podczas uśpienia ekranu i przy wyłączonym ekranie.
  19. Dane komórkowe jako awaryjny kanał: stan, limit kosztów i przełączenie po utracie Wi-Fi.
  20. Tryb samolotowy, oszczędzanie danych i inne ustawienia mogące odciąć sieć.
  21. Ustawienia VPN, prywatnego DNS i proxy, które mogą blokować Tailscale lub heartbeat.
  22. Data, godzina i automatyczna strefa czasowa potrzebne do poprawnych meldunków i alarmów.
  23. Powiadomienia Operatora i Tailscale: kanały, priorytet, blokada na ekranie i alarm po utracie usługi.
  24. Nie przeszkadzać, tryby snu i harmonogramy wyciszające alarmy.
  25. Uprawnienie do powiadomień, działanie usługi foreground i widoczność stałego powiadomienia Operatora.
  26. Rozmiar pamięci, wolne miejsce i zachowanie po zapełnieniu magazynu.
  27. Automatyczne aktualizacje Androida, aplikacji Operatora i Tailscale oraz wymagany restart po aktualizacji.
  28. Blokada ekranu, szyfrowanie, fizyczny dostęp i zasady odzyskiwania po restarcie.
  29. ADB i debugowanie USB: wyłączyć do zwykłej pracy bez nadzoru po zakończeniu diagnostyki.
  30. Rola domyślnego dialera i stan uprawnień po restarcie; pozostawić zgodnie z osobno odebranym modelem połączeń.
  31. SIM: właściwe gniazdo, stan gotowości po restarcie, PIN oraz rejestracja głosu w T-Mobile.
  32. Usługi operatora: połączenia oczekujące, konferencje, przekierowania, poczta głosowa i roaming — odczyt/uzgodnienie bez zmiany planu taryfowego.
  33. Heartbeat: częstotliwość, świeżość, bateria/ładowanie/sieć i zgodność alertu z rzeczywistą niedostępnością.
  34. Watchdog: wykrycie braku heartbeat, opóźnienie alarmu, brak fałszywych alarmów i bezpieczny brak automatycznego wybierania.
  35. Zachowanie po utracie prądu: ponowny start, ładowanie, Operator, Tailscale i heartbeat po powrocie zasilania.
  36. Zachowanie po utracie routera/internetu: brak nadmiernego zużycia baterii, ponawiania i alarmów seryjnych.
- **Tailscale i stałe zasilanie:** szczególnie potwierdzić osiągalność telefonu na Tailscale przez długi czas, po uśpieniu, restarcie, utracie Wi-Fi/internetu i powrocie zasilania. Nie ujawniać kluczy, nazw prywatnych użytkowników ani numerów telefonu w raporcie.
- **Odbiór etapu:** minimum 24 godziny kontrolowanej obserwacji na ładowarce oraz próby odzyskania po restarcie i utracie sieci. Udokumentować trafność alarmu e-mail, przyczynę wyłączeń, stan temperatury/ładowania, działanie Operatora, świeżość heartbeat oraz dostępność Tailscale. Przed zmianą każdej opcji zachować jej poprzednią wartość; zmiany wykonywać po jednej i cofać, jeśli pogarszają bezpieczeństwo lub niezawodność. Dopóki kryteria nie przejdą, status pracy bez nadzoru pozostaje `NIEPOTWIERDZONY`.
- **Odbiór etapu:** udokumentować źródło i trafność alarmu e-mail, przyczynę wyłączania, stabilne ładowanie oraz ciągłość i automatyczny powrót Tailscale w kontrolowanej obserwacji. Dopóki te punkty nie przejdą testu, status pracy bez nadzoru pozostaje `NIEPOTWIERDZONY`.

### 16.12. Końcowe uporządkowanie konta Google i prywatnych danych na Telefonie A
- **Moment realizacji:** ostatni etap konfiguracji Telefonu A, po odbiorze funkcji centrali i niezawodności pracy bez nadzoru. Wrócić wtedy do wyboru konkretnej konfiguracji razem z właścicielem; teraz nie zmieniać konta, synchronizacji ani danych telefonu.
- **Cel:** zachować zalogowanie Google i działanie używanej aplikacji Revolut, a jednocześnie nie przechowywać ani nie synchronizować na Motoroli prywatnych zdjęć, kontaktów, plików i innych danych, które nie są potrzebne centrali.
- **Zakres przyszłego sprawdzenia:** ustalić, które elementy konta Google są rzeczywiście wymagane przez Revolut i aktualizacje aplikacji; przejrzeć synchronizację Zdjęć, Kontaktów, Dysku i kopii zapasowych oraz lokalne dane już obecne na urządzeniu. Przed wyłączeniem synchronizacji lub usunięciem czegokolwiek potwierdzić, gdzie są oryginały i kopie, oraz czy zmiana nie usunie danych z innych urządzeń lub chmury.
- **Odbiór:** Revolut i wymagane usługi nadal działają po ponownym uruchomieniu telefonu, a na Motoroli nie pojawiają się nowe prywatne zdjęcia ani zbędne dane z konta. Żadnego czyszczenia lub wylogowania bez osobnego przeglądu skutków i decyzji właściciela.

### 16.13. Stan po odbiorze 13.10.2026 i najbliższe zadania

**Zrobione lokalnie:** Telefon A ma Operatora 1.5.8 / 10508. Działają heartbeat i autoryzowany zdalny ADB przez Tailscale na Wi-Fi oraz LTE bez kabla do komputera; próbę LTE potwierdzono przy wyłączonym Wi-Fi, zasilaniu z gniazdka i odczycie urządzenia przez ADB. `SEND_SMS` pozostaje cofnięte, aplikacja nie jest domyślnym dialerem. Kod Modelu B Sekcji 16 (hold kalendarza) jest przygotowany lokalnie; ukierunkowane testy Sekcji 16 przeszły 103/103 i poprawione testy regresji 53/53, `tsc --noEmit` i `git diff --check` przeszły. Zakup poleconego PDF, naprawy BLIK i panel Sekcji 16 są lokalnymi zmianami bez produkcyjnego wdrożenia.

**Najbliższe zadanie: zdalny dostęp po restarcie bez kabla.** Obecne `adb tcpip 5555` potwierdzono tylko do najbliższego restartu. Sprawdzić na tej Motoroli opcję Androida 11 „Debugowanie bezprzewodowe”, sparować stację bez kabla, ustalić dostępny adres/port przez Tailscale i zachowanie na Wi-Fi oraz LTE. Zmierzyć, czy po kontrolowanym restarcie bez dotykania USB samoczynnie wracają Tailscale, heartbeat i autoryzowany ADB; odnotować czas powrotu, port, stan autoryzacji i ewentualną czynność wymaganą na ekranie. Jeśli standardowy Android nie przywróci ADB samoczynnie, nie obiecywać „zawsze włączonego ADB”: zaprojektować i odebrać zdalną diagnostykę przez istniejący bezpieczny kanał aplikacji, a ADB pozostawić kanałem serwisowym. Nie stosować rootowania ani trwałego otwarcia debugowania na publicznym internecie. Kryterium odbioru: dwa kontrolowane restarty bez kabla, dostęp diagnostyczny przez Wi-Fi i LTE po każdym albo udokumentowane ograniczenie i działający zamiennik. Wcześniejszy punkt 16.11 o wyłączeniu ADB wymaga ponownej decyzji po tym odbiorze.

**Pozostało po lokalnym odbiorze punktu 1:** (1) test dostępu po restarcie i obserwacja telefonu na ładowarce, 30–60 min pracy oraz co najmniej 24 h obserwacji; (2) fizyczny test dwóch nóg GSM i scalenia z właścicielem, 30–45 min, status `UNVERIFIED_UNTIL_PHYSICAL_TWO_LEG_TEST`; (3) osobny etap wdrożeniowy: zastosować oczekujące migracje Supabase `20261013001` i `20261013002`, wdrożyć aplikację i sprawdzić produkcję, około 30–60 min po zgodzie na etap produkcyjny (`20261010001` jest już zastosowana zdalnie); (4) później uporządkowanie konta Google/prywatnych danych telefonu z punktu 16.12. Nie uruchamiać klientów, SMS, płatności, crona ani funkcji za flagą bez osobnego odbioru.

**Odczyt produkcji 13.10.2026:** Vercel wskazał ostatni deployment produkcyjny `dpl_CvBweVTJnMKXcKvmkXfcTqhDQCpu` jako `Ready` z 11.10.2026, przypisany do `regulskibehawiorysta.pl` i `www.regulskibehawiorysta.pl`. W liście nazw zmiennych produkcyjnych brak `SECTION16_ADMIN_PROPOSALS_ENABLED`, więc kod z tą bramką pozostałby wyłączony. Lokalnie `HEAD` i `origin/main` to `5baee2d`, a zmiany PDF/BLIK/Model B są w drzewie roboczym. Stan wykonania trzech migracji w produkcyjnej bazie nie został tym odczytem potwierdzony; przed wdrożeniem trzeba go sprawdzić bezpośrednio w historii migracji Supabase.

### 16.14. Globalny harmonogram pozostałych prac — 13.10.2026

Szacunek dla **całego modelu z punktów 15–16**, łącznie z obiema nowymi ścieżkami usługi, telefonią i audio, pilotażem oraz kodami partnerskimi: **120–220 godzin pracy czynnej**. Przy pracy w pełnym wymiarze to orientacyjnie **4–7 tygodni pracy** i **6–12 tygodni kalendarzowo** z testami, decyzjami właściciela i udziałem osób zewnętrznych. To zakres szacunkowy, nie termin dostawy. Brak konferencji GSM u operatora może wymagać osobnej architektury i wydłużyć pracę o kilka tygodni. Samo uruchomienie już przygotowanych lokalnie zmian jest mniejszym etapem: orientacyjnie **2–5 dni**, po odbiorze i sprawdzeniu migracji.

**Kolejność, którą należy realizować po jednej bramce:**

1. **Domknąć istniejący lokalny pakiet PDF/BLIK/Model B Sekcji 16:** przejrzeć pełny diff i zakres, potwierdzić testy bezpieczeństwa, rzeczywiste ekrany desktop/mobile oraz pobranie PDF; ustalić stan trzech migracji w Supabase. Szacunek 8–16 h. Nie wdrażać przed odbiorem.

   **Odbiór lokalny 13.10.2026: CZĘŚCIOWY, NIEZAMKNIĘTY DLA MODELU REVOLUT.** `tsc --noEmit`, lint i build przeszły; pakiet testów bezpieczeństwa/regresji przeszedł 179/179, a test poprawionego handlera propozycji 21/21. Ekrany BLIK, oczekiwania i panelu Sekcji 16 sprawdzono na 1440 px i 390 px, a plik PDF pobrano poprawnie. Ten odbiór dotyczył jednak starej ścieżki ręcznej: przycisku `Zapłaciłem/am`, `report-payment` i powiadomienia e-mail do administratora. Nie jest to odbiór docelowego modelu, w którym powiadomienie z Revolut na Motoroli automatycznie potwierdza właściwą wpłatę. `PHONE_AGENT_AUTO_PAYMENT_RECONCILIATION` i automatyczne rozliczanie zamówień materiałowych pozostają do wykonania i osobnego testu; nie wysyłać maili administracyjnych dla tej ścieżki. Historia Supabase: `20261010001` jest zastosowana zdalnie; `20261013001` i `20261013002` są tylko lokalne. Bez deployu i bez uruchamiania flagi.

   **Korekta i wdrożenie:** dodano rozliczanie zamówienia ebooka na podstawie autoryzowanego powiadomienia `com.revolut.revolut`, kwoty i numeru `ZAM-XXXXXX`, z wymaganym identyfikatorem transakcji. Automatyczna ścieżka nie wysyła maila administracyjnego ani maila klienta i nie pokazuje przycisku `Zapłaciłem/am`. Migracje `20261013001` i `20261013002` zastosowano na Supabase, a wdrożenie produkcyjne `dpl_Gig4ihDDSuh4kXcieuRxue3L8Nrv` ma status READY. Flaga `PHONE_AGENT_AUTO_PAYMENT_RECONCILIATION` jest ustawiona dla Production. Pozostaje odbiór rzeczywistego powiadomienia Revolut na odblokowanej Motoroli.
2. **Odebrać Telefon A jako centralę:** kontrolowany test dwóch nóg GSM, hold, merge, dźwięk i awaryjne rozłączenie; osobno sprawdzić zdalną diagnostykę po restarcie oraz heartbeat/Tailscale na Wi-Fi i LTE. Następnie co najmniej 24 h obserwacji zasilania i alarmów. Szacunek 8–24 h pracy czynnej plus czas obserwacji. Jeśli merge GSM nie działa, najpierw rozstrzygnąć alternatywę techniczną.

   **Odbiór 13.10.2026: NIEZAKOŃCZONY / FAIL dla restartu.** Przed restartem ADB przez Tailscale działał na `100.118.102.42:5555`, telefon `ZY323XJ2V7`, Android 11, AC powered, USB powered false, bateria 81%, `SEND_SMS` nieaktywne. Po kontrolowanym `adb reboot` bez kabla urządzenie pozostało `offline` w ADB, a Tailscale zgłosił `offline; last seen 7m ago`; nie wrócił heartbeat ani kanał diagnostyczny w obserwowanym oknie. Przyczyna do obsłużenia: po restarcie Android wymaga pierwszego ręcznego odblokowania, a bez niego ADB pozostaje niedostępne; trzeba zaprojektować bezpieczny, automatyczny start/odblokowanie po restarcie albo zaakceptować, że ADB nie może być kanałem bezobsługowym. Tailscale musi również automatycznie wystartować i odzyskać połączenie. Fizycznego testu dwóch nóg GSM nie wykonano bez właściciela i pozostaje `UNVERIFIED_UNTIL_PHYSICAL_TWO_LEG_TEST`. Nie zmieniano ustawień trwałych, nie wysłano SMS i nie wykonano połączeń.
3. **Wdrożyć odebrany pakiet lokalny:** zastosować oczekujące migracje `20261013001` i `20261013002`, wdrożyć kod i wykonać odbiór produkcyjny. Nie ponawiać zastosowanej już migracji `20261010001`. Feature flag Sekcji 16 pozostaje wyłączona do osobnej decyzji. Ten etap nie uruchamia SMS, rozmów ani realnych płatności testowych bez odrębnej decyzji. **ZAKOŃCZONE 13.10.2026:** obie migracje są zdalnie zastosowane, produkcja ma wdrożenie READY, a endpoint płatności odpowiada 401 dla nieautoryzowanego żądania (trasa działa i wymaga autoryzacji).
4. **Dokończyć dwie ścieżki usługi z punktów 16.2–16.3:** pilny termin dziś/jutro oraz jednorazowe powiadomienie o dostępności, razem z SMS, parserem odpowiedzi, blokadą terminu, płatnością i uprawnieniem do rozmowy. Szacunek 35–60 h; zależny od decyzji o treściach, czasie blokady i płatnościach.
5. **Dokończyć audio i publiczny interfejs:** briefing, komunikaty, naliczanie czasu, sygnały, pytania po rozmowie oraz dwa czytelne wejścia na stronie; dopiero po odbiorze usunąć starszą publiczną nawigację/status. Szacunek 25–45 h, z odbiorem wizualnym i funkcjonalnym. **LOKALNIE ODEBRANE 13.10.2026:** `CallRoom` ma briefing audio, timer, komunikaty końca i ostrzeżenia, sygnał Web Audio, limit pytań po rozmowie oraz ścieżkę odzyskiwania; testy `zapytaj-call-flow`, `voip-chat-limits` i `question-access` przeszły 6/6. Pozostaje osobny odbiór wizualny desktop/mobile i rzeczywistej rozmowy audio.
6. **Uruchomić kontrolowany pilotaż jednej osoby, potem partnera:** najpierw pełny scenariusz z jednym świadomie zatwierdzonym uczestnikiem; później kody 30/50/100% dla jednej lecznicy, po decyzjach o finansowaniu, danych partnera i zgodzie na branding. Szacunek 35–75 h plus czas organizacji i odpowiedzi uczestników. **PRZYGOTOWANE LOKALNIE 13.10.2026:** ścieżka pilotażowa kodów jednorazowych, kampanii lecznicy, rabatów i zwolnienia kodu po wygaśnięciu działa; testy `promo-codes` i powiązane testy routingu przeszły 70/70 (12 pominiętych wizualnych). Dodano bezpieczny tryb QA `PILOT_TEST_MODE=true`, który ustawia 0,01 zł wyłącznie razem z `APP_PAYMENT_MODE=mock`, `TEST_CHECKOUT_ENABLED=true` i poza produkcją; test pełnej rezerwacji QA 0,01 zł przechodzi. Do zamknięcia pozostaje wskazanie jednej osoby, zgoda na realną rezerwację oraz dane i zgoda brandingowa partnera.

AGY-1 i AGY-2 od 13.10.2026 wielokrotnie kończyły zadania `exitCode=3`; użytkownik wskazał wyczerpanie limitu AGY. Nie opierać odbioru na tych pustych raportach ani nie wysyłać kolejnych zadań przy wyczerpanym limicie. Dalsze kroki prowadzić samodzielnie po decyzji właściciela o następnym etapie. Stan planu nie jest zgodą na produkcyjne migracje, deploy, połączenia, SMS, płatności ani kontakt z klientami.
## AKTUALNY STAN ODBIORU — 13.10.2026

Ten blok jest źródłem bieżącego statusu. Starsze wpisy poniżej opisują historię prac i nie mogą nadpisywać tego stanu.

- **Punkt 1 / PDF i Revolut:** kod, migracje i produkcyjny deploy są wykonane; pozostaje jeden rzeczywisty test powiadomienia Revolut i pobrania PDF.
- **Punkt 2 / Motorola:** Tailscale i ADB przez LTE działały przed restartem; automatyczny powrót ADB po restarcie nie został potwierdzony. Test GSM dwóch nóg i obserwacja 24 h pozostają otwarte.
- **Punkt 3 / deploy pakietu:** zakończony. Migracje `20261013001` i `20261013002` są zastosowane na Supabase, a produkcyjny deploy jest READY.
- **Punkt 4 / pilny termin:** lokalnie przygotowany i przetestowany; bramka `SECTION16_ADMIN_PROPOSALS_ENABLED` pozostaje wyłączona do osobnego odbioru produkcyjnego.
- **Punkt 5 / audio:** lokalnie przygotowany i przetestowany; pozostaje odbiór wizualny desktop/mobile oraz rzeczywista rozmowa audio.
- **Punkt 6 / pilot:** kody i tryb QA 0,01 zł są przygotowane poza produkcją; nie wykonano jeszcze pilota z realnym uczestnikiem.
- **Deploy:** poprawki PDF/Revolut i migracje punktu 3 są wdrożone. Nie wdrażać flag Sekcji 4 ani trybu QA 0,01 zł na produkcję.

Wpisy oznaczone jako wcześniejsze, lokalne, „w toku” lub „bez deployu” zachowują wartość historyczną, ale nie są bieżącym stanem wykonania.

### Odbiór telefonii GSM — 14.10.2026

- **Próba 1 — FAIL przez zmianę uprawnień w trakcie rozmowy.** Logcat potwierdza, że Android zabił proces `pl.regulski.phoneagent` z powodem `permissions revoked` o 14:18:13.109. Telecom odpiął `AgentInCallService` o 14:18:13.215 (po 9,332 s) i uruchomił awaryjny interfejs Google. Pierwsza noga później stała się aktywna, ale automat już nie działał; nie powstała druga noga. Przyczyną przerwania była zmiana uprawnień/roli w trakcie aktywnego testu, nie błąd samego `onBind()` usługi.
- **Próba 2 — częściowy PASS przepływu aplikacji, FAIL połączenia drugiej nogi.** Przy niezmienianiu uprawnień/roli przez całą rozmowę `AgentInCallService` odebrał połączenie, uzyskał `ACTIVE`, zawiesił pierwszą nogę i zainicjował drugą. Modem IMS zwrócił `callSessionStartFailed`, `end-cause 41`, `sip-error-code 0`; Telecom zapisał `ERROR_UNSPECIFIED`. 3GPP TS 24.008 definiuje przyczynę 41 jako `temporary failure`. Właściciel potwierdził, że druga karta/numer testowy (zaczynający się od 4) nie działa. To wyjaśnia niepowodzenie drugiej nogi; nie jest to dowód usterki automatu ani braku konferencji u operatora. Nie ponawiać połączeń na tę kartę do czasu jej naprawy lub podmiany.
- Po błędzie automat rozłączył pierwszą, zawieszoną linię; `dumpsys telephony.registry` potwierdził stan idle. Telecom pokazał wsparcie konferencji IMS, ale nie doszło do aktywnego drugiego połączenia ani do merge, więc konferencja i audio dwóch rozmówców pozostają nieodebrane.
- **Stan końcowy urządzenia:** Google Dialer domyślny, `SEND_SMS=false`, `CALL_PHONE=true`, `ANSWER_PHONE_CALLS=true`, brak aktywnych połączeń. Nie wysłano SMS. Nie ruszano autostartu po restarcie. Nie wykonano kolejnego wybierania.
- **Wniosek operacyjny:** przed każdym testem ustawić rolę/uprawnienia, potem nie zmieniać ich od startu pierwszej nogi do zakończenia całej sesji. Po zakończeniu najpierw potwierdzić Telecom idle, dopiero potem przywrócić Google i cofnąć `SEND_SMS`. Dla drugiej nogi zachować kod IMS i uzyskać rozstrzygnięcie operatora/ponowną próbę dopiero jako osobny świadomie kontrolowany etap; nie wykonywać seryjnych prób.

### Odbiór wizualny pokoju rozmowy — 14.10.2026

- **CODE: PASS** dla ograniczonego, warunkowego mechanizmu zrzutów w `scripts/ui-smoke.ts`; zapis działa wyłącznie po ustawieniu `UI_SMOKE_SCREENSHOT_DIR`. Poza zrzutami smoke zachowuje dotychczasowy stan zgody. W kontekście zrzutów ustawiono wyłącznie `analytics consent=denied`, a nakładkę developerską Next.js wyłączono tylko na obrazie po zebraniu diagnostyki.
- **FUNCTIONAL: PASS lokalnego smoke** (`npm run ui-smoke`, exit 0): pokój telefoniczny, zablokowany i aktywny pokój wideo oraz timer/odświeżenie przeszły. To nie jest test rzeczywistego połączenia audio ani urządzeń multimedialnych. Headlessowy Jitsi zgłosił brak wejścia audio (`gum.not_found`); zewnętrzne zasoby zgłosiły `ERR_BLOCKED_BY_CLIENT`.
- **RESPONSIVE: PASS** po bezpośrednim obejrzeniu widoków 390×844 oraz 1280×960: panele i przyciski układają się w szerokości viewportu, bez widocznego poziomego przepełnienia.
- **VISUAL: PASS** dla układu pokoju i paneli na desktopie i mobile. Diagnostyka smoke odnotowała różnice hydracji przy sztucznie przesuniętym zegarze przeglądarki (timer oraz nagłówek stanu wideo); nie zmieniono UI ani treści. Różnice wynikają ze scenariusza z zegarem klienta ustawionym niezależnie od zegara serwera i nie stanowią dowodu na błąd rzeczywistej rozmowy.
- **SCOPE: PASS** — tylko harness testowy; żadnych zmian w aplikacji, deployu, realnych połączeń, SMS-ów ani płatności. Pozostaje oddzielny fizyczny odbiór rozmowy audio po naprawieniu lub wymianie drugiej karty testowej.

### Aktualny stan pozostałych bramek — 14.10.2026

- **Revolut/PDF:** lokalny audyt wykazał brak atomowego claimu dla zamówień PDF w równoległych powiadomieniach. Dodano fail-closed RPC i lokalną migrację `20261014001_atomic_revolut_commerce_reconciliation.sql`; syntetyczne testy potwierdzają dokładnie jedno rozliczenie przy duplikacie, dwóch różnych ID dla jednego zamówienia oraz ponowieniu HTTP bez drugiego grantu. `tests/payment-reconciliation-safety.test.ts` 8/8, `npx tsc --noEmit` i `git diff --check` PASS. Migracja i kod **pozostają wyłącznie lokalne** — bez Supabase/deployu. Wcześniej ustawiona produkcyjna flaga `PHONE_AGENT_AUTO_PAYMENT_RECONCILIATION` i wdrożenie nadal wymagają osobnego, świadomego odbioru po zabezpieczeniu tej poprawki; nie wykonywano płatności.
- **Telefonia:** druga testowa karta (ta zaczynająca się od 4) jest niesprawna. Brak merge/audio pozostaje otwarty; nie ponawiać wybierania na tej karcie. Autostart/odzyskiwanie po restarcie pozostaje na końcu kolejki.
- **Pilny termin, pilot i pozostałe wdrożenia:** lokalny kod nie zastępuje decyzji o publicznych treściach, oknie blokady, uczestniku, partnerze ani odrębnej zgody wdrożeniowej. Nie zmieniać produkcji, kontaktować uczestników ani uruchamiać SMS/płatności.
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

- **Supabase, rozliczenia: PASS dla konfiguracji, migracji i testu syntetycznego.** Pusty `SUPABASE_SERVICE_ROLE_KEY` w Vercel wyjaśniał błędy autoryzacji aplikacji. Osobne timeouty `EAUTHQUERY` przy provisioningu roli puli Postgresa były odrębnym objawem; ich pierwotna przyczyna nie została ustalona. Po restarcie połączenie wróciło, migracje `20261014001` i `20261014002` są zastosowane. Druga dodaje wspólny atomowy fingerprint dla RPC rezerwacji i PDF.
- Produkcyjny test użył syntetycznej rezerwacji i PDF za tę samą kwotę: pierwsze rozliczenie przeszło, ponowienie tego samego fingerprintu nie przyznało PDF. Całość zakończono `ROLLBACK`; nie pozostały dane testowe. Nie wykonano prawdziwej płatności, nie wysłano maila ani SMS. Dostępność: HTTP 200/132 terminy; endpoint powiadomień bez tokenu: 401. Aplikacja działa z deploymentu `dpl_wwkJdc2SjBadZLUnsC4mpxm2YVut` (READY); migracja bazy nie wymagała nowego buildu.
- **Telefonia, test dwóch nóg: BLOCKED numerem docelowym.** Telefon testowy/numer `452151983` został wcześniej potwierdzony jako niedziałający. Karta T-Mobile w slocie 1 telefonu A jest zarejestrowana jako karta inicjująca; `LOADED,ABSENT` oznacza pusty slot 2 telefonu A i nie blokuje hold/merge. Zdalny port ADB odrzuca połączenie, lecz telefon działa przez USB. Nie ponawiano połączenia. Do odbioru pozostaje naprawić lub podmienić numer `452151983`, a następnie wykonać jedną kontrolowaną próbę hold, merge, dwukierunkowego audio i bezpiecznego rozłączenia.
- **Dalej:** (3) sprawdzić Tailscale/heartbeat po restarcie i 24 h obserwacji; (4) odebrać prawdziwe audio po naprawie telefonu testowego; (5) zamknąć decyzje o pilocie i pilnym terminie; (6) na końcu autostart oraz przegląd synchronizacji/prywatnych danych Google.

### Przegląd raportu Opus i odbiór wydania — 15.10.2026

- **Potwierdzone i poprawione:** parser cytatów Markdown; gramatyka i odstępy w nagłówkach kontaktu/problemy; obcinanie tytułów SEO na granicy słów; zdublowany meta tag PWA; brak globalnego error boundary; nieaktualne asercje release smoke i checklista testów; nieprawdziwe daty `lastmod`; dopisano potwierdzone dwa pytania w Pokoju przez 7 dni do opisu usługi.
- **Punkty raportu nie wymagające zmiany:** produkcja już zwraca HSTS `max-age=63072000`; `/api/contact` ma limiter; redukcja ruchu działa w CSS; `getProductJsonLd` nie jest używany, więc nie emituje mylącego schema Product; opis PDF poprawnie mówi o zakupie po rozmowie.
- **Odłożone do osobnego przeglądu:** pominięty link do treści i masowe etykiety/alt wymagają audytu wielu układów i formularzy; polling, lazy loading, CSP i CSS wymagają pomiarów przed zmianami; twierdzenia prawne i nazewnictwo COAPE wymagają osobnego potwierdzenia. Zbiorczych liczb „500+” i „~330 WCAG” nie potraktowano jako zweryfikowanych ustaleń.
- **Testy lokalne:** `npm test` — 405 PASS, 12 SKIP, 0 FAIL; sześć testów materiałów/admina — 70/70; cztery testy bezpieczeństwa/płatności/Sekcji 16 — 50/50; `npx tsc --noEmit`, `git diff --check` i `npm run build` — PASS. Brak realnych płatności, SMS-ów, połączeń i mutacji Supabase.
- **Supabase:** `npx supabase migration list --linked` potwierdziło zgodność lokalnej i zdalnej historii do `20261014002`; migracji nie ponawiano. Wdrożenie kodu i testy produkcyjne pozostają następnym krokiem.

### Weryfikacja lokalna — 15.10.2026

- Pakiet lokalny PDF/Revolut i Sekcji 16: **CODE / FUNCTIONAL PASS** dla sprawdzonych ścieżek. Celowane testy `payment-reconciliation-safety`, `commerce-payment-security`, `section16-autonomous-model` i `section16-calendar-hold-integration`: **50/50 PASS**; `npx tsc --noEmit` oraz `git diff --check`: PASS.
- Testy używały lokalnego magazynu i danych syntetycznych. Logi `phone_agent` pochodziły z izolowanych testów; nie wysłano prawdziwego SMS, nie wykonano płatności ani zmian produkcyjnych.
- **DEVICE / fizyczny punkt 2: BLOCKED** — `adb devices -l` nie wykrył urządzenia. Test odzyskiwania Tailscale/heartbeat po restarcie i 24-godzinna obserwacja wymagają ponownego podłączenia telefonu. Test dwóch nóg GSM pozostaje zablokowany do czasu naprawy lub wymiany potwierdzonego niesprawnego numeru testowego.

### Wdrożenie i odbiór produkcyjny — 15.10.2026

- Zmiany zapisano w commicie `7fdcbc2` (`Harden commerce and Section 16 flows`) i wdrożono na Vercel Production; domena `regulskibehawiorysta.pl` wskazuje na ten build.
- Produkcyjny `live-smoke` **PASS** dla markera `CLEAN_START_REPO_V1:main:7fdcbc2`: strona główna, przekierowanie `/termin`, `/mapa-sprawy` i `/polityka-prywatnosci` przeszły wymagane i zabronione frazy.
- `npx supabase migration list --linked` wcześniej potwierdził zgodność historii lokalnej i zdalnej do `20261014002`; brak oczekujących migracji, niczego nie zastosowano ponownie.
- Testy lokalne i build są odnotowane wyżej: `npm test` 405 PASS / 12 SKIP / 0 FAIL, TypeScript i build PASS. Nie wykonano prawdziwych płatności, SMS-ów ani połączeń.
- Commit jest lokalnie na `main`, który pozostaje o jeden commit przed `origin/main`. W repo zostały lokalne pliki poza commitem: `.ai-bridge/`, `docs/`, `raportopus.md` oraz trzy pliki `data/*.json` bez różnicy treści względem HEAD.

### Potwierdzenie pushu i stanu produkcji — 15.10.2026

- Commit `7fdcbc2` wypchnięto na `origin/main`; `HEAD`, `origin/main` i `origin/HEAD` wskazują ten sam commit.
- `vercel inspect https://regulskibehawiorysta.pl` potwierdził deployment `dpl_GApyFwMepBgtiX6gdVpzFnyjjXLH` jako Production / Ready z aliasami apex i `www`. Produkcyjny smoke test dla tego commita przeszedł.

### Merytoryczna kwalifikacja raportu Opus — 15.10.2026

Raport jest listą tropów, nie audytem potwierdzającym „500+ problemów”. Zawiera obserwacje z 5.10.2026, nieaktualne nazwy komponentów i rekomendacje bez pomiaru. Decyzje poniżej opierają się na obecnym kodzie i odbiorze release z 15.10.

**Zasadne i już naprawione / potwierdzone:**
- Parser cytatów, rekcja i odstępy nagłówków, obcinanie tytułu SEO, duplikat meta PWA, globalny `app/error.tsx`, stare asercje release checklist/smoke, benefit dwóch pytań oraz błędne daty `lastmod` zostały poprawione przed buildem i wdrożeniem `7fdcbc2`.
- HSTS działa w produkcji (`max-age=63072000`); limiter `/api/contact` istnieje; opis materiałów PDF komunikuje warunek zakupu po rozmowie. Nie są to bieżące braki.
- Helper `getProductJsonLd` istnieje w `lib/schema.ts`, ale nie ma wywołań na stronach PDF. Teza o aktualnie emitowanym mylącym `Product` jest fałszywa dla bieżącego serwisu.
- `prefers-reduced-motion` występuje w globalnych arkuszach. To nie rozstrzyga, czy każda animacja JS respektuje preferencję, ale wyklucza ogólne twierdzenie, że projektu w ogóle jej brakuje.

**Zasadne jako następny celowany audyt:**
- Skip-to-content: w `app/layout.tsx` nie ma globalnego linka, a homepage nie ma `id="main-content"`. Warto wdrożyć go razem z poprawnym celem/ustawieniem fokusu na publicznych trasach i sprawdzić klawiaturą; samo dodanie linka bez celu nie zamknie problemu.
- Dostępność formularzy i sterowania klawiaturą: raport wskazuje istotny obszar, ale nazwy plików i liczby są nieaktualne. Obecne `BookingForm`, `ContactLeadForm` i `ZapytajIntakeForm` zawierają widoczne etykiety, `htmlFor`/`id` oraz ARIA dla części kontrolek. Następny przegląd powinien objąć realne kluczowe ścieżki rezerwacji, płatności i kontaktu, z klawiaturą i czytnikiem/axe; elementy klikalne należy zastępować natywnym `button`/`a`, nie hurtowo dodawać `role="button"`.
- Alt-y wymagają przeglądu znaczenia obrazu. `alt=""` jest poprawne dla ilustracji dekoracyjnych, więc nie wolno liczyć każdego pustego alt jako błędu. Twierdzenie o 26 brakach nie jest potwierdzone.

**Nie uzasadnia zmiany bez dodatkowego dowodu lub pomiaru:**
- Polling: pauzowanie odpytywania dostępności na ukrytej karcie może oszczędzać żądania; interwały timerów rozmów/rezerwacji nie powinny być mechanicznie zatrzymywane, bo czas ma płynąć także w tle. Audytować osobno konkretne pollery i ich koszt.
- `next/dynamic`, preload fontów, LazyMotion, `loading.tsx`, CSS 1.7 MB, `priority` obrazów i optymalizacja ikon: najpierw zmierzyć bundle, LCP/INP/CLS i zachowanie tras. Rozmiar źródłowego CSS ani brak API `next/dynamic` sam nie dowodzi regresji.
- Cache-Control wymaga reguł per endpoint. Odpowiedzi z danymi prywatnymi/administracyjnymi już używają `no-store`; nie dodawać jednego cache policy do wszystkich API.
- Rozbudowa CSP może łamać skrypty inline, analytics i integracje. Tylko etapowe raportowanie naruszeń po inwentaryzacji źródeł ma sens.
- Liczby „~330 WCAG”, „~420 React”, „~200 pól” i „~85 elementów” nie zawierają reprodukowalnego skanu ani listy bieżących lokalizacji; nie przyjmować ich jako wyniku.

**Tezy błędne, nieaktualne albo wymagające decyzji właściciela:**
- Jitsi w regulaminie pełnej konsultacji nie jest zaszłością: bieżąca oferta opisuje około 90-minutową konsultację przez Jitsi. Nie zmieniać regulaminu na telefoniczny bez zmiany usługi.
- Powołanie `error.tsx` na WCAG 3.3.1 jest błędne: boundary jest użyteczny dla odporności i komunikatu awarii, ale kryterium 3.3.1 dotyczy identyfikacji błędu przy wprowadzaniu danych.
- Zmiana żeńskiego opisu alt na męski wymaga sprawdzenia przedstawionej sceny, nie płci właściciela serwisu. Status COAPE należy trzymać przy potwierdzonym publicznym określeniu „dyplomant COAPE”; nie wymyślać zamiennej nomenklatury.
- Teza o „bait-and-switch” przy PDF za 19 zł jest oceną lejka. Obecny opis ujawnia wymóg wcześniejszej rozmowy; zmiana cen, kolejności lub modelu sprzedaży wymaga decyzji biznesowej.
- Twierdzenia o granicy farmakoterapii i zgodności RODO nie są rozstrzygnięte audytem kodu. Wymagają sprawdzenia konkretnych publicznych sformułowań i właściwej podstawy prawnej przed zmianą.

**Priorytet roboczy po tym przeglądzie:** najpierw dostępność klawiaturowa (skip link + krytyczne formularze), potem ewentualne optymalizacje wyłącznie na podstawie pomiarów. Bez hurtowych zmian copy, CSS, CSP ani oferty na podstawie niezweryfikowanych liczb raportu.

### Wyniki sprawdzenia i korekt uwag Opus — 15.10.2026 (ciąg dalszy)

Każdą uwagę sprawdzono względem aktualnego kodu, zbudowanej aplikacji, testów lub pomiaru. Poniżej zapisuję rozstrzygnięcia i wykonane korekty; wcześniejsze podsumowanie pozostaje historią kwalifikacji, a ten aneks aktualizuje je po realizacji.

**Zasadne — poprawione w tym etapie:**
- Brak globalnego skip linka i poprawnego, fokusowalnego celu treści: dodano link oraz cele dla layoutu i specjalnych nagłówków. Test klawiatury (Tab → Enter → Tab) przeszedł na desktopie i mobile, także z JS wyłączonym.
- Autouzupełnianie logowania, resetu hasła i dostępu do PDF: pola dostały właściwe wartości `autocomplete`.
- Ruch wskaźnika postępu przy ustawieniu ograniczenia animacji: uwzględniono `prefers-reduced-motion`; kolor tekstu o kontraście poniżej 4,5:1 skorygowano, a kolor spełniający próg zostawiono. Dodano też obrys dla `forced-colors`.
- Dane strukturalne strony `/materialy`: dodano zgodne z widoczną zawartością `CollectionPage`, `ItemList` i breadcrumbs; bez `Product`, `Offer` ani wymyślonych cen.
- Niepotrzebne wymuszanie dynamicznego renderowania `/opinie`: usunięto; wynik builda potwierdza trasę statyczną.
- Błąd na granicy całej aplikacji: dodano niezależny `app/global-error.tsx` z retry i powrotem do strony głównej. `app/error.tsx` pozostaje granicą segmentu.
- Odpytywanie statusów dostępności w ukrytej karcie: sześć rzeczywistych pollerów GET wstrzymuje okresowe odczyty, wykonuje jeden odczyt po powrocie i pilnuje serializacji; zegary/countdown i POST nie zostały zmienione.
- Obrazy okładek PDF na `/materialy`: usunięto `unoptimized`, co pozwoliło użyć optymalizacji Next.js. Lighthouse wykazał pozostałą szacowaną oszczędność ok. 249 KiB mobile i 33 KiB desktop, zamiast wcześniejszych ok. 2,752 KiB.
- Dostępność stopki i marki: poprawiono rozmiar pól dotykowych linków prawnych oraz usunięto nazwę ARIA marki, która nie zgadzała się z widocznym tekstem.
- Karty PDF: usunięto nadpisujące `aria-label`; ich nazwa dostępna wynika teraz z widocznej treści i zawiera tytuł. Wszystkie 16 kart objęto testem regresji.

**Sprawdzone ponownie — brak podstaw do zmiany albo zarzut fałszywy/nieaktualny:**
- HSTS działa w produkcji (`max-age=63072000`); limiter `/api/contact` jest zaimplementowany i wywoływany; H1 na stronach głównych i materiałów poprzedza nagłówki podrzędne.
- Nie emitowano schematu `Product` z helpera bez użycia; brak tego zarzutu nie uzasadnia dodawania cen/ofert do danych strukturalnych.
- Formularze publiczne mają widoczne etykiety i powiązania; zgłoszone nazwy komponentów, liczniki masowych braków, „85 klikalnych divów” oraz „52 niebezpieczne asercje” nie odtwarzają się jako usterki. Każdą asercję oceniano z uwzględnieniem wcześniejszego guard/throw.
- Puste `alt` dla elementów dekoracyjnych jest prawidłowe; liczba „26 braków alt” nie stanowi zweryfikowanego wyniku. Opis obrazu przedstawiającego dwie kobiety i psa nie wymaga zmiany na podstawie płci właściciela serwisu.
- Nazwy nieistniejących/starych komponentów, teza o braku obsługi reduced motion w całym projekcie, zarzut o Jitsi w aktualnym regulaminie, stare daty sitemap, błędne stwierdzenie o braku limitera, CSP/cache bez analizy endpointów oraz rozmiar źródłowego CSS jako rzekomy rozmiar dostarczany użytkownikowi nie są same w sobie potwierdzonymi błędami.
- Wskazane obrazy z `priority` już miały ustawiony priorytet. Sam brak `next/dynamic`, preloadu wszystkich fontów lub `loading.tsx`, a także obecność `lucide-react`/pojedynczego użycia Framer Motion nie uzasadnia mechanicznej zmiany bez konkretnego pomiaru.
- Zewnętrzne logo Magwet jest oficjalnym znakiem; kopiowanie do repo wymaga potwierdzenia źródła/licencji. Oceny zgodności RODO, zakresu farmakoterapii, profilu COAPE, treści prawnych, bezpłatnych/odpłatnych PDF i modelu konsultacji wymagają decyzji właściciela lub właściwej weryfikacji merytorycznej; nie zmieniano oferty ani zamrożonego copy.

**Zweryfikowane wyniki i nierozwiązana obserwacja:**
- `npm run build`: PASS; ESLint i kontrola typów PASS; 85 stron statycznych wygenerowano. `/materialy` i `/opinie` są statyczne.
- Pełny `npm test` po wszystkich poprawkach: 420 PASS, 12 SKIP, 0 FAIL; regresja kart jest częścią pełnego zestawu. `git diff --check`: PASS.
- Świeży Lighthouse `/materialy`: mobile accessibility/best-practices/SEO = 1/1/1, desktop = 1/1/1; audyty `label-content-name-mismatch` i `target-size` zaliczone. Desktop performance 0,97 (LCP 1,1 s); mobile performance 0,63 (LCP 6,1 s). Wyniki wydajności są zależne od lokalnego pomiaru i zmienne; wcześniejsze przebiegi dawały różne wyniki.
- Pozostaje rzeczywisty problem wydajności mobile, widoczny również na `/` i `/opinie` w wcześniejszym przebiegu Lighthouse (LCP około 5,7–6,2 s, render-blocking/nieużywany CSS). Nie zmieniano szeroko globalnych arkuszy, bo bez wskazania odpowiedzialnych tras/reguł groziłoby to regresją na wielu stronach. To zasadny osobny cel optymalizacji oparty na profilowaniu tras, a nie zamknięta uwaga.
- Nie zmieniano bazy Supabase: te poprawki nie wprowadzają migracji ani zmiany schematu.

**Następny krok w planie:** przegląd obecnego profilu CSS/LCP na konkretnych trasach mobile i propozycja wąskiej optymalizacji z kontrolą regresji; utrzymać osobno decyzje właściciela o treściach prawnych, ofercie i zewnętrznych profilach.

### Wyniki pozostałych zasadnych uwag Gemini — 15.10.2026

- Obrazy Open Graph/Twitter: dodano dopasowane istniejące obrazy dla `/kontakt`, `/opinie`, `/regulamin` i `/polityka-prywatnosci`; domyślne metadane pozostałych tras zachowują dotychczasowy obraz. FAQ pozostaje przy obrazie domyślnym, ponieważ kandydat zawiera wycofane CTA „Zarezerwuj Kwadrans”. Testy sprawdzają adresy, wymiary plików oraz oba kanały social.
- Polling dostępności: widżet strony głównej i status nagłówka korzystają z jednego widocznego pollera i jednego GET co 20 s zamiast osobnych timerów 20/30 s. Zachowano indywidualne deadline’y 6 s, pauzę w tle, wspólne odświeżenie po powrocie, obsługę błędów oraz niezależność formularza i pozostałych pollerów.
- Logo Magwet: obraz z oficjalnego adresu źródłowego (PNG 300×61) zapisano jako `public/branding/magwet-logo.png` i podłączono lokalnie na stronie „O mnie”, usuwając runtime zależność od hosta Magwet. Nie zmieniono treści publikacji ani opisów.
- Wydajność CSS/LCP: profil Lighthouse potwierdza problem mobilny: `/` 6,2 s LCP, `/materialy` 6,1 s, `/opinie` 5,7 s; trzy wspólne globalne arkusze wykazują łącznie ok. 184 KiB nieużywanego CSS na każdej trasie, a praca `styleLayout` na stronie głównej wynosiła ok. 1,69 s. Nie wykonano hurtowego podziału globalnych arkuszy, bo są importowane wspólnie i obejmują wiele tras; ten wynik uzasadnia osobny, kontrolowany etap rozdzielenia stylów trasowych z pomiarem i kontrolą wizualną. Problem nie jest zamknięty.
- Nie zmieniono modelu sprzedaży PDF, cen, treści prawnych ani oferty — te uwagi pozostają decyzją właściciela. Nie powstały migracje Supabase ani zmiany schematu.
- Weryfikacja tej kontynuacji: `npm test` — 426 PASS, 12 SKIP, 0 FAIL; `npm run build` — PASS, lint, typy i 85 stron statycznych; ukierunkowane testy metadata 18/18 i pollingu 13/13 PASS; `git diff --check` PASS.

### Wynik profilu CSS/LCP i deployu Gemini — 15.10.2026

- A/B obejmował 18 kombinacji: `/`, `/materialy`, `/opinie` przy szerokości 390 i 1365 px, z osobnym wyłączeniem każdego z trzech globalnych arkuszy. Każde wyłączenie zmieniało obliczony układ. Bez `subpages-editorial.css` mobilny nagłówek zmieniał się z `grid` na `flex`, a jego wysokość z 142,41 do 121,41 px; desktopowy pasek statusu zwężał się z 1078 do 220,39 px.
- Profile mobile z 15.10 (05:19–05:29 UTC): LCP `/` 6,157 s (performance 0,62), `/materialy` 6,123 s (0,63), `/opinie` 5,738 s (0,66); transfer CSS odpowiednio 203 308 B, 199 073 B i 199 073 B. Trzy wspólne chunki aktualnego buildu: 396 540 + 842 540 + 85 692 B. Nie pominięto żadnego arkusza: ich CSS wpływa na wspólne zmienne/reset, shell, nagłówek, stopkę i style tras.
- Nie zmieniano arkuszy w tym etapie: A/B obejmował statyczny SSR i obliczone style przy wyłączonych skryptach i zasobach zewnętrznych; nie stanowi pełnej akceptacji wizualnej. Następny bezpieczny zakres to wydzielenie wspólnych zmiennych/resetu, nagłówka i stopki z zachowaniem kolejności kaskady, a dopiero potem przeniesienie `.materialy-showcase-*` do arkusza trasy `/materialy` oraz ponowna kontrola motywów, breakpointów i pozostałych stron.
- Commit wdrożony: `e052ac4` (`dpl_EmCrwTAQAPwtzxXad7a8wZAKVyRh`), Vercel Production READY, alias `https://regulskibehawiorysta.pl`; live smoke PASS z markerem `CLEAN_START_REPO_V1:main:e052ac4`. Produkcyjne `/kontakt`, `/opinie`, `/regulamin`, `/polityka-prywatnosci`, `/faq` zwracają oczekiwane obrazy OG/Twitter; lokalne logo Magwet odpowiada HTTP 200 (`image/png`, 5669 B).
