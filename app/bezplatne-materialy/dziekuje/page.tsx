import type { Metadata } from 'next'
import Link from 'next/link'
import { TrustSignalSection } from '@/components/TrustSignalSection'
import { NotatnikPageShell, PUBLIC_SITE_NAV_ITEMS } from '@/components/NotatnikA'
import { buildBookHref } from '@/lib/booking-routing'
import { getLeadMagnetBySlug } from '@/lib/active-lead-magnets'
import { buildTechnicalMetadata } from '@/lib/seo'
import { TRUST_SIGNAL_SETS } from '@/lib/trust-layer'

export const metadata: Metadata = buildTechnicalMetadata({
  title: 'DziÄ™kujÄ™ za zapis',
  path: '/bezplatne-materialy/dziekuje',
  description: 'Techniczna strona potwierdzenia po zapisie na bezpĹ‚atny materiaĹ‚.',
})

export default function LeadMagnetThankYouPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const rawSlug = searchParams?.leadMagnet
  const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug
  const magnet = slug ? getLeadMagnetBySlug(slug) : null
  const audioHref = buildBookHref(null, 'szybka-konsultacja-15-min')

  return (
    <NotatnikPageShell
      tag="MateriaĹ‚ pobrany"
      navItems={PUBLIC_SITE_NAV_ITEMS}
      ctaHref={audioHref}
      ctaLabel="Kwadrans / 69 zĹ‚"
      footerPrimaryHref={audioHref}
      footerPrimaryLabel="15-minutowa konsultacja behawioralna"
      sideVisualVariant="materials"
    >
      <div className="container editorial-stack">

        <section className="editorial-hero-shell premium-hero-shell">
          <div className="editorial-hero-grid">
            <div className="editorial-hero-copy">
              <div className="section-eyebrow">DziÄ™kujÄ™</div>
              <h1>{magnet?.thankYouTitle ?? 'Zapis jest przyjÄ™ty'}</h1>
              <p className="editorial-hero-lead">{magnet?.thankYouBody ?? 'MoĹĽesz wrĂłciÄ‡ do strony i wybraÄ‡ kolejny krok.'}</p>
              {magnet ? <p className="muted">{magnet.thankYouHint}</p> : null}

              <div className="hero-actions editorial-hero-actions">
                {magnet ? (
                  <a href={`/api/lead-magnet/${magnet.slug}`} className="button button-primary big-button">
                    Pobierz materiaĹ‚ teraz
                  </a>
                ) : null}
                <Link href={audioHref} prefetch={false} className="button button-ghost big-button">
                  UmĂłw spokojny pierwszy krok
                </Link>
              </div>

              {magnet ? (
                <p className="muted top-gap-small">
                  {magnet.nextStepCopy}{' '}
                  <Link href={magnet.nextStepHref} prefetch={false} className="prep-inline-link">
                    PrzejdĹş dalej
                  </Link>
                  .
                </p>
              ) : null}
            </div>
          </div>
        </section>

        {magnet ? (
          <TrustSignalSection
            eyebrow="Co dalej po pobraniu"
            title={magnet.followUpTitle}
            description={magnet.followUpBody}
            items={[
              {
                title: 'Pobierz i przejrzyj materiaĹ‚ spokojnie',
                copy: 'Nie musisz od razu rezerwowaÄ‡ rozmowy. Najpierw zobacz, czy materiaĹ‚ porzÄ…dkuje temat i daje Ci pierwszy konkretny punkt zaczepienia.',
              },
              {
                title: 'WrĂłÄ‡ do wĹ‚aĹ›ciwej strony tematycznej',
                copy: `JeĹ›li chcesz przejĹ›Ä‡ szerzej przez temat, wrĂłÄ‡ do strony ${magnet.categoryLabel.toLowerCase()} albo do powiÄ…zanego landingu.`,
                href: magnet.categoryHref,
                cta: `PrzejdĹş do: ${magnet.categoryLabel}`,
              },
              {
                title: 'JeĹ›li temat zostaje chaotyczny, przejdĹş do rozmowy',
                copy: '15-minutowa konsultacja behawioralna pozostaje najprostszym sposobem na ustawienie priorytetu, gdy sam materiaĹ‚ nie wystarcza.',
              },
            ]}
          />
        ) : null}

        <TrustSignalSection
          eyebrow="Po pobraniu"
          title="MateriaĹ‚ pomaga uporzÄ…dkowaÄ‡ temat przed rozmowÄ…"
          description="JeĹ›li po lekturze nadal potrzebujesz odniesienia do swojej sytuacji, najprostszym kolejnym krokiem jest 15-minutowa konsultacja behawioralna."
          items={TRUST_SIGNAL_SETS.toolkit}
        />

      </div>
    </NotatnikPageShell>
  )
}

