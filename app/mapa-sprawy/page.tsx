import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ShortBehaviorMapFlow } from '@/components/ShortBehaviorMapFlow'
import { Schema } from '@/components/schema'
import {
  getCaseMapMarketingParams,
  getCaseMapSource,
  getSingleCaseMapSearchParam,
  type CaseMapSearchParams,
} from '@/lib/case-map-routing'
import { getQuizProblemContext } from '@/lib/quiz-first-step'
import { getBreadcrumbJsonLd } from '@/lib/schema'
import { getBuildMarkerSnapshot } from '@/lib/build-marker'
import { REGULSKI_WEB_BADGE_LOGO } from '@/lib/regulski-web-assets'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Mapa zachowania — spokojny następny krok',
  description: 'Krótka, spokojna mapa zachowania psa lub kota. Uporządkuj obserwacje i wybierz następny krok lub rozmowę na już.',
}

type SearchParams = CaseMapSearchParams & {
  resume?: string | string[]
}

export default function BehaviorMapPage({ searchParams }: { searchParams?: SearchParams }) {
  const buildMarker = getBuildMarkerSnapshot()
  const problemKey = getSingleCaseMapSearchParam(searchParams?.problem)
  const context = getQuizProblemContext(problemKey)
  const initialCaseMapId = getSingleCaseMapSearchParam(searchParams?.resume)
  const marketingParams = getCaseMapMarketingParams(searchParams)
  const source = getCaseMapSource(marketingParams, Boolean(context))

  return (
    <main className={styles.page} data-build-marker={buildMarker.value}>
      <Schema
        data={getBreadcrumbJsonLd([
          { name: 'Strona główna', path: '/' },
          { name: 'Mapa zachowania', path: '/mapa-sprawy' },
        ])}
      />
      <section className={styles.application} aria-label="Mapa zachowania">
        <header className={styles.header}>
          <Link href="/" prefetch={false} className={styles.brand} aria-label="Wróć na stronę główną Regulski Behawiorysta">
            <Image src={REGULSKI_WEB_BADGE_LOGO} alt="" width={66} height={66} priority />
            <span>
              <strong>Regulski<br />Behawiorysta</strong>
              <small>Terapia zachowania psów i kotów</small>
            </span>
          </Link>
          <div className={styles.headerActions}>
            <span className={styles.headerTag}>Mapa zachowania</span>
            <Link href="/faq" prefetch={false} className={styles.helpLink}><span className={styles.headerGlyph} aria-hidden="true">?</span> Pomoc</Link>
            <Link href="/" prefetch={false} className={styles.closeLink} aria-label="Zamknij mapę i wróć na stronę główną"><span className={styles.closeGlyph} aria-hidden="true">×</span></Link>
          </div>
        </header>

        <div id="mapa-zachowania-start" className={styles.flow}>
          <h1 className={styles.screenReaderTitle}>Mapa zachowania — spokojny następny krok dla psa lub kota</h1>
          <ShortBehaviorMapFlow initialProblemKey={context?.problemKey} initialCaseMapId={initialCaseMapId || null} marketingParams={marketingParams} source={source} />
        </div>
      </section>
    </main>
  )
}
