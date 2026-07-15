import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, CheckCircle2, Clock3, ListChecks, PawPrint } from 'lucide-react'
import { NotatnikPageShell, PUBLIC_SITE_NAV_ITEMS } from '@/components/NotatnikA'
import { Schema } from '@/components/schema'
import {
  BLOG_ROUTE_BASE,
  getBlogArticleJsonLd,
  getBlogPostBySlug,
  getBlogPostMetadata,
  listBlogPosts,
  listRelatedBlogPosts,
  renderBlogPostContent,
} from '@/lib/blog'
import { repairCopy } from '@/lib/copy'
import { getBreadcrumbJsonLd } from '@/lib/schema'
import { getCanonicalBaseUrl } from '@/lib/server/env'
import { getCanonicalPublicHref } from '@/lib/public-routes'

type BlogArticlePageProps = {
  params: {
    slug: string
  }
}

export function generateStaticParams() {
  return listBlogPosts().map((post) => ({ slug: post.slug }))
}

export function generateMetadata({ params }: BlogArticlePageProps): Metadata {
  const post = getBlogPostBySlug(params.slug)

  if (!post) {
    return {}
  }

  return getBlogPostMetadata({ post, description: post.metaDescription })
}

function getArticleSummary(post: NonNullable<ReturnType<typeof getBlogPostBySlug>>) {
  return post.blocks
    .flatMap((block) => (block.type === 'heading' && block.depth === 2 ? [repairCopy(block.text)] : []))
    .filter((text) => text && !/linkowanie/i.test(text))
    .slice(0, 7)
}

export default function BlogArticlePage({ params }: BlogArticlePageProps) {
  const post = getBlogPostBySlug(params.slug)

  if (!post) {
    notFound()
  }

  const baseUrl = getCanonicalBaseUrl()
  const relatedPosts = listRelatedBlogPosts(post.slug, 2)
  const tocItems = getArticleSummary(post)

  return (
    <NotatnikPageShell
      tag="Regulski"
      navItems={PUBLIC_SITE_NAV_ITEMS}
      ctaHref="/mapa-sprawy"
      ctaLabel="Mapa zachowania"
      footerPrimaryHref="/blog"
      footerPrimaryLabel="Wróć do bloga"
      sideVisualVariant="blog"
      pageClassName="blog-page blog-article-page blog-redesign-page blog-article-redesign-page"
      shellClassName="blog-index-shell blog-article-redesign-shell"
      showFooterReviews={false}
    >
      <Schema
        data={[
          getBreadcrumbJsonLd([
            { name: 'Strona główna', path: '/' },
            { name: 'Blog', path: BLOG_ROUTE_BASE },
            { name: post.h1, path: post.path },
          ]),
          getBlogArticleJsonLd(post, baseUrl),
        ]}
      />
      <div className="blog-article-redesign-content">
        <section className="blog-article-redesign-hero">
          <div className="blog-article-hero-copy">
            <Link href={BLOG_ROUTE_BASE} prefetch={false} className="blog-article-back-link">
              <ArrowLeft size={16} strokeWidth={1.9} aria-hidden="true" />
              Wróć do bloga
            </Link>
            <div className="blog-article-meta-row">
              <span>{repairCopy(post.categoryLabel)}</span>
              <span>
                <CalendarDays size={14} strokeWidth={1.8} aria-hidden="true" />
                <time dateTime={post.publishedAt}>{repairCopy(post.publishedAtLabel)}</time>
              </span>
              <span>
                <Clock3 size={14} strokeWidth={1.8} aria-hidden="true" />
                {post.readingTimeMinutes} min czytania
              </span>
            </div>
            <h1>{repairCopy(post.h1)}</h1>
            <p>{repairCopy(post.metaDescription)}</p>
            <div className="blog-article-benefit-row" aria-label="Co znajdziesz w artykule">
              <span>
                <BookOpen size={15} strokeWidth={1.8} aria-hidden="true" />
                Zrozum przyczynę
              </span>
              <span>
                <ListChecks size={15} strokeWidth={1.8} aria-hidden="true" />
                Pierwsze kroki
              </span>
              <span>
                <CheckCircle2 size={15} strokeWidth={1.8} aria-hidden="true" />
                Praktyczne wskazówki
              </span>
            </div>
          </div>
          <figure className="blog-article-hero-media">
            <Image src={post.cover.src} alt={post.cover.alt} fill sizes="(max-width: 980px) 92vw, 42vw" priority />
          </figure>
        </section>

        <section className="blog-article-reading-layout">
          <aside className="blog-article-left-rail" aria-label="Nawigacja po artykule">
            <div className="blog-article-toc-card">
              <h2>W tym artykule</h2>
              <ol>
                {(tocItems.length > 0 ? tocItems : ['O co może chodzić?', 'Co sprawdzić najpierw?', 'Jak działać krok po kroku?']).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </div>
            <div className="blog-article-help-rail">
              <PawPrint size={24} strokeWidth={1.6} aria-hidden="true" />
              <strong>Potrzebujesz indywidualnej pomocy?</strong>
              <p>Umów konsultację i pracujmy razem nad rozwiązaniem problemu.</p>
              <Link href="/mapa-sprawy" prefetch={false}>
                Umów konsultację
              </Link>
            </div>
          </aside>

          <article className="blog-article-content blog-article-redesign-body">{renderBlogPostContent(post)}</article>

          <aside className="blog-article-right-rail" aria-label="Powiązane ścieżki">
            {post.supportLinks.length > 0 ? (
              <section className="blog-article-support-card">
                <h2>Co dalej?</h2>
                {post.supportLinks.slice(0, 3).map((link) => (
                  <Link key={link.href + link.label} href={getCanonicalPublicHref(link.href)} prefetch={false}>
                    <strong>{repairCopy(link.label)}</strong>
                    <span>{repairCopy(link.description)}</span>
                    <ArrowRight size={15} strokeWidth={1.9} aria-hidden="true" />
                  </Link>
                ))}
              </section>
            ) : null}

            {relatedPosts.length > 0 ? (
              <section className="blog-article-related-card">
                <h2>Podobne artykuły</h2>
                {relatedPosts.map((relatedPost) => (
                  <Link key={relatedPost.slug} href={relatedPost.path} prefetch={false}>
                    <span className="blog-article-related-thumb">
                      <Image src={relatedPost.cover.src} alt="" fill loading="lazy" sizes="72px" />
                    </span>
                    <span>
                      <strong>{repairCopy(relatedPost.title)}</strong>
                      <small>{relatedPost.readingTimeMinutes} min czytania</small>
                    </span>
                  </Link>
                ))}
              </section>
            ) : null}
          </aside>
        </section>

        <section className="blog-article-bottom-cta">
          <div>
            <h2>Nie wiesz, od czego zacząć?</h2>
            <p>Przejdź przez Mapę sprawy albo umów konsultację. Dobierzemy pierwszy krok do realnej sytuacji Twojego psa lub kota.</p>
          </div>
          <Link href="/mapa-sprawy" prefetch={false}>
            Umów konsultację
            <ArrowRight size={17} strokeWidth={1.9} aria-hidden="true" />
          </Link>
        </section>
      </div>
    </NotatnikPageShell>
  )
}
