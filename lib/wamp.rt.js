var
  inherits  = require('util').inherits,
  Transport = require('./transport'),
  Router    = require('./router');

RouterTransport = function (options) {
  Transport.call(this, new Router(), options);
};

inherits(RouterTransport, Transport);
module.exports = RouterTransport;
