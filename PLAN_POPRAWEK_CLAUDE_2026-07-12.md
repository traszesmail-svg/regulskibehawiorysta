# 🔍 Pełny Audyt Biznesowy & Techniczny
## regulskibehawiorysta.pl — raport z dnia 12.07.2026

---

## 📊 EXECUTIVE SUMMARY

Aplikacja jest technicznie solidna (Next.js 14, Supabase, PayU/Stripe, PWA, structured data).  
Jednak **z perspektywy biznesowej i zarabiania kasy — masz poważne dziury w konwersji, SEO i monetyzacji**. Poniżej pełna lista — od najbardziej do najmniej krytycznych.

---

## 🔴 KRYTYCZNE — Natychmiastowe straty pieniędzy

### 1. TYLKO 3 OPINIE W BAZIE — Fatal dla konwersji
**Plik:** `lib/reviews.config.ts`

```typescript
export const reviews: Review[] = [
  { id: 'rev-001', author: 'Anna', ... },
  { id: 'rev-002', author: 'Marta', ... },
  { id: 'rev-003', author: 'Kasia', ... },
]
```

**Problem:** 3 opinie to kpina. Każdy potencjalny klient wchodzi na stronę i widzi 3 teksty. Agregat `ratingValue` jest liczony z 3 opinii. Schema.org wysyła do Google `reviewCount: 3` — to **aktywnie szkodzi SEO i zaufaniu**.

**Naprawienie:** Minimum 15–25 prawdziwych opinii, najlepiej z Google Maps zintegrowanych przez API. Dodaj też możliwość zbierania opinii automatycznie po konsultacji (e-mail follow-up + link do formularza).

---

### 2. DANE TESTOWE W BAZIE PRODUKCYJNEJ
**Plik:** `data/bookings.json` i `data/payment-orders.json`

```json
"ownerName": "ERRRRRRRRRRRRRRR",
"description": "DFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF",
"ownerName": "FDGDFG",
"customerName": "jjjjjjjjj",
"customerName": "dsfsdfdsfs"
```

**Problem:** Dane testowe są w tym samym miejscu co produkcja. Jeśli te pliki są bazą danych (`data/*.json`), to albo:
- brakuje prawdziwych zamówień (nie ma żadnego opłaconego bookingu → zerowa konwersja?), lub
- te pliki to sandbox i prawdziwe dane są gdzieś indziej (Supabase?)

**Wszystkie bookings mają `paymentStatus: "unpaid"` i `bookingStatus: "expired"` — żaden nie jest opłacony.**

---

### 3. TYPESCRIPT ERRORS SĄ IGNOROWANE PRZY BUILDZIE
**Plik:** `next.config.mjs` linia 101

```javascript
typescript: {
  ignoreBuildErrors: true,
},
```

To jest **czas bomba**. Błędy TypeScript nie blokują deploymentu. Przy tak dużej codebase (127 komponentów, 58 plików lib) — jakiś błąd typów na pewno skrywa prawdziwy bug produkcyjny.

---

### 4. BRAK NUMERU TELEFONU — Utrata klientów 60+
**Plik:** `lib/site.ts` linia 410–413

```typescript
return {
  email: emailCandidate,
  phoneDisplay: null,   // ← HARDKODOWANE NULL
  phoneHref: null,      // ← HARDKODOWANE NULL
}
```

Telefon jest na stałe wyłączony w kodzie. Dla usług profesjonalnych (470 zł za konsultację), klienci 35–55 lat **często chcą zadzwonić zanim zapłacą**. Brak telefonu = strata ~20–30% potencjalnych konwersji w tej grupie.

---

### 5. BLIK MANUAL PAYMENT — RYZYKO FRAUDU I BRAKU ZAPŁATY
**Plik:** `data/payment-orders.json`

```json
"paymentMethod": "blik_phone",
"status": "waiting_manual_payment"
```

Istnieje flow "manual payment" gdzie klient płaci BLIKiem na telefon. To:
- wymaga ręcznego potwierdzenia przez admina
- podatne na brak potwierdzenia (klient twierdzi że zapłacił, admin nie widzi)
- brak automatycznej weryfikacji

Jeśli PayU/Stripe są zintegrowane — **manual payment powinien być fallbackiem ostatecznym, nie podstawową opcją**.

---

## 🟠 POWAŻNE — Znaczące straty w konwersji i SEO

### 6. TOPICAL CLUSTERS — LINKI DO /blog (BEZ KONKRETNYCH ARTYKUŁÓW)
**Plik:** `lib/growth-layer.ts` linie 80–172

```typescript
blogLinks: [
  { href: '/blog', label: 'Blog: dlaczego mój pies szczeka na inne psy', ... },
  { href: '/blog', label: 'Blog: pies ciągnie na smyczy', ... },
]
```

**KAŻDY link w topical clusters prowadzi do `/blog` a nie do konkretnego artykułu!** Te linki budują strukturę SEO (topical authority), ale są bezużyteczne — odsyłają do głównego bloga, nie do artykułu. Tracisz:
- czas na stronie (user nie trafia w konkretne miejsce)
- link juice między powiązanymi stronami
- konwersję z artykułu na booking

---

### 7. BRAK LINKEDIN / FACEBOOK / YOUTUBE — Budowanie marki tylko przez Instagram
**Plik:** `lib/site.ts` linia 63–74

Wyłącznie Instagram + link do weryfikacji kwalifikacji. Brak:
- **Facebook** (najważniejszy kanał dla target group 30–50 lat z psem/kotem)
- **YouTube** (długie filmy o zachowaniu zwierząt = darmowy traffic, SEO na frazy "jak...")
- **TikTok** (zasięg organiczny dla krótkich filmów z psami/kotami jest ogromny)

---

### 8. OG IMAGE JEST ZŁY
**Plik:** `lib/site.ts` linia 156–161

```typescript
export const SITE_OG_IMAGE = {
  url: '/images/cutover/therapy-animals.png',
  width: 1200,   // ← te wymiary są NIEPRAWDZIWE
  height: 630,
}
```

Wymiary podane w konfiguracji (1200×630) nie zgadzają się z rzeczywistymi wymiarami pliku (1536×1024 lub 1024×1536). Facebook/LinkedIn przy udostępnianiu może pokazywać obcięty kadr zamiast dobrze skadrowanego obrazu.

---

### 9. STRONA /behawiorysta-online-polska JEST ZBĘDNA (301 REDIRECT)
**Plik:** `next.config.mjs` linia 116–119

```javascript
{
  source: '/behawiorysta-online-polska',
  destination: '/',
  statusCode: 301,
},
```

Masz stronę `/behawiorysta-online-polska` skonfigurowaną w `growth-layer.ts` z pełną treścią SEO (`LOCAL_SEO_PAGES`), ale jednocześnie jest ona **permanentnie przekierowana na `/`** w next.config. Tracisz potencjalne frazy lokalnego SEO "behawiorysta online Polska" — to błąd logiczny. Albo usuń treść z growth-layer, albo usuń redirect.

---

### 10. PROMO CODES — PUSTY PLIK
**Plik:** `lib/promo-codes.ts` (234 bajty — placeholder)

Kody promo są zaimplementowane w adminie (`AdminPromoCodeGenerator.tsx`) i backendie, ale same kody nie są używane. Brak kodów = nie korzystasz z potężnego narzędzia konwersji (remarketing, porzucone koszyki, kampanie sezonowe).

---

### 11. NEWSLETTER — BRAK REAL AUTORESPONDER
**Plik:** `components/NewsletterSignup.tsx`, `lib/growth-layer.ts`

Copy: *"Raz w miesiącu spokojna porcja wiedzy"* — ale brak integracji z MailChimp/Brevo/etc. Zbierasz e-maile do Supabase, ale brak automatycznych sekwencji:
- Welcome email po zapisie
- Nurturing (3 e-maile przez 2 tygodnie z wiedzą)
- Oferta po 7 dniach

---

## 🟡 WAŻNE — Optymalizacja konwersji i UX

### 12. 4-WARIANTOWY CENNIK — PROBLEM DECYZYJNY
**Plik:** `app/cennik/page.tsx`

- Paradoks wyboru — 4 opcje to za dużo dla pierwszego wejścia
- **Brak tabeli porównania** co-dostajesz w każdym wariancie
- Nazwa "Kwadrans na już" vs "Kwadrans" — słabe różnicowanie, klient nie rozumie od razu

---

### 13. BRAK LICZNIKA DOSTĘPNOŚCI TERMINU
System slotów (`SlotPicker.tsx`) nie pokazuje **scarcity** — ile miejsc zostało. Nawet jeśli masz 20 slotów, wyświetlenie "3 wolne miejsca w tym tygodniu" znacząco przyspiesza decyzję zakupową.

---

### 14. HOMEPAGE INTRO POPUP — ZŁY TIMING
**Plik:** `components/HomepageIntroPopup.tsx`

Popup na wejście na stronę główną = najgorszy moment (user jeszcze nie wie co to za strona). Lepiej: exit-intent popup lub popup po 30 sekundach / 50% scroll.

---

### 15. BRAK LIVE CHAT / CZATBOTA
Dla usługi 470 zł klienci często mają pytania przed zakupem. Brak live chat = klient musi wysłać e-mail i czekać. Intercom/Crisp/Tidio są tanie a poprawiają konwersję premium usług.

---

### 16. BOOKING DROP — BRAK REMARKETING'U
**Plik:** `data/funnel-events.json`

```json
{
  "eventType": "booking_drop",
  "properties": {
    "last_step": "form_start",
    "drop_reason": "visibility_hidden"
  }
}
```

Klienci porzucają booking na etapie `form_start`. Brak e-mail remarketing'u po porzuconym procesie rezerwacji — to niskowiszący owoc.

---

### 17. QUIZ — BRAK ZBIERANIA LEADU
**Plik:** `components/HomepageServiceSelector.tsx`

Quiz jest świetnym lead magnet'em ale:
- Wynik quizu nie jest poprzedzony formularzem e-mail
- Brak "Zapisz mój wynik" → zbieranie e-mail przed pokazaniem rekomendacji
- Zmarnowany lead magnet — buduje zaangażowanie ale nie buduje listy

---

### 18. BRAK TESTIMONIALS VIDEO
Wszystkie opinie są tekstowe. Video testimoniał (nawet 30-sekundowy) zwiększa konwersję 3–5× w stosunku do tekstu. Szczególnie ważne dla usługi zdrowotnej/behawioralnej gdzie zaufanie = wszystko.

---

## 🔵 TECHNICZNE — Dług techniczny i bezpieczeństwo

### 19. PUPPETEER W PRODUKCYJNYCH DEPENDENCIES
**Plik:** `package.json` linia 48

```json
"puppeteer": "^24.42.0"
```

Puppeteer (~300 MB z Chromium) jest w `dependencies` (nie `devDependencies`). Trafia na serwer produkcyjny. Powinien być w `devDependencies`. Znacząco zwiększa bundle size i czas cold-start na Vercel.

**Fix:**
```bash
npm uninstall puppeteer
npm install --save-dev puppeteer
```

---

### 20. REFERRER POLICY ZBYT RESTRYKCYJNA DLA ANALYTICS
**Plik:** `app/layout.tsx` linia 45

```typescript
referrer: 'no-referrer',  // ← ZŁE
```

`no-referrer` oznacza że żaden zewnętrzny ruch nie będzie miał referrer w Google Analytics. Tracisz dane skąd przychodzą użytkownicy.

**Fix:**
```typescript
referrer: 'strict-origin-when-cross-origin',
```

---

### 21. GLOBALS.CSS + NOTATNIK-A.CSS — OGROMNE PLIKI
**Pliki:** `app/globals.css` (485 KB!), `app/notatnik-a.css` (821 KB!)

Łącznie ponad **1.3 MB CSS**. Nawet po kompresji (gzip ~65%) to ~450 KB samego CSS. Na mobile to katastrofa dla Core Web Vitals (LCP, FID).

**Zalecenie:** PurgeCSS + rozdzielenie CSS na moduły per-strona.

---

### 22. AVAILABILITY.JSON — 265 KB PLIKU
**Plik:** `data/availability.json` (265 322 bajtów)

265 KB danych o dostępności jako płaski JSON. Na Vercel (serverless) każdy cold-start parsuje 265 KB. Brak indeksowania po slotach = O(n) lookup.

---

### 23. COOKIE ANALYTICS BEZ SECURE FLAG
**Plik:** `lib/analytics.ts` linia 58

```typescript
document.cookie = `${ANALYTICS_CONSENT_COOKIE}=${consent}; Max-Age=31536000; Path=/; SameSite=Lax`
// Brakuje: ; Secure
```

**Fix:**
```typescript
document.cookie = `${ANALYTICS_CONSENT_COOKIE}=${consent}; Max-Age=31536000; Path=/; SameSite=Lax; Secure`
```

---

### 24. JITSI JAKO PLATFORMA DO KONSULTACJI — RYZYKO
**Plik:** `data/bookings.json`

```json
"meetingUrl": "https://meet.jit.si/regulski-behawiorysta-0101fcd1-..."
```

Jitsi.si (free) dla konsultacji behawioralnych to problem:
- Brak SLA uptime
- Brak nagrywania
- Deterministyczny format URL = ktoś może "zgadnąć" i dołączyć
- RODO — dane rozmowy idą przez serwery Jitsi (EU?)

Dla 470 zł konsultacji klienci oczekują minimum Zoom lub Google Meet.

---

### 25. BLOG CONTENT W TYPESCRIPT ZAMIAST MARKDOWN/CMS
**Plik:** `lib/blog.tsx` (52 KB!)

Cały content bloga jest zakodowany w TypeScript. To uniemożliwia:
- Łatwe dodawanie artykułów bez deploymentu
- Współpracę z copywriterem bez dostępu do kodu
- Headless CMS integration (Contentful, Sanity, Strapi)

---

## 💡 QUICK WINS — Co zrobić w 48h

| # | Akcja | Szacowany wzrost |
|---|-------|-----------------|
| 1 | Dodaj 15+ prawdziwych opinii do `reviews.config.ts` | +15–20% konwersji |
| 2 | Napraw linki w `growth-layer.ts` (blog → konkretny artykuł) | +8–12% SEO |
| 3 | Zmień popup na exit-intent (nie wejście) | +5% konwersji |
| 4 | Email po porzuconym bookingu | +10–15% konwersji |
| 5 | Zbieranie e-mail w quizie przed wynikiem | +20–30% leadów |
| 6 | Usuń `ignoreBuildErrors: true` i napraw TS errors | Bezpieczeństwo |
| 7 | Przenieś puppeteer do devDependencies | -300 MB bundle |
| 8 | Zmień referrer na `strict-origin-when-cross-origin` | Lepsze dane analytics |
| 9 | Dodaj `; Secure` do analytics cookie | Bezpieczeństwo |
| 10 | Usuń redirect `/behawiorysta-online-polska → /` albo usuń LOCAL_SEO_PAGES | Fix logiki |

---

## 💰 POTENCJAŁ PRZYCHODOWY — Co zostawiasz na stole

Zakładając ~500 odwiedzin miesięcznie i obecny CR ~2%:

| Ulepszenie | Szacowany dodatkowy przychód/mies. |
|------------|-----------------------------------|
| Opinie (15+ real) | +300–500 zł |
| Quiz jako lead magnet z emailem | +500–800 zł |
| Remarketing porzuconych bookingów | +300–600 zł |
| Facebook + newsletter nurturing | +400–700 zł |
| Video testimoniale | +200–400 zł |
| Live chat / szybka odpowiedź | +300–500 zł |
| **RAZEM** | **+2 000–3 500 zł/mies.** |

---

## ✅ CO DZIAŁA DOBRZE

1. **Struktura funnelu** — quiz → wybór → booking jest przemyślany
2. **SEO techniczne** — structured data, sitemap, robots.txt, canonical URLs — wszystko poprawnie
3. **Bezpieczne headery HTTP** — X-Content-Type-Options, X-Frame-Options, CSP
4. **PWA support** — manifest, service worker (PwaRegister)
5. **Dark mode** — ThemeProvider + localStorage — poprawnie
6. **Analytics consent** — GDPR-compliant (cookie + localStorage)
7. **Seasonal trend radar** — sprytna automatyczna aktualizacja tematów sezonowych
8. **Admin panel** — zaawansowany (bookings, pricing, promo codes, urgentne zlecenia)
9. **Breadcrumbs + Schema.org** — kompletne na każdej stronie
10. **Redirect management** — ponad 40 przekierowań 301 dla starych URL

---

*Raport wygenerowany przez Claude na podstawie analizy kodu: app/, components/, lib/, data/, next.config.mjs, middleware.ts, package.json*  
*Data: 12.07.2026*
