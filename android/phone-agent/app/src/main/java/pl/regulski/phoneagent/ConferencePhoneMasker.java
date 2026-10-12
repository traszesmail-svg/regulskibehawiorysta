package pl.regulski.phoneagent;

/** Privacy utility ensuring no raw phone numbers leak to logs, reports, or diagnostics. */
public final class ConferencePhoneMasker {
    private ConferencePhoneMasker() {}

    public static String mask(String phone) {
        if (phone == null || phone.trim().isEmpty()) {
            return "empty";
        }
        String clean = phone.replaceAll("[\\s()\\-]", "");
        if (clean.length() <= 4) {
            return "***";
        }
        int keepStart = Math.min(3, clean.length() / 3);
        int keepEnd = Math.min(3, clean.length() / 3);
        return clean.substring(0, keepStart) + "***" + clean.substring(clean.length() - keepEnd);
    }
}
