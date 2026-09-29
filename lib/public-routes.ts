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
  if (value === '/cennik') return '/zapytaj'
  if (value === '/cennik/pelny') return '/konsultacja'
  if (value === '/kwadrans-na-juz' || value === '/kwadrans-na-juz/start') return '/zapytaj'
  if (value === '/newsletter' || value === '/niezbednik' || value === '/przybornik' || value === '/zamow-pdf') {
    return '/materialy'
  }
  if (value === '/metodyka') return '/o-mnie'
  if (value === '/termin' || value.startsWith('/termin?')) {
    const queryIndex = value.indexOf('?')
    return queryIndex < 0 ? '/zapytaj' : `/zapytaj${value.slice(queryIndex)}`
  }
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
