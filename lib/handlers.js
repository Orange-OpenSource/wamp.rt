'use strict';

var WAMP = require('./protocol');

var handlers = {};

// This handlers are meant to be called in the context of the SESSION object

handlers[WAMP.HELLO] = function(args) {
    var realmName = args.shift();
    var details = args.shift();
    if (this.realm === null) {
        this.initRealm(realmName);
        // Send welcome message
        var msg = [
            WAMP.WELCOME,
            this.sessionId,
            {
                "roles": {
                    "dealer": {}
                }
            }];
        this.send(msg);
    } else {
        this.terminate(1002, "protocol violation");
    }
};

handlers[WAMP.GOODBYE] = function(args) {
    // Ack the goodbye
    var msg = [
        WAMP.GOODBYE,
        {},
        "wamp.error.goodbye_and_out"
    ];
    this.send(msg, function (error) {
        this.terminate(1000, "Client closed WAMP session");
    }.bind(this));
};

handlers[WAMP.REGISTER] = function (args) {
    var requestId = args.shift();
    var options = args.shift();
    var procUri = args.shift();
    if (this.checkRealm(WAMP.REGISTER, requestId))
        this.realm.regrpc(this, requestId, procUri, options);
};

handlers[WAMP.CALL] = function (args) {
    var callId = args.shift();
    var options = args.shift();
    var procUri = args.shift();
    var fArgs = args.shift() || [];
    var kwArgs = args.shift() || {};
    if (this.checkRealm(WAMP.CALL, callId))
        this.realm.callrpc(this, callId, procUri, fArgs, kwArgs);
};

handlers[WAMP.UNREGISTER] = function (args) {
    var requestId = args.shift();
    var registrationId = args.shift();
    if (this.checkRealm(WAMP.UNREGISTER, requestId))
        this.realm.unregrpc(this, requestId, registrationId);
};

handlers[WAMP.YIELD] = function (args) {
    var invId = args.shift();
    var options = args.shift();
    args = args || [];
    if (this.checkRealm(WAMP.CALL, invId))
        this.realm.resrpc(this, invId, null, args);
};

handlers[WAMP.SUBSCRIBE] = function(args) {
    var requestId = args.shift();
    var options = args.shift();
    var topicUri = args.shift();
    if (this.checkRealm(WAMP.SUBSCRIBE, requestId))
        this.realm.substopic(this, requestId, topicUri, options);
};

handlers[WAMP.UNSUBSCRIBE] = function(args) {
    var requestId = args.shift();
    var topicUri = args.shift();
    if (this.checkRealm(WAMP.UNSUBSCRIBE, requestId))
        this.realm.unsubstopic(this, requestId, topicUri);
};

handlers[WAMP.PUBLISH] = function(msg) {
    var requestId = msg.shift();
    var options = msg.shift();
    var topicUri = msg.shift();
    var args = msg.shift() || [];
    var kwargs = msg.shift() || {};
    if (this.checkRealm(WAMP.PUBLISH, requestId))
        this.realm.publish(this, requestId, topicUri, options, args, kwargs);
};

handlers[WAMP.ERROR] = function(msg) {
    var requestType = msg.shift();
    var requestId = msg.shift();
    var details = msg.shift();
    var errorUri = msg.shift();
    var args = msg.shift() || [];
    var kwargs = msg.shift() || {};

    // An invocation failed
    if (this.checkRealm(WAMP.ERROR, requestId) && requestType === WAMP.INVOCATION)
        this.realm.resrpc(this, requestId, new Error(details), args);
}

module.exports = handlers;
