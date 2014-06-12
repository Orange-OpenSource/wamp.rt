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

module.exports = handlers;
