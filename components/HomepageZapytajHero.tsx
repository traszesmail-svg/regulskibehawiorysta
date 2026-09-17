import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Clock3, PhoneCall, WalletCards } from 'lucide-react'
import { HOME_HERO_PHOTO } from '@/lib/site'
import { PUBLIC_ZAPYTAJ_OFFER, formatPublicOfferPrice } from '@/lib/public-offer'

export function HomepageZapytajHero() {
  return (
    <section className="homepage-zapytaj-hero" aria-labelledby="homepage-zapytaj-title">
      <div className="homepage-zapytaj-copy">
        <span className="homepage-zapytaj-kicker">KRZYSZTOF REGULSKI · BEHAWIORYSTA PSÓW I KOTÓW</span>
        <h1 id="homepage-zapytaj-title">Martwi Cię zachowanie psa lub kota?</h1>
        <p className="homepage-zapytaj-lead">
          Opowiedz, co się dzieje. Podczas krótkiej rozmowy ustalimy pierwszy krok i to, czy potrzebna jest dalsza pomoc.
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
        <div className="homepage-zapytaj-actions">
          <Link href="/zapytaj" prefetch={false} className="notatnik-btn homepage-zapytaj-primary">
            <span>Zapytaj behawiorystę — {formatPublicOfferPrice(PUBLIC_ZAPYTAJ_OFFER.pricePln)}</span>
            <ArrowRight size={17} strokeWidth={1.9} aria-hidden="true" />
          </Link>
        </div>
      </div>

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
    </section>
  )
}
