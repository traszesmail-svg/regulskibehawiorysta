import { loadEnvConfig } from '@next/env'
import { createClient } from '@supabase/supabase-js'

loadEnvConfig(process.cwd())

const TEST_PHONE = '+48505848889'

function warsawTomorrow() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  const tomorrow = new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day) + 1))
  return tomorrow.toISOString().slice(0, 10)
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const token = process.env.PHONE_AGENT_TOKEN
  if (!url || !key || !token) throw new Error('Brak konfiguracji testu produkcyjnego.')

  const supabase = createClient(url, key)
  let requestId: string | null = null

  try {
    const { data, error } = await supabase.rpc('create_urgent_now_request', {
      p_name: 'Test techniczny',
      p_email: '',
      p_phone: TEST_PHONE,
      p_contact_preference: 'notify_only',
      p_species: null,
      p_topic_id: 'inne',
      p_topic_label: 'Test techniczny timeoutu',
      p_message: 'Kontrolny test produkcyjny timeoutu Motoroli. Nie wymaga odpowiedzi.',
      p_requested_date: warsawTomorrow(),
      p_requested_time: '08:00',
    })
    if (error) throw error

    const row = (Array.isArray(data) ? data[0] : data) as { id?: string } | null
    requestId = row?.id ?? null
    if (!requestId) throw new Error('Nie utworzono kontrolnego zgłoszenia pilnego.')

    const dueAt = new Date(Date.now() - 16 * 60 * 1000).toISOString()
    const { error: ageError } = await supabase
      .from('urgent_now_requests')
      .update({ created_at: dueAt, updated_at: dueAt })
      .eq('id', requestId)
    if (ageError) throw ageError

    const heartbeat = await fetch('https://regulskibehawiorysta.pl/api/phone-agent/heartbeat', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ batteryLevel: 100, isCharging: true, appVersion: '1.5.4' }),
    })
    const heartbeatBody = await heartbeat.json() as { urgentReminders?: { ok?: boolean } }
    if (!heartbeat.ok || heartbeatBody.urgentReminders?.ok !== true) {
      throw new Error('Heartbeat nie uruchomił procesora timeoutu.')
    }

    const idempotencyKey = `urgent-no-response-${requestId}`
    for (let attempt = 1; attempt <= 30; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5_000))
      const { data: sms, error: smsError } = await supabase
        .from('phone_agent_sms_queue')
        .select('status, sent_at, error')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle()
      if (smsError) throw smsError

      const { data: request, error: requestError } = await supabase
        .from('urgent_now_requests')
        .select('no_response_sms_status, no_response_sms_sent_at')
        .eq('id', requestId)
        .single()
      if (requestError) throw requestError

      console.log(`attempt=${attempt}; queue=${sms?.status ?? 'none'}; request=${request.no_response_sms_status ?? 'none'}`)
      if (sms?.status === 'sent' && request.no_response_sms_status === 'sent') {
        console.log('URGENT_TIMEOUT_SMS_SENT')
        return
      }
      if (sms?.status === 'failed' || request.no_response_sms_status === 'failed') {
        throw new Error('Wysyłka SMS timeoutu pilnego nie powiodła się.')
      }
    }

    throw new Error('Timeout pilnego SMS nie został potwierdzony w 150 sekund.')
  } finally {
    if (requestId) {
      await supabase.from('phone_agent_sms_queue').delete().eq('idempotency_key', `urgent-no-response-${requestId}`)
      await supabase.from('urgent_now_requests').delete().eq('id', requestId)
      console.log('URGENT_TEST_DATA_CLEANED')
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
