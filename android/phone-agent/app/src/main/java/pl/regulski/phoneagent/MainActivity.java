package pl.regulski.phoneagent;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.os.Build;
import android.speech.tts.TextToSpeech;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONObject;

public final class MainActivity extends Activity {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private EditText serverInput, tokenInput, manualCallNumber;
    private TextView status, jobDetailsView;
    private SharedPreferences preferences;
    private TextToSpeech tts;
    private volatile boolean ttsReady = false;

    private String currentJobId = null;
    private String currentJobPhone = null;
    private String currentVoiceBriefing = null;

    private Button speakBriefingButton;
    private Button stopSpeakingButton;
    private Button callJobButton;
    private Button reportSuccessButton;
    private Button reportNoAnswerButton;
    private Button reportFailedButton;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        preferences = getSharedPreferences("phone_agent", Context.MODE_PRIVATE);
        initTts();

        ScrollView scroll = new ScrollView(this);
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        int pad = 24;
        layout.setPadding(pad, pad, pad, pad);
        scroll.addView(layout);

        TextView title = new TextView(this);
        title.setText("Regulski Operator v1.5.0 (Voice)");
        title.setTextSize(20);
        title.setTypeface(null, android.graphics.Typeface.BOLD);
        title.setPadding(0, 0, 0, 12);
        layout.addView(title);

        // ==================== SEKCJA 1: ROZMOWY & LEKTOR TTS ====================
        layout.addView(sectionHeader("ZLECENIE ROZMOWY & LEKTOR"));

        Button fetchJobButton = new Button(this);
        fetchJobButton.setText("Pobierz bieżącą sprawę do rozmowy");
        fetchJobButton.setOnClickListener(v -> fetchCurrentJob());
        layout.addView(fetchJobButton);

        jobDetailsView = new TextView(this);
        jobDetailsView.setText("Kliknij powyżej, aby pobrać oczekujące zlecenie rozmowy.");
        jobDetailsView.setTextSize(13);
        jobDetailsView.setBackgroundColor(0xFFEFEFEF);
        jobDetailsView.setPadding(16, 16, 16, 16);
        layout.addView(jobDetailsView);

        speakBriefingButton = new Button(this);
        speakBriefingButton.setText("Lektor: Odsłuchaj briefing sprawy");
        speakBriefingButton.setEnabled(false);
        speakBriefingButton.setOnClickListener(v -> speakBriefing(currentVoiceBriefing));
        layout.addView(speakBriefingButton);

        stopSpeakingButton = new Button(this);
        stopSpeakingButton.setText("Zatrzymaj lektora");
        stopSpeakingButton.setEnabled(false);
        stopSpeakingButton.setOnClickListener(v -> stopSpeaking());
        layout.addView(stopSpeakingButton);

        Button testTtsButton = new Button(this);
        testTtsButton.setText("Test głosu lektora (PL)");
        testTtsButton.setOnClickListener(v -> speakBriefing("Dzień dobry. To jest testowy briefing lektora w telefonie operatora Regulski Behawiorysta. Lektor działa poprawnie."));
        layout.addView(testTtsButton);

        callJobButton = new Button(this);
        callJobButton.setText("Zadzwoń do klienta ze sprawy");
        callJobButton.setEnabled(false);
        callJobButton.setOnClickListener(v -> callCurrentJob());
        layout.addView(callJobButton);

        LinearLayout reportRow = new LinearLayout(this);
        reportRow.setOrientation(LinearLayout.HORIZONTAL);

        reportSuccessButton = new Button(this);
        reportSuccessButton.setText("Rozmowa udana");
        reportSuccessButton.setEnabled(false);
        reportSuccessButton.setOnClickListener(v -> reportJobEvent("ended", null));
        reportRow.addView(reportSuccessButton, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f));

        reportNoAnswerButton = new Button(this);
        reportNoAnswerButton.setText("Brak odp. (za 2 min)");
        reportNoAnswerButton.setEnabled(false);
        reportNoAnswerButton.setOnClickListener(v -> reportJobEvent("no_answer", null));
        reportRow.addView(reportNoAnswerButton, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f));

        reportFailedButton = new Button(this);
        reportFailedButton.setText("Błąd");
        reportFailedButton.setEnabled(false);
        reportFailedButton.setOnClickListener(v -> reportJobEvent("failed", "Połączenie nie mogło zostać zrealizowane"));
        reportRow.addView(reportFailedButton, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f));

        layout.addView(reportRow);

        // ==================== SEKCJA 2: POŁĄCZENIE RĘCZNE ====================
        layout.addView(sectionHeader("POŁĄCZENIE RĘCZNE"));

        manualCallNumber = field("Numer do połączenia", "");
        manualCallNumber.setInputType(android.text.InputType.TYPE_CLASS_PHONE);
        layout.addView(manualCallNumber);

        Button manualCallBtn = new Button(this);
        manualCallBtn.setText("Zadzwoń pod wpisany numer");
        manualCallBtn.setOnClickListener(v -> {
            String number = manualCallNumber.getText().toString().trim();
            dialNumber(number);
        });
        layout.addView(manualCallBtn);

        Button endCallBtn = new Button(this);
        endCallBtn.setText("Zakończ połączenie");
        endCallBtn.setOnClickListener(v -> endActiveCall());
        layout.addView(endCallBtn);

        // ==================== SEKCJA 3: WYSYŁKA SMS & MODEM ====================
        layout.addView(sectionHeader("WYSYŁKA SMS & MODEM SIM"));

        Button startMonitor = new Button(this);
        startMonitor.setText("Uruchom monitorowanie (bez wysyłki SMS)");
        startMonitor.setOnClickListener(v -> startMonitoring(false));
        layout.addView(startMonitor);

        Button startSms = new Button(this);
        startSms.setText("Włącz wysyłkę SMS projektu");
        startSms.setOnClickListener(v -> new android.app.AlertDialog.Builder(this)
            .setMessage("Telefon rozpocznie wysyłanie oczekujących SMS-ów z karty SIM. Karta musi być doładowana.")
            .setPositiveButton("Włącz wysyłkę", (dialog, which) -> startMonitoring(true))
            .setNegativeButton("Anuluj", null).show());
        layout.addView(startSms);

        Button stopOperator = new Button(this);
        stopOperator.setText("Zatrzymaj operatora");
        stopOperator.setOnClickListener(v -> {
            synchronized (SmsQueueService.SEND_LOCK) {
                preferences.edit().putBoolean("operator_enabled", false).putBoolean("sms_enabled", false).commit();
            }
            stopService(new Intent(this, SmsQueueService.class));
            status.setText("Operator zatrzymany. Nie pobiera nowych SMS-ów.");
        });
        layout.addView(stopOperator);

        Button notifications = new Button(this);
        notifications.setText("Włącz odczyt powiadomień Revolut");
        notifications.setOnClickListener(v -> requestNotificationListenerAccess());
        layout.addView(notifications);

        Button heartbeat = new Button(this);
        heartbeat.setText("Wyślij meldunek testowy");
        heartbeat.setOnClickListener(v -> triggerManualHeartbeat());
        layout.addView(heartbeat);

        // ==================== SEKCJA 4: KONFIGURACJA SERWERA ====================
        layout.addView(sectionHeader("KONFIGURACJA SERWERA"));

        String initialServer = getIntent().getStringExtra("server");
        if (initialServer == null || initialServer.isEmpty()) initialServer = preferences.getString("server", "https://regulskibehawiorysta.pl");
        String initialToken = getIntent().getStringExtra("token");
        if (initialToken == null || initialToken.isEmpty()) initialToken = preferences.getString("token", "");
        serverInput = field("Adres serwera", initialServer);
        tokenInput = field("Token telefonu", initialToken);
        tokenInput.setInputType(0x81);
        layout.addView(serverInput);
        layout.addView(tokenInput);

        Button saveConfig = new Button(this);
        saveConfig.setText("Zapisz konfigurację serwera");
        saveConfig.setOnClickListener(v -> saveConfiguration());
        layout.addView(saveConfig);

        // Status view
        status = new TextView(this);
        status.setText(preferences.getBoolean("operator_enabled", false)
            ? (preferences.getBoolean("sms_enabled", false) ? "Wysyłka SMS włączona." : "Monitorowanie bez wysyłki SMS.")
            : "Tryb konfiguracji. Wysyłka SMS wyłączona.");
        status.append("\n" + SmsJournal.summary(this));
        status.setPadding(0, 18, 0, 0);
        layout.addView(status);

        setContentView(scroll);

        if (getIntent().getBooleanExtra("start_sms", false)) {
            startMonitoring(true);
        } else if (getIntent().getBooleanExtra("start_monitor", false)) {
            startMonitoring(false);
        } else if (getIntent().getBooleanExtra("auto_save", false)) {
            saveConfiguration();
        } else if (getIntent().getBooleanExtra("check_job", false)) {
            fetchCurrentJob();
        } else if (getIntent().hasExtra("speak_text")) {
            final String textToSpeak = getIntent().getStringExtra("speak_text");
            layout.postDelayed(() -> speakBriefing(textToSpeak), 1200L);
        }
    }

    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        android.util.Log.i("PhoneAgent", "onNewIntent otrzymany! has speak_text=" + (intent != null && intent.hasExtra("speak_text")));
        if (intent != null && intent.hasExtra("speak_text")) {
            speakBriefing(intent.getStringExtra("speak_text"));
        } else if (intent != null && intent.getBooleanExtra("check_job", false)) {
            fetchCurrentJob();
        }
    }

    private TextView sectionHeader(String title) {
        TextView tv = new TextView(this);
        tv.setText(title);
        tv.setTextSize(14);
        tv.setTypeface(null, android.graphics.Typeface.BOLD);
        tv.setPadding(0, 20, 0, 6);
        tv.setTextColor(0xFF1E5C51);
        return tv;
    }

    private String pendingSpeakText = null;

    private void initTts() {
        try {
            android.util.Log.i("PhoneAgent", "Inicjalizacja TTS...");
            tts = new TextToSpeech(getApplicationContext(), status -> {
                android.util.Log.i("PhoneAgent", "TTS onInit status: " + status);
                if (status == TextToSpeech.SUCCESS) {
                    Locale pl = new Locale("pl", "PL");
                    int res = tts.setLanguage(pl);
                    if (res == TextToSpeech.LANG_MISSING_DATA || res == TextToSpeech.LANG_NOT_SUPPORTED) {
                        int resAlt = tts.setLanguage(new Locale("pl"));
                        ttsReady = (resAlt != TextToSpeech.LANG_MISSING_DATA && resAlt != TextToSpeech.LANG_NOT_SUPPORTED);
                    } else {
                        ttsReady = true;
                    }
                    if (ttsReady) {
                        tts.setSpeechRate(0.95f);
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                            android.media.AudioAttributes audioAttributes = new android.media.AudioAttributes.Builder()
                                .setUsage(android.media.AudioAttributes.USAGE_VOICE_COMMUNICATION)
                                .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SPEECH)
                                .build();
                            tts.setAudioAttributes(audioAttributes);
                        }
                        android.util.Log.i("PhoneAgent", "TTS gotowy (język PL załadowany).");
                        if (pendingSpeakText != null) {
                            final String toSpeak = pendingSpeakText;
                            pendingSpeakText = null;
                            runOnUiThread(() -> speakBriefing(toSpeak));
                        }
                    } else {
                        android.util.Log.w("PhoneAgent", "Język polski TTS niedostępny.");
                    }
                }
            });
        } catch (Exception e) {
            android.util.Log.e("PhoneAgent", "Błąd init TTS: " + e.getMessage(), e);
            ttsReady = false;
        }
    }

    private void speakBriefing(String text) {
        android.util.Log.i("PhoneAgent", "speakBriefing żądanie: " + text + ", ttsReady=" + ttsReady);
        if (text == null || text.trim().isEmpty()) {
            status.setText("Brak tekstu briefingu do odczytania.");
            return;
        }
        if (tts == null || !ttsReady) {
            pendingSpeakText = text;
            status.setText("Silnik syntezy mowy (TTS) oczekuje na inicjalizację...");
            return;
        }
        try {
            android.media.AudioManager am = (android.media.AudioManager) getSystemService(Context.AUDIO_SERVICE);
            if (am != null) {
                // KLUCZOWE: MODE_IN_CALL bez głośnika.
                // STREAM_VOICE_CALL w tym trybie idzie przez sprzętowy tor głosowy DSP
                // i jest mieszany do uplinku rozmowy (rozmówca słyszy TTS).
                // setSpeakerphoneOn(true) włącza głośnik i AEC wycisza mikrofon → rozmówca nic nie słyszy.
                am.setMode(android.media.AudioManager.MODE_IN_CALL);
                am.setSpeakerphoneOn(false);  // WYŁĄCZ głośnik – TTS idzie przez DSP do linii
                int maxVol = am.getStreamMaxVolume(android.media.AudioManager.STREAM_VOICE_CALL);
                am.setStreamVolume(android.media.AudioManager.STREAM_VOICE_CALL, maxVol, 0);
                android.util.Log.i("PhoneAgent", "STREAM_VOICE_CALL vol=" + maxVol + " speakerphone=OFF mode=IN_CALL");
            }
            tts.stop();
            tts.setSpeechRate(0.85f);

            // Ustaw AudioAttributes na VOICE_COMMUNICATION żeby TTS szedł w tor głosowy
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                android.media.AudioAttributes voiceAttr = new android.media.AudioAttributes.Builder()
                    .setUsage(android.media.AudioAttributes.USAGE_VOICE_COMMUNICATION)
                    .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build();
                tts.setAudioAttributes(voiceAttr);

                android.os.Bundle params = new android.os.Bundle();
                params.putInt(TextToSpeech.Engine.KEY_PARAM_STREAM, android.media.AudioManager.STREAM_VOICE_CALL);
                params.putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, 1.0f);
                int speakRes = tts.speak(text, TextToSpeech.QUEUE_FLUSH, params, "briefing_" + System.currentTimeMillis());
                android.util.Log.i("PhoneAgent", "tts.speak wynik: " + speakRes);
            } else {
                tts.speak(text, TextToSpeech.QUEUE_FLUSH, null);
            }
            status.setText("Lektor czyta: " + text);
        } catch (Exception e) {
            android.util.Log.e("PhoneAgent", "Błąd odczytu lektora: " + e.getMessage(), e);
            status.setText("Błąd odczytu lektora: " + e.getMessage());
        }
    }

    private void stopSpeaking() {
        if (tts != null) {
            try {
                tts.stop();
                status.setText("Lektor zatrzymany.");
            } catch (Exception ignored) {}
        }
    }

    private void fetchCurrentJob() {
        status.setText("Pobieram bieżące zlecenie z serwera...");
        final ApiClient client = api();
        executor.execute(() -> {
            try {
                JSONObject res = client.get("/api/phone-agent/job");
                JSONObject job = res.optJSONObject("job");
                runOnUiThread(() -> {
                    if (job == null) {
                        currentJobId = null;
                        currentJobPhone = null;
                        currentVoiceBriefing = null;
                        jobDetailsView.setText("Brak oczekujących zleceń rozmowy (phone_agent_pending).");
                        speakBriefingButton.setEnabled(false);
                        stopSpeakingButton.setEnabled(false);
                        callJobButton.setEnabled(false);
                        reportSuccessButton.setEnabled(false);
                        reportNoAnswerButton.setEnabled(false);
                        reportFailedButton.setEnabled(false);
                        status.setText("Brak oczekujących zleceń rozmowy.");
                        return;
                    }

                    currentJobId = job.optString("id");
                    currentJobPhone = job.optString("phone");
                    String owner = job.optString("ownerName");
                    String animal = job.optString("animalType");
                    String problem = job.optString("problemType");
                    String age = job.optString("petAge");
                    String desc = job.optString("description");
                    String date = job.optString("bookingDate");
                    String time = job.optString("bookingTime");
                    String briefing = job.optString("voiceBriefing");

                    if (briefing != null && !briefing.trim().isEmpty()) {
                        currentVoiceBriefing = briefing;
                    } else {
                        currentVoiceBriefing = "Rozmowa z opiekunem: " + owner + ". Zwierzak: " + animal + ". Problem: " + problem + ". Szczegóły: " + desc;
                    }

                    manualCallNumber.setText(currentJobPhone);

                    StringBuilder sb = new StringBuilder();
                    sb.append("KLIENT: ").append(owner).append(" (").append(currentJobPhone).append(")\n");
                    sb.append("TERMIN: ").append(date).append(" godz. ").append(time).append("\n");
                    sb.append("ZWIERZAK: ").append(animal);
                    if (!age.isEmpty()) sb.append(", wiek: ").append(age);
                    sb.append("\nPROBLEM: ").append(problem).append("\n");
                    if (!desc.isEmpty()) sb.append("OPIS: ").append(desc).append("\n");
                    sb.append("\n[BRIEFING LEKTORA]:\n").append(currentVoiceBriefing);

                    jobDetailsView.setText(sb.toString());
                    speakBriefingButton.setEnabled(true);
                    stopSpeakingButton.setEnabled(true);
                    callJobButton.setEnabled(true);
                    reportSuccessButton.setEnabled(true);
                    reportNoAnswerButton.setEnabled(true);
                    reportFailedButton.setEnabled(true);

                    status.setText("Pobrano zlecenie dla: " + owner + " (" + currentJobPhone + ")");
                });
            } catch (Exception e) {
                runOnUiThread(() -> status.setText("Błąd pobierania zlecenia: " + e.getMessage()));
            }
        });
    }

    private void callCurrentJob() {
        if (currentJobId == null || currentJobPhone == null) {
            status.setText("Brak pobranego zlecenia do wykonania połączenia.");
            return;
        }
        final String jobId = currentJobId;
        final String phone = currentJobPhone;
        final ApiClient client = api();

        status.setText("Rejestruję rozpoczęcie połączenia (claimed)...");
        executor.execute(() -> {
            try {
                JSONObject payload = new JSONObject();
                payload.put("bookingId", jobId);
                payload.put("event", "claimed");
                client.post("/api/phone-agent/job", payload);
            } catch (Exception ignored) {}
            runOnUiThread(() -> dialNumber(phone));
        });
    }

    private void reportJobEvent(String event, String errorMsg) {
        if (currentJobId == null) {
            status.setText("Brak aktywnego zlecenia do zaraportowania.");
            return;
        }
        final String jobId = currentJobId;
        final ApiClient client = api();
        status.setText("Wysyłam raport: " + event + "...");
        executor.execute(() -> {
            try {
                JSONObject payload = new JSONObject();
                payload.put("bookingId", jobId);
                payload.put("event", event);
                if (errorMsg != null) payload.put("error", errorMsg);
                client.post("/api/phone-agent/job", payload);
                runOnUiThread(() -> {
                    status.setText("Raport '" + event + "' zapisany pomyślnie na serwerze.");
                    fetchCurrentJob();
                });
            } catch (Exception e) {
                runOnUiThread(() -> status.setText("Błąd wysyłania raportu " + event + ": " + e.getMessage()));
            }
        });
    }

    private String normalizeDialNumber(String raw) {
        String number = raw == null ? "" : raw.replaceAll("[\\s()\\-]", "");
        if (number.matches("[0-9]{9}")) return "+48" + number;
        if (number.matches("48[0-9]{9}")) return "+" + number;
        if (number.matches("00[1-9][0-9]{8,14}")) return "+" + number.substring(2);
        if (number.matches("\\+[1-9][0-9]{8,14}")) return number;
        return null;
    }

    private void dialNumber(String number) {
        String normalizedNumber = normalizeDialNumber(number);
        if (normalizedNumber == null) {
            status.setText("Podaj poprawny numer telefonu.");
            return;
        }
        if (checkSelfPermission(android.Manifest.permission.CALL_PHONE) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{android.Manifest.permission.CALL_PHONE, android.Manifest.permission.ANSWER_PHONE_CALLS}, 8);
            return;
        }
        try {
            startActivity(new Intent(Intent.ACTION_CALL, android.net.Uri.fromParts("tel", normalizedNumber, null)));
            status.setText("Nawiązywanie połączenia z " + number);
        } catch (Exception error) {
            status.setText("Nie udało się rozpocząć połączenia: " + error.getMessage());
        }
    }

    private void endActiveCall() {
        try {
            if (Build.VERSION.SDK_INT >= 28) {
                android.telecom.TelecomManager telecom = (android.telecom.TelecomManager) getSystemService(TELECOM_SERVICE);
                if (telecom != null) {
                    boolean ok = telecom.endCall();
                    status.setText(ok ? "Połączenie zakończone." : "Brak aktywnego połączenia do zakończenia.");
                    return;
                }
            }
            status.setText("Zakończenie połączenia wymaga API 28+.");
        } catch (Exception error) {
            status.setText("Nie udało się zakończyć połączenia: " + error.getMessage());
        }
    }

    private EditText field(String hint, String value) {
        EditText input = new EditText(this);
        input.setHint(hint);
        input.setText(value);
        return input;
    }

    private ApiClient api() {
        return new ApiClient(serverInput.getText().toString().trim(), tokenInput.getText().toString().trim());
    }

    private void saveConfiguration() {
        if (!persistConfiguration()) return;
        status.setText("Konfiguracja zapisana. Operator zatrzymany; możesz uruchomić monitorowanie.");
    }

    private boolean persistConfiguration() {
        String server = serverInput.getText().toString().trim();
        String token = tokenInput.getText().toString().trim();
        android.net.Uri uri = android.net.Uri.parse(server);
        if (!"https".equals(uri.getScheme()) || uri.getHost() == null || token.isEmpty()) {
            status.setText("Podaj adres HTTPS serwera i token telefonu.");
            return false;
        }
        synchronized (SmsQueueService.SEND_LOCK) {
            if (!preferences.edit().putString("server", server).putString("token", token)
                .putBoolean("operator_enabled", false).putBoolean("sms_enabled", false).commit()) {
                status.setText("Nie udało się zapisać konfiguracji.");
                return false;
            }
        }
        stopService(new Intent(this, SmsQueueService.class));
        return true;
    }

    private void startMonitoring(boolean allowSms) {
        if (allowSms && checkSelfPermission(android.Manifest.permission.SEND_SMS) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{android.Manifest.permission.SEND_SMS}, 9);
            status.setText("Po nadaniu uprawnienia ponownie włącz wysyłkę SMS.");
            return;
        }
        if (!persistConfiguration()) return;
        if (!preferences.edit().putBoolean("operator_enabled", true).putBoolean("sms_enabled", allowSms).commit()) {
            status.setText("Nie udało się zapisać trybu pracy.");
            return;
        }
        Intent service = new Intent(this, SmsQueueService.class);
        try {
            if (Build.VERSION.SDK_INT >= 26) startForegroundService(service); else startService(service);
            status.setText(allowSms ? "Wysyłka SMS projektu włączona." : "Monitorowanie uruchomione. Wysyłka SMS wyłączona.");
        } catch (Exception error) {
            preferences.edit().putBoolean("operator_enabled", false).putBoolean("sms_enabled", false).commit();
            status.setText("Nie udało się uruchomić operatora: " + error.getMessage());
        }
    }

    private void requestNotificationListenerAccess() {
        startActivity(new Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS"));
    }

    private void triggerManualHeartbeat() {
        final ApiClient client = api();
        executor.execute(() -> {
            try {
                JSONObject payload = new JSONObject();
                payload.put("network", "Ręczny test");
                String version = "1.5.0-voice";
                try {
                    version = getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
                } catch (Exception ignored) {}
                payload.put("appVersion", version);
                client.post("/api/phone-agent/heartbeat", payload);
                runOnUiThread(() -> status.setText("Meldunek testowy wysłany pomyślnie."));
            } catch (Exception e) {
                runOnUiThread(() -> status.setText("Błąd meldunku testowego: " + e.getMessage()));
            }
        });
    }

    @Override public void onDestroy() {
        if (tts != null) {
            try {
                tts.stop();
                tts.shutdown();
            } catch (Exception ignored) {}
        }
        executor.shutdownNow();
        super.onDestroy();
    }
}
