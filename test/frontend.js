AUTOBAHN_DEBUG = true;
var autobahn = require('autobahn');
var program = require('commander');

program
    .option('-p, --port <port>', 'Server IP port', parseInt,9000)
    .option('-i, --ip <ip>', 'Server IP address','127.0.0.1')
    .parse(process.argv);

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
         // this method returns a plain value
         session.log("Call com.timeservice.now completed in " +
                     (Date.now() - starttime) +
                     " ms: result =", now);
      },
      function (error) {
         console.log("Call failed:", error);
      });

   session.call('com.echoservice.echo').then(
      function (res) {
         // This method returns an autobahn.result object
         session.log("Call com.echoservice.echo completed in " +
            (Date.now() - starttime) +
            " ms: result", res, "expected", null);
      },
      function (error) {
         console.log("Call failed:", error);
      });

   session.call('com.echoservice.echo', [], {}).then(
      function (res) {
         // This method returns an autobahn.result object
         session.log("Call com.echoservice.echo completed in " +
            (Date.now() - starttime) +
            " ms: result", res, "expected", null);
      },
      function (error) {
         console.log("Call failed:", error);
      }
   );

   session.call('com.echoservice.echo', ["arg1","arg2"]).then(
      function (res) {
         // This method returns an autobahn.result object
         session.log("Call com.echoservice.echo completed in " +
            (Date.now() - starttime) +
            " ms: result", res, "expected", ["arg1","arg2"]);
      },
      function (error) {
         console.log("Call failed:", error);
      }
   );

   session.call('com.echoservice.echo', [],{ "kwarg1": "kwarg1","kwarg2": "kwarg2"}).then(
      function (res) {
         // This method returns an autobahn.result object
         session.log("Call com.echoservice.echo completed in " +
            (Date.now() - starttime) +
            " ms: result", res, "expected", [],  { "kwarg1": "kwarg1","kwarg2": "kwarg2"});
      },
      function (error) {
         console.log("Call failed:", error);
      }
   );

   session.call('com.echoservice.echo', ["arg1","arg2"],{ "kwarg1": "kwarg1","kwarg2": "kwarg2"}).then(
      function (res) {
         // This method returns an autobahn.result object
         session.log("Call com.echoservice.echo completed in " +
            (Date.now() - starttime) +
            " ms: result", res, "expected", ["arg1","arg2"], { "kwarg1": "kwarg1","kwarg2": "kwarg2"});
      },
      function (error) {
         console.log("Call failed:", error);
      }
   );

   session.call('wamp.rt.foo',["test"]).then(
      function (res) {
         session.log("Call wamp.rt.foo completed in " +
            (Date.now() - starttime) +
            " ms: result =", res);

      },
      function (error) {
         console.log("Call failed:", error);
      }
   );


   // Start publishing events
   console.log("Publish events");
   session.publish('com.myapp.topic1', [], {}, { acknowledge : false });
   session.publish('com.myapp.topic1', ["Arg1", "Arg2" ], {}, { acknowledge : false });
   session.publish('com.myapp.topic1', [], { "kwarg1": "kwarg1", "kwarg2": "kwarg2"}, { acknowledge : false });
   session.publish('com.myapp.topic1', ["Arg1", "Arg2" ], { "kwarg1": "kwarg1", "kwarg2": "kwarg2"}, { acknowledge : false });


   session.publish('com.myapp.topic1', [ "Arg_1", "Arg_2" ], {}, { acknowledge : true }).then(
      function(publication) {
         console.log("published, publication ID is ", publication);
         connection.close();
      },
      function(error) {      console.log("publication error", error);
         connection.close();
      }
   );
};

connection.onclose = function (reason, details) {
   console.log("connection 1", reason, details);
};

connection.open();

