package com.tokbox.android.otsdkwrapper.listeners;


import android.view.View;

import com.opentok.android.OpentokError;

public interface BasicListener<Wrapper> {

    void onConnected(Wrapper wrapper, int participantsCount, String connId, String data)
            throws ListenerException;

    void onDisconnected(Wrapper wrapper, int participantsCount, String connId, String data)
            throws ListenerException;

    void onPreviewViewReady(Wrapper wrapper, View localView) throws ListenerException;

    void onPreviewViewDestroyed(Wrapper wrapper, View localView) throws ListenerException;

    void onRemoteViewReady(Wrapper wrapper, View remoteView, String remoteId, String data) throws ListenerException;

    void onRemoteViewDestroyed(Wrapper wrapper, View remoteView, String remoteId) throws ListenerException;

    void onStartedSharingMedia(Wrapper wrapper, boolean screensharing) throws ListenerException;

    void onStoppedSharingMedia(Wrapper wrapper, boolean screensharing) throws ListenerException;

    void onRemoteJoined(Wrapper wrapper, String remoteId) throws ListenerException;

    void onRemoteLeft(Wrapper wrapper, String remoteId) throws ListenerException;

    void onRemoteVideoChange(Wrapper wrapper, String remoteId, String reason, boolean videoActive,
                             boolean subscribed)
            throws ListenerException;

    void onError(Wrapper wrapper, OpentokError error) throws ListenerException;
}
