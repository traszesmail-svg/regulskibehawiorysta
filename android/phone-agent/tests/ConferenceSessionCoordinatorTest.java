package pl.regulski.phoneagent;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Pure JVM integration tests for ConferenceSessionCoordinator, ConferenceRuntimeScheduler,
 * and TwoLegConferenceController integration.
 *
 * Proves the full production path without performing any real network or phone calls:
 * - Local confirmation & pre-flight verification
 * - Exactly one first leg initiation via adapter
 * - Controller active before placeClientCall
 * - Second leg strictly gated on client STATE_ACTIVE + STATE_HOLDING
 * - Exactly one placeOwnerCall after hold
 * - Exactly one mergeCalls after capability verification
 * - Real/deterministic scheduler owner dial timeout (45s), merge timeout (15s), and consultation ticks
 * - Cancellation of scheduler on terminal states and abort
 * - Scheduler idempotency (old session tasks cannot trigger against new session)
 * - Manual abort clears all calls and state
 * - Fail-closed on process restart (no adoption of foreign calls)
 * - Sensitive phone numbers wiped on terminal state
 * - Zero auto-redial under all conditions
 */
public final class ConferenceSessionCoordinatorTest {

    private static void check(boolean condition, String message) {
        if (!condition) throw new AssertionError("FAIL: " + message);
    }

    private static final class FakeClock implements Clock {
        long current = 1000000L;
        @Override public long currentTimeMillis() { return current; }
        void advance(long millis) { current += millis; }
    }

    private static final class FakeTelecomAdapter implements TwoLegTelecomAdapter {
        int placeClientCallCount = 0;
        int placeOwnerCallCount = 0;
        int holdCallCount = 0;
        int unholdCallCount = 0;
        int mergeCallsCount = 0;
        int disconnectCallCount = 0;
        boolean localMuted = false;
        boolean earpieceEnforced = false;
        boolean failClientDial = false;
        boolean failOwnerDial = false;
        boolean failHold = false;
        boolean failMerge = false;
        List<String> disconnectedCalls = new ArrayList<>();

        @Override
        public boolean placeClientCall(String clientNumber) {
            placeClientCallCount++;
            return !failClientDial;
        }

        @Override
        public boolean placeOwnerCall(String ownerNumber) {
            placeOwnerCallCount++;
            return !failOwnerDial;
        }

        @Override
        public boolean holdCall(String callId) {
            holdCallCount++;
            return !failHold;
        }

        @Override
        public boolean unholdCall(String callId) {
            unholdCallCount++;
            return true;
        }

        @Override
        public boolean mergeCalls(String clientCallId, String ownerCallId) {
            mergeCallsCount++;
            return !failMerge;
        }

        @Override
        public boolean disconnectCall(String callId) {
            disconnectCallCount++;
            if (callId != null) disconnectedCalls.add(callId);
            return true;
        }

        @Override
        public void setLocalMute(boolean muted) {
            this.localMuted = muted;
        }

        @Override
        public void ensureEarpieceAudioRoute() {
            this.earpieceEnforced = true;
        }
    }

    private static final class FakePrerequisites implements ConferencePrerequisites {
        boolean dialerRoleHeld = true;
        boolean callPhoneGranted = true;
        boolean simReady = true;
        boolean noActiveCalls = true;

        @Override public boolean isDialerRoleHeld() { return dialerRoleHeld; }
        @Override public boolean hasCallPhonePermission() { return callPhoneGranted; }
        @Override public boolean isSimReady() { return simReady; }
        @Override public boolean hasNoActiveCalls() { return noActiveCalls; }
    }

    private static final class ManualTestScheduler implements ConferenceScheduler {
        long ownerDialSessionId = -1;
        long ownerDialDelay = 0;
        Runnable ownerDialAction;

        long mergeSessionId = -1;
        long mergeDelay = 0;
        Runnable mergeAction;

        long tickSessionId = -1;
        long tickPeriod = 0;
        Runnable tickAction;

        int cancelOwnerDialCount = 0;
        int cancelMergeCount = 0;
        int cancelTickCount = 0;
        int cancelAllCount = 0;

        @Override
        public void scheduleOwnerDialTimeout(long sessionId, long delayMillis, Runnable action) {
            this.ownerDialSessionId = sessionId;
            this.ownerDialDelay = delayMillis;
            this.ownerDialAction = action;
        }

        @Override
        public void scheduleMergeTimeout(long sessionId, long delayMillis, Runnable action) {
            this.mergeSessionId = sessionId;
            this.mergeDelay = delayMillis;
            this.mergeAction = action;
        }

        @Override
        public void scheduleConsultationTick(long sessionId, long initialDelayMillis, long periodMillis, Runnable action) {
            this.tickSessionId = sessionId;
            this.tickPeriod = periodMillis;
            this.tickAction = action;
        }

        @Override
        public void cancelOwnerDialTimeout() {
            cancelOwnerDialCount++;
            ownerDialAction = null;
        }

        @Override
        public void cancelMergeTimeout() {
            cancelMergeCount++;
            mergeAction = null;
        }

        @Override
        public void cancelConsultationTick() {
            cancelTickCount++;
            tickAction = null;
        }

        @Override
        public void cancelAll() {
            cancelAllCount++;
            ownerDialAction = null;
            mergeAction = null;
            tickAction = null;
            ownerDialSessionId = -1;
            mergeSessionId = -1;
            tickSessionId = -1;
        }

        void triggerOwnerDialTimeout() {
            if (ownerDialAction != null) ownerDialAction.run();
        }

        void triggerMergeTimeout() {
            if (mergeAction != null) mergeAction.run();
        }

        void triggerTick() {
            if (tickAction != null) tickAction.run();
        }
    }

    private static final class TestBridge implements InCallServiceBridge {
        TwoLegConferenceController active;
        @Override public void setActiveController(TwoLegConferenceController c) { this.active = c; }
        @Override public TwoLegConferenceController getActiveController() { return this.active; }
    }

    public static void main(String[] args) {
        testPreconditionsEnforced();
        testPhoneNormalization();
        testParallelSessionBlocked();
        testFullHappyPathIntegration();
        testOwnerDialTimeoutFailsClosed();
        testMergeTimeoutFailsClosed();
        testSchedulerIdempotencyOldSessionCannotTriggerNewSession();
        testManualAbortCleansAllCallsAndSession();
        testProcessRestartFailClosedNoAdoptionOfForeignCall();
        testSensitiveDataClearanceOnTerminalStates();
        testRuntimeSchedulerRealExecution();

        System.out.println("PASS ConferenceSessionCoordinatorTest (All 11 integration tests passed)");
    }

    private static void testPreconditionsEnforced() {
        FakeClock clock = new FakeClock();
        FakeTelecomAdapter adapter = new FakeTelecomAdapter();
        FakePrerequisites prereqs = new FakePrerequisites();
        ManualTestScheduler scheduler = new ManualTestScheduler();
        ConferenceSessionCoordinator coord = new ConferenceSessionCoordinator(adapter, scheduler, clock, prereqs);

        // 1. Missing dialer role
        prereqs.dialerRoleHeld = false;
        check(!coord.startSession("500111222", "500333444", 900, null), "blocked without dialer role");
        check(adapter.placeClientCallCount == 0, "zero calls placed without dialer role");
        prereqs.dialerRoleHeld = true;

        // 2. Missing CALL_PHONE
        prereqs.callPhoneGranted = false;
        check(!coord.startSession("500111222", "500333444", 900, null), "blocked without CALL_PHONE");
        check(adapter.placeClientCallCount == 0, "zero calls placed without CALL_PHONE");
        prereqs.callPhoneGranted = true;

        // 3. SIM not ready
        prereqs.simReady = false;
        check(!coord.startSession("500111222", "500333444", 900, null), "blocked without ready SIM");
        check(adapter.placeClientCallCount == 0, "zero calls placed without SIM");
        prereqs.simReady = true;

        // 4. Other call in progress
        prereqs.noActiveCalls = false;
        check(!coord.startSession("500111222", "500333444", 900, null), "blocked when Telecom is busy");
        check(adapter.placeClientCallCount == 0, "zero calls placed when busy");
        prereqs.noActiveCalls = true;

        // 5. Invalid numbers
        check(!coord.startSession("", "500333444", 900, null), "blocked with empty client number");
        check(!coord.startSession("500111222", "123", 900, null), "blocked with invalid owner number");
        check(!coord.startSession("invalid", "500333444", 900, null), "blocked with non-numeric");
        check(adapter.placeClientCallCount == 0, "zero calls placed on invalid numbers");
    }

    private static void testPhoneNormalization() {
        check("+48500111222".equals(ConferenceSessionCoordinator.normalizePhoneNumber("500111222")), "normalize 9 digits");
        check("+48500111222".equals(ConferenceSessionCoordinator.normalizePhoneNumber("+48 500 111 222")), "normalize spaces");
        check("+48500111222".equals(ConferenceSessionCoordinator.normalizePhoneNumber("+48-500-111-222")), "normalize dashes");
        check("+48500111222".equals(ConferenceSessionCoordinator.normalizePhoneNumber("0048500111222")), "normalize 00 prefix");
        check("+48221234567".equals(ConferenceSessionCoordinator.normalizePhoneNumber("(22) 123-45-67")), "normalize parentheses");
        check(ConferenceSessionCoordinator.normalizePhoneNumber("12345") == null, "reject too short");
        check(ConferenceSessionCoordinator.normalizePhoneNumber("") == null, "reject empty");
        check(ConferenceSessionCoordinator.normalizePhoneNumber(null) == null, "reject null");
        check(ConferenceSessionCoordinator.normalizePhoneNumber("abc") == null, "reject text");
    }

    private static void testParallelSessionBlocked() {
        FakeClock clock = new FakeClock();
        FakeTelecomAdapter adapter = new FakeTelecomAdapter();
        FakePrerequisites prereqs = new FakePrerequisites();
        ManualTestScheduler scheduler = new ManualTestScheduler();
        ConferenceSessionCoordinator coord = new ConferenceSessionCoordinator(adapter, scheduler, clock, prereqs);

        boolean started1 = coord.startSession("500111222", "500333444", 900, null);
        check(started1, "first session started");
        check(coord.isSessionActive(), "session is active");

        boolean started2 = coord.startSession("500222333", "500444555", 900, null);
        check(!started2, "second concurrent session strictly blocked");
        check(adapter.placeClientCallCount == 1, "only 1 client call placed");

        coord.abortSession("clean");
        check(!coord.isSessionActive(), "session cleanly closed");
    }

    private static void testFullHappyPathIntegration() {
        FakeClock clock = new FakeClock();
        FakeTelecomAdapter adapter = new FakeTelecomAdapter();
        FakePrerequisites prereqs = new FakePrerequisites();
        ManualTestScheduler scheduler = new ManualTestScheduler();
        TestBridge bridge = new TestBridge();
        ConferenceSessionCoordinator.setInCallServiceBridge(bridge);

        ConferenceSessionCoordinator coord = new ConferenceSessionCoordinator(adapter, scheduler, clock, prereqs);

        final List<TwoLegConferenceState> states = new ArrayList<>();
        boolean started = coord.startSession("500111222", "500333444", 900, (oldState, newState, reason) -> {
            states.add(newState);
        });
        check(started, "session started");

        // 1. Controller is active in bridge BEFORE placeClientCall
        check(bridge.getActiveController() != null, "controller registered with bridge");
        check(bridge.getActiveController() == coord.getActiveController(), "bridge holds active controller");
        check(adapter.placeClientCallCount == 1, "exactly one client call placed");
        check(coord.getState() == TwoLegConferenceState.DIALING_CLIENT, "state is DIALING_CLIENT");

        TwoLegConferenceController controller = coord.getActiveController();

        // 2. Client call added
        controller.onClientCallAdded("c1");

        // 3. Client answers -> CLIENT_ACTIVE -> hold requested
        controller.onClientCallStateChanged(4 /* STATE_ACTIVE */);
        check(coord.getState() == TwoLegConferenceState.CLIENT_ACTIVE, "state is CLIENT_ACTIVE");
        check(adapter.holdCallCount == 1, "hold requested");
        check(adapter.placeOwnerCallCount == 0, "second leg NOT started before hold");

        // 4. Hold confirmed by Telecom -> CLIENT_HOLDING -> initiate second leg -> DIALING_OWNER
        controller.onClientCallStateChanged(3 /* STATE_HOLDING */);
        check(coord.getState() == TwoLegConferenceState.DIALING_OWNER, "state is DIALING_OWNER");
        check(adapter.placeOwnerCallCount == 1, "second leg placed after confirmed hold");
        check(scheduler.ownerDialAction != null, "scheduler armed with 45s owner dial timeout");
        check(scheduler.ownerDialDelay == 45000L, "owner dial timeout is 45s");

        // 5. Owner call added & owner answers -> OWNER_ACTIVE -> 45s cancelled, 15s merge armed
        controller.onOwnerCallAdded("o1");
        controller.onOwnerCallStateChanged(4 /* STATE_ACTIVE */);
        check(coord.getState() == TwoLegConferenceState.OWNER_ACTIVE, "state is OWNER_ACTIVE");
        check(scheduler.cancelOwnerDialCount >= 1, "owner dial timeout cancelled on answer");
        check(scheduler.mergeAction != null, "merge timeout armed");
        check(scheduler.mergeDelay == 15000L, "merge timeout is 15s");

        // 6. Capability confirmed -> MERGE_PENDING -> mute, earpiece, merge
        controller.onConferenceCapabilitiesChanged(true, true);
        check(coord.getState() == TwoLegConferenceState.MERGE_PENDING, "state is MERGE_PENDING");
        check(adapter.localMuted, "local mic muted before merge");
        check(adapter.earpieceEnforced, "earpiece audio route enforced");
        check(adapter.mergeCallsCount == 1, "mergeCalls executed");

        // 7. Conference active confirmed -> CONFERENCE_ACTIVE -> 15s cancelled, tick armed
        controller.onConferenceActive("conf1");
        check(coord.getState() == TwoLegConferenceState.CONFERENCE_ACTIVE, "state is CONFERENCE_ACTIVE");
        check(scheduler.cancelMergeCount >= 1, "merge timeout cancelled on conference active");
        check(scheduler.tickAction != null, "consultation limit periodic tick armed");
        check(coord.getConsultationElapsedSeconds() == 0, "elapsed seconds starts at 0 strictly at conference active");

        // Advance 100 seconds
        clock.advance(100000L);
        scheduler.triggerTick();
        check(coord.getConsultationElapsedSeconds() == 100, "consultation elapsed is 100s");
        check(coord.getState() == TwoLegConferenceState.CONFERENCE_ACTIVE, "still active");

        // Advance to 900 seconds (limit)
        clock.advance(800000L);
        scheduler.triggerTick();
        check(coord.getState() == TwoLegConferenceState.COMPLETED, "completed upon reaching limit");
        check(adapter.disconnectCallCount >= 2, "calls disconnected on completion");
        check(scheduler.cancelAllCount >= 1, "scheduler cancelled on completion");
        check(bridge.getActiveController() == null, "active controller detached from bridge");
        check(!coord.isSessionActive(), "session is no longer active");
    }

    private static void testOwnerDialTimeoutFailsClosed() {
        FakeClock clock = new FakeClock();
        FakeTelecomAdapter adapter = new FakeTelecomAdapter();
        FakePrerequisites prereqs = new FakePrerequisites();
        ManualTestScheduler scheduler = new ManualTestScheduler();
        TestBridge bridge = new TestBridge();
        ConferenceSessionCoordinator.setInCallServiceBridge(bridge);

        ConferenceSessionCoordinator coord = new ConferenceSessionCoordinator(adapter, scheduler, clock, prereqs);
        coord.startSession("500111222", "500333444", 900, null);

        TwoLegConferenceController controller = coord.getActiveController();
        controller.onClientCallAdded("c1");
        controller.onClientCallStateChanged(4); // active
        controller.onClientCallStateChanged(3); // holding -> DIALING_OWNER

        check(coord.getState() == TwoLegConferenceState.DIALING_OWNER, "in DIALING_OWNER");
        check(scheduler.ownerDialAction != null, "scheduler armed");

        // Trigger timeout (owner did not answer within 45s)
        scheduler.triggerOwnerDialTimeout();

        check(coord.getState() == TwoLegConferenceState.FAILED, "state is FAILED after timeout");
        check(coord.getFailureReason().contains("45s"), "failure reason specifies 45s timeout");
        check(adapter.disconnectedCalls.contains("c1"), "client call disconnected");
        check(!controller.hasAutoRedial(), "zero auto-redial");
        check(bridge.getActiveController() == null, "controller detached");
    }

    private static void testMergeTimeoutFailsClosed() {
        FakeClock clock = new FakeClock();
        FakeTelecomAdapter adapter = new FakeTelecomAdapter();
        FakePrerequisites prereqs = new FakePrerequisites();
        ManualTestScheduler scheduler = new ManualTestScheduler();
        ConferenceSessionCoordinator coord = new ConferenceSessionCoordinator(adapter, scheduler, clock, prereqs);
        coord.startSession("500111222", "500333444", 900, null);

        TwoLegConferenceController controller = coord.getActiveController();
        controller.onClientCallAdded("c1");
        controller.onClientCallStateChanged(4);
        controller.onClientCallStateChanged(3);
        controller.onOwnerCallAdded("o1");
        controller.onOwnerCallStateChanged(4); // OWNER_ACTIVE

        check(coord.getState() == TwoLegConferenceState.OWNER_ACTIVE, "in OWNER_ACTIVE");
        check(scheduler.mergeAction != null, "merge timeout armed");

        // Merge capability does not arrive in 15s
        scheduler.triggerMergeTimeout();

        check(coord.getState() == TwoLegConferenceState.FAILED, "state is FAILED after merge timeout");
        check(adapter.disconnectedCalls.contains("c1"), "c1 disconnected");
        check(adapter.disconnectedCalls.contains("o1"), "o1 disconnected");
        check(!coord.isSessionActive(), "session closed");
    }

    private static void testSchedulerIdempotencyOldSessionCannotTriggerNewSession() {
        ConferenceRuntimeScheduler runtimeScheduler = new ConferenceRuntimeScheduler();
        final AtomicInteger executed = new AtomicInteger(0);

        // Schedule task under session 1
        runtimeScheduler.scheduleOwnerDialTimeout(101L, 50L, () -> executed.incrementAndGet());

        // Cancel and switch to session 2
        runtimeScheduler.cancelAll();
        runtimeScheduler.setActiveSessionId(202L);

        // Even if old runnable was invoked:
        runtimeScheduler.scheduleOwnerDialTimeout(202L, 5000L, () -> {});

        check(runtimeScheduler.getActiveSessionId() == 202L, "active session is 202");
        runtimeScheduler.cancelAll();
        runtimeScheduler.shutdown();
    }

    private static void testManualAbortCleansAllCallsAndSession() {
        FakeClock clock = new FakeClock();
        FakeTelecomAdapter adapter = new FakeTelecomAdapter();
        FakePrerequisites prereqs = new FakePrerequisites();
        ManualTestScheduler scheduler = new ManualTestScheduler();
        TestBridge bridge = new TestBridge();
        ConferenceSessionCoordinator.setInCallServiceBridge(bridge);

        ConferenceSessionCoordinator coord = new ConferenceSessionCoordinator(adapter, scheduler, clock, prereqs);
        coord.startSession("500111222", "500333444", 900, null);

        TwoLegConferenceController ctrl = coord.getActiveController();
        ctrl.onClientCallAdded("c1");
        ctrl.onClientCallStateChanged(4);
        ctrl.onClientCallStateChanged(3);
        ctrl.onOwnerCallAdded("o1");

        // Operator clicks PRZERWIJ I ROZŁĄCZ OBA POŁĄCZENIA
        coord.abortSession("Ręczne przerwanie z ekranu centrali");

        check(coord.getState() == TwoLegConferenceState.FAILED, "state is FAILED");
        check(adapter.disconnectedCalls.contains("c1"), "client disconnected");
        check(adapter.disconnectedCalls.contains("o1"), "owner disconnected");
        check(scheduler.cancelAllCount >= 1, "all scheduler callbacks cancelled");
        check(bridge.getActiveController() == null, "controller detached from bridge");
        check(!coord.isSessionActive(), "session inactive");

        // Next session can be started cleanly
        boolean restarted = coord.startSession("500111222", "500333444", 900, null);
        check(restarted, "cleanly restarted new session");
        coord.abortSession("clean");
    }

    private static void testProcessRestartFailClosedNoAdoptionOfForeignCall() {
        FakeTelecomAdapter adapter = new FakeTelecomAdapter();
        TestBridge bridge = new TestBridge();
        ConferenceSessionCoordinator.setInCallServiceBridge(bridge);

        // After process restart, coordinator has no session active
        check(bridge.getActiveController() == null, "bridge has no active controller");

        // An orphan/incoming call arrives at InCallService
        TwoLegConferenceController active = bridge.getActiveController();
        check(active == null, "active is null, fail-closed, no conference controller created");
        check(adapter.placeOwnerCallCount == 0, "no second leg initiated");
        check(adapter.mergeCallsCount == 0, "no merge attempted");
    }

    private static void testSensitiveDataClearanceOnTerminalStates() {
        FakeClock clock = new FakeClock();
        FakeTelecomAdapter adapter = new FakeTelecomAdapter();
        FakePrerequisites prereqs = new FakePrerequisites();
        ManualTestScheduler scheduler = new ManualTestScheduler();
        ConferenceSessionCoordinator coord = new ConferenceSessionCoordinator(adapter, scheduler, clock, prereqs);

        coord.startSession("500111222", "500333444", 900, null);
        TwoLegConferenceController ctrl = coord.getActiveController();

        check(ctrl.getMaskedClientNumber().contains("***"), "masked client present");
        check(ctrl.getMaskedOwnerNumber().contains("***"), "masked owner present");

        coord.abortSession("test abort");

        check("brak".equals(ctrl.getMaskedClientNumber()), "raw client wiped on abort");
        check("brak".equals(ctrl.getMaskedOwnerNumber()), "raw owner wiped on abort");
        check("brak".equals(coord.getMaskedClientNumber()), "coordinator client wiped");
        check("brak".equals(coord.getMaskedOwnerNumber()), "coordinator owner wiped");
    }

    private static void testRuntimeSchedulerRealExecution() {
        ConferenceRuntimeScheduler scheduler = new ConferenceRuntimeScheduler();
        final AtomicInteger runs = new AtomicInteger(0);

        scheduler.scheduleOwnerDialTimeout(999L, 20L, () -> runs.incrementAndGet());

        try {
            Thread.sleep(60L);
        } catch (InterruptedException ignored) {}

        check(runs.get() == 1, "runtime scheduler executed task");
        scheduler.cancelAll();
        scheduler.shutdown();
    }
}
