const INVALID_ENV_SENTINELS = new Set(['undefined', 'null', ''])

for (const envName of ['__NEXT_INCREMENTAL_CACHE_IPC_PORT', '__NEXT_INCREMENTAL_CACHE_IPC_KEY']) {
  const rawValue = process.env[envName]

  if (typeof rawValue === 'string' && INVALID_ENV_SENTINELS.has(rawValue.trim().toLowerCase())) {
    delete process.env[envName]
  }
}

/** @type {import('next').NextConfig} */
const blockSearchIndexing = process.env.VERCEL_ENV
  ? process.env.VERCEL_ENV !== 'production'
  : process.env.NODE_ENV !== 'production'

const requestedDistDir = process.env.NEXT_DIST_DIR?.trim()
const customDistDir =
  requestedDistDir && /^[a-zA-Z0-9._-]+$/.test(requestedDistDir) ? requestedDistDir : undefined

const securityHeaders = [
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'geolocation=(), interest-cohort=()',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'Content-Security-Policy',
    value: "frame-ancestors 'self'",
  },
]

const REMOVED_MATERIALY_SLUGS = [
  'kot-zyje-w-napieciu',
  'pies-ile-ruchu-potrzebuje',
  'kwadrans-podstawy-kota',
  'kwadrans-podstawy-psa',
  '30-zachowan',
  'pierwszy-tydzien-z-kotem',
  'pies-sam-w-domu',
  'konflikt-miedzy-kotami',
  'kot-boi-sie-kuwety',
  'kot-budzi-dom-po-nocy',
  'kot-chowa-sie-po-zmianach',
  'kot-gryzie-przy-glaskaniu',
  'koty-zabawa-czy-napiecie',
  'miauczenie-o-swicie',
  'pies-broni-zasobow',
  'pies-do-pracy-z-ludzmi',
  'pies-glupieje-na-smyczy',
  'pies-niszczy-w-domu',
  'pies-pogon-i-hamulce',
  'pies-szczeka-na-gosci',
  'szczeniak-gryzie-i-skacze',
  'szczeniak-wyciszanie',
]

const REMOVED_LEAD_MAGNET_SLUGS = [
  'pies-ile-ruchu-potrzebuje',
  'kot-zyje-w-napieciu',
  '30-zachowan',
  'pierwszy-tydzien-z-kotem',
  'pies-sam-w-domu',
]

const nextConfig = {
  ...(customDistDir ? { distDir: customDistDir } : {}),
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'plus.unsplash.com' },
      { protocol: 'https', hostname: 'images.pexels.com' },
      { protocol: 'https', hostname: 'magwet.pl' },
    ],
  },
  typedRoutes: false,
  outputFileTracingIncludes: {
    '/*': [
      './qa-reports/latest-report.md',
      './supabase/schema.sql',
      './supabase/migrations/**/*.sql',
    ],
  },
  experimental: {
    workerThreads: false,
    cpus: 1,
    webpackBuildWorker: false,
    optimizeCss: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  async redirects() {
    return [
      {
        source: '/termin',
        destination: '/book',
        statusCode: 301,
      },
      {
        source: '/booking',
        destination: '/book',
        statusCode: 301,
      },
      {
        source: '/behawiorysta-online-polska',
        destination: '/',
        statusCode: 301,
      },
      {
        source: '/konsultacja-behawioralna-online',
        destination: '/',
        statusCode: 301,
      },
      {
        source: '/psy',
        destination: '/problemy#pies',
        statusCode: 301,
      },
      {
        source: '/psy/:path*',
        destination: '/problemy#pies',
        statusCode: 301,
      },
      {
        source: '/koty',
        destination: '/problemy#kot',
        statusCode: 301,
      },
      {
        source: '/koty/:path*',
        destination: '/problemy#kot',
        statusCode: 301,
      },
      {
        source: '/od-czego-zaczac',
        destination: '/o-mnie',
        statusCode: 301,
      },
      {
        source: '/urgent',
        destination: '/wybor',
        statusCode: 301,
      },
      {
        source: '/produkt',
        destination: '/materialy',
        statusCode: 301,
      },
      {
        source: '/niezbednik',
        destination: '/materialy',
        statusCode: 301,
      },
      {
        source: '/oferta',
        destination: '/cennik',
        statusCode: 301,
      },
      {
        source: '/oferta/:path*',
        destination: '/cennik',
        statusCode: 301,
      },
      {
        source: '/jak-sie-przygotowac',
        destination: '/faq',
        statusCode: 301,
      },
      {
        source: '/jak-sie-przygotowac/:slug',
        destination: '/faq',
        statusCode: 301,
      },
      {
        source: '/historie',
        destination: '/opinie',
        statusCode: 301,
      },
      {
        source: '/historie/:slug',
        destination: '/opinie',
        statusCode: 301,
      },
      {
        source: '/rezerwacja/:id',
        destination: '/wybor',
        statusCode: 301,
      },
      {
        source: '/materialy/pakiet/:slug',
        destination: '/materialy',
        statusCode: 301,
      },
      ...REMOVED_MATERIALY_SLUGS.map((slug) => ({
        source: `/materialy/${slug}`,
        destination: '/materialy',
        statusCode: 301,
      })),
      ...REMOVED_LEAD_MAGNET_SLUGS.map((slug) => ({
        source: `/bezplatne-materialy/${slug}`,
        destination: '/materialy',
        statusCode: 301,
      })),
      {
        source: '/przybornik',
        destination: '/materialy',
        statusCode: 301,
      },
      {
        source: '/metodyka',
        destination: '/o-mnie',
        statusCode: 301,
      },
      {
        source: '/blog/prog-pobudzenia-u-psa',
        destination: '/blog',
        statusCode: 301,
      },
      {
        source: '/blog/pies-cignnie-na-smyczy',
        destination: '/blog',
        statusCode: 301,
      },
      {
        source: '/blog/pies-cignnie-na-smyczy-od-czego-zaczac',
        destination: '/blog',
        statusCode: 301,
      },
      {
        source: '/oferta/konsultacja-behawioralna-online',
        destination: '/',
        statusCode: 301,
      },
      {
        source: '/behawiorysta-psow',
        destination: '/',
        statusCode: 301,
      },
      {
        source: '/behawiorysta-kotow',
        destination: '/',
        statusCode: 301,
      },
      {
        source: '/oferta/poradniki-pdf',
        destination: '/materialy',
        statusCode: 301,
      },
      {
        source: '/oferta/poradniki-pdf/pies_zostaje_sam_i_wpada_w_panike_v2',
        destination: '/materialy',
        statusCode: 301,
      },
      {
        source: '/oferta/poradniki-pdf/pies_szczeka_na_gosci_i_dzwonek_v2',
        destination: '/materialy',
        statusCode: 301,
      },
      {
        source: '/oferta/poradniki-pdf/dlaczego_pies_glupieje_na_smyczy_v2',
        destination: '/materialy',
        statusCode: 301,
      },
      {
        source: '/oferta/poradniki-pdf/trudny_spacer_v2',
        destination: '/materialy',
        statusCode: 301,
      },
      {
        source: '/oferta/poradniki-pdf/czy_twoj_pies_naprawde_potrzebuje_wiecej_ruchu_v2',
        destination: '/materialy',
        statusCode: 301,
      },
      {
        source: '/oferta/poradniki-pdf/szczeniak_gryzie_i_skacze_v2',
        destination: '/materialy',
        statusCode: 301,
      },
      {
        source: '/oferta/poradniki-pdf/szczeniak_nie_umie_sie_wyciszyc_v2',
        destination: '/materialy',
        statusCode: 301,
      },
      {
        source: '/oferta/poradniki-pdf/pies_niszczy_w_domu_v2',
        destination: '/materialy',
        statusCode: 301,
      },
      {
        source: '/oferta/poradniki-pdf/pies_broni_zasobow_v2',
        destination: '/materialy',
        statusCode: 301,
      },
      {
        source: '/oferta/poradniki-pdf/pogon_demolka_i_brak_hamulcow_v2',
        destination: '/materialy',
        statusCode: 301,
      },
      {
        source: '/oferta/poradniki-pdf/pies_do_pracy_z_ludzmi_v2',
        destination: '/materialy',
        statusCode: 301,
      },
      {
        source: '/oferta/poradniki-pdf/szczeniak-pierwsze-30-dni',
        destination: '/materialy',
        statusCode: 301,
      },
      {
        source: '/oferta/poradniki-pdf/kot-stres-srodowisko-i-bledy-opiekuna',
        destination: '/materialy',
        statusCode: 301,
      },
      {
        source: '/oferta/poradniki-pdf/pakiety/pakiet-kota-domowego',
        destination: '/materialy',
        statusCode: 301,
      },
    ]
  },
  async headers() {
    const headers = [...securityHeaders]

    if (blockSearchIndexing) {
      headers.push({
        key: 'X-Robots-Tag',
        value: 'noindex, follow, noarchive',
      })
    }

    return [
      {
        source: '/:path*',
        headers,
      },
    ]
  },
}

export default nextConfig
