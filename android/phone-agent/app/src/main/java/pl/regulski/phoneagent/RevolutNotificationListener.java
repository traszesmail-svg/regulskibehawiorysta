package pl.regulski.phoneagent;

import android.app.Notification;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import org.json.JSONObject;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class RevolutNotificationListener extends NotificationListenerService {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    private ApiClient api() {
        SharedPreferences p = getSharedPreferences("phone_agent", Context.MODE_PRIVATE);
        return new ApiClient(p.getString("server", "https://regulskibehawiorysta.pl"), p.getString("token", ""));
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null || sbn.getNotification() == null) return;

        String pkg = sbn.getPackageName();
        if (pkg == null) return;

        // This limited build processes notifications from Revolut only.
        boolean isRevolut = "com.revolut.revolut".equals(pkg);

        Notification notification = sbn.getNotification();
        Bundle extras = notification.extras;
        if (extras == null) return;

        CharSequence titleSeq = extras.getCharSequence(Notification.EXTRA_TITLE);
        String title = titleSeq != null ? titleSeq.toString() : "";
        CharSequence textSeq = extras.getCharSequence(Notification.EXTRA_TEXT);
        String text = textSeq != null ? textSeq.toString() : "";

        String combined = (title + " " + text).toLowerCase();
        boolean hasPaymentKeywords = combined.contains("zł") || combined.contains("pln") || combined.contains("przelew") || combined.contains("wpływ") || combined.contains("otrzymałeś");

        if (!isRevolut) {
            return;
        }

        final String finalPkg = pkg;
        final String finalTitle = title;
        final String finalText = text;

        executor.execute(() -> {
            try {
                JSONObject payload = new JSONObject();
                payload.put("packageName", finalPkg);
                payload.put("title", finalTitle);
                payload.put("text", finalText);
                payload.put("timestamp", String.valueOf(System.currentTimeMillis()));

                api().post("/api/phone-agent/payment-notification", payload);
            } catch (Exception ignored) {}
        });
    }

    @Override
    public void onDestroy() {
        executor.shutdownNow();
        super.onDestroy();
    }
}
