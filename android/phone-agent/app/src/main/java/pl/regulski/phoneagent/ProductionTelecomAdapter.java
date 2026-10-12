package pl.regulski.phoneagent;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.telecom.TelecomManager;
import android.util.Log;

/**
 * Production implementation of TwoLegTelecomAdapter connecting the controller
 * to the Android Telecom framework.
 *
 * Places calls via TelecomManager using Application Context.
 * Controls in-call states (hold, merge, mute, audio route) via AgentInCallService.
 * Enforces zero PII in all log statements.
 */
public final class ProductionTelecomAdapter implements TwoLegTelecomAdapter {
    private static final String TAG = "ProductionTelecom";
    private final Context context;

    public ProductionTelecomAdapter(Context context) {
        if (context == null) throw new IllegalArgumentException("context cannot be null");
        this.context = context.getApplicationContext();
    }

    @Override
    public boolean placeClientCall(String clientNumber) {
        if (clientNumber == null || clientNumber.trim().isEmpty()) return false;
        try {
            TelecomManager tm = (TelecomManager) context.getSystemService(Context.TELECOM_SERVICE);
            if (tm != null && context.checkSelfPermission(Manifest.permission.CALL_PHONE) == PackageManager.PERMISSION_GRANTED) {
                Uri uri = Uri.fromParts("tel", clientNumber.trim(), null);
                Log.i(TAG, "Inicjowanie pierwszej linii centrali przez TelecomManager.placeCall");
                tm.placeCall(uri, null);
                return true;
            }
        } catch (Exception e) {
            Log.e(TAG, "Błąd placeClientCall: " + e.getClass().getSimpleName());
        }
        return false;
    }

    @Override
    public boolean placeOwnerCall(String ownerNumber) {
        if (ownerNumber == null || ownerNumber.trim().isEmpty()) return false;
        try {
            TelecomManager tm = (TelecomManager) context.getSystemService(Context.TELECOM_SERVICE);
            if (tm != null && context.checkSelfPermission(Manifest.permission.CALL_PHONE) == PackageManager.PERMISSION_GRANTED) {
                Uri uri = Uri.fromParts("tel", ownerNumber.trim(), null);
                Log.i(TAG, "Inicjowanie drugiej linii centrali przez TelecomManager.placeCall");
                tm.placeCall(uri, null);
                return true;
            }
        } catch (Exception e) {
            Log.e(TAG, "Błąd placeOwnerCall: " + e.getClass().getSimpleName());
        }
        return false;
    }

    @Override
    public boolean holdCall(String callId) {
        AgentInCallService service = AgentInCallService.getInstance();
        if (service != null) {
            return service.holdCall(callId);
        }
        Log.w(TAG, "holdCall: InCallService nie jest aktywny.");
        return false;
    }

    @Override
    public boolean unholdCall(String callId) {
        AgentInCallService service = AgentInCallService.getInstance();
        if (service != null) {
            return service.unholdCall(callId);
        }
        Log.w(TAG, "unholdCall: InCallService nie jest aktywny.");
        return false;
    }

    @Override
    public boolean mergeCalls(String clientCallId, String ownerCallId) {
        AgentInCallService service = AgentInCallService.getInstance();
        if (service != null) {
            return service.mergeCalls(clientCallId, ownerCallId);
        }
        Log.w(TAG, "mergeCalls: InCallService nie jest aktywny.");
        return false;
    }

    @Override
    public boolean disconnectCall(String callId) {
        AgentInCallService service = AgentInCallService.getInstance();
        if (service != null) {
            return service.disconnectCall(callId);
        }
        Log.w(TAG, "disconnectCall: InCallService nie jest aktywny.");
        return false;
    }

    @Override
    public void setLocalMute(boolean muted) {
        AgentInCallService service = AgentInCallService.getInstance();
        if (service != null) {
            service.setLocalMute(muted);
        }
    }

    @Override
    public void ensureEarpieceAudioRoute() {
        AgentInCallService service = AgentInCallService.getInstance();
        if (service != null) {
            service.ensureEarpieceAudioRoute();
        }
    }
}
