'use strict';

var util = require('./util');

function Realm() {
    var _rpcs = {};
    var _pending = {};
    var _topics = {};

    // RPC Management
    this.getrpc = function(uri) {
        return _rpcs[uri];
    };

    this.regrpc = function(uri, rpc) {
        _rpcs[uri] = rpc;
    };

    this.unregrpc = function(uri) {
        delete _rpcs[uri];
    };

    this.callrpc = function(uri, args, kwargs, callback) {
        if (typeof this.getrpc(uri) !== 'undefined') {
            var invId = util.randomId();
            _pending[invId] = callback;
            this.getrpc(uri).call(this, invId, args, kwargs);
            return true;
        } else {
            return false;
        }
    };

    this.resrpc = function(invId, err, args) {
        if (typeof _pending[invId] !== 'undefined') {
            _pending[invId].call(this, err, args);
            delete _pending[invId];
        }
    };

    // Topic Management
    this.gettopic = function(topicUri) {
        return _topics[topicUri];
    };

    this.substopic = function(topicUri, subscriptionId, callback) {
        if (typeof _topics[topicUri] === 'undefined') {
            _topics[topicUri] = {};
        }
        _topics[topicUri][subscriptionId] = callback;
    };

    this.unsubstopic = function(topicUri, subscriptionId) {
        delete _topics[topicUri][subscriptionId];
    };

    this.publish = function(topicUri, args, kwargs) {
        var publicationId = util.randomId();
        if (typeof _topics[topicUri] !== 'undefined') {
            for(var key in _topics[topicUri]) {
                if(typeof _topics[topicUri][key] !== 'undefined') {
                    _topics[topicUri][key].call(this, publicationId, args, kwargs);
                }
            }
        }
        return publicationId;
    };
}

module.exports = Realm;
