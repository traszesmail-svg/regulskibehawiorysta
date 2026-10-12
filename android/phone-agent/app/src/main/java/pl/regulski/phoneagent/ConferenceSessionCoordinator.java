package pl.regulski.phoneagent;

/**
 * Process-local coordinator managing the two-leg conference call lifecycle.
 *
 * Enforces:
 * - Single active session lock (strictly blocks concurrent sessions).
 * - Phone number validation & normalization in-memory (never persisted to disk, preferences, heartbeat or logs).
 * - Pre-flight verification (dialer role, CALL_PHONE, active SIM, zero active calls).
 * - Exact-one controller instantiation registered as active in InCallService BEFORE placing first leg call.
 * - Safe resolution of InCallService lifecycle race condition via InCallServiceBridge.
 * - Fail-closed on process restart, unexpected disconnect, or timeout.
 * - Full wipe of sensitive phone numbers and removal of active controller upon any terminal state.
 * - Zero automatic redial.
 */
public final class ConferenceSessionCoordinator {
    private static volatile ConferenceSessionCoordinator instance;

    private static volatile InCallServiceBridge inCallServiceBridge = new InCallServiceBridge() {
        private TwoLegConferenceController controller;
        @Override
        public void setActiveController(TwoLegConferenceController c) {
            this.controller = c;
        }
        @Override
        public TwoLegConferenceController getActiveController() {
            return this.controller;
        }
    };

    public static synchronized void setInCallServiceBridge(InCallServiceBridge bridge) {
        if (bridge != null) {
            inCallServiceBridge = bridge;
        }
    }

    public static InCallServiceBridge getInCallServiceBridge() {
        return inCallServiceBridge;
    }

    public interface SessionListener {
        void onSessionStateChanged(TwoLegConferenceState oldState, TwoLegConferenceState newState, String reason);
    }

    private final TwoLegTelecomAdapter adapter;
    private final ConferenceScheduler scheduler;
    private final Clock clock;
    private final ConferencePrerequisites prerequisites;

    private TwoLegConferenceController activeController;
    private long currentSessionId = 0;
    private String activeClientNumber;
    private String activeOwnerNumber;
    private SessionListener sessionListener;
    private boolean sessionActive = false;
    private TwoLegConferenceState lastState = TwoLegConferenceState.IDLE;
    private String lastFailureReason = null;
    private long lastConsultationElapsedSeconds = 0;

    public static synchronized ConferenceSessionCoordinator getInstance() {
        if (instance == null) {
            throw new IllegalStateException("ConferenceSessionCoordinator nie został zainicjowany.");
        }
        return instance;
    }

    public static synchronized boolean isInitialized() {
        return instance != null;
    }

    public static synchronized void initialize(TwoLegTelecomAdapter adapter, ConferenceScheduler scheduler, Clock clock, ConferencePrerequisites prerequisites) {
        instance = new ConferenceSessionCoordinator(adapter, scheduler, clock, prerequisites);
    }

    public static synchronized void resetInstanceForTesting() {
        if (instance != null) {
            instance.abortSession("Reset do testów");
            instance = null;
        }
    }

    public ConferenceSessionCoordinator(TwoLegTelecomAdapter adapter, ConferenceScheduler scheduler, Clock clock, ConferencePrerequisites prerequisites) {
        if (adapter == null) throw new IllegalArgumentException("adapter cannot be null");
        this.adapter = adapter;
        this.scheduler = scheduler;
        this.clock = clock != null ? clock : Clock.SYSTEM;
        this.prerequisites = prerequisites;
    }

    public synchronized boolean isSessionActive() {
        return sessionActive && activeController != null;
    }

    public synchronized TwoLegConferenceController getActiveController() {
        return activeController;
    }

    public synchronized long getCurrentSessionId() {
        return currentSessionId;
    }

    public synchronized TwoLegConferenceState getState() {
        return activeController != null ? activeController.getState() : lastState;
    }

    public synchronized String getMaskedClientNumber() {
        return activeController != null ? activeController.getMaskedClientNumber() : "brak";
    }

    public synchronized String getMaskedOwnerNumber() {
        return activeController != null ? activeController.getMaskedOwnerNumber() : "brak";
    }

    public synchronized long getConsultationElapsedSeconds() {
        return activeController != null ? activeController.getConsultationElapsedSeconds() : lastConsultationElapsedSeconds;
    }

    public synchronized String getFailureReason() {
        return activeController != null ? activeController.getFailureReason() : lastFailureReason;
    }

    /**
     * Pre-flight validation returning null if all checks pass, or Polish reason string on failure.
     */
    public synchronized String verifyPrerequisites() {
        if (prerequisites == null) return null;
        if (!prerequisites.isDialerRoleHeld()) {
            return "Brak roli domyślnego dialera systemowego.";
        }
        if (!prerequisites.hasCallPhonePermission()) {
            return "Brak uprawnienia CALL_PHONE.";
        }
        if (!prerequisites.isSimReady()) {
            return "Karta SIM nie jest gotowa (brak sieci/karty).";
        }
        if (!prerequisites.hasNoActiveCalls()) {
            return "Wykryto inne aktywne połączenie telefoniczne.";
        }
        return null;
    }

    /**
     * Starts the controlled two-leg consultation flow.
     *
     * Pre-conditions:
     * - No active session in progress.
     * - Prerequisites satisfied (dialer role, CALL_PHONE, SIM ready, no active calls).
     * - Both phone numbers valid.
     *
     * Action:
     * - Allocates unique sessionId.
     * - Instantiates TwoLegConferenceController and registers it with InCallService BEFORE placing call.
     * - Initiates leg 1 (client) via adapter.placeClientCall.
     */
    public synchronized boolean startSession(String clientNumber, String ownerNumber, long maxConsultationSeconds, final SessionListener listener) {
        if (sessionActive || activeController != null) {
            return false;
        }

        String prereqError = verifyPrerequisites();
        if (prereqError != null) {
            return false;
        }

        String cleanClient = normalizePhoneNumber(clientNumber);
        String cleanOwner = normalizePhoneNumber(ownerNumber);
        if (cleanClient == null || cleanOwner == null) {
            return false;
        }

        this.currentSessionId = clock.currentTimeMillis();
        this.activeClientNumber = cleanClient;
        this.activeOwnerNumber = cleanOwner;
        this.sessionListener = listener;
        this.sessionActive = true;
        this.lastState = TwoLegConferenceState.IDLE;
        this.lastFailureReason = null;
        this.lastConsultationElapsedSeconds = 0;

        // Create controller and register with InCallService BEFORE placing first call
        this.activeController = new TwoLegConferenceController(adapter, clock, scheduler, currentSessionId);
        inCallServiceBridge.setActiveController(activeController);

        this.activeController.addListener(new TwoLegConferenceController.StateChangeListener() {
            @Override
            public void onStateChanged(TwoLegConferenceState oldState, TwoLegConferenceState newState, String reason) {
                synchronized (ConferenceSessionCoordinator.this) {
                    lastState = newState;
                    if (activeController != null) {
                        lastFailureReason = activeController.getFailureReason();
                        lastConsultationElapsedSeconds = activeController.getConsultationElapsedSeconds();
                    }
                    if (listener != null) {
                        try {
                            listener.onSessionStateChanged(oldState, newState, reason);
                        } catch (Exception ignored) {}
                    }
                    if (newState == TwoLegConferenceState.COMPLETED || newState == TwoLegConferenceState.FAILED) {
                        cleanupTerminalSession();
                    }
                }
            }
        });

        // Start flow: transitions to DIALING_CLIENT and places client call via adapter
        boolean started = activeController.startConferenceFlow(cleanClient, cleanOwner, maxConsultationSeconds);
        if (!started) {
            cleanupTerminalSession();
            return false;
        }

        return true;
    }

    /**
     * Manual abort: disconnects both legs immediately, cancels timers, clears state fail-closed.
     */
    public synchronized void abortSession(String reason) {
        if (activeController != null) {
            activeController.abort(reason != null ? reason : "Przerwano ręcznie przez operatora");
        } else {
            if (adapter != null) {
                adapter.disconnectCall(null);
            }
        }
        cleanupTerminalSession();
    }

    /**
     * Fail-closed terminal cleanup:
     * Clears sensitive phone numbers from memory, cancels all timers, detaches active controller.
     */
    private synchronized void cleanupTerminalSession() {
        this.sessionActive = false;
        this.activeClientNumber = null;
        this.activeOwnerNumber = null;
        if (scheduler != null) {
            scheduler.cancelAll();
        }
        if (activeController != null) {
            activeController.clearSensitiveNumbers();
        }
        inCallServiceBridge.setActiveController(null);
        this.activeController = null;
    }

    /**
     * Normalizes and validates a phone number string.
     * Accepts E.164 (+48...) or Polish national 9-digit format.
     * Returns normalized E.164 string or null if invalid.
     */
    public static String normalizePhoneNumber(String raw) {
        if (raw == null) return null;
        String trimmed = raw.trim();
        if (trimmed.isEmpty()) return null;

        String cleaned = trimmed.replaceAll("[\\s\\-\\(\\)]", "");
        if (cleaned.startsWith("+")) {
            String digits = cleaned.substring(1);
            if (!digits.matches("\\d{7,15}")) return null;
            return "+" + digits;
        } else if (cleaned.startsWith("00")) {
            String digits = cleaned.substring(2);
            if (!digits.matches("\\d{7,15}")) return null;
            return "+" + digits;
        } else if (cleaned.matches("\\d{9}")) {
            return "+48" + cleaned;
        } else if (cleaned.matches("\\d{10,15}")) {
            return "+" + cleaned;
        }
        return null;
    }
}
