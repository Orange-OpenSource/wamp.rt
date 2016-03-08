// wamp.rt
// Copyright Orange 2014

'use strict';

var WAMP = require('./protocol'),
    handlers = require('./handlers'),
    util = require('./util');

module.exports = Session;

// requires sender with
// sender.send(msg, sessionId, callback)
// sender.close(code, reason)

function Session (router, sender) {
    var _registeredUris = {};
    var _subscribedUris = {};
    var _realm = null;

    this.initRealm = function (realm) {
        _realm = router.getRealm(realm);
    };
    this.getRealm = function () {
        return _realm;
    };
    this.register = function (uri) {
        var registrationId = util.randomId();
        _registeredUris[registrationId] = uri;
        return registrationId;
    };
    this.unregister = function (id) {
        var uri = _registeredUris[id];
        if (typeof uri !== 'undefined') {
            delete _registeredUris[id];
        }
        return uri;
    };

    this.subscribe = function (uri) {
        var subscriptionId = util.randomId();
        _subscribedUris[subscriptionId] = uri;
        return subscriptionId;
    };
    this.unsubscribe = function (id) {
        var uri = _subscribedUris[id];
        if (typeof uri !== 'undefined') {
            delete _subscribedUris[id];
        }
        return uri;
    };

    this.send = function (msg, callback) {
        sender.send(msg, this.id, callback);
    };
    this.handle = function (msg) {
        if (!Array.isArray(msg)) {
            this.terminate(1003, "protocol violation");
            return;
        }
        var type = msg.shift();
        if (!handlers[type]) {
            this.terminate(1003, "protocol violation");
            return;
        }
        handlers[type].call(this, msg);
    };

    this.close = function () {
        // Graceful termination
        var msg = [
            WAMP.GOODBYE,
            {},
            "wamp.error.close_realm"
        ];
        this.send(msg,function (error) {
            sender.close(1000, "Server closed WAMP session");
        });
    };
    this.terminate = function (code, reason) {
        sender.close(code, reason);
    };
    this.cleanup = function () {
        if (_realm) {
            for(var regId in _registeredUris) {
                _realm.unregrpc(_registeredUris[regId]);
                delete _registeredUris[regId];
            }
            for (var subId in _subscribedUris) {
                _realm.unsubstopic(_subscribedUris[subId],subId);
                delete _subscribedUris[subId];
            }
        }
    };
}
