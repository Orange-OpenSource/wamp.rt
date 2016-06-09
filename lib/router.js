/*jshint node: true */
'use strict';

var tools = require('./tools'),
    Realm = require('./realm'),
    log   = require('./log'),
    util  = require('util'),
    EventEmitter = require('events').EventEmitter;

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
            this.emit('RealmCreated', realm, realmName);
            callback(realm);
        }
    };

    this.traceTx = function (msg, id) {
        log.trace("["+id+"] TX > "+msg);
    };
    this.traceRx = function (msg, id) {
        log.trace("["+id+"] RX > "+msg);
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
}

module.exports = Router;
