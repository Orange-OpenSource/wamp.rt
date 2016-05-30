//
// This is authenticate router example
//

WAMPRT_TRACE = true;

var WampRouter = require('../lib/wamp.rt');
var program = require('commander');

program
    .option('-p, --port <port>', 'Server IP port', 9000)
    .parse(process.argv);

console.log('Listening port:', program.port);

var Auth = function () {
    this.authenticate = function (realmName, secureDetails, secret, callback) {
        console.log('AUTH:', secureDetails, secret);
        if (secureDetails.authid+'-secret' === secret)
            callback();
        else
            callback('authorization_failed');
    };
};

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
    },
    new Auth()
);
