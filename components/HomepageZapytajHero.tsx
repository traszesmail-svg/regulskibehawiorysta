import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Clock3, PhoneCall, WalletCards } from 'lucide-react'
import { COAPE_POLSKA_LOGO, HOME_HERO_PHOTO, SPECIALIST_NAME, SPECIALIST_PUBLIC_STATUS } from '@/lib/site'
import { PUBLIC_ZAPYTAJ_OFFER, formatPublicOfferPrice } from '@/lib/public-offer'
import { HomepageAvailabilityStatus } from './HomepageAvailabilityStatus'

export function HomepageZapytajHero() {
  return (
    <section className="homepage-zapytaj-hero" aria-labelledby="homepage-zapytaj-title">
      <div className="homepage-zapytaj-copy">
        <span className="homepage-zapytaj-kicker">KRZYSZTOF REGULSKI · BEHAWIORYSTA PSÓW I KOTÓW</span>
        <h1 id="homepage-zapytaj-title">Martwi Cię zachowanie psa lub kota?</h1>
        <p className="homepage-zapytaj-lead">
          Opowiedz, co się dzieje. Podczas krótkiej rozmowy ustalimy pierwszy kierunek działania i to, czy potrzebna jest dalsza pomoc.
        </p>

        <div className="offer-facts" aria-label="Najważniejsze informacje">
          <div className="offer-fact">
            <span className="offer-fact__icon"><Clock3 aria-hidden="true" /></span>
            <span>Do 15 minut</span>
          </div>
          <div className="offer-fact">
            <span className="offer-fact__icon"><WalletCards aria-hidden="true" /></span>
            <span>79 zł</span>
          </div>
          <div className="offer-fact">
            <span className="offer-fact__icon"><PhoneCall aria-hidden="true" /></span>
            <span>Telefonicznie</span>
          </div>
        </div>

        <div className="homepage-hero-actions">
          <Link href="/zapytaj" prefetch={false} className="notatnik-btn homepage-zapytaj-primary">
            <span>Zapytaj behawiorystę — {formatPublicOfferPrice(PUBLIC_ZAPYTAJ_OFFER.pricePln)}</span>
            <ArrowRight size={17} strokeWidth={1.9} aria-hidden="true" />
          </Link>
          <Link href="/kontakt" prefetch={false} className="homepage-hero-contact-btn">
            Kontakt
          </Link>
        </div>

        <div className="homepage-hero-proof" aria-label="Kwalifikacje specjalisty">
          <div className="homepage-hero-proof-specialist">
            <div className="homepage-hero-proof-logo-wrap">
              <Image
                src={COAPE_POLSKA_LOGO.src}
                alt={COAPE_POLSKA_LOGO.alt}
                width={COAPE_POLSKA_LOGO.width}
                height={COAPE_POLSKA_LOGO.height}
                className="homepage-hero-proof-logo"
              />
            </div>
            <div className="homepage-hero-proof-copy">
              <strong className="homepage-hero-proof-name">{SPECIALIST_NAME}</strong>
              <div className="homepage-hero-proof-creds">
                <span>{SPECIALIST_PUBLIC_STATUS}</span>
                <span className="homepage-hero-proof-sep" aria-hidden="true">·</span>
                <span>technik weterynarii</span>
              </div>
            </div>
          </div>
          <p className="homepage-hero-proof-note">
            Rozmowa bez kamery
            <span className="homepage-hero-proof-dot" aria-hidden="true">·</span>
            <a href="#opinie" className="homepage-hero-proof-link">Zobacz opinie opiekunów</a>
          </p>
        </div>

        <HomepageAvailabilityStatus />
      </div>

      <div className="homepage-zapytaj-photo-wrap">
        <figure className="homepage-zapytaj-photo">
          <Image
            src={HOME_HERO_PHOTO.src}
            alt={HOME_HERO_PHOTO.alt}
            fill
            priority
            quality={86}
            sizes="(max-width: 760px) 100vw, 46vw"
            className="homepage-zapytaj-photo-image"
          />
        </figure>
      </div>
    </section>
  )
}
