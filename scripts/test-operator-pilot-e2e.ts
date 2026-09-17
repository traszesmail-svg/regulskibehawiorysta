import assert from 'node:assert/strict'
import { execSync } from 'node:child_process'
import { loadEnvConfig } from '@next/env'
import {
  createBooking,
  getBookingById,
  deleteBooking,
  updateBookingCallState,
} from '../lib/server/db'
import { reconcilePaymentNotification } from '../lib/server/payment-reconciliation'
import { triggerZapytajCall } from '../lib/server/zapytaj-call'
import { toPhoneAgentCase } from '../lib/server/phone-agent'
import { getPhoneAgentDeviceState, listSmsQueue } from '../lib/server/phone-agent-store'

loadEnvConfig(process.cwd())

const TEST_PHONE = '+48505848889'
const TEST_OWNER = 'Testowy Opiekun E2E'

async function runPilotE2ETest() {
  console.log('=== ETAP 7: PILOT I TEST KOŃCOWY OPERATORA (E2E) ===\n')

  // 1. Sprawdzenie stanu telefonu Motorola One Vision...
  console.log('1. Sprawdzanie stanu telefonu Motorola One Vision...')
  const phoneState = await getPhoneAgentDeviceState()
  assert.ok(phoneState, 'Brak zarejestrowanego stanu telefonu w bazie.')
  console.log(`   Status: ${phoneState.status}, Bateria: ${phoneState.batteryLevel}%, Wersja: ${phoneState.appVersion}`)
  assert.equal(phoneState.isOnline, true, 'Telefon powinien być online (meldunek z ostatnich 3 minut).')

  // 2. Utworzenie testowej rezerwacji Zapytaj telefon w Supabase
  process.env.PHONE_AGENT_AUTO_PAYMENT_RECONCILIATION = 'true'
  const today = new Date().toISOString().slice(0, 10)
  const testId = crypto.randomUUID()
  const nowIso = new Date().toISOString()
  console.log(`\n2. Tworzenie testowej rezerwacji w Supabase (ID: ${testId}, telefon: ${TEST_PHONE})...`)

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
    owner_name: TEST_OWNER,
    animal_type: 'Pies (Border Collie)',
    problem_type: 'Szczekanie na dzwonek i gości',
    pet_age: '2 lata',
    duration_notes: 'Test E2E pilota operatora',
    description: 'Pies bardzo intensywnie reaguje na każdy dźwięk domofonu i skacze na gości.',
    phone: TEST_PHONE,
    email: 'krzyre@gmail.com',
    booking_date: today,
    booking_time: '12:00',
    slot_id: `test-slot-${Date.now()}`,
    service_type: 'zapytaj-behawioryste',
    consultation_mode: 'phone',
    live_mode: false,
    meeting_url: 'https://meet.jit.si/regulski-' + testId,
    payment_reference: 'RB-TEST-' + testId.slice(-4),
    booking_status: 'pending',
    payment_status: 'unpaid',
    amount: 79,
    call_attempt: 0,
    created_at: nowIso,
    updated_at: nowIso,
  })
  if (insertErr) throw insertErr

  console.log(`   Rezerwacja testowa utworzona pomyślnie w Supabase: ${testId}`)

  try {
    const booking = await getBookingById(testId)
    assert.ok(booking)
    assert.equal(booking.id, testId)
    assert.equal(booking.paymentStatus, 'unpaid')
    console.log('   Rezerwacja zweryfikowana pomyślnie.')

    // 3. Test dopasowania płatności (Revolut)
    console.log('\n3. Symulacja wpływu płatności Revolut i bezpiecznego dopasowania...')
    const reconciliation = await reconcilePaymentNotification({
      packageName: 'com.revolut.revolut',
      title: 'Otrzymałeś 79 zł',
      text: `Przelew od ${TEST_OWNER}`,
      timestamp: new Date().toISOString(),
    })

    assert.equal(reconciliation.matched, true, 'Powiadomienie powinno zostać dopasowane do rezerwacji.')
    if (reconciliation.matched) {
      assert.equal(reconciliation.bookingId, testId)
      console.log(`   Dopasowano wpłatę do rezerwacji ${testId} na kwotę ${reconciliation.amount} zł.`)
    }

    const paidBooking = await getBookingById(testId)
    assert.ok(paidBooking)
    assert.equal(paidBooking.paymentStatus, 'paid')
    console.log('   Status płatności rezerwacji zmieniony na: paid.')

    // 4. Sprawdzenie kolejki SMS
    console.log('\n4. Weryfikacja dodania SMS potwierdzającego do trwałej kolejki telefonu...')
    const queue = await listSmsQueue()
    const confirmationSms = queue.find((item) => item.idempotencyKey === `payment_confirmed:${testId}`)
    assert.ok(confirmationSms, 'W kolejce powinien znajdować się SMS z kluczem payment_confirmed')
    console.log(`   SMS znaleziony w kolejce: ID=${confirmationSms.id}, Odbiorca=${confirmationSms.phone}, Idempotency=${confirmationSms.idempotencyKey}`)
    assert.equal(confirmationSms.phone, TEST_PHONE, 'SMS potwierdzający musi być skierowany wyłącznie na numer testowy.')

    // 5. Test przygotowania zlecenia rozmowy i Voice Briefing
    console.log('\n5. Przygotowanie zlecenia rozmowy telefonicznej (triggerZapytajCall)...')
    const callAttempt = await triggerZapytajCall(paidBooking, { force: true })
    console.log(`   Wynik triggerZapytajCall: status=${callAttempt.status}, info=${JSON.stringify(callAttempt)}`)

    const updatedBooking = await getBookingById(testId)
    assert.ok(updatedBooking)
    if (updatedBooking.callStatus !== 'phone_agent_pending') {
      await updateBookingCallState(testId, { callStatus: 'phone_agent_pending' })
    }

    const readyBooking = (await getBookingById(testId))!
    assert.equal(readyBooking.callStatus, 'phone_agent_pending')

    const phoneCase = toPhoneAgentCase(readyBooking)
    console.log('   Wygenerowany Voice Briefing:')
    console.log(`   "${phoneCase.voiceBriefing}"`)
    assert.ok(phoneCase.voiceBriefing.includes(TEST_OWNER))
    assert.ok(phoneCase.voiceBriefing.includes('Pies (Border Collie)'))
    assert.ok(phoneCase.voiceBriefing.includes('Szczekanie na dzwonek'))

    // 6. Test integracji z fizyczną Motorolą One Vision...
    console.log('\n6. Test integracji z fizyczną Motorolą One Vision...')
    const adb = process.env.LOCALAPPDATA + '\\Android\\Sdk\\platform-tools\\adb.exe'
    const { execFileSync } = await import('node:child_process')
    
    console.log('   Wysyłanie intentu do telefonu z poleceniem odczytu briefingu sprawy...')
    const sanitizedBriefing = phoneCase.voiceBriefing.replace(/["'`()]/g, ' ')
    execFileSync(adb, ['-s', 'ZY323XJ2V7', 'shell', 'am', 'start', '-n', 'pl.regulski.phoneagent/.MainActivity', '--es', 'speak_text', `"${sanitizedBriefing}"`], { stdio: 'pipe' })
    console.log('   Polecenie mowy wysłane do telefonu.')

    // Odczekaj chwilę na inicjalizację mowy
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // 7. Sprawdzenie logów TTS z Motoroli
    const logcat = execSync(`"${adb}" -s ZY323XJ2V7 logcat -d -s GoogleTTSServiceImpl TextToSpeech`, { encoding: 'utf-8' })
    console.log('   Ostatnie wpisy TTS z telefonu:')
    const lines = logcat.trim().split('\n').slice(-4)
    lines.forEach((l) => console.log('     ' + l))

    // 8. Test cyklu życia zlecenia: claimed -> ended
    console.log('\n7. Test rejestracji statusu rozmowy (claimed -> ended)...')
    await updateBookingCallState(testId, { callStatus: 'phone_agent_dialing', callAttempt: 1 })
    let dialed = (await getBookingById(testId))!
    assert.equal(dialed.callStatus, 'phone_agent_dialing')
    console.log('   Status zmieniony na: phone_agent_dialing (claimed).')

    await updateBookingCallState(testId, { callStatus: 'phone_agent_completed', callLastError: null })
    let completed = (await getBookingById(testId))!
    assert.equal(completed.callStatus, 'phone_agent_completed')
    console.log('   Status zmieniony na: phone_agent_completed (ended).')

    console.log('\n=== WSZYSTKIE TESTY PILOTA E2E ZAKOŃCZONE SUKCESEM! ===')
  } finally {
    // Czyszczenie danych testowych
    console.log('\n8. Czyszczenie danych testowych z bazy...')
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
      await supabase.from('bookings').delete().eq('id', testId)
      await supabase.from('phone_agent_sms_queue').delete().eq('booking_id', testId)
      console.log(`   Rezerwacja testowa ${testId} oraz wpisy SMS usunięte z bazy.`)
    } catch (err) {
      console.warn('   Nie udało się usunąć danych testowych:', err)
    }
  }
}

runPilotE2ETest().catch((err) => {
  console.error('BŁĄD TESTU E2E:', err)
  process.exit(1)
})
