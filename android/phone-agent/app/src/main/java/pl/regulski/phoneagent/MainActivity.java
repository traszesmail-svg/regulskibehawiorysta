package pl.regulski.phoneagent;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import android.net.Uri;
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
    private TextView status, cases;
    private SharedPreferences preferences;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        preferences = getSharedPreferences("phone_agent", Context.MODE_PRIVATE);
        requestPermissions(new String[]{Manifest.permission.CALL_PHONE, Manifest.permission.SEND_SMS, Manifest.permission.READ_PHONE_STATE}, 7);

        ScrollView scroll = new ScrollView(this);
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL); int pad = 28; layout.setPadding(pad, pad, pad, pad); scroll.addView(layout);

        TextView title = new TextView(this);
        title.setText("Regulski Operator");
        title.setTextSize(20);
        title.setTypeface(null, android.graphics.Typeface.BOLD);
        title.setPadding(0, 0, 0, 16);
        layout.addView(title);

        serverInput = field("Adres serwera", preferences.getString("server", "https://regulskibehawiorysta.pl"));
        tokenInput = field("Token telefonu", preferences.getString("token", "")); tokenInput.setInputType(0x81);
        layout.addView(serverInput); layout.addView(tokenInput);
        Button save = new Button(this); save.setText("Zapisz i uruchom Operatora"); save.setOnClickListener(v -> saveAndStart()); layout.addView(save);
        Button dialer = new Button(this); dialer.setText("Ustaw jako domyślny telefon (auto-rozłączanie)"); dialer.setOnClickListener(v -> requestDefaultDialer()); layout.addView(dialer);
        android.widget.CheckBox strict15Check = new android.widget.CheckBox(this); strict15Check.setText("Ścisłe 15 min (rozłącz od razu w 15:00)"); strict15Check.setChecked(preferences.getBoolean("strict_15_minutes", false)); strict15Check.setOnCheckedChangeListener((btn, isChecked) -> preferences.edit().putBoolean("strict_15_minutes", isChecked).apply()); layout.addView(strict15Check);
        Button battery = new Button(this); battery.setText("Wyłącz oszczędzanie baterii dla Operatora"); battery.setOnClickListener(v -> requestBatteryExemption()); layout.addView(battery);
        Button notifBtn = new Button(this); notifBtn.setText("Włącz odczyt powiadomień Revolut"); notifBtn.setOnClickListener(v -> requestNotificationListenerAccess()); layout.addView(notifBtn);
        Button heartbeatBtn = new Button(this); heartbeatBtn.setText("Wyślij meldunek teraz (Heartbeat)"); heartbeatBtn.setOnClickListener(v -> triggerManualHeartbeat()); layout.addView(heartbeatBtn);
        Button refresh = new Button(this); refresh.setText("Odśwież sprawy i SMS"); refresh.setOnClickListener(v -> { refreshCases(); checkSmsQueue(); }); layout.addView(refresh);
        Button enable = new Button(this); enable.setText("Włącz live na 1 godzinę"); enable.setOnClickListener(v -> changeLive("enable")); layout.addView(enable);
        Button disable = new Button(this); disable.setText("Wyłącz live"); disable.setOnClickListener(v -> changeLive("disable")); layout.addView(disable);
        status = new TextView(this); layout.addView(status);
        cases = new TextView(this); cases.setTextIsSelectable(true); layout.addView(cases);
        setContentView(scroll);
        refreshCases();
    }

    private void requestDefaultDialer() {
        android.telecom.TelecomManager telecom = (android.telecom.TelecomManager) getSystemService(Context.TELECOM_SERVICE);
        if (telecom != null && !getPackageName().equals(telecom.getDefaultDialerPackage())) {
            Intent intent = new Intent(android.telecom.TelecomManager.ACTION_CHANGE_DEFAULT_DIALER);
            intent.putExtra(android.telecom.TelecomManager.EXTRA_CHANGE_DEFAULT_DIALER_PACKAGE_NAME, getPackageName());
            startActivity(intent);
        } else {
            status.setText("Aplikacja jest już domyślnym telefonem — auto-rozłączanie jest aktywne.");
        }
    }

    private EditText field(String hint, String value) { EditText input = new EditText(this); input.setHint(hint); input.setText(value); return input; }
    private ApiClient api() { return new ApiClient(serverInput.getText().toString().trim(), tokenInput.getText().toString().trim()); }

    private void saveAndStart() {
        preferences.edit().putString("server", serverInput.getText().toString().trim()).putString("token", tokenInput.getText().toString().trim()).apply();
        startService(new Intent(this, PhoneAgentService.class));
        status.setText("Regulski Operator działa w tle (heartbeat co 1 min, SMS i rozmowy co 15s).");
        refreshCases();
        triggerManualHeartbeat();
    }
    private void requestBatteryExemption() {
        PowerManager power = (PowerManager) getSystemService(POWER_SERVICE);
        if (power.isIgnoringBatteryOptimizations(getPackageName())) {
            status.setText("Oszczędzanie baterii jest już wyłączone dla Operatora.");
            return;
        }
        startActivity(new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + getPackageName())));
    }
    private void requestNotificationListenerAccess() {
        startActivity(new Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS"));
    }
    private void triggerManualHeartbeat() {
        executor.execute(() -> {
            try {
                org.json.JSONObject payload = new org.json.JSONObject();
                payload.put("network", "Ręczny test");
                payload.put("appVersion", "1.1.0");
                org.json.JSONObject res = api().post("/api/phone-agent/heartbeat", payload);
                runOnUiThread(() -> status.setText("Heartbeat wysłany pomyślnie. Serwer potwierdził stan: " + res.optJSONObject("state")));
            } catch (Exception e) {
                runOnUiThread(() -> status.setText("Błąd wysyłania heartbeat: " + e.getMessage()));
            }
        });
    }
    private void checkSmsQueue() {
        executor.execute(() -> {
            try {
                org.json.JSONObject res = api().get("/api/phone-agent/sms-queue?all=true");
                org.json.JSONArray items = res.optJSONArray("items");
                int count = items != null ? items.length() : 0;
                runOnUiThread(() -> status.setText("Kolejka SMS: " + count + " wiadomości w bazie."));
            } catch (Exception e) {
                runOnUiThread(() -> status.setText("Nie pobrano kolejki SMS: " + e.getMessage()));
            }
        });
    }
    private void refreshCases() {
        executor.execute(() -> { try { final String text = ApiClient.casesSummary(api().get("/api/phone-agent/cases").optJSONArray("cases")); runOnUiThread(() -> cases.setText(text)); }
        catch (Exception e) { runOnUiThread(() -> status.setText("Nie pobrano spraw: " + e.getMessage())); } });
    }
    private void changeLive(String action) {
        executor.execute(() -> { try { api().post("/api/phone-agent/live", new org.json.JSONObject().put("action", action)); runOnUiThread(() -> status.setText(action.equals("enable") ? "Live włączone." : "Live wyłączone.")); }
        catch (Exception e) { runOnUiThread(() -> status.setText("Zmiana live nieudana: " + e.getMessage())); } });
    }
}
