# Plan poprawek kontaktu, bloga i dolnych CTA

Data: 2026-05-18
Repo: `C:\projekt\regulskibehawiorysta`

## Cel

Domknac wskazane poprawki bez ruszania strony FAQ. Strona FAQ ma zostac nietknieta funkcjonalnie i wizualnie, ale jej sekcja `Nie znalazles odpowiedzi?` jest wzorcem dla obrazu i stylu dolnych przekierowan do kontaktu/konsultacji.

## Zakres twardy

- `/kontakt`
  - Zmienic etykiete przycisku formularza z `Wyslij opis sytuacji` na `Wyslij`.
  - Usunac nad formularzem zbedny pasek/kafelek z adresem e-mail i czasem odpowiedzi.
  - E-mail przed sekcja `Najczesciej zadawane pytania` ma byc zawsze w jednej linii, bez lamania na dwie linie.
- `/blog`
  - Klikniecie kategorii ma przewijac do kategorii i poczatku listy artykulow, nie do ukladu z polecanym artykulem.
  - Usunac `Polecany artykul` z listingu bloga.
  - Usunac dolny napis z serduszkiem.
- Wspolne dolne CTA do konsultacji/kontaktu
  - Wziac format z blogowej sekcji `Potrzebujesz pomocy w rozwiazaniu problemu?`.
  - Zastosowac ten sam szablon do wszystkich stron, gdzie na dole wystepuje przekierowanie do konsultacji/kontaktu.
  - Zachowac oryginalny tekst danej strony; zmienic tylko layout, liscie, obraz/ilustracje, rytm i typografie.
  - Jako obraz/ilustracje uzyc tej samej grafiki ze strony FAQ z sekcji `Nie znalazles odpowiedzi?`: `/faq/faq-help-illustration-clean.png`.
- Nie ruszac `/faq`
  - Nie zmieniac `app/faq/page.tsx`, logiki FAQ ani wygladu strony FAQ.
  - Dozwolone tylko odczytanie obecnego wzorca i ponowne uzycie assetu w innych miejscach.

## Pliki do zmiany

- `components/ContactLeadForm.tsx`
  - Zmiana labela submitu na `Wyslij`.
- `app/kontakt/page.tsx`
  - Usuniecie `contact-reference-info-strip`.
  - Przeniesienie lub uporzadkowanie informacji e-mail tak, zeby przed FAQ byla jedna linia.
- `app/blog/page.tsx`
  - Usuniecie bloku `blog-redesign-featured-card`.
  - Zmiana anchorow kategorii tak, zeby prowadzily do listy artykulow po filtrze.
  - Usuniecie `blog-redesign-footnote`.
  - Podmiana obrazu w `blog-redesign-help-card` na `/faq/faq-help-illustration-clean.png`.
- `app/notatnik-a.css`
  - Tylko finalne selektory dla bloga/kontaktu i wspolnego CTA.
  - Usuniecie/neutralizacja stylow osieroconych po `featured-card` i `footnote`, jesli nadal wplywaja na layout.
- `app/globals.css`
  - Tylko jesli dolne CTA poza blogiem sa stylowane globalnie (`premium-contact-band`, `shop-consult-panel`, `pricing-2026-faq-contact`, `opinions-contact-band`, itp.).
  - Bez globalnego porzadkowania calego pliku.

## Kolejnosc wykonania

1. Kontakt
   - Zmienic label submitu.
   - Usunac info-strip nad formularzem.
   - Sprawdzic rendered text i szerokosc e-maila w mobile.

2. Blog
   - Usunac `Polecany artykul`.
   - Po kliknieciu kategorii ustawic widok na `#artykuly` / poczatek listy.
   - Usunac dolna stopke z serduszkiem.
   - Zostawic popularne artykuly tylko jesli nie przeszkadzaja filtrowi; lista filtrowana ma byc pierwszym efektem po wyborze kategorii.

3. Wspolny szablon dolnego CTA
   - Zrobic jeden wspolny wariant layoutu bazujacy na blogowym `Potrzebujesz pomocy...`.
   - Uzyc grafiki `/faq/faq-help-illustration-clean.png`.
   - Przepiac strony z dolnymi przekierowaniami do konsultacji/kontaktu, zachowujac ich tekst.
   - Nie ruszac strony FAQ.

4. CSS
   - Ujednolicic liscie, obraz, ramke, fonty i spacing w finalnych klasach.
   - Sprawdzic mobile 400 px i desktop.
   - Pilnowac, zeby e-mail nie lamal sie w `kontakt`.

5. QA
   - `rg`:
     - brak `Wyślij opis sytuacji` / `Wyslij opis sytuacji` w renderowanych komponentach,
     - brak `Polecany artykuł` / `Polecany artykul` w blog listingu,
     - brak blogowego footnote z serduszkiem.
   - `npm.cmd run lint`
   - `npm.cmd run build`
   - Browser check:
     - `/kontakt`,
     - `/blog`,
     - `/blog?category=pies#artykuly`,
     - `/blog?category=kot#artykuly`,
     - strony z dolnym CTA: `/`, `/o-mnie`, `/cennik`, `/opinie`, `/materialy`, `/psy`, `/koty` oraz inne znalezione przez `rg`.
   - Sprawdzic:
     - brak poziomego overflow mobile,
     - e-mail w jednej linii,
     - klik kategorii bloga pokazuje kategorie i poczatek listy artykulow,
     - FAQ bez zmian.

## Poza zakresem

- Brak zmian API.
- Brak zmian w routingu.
- Brak zmian w `/faq` poza wykorzystaniem istniejacego assetu jako wzorca/obrazu.
- Brak commita i deployu, dopoki nie padnie osobna komenda.
