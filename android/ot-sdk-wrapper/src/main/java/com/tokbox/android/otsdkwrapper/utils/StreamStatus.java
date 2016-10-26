package com.tokbox.android.otsdkwrapper.utils;


import android.view.View;

public class StreamStatus {

    private final View mView;
    // Stream status
    private boolean mHasAudio;
    private boolean mHasVideo;
    // Status of the container of the stream (publisher/subscriber). This is if the publisher
    // is publishing or the subscriber is subscribing.
    private boolean mContainerAudioStatus;
    private boolean mContainerVideoStatus;

    public StreamStatus(View streamView, boolean containerAudio, boolean containerVideo,
                        boolean hasAudio, boolean hasVideo) {
        mView = streamView;
        mHasAudio = hasAudio;
        mHasVideo = hasVideo;
        mContainerAudioStatus = containerAudio;
        mContainerVideoStatus = containerVideo;
    }

    public boolean has(MediaType type) {
        return type == MediaType.VIDEO ? mHasVideo : mHasAudio;
    }
    public boolean subscribedTo(MediaType type) {
        return type == MediaType.VIDEO ? mContainerVideoStatus : mContainerAudioStatus;
    }

    public void setHas(MediaType type, boolean value) {
        if (type == MediaType.VIDEO) {
            mHasVideo = value;
        } else {
            mHasAudio = value;
        }
    }

    public void setContainerStatus(MediaType type, boolean value) {
        if (type == MediaType.VIDEO) {
            mContainerVideoStatus = value;
        } else {
            mContainerAudioStatus = value;
        }
    }

    public View getView() {
        return mView;
    }

    @Override
    public String toString() {
        return "hasAudio: " + mHasAudio + ", hasVideo: " + mHasVideo + ", containerAudio: " +
                mContainerAudioStatus + ", containerVideo: " + mContainerVideoStatus;
    }
}