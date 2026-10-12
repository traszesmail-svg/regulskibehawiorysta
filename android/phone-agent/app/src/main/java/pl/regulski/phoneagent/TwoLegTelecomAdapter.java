package pl.regulski.phoneagent;

/**
 * Adapter interface decoupling the two-leg state machine from Android Telecom framework.
 * Allows pure, isolated JVM testing with fake adapters as well as real InCallService operations.
 */
public interface TwoLegTelecomAdapter {
    /** Places the second leg call to the owner. Returns true if request was accepted by platform. */
    boolean placeOwnerCall(String ownerNumber);

    /** Places client call on hold. Returns true if request was accepted by platform. */
    boolean holdCall(String callId);

    /** Unholds call. Returns true if request was accepted by platform. */
    boolean unholdCall(String callId);

    /** Merges two calls into a carrier conference. Returns true if accepted by platform. */
    boolean mergeCalls(String clientCallId, String ownerCallId);

    /** Disconnects a specific call. Returns true if accepted. */
    boolean disconnectCall(String callId);

    /** Sets local microphone mute (uplink). In GSM, audio mixing is performed by carrier network. */
    void setLocalMute(boolean muted);

    /** Enforces that call audio is kept on earpiece and NOT routed to speakerphone. */
    void ensureEarpieceAudioRoute();
}
