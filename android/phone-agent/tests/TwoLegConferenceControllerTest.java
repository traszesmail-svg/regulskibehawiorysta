package pl.regulski.phoneagent;

import java.util.ArrayList;
import java.util.List;

/**
 * Pure JVM unit tests for TwoLegConferenceController with fake Telecom adapter.
 * Covers all required safety properties without performing any real network or call operations.
 */
public final class TwoLegConferenceControllerTest {

    private static void check(boolean condition, String message) {
        if (!condition) throw new AssertionError("FAIL: " + message);
    }

    private static final class FakeClock implements Clock {
        long current = 1000000L;
        @Override public long currentTimeMillis() { return current; }
        void advance(long millis) { current += millis; }
    }

    private static final class FakeTelecomAdapter implements TwoLegTelecomAdapter {
        int placeOwnerCallCount = 0;
        int holdCallCount = 0;
        int unholdCallCount = 0;
        int mergeCallsCount = 0;
        int disconnectCallCount = 0;
        boolean localMuted = false;
        boolean earpieceEnforced = false;
        boolean failHold = false;
        boolean failOwnerDial = false;
        boolean failMerge = false;
        List<String> disconnectedCalls = new ArrayList<>();

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

    public static void main(String[] args) {
        testNoSecondLegBeforeClientActive();
        testHappyPathFlow();
        testNoMergeWithoutCapability();
        testMergeTimeoutFailsClosed();
        testClientDisconnectsBeforeConferenceFailsClosed();
        testOwnerDisconnectsBeforeConferenceFailsClosed();
        testOwnerDialTimeoutFailsClosed();
        testIdempotencyAndNoDuplicateDialOrMerge();
        testBillingTimerStartsStrictlyAtConferenceActive();
        testNoRawNumbersInLogs();
        testNoAutoRedial();

        System.out.println("PASS TwoLegConferenceControllerTest (All 11 safety tests passed)");
    }

    private static void testNoSecondLegBeforeClientActive() {
        FakeClock clock = new FakeClock();
        FakeTelecomAdapter adapter = new FakeTelecomAdapter();
        TwoLegConferenceController controller = new TwoLegConferenceController(adapter, clock);

        boolean started = controller.startConferenceFlow("+48111222333", "+48999888777", 900);
        check(started, "flow started");
        check(controller.getState() == TwoLegConferenceState.DIALING_CLIENT, "state is DIALING_CLIENT");

        controller.onClientCallAdded("call-client-1");
        // State 1 = DIALING, 9 = CONNECTING, 2 = RINGING. None of these should advance or trigger owner leg.
        controller.onClientCallStateChanged(1); // DIALING
        check(adapter.placeOwnerCallCount == 0, "no owner call during dialing");
        check(controller.getState() == TwoLegConferenceState.DIALING_CLIENT, "state remains DIALING_CLIENT");

        controller.onClientCallStateChanged(9); // CONNECTING
        check(adapter.placeOwnerCallCount == 0, "no owner call during connecting");
        check(controller.getState() == TwoLegConferenceState.DIALING_CLIENT, "state remains DIALING_CLIENT");

        controller.onClientCallStateChanged(2); // RINGING
        check(adapter.placeOwnerCallCount == 0, "no owner call during ringing");
        check(controller.getState() == TwoLegConferenceState.DIALING_CLIENT, "state remains DIALING_CLIENT");
    }

    private static void testHappyPathFlow() {
        FakeClock clock = new FakeClock();
        FakeTelecomAdapter adapter = new FakeTelecomAdapter();
        TwoLegConferenceController controller = new TwoLegConferenceController(adapter, clock);

        controller.startConferenceFlow("+48111222333", "+48999888777", 900);
        controller.onClientCallAdded("call-c");

        // 1. Client answers
        controller.onClientCallStateChanged(4); // ACTIVE
        check(controller.getState() == TwoLegConferenceState.CLIENT_ACTIVE, "CLIENT_ACTIVE reached");
        check(adapter.holdCallCount == 1, "hold requested for client");
        check(adapter.placeOwnerCallCount == 0, "owner call not yet placed before hold confirmed");

        // 2. Client is confirmed holding
        controller.onClientCallStateChanged(3); // HOLDING
        check(controller.getState() == TwoLegConferenceState.DIALING_OWNER, "DIALING_OWNER reached after holding");
        check(adapter.placeOwnerCallCount == 1, "owner call placed");

        // 3. Owner call added and answers
        controller.onOwnerCallAdded("call-o");
        controller.onOwnerCallStateChanged(4); // ACTIVE
        check(controller.getState() == TwoLegConferenceState.OWNER_ACTIVE, "OWNER_ACTIVE reached");
        check(adapter.mergeCallsCount == 0, "merge not called before capability check");

        // 4. Conference capabilities confirmed
        controller.onConferenceCapabilitiesChanged(true, true);
        check(controller.getState() == TwoLegConferenceState.MERGE_PENDING, "MERGE_PENDING reached");
        check(adapter.mergeCallsCount == 1, "mergeCalls called");
        check(adapter.localMuted, "local mic muted before merge");
        check(adapter.earpieceEnforced, "earpiece route enforced");

        // 5. Conference established
        controller.onConferenceActive("conf-root");
        check(controller.getState() == TwoLegConferenceState.CONFERENCE_ACTIVE, "CONFERENCE_ACTIVE reached");
        check(controller.isLocalMuted(), "local mic muted in conference");

        // 6. Consultation runs for 300s
        clock.advance(300_000);
        check(controller.getConsultationElapsedSeconds() == 300, "elapsed is 300s");

        // 7. Client hangs up -> clean completion
        controller.onClientCallStateChanged(7); // DISCONNECTED
        check(controller.getState() == TwoLegConferenceState.COMPLETED, "COMPLETED reached");
        check(controller.getConsultationElapsedSeconds() == 300, "final elapsed recorded as 300s");
        check(adapter.disconnectedCalls.contains("call-o"), "remaining owner leg disconnected");
    }

    private static void testNoMergeWithoutCapability() {
        FakeClock clock = new FakeClock();
        FakeTelecomAdapter adapter = new FakeTelecomAdapter();
        TwoLegConferenceController controller = new TwoLegConferenceController(adapter, clock);

        controller.startConferenceFlow("+48111222333", "+48999888777", 900);
        controller.onClientCallAdded("c");
        controller.onClientCallStateChanged(4); // active
        controller.onClientCallStateChanged(3); // holding
        controller.onOwnerCallAdded("o");
        controller.onOwnerCallStateChanged(4); // active

        check(controller.getState() == TwoLegConferenceState.OWNER_ACTIVE, "state is OWNER_ACTIVE");

        // Capabilities missing or unsupported:
        controller.onConferenceCapabilitiesChanged(false, true);
        check(adapter.mergeCallsCount == 0, "no merge if canMerge is false");
        check(controller.getState() == TwoLegConferenceState.OWNER_ACTIVE, "remains OWNER_ACTIVE");

        controller.onConferenceCapabilitiesChanged(true, false);
        check(adapter.mergeCallsCount == 0, "no merge if isConferenceable is false");
        check(controller.getState() == TwoLegConferenceState.OWNER_ACTIVE, "remains OWNER_ACTIVE");
    }

    private static void testMergeTimeoutFailsClosed() {
        FakeClock clock = new FakeClock();
        FakeTelecomAdapter adapter = new FakeTelecomAdapter();
        TwoLegConferenceController controller = new TwoLegConferenceController(adapter, clock);

        controller.startConferenceFlow("+48111222333", "+48999888777", 900);
        controller.onClientCallAdded("c");
        controller.onClientCallStateChanged(4);
        controller.onClientCallStateChanged(3);
        controller.onOwnerCallAdded("o");
        controller.onOwnerCallStateChanged(4);

        // Merge never succeeds, timeout fires:
        controller.onMergeTimeout();
        check(controller.getState() == TwoLegConferenceState.FAILED, "state is FAILED after merge timeout");
        check(adapter.disconnectedCalls.contains("c"), "client call disconnected");
        check(adapter.disconnectedCalls.contains("o"), "owner call disconnected");
        check(controller.getConsultationElapsedSeconds() == 0, "zero billing time on failure");
    }

    private static void testClientDisconnectsBeforeConferenceFailsClosed() {
        FakeClock clock = new FakeClock();
        FakeTelecomAdapter adapter = new FakeTelecomAdapter();
        TwoLegConferenceController controller = new TwoLegConferenceController(adapter, clock);

        controller.startConferenceFlow("+48111222333", "+48999888777", 900);
        controller.onClientCallAdded("c");
        controller.onClientCallStateChanged(4);
        controller.onClientCallStateChanged(3);
        controller.onOwnerCallAdded("o");

        // Client drops while owner is ringing:
        controller.onClientCallStateChanged(7);
        check(controller.getState() == TwoLegConferenceState.FAILED, "FAILED reached on premature client hangup");
        check(adapter.disconnectedCalls.contains("o"), "owner leg disconnected");
        check(controller.getConsultationElapsedSeconds() == 0, "zero billing time on premature drop");
    }

    private static void testOwnerDisconnectsBeforeConferenceFailsClosed() {
        FakeClock clock = new FakeClock();
        FakeTelecomAdapter adapter = new FakeTelecomAdapter();
        TwoLegConferenceController controller = new TwoLegConferenceController(adapter, clock);

        controller.startConferenceFlow("+48111222333", "+48999888777", 900);
        controller.onClientCallAdded("c");
        controller.onClientCallStateChanged(4);
        controller.onClientCallStateChanged(3);
        controller.onOwnerCallAdded("o");

        // Owner rejects or doesn't answer:
        controller.onOwnerCallStateChanged(7); // DISCONNECTED
        check(controller.getState() == TwoLegConferenceState.FAILED, "FAILED reached when owner rejects");
        check(adapter.disconnectedCalls.contains("c"), "client call disconnected");
        check(controller.getConsultationElapsedSeconds() == 0, "zero billing time");
    }

    private static void testOwnerDialTimeoutFailsClosed() {
        FakeClock clock = new FakeClock();
        FakeTelecomAdapter adapter = new FakeTelecomAdapter();
        TwoLegConferenceController controller = new TwoLegConferenceController(adapter, clock);

        controller.startConferenceFlow("+48111222333", "+48999888777", 900);
        controller.onClientCallAdded("c");
        controller.onClientCallStateChanged(4);
        controller.onClientCallStateChanged(3);
        controller.onOwnerCallAdded("o");

        controller.onOwnerDialTimeout();
        check(controller.getState() == TwoLegConferenceState.FAILED, "FAILED reached on owner timeout");
        check(adapter.disconnectedCalls.contains("c"), "client disconnected on owner timeout");
        check(adapter.disconnectedCalls.contains("o"), "owner disconnected on timeout");
    }

    private static void testIdempotencyAndNoDuplicateDialOrMerge() {
        FakeClock clock = new FakeClock();
        FakeTelecomAdapter adapter = new FakeTelecomAdapter();
        TwoLegConferenceController controller = new TwoLegConferenceController(adapter, clock);

        controller.startConferenceFlow("+48111222333", "+48999888777", 900);
        controller.onClientCallAdded("c");

        // Repeated active callbacks on client
        controller.onClientCallStateChanged(4);
        controller.onClientCallStateChanged(4);
        controller.onClientCallStateChanged(4);
        check(adapter.holdCallCount == 1, "hold only requested once");

        // Client holding
        controller.onClientCallStateChanged(3);
        controller.onClientCallStateChanged(3);
        check(adapter.placeOwnerCallCount == 1, "owner dial only requested once");

        // Owner active
        controller.onOwnerCallAdded("o");
        controller.onOwnerCallStateChanged(4);
        controller.onOwnerCallStateChanged(4);

        // Repeated capability callbacks
        controller.onConferenceCapabilitiesChanged(true, true);
        controller.onConferenceCapabilitiesChanged(true, true);
        check(adapter.mergeCallsCount == 1, "merge only requested once");

        // In terminal state, callbacks ignored
        controller.abort("forced abort");
        check(controller.getState() == TwoLegConferenceState.FAILED, "state is FAILED");
        controller.onConferenceActive("ignored");
        check(controller.getState() == TwoLegConferenceState.FAILED, "state remains FAILED");
    }

    private static void testBillingTimerStartsStrictlyAtConferenceActive() {
        FakeClock clock = new FakeClock();
        FakeTelecomAdapter adapter = new FakeTelecomAdapter();
        TwoLegConferenceController controller = new TwoLegConferenceController(adapter, clock);

        controller.startConferenceFlow("+48111222333", "+48999888777", 900);
        clock.advance(15000); // 15s dialing
        check(controller.getConsultationElapsedSeconds() == 0, "0s while dialing client");

        controller.onClientCallAdded("c");
        controller.onClientCallStateChanged(4);
        clock.advance(5000); // 5s active before hold
        check(controller.getConsultationElapsedSeconds() == 0, "0s during client hold prep");

        controller.onClientCallStateChanged(3); // holding
        clock.advance(20000); // 20s dialing owner
        check(controller.getConsultationElapsedSeconds() == 0, "0s during dialing owner");

        controller.onOwnerCallAdded("o");
        controller.onOwnerCallStateChanged(4);
        controller.onConferenceCapabilitiesChanged(true, true);
        clock.advance(3000); // 3s merge pending
        check(controller.getConsultationElapsedSeconds() == 0, "0s during merge pending");

        // Conference active now!
        controller.onConferenceActive("conf-root");
        check(controller.getConsultationElapsedSeconds() == 0, "0s immediately at conference start");

        clock.advance(45000); // 45s in conference
        check(controller.getConsultationElapsedSeconds() == 45, "strictly 45s after conference start");
    }

    private static void testNoRawNumbersInLogs() {
        String rawClient = "+48123456789";
        String rawOwner = "+48987654321";
        String maskedClient = ConferencePhoneMasker.mask(rawClient);
        String maskedOwner = ConferencePhoneMasker.mask(rawOwner);

        check(!maskedClient.contains("123456789"), "masked client does not leak full number");
        check(!maskedOwner.contains("987654321"), "masked owner does not leak full number");
        check(maskedClient.contains("***"), "masked client has asterisks");
        check(maskedOwner.contains("***"), "masked owner has asterisks");

        FakeTelecomAdapter adapter = new FakeTelecomAdapter();
        TwoLegConferenceController controller = new TwoLegConferenceController(adapter);
        controller.startConferenceFlow(rawClient, rawOwner, 900);

        check(controller.getMaskedClientNumber().equals(maskedClient), "controller masks client");
        check(controller.getMaskedOwnerNumber().equals(maskedOwner), "controller masks owner");
    }

    private static void testNoAutoRedial() {
        FakeTelecomAdapter adapter = new FakeTelecomAdapter();
        TwoLegConferenceController controller = new TwoLegConferenceController(adapter);
        check(!controller.hasAutoRedial(), "hasAutoRedial is strictly false");

        controller.startConferenceFlow("+48111222333", "+48999888777", 900);
        controller.onClientCallAdded("c");
        controller.onClientCallStateChanged(7); // drops

        check(controller.getState() == TwoLegConferenceState.FAILED, "state is FAILED");
        check(adapter.placeOwnerCallCount == 0, "no redial to owner");
        check(adapter.holdCallCount == 0, "no redial");
    }
}
