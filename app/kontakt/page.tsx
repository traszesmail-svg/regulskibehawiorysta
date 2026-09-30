import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Mail, MessageCircle, Plus } from 'lucide-react'
import { ContactLeadForm } from '@/components/ContactLeadForm'
import { NotatnikFinalCta, NotatnikFooter, NotatnikTopbar, PUBLIC_SITE_NAV_ITEMS } from '@/components/NotatnikA'
import { Schema } from '@/components/schema'
import { getBreadcrumbJsonLd, getFaqPageJsonLd } from '@/lib/schema'
import { buildMarketingMetadata } from '@/lib/seo'
import { PUBLIC_ZAPYTAJ_OFFER, formatPublicOfferPrice } from '@/lib/public-offer'
import { buildMailtoHref, getPublicContactDetails } from '@/lib/site'
import styles from './contact.module.css'

export const metadata: Metadata = buildMarketingMetadata({
  title: 'Kontakt — porozmawiajmy o Twoim zwierzęciu',
  path: '/kontakt',
  description: 'Masz pytanie o współpracę lub wybór konsultacji? Napisz do Krzysztofa Regulskiego. Osobisty kontakt, jasne zasady i spokojny pierwszy krok.',
})

const contactFaqItems = [
  {
    question: 'Nie wiem, którą formę pomocy wybrać. Co napisać?',
    answer: 'Napisz, czy chodzi o psa czy kota, co Cię niepokoi i od kiedy trwa sytuacja. Wystarczy kilka zdań — nie musisz znać nazwy problemu. Pomogę dobrać formę współpracy. Szczegółowe zalecenia omawiamy podczas płatnej rozmowy lub konsultacji.',
  },
  {
    question: 'Czy wysłanie formularza jest płatne?',
    answer: 'Nie. Pytanie o ofertę, wybór usługi lub sprawy organizacyjne jest bezpłatne. Wysłanie wiadomości nie rezerwuje terminu i nie zobowiązuje do zakupu.',
  },
  {
    question: 'Kiedy i w jaki sposób otrzymam odpowiedź?',
    answer: 'Odpowiadam na adres e-mail podany w formularzu, zazwyczaj w ciągu 24–48 godzin roboczych. Jeśli nie widzisz odpowiedzi, sprawdź również folder spam. Dostępne możliwości rozmowy telefonicznej znajdziesz na stronie „Zapytaj behawiorystę”.',
  },
  {
    question: 'Czy mogę przesłać nagrania zachowania?',
    answer: 'W pierwszej wiadomości wystarczy wspomnieć, że masz nagrania. Sposób ich przekazania ustalimy przy przygotowaniu do konsultacji. Nie musisz dołączać materiałów, żeby zapytać o współpracę.',
  },
]

export default async function ContactPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const searchParams = await props.searchParams
  const contact = getPublicContactDetails()
  const email = contact.email ?? 'kontakt@regulskibehawiorysta.pl'
  const mailHref = buildMailtoHref(email, 'Pytanie o współpracę — Regulski Behawiorysta')

  return (
    <main className={`notatnik-page contact-page contact-page-reference ${styles.page}`}>
      <Schema data={[
        getBreadcrumbJsonLd([{ name: 'Strona główna', path: '/' }, { name: 'Kontakt', path: '/kontakt' }]),
        getFaqPageJsonLd(contactFaqItems),
      ]} />
      <div className="notatnik-shell contact-shell">
        <NotatnikTopbar tag="Kontakt" navItems={PUBLIC_SITE_NAV_ITEMS} showUtilityLinks={false} ctaHref="/zapytaj" ctaLabel="Zapytaj behawiorystę" />
        <div className={styles.content}>
          <section className={styles.hero} aria-labelledby="contact-title">
            <div>
              <span className={styles.eyebrow}>Kontakt · Regulski Behawiorysta</span>
              <h1 id="contact-title" className={styles.title}>Dobry początek?<br /><em>Po prostu napisz.</em></h1>
              <p className={styles.intro}>Nie musisz wiedzieć, od czego zacząć. Opisz krótko, co dzieje się u Twojego psa lub kota — pomogę Ci wybrać odpowiednią formę wsparcia.</p>
              <div className={styles.actions}>
                <a href="#formularz" className={styles.primary}>Napisz wiadomość <ArrowRight size={17} aria-hidden="true" /></a>
                <a href={mailHref} className={styles.textLink}>Wolę e-mail <Mail size={15} aria-hidden="true" /></a>
              </div>
              <div className={styles.signature}>
                <span className={styles.signatureMark} aria-hidden="true">KR</span>
                <div><strong>Krzysztof Regulski</strong><span>Wiadomości czytam i odpowiadam osobiście.</span></div>
              </div>
            </div>
            <figure className={styles.art}>
              <Image src="/images/krzysztof-vet-action.jpg" alt="Krzysztof Regulski podczas pracy z pacjentem w gabinecie weterynaryjnym" width={1024} height={1536} priority sizes="(max-width: 760px) 90vw, 440px" />
              <figcaption><span>Krzysztof Regulski · technik weterynarii</span><span aria-hidden="true">01 / KONTAKT</span></figcaption>
            </figure>
          </section>
          <section className={styles.route} aria-label="Wybierz rodzaj kontaktu">
            <article>
              <Mail size={23} strokeWidth={1.4} aria-hidden="true" />
              <div><h2>Pytanie o współpracę</h2><p>Wybór usługi, przebieg spotkania lub sprawa organizacyjna. Napisz — kontakt jest bezpłatny.</p><a href="#formularz">Przejdź do formularza <ArrowRight size={14} aria-hidden="true" /></a></div>
            </article>
            <article>
              <MessageCircle size={23} strokeWidth={1.4} aria-hidden="true" />
              <div><h2>Chcesz omówić zachowanie?</h2><p>Zapytaj behawiorystę: rozmowa telefoniczna ({PUBLIC_ZAPYTAJ_OFFER.durationLabel.toLocaleLowerCase('pl-PL')}) i pierwszy kierunek działania. <strong>{formatPublicOfferPrice(PUBLIC_ZAPYTAJ_OFFER.pricePln)}.</strong></p><Link href="/zapytaj" prefetch={false}>Sprawdź możliwość rozmowy <ArrowRight size={14} aria-hidden="true" /></Link></div>
            </article>
          </section>
          <section className={styles.formSection} id="formularz" aria-labelledby="contact-form-title">
            <div className={styles.formIntro}>
              <span className={styles.eyebrow}>Twoja wiadomość</span>
              <h2 id="contact-form-title" className={styles.sectionTitle}>Kilka zdań.<br />Pierwszy krok bliżej.</h2>
              <p>Napisz, z czym się mierzysz lub o co chcesz zapytać. Jeśli nie wiesz, którą usługę wybrać, pomogę Ci to ustalić.</p>
              <dl className={styles.contactDetails}>
                <dt>Odpowiedź na Twój e-mail</dt><dd>Zazwyczaj w ciągu 24–48 godzin roboczych.</dd>
                <dt>Możesz też napisać bezpośrednio</dt><dd><a href={mailHref}>{email}</a></dd>
              </dl>
              <p className={styles.smallNote}>Wiadomość nie zobowiązuje do zakupu.<br />Termin spotkania rezerwujesz osobno.</p>
            </div>
            <div className={styles.formCard}>
              <noscript><p className="info-box">Po wysłaniu formularza wrócisz tutaj z potwierdzeniem lub informacją, co poprawić.</p></noscript>
              <ContactLeadForm searchParams={searchParams} />
              <p className={styles.formNote}>Bezpłatny kontakt w sprawie współpracy i organizacji spotkań.</p>
            </div>
          </section>
          <section className={styles.faq} aria-labelledby="contact-faq-title">
            <div><span className={styles.eyebrow}>Zanim napiszesz</span><h2 id="contact-faq-title" className={styles.sectionTitle}>Warto wiedzieć.</h2><Link href="/o-mnie" className={styles.textLink}>Poznaj mój sposób pracy <ArrowRight size={16} aria-hidden="true" /></Link></div>
            <div className={styles.faqList}>
              {contactFaqItems.map(item => <details key={item.question}><summary><span>{item.question}</span><Plus size={18} strokeWidth={1.5} aria-hidden="true" /></summary><p>{item.answer}</p></details>)}
            </div>
          </section>
          <NotatnikFinalCta
            title="Wolisz od razu omówić zachowanie?"
            copy="Możesz też sprawdzić dostępność krótkiej rozmowy telefonicznej."
            primaryHref="/zapytaj"
            primaryLabel="Zapytaj behawiorystę"
          />
        </div>
        <NotatnikFooter showReviews={false} />
      </div>
    </main>
  )
}
