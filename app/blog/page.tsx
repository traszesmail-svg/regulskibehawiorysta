import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  Baby,
  Brain,
  Cat,
  ChevronRight,
  Dog,
  Heart,
  Home,
  PawPrint,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { NotatnikFooter, NotatnikTopbar, PUBLIC_SITE_NAV_ITEMS } from '@/components/NotatnikA'
import { ReferenceHeroLeaf } from '@/components/ReferencePageShell'
import { Schema } from '@/components/schema'
import { BLOG_ROUTE_BASE, getBlogListingMetadata, listBlogPosts, type BlogPost } from '@/lib/blog'
import { repairCopy } from '@/lib/copy'
import { getBreadcrumbJsonLd, getItemListJsonLd } from '@/lib/schema'
import { getCanonicalBaseUrl } from '@/lib/server/env'

const BLOG_DESCRIPTION =
  'Praktyczne artykuły o zachowaniu psów i kotów: szczekanie, kuweta, lęk, napięcie, relacje i codzienne trudności. Spokojnie, bez mitów i presji.'

export const metadata: Metadata = getBlogListingMetadata({
  title: 'Blog o zachowaniu psów i kotów',
  path: BLOG_ROUTE_BASE,
  description: BLOG_DESCRIPTION,
})

const FEATURED_BLOG_SLUGS = [
  'dlaczego-moj-pies-szczeka-na-inne-psy',
  'kot-zalatwia-sie-poza-kuweta',
  'pies-wyje-kiedy-zostaje-sam',
  'szczeniak-pierwsza-noc',
  'pies-ciagnie-na-smyczy',
  'stres-kota-a-zachowania-toaletowe',
  'jak-wprowadzic-nowego-kota-do-domu',
  'jak-zapoznac-dwa-koty',
  'pies-ciagnie-na-smyczy-od-czego-zaczac',
  'reaktywnosc-na-smyczy-cwiczenie-luznej-smyczy',
] as const

const BLOG_PAGE_SIZE = 9

const BLOG_POPULAR_SLUGS = [
  'dlaczego-moj-pies-szczeka-na-inne-psy',
  'kot-zalatwia-sie-poza-kuweta',
  'pies-ciagnie-na-smyczy',
] as const

type BlogSearchParams = {
  category?: string | string[]
  page?: string | string[]
  q?: string | string[]
}

type BlogCategory = {
  id: string
  label: string
  href: string
  count: number
  icon: LucideIcon
  predicate?: (post: BlogPost) => boolean
  group?: 'core' | 'trend'
}

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function normalizeParam(value: string | string[] | undefined) {
  return repairCopy(getSingleParam(value) ?? '').trim().toLowerCase()
}

function orderBlogPosts(posts: BlogPost[]) {
  const bySlug = new Map(posts.map((post) => [post.slug, post] as const))
  const featured = FEATURED_BLOG_SLUGS.map((slug) => bySlug.get(slug)).filter((post): post is BlogPost => Boolean(post))
  const rest = posts.filter((post) => !FEATURED_BLOG_SLUGS.includes(post.slug as (typeof FEATURED_BLOG_SLUGS)[number]))

  return [...featured, ...rest]
}

function countBy(posts: BlogPost[], predicate: (post: BlogPost) => boolean) {
  return posts.filter(predicate).length
}

function isDogPost(post: BlogPost) {
  return post.categoryHref === '/psy'
}

function isCatPost(post: BlogPost) {
  return post.categoryHref === '/koty'
}

function isBehaviorPost(post: BlogPost) {
  return isDogPost(post) || isCatPost(post)
}

function getCategoryHref(categoryId: string) {
  if (categoryId === 'all') return `${BLOG_ROUTE_BASE}#artykuly`

  return `${BLOG_ROUTE_BASE}?category=${encodeURIComponent(categoryId)}#artykuly`
}

function buildCategories(posts: BlogPost[]): BlogCategory[] {
  return [
    { id: 'all', label: 'Wszystkie', href: getCategoryHref('all'), count: posts.length, icon: PawPrint },
    { id: 'pies', label: 'Pies', href: getCategoryHref('pies'), count: countBy(posts, isDogPost), icon: Dog, predicate: isDogPost },
    { id: 'kot', label: 'Kot', href: getCategoryHref('kot'), count: countBy(posts, isCatPost), icon: Cat, predicate: isCatPost },
    {
      id: 'zachowanie',
      label: 'Zachowanie',
      href: getCategoryHref('zachowanie'),
      count: countBy(posts, isBehaviorPost),
      icon: Brain,
      predicate: isBehaviorPost,
    },
    {
      id: 'emocje',
      label: 'Emocje',
      href: getCategoryHref('emocje'),
      count: countBy(posts, (post) => /stres|lęk|lek|wyje|boi|napieciu|napięciu|emoc/i.test(post.slug)),
      icon: Heart,
      predicate: (post) => /stres|lęk|lek|wyje|boi|napieciu|napięciu|emoc/i.test(post.slug),
    },
    {
      id: 'relacja',
      label: 'Relacja',
      href: getCategoryHref('relacja'),
      count: countBy(posts, (post) => /relac|zapoznac|wprowadzic|nowy|trener/i.test(post.slug)),
      icon: UsersRound,
      predicate: (post) => /relac|zapoznac|wprowadzic|nowy|trener/i.test(post.slug),
    },
    {
      id: 'dom',
      label: 'Dom',
      href: getCategoryHref('dom'),
      count: countBy(posts, (post) => /dom|kuwet|meble|sam|samotnos/i.test(post.slug)),
      icon: Home,
      predicate: (post) => /dom|kuwet|meble|sam|samotnos/i.test(post.slug),
    },
    {
      id: 'mlode',
      label: 'Szczeniak / Kocię',
      href: getCategoryHref('mlode'),
      count: countBy(posts, (post) => /szczeniak|kocie|kocię|nowy-pies|nowego-kota/i.test(post.slug)),
      icon: Baby,
      predicate: (post) => /szczeniak|kocie|kocię|nowy-pies|nowego-kota/i.test(post.slug),
    },
    {
      id: 'smycz-spacery',
      label: 'Smycz i spacery',
      href: getCategoryHref('smycz-spacery'),
      count: countBy(posts, (post) => /smycz|spacer|reaktywnosc|ciagnie/i.test(post.slug)),
      icon: Dog,
      group: 'trend',
      predicate: (post) => /smycz|spacer|reaktywnosc|ciagnie/i.test(post.slug),
    },
    {
      id: 'samotnosc-psa',
      label: 'Samotność psa',
      href: getCategoryHref('samotnosc-psa'),
      count: countBy(posts, (post) => /sam|samotnos|wyje|zostawania/i.test(post.slug)),
      icon: Home,
      group: 'trend',
      predicate: (post) => /sam|samotnos|wyje|zostawania/i.test(post.slug),
    },
    {
      id: 'kuweta',
      label: 'Kuweta',
      href: getCategoryHref('kuweta'),
      count: countBy(posts, (post) => /kuwet|toalet/i.test(post.slug)),
      icon: Cat,
      group: 'trend',
      predicate: (post) => /kuwet|toalet/i.test(post.slug),
    },
    {
      id: 'relacje-kotow',
      label: 'Relacje kotów',
      href: getCategoryHref('relacje-kotow'),
      count: countBy(posts, (post) => /kot.*kot|zapoznac|nowego-kota|relac|konflikt/i.test(post.slug)),
      icon: UsersRound,
      group: 'trend',
      predicate: (post) => /kot.*kot|zapoznac|nowego-kota|relac|konflikt/i.test(post.slug),
    },
    {
      id: 'nagla-zmiana',
      label: 'Nagła zmiana zachowania',
      href: getCategoryHref('nagla-zmiana'),
      count: countBy(posts, (post) => /stres|kuwet|agres|boi|chowa|zachowan/i.test(post.slug)),
      icon: Heart,
      group: 'trend',
      predicate: (post) => /stres|kuwet|agres|boi|chowa|zachowan/i.test(post.slug),
    },
    {
      id: 'adopcja-pierwsze-dni',
      label: 'Pierwsze dni po adopcji',
      href: getCategoryHref('adopcja-pierwsze-dni'),
      count: countBy(posts, (post) => /nowy-pies|nowego-kota|pierwsza-noc|pierwsze-72/i.test(post.slug)),
      icon: Baby,
      group: 'trend',
      predicate: (post) => /nowy-pies|nowego-kota|pierwsza-noc|pierwsze-72/i.test(post.slug),
    },
    {
      id: 'halas-burza-fajerwerki',
      label: 'Hałas, burza, fajerwerki',
      href: getCategoryHref('halas-burza-fajerwerki'),
      count: countBy(posts, (post) => /lek|lÄ™k|boi|stres|panik|dzwiek|halas/i.test(post.slug)),
      icon: Brain,
      group: 'trend',
      predicate: (post) => /lek|lÄ™k|boi|stres|panik|dzwiek|halas/i.test(post.slug),
    },
  ]
}

function filterBlogPosts(posts: BlogPost[], category: BlogCategory | undefined, query: string) {
  const byCategory = category?.predicate ? posts.filter(category.predicate) : posts
  const normalizedQuery = repairCopy(query).trim().toLowerCase()

  if (!normalizedQuery) return byCategory

  return byCategory.filter((post) => {
    const haystack = [post.title, post.h1, post.excerpt, post.categoryLabel, post.slug]
      .map((value) => repairCopy(value).toLowerCase())
      .join(' ')

    return haystack.includes(normalizedQuery)
  })
}

function parsePageParam(value: string | string[] | undefined) {
  const page = Number.parseInt(getSingleParam(value) ?? '', 10)

  return Number.isFinite(page) && page > 0 ? page : 1
}

function buildBlogPageHref(page: number, categoryId: string) {
  const params = new URLSearchParams()

  if (categoryId !== 'all') {
    params.set('category', categoryId)
  }

  if (page > 1) {
    params.set('page', String(page))
  }

  const query = params.toString()

  return `${BLOG_ROUTE_BASE}${query ? `?${query}` : ''}#artykuly`
}

function getSpeciesBadge(post: BlogPost) {
  if (post.categoryHref === '/koty') return 'Kot'
  if (post.categoryHref === '/psy') return 'Pies'
  return repairCopy(post.categoryLabel)
}

function getRedesignImage(post: BlogPost) {
  return post.cover.src
}

function formatPostMeta(post: BlogPost) {
  return `${post.readingTimeMinutes} min czytania · ${repairCopy(post.publishedAtLabel)}`
}

function pickPostsBySlugs(posts: BlogPost[], slugs: readonly string[]) {
  const bySlug = new Map(posts.map((post) => [post.slug, post] as const))

  return slugs.map((slug) => bySlug.get(slug)).filter((post): post is BlogPost => Boolean(post))
}

export default function BlogPage({ searchParams }: { searchParams?: BlogSearchParams }) {
  const posts = listBlogPosts()
  const categories = buildCategories(posts)
  const coreCategories = categories.filter((category) => category.group !== 'trend')
  const trendCategories = categories.filter((category) => category.group === 'trend')
  const categoryId = normalizeParam(searchParams?.category) || 'all'
  const activeCategory =
    categories.find((category) => category.id === categoryId && (category.id === 'all' || category.predicate)) ?? categories[0]
  const query = ''
  const orderedPosts = orderBlogPosts(posts)
  const filteredPosts = filterBlogPosts(orderedPosts, activeCategory, query)
  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / BLOG_PAGE_SIZE))
  const currentPage = Math.min(parsePageParam(searchParams?.page), totalPages)
  const pageStart = (currentPage - 1) * BLOG_PAGE_SIZE
  const paginatedPosts = filteredPosts.slice(pageStart, pageStart + BLOG_PAGE_SIZE)
  const pageEnd = pageStart + paginatedPosts.length
  const shouldShowResetLink = activeCategory.id !== 'all' || currentPage > 1
  const popularPosts = pickPostsBySlugs(orderedPosts, BLOG_POPULAR_SLUGS)
  const structuredData = [
    getBreadcrumbJsonLd([
      { name: 'Strona główna', path: '/' },
      { name: 'Blog', path: '/blog' },
    ]),
    getItemListJsonLd(
      posts.map((post) => ({
        name: repairCopy(post.h1),
        url: new URL(post.path, getCanonicalBaseUrl()).toString(),
      })),
      'https://schema.org/ItemListOrderDescending',
    ),
  ]

  return (
    <main className="notatnik-page blog-page blog-index-page blog-redesign-page">
      <Schema data={structuredData} />
      <div className="notatnik-shell blog-index-shell blog-redesign-shell">
        <NotatnikTopbar tag="Regulski" navItems={PUBLIC_SITE_NAV_ITEMS} showUtilityLinks={false} />
        <ReferenceHeroLeaf />

        <div className="blog-redesign-content">
          <section className="blog-redesign-hero" aria-labelledby="blog-index-title">
            <div className="blog-redesign-hero-copy">
              <span className="blog-redesign-kicker">Blog</span>
              <h1 id="blog-index-title">Zanim zaczniesz poprawiać zachowanie, warto zrozumieć, po co ono się pojawia.</h1>
              <p>
                Praktyczne artykuły o psach i kotach — o emocjach, relacjach i codziennych wyzwaniach.
                Bez presji, bez mitów. Z empatią i doświadczeniem.
              </p>
            </div>
            <div className="blog-redesign-hero-art" aria-hidden="true">
              <Image src="/blog/hero-opiekun-pies-kot.jpg" alt="" fill sizes="(max-width: 760px) calc(100vw - 44px), 680px" priority />
            </div>
          </section>

          <nav id="blog-kategorie" className="blog-redesign-category-pills" aria-label="Kategorie bloga">
            {coreCategories.map((category) => {
              const Icon = category.icon
              const isActive = category.id === activeCategory?.id

              return (
                <Link
                  key={category.id}
                  href={category.href}
                  prefetch={false}
                  className={isActive ? 'is-active' : undefined}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon size={16} strokeWidth={1.9} aria-hidden="true" />
                  <span>{repairCopy(category.label)}</span>
                  <small>{category.count}</small>
                </Link>
              )
            })}
          </nav>


          <section className="blog-trend-topic-panel" aria-labelledby="blog-trend-topic-title">
            <div className="blog-redesign-section-heading">
              <h2 id="blog-trend-topic-title">Najczęściej szukane tematy</h2>
              <p>Problemowe filtry prowadzą szybciej do języka opiekuna: smycz, samotność, kuweta, relacje, adopcja i nagła zmiana.</p>
            </div>
            <div className="blog-trend-topic-grid">
              {trendCategories.map((category) => {
                const Icon = category.icon
                const isActive = category.id === activeCategory?.id

                return (
                  <Link
                    key={category.id}
                    href={category.href}
                    prefetch={false}
                    className={isActive ? 'is-active' : undefined}
                    aria-current={isActive ? 'page' : undefined}
                    data-analytics-event="topic_selected"
                    data-analytics-location="blog-trend-topics"
                    data-analytics-problem={category.id}
                    data-analytics-cta-label={category.label}
                    data-analytics-item-type="blog_problem_filter"
                    data-analytics-item-slug={category.id}
                  >
                    <Icon size={17} strokeWidth={1.9} aria-hidden="true" />
                    <span>{repairCopy(category.label)}</span>
                    <small>{category.count} wpisów</small>
                  </Link>
                )
              })}
            </div>
          </section>
          <section id="artykuly" className="blog-redesign-section-block" aria-label="Artykuły blogowe">
            <div className="blog-redesign-section-heading">
              <h2>{activeCategory.id === 'all' ? 'Wszystkie artykuły' : `Artykuły: ${repairCopy(activeCategory.label)}`}</h2>
              <p>
                {filteredPosts.length > 0
                  ? `${pageStart + 1}-${pageEnd} z ${filteredPosts.length} wpisów`
                  : 'Brak wpisów dla wybranego filtra'}
              </p>
            </div>
            <div className="blog-redesign-latest-list">
              {paginatedPosts.map((post) => (
                <Link href={post.path} prefetch={false} className="blog-redesign-list-row" key={post.slug}>
                  <span className="blog-redesign-list-image">
                    <Image src={getRedesignImage(post)} alt="" fill sizes="112px" />
                  </span>
                  <span className="blog-redesign-list-copy">
                    <span>{getSpeciesBadge(post)}</span>
                    <strong>{repairCopy(post.title)}</strong>
                    <small>{formatPostMeta(post)}</small>
                  </span>
                  <ChevronRight size={19} strokeWidth={1.8} aria-hidden="true" />
                </Link>
              ))}
              {filteredPosts.length === 0 ? (
                <div className="blog-redesign-empty">
                  <h2>Brak artykułów dla tego filtra</h2>
                  <p>Zmień kategorię, żeby zobaczyć pełną listę wpisów.</p>
                  <Link href={`${BLOG_ROUTE_BASE}#artykuly`} prefetch={false}>
                    Pokaż wszystkie artykuły
                  </Link>
                </div>
              ) : null}
              {shouldShowResetLink ? (
                <Link href={`${BLOG_ROUTE_BASE}#artykuly`} prefetch={false} className="blog-redesign-see-all">
                  Zobacz wszystkie artykuły
                  <ArrowRight size={16} strokeWidth={1.9} aria-hidden="true" />
                </Link>
              ) : null}
            </div>
            {totalPages > 1 ? (
              <nav className="blog-redesign-pagination" aria-label="Paginacja artykułów">
                {currentPage > 1 ? (
                  <Link href={buildBlogPageHref(currentPage - 1, activeCategory.id)} prefetch={false}>
                    Poprzednia
                  </Link>
                ) : (
                  <span aria-disabled="true">Poprzednia</span>
                )}
                {Array.from({ length: totalPages }, (_, index) => {
                  const pageNumber = index + 1

                  return (
                    <Link
                      key={pageNumber}
                      href={buildBlogPageHref(pageNumber, activeCategory.id)}
                      prefetch={false}
                      aria-current={pageNumber === currentPage ? 'page' : undefined}
                    >
                      {pageNumber}
                    </Link>
                  )
                })}
                {currentPage < totalPages ? (
                  <Link href={buildBlogPageHref(currentPage + 1, activeCategory.id)} prefetch={false}>
                    Następna
                  </Link>
                ) : (
                  <span aria-disabled="true">Następna</span>
                )}
              </nav>
            ) : null}
          </section>

          <section className="blog-redesign-section-block blog-redesign-two-column" aria-label="Kategorie i popularne artykuły">
            <div>
              <h2>Kategorie</h2>
              <div className="blog-redesign-category-table">
                {coreCategories.map((category) => {
                  const Icon = category.icon

                  return (
                    <Link href={category.href} prefetch={false} key={category.id}>
                      <span>
                        <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
                        {repairCopy(category.label)}
                      </span>
                      <b>{category.count}</b>
                      <ChevronRight size={16} strokeWidth={1.7} aria-hidden="true" />
                    </Link>
                  )
                })}
              </div>
            </div>
            <div>
              <h2>Popularne artykuły</h2>
              <ol className="blog-redesign-popular-list">
                {popularPosts.map((post, index) => (
                  <li key={post.slug}>
                    <Link href={post.path} prefetch={false}>
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      <strong>{repairCopy(post.title)}</strong>
                      <ChevronRight size={17} strokeWidth={1.8} aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section className="blog-redesign-help-card site-help-cta">
            <div className="site-help-cta-copy">
              <h2>Potrzebujesz pomocy w rozwiązaniu problemu?</h2>
              <p>Skonsultuj się ze mną. Wspólnie znajdziemy najlepsze rozwiązanie dla Ciebie i Twojego zwierzęcia.</p>
              <div className="site-help-cta-actions">
                <Link href="/" prefetch={false} className="blog-redesign-help-link">
                  Umów konsultację
                  <ArrowRight size={17} strokeWidth={1.9} aria-hidden="true" />
                </Link>
              </div>
            </div>
            <div className="blog-redesign-help-image site-help-cta-image" aria-hidden="true">
              <Image src="/faq/faq-help-illustration-clean.png" alt="" width={355} height={208} sizes="(max-width: 760px) 58vw, 210px" />
            </div>
          </section>
        </div>

        <NotatnikFooter showReviews={false} />
      </div>
    </main>
  )
}
