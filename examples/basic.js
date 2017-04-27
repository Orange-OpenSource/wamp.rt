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

app.on('RPCRegistered', function (realm, uri) {
    console.log('onRPCRegistered RPC registered', uri);
});
app.on('RPCUnregistered', function (realm, uri) {
    console.log('onRPCUnregistered RPC unregistered', uri);
});
app.on('Publish', function onPublish(realm, topicUri, args) {
    console.log('onPublish Publish', topicUri, args);
});
app.on('RealmCreated', function (realm, realmName) {
    console.log('new Relm:', realmName);
});

app.getRealm('realm1', function (realm) {
    var api = realm.api();
    api.regrpc('test.foo', function(id, args, kwargs) {
        console.log('called with ', args, kwargs);
        api.resrpc(id, null /* no error */, [["bar", "bar2"], {"key1": "bar1", "key2": "bar2"}]);
    });
});
