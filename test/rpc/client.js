AUTOBAHN_DEBUG = true;
var autobahn = require('autobahn');
var program = require('commander');
var when = require('when');

program
    .option('-p, --port <port>', 'Server IP port', parseInt,9000)
    .option('-i, --ip <ip>', 'Server IP address','127.0.0.1')
    .parse(process.argv);

var connection = new autobahn.Connection({
   url: 'ws://' + program.ip + ':' + program.port,
   realm: 'realm1'}
);

connection.onopen = function (session) {

    var starttime = Date.now();

    // We will send many calls in parallel, and wait for them
    // to complete before exiting
    when.join(
        session.call('com.timeservice.now').then(
            function (now) {
                // this method returns a plain value
                session.log("Call com.timeservice.now completed in " +
                            (Date.now() - starttime) +
                            " ms: result =", now);
            },
            function (error) {
                console.log("Call failed:", error);
            }
        ),
        session.call('com.echoservice.echo').then(
            function (res) {
                // This method returns an autobahn.result object
                session.log("Call com.echoservice.echo completed in " +
                            (Date.now() - starttime) +
                            " ms: result", res, "expected", null);
            },
            function (error) {
                console.log("Call failed:", error);
            }
        ),
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
        ),
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
        ),
        session.call('com.echoservice.echo', [],
                     { "kwarg1": "kwarg1","kwarg2": "kwarg2"}).then(
            function (res) {
            // This method returns an autobahn.result object
                session.log("Call com.echoservice.echo completed in " +
                (Date.now() - starttime) +
                " ms: result", res, "expected", [],
                { "kwarg1": "kwarg1","kwarg2": "kwarg2"});
            },
            function (error) {
                console.log("Call failed:", error);
            }
        ),
        session.call('com.echoservice.echo', ["arg1","arg2"],
                     { "kwarg1": "kwarg1","kwarg2": "kwarg2"}).then(
            function (res) {
                // This method returns an autobahn.result object
                session.log("Call com.echoservice.echo completed in " +
                            (Date.now() - starttime) +
                            " ms: result", res, "expected", ["arg1","arg2"],
                            { "kwarg1": "kwarg1","kwarg2": "kwarg2"});
            },
            function (error) {
                console.log("Call failed:", error);
            }
        )
    ).then(
       function (res) {
           console.log("All calls completed");
           connection.close();
       },
       function (error) {
           console.log("Failed to complete some calls");
       }
   );

};

connection.open();
