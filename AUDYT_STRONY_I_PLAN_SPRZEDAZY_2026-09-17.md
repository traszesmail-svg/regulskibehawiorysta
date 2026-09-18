# Audyt strony i plan przebudowy sprzedaży

> NIE WDRAŻAĆ TEGO PLANU. Użytkownik odrzucił rozbudowę, wybór pies/kot i zastępcze zwierzęta. Aktualny brief: [PLAN_HOME_TERRA.md](./PLAN_HOME_TERRA.md). Poniżej zachowano dawną propozycję wyłącznie jako historię. Opis stockowego hero był niezweryfikowany: aktualne HOME_HERO_PHOTO wskazuje /branding/omnie.png.

Stan: 17.09.2026. Audyt obejmuje aktualną stronę główną, architekturę wejść sprzedażowych i komponenty wspólne. Produkcja odpowiada prawidłowo. Automatyczna kontrola wizualna w przeglądarce była niedostępna z powodu błędu środowiska, więc przed publikacją zmian potrzebny jest ręczny przegląd desktopu i telefonu.

## Diagnoza

Strona ma dobry kierunek komunikacji: od razu mówi, dla kogo jest, podaje cenę 79 zł i prowadzi do pierwszej rozmowy. Problemem nie jest brak treści, lecz hierarchia. Pierwszy ekran sprzedaje rozmowę, a kolejne ekrany nie wzmacniają dostatecznie trzech pytań klienta: „czy to dla mnie”, „co dokładnie dostanę” i „dlaczego mam zaufać właśnie Tobie”.

Na stronie głównej po hero są trzy krótkie fakty, trzy kroki, Mapa zachowania i FAQ. To czytelne, ale zbyt abstrakcyjne i wizualnie podobne. Brakuje zdjęcia człowieka z własnymi zwierzętami, krótkiego dowodu kompetencji, piktogramów przy informacji oraz jednoznacznego porównania: krótka rozmowa / pełna konsultacja / materiały.

## Błędy i priorytety

### P0 — poprawić najpierw

1. **Zbyt szybkie przejście z obietnicy do zakupu.** Cena jest w hero, ale klient nie widzi natychmiast, co wydarzy się przez 15 minut i z czym kończy rozmowę. Pod CTA trzeba dać trzy ikony: telefon, notatnik z planem, strzałkę „co dalej”.
2. **Brak osobistego dowodu zaufania na stronie głównej.** Obecna fotografia hero jest stockowa. Nie buduje rozpoznawalności Krzysztofa ani relacji z odbiorcą.
3. **Rozproszone wejścia do usług.** Nawigacja pokazuje „Konsultacja”, „Terapia”, „Materiały”, a główna oferta to „Zapytaj”. Trzeba pokazać jedną ścieżkę: najpierw Zapytaj, potem — gdy ma sens — pełna konsultacja; materiały są wsparciem, nie konkurencyjną decyzją.
4. **Brak wizualnych kotwic przy skanowaniu.** Liczby i kroki są tekstowe. Na telefonie użytkownik skanuje blokami; piktogramy powinny rozróżniać czas, cenę, telefon, plan i bezpieczeństwo.

### P1 — następna warstwa

5. Dodać blok „Czy to jest dla mnie?” z trzema kartami: pies, kot, „nie umiem nazwać problemu”. Każda karta prowadzi do tego samego pierwszego kroku, z odpowiednio uzupełnionym opisem.
6. Dodać krótki blok „Poznaj nas” z fotografią Krzysztofa, psa i kota oraz dwoma zdaniami o sposobie pracy. Nie kopiować całej podstrony „O mnie”.
7. Dodać dowody zaufania bez przeładowania: COAPE / kwalifikacje, opinie, jasna informacja o rozmowie telefonicznej i cenie. Jeden zwarty pas, nie kolejna długa sekcja.
8. Ujednolicić CTA: główne zawsze „Zapytaj behawiorystę — 79 zł”; drugie „Zobacz, jak wygląda rozmowa” albo „Otwórz Mapę zachowania”. Unikać kilku równorzędnych przycisków o różnym celu.

### P2 — porządek całej strony

9. Ustalić spójny styl obrazów: obecnie są zdjęcia stockowe, generowane grafiki i ilustracje. Docelowo strona sprzedażowa powinna używać głównie prawdziwych zdjęć Krzysztofa i jego zwierząt, a ilustracje zostawić dla narzędzi, quizów i materiałów.
10. Ograniczyć widoczne na raz opcje w nagłówku na telefonie. Najważniejsza ma być pomoc i rozpoczęcie, a konto klienta jako mały link pomocniczy.
11. Przejść każdą ścieżkę na telefonie: strona główna → Zapytaj → termin → płatność → potwierdzenie. Kontrola ma ocenić czytelność, długość formularzy, nazwy przycisków i powrót po błędzie.

## Docelowy układ strony głównej

1. **Nagłówek:** logo, 4–5 prostych linków, jedno CTA „Zapytaj”.
2. **Hero w dwóch kolumnach:** po lewej problem, rozwiązanie, cena i CTA; po prawej mniejsze zdjęcie. Pod przyciskiem trzy mikrofakty z ikonami: 15 min, 79 zł, telefon.
3. **„Czy to dla mnie?”:** trzy karty pies / kot / nie wiem. Każda z własnym piktogramem i jednym zdaniem.
4. **Jak wygląda pierwszy krok:** trzy równe karty z ikonami: opisujesz sytuację, rozmawiamy, dostajesz kierunek.
5. **Poznaj nas:** prawdziwe zdjęcie Krzysztofa z psem i kotem, krótki tekst oraz link „O mnie i moje podejście”.
6. **Co wybierasz dalej:** proste porównanie: Zapytaj, pełna konsultacja, materiały. Zapytaj jest oznaczone jako rekomendowany start.
7. **Opinie i kwalifikacje:** mały blok cytatów i znaków zaufania.
8. **FAQ i końcowe CTA.**

Układ utrzymuje sprzedaż na jednej stronie: najpierw emocja i prostota, potem wyjaśnienie, zaufanie, wybór i decyzja.

## Piktogramy

Użyć istniejącego zestawu `lucide-react`, nie mieszać go z emoji ani przypadkowymi grafikami.

- `Clock3` — czas rozmowy;
- `WalletCards` — cena;
- `PhoneCall` — forma rozmowy;
- `ClipboardCheck` — pierwszy plan działania;
- `Dog`, `Cat`, `CircleHelp` — wybór sytuacji;
- `BadgeCheck` lub `ShieldCheck` — kwalifikacje i bezpieczny proces.

Piktogram ma stać obok krótkiego komunikatu, nie zastępować tekstu. Wystarczy 22–28 px, jeden kolor akcentu i jednakowe tło koła albo kwadratu.

## Zdjęcia psa i kota

Do czasu dostarczenia prawdziwych zdjęć w hero zostaje obecne zdjęcie Krzysztofa. Nie używamy ilustracji z obcym psem i kotem.

Docelowo utworzyć katalog:

`public/branding/krzysztof-i-zwierzeta/`

W nim umieścić 8–12 oryginalnych kadrów: Krzysztof z białym psem i szarym kotem, osobno pies, osobno kot, poziome i pionowe ujęcia. Zestaw pozwoli przygotować jedno dopracowane zdjęcie hero oraz osobne, autentyczne kadry dla „O mnie”, opinii, kontaktu i materiałów.

Najlepsze miejsce dla docelowego zdjęcia: prawa część hero, w formacie pionowego zaokrąglonego kadru o mniejszej dominacji niż obecne zdjęcie. Drugie, szersze zdjęcie należy dać w sekcji „Poznaj nas”. Dzięki temu zwierzęta są obecne od początku, ale nie zasłaniają decyzji zakupowej.

## Kolejność wdrożenia

1. Zbudować nową stronę główną na obecnej grafice tymczasowej: hero, mikrofakty z ikonami, trzy karty problemów, proces, porównanie usług i blok zaufania.
2. Przejść cały lejek na desktopie i telefonie oraz poprawić błędy treści i odstępów.
3. Po otrzymaniu zdjęć stworzyć katalog, wybrać kadry i podmienić grafikę tymczasową na prawdziwe zdjęcie hero oraz blok „Poznaj nas”.

Nie zmieniamy teraz logiki rezerwacji, płatności ani telefonu. Najpierw porządkujemy wejście sprzedażowe i komunikację wartości, potem potwierdzamy konwersję całej ścieżki.
