package pl.regulski.phoneagent;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.media.AudioManager;
import android.media.ToneGenerator;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.BatteryManager;
import android.os.Handler;
import android.os.IBinder;
import android.os.Vibrator;
import android.telecom.TelecomManager;
import android.telephony.PhoneStateListener;
import android.telephony.SmsManager;
import android.telephony.TelephonyManager;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class PhoneAgentService extends Service {
    private final Handler handler = new Handler();
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private String currentBookingId;
    private boolean callWentOffHook;
    private long callConnectedAt = 0;
    private final Runnable startSignal = () -> signal(1, "Dzień dobry! Start 15 minut konsultacji.");
    private final Runnable halfSignal = () -> signal(2, "Minęło 7,5 minuty — czas przejść do meritum.");
    private final Runnable summarySignal = () -> signal(3, "Minęło 15 minut — czas na podsumowanie i pożegnanie (2 minuty).");
    private final Runnable preEndWarning = () -> signal(1, "Ostrzeżenie: za kilka sekund nastąpi automatyczne rozłączenie.");
    private final Runnable autoDisconnect = () -> {
        signal(3, "Koniec czasu rozmowy (17 minut 3 sekundy) — automatyczne rozłączenie.");
        boolean disconnected = AgentInCallService.disconnectCall();
        if (!disconnected) {
            tryFallbackDisconnect();
        }
    };
    private final Runnable poll = new Runnable() {
        @Override public void run() {
            pollJob();
            pollSmsQueue();
            handler.postDelayed(this, 15000);
        }
    };
    private final Runnable heartbeat = new Runnable() {
        @Override public void run() {
            sendHeartbeat();
            handler.postDelayed(this, 60000);
        }
    };

    @Override public void onCreate() {
        super.onCreate();
        if (android.os.Build.VERSION.SDK_INT >= 26) {
            ((NotificationManager) getSystemService(NOTIFICATION_SERVICE))
                .createNotificationChannel(new NotificationChannel("operator", "Regulski Operator", NotificationManager.IMPORTANCE_LOW));
        }
        Notification.Builder notification = android.os.Build.VERSION.SDK_INT >= 26
            ? new Notification.Builder(this, "operator")
            : new Notification.Builder(this);
        startForeground(11, notification
            .setContentTitle("Regulski Operator")
            .setContentText("Ciągły watchdog, kolejka SMS i obsługa rozmów.")
            .setSmallIcon(android.R.drawable.stat_sys_phone_call)
            .build());
        ((TelephonyManager) getSystemService(TELEPHONY_SERVICE)).listen(new PhoneStateListener() {
            @Override public void onCallStateChanged(int state, String number) {
                if (currentBookingId == null) return;
                if (state == TelephonyManager.CALL_STATE_OFFHOOK) {
                    callWentOffHook = true;
                    scheduleConversationSignals();
                    report("started", null);
                }
                if (state == TelephonyManager.CALL_STATE_IDLE && callWentOffHook) {
                    long elapsed = System.currentTimeMillis() - callConnectedAt;
                    cancelConversationSignals();
                    callWentOffHook = false;
                    if (elapsed < 14 * 60 * 1000) {
                        report("dropped", "Połączenie przerwane technicznie po " + (elapsed / 1000) + "s.");
                    } else {
                        report("ended", null);
                    }
                    currentBookingId = null;
                }
            }
        }, PhoneStateListener.LISTEN_CALL_STATE);
        handler.post(poll);
        handler.post(heartbeat);
    }
    @Override public int onStartCommand(Intent intent, int flags, int startId) { return START_STICKY; }
    @Override public IBinder onBind(Intent intent) { return null; }
    @Override public void onDestroy() {
        handler.removeCallbacks(poll);
        handler.removeCallbacks(heartbeat);
        executor.shutdownNow();
        super.onDestroy();
    }

    private ApiClient api() {
        SharedPreferences p = getSharedPreferences("phone_agent", Context.MODE_PRIVATE);
        return new ApiClient(p.getString("server", ""), p.getString("token", ""));
    }
    private void pollJob() {
        if (currentBookingId != null) return;
        executor.execute(() -> { try {
            JSONObject job = api().get("/api/phone-agent/job").optJSONObject("job");
            if (job == null) return;
            currentBookingId = job.getString("id");
            callWentOffHook = false;
            api().post("/api/phone-agent/job", new JSONObject().put("bookingId", currentBookingId).put("event", "claimed"));
            if (checkSelfPermission(Manifest.permission.CALL_PHONE) != PackageManager.PERMISSION_GRANTED) throw new SecurityException("Brak zgody CALL_PHONE");
            Intent call = new Intent(Intent.ACTION_CALL, Uri.parse("tel:" + job.getString("phone"))); call.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); startActivity(call);
            final String candidateId = currentBookingId;
            handler.postDelayed(() -> {
                if (candidateId.equals(currentBookingId) && !callWentOffHook) {
                    report("no_answer", "Klient nie odebrał połączenia w ciągu 45 sekund.");
                    currentBookingId = null;
                }
            }, 45000);
        } catch (Exception e) { reportFailure(e.getMessage()); } });
    }
    private void report(String event, String error) {
        if (currentBookingId == null) return;
        final String bookingId = currentBookingId;
        executor.execute(() -> { try {
            JSONObject payload = new JSONObject().put("bookingId", bookingId).put("event", event);
            if (error != null) payload.put("error", error);
            api().post("/api/phone-agent/job", payload);
        } catch (Exception ignored) {} });
    }
    private void scheduleConversationSignals() {
        cancelConversationSignals();
        callConnectedAt = System.currentTimeMillis();

        // 0:03 - 3 sekundy na przywitanie, potem 1 pik = start 15 min
        handler.postDelayed(startSignal, 3000);

        // 7:33 (7 min 30 s właściwej rozmowy) - 2 piki (przejście do meritum)
        handler.postDelayed(halfSignal, 3000 + 7 * 60 * 1000 + 30 * 1000);

        // 15:03 (15 min właściwej rozmowy) - 3 piki (start stałych 2 min podsumowania)
        handler.postDelayed(summarySignal, 3000 + 15 * 60 * 1000);

        SharedPreferences p = getSharedPreferences("phone_agent", Context.MODE_PRIVATE);
        boolean strict15 = p.getBoolean("strict_15_minutes", false);
        if (strict15) {
            handler.postDelayed(autoDisconnect, 3000 + 15 * 60 * 1000);
        } else {
            // Dyskretny sygnał ostrzegawczy na 8 sekund przed końcem (16:55)
            handler.postDelayed(preEndWarning, 3000 + 16 * 60 * 1000 + 52 * 1000);
            // 17:03 - bezwzględne rozłączenie rozmowy
            handler.postDelayed(autoDisconnect, 3000 + 17 * 60 * 1000);
        }
    }
    private void cancelConversationSignals() {
        handler.removeCallbacks(startSignal);
        handler.removeCallbacks(halfSignal);
        handler.removeCallbacks(summarySignal);
        handler.removeCallbacks(preEndWarning);
        handler.removeCallbacks(autoDisconnect);
    }
    private void tryFallbackDisconnect() {
        if (android.os.Build.VERSION.SDK_INT >= 28) {
            try {
                android.telecom.TelecomManager tm = (android.telecom.TelecomManager) getSystemService(TELECOM_SERVICE);
                if (tm != null && checkSelfPermission(Manifest.permission.ANSWER_PHONE_CALLS) == PackageManager.PERMISSION_GRANTED) {
                    tm.endCall();
                    return;
                }
            } catch (Exception ignored) {}
        }
        try {
            TelephonyManager tm = (TelephonyManager) getSystemService(TELEPHONY_SERVICE);
            java.lang.reflect.Method m = tm.getClass().getDeclaredMethod("getITelephony");
            m.setAccessible(true);
            Object telephony = m.invoke(tm);
            java.lang.reflect.Method endCall = telephony.getClass().getDeclaredMethod("endCall");
            endCall.invoke(telephony);
        } catch (Exception ignored) {}
    }
    private void signal(int beeps, String message) {
        ToneGenerator tone = new ToneGenerator(AudioManager.STREAM_ALARM, 85);
        for (int i = 0; i < beeps; i++) {
            tone.startTone(ToneGenerator.TONE_PROP_BEEP, 180);
            try { Thread.sleep(260); } catch (InterruptedException ignored) { Thread.currentThread().interrupt(); }
        }
        tone.release();
        ((Vibrator) getSystemService(VIBRATOR_SERVICE)).vibrate(beeps == 2 ? new long[]{0, 140, 120, 140} : new long[]{0, 140}, -1);
        Notification.Builder builder = android.os.Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(this, "agent") : new Notification.Builder(this);
        ((NotificationManager) getSystemService(NOTIFICATION_SERVICE)).notify(12, builder.setSmallIcon(android.R.drawable.stat_sys_phone_call).setContentTitle("Regulski — rozmowa").setContentText(message).setAutoCancel(true).build());
    }
    private void reportFailure(String error) {
        cancelConversationSignals();
        if (currentBookingId == null) return;
        final String failedId = currentBookingId; currentBookingId = null;
        executor.execute(() -> { try { api().post("/api/phone-agent/job", new JSONObject().put("bookingId", failedId).put("event", "failed").put("error", error)); } catch (Exception ignored) {} });
    }

    private void sendHeartbeat() {
        executor.execute(() -> {
            try {
                Intent batteryIntent = registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
                int level = batteryIntent != null ? batteryIntent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) : -1;
                int scale = batteryIntent != null ? batteryIntent.getIntExtra(BatteryManager.EXTRA_SCALE, -1) : -1;
                int status = batteryIntent != null ? batteryIntent.getIntExtra(BatteryManager.EXTRA_STATUS, -1) : -1;
                boolean isCharging = status == BatteryManager.BATTERY_STATUS_CHARGING || status == BatteryManager.BATTERY_STATUS_FULL;
                int batteryPct = (level >= 0 && scale > 0) ? (int) ((level / (float) scale) * 100) : -1;

                TelephonyManager tm = (TelephonyManager) getSystemService(TELEPHONY_SERVICE);
                String network = tm != null ? tm.getNetworkOperatorName() : "GSM";
                if (network == null || network.isEmpty()) network = "GSM";

                TelecomManager telecom = (TelecomManager) getSystemService(TELECOM_SERVICE);
                boolean isDefaultDialer = telecom != null && getPackageName().equals(telecom.getDefaultDialerPackage());

                JSONObject payload = new JSONObject();
                if (batteryPct >= 0) payload.put("batteryLevel", batteryPct);
                payload.put("isCharging", isCharging);
                payload.put("network", network);
                payload.put("isDefaultDialer", isDefaultDialer);
                payload.put("appVersion", "1.1.0");

                api().post("/api/phone-agent/heartbeat", payload);
            } catch (Exception ignored) {}
        });
    }

    private void pollSmsQueue() {
        executor.execute(() -> {
            try {
                JSONObject resp = api().get("/api/phone-agent/sms-queue");
                JSONObject sms = resp.optJSONObject("sms");
                if (sms == null) return;

                String id = sms.getString("id");
                String phone = sms.getString("phone");
                String message = sms.getString("message");

                if (checkSelfPermission(Manifest.permission.SEND_SMS) != PackageManager.PERMISSION_GRANTED) {
                    api().post("/api/phone-agent/sms-queue", new JSONObject().put("id", id).put("status", "failed").put("error", "Brak uprawnień SEND_SMS"));
                    return;
                }

                SmsManager sm = SmsManager.getDefault();
                ArrayList<String> parts = sm.divideMessage(message);
                if (parts.size() > 1) {
                    sm.sendMultipartTextMessage(phone, null, parts, null, null);
                } else {
                    sm.sendTextMessage(phone, null, message, null, null);
                }
                api().post("/api/phone-agent/sms-queue", new JSONObject().put("id", id).put("status", "sent"));
            } catch (Exception ignored) {}
        });
    }
}
