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
