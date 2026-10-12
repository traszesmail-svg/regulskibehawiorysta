package pl.regulski.phoneagent;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.telecom.Call;
import android.telecom.CallAudioState;
import android.telecom.InCallService;
import android.telecom.TelecomManager;
import android.util.Log;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Production InCallService implementation for Motorola One Vision (Android 11).
 *
 * Registered in AndroidManifest with android.permission.BIND_INCALL_SERVICE
 * and qualifies the app for the RoleManager.ROLE_DIALER role.
 *
 * Implements TwoLegTelecomAdapter to drive TwoLegConferenceController safely and fail-closed.
 * Zero PII logging: never logs getDetails(), getHandle(), Uri, or participant numbers.
 */
public final class AgentInCallService extends InCallService implements TwoLegTelecomAdapter {
    private static final String TAG = "AgentInCallService";
    private static volatile AgentInCallService instance;
    private static volatile TwoLegConferenceController activeController;

    private final Map<String, Call> callsById = new ConcurrentHashMap<>();
    private String clientCallId;
    private String ownerCallId;

    public static final InCallServiceBridge BRIDGE = new InCallServiceBridge() {
        @Override
        public void setActiveController(TwoLegConferenceController controller) {
            AgentInCallService.setActiveController(controller);
        }

        @Override
        public TwoLegConferenceController getActiveController() {
            return AgentInCallService.getActiveController();
        }
    };

    public static AgentInCallService getInstance() {
        return instance;
    }

    public static void setActiveController(TwoLegConferenceController controller) {
        activeController = controller;
    }

    public static TwoLegConferenceController getActiveController() {
        return activeController;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        ConferenceSessionCoordinator.setInCallServiceBridge(BRIDGE);
        Log.i(TAG, "AgentInCallService utworzona i powiązana przez Telecom");
    }

    @Override
    public void onDestroy() {
        Log.i(TAG, "AgentInCallService niszczona");
        if (ConferenceSessionCoordinator.isInitialized()) {
            ConferenceSessionCoordinator coordinator = ConferenceSessionCoordinator.getInstance();
            if (coordinator.isSessionActive()) {
                coordinator.abortSession("AgentInCallService zniszczona przez system");
            }
        }
        disconnectAll();
        callsById.clear();
        activeController = null;
        if (instance == this) {
            instance = null;
        }
        super.onDestroy();
    }

    @Override
    public void onCallAdded(Call call) {
        super.onCallAdded(call);
        if (call == null) return;
        final String callId = Integer.toHexString(System.identityHashCode(call));
        callsById.put(callId, call);
        Log.i(TAG, "onCallAdded: id=" + callId);

        // Bring In-Call UI to front so user always has the large Abort button
        try {
            Intent uiIntent = new Intent(this, MainActivity.class);
            uiIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            startActivity(uiIntent);
        } catch (Exception ignored) {}

        TwoLegConferenceController controller = activeController;
        if (controller != null) {
            TwoLegConferenceState state = controller.getState();
            if (state == TwoLegConferenceState.DIALING_CLIENT && clientCallId == null) {
                clientCallId = callId;
                controller.onClientCallAdded(callId);
            } else if (state == TwoLegConferenceState.DIALING_OWNER && ownerCallId == null) {
                ownerCallId = callId;
                controller.onOwnerCallAdded(callId);
            } else if (call.getChildren() != null && !call.getChildren().isEmpty()) {
                // Parent conference call created by Telecom
                controller.onConferenceActive(callId);
            }
        } else {
            Log.w(TAG, "onCallAdded: brak aktywnego kontrolera dla callId=" + callId + " (fail-closed)");
        }

        call.registerCallback(new Call.Callback() {
            @Override
            public void onStateChanged(Call c, int state) {
                super.onStateChanged(c, state);
                Log.i(TAG, "onStateChanged: id=" + callId + " state=" + state);
                TwoLegConferenceController ctrl = activeController;
                if (ctrl != null) {
                    if (callId.equals(clientCallId)) {
                        ctrl.onClientCallStateChanged(state);
                    } else if (callId.equals(ownerCallId)) {
                        ctrl.onOwnerCallStateChanged(state);
                    } else if (c.getChildren() != null && !c.getChildren().isEmpty() && state == Call.STATE_ACTIVE) {
                        ctrl.onConferenceActive(callId);
                    }
                }
            }

            @Override
            public void onDetailsChanged(Call c, Call.Details details) {
                super.onDetailsChanged(c, details);
                checkCapabilities(c, details, c.getConferenceableCalls());
            }

            @Override
            public void onConferenceableCallsChanged(Call c, List<Call> conferenceableCalls) {
                super.onConferenceableCallsChanged(c, conferenceableCalls);
                checkCapabilities(c, c.getDetails(), conferenceableCalls);
            }

            @Override
            public void onChildrenChanged(Call c, List<Call> children) {
                super.onChildrenChanged(c, children);
                if (children != null && children.size() >= 2) {
                    TwoLegConferenceController ctrl = activeController;
                    if (ctrl != null) {
                        ctrl.onConferenceActive(callId);
                    }
                }
            }
        });
    }

    private void checkCapabilities(Call c, Call.Details details, List<Call> conferenceableCalls) {
        TwoLegConferenceController ctrl = activeController;
        if (ctrl == null) return;
        boolean canMerge = details != null && details.can(Call.Details.CAPABILITY_MERGE_CONFERENCE);
        boolean isConf = (conferenceableCalls != null && !conferenceableCalls.isEmpty())
            || (details != null && details.can(Call.Details.CAPABILITY_SWAP_CONFERENCE));
        ctrl.onConferenceCapabilitiesChanged(canMerge, isConf);
    }

    @Override
    public void onCallRemoved(Call call) {
        super.onCallRemoved(call);
        if (call == null) return;
        String callId = Integer.toHexString(System.identityHashCode(call));
        callsById.remove(callId);
        Log.i(TAG, "onCallRemoved: id=" + callId);
        if (callId.equals(clientCallId)) clientCallId = null;
        if (callId.equals(ownerCallId)) ownerCallId = null;
    }

    // ================= TwoLegTelecomAdapter Implementation =================

    @Override
    public boolean placeClientCall(String clientNumber) {
        if (clientNumber == null || clientNumber.trim().isEmpty()) return false;
        try {
            TelecomManager tm = (TelecomManager) getSystemService(Context.TELECOM_SERVICE);
            if (tm != null && checkSelfPermission(Manifest.permission.CALL_PHONE) == PackageManager.PERMISSION_GRANTED) {
                Uri uri = Uri.fromParts("tel", clientNumber.trim(), null);
                Log.i(TAG, "Inicjowanie pierwszej linii centrali do klienta");
                tm.placeCall(uri, null);
                return true;
            }
        } catch (Exception e) {
            Log.e(TAG, "Błąd podczas placeClientCall: " + e.getClass().getSimpleName());
        }
        return false;
    }

    @Override
    public boolean placeOwnerCall(String ownerNumber) {
        if (ownerNumber == null || ownerNumber.trim().isEmpty()) return false;
        try {
            TelecomManager tm = (TelecomManager) getSystemService(Context.TELECOM_SERVICE);
            if (tm != null && checkSelfPermission(Manifest.permission.CALL_PHONE) == PackageManager.PERMISSION_GRANTED) {
                Uri uri = Uri.fromParts("tel", ownerNumber.trim(), null);
                Log.i(TAG, "Inicjowanie drugiej linii centrali do właściciela");
                tm.placeCall(uri, null);
                return true;
            }
        } catch (Exception e) {
            Log.e(TAG, "Błąd podczas placeOwnerCall: " + e.getClass().getSimpleName());
        }
        return false;
    }

    @Override
    public boolean holdCall(String callId) {
        Call call = findCall(callId);
        if (call != null) {
            try {
                Log.i(TAG, "Żądanie hold dla id=" + callId);
                call.hold();
                return true;
            } catch (Exception e) {
                Log.e(TAG, "Błąd hold() dla id=" + callId + ": " + e.getClass().getSimpleName());
            }
        }
        return false;
    }

    @Override
    public boolean unholdCall(String callId) {
        Call call = findCall(callId);
        if (call != null) {
            try {
                Log.i(TAG, "Żądanie unhold dla id=" + callId);
                call.unhold();
                return true;
            } catch (Exception e) {
                Log.e(TAG, "Błąd unhold() dla id=" + callId + ": " + e.getClass().getSimpleName());
            }
        }
        return false;
    }

    @Override
    public boolean mergeCalls(String callId1, String callId2) {
        Call c1 = findCall(callId1);
        Call c2 = findCall(callId2);
        if (c1 != null && c2 != null) {
            try {
                Log.i(TAG, "Żądanie scalenia połączeń w konferencję: c1=" + callId1 + ", c2=" + callId2);
                c1.conference(c2);
                return true;
            } catch (Exception e) {
                Log.e(TAG, "Błąd call.conference(): " + e.getClass().getSimpleName());
            }
        } else if (c1 != null) {
            try {
                List<Call> confs = c1.getConferenceableCalls();
                if (confs != null && !confs.isEmpty()) {
                    c1.conference(confs.get(0));
                    return true;
                }
            } catch (Exception e) {
                Log.e(TAG, "Błąd conferenceable call.conference(): " + e.getClass().getSimpleName());
            }
        }
        return false;
    }

    @Override
    public boolean disconnectCall(String callId) {
        if (callId == null) {
            disconnectAll();
            return true;
        }
        Call call = findCall(callId);
        if (call != null) {
            try {
                Log.i(TAG, "Rozłączam połączenie id=" + callId);
                call.disconnect();
                return true;
            } catch (Exception e) {
                Log.e(TAG, "Błąd disconnect() dla id=" + callId + ": " + e.getClass().getSimpleName());
            }
        }
        return false;
    }

    @Override
    public void setLocalMute(boolean muted) {
        try {
            Log.i(TAG, "Ustawiam lokalne wyciszenie mikrofonu centrali: " + muted);
            setMuted(muted);
        } catch (Exception e) {
            Log.e(TAG, "Błąd setMuted(" + muted + "): " + e.getClass().getSimpleName());
        }
    }

    @Override
    public void ensureEarpieceAudioRoute() {
        try {
            Log.i(TAG, "Wymuszam tor earpiece (blokada głośnika zewnętrznego)");
            setAudioRoute(CallAudioState.ROUTE_EARPIECE);
        } catch (Exception e) {
            Log.e(TAG, "Błąd setAudioRoute(ROUTE_EARPIECE): " + e.getClass().getSimpleName());
        }
    }

    private Call findCall(String callId) {
        if (callId != null) {
            Call c = callsById.get(callId);
            if (c != null) return c;
        }
        if (!callsById.isEmpty()) {
            return callsById.values().iterator().next();
        }
        return null;
    }

    public static void disconnectAll() {
        AgentInCallService s = instance;
        if (s != null) {
            for (Map.Entry<String, Call> entry : s.callsById.entrySet()) {
                try {
                    entry.getValue().disconnect();
                } catch (Exception ignored) {}
            }
            s.callsById.clear();
        }
    }

    /** Legacy helper compatibility */
    public static boolean disconnectCall() {
        disconnectAll();
        return true;
    }

    public static boolean hasActiveCall() {
        AgentInCallService s = instance;
        return s != null && !s.callsById.isEmpty();
    }
}
