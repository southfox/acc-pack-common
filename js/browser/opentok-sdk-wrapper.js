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

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/* global OT */
/**
 * Dependencies
 */
var logging = require('./logging');
var sessionEvents = require('./events');
var State = require('./state');

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

var OpenTokSDK = function () {
  /**
   * Initialize the SDK Wrapper
   * @param {Object} credentials
   * @param {String} credentials.apiKey
   * @param {String} credentials.sessionId
   * @param {String} credentials.token
   */
  function OpenTokSDK(credentials) {
    _classCallCheck(this, OpenTokSDK);

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


  _createClass(OpenTokSDK, [{
    key: 'createEventListeners',
    value: function createEventListeners() {
      var _this = this;

      /**
       * Wrap session events and update state when streams are created
       * or destroyed
       */
      sessionEvents.forEach(function (eventName) {
        _this.session.on(eventName, function (event) {
          if (eventName === 'streamCreated') {
            _this.internalState.addStream(event.stream);
          }
          if (eventName === 'streamDestroyed') {
            _this.internalState.removeStream(event.stream);
          }
          _this.triggerEvent(eventName, event);
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

  }, {
    key: 'on',
    value: function on(event, callback) {
      if (typeof event === 'string') {
        this.session.on(event, callback);
      } else if ((typeof event === 'undefined' ? 'undefined' : _typeof(event)) === 'object') {
        this.session.on(event);
      }
    }
    /**
     * Remove a callback for a specific event. If no parameters are passed,
     * all callbacks for the session will be removed.
     * @param {String} event - The name of the event
     * @param {Function} callback
     */

  }, {
    key: 'off',
    value: function off(event, callback) {
      if (arguments.length === 0) {
        this.eventListeners = {};
        return;
      }
      var eventCallbacks = this.eventListeners[event];
      if (!eventCallbacks) {
        logging.message(event + ' is not a registered event.');
      } else {
        eventCallbacks.delete(callback);
      }
    }

    /**
     * Trigger an event and fire all registered callbacks
     * @param {String} event - The name of the event
     * @param {*} data - Data to be passed to callback functions
     */

  }, {
    key: 'triggerEvent',
    value: function triggerEvent(event, data) {
      var eventCallbacks = this.eventListeners[event];
      if (!eventCallbacks) {
        return;
      }
      eventCallbacks.forEach(function (callback) {
        return callback(data, event);
      });
    }

    /**
     * Register a callback for an event
     * @param {String} event - The event name
     * @param {Function} callback
     */

  }, {
    key: 'registerListener',
    value: function registerListener(event, callback) {
      this.eventListeners[event] = this.eventListeners[event] || new Set();
      this.eventListeners[event].add(callback);
    }

    /**
     * Publishing a stream
     * @param {Object} publisher - An OpenTok publisher object
     * @returns {Promise} <resolve: empty, reject: Error>
     */

  }, {
    key: 'publish',
    value: function publish(publisher) {
      var _this2 = this;

      return new Promise(function (resolve, reject) {
        _this2.session.publish(publisher, function (error) {
          error && reject(error);
          var type = publisher.stream.videoType;
          _this2.internalState.addPublisher(type, publisher);
          resolve();
        });
      });
    }
    /**
     * Stop publishing a stream
     * @param {Object} publisher - An OpenTok publisher object
     */

  }, {
    key: 'unpublish',
    value: function unpublish(publisher) {
      var type = publisher.stream.videoType;
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

  }, {
    key: 'subscribe',
    value: function subscribe(stream, container, options) {
      var _this3 = this;

      return new Promise(function (resolve, reject) {
        var subscriber = _this3.session.subscribe(stream, container, options, function (error) {
          if (error) {
            reject(error);
          } else {
            _this3.internalState.addSubscriber(subscriber);
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

  }, {
    key: 'unsubscribe',
    value: function unsubscribe(subscriber) {
      var _this4 = this;

      return new Promise(function (resolve) {
        _this4.session.unsubscribe(subscriber);
        _this4.internalState.removeSubscriber(subscriber);
        resolve();
      });
    }

    /**
     * Connect to the OpenTok session
     * @returns {Promise} <resolve: empty, reject: Error>
     */

  }, {
    key: 'connect',
    value: function connect() {
      var _this5 = this;

      return new Promise(function (resolve, reject) {
        var token = _this5.credentials.token;

        _this5.session.connect(token, function (error) {
          error ? reject(error) : resolve();
        });
      });
    }

    /**
     * Return the state of the OpenTok session
     * @returns {Object} Streams, publishers, subscribers, and stream map
     */

  }, {
    key: 'state',
    value: function state() {
      return this.internalState.all();
    }

    /**
     * Initialize an OpenTok publisher object
     * @param {String | Object} element - The target element
     * @param {Object} properties - The publisher properties
     * @returns {Promise} <resolve: Object, reject: Error>
     */

  }, {
    key: 'initPublisher',
    value: function initPublisher(element, properties) {
      return new Promise(function (resolve, reject) {
        var publisher = OT.initPublisher(element, properties, function (error) {
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

  }, {
    key: 'sessionMethods',
    value: function sessionMethods(method) {
      var _session;

      if (!this.session) {
        logging.message('Could not call ' + method + '. No OpenTok session is available');
      }

      for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      return (_session = this.session)[method].apply(_session, args);
    }
  }]);

  return OpenTokSDK;
}();

if (global === window) {
  window.OpenTokSDK = OpenTokSDK;
}

module.exports = OpenTokSDK;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./events":1,"./logging":2,"./state":4}],4:[function(require,module,exports){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var State = function () {
  function State() {
    _classCallCheck(this, State);

    // Map publisher ids to publisher objects
    this.publishers = {
      camera: {},
      screen: {}
    };

    // Map subscriber id to subscriber objects
    this.subscribers = {
      camera: {},
      screen: {}
    };

    // Map stream ids to stream objects
    this.streams = {};

    // Map stream ids to subscriber/publisher ids
    this.streamMap = {};

    // OpenTok session
    this.session = null;

    // OpenTok credentials
    this.credentials = null;
  }

  // Get the current OpenTok session


  _createClass(State, [{
    key: "getSession",
    value: function getSession() {
      return this.session;
    }

    // Set the current OpenTok session

  }, {
    key: "setSession",
    value: function setSession(session) {
      this.session = session;
    }

    // Get the current OpenTok credentials

  }, {
    key: "getCredentials",
    value: function getCredentials() {
      return this.credentials;
    }
    // Set the current OpenTok credentials

  }, {
    key: "setCredentials",
    value: function setCredentials(credentials) {
      this.credentials = credentials;
    }

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

  }, {
    key: "pubSubCount",
    value: function pubSubCount() {
      var publishers = this.publishers;
      var subscribers = this.subscribers;
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
    }

    /**
     * Returns the current publishers and subscribers, along with a count of each
     */

  }, {
    key: "currentPubSub",
    value: function currentPubSub() {
      var publishers = this.publishers;
      var subscribers = this.subscribers;

      return { publishers: publishers, subscribers: subscribers, meta: this.pubSubCount() };
    }
  }, {
    key: "addPublisher",
    value: function addPublisher(type, publisher) {
      this.streamMap[publisher.streamId] = publisher.id;
      this.publishers[type][publisher.id] = publisher;
    }
  }, {
    key: "removePublisher",
    value: function removePublisher(type, publisher) {
      var id = publisher.id || this.streamMap[publisher.streamId];
      delete this.publishers[type][id];
    }
  }, {
    key: "removeAllPublishers",
    value: function removeAllPublishers() {
      this.publishers.camera = {};
      this.publishers.screen = {};
    }
  }, {
    key: "addSubscriber",
    value: function addSubscriber(subscriber) {
      var type = subscriber.stream.videoType;
      var streamId = subscriber.stream.id;
      this.subscribers[type][subscriber.id] = subscriber;
      this.streamMap[streamId] = subscriber.id;
    }
  }, {
    key: "removeSubscriber",
    value: function removeSubscriber() {
      var subscriber = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var stream = subscriber.stream;

      var type = stream && stream.videoType;
      delete this.subscribers[type][subscriber.id];
    }
  }, {
    key: "addStream",
    value: function addStream(stream) {
      this.streams[stream.id] = stream;
    }
  }, {
    key: "removeStream",
    value: function removeStream(stream) {
      var type = stream.videoType;
      var subscriberId = this.streamMap[stream.id];
      delete this.streamMap[stream.id];
      delete this.streams[stream.id];
      this.removeSubscriber(this.subscribers[type][subscriberId]);
    }
  }, {
    key: "getStreams",
    value: function getStreams() {
      return this.streams;
    }
  }, {
    key: "all",
    value: function all() {
      var streams = this.streams;
      var streamMap = this.streamMap;

      return Object.assign({}, this.currentPubSub(), { streams: streams, streamMap: streamMap });
    }
  }]);

  return State;
}();

module.exports = State;

},{}]},{},[3]);
