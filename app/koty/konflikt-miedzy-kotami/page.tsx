import type { Metadata } from 'next'
import { ProblemLandingPage, getProblemLandingMetadata } from '@/lib/problem-landings'

const routePath = '/koty/konflikt-miedzy-kotami'

export const metadata: Metadata = getProblemLandingMetadata(routePath)

export default function Page() {
  return <ProblemLandingPage routePath={routePath} />
}