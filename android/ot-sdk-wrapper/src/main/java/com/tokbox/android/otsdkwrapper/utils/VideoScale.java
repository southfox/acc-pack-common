package com.tokbox.android.otsdkwrapper.utils;


public enum VideoScale {
    FILL(0),
    FIT(1);

    private final int value;

    VideoScale(int v) {
        value = v;
    }

    public int getValue() {
        return value;
    }

}
