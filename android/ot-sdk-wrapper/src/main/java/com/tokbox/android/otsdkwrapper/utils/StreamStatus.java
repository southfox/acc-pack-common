package com.tokbox.android.otsdkwrapper.utils;


import android.view.View;

import com.opentok.android.Stream;

public class StreamStatus {

    private final View mView;
    // Stream status
    private boolean mHasAudio;
    private boolean mHasVideo;
    // Status of the container of the stream (publisher/subscriber). This is if the publisher
    // is publishing or the subscriber is subscribing.
    private boolean mContainerAudioStatus;
    private boolean mContainerVideoStatus;

    private StreamType mType;

    public enum StreamType {
        CAMERA(0),
        SCREEN(1);

        private final int value;

        StreamType(int v) {
            value = v;
        }

        public int getValue() {
            return value;
        }

    }

    public StreamStatus(View streamView, boolean containerAudio, boolean containerVideo,
                        boolean hasAudio, boolean hasVideo, Stream.StreamVideoType type) {
        mView = streamView;
        mHasAudio = hasAudio;
        mHasVideo = hasVideo;
        mContainerAudioStatus = containerAudio;
        mContainerVideoStatus = containerVideo;
        if ( type == Stream.StreamVideoType.StreamVideoTypeCamera) {
            mType = StreamType.CAMERA;
        }
        else {
            if ( type == Stream.StreamVideoType.StreamVideoTypeScreen) {
                mType = StreamType.SCREEN;
            }
        }
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

    public StreamType getType() {
        return mType;
    }

    @Override
    public String toString() {
        return "hasAudio: " + mHasAudio + ", hasVideo: " + mHasVideo + ", containerAudio: " +
                mContainerAudioStatus + ", containerVideo: " + mContainerVideoStatus;
    }
}