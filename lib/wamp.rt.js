var
    inherits  = require('util').inherits,
    Session   = require('./session'),
    Transport = require('./transport'),
    Router    = require('./router');

RouterTransport = function (options, auth) {
    Router.call(this);

    var _options = options || {};

    if ( !_options.disableProtocolCheck ) {
        // We need to verify that the subprotocol is wamp.2.json
        var cb = _options.handleProtocols;
        _options.handleProtocols = function (protocols, callback) {
            var i=0;
            var result = false;
            while(i < protocols.length && result === false) {
                result = (protocols[i] == "wamp.2.json");
                i++;
            }
            if (result && typeof cb == 'function') {
                // If a handleProtocol function was provided by the
                // calling script, just filter out the results
                cb([protocols[i-1]], callback);
            } else {
                callback(result, result ? protocols[i-1] : null);
            }
        };
    }
    _transport = new Transport(this, auth, Session, _options);
};

inherits(RouterTransport, Router);
module.exports = RouterTransport;
