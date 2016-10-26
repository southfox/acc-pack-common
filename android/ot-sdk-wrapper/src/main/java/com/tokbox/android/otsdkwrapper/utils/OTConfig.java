package com.tokbox.android.otsdkwrapper.utils;


import android.util.Log;

public class OTConfig {

    private static final String LOG_TAG = OTConfig.class.getSimpleName();

    private static final int MAX_LENGTH_NAME = 50;

    String sessionId; //required
    String token; //required
    String apiKey; //required
    String name; //optional
    boolean subscribeToSelf = false; //optional
    boolean subscribeAutomatically = false; //optional

    public OTConfig(OTConfigBuilder builder) {
        this.sessionId = builder.sessionId;
        this.token = builder.token;
        this.apiKey = builder.apiKey;
    }

    public String getSessionId() {
        return sessionId;
    }

    public String getToken() {
        return token;
    }

    public String getApiKey() {
        return apiKey;
    }


    public String getName() {
        return name;
    }

    public boolean isSubscribeToSelf(){
        return subscribeToSelf;
    }

    public boolean isSubscribeAutomatically(){
        return subscribeAutomatically;
    }

    public static class OTConfigBuilder {

        String sessionId; //required
        String token; //required
        String apiKey; //required

        String name; //optional
        boolean subscribeToSelf; //optional
        boolean subscribeAutomatically; //optional

        public OTConfigBuilder(String sessionId, String token, String apikey) {
            this.sessionId = sessionId;
            this.token = token;
            this.apiKey = apikey;
        }

        public OTConfigBuilder name(String name) {
            if ( name.length() > MAX_LENGTH_NAME ){
                throw new RuntimeException("Name string cannot be greater than "+MAX_LENGTH_NAME);
            }
            else {
                if ( name == null || name.length() == 0 || name.trim().length() == 0 ){
                    throw new RuntimeException("Name cannot be null or empty");
                }
            }
            this.name = name;
            return this;
        }

        public OTConfigBuilder subscribeToSelf(Boolean subscribeToSelf) {
            this.subscribeToSelf = subscribeToSelf;
            return this;
        }

        public OTConfigBuilder subscribeAutomatically(Boolean subscribeAutomatically) {
            this.subscribeAutomatically = subscribeAutomatically;
            return this;
        }

        public OTConfig build() {
            OTConfig info = new OTConfig(this);

            boolean valid = validateInfoObject(info);

            if (!valid) {
                return null;
            }

            return info;
        }

        private boolean validateInfoObject(OTConfig info) {

            if (sessionId == null || sessionId.isEmpty()) {
                Log.i(LOG_TAG, "SessionId cannot be null or empty");
                return false;
            }
            if ( token == null || token.isEmpty() ) {
                Log.i(LOG_TAG, "Token cannot be null or empty");
                return false;
            }
            if ( apiKey == null || apiKey.isEmpty() ) {
                Log.i(LOG_TAG, "ApiKey cannot be null or empty");
                return false;
            }

            return true;

        }
    }
}