package com.tokbox.android.otsdkwrapper.listeners;

import com.opentok.android.OpentokError;

public interface AdvancedListener<Wrapper> {

    void onCameraChanged(Wrapper wrapper) throws ListenerException;

    void onReconnecting(Wrapper wrapper) throws ListenerException;

    void onReconnected(Wrapper wrapper) throws ListenerException;

    void onVideoQualityWarning(Wrapper wrapper, String remoteId) throws ListenerException;

    void onVideoQualityWarningLifted(Wrapper wrapper, String remoteId) throws ListenerException;

    void onError(Wrapper wrapper, OpentokError error) throws ListenerException;
}
