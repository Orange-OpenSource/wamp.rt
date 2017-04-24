/*jshint node: true */
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
};

function WsParser(wsclient, router, session) {
    wsclient.on('message', function(data) {
        var msg;
        try {
            msg = JSON.parse(data);
        } catch (e) {
            log.trace('invalid json');
            session.terminate(1003, "protocol violation");
            return;
        }
        _trace('RX < ' + data, session.sessionId);
        session.handle(msg);
    });

    wsclient.on('close', function() {
        log.trace('WebSocket is closed.');
        session.cleanup();
        router.removeSession(session);
    });
}

function WsSender(wsclient) {
    var defaultCallback = function (error) {
        if (error) {
            log.trace("Failed to send message: " + error);
            this.close(1011, "Unexpected error");
        }
    }.bind(this);

    this.send = function (msg, id, callback) {
        var data = JSON.stringify(msg);
        _trace('TX > ' + data, id);
        wsclient.send(data, (typeof callback === 'function') ?
                      callback : defaultCallback);
    };

    this.close = function (code, reason) {
        log.trace('Closing WebSocket connection: [' + code + '] ' + reason);
        wsclient.close(code, reason);
    };
}

function Transport(router, auth, sessionCtrl, SessionClass, wsOptions) {
    var _wss = new WebSocketServer(wsOptions);
    // Create a Session object for the lifetime of each
    // WebSocket client object
    _wss.on('connection', function (wsclient) {
        var sender = new WsSender(wsclient);
        var session = new SessionClass(router, sender, sessionCtrl.getNewSessionId());
        session.setAuthHandler(auth);
        sessionCtrl.registerSession(session);
        var parser = new WsParser(wsclient, router, session);
        log.trace('New session :' + session.sessionId);
    });

    this.close = function() {
        _wss.close();
    };
}
