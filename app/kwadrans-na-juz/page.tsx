import type { Metadata } from 'next'
import { Mail, MessageSquare, Phone } from 'lucide-react'
import { ContactLeadForm } from '@/components/ContactLeadForm'
import { MobileFirstStepCta } from '@/components/MobileFirstStepCta'
import { NotatnikFooter, NotatnikTopbar, PUBLIC_SITE_NAV_ITEMS } from '@/components/NotatnikA'
import { ReferenceHeroLeaf } from '@/components/ReferencePageShell'
import { Schema } from '@/components/schema'
import { getBreadcrumbJsonLd } from '@/lib/schema'
import { buildMarketingMetadata } from '@/lib/seo'
import { buildMailtoHref, getPublicContactDetails } from '@/lib/site'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = buildMarketingMetadata({
  title: 'Kwadrans na juĹĽ',
  path: '/kwadrans-na-juz',
  description: 'Pilny Kwadrans na juĹĽ: wyĹ›lij zgĹ‚oszenie, a ja skontaktujÄ™ siÄ™ w celu szybkiego ustalenia terminu.',
})

export default function KwadransNaJuzPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const contact = getPublicContactDetails()
  const email = contact.email ?? 'kontakt@regulskibehawiorysta.pl'
  const fallbackMailHref = buildMailtoHref(
    email,
    'ProĹ›ba o pilny Kwadrans na juĹĽ',
    'ImiÄ™:\nTelefon:\nGatunek (Pies/Kot):\nOpis sytuacji:\n',
  )
  
  const structuredData = [
    getBreadcrumbJsonLd([
      { name: 'Strona gĹ‚Ăłwna', path: '/' },
      { name: 'Kwadrans na juĹĽ', path: '/kwadrans-na-juz' },
    ]),
  ]

  // We merge/override searchParams to enforce service=kwadrans-na-juz
  const mergedSearchParams = {
    ...searchParams,
    service: 'kwadrans-na-juz',
  }

  return (
    <main className="notatnik-page contact-page contact-page-redesign contact-page-reference">
      <Schema data={structuredData} />
      <div className="notatnik-shell contact-shell">
        <NotatnikTopbar tag="Kwadrans na juĹĽ" navItems={PUBLIC_SITE_NAV_ITEMS} showUtilityLinks={false} />
        <ReferenceHeroLeaf />

        <section className="contact-reference-hero" aria-labelledby="urgent-title">
          <div className="contact-reference-hero-copy">
            <span className="reference-pill">UsĹ‚uga pilna</span>
            <h1 id="urgent-title">
              Potrzebujesz szybkiej porady? Kwadrans na juĹĽ.
            </h1>
            <p>
              JeĹ›li sprawa jest pilna i nie wymaga peĹ‚nej konsultacji, wypeĹ‚nij poniĹĽszy formularz. 
              DostanÄ™ powiadomienie e-mail i skontaktujÄ™ siÄ™ z TobÄ… najszybciej jak to moĹĽliwe (czÄ™sto tego samego dnia), 
              proponujÄ…c najbliĹĽszy dogodny termin rozmowy telefonicznej lub wideo.
            </p>
            <MobileFirstStepCta
              eyebrow="Pilny pierwszy krok"
              title="WyĹ›lij zgĹ‚oszenie Kwadransa na juĹĽ"
              copy="To ten sam 15-minutowy format co Kwadrans, ale z priorytetem terminu."
              meta="99 zĹ‚ po ustaleniu realnej godziny."
              primaryHref="#formularz"
              primaryLabel="WyĹ›lij zgĹ‚oszenie"
              secondaryHref="/cennik"
              secondaryLabel="PorĂłwnaj opcje"
            />
          </div>
        </section>

        <section className="contact-reference-form-section" id="formularz" aria-labelledby="urgent-form-title">
          <div className="contact-reference-section-head">
            <span className="contact-reference-heading-icon" aria-hidden="true">
              <MessageSquare size={26} strokeWidth={1.8} />
            </span>
            <div>
              <h2 id="urgent-form-title">ZgĹ‚oszenie Kwadransa na juĹĽ</h2>
              <p>Podaj swoje dane i krĂłtko opisz sytuacjÄ™. Opcjonalnie podaj numer telefonu, abym mĂłgĹ‚ oddzwoniÄ‡.</p>
            </div>
          </div>
          <div className="contact-reference-form-card">
            <noscript>
              <div className="info-box">
                Formularz dziaĹ‚a takĹĽe bez JavaScriptu. Po wysĹ‚aniu wrĂłcisz do tej sekcji z potwierdzeniem albo komunikatem.
              </div>
            </noscript>
            <ContactLeadForm searchParams={mergedSearchParams} />
            <div className="contact-form-fallback">
              <Mail size={18} strokeWidth={1.8} aria-hidden="true" />
              <span>
                MoĹĽesz teĹĽ napisaÄ‡ bezpoĹ›rednio:{' '}
                <a href={fallbackMailHref} className="contact-fallback-email">{email}</a>
              </span>
            </div>
          </div>
        </section>

        <NotatnikFooter showReviews={false} />
      </div>
    </main>
  )
}

