import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, CalendarDays, Clock3 } from 'lucide-react'
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

export default function BlogArticlePage({ params }: BlogArticlePageProps) {
  const post = getBlogPostBySlug(params.slug)

  if (!post) {
    notFound()
  }

  const baseUrl = getCanonicalBaseUrl()
  const relatedPosts = listRelatedBlogPosts(post.slug, 3)

  return (
    <NotatnikPageShell
      tag="Regulski"
      navItems={PUBLIC_SITE_NAV_ITEMS}
      ctaHref="/quiz"
      ctaLabel="Quiz"
      footerPrimaryHref="/blog"
      footerPrimaryLabel="Wróć do bloga"
      sideVisualVariant="blog"
      pageClassName="blog-page blog-article-page"
      shellClassName="blog-index-shell"
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
        <div className="blog-index-content">
          <section className="blog-article-hero-panel">
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
            </div>
            <figure className="blog-article-hero-media">
              <Image src={post.cover.src} alt={post.cover.alt} fill sizes="(max-width: 980px) 92vw, 38vw" priority />
            </figure>
          </section>

          <section className="blog-article-panel">
            <article className="blog-article-content">{renderBlogPostContent(post)}</article>
          </section>

          {relatedPosts.length > 0 ? (
            <section className="blog-related-panel">
              <h2>Powiązane artykuły</h2>
              <div className="blog-related-grid">
                {relatedPosts.map((relatedPost) => (
                  <Link key={relatedPost.slug} href={relatedPost.path} prefetch={false} className="blog-related-card">
                    <span>{repairCopy(relatedPost.categoryLabel)}</span>
                    <strong>{repairCopy(relatedPost.title)}</strong>
                    <small>
                      Czytaj dalej <ArrowRight size={14} strokeWidth={1.9} aria-hidden="true" />
                    </small>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>

    </NotatnikPageShell>
  )
}
