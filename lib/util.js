// wamp.rt
// Copyright Orange 2014

module.exports.randomId = function() {
    return String(Math.random() * Math.random()).substr(3);
};
