import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  ProblemDetailPage,
  getProblemPageBySlug,
  getProblemPageMetadata,
  listProblemPages,
} from '@/lib/problem-pages'

type ProblemPageProps = {
  params: {
    slug: string
  }
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

export default function ProblemPage({ params }: ProblemPageProps) {
  const page = getProblemPageBySlug(params.slug)

  if (!page) {
    notFound()
  }

  return <ProblemDetailPage slug={params.slug} />
}
