export type InstagramProblemRoute = {
  id: string
  postTopic: string
  problemKey: string
  href: string
  publicHref: string
  label: string
}

const IG_CAMPAIGN = 'trend_radar'

function withInstagramUtm(path: string, content: string) {
  const params = new URLSearchParams({
    utm_source: 'instagram',
    utm_medium: 'social',
    utm_campaign: IG_CAMPAIGN,
    utm_content: content,
  })

  return `${path}?${params.toString()}`
}

export const INSTAGRAM_PROBLEM_ROUTES: InstagramProblemRoute[] = [
  {
    id: 'ig-pies-szczeka-na-psy',
    postTopic: 'Post o psie szczekającym na psy',
    problemKey: 'pies-szczeka-na-psy',
    publicHref: '/problemy/pies-szczeka-na-psy',
    href: withInstagramUtm('/problemy/pies-szczeka-na-psy', 'pies-szczeka-na-psy'),
    label: 'Pies szczeka na psy',
  },
  {
    id: 'ig-pies-ciagnie-na-smyczy',
    postTopic: 'Post o ciągnięciu na smyczy',
    problemKey: 'pies-ciagnie-na-smyczy',
    publicHref: '/problemy/pies-ciagnie-na-smyczy',
    href: withInstagramUtm('/problemy/pies-ciagnie-na-smyczy', 'pies-ciagnie-na-smyczy'),
    label: 'Pies ciągnie na smyczy',
  },
  {
    id: 'ig-pies-nie-zostaje-sam',
    postTopic: 'Post o psie, który nie zostaje sam',
    problemKey: 'pies-nie-zostaje-sam',
    publicHref: '/problemy/pies-nie-zostaje-sam',
    href: withInstagramUtm('/problemy/pies-nie-zostaje-sam', 'pies-nie-zostaje-sam'),
    label: 'Pies nie zostaje sam',
  },
  {
    id: 'ig-kot-sika-poza-kuweta',
    postTopic: 'Post o sikaniu poza kuwetą',
    problemKey: 'kot-sika-poza-kuweta',
    publicHref: '/problemy/kot-sika-poza-kuweta',
    href: withInstagramUtm('/problemy/kot-sika-poza-kuweta', 'kot-sika-poza-kuweta'),
    label: 'Kot sika poza kuwetą',
  },
  {
    id: 'ig-kot-gryzie-przy-glaskaniu',
    postTopic: 'Post o gryzieniu przy głaskaniu',
    problemKey: 'kot-gryzie-przy-glaskaniu',
    publicHref: '/problemy/kot-gryzie-przy-glaskaniu',
    href: withInstagramUtm('/problemy/kot-gryzie-przy-glaskaniu', 'kot-gryzie-przy-glaskaniu'),
    label: 'Kot gryzie przy głaskaniu',
  },
  {
    id: 'ig-konflikt-miedzy-kotami',
    postTopic: 'Post o napięciu między kotami',
    problemKey: 'konflikt-miedzy-kotami',
    publicHref: '/problemy/konflikt-miedzy-kotami',
    href: withInstagramUtm('/problemy/konflikt-miedzy-kotami', 'konflikt-miedzy-kotami'),
    label: 'Konflikt między kotami',
  },
  {
    id: 'ig-nie-wiem-od-czego-zaczac',
    postTopic: 'Post ogólny: nie wiem, od czego zacząć',
    problemKey: 'nie-wiem-od-czego-zaczac',
    publicHref: '/mapa-sprawy',
    href: withInstagramUtm('/mapa-sprawy', 'nie-wiem-od-czego-zaczac'),
    label: 'Mapa zachowania',
  },
]
