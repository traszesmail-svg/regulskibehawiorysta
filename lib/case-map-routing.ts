export type CaseMapSearchParams = Record<string, string | string[] | undefined>

export const CASE_MAP_MARKETING_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'] as const
const CASE_MAP_FORWARD_KEYS = ['problem', ...CASE_MAP_MARKETING_KEYS] as const

export function getSingleCaseMapSearchParam(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? ''
}

export function getCaseMapMarketingParams(searchParams?: CaseMapSearchParams): Record<string, string> {
  const params: Record<string, string> = {}
  for (const key of CASE_MAP_MARKETING_KEYS) {
    const value = getSingleCaseMapSearchParam(searchParams?.[key])
    if (value && value.length <= 120) params[key] = value
  }
  return params
}

export function buildCaseMapHref(searchParams?: CaseMapSearchParams) {
  const params = new URLSearchParams()
  for (const key of CASE_MAP_FORWARD_KEYS) {
    const value = getSingleCaseMapSearchParam(searchParams?.[key])
    const limit = key === 'problem' ? 96 : 120
    if (value && value.length <= limit) params.set(key, value)
  }
  const query = params.toString()
  return query ? `/mapa-sprawy?${query}` : '/mapa-sprawy'
}

export function getCaseMapSource(marketingParams: Record<string, string>, hasProblemContext: boolean) {
  const source = marketingParams.utm_source?.toLowerCase() ?? ''
  if (source.includes('instagram') || source === 'ig') return 'instagram' as const
  return hasProblemContext ? 'problem_page' as const : 'direct' as const
}
