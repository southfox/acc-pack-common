# Android SDK Wrapper 1.0.0

## Quick start

This section shows you how to prepare and use the Android SDK Wrapper as part of an application.

## Add the SDK Wrapper library

There are 3 options for installing the Wrapper library:

  - [Using the repository](#using-the-repository)
  - [Using Maven](#using-maven)
  - [Downloading and Installing the AAR File](#downloading-and-installing-the-aar-file)


### Using the repository

1. Clone the [Wrapper repo](https://github.com/opentok/acc-pack-common).
2. Start Android Studio and create a project.
3. From the project view, right-click the app name and select **New > Module > Import Gradle Project**.
3. Navigate to the directory in which you cloned **Wrapper repo** **android** folder, select the **ot-sdk-wrapper** folder, and click **Finish**
4. Open the **build.gradle** file for the app and ensure the following lines have been added to the `dependencies` section:
```
   compile project(‘:ot-sdk-wrapper')
```

### Using Maven

1. In the `build.gradle` file for your solution, add the following code to the section labeled `repositories`:

  ```
  maven { url  "http://tokbox.bintray.com/maven" }
  ```

2. Add the following code snippet to the section labeled 'dependencies’:

  ```
  compile 'com.opentok.android:opentok-sdk-wrapper:1.0.0’
  ```

### Downloading and Installing the AAR File

1.  Download the [Android SDK Wrapper zip file](https://s3.amazonaws.com/artifact.tokbox.com/solution/rel/wrapper/android/opentok-android-sdk-wrapper-1.0.0.zip) containing the AAR file and documentation,
1. Extract the **opentok-android-sdk-wrapper-1.0.0.aar** file.
2.  Right-click the app name, select **Open Module Settings**, and click **+**.
3.  Select **Import .JAR/.AAR Package** and click **Next**.
4.  Browse to the **SDK Wrapper AAR** and click **Finish**.


## Exploring the code

For detail about the APIs used to develop this wrapper, see the [OpenTok Android SDK Reference](https://tokbox.com/developer/sdks/android/reference/) and [Android API Reference](http://developer.android.com/reference/packages.html).

_**NOTE:** The sdk wrapper contains logic used for logging. This is used to submit anonymous usage data for internal TokBox purposes only. We request that you do not modify or remove any logging code in your use of this library._


### Main Class design

| Class        | Description  |
| ------------- | ------------- |
| `OTWrapper`   |  Represents an OpenTok object to enable a video communication. |
| `OTConfig`   | Defines the OpenTok Configuration to be used in the communication. It includes SessionId, Token and APIKey, and features like to subscribe automatically or subscribe to self. |
| `PreviewConfig` | Defines the configuration of the local preview. |
| `BasicListener` | Monitors basic state changes in the OpenTok communication. |
| `AdvancedListener` | Monitors advanced state changes in the OpenTok communication.|
| `SignalListener` | Monitors a new signal received in the OpenTok communication. |
| `MediaType` | Defines the Audio and Video media type. |
| `StreamStatus` | Defines the current status of the Stream properties. |
| `VideoScale` | Defines the FIT and FILL modes setting for the renderer. |


### Using the Android SDK Wrapper

#### Init the SDK Wrapper

The first step in using the SDK Wrapper is to initialize it by calling the constructor with the OTConfig parameter and set the listeners.

```java

	OTConfig config =
                new OTConfig.OTConfigBuilder(SESSION_ID, TOKEN,
                        API_KEY).name("sdk-wrapper-sample").subscribeAutomatically(true).subscribeToSelf(false).build();

    OTWrapper mWrapper = new OTWrapper(MainActivity.this, config);

    //set listeners
    mWrapper.addBasicListener(mBasicListener);
    mWrapper.addAdvancedListener(mAdvancedListener);
    mWrapper.addSignalListener(mSignalListener);
```

```java

	//define listeners
    private BasicListener mBasicListener =
            new PausableBasicListener(new BasicListener<OTWrapper>() {
                //.......
            });

    private AdvancedListener mAdvancedListener =
            new PausableAdvancedListener(new AdvancedListener<OTWrapper>() {
   			//.......
   		});

```


#### Connect and disconnect from an OpenTok session

Call to connect or disconnect from an OpenTok session. When the OTWrapper is connected, the BasicListener.onConnected(...) event is called.
If the OTWrapper failed to connect, the BasicListener.onError(...) event is called.

```java
	
	mWrapper.connect();
    
    //.....

    mWrapper.disconnect(); 

```

Each time a new participant connects to the same session, the BasicListener.onConnected(...) event is called.
This event offers the information about the new connection id of the participant who connected, the total connections count in the session and the data of the connection.
To check if the new connection is our own connection or not, use OTWrapper.getOwnConnId().

```java
	
	private boolean isConnected = false;
	private String mRemoteConnId;

	private BasicListener mBasicListener =
            new PausableBasicListener(new BasicListener<OTWrapper>() {

                @Override
                public void onConnected(OTWrapper otWrapper, int participantsCount, String connId, String data) throws ListenerException {
                    Log.i(LOG_TAG, "Connected to the session. Number of participants: " + participantsCount);
                    
                    if (mWrapper.getOwnConnId() == connId) {
                        isConnected = true;
                    }
                    else {
                        mRemoteConnId = connId;
                    }
                }
              //....
    });
```

#### Start and stop preview

Call to start and stop displaying the camera's video in the Preview's view before it starts streaming video. Therefore, the other participants are not going to receive this video stream.

```java
	 
	mWrapper.startPreview(new PreviewConfig.PreviewConfigBuilder().
                        name("Tokboxer").build());

    //.....
    
    mWrapper.stopPreview();

              
```              

When the OTWrapper started the preview, the BasicListener.onPreviewViewReady(...) event is called. And when the OTWrapper stopped the preview, the BasicListener.onPreviewViewDestroyed(...) event is called.

```java
	private BasicListener mBasicListener =
            new PausableBasicListener(new BasicListener<OTWrapper>() {

 			@Override
                public void onPreviewViewReady(OTWrapper otWrapper, View localView) throws ListenerException {
                    Log.i(LOG_TAG, "Local preview view is ready");
                    //....
                }

                @Override
                public void onPreviewViewDestroyed(OTWrapper otWrapper, View localView) throws ListenerException {
                    Log.i(LOG_TAG, "Local preview view is destroyed");
                   //....
                }
    });
```

#### Start and stop publishing media

Call to start and stop the local streaming video. The source of the stream can be the camera or the screen. To indicate the screen source, it is necessary to set the screensharing parameter to TRUE.

```java
	
	PreviewConfig config;

	//camera streaming
	config = new PreviewConfig.PreviewConfigBuilder().
                        name("Tokboxer").build();
	mWrapper.startPublishingMedia(config, false);

    //or screen streaming, using a custom screen capturer
    config = new PreviewConfig.PreviewConfigBuilder().
                    name("screenPublisher").capturer(screenCapturer).build();
    mWrapper.startSharingMedia(config, true);

```

When the OTWrapper started the publishing media, the BasicListener.onStartedPublishingMedia(...) event is called. And when the OTWrapper stopped the publishing media, the BasicListener.onStoppedPublishingMedia(...) event is called.

```java
	private BasicListener mBasicListener =
            new PausableBasicListener(new BasicListener<OTWrapper>() {

 			@Override
                public void onStartedSharingMedia(OTWrapper otWrapper, boolean screensharing) throws ListenerException {
                    Log.i(LOG_TAG, "Local started streaming video.");
                    //....
                }

                @Override
                public void onStoppedSharingMedia(OTWrapper otWrapper, boolean isScreensharing) throws ListenerException {
                    Log.i(LOG_TAG, "Local stopped streaming video.");
                }
    });
```

### Remote participants management
To subscribe automatically to a new participant connected to the session, the `subscribeAutomatically` property in the OTConfig has to be TRUE.
Then, when a new remote participant connected to the session, the BasicListener.onRemoteJoined(...) event is called. And the BasicListener.onRemoteLeft(...) event is called. These callbacks contain the identifier for the remote participant, which is equals to the stream id of them.
```java
	private BasicListener mBasicListener =
            new PausableBasicListener(new BasicListener<OTWrapper>() {

		@Override
		public void onRemoteJoined(OTWrapper otWrapper, String remoteId) throws ListenerException {
        	Log.i(LOGTAG, "A new remote joined.");
        	//...
        }

        @Override
        public void onRemoteLeft(OTWrapper otWrapper, String remoteId) throws ListenerException {
        	Log.i(LOGTAG, "A new remote left.");
        	//...    
        }
    });
```

When the remote participant view is ready, the BasicListener.onRemoteViewReady(...) event is called. And when the remote participant view is destroyed, the BasicListener.onRemoteViewDestroyed(....) event is called.
```java
	private BasicListener mBasicListener =
            new PausableBasicListener(new BasicListener<OTWrapper>() {

		@Override
        public void onRemoteViewReady(OTWrapper otWrapper, View remoteView, String remoteId, String data) throws ListenerException {
            Log.i(LOGTAG, "Remove view is ready");
            //...
  		}

        @Override
        public void onRemoteViewDestroyed(OTWrapper otWrapper, View remoteView, String remoteId) throws ListenerException {
        	Log.i(LOGTAG, "Remote view is destroyed");
        	//...
        }
    });
```

#### Connections management

The SDK Wrapper offers a set of methods to manage the connections of the session.

```java
	//get our own connection Id
	String myConnectionId = mWrapper.getOwnConnId();

	//get the total connections in the session
	String totalParticipants = mWrapper.getConnectionsCount();

	//check f the own connection is the oldest in the current session
	Boolen isTheOldest = mWrapper.isTheOldestConnection();

	//compare the connections creation times between the local connection and the argument passing
	int older = mWrapper.compareConnectionsTimes(remoteConnId);

```

#### Enable and disable the publishing and receiving media
To enable or disable the publishing audio or video.

```java
	//check the current status of the publishing video
	boolean videoEnabled = mWrapper.isPublishingMediaEnabled(MediaType.Video);

	//check the current status of the publishing audio
	boolean audioEnabled = mWrapper.isPublishingMediaEnabled(MediaType.Audio);

	//enable the video
	mWrapper.enablePublishingMedia(MediaType.Video, true);
	
	//disable the audio
	mWrapper.enablePublishingMedia(MediaType.Audio, false);
	
```

#### Pause and resume communication

Call these methods when the app's activity pauses or resumes. These pause or resume the video for the local preview and remotes. 
The SDK Wrapper offers the posibility to resume the events too setting the `resumeEvents` parameter to TRUE in the `resume` method.

```java
	mWrapper.pause();

	//.....

	mWrapper.resume(true);	
```

#### Get stream status
The status of a stream includes the media status, the stream type, the status of the media containers and the stream dimensions.

```java
	//to get the publishing stream status
	StreamStatus localStreamStatus = mWrapper.getPublishingStreamStatus();

	//to get the remote stream status
	StreamStatus remoteStreamStatus = mWrapper.getRemoteStremStatus(remoteId);

```

#### Signals Management
The SDK Wrapper includes a complete Signaling protocol to register a signal listener for a given signal.

```java
	
	mWrapper.addSignalListener(SIGNAL_TYPE, this);

	//send a signal to all the participants
	mWrapper.sendSignal(new SignalInfo(mWrapper.getOwnConnId(), null, SIGNAL_TYPE, "hello"));

	//send a signal to a specific participant, using the participant connection id.
	mWrapper.sendSignal(new SignalInfo(mWrapper.getOwnConnId(), participantConnId, SIGNAL_TYPE, "hello"));

	//manage the received signals. All the received signals will be of the registered type: SIGNAL_TYPE
	public void onSignalReceived(SignalInfo signalInfo, boolean isSelfSignal) {
   		//....
    }

```

#### Customize capturer and renderers
A custom video capturer or renderer can be used in the OpenTok communication for the publishing media.

```java

   CustomRenderer myCustomRenderer = new CustomRenderer(...);
   CustomCapturer myCustomCapturer = new CustomCapturer(...);

   PreviewConfig config = new PreviewConfig.PreviewConfigBuilder().
                    name("screenPublisher").capturer(myCustomCapturer).renderer(myCustomRenderer).build();

   mWrapper.startPublishingMedia(config, false);

```

A custom video renderer can be used in the OpenTok communication for the received media. Please note, this should be set before to start the communication.

```java
	
   CustomRenderer myCustomRenderer = new CustomRenderer(...);
   //set a custom renderer dor the received video stream
   mWrapper.setRemoteVideoRenderer(myCustomRenderer);

   //or set a custom renderer for the received screen stream 
   mWrapper.setRemoteScreenRenderer(myCustomRenderer);

```

#### Set Video Renderer styles
The video scale mode can be modified to FILL or FIT value for the publishing video or for the received video from the remotes.

```java
	mWrapper.setPublishingStyle(VideoScalse.FIT);
	mWrapper.setRemoteStyle(remoteId, VideoScale.FILL);
```

#### Cycle the camera
Cycle between cameras, if there are multiple cameras on the device. Then, the AdvancedListener.onCameraChanged(...) event is called. 

```java
	mWrapper.cycleCamera();
```

#### Advanced events
The SDK Wrapper include an AdvancedListener to define some events like when the video changed by quality reasons, or when the communication tries to reconnect,...etc.

```java
	private AdvancedListener mAdvancedListener =
            new PausableAdvancedListener(new AdvancedListener<OTWrapper>() {

                @Override
                public void onReconnecting(OTWrapper otWrapper) throws ListenerException {
                    Log.i(LOG_TAG, "The session is reconnecting.");
                }

                @Override
                public void onReconnected(OTWrapper otWrapper) throws ListenerException {
                    Log.i(LOG_TAG, "The session reconnected.");
                }

                @Override
                public void onVideoQualityWarning(OTWrapper otWrapper, String remoteId) throws ListenerException {
                    Log.i(LOG_TAG, "The quality has degraded");
                }

                @Override
                public void onVideoQualityWarningLifted(OTWrapper otWrapper, String remoteId) throws ListenerException {
                    Log.i(LOG_TAG, "The quality has improved");
                }

               	//...
            });
```


