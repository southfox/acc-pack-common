/* global OT */
/**
 * Dependencies
 */
const logging = require('./logging');
const sessionEvents = require('./events');
const State = require('./state');

/**
 * Ensures that we have the required credentials
 * @param {Object} credentials
 * @param {String} credentials.apiKey
 * @param {String} credentials.sessionId
 * @param {String} credentials.token
 */
const validateCredentials = (credentials = []) => {
  const required = ['apiKey', 'sessionId', 'token'];
  required.forEach(credential => {
    if (!credentials[credential]) {
      logging.error(`${ credential } is a required credential`);
    }
  });
};

class OpenTokSDK {
  /**
   * Initialize the SDK Wrapper
   * @param {Object} credentials
   * @param {String} credentials.apiKey
   * @param {String} credentials.sessionId
   * @param {String} credentials.token
   */
  constructor(credentials) {
    validateCredentials(credentials);
    this.credentials = credentials;
    this.eventListeners = {};
    this.internalState = new State();
    this.session = OT.initSession(credentials.apiKey, credentials.sessionId);
    this.createEventListeners();
  }

  /**
   * Wrap OpenTok session events
   */
  createEventListeners() {
    /**
     * Wrap session events and update state when streams are created
     * or destroyed
     */
    sessionEvents.forEach(eventName => {
      this.session.on(eventName, event => {
        if (eventName === 'streamCreated') {
          this.internalState.addStream(event.stream);
        }
        if (eventName === 'streamDestroyed') {
          this.internalState.removeStream(event.stream);
        }
        this.triggerEvent(eventName, event);
      });
    });
  }

  /**
   * Register a callback for a specific event or pass an object
   * with event => callback key/values to register callbacks for
   * multiple events.
   * @param {String | Object} event - The name of the event
   * @param {Function} callback
   */
  on(event, callback) {
    if (typeof event === 'string') {
      this.session.on(event, callback);
    } else if (typeof event === 'object') {
      this.session.on(event);
    }
  }
  /**
   * Remove a callback for a specific event. If no parameters are passed,
   * all callbacks for the session will be removed.
   * @param {String} event - The name of the event
   * @param {Function} callback
   */
  off(event, callback) {
    if (arguments.length === 0) {
      this.eventListeners = {};
      return;
    }
    const eventCallbacks = this.eventListeners[event];
    if (!eventCallbacks) {
      logging.message(`${ event } is not a registered event.`);
    } else {
      eventCallbacks.delete(callback);
    }
  }

  /**
   * Trigger an event and fire all registered callbacks
   * @param {String} event - The name of the event
   * @param {*} data - Data to be passed to callback functions
   */
  triggerEvent(event, data) {
    const eventCallbacks = this.eventListeners[event];
    if (!eventCallbacks) {
      return;
    }
    eventCallbacks.forEach(callback => callback(data, event));
  }

  /**
   * Register a callback for an event
   * @param {String} event - The event name
   * @param {Function} callback
   */
  registerListener(event, callback) {
    this.eventListeners[event] = this.eventListeners[event] || new Set();
    this.eventListeners[event].add(callback);
  }

  /**
   * Publishing a stream
   * @param {Object} publisher - An OpenTok publisher object
   * @returns {Promise} <resolve: empty, reject: Error>
   */
  publish(publisher) {
    return new Promise((resolve, reject) => {
      this.session.publish(publisher, error => {
        error && reject(error);
        const type = publisher.stream.videoType;
        this.internalState.addPublisher(type, publisher);
        resolve();
      });
    });
  }
  /**
   * Stop publishing a stream
   * @param {Object} publisher - An OpenTok publisher object
   */
  unpublish(publisher) {
    const type = publisher.stream.videoType;
    this.session.unpublish(publisher);
    this.internalState.removePublisher(type, publisher);
  }

  /**
   * Subscribe to stream
   * @param {Object} stream
   * @param {String | Object} container - The id of the container or a reference to the element
   * @param {Object} [options]
   * @returns {Promise} <resolve: empty, reject: Error>
   */
  subscribe(stream, container, options) {
    return new Promise((resolve, reject) => {
      const subscriber = this.session.subscribe(stream, container, options, error => {
        if (error) {
          reject(error);
        } else {
          this.internalState.addSubscriber(subscriber);
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
    return new Promise(resolve => {
      this.session.unsubscribe(subscriber);
      this.internalState.removeSubscriber(subscriber);
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
      this.session.connect(token, error => {
        error ? reject(error) : resolve();
      });
    });
  }

  /**
   * Return the state of the OpenTok session
   * @returns {Object} Streams, publishers, subscribers, and stream map
   */
  state() {
    return this.internalState.all();
  }

  /**
   * Initialize an OpenTok publisher object
   * @param {String | Object} element - The target element
   * @param {Object} properties - The publisher properties
   * @returns {Promise} <resolve: Object, reject: Error>
   */
  initPublisher(element, properties) {
    return new Promise((resolve, reject) => {
      const publisher = OT.initPublisher(element, properties, error => {
        error ? reject(error) : resolve(publisher);
      });
    });
  }

  /**
   * Wrapper for syncronous session methods that ensures an OpenTok
   * session is available before invoking the method.
   * @param {String} method - The OpenTok session method
   * @params {Array} [args]
   */
  sessionMethods(method, ...args) {
    if (!this.session) {
      logging.message(`Could not call ${ method }. No OpenTok session is available`);
    }
    return this.session[method](...args);
  }
}

if (global === window) {
  window.OpenTokSDK = OpenTokSDK;
}

module.exports = OpenTokSDK;