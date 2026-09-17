package pl.regulski.phoneagent;

import android.telecom.Call;
import android.telecom.InCallService;
import android.util.Log;
import java.util.concurrent.atomic.AtomicReference;

public final class AgentInCallService extends InCallService {
    private static final String TAG = "AgentInCallService";
    private static final AtomicReference<Call> currentCall = new AtomicReference<>(null);

    @Override
    public void onCallAdded(Call call) {
        super.onCallAdded(call);
        Log.i(TAG, "onCallAdded: " + call);
        currentCall.set(call);
        call.registerCallback(new Call.Callback() {
            @Override
            public void onStateChanged(Call c, int state) {
                super.onStateChanged(c, state);
                Log.i(TAG, "Call state: " + state);
                if (state == Call.STATE_DISCONNECTED) {
                    currentCall.compareAndSet(c, null);
                }
            }
        });
    }

    @Override
    public void onCallRemoved(Call call) {
        super.onCallRemoved(call);
        Log.i(TAG, "onCallRemoved: " + call);
        currentCall.compareAndSet(call, null);
    }

    public static boolean disconnectCall() {
        Call call = currentCall.get();
        if (call != null) {
            try {
                Log.i(TAG, "Rozłączam połączenie przez InCallService.disconnect()");
                call.disconnect();
                currentCall.set(null);
                return true;
            } catch (Exception e) {
                Log.e(TAG, "Błąd podczas disconnect()", e);
            }
        }
        return false;
    }

    public static boolean hasActiveCall() {
        return currentCall.get() != null;
    }
}
