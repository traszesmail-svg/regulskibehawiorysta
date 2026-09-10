package pl.regulski.phoneagent;

import org.json.JSONArray;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

final class ApiClient {
    private final String baseUrl;
    private final String token;

    ApiClient(String baseUrl, String token) {
        this.baseUrl = baseUrl.replaceAll("/+$", "");
        this.token = token;
    }

    JSONObject get(String path) throws Exception { return request("GET", path, null); }
    JSONObject post(String path, JSONObject payload) throws Exception { return request("POST", path, payload); }

    private JSONObject request(String method, String path, JSONObject payload) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(baseUrl + path).openConnection();
        connection.setRequestMethod(method);
        connection.setConnectTimeout(10000);
        connection.setReadTimeout(15000);
        connection.setRequestProperty("Authorization", "Bearer " + token);
        connection.setRequestProperty("Accept", "application/json");
        if (payload != null) {
            connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type", "application/json");
            OutputStream output = connection.getOutputStream();
            output.write(payload.toString().getBytes("UTF-8"));
            output.close();
        }
        int status = connection.getResponseCode();
        InputStream stream = status >= 200 && status < 300 ? connection.getInputStream() : connection.getErrorStream();
        BufferedReader reader = new BufferedReader(new java.io.InputStreamReader(stream, "UTF-8"));
        StringBuilder raw = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) raw.append(line);
        reader.close();
        JSONObject response = new JSONObject(raw.length() == 0 ? "{}" : raw.toString());
        if (status < 200 || status >= 300) throw new Exception(response.optString("error", "Błąd serwera " + status));
        return response;
    }

    static String casesSummary(JSONArray cases) {
        if (cases.length() == 0) return "Brak opłaconych spraw telefonicznych.";
        StringBuilder result = new StringBuilder();
        for (int i = 0; i < cases.length(); i++) {
            JSONObject c = cases.optJSONObject(i);
            if (c == null) continue;
            result.append(c.optString("bookingDate")).append(" ").append(c.optString("bookingTime"))
                .append(" — ").append(c.optString("ownerName")).append("\n")
                .append(c.optString("animalType")).append(" · ").append(c.optString("problemType"));
            String age = c.optString("petAge");
            if (!age.isEmpty()) result.append(" · ").append(age);
            result.append("\nOpis przypadku:\n").append(c.optString("description"));
            String duration = c.optString("durationNotes");
            if (!duration.isEmpty()) result.append("\nCzas trwania: ").append(duration);
            result.append("\nStatus połączenia: ").append(c.optString("callStatus", "nieuruchomione")).append("\n\n");
        }
        return result.toString();
    }
}
