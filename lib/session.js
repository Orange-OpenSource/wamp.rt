/*jshint node: true */
'use strict';

var
  MSG = require('./messages'),
  handlers = require('./handlers'),
  inherits = require('util').inherits;

// requires sender with
// sender.send(msg, callback)
// sender.close(code, reason)

// authHandler.authenticate(realmName, secureDetails, secret, callback)

function Session (router, sender, sessionId) {
    var secureRealmName;
    var secureDetails;
    var authHandler = null;
    this.realm = null;
    this.sessionId = sessionId;
    handlers.call(this);

    // setup auth module that is configured in transport
    this.setAuthHandler = function (auth) {
        authHandler = auth;
    };
    this.hello = function (realmName, details) {
        secureRealmName = realmName;
        if (authHandler) {
            secureDetails = details;
            if (details.hasOwnProperty('authmethods') && details.authmethods.indexOf('ticket') >= 0) {
                this.sendChallenge('ticket', {});
            } else {
                this.sendAbort("wamp.error.authorization_failed");
            }
        }
        else {
            router.getRealm(realmName, function (realm) {
                this.realm = realm;
                router.emit(MSG.SESSION_JOIN, this, realm);
                this.sendWelcome({});
            }.bind(this));
        }
    };
    this.authenticate = function (secret) {
        authHandler.authenticate(secureRealmName, secureDetails, secret, function (err) {
            if (err) {
                this.sendAbort("wamp.error.authorization_failed");
            } else {
                router.getRealm(secureRealmName, function (realm) {
                    this.realm = realm;
                    router.emit(MSG.SESSION_JOIN, this, realm);
                    var details = {
                        authid:secureDetails.authid,
                        authmethod:"ticket"
                    };
                    this.sendWelcome(details);
                }.bind(this));
            }
        }.bind(this));
    };
    this.send = function (msg, callback) {
        sender.send(msg, callback);
    };
    this.terminate = function (code, reason) {
        if (this.realm)
            router.emit(MSG.SESSION_LEAVE, this, this.realm);
        sender.close(code, reason);
    };
    this.getRealmName = function() {
      return secureRealmName;
    }
}

module.exports = Session;
inherits(Session, handlers);

Session.prototype.cleanup = function () {
    if (this.realm) {
        this.realm.cleanup(this);
        this.realm = null;
    }
};
