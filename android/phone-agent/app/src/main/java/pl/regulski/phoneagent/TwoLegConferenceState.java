package pl.regulski.phoneagent;

/** States for the two-leg GSM operator conference state machine. */
public enum TwoLegConferenceState {
    IDLE,
    DIALING_CLIENT,
    CLIENT_ACTIVE,
    CLIENT_HOLDING,
    DIALING_OWNER,
    OWNER_ACTIVE,
    MERGE_PENDING,
    CONFERENCE_ACTIVE,
    FAILED,
    COMPLETED
}
