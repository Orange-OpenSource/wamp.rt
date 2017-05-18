/*jshint node: true */
'use strict';

var WAMP = require('./protocol'),
    handlers = require('./handlers'),
    tools = require('./tools');

function Api(router, realm) {
    var _callback = {};
    var _rpc = {};

    handlers.call(this);
    this.sessionId = tools.randomId();
    router.registerSession(this);

    // API functions
    // regrpc callback = function(id, args, kwargs, options)
    this.regrpc = function(uri, callback) {
        var regId = realm.regrpc(this, tools.randomId(), uri);
        if (regId) {
            _rpc[regId] = callback;
        }
        return regId;
    };
    this.unregrpc = function(regId) {
        var uri = realm.unregrpc(this, tools.randomId(), regId);
        delete _rpc[regId];
        return uri;
    };
    this.callrpc = function (uri, args, kwargs, callback, options) {
        var callId = tools.randomId();
        if (realm.callrpc(this, callId, uri, options, args, kwargs)) {
            _callback[callId] = callback;
        }
    };
    this.resrpc = function (invId, err, args, kwargs, options) {
        return realm.resrpc(this, invId, err, args, kwargs, options);
    };
    this.substopic = function(topicUri, callback) {
        var topicId = realm.substopic(this, tools.randomId(), topicUri, {});
        _rpc[topicId] = callback;
        return topicId;
    };
    this.unsubstopic = function(topicId) {
        delete _rpc[topicId];
        return realm.unsubstopic(this, tools.randomId(), topicId);
    };
    this.publish = function (topicUri, args, kwargs, options) {
        var requestId = tools.randomId();
        realm.publish(this, requestId, topicUri, options, args, kwargs);
    };

    // override/internal part
    this.sendInvoke = function (regId, invId, args, kwargs, options) {
        if (_rpc.hasOwnProperty(regId)) {
            _rpc[regId](invId, args, kwargs, options);
        }
    };
    this.sendResult = function (callId, err, args, kwargs, options) {
        var callback = _callback[callId];
        if (!options || !options.progress) {
            delete _callback[callId];
        }
        callback(err, args, kwargs, options);
    };
    this.sendEvent = function (subscriptionId, publicationId, args, kwargs) {
        if (_rpc.hasOwnProperty(subscriptionId)) {
            _rpc[subscriptionId](publicationId, args, kwargs);
        }
    };
    this.send = function (msg) {};
}

function Realm(router) {
    var _sessRPC = {};
    var _sessTopic = {};  // topics by sessionId

    var _rpcs = {};
    var _topics = {};     // topics by uri
    var _pending = {};
    var _api = null;
    this.isSecured = false;

    this.api = function () {
        if (!_api) {
            _api = new Api(router, this);
        }
        return _api;
    };

    // RPC Management
    this.regrpc = function(session, requestId, procUri, options) {
        if (_rpcs.hasOwnProperty(procUri)) {
            session.sendError(WAMP.REGISTER, requestId, "wamp.error.procedure_already_exists");
            return false;
        }
        var registrationId = tools.randomId();
        _rpcs[procUri] = {sessionId:session.sessionId, regId:registrationId};
        if (!_sessRPC.hasOwnProperty(session.sessionId))
            _sessRPC[session.sessionId] = {};
        _sessRPC[session.sessionId][registrationId] = procUri;
        router.emit('RPCRegistered', this, procUri);
        session.sendRegistered(requestId, registrationId);
        return registrationId;
    };
    this.unregrpc = function(session, requestId, regId) {
        var procUri = '';
        if (_sessRPC.hasOwnProperty(session.sessionId) && _sessRPC[session.sessionId].hasOwnProperty(regId)) {
            procUri = _sessRPC[session.sessionId][regId];
            delete _rpcs[procUri];
            delete _sessRPC[session.sessionId][regId];
            router.emit('RPCUnRegistered', this, procUri);
            session.sendUnregistered(requestId);
        } else {
            session.sendError(WAMP.UNREGISTER, requestId, "wamp.error.no_such_registration");
        }
        return procUri;
    };

    this.callrpc = function(session, callId, procUri, options, args, kwargs) {
        if (!_rpcs.hasOwnProperty(procUri)) {
            session.sendError(WAMP.CALL, callId, "wamp.error.no_such_procedure", ['no callee registered for procedure <'+procUri+'>']);
            return false;
        }
        var destSession = router.getSession(_rpcs[procUri].sessionId);
        if (destSession) {
            var invId = tools.randomId();
            _pending[invId] = [callId, session.sessionId];
            var invOpts = {};
            if (options && options.receive_progress) {
                invOpts.receive_progress = true;
            }
            destSession.sendInvoke(_rpcs[procUri].regId, invId, args, kwargs, invOpts);
            return invId;
        } else {
            delete _rpcs[procUri];
        }
        return false;
    };

    this.resrpc = function(session, invId, err, args, kwargs, options) {
        var resOpts = {};
        if (options && options.progress) {
          resOpts.progress = true;
        };
        if (_pending.hasOwnProperty(invId)) {
            var destSession = router.getSession(_pending[invId][1]);
            if (destSession) {
                destSession.sendResult(_pending[invId][0], err, args, kwargs, resOpts);
            }
        }
        if (!resOpts.progress) {
            delete _pending[invId];
        }
    };

    // Topic Management
    this.substopic = function(session, requestId, topicUri, options) {
        var topicId = tools.randomId();
        if (!_sessTopic.hasOwnProperty(session.sessionId)) {
            _sessTopic[session.sessionId] = {};
        }
        _sessTopic[session.sessionId][topicId] = topicUri;
        if (!_topics.hasOwnProperty(topicUri)) {
            _topics[topicUri] = {};
        }
        _topics[topicUri][topicId] = session.sessionId;

        router.emit('Subscribed', this, topicUri);
        session.sendSubscribed(requestId, topicId);
        return topicId;
    };

    this.unsubstopic = function(session, requestId, topicId) {
        var topicUri = '';
        if (_sessTopic.hasOwnProperty(session.sessionId) && _sessTopic[session.sessionId].hasOwnProperty(topicId)) {
            topicUri = _sessTopic[session.sessionId][topicId];
            delete _topics[topicUri][topicId];
            delete _sessTopic[session.sessionId][topicId];
            router.emit('UnSubscribed', this, topicUri);
            session.sendUnsubscribed(requestId);
        } else {
            session.sendError(WAMP.UNSUBSCRIBE, requestId, "wamp.error.no_such_subscription");
        }
        return topicUri;
    };

    // By default, a Publisher of an event will not itself receive an event published, even when subscribed to the topic the Publisher is publishing to.
    // If supported by the Broker, this behavior can be overridden via the option exclude_me set to false.
    // session.publish('com.myapp.hello', ['Hello, world!'], {}, {exclude_me: false});

    this.publish = function(session, requestId, topicUri, options, args, kwargs) {
        var publicationId = tools.randomId();
        if (_topics.hasOwnProperty(topicUri)) {
            var eventOpts = {topic:topicUri};
            for(var subscriptionId in _topics[topicUri]) {
                var destSession = router.getSession(_topics[topicUri][subscriptionId]);
                if (destSession) {
                    if (session.sessionId !== destSession.sessionId ||
                      (options && false === options.exclude_me)
                    )
                      destSession.sendEvent(parseInt(subscriptionId), publicationId, args, kwargs, eventOpts);
                } else {
                    delete _topics[topicUri][subscriptionId];
                }
            }
        }
        var ack = options && options.acknowledge;
        router.emit('Publish', this, topicUri, args, kwargs, ack);
        if (ack)
            session.sendPublished(requestId, publicationId);
        return publicationId;
    };

    this.cleanupRPC = function (session) {
        var procIds = [];
        var procUris = [];
        if (_sessRPC.hasOwnProperty(session.sessionId)) {
            for (var regId in _sessRPC[session.sessionId])
                procIds.push(regId);
            for (var i=0; i<procIds.length; i++)
                procUris.push(this.unregrpc(session, false, procIds[i]));
            delete _sessRPC[session.sessionId];
        }
        return procUris;
    };

    this.cleanupTopic = function (session) {
        var topicIds = [];
        var topicUris = [];
        if (_sessTopic.hasOwnProperty(session.sessionId)) {
            for (var topicId in _sessTopic[session.sessionId])
                topicIds.push(topicId);
            for (var i=0; i<topicIds.length; i++)
                topicUris.push(this.unsubstopic(session, false, topicIds[i]));
            delete _sessTopic[session.sessionId];
        }
        return topicUris;
    };

    this.cleanup = function (session) {
        this.cleanupTopic(session);
        this.cleanupRPC(session);
    };

    this.getSessionCount = function () {
        return 15;
    };
}

module.exports = Realm;
