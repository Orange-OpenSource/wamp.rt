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

connection.onopen = function (session) {

    var reg = null;
    var reg2 = null;

    function utcnow() {
        console.log("timeservice.now called");
        now = new Date();
        return now.toISOString();
    }

    session.register('com.timeservice.now', utcnow).then(
        function (registration) {
            console.log("Procedure registered:", registration.id);
            reg = registration;
        },
        function (error) {
            console.log("com.timeservice.now registration failed:", error);
        }
    );

    function echo(args,kwargs) {
        console.log("echo called with args",args,"kwargs",kwargs);
        return new autobahn.Result(args, kwargs);
    }

    session.register('com.echoservice.echo', echo).then(
        function (registration) {
            console.log("Procedure echo registered:", registration.id);
            reg2 = registration;
        },
        function (error) {
            console.log("com.echoservice.echo registration failed:", error);
        }
    );

    // Exit after 5 minutes
    setTimeout(
        function() {
            console.log("Terminating server");
            session.unregister(reg);
            session.unregister(reg2);
            connection.close();
        },
        300000
    );
};

connection.open();
