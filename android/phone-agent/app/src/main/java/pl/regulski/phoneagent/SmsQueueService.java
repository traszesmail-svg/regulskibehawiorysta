package pl.regulski.phoneagent;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.BatteryManager;
import android.os.Handler;
import android.os.IBinder;
import android.telephony.SmsManager;
import java.util.ArrayList;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONObject;

/** Handles only the project SMS queue. It cannot place calls or read messages. */
public final class SmsQueueService extends Service {
    static final Object SEND_LOCK = new Object();
    private volatile boolean running;
    private final Handler handler = new Handler();
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Runnable poll = new Runnable() {
        @Override public void run() {
            if (!running) return;
            executor.execute(() -> {
                if (!running) return;
                SharedPreferences config = getSharedPreferences("phone_agent", MODE_PRIVATE);
                SmsJournal.flush(SmsQueueService.this, api(), config.getString("server", ""));
                sendNextQueuedSms();
                if (running) handler.postDelayed(poll, 15_000L);
            });
        }
    };
    private final Runnable heartbeat = new Runnable() {
        @Override public void run() {
            if (!running) return;
            sendHeartbeat();
            handler.postDelayed(this, 60_000L);
        }
    };

    @Override public void onCreate() {
        super.onCreate();
        if (android.os.Build.VERSION.SDK_INT >= 26) {
            ((NotificationManager) getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(
                new NotificationChannel("project_sms", "SMS projektu", NotificationManager.IMPORTANCE_LOW)
            );
        }
        Notification.Builder builder = android.os.Build.VERSION.SDK_INT >= 26
            ? new Notification.Builder(this, "project_sms")
            : new Notification.Builder(this);
        startForeground(21, builder
            .setSmallIcon(android.R.drawable.stat_notify_more)
            .setContentTitle("Regulski Operator")
            .setContentText("Obsługa kolejki SMS projektu")
            .build());
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (!getSharedPreferences("phone_agent", MODE_PRIVATE).getBoolean("operator_enabled", false)) {
            stopSelf();
            return START_NOT_STICKY;
        }
        if (!running) {
            running = true;
            handler.post(poll);
            handler.post(heartbeat);
        }
        return START_STICKY;
    }
    @Override public IBinder onBind(Intent intent) { return null; }
    @Override public void onDestroy() {
        synchronized (SEND_LOCK) { running = false; }
        handler.removeCallbacks(poll);
        handler.removeCallbacks(heartbeat);
        executor.shutdownNow();
        super.onDestroy();
    }

    private ApiClient api() {
        SharedPreferences p = getSharedPreferences("phone_agent", Context.MODE_PRIVATE);
        return new ApiClient(p.getString("server", ""), p.getString("token", ""));
    }

    private void sendNextQueuedSms() {
            SharedPreferences config = getSharedPreferences("phone_agent", MODE_PRIVATE);
            String attemptServer = config.getString("server", "");
            String attemptToken = config.getString("token", "");
            JSONObject sms = null;
            try {
                if (!canSend()) return;
                sms = new ApiClient(attemptServer, attemptToken).get("/api/phone-agent/sms-queue").optJSONObject("sms");
                if (sms == null) return;
                String id = sms.getString("id");
                if (SmsJournal.contains(this, id)) return;
                String phone = sms.getString("phone");
                String message = sms.getString("message");
                SmsManager manager = SmsManager.getDefault();
                ArrayList<String> parts = manager.divideMessage(message);
                if (parts.isEmpty() || parts.size() > 100) throw new Exception("Nieprawidłowa liczba części SMS");
                ArrayList<android.app.PendingIntent> results = new ArrayList<>();
                for (int i = 0; i < parts.size(); i++) {
                    Intent result = new Intent(this, SmsSentReceiver.class)
                        .setData(android.net.Uri.parse("regulski-sms://sent/" + id + "/" + i))
                        .putExtra("id", id).putExtra("part", i).putExtra("parts", parts.size());
                    results.add(android.app.PendingIntent.getBroadcast(this, 0, result,
                        android.app.PendingIntent.FLAG_UPDATE_CURRENT | android.app.PendingIntent.FLAG_IMMUTABLE));
                }
                synchronized (SEND_LOCK) {
                    if (!SmsJournal.begin(this, id, parts.size(), attemptServer)) return;
                    if (!canSend() || !attemptServer.equals(config.getString("server", "")) || !attemptToken.equals(config.getString("token", ""))) {
                        SmsJournal.failed(this, id, "Wysyłka wyłączona po pobraniu wiadomości. SMS nie został wysłany.");
                        return;
                    }
                    if (parts.size() > 1) manager.sendMultipartTextMessage(phone, null, parts, results, null);
                    else manager.sendTextMessage(phone, null, message, results.get(0), null);
                }
            } catch (Exception error) {
                if (sms != null) {
                    try {
                        String id = sms.getString("id");
                        SmsJournal.begin(this, id, 0, attemptServer);
                        SmsJournal.failed(this, id, "Wysyłka przerwana; sprawdź wynik przed ponowieniem: " + error.getMessage());
                    } catch (Exception ignored) { android.util.Log.e("RegulskiSms", "Nie zapisano błędu SMS."); }
                }
            }
    }

    private boolean canSend() {
        SharedPreferences config = getSharedPreferences("phone_agent", MODE_PRIVATE);
        return running && config.getBoolean("operator_enabled", false) && config.getBoolean("sms_enabled", false)
            && checkSelfPermission(Manifest.permission.SEND_SMS) == PackageManager.PERMISSION_GRANTED;
    }

    private void sendHeartbeat() {
        executor.execute(() -> {
            try {
                Intent battery = registerReceiver(null, new android.content.IntentFilter(Intent.ACTION_BATTERY_CHANGED));
                int level = battery == null ? -1 : battery.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
                int scale = battery == null ? -1 : battery.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
                JSONObject body = new JSONObject();
                if (level >= 0 && scale > 0) body.put("batteryLevel", (int) (level * 100f / scale));
                if (!running) return;
                int charge = battery == null ? -1 : battery.getIntExtra(BatteryManager.EXTRA_STATUS, -1);
                body.put("isCharging", charge == BatteryManager.BATTERY_STATUS_CHARGING || charge == BatteryManager.BATTERY_STATUS_FULL);
                body.put("appVersion", "1.4.0-setup");
                api().post("/api/phone-agent/heartbeat", body);
                android.util.Log.i("RegulskiOperator", "Meldunek potwierdzony przez serwer.");
            } catch (Exception ignored) { android.util.Log.w("RegulskiOperator", "Brak potwierdzenia meldunku; kolejna próba za minutę."); }
        });
    }
}
