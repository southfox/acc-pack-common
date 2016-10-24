(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var events = {
  session: ['archiveStarted', 'archiveStopped', 'connectionCreated', 'connectionDestroyed', 'sessionConnected', 'sessionDisconnected', 'sessionReconnected', 'sessionReconnecting', 'signal', 'streamCreated', 'streamDestroyed', 'streamPropertyChanged']
};

module.exports = events;

},{}],2:[function(require,module,exports){
"use strict";

// eslint-disable-next-line no-console
var message = function message(_message) {
  return console.log("otAccCore: " + _message);
};

var error = function error(message) {
  throw new Error("otAccCore: " + message);
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
var accPackEvents = require('./events');
var state = require('./state');

/** Eventing */

var registeredEvents = {};

/**
 * Register events that can be listened to be other components/modules
 * @param {array | string} events - A list of event names. A single event may
 * also be passed as a string.
 * @returns {function} See triggerEvent
 */
var registerEvents = function registerEvents(events) {
  var eventList = Array.isArray(events) ? events : [events];
  eventList.forEach(function (event) {
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
var off = function off(event, callback) {
  var eventCallbacks = registeredEvents[event];
  if (!eventCallbacks) {
    logging.message(event + ' is not a registered event.');
  } else {
    eventCallbacks.delete(callback);
  }
};

/**
 * Register a callback for a specific event
 * @param {String} event - The name of the event
 * @param {Function} callback
 */
var on = function on(event, callback) {
  var eventCallbacks = registeredEvents[event];
  if (!eventCallbacks) {
    logging.message(event + ' is not a registered event.');
  } else {
    eventCallbacks.add(callback);
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
    registerEvents(event);
    logging.message(event + ' has been registered as a new event.');
  } else {
    eventCallbacks.forEach(function (callback) {
      return callback(data, event);
    });
  }
};

/** Returns the current OpenTok session object */
var getSession = void 0;

/** Returns the current OpenTok session credentials */
var getCredentials = void 0;

var createEventListeners = function createEventListeners(session) {
  /**
   * Register OpenTok session events internally
   */
  registerEvents(accPackEvents.session);

  /**
   * Wrap session events and update state when streams are created
   * or destroyed
   */
  accPackEvents.session.forEach(function (eventName) {
    session.on(eventName, function (event) {
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

var createPublisher = function createPublisher(container, options) {
  return new Promise(function (resolve, reject) {
    var publisher = OT.initPublisher(container, options, function (error) {
      error ? reject(error) : resolve(publisher);
    });
  });
};

var publish = function publish(container, options) {
  return new Promise(function (resolve, reject) {
    createPublisher(container, options).then(function (publisher) {
      state.addPublisher(publisher.stream.videoType, publisher);
      getSession().publish(publisher, resolve);
    }).catch(function (error) {
      var errorMessage = error.code === 1010 ? 'Check your network connection' : error.message;
      reject(errorMessage);
    });
  });
};

var unpublish = function unpublish(publisher) {
  var type = publisher.stream.videoType;
  getSession().unpublish(publisher);
  state.removePublisher(type, publisher);
};

var subscribe = function subscribe(stream, container, options) {
  return new Promise(function (resolve, reject) {
    var subscriber = getSession().subscribe(stream, container, options, function (error) {
      if (error) {
        reject(error);
      } else {
        state.addSubscriber(subscriber);
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
    state.removeSubscriber(subscriber);
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
 * Initialize the accelerator pack
 * @param {Object} options
 * @param {Object} options.credentials
 * @param {Array} [options.packages]
 * @param {Object} [options.containers]
 */
var init = function init(credentials) {
  validateCredentials(credentials);
  var session = OT.initSession(credentials.apiKey, credentials.sessionId);
  createEventListeners(session);
  getSession = function getSession() {
    return session;
  };
  getCredentials = function getCredentials() {
    return credentials;
  };
};

var opentokSDK = {
  connect: getSession().connect,
  disconnect: getSession().disconnect,
  forceDisconnect: getSession().forceDisconnect,
  forceUnpublish: getSession().forceUnpublish,
  getCredentials: getCredentials,
  getPublisherForStream: getSession().getPublisherForStream,
  getSubscribersForStream: getSession().getSubscribersForStream,
  init: init,
  off: off,
  on: on,
  publish: publish,
  signal: getSession().signal,
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
