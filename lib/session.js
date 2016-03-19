'use strict';

var WAMP = require('./protocol'),
    handlers = require('./handlers');

module.exports = Session;

// requires sender with
// sender.send(msg, sessionId, callback)
// sender.close(code, reason)

function Session (router, sender, sessionId) {
    this.realm = null;
    this.sessionId = sessionId;

    this.initRealm = function (realm) {
        this.realm = router.getRealm(realm);
    };
    this.checkRealm = function (wampCommand, callId) {
        if (this.realm) {
          return true;
        } else {
          this.send([
              WAMP.ERROR,
              wampCommand,
              callId,
              {},
              "wamp.error.not_authorized"
          ]);
          return false;
        }
    };
    this.invoke = function (regId, invId, args, kwargs) {
      var msg = [
        WAMP.INVOCATION,
        invId,
        regId,
        {},
      ];
      // Manage optional parameters args + kwargs
      if (undefined !== args)   msg.push(args);
      if (undefined !== kwargs) msg.push(kwargs);
      this.send(msg);
    };
    this.send = function (msg, callback) {
      sender.send(msg, sessionId, callback);
    };
    this.sendError = function (cmd, callId, txt) {
      this.send([WAMP.ERROR, cmd, callId, {}, txt]);
    };
    this.yield = function (invId, err, args) {
      if (err) {
        this.sendError(WAMP.CALL, invId, "wamp.error.callee_failure");
      } else {
        var msg =  [
            WAMP.RESULT,
            invId,
            {},
        ];
        // Manage optional parameters args + kwargs
        for(var i = 0; i < args.length && i < 2; i++) {
            msg.push(args[i]);
        }
        this.send(msg);
      }
    };
    this.event = function (subscriptionId, publicationId, args, kwargs) {
        var msg = [
            WAMP.EVENT,
            subscriptionId,
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
    };
    this.handle = function (msg) {
        if (!Array.isArray(msg)) {
            this.terminate(1003, "protocol violation");
            return;
        }
        var type = msg.shift();
        if (!handlers[type]) {
            this.terminate(1003, "protocol violation");
            return;
        }
        handlers[type].call(this, msg);
    };

    this.decodeError = function (err) {
        return err;
    };
    this.close = function () {
        // Graceful termination
        var msg = [
            WAMP.GOODBYE,
            {},
            "wamp.error.close_realm"
        ];
        this.send(msg,function (error) {
            sender.close(1000, "Server closed WAMP session");
        });
    };
    this.terminate = function (code, reason) {
        sender.close(code, reason);
    };
    this.cleanup = function () {
        if (this.realm) {
            this.realm.cleanup(this.sessionId);
        }
    };
}
