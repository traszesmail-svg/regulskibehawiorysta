import type { Metadata } from 'next'
import Link from 'next/link'
import { TrustSignalSection } from '@/components/TrustSignalSection'
import { NotatnikPageShell, PUBLIC_SITE_NAV_ITEMS } from '@/components/NotatnikA'
import { buildBookHref } from '@/lib/booking-routing'
import { getLeadMagnetBySlug } from '@/lib/active-lead-magnets'
import { getCanonicalPublicHref } from '@/lib/public-routes'
import { buildTechnicalMetadata } from '@/lib/seo'
import { TRUST_SIGNAL_SETS } from '@/lib/trust-layer'

export const metadata: Metadata = buildTechnicalMetadata({
  title: 'Dziękuję za zapis',
  path: '/bezplatne-materialy/dziekuje',
  description: 'Techniczna strona potwierdzenia po zapisie na bezpłatny materiał.',
})

export default async function LeadMagnetThankYouPage(
  props: {
    searchParams?: Promise<Record<string, string | string[] | undefined>>
  }
) {
  const searchParams = await props.searchParams;
  const rawSlug = searchParams?.leadMagnet
  const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug
  const magnet = slug ? getLeadMagnetBySlug(slug) : null
  const audioHref = buildBookHref(null, 'szybka-konsultacja-15-min')

  return (
    <NotatnikPageShell
      tag="Materiał pobrany"
      navItems={PUBLIC_SITE_NAV_ITEMS}
      ctaHref={audioHref}
      ctaLabel="Kwadrans"
      footerPrimaryHref={audioHref}
      footerPrimaryLabel="15-minutowa konsultacja behawioralna"
      sideVisualVariant="materials"
    >
      <div className="container editorial-stack">

        <section className="editorial-hero-shell premium-hero-shell">
          <div className="editorial-hero-grid">
            <div className="editorial-hero-copy">
              <div className="section-eyebrow">Dziękuję</div>
              <h1>{magnet?.thankYouTitle ?? 'Zapis jest przyjęty'}</h1>
              <p className="editorial-hero-lead">{magnet?.thankYouBody ?? 'Możesz wrócić do strony i wybrać kolejny krok.'}</p>
              {magnet ? <p className="muted">{magnet.thankYouHint}</p> : null}

              <div className="hero-actions editorial-hero-actions">
                {magnet ? (
                  <a href={`/api/lead-magnet/${magnet.slug}`} className="button button-primary big-button">
                    Pobierz materiał teraz
                  </a>
                ) : null}
                <Link href={audioHref} prefetch={false} className="button button-ghost big-button">
                  Umów spokojny pierwszy krok
                </Link>
              </div>

              {magnet ? (
                <p className="muted top-gap-small">
                  {magnet.nextStepCopy}{' '}
                  <Link href={getCanonicalPublicHref(magnet.nextStepHref)} prefetch={false} className="prep-inline-link">
                    Przejdź dalej
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
                title: 'Pobierz i przejrzyj materiał spokojnie',
                copy: 'Nie musisz od razu rezerwować rozmowy. Najpierw zobacz, czy materiał porządkuje temat i daje Ci pierwszy konkretny punkt zaczepienia.',
              },
              {
                title: 'Wróć do właściwej strony tematycznej',
                copy: `Jeśli chcesz przejść szerzej przez temat, wróć do strony ${magnet.categoryLabel.toLowerCase()} albo do powiązanego landingu.`,
                href: getCanonicalPublicHref(magnet.categoryHref),
                cta: `Przejdź do: ${magnet.categoryLabel}`,
              },
              {
                title: 'Jeśli temat zostaje chaotyczny, przejdź do rozmowy',
                copy: '15-minutowa konsultacja behawioralna pozostaje najprostszym sposobem na ustawienie priorytetu, gdy sam materiał nie wystarcza.',
              },
            ]}
          />
        ) : null}

        <TrustSignalSection
          eyebrow="Po pobraniu"
          title="Materiał pomaga uporządkować temat przed rozmową"
          description="Jeśli po lekturze nadal potrzebujesz odniesienia do swojej sytuacji, najprostszym kolejnym krokiem jest 15-minutowa konsultacja behawioralna."
          items={TRUST_SIGNAL_SETS.toolkit}
        />

      </div>
    </NotatnikPageShell>
  )
}

