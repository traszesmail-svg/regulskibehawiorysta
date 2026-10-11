import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { test } from 'node:test'
import { createLocalDataSandbox } from '@/scripts/lib/local-data-sandbox'
import {
  createCallSession,
  transitionCallSession,
  getCallSessionById,
  getCallSessionByBookingId,
  findActiveCallSessionByPhoneFingerprint,
  listCallSessionEvents,
} from '@/lib/server/call-session-store'
import {
  CallSessionError,
  CallSessionConcurrencyError,
  CallSessionIdempotencyConflictError,
  CallSessionInvalidPhoneError,
  CallSessionInvalidTimeError,
  CallSessionResumeWindowExpiredError,
  CallSessionSecurityError,
  CallSessionTerminalStateError,
  CallSessionTransitionError,
} from '@/lib/server/call-session-types'
import {
  computeCallerPhoneFingerprint,
  getCallSessionPhoneSecret,
  sanitizePayload,
} from '@/lib/server/call-session-security'

async function withIsolatedStore(run: (dataDir: string) => Promise<void>) {
  const sandbox = await createLocalDataSandbox('call-sessions-durability')
  const previousMode = process.env.APP_DATA_MODE
  process.env.APP_DATA_MODE = 'local'
  try {
    await run(sandbox.dataDir)
  } finally {
    if (previousMode === undefined) {
      delete process.env.APP_DATA_MODE
    } else {
      process.env.APP_DATA_MODE = previousMode
    }
    await sandbox.cleanup()
  }
}

test('1. Start aktywnej sesji: tworzy sesję z limitem, zerowym elapsed i stanem active', async () => {
  await withIsolatedStore(async () => {
    const rawPhone = '+48 500 600 700'
    const session = await createCallSession({
      bookingId: '00000000-0000-4000-8000-000000000001',
      phone: rawPhone,
      limitSeconds: 900,
      idempotencyKey: 'start-key-01',
      payload: { clientType: 'regular' },
    })

    assert.equal(session.state, 'active')
    assert.equal(session.limitSeconds, 900)
    assert.equal(session.elapsedSeconds, 0)
    assert.equal(session.remainingSeconds, 900)
    assert.equal(session.version, 1)
    assert.ok(session.answeredAt, 'answeredAt musi być zdefiniowane')
    assert.equal(session.interruptedAt, null)
    assert.equal(session.resumeWindowExpiresAt, null)
    assert.equal(session.callerPhoneMasked, '+48 500 *** 700')
    assert.ok(session.callerPhoneFingerprint.startsWith('call_fp:'))

    // Bezpieczeństwo: fingerprint nie może być surowym numerem
    assert.notEqual(session.callerPhoneFingerprint, rawPhone)
    assert.ok(!session.callerPhoneFingerprint.includes('500600700'))

    // Weryfikacja wyszukiwania po bookingId i id
    const byId = await getCallSessionById(session.id)
    assert.equal(byId?.id, session.id)

    const byBooking = await getCallSessionByBookingId('00000000-0000-4000-8000-000000000001')
    assert.equal(byBooking?.id, session.id)

    const byFingerprint = await findActiveCallSessionByPhoneFingerprint(session.callerPhoneFingerprint)
    assert.equal(byFingerprint?.id, session.id)
  })
})

test('2. Przerwanie po potwierdzonym czasie: active -> interrupted z naliczeniem czasu i oknem callbacku', async () => {
  await withIsolatedStore(async () => {
    const session = await createCallSession({
      bookingId: '00000000-0000-4000-8000-000000000002',
      phone: '501234567',
      limitSeconds: 900,
    })

    const interrupted = await transitionCallSession({
      sessionId: session.id,
      targetState: 'interrupted',
      expectedVersion: 1,
      deltaSeconds: 180, // Potwierdzony odcinek 3 minut
      eventType: 'call_interrupted',
      idempotencyKey: 'int-key-01',
      payload: { reason: 'gsm_signal_loss' },
    })

    assert.equal(interrupted.state, 'interrupted')
    assert.equal(interrupted.elapsedSeconds, 180)
    assert.equal(interrupted.remainingSeconds, 720)
    assert.equal(interrupted.version, 2)
    assert.ok(interrupted.interruptedAt)
    assert.ok(interrupted.resumeWindowExpiresAt)

    const intTime = new Date(interrupted.interruptedAt).getTime()
    const expTime = new Date(interrupted.resumeWindowExpiresAt).getTime()
    // Domyślne okno 15 minut = 900 000 ms
    assert.equal(expTime - intTime, 15 * 60 * 1000)
  })
})

test('3. Zachowanie remaining: odczyt w stanie interrupted zachowuje remaining bez ubytku czasu', async () => {
  await withIsolatedStore(async () => {
    const session = await createCallSession({
      bookingId: '00000000-0000-4000-8000-000000000003',
      phone: '502345678',
      limitSeconds: 900,
    })

    await transitionCallSession({
      sessionId: session.id,
      targetState: 'interrupted',
      deltaSeconds: 240,
    })

    const readBack = await getCallSessionById(session.id)
    assert.equal(readBack?.state, 'interrupted')
    assert.equal(readBack?.elapsedSeconds, 240)
    assert.equal(readBack?.remainingSeconds, 660)
    assert.equal(readBack?.limitSeconds, 900)
    assert.equal(readBack!.elapsedSeconds + readBack!.remainingSeconds, readBack!.limitSeconds)
  })
})

test('4. Oczekiwanie bez utraty czasu: waiting_for_owner oraz bridging nie zużywają limitu', async () => {
  await withIsolatedStore(async () => {
    const session = await createCallSession({
      bookingId: '00000000-0000-4000-8000-000000000004',
      phone: '503456789',
      limitSeconds: 900,
    })

    await transitionCallSession({
      sessionId: session.id,
      targetState: 'interrupted',
      deltaSeconds: 300,
    })

    // Klient oddzwania: przechodzi w waiting_for_owner
    const waiting = await transitionCallSession({
      sessionId: session.id,
      targetState: 'waiting_for_owner',
      deltaSeconds: 0,
      eventType: 'client_callback_received',
    })

    assert.equal(waiting.state, 'waiting_for_owner')
    assert.equal(waiting.elapsedSeconds, 300)
    assert.equal(waiting.remainingSeconds, 600)

    // Próba nielegalnego naliczenia czasu podczas waiting_for_owner musi być odrzucona
    await assert.rejects(
      transitionCallSession({
        sessionId: session.id,
        targetState: 'bridging',
        deltaSeconds: 45, // Niedozwolona próba konsumpcji czasu!
      }),
      CallSessionInvalidTimeError,
    )

    // Prawidłowe przejście w bridging z deltaSeconds: 0
    const bridging = await transitionCallSession({
      sessionId: session.id,
      targetState: 'bridging',
      deltaSeconds: 0,
      eventType: 'voice_bridge_initiated',
    })

    assert.equal(bridging.state, 'bridging')
    assert.equal(bridging.elapsedSeconds, 300)
    assert.equal(bridging.remainingSeconds, 600)

    // Próba naliczenia czasu podczas bridging również musi być odrzucona
    await assert.rejects(
      transitionCallSession({
        sessionId: session.id,
        targetState: 'resumed',
        deltaSeconds: 30, // Niedozwolona konsumpcja
      }),
      CallSessionInvalidTimeError,
    )
  })
})

test('5. Resume: udane zestawienie mostka wznawia sesję z zachowanym remaining_seconds', async () => {
  await withIsolatedStore(async () => {
    const session = await createCallSession({
      bookingId: '00000000-0000-4000-8000-000000000005',
      phone: '504567890',
      limitSeconds: 900,
    })

    await transitionCallSession({ sessionId: session.id, targetState: 'interrupted', deltaSeconds: 200 })
    await transitionCallSession({ sessionId: session.id, targetState: 'waiting_for_owner' })
    await transitionCallSession({ sessionId: session.id, targetState: 'bridging' })

    const resumed = await transitionCallSession({
      sessionId: session.id,
      targetState: 'resumed',
      eventType: 'bridge_connected',
    })

    assert.equal(resumed.state, 'resumed')
    assert.equal(resumed.elapsedSeconds, 200)
    assert.equal(resumed.remainingSeconds, 700)
    assert.equal(resumed.interruptedAt, null)
    assert.equal(resumed.resumeWindowExpiresAt, null)
  })
})

test('6. Kolejne przerwanie: resumed -> interrupted z poprawnym zsumowaniem czasu i nowym oknem', async () => {
  await withIsolatedStore(async () => {
    const session = await createCallSession({
      bookingId: '00000000-0000-4000-8000-000000000006',
      phone: '505678901',
      limitSeconds: 900,
    })

    await transitionCallSession({ sessionId: session.id, targetState: 'interrupted', deltaSeconds: 150 })
    await transitionCallSession({ sessionId: session.id, targetState: 'waiting_for_owner' })
    await transitionCallSession({ sessionId: session.id, targetState: 'bridging' })
    await transitionCallSession({ sessionId: session.id, targetState: 'resumed' })

    // Po 250 sekundach wznowionej rozmowy następuje kolejne zerwanie połączenia
    const secondInterruption = await transitionCallSession({
      sessionId: session.id,
      targetState: 'interrupted',
      deltaSeconds: 250,
      eventType: 'call_interrupted_again',
    })

    assert.equal(secondInterruption.state, 'interrupted')
    assert.equal(secondInterruption.elapsedSeconds, 400) // 150 + 250
    assert.equal(secondInterruption.remainingSeconds, 500) // 900 - 400
    assert.ok(secondInterruption.interruptedAt)
    assert.ok(secondInterruption.resumeWindowExpiresAt)
  })
})

test('7. Ukończenie przy wyczerpaniu: stan completed przy remaining = 0 i blokada po terminalnym', async () => {
  await withIsolatedStore(async () => {
    const session = await createCallSession({
      bookingId: '00000000-0000-4000-8000-000000000007',
      phone: '506789012',
      limitSeconds: 900,
    })

    // Rozmowa zużywa 900 sekund
    const completed = await transitionCallSession({
      sessionId: session.id,
      targetState: 'active',
      deltaSeconds: 900,
    })

    assert.equal(completed.state, 'completed')
    assert.equal(completed.elapsedSeconds, 900)
    assert.equal(completed.remainingSeconds, 0)
    assert.equal(completed.resumeWindowExpiresAt, null)

    // Jakakolwiek próba modyfikacji po stanie terminalnym musi rzucić CallSessionTerminalStateError
    await assert.rejects(
      transitionCallSession({
        sessionId: session.id,
        targetState: 'interrupted',
      }),
      CallSessionTerminalStateError,
    )
  })
})

test('8. Idempotentne powtórzenie: identyczny klucz z tym samym payloadem zwraca ten sam wynik bez naliczania czasu', async () => {
  await withIsolatedStore(async () => {
    const session = await createCallSession({
      bookingId: '00000000-0000-4000-8000-000000000008',
      phone: '507890123',
      limitSeconds: 900,
    })

    const payload = { seq: 1, reason: 'network_drop', stationId: 'BTS-44' }
    const first = await transitionCallSession({
      sessionId: session.id,
      targetState: 'interrupted',
      deltaSeconds: 120,
      idempotencyKey: 'idemp-test-key-01',
      payload,
    })

    assert.equal(first.state, 'interrupted')
    assert.equal(first.elapsedSeconds, 120)
    assert.equal(first.remainingSeconds, 780)
    assert.equal(first.version, 2)

    // Identyczne powtórzenie tego samego zdarzenia
    const repeated = await transitionCallSession({
      sessionId: session.id,
      targetState: 'interrupted',
      deltaSeconds: 120,
      idempotencyKey: 'idemp-test-key-01',
      payload,
    })

    assert.equal(repeated.state, 'interrupted')
    assert.equal(repeated.elapsedSeconds, 120, 'Czas NIE może zostać naliczony dwukrotnie!')
    assert.equal(repeated.remainingSeconds, 780)
    assert.equal(repeated.version, 2, 'Wersja nie może się zmienić przy idempotentnym powtórzeniu')

    const events = await listCallSessionEvents(session.id)
    assert.equal(events.filter((e) => e.idempotencyKey === 'idemp-test-key-01').length, 1)
  })
})

test('9. Konflikt idempotency: ten sam klucz z innym payloadem rzuca błąd fail-closed', async () => {
  await withIsolatedStore(async () => {
    const session = await createCallSession({
      bookingId: '00000000-0000-4000-8000-000000000009',
      phone: '508901234',
      limitSeconds: 900,
    })

    await transitionCallSession({
      sessionId: session.id,
      targetState: 'interrupted',
      deltaSeconds: 100,
      idempotencyKey: 'conflict-key-01',
      payload: { cause: 'sim_error' },
    })

    // Ponowienie z innym ładunkiem (konflikt klucza)
    await assert.rejects(
      transitionCallSession({
        sessionId: session.id,
        targetState: 'interrupted',
        deltaSeconds: 100,
        idempotencyKey: 'conflict-key-01',
        payload: { cause: 'completely_different_payload' },
      }),
      CallSessionIdempotencyConflictError,
    )

    // Stan sesji pozostaje nienaruszony
    const fresh = await getCallSessionById(session.id)
    assert.equal(fresh?.elapsedSeconds, 100)
    assert.equal(fresh?.remainingSeconds, 800)
  })
})

test('10. Nielegalne przejście: odrzucenie zabronionych przejść stanów', async () => {
  await withIsolatedStore(async () => {
    const session = await createCallSession({
      bookingId: '00000000-0000-4000-8000-000000000010',
      phone: '509012345',
      limitSeconds: 900,
    })

    // active -> resumed jest niedozwolone
    await assert.rejects(
      transitionCallSession({ sessionId: session.id, targetState: 'resumed' }),
      CallSessionTransitionError,
    )

    // active -> bridging jest niedozwolone
    await assert.rejects(
      transitionCallSession({ sessionId: session.id, targetState: 'bridging' }),
      CallSessionTransitionError,
    )

    // active -> waiting_for_owner jest niedozwolone
    await assert.rejects(
      transitionCallSession({ sessionId: session.id, targetState: 'waiting_for_owner' }),
      CallSessionTransitionError,
    )

    await transitionCallSession({ sessionId: session.id, targetState: 'interrupted' })

    // interrupted -> bridging bezpośrednio (bez waiting_for_owner) jest niedozwolone
    await assert.rejects(
      transitionCallSession({ sessionId: session.id, targetState: 'bridging' }),
      CallSessionTransitionError,
    )
  })
})

test('11. Wygaśnięcie okna callbacku: próba oddzwonienia po upływie resume_window_expires_at jest odrzucana', async () => {
  await withIsolatedStore(async () => {
    const session = await createCallSession({
      bookingId: '00000000-0000-4000-8000-000000000011',
      phone: '510123456',
      limitSeconds: 900,
    })

    // Przerwanie z oknem, które wygasło 10 minut temu
    const pastTime = new Date(Date.now() - 20 * 60 * 1000).toISOString()
    const expiredWindow = new Date(Date.now() - 5 * 60 * 1000).toISOString()

    await transitionCallSession({
      sessionId: session.id,
      targetState: 'interrupted',
      deltaSeconds: 150,
      interruptedAt: pastTime,
      resumeWindowExpiresAt: expiredWindow,
    })

    // Oddzwonienie po wygaśnięciu okna musi rzucić błąd wygaśnięcia okna
    await assert.rejects(
      transitionCallSession({
        sessionId: session.id,
        targetState: 'waiting_for_owner',
      }),
      CallSessionResumeWindowExpiredError,
    )
  })
})

test('12. Współbieżność / CAS: niedopasowanie oczekiwanej wersji odrzuca operację', async () => {
  await withIsolatedStore(async () => {
    const session = await createCallSession({
      bookingId: '00000000-0000-4000-8000-000000000012',
      phone: '511234567',
      limitSeconds: 900,
    })

    assert.equal(session.version, 1)

    // Oczekiwana wersja 99 zamiast 1 -> natychmiastowy konflikt CAS
    await assert.rejects(
      transitionCallSession({
        sessionId: session.id,
        targetState: 'interrupted',
        expectedVersion: 99,
      }),
      CallSessionConcurrencyError,
    )

    // Prawidłowa wersja 1 przechodzi i zwiększa do 2
    const v2 = await transitionCallSession({
      sessionId: session.id,
      targetState: 'interrupted',
      expectedVersion: 1,
    })
    assert.equal(v2.version, 2)

    // Próba ponownego użycia wersji 1 odpada
    await assert.rejects(
      transitionCallSession({
        sessionId: session.id,
        targetState: 'waiting_for_owner',
        expectedVersion: 1,
      }),
      CallSessionConcurrencyError,
    )
  })
})

test('13. Prywatność: brak surowego numeru w logach, zdarzeniach i trwałym magazynie sesji', async () => {
  await withIsolatedStore(async (dataDir) => {
    const rawPhoneNumber = '+48600700800'
    const session = await createCallSession({
      bookingId: '00000000-0000-4000-8000-000000000013',
      phone: rawPhoneNumber,
      limitSeconds: 900,
      idempotencyKey: 'privacy-start-key',
      payload: { debugLabel: 'audited_event' },
    })

    await transitionCallSession({
      sessionId: session.id,
      targetState: 'interrupted',
      deltaSeconds: 100,
      idempotencyKey: 'privacy-int-key',
      payload: { meta: 'ok' },
    })

    // Sprawdzenie obiektu w pamięci
    assert.ok(!JSON.stringify(session).includes(rawPhoneNumber), 'Obiekt sesji nie może zawierać surowego numeru!')
    assert.ok(!JSON.stringify(session).includes('600700800'))

    // Sprawdzenie fizycznego pliku snapshotu na dysku
    const snapshotRaw = await readFile(path.join(dataDir, 'call-sessions-snapshot.json'), 'utf8')
    assert.ok(
      !snapshotRaw.includes('600700800'),
      'Snapshot magazynu NIE MOŻE zawierać cyfr surowego numeru telefonu!',
    )
    assert.ok(
      !snapshotRaw.includes('+48600700800'),
      'Snapshot magazynu NIE MOŻE zawierać surowego numeru telefonu!',
    )

    // W plikach musi być dostępny fingerprint i maskowana wskazówka
    assert.ok(snapshotRaw.includes('+48 600 *** 800'))
    const expectedFingerprint = computeCallerPhoneFingerprint(rawPhoneNumber)
    assert.ok(snapshotRaw.includes(expectedFingerprint))
  })
})

test('14. Regresja 1: deltaSeconds > 0 ze stanu interrupted -> completed/failed jest odrzucane bez zmiany danych', async () => {
  await withIsolatedStore(async () => {
    const session = await createCallSession({
      bookingId: '00000000-0000-4000-8000-000000000014',
      phone: '512345678',
      limitSeconds: 900,
    })

    // Active -> interrupted z legalnym naliczeniem 120s
    await transitionCallSession({
      sessionId: session.id,
      targetState: 'interrupted',
      deltaSeconds: 120,
    })

    const beforeAttempt = await getCallSessionById(session.id)
    assert.equal(beforeAttempt?.state, 'interrupted')
    assert.equal(beforeAttempt?.elapsedSeconds, 120)
    assert.equal(beforeAttempt?.remainingSeconds, 780)
    assert.equal(beforeAttempt?.version, 2)

    // Próba interrupted -> completed z dodatnim deltaSeconds > 0 musi rzucić błąd
    await assert.rejects(
      transitionCallSession({
        sessionId: session.id,
        targetState: 'completed',
        deltaSeconds: 60, // Błędna próba naliczenia czasu z przerwania!
      }),
      CallSessionInvalidTimeError,
    )

    // Próba interrupted -> failed z dodatnim deltaSeconds > 0 musi rzucić błąd
    await assert.rejects(
      transitionCallSession({
        sessionId: session.id,
        targetState: 'failed',
        deltaSeconds: 30, // Błędna próba naliczenia czasu z przerwania!
      }),
      CallSessionInvalidTimeError,
    )

    // Weryfikacja, że stan i czas w magazynie pozostały nienaruszone (fail-closed bez zmiany danych)
    const afterAttempt = await getCallSessionById(session.id)
    assert.equal(afterAttempt?.state, 'interrupted')
    assert.equal(afterAttempt?.elapsedSeconds, 120)
    assert.equal(afterAttempt?.remainingSeconds, 780)
    assert.equal(afterAttempt?.version, 2)
  })
})

test('15. Regresja 2: Idempotencja z pełną semantyką: ten sam payload, ale inny targetState, deltaSeconds lub sessionId/bookingId rzuca konflikt', async () => {
  await withIsolatedStore(async () => {
    const sessionA = await createCallSession({
      bookingId: '00000000-0000-4000-8000-000000000015',
      phone: '513456789',
      limitSeconds: 900,
    })
    const sessionB = await createCallSession({
      bookingId: '00000000-0000-4000-8000-000000000016',
      phone: '514567890',
      limitSeconds: 900,
    })

    const sharedPayload = { note: 'same-payload' }
    const sharedKey = 'sem-key-01'

    // Pierwsze użycie klucza: przejście sessionA do interrupted z delta 100
    await transitionCallSession({
      sessionId: sessionA.id,
      targetState: 'interrupted',
      deltaSeconds: 100,
      idempotencyKey: sharedKey,
      payload: sharedPayload,
    })

    // 1. Ten sam klucz i ten sam payload, ale inny targetState -> CallSessionIdempotencyConflictError
    await assert.rejects(
      transitionCallSession({
        sessionId: sessionA.id,
        targetState: 'completed',
        deltaSeconds: 100,
        idempotencyKey: sharedKey,
        payload: sharedPayload,
      }),
      CallSessionIdempotencyConflictError,
    )

    // 2. Ten sam klucz, ten sam payload i ten sam targetState, ale inny deltaSeconds -> CallSessionIdempotencyConflictError
    await assert.rejects(
      transitionCallSession({
        sessionId: sessionA.id,
        targetState: 'interrupted',
        deltaSeconds: 200,
        idempotencyKey: sharedKey,
        payload: sharedPayload,
      }),
      CallSessionIdempotencyConflictError,
    )

    // 3. Ten sam klucz, ten sam payload, ale inna sesja (sessionId) -> CallSessionIdempotencyConflictError
    await assert.rejects(
      transitionCallSession({
        sessionId: sessionB.id,
        targetState: 'interrupted',
        deltaSeconds: 100,
        idempotencyKey: sharedKey,
        payload: sharedPayload,
      }),
      CallSessionIdempotencyConflictError,
    )

    // 4. Ten sam klucz w createCallSession, ale inny bookingId -> CallSessionIdempotencyConflictError
    const createKey = 'create-sem-key'
    await createCallSession({
      bookingId: '00000000-0000-4000-8000-000000000017',
      phone: '515678901',
      idempotencyKey: createKey,
      payload: sharedPayload,
    })

    await assert.rejects(
      createCallSession({
        bookingId: '00000000-0000-4000-8000-000000000018', // inny bookingId!
        phone: '515678901',
        idempotencyKey: createKey,
        payload: sharedPayload,
      }),
      CallSessionIdempotencyConflictError,
    )
  })
})

test('16. Regresja 3: Rekursywna sanitizacja payloadu z numerem telefonu na wielu poziomach i brak cyfr w snapshotach i eventach', async () => {
  await withIsolatedStore(async (dataDir) => {
    const rawClientPhone = '516789012'
    const nestedSecretPhone = '517890123'

    const deepPayload = {
      user: {
        profile: {
          phone: `+48 ${nestedSecretPhone}`,
          phoneDigits: nestedSecretPhone,
          backupPhones: [
            nestedSecretPhone,
            { mobile: `+48-${nestedSecretPhone}`, label: 'work' },
          ],
        },
        meta: {
          note: `Zadzwoń na ${nestedSecretPhone} natychmiast`,
        },
      },
      audit: [{ action: 'logged', msisdn: nestedSecretPhone }],
    }

    const session = await createCallSession({
      bookingId: '00000000-0000-4000-8000-000000000019',
      phone: rawClientPhone,
      idempotencyKey: 'deep-sanitized-start',
      payload: deepPayload,
    })

    await transitionCallSession({
      sessionId: session.id,
      targetState: 'interrupted',
      deltaSeconds: 50,
      idempotencyKey: 'deep-sanitized-trans',
      payload: deepPayload,
    })

    // Weryfikacja odczytu zdarzeń: payload w zdarzeniu nie zawiera cyfr surowego numeru
    const events = await listCallSessionEvents(session.id)
    assert.equal(events.length, 2)
    for (const ev of events) {
      const serializedEvent = JSON.stringify(ev)
      assert.ok(
        !serializedEvent.includes(nestedSecretPhone),
        `Event ${ev.eventType} zawiera surowe cyfry numeru telefonicznego!`,
      )
    }

    // Weryfikacja fizycznego snapshotu na dysku
    const snapshotRaw = await readFile(path.join(dataDir, 'call-sessions-snapshot.json'), 'utf8')
    assert.ok(
      !snapshotRaw.includes(nestedSecretPhone),
      'Snapshot na dysku NIE MOŻE zawierać numeru zagnieżdżonego w payloadzie!',
    )
    assert.ok(
      !snapshotRaw.includes(rawClientPhone),
      'Snapshot na dysku NIE MOŻE zawierać surowego numeru klienta!',
    )

    // Weryfikacja sanitizacji obiektów bezpośrednich
    const sanitized = sanitizePayload(deepPayload)
    assert.ok(!JSON.stringify(sanitized).includes(nestedSecretPhone))

    // Weryfikacja, że błędy logowalne nie ujawniają numeru
    const invalidPhoneErr = new CallSessionInvalidPhoneError()
    assert.ok(!invalidPhoneErr.message.includes(rawClientPhone))
  })
})

test('17. Regresja 4: getCallSessionPhoneSecret wymaga dedykowanego CALL_SESSION_PHONE_SECRET w trybie Supabase/live i fail-closed przy braku', () => {
  const originalMode = process.env.APP_DATA_MODE
  const originalSecret = process.env.CALL_SESSION_PHONE_SECRET
  const originalServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  const originalPhoneToken = process.env.PHONE_AGENT_TOKEN

  try {
    delete process.env.CALL_SESSION_PHONE_SECRET
    process.env.APP_DATA_MODE = 'supabase'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-service-role-key-that-must-not-be-reused'
    process.env.PHONE_AGENT_TOKEN = 'fake-phone-token-that-must-not-be-reused'

    // 1. Brak dedykowanego sekretu w trybie Supabase -> rzuca błąd bezpieczeństwa
    assert.throws(
      () => getCallSessionPhoneSecret(),
      CallSessionSecurityError,
      'Tryb Supabase musi rzucać błąd, gdy brak CALL_SESSION_PHONE_SECRET',
    )

    // 2. Zbyt krótki sekret (< 16 znaków) -> rzuca błąd bezpieczeństwa
    process.env.CALL_SESSION_PHONE_SECRET = 'short-secret'
    assert.throws(
      () => getCallSessionPhoneSecret(),
      CallSessionSecurityError,
      'Zbyt krótki CALL_SESSION_PHONE_SECRET musi rzucać błąd',
    )

    // 3. Prawidłowy dedykowany sekret (>= 16 znaków) -> zwraca wartość
    process.env.CALL_SESSION_PHONE_SECRET = 'super-secret-hmac-salt-at-least-16-chars'
    assert.equal(getCallSessionPhoneSecret(), 'super-secret-hmac-salt-at-least-16-chars')

    // 4. W trybie local/test bez sekretu -> dozwolony stały salt testowy
    delete process.env.CALL_SESSION_PHONE_SECRET
    process.env.APP_DATA_MODE = 'local'
    assert.equal(getCallSessionPhoneSecret(), 'call-session-test-salt')
  } finally {
    process.env.APP_DATA_MODE = originalMode
    if (originalSecret !== undefined) process.env.CALL_SESSION_PHONE_SECRET = originalSecret
    else delete process.env.CALL_SESSION_PHONE_SECRET
    if (originalServiceRole !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRole
    else delete process.env.SUPABASE_SERVICE_ROLE_KEY
    if (originalPhoneToken !== undefined) process.env.PHONE_AGENT_TOKEN = originalPhoneToken
    else delete process.env.PHONE_AGENT_TOKEN
  }
})

test('18. Regresja 5: Uszkodzony snapshot rzuca fail-closed (STORE_READ_ERROR), a identyczny retry po pełnym zapisie nie nalicza czasu', async () => {
  await withIsolatedStore(async (dataDir) => {
    const session = await createCallSession({
      bookingId: '00000000-0000-4000-8000-000000000020',
      phone: '518901234',
      limitSeconds: 900,
    })

    const snapshotPath = path.join(dataDir, 'call-sessions-snapshot.json')

    // Przejście z naliczeniem 150s pod dedykowanym kluczem idempotencji
    const first = await transitionCallSession({
      sessionId: session.id,
      targetState: 'interrupted',
      deltaSeconds: 150,
      idempotencyKey: 'retry-full-write-key',
    })
    assert.equal(first.elapsedSeconds, 150)
    assert.equal(first.remainingSeconds, 750)
    assert.equal(first.version, 2)

    // Identyczny retry po pełnym zapisie nie zmienia stanu ani czasu
    const retry = await transitionCallSession({
      sessionId: session.id,
      targetState: 'interrupted',
      deltaSeconds: 150,
      idempotencyKey: 'retry-full-write-key',
    })
    assert.equal(retry.elapsedSeconds, 150, 'Retry nie może naliczyć dodatkowego czasu')
    assert.equal(retry.remainingSeconds, 750)
    assert.equal(retry.version, 2, 'Retry nie może zwiększyć wersji')

    // Celowe uszkodzenie snapshotu (nieprawidłowy JSON)
    await writeFile(snapshotPath, '{ this is corrupted json syntax [}', 'utf8')

    // Każdy kolejny odczyt musi natychmiast rzucać fail-closed błąd STORE_READ_ERROR
    await assert.rejects(
      getCallSessionById(session.id),
      (err: any) => err instanceof CallSessionError && err.code === 'STORE_READ_ERROR',
    )
    await assert.rejects(
      createCallSession({
        bookingId: '00000000-0000-4000-8000-000000000021',
        phone: '519012345',
      }),
      (err: any) => err instanceof CallSessionError && err.code === 'STORE_READ_ERROR',
    )
  })
})

test('19. Regresja 6 i 7: Statyczna weryfikacja markerów SQL: blokada advisory lock i pełne sygnatury REVOKE/GRANT', async () => {
  const rootDir = process.cwd()
  const migrationPath = path.join(
    rootDir,
    'supabase',
    'migrations',
    '20261011001_call_sessions_durable_model.sql',
  )
  const schemaPath = path.join(rootDir, 'supabase', 'schema.sql')

  const migrationContent = await readFile(migrationPath, 'utf8')
  const schemaContent = await readFile(schemaPath, 'utf8')

  for (const [name, content] of [
    ['migration', migrationContent],
    ['schema', schemaContent],
  ]) {
    // 1. Advisory xact lock w SQL
    assert.ok(
      content.includes("perform pg_advisory_xact_lock(hashtext('call_session_idempotency:' || p_idempotency_key));"),
      `Brak markera pg_advisory_xact_lock w ${name}`,
    )

    // 2. Pełne sygnatury REVOKE
    assert.ok(
      content.includes(
        'revoke all on function public.create_call_session(uuid, uuid, text, text, integer, timestamptz, text, jsonb, text) from public, anon, authenticated;',
      ),
      `Brak pełnej sygnatury REVOKE create_call_session w ${name}`,
    )
    assert.ok(
      content.includes(
        'revoke all on function public.transition_call_session(uuid, text, integer, integer, text, text, jsonb, text, timestamptz, timestamptz, timestamptz) from public, anon, authenticated;',
      ),
      `Brak pełnej sygnatury REVOKE transition_call_session w ${name}`,
    )

    // 3. Pełne sygnatury GRANT
    assert.ok(
      content.includes(
        'grant execute on function public.create_call_session(uuid, uuid, text, text, integer, timestamptz, text, jsonb, text) to service_role;',
      ),
      `Brak pełnej sygnatury GRANT create_call_session w ${name}`,
    )
    assert.ok(
      content.includes(
        'grant execute on function public.transition_call_session(uuid, text, integer, integer, text, text, jsonb, text, timestamptz, timestamptz, timestamptz) to service_role;',
      ),
      `Brak pełnej sygnatury GRANT transition_call_session w ${name}`,
    )

    // 4. Ochrona naliczania czasu ze stanu active lub resumed
    assert.ok(
      content.includes("v_old_state not in ('active', 'resumed')"),
      `Brak reguły blokowania czasu poza active/resumed w ${name}`,
    )
  }
})

test('20. Regresja 7: Lokalna ochrona przed wyścigiem współbieżnych createCallSession z tym samym idempotency_key', async () => {
  await withIsolatedStore(async () => {
    const concurrentKey = 'concurrent-create-key-01'
    const payload = { source: 'concurrent_test' }

    // Równoległe wywołanie dwóch tworzeń sesji z tym samym kluczem idempotencji
    const [res1, res2] = await Promise.all([
      createCallSession({
        bookingId: '00000000-0000-4000-8000-000000000022',
        phone: '520123456',
        limitSeconds: 900,
        idempotencyKey: concurrentKey,
        payload,
      }),
      createCallSession({
        bookingId: '00000000-0000-4000-8000-000000000022',
        phone: '520123456',
        limitSeconds: 900,
        idempotencyKey: concurrentKey,
        payload,
      }),
    ])

    // Oba wywołania zwracają dokładnie tę samą sesję
    assert.equal(res1.id, res2.id)
    assert.equal(res1.version, 1)
    assert.equal(res2.version, 1)

    // W audycie powstało dokładnie jedno zdarzenie
    const events = await listCallSessionEvents(res1.id)
    const matchingEvents = events.filter((e) => e.idempotencyKey === concurrentKey)
    assert.equal(matchingEvents.length, 1)
  })
})

test('21. Regresja 8: getCallSessionByBookingId zwraca deterministycznie najnowszą sesję przy wielu historycznych', async () => {
  await withIsolatedStore(async () => {
    const bookingId = '00000000-0000-4000-8000-000000000023'

    const session1 = await createCallSession({
      bookingId,
      phone: '521234567',
      limitSeconds: 900,
    })

    // Symulacja upływu czasu
    await new Promise((resolve) => setTimeout(resolve, 20))

    const session2 = await createCallSession({
      bookingId,
      phone: '521234567',
      limitSeconds: 900,
    })

    // Najnowsza sesja musi mieć id session2
    const found = await getCallSessionByBookingId(bookingId)
    assert.ok(found)
    assert.equal(found?.id, session2.id)
    assert.notEqual(found?.id, session1.id)
  })
})

test('22. Regresja 9: Walidacja numeru przed fingerprintem — niepoprawny lub pusty numer ma fail-closed', () => {
  const invalidPhones = ['', '   ', 'invalid-phone', '1234', 'abcdefghi', '+481234']
  const testSecret = 'test-secret-at-least-16-chars'

  for (const invalid of invalidPhones) {
    assert.throws(
      () => computeCallerPhoneFingerprint(invalid, testSecret),
      CallSessionInvalidPhoneError,
      `Numer "${invalid}" powinien zostać odrzucony z CallSessionInvalidPhoneError`,
    )
  }

  // Poprawny polski numer nie rzuca błędu
  assert.doesNotThrow(() => computeCallerPhoneFingerprint('+48500600700', testSecret))
  assert.doesNotThrow(() => computeCallerPhoneFingerprint('500600700', testSecret))
})

test('23. Regresja 10: Bezstanowa sanitizacja regex — wielokrotne wywołania sanitizePayload nie gubią numerów przez lastIndex', () => {
  const phoneA = '500600700'
  const phoneB = '501234567'
  const phoneC = '502345678'
  const phoneD = '503456789'

  // Pierwsze wywołanie z dwoma numerami w tekście (niebędącym pojedynczym numerem)
  const result1 = sanitizePayload({ note: `Kontakt: ${phoneA} oraz backup: ${phoneB}` })
  assert.equal(result1.note, 'Kontakt: [REDACTED_PHONE] oraz backup: [REDACTED_PHONE]')

  // Bezpośrednie drugie wywołanie z innym, krótszym tekstem i innymi numerami
  const result2 = sanitizePayload({ note: `Tel1: ${phoneC} i Tel2: ${phoneD}` })
  assert.equal(
    result2.note,
    'Tel1: [REDACTED_PHONE] i Tel2: [REDACTED_PHONE]',
    'Drugie wywołanie nie może pominąć maskowania przez stan globalnego RegExp',
  )

  // Trzecie wywołanie z pojedynczym numerem zastępowanym w całości
  const result3 = sanitizePayload({ directPhone: phoneA })
  assert.equal(result3.directPhone, '[REDACTED_PHONE]')
})

test('24. Regresja 11: findActiveCallSessionByPhoneFingerprint deterministycznie zwraca najnowszą aktywną sesję', async () => {
  await withIsolatedStore(async () => {
    const rawPhone = '530123456'
    const session1 = await createCallSession({
      bookingId: '00000000-0000-4000-8000-000000000024',
      phone: rawPhone,
      limitSeconds: 900,
    })

    // Symulacja upływu czasu
    await new Promise((resolve) => setTimeout(resolve, 20))

    const session2 = await createCallSession({
      bookingId: '00000000-0000-4000-8000-000000000025',
      phone: rawPhone,
      limitSeconds: 900,
    })

    const found = await findActiveCallSessionByPhoneFingerprint(session1.callerPhoneFingerprint)
    assert.ok(found)
    assert.equal(found?.id, session2.id, 'Musi zwrócić najnowszą sesję (session2), a nie najstarszą')
    assert.notEqual(found?.id, session1.id)
  })
})

test('25. Regresja 12: Walidacja limitSeconds i deltaSeconds — wartości niedozwolone (< 0, 0, NaN, float) są odrzucane fail-closed', async () => {
  await withIsolatedStore(async () => {
    // 1. limitSeconds = 0 lub ujemny lub float
    await assert.rejects(
      createCallSession({
        bookingId: '00000000-0000-4000-8000-000000000026',
        phone: '531234567',
        limitSeconds: 0,
      }),
      CallSessionInvalidTimeError,
    )

    await assert.rejects(
      createCallSession({
        bookingId: '00000000-0000-4000-8000-000000000026',
        phone: '531234567',
        limitSeconds: -100,
      }),
      CallSessionInvalidTimeError,
    )

    await assert.rejects(
      createCallSession({
        bookingId: '00000000-0000-4000-8000-000000000026',
        phone: '531234567',
        limitSeconds: 15.5,
      }),
      CallSessionInvalidTimeError,
    )

    // 2. deltaSeconds = NaN lub ułamkowa
    const session = await createCallSession({
      bookingId: '00000000-0000-4000-8000-000000000027',
      phone: '532345678',
      limitSeconds: 900,
    })

    await assert.rejects(
      transitionCallSession({
        sessionId: session.id,
        targetState: 'interrupted',
        deltaSeconds: NaN as unknown as number,
      }),
      CallSessionInvalidTimeError,
    )

    await assert.rejects(
      transitionCallSession({
        sessionId: session.id,
        targetState: 'interrupted',
        deltaSeconds: 12.34,
      }),
      CallSessionInvalidTimeError,
    )
  })
})

test('26. Regresja 13: Unikalność sessionId w magazynie lokalnym oraz deterministyczny porządek chronologiczny listCallSessionEvents', async () => {
  await withIsolatedStore(async () => {
    const customId = '00000000-0000-4000-8000-000000000099'
    const session = await createCallSession({
      sessionId: customId,
      bookingId: '00000000-0000-4000-8000-000000000028',
      phone: '533456789',
      limitSeconds: 900,
      idempotencyKey: 'custom-id-key-01',
    })
    assert.equal(session.id, customId)

    // Próba utworzenia nowej sesji z tym samym sessionId (inny booking / bez pasującego klucza idempotencji)
    await assert.rejects(
      createCallSession({
        sessionId: customId,
        bookingId: '00000000-0000-4000-8000-000000000029',
        phone: '534567890',
        limitSeconds: 900,
      }),
      (err: any) => err instanceof CallSessionError && err.code === 'SESSION_ALREADY_EXISTS',
    )

    // Wykonanie kilku przejść z idempotencją
    await transitionCallSession({
      sessionId: session.id,
      targetState: 'interrupted',
      deltaSeconds: 60,
      idempotencyKey: 'custom-id-trans-01',
    })
    await transitionCallSession({
      sessionId: session.id,
      targetState: 'waiting_for_owner',
      idempotencyKey: 'custom-id-trans-02',
    })

    const events = await listCallSessionEvents(session.id)
    assert.equal(events.length, 3)
    // Sprawdzenie rosnącego porządku chronologicznego
    assert.equal(events[0].eventType, 'session_started')
    assert.equal(events[1].toState, 'interrupted')
    assert.equal(events[2].toState, 'waiting_for_owner')
    assert.ok(new Date(events[0].createdAt).getTime() <= new Date(events[1].createdAt).getTime())
    assert.ok(new Date(events[1].createdAt).getTime() <= new Date(events[2].createdAt).getTime())
  })
})
