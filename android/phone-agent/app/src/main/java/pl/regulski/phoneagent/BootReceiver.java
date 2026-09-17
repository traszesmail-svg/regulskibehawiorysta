package pl.regulski.phoneagent;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

public final class BootReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        if (!Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) return;
        SharedPreferences prefs = context.getSharedPreferences("phone_agent", Context.MODE_PRIVATE);
        if (!prefs.getBoolean("operator_enabled", false)) return;

        Intent service = new Intent(context, SmsQueueService.class);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(service);
            } else {
                context.startService(service);
            }
        } catch (Exception e) {
            android.util.Log.e("PhoneAgent", "Błąd autostartu usługi po restarcie: " + e.getMessage(), e);
        }
    }
}
