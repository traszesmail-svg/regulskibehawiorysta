# Plan wdrożenia — ETAP 5C

Praktyczny plan dla Codexa.
Kolejność = priorytet operacyjny i efekt przy koszcie wdrożenia.

---

## Faza 1 — Do wdrożenia natychmiast (przed finalnym visual)

**Efekt:** usuwa największe problemy wiarygodności i hierarchii przed publikacją.

| Co | Plik źródłowy | Gdzie wdrożyć |
|---|---|---|
| Korekta /o-mnie: 15 min nie jest wstępem do konsultacji | `16-REDAKCYJNY-QA-TRUST-LAYER.md` | app/o-mnie/page.tsx |
| Korekta /opinie: lead nie opisuje strony | `16-REDAKCYJNY-QA-TRUST-LAYER.md` | app/opinie/page.tsx |
| Korekta /niezbednik: CTA bez języka sprzedażowego | `16-REDAKCYJNY-QA-TRUST-LAYER.md` | app/niezbednik/page.tsx |
| Korekta /kontakt: czas odpowiedzi | `16-REDAKCYJNY-QA-TRUST-LAYER.md` | app/kontakt/page.tsx |
| Sekcja potwierdzenia rezerwacji: co dalej | `13-AFTERCARE-POST-CONSULTATION-PACK.md` | app/confirmation lub odpowiednik |

---

## Faza 2 — Treści operacyjne (wdrożyć przy uruchamianiu obsługi)

**Efekt:** gotowe wiadomości do wysyłki przy pierwszych rezerwacjach — brak tych treści powoduje niespójność komunikacji.

| Co | Plik źródłowy | Gdzie |
|---|---|---|
| Wiadomości po rezerwacji / potwierdzeniu wpłaty | `13-AFTERCARE-POST-CONSULTATION-PACK.md` | szablony e-mail / komunikacja ręczna |
| Wiadomości przed i po konsultacji | `13-AFTERCARE-POST-CONSULTATION-PACK.md` | szablony e-mail |
| Wiadomość follow-up po kilku dniach | `13-AFTERCARE-POST-CONSULTATION-PACK.md` | szablon e-mail / SMS |
| Prośba o opinię z linkiem do formularza | `11-REVIEW-ACQUISITION-PACK.md` | szablon e-mail |

---

## Faza 3 — Formularz i zasady zbierania opinii (przed pierwszą publikacją)

**Efekt:** zanim opublikujesz opinię, masz gotowy proces i zasady — chroni przed ryzykiem.

| Co | Plik źródłowy | Gdzie |
|---|---|---|
| Mikrocopy formularza opinii | `11-REVIEW-ACQUISITION-PACK.md` | formularz Google Form / Tally / własny |
| Tekst zgody na publikację | `11-REVIEW-ACQUISITION-PACK.md` | formularz + regulamin |
| Zasady redakcyjne publikacji | `11-REVIEW-ACQUISITION-PACK.md` | wewnętrzna procedura |
| Pytania pomocnicze do opinii | `11-REVIEW-ACQUISITION-PACK.md` | formularz jako opcjonalne pytania |

---

## Faza 4 — Profil publiczny i GBP (wdrożyć po ustaleniu adresu działalności)

**Efekt:** spójny opis marki na zewnętrznych profilach — Google, Facebook, katalogi.

| Co | Plik źródłowy | Gdzie |
|---|---|---|
| Opisy krótki / średni / długi | `12-TRUST-GBP-PROFILE-PACK.md` | Google Business Profile, FB, katalogi |
| Bio specjalisty — warianty | `12-TRUST-GBP-PROFILE-PACK.md` | GBP, media społecznościowe, stopka |
| Q&A do profilu publicznego | `12-TRUST-GBP-PROFILE-PACK.md` | GBP Q&A, sekcja trust na stronie |

---

## Faza 5 — Niezbędnik copy (wdrożyć przy wdrożeniu lub aktualizacji Niezbędnika)

**Efekt:** Niezbędnik przestaje być listą linków, staje się eksperckim hubem.

| Co | Plik źródłowy | Gdzie |
|---|---|---|
| Sekcja „od czego zacząć" | `14-NIEZBEDNIK-COPY-PACK.md` | app/niezbednik/page.tsx |
| Sekcja „co znajdziesz" | `14-NIEZBEDNIK-COPY-PACK.md` | app/niezbednik/page.tsx |
| Intro do kategorii | `14-NIEZBEDNIK-COPY-PACK.md` | sekcje kategorii |
| Opisy kart / bloków | `14-NIEZBEDNIK-COPY-PACK.md` | karty produktów/materiałów |
| CTA do Niezbędnika z innych stron | `14-NIEZBEDNIK-COPY-PACK.md` | /psy, /koty, /blog, landingi |

---

## Faza 6 — Conversion microcopy (wdrożyć przy final visual review)

**Efekt:** spójny język w kluczowych miejscach decyzji — money pages, porównania, sekcje CTA.

| Co | Plik źródłowy | Gdzie |
|---|---|---|
| Leady / subheady money pages | `15-CONVERSION-MICROCOPY-PACK.md` | /cennik, /konsultacja, /behawiorysta-* |
| Porównanie 15 min vs 60 min | `15-CONVERSION-MICROCOPY-PACK.md` | /cennik, /konsultacja |
| Sekcja „od czego zacząć" | `15-CONVERSION-MICROCOPY-PACK.md` | wszystkie money pages + homepage |
| Odpowiedzi na obiekcje do FAQ | `15-CONVERSION-MICROCOPY-PACK.md` | /cennik, /konsultacja, /behawiorysta-* |
| Mikrocopy po wpłacie / potwierdzeniu | `15-CONVERSION-MICROCOPY-PACK.md` | /payment, /confirmation |

---

## Co może poczekać

| Co | Dlaczego nie pilne |
|---|---|
| Rozszerzenie /o-mnie (metody, historia) | Strona działa, rozszerzenie to nice-to-have |
| Schema markup JSON-LD (FAQ, Service, Person) | Wartość SEO długoterminowa, nie blokuje startu |
| /opinie — zebranie nowych opinii | Zależy od realnych klientów, nie od wdrożenia |
| /blog index page | Posty są, indeks to dodatkowy krok SEO |
| Sezonowy pack burza/fajerwerki | Timing we wrześniu-październiku |

---

## Elementy do wdrożenia razem (żeby uniknąć chaosu nazewnictwa)

Poniższe elementy używają tych samych nazw i CTA — wdrażaj je w jednej iteracji, nie osobno:

**Pakiet 1: money pages + porównanie formatów**
- Wszystkie 4 money pages (`01–04`)
- Mikrocopy porównania formatów (`15-CONVERSION-MICROCOPY-PACK.md`)
- CTA labels (`06-PACK-MIKROCOPY.md`)

**Pakiet 2: opinie + formularz + zasady**
- Formularz zbierania opinii (`11-REVIEW-ACQUISITION-PACK.md`)
- Zasady redakcyjne (`11-REVIEW-ACQUISITION-PACK.md`)
- Strona /opinie (korekty QA)

**Pakiet 3: aftercare + wiadomości operacyjne**
- Cały `13-AFTERCARE-POST-CONSULTATION-PACK.md`
- Obsługujesz sekwencję od rezerwacji do follow-upu spójnie

---

## Szybki start — co daje największy efekt przy najmniejszym koszcie wdrożenia

| Działanie | Koszt wdrożenia | Efekt |
|---|---|---|
| Korekta /o-mnie (hierarchia produktów) | 1 edycja pliku | Naprawia błąd strategiczny |
| Korekta leadu /opinie | 1 zdanie | Usuwa meta-opis |
| Korekta CTA /niezbednik | 2 słowa | Usuwa język sprzedażowy |
| Wdrożenie wiadomości aftercare | Szablon e-mail | Gotowość operacyjna |
| Wdrożenie prośby o opinię | Formularz + szablon | Pierwsze opinie po pierwszych konsultacjach |
| Opisy GBP krótki/średni | Wklejenie tekstu | Spójność profilu zewnętrznego |
