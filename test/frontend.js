AUTOBAHN_DEBUG = true;
var autobahn = require('autobahn');
var program = require('commander');

program 
    .option('-p, --port <port>', 'Server IP port', parseInt,9000)
    .option('-i, --ip <ip>', 'Server IP address','127.0.0.1');

var connection = new autobahn.Connection({
   url: 'ws://' + program.ip + ':' + program.port,
   realm: 'realm1'}
);

var session = null;

connection.onopen = function (new_session) {

   session = new_session;
   session.log("Session open.");

   var starttime = Date.now();
   session.call('com.timeservice.now').then(
      function (now) {
         session.log("Call completed in " +
                     (Date.now() - starttime) +
                     " ms: result = " + now);
         connection.close();
      },
      function (error) {
         console.log("Call failed:", error);
         connection.close();
      }
   );

   session.call('wamp.rt.foo',["test"]).then(
      function (res) {
         session.log("Call completed in " +
                     (Date.now() - starttime) +
                     " ms: result = " + res);
         //connection.close();
      },
      function (error) {
         console.log("Call failed:", error);
         //connection.close();
      }
   );

};

connection.onclose = function (reason, details) {
   console.log("connection 1", reason, details);
};

connection.open();

