'use strict';

var
  WebSocketServer = require('ws').Server,
  log = require('./log');

module.exports = Transport;

var _trace = function (msg, id) {
    var trace = "[SESSION][" +
        ((typeof id === 'undefined') ? "?" : id) +
        "] " + msg;
    log.trace(trace);
}.bind(this);

function wsParser(wsclient, session) {
    wsclient.on('message', function(data) {
        var msg;

        try {
            msg = JSON.parse(data);
        } catch (e) {
            log.trace('invalid json');
            session.terminate(1003, "protocol violation");
            return;
        }
        _trace('RX < ' + data, session.id);
        session.handle(msg);
    });

    wsclient.on('close', function() {
        log.trace('WebSocket is closed.');
        session.cleanup();
    });
}

function wsSender(wsclient) {
    this.send = function (msg, id, callback) {
        var data = JSON.stringify(msg);
        var defaultCallback = function (error) {
            if (error) {
                log.trace("Failed to send message: " + error);
                this.close(1011, "Unexpected error");
            }
        }.bind(this);
        _trace('TX > ' + data, id);
        wsclient.send(data, (typeof callback === 'function') ?
                      callback : defaultCallback);
    };

    this.close = function (code, reason) {
        log.trace('Closing WebSocket connection: [' +
                  code + '] ' + reason);
        wsclient.close(code, reason);
    }
}

function Transport(router, options) {
    var _options = options || {};

    if ( !_options.disableProtocolCheck ) {
        // We need to verify that the subprotocol is wamp.2.json
        var cb = _options.handleProtocols;
        _options.handleProtocols = function (protocols, callback) {
            var i=0;
            var result = false;
            while(i < protocols.length && result === false) {
                result = (protocols[i] == "wamp.2.json");
                i++;
            }
            if (result && typeof cb == 'function') {
                // If a handleProtocol function was provided by the
                // calling script, just filter out the results
                cb([protocols[i-1]], callback);
            } else {
                callback(result, result ? protocols[i-1] : null);
            }
        };
    }
    // Instantiate WebSocketServer
    var _wss = new WebSocketServer(_options);
    // Create a Session object for the lifetime of each
    // WebSocket client object
    _wss.on('connection', function (wsclient) {
        var sender = new wsSender(wsclient);
        var session = router.createSession(sender);
        var parser = new wsParser(wsclient, session);
    }.bind(this));

    this.getRealm = function (reaml) {
        return router.getRealm(reaml);
    };

    this.close = function() {
        _wss.close();
    };
}
