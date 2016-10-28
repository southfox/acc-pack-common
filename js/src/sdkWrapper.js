/* global OT */

/**
 * Dependencies
 */
const logging = require('./logging');
const State = require('./state');

/**
 * Internal variables
 */

/** Map instance of OpenTokSDK to state */
const stateMap = new WeakMap();

/**
 * Internal methods
 */

/**
 * Ensures that we have the required credentials
 * @param {Object} credentials
 * @param {String} credentials.apiKey
 * @param {String} credentials.sessionId
 * @param {String} credentials.token
 * @returns {Object}
 */
const validateCredentials = (credentials = {}) => {
  const required = ['apiKey', 'sessionId', 'token'];
  required.forEach((credential) => {
    if (!credentials[credential]) {
      logging.error(`${credential} is a required credential`);
    }
  });
  return credentials;
};

/**
 * Initialize an OpenTok publisher object
 * @param {String | Object} element - The target element
 * @param {Object} properties - The publisher properties
 * @returns {Promise} <resolve: Object, reject: Error>
 */
const initPublisher = (element, properties) =>
  new Promise((resolve, reject) => {
    const publisher = OT.initPublisher(element, properties, (error) => {
      error ? reject(error) : resolve(publisher);
    });
  });

class OpenTokSDK {
  /**
   * Initialize the SDK Wrapper
   * @param {Object} credentials
   * @param {String} credentials.apiKey
   * @param {String} credentials.sessionId
   * @param {String} credentials.token
   * @param {Object} [eventListeners]
   */
  constructor(credentials, eventListeners) {
    this.credentials = validateCredentials(credentials);
    stateMap.set(this, new State());
    this.session = OT.initSession(credentials.apiKey, credentials.sessionId);
    this.setInternalListeners();
    eventListeners && this.on(eventListeners);
  }

  /**
   * Wrap OpenTok session events
   */
  setInternalListeners() {
    /**
     * Wrap session events and update state when streams are created
     * or destroyed
     */
    const state = stateMap.get(this);
    this.session.on('streamCreated', ({ stream }) => state.addStream(stream));
    this.session.on('streamDestroyed', ({ stream }) => state.removeStream(stream));
  }

  /**
   * Register a callback for a specific event or pass an object
   * with event => callback key/values to register callbacks for
   * multiple events.
   * @param {String | Object} [events] - The name of the events
   * @param {Function} [callback]
   * @param {Function} [context]
   * https://tokbox.com/developer/sdks/js/reference/Session.html#on
   */
  on(...args) {
    this.session.on(...args);
  }

  /**
   * Remove a callback for a specific event. If no parameters are passed,
   * all callbacks for the session will be removed.
   * @param {String} [events] - The name of the events
   * @param {Function} [callback]
   * https://tokbox.com/developer/sdks/js/reference/Session.html#off
   */
  off(...args) {
    this.session.off(...args);
  }

  /**
   * Create and publish a stream
   * @param {String | Object} element - The target element
   * @param {Object} properties - The publisher properties
   * @param {Boolean} preview - Create a publisher with publishing to the session
   * @returns {Promise} <resolve: Object, reject: Error>
   */
  publish(element, properties, preview = false) {
    return new Promise((resolve, reject) => {
      initPublisher(element, properties) // eslint-disable-next-line no-confusing-arrow
        .then((publisher) => {
          if (preview) {
            resolve(publisher);
          } else {
            this.publishPreview(publisher)
            .then(resolve)
            .catch(reject);
          }
        }).catch(reject);
    });
  }

  /**
   * Publish a 'preview' stream to the session
   * @param {Object} publisher - An OpenTok publisher object
   * @returns {Promise} <resolve: empty, reject: Error>
   */
  publishPreview(publisher) {
    return new Promise((resolve, reject) => {
      const state = stateMap.get(this);
      this.session.publish(publisher, (error) => {
        error && reject(error);
        const type = publisher.stream.videoType;
        state.addPublisher(type, publisher);
        resolve(publisher);
      });
    });
  }
    /**
     * Stop publishing a stream
     * @param {Object} publisher - An OpenTok publisher object
     */
  unpublish(publisher) {
    const type = publisher.stream.videoType;
    const state = stateMap.get(this);
    this.session.unpublish(publisher);
    state.removePublisher(type, publisher);
  }

  /**
   * Subscribe to stream
   * @param {Object} stream
   * @param {String | Object} container - The id of the container or a reference to the element
   * @param {Object} [options]
   * @returns {Promise} <resolve: empty, reject: Error>
   */
  subscribe(stream, container, options) {
    const state = stateMap.get(this);
    return new Promise((resolve, reject) => {
      const subscriber = this.session.subscribe(stream, container, options, (error) => {
        if (error) {
          reject(error);
        } else {
          state.addSubscriber(subscriber);
          resolve();
        }
      });
    });
  }

  /**
   * Unsubscribe from a stream and update the state
   * @param {Object} subscriber - An OpenTok subscriber object
   * @returns {Promise} <resolve: empty>
   */
  unsubscribe(subscriber) {
    const state = stateMap.get(this);
    return new Promise((resolve) => {
      this.session.unsubscribe(subscriber);
      state.removeSubscriber(subscriber);
      resolve();
    });
  }

  /**
   * Connect to the OpenTok session
   * @returns {Promise} <resolve: empty, reject: Error>
   */
  connect() {
    return new Promise((resolve, reject) => {
      const { token } = this.credentials;
      this.session.connect(token, (error) => {
        error ? reject(error) : resolve();
      });
    });
  }


  /**
   * Force a remote connection to leave the session
   * @param {Object} connection
   * @returns {Promise} <resolve: empty, reject: Error>
   */
  forceDisconnect(connection) {
    return new Promise((resolve, reject) => {
      this.session.forceDisconnect(connection, (error) => {
        error ? reject(error) : resolve();
      });
    });
  }


  /**
   * Force the publisher of a stream to stop publishing the stream
   * @param {Object} stream
   * @returns {Promise} <resolve: empty, reject: Error>
   */
  forceUnpublish(stream) {
    return new Promise((resolve, reject) => {
      this.session.forceUnpublish(stream, (error) => {
        error ? reject(error) : resolve();
      });
    });
  }


  /**
   * Send a signal using the OpenTok signaling apiKey
   * @param {Object} signal
   * @returns {Promise} <resolve: empty, reject: Error>
   */
  signal(signal) {
    return new Promise((resolve, reject) => {
      this.session.signal(signal, (error) => {
        error ? reject(error) : resolve();
      });
    });
  }

  /**
   * Disconnect from the OpenTok session
   */
  disconnect() {
    this.session.disconnect();
    stateMap.get(this).reset();
  }

  /**
   * Return the state of the OpenTok session
   * @returns {Object} Streams, publishers, subscribers, and stream map
   */
  state() {
    return stateMap.get(this).all();
  }
}

if (global === window) {
  window.OpenTokSDK = OpenTokSDK;
}

module.exports = OpenTokSDK;
