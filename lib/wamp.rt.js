var
  inherits  = require('util').inherits,
  Transport = require('./transport'),
  Router    = require('./router');

RouterTransport = function (options) {
    Router.call(this);
    _transport = new Transport(this, options);
};

inherits(RouterTransport, Router);
module.exports = RouterTransport;
