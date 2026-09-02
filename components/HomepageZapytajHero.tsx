import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { HOME_HERO_PHOTO } from '@/lib/site'
import { PUBLIC_ZAPYTAJ_OFFER, formatPublicOfferPrice } from '@/lib/public-offer'
import { ZapytajAvailabilityStatus } from '@/components/ZapytajAvailabilityStatus'

export function HomepageZapytajHero() {
  return (
    <section className="homepage-zapytaj-hero" aria-labelledby="homepage-zapytaj-title">
      <div className="homepage-zapytaj-copy">
        <span className="homepage-zapytaj-kicker">PIERWSZY KROK DLA OPIEKUNA PSA LUB KOTA</span>
        <h1 id="homepage-zapytaj-title">
          Masz problem z zachowaniem psa lub kota? <em>Zapytaj behawiorystę.</em>
        </h1>
        <p className="homepage-zapytaj-lead">
          Opowiedz, co dzieje się z Twoim psem lub kotem. W krótkiej rozmowie uporządkujemy sytuację i ustalimy,
          co zrobić dalej — bez zgadywania i bez oceniania.
        </p>
        <div className="homepage-zapytaj-price" aria-label={`Cena ${PUBLIC_ZAPYTAJ_OFFER.name}`}>
          <span>
            <strong>{PUBLIC_ZAPYTAJ_OFFER.durationLabel} · {formatPublicOfferPrice(PUBLIC_ZAPYTAJ_OFFER.pricePln)}</strong>
            <small>Rozmowa telefoniczna na pierwszy, konkretny kierunek.</small>
          </span>
        </div>
        <ZapytajAvailabilityStatus />
        <div className="homepage-zapytaj-actions">
          <Link href="/zapytaj" prefetch={false} className="notatnik-btn homepage-zapytaj-primary">
            <span>Zapytaj behawiorystę — {formatPublicOfferPrice(PUBLIC_ZAPYTAJ_OFFER.pricePln)}</span>
            <ArrowRight size={17} strokeWidth={1.9} aria-hidden="true" />
          </Link>
          <Link href="/mapa-sprawy" prefetch={false} className="homepage-zapytaj-secondary">
            Nie wiesz, jak to nazwać? Otwórz Mapę zachowania
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
