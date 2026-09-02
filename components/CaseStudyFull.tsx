import Image from 'next/image'
import Link from 'next/link'
import { BeforeAfterBlock } from '@/components/BeforeAfterBlock'
import { getCaseImageDimensions, resolveCaseImageSrc } from '@/components/CaseStudyCard'
import {
  getRealCaseProofPills,
  getRealCaseSpeciesLabel,
  type RealCaseStudy,
} from '@/lib/real-case-studies'

type CaseStudyFullProps = {
  caseStudy: RealCaseStudy
  bookingHref: string
}

export function CaseStudyFull({ caseStudy, bookingHref }: CaseStudyFullProps) {
  const leadImage = caseStudy.images[0]
  const secondImage = caseStudy.images[1]
  const leadDimensions = leadImage ? getCaseImageDimensions(leadImage.src) : { width: 1200, height: 900 }
  const secondDimensions = secondImage ? getCaseImageDimensions(secondImage.src) : null

  return (
    <article className="notatnik-case-detail-article">
      <Link href="/opinie" prefetch={false} className="notatnik-inline-link">
        Opinie i przykłady
      </Link>

      <header className="notatnik-case-detail-hero">
        <div className="notatnik-case-detail-copy">
          <div className="notatnik-mono">{caseStudy.eyebrow}</div>
          <h1>{caseStudy.headline}</h1>
          <p>{caseStudy.summary}</p>
          <div className="notatnik-case-meta" aria-label={`Kontekst: ${caseStudy.headline}`}>
            <span>{getRealCaseSpeciesLabel(caseStudy.species)}</span>
            <span>{caseStudy.breed}</span>
            <span>{caseStudy.age}</span>
          </div>
        </div>

        {leadImage ? (
          <figure className="notatnik-case-detail-media">
            <Image
              src={resolveCaseImageSrc(leadImage.src, leadImage.remoteSrc)}
              alt={leadImage.alt}
              width={leadDimensions.width}
              height={leadDimensions.height}
              sizes="(max-width: 980px) 100vw, 520px"
              priority
              className="notatnik-case-detail-image"
            />
          </figure>
        ) : null}
      </header>

      <div className="notatnik-case-detail-layout">
        <div className="notatnik-case-detail-main">
          <BeforeAfterBlock before={caseStudy.summary} after={caseStudy.proof.outcomeSnapshot} />

          <div className="notatnik-case-detail-section">
            <div className="notatnik-mono">{caseStudy.firstStepLabel}</div>
            <h2>Co trzeba było nazwać najpierw</h2>
            <p>{caseStudy.firstStepText}</p>
          </div>

          <div className="notatnik-case-detail-section">
            <div className="notatnik-mono">{caseStudy.nextStepLabel}</div>
            <h2>Jak wyglądał dalszy kierunek</h2>
            <p>{caseStudy.nextStepText}</p>
          </div>

          <div className="notatnik-case-detail-section">
            <div className="notatnik-mono">Ograniczenie</div>
            <h2>To nie jest obietnica identycznego wyniku</h2>
            <p>
              To anonimowa sytuacja startowa, która pokazuje sposób porządkowania problemu. Tempo i zakres pracy zależą od zdrowia, historii,
              środowiska i tego, co da się utrzymać w domu.
            </p>
          </div>
        </div>

        <aside className="notatnik-case-detail-side" aria-label="Najważniejsze informacje">
          <div className="notatnik-case-side-card">
            <div className="notatnik-mono">Zakres</div>
            <div className="notatnik-case-pills">
              {getRealCaseProofPills(caseStudy).map((pill) => (
                <span key={`${caseStudy.id}-${pill}`}>{pill}</span>
              ))}
            </div>
          </div>

          <div className="notatnik-case-side-card">
            <div className="notatnik-mono">Źródło</div>
            <p>{caseStudy.proof.sourceContext}.</p>
          </div>

          {secondImage && secondDimensions ? (
            <figure className="notatnik-case-side-media">
              <Image
                src={resolveCaseImageSrc(secondImage.src, secondImage.remoteSrc)}
                alt={secondImage.alt}
                width={secondDimensions.width}
                height={secondDimensions.height}
                sizes="(max-width: 980px) 100vw, 320px"
                className="notatnik-case-detail-image"
              />
            </figure>
          ) : null}

          <div className="notatnik-case-side-card is-cta">
            <div className="notatnik-mono">Podobna sytuacja?</div>
            <p>Nie musisz idealnie dopasować historii do swojego problemu. Wystarczy krótki opis tego, co dzieje się teraz.</p>
            <Link href={bookingHref} prefetch={false} className="notatnik-btn">
              <span>Zacznij od Zapytaj behawiorystę</span>
              <span className="notatnik-btn-arrow" aria-hidden="true">
                &rarr;
              </span>
            </Link>
          </div>
        </aside>
      </div>
    </article>
  )
}
