package com.tokbox.android.otsdkwrapper.wrapper;

import android.content.Context;
import android.util.Log;
import android.view.View;

import com.opentok.android.BaseVideoRenderer;
import com.opentok.android.Connection;
import com.opentok.android.OpentokError;
import com.opentok.android.Publisher;
import com.opentok.android.PublisherKit;
import com.opentok.android.Session;
import com.opentok.android.Stream;
import com.opentok.android.Subscriber;
import com.opentok.android.SubscriberKit;
import com.tokbox.android.otsdkwrapper.listeners.AdvancedListener;
import com.tokbox.android.otsdkwrapper.listeners.BaseOTListener;
import com.tokbox.android.otsdkwrapper.listeners.BasicListener;
import com.tokbox.android.otsdkwrapper.listeners.RetriableAdvancedListener;
import com.tokbox.android.otsdkwrapper.listeners.RetriableBasicListener;
import com.tokbox.android.otsdkwrapper.listeners.RetriableOTListener;
import com.tokbox.android.otsdkwrapper.listeners.SignalListener;
import com.tokbox.android.otsdkwrapper.listeners.UnfailingAdvancedListener;
import com.tokbox.android.otsdkwrapper.listeners.UnfailingBasicListener;
import com.tokbox.android.otsdkwrapper.signal.SignalInfo;
import com.tokbox.android.otsdkwrapper.signal.SignalProcessorThread;
import com.tokbox.android.otsdkwrapper.signal.SignalProtocol;
import com.tokbox.android.otsdkwrapper.utils.Callback;
import com.tokbox.android.otsdkwrapper.utils.MediaType;
import com.tokbox.android.otsdkwrapper.utils.OTConfig;
import com.tokbox.android.otsdkwrapper.utils.PreviewConfig;
import com.tokbox.android.otsdkwrapper.utils.StreamStatus;
import com.tokbox.android.otsdkwrapper.utils.VideoScale;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.Hashtable;
import java.util.Iterator;

/**
 * Represents an OpenTok object to enable a video communication.
 * The first step in using the SDK Wrapper is to initialize it by calling the constructor with the
 * OpenTokConfig parameter.
 */
public class OTWrapper {

  private static final String LOG_TAG = OTWrapper.class.getSimpleName();

  private Context mContext = null;
  private final OTWrapper SELF = this;

  private Session mSession = null;
  private Connection mSessionConnection = null;
  private Publisher mPublisher = null;
  private Publisher mScreenPublisher = null;

  //indexed by streamId, *not* per subscriber Id
  private HashMap<String, Subscriber> mSubscribers = null;
  private Hashtable<String, Connection> mConnections = null;

  //listeners
  private Hashtable<String, ArrayList<SignalListener>> mSignalListeners = null;
  private ArrayList<RetriableBasicListener<OTWrapper>> mBasicListeners;
  private ArrayList<RetriableAdvancedListener<OTWrapper>> mAdvancedListeners;
  private HashMap<BasicListener, RetriableBasicListener> mRetriableBasicListeners = new HashMap<>();
  private HashMap<AdvancedListener, RetriableAdvancedListener> mRetriableAdvancedListeners =
    new HashMap<>();

  //signal protocol
  private SignalProtocol mInputSignalProtocol;
  private SignalProtocol mOutputSignalProtocol;

  private int mConnectionsCount;
  private int mOlderThanMe = 0;

  private boolean isPreviewing = false;
  private boolean isPublishing = false;
  private boolean startPublishing = false;
  private boolean startSharingScreen = false;
  private boolean isSharingScreen = false;

  private OTConfig mOTConfig;
  private PreviewConfig mPreviewConfig;

  //custom renderers
  private BaseVideoRenderer mVideoRemoteRenderer;
  private BaseVideoRenderer mScreenRemoteRenderer;

  /**
   * Creates a OTWrapper instance.
   *
   * @param context Activity context. Needed by the Opentok APIs
   * @param config  OTConfig: Information about the OpenTok session. This includes all the needed
   *                data to connect.
   */
  public OTWrapper(Context context, OTConfig config) {
    this.mContext = context;
    this.mOTConfig = config;
    mSubscribers = new HashMap<String, Subscriber>();
    mConnections = new Hashtable<String, Connection>();
    mSignalListeners = new Hashtable<String, ArrayList<SignalListener>>();
    mBasicListeners = new ArrayList<RetriableBasicListener<OTWrapper>>();
    mAdvancedListeners = new ArrayList<RetriableAdvancedListener<OTWrapper>>();
  }

  /**
   * Call this method when the app's activity pauses.
   * This pauses the video for the local preview and remotes
   */
  public void pause() {
    if (mSession != null) {
      mSession.onPause();
    }
  }

  /**
   * Call this method when the app's activity resumes.
   * This resumes the video for the local preview and remotes.
   * @param resumeEvents Set to true if the events should be resumed
   */
  public void resume(boolean resumeEvents) {
    if (mSession != null) {
      mSession.onResume();
    }
    if (resumeEvents && mBasicListeners != null && !mBasicListeners.isEmpty()) {
      for (BasicListener listener: mBasicListeners
        ) {
        ((RetriableBasicListener)listener).resume();
      }

    }
  }

  /**
   * Connects to the OpenTok session.
   * When the otwrapper connects, the
   * {@link BasicListener#onConnected(Object, int, String, String)} method is called.
   * If the otwrapper fails to connect, the
   * {@link BasicListener#onError(Object, OpentokError)} method is called.
   */
  public void connect(){
    Log.i(LOG_TAG, "Connect");
    mSession = new Session(mContext, mOTConfig.getApiKey(), mOTConfig.getSessionId());
    mSession.setConnectionListener(mConnectionListener);
    mSession.setSessionListener(mSessionListener);
    mSession.setSignalListener(mSignalListener);
    mSession.setReconnectionListener(mReconnectionListener);
    mOlderThanMe = 0;
    mConnectionsCount = 0;
    mSession.connect(mOTConfig.getToken());
  }

  /**
   * Disconnects from the OpenTok session.
   * When the otwrapper disconnects, the
   * {@link BasicListener#onDisconnected(Object, int, String, String)}  method is called.
   * If the otwrapper fails to disconnect, the
   * {@link BasicListener#onError(Object, OpentokError)} method is called.
   */
  public void disconnect(){
    if (mSession != null ){
      mSession.disconnect();
    }
  }

  /**
   * Returns the local connectionID
   * @return the own connectionID
   */
  public String getOwnConnId() {
    return mSessionConnection != null ? mSessionConnection.getConnectionId() : null;
  }

  /**
   * Returns the number of active connections for the current session
   * @return the number of active connections.
   */
  public int getConnectionsCount() {
    return mConnectionsCount;
  }

  /**
   * Checks if the own connection is the oldest in the current session
   * @return Whether the local connection is oldest (<code>true</code>) or not (
   * <code>false</code>).
   */
  public boolean isTheOldestConnection(){
    return mOlderThanMe <= 0;
  }

  /**
   * Compares the connections creation times between the local connection and the argument passing
   * @param connectionId The connection we want to compare with
   * @return -1 if the connection passed is newer than the current session connection, 0
   * if they have the same age, and 1 if the connection is older
   */
  public int compareConnectionsTimes(String connectionId){
    int age = 0;

    if (mSession != null){
      age = mSession.getConnection().
        getCreationTime().compareTo(mConnections.get(connectionId).getCreationTime());
    }
    return age;
  }

  /**
   * Call to display the camera's video in the Preview's view before it starts streaming
   * video.
   * @param config The configuration of the preview
   */
  public void startPreview(PreviewConfig config) {
    mPreviewConfig = config;
    if (mPublisher == null && !isPreviewing) {
      createPublisher();
      attachPublisherView();
      mPublisher.startPreview();
      isPreviewing = true;
    }
  }

  /**
   * Call to stop the camera's video in the Preview's view.
   */
  public void stopPreview() {
    if (mPublisher != null && isPreviewing) {
      mPublisher.destroy();
      dettachPublisherView();
      mPublisher = null;
      isPreviewing = false;
      startPublishing = false;
    }
  }

  /**
   * Starts the local streaming video
   * @param config The configuration of the preview
   * @param screensharing Whether to indicate the camera or the screen streaming.
   */
  public void startPublishingMedia(PreviewConfig config, boolean screensharing) {
    if (!screensharing) {
      mPreviewConfig = config;
      startPublishing = true;
      if (mPublisher == null) {
        createPublisher();
      }
      publishIfReady();
    }
    else {
      startSharingScreen = true;
      if (mScreenPublisher == null) {
        createScreenPublisher(config);
      }
      publishIfScreenReady();
    }

  }

  /**
   * Stops the local streaming video.
   * @param screensharing Whether to indicate the camera or the screen streaming
   */
  public void stopPublishingMedia(Boolean screensharing) {
    if (mSession != null ) {
      if (!screensharing) {
        if (mPublisher != null && startPublishing) {
          mSession.unpublish(mPublisher);
        }
        isPublishing = false;
        startPublishing = false;
        if (!isPreviewing) {
          dettachPublisherView();
          mPublisher = null;
        }
      } else {
        dettachPublisherScreenView();
        if (mScreenPublisher != null && startSharingScreen) {
          mSession.unpublish(mScreenPublisher);
        }
        isSharingScreen = false;
        startSharingScreen = false;

        mScreenPublisher = null;
      }
    }
  }


  /**
   * Returns Local Media status
   * @param type MediaType (Audio or Video)
   * @return Whether the local MediaType is enabled (<code>true</code>) or not (
   * <code>false</code>)
   */
  public boolean isLocalMediaEnabled(MediaType type) {
    return (mPublisher != null) &&
      (type == MediaType.VIDEO ? mPublisher.getPublishVideo() : mPublisher.getPublishAudio());
  }

  /**
   * Enables or disables the local Media.
   * @param type MediaType (Audio or Video)
   * @param enabled Whether to enable media (<code>true</code>) or not (
   *                     <code>false</code>).
   */
  public void enableLocalMedia(MediaType type, boolean enabled){
    if ( mPublisher != null ) {
      switch (type) {
        case AUDIO:
          mPublisher.setPublishAudio(enabled);
          break;
        case VIDEO:
          mPublisher.setPublishVideo(enabled);
          if (enabled) {
            mPublisher.getView().setVisibility(View.VISIBLE);
          } else {
            mPublisher.getView().setVisibility(View.GONE);
          }
          break;
      }
    }
  }

  /**
   * Enables or disables the media of the remote with remoteId.
   * @param type MediaType (Audio or video)
   * @param enabled Whether to enable MediaType (<code>true</code>) or not (
   *                     <code>false</code>).
   */
  public void enableReceivedMedia(String remoteId, MediaType type, boolean enabled) {
    if (remoteId != null ) {
      enableRemoteMedia(mSubscribers.get(remoteId), type, enabled);
    } else {
      Collection<Subscriber> subscribers = mSubscribers.values();
      for(Subscriber sub: subscribers) {
        enableRemoteMedia(sub, type, enabled);
      }
    }
  }

  /**
   * Returns the MediaType status of the remote with remoteId
   * @param type MediaType: audio or video
   * @return Whether the remote MediaType is enabled (<code>true</code>) or not (
   * <code>false</code>).
   */
  public boolean isReceivedMediaEnabled(String remoteId, MediaType type) {
    Subscriber sub = mSubscribers.get(remoteId);
    boolean returnedValue = false;
    if (sub != null) {
      if (type == MediaType.VIDEO) {
        returnedValue = sub.getSubscribeToVideo();
      } else {
        returnedValue = sub.getSubscribeToAudio();
      }
    }
    return returnedValue;
  }

  /**
   * Call to cycle between cameras, if there are multiple cameras on the device.
   */
  public void cycleCamera(){
    if ( mPublisher != null ) {
      mPublisher.cycleCamera();
    }
  }

  /**
   * Sets a input signal processor. The input processor will process all the signals coming from
   * the wire. The SignalListeners will be invoked only on processed signals. That allows you to
   * easily implement and enforce a connection wide protocol for all sent and received signals.
   * @param inputProtocol The input protocol you want to enforce. Pass null if you wish to receive
   *                      raw signals.
   */
  public synchronized void setInputSignalProtocol(SignalProtocol inputProtocol) {
    mInputSignalProtocol = inputProtocol;
    mInputSignalProcessor =
      refreshSignalProcessor(mInputSignalProcessor, mInputSignalProtocol, mDispatchSignal);
  }

  /**
   * Sets a output signal protocol. The output protocol will process all the signals going to
   * the wire. A Signal will be sent using Opentok only after it has been processed by the protocol.
   * That allows you to easily implement and enforce a connection wide protocol for all sent and
   * received signals.
   * @param outputProtocol
   */
  public synchronized void setOutputSignalProtocol(SignalProtocol outputProtocol) {
    mOutputSignalProtocol = outputProtocol;
    mOutputSignalProcessor =
      refreshSignalProcessor(mOutputSignalProcessor, mOutputSignalProtocol, mInternalSendSignal);
  }

  /**
   * Returns the OpenTok Configuration
   * @return current OpenTok Configuration
   */
  public OTConfig getOTConfig(){
    return this.mOTConfig;
  }

  /**
   * Registers a signal listener for a given signal.
   * @param signalName Name of the signal this listener will listen to. Pass "*" if the listener
   *                   is to be invoked for all signals.
   * @param listener Listener that will be invoked when a signal is received.
   */
  public void addSignalListener(String signalName, SignalListener listener) {
    Log.d(LOG_TAG, "Adding Signal Listener for: " + signalName);
    ArrayList<SignalListener> perNameListeners = mSignalListeners.get(signalName);
    if (perNameListeners == null) {
      perNameListeners = new ArrayList<SignalListener>();
      mSignalListeners.put(signalName, perNameListeners);
    }
    if (perNameListeners.indexOf(listener) == -1) {
      Log.d(LOG_TAG, "Signal listener for: " + signalName + " is new!");
      perNameListeners.add(listener);
    }
  }

  /**
   * Removes an object as signal listener everywhere it's used. This is added to support the common
   * cases where an activity (or some object that depends on an activity) is used as a listener
   * but the activity can be destroyed at some points (which would cause the app to crash if the
   * signal was delivered).
   * @param listener Listener to be removed
   */
  public void removeSignalListener(SignalListener listener) {
    Enumeration<String> signalNames = mSignalListeners.keys();
    while (signalNames.hasMoreElements()) {
      String signalName = signalNames.nextElement();
      Log.d(LOG_TAG, "removeSignal(" + listener.toString() + ") for " + signalName);
      removeSignalListener(signalName, listener);
    }
  }

  /**
   * Removes a signal listener.
   * @param signalName Name of the signal this listener will listen to. Pass "*" if the listener
   *                   is to be invoked for all signals.
   * @param listener Listener to be removed.
   */
  public void removeSignalListener(String signalName, SignalListener listener) {
    ArrayList<SignalListener> perNameListeners = mSignalListeners.get(signalName);
    if (perNameListeners == null) {
      return;
    }
    perNameListeners.remove(listener);
    if (perNameListeners.size() == 0) {
      mSignalListeners.remove(signalName);
    }
  }

  private RetriableOTListener getUnfailingFromBaseListener(BaseOTListener listener) {
    return listener instanceof BasicListener ?
      new UnfailingBasicListener((BasicListener) listener) :
      new UnfailingAdvancedListener<>((AdvancedListener) listener);
  }

  private BaseOTListener addOTListener(BaseOTListener listener,
                                       HashMap retriableMap,
                                       ArrayList listenerList) {
    boolean isWrapped = listener instanceof RetriableOTListener;
    RetriableOTListener realListener = (RetriableOTListener) retriableMap.get(listener);
    if (realListener == null) {
      realListener =
        (RetriableOTListener) (isWrapped ? listener : getUnfailingFromBaseListener(listener));
      retriableMap.put(listener, (isWrapped ? listener : realListener));
      listenerList.add(realListener);
      refreshPeerList();
    }
    return (BaseOTListener) realListener;

  }

  private void removeOTListener(BaseOTListener listener, HashMap retriableMap,
                                ArrayList listenerList) {
    if (listener != null) {
      BaseOTListener internalListener = listener instanceof RetriableOTListener ?
        ((RetriableOTListener) listener).getInternalListener() :
        listener;
      RetriableOTListener realListener = (RetriableOTListener) retriableMap.get(internalListener);
      listenerList.remove(realListener);
      retriableMap.remove(internalListener);
    } else {
      listenerList.clear();
      retriableMap.clear();
    }
  }

  /**
   * Adds a {@link BasicListener}. If the listener was already added, nothing is done.
   * @param listener
   * @return The added listener
   */
  public BasicListener addBasicListener(BasicListener listener) {
    Log.d(LOG_TAG, "Adding BasicListener");
    return (BasicListener) addOTListener(listener, mRetriableBasicListeners, mBasicListeners);
  }

  /**
   * Removes a {@link BasicListener}
   * @param listener
   */
  public void removeBasicListener(BasicListener listener) {
    removeOTListener(listener, mRetriableBasicListeners, mBasicListeners);
  }

  /**
   * Adds an {@link AdvancedListener}
   * @param listener
   * @return The removed listener
   */
  public AdvancedListener addAdvancedListener(AdvancedListener<OTWrapper> listener) {
    Log.d(LOG_TAG, "Adding AdvancedListener");
    return (AdvancedListener) addOTListener(listener, mRetriableAdvancedListeners,
                                            mAdvancedListeners);
  }

  /**
   * Removes an {@link AdvancedListener}
   * @param listener
   */
  public void removeAdvancedListener(AdvancedListener listener) {
    removeOTListener(listener, mRetriableAdvancedListeners, mAdvancedListeners);
  }

  /**
   * Sends a new signal
   * @param signalInfo {@link SignalInfo} of the signal to be sent
   */
  public void sendSignal(SignalInfo signalInfo) {
    if (mOutputSignalProtocol != null) {
      mOutputSignalProtocol.write(signalInfo);
    } else {
      internalSendSignal(signalInfo);
    }
  }

  /**
   * Returns the {@link StreamStatus} of the local.
   * @return The {@link StreamStatus} of the local.
   *
   */
  public StreamStatus getLocalStreamStatus() {
    if (mPublisher != null) {
      Stream stream = mPublisher.getStream();
      boolean hasAudio = true;
      boolean hasVideo = true;
      int videoHeight = 0;
      int videoWidth = 0;
      Stream.StreamVideoType streamVideoType = Stream.StreamVideoType.StreamVideoTypeCamera;
      if (stream != null) {
        hasAudio = stream.hasAudio();
        hasVideo = stream.hasVideo();
        streamVideoType = stream.getStreamVideoType();
        videoHeight = stream.getVideoHeight();
        videoWidth = stream.getVideoWidth();
      }

      return new StreamStatus(mPublisher.getView(),
                              mPublisher.getPublishAudio(), mPublisher.getPublishVideo(),
                              hasAudio, hasVideo, streamVideoType,
                              videoWidth, videoHeight);
    }
    return null;
  }

  /**
   * Returns the stream status for the requested subscriber (actually, subId is the streamId..)
   * @param id Id of the subscriber/stream
   * @return The status including the view, and if it's subscribing to video and if it has local
   *         video
   */
  public StreamStatus getRemoteStreamStatus(String id) {
    Subscriber sub = mSubscribers.get(id);
    if (sub != null) {
      Stream subSt = sub.getStream();
      return new StreamStatus(sub.getView(), sub.getSubscribeToAudio(), sub.getSubscribeToVideo(),
                              subSt.hasAudio(), subSt.hasVideo(), subSt.getStreamVideoType(),
                              subSt.getVideoWidth(), subSt.getVideoHeight());
    }
    return null;
  }

  /**
   * Sets the  Video Scale style for a remote
   * @param remoteId the remote subscriber ID
   * @param style VideoScale value: FILL or FIT
   */
  public void setRemoteStyle(String remoteId, VideoScale style) {
    Subscriber subscriber = mSubscribers.get(remoteId);
    if ( style == VideoScale.FILL ){
      subscriber.setStyle(BaseVideoRenderer.STYLE_VIDEO_SCALE, BaseVideoRenderer.STYLE_VIDEO_FILL);
    }
    else {
      subscriber.setStyle(BaseVideoRenderer.STYLE_VIDEO_SCALE, BaseVideoRenderer.STYLE_VIDEO_FIT);
    }
  }

  /**
   * Sets the Local Video Style
   * @param style VideoScale value: FILL or FIT
   */
  public void setLocalStyle(VideoScale style) {
    if ( style == VideoScale.FILL ){
      mPublisher.setStyle(BaseVideoRenderer.STYLE_VIDEO_SCALE, BaseVideoRenderer.STYLE_VIDEO_FILL);
    }
    else {
      mPublisher.setStyle(BaseVideoRenderer.STYLE_VIDEO_SCALE, BaseVideoRenderer.STYLE_VIDEO_FIT);
    }
  }

  /**
   * Sets a custom video renderer for the remote
   * @param renderer The custom video renderer
   * @param remoteScreen Whether the renderer is applied to the remote received screen or not.
   */
  public void setRemoteVideoRenderer(BaseVideoRenderer renderer, boolean remoteScreen) {
    //to-review: it will apply to all the subscribers
    if ( remoteScreen ){
      mScreenRemoteRenderer = renderer;
    }
    else {
      mVideoRemoteRenderer = renderer;
    }
  }

  //Private methods
  private void cleanup() {
    mSession = null;
    mPublisher = null;
    mSubscribers = null;
    mConnections = null;
    mConnectionsCount = 0;
    mSessionConnection = null;
    isPreviewing = false;
    isPublishing = false;
    isSharingScreen = false;
    cleanUpSignals();
  }

  private void cleanUpSignals() {
    setInputSignalProtocol(null);
    setOutputSignalProtocol(null);
    mSignalListeners = new Hashtable<String, ArrayList<SignalListener>>();
  }

  private synchronized void publishIfReady() {
    Log.d(LOG_TAG, "publishIfReady: " + mSessionConnection + ", " + mPublisher + ", " +
      startPublishing);
    if (mSessionConnection != null && mPublisher != null && startPublishing) {
      if (!isPreviewing) {
        attachPublisherView();
      }
      if (!isPublishing) {
        mSession.publish(mPublisher);
        // Do this as soon as possible to avoid race conditions...
        isPublishing = true;
      }
    }
  }

  private synchronized  void publishIfScreenReady(){
    Log.d(LOG_TAG, "publishIfScreenReady: " + mSessionConnection + ", " + mScreenPublisher + ", " +
      startSharingScreen);
    if (mSessionConnection != null && mScreenPublisher != null && startSharingScreen) {

      if (!isPreviewing) {
        attachPublisherScreenView();
      }
      if (!isSharingScreen) {
        mSession.publish(mScreenPublisher);
        // Do this as soon as possible to avoid race conditions...
        isSharingScreen = true;
      }
    }
  }

  private void createPublisher(){
    //TODO: add more cases
    Log.d(LOG_TAG, "createPublisher: " + mPreviewConfig);
    if (mPreviewConfig != null) {
      if (mPreviewConfig.getResolution() != Publisher.CameraCaptureResolution.MEDIUM ||
        mPreviewConfig.getFrameRate() != Publisher.CameraCaptureFrameRate.FPS_15) {
        Log.d(LOG_TAG, "createPublisher: Creating publisher with: " +
          mPreviewConfig.getResolution() + ", " + mPreviewConfig.getFrameRate());
        mPublisher = new Publisher(mContext, mPreviewConfig.getName(),
                                   mPreviewConfig.getResolution(), mPreviewConfig.getFrameRate() );
      } else {
        Log.d(LOG_TAG, "createPublisher: Creating Publisher with audio and video specified");
        mPublisher = new Publisher(mContext, mPreviewConfig.getName(),
                                   mPreviewConfig.isAudioTrack(), mPreviewConfig.isVideoTrack());
      }

      if ( mPreviewConfig.getCapturer() != null ){
        //custom video capturer
        mPublisher.setCapturer(mPreviewConfig.getCapturer()); //to-review
      }
      if ( mPreviewConfig.getRenderer() != null ){
        mPublisher.setRenderer(mPreviewConfig.getRenderer());
      }

    } else {
      Log.d(LOG_TAG, "createPublisher: Creating DefaultPublisher");
      mPublisher = new Publisher(mContext);
    }

    mPublisher.setPublisherListener(mPublisherListener);
    mPublisher.setCameraListener(mCameraListener);
    //byDefault
    mPublisher.setStyle(BaseVideoRenderer.STYLE_VIDEO_SCALE, BaseVideoRenderer.STYLE_VIDEO_FILL);
  }

  private void createScreenPublisher(PreviewConfig config){
    Log.d(LOG_TAG, "createScreenPublisher: " + config);
    if (config != null) {
      if (config.getResolution() != Publisher.CameraCaptureResolution.MEDIUM ||
        config.getFrameRate() != Publisher.CameraCaptureFrameRate.FPS_15) {
        Log.d(LOG_TAG, "createPublisher: Creating publisher with: " + config.getResolution() +
          ", " + config.getFrameRate());
        mScreenPublisher = new Publisher(mContext, config.getName(), config.getResolution(),
                                         config.getFrameRate() );
      } else {
        Log.d(LOG_TAG, "createPublisher: Creating Publisher with audio and video specified");
        mScreenPublisher = new Publisher(mContext, config.getName(), config.isAudioTrack(),
                                         config.isVideoTrack());
      }

      if ( config.getCapturer() != null ){
        //custom video capturer
        mScreenPublisher.setCapturer(config.getCapturer());
      }
      if ( config.getRenderer() != null ){
        mScreenPublisher.setRenderer(config.getRenderer());
      }

    } else {
      Log.d(LOG_TAG, "createPublisher: Creating DefaultPublisher");
      mScreenPublisher = new Publisher(mContext);
    }

    mScreenPublisher.setPublisherListener(mPublisherListener);
    mScreenPublisher.setCameraListener(mCameraListener);
    mScreenPublisher.
      setPublisherVideoType(PublisherKit.PublisherKitVideoType.PublisherKitVideoTypeScreen);

    //byDefault
    mScreenPublisher.setStyle(BaseVideoRenderer.STYLE_VIDEO_SCALE,
                              BaseVideoRenderer.STYLE_VIDEO_FILL);
  }

  private void attachPublisherView() {
    if (mBasicListeners != null && !mBasicListeners.isEmpty()) {
      for (BasicListener listener: mBasicListeners) {
        ((RetriableBasicListener)listener).onPreviewViewReady(SELF, mPublisher.getView());
      }
    }
  }

  private void attachPublisherScreenView() {
    if (mBasicListeners != null && !mBasicListeners.isEmpty()) {
      for (BasicListener listener: mBasicListeners) {
        ((RetriableBasicListener)listener).onPreviewViewReady(SELF, mScreenPublisher.getView());
      }
    }
  }

  private void dettachPublisherView() {
    if (mBasicListeners != null && !mBasicListeners.isEmpty()) {
      for (BasicListener listener: mBasicListeners) {
        ((RetriableBasicListener)listener).onPreviewViewDestroyed(SELF, mPublisher.getView());
      }
    }
  }

  private void dettachPublisherScreenView() {
    if (mBasicListeners != null && !mBasicListeners.isEmpty()) {
      for (BasicListener listener: mBasicListeners) {
        ((RetriableBasicListener)listener).onPreviewViewDestroyed(SELF, mScreenPublisher.getView());
      }
    }
  }

  private void refreshPeerList() {
    if (mBasicListeners != null && !mBasicListeners.isEmpty()) {
      if (mBasicListeners != null && !mBasicListeners.isEmpty()) {
        for (BasicListener listener: mBasicListeners) {
          if ( ((RetriableBasicListener)listener).getInternalListener() != null ){
            if (mPublisher != null) {
              ((RetriableBasicListener)listener).onPreviewViewReady(SELF, mPublisher.getView());
            }
            if (mScreenPublisher != null) {
              ((RetriableBasicListener)listener).onPreviewViewReady(SELF,
                                                                    mScreenPublisher.getView());
            }
            for(Subscriber sub: mSubscribers.values()) {
              Stream stream = sub.getStream();
              ((RetriableBasicListener)listener).
                onRemoteViewReady(SELF, sub.getView(), stream.getStreamId(),
                                  stream.getConnection().getData());
            }
          }
        }
      }


    }
  }

  private void enableRemoteMedia(Subscriber sub, MediaType type, boolean enabled) {
    if (sub != null) {
      if (type == MediaType.VIDEO) {
        sub.setSubscribeToVideo(enabled);
      } else {
        sub.setSubscribeToAudio(enabled);
      }
    }
  }

  private void addNewRemote(Stream stream){
    if (mOTConfig.shouldSubscribeAutomatically()) {
      Subscriber sub = new Subscriber(mContext, stream);
      sub.setVideoListener(mVideoListener);
      sub.setStyle(BaseVideoRenderer.STYLE_VIDEO_SCALE, BaseVideoRenderer.STYLE_VIDEO_FILL);
      String subId = stream.getStreamId();
      mSubscribers.put(subId, sub);
      sub.setSubscriberListener(mSubscriberListener);
      if (mBasicListeners != null) {
        for (BasicListener listener : mBasicListeners) {
          ((RetriableBasicListener) listener).onRemoteJoined(SELF, subId);
        }
      }
      if (stream.getStreamVideoType() == Stream.StreamVideoType.StreamVideoTypeCamera &&
              mVideoRemoteRenderer != null) {
        sub.setRenderer(mVideoRemoteRenderer);
      } else {
        if (stream.getStreamVideoType() == Stream.StreamVideoType.StreamVideoTypeScreen &&
                mScreenRemoteRenderer != null) {
          sub.setRenderer(mScreenRemoteRenderer);
        }
      }
      mSession.subscribe(sub);
    }
  }

  //Signal protocol
  /**
   * Note that I'm not absolutely sure that the semantics of the normal SignalPipe are enough
   * and that we don't actually need a ThreadedSignalPipe here at least.
   */
  private SignalProcessorThread mInputSignalProcessor;
  private SignalProcessorThread mOutputSignalProcessor;

  // Note that each signal is dispatched on its own thread. So the receivers are responsible or
  // posting back to the UI thread if they wish.
  private void dispatchSignal(ArrayList<SignalListener> listeners, final SignalInfo signalInfo,
                              boolean global) {
    if (listeners != null) {
      Iterator<SignalListener> listenerIterator = listeners.iterator();
      while (listenerIterator.hasNext()) {
        Log.d(LOG_TAG, "Starting thread to process: " + signalInfo.mSignalName);
        final SignalListener listener = listenerIterator.next();
        new Thread() {
          @Override
          public void run() {
            Log.d(LOG_TAG, "Dispatching signal: " + signalInfo.mSignalName + " on thread: " +
              this.getId());
            listener.onSignalReceived(signalInfo, getOwnConnId().equals(signalInfo.mSrcConnId));
          }
        }.start();
      }
    } else {
      Log.d(LOG_TAG, "dispatchSignal: No " + (global ? "global " : "") +
        "listeners registered for: " + signalInfo.mSignalName);
    }
  }

  private void dispatchSignal(final SignalInfo signalInfo) {
    Log.d(LOG_TAG, "Dispatching signal: " + signalInfo.mSignalName + " with: " + signalInfo.mData);
    dispatchSignal(mSignalListeners.get("*"), signalInfo, true);
    dispatchSignal(mSignalListeners.get(signalInfo.mSignalName), signalInfo, false);
  }

  private Callback<SignalInfo> mInternalSendSignal = new Callback<SignalInfo>() {
    @Override
    public void run(SignalInfo signalInfo) {
      internalSendSignal(signalInfo);
    }
  };

  private Callback<SignalInfo> mDispatchSignal = new Callback<SignalInfo>() {
    @Override
    public void run(SignalInfo signalInfo) {
      dispatchSignal(signalInfo);
    }
  };

  private void internalSendSignal(SignalInfo signalInfo) {
    Log.d(LOG_TAG, "internalSendSignal: " + signalInfo.mSignalName);
    if (signalInfo.mDstConnId == null) {
      mSession.sendSignal(signalInfo.mSignalName, (String) signalInfo.mData);
    } else {
      mSession.sendSignal(signalInfo.mSignalName, (String) signalInfo.mData,
                          mConnections.get(signalInfo.mDstConnId));
    }

  }

  private SignalProcessorThread refreshSignalProcessor(SignalProcessorThread currentProcessor,
                                                       SignalProtocol signalProtocol,
                                                       Callback<SignalInfo> cb) {
    if (currentProcessor != null) {
      return currentProcessor.switchPipe(signalProtocol);
    } else  {
      return new SignalProcessorThread(signalProtocol, cb);
    }

  }

  //Implements Basic listeners: Session.SessionListener, Session.ConnectionListener,
  // Session.SignalListener, Publisher.PublisherListener
  private Session.SessionListener mSessionListener = new Session.SessionListener() {
    @Override
    public void onConnected(Session session) {
      mSessionConnection = session.getConnection();
      Log.d(LOG_TAG, "onConnected: " + mSessionConnection.getData());

      mConnectionsCount++;

      publishIfReady();

      if ( mBasicListeners != null ) {
        for (BasicListener listener : mBasicListeners) {
          ((RetriableBasicListener)listener).onConnected(SELF, mConnectionsCount,
                                                         mSessionConnection.getConnectionId(),
                                                         mSessionConnection.getData());
        }
      }
    }

    @Override
    public void onDisconnected(Session session) {

      if (mBasicListeners != null ) {
        for (BasicListener listener : mBasicListeners) {
          ((RetriableBasicListener)listener).onDisconnected(SELF, 0,
                                                            mSessionConnection.getConnectionId(),
                                                            mSessionConnection.getData());
        }
      }

      cleanup();
    }

    @Override
    public void onStreamReceived(Session session, Stream stream) {
      Log.d(LOG_TAG, "OnStreamReceived: " + stream.getConnection().getData());
      addNewRemote(stream);
    }

    @Override
    public void onStreamDropped(Session session, Stream stream) {
      Log.d(LOG_TAG, "OnStreamDropped: " + stream.getConnection().getData());

      String subId = stream.getStreamId();
      mSubscribers.remove(subId);
      if (mBasicListeners != null) {
        for (BasicListener listener : mBasicListeners) {
          ((RetriableBasicListener)listener).onRemoteLeft(SELF, subId);
          ((RetriableBasicListener)listener).onRemoteViewDestroyed(SELF, null, subId);
        }
      }
    }

    @Override
    public void onError(Session session, OpentokError opentokError) {
      Log.d(LOG_TAG, "Session: onError " + opentokError.getMessage());
      if (mBasicListeners != null) {
        for (BasicListener listener : mBasicListeners) {
          ((RetriableBasicListener)listener).onError(SELF, opentokError);
        }
      }
    }
  };

  private Session.ConnectionListener mConnectionListener = new Session.ConnectionListener() {
    @Override
    public void onConnectionCreated(Session session, Connection connection) {
      Log.d(LOG_TAG, "onConnectionCreated: " + connection.getData());
      mConnections.put(connection.getConnectionId(), connection);
      mConnectionsCount++;
      if (connection.getCreationTime().compareTo(mSessionConnection.getCreationTime()) <= 0) {
        mOlderThanMe++;
      }
      if (mBasicListeners != null) {
        for (BasicListener listener : mBasicListeners) {
          ((RetriableBasicListener) listener).onConnected(SELF, mConnectionsCount,
                                                          connection.getConnectionId(),
                                                          connection.getData());
        }
      }
    }

    @Override
    public void onConnectionDestroyed(Session session, Connection connection) {
      Log.d(LOG_TAG, "onConnectionDestroyed: " + connection.getData());
      mConnections.remove(connection.getConnectionId());
      mConnectionsCount--;
      if (connection.getCreationTime().compareTo(mSessionConnection.getCreationTime()) <= 0) {
        mOlderThanMe--;
      }
      if (mBasicListeners != null) {
        for (BasicListener listener : mBasicListeners) {
          ((RetriableBasicListener) listener).onDisconnected(SELF, mConnectionsCount,
                                                             connection.getConnectionId(),
                                                             connection.getData());
        }
      }
    }
  };

  private SubscriberKit.SubscriberListener mSubscriberListener =
    new SubscriberKit.SubscriberListener() {
      @Override
      public void onConnected(SubscriberKit sub) {
        if (mBasicListeners != null) {
          for (BasicListener listener : mBasicListeners) {
            Stream stream = sub.getStream();
            ((RetriableBasicListener) listener).
              onRemoteViewReady(SELF, sub.getView(), stream.getStreamId(),
                                stream.getConnection().getData());
          }
        }
      }

      @Override
      public void onDisconnected(SubscriberKit subscriberKit) {
      }

      @Override
      public void onError(SubscriberKit subscriberKit, OpentokError opentokError) {
        Log.e(LOG_TAG, "Subscriber: onError " + opentokError.getErrorCode() + ", " +
          opentokError.getMessage());
        OpentokError.ErrorCode errorCode = opentokError.getErrorCode();
        switch (errorCode) {
          case SubscriberInternalError:
          case ConnectionTimedOut:
            // Just try again
            mSession.subscribe(subscriberKit);
            break;
          case SubscriberWebRTCError:
          case SubscriberServerCannotFindStream:
            Log.e(LOG_TAG, "Subscriber: SubscriberWebRTC Error. Ignoring");
            mSubscribers.remove(subscriberKit.getStream().getStreamId());
            break;
          default:
            for (BasicListener listener : mBasicListeners) {
              ((RetriableBasicListener) listener).onError(SELF, opentokError);
            }
            break;
        }
      }
    };

  private Session.SignalListener mSignalListener = new Session.SignalListener() {
    @Override
    public void onSignalReceived(Session session, String signalName, String data,
                                 Connection connection) {
      String connId = connection != null ? connection.getConnectionId() : null;
      SignalInfo inputSignal = new SignalInfo(connId, getOwnConnId(), signalName, data);
      if (mInputSignalProtocol != null) {
        mInputSignalProtocol.write(inputSignal);
      } else {
        dispatchSignal(inputSignal);
      }
    }
  };

  private Publisher.PublisherListener mPublisherListener = new Publisher.PublisherListener() {

    @Override
    public void onStreamCreated(PublisherKit publisherKit, Stream stream) {
      boolean screensharing = false;
      if (stream.getStreamVideoType() == Stream.StreamVideoType.StreamVideoTypeScreen){
        screensharing = true;
      }
      else{
        isPublishing = true;
      }
      for (BasicListener listener : mBasicListeners) {
        ((RetriableBasicListener) listener).onStartedPublishingMedia(SELF, screensharing);
      }

      //check subscribe to self
      if ( mOTConfig.shouldSubscribeToSelf() ){
        addNewRemote(stream);
      }
    }

    @Override
    public void onStreamDestroyed(PublisherKit publisherKit, Stream stream) {
      Log.i(LOG_TAG, "ONSTREAM DESTROYED");
      boolean screensharing = false;
      if (stream.getStreamVideoType() == Stream.StreamVideoType.StreamVideoTypeScreen){
        screensharing = true;
      }
      else {
        isPublishing = false;
      }
      for (BasicListener listener : mBasicListeners) {
        ((RetriableBasicListener) listener).onStoppedPublishingMedia(SELF, screensharing);
      }
    }

    @Override
    public void onError(PublisherKit publisherKit, OpentokError opentokError) {
      Log.e(LOG_TAG, "Publisher: onError " + opentokError.getErrorCode() + ", " +
        opentokError.getMessage());
      OpentokError.ErrorCode errorCode = opentokError.getErrorCode();
      switch (errorCode) {
        case PublisherInternalError:
        case PublisherTimeout:
          mSession.publish(publisherKit);
          break;
        case PublisherWebRTCError:
          Log.e(LOG_TAG, "Publisher: onError: Got a InternalWebRTCError!");
        default:
          for (BasicListener listener : mBasicListeners) {
            ((RetriableBasicListener) listener).onError(SELF, opentokError);
          }
          break;
      }

    }
  };

  //Implements Advanced listeners
  private Session.ReconnectionListener mReconnectionListener = new Session.ReconnectionListener() {

    @Override
    public void onReconnecting(Session session) {
      if ( mAdvancedListeners != null ) {
        for (AdvancedListener listener : mAdvancedListeners) {
          ((RetriableAdvancedListener) listener).onReconnecting(SELF);
        }
      }
    }

    @Override
    public void onReconnected(Session session) {
      if ( mAdvancedListeners != null ) {
        for (AdvancedListener listener : mAdvancedListeners) {
          ((RetriableAdvancedListener) listener).onReconnected(SELF);
        }
      }
    }
  };
  private SubscriberKit.VideoListener mVideoListener = new SubscriberKit.VideoListener() {
    @Override
    public void onVideoDataReceived(SubscriberKit subscriberKit) {
      //to-review: a new listener to indicate the first frame received
    }

    @Override
    public void onVideoDisabled(SubscriberKit subscriber, String reason) {
      if ( mBasicListeners != null ) {
        for (BasicListener listener : mBasicListeners) {
          ((RetriableBasicListener) listener).
            onRemoteVideoChanged(SELF, subscriber.getStream().getStreamId(), reason, false,
                                subscriber.getSubscribeToVideo());
        }
      }
    }

    @Override
    public void onVideoEnabled(SubscriberKit subscriber, String reason) {
      if ( mBasicListeners != null ) {
        for (BasicListener listener : mBasicListeners) {
          ((RetriableBasicListener) listener).
            onRemoteVideoChanged(SELF, subscriber.getStream().getStreamId(), reason, true,
                                subscriber.getSubscribeToVideo());
        }
      }
    }

    @Override
    public void onVideoDisableWarning(SubscriberKit subscriber) {
      if ( mAdvancedListeners != null ) {
        for (AdvancedListener listener : mAdvancedListeners) {
          ((RetriableAdvancedListener) listener).
            onVideoQualityWarning(SELF, subscriber.getStream().getStreamId());
        }
      }
    }

    @Override
    public void onVideoDisableWarningLifted(SubscriberKit subscriber) {
      if ( mAdvancedListeners != null ) {
        for (AdvancedListener listener : mAdvancedListeners) {
          ((RetriableAdvancedListener) listener).
            onVideoQualityWarningLifted(SELF, subscriber.getStream().getStreamId());
        }
      }
    }
  };

  private Publisher.CameraListener mCameraListener = new Publisher.CameraListener() {

    @Override
    public void onCameraChanged(Publisher publisher, int i) {
      if ( mAdvancedListeners != null ) {
        for (AdvancedListener listener : mAdvancedListeners) {
          ((RetriableAdvancedListener) listener).onCameraChanged(SELF);
        }
      }
    }

    @Override
    public void onCameraError(Publisher publisher, OpentokError opentokError) {
      Log.d(LOG_TAG, "onCameraError: onError " + opentokError.getMessage());
      if ( mAdvancedListeners != null ) {
        for (AdvancedListener listener : mAdvancedListeners) {
          ((RetriableAdvancedListener) listener).onError(SELF, opentokError);
        }
      }
    }
  };

}
