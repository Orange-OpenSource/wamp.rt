'use strict';

var tools = require('./tools'),
    Session = require('./session'),
    Realm = require('./realm'),
    util = require('util'),
    eventEmitter = require('events').EventEmitter;

module.exports = Router;

util.inherits(Router, eventEmitter);

function Router() {
    // Realm management
    var _realms = {};
    var _sessions = {};

    this.getRealm = function(realm) {
        if (_realms.hasOwnProperty(realm)) {
          return _realms[realm];
        } else {
          var r = new Realm(this);
          _realms[realm] = r;
          return r;
        }
    };

    this.registerSession = function(session) {
        _sessions[session.sessionId] = session;
    };
    this.createSession = function(sender) {
        var session = new Session(this, sender, tools.randomId());
        this.registerSession(session);
        return session;
    };
    this.getSession = function(sessionId) {
        return _sessions[sessionId];
    };

    this.send = function(sessionId, msg, callback) {
        if (_sessions.hasOwnProperty(sessionId))
            _sessions[sessionId].send(msg, callback);
    };
}
