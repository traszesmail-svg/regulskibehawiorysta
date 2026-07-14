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
  Mail,
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
  'pies-wyje-kiedy-zostaje-sam',
  'kot-zalatwia-sie-poza-kuweta',
  'pies-ciagnie-na-smyczy',
] as const

const BLOG_HERO_IMAGE = '/branding/regulski-web/hero/hero-blog.png'
const BLOG_AUTHOR_IMAGE = '/branding/specialist-krzysztof-portrait.jpg'

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
  if (categoryId === 'all') return BLOG_ROUTE_BASE + '#artykuly'

  return BLOG_ROUTE_BASE + '?category=' + encodeURIComponent(categoryId) + '#artykuly'
}

function buildCategories(posts: BlogPost[]): BlogCategory[] {
  return [
    { id: 'all', label: 'Wszystkie artykuły', href: getCategoryHref('all'), count: posts.length, icon: PawPrint },
    { id: 'pies', label: 'Psy', href: getCategoryHref('pies'), count: countBy(posts, isDogPost), icon: Dog, predicate: isDogPost },
    { id: 'kot', label: 'Koty', href: getCategoryHref('kot'), count: countBy(posts, isCatPost), icon: Cat, predicate: isCatPost },
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
      label: 'Emocje i stres',
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
      count: countBy(posts, (post) => /lek|lęk|boi|stres|panik|dzwiek|halas/i.test(post.slug)),
      icon: Brain,
      group: 'trend',
      predicate: (post) => /lek|lęk|boi|stres|panik|dzwiek|halas/i.test(post.slug),
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

  return BLOG_ROUTE_BASE + (query ? '?' + query : '') + '#artykuly'
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
  return repairCopy(post.publishedAtLabel) + ' · ' + post.readingTimeMinutes + ' min czytania'
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
  const spotlightPost = paginatedPosts[0] ?? orderedPosts[0]
  const topCards = paginatedPosts.slice(0, 5)
  const remainingPosts = paginatedPosts.slice(5)
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
    <main className="notatnik-page blog-page blog-index-page blog-redesign-page blog-magazine-page">
      <Schema data={structuredData} />
      <div className="notatnik-shell blog-index-shell blog-redesign-shell blog-magazine-shell">
        <NotatnikTopbar tag="Regulski" navItems={PUBLIC_SITE_NAV_ITEMS} showUtilityLinks={false} />
        <ReferenceHeroLeaf />

        <div className="blog-redesign-content blog-magazine-content">
          <section className="blog-magazine-hero" aria-labelledby="blog-index-title">
            <div className="blog-magazine-hero-copy">
              <span className="blog-redesign-kicker">Blog</span>
              <h1 id="blog-index-title">Wiedza, która pomaga spokojniej żyć z psem i kotem</h1>
              <p>
                Praktyczne artykuły, sprawdzone metody i spokojne wyjaśnienia. Zacznij od problemu, który widzisz,
                a potem wybierz pierwszy krok dla swojej sytuacji.
              </p>
              <div className="blog-magazine-hero-actions">
                <Link href="/quiz" prefetch={false}>
                  Umów konsultację
                  <ArrowRight size={17} strokeWidth={1.9} aria-hidden="true" />
                </Link>
                <span>Indywidualna pomoc dopasowana do Was</span>
              </div>
            </div>
            <figure className="blog-magazine-hero-art" aria-hidden="true">
              <Image src={BLOG_HERO_IMAGE} alt="" fill sizes="(max-width: 760px) 92vw, 620px" priority />
            </figure>
          </section>

          <nav id="blog-kategorie" className="blog-magazine-category-rail" aria-label="Kategorie bloga">
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
                  <Icon size={24} strokeWidth={1.55} aria-hidden="true" />
                  <span>{repairCopy(category.label)}</span>
                </Link>
              )
            })}
          </nav>

          <section className="blog-magazine-layout" id="artykuly" aria-label="Artykuły blogowe">
            <div className="blog-magazine-main">
              <div className="blog-magazine-section-head">
                <div>
                  <span>{activeCategory.id === 'all' ? 'Polecane teraz' : 'Wybrany temat'}</span>
                  <h2>{activeCategory.id === 'all' ? 'Najbardziej pomocne artykuły' : 'Artykuły: ' + repairCopy(activeCategory.label)}</h2>
                </div>
                <p>
                  {filteredPosts.length > 0
                    ? String(pageStart + 1) + '-' + String(pageEnd) + ' z ' + String(filteredPosts.length) + ' wpisów'
                    : 'Brak wpisów dla wybranego filtra'}
                </p>
              </div>

              {filteredPosts.length === 0 ? (
                <div className="blog-redesign-empty">
                  <h2>Brak artykułów dla tego filtra</h2>
                  <p>Zmień kategorię, żeby zobaczyć pełną listę wpisów.</p>
                  <Link href={BLOG_ROUTE_BASE + '#artykuly'} prefetch={false}>
                    Pokaż wszystkie artykuły
                  </Link>
                </div>
              ) : (
                <div className="blog-magazine-card-grid">
                  {topCards.map((post, index) => (
                    <Link
                      href={post.path}
                      prefetch={false}
                      className={index < 2 ? 'blog-magazine-card is-large' : 'blog-magazine-card'}
                      key={post.slug}
                    >
                      <span className="blog-magazine-card-media">
                        <Image src={getRedesignImage(post)} alt="" fill sizes={index < 2 ? '(max-width: 760px) 92vw, 410px' : '(max-width: 760px) 92vw, 260px'} />
                        {index === 0 ? <em>Polecany artykuł</em> : null}
                      </span>
                      <span className="blog-magazine-card-body">
                        <small>{formatPostMeta(post)}</small>
                        <strong>{repairCopy(post.title)}</strong>
                        <span>{repairCopy(post.excerpt)}</span>
                        <b>
                          Czytaj więcej
                          <ArrowRight size={15} strokeWidth={1.9} aria-hidden="true" />
                        </b>
                      </span>
                    </Link>
                  ))}
                </div>
              )}

              {remainingPosts.length > 0 ? (
                <div className="blog-magazine-list">
                  {remainingPosts.map((post) => (
                    <Link href={post.path} prefetch={false} className="blog-magazine-list-row" key={post.slug}>
                      <span>{getSpeciesBadge(post)}</span>
                      <strong>{repairCopy(post.title)}</strong>
                      <small>{formatPostMeta(post)}</small>
                      <ChevronRight size={18} strokeWidth={1.8} aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              ) : null}

              {shouldShowResetLink ? (
                <Link href={BLOG_ROUTE_BASE + '#artykuly'} prefetch={false} className="blog-redesign-see-all">
                  Zobacz wszystkie artykuły
                  <ArrowRight size={16} strokeWidth={1.9} aria-hidden="true" />
                </Link>
              ) : null}

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
            </div>

            <aside className="blog-magazine-sidebar" aria-label="Pomocnicze informacje bloga">
              <section className="blog-author-card">
                <h2>O autorze</h2>
                <Image src={BLOG_AUTHOR_IMAGE} alt="Krzysztof Regulski" width={132} height={132} loading="lazy" />
                <strong>Krzysztof Regulski</strong>
                <span>Behawiorysta psów i kotów</span>
                <p>Pomagam opiekunom lepiej zrozumieć zachowanie zwierząt i dobrać spokojny, praktyczny pierwszy krok.</p>
                <Link href="/o-mnie" prefetch={false}>
                  Dowiedz się więcej o mnie
                  <ArrowRight size={15} strokeWidth={1.9} aria-hidden="true" />
                </Link>
              </section>

              <section className="blog-newsletter-card">
                <Mail size={30} strokeWidth={1.55} aria-hidden="true" />
                <h2>Bądź na bieżąco</h2>
                <p>Nowe artykuły, proste wskazówki i tematy, które warto zauważyć wcześniej.</p>
                <Link href="/newsletter" prefetch={false}>
                  Zapisz się
                  <ArrowRight size={15} strokeWidth={1.9} aria-hidden="true" />
                </Link>
              </section>

              <section className="blog-popular-topics-card">
                <h2>Popularne tematy</h2>
                <div>
                  {trendCategories.slice(0, 7).map((category) => (
                    <Link key={category.id} href={category.href} prefetch={false} className={category.id === activeCategory.id ? 'is-active' : undefined}>
                      <span>{repairCopy(category.label)}</span>
                      <small>{category.count}</small>
                    </Link>
                  ))}
                </div>
              </section>
            </aside>
          </section>

          <section className="blog-magazine-bottom-cta">
            <figure aria-hidden="true">
              <Image src={spotlightPost?.cover.src ?? BLOG_HERO_IMAGE} alt="" fill sizes="(max-width: 760px) 42vw, 210px" />
            </figure>
            <div>
              <h2>Potrzebujesz indywidualnej pomocy?</h2>
              <p>Każde zwierzę jest inne. Jeśli artykuł pomaga nazwać problem, konsultacja pomaga ułożyć pierwszy plan działania.</p>
            </div>
            <Link href="/quiz" prefetch={false}>
              Umów konsultację
              <ArrowRight size={17} strokeWidth={1.9} aria-hidden="true" />
            </Link>
          </section>
        </div>

        <NotatnikFooter showReviews={false} />
      </div>
    </main>
  )
}
