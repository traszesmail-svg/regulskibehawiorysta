import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getPublicAccountAuthFailure } from '@/lib/server/account-auth'

test('account authentication errors stay in clear Polish and never expose Supabase internals', () => {
  const cases = [
    ['confirm', 'Invalid JWT structure'],
    ['login', 'Invalid login credentials'],
    ['register', 'User already registered'],
    ['reset', 'Email rate limit exceeded'],
    ['update-password', 'JWT expired'],
  ] as const

  for (const [action, internalMessage] of cases) {
    const failure = getPublicAccountAuthFailure(action, new Error(internalMessage))
    assert.doesNotMatch(failure.error, /JWT|Supabase|credentials|registered|rate limit/i)
    assert.match(failure.error, /[ąćęłńóśźż]/i)
  }
})

test('missing account runtime configuration maps to a temporary availability message', () => {
  const failure = getPublicAccountAuthFailure('login', new Error('SUPABASE_SERVICE_ROLE_KEY is missing'))

  assert.equal(failure.status, 503)
  assert.equal(failure.error, 'Konto jest chwilowo niedostępne. Spróbuj ponownie za kilka minut.')
})
