/*jshint node: true */
'use strict';

var
  WebSocketServer = require('ws').Server;

module.exports = Transport;

function WsParser(wsclient, router, session) {
    wsclient.on('message', function(data) {
        var msg;
        try {
            msg = JSON.parse(data);
        } catch (e) {
            router.emit('session.warning', session, 'invalid json', data);
            session.terminate(1003, "protocol violation");
            return;
        }
        router.emit('session.Rx', session, data);
        session.handle(msg);
    });

    wsclient.on('close', function() {
        router.emit('session.debug', session, 'WebSocket is closed.');
        session.cleanup();
        router.removeSession(session);
    });
}

function WsSender(wsclient, router, sessionId) {
    var defaultCallback = function (error) {
        if (error) {
            router.emit('session.warning', "Failed to send message:", error);
            this.close(1011, "Unexpected error");
        }
    }.bind(this);

    this.send = function (msg, callback) {
        var data = JSON.stringify(msg);
        router.emit('session.Tx', this.session, data);
        wsclient.send(data, (typeof callback === 'function') ?
                      callback : defaultCallback);
    };

    this.close = function (code, reason) {
        router.emit('session.debug', this.session, 'Closing WebSocket connection: [' + code + '] ' + reason);
        wsclient.close(code, reason);
    };
}

function Transport(router, auth, SessionClass, wsOptions) {
    var _wss = new WebSocketServer(wsOptions);
    // Create a Session object for the lifetime of each
    // WebSocket client object
    _wss.on('connection', function (wsclient) {
        var sessionId = router.getNewSessionId();
        var sender = new WsSender(wsclient, router, sessionId);
        var session = new SessionClass(router, sender, sessionId);
        sender.session = session;
        session.setAuthHandler(auth);
        router.registerSession(session);
        var parser = new WsParser(wsclient, router, session);
        router.emit('session.debug', session, 'New session');
    });

    this.close = function() {
        _wss.close();
    };
}
