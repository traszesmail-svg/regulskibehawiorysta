# Uwagi redakcyjne — Etap 3B

## Czego nie ruszałem

Zgodnie z rozdziałem pracy z Codexem:

- nie ruszałem `app/`, `components/`, `lib/`, `pages/`, `middleware.ts`, `next.config.mjs`, `vercel.json`,
- nie ruszałem `app/sitemap.ts`, `app/robots.ts`,
- nie ruszałem istniejących `content/guides/`, `content/cases.json`,
- nie ruszałem routingu, schematów, paymentu, bookingu, legalu,
- nie ruszałem metadanych w istniejących page.tsx. SEO copy pack jest tylko propozycją do wklejenia przez Codexa.

Całość pracy mieści się w nowym katalogu [`content/blog-mvp/`](../content/blog-mvp). To czysty content pack do wdrożenia później, bez wiązania z infrastrukturą.

## Spójność z istniejącym tonem

Weryfikowałem ton na `content/guides/clean-pies-reaktywny-na-spacerze/guide.md`. Zachowałem:

- spokojny, niesprzedażowy rejestr,
- prowadzenie od pytania klienta, a nie od frazy SEO,
- krótkie, zwięzłe definicje blisko początku, gotowe do cytowania przez AI,
- FAQ jako integralną część, a nie doklejony dodatek,
- CTA do 15 min audio w końcu tekstu, bez wtrętów w każdym akapicie.

## Decyzje stylistyczne warte wdrożenia w kolejnych wpisach

- **Pierwszy akapit = krótka odpowiedź pogrubiona.** Gotowa do rich answers w Google i do cytowania przez LLM. Proponuję utrzymać w kolejnych wpisach.
- **„Krótka odpowiedź”, „Lead”, „FAQ”, „CTA”** — spójne etykiety między wpisami. Ułatwią parsowanie, kiedy ruszy warstwa techniczna bloga.
- **Formy obu rodzajów („próbowałaś/próbowałeś”).** Trochę cięższe w czytaniu, ale zgodne z tonem marki „opiekun, nie avatar”. Można później uprościć do form neutralnych jeśli redakcja tak zdecyduje.
- **Linki wewnętrzne jako propozycja**, nie jako twarde zalecenie. Decyzja o konkretnych URL-ach zostaje przy osobie wdrażającej.

## Co warto dopisać w kolejnych wpisach (nie teraz)

Nie rozszerzam listy na tym etapie. Dla kompletności zaznaczam kierunki, które wydają się najsilniejszymi następnymi tematami, gdyby zapadła decyzja o 4 kolejnych wpisach:

- **Pies ciągnie na smyczy — kiedy to jest problem, a kiedy nawyk**. Ogromny ruch z intencją informacyjną, silne wsparcie dla `/psy`.
- **Kot drapie meble — jak pracować nad drapaniem bez wojny**. Dobrze komponuje się z `/koty` i `/niezbednik`.
- **Nowy pies w domu — pierwsze 72 godziny**. Wysokie zaangażowanie, wspiera 15 min audio i kategorię adopcyjną.
- **Kiedy behawiorysta, a kiedy trener — o co pytać na starcie**. Rzadki temat w polskim internecie, dobrze różnicuje markę.
- **Lęk przed burzą / fajerwerkami — plan na sezon**. Wpis sezonowy, planowalny na sierpień–październik i sylwestra.
- **Dziecko i pies / dziecko i kot — pierwsze tygodnie**. Wysoka intencja rodzicielska, dobrze konwertuje na 15 min audio.

Każdy z tych tematów zachowuje tę samą logikę: pytanie opiekuna → krótka odpowiedź → konkretne filtry → FAQ → 15 min audio jako łagodny pierwszy krok.

## Sugestia procesowa

Każdy kolejny wpis warto pisać według tej samej struktury (slug / title / meta / H1 / lead / H2 / tekst / FAQ / CTA / linkowanie). Szablon już mamy. Przy czterech kolejnych wpisach można to zrobić w jednym sprincie contentowym, bez ruszania infrastruktury — analogicznie do etapu 3B.
