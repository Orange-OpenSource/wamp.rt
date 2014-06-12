var WebSocketServer = require('ws').Server,
    Session = require('./session'),
    WAMP = require('./protocol'),
    util = require('./util'),
    log = require('./log');

module.exports = Router;

function Router(options) {
    var _options = options || {};
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
    var _rpcs = {};
    var _pending = {};
    var _sessions = {};
    var _trace = function (msg) {
        log.trace('[ROUTER] ' + msg);
    };
    // Instantiate WebSocketServer 
    var _wss = new WebSocketServer(_options);
    // Create a Session object for the lifetime of each
    // WebSocket client object
    _wss.on('connection', function (wsclient) {
        var id = util.randomId();
        _sessions[id] = new Session(this, wsclient);
        wsclient.on('close', function() {
            _sessions[id].cleanup();
            delete _sessions[id];
        });
    }.bind(this));

    // RPC Management
    this.getrpc = function(uri) {
        return _rpcs[uri];
    };

    this.regrpc = function(uri, rpc) {
        _trace("Registering " + uri);
        _rpcs[uri] = rpc;
    };

    this.unregrpc = function(uri) {
        _trace("Unregistering " + uri);
        delete _rpcs[uri];
    };

    this.callrpc = function(uri, args, callback) {
        if (typeof this.getrpc(uri) !== 'undefined') {
            var invId = util.randomId();
            _pending[invId] = callback;
            this.getrpc(uri).apply(this ,[invId, args]);
            return true;
        } else {
            return false;
        }
    };

    this.resrpc = function(invId, args) {
        if (typeof _pending[invId] !== 'undefined') {
            _pending[invId].apply(this, args);
            delete _pending[invId];
        }
    };
}
