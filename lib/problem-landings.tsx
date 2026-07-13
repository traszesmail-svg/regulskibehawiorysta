import 'server-only'

import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { Metadata } from 'next'
import Link from 'next/link'
import React, { type ReactNode } from 'react'
import { HeroIllustration } from '@/components/HeroIllustration'
import { FunnelPrimaryActions } from '@/components/FunnelPrimaryActions'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { NotatnikFooter, NotatnikSideVisuals, NotatnikTopbar, PUBLIC_SITE_NAV_ITEMS } from '@/components/NotatnikA'
import { LeadMagnetSignup } from '@/components/LeadMagnetSignup'
import { NewsletterSignup } from '@/components/NewsletterSignup'
import { TrustSignalSection } from '@/components/TrustSignalSection'
import { buildBookHref } from '@/lib/booking-routing'
import { FUNNEL_CTA_LABELS } from '@/lib/funnel'
import { getLeadMagnetBySlug, getProblemLandingLeadMagnetSlug } from '@/lib/active-lead-magnets'
import { getTopicalClusterByRoutePath } from '@/lib/growth-layer'
import { REAL_CASE_STUDIES } from '@/lib/real-case-studies'
import { getBreadcrumbJsonLd } from '@/lib/schema'
import { buildMarketingMetadata } from '@/lib/seo'
import { getCanonicalBaseUrl } from '@/lib/server/env'
import { SITE_NAME, SITE_OG_IMAGE, SITE_SHORT_NAME, SPECIALIST_NAME, TOPIC_VISUALS } from '@/lib/site'
import { CASE_STUDY_SELECTIONS } from '@/lib/trust-layer'

type LandingSpecies = 'pies' | 'kot'

type Frontmatter = {
  slug?: string
  title_seo?: string
  meta_description?: string
  h1?: string
}

type ProblemLandingConfig = {
  slug: string
  routePath: string
  fileName: string
  species: LandingSpecies
  categoryHref: '/psy' | '/koty'
  categoryLabel: 'Psy' | 'Koty'
  eyebrow: string
  visualSrc: string
  visualAlt: string
  visualWidth: number
  visualHeight: number
  toolkitHref: string
  toolkitLabel: string
  crossLinks?: Array<{
    href: string
    label: string
    copy: string
  }>
}

type ProblemLandingHeadingBlock = {
  type: 'heading'
  depth: number
  text: string
}

type ProblemLandingParagraphBlock = {
  type: 'paragraph'
  text: string
}

type ProblemLandingListBlock = {
  type: 'list'
  ordered: boolean
  items: string[]
}

type ProblemLandingRuleBlock = {
  type: 'hr'
}

type ProblemLandingBlock =
  | ProblemLandingHeadingBlock
  | ProblemLandingParagraphBlock
  | ProblemLandingListBlock
  | ProblemLandingRuleBlock

type ProblemLandingSection = {
  heading: ProblemLandingHeadingBlock | null
  blocks: ProblemLandingBlock[]
  key: string
}

type ProblemLanding = {
  slug: string
  path: string
  title: string
  seoTitle: string
  metaDescription: string
  h1: string
  species: LandingSpecies
  categoryHref: '/psy' | '/koty'
  categoryLabel: 'Psy' | 'Koty'
  eyebrow: string
  fileName: string
  rawBody: string
  blocks: ProblemLandingBlock[]
  sections: ProblemLandingSection[]
  introText: string
  faqItems: Array<{ question: string; answer: string }>
  audioHref: string
  consultationHref: string
  contactHref: string
  toolkitHref: string
  toolkitLabel: string
  visualSrc: string
  visualAlt: string
  visualWidth: number
  visualHeight: number
  crossLinks: Array<{ href: string; label: string; copy: string }>
}

const LANDINGS_DIR = path.join(process.cwd(), 'content', 'landings-mvp')

const PROBLEM_LANDING_CONFIGS: ProblemLandingConfig[] = [
  {
    slug: 'reaktywnosc-na-smyczy',
    routePath: '/psy/reaktywnosc-na-smyczy',
    fileName: '01-landing-reaktywnosc-na-smyczy.md',
    species: 'pies',
    categoryHref: '/psy',
    categoryLabel: 'Psy',
    eyebrow: 'Problem',
    visualSrc: TOPIC_VISUALS.spacer.src,
    visualAlt: TOPIC_VISUALS.spacer.alt,
    visualWidth: 1024,
    visualHeight: 1536,
    toolkitHref: '/materialy#psy',
    toolkitLabel: 'BezpĹ‚atny materiaĹ‚: pies i poziom ruchu',
    crossLinks: [
      {
        href: '/psy/lek-separacyjny',
        label: 'LÄ™k separacyjny u psa',
        copy: 'JeĹ›li obok spacerĂłw widzisz teĹĽ trudnoĹ›Ä‡ z rozĹ‚Ä…kÄ… albo z wyciszeniem po wyjĹ›ciu opiekuna, sprawdĹş teĹĽ ten temat.',
      },
      {
        href: '/materialy#psy',
        label: 'PDF: pies i poziom ruchu',
        copy: 'JeĹ›li jeden materiaĹ‚ to za maĹ‚o, zacznij od sprawdzenia rytmu dnia, odpoczynku i przeciÄ…ĹĽenia.',
      },
    ],
  },
  {
    slug: 'lek-separacyjny',
    routePath: '/psy/lek-separacyjny',
    fileName: '02-landing-lek-separacyjny.md',
    species: 'pies',
    categoryHref: '/psy',
    categoryLabel: 'Psy',
    eyebrow: 'Problem',
    visualSrc: TOPIC_VISUALS.separacja.src,
    visualAlt: TOPIC_VISUALS.separacja.alt,
    visualWidth: 1024,
    visualHeight: 1536,
    toolkitHref: '/materialy#psy',
    toolkitLabel: 'PDF: pies zostaje sam',
    crossLinks: [
      {
        href: '/psy/reaktywnosc-na-smyczy',
        label: 'ReaktywnoĹ›Ä‡ na smyczy',
        copy: 'JeĹ›li obok trudnoĹ›ci z samotnoĹ›ciÄ… pojawia siÄ™ teĹĽ wysokie napiÄ™cie na spacerach, zobacz rĂłwnieĹĽ tÄ™ stronÄ™ problemowÄ….',
      },
      {
        href: '/materialy#psy',
        label: 'MateriaĹ‚y PDF',
        copy: 'JeĹ›li chcesz zobaczyÄ‡ wiÄ™cej materiaĹ‚Ăłw i spokojnie porĂłwnaÄ‡ Ĺ›cieĹĽki, przejdĹş do materiaĹ‚Ăłw dla opiekunĂłw psĂłw.',
      },
    ],
  },
  {
    slug: 'zalatwianie-poza-kuweta',
    routePath: '/koty/zalatwianie-poza-kuweta',
    fileName: '03-landing-zalatwianie-poza-kuweta.md',
    species: 'kot',
    categoryHref: '/koty',
    categoryLabel: 'Koty',
    eyebrow: 'Problem',
    visualSrc: TOPIC_VISUALS['kot-kuweta'].src,
    visualAlt: TOPIC_VISUALS['kot-kuweta'].alt,
    visualWidth: 1024,
    visualHeight: 1536,
    toolkitHref: '/materialy#koty',
    toolkitLabel: 'BezpĹ‚atny materiaĹ‚: kot ĹĽyje w napiÄ™ciu',
    crossLinks: [
      {
        href: '/koty/konflikt-miedzy-kotami',
        label: 'Konflikt miÄ™dzy kotami',
        copy: 'JeĹ›li obok problemu z kuwetÄ… widzisz teĹĽ napiÄ™cie w domu, sprawdĹş rĂłwnieĹĽ stronÄ™ o relacjach miÄ™dzy kotami.',
      },
    ],
  },
  {
    slug: 'konflikt-miedzy-kotami',
    routePath: '/koty/konflikt-miedzy-kotami',
    fileName: '04-landing-konflikt-miedzy-kotami.md',
    species: 'kot',
    categoryHref: '/koty',
    categoryLabel: 'Koty',
    eyebrow: 'Problem',
    visualSrc: TOPIC_VISUALS['kot-konflikt'].src,
    visualAlt: TOPIC_VISUALS['kot-konflikt'].alt,
    visualWidth: 1024,
    visualHeight: 1536,
    toolkitHref: '/materialy#koty',
    toolkitLabel: 'PDF: kot ĹĽyje w napiÄ™ciu',
    crossLinks: [
      {
        href: '/koty/zalatwianie-poza-kuweta',
        label: 'ZaĹ‚atwianie poza kuwetÄ…',
        copy: 'JeĹ›li obok konfliktu pojawiĹ‚y siÄ™ problemy toaletowe, zajrzyj teĹĽ do strony o kuwecie.',
      },
    ],
  },
]

function readLandingFile(fileName: string): string {
  return readFileSync(path.join(LANDINGS_DIR, fileName), 'utf8')
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

    if (key === 'slug' || key === 'title_seo' || key === 'meta_description' || key === 'h1') {
      frontmatter[key] = value
    }
  }

  return {
    frontmatter,
    body: match[2],
  }
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
    normalized.startsWith('mailto:')
  )
}

function normalizeLandingHref(href: string, audioHref: string): string | null {
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
  let html = escapeHtml(text)

  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label: string, href: string) => {
    const normalizedHref = normalizeLandingHref(href, audioHref)

    if (!normalizedHref) {
      return escapeHtml(label)
    }

    return `<a href="${escapeHtml(normalizedHref)}">${escapeHtml(label)}</a>`
  })

  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(?!\s)(.+?)(?<!\s)\*/g, '<em>$1</em>')
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

  return html
}

function parseMarkdownBlocks(source: string): ProblemLandingBlock[] {
  const normalizedSource = source.replace(/\r\n/g, '\n')
  const lines = normalizedSource.split('\n')
  const blocks: ProblemLandingBlock[] = []
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

    if (/^---+$/.test(trimmed)) {
      blocks.push({ type: 'hr' })
      index += 1
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

      if (!currentTrimmed || /^---+$/.test(currentTrimmed) || isHeadingLine(currentTrimmed) || isListLine(currentTrimmed)) {
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

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function normalizeSectionHeading(value: string): string {
  return normalizeWhitespace(value).toLowerCase()
}

function isSkipSectionHeading(text: string): boolean {
  return /linkowanie wewnÄ™trzne/i.test(text)
}

function buildSections(slug: string, blocks: ProblemLandingBlock[]): ProblemLandingSection[] {
  const sections: ProblemLandingSection[] = []
  let currentSection: ProblemLandingSection | null = null
  let sectionCount = 0
  let skippedTitle = false
  let skipSection = false

  const flushSection = () => {
    if (!currentSection) {
      return
    }

    if (currentSection.heading === null && currentSection.blocks.length === 0) {
      currentSection = null
      return
    }

    sections.push(currentSection)
    currentSection = null
  }

  for (const block of blocks) {
    if (block.type === 'heading' && block.depth === 1 && !skippedTitle) {
      skippedTitle = true
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
        key: `${slug}-section-${sectionCount += 1}`,
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
        key: `${slug}-section-${sectionCount += 1}`,
      }
    }

    currentSection.blocks.push(block)
  }

  flushSection()

  return sections
}

function extractIntroText(sections: ProblemLandingSection[]): string {
  const introSection = sections.find((section) => normalizeSectionHeading(section.heading?.text ?? '') === 'jak to wyglÄ…da w praktyce')

  if (!introSection) {
    const firstParagraph = sections.flatMap((section) => section.blocks).find((block): block is ProblemLandingParagraphBlock => block.type === 'paragraph')
    return firstParagraph?.text ?? ''
  }

  const firstParagraph = introSection.blocks.find((block): block is ProblemLandingParagraphBlock => block.type === 'paragraph')
  return firstParagraph?.text ?? ''
}

function extractFaqItems(sections: ProblemLandingSection[]): Array<{ question: string; answer: string }> {
  const faqSection = sections.find((section) => normalizeSectionHeading(section.heading?.text ?? '') === 'faq')

  if (!faqSection) {
    return []
  }

  const items: Array<{ question: string; answer: string }> = []

  for (const block of faqSection.blocks) {
    if (block.type !== 'paragraph') {
      continue
    }

    const match = block.text.match(/^\*\*(.+?)\*\*\s*(.+)$/)

    if (!match) {
      continue
    }

    items.push({
      question: normalizeWhitespace(match[1] ?? ''),
      answer: normalizeWhitespace(match[2] ?? ''),
    })
  }

  return items
}

function renderMarkdownBlock(block: ProblemLandingBlock, key: string, audioHref: string): ReactNode {
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
        { key, className: 'premium-bullet-list' },
        block.items.map((item, index) =>
          React.createElement('li', {
            key: `${key}-${index}`,
            dangerouslySetInnerHTML: {
              __html: renderInlineMarkdown(item, audioHref),
            },
          }),
        ),
      )
    case 'hr':
      return React.createElement('hr', { key })
  }
}

function renderSection(section: ProblemLandingSection, audioHref: string): ReactNode {
  const normalizedHeading = normalizeSectionHeading(section.heading?.text ?? '')
  const isFaqSection = normalizedHeading === 'faq'
  const headingText = section.heading?.text ?? ''

  return (
    <section key={section.key} className="panel section-panel editorial-section">
      {section.heading ? (
        <div className="editorial-section-head">
          <div className="editorial-section-head-copy">
            <div className="section-eyebrow">{isFaqSection ? 'FAQ' : 'Temat'}</div>
            <h2>{headingText}</h2>
          </div>
        </div>
      ) : null}

      <div className="blog-article-content">{section.blocks.map((block, index) => renderMarkdownBlock(block, `${section.key}-${index}`, audioHref))}</div>
    </section>
  )
}

function buildProblemLandingFromConfig(config: ProblemLandingConfig): ProblemLanding {
  const source = readLandingFile(config.fileName)
  const { frontmatter, body } = parseFrontmatter(source)
  const blocks = parseMarkdownBlocks(body)
  const sections = buildSections(config.slug, blocks)
  const audioHref = buildBookHref(null, 'szybka-konsultacja-15-min', false, config.species)
  const consultationHref = buildBookHref(null, 'konsultacja-behawioralna-online', false, config.species)
  const contactHref = `/kontakt?species=${config.species}#formularz`

  return {
    slug: config.slug,
    path: config.routePath,
    title: frontmatter.h1 ?? config.slug,
    seoTitle: frontmatter.title_seo ?? frontmatter.h1 ?? config.slug,
    metaDescription: frontmatter.meta_description ?? `${frontmatter.h1 ?? config.slug}.`,
    h1: frontmatter.h1 ?? config.slug,
    species: config.species,
    categoryHref: config.categoryHref,
    categoryLabel: config.categoryLabel,
    eyebrow: config.eyebrow,
    fileName: config.fileName,
    rawBody: body,
    blocks,
    sections,
    introText: extractIntroText(sections),
    faqItems: extractFaqItems(sections),
    audioHref,
    consultationHref,
    contactHref,
    toolkitHref: config.toolkitHref,
    toolkitLabel: config.toolkitLabel,
    visualSrc: config.visualSrc,
    visualAlt: config.visualAlt,
    visualWidth: config.visualWidth,
    visualHeight: config.visualHeight,
    crossLinks: config.crossLinks ?? [],
  }
}

const PROBLEM_LANDINGS = PROBLEM_LANDING_CONFIGS.map(buildProblemLandingFromConfig)
const PROBLEM_LANDING_BY_PATH = new Map(PROBLEM_LANDINGS.map((landing) => [landing.path, landing] as const))

export function listProblemLandingPaths(): string[] {
  return PROBLEM_LANDINGS.map((landing) => landing.path)
}

export function getProblemLandingByPath(routePath: string): ProblemLanding | null {
  return PROBLEM_LANDING_BY_PATH.get(routePath) ?? null
}

export function getProblemLandingMetadata(routePath: string): Metadata {
  const landing = getProblemLandingByPath(routePath)

  if (!landing) {
    return buildMarketingMetadata({
      title: SITE_NAME,
      path: '/',
      description: 'Regulski Behawiorysta.',
    })
  }

  return buildMarketingMetadata({
    title: landing.seoTitle,
    path: landing.path,
    description: landing.metaDescription,
    maxTitleLength: 70,
  })
}

export function ProblemLandingPage({ routePath }: { routePath: string }) {
  const landing = getProblemLandingByPath(routePath)

  if (!landing) {
    return null
  }

  const cluster = getTopicalClusterByRoutePath(landing.path)

  const baseUrl = getCanonicalBaseUrl()
  const structuredData: Array<Record<string, unknown>> = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: landing.seoTitle,
      description: landing.metaDescription,
      url: new URL(landing.path, baseUrl).toString(),
      isPartOf: {
        '@type': 'WebSite',
        name: SITE_NAME,
        url: baseUrl,
      },
      primaryImageOfPage: new URL(landing.visualSrc, baseUrl).toString(),
      inLanguage: 'pl-PL',
    },
  ]

  if (landing.faqItems.length > 0) {
    structuredData.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: landing.faqItems.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    })
  }

  structuredData.push(
    getBreadcrumbJsonLd([
      { name: 'Strona gĹ‚Ăłwna', path: '/' },
      { name: landing.categoryLabel, path: landing.categoryHref },
      { name: landing.h1, path: landing.path },
    ]),
  )

  return (
    <main className="page-wrap editorial-home-page premium-home-page problem-landing-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <NotatnikSideVisuals variant={landing.categoryHref === '/koty' ? 'cat' : 'dog'} />

      <div className="container editorial-stack">
        <NotatnikTopbar
          tag={`${landing.categoryLabel} / problem`}
          navItems={PUBLIC_SITE_NAV_ITEMS}
          ctaHref={landing.audioHref}
          ctaLabel="Kwadrans / 69 zĹ‚"
        />
        <Breadcrumbs items={[
          { name: landing.categoryLabel, url: landing.categoryHref },
          { name: landing.h1, url: landing.path },
        ]} />

        <section className="panel section-panel blog-article-hero-panel">
          <div className="editorial-section-head">
            <div className="editorial-section-head-copy">
              <div className="section-eyebrow">
                <Link href={landing.categoryHref} prefetch={false} className="prep-inline-link">
                  {landing.categoryLabel}
                </Link>{' '}
                Â· {landing.eyebrow}
              </div>
              <h1>{landing.h1}</h1>
            </div>
            <p className="editorial-section-lead">{landing.metaDescription}</p>
          </div>

          <div className="editorial-hero-grid top-gap">
            <div className="editorial-hero-copy">
              <p className="muted">{landing.introText}</p>

              <FunnelPrimaryActions
                audioHref={landing.audioHref}
                consultationHref={landing.consultationHref}
                contactHref={landing.contactHref}
                primaryLocation={`${landing.slug}-hero-audio`}
                secondaryLocation={`${landing.slug}-hero-toolkit`}
                note={
                  <>
                    JeĹ›li chcesz wrĂłciÄ‡ do szerszego kontekstu, zobacz{' '}
                    <Link href={landing.categoryHref} prefetch={false} className="prep-inline-link">
                      {landing.categoryLabel.toLowerCase()}
                    </Link>
                    . JeĹ›li wolisz najpierw materiaĹ‚ do czytania, zajrzyj teĹĽ do{' '}
                    <Link href={landing.toolkitHref} prefetch={false} className="prep-inline-link">
                      {landing.toolkitLabel.toLowerCase()}
                    </Link>
                    .
                  </>
                }
              />
            </div>

            <aside className="editorial-hero-visual" aria-label={landing.visualAlt}>
              <HeroIllustration
                slug={
                  landing.slug === 'reaktywnosc-na-smyczy' ? 'psy-reaktywnosc'
                  : landing.slug === 'lek-separacyjny' ? 'psy-separacja'
                  : landing.slug === 'zalatwianie-poza-kuweta' ? 'koty-kuweta'
                  : 'koty-konflikt'
                }
                emojiPlaceholder={landing.species === 'pies' ? 'đź•' : 'đź'}
                className="w-full h-full min-h-[380px]"
              />
            </aside>
          </div>
        </section>

        {landing.sections.map((section) => renderSection(section, landing.audioHref))}

        {(() => {
          const selectedCaseStudyId = CASE_STUDY_SELECTIONS.problemLandings[landing.slug as keyof typeof CASE_STUDY_SELECTIONS.problemLandings]
          const caseStudy = REAL_CASE_STUDIES.find((item) => item.id === selectedCaseStudyId)

          if (!caseStudy) {
            return null
          }

          return (
            <section className="panel section-panel editorial-section">
              <div className="editorial-section-head">
                <div className="editorial-section-head-copy">
                  <div className="section-eyebrow">PrzykĹ‚adowa historia</div>
                  <h2>Jak wyglÄ…da punkt startu przy podobnym problemie</h2>
                </div>
                <p className="editorial-section-lead">Jeden konkretny przykĹ‚ad pomaga lepiej niĹĽ dĹ‚uga lista obietnic.</p>
              </div>

              <article className="summary-card tree-backed-card">
                <div className="section-eyebrow">{caseStudy.eyebrow}</div>
                <h3>{caseStudy.headline}</h3>
                <p>{caseStudy.summary}</p>

                <div className="top-gap-small">
                  <strong>{caseStudy.firstStepLabel}</strong>
                  <p className="muted">{caseStudy.firstStepText}</p>
                </div>

                <div className="top-gap-small">
                  <strong>{caseStudy.nextStepLabel}</strong>
                  <p className="muted">{caseStudy.nextStepText}</p>
                </div>
              </article>
            </section>
          )
        })()}

        <TrustSignalSection
          eyebrow="Zaufanie"
          title="Spokojna analiza zachowania oparta na danych przed kolejnymi prĂłbami"
          description="Przy takich sytuacjach najwaĹĽniejsze jest dobre rozpoznanie kontekstu i uczciwy pierwszy plan."
          items={[
            {
              title: 'Najpierw analiza zachowania oparta na informacjach, potem technika',
              copy: 'NajwaĹĽniejsze jest zrozumienie wyzwalaczy, tĹ‚a i priorytetu, zanim wejdziesz w kolejne Ä‡wiczenia.',
            },
            {
              title: 'JeĹ›li online nie wystarczy, powiem to wprost',
              copy: 'Nie bÄ™dÄ™ zatrzymywaÄ‡ CiÄ™ w formacie, ktĂłry nie ma sensu dla tego przypadku.',
            },
            {
              title: 'Pierwsza rozmowa ma uporzÄ…dkowaÄ‡ temat',
              copy: 'Celem jest spokojny plan i mniej chaosu, nie obietnica cudu po jednym kontakcie.',
            },
          ]}
        />

        <section className="panel section-panel blog-related-panel">
          <div className="editorial-section-head">
            <div className="editorial-section-head-copy">
              <div className="section-eyebrow">Dalej</div>
              <h2>Zobacz teĹĽ</h2>
            </div>
            <p className="editorial-section-lead">NajbliĹĽsze strony i materiaĹ‚y zwiÄ…zane z tym tematem.</p>
          </div>

          <div className="blog-related-grid">
            <Link href={landing.audioHref} prefetch={false} className="summary-card tree-backed-card blog-related-card">
              <strong>{FUNNEL_CTA_LABELS.primary}</strong>
              <span>Najprostszy pierwszy krok, jeĹ›li chcesz omĂłwiÄ‡ swojÄ… sytuacjÄ™.</span>
            </Link>
            {cluster ? (
              <Link href={cluster.serviceLink.href} prefetch={false} className="summary-card tree-backed-card blog-related-card">
                <strong>{cluster.serviceLink.label}</strong>
                <span>{cluster.serviceLink.copy}</span>
              </Link>
            ) : null}
            <Link href="/book" prefetch={false} className="summary-card tree-backed-card blog-related-card">
              <strong>Rezerwacja</strong>
              <span>Zobacz dostÄ™pne warianty i przejdĹş do wĹ‚aĹ›ciwego startu.</span>
            </Link>
            <Link href={landing.categoryHref} prefetch={false} className="summary-card tree-backed-card blog-related-card">
              <strong>{landing.categoryLabel}</strong>
              <span>WrĂłÄ‡ do gĹ‚Ăłwnej strony tej kategorii.</span>
            </Link>
            <Link href={landing.toolkitHref} prefetch={false} className="summary-card tree-backed-card blog-related-card">
              <strong>{landing.toolkitLabel}</strong>
              <span>MateriaĹ‚ pomocniczy, jeĹ›li chcesz najpierw spokojnie poczytaÄ‡.</span>
            </Link>
            {cluster?.blogLinks.map((link) => (
              <Link key={link.href} href={link.href} prefetch={false} className="summary-card tree-backed-card blog-related-card">
                <strong>{link.label}</strong>
                <span>{link.copy}</span>
              </Link>
            ))}
            {landing.crossLinks.map((link) => (
              <Link key={link.href} href={link.href} prefetch={false} className="summary-card tree-backed-card blog-related-card">
                <strong>{link.label}</strong>
                <span>{link.copy}</span>
              </Link>
            ))}
            <Link href="/o-mnie" prefetch={false} className="summary-card tree-backed-card blog-related-card">
              <strong>O mnie</strong>
              <span>JeĹ›li chcesz sprawdziÄ‡ kwalifikacje i sposĂłb pracy.</span>
            </Link>
          </div>
        </section>

        <section className="panel section-panel editorial-section">
          <div className="editorial-section-head">
            <div className="editorial-section-head-copy">
              <div className="section-eyebrow">MateriaĹ‚y</div>
              <h2>JeĹ›li wolisz zaczÄ…Ä‡ od czytania</h2>
            </div>
            <p className="editorial-section-lead">BezpĹ‚atny materiaĹ‚ startowy i newsletter zostajÄ… tutaj niĹĽej, jako spokojne uzupeĹ‚nienie.</p>
          </div>

          <div className="premium-two-column-grid top-gap-small">
            {(() => {
              const magnet = getLeadMagnetBySlug(getProblemLandingLeadMagnetSlug(landing.path))

              return magnet ? (
                <LeadMagnetSignup magnet={magnet} location={`${landing.slug}-lead-magnet`} sourcePage={landing.path} />
              ) : null
            })()}
            <NewsletterSignup location={`${landing.slug}-newsletter`} sourcePage={landing.path} />
          </div>
        </section>

        <section className="panel cta-panel editorial-final-panel" id="final-cta">
          <div className="editorial-final-copy">
            <div className="section-eyebrow">Pierwszy krok</div>
            <h2>Zacznij od Kwadransu z behawiorystÄ…</h2>
            <p>JeĹ›li to brzmi jak Twoja sytuacja, jedna krĂłtka rozmowa wystarczy, ĹĽeby ustaliÄ‡, od czego zaczÄ…Ä‡ i co ma sens dalej.</p>

            <FunnelPrimaryActions
              audioHref={landing.audioHref}
              consultationHref={landing.consultationHref}
              contactHref={landing.contactHref}
              primaryLocation={`${landing.slug}-final-audio`}
              secondaryLocation={`${landing.slug}-final-toolkit`}
              noteClassName="muted home-final-soft-note"
            />
          </div>
        </section>

        <NotatnikFooter />
      </div>
    </main>
  )
}

export function getProblemLandingWebPageJsonLd(routePath: string) {
  const landing = getProblemLandingByPath(routePath)

  if (!landing) {
    return null
  }

  const baseUrl = getCanonicalBaseUrl()

  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: landing.seoTitle,
    description: landing.metaDescription,
    url: new URL(landing.path, baseUrl).toString(),
    image: [new URL(SITE_OG_IMAGE.url, baseUrl).toString()],
    about: {
      '@type': 'Thing',
      name: landing.h1,
    },
    author: {
      '@type': 'Person',
      name: SPECIALIST_NAME,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_SHORT_NAME,
    },
    inLanguage: 'pl-PL',
  }
}

