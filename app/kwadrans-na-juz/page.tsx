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
import { PUBLIC_OFFER_PRICE_LABELS } from '@/lib/public-offer-copy'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = buildMarketingMetadata({
  title: 'Kwadrans na już',
  path: '/kwadrans-na-juz',
  description: 'Pilny Kwadrans na już: wyślij zgłoszenie, a ja skontaktuję się w celu szybkiego ustalenia terminu.',
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
    'Prośba o pilny Kwadrans na już',
    'Imię:\nTelefon:\nGatunek (Pies/Kot):\nOpis sytuacji:\n',
  )
  
  const structuredData = [
    getBreadcrumbJsonLd([
      { name: 'Strona główna', path: '/' },
      { name: 'Kwadrans na już', path: '/kwadrans-na-juz' },
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
        <NotatnikTopbar tag="Kwadrans na już" navItems={PUBLIC_SITE_NAV_ITEMS} showUtilityLinks={false} />
        <ReferenceHeroLeaf />

        <section className="contact-reference-hero" aria-labelledby="urgent-title">
          <div className="contact-reference-hero-copy">
            <span className="reference-pill">Usługa pilna</span>
            <h1 id="urgent-title">
              Potrzebujesz szybkiej porady? Kwadrans na już.
            </h1>
            <p>
              Jeśli sprawa jest pilna i nie wymaga pełnej konsultacji, wypełnij poniższy formularz. 
              Dostanę powiadomienie e-mail i skontaktuję się z Tobą najszybciej jak to możliwe (często tego samego dnia), 
              proponując najbliższy dogodny termin połączenia telefonicznego.
            </p>
            <MobileFirstStepCta
              eyebrow="Pilny pierwszy krok"
              title="Wyślij zgłoszenie Kwadransa na już"
              copy="To ten sam 15-minutowy format co Kwadrans, ale z priorytetem terminu."
              meta={`${PUBLIC_OFFER_PRICE_LABELS.urgent} po ustaleniu realnej godziny.`}
              primaryHref="#formularz"
              primaryLabel="Wyślij zgłoszenie"
              secondaryHref="/cennik"
              secondaryLabel="Porównaj opcje"
            />
          </div>
        </section>

        <section className="contact-reference-form-section" id="formularz" aria-labelledby="urgent-form-title">
          <div className="contact-reference-section-head">
            <span className="contact-reference-heading-icon" aria-hidden="true">
              <MessageSquare size={26} strokeWidth={1.8} />
            </span>
            <div>
              <h2 id="urgent-form-title">Zgłoszenie Kwadransa na już</h2>
              <p>Podaj swoje dane i krótko opisz sytuację. Opcjonalnie podaj numer telefonu, abym mógł oddzwonić.</p>
            </div>
          </div>
          <div className="contact-reference-form-card">
            <noscript>
              <div className="info-box">
                Formularz działa także bez JavaScriptu. Po wysłaniu wrócisz do tej sekcji z potwierdzeniem albo komunikatem.
              </div>
            </noscript>
            <ContactLeadForm searchParams={mergedSearchParams} />
            <div className="contact-form-fallback">
              <Mail size={18} strokeWidth={1.8} aria-hidden="true" />
              <span>
                Możesz też napisać bezpośrednio:{' '}
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

