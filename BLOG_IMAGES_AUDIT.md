# BLOG_IMAGES_AUDIT

Data pracy: 2026-05-17

Zakres: domknięcie obrazów bloga po zatwierdzeniu folderu `public/blog/`, bez rozszerzania prac poza listing i mapowanie blogowe.

## Decyzja końcowa

Hero listy zostaje w `public/blog/`. Wadliwe pliki artykułowe z `public/blog/` zostały wyłączone z finalnego mapowania, bo zawierały ucięte kadry, białe pasy i fragmenty tekstu. Wszystkie artykuły korzystają z czystych coverów `public/blog-covers/*-photo.webp`.

Nie odświeżano całej biblioteki obrazów i nie ruszano routingu poza regresyjnym sprawdzeniem starych literówek.

## Wymienione obrazy

| Wpis / widok | Poprzedni obraz w mapowaniu | Finalny obraz | Uzasadnienie |
|---|---|---|---|
| Hero `/blog` | `/blog-covers/blog-index-hero-photo.webp` | `/blog/hero-opiekun-pies-kot.jpg` | zatwierdzony finalny hero listy bloga |
| `dlaczego-moj-pies-szczeka-na-inne-psy` | `/blog-covers/blog-dlaczego-moj-pies-szczeka-na-inne-psy-photo.webp` | bez zmiany | odrzucono wadliwy `/blog/pies-szczeka-na-psy.jpg` |
| `kot-zalatwia-sie-poza-kuweta` | `/blog-covers/blog-kot-zalatwia-sie-poza-kuweta-photo.webp` | bez zmiany | odrzucono wadliwy `/blog/kot-kuweta.jpg` |
| `szczeniak-pierwsza-noc` | `/blog-covers/blog-szczeniak-pierwsza-noc-photo.webp` | bez zmiany | odrzucono wadliwy `/blog/szczeniak-dom.jpg` |
| `jak-wyglada-konsultacja-behawioralna-online` | `/blog-covers/blog-jak-wyglada-konsultacja-behawioralna-online-photo.webp` | bez zmiany | odrzucono wadliwy `/blog/pies-z-opiekunem.jpg` |
| `jak-nauczyc-psa-zostawania-samemu` | `/blog-covers/blog-jak-nauczyc-psa-zostawania-samemu-photo.webp` | bez zmiany | odrzucono wadliwy `/blog/pies-odpoczywa.jpg` |

## Obrazy pozostawione bez zmian

Wszystkie 24 covery artykułów pozostają na plikach `public/blog-covers/*-photo.webp`. Dotyczy to także tematów: szczekanie psa, kuweta, pierwsza noc szczeniaka, konsultacja online i zostawanie psa samemu.

## Kontrole

- Mapowanie coverów: `lib/blog.tsx`.
- Hero listingu: `app/blog/page.tsx`.
- Brak publicznego blogowego CTA `/niezbednik` w renderowanych źródłach bloga: PASS.
- Brak wzorców mojibake w `app/blog`, `lib/blog.tsx` i renderowanych wpisach `content/blog-mvp/*wpis*.md`: PASS.
- Hash duplikatów finalnego zestawu: PASS, szczegóły w `BLOG_IMAGES_HASH_REPORT.md`.
- Browser-check desktop/mobile: PASS, szczegóły w `BLOG_IMAGES_FINAL_REPORT.md`.
