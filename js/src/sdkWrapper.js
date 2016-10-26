/* global OT */
/**
 * Dependencies
 */
const logging = require('./logging');
const sessionEvents = require('./events');
const internalState = require('./state');

/** Eventing */

const registeredEvents = {};

/**
 * Register a callback for a specific event
 * @param {String} event - The name of the event
 * @param {Function} callback
 */
const on = (event, callback) => {
  registeredEvents[event] = registeredEvents[event] || new Set();
  registeredEvents[event].add(callback);
};

/**
 * Remove a callback for a specific event
 * @param {String} event - The name of the event
 * @param {Function} callback
 */
const off = (event, callback) => {
  const eventCallbacks = registeredEvents[event];
  if (!eventCallbacks) {
    logging.message(`${event} is not a registered event.`);
  } else {
    eventCallbacks.delete(callback);
  }
};

/**
 * Trigger an event and fire all registered callbacks
 * @param {String} event - The name of the event
 * @param {*} data - Data to be passed to callback functions
 */
const triggerEvent = (event, data) => {
  const eventCallbacks = registeredEvents[event];
  if (!eventCallbacks) {
    logging.message(`${event} is not a registered event.`);
  } else {
    eventCallbacks.forEach(callback => callback(data, event));
  }
};

/** Returns the current OpenTok session object */
let getSession = internalState.getSession;

/** Returns the current OpenTok session credentials */
let getCredentials = internalState.getCredentials;

/**
 *
 */
const createEventListeners = (session) => {
  /**
   * Wrap session events and update state when streams are created
   * or destroyed
   */
  sessionEvents.forEach((eventName) => {
    session.on(eventName, (event) => {
      if (eventName === 'streamCreated') { internalState.addStream(event.stream); }
      if (eventName === 'streamDestroyed') { internalState.removeStream(event.stream); }
      triggerEvent(eventName, event);
    });
  });
};


/**
 * Publishing a stream
 * @param {Object} publisher - An OpenTok publisher object
 * @returns {Promise} <resolve: empty, reject: Error>
 */
const publish = publisher =>
  new Promise((resolve, reject) => {
    getSession().publish(publisher, (error) => {
      error && reject(error);
      const type = publisher.stream.videoType;
      internalState.addPublisher(type, publisher);
      resolve();
    });
  });


/**
 * Stop publishing a stream
 * @param {Object} publisher - An OpenTok publisher object
 */
const unpublish = (publisher) => {
  const type = publisher.stream.videoType;
  getSession().unpublish(publisher);
  internalState.removePublisher(type, publisher);
};


/**
 * Subscribe to stream
 * @param {Object} stream
 * @param {String | Object} container - The id of the container or a reference to the element
 * @param {Object} [options]
 * @returns {Promise} <resolve: empty, reject: Error>
 */
const subscribe = (stream, container, options) =>
  new Promise((resolve, reject) => {
    const subscriber = getSession().subscribe(stream, container, options, (error) => {
      if (error) {
        reject(error);
      } else {
        internalState.addSubscriber(subscriber);
        resolve();
      }
    });
  });

/**
 * Unsubscribe from a stream and update the state
 * @param {Object} subscriber - An OpenTok subscriber object
 * @returns {Promise} <resolve: empty>
 */
const unsubscribe = subscriber =>
  new Promise((resolve) => {
    getSession().unsubscribe(subscriber);
    internalState.removeSubscriber(subscriber);
    resolve();
  });

/**
 * Ensures that we have the required credentials
 * @param {Object} credentials
 * @param {String} credentials.apiKey
 * @param {String} credentials.sessionId
 * @param {String} credentials.token
 */
const validateCredentials = (credentials = []) => {
  const required = ['apiKey', 'sessionId', 'token'];
  required.forEach((credential) => {
    if (!credentials[credential]) {
      logging.error(`${credential} is a required credential`);
    }
  });
};

/**
 * Connect to the OpenTok session
 * @returns {Promise} <resolve: empty, reject: Error>
 */
const connect = () =>
  new Promise((resolve, reject) => {
    const { token } = getCredentials();
    getSession().connect(token, (error) => {
      error ? reject(error) : resolve();
    });
  });

/**
 * Initialize the accelerator pack
 * @param {Object} options
 * @param {Object} options.credentials
 * @param {Array} [options.packages]
 * @param {Object} [options.containers]
 */
const init = (credentials) => {
  validateCredentials(credentials);
  const session = OT.initSession(credentials.apiKey, credentials.sessionId);
  internalState.setSession(session);
  internalState.setCredentials(credentials);
  createEventListeners(session);
  getSession = () => session;
  getCredentials = () => credentials;
  return session;
};

/**
 * Return the state of the OpenTok session
 * @returns {Object} Streams, publishers, subscribers, and stream map
 */
const state = () => internalState.all();

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

/**
 * Wrapper for syncronous session methods that ensures an OpenTok
 * session is available before invoking the method.
 * @param {String} method - The OpenTok session method
 * @params {Array} [args]
 */
const sessionMethods = (method, ...args) => {
  const session = getSession();
  if (!session) {
    logging.message(`Could not call ${method}. No OpenTok session is available`);
  }
  return session[method](...args);
};

const opentokSDK = {
  connect,
  disconnect: (...args) => sessionMethods('forceDisconnect', ...args),
  forceDisconnect: (...args) => sessionMethods('forceDisconnect', ...args),
  forceUnpublish: (...args) => sessionMethods('forceUnpublish', ...args),
  getCredentials,
  getPublisherForStream: (...args) => sessionMethods('getPublisherForStream', ...args),
  getSubscribersForStream: (...args) => sessionMethods('getSubscribersForStream', ...args),
  init,
  initPublisher,
  off,
  on,
  publish,
  signal: (...args) => sessionMethods('signal', args),
  state,
  subscribe,
  unpublish,
  unsubscribe,
};

if (global === window) {
  window.otSDK = opentokSDK;
}

module.exports = opentokSDK;
