package pl.regulski.phoneagent;

import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.TimeUnit;

/**
 * Production and runtime implementation of ConferenceScheduler.
 * Uses a single-thread ScheduledExecutorService with daemon threads.
 *
 * Guarantees lifecycle safety and idempotency:
 * - Cancels pending tasks on state transitions, aborts, service destruction, and terminal states.
 * - Compares activeSessionId so that an old session callback cannot trigger against a new session.
 * - Does not perform any automatic redial.
 */
public final class ConferenceRuntimeScheduler implements ConferenceScheduler {
    private final ScheduledExecutorService executor;
    private final boolean ownsExecutor;
    private volatile long activeSessionId = -1;

    private ScheduledFuture<?> ownerDialTimeoutFuture;
    private ScheduledFuture<?> mergeTimeoutFuture;
    private ScheduledFuture<?> consultationTickFuture;

    public ConferenceRuntimeScheduler() {
        this(Executors.newSingleThreadScheduledExecutor(new ThreadFactory() {
            @Override
            public Thread newThread(Runnable r) {
                Thread t = new Thread(r, "ConferenceRuntimeScheduler");
                t.setDaemon(true);
                return t;
            }
        }), true);
    }

    public ConferenceRuntimeScheduler(ScheduledExecutorService executor) {
        this(executor, false);
    }

    public ConferenceRuntimeScheduler(ScheduledExecutorService executor, boolean ownsExecutor) {
        if (executor == null) throw new IllegalArgumentException("executor cannot be null");
        this.executor = executor;
        this.ownsExecutor = ownsExecutor;
    }

    public synchronized void setActiveSessionId(long sessionId) {
        this.activeSessionId = sessionId;
    }

    public synchronized long getActiveSessionId() {
        return this.activeSessionId;
    }

    @Override
    public synchronized void scheduleOwnerDialTimeout(long sessionId, long delayMillis, final Runnable action) {
        cancelOwnerDialTimeout();
        this.activeSessionId = sessionId;
        final long expectedSessionId = sessionId;
        this.ownerDialTimeoutFuture = executor.schedule(new Runnable() {
            @Override
            public void run() {
                if (activeSessionId == expectedSessionId && action != null) {
                    action.run();
                }
            }
        }, delayMillis, TimeUnit.MILLISECONDS);
    }

    @Override
    public synchronized void scheduleMergeTimeout(long sessionId, long delayMillis, final Runnable action) {
        cancelMergeTimeout();
        this.activeSessionId = sessionId;
        final long expectedSessionId = sessionId;
        this.mergeTimeoutFuture = executor.schedule(new Runnable() {
            @Override
            public void run() {
                if (activeSessionId == expectedSessionId && action != null) {
                    action.run();
                }
            }
        }, delayMillis, TimeUnit.MILLISECONDS);
    }

    @Override
    public synchronized void scheduleConsultationTick(long sessionId, long initialDelayMillis, long periodMillis, final Runnable action) {
        cancelConsultationTick();
        this.activeSessionId = sessionId;
        final long expectedSessionId = sessionId;
        this.consultationTickFuture = executor.scheduleAtFixedRate(new Runnable() {
            @Override
            public void run() {
                if (activeSessionId == expectedSessionId && action != null) {
                    action.run();
                }
            }
        }, initialDelayMillis, periodMillis, TimeUnit.MILLISECONDS);
    }

    @Override
    public synchronized void cancelOwnerDialTimeout() {
        if (ownerDialTimeoutFuture != null) {
            ownerDialTimeoutFuture.cancel(false);
            ownerDialTimeoutFuture = null;
        }
    }

    @Override
    public synchronized void cancelMergeTimeout() {
        if (mergeTimeoutFuture != null) {
            mergeTimeoutFuture.cancel(false);
            mergeTimeoutFuture = null;
        }
    }

    @Override
    public synchronized void cancelConsultationTick() {
        if (consultationTickFuture != null) {
            consultationTickFuture.cancel(false);
            consultationTickFuture = null;
        }
    }

    @Override
    public synchronized void cancelAll() {
        cancelOwnerDialTimeout();
        cancelMergeTimeout();
        cancelConsultationTick();
        this.activeSessionId = -1;
    }

    public synchronized void shutdown() {
        cancelAll();
        if (ownsExecutor) {
            executor.shutdownNow();
        }
    }
}
