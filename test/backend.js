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

connection.onopen = function (session) {

   var reg = null;

   function utcnow() {
      console.log("Someone is calling me;)");
      now = new Date();
      return now.toISOString();
   }

   session.register('com.timeservice.now', utcnow).then(
      function (registration) {
         console.log("Procedure registered:", registration.id);
         reg = registration;
      },
      function (error) {
         console.log("Registration failed:", error);
      }
   );

   setTimeout(function() {console.log("Unregistration");session.unregister(reg);},10000);

};

connection.open();
