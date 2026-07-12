import crypto from 'node:crypto'

const USER_KEY = process.env.ZADARMA_USER_KEY ?? ''
const SECRET_KEY = process.env.ZADARMA_SECRET_KEY ?? ''
const BASE_URL = 'https://api.zadarma.com'

function generateSignature(method: string, params: Record<string, string>, secretKey: string): string {
  const sortedKeys = Object.keys(params).sort()
  const sortedParams = sortedKeys.map(key => `${key}=${params[key]}`).join('&')
  const md5Hash = crypto.createHash('md5').update(sortedParams).digest('hex')
  const line = method + sortedParams + md5Hash
  return crypto.createHmac('sha1', secretKey).update(line).digest('base64')
}

async function callApi(method: string, params: Record<string, string> = {}, httpMethod = 'POST') {
  if (!USER_KEY || !SECRET_KEY) {
    console.warn('[ZADARMA] Missing ZADARMA_USER_KEY or ZADARMA_SECRET_KEY')
    return { error: 'Missing API credentials' }
  }

  // Stringify all parameters to ensure we sort and hash strings
  const stringParams: Record<string, string> = {}
  for (const key of Object.keys(params)) {
    stringParams[key] = String(params[key])
  }

  const signature = generateSignature(method, stringParams, SECRET_KEY)
  const sortedKeys = Object.keys(stringParams).sort()
  const sortedParams = sortedKeys.map(key => `${key}=${encodeURIComponent(stringParams[key])}`).join('&')

  const url = `${BASE_URL}${method}${httpMethod === 'GET' && sortedParams ? `?${sortedParams}` : ''}`
  const headers: Record<string, string> = {
    'Authorization': `${USER_KEY}:${signature}`
  }

  const options: RequestInit = {
    method: httpMethod,
    headers,
  }

  if (httpMethod === 'POST') {
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
    options.body = sortedParams
  }

  try {
    const res = await fetch(url, options)
    const data = await res.json()
    console.log('[ZADARMA] API response', method, data)
    return data
  } catch (error) {
    console.error('[ZADARMA] API error', method, error)
    return { error: String(error) }
  }
}

export async function triggerZadarmaCallback(from: string, to: string) {
  return callApi('/v1/request/callback/', { from, to })
}

export async function hangupZadarmaCall(callId: string) {
  // Hangup call command
  return callApi('/v1/pbx/hangup/', { call_id: callId })
}

export async function sendZadarmaSms(to: string, message: string) {
  return callApi('/v1/request/sms/', { to, message })
}
