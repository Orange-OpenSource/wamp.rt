/*jshint node: true */
'use strict';

var
  WAMP = require('./protocol');

var handlers = {};

var Facade = function () {
    this.checkRealm = function (wampCommand, requestId) {
        if (this.realm) {
            return true;
        } else {
            this.sendError(wampCommand, requestId, "wamp.error.not_authorized");
            return false;
        }
    };
    this.sendWelcome = function (details) {
        details.roles = {"dealer": {}};
        this.send([WAMP.WELCOME, this.sessionId, details]);
    };
    this.sendChallenge = function (authmethod) {
        this.send([WAMP.CHALLENGE, authmethod, {}]);
    };
    this.sendRegistered = function (requestId, registrationId) {
        this.send([WAMP.REGISTERED, requestId, registrationId]);
    };
    this.sendUnregistered = function (requestId) {
        if (requestId)  // do not send on disconnect
            this.send([WAMP.UNREGISTERED, requestId]);
    };
    this.sendInvoke = function (regId, invId, args, kwargs, options) {
        var msg = [
            WAMP.INVOCATION,
            invId,
            regId,
            options,
        ];
        if (undefined !== args)   msg.push(args);
        if (undefined !== kwargs) msg.push(kwargs);
        this.send(msg);
    };
    this.sendResult = function (invId, err, args, kwargs, options) {
        if (err) {
            this.sendError(WAMP.CALL, invId, "wamp.error.callee_failure");
        }
        else {
            var msg =  [
                WAMP.RESULT,
                invId,
                options,
            ];
            if (undefined !== args)   msg.push(args);
            if (undefined !== kwargs) msg.push(kwargs);
            this.send(msg);
        }
    };
    this.sendSubscribed = function (requestId, topicId) {
        this.send([WAMP.SUBSCRIBED, requestId, topicId]);
    };
    this.sendUnsubscribed = function (requestId) {
        if (requestId)  // do not send on disconnect
            this.send([WAMP.UNSUBSCRIBED, requestId]);
    };
    this.sendPublished = function (requestId, publicationId) {
        this.send([WAMP.PUBLISHED, requestId, publicationId]);
    };
    this.sendEvent = function (subscriptionId, publicationId, args, kwargs, eventOpts) {
        var msg = [
            WAMP.EVENT,
            subscriptionId,
            publicationId,
            eventOpts
        ];
        // Manage optional parameters args + kwargs
        if (args !== undefined) {
            msg.push(args);
        }
        if (kwargs !== undefined) {
            msg.push(kwargs);
        }
        this.send(msg);
    };
    this.sendError = function (cmd, requestId, txt, args) {
        if (requestId) { // do not send on disconnect
            var msg = [WAMP.ERROR, cmd, requestId, {}, txt];
            if (args)
                msg.push(args);
            this.send(msg);
        }
    };
    this.sendGoodbye = function () {
        // Graceful termination
        var msg = [WAMP.GOODBYE, {}, "wamp.error.goodbye_and_out"];
        this.send(msg, function (error) {
            this.terminate(1000, "Server closed WAMP session");
        }.bind(this));
    };
    this.sendAbort = function (reason) {  // auth failed
        var msg = [WAMP.ABORT, {}, reason];
        this.send(msg, function (error) {
            this.terminate(1000, "Server closed WAMP session");
        }.bind(this));
    };
    this.handle = function (msg) {
        if (!Array.isArray(msg)) {
            this.terminate(1003, "protocol violation");
            return;
        }
        var msgType = msg.shift();
        if (!handlers[msgType]) {
            this.terminate(1003, "protocol violation");
            return;
        }
        handlers[msgType].call(this, msg);
    };
};

// This handlers are meant to be called in the context of the SESSION object

handlers[WAMP.HELLO] = function(args) {
    var realmName = args.shift();
    var details = args.shift();
    if (this.realm === null) {
        this.hello(realmName, details);
    } else {
        this.terminate(1002, "protocol violation");
    }
};

handlers[WAMP.AUTHENTICATE] = function(args) {
    var secret = args.shift();
    if (this.realm === null) {
        this.authenticate(secret);
    } else {
        this.terminate(1002, "protocol violation");
    }
};

handlers[WAMP.GOODBYE] = function(args) {
    // Ack the goodbye
    this.sendGoodbye();
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
        this.realm.callrpc(this, callId, procUri, options, fArgs, kwArgs);
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
    var fArgs = args.shift() || [];
    var kwArgs = args.shift();
    if (this.checkRealm(WAMP.CALL, invId))
        this.realm.resrpc(this, invId, null /* no error */, fArgs, kwArgs, options);
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
    var kwargs = msg.shift();

    // An invocation failed
    if (this.checkRealm(WAMP.ERROR, requestId) && requestType === WAMP.INVOCATION)
        this.realm.resrpc(this, requestId, new Error(details), args, kwargs);
};

module.exports = Facade;
