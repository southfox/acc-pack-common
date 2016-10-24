/* global OT */
/**
 * Dependencies
 */
const logging = require('./logging');
const accPackEvents = require('./events');
const state = require('./state');

/** Eventing */

const registeredEvents = {};

/**
 * Register events that can be listened to be other components/modules
 * @param {array | string} events - A list of event names. A single event may
 * also be passed as a string.
 * @returns {function} See triggerEvent
 */
const registerEvents = events => {
  const eventList = Array.isArray(events) ? events : [events];
  eventList.forEach(event => {
    if (!registeredEvents[event]) {
      registeredEvents[event] = new Set();
    }
  });
};

/**
 * Remove a callback for a specific event
 * @param {String} event - The name of the event
 * @param {Function} callback
 */
const off = (event, callback) => {
  const eventCallbacks = registeredEvents[event];
  if (!eventCallbacks) {
    logging.message(`${ event } is not a registered event.`);
  } else {
    eventCallbacks.delete(callback);
  }
};

/**
 * Register a callback for a specific event
 * @param {String} event - The name of the event
 * @param {Function} callback
 */
const on = (event, callback) => {
  const eventCallbacks = registeredEvents[event];
  if (!eventCallbacks) {
    logging.message(`${ event } is not a registered event.`);
  } else {
    eventCallbacks.add(callback);
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
    registerEvents(event);
    logging.message(`${ event } has been registered as a new event.`);
  } else {
    eventCallbacks.forEach(callback => callback(data, event));
  }
};

/** Returns the current OpenTok session object */
let getSession;

/** Returns the current OpenTok session credentials */
let getCredentials;

const createEventListeners = session => {
  /**
   * Register OpenTok session events internally
   */
  registerEvents(accPackEvents.session);

  /**
   * Wrap session events and update state when streams are created
   * or destroyed
   */
  accPackEvents.session.forEach(eventName => {
    session.on(eventName, event => {
      if (eventName === 'streamCreated') {
        state.addStream(event.stream);
      }
      if (eventName === 'streamDestroyed') {
        state.removeStream(event.stream);
      }
      triggerEvent(eventName, event);
    });
  });
};

const createPublisher = (container, options) => new Promise((resolve, reject) => {
  const publisher = OT.initPublisher(container, options, error => {
    error ? reject(error) : resolve(publisher);
  });
});

const publish = (container, options) => new Promise((resolve, reject) => {
  createPublisher(container, options).then(publisher => {
    state.addPublisher(publisher.stream.videoType, publisher);
    getSession().publish(publisher, resolve);
  }).catch(error => {
    const errorMessage = error.code === 1010 ? 'Check your network connection' : error.message;
    reject(errorMessage);
  });
});

const unpublish = publisher => {
  const type = publisher.stream.videoType;
  getSession().unpublish(publisher);
  state.removePublisher(type, publisher);
};

const subscribe = (stream, container, options) => new Promise((resolve, reject) => {
  const subscriber = getSession().subscribe(stream, container, options, error => {
    if (error) {
      reject(error);
    } else {
      state.addSubscriber(subscriber);
      resolve();
    }
  });
});

/**
 * Unsubscribe from a stream and update the state
 * @param {Object} subscriber - An OpenTok subscriber object
 * @returns {Promise} <resolve: empty>
 */
const unsubscribe = subscriber => new Promise(resolve => {
  getSession().unsubscribe(subscriber);
  state.removeSubscriber(subscriber);
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
  required.forEach(credential => {
    if (!credentials[credential]) {
      logging.error(`${ credential } is a required credential`);
    }
  });
};

/**
 * Initialize the accelerator pack
 * @param {Object} options
 * @param {Object} options.credentials
 * @param {Array} [options.packages]
 * @param {Object} [options.containers]
 */
const init = credentials => {
  validateCredentials(credentials);
  const session = OT.initSession(credentials.apiKey, credentials.sessionId);
  createEventListeners(session);
  getSession = () => session;
  getCredentials = () => credentials;
};

const opentokSDK = {
  connect: getSession().connect,
  disconnect: getSession().disconnect,
  forceDisconnect: getSession().forceDisconnect,
  forceUnpublish: getSession().forceUnpublish,
  getCredentials,
  getPublisherForStream: getSession().getPublisherForStream,
  getSubscribersForStream: getSession().getSubscribersForStream,
  init,
  off,
  on,
  publish,
  signal: getSession().signal,
  subscribe,
  unpublish,
  unsubscribe
};

if (global === window) {
  window.otSDK = opentokSDK;
}

module.exports = opentokSDK;