package pl.regulski.phoneagent;

import android.app.Activity;
import android.os.Bundle;
import org.json.JSONObject;

/** Runs with real Android storage in an isolated APK without any SMS/call permissions. */
public final class JournalTestActivity extends Activity {
    private static void check(boolean value, String message) {
        if (!value) throw new AssertionError(message);
    }
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        try {
            String phase = getIntent().getStringExtra("phase");
            ApiClient client = new ApiClient();
            if ("prepare".equals(phase)) {
                getSharedPreferences("sms_journal", MODE_PRIVATE).edit().clear().commit();
                getSharedPreferences("sms_results", MODE_PRIVATE).edit().clear().putInt("legacy:0", RESULT_OK).commit();
                check(!SmsJournal.begin(this, "legacy", 1, "test"), "legacy callback prevents duplicate send");
                check(SmsJournal.begin(this, "multipart", 2, "test"), "first claim");
                check(!SmsJournal.begin(this, "multipart", 2, "test"), "duplicate blocked");
                SmsJournal.partResult(this, "multipart", 0, 2, RESULT_OK);
                SmsJournal.partResult(this, "multipart", 0, 2, 1);
                SmsJournal.partResult(this, "multipart", 8, 2, RESULT_OK);
                SmsJournal.flush(this, client, "test");
                check(client.attempts == 0, "incomplete callback must not report success");
                SmsJournal.partResult(this, "multipart", 1, 2, RESULT_OK);
                client.offline = true;
                SmsJournal.flush(this, client, "test");
                check(client.attempts == 1, "offline report attempted");
                check(SmsJournal.summary(this).contains("oczekujące: 1"), "offline report retained");
                SmsJournal.begin(this, "unknown", 1, "test");
            } else {
                check(SmsJournal.contains(this, "unknown"), "unknown attempt survives process death");
                check(!SmsJournal.begin(this, "unknown", 1, "test"), "unknown attempt never resent");
                SmsJournal.flush(this, client, "other-server");
                check(client.attempts == 0, "do not report to another server");
                SmsJournal.flush(this, client, "test");
                check(client.attempts == 1 && "sent".equals(client.status), "offline result recovered after restart");
                SmsJournal.flush(this, client, "test");
                check(client.attempts == 1, "acknowledged result not repeated");
                check(!SmsJournal.begin(this, "multipart", 2, "test"), "sent ID never resent");
                SmsJournal.begin(this, "partial-failure", 2, "test");
                SmsJournal.partResult(this, "partial-failure", 0, 2, RESULT_OK);
                SmsJournal.partResult(this, "partial-failure", 1, 2, 1);
                SmsJournal.flush(this, client, "test");
                check(client.attempts == 2 && "failed".equals(client.status), "partial failure is not sent");
                SmsJournal.begin(this, "exception", 1, "test");
                SmsJournal.failed(this, "exception", "modem uncertain");
                check(!SmsJournal.begin(this, "exception", 1, "test"), "exception never retried as SMS");
                SmsJournal.flush(this, client, "test");
                check(client.attempts == 3 && "failed".equals(client.status), "exception reported");
            }
            android.util.Log.i("RegulskiJournalTest", "PASS " + phase);
        } catch (Throwable error) {
            android.util.Log.e("RegulskiJournalTest", "FAIL", error);
        }
        finish();
    }
}

/** Network test double; the real SmsJournal is compiled unchanged. */
final class ApiClient {
    boolean offline;
    int attempts;
    String status;
    JSONObject post(String path, JSONObject body) throws Exception {
        attempts++;
        if (offline) throw new Exception("simulated offline");
        status = body.getString("status");
        return new JSONObject().put("ok", true);
    }
}
