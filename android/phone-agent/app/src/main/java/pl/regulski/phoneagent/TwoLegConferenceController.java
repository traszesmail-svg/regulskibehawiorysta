package pl.regulski.phoneagent;

import java.util.ArrayList;
import java.util.List;

/**
 * Deterministic, fail-closed state machine controlling two-leg GSM operator consultation calls.
 *
 * Sequence:
 * 1. IDLE -> DIALING_CLIENT (Initiate client leg)
 * 2. CLIENT_ACTIVE (Client answers; confirmed hard Call.STATE_ACTIVE)
 * 3. CLIENT_HOLDING (Client is held by Telecom)
 * 4. DIALING_OWNER (Initiate second leg to owner; 45s answer timeout)
 * 5. OWNER_ACTIVE (Owner answers; confirmed hard Call.STATE_ACTIVE)
 * 6. MERGE_PENDING (Conference capability verified, mute enabled, merge requested)
 * 7. CONFERENCE_ACTIVE (Carrier conference merged; CONSULTATION BILLING TIMER STARTS HERE)
 * 8. COMPLETED / FAILED (Clean termination; zero auto-redial; fail-closed on any failure)
 */
public final class TwoLegConferenceController {

    public interface StateChangeListener {
        void onStateChanged(TwoLegConferenceState oldState, TwoLegConferenceState newState, String reason);
    }

    private final TwoLegTelecomAdapter adapter;
    private final Clock clock;
    private final List<StateChangeListener> listeners = new ArrayList<>();

    private TwoLegConferenceState state = TwoLegConferenceState.IDLE;
    private String clientCallId;
    private String ownerCallId;
    private String conferenceCallId;
    private String rawClientNumber;
    private String rawOwnerNumber;

    private long maxConsultationSeconds = 900;
    private long conferenceStartedAt = 0;
    private long consultationElapsedSeconds = 0;
    private String failureReason;

    private boolean ownerDialAttempted = false;
    private boolean mergeAttempted = false;
    private boolean localMuted = false;
    private boolean earpieceEnforced = false;

    public TwoLegConferenceController(TwoLegTelecomAdapter adapter, Clock clock) {
        if (adapter == null) throw new IllegalArgumentException("adapter cannot be null");
        this.adapter = adapter;
        this.clock = clock != null ? clock : Clock.SYSTEM;
    }

    public TwoLegConferenceController(TwoLegTelecomAdapter adapter) {
        this(adapter, Clock.SYSTEM);
    }

    public synchronized void addListener(StateChangeListener listener) {
        if (listener != null && !listeners.contains(listener)) {
            listeners.add(listener);
        }
    }

    public synchronized void removeListener(StateChangeListener listener) {
        listeners.remove(listener);
    }

    public synchronized TwoLegConferenceState getState() {
        return state;
    }

    public synchronized String getFailureReason() {
        return failureReason;
    }

    public synchronized boolean isLocalMuted() {
        return localMuted;
    }

    public synchronized boolean isEarpieceEnforced() {
        return earpieceEnforced;
    }

    public synchronized String getMaskedClientNumber() {
        return ConferencePhoneMasker.mask(rawClientNumber);
    }

    public synchronized String getMaskedOwnerNumber() {
        return ConferencePhoneMasker.mask(rawOwnerNumber);
    }

    /** Strict rule: no automatic redial under any circumstance. */
    public boolean hasAutoRedial() {
        return false;
    }

    /**
     * Billing timer starts strictly at confirmed CONFERENCE_ACTIVE.
     * Dialing, waiting, holding, and merge never consume any limit.
     */
    public synchronized long getConsultationElapsedSeconds() {
        if (state == TwoLegConferenceState.CONFERENCE_ACTIVE) {
            long current = clock.currentTimeMillis();
            return Math.max(0, (current - conferenceStartedAt) / 1000);
        }
        if (state == TwoLegConferenceState.COMPLETED) {
            return consultationElapsedSeconds;
        }
        return 0;
    }

    /** Initiates the controlled flow. Does not place actual calls itself; changes state to DIALING_CLIENT. */
    public synchronized boolean startConferenceFlow(String clientNumber, String ownerNumber, long maxSeconds) {
        if (state != TwoLegConferenceState.IDLE) {
            return false;
        }
        if (clientNumber == null || clientNumber.trim().isEmpty() || ownerNumber == null || ownerNumber.trim().isEmpty()) {
            failClosed("Brak poprawnych numerów uczestników do rozpoczęcia centrali.");
            return false;
        }
        this.rawClientNumber = clientNumber.trim();
        this.rawOwnerNumber = ownerNumber.trim();
        this.maxConsultationSeconds = maxSeconds > 0 ? maxSeconds : 900;
        this.conferenceStartedAt = 0;
        this.consultationElapsedSeconds = 0;
        this.failureReason = null;
        this.ownerDialAttempted = false;
        this.mergeAttempted = false;
        this.localMuted = false;
        this.earpieceEnforced = false;

        transitionTo(TwoLegConferenceState.DIALING_CLIENT, "Rozpoczęto wybieranie pierwszej linii (klient)");
        return true;
    }

    public synchronized void onClientCallAdded(String callId) {
        if (isTerminal()) return;
        if (state == TwoLegConferenceState.DIALING_CLIENT) {
            this.clientCallId = callId;
        }
    }

    /**
     * Handles state changes for leg 1 (client).
     * Telecom states:
     * 1=STATE_DIALING, 2=STATE_RINGING, 3=STATE_HOLDING, 4=STATE_ACTIVE, 7=STATE_DISCONNECTED, 9=STATE_CONNECTING.
     */
    public synchronized void onClientCallStateChanged(int telecomState) {
        if (isTerminal()) return;

        // Hard requirement: leg 2 cannot start before hard STATE_ACTIVE (4).
        // Dialing, connecting, or ringing does NOT advance to active.
        if (telecomState == 4 /* Call.STATE_ACTIVE */) {
            if (state == TwoLegConferenceState.DIALING_CLIENT) {
                transitionTo(TwoLegConferenceState.CLIENT_ACTIVE, "Klient odebrał połączenie (STATE_ACTIVE)");
                // Immediately request hold on client call to prepare for second leg.
                boolean holdAccepted = adapter.holdCall(clientCallId);
                if (!holdAccepted) {
                    failClosed("Platforma Telecom odrzuciła żądanie zawieszenia (hold) pierwszej linii.");
                }
            }
            return;
        }

        if (telecomState == 3 /* Call.STATE_HOLDING */) {
            if (state == TwoLegConferenceState.CLIENT_ACTIVE) {
                transitionTo(TwoLegConferenceState.CLIENT_HOLDING, "Pierwsza linia zawieszona (STATE_HOLDING)");
                initiateOwnerLeg();
            }
            return;
        }

        if (telecomState == 7 /* Call.STATE_DISCONNECTED */) {
            if (state == TwoLegConferenceState.CONFERENCE_ACTIVE) {
                // Client hung up during active conference -> clean completion.
                consultationElapsedSeconds = Math.max(0, (clock.currentTimeMillis() - conferenceStartedAt) / 1000);
                transitionTo(TwoLegConferenceState.COMPLETED, "Klient zakończył rozmowę konferencyjną.");
                adapter.disconnectCall(ownerCallId);
            } else {
                // Fail-closed: premature disconnection before active conference.
                failClosed("Klient rozłączył się przed zestawieniem aktywnej konferencji.");
            }
        }
    }

    private synchronized void initiateOwnerLeg() {
        if (ownerDialAttempted) return;
        ownerDialAttempted = true;
        transitionTo(TwoLegConferenceState.DIALING_OWNER, "Wybieranie drugiej linii (właściciel)");
        boolean dialSuccess = adapter.placeOwnerCall(rawOwnerNumber);
        if (!dialSuccess) {
            failClosed("Nie udało się zainicjować drugiej linii do właściciela.");
        }
    }

    public synchronized void onOwnerCallAdded(String callId) {
        if (isTerminal()) return;
        if (state == TwoLegConferenceState.DIALING_OWNER) {
            this.ownerCallId = callId;
        }
    }

    /** Handles state changes for leg 2 (owner). */
    public synchronized void onOwnerCallStateChanged(int telecomState) {
        if (isTerminal()) return;

        if (telecomState == 4 /* Call.STATE_ACTIVE */) {
            if (state == TwoLegConferenceState.DIALING_OWNER) {
                transitionTo(TwoLegConferenceState.OWNER_ACTIVE, "Właściciel odebrał połączenie (STATE_ACTIVE)");
                // Wait for conference capability confirmation before merge.
            }
            return;
        }

        if (telecomState == 7 /* Call.STATE_DISCONNECTED */) {
            if (state == TwoLegConferenceState.CONFERENCE_ACTIVE) {
                // Owner hung up during active conference -> clean completion.
                consultationElapsedSeconds = Math.max(0, (clock.currentTimeMillis() - conferenceStartedAt) / 1000);
                transitionTo(TwoLegConferenceState.COMPLETED, "Właściciel zakończył rozmowę konferencyjną.");
                adapter.disconnectCall(clientCallId);
            } else {
                // Fail-closed: owner rejected, busy, or disconnected before conference.
                failClosed("Druga linia (właściciel) została rozłączona przed zestawieniem konferencji.");
            }
        }
    }

    /**
     * Merge is allowed ONLY when both calls are active/holding and platform capabilities allow it.
     */
    public synchronized void onConferenceCapabilitiesChanged(boolean canMergeConference, boolean isConferenceable) {
        if (isTerminal()) return;
        if (state != TwoLegConferenceState.OWNER_ACTIVE) return;

        if (canMergeConference && isConferenceable) {
            if (!mergeAttempted) {
                mergeAttempted = true;
                transitionTo(TwoLegConferenceState.MERGE_PENDING, "Zdolność konferencji potwierdzona. Żądanie scalenia.");
                // Enforce local microphone mute before conference is merged.
                localMuted = true;
                adapter.setLocalMute(true);
                // Ensure audio is routed to earpiece, not speakerphone.
                earpieceEnforced = true;
                adapter.ensureEarpieceAudioRoute();
                // Request carrier merge via Telecom.
                boolean mergeAccepted = adapter.mergeCalls(clientCallId, ownerCallId);
                if (!mergeAccepted) {
                    failClosed("Telecom odrzucił polecenie scalenia połączeń w konferencję.");
                }
            }
        }
    }

    /** Called when Telecom confirms conference is established and active. */
    public synchronized void onConferenceActive(String confId) {
        if (isTerminal()) return;
        if (state == TwoLegConferenceState.MERGE_PENDING || state == TwoLegConferenceState.OWNER_ACTIVE) {
            this.conferenceCallId = confId;
            this.conferenceStartedAt = clock.currentTimeMillis();
            // Re-enforce local audio isolation.
            localMuted = true;
            adapter.setLocalMute(true);
            earpieceEnforced = true;
            adapter.ensureEarpieceAudioRoute();
            transitionTo(TwoLegConferenceState.CONFERENCE_ACTIVE, "Konferencja operatora aktywna. Start naliczania limitu.");
        }
    }

    /** Timeout handler: owner did not answer within allotted time (e.g. 45s). */
    public synchronized void onOwnerDialTimeout() {
        if (isTerminal()) return;
        if (state == TwoLegConferenceState.DIALING_OWNER) {
            failClosed("Limit czasu oczekiwania na odebranie przez właściciela (timeout 45s).");
        }
    }

    /** Timeout handler: conference capability or merge not established in time. */
    public synchronized void onMergeTimeout() {
        if (isTerminal()) return;
        if (state == TwoLegConferenceState.OWNER_ACTIVE || state == TwoLegConferenceState.MERGE_PENDING) {
            failClosed("Brak możliwości zestawienia konferencji operatora w wymaganym czasie (merge timeout).");
        }
    }

    /** Periodic tick during conference to enforce consultation limit. */
    public synchronized void onConsultationTimeTick() {
        if (isTerminal()) return;
        if (state == TwoLegConferenceState.CONFERENCE_ACTIVE) {
            long elapsed = (clock.currentTimeMillis() - conferenceStartedAt) / 1000;
            if (elapsed >= maxConsultationSeconds) {
                consultationElapsedSeconds = elapsed;
                transitionTo(TwoLegConferenceState.COMPLETED, "Osiągnięto limit czasu konsultacji (" + maxConsultationSeconds + "s). Automatyczne zakończenie.");
                adapter.disconnectCall(clientCallId);
                adapter.disconnectCall(ownerCallId);
                if (conferenceCallId != null) adapter.disconnectCall(conferenceCallId);
            }
        }
    }

    /** Explicit fail-closed abort triggered manually or upon unexpected error. */
    public synchronized void abort(String reason) {
        if (isTerminal()) return;
        failClosed(reason != null ? reason : "Połączenie przerwane ręcznie lub awaryjnie.");
    }

    private synchronized void failClosed(String reason) {
        this.failureReason = reason;
        transitionTo(TwoLegConferenceState.FAILED, reason);
        // Disconnect all calls immediately to prevent lingering lines.
        if (clientCallId != null) adapter.disconnectCall(clientCallId);
        if (ownerCallId != null) adapter.disconnectCall(ownerCallId);
        if (conferenceCallId != null) adapter.disconnectCall(conferenceCallId);
    }

    private boolean isTerminal() {
        return state == TwoLegConferenceState.FAILED || state == TwoLegConferenceState.COMPLETED;
    }

    private void transitionTo(TwoLegConferenceState next, String reason) {
        TwoLegConferenceState old = this.state;
        this.state = next;
        for (StateChangeListener l : listeners) {
            try {
                l.onStateChanged(old, next, reason);
            } catch (Exception ignored) {}
        }
    }
}
