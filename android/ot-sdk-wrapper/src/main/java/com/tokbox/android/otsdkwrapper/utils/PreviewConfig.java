package com.tokbox.android.otsdkwrapper.utils;


import com.opentok.android.BaseVideoCapturer;
import com.opentok.android.BaseVideoRenderer;
import com.opentok.android.Publisher;

public class PreviewConfig {
    private static final String LOG_TAG = PreviewConfig.class.getSimpleName();

    String name=""; //optinal
    boolean audioTrack = true; //optional
    boolean videoTrack = true; //optional
    Publisher.CameraCaptureResolution resolution = Publisher.CameraCaptureResolution.MEDIUM; //optional
    Publisher.CameraCaptureFrameRate frameRate = Publisher.CameraCaptureFrameRate.FPS_15; //optional
    BaseVideoCapturer capturer; //optional
    BaseVideoRenderer renderer; //optional

    public PreviewConfig(PreviewConfigBuilder builder) {
        this.name = builder.name;
        this.audioTrack = builder.audioTrack;
        this.videoTrack = builder.videoTrack;
        this.resolution = builder.resolution;
        this.frameRate = builder.frameRate;
        this.capturer = builder.capturer;
        this.renderer = builder.renderer;
    }

    public String getName() {
        return name;
    }

    public boolean isAudioTrack() {
        return audioTrack;
    }

    public boolean isVideoTrack() {
        return videoTrack;
    }

    public Publisher.CameraCaptureResolution getResolution() {
        return resolution;
    }

    public Publisher.CameraCaptureFrameRate getFrameRate() {
        return frameRate;
    }

    public BaseVideoCapturer getCapturer() {
        return capturer;
    }

    public BaseVideoRenderer getRenderer() {
        return renderer;
    }

    public void setFrameRate(Publisher.CameraCaptureFrameRate newFrameRate) {
        frameRate = newFrameRate;
    }

    public static class PreviewConfigBuilder {

        String name=""; //optinal
        boolean audioTrack = true; //optional
        boolean videoTrack = true; //optional
        Publisher.CameraCaptureResolution resolution = Publisher.CameraCaptureResolution.MEDIUM; //optional
        Publisher.CameraCaptureFrameRate frameRate = Publisher.CameraCaptureFrameRate.FPS_15; //optional
        VideoScale videoScale; //optional
        BaseVideoCapturer capturer; //optional
        BaseVideoRenderer renderer; //optional

        public PreviewConfigBuilder() { }

        public PreviewConfigBuilder name(String name) {
            if ( name == null ){
                throw new RuntimeException("Name cannot be null");
            }
            this.name = name;
            return this;
        }

        public PreviewConfigBuilder audioTrack(boolean audioTrack) {
            this.audioTrack = audioTrack;
            return this;
        }

        public PreviewConfigBuilder videoTrack(boolean videoTrack) {
            this.videoTrack = videoTrack;
            return this;
        }

        public PreviewConfigBuilder resolution(Publisher.CameraCaptureResolution cameraResolution) {
            this.resolution = cameraResolution;
            return this;
        }

        public PreviewConfigBuilder framerate(Publisher.CameraCaptureFrameRate cameraFramerate) {
            this.frameRate = cameraFramerate;
            return this;
        }

        public PreviewConfigBuilder capturer(BaseVideoCapturer capturer){
            this.capturer = capturer;
            return this;
        }

        public PreviewConfigBuilder renderer(BaseVideoRenderer renderer){
            this.renderer = renderer;
            return this;
        }

        public PreviewConfig build() {
            PreviewConfig info = new PreviewConfig(this);

            return info;
        }
    }
}
