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
  params: Promise<{
    slug: string
  }>
  searchParams?: Promise<CaseMapSearchParams>
}

export function generateStaticParams() {
  return listProblemPages().map((page) => ({
    slug: page.slug,
  }))
}

export async function generateMetadata(props: ProblemPageProps): Promise<Metadata> {
  const params = await props.params;
  const metadata = getProblemPageMetadata(params.slug)

  if (!metadata) {
    return {}
  }

  return metadata
}

export default async function ProblemPage(props: ProblemPageProps) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const page = getProblemPageBySlug(params.slug)

  if (!page) {
    notFound()
  }

  return <ProblemDetailPage slug={params.slug} searchParams={searchParams} />
}
