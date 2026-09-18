# Strona główna — lekka korekta wizualna dla Codex Terra

Data: 17.09.2026. Status: plan do wykonania lokalnie. Ten dokument zastępuje propozycję przebudowy w AUDYT_STRONY_I_PLAN_SPRZEDAZY_2026-09-17.md, którą użytkownik odrzucił. Najnowsze instrukcje użytkownika mają pierwszeństwo.

## Polecenie dla Codex Terra

Pracuj w C:\projekt\regulskibehawiorysta. Wykonaj ten plan lokalnie i pokaż sprawdzony widok na działającym serwerze. Celem jest delikatne dopracowanie istniejącej strony głównej: lekkość, czytelne piktogramy przy tekście i szybkie przejście do zakupu jednej rozmowy. Wsparcie ChatGPT w przeglądarce służy do oceny kompozycji na screenshotach; odpowiedzi nie są automatyczną zgodą na zmianę oferty.

Nie zaczynaj nowego projektu strony. Użytkownik odrzucił karty „Mam psa / Mam kota”, porównanie trzech ofert, rozbudowany blok „Poznaj nas” i zastępcze zwierzęta. Zachowaj istniejący charakter marki: krem, oliwka, czytelny ciemny tekst, obecne fonty. Główną marką jest Regulski Behawiorysta, COAPE pozostaje dyskretnym potwierdzeniem kwalifikacji.

## 1. Stan zastany i zakres naprawy

- Są niezatwierdzone zmiany w app/page.tsx, components/HomepageZapytajHero.tsx i app/notatnik-a.css. Najpierw przeczytaj git diff, zachowaj pracę użytkownika; nie wykonuj reset --hard ani zbiorowego przywracania plików.
- Karty wyboru i ofert usunięto z JSX, lecz w CSS zostały m.in. homepage-fit*, homepage-about-bridge*, homepage-offer-path* i reguły wpływające na inne elementy. Usuń wyłącznie nieużywane dodatki z tej próby po sprawdzeniu odwołań.
- W CSS reguła mobilna ze zdjęciem o min-height:260px jest później nadpisana min-height:520px przy 980px i 410px przy 760px. Nadal występuje order:-1, czyli zdjęcie przed tekstem. To utrudnia dotarcie do CTA.
- Wcześniejsze display:flex dla .homepage-sales-proof > div jest później nadpisane display:grid o tej samej specyficzności. Rozmiary tekstu też mają kolejne nadpisania. Ustal jedną skuteczną definicję zamiast doklejać kolejną łatkę.
- Ostatnia edycja zmieniła wspólny object-position dla zdjęć homepage i /zapytaj z center 21% na center. Wyizoluj korekty homepage, aby nie zmieniać kadru na /zapytaj.
- Obecnie homepage-sales-proof oraz homepage-sales-process powtarzają opis rozmowy. Połącz ich funkcje w jeden krótki blok.
- Cena jest w osobnym panelu, CTA i nowych mikrofaktach. Usuń osobny ozdobny panel ceny; zostaw cenę przy faktach i w CTA.

Podstawowe pliki: app/page.tsx, components/HomepageZapytajHero.tsx, app/notatnik-a.css. Dane oferty: lib/public-offer.ts. Sprawdź components/NotatnikA.tsx i components/Footer.tsx przed przemieszczaniem opinii/końcowego CTA — nie dubluj treści generowanej w stopce.

## 2. Jedna koncepcja, jeden układ

### A. Nagłówek

Zachowaj obecną nawigację i nazwę. Bez rozbudowy menu. Korekty wysokości/odstępów tylko jeśli screenshot wykaże problem, w zakresie homepage. Dostęp do konta ma być pomocniczy względem zakupu.

### B. Pierwszy ekran

Desktop: około 65% na informację, 35% na mniejsze obecne zdjęcie. Maksymalna szerokość tekstu około 580px, zdjęcia 300–360px; wysokość zdjęcia około 320–380px, bez wymuszonego 560px. Wartości są punktem startowym do kontroli kadru, nie celem samym w sobie.

Kolejność informacji:

1. Mały podpis „Krzysztof Regulski · behawiorysta psów i kotów”.
2. H1 „Martwi Cię zachowanie psa lub kota?”
3. Maksymalnie dwa krótkie zdania: „Opowiedz, co się dzieje. Podczas krótkiej rozmowy ustalimy pierwszy krok i to, czy potrzebna jest dalsza pomoc.”
4. Trzy piktogramy z etykietami: „Do 15 minut”, „79 zł”, „Telefonicznie”. Czas i cena z PUBLIC_ZAPYTAJ_OFFER i formatPublicOfferPrice, bez nowych stałych 79 w JSX.
5. Jedyny dominujący przycisk: „Zapytaj behawiorystę — 79 zł”. Link początkowo zachowaj /zapytaj. Sprawdź możliwość użycia /zapytaj#formularz na rzeczywistym widoku; skróć drogę tylko jeśli klient nadal widzi i rozumie termin, cenę oraz wymagane informacje. Nie zmieniaj formularza ani procesu zakupu.
6. Jedna krótka informacja pod CTA: „Rozmowa z Krzysztofem Regulskim, bez kamery.”

Mobile: tekst → piktogramy → CTA → dopiero zdjęcie. H1 około 32–38px, treść 16–18px, odstępy 12–20px. Przycisk min. 48px wysokości i pełna dostępna szerokość. Fakty w jednej krótkiej linii z możliwością zawijania, nie trzy wysokie karty. Przy 390×844 CTA ma się mieścić w pierwszym ekranie przy standardowym powiększeniu. Sprawdź również 360×800; przy powiększeniu nie ścinaj treści, dopuszczaj przewijanie. Zdjęcie na mobile maks. około 200–240px wysokości, poprawnie skadrowane, bez zakrywania twarzy. Nie rozwiązuj przepełnienia przez globalne overflow-x:hidden.

### C. Jeden krótki blok „Jak to działa”

Trzy pozycje, piktogram bezpośrednio obok tekstu; na desktopie jeden rząd, na mobile trzy zwarte wiersze. Bez dużych ramek, cieni i numerów w wielkich kołach.

- MessageSquareText: „Opisujesz sytuację” — „Kilka zdań o tym, co Cię niepokoi.”
- CalendarDays: „Rezerwujesz rozmowę” — „Wybierasz dostępny termin i opłacasz rozmowę.”
- PhoneCall: „Rozmawiamy” — „Ustalamy pierwszy krok i dalsze możliwości pomocy.”

Zweryfikuj zgodność kolejności z aktualnym /zapytaj przed finalizacją. Nie obiecuj rozwiązania problemu w kwadrans, diagnozy, pisemnego raportu ani planu terapii, jeśli konkretna oferta tego nie zapewnia. Nie zmieniaj globalnego homepageProcessSteps, jeśli jest współdzielone; nową krótką treść trzymaj lokalnie dla homepage.

### D. Zaufanie, pytania i domknięcie

Jeden lekki wiersz z ikoną BadgeCheck, nazwiskiem i potwierdzonym statusem „Dyplomant COAPE · technik weterynarii”; mały link do /o-mnie lub istniejącego publicznego profilu. Korzystaj z aktualnych danych w lib/site.ts. Nie rozszerzaj tytułu na „certyfikowany”, nie dodawaj niepotwierdzonych statystyk ani ocen.

Zachowaj prawdziwe opinie istniejącego komponentu, w jednym miejscu. FAQ maks. cztery obecne pytania, krótkie odpowiedzi. Na końcu powtórz to samo CTA i cenę z danych oferty. Mapa zachowania pozostaje małym linkiem pomocniczym przy FAQ; nie osobnym wielkim banerem ani równorzędną drogą zakupu w hero. Pełna konsultacja, terapia i materiały pozostają dostępne z istniejącej nawigacji.

## 3. Biały pies i szary kot — znak osobisty, nie wybór usługi

Użytkownik wskazuje własnego białego psa i szarego kota ze starego nagłówka. Mają być dyskretnie obecni. Nie potrzebujemy przycisków do wyboru gatunku ani losowych zwierząt w ich zastępstwie.

Docelowa kompozycja: mniejsze obecne zdjęcie specjalisty, obok/u dołu dwie niewielkie podobizny właściwych zwierząt jako jeden akcent marki (około 64–88px każda na desktopie, 40–56px na mobile). Umieść je w obszarze zdjęcia pod CTA na mobile, nie dodawaj nowego dużego bannera. Nie zasłaniaj twarzy/tekstu, nie rób z nich klikalnych kart. Późniejsze zdjęcia właściciela pozwolą zastąpić akcent jednym dobrym wspólnym kadrem.

Przejrzane pliki:
- heder/dog-choice-avatar.png: jasny kremowy pies, ilustracja akwarelowa.
- heder/cat-choice-avatar.png: pręgowany kot z białą piersią, ilustracja akwarelowa. Nie ma potwierdzenia, że to wskazany szary kot. Nie uznawaj zgodności na podstawie nazwy pliku.
- public/images/mobile-header-pies-kot-reference.png: rudawy pies i pręgowany kot — odrzucone, nie używać.
- public/images/homepage/home-bg-*-1to1.webp: inne zwierzęta w lesie — nie używać do tego celu.
- public/branding/regulski-web/hero/hero-home.webp: stara makieta z logo i tekstem — nie wklejać jako obraz całego interfejsu.

Przed wstawieniem odnajdź właściwy dawny nagłówek/zasób (także git history, jeśli potrzeba) i obejrzyj go. Gdy nie da się potwierdzić właściwych podobizn, dokończ pozostałe korekty i zgłoś konkretnie ten brak; zostaw obecne zdjęcie specjalisty, bez obcych zastępców i pustych ramek. Nie czekaj z całym wdrożeniem na sesję zdjęciową. Oryginały przyszłych prywatnych zdjęć trzymaj poza public; do public trafiają tylko wybrane pliki przeznaczone na stronę, bez metadanych lokalizacji.

## 4. Piktogramy i lekkość

Użyj istniejącego lucide-react: Clock3, WalletCards, PhoneCall w hero; MessageSquareText, CalendarDays, PhoneCall w procesie; BadgeCheck przy kwalifikacjach. Przed użyciem sprawdź eksporty z zainstalowanej wersji. SVG 24–28px, strokeWidth około 1.8–2, flex-shrink:0, kolor oliwkowy wyraźny na tle. Małe tło maks. 36–40px tylko jeśli poprawia widoczność. Odstęp ikona–tekst 8–12px. Ikony dekoracyjne aria-hidden, znaczenie zawsze zapisane tekstem.

Nie używaj emoji ani obrazkowych ikon generowanych AI. Nie dodawaj nowych bibliotek, pop-upów, animacji, karuzeli ani automatycznego dźwięku. Usuń wyłącznie powtórzenia w zakresie tej poprawki. Zachowaj istniejące fonty, lekko zmniejsz przesadne nagłówki i pionowe odstępy. Tekst pomocniczy min. 14px. Ogranicz cienie, gradienty i obwódki. Kontrast zwykłego tekstu co najmniej 4.5:1, widoczny focus, poprawny stan hover.

## 5. Wykonanie i sprawdzenie bez zbędnego zużycia limitu

1. Sprawdź diff i aktualny serwer. Zrób dwa screenshoty PRZED: 1440×900 i 390×844. Nie zaczynaj ponownego audytu całego repo.
2. Uporządkuj tylko CSS i JSX strony głównej. Preferuj scoped CSS module lub uporządkowaną istniejącą sekcję z jednoznacznym zakresem homepage. Nie naprawiaj całego 40-tysięcznego CSS. Nie modyfikuj współdzielonych selektorów dla innych podstron.
3. Wprowadź jeden wariant według powyższego. Użyj ChatGPT do oceny screenshotów, jeśli użytkownik przekaże odpowiedź. Nie czekaj bezczynnie na tę opinię i nie wykonuj jej zaleceń sprzecznych z briefem.
4. W przeglądarce sprawdź 1440×900, 390×844 oraz 360×800. Dodatkowo ciemny motyw i 200% powiększenia: tekst/CTA dostępne, bez nachodzenia, przewijania poziomego i urwanych etykiet. Sprawdź realne computed styles ikon i wysokości zdjęć, a nie obecność klas w HTML.
5. Kliknij CTA do /zapytaj i sprawdź pierwszy krok, poczekaj na załadowanie dostępności. Sprawdź FAQ, menu i link pomocniczy. Bez składania zamówień, wysyłania SMS ani płatności w ramach audytu wizualnego. Kontrolnie obejrzyj /zapytaj, czy kadrowanie nie zmieniło się przez wspólny CSS.
6. Uruchom odpowiednią kontrolę TypeScript/ESLint po zmianach, bez dopisywania testów kopiujących JSX. Testy techniczne nie zastępują screenshotów. Narzędzie przeglądarki należy uruchomić zgodnie z dostępną instrukcją Browser; jeśli środowisko blokuje połączenie (wcześniej missing field sandboxPolicy), jawnie opisz ograniczenie i użyj dopuszczalnego lokalnego fallbacku do renderu. Nie ogłaszaj zakończenia wizualnego QA na podstawie HTTP 200.
7. Zapisz screenshoty PO w output/home-light-review/desktop.png i mobile.png (a dodatkowe widoki tylko jeśli istotne). Pozostaw serwer, zwykle http://127.0.0.1:3000; podaj faktyczny adres. Nie uruchamiaj drugiego serwera na zajętym porcie i nie zatrzymuj obcych procesów.
8. Zakończ krótkim raportem: co zmieniono, co zobaczono w przeglądarce, co pozostaje niepotwierdzone. Wyłącznie lokalnie; bez push/deploy i bez zmian Vercel/Supabase, cen, backendu, logowania i telefonu.

## Kryteria odbioru

- Brak wyboru gatunku i tabeli konkurujących usług.
- Jedna główna decyzja zakupowa; znana cena, czas i forma rozmowy przy CTA.
- CTA na pierwszym ekranie 390×844, przy normalnym powiększeniu; zdjęcie za tekstem na mobile.
- Piktogramy naprawdę widoczne obok opisów, nie tylko dodane do kodu.
- Jeden blok procesu, bez powtarzania tych samych trzech kroków.
- Prawidłowe zwierzęta ze starego materiału albo jawnie oznaczony brak ich identyfikacji; bez dowolnych zastępstw.
- Opinie, FAQ i istotne linki zachowane; brak regresji kadru /zapytaj.
- Render desktop/mobile sprawdzony i pokazany, produkcja nienaruszona.

## Polecenie startowe do wklejenia w Codex Terra

Przeczytaj PLAN_HOME_TERRA.md w C:\projekt\regulskibehawiorysta i wykonaj go lokalnie. To delikatna korekta obecnej strony głównej: mniej powtórzeń i zbędnego CSS, mniejsze zdjęcie, widoczne piktogramy obok tekstu, jedna łatwa droga do zakupu rozmowy. Bez wyboru pies/kot, porównania usług i przypadkowych zwierząt. Właściwe zwierzęta to biały pies i szary kot ze starego nagłówka — najpierw potwierdź zasób. Sprawdź rzeczywisty render desktop/mobile, zachowaj zrzuty przed/po, uruchom podgląd lokalny. Nie wdrażaj na produkcję. Raportuj krótko i wykonuj po kolei.
