package pl.regulski.phoneagent;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import java.util.Map;
import org.json.JSONObject;

/** Commit before contacting the modem. A claimed ID is never sent twice on this device. */
final class SmsJournal {
    private static SharedPreferences store(Context context) {
        return context.getSharedPreferences("sms_journal", Context.MODE_PRIVATE);
    }

    static synchronized boolean begin(Context context, String id, int parts, String server) throws Exception {
        if (id == null || id.trim().isEmpty() || "null".equalsIgnoreCase(id.trim())) return false;
        SharedPreferences entries = store(context);
        if (contains(context, id)) return false;
        JSONObject record = new JSONObject().put("parts", parts).put("server", server)
            .put("startedAt", System.currentTimeMillis()).put("results", new JSONObject());
        save(entries, id, record);
        return true;
    }

    static synchronized boolean contains(Context context, String id) {
        if (id == null || id.trim().isEmpty() || "null".equalsIgnoreCase(id.trim())) return true;
        if (store(context).contains(id)) return true;
        for (String key : context.getSharedPreferences("sms_results", Context.MODE_PRIVATE).getAll().keySet()) {
            if (key.startsWith(id + ":")) return true;
        }
        return false;
    }

    static synchronized void partResult(Context context, String id, int part, int count, int code) throws Exception {
        SharedPreferences entries = store(context);
        String raw = entries.getString(id, null);
        if (raw == null) return;
        JSONObject record = new JSONObject(raw);
        if (record.has("report")) return;
        if (record.optInt("parts") != count || part < 0 || part >= count || count > 100) return;
        JSONObject results = record.getJSONObject("results");
        String key = String.valueOf(part);
        if (results.has(key)) return;
        results.put(key, code);
        if (results.length() == count) {
            boolean success = true;
            for (int i = 0; i < count; i++) success &= results.getInt(String.valueOf(i)) == Activity.RESULT_OK;
            record.put("report", new JSONObject().put("id", id).put("status", success ? "sent" : "failed")
                .put("error", success ? JSONObject.NULL : "Android nie potwierdził wysłania wszystkich części SMS. Nie ponawiaj automatycznie."));
        }
        save(entries, id, record);
    }

    static synchronized void failed(Context context, String id, String error) throws Exception {
        SharedPreferences entries = store(context);
        JSONObject record = new JSONObject(entries.getString(id, "{}"));
        if (record.has("report")) return;
        record.put("report", new JSONObject().put("id", id).put("status", "failed").put("error", error));
        save(entries, id, record);
    }

    private static void save(SharedPreferences entries, String id, JSONObject record) throws Exception {
        if (!entries.edit().putString(id, record.toString()).commit()) throw new Exception("Nie zapisano dziennika SMS");
    }

    /** Retries HTTP reports only, never modem sends. Network calls do not hold the journal lock. */
    static void flush(Context context, ApiClient client, String server) {
        for (Map.Entry<String, ?> entry : store(context).getAll().entrySet()) {
            String key = entry.getKey();
            if (key == null || key.trim().isEmpty() || "null".equalsIgnoreCase(key.trim())) {
                store(context).edit().remove(key).commit();
                continue;
            }
            try {
                JSONObject record = new JSONObject((String) entry.getValue());
                if (record.optBoolean("reported") || !server.equals(record.optString("server"))) continue;
                JSONObject report = record.optJSONObject("report");
                if (report == null) continue;
                android.util.Log.i("RegulskiSms", "Wysyłam raport SMS: " + report.toString());
                client.post("/api/phone-agent/sms-queue", report);
                synchronized (SmsJournal.class) {
                    JSONObject current = new JSONObject(store(context).getString(entry.getKey(), "{}"));
                    JSONObject currentReport = current.optJSONObject("report");
                    if (currentReport != null && report.toString().equals(currentReport.toString())) {
                        current.put("reported", true);
                        save(store(context), entry.getKey(), current);
                    }
                }
            } catch (Exception error) {
                android.util.Log.w("RegulskiSms", "Raport SMS czeka na ponowienie: " + error.getClass().getSimpleName() + ": " + error.getMessage());
            }
        }
    }

    static synchronized String summary(Context context) {
        int unknown = 0, pending = 0;
        java.util.HashSet<String> legacyIds = new java.util.HashSet<>();
        for (String key : context.getSharedPreferences("sms_results", Context.MODE_PRIVATE).getAll().keySet()) {
            int separator = key.lastIndexOf(':');
            if (separator > 0) legacyIds.add(key.substring(0, separator));
        }
        unknown += legacyIds.size();
        for (Object raw : store(context).getAll().values()) {
            try {
                JSONObject record = new JSONObject((String) raw);
                if (!record.has("report")) unknown++;
                else if (!record.optBoolean("reported")) pending++;
            } catch (Exception ignored) { unknown++; }
        }
        return "Raporty oczekujące: " + pending + ". SMS bez pełnego wyniku: " + unknown + ".";
    }
}
