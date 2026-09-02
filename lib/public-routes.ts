/**
 * Canonical destinations for legacy public paths. Redirects remain available
 * for old external URLs, but internal links should point here directly.
 */
export function getCanonicalPublicHref(href: string): string {
  const value = href.trim()

  if (value === '/behawiorysta-online-polska') return '/'
  if (value === '/konsultacja-behawioralna-online') return '/konsultacja'
  if (value === '/book' || value.startsWith('/book?')) return '/zapytaj'
  if (value === '/call' || value.startsWith('/call?')) return '/zapytaj'
  if (value === '/psy') return '/problemy#pies'
  if (value === '/koty') return '/problemy#kot'
  if (value === '/psy/reaktywnosc-na-smyczy') return '/problemy/pies-szczeka-na-psy'
  if (value === '/psy/lek-separacyjny') return '/problemy/pies-nie-zostaje-sam'
  if (value === '/koty/zalatwianie-poza-kuweta') return '/problemy/kot-sika-poza-kuweta'
  if (value === '/koty/konflikt-miedzy-kotami') return '/problemy/konflikt-miedzy-kotami'

  if (value.startsWith('/psy/')) return '/problemy#pies'
  if (value.startsWith('/koty/')) return '/problemy#kot'

  return value
}
