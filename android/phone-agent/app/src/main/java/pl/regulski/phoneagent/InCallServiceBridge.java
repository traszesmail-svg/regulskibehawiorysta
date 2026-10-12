package pl.regulski.phoneagent;

/**
 * Bridge interface allowing the process-local coordinator to register
 * the active TwoLegConferenceController with the platform InCallService
 * without introducing direct compile-time or runtime dependencies on Android Telecom.
 */
public interface InCallServiceBridge {
    void setActiveController(TwoLegConferenceController controller);
    TwoLegConferenceController getActiveController();
}
