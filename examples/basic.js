//
// This is a basic router example
//
// This script runs a simple WAMP router on port 9000
// It illustrates:
// - how to filter out incoming connections,
// - how to declare a router-embedded RPC,
// - how to subscribe to router events.
//

WAMPRT_TRACE = true;

var WampRouter = require('../lib/wamp.rt');
var program = require('commander');

program
    .option('-p, --port <port>', 'Server IP port', 9000)
    .parse(process.argv);

console.log('Listening port:', program.port);

function onRPCRegistered(realm, uri) {
    console.log('onRPCRegistered RPC registered', uri);
}

function onRPCUnregistered(realm, uri) {
    console.log('onRPCUnregistered RPC unregistered', uri);
}

function onPublish(realm, topicUri, args) {
    console.log('onPublish Publish', topicUri, args);
}

//
// WebSocket server
//
var app = new WampRouter(
    { port: program.port,
      // The router will select the appropriate protocol,
      // but we can still deny the connection
      // TODO: this should be the other way round, really ...
      handleProtocols: function(protocols,cb) {
          console.log(protocols);
          cb(true,protocols[0]);
          //cb(false);
      }
    }
);

app.on('RPCRegistered', onRPCRegistered);
app.on('RPCUnregistered', onRPCUnregistered);
app.on('Publish', onPublish);

app.on('RealmCreated', function (realm, realmName) {
    console.log('new Relm:', realmName);
//    realm.isSecured = true;
    realm.authenticate = function (secureDetails, secret, callback) {
        if (secureDetails.authid+'-secret' === secret)
            callback();
        else
            callback('authorization_failed');
    }
});

var api = app.getRealm('realm1').api();
api.regrpc('wamp.rt.foo', function(id, args, kwargs) {
    console.log('called with ', args, kwargs);
    api.resrpc(id, null /* no error */, [["bar", "bar2"], {"key1": "bar1", "key2": "bar2"}]);
});
