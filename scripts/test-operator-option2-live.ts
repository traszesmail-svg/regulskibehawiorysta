import assert from 'node:assert/strict'
import { execFileSync, execSync } from 'node:child_process'
import { loadEnvConfig } from '@next/env'
import { getBookingById, updateBookingCallState } from '../lib/server/db'
import { triggerZapytajCall } from '../lib/server/zapytaj-call'
import { toPhoneAgentCase } from '../lib/server/phone-agent'
import { getPhoneAgentDeviceState, listSmsQueue } from '../lib/server/phone-agent-store'

loadEnvConfig(process.cwd())

// Ustalenia użytkownika:
// 1. Numer klienta do SMS testowych i info o łączeniu: 505848889
// 2. Połączenie telefoniczne po informacji do klienta ma zadzwonić "do mnie": 579163241
const CLIENT_PHONE = '+48505848889'
const OWNER_PHONE = '+48579163241'
const CLIENT_NAME = 'Opiekun Testowy 505'

async function runOption2LiveTest() {
  console.log('=== OPCJA 2: KONTROLOWANY TEST NA ŻYWO (POŁĄCZENIE ŁĄCZONE) ===')
  console.log(`Klient: ${CLIENT_NAME} (${CLIENT_PHONE})`)
  console.log(`Docelowy numer połączenia ("do mnie"): ${OWNER_PHONE}\n`)

  // 1. Sprawdzenie stanu Motoroli One Vision
  console.log('1. Sprawdzanie gotowości telefonu Motorola One Vision...')
  const phoneState = await getPhoneAgentDeviceState()
  assert.ok(phoneState, 'Brak zarejestrowanego stanu telefonu w bazie.')
  console.log(`   Status: ${phoneState.status}, Bateria: ${phoneState.batteryLevel}%, Wersja: ${phoneState.appVersion}`)
  console.log(`   Ostatni meldunek: ${phoneState.lastHeartbeatAt}`)
  assert.equal(phoneState.isOnline, true, 'Motorola One Vision musi być online.')

  // 2. Utworzenie rezerwacji w Supabase z numerem klienta 505848889
  const testId = crypto.randomUUID()
  const today = new Date().toISOString().slice(0, 10)
  const nowIso = new Date().toISOString()
  console.log(`\n2. Zakładanie rezerwacji www klienta (ID: ${testId}, telefon klienta: ${CLIENT_PHONE})...`)

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: user } = await supabase.from('users').select('id').eq('email', 'krzyre@gmail.com').maybeSingle()
  let userId = user?.id
  if (!userId) {
    const { data: newUser } = await supabase.from('users').insert({ email: 'krzyre@gmail.com' }).select('id').single()
    userId = newUser?.id
  }

  const { error: insertErr } = await supabase.from('bookings').insert({
    id: testId,
    user_id: userId,
    owner_name: CLIENT_NAME,
    animal_type: 'Pies (Border Collie)',
    problem_type: 'Szczekanie na dzwonek i gości',
    pet_age: '2 lata',
    duration_notes: 'Opcja 2: Test na żywo połączenia łączonego',
    description: 'Pies bardzo intensywnie reaguje na domofon. Sprawa pilna.',
    phone: CLIENT_PHONE,
    email: 'krzyre@gmail.com',
    booking_date: today,
    booking_time: '12:00',
    slot_id: `live-slot-${Date.now()}`,
    service_type: 'szybka-konsultacja-15-min',
    consultation_mode: 'phone',
    live_mode: false,
    meeting_url: 'https://meet.jit.si/regulski-' + testId,
    payment_reference: 'RB-OPCJA2-' + testId.slice(-4),
    booking_status: 'pending',
    payment_status: 'paid', // symulacja zaksięgowania wpłaty
    amount: 79,
    call_attempt: 0,
    created_at: nowIso,
    updated_at: nowIso,
  })
  if (insertErr) throw insertErr
  console.log(`   Rezerwacja klienta utworzona: ${testId}`)

  try {
    const booking = (await getBookingById(testId))!
    assert.ok(booking)

    // 3. Przygotowanie zlecenia i wysłanie SMS info o łączeniu do 505
    console.log(`\n3. Wywołanie triggerZapytajCall -> generowanie SMS informacyjnego do ${CLIENT_PHONE}...`)
    process.env.PHONE_CALL_PROVIDER = 'android_agent'
    const callResult = await triggerZapytajCall(booking, { force: true })
    console.log(`   Wynik triggerZapytajCall: ${JSON.stringify(callResult)}`)

    // Sprawdzenie kolejki SMS
    const queue = await listSmsQueue()
    const connectingSms = queue.find((i) => i.idempotencyKey === `call-connecting-${testId}`)
    assert.ok(connectingSms, 'W kolejce SMS musi znaleźć się informacja o łączeniu (call-connecting).')
    console.log(`   SMS info o łączeniu w kolejce dla ${connectingSms.phone}:`)
    console.log(`   "${connectingSms.message}"`)
    assert.equal(connectingSms.phone, CLIENT_PHONE, 'SMS info o łączeniu musi być wysłany na numer klienta 505848889.')

    // 4. Pobranie zlecenia z override docelowego numeru telefonu na numer użytkownika ("do mnie")
    console.log(`\n4. Przygotowanie danych zlecenia dla Motoroli (przekierowanie połączenia na: ${OWNER_PHONE})...`)
    process.env.PHONE_AGENT_OPERATOR_DIAL_TARGET = OWNER_PHONE
    const phoneCase = toPhoneAgentCase(booking)
    console.log(`   Klient ze zlecenia: ${phoneCase.ownerName} (${phoneCase.customerPhone})`)
    console.log(`   Numer, pod który Motorola wykona połączenie: ${phoneCase.phone}`)
    console.log(`   Briefing lektora TTS:\n   "${phoneCase.voiceBriefing}"`)

    // 5. Wysłanie zlecenia mowy do fizycznej Motoroli przez ADB
    console.log('\n5. Uruchomienie mowy lektora na fizycznej Motoroli One Vision...')
    const adb = process.env.LOCALAPPDATA + '\\Android\\Sdk\\platform-tools\\adb.exe'
    const sanitizedBriefing = phoneCase.voiceBriefing.replace(/["'`()]/g, ' ')
    execFileSync(
      adb,
      ['-s', 'ZY323XJ2V7', 'shell', 'am', 'start', '-n', 'pl.regulski.phoneagent/.MainActivity', '--es', 'speak_text', `"${sanitizedBriefing}"`],
      { stdio: 'pipe' },
    )
    console.log('   Polecenie lektora wysłane.')

    // 6. Motorola dzwoni na numer użytkownika ("i potem do mnie": 579163241)
    console.log(`\n6. Inicjowanie połączenia z Motoroli na Twój telefon: ${OWNER_PHONE}...`)
    console.log('   UWAGA: Motorola wybiera teraz numer 579163241 przez modem SIM T-Mobile.')
    
    // Zarejestruj claimed w bazie
    await updateBookingCallState(testId, { callStatus: 'phone_agent_dialing', callAttempt: 1 })
    console.log('   Status w bazie zmieniony na: phone_agent_dialing')

    // Wykonaj połączenie telefoniczne z Motoroli na 579163241
    execFileSync(
      adb,
      ['-s', 'ZY323XJ2V7', 'shell', 'am', 'start', '-a', 'android.intent.action.CALL', '-d', `tel:${OWNER_PHONE}`],
      { stdio: 'pipe' },
    )
    console.log(`   >>> POŁĄCZENIE WYBIERANE: Twój telefon ${OWNER_PHONE} powinien właśnie dzwonić! <<<`)

    // Odczekaj chwilę na sygnał połączenia
    console.log('   Czekam 12 sekund na sygnał w sieci komórkowej...')
    await new Promise((r) => setTimeout(r, 12000))

    // Sprawdź stan połączenia w systemie Android
    const callDump = execSync(`"${adb}" -s ZY323XJ2V7 shell "dumpsys telephony.registry | grep mCallState"`, { encoding: 'utf-8' })
    console.log(`   Stan modemu GSM: ${callDump.trim()}`)

    // Zakończ połączenie telefoniczne na Motoroli po teście
    console.log('\n7. Kończenie aktywnego połączenia testowego...')
    try {
      execSync(`"${adb}" -s ZY323XJ2V7 shell input keyevent KEYCODE_ENDCALL`)
      console.log('   Wysłano KEYCODE_ENDCALL do Motoroli.')
    } catch (err) {
      console.warn('   Klawisz ENDCALL:', err)
    }

    // Zaraportuj zakończenie połączenia
    await updateBookingCallState(testId, { callStatus: 'phone_agent_completed', callLastError: null })
    const finishedBooking = await getBookingById(testId)
    console.log(`   Status końcowy zlecenia w bazie: ${finishedBooking?.callStatus}`)
    assert.equal(finishedBooking?.callStatus, 'phone_agent_completed')

    console.log('\n=== TEST OPCJI 2 ZAKOŃCZONY PEŁNYM SUKCESEM! ===')
  } finally {
    // Czyszczenie
    console.log('\n8. Czyszczenie danych testowych z bazy...')
    await supabase.from('bookings').delete().eq('id', testId)
    await supabase.from('phone_agent_sms_queue').delete().eq('booking_id', testId)
    console.log('   Wyczyszczono rezerwację testową i wpisy SMS.')
  }
}

runOption2LiveTest().catch((err) => {
  console.error('BŁĄD TESTU OPCJI 2:', err)
  process.exit(1)
})
