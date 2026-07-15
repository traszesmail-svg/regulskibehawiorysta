import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  ProblemDetailPage,
  getProblemPageBySlug,
  getProblemPageMetadata,
  listProblemPages,
} from '@/lib/problem-pages'
import type { CaseMapSearchParams } from '@/lib/case-map-routing'

type ProblemPageProps = {
  params: {
    slug: string
  }
  searchParams?: CaseMapSearchParams
}

export function generateStaticParams() {
  return listProblemPages().map((page) => ({
    slug: page.slug,
  }))
}

export function generateMetadata({ params }: ProblemPageProps): Metadata {
  const metadata = getProblemPageMetadata(params.slug)

  if (!metadata) {
    return {}
  }

  return metadata
}

export default function ProblemPage({ params, searchParams }: ProblemPageProps) {
  const page = getProblemPageBySlug(params.slug)

  if (!page) {
    notFound()
  }

  return <ProblemDetailPage slug={params.slug} searchParams={searchParams} />
}
