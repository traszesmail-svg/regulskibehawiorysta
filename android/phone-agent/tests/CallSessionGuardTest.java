package pl.regulski.phoneagent;

/** JVM regression checks for guards that prevent duplicate dialing and reports. */
public final class CallSessionGuardTest {
    private static void check(boolean value, String message) {
        if (!value) throw new AssertionError(message);
    }

    public static void main(String[] args) {
        check(CallSessionGuard.canClaim("booking-1", "+48123123123", true, false, false),
            "valid unclaimed job can be claimed");
        check(!CallSessionGuard.canClaim("booking-1", "+48123123123", false, false, false),
            "permission is required before claim");
        check(!CallSessionGuard.canClaim("booking-1", "+48123123123", true, true, false),
            "in-flight claim cannot issue a second dial");
        check(!CallSessionGuard.canClaim("booking-1", "+48123123123", true, false, true),
            "persisted claim cannot dial again after recreation");
        check(CallSessionGuard.canReport("booking-1", true, false),
            "only a genuine claim enables reports");
        check(!CallSessionGuard.canReport("booking-1", false, false),
            "fetched but unclaimed work cannot be reported");
        check(CallSessionGuard.isManualCompletion("ended"),
            "successful manual call is explicitly marked complete");
        check(!CallSessionGuard.isManualCompletion("no_answer"),
            "non-completion events never claim manual completion");
        System.out.println("PASS CallSessionGuard");
    }
}
