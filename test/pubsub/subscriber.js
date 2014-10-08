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

    // Define an event handler
    function onEvent(publishArgs, kwargs) {
        console.log('Event received args', publishArgs, 'kwargs ',kwargs);
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

    // Exit after 5 minutes
    setTimeout(
        function() {
            console.log("Terminating subscriber");
            session.unsubscribe(currentSubscription).then(
                function(gone) {
                    console.log("unsubscribe successfull");
                    connection.close();
                },
                function(error) {
                    console.log("unsubscribe failed", error);
                    connection.close();
                }
            );
        },
        300000
    );
};

connection.open();
