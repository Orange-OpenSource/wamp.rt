// wamp.rt
// Copyright Orange 2014

var WAMP = require('./protocol'),
    util = require('./util'),
    log = require('./log');

var handlers = {};

// This handlers are meant to be called in the context of the router object

handlers[WAMP.HELLO] = function(session, args) {
    var realm = args.shift();
    var details = args.shift();
    if (typeof session.id === 'undefined') {
        session.id = util.randomId();
        log.trace('New session :' + session.id);
        // Send welcome message
        var msg = [
            WAMP.WELCOME,
            session.id,
            {
                "roles": {
                    "dealer": {}
                }
            }];
        session.send(msg);
    } else {
        session.terminate(1002, "protocol violation");
    }
};

handlers[WAMP.GOODBYE] = function(session, args) {
    // Ack the goodbye
    var msg = [
        WAMP.GOODBYE,
        {},
        "wamp.error.goodbye_and_out"
    ];
    session.send(msg, function (error) {
        session.terminate(1000, "Client closed WAMP session");
    });
};

handlers[WAMP.REGISTER] = function (session, args) {
    var request = args.shift();
    var options = args.shift();
    var procUri = args.shift();
    args = args || [];
    var msg;
    if (typeof this.getrpc(procUri) === 'undefined') {
        var regId = session.register(procUri);
        this.regrpc(procUri, function (invId, args) {
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
            session.send(msg);
        });
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
    session.send(msg);
};

handlers[WAMP.CALL] = function (session, args) {
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
            session.send(msg);
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
            session.send(msg);
        }
    };
    if (!this.callrpc(procUri, args, resultCallback)) {
        var msg = [
            WAMP.ERROR,
            WAMP.CALL,
            callId,
            {},
            "wamp.error.no_such_procedure"
        ];
        session.send(msg);
    }
};

handlers[WAMP.UNREGISTER] = function (session, args) {
    var requestId = args.shift();
    var registrationId = args.shift();
    var msg;
    var uri = session.unregister(registrationId);
    if (typeof uri === 'undefined') {
        msg = [
            WAMP.ERROR,
            WAMP.UNREGISTER,
            requestId,
            {},
            "wamp.error.no_such_registration"
        ];
    } else {
        this.unregrpc(uri);
        msg = [
            WAMP.UNREGISTERED,
            requestId
        ];
    }
    session.send(msg);
};

handlers[WAMP.YIELD] = function (session, args) {
    var invId = args.shift();
    var options = args.shift();
    args = args || [];
    this.resrpc(invId, null, args);
};

handlers[WAMP.SUBSCRIBE] = function(session, args) {
    var requestId = args.shift();
    var options = args.shift();
    var topicUri = args.shift();
    args = args || [];
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
        session.send(msg);
    };

    var subsId = session.subscribe(topicUri);
    this.substopic(topicUri, subsId, eventCallback);
    msg = [
        WAMP.SUBSCRIBED,
        requestId,
        subsId
    ];
    log.trace('Subscribe Topic ' + topicUri);
    session.send(msg);
};

handlers[WAMP.UNSUBSCRIBE] = function(session, args) {
    var requestId = args.shift();
    var subsid = args.shift();
    var topicUri = session.unsubscribe(subsid);
    args = args || [];
    var msg;

    if (typeof this.gettopic(topicUri) === 'undefined') {
        msg = [
            WAMP.ERROR,
            WAMP.UNSUBSCRIBE,
            requestId,
            {},
            "wamp.error.no_such_subscription"
        ];
        log.trace('Unsubscription error ' + topicUri);
    } else {
        this.unsubstopic(topicUri);
        msg = [
            WAMP.UNSUBSCRIBED,
            requestId
        ];
        log.trace('Unsubscribe Topic ' + topicUri);
    }
    session.send(msg);
};

handlers[WAMP.PUBLISH] = function(session, msg) {
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
        session.send(msg);
        log.trace('Publish Topic with ack ' + topicUri + ' ' + publicationId);
    } else {
        log.trace('Publish Topic without ack ' + topicUri + ' ' + publicationId);
    }

    // Router (this) is in charge of the events dispatching
    this.publish(topicUri, publicationId, args, kwargs);
};

handlers[WAMP.EVENT] = function(session, args) {
    var subscriptionId = args.shift();
    var publicationId = args.shift();
    args = args || [];

    log.trace('Event received subscriptionId ' + subscriptionId
        + ' publicationId ' + publicationId);
};

handlers[WAMP.ERROR] = function(session, msg) {
    var requestType = msg.shift();
    var requestId = msg.shift();
    var details = msg.shift();
    var errorUri = msg.shift();
    var args = msg.shift() || [];
    var kwargs = msg.shift() || {};

    var err = new Error(details);
    if (requestType === WAMP.INVOCATION) {
        // An invocation failed
        var invId = requestId;
        this.resrpc(invId, err, args);
    }

}

module.exports = handlers;
