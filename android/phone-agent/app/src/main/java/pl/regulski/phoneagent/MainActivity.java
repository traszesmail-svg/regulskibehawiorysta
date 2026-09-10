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
        serverInput = field("Adres serwera", preferences.getString("server", "https://regulskibehawiorysta.pl"));
        tokenInput = field("Token telefonu", preferences.getString("token", "")); tokenInput.setInputType(0x81);
        layout.addView(serverInput); layout.addView(tokenInput);
        Button save = new Button(this); save.setText("Zapisz i uruchom agenta"); save.setOnClickListener(v -> saveAndStart()); layout.addView(save);
        Button battery = new Button(this); battery.setText("Wyłącz oszczędzanie baterii dla agenta"); battery.setOnClickListener(v -> requestBatteryExemption()); layout.addView(battery);
        Button refresh = new Button(this); refresh.setText("Odśwież sprawy"); refresh.setOnClickListener(v -> refreshCases()); layout.addView(refresh);
        Button enable = new Button(this); enable.setText("Włącz live na 1 godzinę"); enable.setOnClickListener(v -> changeLive("enable")); layout.addView(enable);
        Button disable = new Button(this); disable.setText("Wyłącz live"); disable.setOnClickListener(v -> changeLive("disable")); layout.addView(disable);
        status = new TextView(this); layout.addView(status);
        cases = new TextView(this); cases.setTextIsSelectable(true); layout.addView(cases);
        setContentView(scroll);
        refreshCases();
    }

    private EditText field(String hint, String value) { EditText input = new EditText(this); input.setHint(hint); input.setText(value); return input; }
    private ApiClient api() { return new ApiClient(serverInput.getText().toString().trim(), tokenInput.getText().toString().trim()); }

    private void saveAndStart() {
        preferences.edit().putString("server", serverInput.getText().toString().trim()).putString("token", tokenInput.getText().toString().trim()).apply();
        startService(new Intent(this, PhoneAgentService.class)); status.setText("Agent telefonu działa w tle i sprawdza kolejkę co 15 sekund."); refreshCases();
    }
    private void requestBatteryExemption() {
        PowerManager power = (PowerManager) getSystemService(POWER_SERVICE);
        if (power.isIgnoringBatteryOptimizations(getPackageName())) {
            status.setText("Oszczędzanie baterii jest już wyłączone dla agenta.");
            return;
        }
        startActivity(new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + getPackageName())));
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
