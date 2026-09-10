import crypto from 'node:crypto'

function stringField(formData: FormData, name: string) {
  const value = formData.get(name)
  return typeof value === 'string' ? value : ''
}

export function createZadarmaWebhookSignature(formData: FormData, secret: string): string | null {
  const event = stringField(formData, 'event').toUpperCase()
  const callStart = stringField(formData, 'call_start')
  let payload: string

  if (event === 'NOTIFY_ANSWER') {
    payload = stringField(formData, 'caller_id') + stringField(formData, 'destination') + callStart
  } else if (event === 'NOTIFY_OUT_START' || event === 'NOTIFY_OUT_END') {
    payload = stringField(formData, 'internal') + stringField(formData, 'destination') + callStart
  } else if (event === 'NOTIFY_START' || event === 'NOTIFY_INTERNAL' || event === 'NOTIFY_END' || event === 'NOTIFY_IVR') {
    payload = stringField(formData, 'caller_id') + stringField(formData, 'called_did') + callStart
  } else {
    return null
  }

  return crypto.createHmac('sha1', secret).update(payload).digest('base64')
}

export function hasValidZadarmaSignature(formData: FormData, secret: string) {
  const received = stringField(formData, 'signature')
  const expected = createZadarmaWebhookSignature(formData, secret)
  if (!received || !expected) return false

  const receivedBuffer = Buffer.from(received)
  const expectedBuffer = Buffer.from(expected)
  return receivedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
}
