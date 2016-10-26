(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var events = ['archiveStarted', 'archiveStopped', 'connectionCreated', 'connectionDestroyed', 'sessionConnected', 'sessionDisconnected', 'sessionReconnected', 'sessionReconnecting', 'signal', 'streamCreated', 'streamDestroyed', 'streamPropertyChanged'];

module.exports = events;

},{}],2:[function(require,module,exports){
"use strict";

// eslint-disable-next-line no-console
var message = function message(messageText) {
  return console.log("otSDK: " + messageText);
};

var error = function error(errorMessage) {
  throw new Error("otSDK: " + errorMessage);
};

module.exports = {
  message: message,
  error: error
};

},{}],3:[function(require,module,exports){
(function (global){
'use strict';

/* global OT */
/**
 * Dependencies
 */
var logging = require('./logging');
var sessionEvents = require('./events');
var internalState = require('./state');

/** Eventing */

var registeredEvents = {};

/**
 * Register a callback for a specific event
 * @param {String} event - The name of the event
 * @param {Function} callback
 */
var on = function on(event, callback) {
  registeredEvents[event] = registeredEvents[event] || new Set();
  registeredEvents[event].add(callback);
};

/**
 * Remove a callback for a specific event
 * @param {String} event - The name of the event
 * @param {Function} callback
 */
var off = function off(event, callback) {
  var eventCallbacks = registeredEvents[event];
  if (!eventCallbacks) {
    logging.message(event + ' is not a registered event.');
  } else {
    eventCallbacks.delete(callback);
  }
};

/**
 * Trigger an event and fire all registered callbacks
 * @param {String} event - The name of the event
 * @param {*} data - Data to be passed to callback functions
 */
var triggerEvent = function triggerEvent(event, data) {
  var eventCallbacks = registeredEvents[event];
  if (!eventCallbacks) {
    logging.message(event + ' is not a registered event.');
  } else {
    eventCallbacks.forEach(function (callback) {
      return callback(data, event);
    });
  }
};

/** Returns the current OpenTok session object */
var getSession = internalState.getSession;

/** Returns the current OpenTok session credentials */
var getCredentials = internalState.getCredentials;

/**
 *
 */
var createEventListeners = function createEventListeners(session) {
  /**
   * Wrap session events and update state when streams are created
   * or destroyed
   */
  sessionEvents.forEach(function (eventName) {
    session.on(eventName, function (event) {
      if (eventName === 'streamCreated') {
        internalState.addStream(event.stream);
      }
      if (eventName === 'streamDestroyed') {
        internalState.removeStream(event.stream);
      }
      triggerEvent(eventName, event);
    });
  });
};

/**
 * Publishing a stream
 * @param {Object} publisher - An OpenTok publisher object
 * @returns {Promise} <resolve: empty, reject: Error>
 */
var publish = function publish(publisher) {
  return new Promise(function (resolve, reject) {
    getSession().publish(publisher, function (error) {
      error && reject(error);
      var type = publisher.stream.videoType;
      internalState.addPublisher(type, publisher);
      resolve();
    });
  });
};

/**
 * Stop publishing a stream
 * @param {Object} publisher - An OpenTok publisher object
 */
var unpublish = function unpublish(publisher) {
  var type = publisher.stream.videoType;
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
var subscribe = function subscribe(stream, container, options) {
  return new Promise(function (resolve, reject) {
    var subscriber = getSession().subscribe(stream, container, options, function (error) {
      if (error) {
        reject(error);
      } else {
        internalState.addSubscriber(subscriber);
        resolve();
      }
    });
  });
};

/**
 * Unsubscribe from a stream and update the state
 * @param {Object} subscriber - An OpenTok subscriber object
 * @returns {Promise} <resolve: empty>
 */
var unsubscribe = function unsubscribe(subscriber) {
  return new Promise(function (resolve) {
    getSession().unsubscribe(subscriber);
    internalState.removeSubscriber(subscriber);
    resolve();
  });
};

/**
 * Ensures that we have the required credentials
 * @param {Object} credentials
 * @param {String} credentials.apiKey
 * @param {String} credentials.sessionId
 * @param {String} credentials.token
 */
var validateCredentials = function validateCredentials() {
  var credentials = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

  var required = ['apiKey', 'sessionId', 'token'];
  required.forEach(function (credential) {
    if (!credentials[credential]) {
      logging.error(credential + ' is a required credential');
    }
  });
};

/**
 * Connect to the OpenTok session
 * @returns {Promise} <resolve: empty, reject: Error>
 */
var connect = function connect() {
  return new Promise(function (resolve, reject) {
    var _getCredentials = getCredentials();

    var token = _getCredentials.token;

    getSession().connect(token, function (error) {
      error ? reject(error) : resolve();
    });
  });
};

/**
 * Initialize the accelerator pack
 * @param {Object} options
 * @param {Object} options.credentials
 * @param {Array} [options.packages]
 * @param {Object} [options.containers]
 */
var init = function init(credentials) {
  validateCredentials(credentials);
  var session = OT.initSession(credentials.apiKey, credentials.sessionId);
  internalState.setSession(session);
  internalState.setCredentials(credentials);
  createEventListeners(session);
  getSession = function getSession() {
    return session;
  };
  getCredentials = function getCredentials() {
    return credentials;
  };
  return session;
};

/**
 * Return the state of the OpenTok session
 * @returns {Object} Streams, publishers, subscribers, and stream map
 */
var state = function state() {
  return internalState.all();
};

/**
 * Initialize an OpenTok publisher object
 * @param {String | Object} element - The target element
 * @param {Object} properties - The publisher properties
 * @returns {Promise} <resolve: Object, reject: Error>
 */
var initPublisher = function initPublisher(element, properties) {
  return new Promise(function (resolve, reject) {
    var publisher = OT.initPublisher(element, properties, function (error) {
      error ? reject(error) : resolve(publisher);
    });
  });
};

/**
 * Wrapper for syncronous session methods that ensures an OpenTok
 * session is available before invoking the method.
 * @param {String} method - The OpenTok session method
 * @params {Array} [args]
 */
var sessionMethods = function sessionMethods(method) {
  for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    args[_key - 1] = arguments[_key];
  }

  var session = getSession();
  if (!session) {
    logging.message('Could not call ' + method + '. No OpenTok session is available');
  }
  return session[method].apply(session, args);
};

var opentokSDK = {
  connect: connect,
  disconnect: function disconnect() {
    for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      args[_key2] = arguments[_key2];
    }

    return sessionMethods.apply(undefined, ['forceDisconnect'].concat(args));
  },
  forceDisconnect: function forceDisconnect() {
    for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
      args[_key3] = arguments[_key3];
    }

    return sessionMethods.apply(undefined, ['forceDisconnect'].concat(args));
  },
  forceUnpublish: function forceUnpublish() {
    for (var _len4 = arguments.length, args = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
      args[_key4] = arguments[_key4];
    }

    return sessionMethods.apply(undefined, ['forceUnpublish'].concat(args));
  },
  getCredentials: getCredentials,
  getPublisherForStream: function getPublisherForStream() {
    for (var _len5 = arguments.length, args = Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
      args[_key5] = arguments[_key5];
    }

    return sessionMethods.apply(undefined, ['getPublisherForStream'].concat(args));
  },
  getSubscribersForStream: function getSubscribersForStream() {
    for (var _len6 = arguments.length, args = Array(_len6), _key6 = 0; _key6 < _len6; _key6++) {
      args[_key6] = arguments[_key6];
    }

    return sessionMethods.apply(undefined, ['getSubscribersForStream'].concat(args));
  },
  init: init,
  initPublisher: initPublisher,
  off: off,
  on: on,
  publish: publish,
  signal: function signal() {
    for (var _len7 = arguments.length, args = Array(_len7), _key7 = 0; _key7 < _len7; _key7++) {
      args[_key7] = arguments[_key7];
    }

    return sessionMethods('signal', args);
  },
  state: state,
  subscribe: subscribe,
  unpublish: unpublish,
  unsubscribe: unsubscribe
};

if (global === window) {
  window.otSDK = opentokSDK;
}

module.exports = opentokSDK;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./events":1,"./logging":2,"./state":4}],4:[function(require,module,exports){
"use strict";

// Map publisher ids to publisher objects
var publishers = {
  camera: {},
  screen: {}
};

// Map subscriber id to subscriber objects
var subscribers = {
  camera: {},
  screen: {}
};

// Map stream ids to stream objects
var streams = {};

// Map stream ids to subscriber/publisher ids
var streamMap = {};

/**
 * Getters and setters for session and credentials
 */
var session = null;
var credentials = null;

// Get the current OpenTok session
var getSession = function getSession() {
  return session;
};

// Set the current OpenTok session
var setSession = function setSession(otSession) {
  session = otSession;
};

// Get the current OpenTok credentials
var getCredentials = function getCredentials() {
  return credentials;
};

// Set the current OpenTok credentials
var setCredentials = function setCredentials(otCredentials) {
  credentials = otCredentials;
};

/**
 * Returns the count of current publishers and subscribers by type
 * @retuns {Object}
 *    {
 *      publishers: {
 *        camera: 1,
 *        screen: 1,
 *        total: 2
 *      },
 *      subscribers: {
 *        camera: 3,
 *        screen: 1,
 *        total: 4
 *      }
 *   }
 */
var pubSubCount = function pubSubCount() {
  /* eslint-disable no-param-reassign */
  var pubs = Object.keys(publishers).reduce(function (acc, source) {
    acc[source] = Object.keys(publishers[source]).length;
    acc.total += acc[source];
    return acc;
  }, { camera: 0, screen: 0, total: 0 });

  var subs = Object.keys(subscribers).reduce(function (acc, source) {
    acc[source] = Object.keys(subscribers[source]).length;
    acc.total += acc[source];
    return acc;
  }, { camera: 0, screen: 0, total: 0 });
  /* eslint-enable no-param-reassign */
  return { publisher: pubs, subscriber: subs };
};

/**
 * Returns the current publishers and subscribers, along with a count of each
 */
var currentPubSub = function currentPubSub() {
  return { publishers: publishers, subscribers: subscribers, meta: pubSubCount() };
};

var addPublisher = function addPublisher(type, publisher) {
  streamMap[publisher.streamId] = publisher.id;
  publishers[type][publisher.id] = publisher;
};

var removePublisher = function removePublisher(type, publisher) {
  var id = publisher.id || streamMap[publisher.streamId];
  delete publishers[type][id];
};

var removeAllPublishers = function removeAllPublishers() {
  publishers.camera = {};
  publishers.screen = {};
};

var addSubscriber = function addSubscriber(subscriber) {
  var type = subscriber.stream.videoType;
  var streamId = subscriber.stream.id;
  subscribers[type][subscriber.id] = subscriber;
  streamMap[streamId] = subscriber.id;
};

var removeSubscriber = function removeSubscriber() {
  var subscriber = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var stream = subscriber.stream;

  var type = stream && stream.videoType;
  delete subscribers[type][subscriber.id];
};

var addStream = function addStream(stream) {
  streams[stream.id] = stream;
};

var removeStream = function removeStream(stream) {
  var type = stream.videoType;
  var subscriberId = streamMap[stream.id];
  delete streamMap[stream.id];
  delete streams[stream.id];
  removeSubscriber(subscribers[type][subscriberId]);
};

var getStreams = function getStreams() {
  return streams;
};

var all = function all() {
  return Object.assign({}, currentPubSub(), { streams: streams, streamMap: streamMap });
};

module.exports = {
  setSession: setSession,
  getSession: getSession,
  setCredentials: setCredentials,
  getCredentials: getCredentials,
  addStream: addStream,
  removeStream: removeStream,
  getStreams: getStreams,
  addPublisher: addPublisher,
  removePublisher: removePublisher,
  removeAllPublishers: removeAllPublishers,
  addSubscriber: addSubscriber,
  currentPubSub: currentPubSub,
  all: all
};

},{}]},{},[3]);
