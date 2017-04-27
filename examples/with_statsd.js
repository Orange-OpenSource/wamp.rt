//
// This is a basic router example with sonnectivity to the statsd server
//

var WampRouter = require('../lib/wamp.rt');
var program = require('commander');
var StatsD = require('../ext/statsd');

StatsD.init(program);

program
  .option('-p, --port <port>', 'Server IP port', 9000)
  .parse(process.argv);

console.log('Listening port:', program.port);

var app = new WampRouter({port: program.port});
var trace = new StatsD.TraceRouter(program, app);
