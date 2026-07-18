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
3. [W TOKU] Sprawdzić rezerwację od wyboru terminu do płatności BLIK, w tym
   błędy formularza, terminy, odświeżanie statusu i bezpośrednie linki.
4. [OCZEKUJE NA UŻYTKOWNIKA] Przygotować jedną prawdziwą rezerwację QA BLIK i zatrzymać się przed
   operacją finansową do ręcznego potwierdzenia przez użytkownika.
5. [OCZEKUJE NA BLIK] Po potwierdzeniu sprawdzić potwierdzenie, e-mail klienta i admina,
   pokój rozmowy, materiały, zmianę/anulowanie terminu oraz odświeżenie sesji.
6. [W TOKU] Przetestować konto: rejestrację, nowy e-mail aktywacyjny, logowanie,
   reset hasła, wylogowanie, `/konto`, `/pokoj` i ścieżki administratora.
7. [GOTOWE LOKALNIE] Audytować wszystkie e-maile: treść, polszczyznę, kolejność, layout,
   wersję mobilną, błędy i brak języka projektowego.
8. [GOTOWE — Z POZOSTAŁYMI DECYZJAMI] Zweryfikować Vercel, Supabase Auth/DB/Storage, Resend, domenę, DNS,
   TLS, nagłówki bezpieczeństwa, zmienne runtime i integracje płatności.
9. [W TOKU] Naprawić potwierdzone usterki, uruchomić regresję, wdrożyć i sprawdzić
   produkcję po wdrożeniu.
10. [W TOKU] Zapisać raport końcowy: pokrycie, dowody, poprawki, ryzyka i elementy
    wymagające decyzji użytkownika.

## Dziennik dowodów

| Obszar | Stan | Dowód / wynik |
| --- | --- | --- |
| Mapa tras | gotowe | 98 wykrytych tras, 98 kończy się HTTP 200; oczekiwane redirecty potwierdzone. |
| Przejścia anonimowe | gotowe | Desktop i mobile, nawigacja, blog, materiały, regulaminy, kontakt oraz 404 sprawdzone w pełnym crawl. |
| BLIK QA | oczekuje na przygotowanie | Lokalna pełna ścieżka przeszła; rzeczywista wpłata zostanie utworzona dopiero po wdrożeniu i zatrzymana przed zapłatą. |
| Konto i aktywacja | w toku | Zweryfikowano produkcyjny URL/redirect Supabase; poprawiono bezpieczne powroty, limity i brak cache. Kliknięcie prawdziwego linku wymaga kontrolowanej skrzynki. |
| E-maile | gotowe lokalnie | 7 renderowanych szablonów desktop/mobile, polszczyzna i prywatność tematów skorygowane; testy nie potwierdzają jeszcze dostawy do skrzynki. |
| Konfiguracja zewnętrzna | częściowo gotowe | Domena Resend/DKIM, TLS i Supabase Auth zweryfikowane; do zastosowania sekret crona i dwie migracje. Brak MX/DMARC pozostaje decyzją właściciela. |
| Regresja i wdrożenie | w toku | 155 testów: 142 OK, 13 pominiętych; lint, build, schema audit, commerce smoke oraz pełny UI smoke OK. |

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
