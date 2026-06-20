import React from 'react'
import { existsSync } from 'node:fs'
import path from 'node:path'
import Image from 'next/image'
import Link from 'next/link'
import { AddTestimonialForm } from '@/components/AddTestimonialForm'
import { FUNNEL_CTA_LABELS } from '@/lib/funnel'
import { MEDIA_MENTIONS } from '@/lib/site'
import { REAL_CASE_STUDIES, getRealCaseProofPills, type RealCaseStudy } from '@/lib/real-case-studies'
import {
  TESTIMONIALS,
  getTestimonialDisplayName,
  getTestimonialIssueLabel,
  getTestimonialServiceLabel,
  getTestimonialSubjectLine,
} from '@/lib/testimonials'

function getInitials(displayName: string): string {
  return displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function shouldRenderLocalPhoto(photo?: string | null): photo is string {
  return typeof photo === 'string' && photo.startsWith('/')
}

function resolveCaseImageSrc(imageSrc: string, remoteSrc?: string): string {
  const localPath = path.join(process.cwd(), 'public', imageSrc.replace(/^\//, ''))
  return existsSync(localPath) ? imageSrc : remoteSrc ?? imageSrc
}

const CASE_IMAGE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  '/branding/case-studies/Border_Collie.jpg': { width: 600, height: 775 },
  '/branding/topic-cards/french-bulldog-leash.jpg': { width: 1400, height: 1050 },
  '/branding/topic-cards/dog-window-alone.jpg': { width: 1400, height: 1050 },
  '/images/cutover/dog-separation.png': { width: 1024, height: 1536 },
  '/branding/case-studies/labrador_luksi01.jpg': { width: 1024, height: 768 },
  '/branding/topic-cards/dog-resting-home.jpg': { width: 1200, height: 900 },
  '/images/cutover/dog-puppy-home.png': { width: 1024, height: 1536 },
  '/branding/case-cat-sofa.jpg': { width: 1200, height: 900 },
  '/branding/topic-cards/cats/cat-litter-box.jpg': { width: 1200, height: 900 },
  '/branding/topic-cards/cats/cat-intercat-conflict.jpg': { width: 1200, height: 900 },
  '/branding/case-cat-snow.jpg': { width: 1200, height: 900 },
  '/branding/topic-cards/cats/cat-anxious-hiding.jpg': { width: 384, height: 256 },
  '/branding/case-cat-scratcher.jpg': { width: 1200, height: 900 },
  '/branding/topic-cards/cats/cat-night-meowing.jpg': { width: 1400, height: 1050 },
} as const

function getCaseImageDimensions(imageSrc: string) {
  return CASE_IMAGE_DIMENSIONS[imageSrc] ?? { width: 1200, height: 900 }
}

function CaseCard({ caseStudy }: { caseStudy: RealCaseStudy }) {
  const proofPills = getRealCaseProofPills(caseStudy)

  return (
    <article className="real-case-card tree-backed-card" data-case-id={caseStudy.id}>
      <div className="real-case-gallery" aria-label={`${caseStudy.headline} - zdjęcia`}>
        {caseStudy.images.map((image, index) => {
          const dimensions = getCaseImageDimensions(image.src)

          return (
            <figure key={`${caseStudy.id}-${index}`} className="real-case-gallery-item">
              <Image
                src={resolveCaseImageSrc(image.src, image.remoteSrc)}
                alt={image.alt}
                width={dimensions.width}
                height={dimensions.height}
                sizes="(max-width: 680px) 100vw, (max-width: 1024px) 50vw, 32vw"
                loading="lazy"
                className="real-case-gallery-image"
              />
            </figure>
          )
        })}
      </div>

      <div className="real-case-copy">
        <div className="section-eyebrow">{caseStudy.eyebrow}</div>
        <h3>{caseStudy.headline}</h3>
        <p>{caseStudy.summary}</p>

        <div className="real-case-meta" aria-label={`Kontekst przypadku ${caseStudy.headline}`}>
          {proofPills.map((pill) => (
            <span key={`${caseStudy.id}-${pill}`}>{pill}</span>
          ))}
        </div>

        <div className="real-case-detail">
          <strong>{caseStudy.firstStepLabel}</strong>
          <span>{caseStudy.firstStepText}</span>
        </div>

        <div className="real-case-next">
          <strong>{caseStudy.nextStepLabel}</strong>
          <span>{caseStudy.nextStepText}</span>
        </div>

        <div className="real-case-next">
          <strong>Źródło i efekt</strong>
          <span>
            {caseStudy.proof.sourceContext}. Efekt pierwszego etapu: {caseStudy.proof.outcomeSnapshot}.
          </span>
        </div>

        <div className="real-case-meta" aria-label="Meta przypadku">
          <span>{caseStudy.species}</span>
          <span>{caseStudy.breed}</span>
          <span>{caseStudy.age}</span>
        </div>
      </div>
    </article>
  )
}

type SocialProofSectionProps = {
  showSubmissionForm?: boolean
}

export function SocialProofSection({ showSubmissionForm = true }: SocialProofSectionProps) {
  const hasTestimonials = TESTIMONIALS.length > 0

  return (
    <section className="panel section-panel" id="historie" aria-labelledby="historie-heading">
      <div className="section-head">
        <div>
          <div className="section-eyebrow">Opinie i realne przypadki</div>
          <h2 id="historie-heading">Historie opiekunów i efekty konsultacji</h2>
        </div>
        <div className="muted">
          Pokazujemy krótki kontekst, typ problemu, format pracy i pierwszy kierunek działania.
          <br />
          Obok są publikacje i krótkie informacje o profilu.
        </div>
      </div>

      <div className="summary-grid trust-grid top-gap">
        <div className="summary-card tree-backed-card">
          <div className="stat-label">Typowe starty</div>
          <span>Najczęstsze sprawy z opisanym formatem pracy, etapem i przybliżonym czasem.</span>
        </div>
        <div className="summary-card tree-backed-card">
          <div className="stat-label">Profil i publikacje</div>
          <span>Obok przykładów są też podstawowe informacje o kwalifikacjach i artykułach.</span>
        </div>
        <div className="summary-card tree-backed-card">
          <div className="stat-label">Ręczne sprawdzenie</div>
          <span>Nic nie trafia na stronę automatycznie.</span>
        </div>
      </div>

      <div className="real-case-grid top-gap">
        {REAL_CASE_STUDIES.map((caseStudy) => (
          <CaseCard key={caseStudy.id} caseStudy={caseStudy} />
        ))}
      </div>

      <div className="section-head top-gap">
        <div>
          <div className="section-eyebrow">Profil i publikacje</div>
          <h3>Dodatkowe informacje</h3>
        </div>
        <div className="muted">CAPBT, Instagram i publikacje branżowe pokazują dodatkowy kontekst pracy.</div>
      </div>

      <div className="media-grid top-gap">
        {MEDIA_MENTIONS.map((mention) => (
          <article key={mention.id} className="media-card">
            <div className="section-eyebrow">{mention.label}</div>
            <h3>{mention.title}</h3>
            <p>{mention.summary}</p>
            <div className="offer-card-actions">
              <a href={mention.href} target="_blank" rel="noopener noreferrer" className="button button-ghost small-button">
                {mention.cta}
              </a>
            </div>
          </article>
        ))}
      </div>

      {hasTestimonials ? (
        <>
          <div className="section-head top-gap">
            <div>
              <div className="section-eyebrow">Wybrane opinie</div>
              <h3>Krótkie opinie klientów</h3>
            </div>
            <div className="muted">Opinie są dodawane dopiero po wcześniejszym sprawdzeniu zgody.</div>
          </div>

          <div className="summary-grid top-gap">
            {TESTIMONIALS.map((testimonial) => {
              const displayName = getTestimonialDisplayName(testimonial)
              const subjectLine = getTestimonialSubjectLine(testimonial)

              return (
                <article key={testimonial.id} className="summary-card tree-backed-card">
                  <div className="testimonial-head">
                    {shouldRenderLocalPhoto(testimonial.photo) ? (
                      <div className="testimonial-avatar" aria-hidden="true">
                        <Image
                          src={testimonial.photo}
                          alt={`Zdjecie powiazane z opinia ${displayName}`}
                          width={72}
                          height={72}
                          sizes="72px"
                          className="testimonial-photo"
                        />
                      </div>
                    ) : (
                      <div className="testimonial-avatar" aria-hidden="true">
                        {getInitials(displayName)}
                      </div>
                    )}

                    <div className="testimonial-meta">
                      <strong>{displayName}</strong>
                      <span>{getTestimonialIssueLabel(testimonial.category)}</span>
                      <span>{getTestimonialServiceLabel(testimonial.service)}</span>
                      {subjectLine ? <span>{subjectLine}</span> : null}
                    </div>
                  </div>
                  <strong>{testimonial.quote}</strong>
                  {!testimonial.consent ? <span>Dane szczegółowe zostaną uzupełnione po osobnej zgodzie na publikację.</span> : null}
                </article>
              )
            })}
          </div>
        </>
      ) : (
        <div className="real-case-empty top-gap">
          <strong>Wybrane opinie pojawią się po ręcznej akceptacji.</strong>
          <p>
            Na ten moment pokazujemy przede wszystkim realne przypadki, publiczne profile i publikacje. Dzięki temu sekcja nie opiera się na
            pustych deklaracjach.
          </p>
        </div>
      )}

      <div className="info-box top-gap">Opinie i dane kontaktowe z formularza są sprawdzane ręcznie. Nic nie trafia na stronę automatycznie.</div>

      {showSubmissionForm ? (
        <div className="top-gap">
          <AddTestimonialForm />
        </div>
      ) : (
        <div className="offer-detail-cta-band top-gap">
          <div className="offer-detail-cta-copy">
            <span className="section-eyebrow">Dalszy krok</span>
            <strong>Chcesz zobaczyć pełną sekcję opinii?</strong>
            <span>Jeśli wolisz spokojniejszy start, możesz wybrać 15-minutową konsultację behawioralną albo materiały PDF.</span>
            <span>Pełny formularz publikacji i dodatkowe wskazówki są na osobnej podstronie.</span>
          </div>

          <div className="hero-actions offer-detail-actions">
            <Link href="/opinie" prefetch={false} className="button button-primary big-button">
              Zobacz pełną sekcję opinii
            </Link>
            <Link href="/book" prefetch={false} className="button button-ghost big-button">
              {FUNNEL_CTA_LABELS.primary}
            </Link>
            <Link href="/materialy" prefetch={false} className="button button-ghost big-button">
              {FUNNEL_CTA_LABELS.secondary}
            </Link>
          </div>
        </div>
      )}
    </section>
  )
}
