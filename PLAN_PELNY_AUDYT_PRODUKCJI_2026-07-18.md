# Pełny audyt produkcyjny — 2026-07-18

## Cel

Zweryfikować faktyczne doświadczenie użytkownika i konfigurację produkcyjną
`https://regulskibehawiorysta.pl`, a następnie naprawić każdą potwierdzoną
usterkę. Audyt nie kończy się na kodzie ani odpowiedzi HTTP: wymaga przejścia
widocznych ścieżek, kontroli wiadomości oraz dowodu z działającej produkcji.

## Zasady wykonania

- Używać tylko kontrolowanych danych QA; nie ingerować w rezerwacje ani dane
  prawdziwych klientów.
- Rzeczywista ścieżka BLIK: przygotować rezerwację testową, zatrzymać ją przed
  zapłatą, przekazać użytkownikowi dane do ręcznego potwierdzenia, a dopiero po
  jego sygnale sprawdzić odblokowanie wszystkich następnych kroków.
- Nie wysyłać komunikacji do realnych klientów. Maile QA mogą trafić wyłącznie
  na kontrolowany adres testowy, jeśli będzie potrzebne potwierdzenie dostawy.
- Każdy problem oznaczyć jako: naprawiony, potwierdzony bez zmiany, oczekuje na
  użytkownika lub zewnętrznie zablokowany.

## Zakres i kolejność

1. [GOTOWE] Zbudować pełną mapę tras z `app/`, sitemap, redirectów i API oraz
   powiązać je z istniejącym planem publicznych powierzchni.
2. [GOTOWE] Sprawdzić anonimowe ścieżki: nawigację, strony usług, treści, blog,
   materiały, regulaminy, kontakt, błędy/404 i responsywne powłoki.
3. [GOTOWE] Sprawdzić rezerwację od wyboru terminu do płatności BLIK, w tym
   błędy formularza, terminy, odświeżanie statusu i bezpośrednie linki.
4. [GOTOWE] Przygotować jedną prawdziwą rezerwację QA BLIK i zatrzymać się przed
   operacją finansową do ręcznego potwierdzenia przez użytkownika.
5. [CZĘŚCIOWO GOTOWE — SKRZYNKA QA] Po potwierdzeniu sprawdzić potwierdzenie, e-mail klienta i admina,
   pokój rozmowy, materiały, zmianę/anulowanie terminu oraz odświeżenie sesji.
6. [CZĘŚCIOWO GOTOWE — SKRZYNKA QA] Przetestować konto: rejestrację, nowy e-mail aktywacyjny, logowanie,
   reset hasła, wylogowanie, `/konto`, `/pokoj` i ścieżki administratora.
7. [GOTOWE LOKALNIE] Audytować wszystkie e-maile: treść, polszczyznę, kolejność, layout,
   wersję mobilną, błędy i brak języka projektowego.
8. [GOTOWE — Z POZOSTAŁYMI DECYZJAMI] Zweryfikować Vercel, Supabase Auth/DB/Storage, Resend, domenę, DNS,
   TLS, nagłówki bezpieczeństwa, zmienne runtime i integracje płatności.
9. [GOTOWE] Naprawić potwierdzone usterki, uruchomić regresję, wdrożyć i sprawdzić
   produkcję po wdrożeniu.
10. [GOTOWE Z OGRANICZENIEM SKRZYNKI QA] Zapisać raport końcowy: pokrycie, dowody, poprawki, ryzyka i elementy
    wymagające decyzji użytkownika.

## Dziennik dowodów

| Obszar | Stan | Dowód / wynik |
| --- | --- | --- |
| Mapa tras | gotowe | 98 wykrytych tras, 98 kończy się HTTP 200; oczekiwane redirecty potwierdzone. |
| Przejścia anonimowe | gotowe | Desktop i mobile, nawigacja, blog, materiały, regulaminy, kontakt oraz 404 sprawdzone w pełnym crawl. |
| BLIK QA | gotowe z wyjątkiem odbioru e-maili | Ręcznie potwierdzona rezerwacja QA ma `paid`, `consultationReady=true` i `ready=true`; potwierdzenie, pokój, reload i rejoin sprawdzone na produkcji bez duplikowania zgłoszenia płatności. |
| Konto i aktywacja | częściowo gotowe — skrzynka QA | Trasy konta i admina, no-store, limity, logout i ochrona pokoju sprawdzone; kliknięcie aktywacji, login i reset wymagają kontrolowanej skrzynki. |
| E-maile | gotowe lokalnie — odbiór oczekuje | Renderowanie i scenariusze wysyłki są pokryte testami; stan produkcyjny potwierdza konfigurację Resend, lecz nie fizyczne doręczenie do skrzynki QA. |
| Konfiguracja zewnętrzna | częściowo gotowe | Domena Resend/DKIM, TLS i Supabase Auth zweryfikowane; do zastosowania sekret crona i dwie migracje. Brak MX/DMARC pozostaje decyzją właściciela. |
| Regresja i wdrożenie | gotowe | 147 testów OK, 13 celowo pominiętych, lint, typecheck, build, schema audit, UI smoke, release checklist 18/18 oraz strict live-readiness 5/5 przeszły; commit `019ea6a` działa na produkcji. |

## Stan po wznowieniu i wdrożeniu — 2026-07-18

- [GOTOWE] Rezerwacja QA BLIK została ręcznie potwierdzona przez właściciela. API zwraca
  `paid`, `consultationReady=true` i `ready=true`; potwierdzenie oraz bezpośredni link do
  pokoju działają po odświeżeniu i w świeżej sesji. Nie zgłoszono płatności ponownie.
- [GOTOWE] Lokalny UI smoke sprawdził akceptację administracyjną, odświeżenie potwierdzenia,
  zapis materiałów, wejście ponowne do pokoju oraz wariant telefoniczny i wideo. Izolowane E2E
  potwierdziło zmianę terminu, anulowanie ze zwrotem i zwolnieniem terminu oraz upload i chroniony
  odczyt MP4; dane QA zostały usunięte.
- [GOTOWE] Naprawiono angielski nagłówek w telefonicznym pokoju (`Jak to działa?`), błąd typów
  dla historycznego wpisu commerce oraz fałszywy bloker readiness wynikający z maskowania sekretu
  w lokalnym snapshotcie Vercel. Produkcyjny runtime potwierdza Supabase Auth przez kontrolowane
  odrzucenie nieprawidłowej sesji.
- [GOTOWE] Wdrożono commit `019ea6a` na `https://regulskibehawiorysta.pl`; marker wersji,
  widoczny polski nagłówek pokoju, release checklist (18/18) i strict live-readiness (5/5)
  zostały sprawdzone po wdrożeniu.
- [OCZEKUJE NA SKRZYNKĘ QA] Nie ma kontrolowanej, dostępnej skrzynki ani konta QA. Bez niej nie
  można uczciwie potwierdzić fizycznego odbioru maili, kliknięcia aktywacji, resetu hasła,
  zalogowanego widoku klienta i powiązania konta z opłaconą konsultacją. Obecne adresy
  `qa-live-blik-…@example.com` są celowo niedoręczalne.

## Potwierdzone poprawki przed wdrożeniem

- Ujednolicono ochronę linków płatności: każdy kupujący dostaje nieprzewidywalny
  token widza; samo wejście na stronę BLIK nie zmienia już stanu zamówienia.
- Zgłoszenie ręcznej wpłaty jest idempotentne i ma trwałe etapy przekazania do
  rezerwacji oraz powiadomienia administratora.
- Konto i pokój są dostępne wyłącznie po opłaconej, potwierdzonej konsultacji;
  zamówienia materiałów nie mogą odblokować pokoju.
- Uspójniono strefę `Europe/Warsaw` dla Google Calendar, ICS, legacy flowów i
  testu pokoju (CET/CEST).
- Wiadomości dla klientów mają neutralne tematy bez problemu i dokładnego
  terminu; poprawiono odmianę statusów, link zmiany terminu i błędne obietnice
  wysyłki.
- Follow-up po pobraniu materiału wymaga osobnej, dobrowolnej zgody i zawiera
  potwierdzane wypisanie; dodano limity żądań i ochronę przed botem.
- Crony wymagają sekretu; migracja zastępuje historyczny harmonogram zwracający
  404 poprawnym wywołaniem produkcyjnego endpointu.
