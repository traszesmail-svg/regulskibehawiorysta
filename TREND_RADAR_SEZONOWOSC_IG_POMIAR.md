# Trend Radar: sezonowość, Instagram, pomiar

## Stały link do bio

Używać w profilu i wyróżnionych relacjach:

`https://regulskibehawiorysta.pl/instagram`

Ta strona prowadzi do:

- quizu pierwszego kroku,
- mapy problemów,
- aktualnych tematów sezonowych,
- stałych linków pod najważniejsze posty problemowe.

## Aktualne tematy sezonowe

Źródło danych: `lib/seasonal-trend-radar.ts`.

Tematy aktywują się według miesiąca:

- maj-sierpień: burze i nagły hałas,
- czerwiec-sierpień: wakacje, opieka i zmiana rytmu,
- wrzesień-październik: powrót do pracy i szkoły,
- wrzesień-listopad: adopcja i pierwsze tygodnie,
- grudzień-styczeń: Sylwester i fajerwerki.

Zasada copy: sezonowość ma nazwać moment i bodziec, ale zawsze prowadzić do spokojnej ścieżki: problem, kontekst, quiz albo artykuł. Bez agresywnych obietnic i bez nowych usług.

## Pomiar

Wszystkie nowe wejścia mają UTM i `data-analytics-*`.

Najważniejsze lokalizacje eventów:

- `home-seasonal-trends`,
- `problem-hub-seasonal`,
- `instagram-link-primary`,
- `instagram-link-seasonal`,
- `instagram-link-problem-map`,
- `problem-hub-instagram-map`.

Najważniejsze kampanie:

- `trend_radar`,
- `trend_radar_seasonal`.

Lejek do sprawdzania:

- wejście z Instagrama na `/instagram`,
- klik w temat sezonowy albo problemowy,
- przejście do `/quiz`, `/problemy/...` albo artykułu,
- dalsze kliknięcie do cennika, bookingu lub formularza.

## Do zapamiętania do finalnego passu

Po sezonowości i linkowniku trzeba wrócić do finalnego visual passu dodanych landingów/problem pages:

- porównać typography, interlinie, odstępy i szerokości z home oraz top pages,
- sprawdzić kadrowanie i jakość ilustracji/zdjęć na desktopie i mobile,
- dopracować CTA i mikrocopy bez zmiany cen, usług ani tonu marki,
- sprawdzić brak poziomego scrolla i brak rozjechanych kart,
- wykonać browser QA po buildzie/deployu.
