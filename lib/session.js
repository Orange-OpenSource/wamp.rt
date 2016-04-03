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
    var secureRealm;
    var secureDetails;
    this.realm = null;
    this.sessionId = sessionId;
    handlers.call(this);

    this.initRealm = function (realm) {
        this.realm = router.getRealm(realm);
    };
    this.hello = function (realm, details) {
        secureRealm = router.getRealm(realm);
        if (secureRealm.isSecured) {
            secureDetails = details;
            if (details.hasOwnProperty('authmethods') && details.authmethods.indexOf('ticket') >= 0) {
                this.sendChallenge('ticket', {});
            } else {
                this.sendAbort("wamp.error.authorization_failed");
            }
        } else {
            this.realm = secureRealm;
            this.sendWelcome({});
        }
    };
    this.authenticate = function (secret) {
        secureRealm.authenticate(secureDetails, secret, function (err) {
            if (err) {
                this.sendAbort("wamp.error.authorization_failed");
            } else {
                this.realm = secureRealm;
                var details = {
                    authid:secureDetails.authid,
                    authmethod:"ticket"
                };
                this.sendWelcome(details);
            }
        }.bind(this));
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
