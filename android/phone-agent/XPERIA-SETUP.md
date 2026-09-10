# Xperia F3111 — ustawienie telefonu-agenta

Telefon pozostaje normalnie używanym telefonem firmowym. Aplikacja wykonuje zadania wyłącznie po świadomym zapisaniu konfiguracji i włączeniu live.

1. Zainstaluj podpisany APK `Regulski — telefon` z pliku lokalnego; w Androidzie 7 włącz na chwilę instalowanie z nieznanych źródeł wyłącznie dla użytego menedżera plików, potem tę opcję wyłącz.
2. Przy pierwszym uruchomieniu zaakceptuj zgody: Telefon, SMS i stan telefonu.
3. W aplikacji wpisz tylko `https://regulskibehawiorysta.pl` i token telefonu, następnie wybierz `Zapisz i uruchom agenta`.
4. Wybierz `Wyłącz oszczędzanie baterii dla agenta`. W ustawieniach Sony dodatkowo wyłącz STAMINA/Smart Cleaner dla aplikacji i zezwól jej na automatyczny start po restarcie.
5. Na pasku musi stale być powiadomienie `Regulski — agent telefonu`. Jego brak oznacza, że automatyka nie jest gotowa.
6. Wykonaj test QA z własnym numerem: potwierdź automatyczne połączenie, bip po 7:30, bip po 14:00, podwójny bip po 15:00 i ręczne zakończenie w systemowej aplikacji Telefon.

Nie wpisuj tokenu do notatek, wiadomości SMS ani repozytorium. Nie włączaj `PHONE_CALL_PROVIDER=android_agent` na produkcji przed pozytywnym testem QA.
