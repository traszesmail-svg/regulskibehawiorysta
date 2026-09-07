# Plan główny — Regulski Behawiorysta

Data aktualizacji: 2026-09-07  
Status: dokument kanoniczny dla dalszych decyzji i wdrożeń  
Powiązany audyt: [AUDYT-GLOWNY-2026-09-07.md](AUDYT-GLOWNY-2026-09-07.md)

## 1. Decyzja nadrzędna

Główną ścieżką serwisu jest `Zapytaj behawiorystę — 15 min`. To samodzielna, płatna rozmowa telefoniczna za **79 zł** w zwykłym terminie. Klient płaci za rozmowę i pierwszy konkretny kierunek; nie jest to zaliczka ani ukryty formularz kwalifikacyjny do pełnej konsultacji.

`Zapytaj teraz` kosztuje **104 zł** wyłącznie wtedy, gdy behawiorysta rzeczywiście włączy dostępność live. Przy braku bezpiecznie potwierdzonej dostępności klient widzi prawdziwy status i zwykłe terminy. Aktualny stan produkcyjny live to `offline`, więc nie wolno obiecywać natychmiastowej rozmowy.

Pełna konsultacja (**475 zł**) jest osobną usługą, udostępnianą indywidualnym kodem po `Zapytaj`. Terapia może być kolejnym krokiem dopiero po pełnej konsultacji. Hotel jest ścieżką warunkową po formularzu kwalifikacyjnym, a nie automatycznym terminarzem.

Ten dokument jest właściwym planem dla aktualnego zakresu, ponieważ obejmuje nie tylko wygląd strony, ale też rzeczywisty model `Zapytaj`: termin, cenę, ręczny BLIK, statusy rozmowy, Pokój klienta, pytania po rozmowie, rekomendację materiału, bezpieczeństwo Mapy i granice Zadarmy.

## 2. Zasady produktu i komunikacji

- Na pierwszym ekranie i w głównym CTA priorytet ma `Zapytaj behawiorystę`.
- Formularz nie wymaga rasy ani sztywnej etykiety problemu; wystarczy opis sytuacji, gatunek i dane potrzebne do kontaktu.
- Zwykły termin i live są dwoma sposobami skorzystania z tej samej rozmowy; live nie jest osobną diagnozą ani otwartą kolejką.
- `Mapa zachowania` jest opcjonalną pomocą dla osoby niezdecydowanej, nie obowiązkową bramką sprzedażową. Zawiera najpierw pytania bezpieczeństwa.
- Przy zagrożeniu człowieka, zwierzęcia, urazie lub nagłym problemie zdrowotnym pierwszeństwo ma właściwa pomoc, nie rekomendacja płatnej usługi.
- Blog i materiały PDF wspierają edukację oraz decyzję o konsultacji. Nie konkurują z główną usługą.
- Po zakończonym `Zapytaj` behawiorysta może opublikować krótkie podsumowanie, maksymalnie dwa pytania uzupełniające ważne przez 7 dni oraz jedną trafną rekomendację materiału albo dalszej ścieżki.
- Ręczny BLIK pozostaje aktywnym mechanizmem płatności. Zwykły termin jest blokowany na 5 minut, a zgłoszona płatność czeka na ręczną decyzję maksymalnie 24 godziny.
- PayU i automatyczne potwierdzanie wpłat z prywatnego Revoluta pozostają wyłączone. Odczyt e-maila nie jest traktowany jak webhook płatniczy.

## 3. Kolejność prac

### Etap A — kontrolowany pilot zwykłego `Zapytaj`

Przyjąć 3–5 prawdziwych rezerwacji zwykłego terminu za 79 zł, z ręcznym BLIK-iem i ręcznym potwierdzeniem. `Zapytaj teraz`, automatyczny Revolut i test Zadarmy nie wchodzą do tego pilotażu.

Przy każdym przypadku zapisać wyłącznie wewnętrzny identyfikator rezerwacji oraz:

- czy klient rozumiał różnicę między `Zapytaj` a pełną konsultacją;
- czy płatność została poprawnie obsłużona;
- ile trwało potwierdzenie;
- czy pojawił się problem z terminem, potwierdzeniem, linkiem lub kontaktem telefonicznym.

Nie zapisywać w planie imion, telefonów, adresów e-mail ani opisów problemów.

Pilot zatrzymać natychmiast przy podwójnym terminie, potwierdzeniu bez pewnej wpłaty, złej cenie, niedziałającym linku, braku informacji dla klienta albo niejasności co do zakresu usługi.

### Etap B — prawdziwy test telefonu

Po zapewnieniu numeru i kontroli warunków wykonać osobny test produkcyjny:

1. potwierdzić płatność i uruchomienie Zadarmy;
2. sprawdzić opóźnienie połączenia, odebranie i statusy;
3. zweryfikować limit techniczny 17 minut;
4. sprawdzić brak odpowiedzi, retry, rozłączenie i ręczny fallback;
5. nie udostępniać live publicznie przed zakończeniem całego testu.

Sam test lokalny i symulowane webhooki nie są dowodem prawdziwego połączenia.

### Etap C — automatyzacja dopiero po pomiarze

Automatyczne potwierdzanie wpłat z prywatnego Revoluta można rozważyć dopiero po pilotażu. Najpierw tryb obserwacyjny na sztucznych wiadomościach, potem idempotentne dopasowanie identyfikatora, kwoty i waluty, ręczny fallback oraz możliwość natychmiastowego powrotu do ręcznego BLIK-a.

WhatsApp pozostaje opcjonalnym kanałem wsparcia pełnej konsultacji i terapii. Przycisk może pojawić się dopiero przy bezpiecznym, potwierdzonym adresie konfiguracji; pusta konfiguracja nie może tworzyć martwego CTA.

### Etap D — poprawki jakościowe i bramka wydania

- naprawić trzy błędy typów w testach, jeżeli mają pozostać częścią pełnej kontroli TypeScript;
- po każdej zmianie powtórzyć testy, lint, build, audyt schematu i kontrolę publicznych tras;
- sprawdzać desktop i mobile na rzeczywistym renderze, nie tylko na odpowiedzi HTTP;
- nie zmieniać cen, usług, tonu marki ani zakresu bez osobnej decyzji.

## 4. Bramka akceptacji

Za wykonane można uznać tylko to, co ma dowód w aktualnym audycie i nie narusza ograniczeń poniżej:

- główna oferta i CTA mówią prawdę o `Zapytaj`, cenie i kanale telefonu;
- zwykły termin, blokada, ręczny BLIK, potwierdzenie i idempotencja zachowują właściwe statusy;
- live jest pokazywany tylko przy realnej dostępności;
- Mapa zatrzymuje się na bezpieczeństwie przed ścieżką usługową;
- Pokój udostępnia dane i pytania dopiero po właściwym zakończeniu rozmowy;
- stare adresy prowadzą do aktualnej ścieżki bez martwych stron;
- publiczne widoki nie mają błędów konsoli, uszkodzonych obrazów ani poziomego overflow;
- bramka produkcyjna nie ukrywa nieprzetestowanego telefonu, płatności ani automatyzacji.

## 5. Aktualny status

Szczegółowe dowody z ponownego audytu znajdują się w [AUDYT-GLOWNY-2026-09-07.md](AUDYT-GLOWNY-2026-09-07.md). Decyzja operacyjna na teraz: **GO tylko dla zwykłego `Zapytaj` za 79 zł z ręcznym BLIK-iem i ręcznym potwierdzeniem; NO-GO dla `Zapytaj teraz`, prawdziwej Zadarmy i automatycznego Revoluta do czasu osobnych testów.**

Historyczne plany i stare raporty zostały skonsolidowane albo usunięte z głównego katalogu. Dokumenty treści, poradników i materiały operacyjne niezwiązane z planem projektu pozostają poza tym porządkiem.
