package pl.regulski.phoneagent;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.os.Build;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class MainActivity extends Activity {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private EditText serverInput, tokenInput;
    private TextView status;
    private SharedPreferences preferences;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        preferences = getSharedPreferences("phone_agent", Context.MODE_PRIVATE);
        ScrollView scroll = new ScrollView(this);
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        int pad = 28;
        layout.setPadding(pad, pad, pad, pad);
        scroll.addView(layout);

        TextView title = new TextView(this);
        title.setText("Regulski Operator");
        title.setTextSize(20);
        title.setTypeface(null, android.graphics.Typeface.BOLD);
        title.setPadding(0, 0, 0, 16);
        layout.addView(title);

        String initialServer = getIntent().getStringExtra("server");
        if (initialServer == null || initialServer.isEmpty()) initialServer = preferences.getString("server", "https://regulskibehawiorysta.pl");
        String initialToken = getIntent().getStringExtra("token");
        if (initialToken == null || initialToken.isEmpty()) initialToken = preferences.getString("token", "");
        serverInput = field("Adres serwera", initialServer);
        tokenInput = field("Token telefonu", initialToken);
        tokenInput.setInputType(0x81);
        layout.addView(serverInput);
        layout.addView(tokenInput);

        Button save = new Button(this);
        save.setText("Zapisz konfigurację");
        save.setOnClickListener(v -> saveConfiguration());
        layout.addView(save);

        Button start = new Button(this);
        start.setText("Uruchom monitorowanie (bez SMS)");
        start.setOnClickListener(v -> startMonitoring(false));
        layout.addView(start);
        Button send = new Button(this);
        send.setText("Włącz wysyłkę SMS projektu");
        send.setOnClickListener(v -> new android.app.AlertDialog.Builder(this)
            .setMessage("Telefon rozpocznie wysyłanie oczekujących SMS-ów z karty SIM. Karta musi być doładowana.")
            .setPositiveButton("Włącz wysyłkę", (dialog, which) -> startMonitoring(true))
            .setNegativeButton("Anuluj", null).show());
        layout.addView(send);
        Button stop = new Button(this);
        stop.setText("Zatrzymaj operatora");
        stop.setOnClickListener(v -> {
            synchronized (SmsQueueService.SEND_LOCK) {
                preferences.edit().putBoolean("operator_enabled", false).putBoolean("sms_enabled", false).commit();
            }
            stopService(new Intent(this, SmsQueueService.class));
            status.setText("Operator zatrzymany. Nie pobiera nowych SMS-ów. Rozpoczętej wysyłki nie można cofnąć.");
        });
        layout.addView(stop);

        Button notifications = new Button(this);
        notifications.setText("Włącz odczyt powiadomień Revolut");
        notifications.setOnClickListener(v -> requestNotificationListenerAccess());
        layout.addView(notifications);

        Button heartbeat = new Button(this);
        heartbeat.setText("Wyślij meldunek testowy");
        heartbeat.setOnClickListener(v -> triggerManualHeartbeat());
        layout.addView(heartbeat);

        status = new TextView(this);
        status.setText(preferences.getBoolean("operator_enabled", false)
            ? (preferences.getBoolean("sms_enabled", false) ? "Wysyłka SMS włączona." : "Monitorowanie bez wysyłki SMS.")
            : "Tryb konfiguracji. Wysyłka SMS wyłączona.");
        status.append("\n" + SmsJournal.summary(this));
        EditText callNumber = field("Numer do połączenia", "");
        callNumber.setInputType(android.text.InputType.TYPE_CLASS_PHONE);
        layout.addView(callNumber);
        Button callButton = new Button(this);
        callButton.setText("Zadzwoń");
        callButton.setOnClickListener(v -> {
            String number = callNumber.getText().toString().trim();
            if (!number.matches("\\+?[0-9]{9,15}")) { status.setText("Podaj poprawny numer telefonu."); return; }
            if (checkSelfPermission(android.Manifest.permission.CALL_PHONE) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{android.Manifest.permission.CALL_PHONE, android.Manifest.permission.ANSWER_PHONE_CALLS}, 8);
                return;
            }
            try {
                startActivity(new Intent(Intent.ACTION_CALL, android.net.Uri.fromParts("tel", number, null)));
            } catch (Exception error) { status.setText("Nie udało się rozpocząć połączenia: " + error.getMessage()); }
        });
        layout.addView(callButton);
        Button endCall = new Button(this);
        endCall.setText("Zakończ połączenie");
        endCall.setOnClickListener(v -> {
            try {
                if (Build.VERSION.SDK_INT >= 28) {
                    android.telecom.TelecomManager telecom = (android.telecom.TelecomManager) getSystemService(TELECOM_SERVICE);
                    status.setText(telecom.endCall() ? "Połączenie zakończone." : "Brak połączenia do zakończenia.");
                }
            } catch (Exception error) { status.setText("Nie udało się zakończyć połączenia: " + error.getMessage()); }
        });
        layout.addView(endCall);
        status.setPadding(0, 18, 0, 0);
        layout.addView(status);
        setContentView(scroll);
        if (getIntent().getBooleanExtra("start_sms", false)) {
            startMonitoring(true);
        } else if (getIntent().getBooleanExtra("start_monitor", false)) {
            startMonitoring(false);
        } else if (getIntent().getBooleanExtra("auto_save", false)) {
            saveConfiguration();
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
        status.setText("Konfiguracja zapisana. Operator zatrzymany; możesz uruchomić monitorowanie bez SMS.");
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
                org.json.JSONObject payload = new org.json.JSONObject();
                payload.put("network", "Ręczny test");
                payload.put("appVersion", "1.4.0-setup");
                client.post("/api/phone-agent/heartbeat", payload);
                runOnUiThread(() -> status.setText("Meldunek testowy wysłany pomyślnie."));
            } catch (Exception e) {
                runOnUiThread(() -> status.setText("Błąd meldunku testowego: " + e.getMessage()));
            }
        });
    }

    @Override public void onDestroy() {
        executor.shutdownNow();
        super.onDestroy();
    }
}
