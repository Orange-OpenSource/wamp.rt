'use strict';

var WAMP = require('./protocol'),
    handlers = require('./handlers'),
    inherits = require('util').inherits;

module.exports = Session;
inherits(Session, handlers);

// requires sender with
// sender.send(msg, sessionId, callback)
// sender.close(code, reason)

function Session (router, sender, sessionId) {
    this.realm = null;
    this.sessionId = sessionId;
    handlers.call(this);

    this.initRealm = function (realm) {
        this.realm = router.getRealm(realm);
    };
    this.checkRealm = function (wampCommand, requestId) {
        if (this.realm) {
            return true;
        } else {
            this.sendError(wampCommand, requestId, "wamp.error.not_authorized");
            return false;
        }
    };
    this.send = function (msg, callback) {
      sender.send(msg, sessionId, callback);
    };
    this.terminate = function (code, reason) {
        sender.close(code, reason);
    };
    this.cleanup = function () {
        if (this.realm) {
            this.realm.cleanup(this);
            this.realm = null;
        }
    };
}
