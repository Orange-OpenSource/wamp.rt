// wamp.rt
// Copyright Orange 2014

var WAMP = require('./protocol'),
    handlers = require('./handlers'),
    util = require('./util'),
    log = require('./log');

module.exports = Session;

function Session (router, wsclient) {
    var _registeredUris = {};
    var _subscribedUris = {};
    var _trace = function (msg) {
        var trace = "[SESSION][" +
            ((typeof this.id === 'undefined') ? "?" : this.id) +
            "] " + msg;
        log.trace(trace);
    }.bind(this);
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
        data = JSON.stringify(msg);
        var defaultCallback = function (error) {
            if (error) {
                log.trace("Failed to send message: " + error);
                this.terminate(1011, "Unexpected error");
            }
        }.bind(this);
        _trace('TX > ' + data);
        wsclient.send(data, (typeof callback === 'function') ?
                      callback : defaultCallback);
    };
    wsclient.on('message', function(data) {
        var msg;

        try {
            msg = JSON.parse(data);
        } catch (e) {
            log.trace('invalid json');
            this.terminate(1003, "protocol violation");
            return;
        }
        if (!Array.isArray(msg)) {
            log.trace('msg not a list');
            this.terminate(1003, "protocol violation");
            return;
        }
        var type = msg.shift();
        if (!handlers[type]) {
            log.trace('unknown message type');
            this.terminate(1003, "protocol violation");
            return;
        }
        _trace('RX < ' + data);
        handlers[type].apply(router, [this, msg]);
    }.bind(this));
    this.close = function () {
        // Graceful termination
        var msg = [
            WAMP.GOODBYE,
            {},
            "wamp.error.close_realm"
        ];
        this.send(msg,function (error) {
            session.terminate(1000, "Server closed WAMP session");
        });
    };
    this.terminate = function (code, reason) {
        log.trace('Closing WebSocket connection: [' +
                  code + '] ' + reason);
        wsclient.close(code, reason);
    };
    this.cleanup = function () {
        _trace('Cleaning up session');
        for( var regId in _registeredUris) {
            router.unregrpc(_registeredUris[regId]);
            delete _registeredUris[regId];
        }
        // TODO clean via unsubscribe
    };
}
