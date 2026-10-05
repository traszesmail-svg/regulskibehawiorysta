package pl.regulski.phoneagent;

/** Pure guards for the manual call flow; no network or Android state is inferred here. */
final class CallSessionGuard {
    private CallSessionGuard() {}

    static boolean canClaim(String jobId, String normalizedPhone, boolean hasCallPermission,
                            boolean claimInFlight, boolean alreadyClaimed) {
        return jobId != null && !jobId.trim().isEmpty()
            && normalizedPhone != null && hasCallPermission
            && !claimInFlight && !alreadyClaimed;
    }

    static boolean canReport(String jobId, boolean alreadyClaimed, boolean reportInFlight) {
        return jobId != null && !jobId.trim().isEmpty() && alreadyClaimed && !reportInFlight;
    }

    static boolean isManualCompletion(String event) {
        return "ended".equals(event);
    }
}
