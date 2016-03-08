// wamp.rt
// Copyright Orange 2014

'use strict';

var WAMP = require('./protocol'),
    util = require('./util'),
    log = require('./log');

var handlers = {};

// This handlers are meant to be called in the context of the SESSION object

handlers[WAMP.HELLO] = function(args) {
    var realmName = args.shift();
    var details = args.shift();
    if (typeof this.id === 'undefined') {
        this.id = util.randomId();
        this.initRealm(realmName);
        log.trace(realmName+': New session :' + this.id);
        // Send welcome message
        var msg = [
            WAMP.WELCOME,
            this.id,
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
    var request = args.shift();
    var options = args.shift();
    var procUri = args.shift();
    args = args || [];
    var msg;
    var realm = this.getRealm();
    if (typeof realm.getrpc(procUri) === 'undefined') {
        var regId = this.register(procUri);
        realm.regrpc(procUri, function (invId, args) {
            log.trace('Invoking RPC ' + procUri, args);
            var msg = [
                WAMP.INVOCATION,
                invId,
                regId,
                {},
            ];
            // Manage optional parameters args + kwargs
            for(var i = 0; i < args.length && i < 2; i++) {
                msg.push(args[i]);
            }
            this.send(msg);
        }.bind(this));
        msg = [
            WAMP.REGISTERED,
            request,
            regId
        ];
    } else {
        msg = [
            WAMP.ERROR,
            WAMP.REGISTER,
            request,
            {},
            "wamp.error.procedure_already_exists"
        ];
    }
    this.send(msg);
};

handlers[WAMP.CALL] = function (args) {
    var callId = args.shift();
    var options = args.shift();
    var procUri = args.shift();
    args = args || [];
    var resultCallback = function(err, args) {
        if (err) {
            var msg = [
                WAMP.ERROR,
                WAMP.CALL,
                callId,
                {},
                "wamp.error.callee_failure"
            ];
            this.send(msg);
        } else {
            var msg =  [
                WAMP.RESULT,
                callId,
                {},
            ];
            // Manage optional parameters args + kwargs
            for(var i = 0; i < args.length && i < 2; i++) {
                msg.push(args[i]);
            }
            this.send(msg);
        }
    }.bind(this);
    var realm = this.getRealm();
    if (!realm.callrpc(procUri, args, resultCallback)) {
        var msg = [
            WAMP.ERROR,
            WAMP.CALL,
            callId,
            {},
            "wamp.error.no_such_procedure"
        ];
        this.send(msg);
    }
};

handlers[WAMP.UNREGISTER] = function (args) {
    var requestId = args.shift();
    var registrationId = args.shift();
    var msg;
    var uri = this.unregister(registrationId);
    var realm = this.getRealm();
    if (typeof uri === 'undefined') {
        msg = [
            WAMP.ERROR,
            WAMP.UNREGISTER,
            requestId,
            {},
            "wamp.error.no_such_registration"
        ];
    } else {
        realm.unregrpc(uri);
        msg = [
            WAMP.UNREGISTERED,
            requestId
        ];
    }
    this.send(msg);
};

handlers[WAMP.YIELD] = function (args) {
    var invId = args.shift();
    var options = args.shift();
    args = args || [];
    var realm = this.getRealm();
    realm.resrpc(invId, null, args);
};

handlers[WAMP.SUBSCRIBE] = function(args) {
    var requestId = args.shift();
    var options = args.shift();
    var topicUri = args.shift();
    var args = args || [];
    var msg;

    var eventCallback = function(publicationId, args, kwargs) {
        log.trace('eventCallback', publicationId, args, kwargs);
        var msg = [
            WAMP.EVENT,
            subsId,
            publicationId,
            {}
        ];
        // Manage optional parameters args + kwargs
        if (args !== undefined) {
            msg.push(args);
        }
        if (kwargs !== undefined) {
            msg.push(kwargs);
        }
        this.send(msg);
    }.bind(this);

    var realm = this.getRealm();
    var subsId = this.subscribe(topicUri);
    realm.substopic(topicUri, subsId, eventCallback);
    msg = [
        WAMP.SUBSCRIBED,
        requestId,
        subsId
    ];
    log.trace('Subscribe Topic ' + topicUri);
    this.send(msg);
};

handlers[WAMP.UNSUBSCRIBE] = function(args) {
    var requestId = args.shift();
    var subsid = args.shift();
    var topicUri = this.unsubscribe(subsid);
    args = args || [];
    var msg;

    var realm = this.getRealm();
    if (typeof realm.gettopic(topicUri) === 'undefined') {
        msg = [
            WAMP.ERROR,
            WAMP.UNSUBSCRIBE,
            requestId,
            {},
            "wamp.error.no_such_subscription"
        ];
        log.trace('Unsubscription error ' + topicUri);
    } else {
        realm.unsubstopic(topicUri, subsid);
        msg = [
            WAMP.UNSUBSCRIBED,
            requestId
        ];
        log.trace('Unsubscribe Topic ' + topicUri);
    }
    this.send(msg);
};

handlers[WAMP.PUBLISH] = function(msg) {
    var requestId = msg.shift();
    var options = msg.shift();
    var topicUri = msg.shift();
    var ack = options && options.acknowledge;
    var publicationId = util.randomId();
    var args = msg.shift() || [];
    var kwargs = msg.shift() || {};

    if (ack) {
        msg = [
            WAMP.PUBLISHED,
            requestId,
            publicationId
        ];
        this.send(msg);
        log.trace('Publish Topic with ack ' + topicUri + ' ' + publicationId);
    } else {
        log.trace('Publish Topic without ack ' + topicUri + ' ' + publicationId);
    }

    var realm = this.getRealm();
    // Router (this) is in charge of the events dispatching
    realm.publish(topicUri, publicationId, args, kwargs);
};

handlers[WAMP.EVENT] = function(args) {
    var subscriptionId = args.shift();
    var publicationId = args.shift();
    args = args || [];

    log.trace('Event received subscriptionId ' + subscriptionId
        + ' publicationId ' + publicationId);
};

handlers[WAMP.ERROR] = function(msg) {
    var requestType = msg.shift();
    var requestId = msg.shift();
    var details = msg.shift();
    var errorUri = msg.shift();
    var args = msg.shift() || [];
    var kwargs = msg.shift() || {};

    var err = new Error(details);
    var realm = this.getRealm();
    if (requestType === WAMP.INVOCATION) {
        // An invocation failed
        var invId = requestId;
        realm.resrpc(invId, err, args);
    }
}

module.exports = handlers;
