/*jshint node: true */
'use strict';

var
  MSG = require('./messages'),
  tools = require('./tools'),
  Realm = require('./realm'),
  util  = require('util'),
  EventEmitter = require('events').EventEmitter;

var trace = function () {};

if ('WAMPRT_TRACE' in global && WAMPRT_TRACE && 'console' in global) {  // jshint ignore:line
  trace = function () {
    console.log.apply(console, arguments);
  };
}

util.inherits(Router, EventEmitter);

function Router() {
  // Realm management
  var _realms = {};
  var _sessions = {};
  EventEmitter.call(this);

  this.getRealm = function(realmName, callback) {
    if (_realms.hasOwnProperty(realmName)) {
      callback(_realms[realmName]);
    } else {
      var realm = new Realm(this);
      _realms[realmName] = realm;
      this.emit(MSG.REALM_CREATED, realm, realmName);
      callback(realm);
    }
  };

  this.getNewSessionId = function () {
    return tools.randomId();
  };

  this.registerSession = function(session) {
    _sessions[session.sessionId] = session;
  };

  this.getSession = function(sessionId) {
    return _sessions[sessionId];
  };
  this.removeSession = function (session) {
    delete _sessions[session.sessionId];
  };

  this.on('session.Tx', function (session, data) {
    trace("["+session.sessionId+"] TX > "+data);
  });

  this.on('session.Rx', function (session, data) {
    trace("["+session.sessionId+"] RX > "+data);
  });

  this.on('session.debug', function (session, msg) {
    trace("["+session.sessionId+"] "+msg);
  });

  this.on('session.warning', function (session, msg, data) {
    trace("["+session.sessionId+"] "+msg+' '+data);
  });
}

module.exports = Router;
