import type { Metadata } from 'next'
import { ProblemLandingPage, getProblemLandingMetadata } from '@/lib/problem-landings'

const routePath = '/koty/zalatwianie-poza-kuweta'

export const metadata: Metadata = getProblemLandingMetadata(routePath)

export default function Page() {
  return <ProblemLandingPage routePath={routePath} />
}