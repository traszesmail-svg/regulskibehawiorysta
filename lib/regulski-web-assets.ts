export const REGULSKI_WEB_LOGO = '/branding/regulski-web/logos/logo-regulski.png'
export const REGULSKI_WEB_BADGE_LOGO = '/branding/regulski-web/logos/favicon-180.png'

export const REGULSKI_WEB_HERO = {
  home: '/branding/regulski-web/hero/hero-home.webp',
  dogs: '/branding/regulski-web/hero/hero-dogs.webp',
  cats: '/branding/regulski-web/hero/hero-cats.webp',
  materialy: '/branding/regulski-web/hero/hero-materialy.webp',
  materiały: '/branding/regulski-web/hero/hero-materialy.webp',
  cennik: '/branding/regulski-web/hero/hero-cennik.webp',
  faq: '/branding/regulski-web/hero/hero-faq.webp',
  blog: '/branding/regulski-web/hero/hero-blog.webp',
  kontakt: '/branding/regulski-web/hero/hero-kontakt.webp',
} as const

export type RegulskiWebHeroVariant = keyof typeof REGULSKI_WEB_HERO

export const REGULSKI_WEB_TILE = {
  dog: '/branding/regulski-web/tiles/tile-dog.webp',
  cat: '/branding/regulski-web/tiles/tile-cat.webp',
  oferta: '/branding/regulski-web/tiles/tile-oferta.webp',
  oMnie: '/branding/regulski-web/tiles/tile-o-mnie.webp',
  opinie: '/branding/regulski-web/tiles/tile-opinie.webp',
} as const
