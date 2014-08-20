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
            log.trace('Invoking RPC ' + procUri);
            var msg = [
                WAMP.INVOCATION,
                invId,
                regId,
                {},
                args
            ];
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
    var resultCallback = function(args) {
        var msg =  [
            WAMP.RESULT,
            callId,
            {},
            args
        ];
        session.send(msg);
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
    this.resrpc(invId, args);
};

handlers[WAMP.SUBSCRIBE] = function(session, args) {
    var requestId = args.shift();
    var options = args.shift();
    var topicUri = args.shift();
    args = args || [];

    var eventCallback = function(publicationId) {
	var msg = [ WAMP.EVENT, subsId, publicationId, {}, ];
	session.send(msg);
    };

    if (typeof this.gettopic(topicUri) === 'undefined') {
	var subsId = session.subscribe(topicUri);
	this.substopic(topicUri, subsId, eventCallback);
	msg = [ WAMP.SUBSCRIBED, requestId, subsId ];
	log.trace('Subscribe Topic ' + topicUri);
    } else {
	msg = [ WAMP.ERROR, WAMP.SUBSCRIBE, requestId, {},
		"wamp.error.not_authorized" ];
	log.trace('Subscription error ' + topicUri);
    }
    session.send(msg);
};

handlers[WAMP.UNSUBSCRIBE] = function(session, args) {
    var requestId = args.shift();
    var subsid = args.shift();
    var topicUri = session.unsubscribe(subsid);
    args = args || [];

    if (typeof this.gettopic(topicUri) === 'undefined') {
	msg = [ WAMP.ERROR, WAMP.UNSUBSCRIBE, requestId, {},
		"wamp.error.no_such_subscription" ];
	log.trace('Unsubscription error ' + topicUri);
    } else {
	this.unsubstopic(topicUri);
	msg = [ WAMP.UNSUBSCRIBED, requestId, ];
	log.trace('Unsubscribe Topic ' + topicUri);
    }
    session.send(msg);
};

handlers[WAMP.PUBLISH] = function(session, args) {
    var requestId = args.shift();
    var options = args.shift();
    var topicUri = args.shift();
    var ack = options && options.acknowledge;
    var publicationId = util.randomId();
    args = args || [];

    if (ack) {
	msg = [ WAMP.PUBLISHED, requestId, publicationId ];
	session.send(msg);
	log.trace('Publish Topic with ack ' + topicUri + ' ' + publicationId);
    } else {
	log.trace('Publish Topic without ack ' + topicUri + ' ' + publicationId);
    }

    // Router (this) is in charge of the events dispatching
    this.publish(topicUri, publicationId);
};

handlers[WAMP.EVENT] = function(session, args) {
    var subscriptionId = args.shift();
    var publicationId = args.shift();
    args = args || [];

    log.trace('Event received subscriptionId ' + subscriptionId
	    + ' publicationId ' + publicationId);
};

module.exports = handlers;
