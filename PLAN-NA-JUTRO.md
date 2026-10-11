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
