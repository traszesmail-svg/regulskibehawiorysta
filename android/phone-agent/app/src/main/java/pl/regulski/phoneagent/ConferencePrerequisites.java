package pl.regulski.phoneagent;

/**
 * Abstraction for verifying pre-flight prerequisites before initiating a two-leg consultation call.
 * Allows pure JVM testing with fake prerequisites as well as Android platform checks.
 */
public interface ConferencePrerequisites {
    /** Whether the app holds the system default dialer role. */
    boolean isDialerRoleHeld();

    /** Whether CALL_PHONE permission is granted. */
    boolean hasCallPhonePermission();

    /** Whether a SIM card is inserted and ready. */
    boolean isSimReady();

    /** Whether no other phone call is currently active or ringing. */
    boolean hasNoActiveCalls();
}
