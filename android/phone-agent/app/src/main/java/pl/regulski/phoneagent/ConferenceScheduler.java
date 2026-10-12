package pl.regulski.phoneagent;

/**
 * Interface for scheduling deterministic timeouts and periodic consultation limit checks
 * in the two-leg conference controller. Decoupled for pure JVM testing and production ART runtime.
 */
public interface ConferenceScheduler {
    /**
     * Schedules a timeout for owner leg answer (45s).
     */
    void scheduleOwnerDialTimeout(long sessionId, long delayMillis, Runnable action);

    /**
     * Schedules a timeout for conference merge/capability (15s).
     */
    void scheduleMergeTimeout(long sessionId, long delayMillis, Runnable action);

    /**
     * Schedules periodic consultation time limit check ticks during CONFERENCE_ACTIVE.
     */
    void scheduleConsultationTick(long sessionId, long initialDelayMillis, long periodMillis, Runnable action);

    /**
     * Cancels pending owner dial timeout.
     */
    void cancelOwnerDialTimeout();

    /**
     * Cancels pending merge timeout.
     */
    void cancelMergeTimeout();

    /**
     * Cancels periodic consultation limit ticks.
     */
    void cancelConsultationTick();

    /**
     * Cancels all scheduled callbacks and resets active session reference.
     */
    void cancelAll();
}
