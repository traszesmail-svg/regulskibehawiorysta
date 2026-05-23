# Plan napraw i kontroli - 2026-05-21

Status: **plan do akceptacji**. Naprawy nie są rozpoczęte.

## Zasady

- Najpierw akceptacja planu.
- Potem naprawy partiami.
- Po każdej partii kontrola konkretnego błędu.
- Na końcu pełna kontrola regresji: treść, typografia, mobile, rezerwacje.

## Kolejność napraw

### Etap 1 - cena `Kwadrans na już`

Cel: `kwadrans-na-juz` musi zapisywać `99 zł`, a zwykły Kwadrans dalej `69 zł`.

Zakres:

- `lib/booking-services.ts`
- testy/logika cenowa
- ścieżki tworzenia rezerwacji lokalnie i Supabase

Kontrola:

- test jednostkowy/quick smoke ceny usług,
- ponowny test 30 rezerwacji,
- oczekiwany wynik: `kwadrans-na-juz` 8/8 po `99 zł`, całość 30/30 bez błędów.

### Etap 2 - polskie znaki w aplikacji i adminie

Cel: usunąć teksty typu `Zaloguj sie`, `dostep`, `materialy`, `Dostep do panelu`.

Zakres:

- `/login`
- `/konto`
- `/pokoj`
- `/dostep`
- `/materialy/pobranie`
- `middleware.ts`

Kontrola:

- audyt treści po poprawce,
- ręczny render wskazanych ekranów,
- brak nowych mojibake.

### Etap 3 - spójność typografii i stałych elementów

Cel: ujednolicić nagłówki, odstępy, rytm kart i fonty między głównymi stronami.

Zakres:

- `/cennik`: dopasować skalę H1 mobile i rytm hero do reszty głównych stron.
- `/cennik/pelny`: zostawić blisko aktualnego, ale sprawdzić odstępy sekcji.
- `/materialy`, `/niezbednik`, `/przybornik`, `/zamow-pdf`: zdecydować, czy H1 ma przejść na `Fraunces`, czy świadomie zostaje jako inna rodzina dla półki PDF. Jeśli celem jest spójność całej strony, przejść na `Fraunces`.
- `/opinie/dodaj`: powiększyć H1 i wpiąć go w ten sam system nagłówków.
- `/format-konsultacji`: traktować jako wizard; ujednolicić tylko stałe elementy i odstępy, bez robienia z niego hero marketingowego.
- strony prawne i `/kontakt`: sprawdzić górny limit H1 na desktopie.

Kontrola:

- pełny audyt typografii w partiach: public/article/booking/app x desktop-1365/mobile-390/narrow-320,
- porównanie screenów `/`, `/cennik`, `/cennik/pelny`, `/format-konsultacji`,
- brak nowych H1 poza systemem.

### Etap 4 - mobile layout

Cel: poprawić realne mobile błędy bez ruszania niepowiązanych sekcji.

Zakres:

- `/opinie`: widoczny tekst CTA w zielonej sekcji.
- `/kontakt`: e-mail fallbacku nie może wychodzić poza kartę.
- `/checkout` i `/payment`: `Do ustalenia` nie może łamać się jako `Do ustaleni a`.

Kontrola:

- screenshot 320 px po poprawce,
- screenshot 390 px,
- brak horizontal overflow.

### Etap 5 - decyzja o `/qa-share-20260328-v7n3m8`

Cel: usunąć albo schować starą publiczną stronę QA/share.

Kontrola:

- jeśli ma zniknąć: 404/redirect/noindex zgodnie z decyzją,
- jeśli ma zostać: H1 i polskie znaki.

## Końcowa kontrola po naprawach

Po wdrożeniu wszystkich zaakceptowanych etapów:

- `npm.cmd run lint`
- `npm.cmd run build`
- pełny audyt treści,
- pełny audyt typografii i odstępów bez blokowania mediów,
- audyt responsywności na 320/344/360/390/412/430/768/820,
- test 30 rezerwacji w lokalnym sandboxie,
- ręczna kontrola screenów: `/`, `/cennik`, `/cennik/pelny`, `/opinie`, `/kontakt`, `/checkout`, `/payment`, `/login`, `/pokoj`.

## Kryterium zamknięcia

- Brak starej ceny `109`.
- Pełna konsultacja tylko `470 zł`.
- `Kwadrans na już` zapisuje `99 zł`.
- Brak widocznych braków polskich liter w wskazanych ekranach.
- Brak pustych CTA, obciętych maili i złego łamania `Do ustalenia`.
- Główne strony mają świadomie spójny system H1/font/odstępów albo jasno opisane wyjątki dla narzędzi/app.
