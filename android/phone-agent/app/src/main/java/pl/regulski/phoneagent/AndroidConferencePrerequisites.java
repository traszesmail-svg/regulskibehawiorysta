package pl.regulski.phoneagent;

import android.Manifest;
import android.app.role.RoleManager;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;
import android.telecom.TelecomManager;
import android.telephony.TelephonyManager;

/**
 * Android framework implementation of ConferencePrerequisites.
 */
public final class AndroidConferencePrerequisites implements ConferencePrerequisites {
    private final Context context;

    public AndroidConferencePrerequisites(Context context) {
        this.context = context.getApplicationContext();
    }

    @Override
    public boolean isDialerRoleHeld() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                RoleManager rm = context.getSystemService(RoleManager.class);
                if (rm != null) {
                    return rm.isRoleHeld(RoleManager.ROLE_DIALER);
                }
            }
            TelecomManager tm = (TelecomManager) context.getSystemService(Context.TELECOM_SERVICE);
            return tm != null && context.getPackageName().equals(tm.getDefaultDialerPackage());
        } catch (Exception ignored) {
            return false;
        }
    }

    @Override
    public boolean hasCallPhonePermission() {
        try {
            return context.checkSelfPermission(Manifest.permission.CALL_PHONE) == PackageManager.PERMISSION_GRANTED;
        } catch (Exception ignored) {
            return false;
        }
    }

    @Override
    public boolean isSimReady() {
        try {
            TelephonyManager tm = (TelephonyManager) context.getSystemService(Context.TELEPHONY_SERVICE);
            return tm != null && tm.getSimState() == TelephonyManager.SIM_STATE_READY;
        } catch (Exception ignored) {
            return false;
        }
    }

    @Override
    public boolean hasNoActiveCalls() {
        try {
            if (AgentInCallService.hasActiveCall()) {
                return false;
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (context.checkSelfPermission(Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED) {
                    TelecomManager tm = (TelecomManager) context.getSystemService(Context.TELECOM_SERVICE);
                    if (tm != null && tm.isInCall()) {
                        return false;
                    }
                }
            }
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }
}
