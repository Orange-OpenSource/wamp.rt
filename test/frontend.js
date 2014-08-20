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
//         connection.close();
      },
      function (error) {
         console.log("Call failed:", error);
//         connection.close();
      }
   );

   // Start publishing events
   var counter = 0;

   console.log("Publish event");
   this.interval = setInterval(function() {
	if ((counter % 2) == 0) {
	    session.publish('com.myapp.topic1', [ counter, "Arg_1", "Arg_2" ], {}, {
		acknowledge : true
	    }).then(function(publication) {
		console.log("published, publication ID is ", publication);
	    }, function(error) {
		console.log("publication error", error);
	    });
	} else {
	    session.publish('com.myapp.topic1', [ counter, "Arg_1", "Arg_2" ], {}, {
		acknowledge : false
	    });
	}

	counter += 1;
	if (counter > 10) {
	    clearInterval(this.interval);
	}

   }, 1000);

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

