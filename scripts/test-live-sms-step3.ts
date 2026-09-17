import { loadEnvConfig } from '@next/env'
import { createClient } from '@supabase/supabase-js'
import { execFileSync, execSync } from 'node:child_process'
import { enqueueSms, listSmsQueue, getPhoneAgentDeviceState } from '../lib/server/phone-agent-store'
import { getBookingById, updateBookingCallState } from '../lib/server/db'
import { toPhoneAgentCase } from '../lib/server/phone-agent'

loadEnvConfig(process.cwd())

const TARGET_PHONE = '+48505848889'
const TARGET_NAME = 'Piotr Regulski (Test Pilota)'
const ADB_PATH = `${process.env.LOCALAPPDATA}\\Android\\Sdk\\platform-tools\\adb.exe`
let createdTestBookingId: string | null = null

async function cleanupTestBooking() {
  if (!createdTestBookingId) return

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { error: smsError } = await supabase.from('phone_agent_sms_queue').delete().eq('booking_id', createdTestBookingId)
  if (smsError) throw smsError
  const { error: bookingError } = await supabase.from('bookings').delete().eq('id', createdTestBookingId)
  if (bookingError) throw bookingError
  console.log(`   Usunięto dane testowe: ${createdTestBookingId}`)
  createdTestBookingId = null
}

async function main() {
  console.log('===============================================================')
  console.log('   KROK 3: KONTROLOWANY TEST PILOTOWY LIVE NA MOTOROLI')
  console.log('   Cel: Wysyłka fizycznego SMS z karty SIM T-Mobile Motoroli')
  console.log(`   Numer docelowy: ${TARGET_PHONE}`)
  console.log('===============================================================\n')

  // 1. Sprawdzenie stanu urządzenia
  console.log('1. Sprawdzam stan połączenia Motoroli One Vision...')
  const deviceState = await getPhoneAgentDeviceState()
  console.log(`   Stan: ${deviceState.status} (online=${deviceState.isOnline})`)
  console.log(`   Bateria: ${deviceState.batteryLevel}%, Ładowanie: ${deviceState.isCharging}`)
  console.log(`   Wersja APK: ${deviceState.appVersion}`)
  console.log(`   Ostatni meldunek: ${deviceState.lastHeartbeatAt}`)

  if (!deviceState.isOnline) {
    throw new Error('Motorola One Vision nie jest online!')
  }

  // 2. Utworzenie rezerwacji testowej w Supabase
  const testBookingId = crypto.randomUUID()
  createdTestBookingId = testBookingId
  const today = new Date().toISOString().slice(0, 10)
  const nowIso = new Date().toISOString()
  console.log(`\n2. Rejestruję rezerwację testową w Supabase (ID: ${testBookingId})...`)

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: user } = await supabase.from('users').select('id').eq('email', 'krzyre@gmail.com').maybeSingle()
  let userId = user?.id
  if (!userId) {
    const { data: newUser } = await supabase.from('users').insert({ email: 'krzyre@gmail.com' }).select('id').single()
    userId = newUser?.id
  }

  const { error: bookingErr } = await supabase.from('bookings').insert({
    id: testBookingId,
    user_id: userId,
    owner_name: TARGET_NAME,
    animal_type: 'Pies (Owczarek Niemiecki)',
    problem_type: 'Agresja smyczowa i lęk separacyjny',
    pet_age: '3 lata',
    duration_notes: 'Pilot systemu na żywo Krok 3',
    description: 'Test pilotażowy wysyłki SMS i briefingu głosowego lektora na telefonie Motorola One Vision.',
    phone: TARGET_PHONE,
    email: 'krzyre@gmail.com',
    booking_date: today,
    booking_time: '18:00',
    slot_id: `pilot-slot-${Date.now()}`,
    service_type: 'zapytaj-behawioryste',
    consultation_mode: 'phone',
    live_mode: false,
    meeting_url: 'https://meet.jit.si/regulski-pilot-' + testBookingId.slice(0, 8),
    payment_reference: 'RB-PILOT-' + testBookingId.slice(-4),
    booking_status: 'confirmed',
    payment_status: 'paid',
    call_status: 'phone_agent_pending',
    amount: 79,
    call_attempt: 0,
    created_at: nowIso,
    updated_at: nowIso,
  })

  if (bookingErr) throw bookingErr
  console.log('   Rezerwacja testowa utworzona pomyślnie.')

  // 3. Dodanie SMS-a do kolejki
  console.log('\n3. Dodaję SMS testowy do kolejki phone_agent_sms_queue...')
  const smsMessage = `Regulski Behawiorysta: Potwierdzenie testowe. Twoja konsultacja z behawiorystą została potwierdzona. Pozdrawiamy!`
  const idempotencyKey = `pilot_sms_${Date.now()}`

  const queuedSms = await enqueueSms({
    bookingId: testBookingId,
    phone: TARGET_PHONE,
    message: smsMessage,
    type: 'payment_confirmed',
    idempotencyKey,
  })
  console.log(`   SMS zarejestrowany w kolejce: ID=${queuedSms.id}, status=${queuedSms.status}`)

  // 4. Oczekiwanie na pobranie i wysłanie przez Motorolę
  console.log('\n4. Oczekiwanie na pobranie i wysłanie SMS przez Motorolę (polling co 15s)...')
  let finalSmsStatus = queuedSms.status
  let attempts = 0
  const maxAttempts = 12 // do 60 sekund

  while (attempts < maxAttempts) {
    await new Promise((r) => setTimeout(r, 5000))
    attempts++

    const { data: currentSms } = await supabase
      .from('phone_agent_sms_queue')
      .select('id, status, sent_at, error')
      .eq('id', queuedSms.id)
      .single()

    if (currentSms) {
      console.log(`   [${attempts * 5}s] Status SMS w bazie: ${currentSms.status}${currentSms.error ? ` (Błąd: ${currentSms.error})` : ''}`)
      finalSmsStatus = currentSms.status
      if (currentSms.status === 'sent') {
        console.log(`   SUKCES! SMS został fizycznie wysłany przez Motorolę o ${currentSms.sent_at}!`)
        break
      }
    }
  }

  // 5. Test Lektora TTS na Motoroli
  console.log('\n5. Test Lektora TTS (Briefing sprawy na głos przez głośnik Motoroli)...')
  const booking = await getBookingById(testBookingId)
  if (booking) {
    const phoneCase = toPhoneAgentCase(booking)
    console.log(`   Treść briefingu: "${phoneCase.voiceBriefing}"`)
    const sanitizedBriefing = phoneCase.voiceBriefing.replace(/["'`()]/g, ' ')
    try {
      execFileSync(ADB_PATH, ['-s', 'ZY323XJ2V7', 'shell', 'am', 'start', '-n', 'pl.regulski.phoneagent/.MainActivity', '--es', 'speak_text', `"${sanitizedBriefing}"`], { stdio: 'pipe' })
      console.log('   Polecenie mowy wysłane pomyślnie do Motoroli.')
    } catch (e: any) {
      console.warn('   Nie udało się uruchomić mowy przez adb:', e.message)
    }
  }

  // 6. Podsumowanie
  console.log('\n===============================================================')
  console.log('   WYNIKI KROKU 3:')
  console.log(`   - Rezerwacja w Supabase: ${testBookingId}`)
  console.log(`   - Status SMS: ${finalSmsStatus}`)
  console.log(`   - Odbiorca: ${TARGET_PHONE}`)
  console.log('===============================================================\n')
  await cleanupTestBooking()
}

main().catch(async (err) => {
  try {
    await cleanupTestBooking()
  } catch (cleanupError) {
    console.error('Nie udało się usunąć danych testowych:', cleanupError)
  }
  console.error('BŁĄD KROKU 3:', err)
  process.exit(1)
})
