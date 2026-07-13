import 'server-only'

import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { Metadata } from 'next'
import React, { type ReactNode } from 'react'
import { buildBookHref } from '@/lib/booking-routing'
import { repairCopy } from '@/lib/copy'
import { FUNNEL_CTA_LABELS } from '@/lib/funnel'
import { buildLimitedMetadataTitle } from '@/lib/seo'
import { SITE_NAME, SITE_OG_IMAGE, SITE_SHORT_NAME, SPECIALIST_NAME } from '@/lib/site'

export type BlogTopic = 'pies' | 'koty' | 'konsultacja'

export type BlogSupportLink = {
  label: string
  href: string
  description: string
}

export type BlogPostCover = {
  src: string
  alt: string
  width: number
  height: number
}

type BlogPostConfig = {
  slug: string
  fileName: string
  publishedAt: string
  categoryLabel: string
  categoryHref: string
  topic: BlogTopic
  audioHref: string
  supportLinks: BlogSupportLink[]
}

type Frontmatter = {
  slug?: string
  title_seo?: string
  meta_description?: string
  h1?: string
  author?: string
  publishedAt?: string
}

export type BlogMarkdownHeadingBlock = {
  type: 'heading'
  depth: number
  text: string
}

export type BlogMarkdownParagraphBlock = {
  type: 'paragraph'
  text: string
}

export type BlogMarkdownListBlock = {
  type: 'list'
  ordered: boolean
  items: string[]
}

export type BlogMarkdownQuoteBlock = {
  type: 'blockquote'
  text: string
}

export type BlogMarkdownCodeBlock = {
  type: 'code'
  text: string
}

export type BlogMarkdownRuleBlock = {
  type: 'hr'
}

export type BlogMarkdownBlock =
  | BlogMarkdownHeadingBlock
  | BlogMarkdownParagraphBlock
  | BlogMarkdownListBlock
  | BlogMarkdownQuoteBlock
  | BlogMarkdownCodeBlock
  | BlogMarkdownRuleBlock

export type BlogPost = {
  slug: string
  title: string
  seoTitle: string
  excerpt: string
  metaDescription: string
  h1: string
  author: string
  publishedAt: string
  publishedAtLabel: string
  readingTimeMinutes: number
  wordCount: number
  categoryLabel: string
  categoryHref: string
  topic: BlogTopic
  audioHref: string
  supportLinks: BlogSupportLink[]
  cover: BlogPostCover
  path: string
  fileName: string
  rawBody: string
  blocks: BlogMarkdownBlock[]
}

type BlogListingMetadataInput = {
  title: string
  description: string
  path: string
}

type BlogPostMetadataInput = {
  post: BlogPost
  description: string
}

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog-mvp')
export const BLOG_ROUTE_BASE = '/blog'
const BLOG_AUTHOR_NAME = SPECIALIST_NAME
const DOG_AUDIO_HREF = buildBookHref(null, 'szybka-konsultacja-15-min', false, 'pies')
const CAT_AUDIO_HREF = buildBookHref(null, 'szybka-konsultacja-15-min', false, 'kot')
const GENERIC_AUDIO_HREF = buildBookHref(null, 'szybka-konsultacja-15-min')
const BLOG_COVER_WIDTH = 640
const BLOG_COVER_HEIGHT = 400

const BLOG_COVER_BY_SLUG: Record<string, BlogPostCover> = {
  'szczeniak-pierwsza-noc': {
    src: 'https://images.unsplash.com/photo-1583511655826-05700d52f4d9?auto=format&fit=crop&w=1600&q=82',
    alt: 'Szczeniak Ĺ›piÄ…cy na kanapie w spokojnym domowym wnÄ™trzu.',
    width: BLOG_COVER_WIDTH,
    height: BLOG_COVER_HEIGHT,
  },
  'dlaczego-moj-pies-szczeka-na-inne-psy': {
    src: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=1600&q=82',
    alt: 'Dwa psy na smyczach zatrzymane w dystansie podczas spokojnego mijania na spacerze.',
    width: BLOG_COVER_WIDTH,
    height: BLOG_COVER_HEIGHT,
  },
  'pies-wyje-kiedy-zostaje-sam': {
    src: 'https://images.unsplash.com/photo-1558788353-f76d92427f16?auto=format&fit=crop&w=1600&q=82',
    alt: 'Pies siedzÄ…cy na kanapie i patrzÄ…cy przez okno podczas zostawania samemu w domu.',
    width: BLOG_COVER_WIDTH,
    height: BLOG_COVER_HEIGHT,
  },
  'kot-zalatwia-sie-poza-kuweta': {
    src: 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=1600&q=82',
    alt: 'Kot w spokojnym domowym wnÄ™trzu wychodzÄ…cy z kuwety ustawionej obok roĹ›liny.',
    width: BLOG_COVER_WIDTH,
    height: BLOG_COVER_HEIGHT,
  },
  'jak-wyglada-konsultacja-behawioralna-online': {
    src: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1600&q=82',
    alt: 'Opiekun siedzÄ…cy z psem przy laptopie w domowym wnÄ™trzu podczas rozmowy online.',
    width: BLOG_COVER_WIDTH,
    height: BLOG_COVER_HEIGHT,
  },
  'pies-ciagnie-na-smyczy': {
    src: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=1600&q=82',
    alt: 'Pies na smyczy idÄ…cy chodnikiem obok opiekuna podczas spaceru.',
    width: BLOG_COVER_WIDTH,
    height: BLOG_COVER_HEIGHT,
  },
  'kot-drapie-meble': {
    src: 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=1600&q=82',
    alt: 'Kot przy kanapie i drapaku pokazujÄ…cy wybĂłr miejsca do drapania.',
    width: BLOG_COVER_WIDTH,
    height: BLOG_COVER_HEIGHT,
  },
  'nowy-pies-pierwsze-72-godziny': {
    src: 'https://images.unsplash.com/photo-1583511655826-05700d52f4d9?auto=format&fit=crop&w=1600&q=82',
    alt: 'Pies w nowym mieszkaniu obok opiekunĂłw podczas spokojnej adaptacji.',
    width: BLOG_COVER_WIDTH,
    height: BLOG_COVER_HEIGHT,
  },
  'kiedy-behawiorysta-kiedy-trener-psa': {
    src: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1600&q=82',
    alt: 'Specjalista robi notatki przy opiekunie i psie podczas spokojnej konsultacji.',
    width: BLOG_COVER_WIDTH,
    height: BLOG_COVER_HEIGHT,
  },
  'behawiorysta-zoopsycholog-trener-do-kogo-sie-zglosic': {
    src: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1600&q=82',
    alt: 'Opiekun rozmawia przy notatkach z psem obok, wybierajÄ…c odpowiedniÄ… formÄ™ pomocy.',
    width: BLOG_COVER_WIDTH,
    height: BLOG_COVER_HEIGHT,
  },
  'ile-kosztuje-konsultacja-behawioralna': {
    src: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1600&q=82',
    alt: 'Notatnik, laptop i pies przy stole podczas omawiania zakresu konsultacji.',
    width: BLOG_COVER_WIDTH,
    height: BLOG_COVER_HEIGHT,
  },
  'czym-jest-coape-behawiorysta-po-tej-szkole': {
    src: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1600&q=82',
    alt: 'Pies siedzÄ…cy obok certyfikatu i nagrody, nawiÄ…zujÄ…cy do kwalifikacji szkoleniowych.',
    width: BLOG_COVER_WIDTH,
    height: BLOG_COVER_HEIGHT,
  },
  'jak-przygotowac-sie-do-konsultacji-behawioralnej-online': {
    src: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1600&q=82',
    alt: 'Opiekun z kotem przy laptopie w domu podczas przygotowania do konsultacji online.',
    width: BLOG_COVER_WIDTH,
    height: BLOG_COVER_HEIGHT,
  },
  'reaktywnosc-na-smyczy-cwiczenie-luznej-smyczy': {
    src: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=1600&q=82',
    alt: 'Pies na smyczy skupiony na opiekunie podczas spokojnego Ä‡wiczenia spacerowego.',
    width: BLOG_COVER_WIDTH,
    height: BLOG_COVER_HEIGHT,
  },
  'jak-nagrac-psa-zostawionego-samemu': {
    src: 'https://images.unsplash.com/photo-1558788353-f76d92427f16?auto=format&fit=crop&w=1600&q=82',
    alt: 'Telefon ustawiony do nagrywania psa w mieszkaniu przed wyjĹ›ciem opiekuna.',
    width: BLOG_COVER_WIDTH,
    height: BLOG_COVER_HEIGHT,
  },
  'rutyna-wyjscia-oswajanie-psa-z-samotnoscia': {
    src: 'https://images.unsplash.com/photo-1558788353-f76d92427f16?auto=format&fit=crop&w=1600&q=82',
    alt: 'Pies obserwujÄ…cy uchylone drzwi podczas Ä‡wiczenia spokojnej rutyny wyjĹ›cia.',
    width: BLOG_COVER_WIDTH,
    height: BLOG_COVER_HEIGHT,
  },
  'jak-wybrac-kuwete-i-zwirek-dla-kota': {
    src: 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=1600&q=82',
    alt: 'Kot przy krytej kuwecie w domowym wnÄ™trzu, nawiÄ…zujÄ…cy do wyboru kuwety i ĹĽwirku.',
    width: BLOG_COVER_WIDTH,
    height: BLOG_COVER_HEIGHT,
  },
  'stres-kota-a-zachowania-toaletowe': {
    src: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=1600&q=82',
    alt: 'Dwa koty przy kuwecie w Ĺ‚azience, pokazujÄ…ce napiÄ™cie wokĂłĹ‚ miejsca toaletowego.',
    width: BLOG_COVER_WIDTH,
    height: BLOG_COVER_HEIGHT,
  },
  'jak-wprowadzic-nowego-kota-do-domu': {
    src: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=1600&q=82',
    alt: 'Dwa koty rozdzielone przeszkodÄ… podczas spokojnego wprowadzania nowego kota.',
    width: BLOG_COVER_WIDTH,
    height: BLOG_COVER_HEIGHT,
  },
  'agresja-przekierowana-u-kota': {
    src: 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=1600&q=82',
    alt: 'Kot pobudzony przy oknie obserwujÄ…cy bodziec na zewnÄ…trz mieszkania.',
    width: BLOG_COVER_WIDTH,
    height: BLOG_COVER_HEIGHT,
  },
  'pies-ciagnie-na-smyczy-od-czego-zaczac': {
    src: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=1600&q=82',
    alt: 'Pies na smyczy siedzÄ…cy przy opiekunie na miejskim chodniku.',
    width: BLOG_COVER_WIDTH,
    height: BLOG_COVER_HEIGHT,
  },
  'jak-nauczyc-psa-zostawania-samemu': {
    src: 'https://images.unsplash.com/photo-1558788353-f76d92427f16?auto=format&fit=crop&w=1600&q=82',
    alt: 'Pies patrzÄ…cy przez okno w mieszkaniu podczas spokojnej nauki zostawania samemu.',
    width: BLOG_COVER_WIDTH,
    height: BLOG_COVER_HEIGHT,
  },
  'jak-ustawic-kuwete-dla-kota': {
    src: 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=1600&q=82',
    alt: 'Kuweta ustawiona w spokojnym miejscu przy oknie, z kotami w pobliĹĽu.',
    width: BLOG_COVER_WIDTH,
    height: BLOG_COVER_HEIGHT,
  },
  'jak-zapoznac-dwa-koty': {
    src: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=1600&q=82',
    alt: 'Dwa koty po przeciwnych stronach przeszkody podczas stopniowego zapoznawania.',
    width: BLOG_COVER_WIDTH,
    height: BLOG_COVER_HEIGHT,
  },
}

function getFallbackBlogCover(categoryHref: string): BlogPostCover {
  if (categoryHref === '/koty') {
    return {
      src: 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=1600&q=82',
      alt: 'Kot w domowym otoczeniu.',
      width: BLOG_COVER_WIDTH,
      height: BLOG_COVER_HEIGHT,
    }
  }

  if (categoryHref === '/psy') {
    return {
      src: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=1600&q=82',
      alt: 'Pies podczas spaceru z opiekunem.',
      width: BLOG_COVER_WIDTH,
      height: BLOG_COVER_HEIGHT,
    }
  }

  return {
    src: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1600&q=82',
    alt: 'Notatki i laptop przygotowane do konsultacji online.',
    width: BLOG_COVER_WIDTH,
    height: BLOG_COVER_HEIGHT,
  }
}

export function getBlogPostCover(post: Pick<BlogPost, 'slug' | 'categoryHref'>): BlogPostCover {
  return BLOG_COVER_BY_SLUG[post.slug] ?? getFallbackBlogCover(post.categoryHref)
}
const SERVICE_LANDING_LINK: BlogSupportLink = {
  label: 'Behawiorysta psĂłw i kotĂłw online',
  href: '/behawiorysta-online-polska',
  description: 'GĹ‚Ăłwna strona usĹ‚ugi, jeĹ›li chcesz przejĹ›Ä‡ z treĹ›ci edukacyjnej do peĹ‚niejszego opisu pomocy.',
}

const CONSULTATION_PAGE_LINK: BlogSupportLink = {
  label: 'Konsultacja behawioralna online',
  href: '/konsultacja-behawioralna-online',
    description: 'Opis peĹ‚nej konsultacji, przebiegu rozmowy i tego, kiedy warto wejĹ›Ä‡ w szerszÄ… konsultacjÄ™.',
}

const PREP_GUIDE_LINK: BlogSupportLink = {
  label: 'UmĂłw pierwszy krok',
  href: '/',
  description: 'PrzejdĹş do strony gĹ‚Ăłwnej i wybierz pierwszy krok pomocy.',
}

const REACTIVITY_LANDING_LINK: BlogSupportLink = {
  label: 'ReaktywnoĹ›Ä‡ na smyczy',
  href: '/psy/reaktywnosc-na-smyczy',
  description: 'GĹ‚Ăłwny landing problemowy dla spacerĂłw, szczekania, napiÄ™cia i pracy poniĹĽej progu.',
}

const REACTIVITY_GUIDE_LINK: BlogSupportLink = {
  label: 'UmĂłw pierwszy krok',
  href: '/',
  description: 'PrzejdĹş do strony gĹ‚Ăłwnej i wybierz pierwszy krok pomocy.',
}

const SEPARATION_LANDING_LINK: BlogSupportLink = {
  label: 'LÄ™k separacyjny u psa',
  href: '/psy/lek-separacyjny',
  description: 'GĹ‚Ăłwny landing problemowy o zostawaniu samemu, analizie zachowania i pierwszym bezpiecznym planie.',
}

const SEPARATION_GUIDE_LINK: BlogSupportLink = {
  label: 'UmĂłw pierwszy krok',
  href: '/',
  description: 'PrzejdĹş do strony gĹ‚Ăłwnej i wybierz pierwszy krok pomocy.',
}

const LITTER_LANDING_LINK: BlogSupportLink = {
  label: 'ZaĹ‚atwianie poza kuwetÄ…',
  href: '/koty/zalatwianie-poza-kuweta',
  description: 'GĹ‚Ăłwny landing problemowy o zdrowiu, kuwecie, stresie i kolejnoĹ›ci sprawdzania przyczyn.',
}

const LITTER_GUIDE_LINK: BlogSupportLink = {
  label: 'UmĂłw pierwszy krok',
  href: '/',
  description: 'PrzejdĹş do strony gĹ‚Ăłwnej i wybierz pierwszy krok pomocy.',
}

const CAT_CONFLICT_LANDING_LINK: BlogSupportLink = {
  label: 'Konflikt miÄ™dzy kotami',
  href: '/koty/konflikt-miedzy-kotami',
  description: 'GĹ‚Ăłwny landing problemowy dla napiÄ™cia, gonitw, blokowania zasobĂłw i trudnych relacji w domu.',
}

const CAT_CONFLICT_GUIDE_LINK: BlogSupportLink = {
  label: 'UmĂłw pierwszy krok',
  href: '/',
  description: 'PrzejdĹş do strony gĹ‚Ăłwnej i wybierz pierwszy krok pomocy.',
}

const BLOG_POST_CONFIGS: BlogPostConfig[] = [
  {
    slug: 'szczeniak-pierwsza-noc',
    fileName: '30-wpis-szczeniak-pierwsza-noc.md',
    publishedAt: '2026-04-24',
    categoryLabel: 'Pies',
    categoryHref: '/psy',
    topic: 'pies',
    audioHref: buildBookHref(null, 'szybka-konsultacja-15-min', false, 'pies'),
    supportLinks: [
      {
        label: 'Szczeniak / mĹ‚ody pies',
        href: '/psy',
        description: 'Hub tematĂłw psich, jeĹ›li pierwsza noc Ĺ‚Ä…czy siÄ™ z gryzieniem, pobudzeniem albo separacjÄ….',
      },
      {
        label: 'UmĂłw pierwszy krok',
        href: '/',
        description: 'PrzejdĹş do strony gĹ‚Ăłwnej i wybierz pierwszy krok pomocy.',
      },
      {
        label: FUNNEL_CTA_LABELS.primary,
        href: buildBookHref(null, 'szybka-konsultacja-15-min', false, 'pies'),
        description: 'Dobry start, jeĹ›li chcesz omĂłwiÄ‡ pierwsze noce i ustawiÄ‡ spokojniejszy rytm.',
      },
      {
        label: 'Quiz',
        href: '/quiz',
        description: 'Quiz, jeĹ›li wahasz siÄ™ miÄ™dzy Kwadransem a szerszÄ… rozmowÄ….',
      },
    ],
  },
  {
    slug: 'dlaczego-moj-pies-szczeka-na-inne-psy',
    fileName: '02-wpis-pies-szczeka-na-inne-psy.md',
    publishedAt: '2026-03-18',
    categoryLabel: 'Pies',
    categoryHref: '/psy',
    topic: 'pies',
    audioHref: buildBookHref(null, 'szybka-konsultacja-15-min', false, 'pies'),
    supportLinks: [
      {
        label: 'ReaktywnoĹ›Ä‡ na smyczy',
        href: '/psy/reaktywnosc-na-smyczy',
        description: 'PeĹ‚niejsza strona problemowa o spacerach i napiÄ™ciu na smyczy.',
      },
      {
        label: 'Psy',
        href: '/psy',
        description: 'WiÄ™cej tematĂłw zwiÄ…zanych ĹĽe spacerem, regulacjÄ… i codziennÄ… pracÄ… z psem.',
      },
      {
        label: FUNNEL_CTA_LABELS.primary,
        href: buildBookHref(null, 'szybka-konsultacja-15-min', false, 'pies'),
        description: 'Dobry start, jeĹ›li chcesz odnieĹ›Ä‡ ten temat do swojego psa.',
      },
      {
        label: 'UmĂłw pierwszy krok',
        href: '/',
        description: 'PrzejdĹş do strony gĹ‚Ăłwnej i wybierz pierwszy krok pomocy.',
      },
    ],
  },
  {
    slug: 'pies-wyje-kiedy-zostaje-sam',
    fileName: '03-wpis-pies-wyje-kiedy-zostaje-sam.md',
    publishedAt: '2026-02-11',
    categoryLabel: 'Pies',
    categoryHref: '/psy',
    topic: 'pies',
    audioHref: buildBookHref(null, 'szybka-konsultacja-15-min', false, 'pies'),
    supportLinks: [
      {
        label: 'LÄ™k separacyjny u psa',
        href: '/psy/lek-separacyjny',
        description: 'PeĹ‚niejszy przewodnik, jeĹ›li problem powtarza siÄ™ albo szybko narasta.',
      },
      {
        label: 'Psy',
        href: '/psy',
        description: 'Zobacz inne tematy zwiÄ…zane z zachowaniem psa.',
      },
      {
        label: FUNNEL_CTA_LABELS.primary,
        href: buildBookHref(null, 'szybka-konsultacja-15-min', false, 'pies'),
        description: 'JeĹ›li chcesz ustaliÄ‡ pierwszy plan dla swojego psa.',
      },
      {
        label: 'UmĂłw pierwszy krok',
        href: '/',
        description: 'PrzejdĹş do strony gĹ‚Ăłwnej i wybierz pierwszy krok pomocy.',
      },
    ],
  },
  {
    slug: 'kot-zalatwia-sie-poza-kuweta',
    fileName: '04-wpis-kot-zalatwia-sie-poza-kuweta.md',
    publishedAt: '2026-01-07',
    categoryLabel: 'Kot',
    categoryHref: '/koty',
    topic: 'koty',
    audioHref: buildBookHref(null, 'szybka-konsultacja-15-min', false, 'kot'),
    supportLinks: [
      {
        label: 'ZaĹ‚atwianie poza kuwetÄ…',
        href: '/koty/zalatwianie-poza-kuweta',
        description: 'PeĹ‚niejsza strona problemowa o filtrach diagnostycznych i pierwszych decyzjach.',
      },
      {
        label: 'Koty',
        href: '/koty',
        description: 'WiÄ™cej tematĂłw zwiÄ…zanych z kuwetÄ…, stresem i codziennym funkcjonowaniem kota.',
      },
      {
        label: FUNNEL_CTA_LABELS.primary,
        href: buildBookHref(null, 'szybka-konsultacja-15-min', false, 'kot'),
        description: 'JeĹ›li chcesz ustaliÄ‡, od czego zaczÄ…Ä‡ w swojej sytuacji.',
      },
      {
        label: 'UmĂłw pierwszy krok',
        href: '/',
        description: 'PrzejdĹş do strony gĹ‚Ăłwnej i wybierz pierwszy krok pomocy.',
      },
    ],
  },
  {
    slug: 'jak-wyglada-konsultacja-behawioralna-online',
    fileName: '05-wpis-jak-wyglada-konsultacja-behawioralna-online.md',
    publishedAt: '2025-12-03',
    categoryLabel: 'Konsultacja',
    categoryHref: '/konsultacja-behawioralna-online',
    topic: 'konsultacja',
    audioHref: buildBookHref(null, 'szybka-konsultacja-15-min'),
    supportLinks: [
      {
        label: FUNNEL_CTA_LABELS.primary,
        href: buildBookHref(null, 'szybka-konsultacja-15-min'),
        description: 'Najprostszy sposĂłb, ĹĽeby spokojnie omĂłwiÄ‡ swojÄ… sytuacjÄ™.',
      },
      {
        label: 'O mnie',
        href: '/o-mnie',
        description: 'JeĹ›li chcesz sprawdziÄ‡ kwalifikacje, sposĂłb pracy i publiczne punkty odniesienia.',
      },
      {
        label: 'Psy',
        href: '/psy',
        description: 'PrzejdĹş do pomocy dla opiekunĂłw psĂłw.',
      },
      {
        label: 'Koty',
        href: '/koty',
        description: 'PrzejdĹş do pomocy dla opiekunĂłw kotĂłw.',
      },
    ],
  },
  {
    slug: 'pies-ciagnie-na-smyczy',
    fileName: '07-wpis-pies-cignie-na-smyczy.md',
    publishedAt: '2025-11-12',
    categoryLabel: 'Pies',
    categoryHref: '/psy',
    topic: 'pies',
    audioHref: buildBookHref(null, 'szybka-konsultacja-15-min', false, 'pies'),
    supportLinks: [
      {
        label: 'ReaktywnoĹ›Ä‡ na smyczy',
        href: '/psy/reaktywnosc-na-smyczy',
        description: 'PeĹ‚niejsza strona problemowa, jeĹ›li samo ciÄ…gniÄ™cie jest czÄ™Ĺ›ciÄ… wiÄ™kszego napiÄ™cia.',
      },
      {
        label: 'Szczekanie na inne psy',
        href: '/blog',
        description: 'PowiÄ…zany wpis o trudnoĹ›ciach spacerowych.',
      },
      {
        label: 'Psy',
        href: '/psy',
        description: 'WiÄ™cej tematĂłw zwiÄ…zanych ĹĽe spacerem i regulacjÄ… psa.',
      },
      {
        label: FUNNEL_CTA_LABELS.primary,
        href: buildBookHref(null, 'szybka-konsultacja-15-min', false, 'pies'),
        description: 'JeĹ›li chcesz ustaliÄ‡, czy to nawyk, czy juĹĽ szerszy problem.',
      },
    ],
  },
  {
    slug: 'kot-drapie-meble',
    fileName: '08-wpis-kot-drapie-meble.md',
    publishedAt: '2025-10-08',
    categoryLabel: 'Kot',
    categoryHref: '/koty',
    topic: 'koty',
    audioHref: buildBookHref(null, 'szybka-konsultacja-15-min', false, 'kot'),
    supportLinks: [
      {
        label: 'ZaĹ‚atwianie poza kuwetÄ…',
        href: '/koty/zalatwianie-poza-kuweta',
        description: 'JeĹ›li obok drapania widzisz teĹĽ napiÄ™cie Ĺ›rodowiskowe lub problem toaletowy.',
      },
      {
        label: 'Koty',
        href: '/koty',
        description: 'WiÄ™cej tematĂłw o stresie, kuwecie i relacjach w domu.',
      },
      {
        label: FUNNEL_CTA_LABELS.primary,
        href: buildBookHref(null, 'szybka-konsultacja-15-min', false, 'kot'),
        description: 'JeĹ›li chcesz uporzÄ…dkowaÄ‡, co stoi za zachowaniem kota.',
      },
      {
        label: 'UmĂłw pierwszy krok',
        href: '/',
        description: 'PrzejdĹş do strony gĹ‚Ăłwnej i wybierz pierwszy krok pomocy.',
      },
    ],
  },
  {
    slug: 'nowy-pies-pierwsze-72-godziny',
    fileName: '09-wpis-nowy-pies-pierwsze-72-godziny.md',
    publishedAt: '2025-09-03',
    categoryLabel: 'Pies',
    categoryHref: '/psy',
    topic: 'pies',
    audioHref: buildBookHref(null, 'szybka-konsultacja-15-min', false, 'pies'),
    supportLinks: [
      {
        label: 'Psy',
        href: '/psy',
        description: 'PrzejdĹş do pomocy dla opiekunĂłw psĂłw i podobnych tematĂłw.',
      },
      {
        label: 'Pierwsze dni po adopcji',
        href: '/',
        description: 'Konkretny materiaĹ‚, jeĹ›li jesteĹ› na starcie po adopcji.',
      },
      {
        label: FUNNEL_CTA_LABELS.primary,
        href: buildBookHref(null, 'szybka-konsultacja-15-min', false, 'pies'),
        description: 'Dobry start, jeĹ›li chcesz ustaliÄ‡ plan na pierwsze dni z psem.',
      },
      {
        label: 'UmĂłw pierwszy krok',
        href: '/',
        description: 'PrzejdĹş do strony gĹ‚Ăłwnej i wybierz pierwszy krok pomocy.',
      },
    ],
  },
  {
    slug: 'kiedy-behawiorysta-kiedy-trener-psa',
    fileName: '10-wpis-kiedy-behawiorysta-kiedy-trener.md',
    publishedAt: '2025-08-13',
    categoryLabel: 'Konsultacja',
    categoryHref: '/konsultacja-behawioralna-online',
    topic: 'konsultacja',
    audioHref: buildBookHref(null, 'szybka-konsultacja-15-min'),
    supportLinks: [
      {
        label: 'O mnie',
        href: '/o-mnie',
        description: 'Jak pracujÄ™ i skÄ…d wynika moje podejĹ›cie do takich tematĂłw.',
      },
      {
        label: FUNNEL_CTA_LABELS.primary,
        href: buildBookHref(null, 'szybka-konsultacja-15-min'),
        description: 'JeĹ›li chcesz spokojnie sprawdziÄ‡, jaki rodzaj pomocy ma sens.',
      },
      {
        label: 'Opinie',
        href: '/opinie',
        description: 'KrĂłtkie gĹ‚osy opiekunĂłw po rozmowach i konsultacjach.',
      },
      {
        label: 'Psy',
        href: '/psy',
        description: 'PrzejdĹş do strony dla opiekunĂłw psĂłw.',
      },
    ],
  },
  {
    slug: 'behawiorysta-zoopsycholog-trener-do-kogo-sie-zglosic',
    fileName: '11-wpis-behawiorysta-zoopsycholog-trener.md',
    publishedAt: '2025-07-09',
    categoryLabel: 'Konsultacja',
    categoryHref: '/konsultacja-behawioralna-online',
    topic: 'konsultacja',
    audioHref: buildBookHref(null, 'szybka-konsultacja-15-min'),
    supportLinks: [
      {
        label: 'O mnie',
        href: '/o-mnie',
        description: 'JeĹ›li chcesz sprawdziÄ‡ kwalifikacje i sposĂłb pracy.',
      },
      {
        label: FUNNEL_CTA_LABELS.primary,
        href: buildBookHref(null, 'szybka-konsultacja-15-min'),
        description: 'Dobry start, jeĹ›li chcesz ustaliÄ‡, do kogo zgĹ‚osiÄ‡ siÄ™ z wĹ‚asnym tematem.',
      },
      {
        label: 'Psy',
        href: '/psy',
        description: 'Pomoc dla opiekunĂłw psĂłw.',
      },
      {
        label: 'Koty',
        href: '/koty',
        description: 'Pomoc dla opiekunĂłw kotĂłw.',
      },
    ],
  },
  {
    slug: 'ile-kosztuje-konsultacja-behawioralna',
    fileName: '12-wpis-ile-kosztuje-konsultacja-behawioralna.md',
    publishedAt: '2025-06-04',
    categoryLabel: 'Cennik',
    categoryHref: '/cennik',
    topic: 'konsultacja',
    audioHref: buildBookHref(null, 'szybka-konsultacja-15-min'),
    supportLinks: [
      {
        label: 'Cennik',
        href: '/cennik',
        description: 'Aktualne ceny i publiczne warianty pomocy.',
      },
      {
        label: 'Konsultacja online',
        href: '/konsultacja-behawioralna-online',
        description: 'SzczegĂłĹ‚y dĹ‚uĹĽszej konsultacji online.',
      },
      {
        label: FUNNEL_CTA_LABELS.primary,
        href: buildBookHref(null, 'szybka-konsultacja-15-min'),
        description: 'Najprostszy pierwszy krok, jeĹ›li chcesz zaczÄ…Ä‡ bez duĹĽego progu.',
      },
      {
        label: 'O mnie',
        href: '/o-mnie',
        description: 'JeĹ›li chcesz sprawdziÄ‡, jak pracujÄ™.',
      },
    ],
  },
  {
    slug: 'czym-jest-coape-behawiorysta-po-tej-szkole',
    fileName: '13-wpis-czym-jest-coape.md',
    publishedAt: '2025-05-14',
    categoryLabel: 'O mnie',
    categoryHref: '/o-mnie',
    topic: 'konsultacja',
    audioHref: buildBookHref(null, 'szybka-konsultacja-15-min'),
    supportLinks: [
      {
        label: 'O mnie',
        href: '/o-mnie',
        description: 'Kwalifikacje, afiliacje i sposĂłb pracy opisane w jednym miejscu.',
      },
      {
        label: 'Behawiorysta czy trener',
        href: '/blog',
        description: 'PowiÄ…zany wpis o wyborze odpowiedniej pomocy.',
      },
      {
        label: FUNNEL_CTA_LABELS.primary,
        href: buildBookHref(null, 'szybka-konsultacja-15-min'),
        description: 'JeĹ›li chcesz omĂłwiÄ‡ swĂłj temat po lekturze.',
      },
      {
        label: 'Psy',
        href: '/psy',
        description: 'PrzejdĹş do strony dla opiekunĂłw psĂłw.',
      },
    ],
  },
  {
    slug: 'jak-przygotowac-sie-do-konsultacji-behawioralnej-online',
    fileName: '14-wpis-jak-przygotowac-sie-do-konsultacji-online.md',
    publishedAt: '2025-04-02',
    categoryLabel: 'Konsultacja',
    categoryHref: '/konsultacja-behawioralna-online',
    topic: 'konsultacja',
    audioHref: GENERIC_AUDIO_HREF,
    supportLinks: [
      CONSULTATION_PAGE_LINK,
      PREP_GUIDE_LINK,
      {
        label: 'Cennik',
        href: '/cennik',
        description: 'JeĹ›li po przygotowaniu chcesz od razu porĂłwnaÄ‡ dostÄ™pne formaty przed rezerwacjÄ….',
      },
      SERVICE_LANDING_LINK,
    ],
  },
  {
    slug: 'reaktywnosc-na-smyczy-cwiczenie-luznej-smyczy',
    fileName: '19-wpis-cwiczenie-luznej-smyczy.md',
    publishedAt: '2025-03-19',
    categoryLabel: 'Pies',
    categoryHref: '/psy',
    topic: 'pies',
    audioHref: DOG_AUDIO_HREF,
    supportLinks: [
      REACTIVITY_LANDING_LINK,
      {
        label: 'Pies szczeka na inne psy',
        href: '/blog',
        description: 'Warto to przeczytac razem z praktyka luznej smyczy, ĹĽeby lepiej nazwaÄ‡ emocje i wyzwalacze na spacerze.',
      },
      REACTIVITY_GUIDE_LINK,
      SERVICE_LANDING_LINK,
    ],
  },
  {
    slug: 'jak-nagrac-psa-zostawionego-samemu',
    fileName: '20-wpis-jak-nagrac-psa-samemu.md',
    publishedAt: '2025-02-05',
    categoryLabel: 'Pies',
    categoryHref: '/psy',
    topic: 'pies',
    audioHref: DOG_AUDIO_HREF,
    supportLinks: [
      SEPARATION_LANDING_LINK,
      {
      label: 'Pies wyje, kiedy zostaje sam: co nagraÄ‡ i sprawdziÄ‡',
        href: '/blog',
        description: 'NajbliĹĽszy artykuĹ‚, jeĹ›li chcesz najpierw odrĂłĹĽniÄ‡ lÄ™k separacyjny od innych scenariuszy.',
      },
      SEPARATION_GUIDE_LINK,
      SERVICE_LANDING_LINK,
    ],
  },
  {
    slug: 'rutyna-wyjscia-oswajanie-psa-z-samotnoscia',
    fileName: '21-wpis-rutyna-wyjscia-oswajanie-z-samotnosciq.md',
    publishedAt: '2025-01-22',
    categoryLabel: 'Pies',
    categoryHref: '/psy',
    topic: 'pies',
    audioHref: DOG_AUDIO_HREF,
    supportLinks: [
      SEPARATION_LANDING_LINK,
      {
        label: 'Jak nagraÄ‡ psa zostawionego samemu',
        href: '/blog',
        description: 'Daje materiaĹ‚ do oceny, jeĹ›li po pracy nad rutynÄ… potrzebujesz lepiej zobaczyÄ‡, co napÄ™dza problem.',
      },
      SEPARATION_GUIDE_LINK,
      SERVICE_LANDING_LINK,
    ],
  },
  {
    slug: 'jak-wybrac-kuwete-i-zwirek-dla-kota',
    fileName: '22-wpis-jak-wybrac-kuwete-i-zwirek.md',
    publishedAt: '2024-12-11',
    categoryLabel: 'Kot',
    categoryHref: '/koty',
    topic: 'koty',
    audioHref: CAT_AUDIO_HREF,
    supportLinks: [
      LITTER_LANDING_LINK,
      {
        label: 'Jak ustawiÄ‡ kuwetÄ™ dla kota',
        href: '/blog',
        description: 'NajbliĹĽszy tekst, jeĹ›li po wyborze kuwety chcesz od razu dopiÄ…Ä‡ jej lokalizacjÄ™ i liczbÄ™.',
      },
      LITTER_GUIDE_LINK,
      SERVICE_LANDING_LINK,
    ],
  },
  {
    slug: 'stres-kota-a-zachowania-toaletowe',
    fileName: '23-wpis-stres-kota-a-zachowania-toaletowe.md',
    publishedAt: '2024-11-06',
    categoryLabel: 'Kot',
    categoryHref: '/koty',
    topic: 'koty',
    audioHref: CAT_AUDIO_HREF,
    supportLinks: [
      LITTER_LANDING_LINK,
      {
      label: 'Kot zaĹ‚atwia siÄ™ poza kuwetÄ…: co sprawdziÄ‡',
        href: '/blog',
        description: 'Najszerszy wpis startowy, jeĹ›li chcesz zobaczyÄ‡ caĹ‚Ä… sekwencjÄ™ filtrĂłw przed dalszÄ… pracÄ….',
      },
      LITTER_GUIDE_LINK,
      SERVICE_LANDING_LINK,
    ],
  },
  {
    slug: 'jak-wprowadzic-nowego-kota-do-domu',
    fileName: '24-wpis-jak-wprowadzic-nowego-kota.md',
    publishedAt: '2024-10-23',
    categoryLabel: 'Kot',
    categoryHref: '/koty',
    topic: 'koty',
    audioHref: CAT_AUDIO_HREF,
    supportLinks: [
      CAT_CONFLICT_LANDING_LINK,
      {
        label: 'Jak zapoznac dwa koty',
        href: '/blog',
        description: 'Rozpisuje szerzej sam proces zapoznania, jeĹ›li ten etap w domu dopiero przed toba.',
      },
      CAT_CONFLICT_GUIDE_LINK,
      SERVICE_LANDING_LINK,
    ],
  },
  {
    slug: 'agresja-przekierowana-u-kota',
    fileName: '25-wpis-agresja-przekierowana-u-kota.md',
    publishedAt: '2024-09-18',
    categoryLabel: 'Kot',
    categoryHref: '/koty',
    topic: 'koty',
    audioHref: CAT_AUDIO_HREF,
    supportLinks: [
      CAT_CONFLICT_LANDING_LINK,
      {
        label: 'Jak zapoznac dwa koty',
        href: '/blog',
        description: 'Dobry kolejny tekst, jeĹ›li konflikt jest zwiazany z granicami, dystansem i powolnym wprowadzaniem kontaktu.',
      },
      CAT_CONFLICT_GUIDE_LINK,
      SERVICE_LANDING_LINK,
    ],
  },
  {
    slug: 'pies-ciagnie-na-smyczy-od-czego-zaczac',
    fileName: '26-wpis-pies-ciagnie-od-czego-zaczac.md',
    publishedAt: '2024-08-07',
    categoryLabel: 'Pies',
    categoryHref: '/psy',
    topic: 'pies',
    audioHref: DOG_AUDIO_HREF,
    supportLinks: [
      REACTIVITY_LANDING_LINK,
      {
        label: 'LuĹşna smycz z reaktywnym psem',
        href: '/blog',
        description: 'Przechodzi z pojedynczej zasady w bardziej uporzÄ…dkowanÄ… procedurÄ™ spacerowÄ….',
      },
      REACTIVITY_GUIDE_LINK,
      SERVICE_LANDING_LINK,
    ],
  },
  {
    slug: 'jak-nauczyc-psa-zostawania-samemu',
    fileName: '27-wpis-jak-nauczyc-psa-zostawania-samemu.md',
    publishedAt: '2024-07-24',
    categoryLabel: 'Pies',
    categoryHref: '/psy',
    topic: 'pies',
    audioHref: DOG_AUDIO_HREF,
    supportLinks: [
      SEPARATION_LANDING_LINK,
      {
        label: 'Rutyna wyjĹ›cia i oswajanie z samotnoĹ›ciÄ…',
        href: '/blog',
        description: 'Dalej porzÄ…dkuje pracÄ™ krok po kroku, jeĹ›li chcesz utrzymaÄ‡ plan bez przeskakiwania etapĂłw.',
      },
      SEPARATION_GUIDE_LINK,
      SERVICE_LANDING_LINK,
    ],
  },
  {
    slug: 'jak-ustawic-kuwete-dla-kota',
    fileName: '28-wpis-jak-ustawic-kuwete-dla-kota.md',
    publishedAt: '2024-06-12',
    categoryLabel: 'Kot',
    categoryHref: '/koty',
    topic: 'koty',
    audioHref: CAT_AUDIO_HREF,
    supportLinks: [
      LITTER_LANDING_LINK,
      {
        label: 'Jak wybraÄ‡ kuwetÄ™ i ĹĽwirek',
        href: '/blog',
        description: 'NajbliĹĽszy tekst, jeĹ›li po ustawieniu kuwety chcesz jeszcze sprawdziÄ‡ rozmiar, zwirek i typowe bledy wyboru.',
      },
      LITTER_GUIDE_LINK,
      SERVICE_LANDING_LINK,
    ],
  },
  {
    slug: 'jak-zapoznac-dwa-koty',
    fileName: '29-wpis-jak-zapoznac-dwa-koty.md',
    publishedAt: '2024-05-08',
    categoryLabel: 'Kot',
    categoryHref: '/koty',
    topic: 'koty',
    audioHref: CAT_AUDIO_HREF,
    supportLinks: [
      CAT_CONFLICT_LANDING_LINK,
      {
        label: 'Jak wprowadzic nowego kota do domu',
        href: '/blog',
        description: 'Dobry tekst siostrzany, jeĹ›li chcesz zaczÄ…Ä‡ jeszcze krok wczeĹ›niej od caĹ‚ego procesu wdroĹĽenia nowego kota.',
      },
      CAT_CONFLICT_GUIDE_LINK,
      SERVICE_LANDING_LINK,
    ],
  },
]

const BLOG_POST_ORDER = BLOG_POST_CONFIGS.map((config) => config.slug)
const BLOG_POSTS = BLOG_POST_CONFIGS.map(buildBlogPostFromConfig)
const BLOG_POST_BY_SLUG = new Map(BLOG_POSTS.map((post) => [post.slug, post] as const))

function titleCaseFromSlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function buildFallbackBlogSource(config: BlogPostConfig): string {
  const title = titleCaseFromSlug(config.slug)
  const description = `${title} - wpis w kategorii ${config.categoryLabel} na ${SITE_SHORT_NAME}.`

  return `---
slug: ${config.slug}
title_seo: ${title} | ${SITE_SHORT_NAME}
meta_description: ${description}
h1: ${title}
author: ${BLOG_AUTHOR_NAME}
publishedAt: ${config.publishedAt}
---

## O czym jest ten wpis

Ten wpis korzysta z bezpiecznego fallbacku treĹ›ci, gdy plik markdown nie jest obecny w repozytorium.

## Co sprawdziÄ‡ dalej

- Zobacz kategoriÄ™: [${config.categoryLabel}](${config.categoryHref})
- PrzejdĹş do pierwszego kroku: [umĂłw konsultacjÄ™](${config.audioHref})
- WrĂłÄ‡ do bloga: [blog](${BLOG_ROUTE_BASE})
`
}

function readBlogFile(config: BlogPostConfig): string {
  try {
    return readFileSync(path.join(BLOG_DIR, config.fileName), 'utf8')
  } catch (error) {
    const maybeNodeError = error as NodeJS.ErrnoException

    if (maybeNodeError.code === 'ENOENT') {
      return buildFallbackBlogSource(config)
    }

    throw error
  }
}

function stripWrappingQuotes(value: string): string {
  const trimmed = value.trim()

  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1)
  }

  return trimmed
}

function parseFrontmatter(source: string): { frontmatter: Frontmatter; body: string } {
  const match = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?([\s\S]*)$/)

  if (!match) {
    return { frontmatter: {}, body: source }
  }

  const frontmatterLines = match[1].split(/\r?\n/)
  const frontmatter: Frontmatter = {}

  for (const line of frontmatterLines) {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const separatorIndex = trimmed.indexOf(':')

    if (separatorIndex === -1) {
      continue
    }

    const key = trimmed.slice(0, separatorIndex).trim()
    const value = stripWrappingQuotes(trimmed.slice(separatorIndex + 1))

    if (!value) {
      continue
    }

    if (key === 'slug' || key === 'title_seo' || key === 'meta_description' || key === 'h1' || key === 'author' || key === 'publishedAt') {
      frontmatter[key] = value
    }
  }

  return {
    frontmatter,
    body: match[2],
  }
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function normalizeForComparison(value: string): string {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[â€žâ€ť"]/g, '')
    .replace(/\u00a0/g, ' ')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function isSafeHref(href: string): boolean {
  const normalized = href.trim().toLowerCase()

  return (
    normalized.startsWith('/') ||
    normalized.startsWith('#') ||
    normalized.startsWith('http://') ||
    normalized.startsWith('https://') ||
    normalized.startsWith('mailto:') ||
    normalized.startsWith('tel:')
  )
}

function normalizeBlogHref(href: string, audioHref: string): string | null {
  const trimmed = href.trim()

  if (!trimmed) {
    return null
  }

  if (trimmed.toLowerCase().startsWith('/call')) {
    return audioHref
  }

  if (isSafeHref(trimmed)) {
    return trimmed
  }

  return null
}

function renderInlineMarkdown(text: string, audioHref: string): string {
  let html = escapeHtml(repairCopy(text))

  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label: string, href: string) => {
    const normalizedHref = normalizeBlogHref(href, audioHref)

    if (!normalizedHref) {
      return label
    }

    return `<a href="${escapeHtml(normalizedHref)}">${label}</a>`
  })

  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(?!\s)(.+?)(?<!\s)\*/g, '<em>$1</em>')
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

  return html
}

function parseMarkdownBlocks(source: string): BlogMarkdownBlock[] {
  const normalizedSource = source.replace(/\r\n/g, '\n')
  const lines = normalizedSource.split('\n')
  const blocks: BlogMarkdownBlock[] = []
  let index = 0

  const isHeadingLine = (line: string) => /^#{1,6}\s+/.test(line)
  const isListLine = (line: string) => /^(?:- |\* |\d+\.\s+)/.test(line)

  while (index < lines.length) {
    const line = lines[index] ?? ''
    const trimmed = line.trim()

    if (!trimmed) {
      index += 1
      continue
    }

    if (trimmed.startsWith('```')) {
      index += 1
      const codeLines: string[] = []

      while (index < lines.length && !(lines[index]?.trim() ?? '').startsWith('```')) {
        codeLines.push(lines[index] ?? '')
        index += 1
      }

      if (index < lines.length) {
        index += 1
      }

      blocks.push({
        type: 'code',
        text: codeLines.join('\n'),
      })
      continue
    }

    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = []

      while (index < lines.length && (lines[index]?.trim() ?? '').startsWith('>')) {
        quoteLines.push((lines[index] ?? '').replace(/^>\sÄ…/, ''))
        index += 1
      }

      blocks.push({
        type: 'blockquote',
        text: quoteLines.join(' '),
      })
      continue
    }

    if (isHeadingLine(trimmed)) {
      const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/)

      if (headingMatch) {
        blocks.push({
          type: 'heading',
          depth: headingMatch[1].length,
          text: headingMatch[2]?.trim() ?? '',
        })
      }

      index += 1
      continue
    }

    if (isListLine(trimmed)) {
      const ordered = /^\d+\.\s+/.test(trimmed)
      const items: string[] = []

      while (index < lines.length && isListLine((lines[index] ?? '').trim())) {
        const currentLine = (lines[index] ?? '').trim()
        const currentItem = ordered
          ? currentLine.replace(/^\d+\.\s+/, '')
          : currentLine.replace(/^(?:- |\* )/, '')

        items.push(currentItem)
        index += 1
      }

      blocks.push({
        type: 'list',
        ordered,
        items,
      })
      continue
    }

    const paragraphLines: string[] = []

    while (index < lines.length) {
      const currentLine = lines[index] ?? ''
      const currentTrimmed = currentLine.trim()

      if (!currentTrimmed) {
        break
      }

      if (currentTrimmed.startsWith('```') || currentTrimmed.startsWith('>') || isHeadingLine(currentTrimmed) || isListLine(currentTrimmed)) {
        break
      }

      paragraphLines.push(currentTrimmed)
      index += 1
    }

    if (paragraphLines.length > 0) {
      blocks.push({
        type: 'paragraph',
        text: paragraphLines.join(' '),
      })
      continue
    }

    index += 1
  }

  return blocks
}

function isSkipSectionHeading(text: string): boolean {
  const normalized = normalizeForComparison(text)

  return normalized === 'linkowanie' || normalized === 'linkowanie wewnÄ™trzne'
}

function classifySectionHeading(text: string): 'intro' | 'faq' | 'cta' | 'default' {
  const normalized = normalizeForComparison(text)

  if (normalized === 'lead') {
    return 'intro'
  }

  if (normalized === 'faq') {
    return 'faq'
  }

  if (/^(chcesz|jeĹ›li chcesz|jeĹĽeli chcesz|jeĹ›li dotarĹ‚|jeĹĽeli dotarĹ‚)/i.test(normalized)) {
    return 'cta'
  }

  return 'default'
}

function countWords(source: string): number {
  const matches = source.match(/\p{L}[\p{L}\p{M}\p{N}'â€™-]*/gu)

  return matches?.length ?? 0
}

function estimateReadingTimeMinutes(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / 190))
}

function formatDateLabel(dateValue: string): string {
  return new Intl.DateTimeFormat('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${dateValue}T12:00:00.000Z`))
}

function renderMarkdownBlock(
  block: BlogMarkdownBlock,
  key: string,
  audioHref: string,
): ReactNode {
  switch (block.type) {
    case 'heading':
      return React.createElement(`h${Math.min(block.depth, 6)}`, {
        key,
        dangerouslySetInnerHTML: {
          __html: renderInlineMarkdown(block.text, audioHref),
        },
      })
    case 'paragraph':
      return React.createElement('p', {
        key,
        dangerouslySetInnerHTML: {
          __html: renderInlineMarkdown(block.text, audioHref),
        },
      })
    case 'list':
      return React.createElement(
        block.ordered ? 'ol' : 'ul',
        { key },
        block.items.map((item, index) =>
          React.createElement('li', {
            key: `${key}-${index}`,
            dangerouslySetInnerHTML: {
              __html: renderInlineMarkdown(item, audioHref),
            },
          }),
        ),
      )
    case 'blockquote':
      return React.createElement(
        'blockquote',
        { key },
        React.createElement('p', {
          dangerouslySetInnerHTML: {
            __html: renderInlineMarkdown(block.text, audioHref),
          },
        }),
      )
    case 'code':
      return React.createElement('pre', { key }, React.createElement('code', null, block.text))
    case 'hr':
      return React.createElement('hr', { key })
  }
}

function isLegacyCtaLinkBlock(block: BlogMarkdownBlock): boolean {
  if (block.type !== 'paragraph') {
    return false
  }

  const text = repairCopy(block.text)
  const lowerText = text.toLowerCase()
  const legacyMaterialPath = `/${'materialy'}`
  const legacyToolkitPath = `/${'niez' + 'bednik'}`

  return (
    /\]\(/.test(text) &&
    (lowerText.includes('kategoria:') ||
      lowerText.includes('zamĂłw') ||
      lowerText.includes('umĂłw kwadrans') ||
      lowerText.includes('/book') ||
      lowerText.includes('/call') ||
      lowerText.includes(legacyMaterialPath) ||
      lowerText.includes(legacyToolkitPath) ||
      lowerText.includes('pdf'))
  )
}

function renderBlogSection(
  section: {
    heading: BlogMarkdownHeadingBlock | null
    blocks: BlogMarkdownBlock[]
    key: string
  },
  audioHref: string,
): ReactNode {
  const headingText = section.heading?.text ?? ''
  const classifiedSectionType = section.heading ? classifySectionHeading(section.heading.text) : 'default'
  const sectionType =
    classifiedSectionType === 'default' && section.blocks.some(isLegacyCtaLinkBlock) ? 'cta' : classifiedSectionType
  const sectionClasses = ['blog-content-section']
  const visibleBlocks =
    sectionType === 'cta' ? section.blocks.filter((block) => !isLegacyCtaLinkBlock(block)) : section.blocks

  if (sectionType !== 'default') {
    sectionClasses.push(`blog-content-section--${sectionType}`)
  }

  if (section.heading?.depth === 2 && /faq/i.test(headingText)) {
    sectionClasses.push('blog-content-section--faq')
  }

  const headingNode =
    section.heading && sectionType !== 'intro'
      ? React.createElement(`h${Math.min(section.heading.depth, 6)}`, {
          key: `${section.key}-heading`,
          className: 'blog-content-heading',
          dangerouslySetInnerHTML: {
            __html: renderInlineMarkdown(section.heading.text, audioHref),
          },
        })
      : null

  const sectionBody = visibleBlocks.map((block, blockIndex) =>
    renderMarkdownBlock(block, `${section.key}-${blockIndex}`, audioHref),
  )

  if (sectionType === 'cta') {
    sectionBody.push(
      React.createElement(
        'div',
        { key: `${section.key}-primary-cta`, className: 'blog-content-cta-actions' },
        React.createElement('a', { className: 'blog-content-primary-cta', href: '/' }, 'UmĂłw pierwszy krok'),
      ),
    )
  }

  return React.createElement(
    'section',
    {
      key: section.key,
      className: sectionClasses.join(' '),
    },
    headingNode,
    React.createElement(
      'div',
      { className: 'blog-content-section-body' },
      sectionBody,
    ),
  )
}

function renderBlogContentBlocks(post: BlogPost): ReactNode[] {
  const nodes: ReactNode[] = []
  let currentSection: { heading: BlogMarkdownHeadingBlock | null; blocks: BlogMarkdownBlock[]; key: string } | null = null
  let sectionCount = 0
  let skippedArticleTitle = false
  let skipSection = false

  const flushSection = () => {
    if (!currentSection) {
      return
    }

    if (currentSection.heading === null && currentSection.blocks.length === 0) {
      currentSection = null
      return
    }

    nodes.push(renderBlogSection(currentSection, post.audioHref))
    currentSection = null
  }

  for (const block of post.blocks) {
    if (block.type === 'heading' && block.depth === 1 && !skippedArticleTitle) {
      skippedArticleTitle = true
      continue
    }

    if (block.type === 'heading' && block.depth <= 2) {
      flushSection()
      skipSection = isSkipSectionHeading(block.text)

      if (skipSection) {
        continue
      }

      currentSection = {
        heading: block,
        blocks: [],
        key: `${post.slug}-section-${sectionCount += 1}`,
      }
      continue
    }

    if (skipSection) {
      continue
    }

    if (!currentSection) {
      currentSection = {
        heading: null,
        blocks: [],
        key: `${post.slug}-section-${sectionCount += 1}`,
      }
    }

    currentSection.blocks.push(block)
  }

  flushSection()

  return nodes
}

function buildBlogPostFromConfig(config: BlogPostConfig): BlogPost {
  const source = readBlogFile(config)
  const { frontmatter, body } = parseFrontmatter(source)
  const repairedBody = repairCopy(body)
  const blocks = parseMarkdownBlocks(repairedBody)
  const slug = frontmatter.slug ?? config.slug
  const title = repairCopy(frontmatter.h1 ?? frontmatter.title_seo ?? config.slug)
  const seoTitle = repairCopy(frontmatter.title_seo ?? title)
  const metaDescription = repairCopy(frontmatter.meta_description ?? `Wpis blogowy marki ${SITE_SHORT_NAME}.`)
  const excerpt = metaDescription
  const publishedAt = frontmatter.publishedAt ?? config.publishedAt
  const author = repairCopy(frontmatter.author ?? BLOG_AUTHOR_NAME)
  const bodyWordCount = countWords(
    repairedBody
      .replace(/^##\s+Linkowanie wewnÄ™trzne[\s\S]*$/im, '')
      .replace(/^#\s+.*$/m, '')
      .replace(/^---[\s\S]*?---\s*/m, ''),
  )

  return {
    slug,
    title,
    seoTitle,
    metaDescription,
    excerpt,
    h1: repairCopy(frontmatter.h1 ?? title),
    author,
    publishedAt,
    publishedAtLabel: formatDateLabel(publishedAt),
    readingTimeMinutes: estimateReadingTimeMinutes(bodyWordCount),
    wordCount: bodyWordCount,
    categoryLabel: repairCopy(config.categoryLabel),
    categoryHref: config.categoryHref,
    topic: config.topic,
    audioHref: config.audioHref,
    supportLinks: config.supportLinks.map((link) => ({
      ...link,
      label: repairCopy(link.label),
      description: repairCopy(link.description),
    })),
    cover: getBlogPostCover({ slug, categoryHref: config.categoryHref }),
    path: `${BLOG_ROUTE_BASE}/${slug}`,
    fileName: config.fileName,
    rawBody: repairedBody,
    blocks,
  }
}

export function listBlogPosts(): BlogPost[] {
  return [...BLOG_POST_ORDER.map((slug) => BLOG_POST_BY_SLUG.get(slug)).filter((post): post is BlogPost => Boolean(post))]
}

export function getBlogPostBySlug(slug: string): BlogPost | null {
  return BLOG_POST_BY_SLUG.get(slug) ?? null
}

export function listRelatedBlogPosts(slug: string, limit = 3): BlogPost[] {
  const currentPost = getBlogPostBySlug(slug)

  if (!currentPost) {
    return []
  }

  const sameTopic = BLOG_POSTS.filter((post) => post.slug !== slug && post.topic === currentPost.topic)
  const sameCategory = BLOG_POSTS.filter(
    (post) => post.slug !== slug && post.categoryHref === currentPost.categoryHref && post.topic !== currentPost.topic,
  )

  return [...sameTopic, ...sameCategory].slice(0, limit)
}

export function listBlogRoutePaths(): string[] {
  return [BLOG_ROUTE_BASE, ...BLOG_POSTS.map((post) => post.path)]
}

export function getBlogListingMetadata({ title, description, path: routePath }: BlogListingMetadataInput): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: routePath,
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: `${title} | ${SITE_SHORT_NAME}`,
      description,
      siteName: SITE_NAME,
      type: 'website',
      locale: 'pl_PL',
      url: routePath,
      images: [SITE_OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${SITE_SHORT_NAME}`,
      description,
      images: [SITE_OG_IMAGE.url],
    },
  }
}

export function getBlogPostMetadata({ post, description }: BlogPostMetadataInput): Metadata {
  const title = buildLimitedMetadataTitle(post.seoTitle)
  const cover = {
    url: post.cover.src,
    width: post.cover.width,
    height: post.cover.height,
    alt: post.cover.alt,
  }

  return {
    title: {
      absolute: title,
    },
    description,
    alternates: {
      canonical: post.path,
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title,
      description,
      siteName: SITE_NAME,
      type: 'article',
      locale: 'pl_PL',
      url: post.path,
      section: post.categoryLabel,
      authors: [BLOG_AUTHOR_NAME],
      publishedTime: post.publishedAt,
      modifiedTime: post.publishedAt,
      images: [cover],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [post.cover.src],
    },
  }
}

export function getBlogArticleJsonLd(post: BlogPost, baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.seoTitle,
    description: post.metaDescription,
    author: {
      '@type': 'Person',
      name: BLOG_AUTHOR_NAME,
      url: new URL('/o-mnie', baseUrl).toString(),
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: new URL(SITE_OG_IMAGE.url, baseUrl).toString(),
        width: SITE_OG_IMAGE.width,
        height: SITE_OG_IMAGE.height,
      },
    },
    mainEntityOfPage: new URL(post.path, baseUrl).toString(),
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    articleSection: post.categoryLabel,
    image: [new URL(post.cover.src, baseUrl).toString()],
    wordCount: post.wordCount,
    inLanguage: 'pl-PL',
  }
}

export function renderBlogPostContent(post: BlogPost): ReactNode[] {
  return renderBlogContentBlocks(post)
}

export const BLOG_POSTS_SITE_WIDE = BLOG_POSTS

