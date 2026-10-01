import assert from 'node:assert/strict'
import test from 'node:test'
import { POST } from '../app/api/zapytaj/route'
import { POST as postLegacyBook } from '../app/api/book/route'

test('publiczny checkout live jest przekierowany do kolejki Zapytaj teraz', async () => {
  const response = await POST(new Request('https://example.test/api/zapytaj', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'live' }),
  }))

  assert.equal(response.status, 409)
  assert.match((await response.json()).error, /formularzu pod kalendarzem/)
})

test('stary endpoint rezerwacji nie omija kolejki przez usługę Zapytaj teraz', async () => {
  const response = await postLegacyBook(new Request('https://example.test/api/book', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ service: 'kwadrans-na-juz' }),
  }))

  assert.equal(response.status, 409)
  assert.match((await response.json()).error, /formularzu pod kalendarzem/)
})
