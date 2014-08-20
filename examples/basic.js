//
// This is a basic router example
// 
// This script runs a simple WAMP server on port 9000 that exposes
// only one function, "test:isEven". It returns `true` if the first
// parameter is even, `false` otherwise.
//

//var WebSocketServer = require('ws').Server,
WAMPRT_TRACE = true;
var Router = require('../lib/wamp.rt');
var program = require('commander');


program 
    .option('-p, --port <port>', 'Server IP port', parseInt,9000)
    .option('-i, --ip <ip>', 'Server IP address','127.0.0.1');


function onRPCRegistered(uri) {
    console.log('onRPCRegistered RPC registered ' + uri);
}

function onRPCUnregistered(uri) {
    console.log('onRPCUnregistered RPC unregistered ' + uri);
}

function onPublish(topicUri, publicationId) {
    console.log('onPublish Publish ' + topicUri + ' ' + publicationId);
}

//
// WebSocket server
//
var app = new Router(
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

app.regrpc('wamp.rt.foo', function(id,args) {
    console.log('called with ' + args);
    app.resrpc(id,['bar']);
});

