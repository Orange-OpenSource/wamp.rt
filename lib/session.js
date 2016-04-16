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
    var secureRealmName;
    var secureDetails;
    var auth = null;
    this.realm = null;
    this.sessionId = sessionId;
    handlers.call(this);

    this.setAuth = function (inAuth) {
        auth = inAuth;
    };
    this.hello = function (realmName, details) {
        if (auth) {
            secureDetails = details;
            secureRealmName = realmName;
            if (details.hasOwnProperty('authmethods') && details.authmethods.indexOf('ticket') >= 0) {
                this.sendChallenge('ticket', {});
            } else {
                this.sendAbort("wamp.error.authorization_failed");
            }
        } else {
            this.realm = router.getRealm(realmName);
            this.sendWelcome({});
        }
    };
    this.authenticate = function (secret) {
        auth.authenticate(secureRealmName, secureDetails, secret, function (err) {
            if (err) {
                this.sendAbort("wamp.error.authorization_failed");
            } else {
                this.realm = router.getRealm(secureRealmName);
                var details = {
                    authid:secureDetails.authid,
                    authmethod:"ticket"
                };
                this.sendWelcome(details);
            }
        }.bind(this));
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
