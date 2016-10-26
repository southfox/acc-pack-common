package com.tokbox.android.otsdkwrapper.utils;

public enum MediaType {
    VIDEO(0),
    AUDIO(1);

    private final int value;

    MediaType(int v) {
        value = v;
    }

    public int getValue() {
        return value;
    }

}