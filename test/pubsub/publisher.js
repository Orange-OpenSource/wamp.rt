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

    // Start publishing events
    console.log("Publish events");
    when.join(
        session.publish('com.myapp.topic1',
                        [],
                        {},
                        { acknowledge : false }
        ),
        session.publish('com.myapp.topic1',
                        ["Arg1", "Arg2" ],
                        {},
                        { acknowledge : false }
        ),
        session.publish('com.myapp.topic1',
                        [],
                        { "kwarg1": "kwarg1", "kwarg2": "kwarg2"},
                        { acknowledge : false }
        ),
        session.publish('com.myapp.topic1',
                        ["Arg1", "Arg2" ],
                        { "kwarg1": "kwarg1", "kwarg2": "kwarg2"},
                        { acknowledge : false }
        ),
        session.publish('com.myapp.topic1',
                        [ "Arg_1", "Arg_2" ],
                        {},
                        { acknowledge : true }
        ).then(
            function(publication) {
                console.log("published, publication ID is ", publication);
            },
            function(error) {
                console.log("publication error", error);
                connection.close();
            }
        )
    ).then(
        function (res) {
            console.log("All events published");
            connection.close();
        },
        function (error) {
            console.log("Some events were not published");
            connection.close();
        }
    );
};

connection.open();

