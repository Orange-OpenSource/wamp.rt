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

   var currentSubscription = null;

    // Define an event handler
    function onEvent(args, kwargs, details) {
	console.log("Event received ", args, kwargs, details);
	if (args[0] > 20) {
	    session.unsubscribe(subscription).then(function(gone) {
		console.log("unsubscribe successfull");
	    }, function(error) {
		console.log("unsubscribe failed", error);
	    });
	}
    }

   // Subscribe to a topic
   session.subscribe('com.myapp.topic1', onEvent).then(
      function(subscription) {
         console.log("subscription successfull", subscription);
         currentSubscription = subscription;
      },
      function(error) {
         console.log("subscription failed", error);
      }
   );

   setTimeout(function() {console.log("Unregistration");session.unregister(reg);},20000);

};

connection.open();
