package pl.regulski.phoneagent;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Android confirms sending each part; this does not claim recipient delivery. */
public final class SmsSentReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        String id = intent.getStringExtra("id");
        if (id == null) return;
        int part = intent.getIntExtra("part", -1);
        int count = intent.getIntExtra("parts", 0);
        if (part < 0 || part >= count || count > 100) return;
        try {
            SmsJournal.partResult(context, id, part, count, getResultCode());
        } catch (Exception error) {
            android.util.Log.e("RegulskiSms", "Nie zapisano wyniku SMS; wymaga sprawdzenia.");
            return;
        }
        // The foreground service retries the committed report. No network work in a receiver.
    }
}
