(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{}],2:[function(require,module,exports){
(function (global){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/* global OT */

/**
 * Dependencies
 */
var logging = require('./logging');
var State = require('./state');

/**
 * Internal variables
 */

/** Map instance of OpenTokSDK to state */
var stateMap = new WeakMap();

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
var validateCredentials = function validateCredentials() {
  var credentials = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  var required = ['apiKey', 'sessionId', 'token'];
  required.forEach(function (credential) {
    if (!credentials[credential]) {
      logging.error(credential + ' is a required credential');
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
var initPublisher = function initPublisher(element, properties) {
  return new Promise(function (resolve, reject) {
    var publisher = OT.initPublisher(element, properties, function (error) {
      error ? reject(error) : resolve(publisher);
    });
  });
};

var OpenTokSDK = function () {
  /**
   * Initialize the SDK Wrapper
   * @param {Object} credentials
   * @param {String} credentials.apiKey
   * @param {String} credentials.sessionId
   * @param {String} credentials.token
   * @param {Object} [eventListeners]
   */
  function OpenTokSDK(credentials, eventListeners) {
    _classCallCheck(this, OpenTokSDK);

    this.credentials = validateCredentials(credentials);
    stateMap.set(this, new State());
    this.session = OT.initSession(credentials.apiKey, credentials.sessionId);
    this.setInternalListeners();
    eventListeners && this.on(eventListeners);
  }

  /**
   * Wrap OpenTok session events
   */


  _createClass(OpenTokSDK, [{
    key: 'setInternalListeners',
    value: function setInternalListeners() {
      /**
       * Wrap session events and update state when streams are created
       * or destroyed
       */
      var state = stateMap.get(this);
      this.session.on('streamCreated', function (_ref) {
        var stream = _ref.stream;
        return state.addStream(stream);
      });
      this.session.on('streamDestroyed', function (_ref2) {
        var stream = _ref2.stream;
        return state.removeStream(stream);
      });
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

  }, {
    key: 'on',
    value: function on() {
      var _session;

      (_session = this.session).on.apply(_session, arguments);
    }

    /**
     * Remove a callback for a specific event. If no parameters are passed,
     * all callbacks for the session will be removed.
     * @param {String} [events] - The name of the events
     * @param {Function} [callback]
     * https://tokbox.com/developer/sdks/js/reference/Session.html#off
     */

  }, {
    key: 'off',
    value: function off() {
      var _session2;

      (_session2 = this.session).off.apply(_session2, arguments);
    }

    /**
     * Create and publish a stream
     * @param {String | Object} element - The target element
     * @param {Object} properties - The publisher properties
     * @param {Boolean} preview - Create a publisher with publishing to the session
     * @returns {Promise} <resolve: Object, reject: Error>
     */

  }, {
    key: 'publish',
    value: function publish(element, properties) {
      var _this = this;

      var preview = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

      return new Promise(function (resolve, reject) {
        initPublisher(element, properties) // eslint-disable-next-line no-confusing-arrow
        .then(function (publisher) {
          if (preview) {
            resolve(publisher);
          } else {
            _this.publishPreview(publisher).then(resolve).catch(reject);
          }
        }).catch(reject);
      });
    }

    /**
     * Publish a 'preview' stream to the session
     * @param {Object} publisher - An OpenTok publisher object
     * @returns {Promise} <resolve: empty, reject: Error>
     */

  }, {
    key: 'publishPreview',
    value: function publishPreview(publisher) {
      var _this2 = this;

      return new Promise(function (resolve, reject) {
        var state = stateMap.get(_this2);
        _this2.session.publish(publisher, function (error) {
          error && reject(error);
          var type = publisher.stream.videoType;
          state.addPublisher(type, publisher);
          resolve(publisher);
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
      var state = stateMap.get(this);
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

  }, {
    key: 'subscribe',
    value: function subscribe(stream, container, options) {
      var _this3 = this;

      var state = stateMap.get(this);
      return new Promise(function (resolve, reject) {
        var subscriber = _this3.session.subscribe(stream, container, options, function (error) {
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

  }, {
    key: 'unsubscribe',
    value: function unsubscribe(subscriber) {
      var _this4 = this;

      var state = stateMap.get(this);
      return new Promise(function (resolve) {
        _this4.session.unsubscribe(subscriber);
        state.removeSubscriber(subscriber);
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
     * Force a remote connection to leave the session
     * @param {Object} connection
     * @returns {Promise} <resolve: empty, reject: Error>
     */

  }, {
    key: 'forceDisconnect',
    value: function forceDisconnect(connection) {
      var _this6 = this;

      return new Promise(function (resolve, reject) {
        _this6.session.forceDisconnect(connection, function (error) {
          error ? reject(error) : resolve();
        });
      });
    }

    /**
     * Force the publisher of a stream to stop publishing the stream
     * @param {Object} stream
     * @returns {Promise} <resolve: empty, reject: Error>
     */

  }, {
    key: 'forceUnpublish',
    value: function forceUnpublish(stream) {
      var _this7 = this;

      return new Promise(function (resolve, reject) {
        _this7.session.forceUnpublish(stream, function (error) {
          error ? reject(error) : resolve();
        });
      });
    }

    /**
     * Send a signal using the OpenTok signaling apiKey
     * @param {Object} signal
     * @returns {Promise} <resolve: empty, reject: Error>
     */

  }, {
    key: 'signal',
    value: function signal(_signal) {
      var _this8 = this;

      return new Promise(function (resolve, reject) {
        _this8.session.signal(_signal, function (error) {
          error ? reject(error) : resolve();
        });
      });
    }

    /**
     * Disconnect from the OpenTok session
     */

  }, {
    key: 'disconnect',
    value: function disconnect() {
      this.session.disconnect();
      stateMap.get(this).reset();
    }

    /**
     * Return the state of the OpenTok session
     * @returns {Object} Streams, publishers, subscribers, and stream map
     */

  }, {
    key: 'state',
    value: function state() {
      return stateMap.get(this).all();
    }
  }]);

  return OpenTokSDK;
}();

if (global === window) {
  window.OpenTokSDK = OpenTokSDK;
}

module.exports = OpenTokSDK;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./logging":1,"./state":3}],3:[function(require,module,exports){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var State = function () {
  function State() {
    _classCallCheck(this, State);

    this.publishers = {
      camera: {},
      screen: {}
    };

    this.subscribers = {
      camera: {},
      screen: {}
    };

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

    /** Reset streams, publishers, and subscribers */

  }, {
    key: "reset",
    value: function reset() {
      this.streams = {};
      this.streamMap = {};
      this.publishers = { camera: {}, screen: {} };
      this.subscribers = { camera: {}, screen: {} };
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

},{}]},{},[2]);
