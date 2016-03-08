// wamp.rt
// Copyright Orange 2014

'use strict';

var
    Session = require('./session'),
    Realm = require('./realm');

module.exports = Router;

function Router() {
    // Realm management
    var _realms = {};
    this.getRealm = function(realm) {
        if (_realms.hasOwnProperty(realm)) {
          return _realms[realm];
        } else {
          var r = new Realm();
          _realms[realm] = r;
          return r;
        }
    };

    this.createSession = function(sender) {
        return new Session(this, sender);
    }
}
