/* eslint-disable */
/* Let CRA handle linting for sample app */
import React, { Component } from 'react';
import Spinner from 'react-spinner';
import classNames from 'classnames';
import logo from './logo.svg';
import otSDK from './ot-sdk-wrapper/sdkWrapper.js';
import config from './config.json';
import './App.css';
import 'opentok-solutions-css';

const credentials = {
  apiKey: config.apiKey,
  sessionId: config.sessionId,
  token: config.token,
};

const callProperties = {
  insertMode: 'append',
  width: '100%',
  height: '100%',
  showControls: false,
  style: {
    buttonDisplayMode: 'off'
  }
};

/**
 * Build classes for container elements based on state
 * @param {Object} state
 */
const containerClasses = (state) => {
  const { active, meta, localAudioEnabled, localVideoEnabled } = state;
  const sharingScreen = meta ? !!meta.publisher.screen : false;
  const viewingSharedScreen = meta ? meta.subscriber.screen : false;
  const activeCameraSubscribers = meta ? meta.subscriber.camera : 0;
  return {
    controlClass: classNames('App-control-container', { 'hidden': !active }),
    localAudioClass: classNames('ots-video-control circle audio', { 'muted': !localAudioEnabled }),
    localVideoClass: classNames('ots-video-control circle video', { 'muted': !localVideoEnabled }),
    cameraPublisherClass: classNames('video-container', { 'hidden': !active, 'small': !!activeCameraSubscribers || sharingScreen, 'left': sharingScreen || viewingSharedScreen }),
    screenPublisherClass: classNames('video-container', { 'hidden': !sharingScreen }),
    cameraSubscriberClass: classNames('video-container', { 'hidden': !activeCameraSubscribers },
      `active-${activeCameraSubscribers}`, { 'small': viewingSharedScreen || sharingScreen }
    ),
    screenSubscriberClass: classNames('video-container', { 'hidden': !viewingSharedScreen }),
  };
};

const connectingMask = () =>
  <div className="App-mask">
    <Spinner />
    <div className="message with-spinner">Connecting</div>
  </div>;

const startCallMask = start =>
  <div className="App-mask">
    <div className="message button clickable" onClick={start}>Click to Start Call</div>
  </div>;

class App extends Component {

  constructor(props) {
    super(props);
    this.state = {
      connected: false,
      active: false,
      publishers: null,
      subscribers: null,
      meta: null,
      localAudioEnabled: true,
      localVideoEnabled: true,
    };
    this.startCall = this.startCall.bind(this);
    this.toggleLocalAudio = this.toggleLocalAudio.bind(this);
    this.toggleLocalVideo = this.toggleLocalVideo.bind(this);
  }

  componentDidMount() {
    otSDK.init(credentials);
    otSDK.connect().then(() => this.setState({ connected: true }));
    const events = [
      'streamCreated',
      'streamDestroyed',
      'subscribeToCamera',
      'unsubscribeFromCamera',
      'subscribeToScreen',
      'unsubscribeFromScreen',
      'startScreenShare',
      'endScreenShare',
    ];

    //TODO subscribe to existing streams

    otSDK.on('streamCreated', ({ stream }) => {
      const type = stream.videoType;
      otSDK.subscribe(stream, `${type}SubscriberContainer`, callProperties);
      this.setState(otSDK.state());
    });

    otSDK.on('streamDestroyed', ({ stream }) => {
      this.setState(otSDK.state());
    });

  }

  startCall() {
    this.setState({ active: true });
    otSDK.initPublisher('cameraPublisherContainer', callProperties)
      .then(publisher => {
        otSDK.publish(publisher);
        this.setState(otSDK.state())
      }).catch(error => console.log(error));
  }

  toggleLocalAudio() {
    otSDK.toggleLocalAudio(!this.state.localAudioEnabled);
    this.setState({ localAudioEnabled: !this.state.localAudioEnabled });
  }

  toggleLocalVideo() {
    otSDK.toggleLocalVideo(!this.state.localVideoEnabled);
    this.setState({ localVideoEnabled: !this.state.localVideoEnabled });
  }

  render() {
    const { connected, active } = this.state;
    const {
      localAudioClass,
      localVideoClass,
      controlClass,
      cameraPublisherClass,
      screenPublisherClass,
      cameraSubscriberClass,
      screenSubscriberClass,
    } = containerClasses(this.state);

    return (
      <div className="App">
        <div className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1>OpenTok Accelerator Core</h1>
        </div>
        <div className="App-main">
          <div id="controls" className={controlClass}>
            <div className={localAudioClass} onClick={this.toggleLocalAudio}></div>
            <div className={localVideoClass} onClick={this.toggleLocalVideo}></div>
          </div>
          <div className="App-video-container">
            { !connected && connectingMask() }
            { connected && !active && startCallMask(this.startCall)}
            <div id="cameraPublisherContainer" className={cameraPublisherClass}></div>
            <div id="screenPublisherContainer" className={screenPublisherClass}></div>
            <div id="cameraSubscriberContainer" className={cameraSubscriberClass}></div>
            <div id="screenSubscriberContainer" className={screenSubscriberClass}></div>
          </div>
          <div id="chat" className="App-chat-container"></div>
        </div>
      </div>
    );
  }
}

export default App;
