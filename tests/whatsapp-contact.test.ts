import assert from 'node:assert/strict'
import { test } from 'node:test'
import { normalizeWhatsAppSupportUrl } from '@/lib/whatsapp'

test('WhatsApp support link accepts only approved HTTPS entry points', () => {
  assert.equal(
    normalizeWhatsAppSupportUrl('https://wa.me/48500100200?text=Regulski'),
    'https://wa.me/48500100200?text=Regulski',
  )
  assert.equal(
    normalizeWhatsAppSupportUrl('https://api.whatsapp.com/send?phone=48500100200'),
    'https://api.whatsapp.com/send?phone=48500100200',
  )
})

test('WhatsApp support link stays hidden when configuration is empty or unsafe', () => {
  assert.equal(normalizeWhatsAppSupportUrl(''), null)
  assert.equal(normalizeWhatsAppSupportUrl(undefined), null)
  assert.equal(normalizeWhatsAppSupportUrl('http://wa.me/48500100200'), null)
  assert.equal(normalizeWhatsAppSupportUrl('https://example.com/support'), null)
  assert.equal(normalizeWhatsAppSupportUrl('https://wa.me/'), null)
  assert.equal(normalizeWhatsAppSupportUrl('https://api.whatsapp.com/about'), null)
})
