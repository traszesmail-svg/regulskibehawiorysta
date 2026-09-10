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
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Handler;
import android.os.IBinder;
import android.os.Vibrator;
import android.telephony.PhoneStateListener;
import android.telephony.TelephonyManager;
import org.json.JSONObject;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class PhoneAgentService extends Service {
    private final Handler handler = new Handler();
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private String currentBookingId;
    private boolean callWentOffHook;
    private final Runnable halfSignal = () -> signal(1, "Połowa rozmowy — zacznij prowadzić do odpowiedzi.");
    private final Runnable minuteSignal = () -> signal(1, "Została minuta — przejdź do podsumowania.");
    private final Runnable endSignal = () -> signal(2, "Minęło 15 minut — zakończ i zapisz podsumowanie.");
    private final Runnable poll = new Runnable() { @Override public void run() { pollJob(); handler.postDelayed(this, 15000); } };

    @Override public void onCreate() {
        super.onCreate();
        if (android.os.Build.VERSION.SDK_INT >= 26) ((NotificationManager) getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(new NotificationChannel("agent", "Agent telefonu", NotificationManager.IMPORTANCE_LOW));
        Notification.Builder notification = android.os.Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(this, "agent") : new Notification.Builder(this);
        startForeground(11, notification.setContentTitle("Regulski — agent telefonu").setContentText("Nasłuchuje opłaconych rozmów.").setSmallIcon(android.R.drawable.stat_sys_phone_call).build());
        ((TelephonyManager) getSystemService(TELEPHONY_SERVICE)).listen(new PhoneStateListener() {
            @Override public void onCallStateChanged(int state, String number) {
                if (currentBookingId == null) return;
                if (state == TelephonyManager.CALL_STATE_OFFHOOK) { callWentOffHook = true; scheduleConversationSignals(); report("started", null); }
                if (state == TelephonyManager.CALL_STATE_IDLE && callWentOffHook) { cancelConversationSignals(); callWentOffHook = false; report("ended", null); currentBookingId = null; }
            }
        }, PhoneStateListener.LISTEN_CALL_STATE);
        handler.post(poll);
    }
    @Override public int onStartCommand(Intent intent, int flags, int startId) { return START_STICKY; }
    @Override public IBinder onBind(Intent intent) { return null; }
    @Override public void onDestroy() { handler.removeCallbacks(poll); executor.shutdownNow(); super.onDestroy(); }

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
            handler.postDelayed(() -> { if (candidateId.equals(currentBookingId) && !callWentOffHook) reportFailure("Połączenie nie przeszło do stanu aktywnego."); }, 45000);
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
        handler.postDelayed(halfSignal, 7 * 60 * 1000 + 30 * 1000);
        handler.postDelayed(minuteSignal, 14 * 60 * 1000);
        handler.postDelayed(endSignal, 15 * 60 * 1000);
    }
    private void cancelConversationSignals() {
        handler.removeCallbacks(halfSignal); handler.removeCallbacks(minuteSignal); handler.removeCallbacks(endSignal);
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
}
