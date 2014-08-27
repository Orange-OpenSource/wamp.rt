// wamp.rt
// Copyright Orange 2014

var trace = function () {};

if ('WAMPRT_TRACE' in global && WAMPRT_TRACE && 'console' in global) {
   trace = function () {
      console.log.apply(console, arguments);
   };
}

exports.trace = trace;
