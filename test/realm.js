/*jshint mocha: true */
/*jshint node: true */
/*jshint expr: true */
'use strict';

var
    chai    = require('chai'),
    spies   = require('chai-spies'),
    expect  = chai.expect,
    WAMP    = require('../lib/protocol'),
    Realm   = require('../lib/realm'),
    Session = require('../lib/session'),
    Router  = require('../lib/router');

chai.use(spies);

describe('protocol', function() {
  var
    router,
    realm,
    sender,
    cli,
    api;

    beforeEach(function(){
        sender = {};
        router = new Router();
        realm = new Realm(router);
        api = realm.api();
        cli = new Session(router, sender, router.getNewSessionId());
        router.registerSession(cli);
        cli.realm = realm;
    });

    afterEach(function(){
    });

    it('empty cleanup', function () {
        realm.cleanup(api);
    });

    it('CALL to RPC not exist', function () {
        sender.send = chai.spy(
            function (msg, callback) {
                expect(msg[0]).to.equal(WAMP.ERROR);
                expect(msg[1]).to.equal(WAMP.CALL);
                expect(msg[2]).to.equal(1234);
                expect(msg[4]).to.equal('wamp.error.no_such_procedure');
                expect(msg[5]).to.deep.equal([ 'no callee registered for procedure <any.function.name>' ]);
            }
        );
        cli.handle([WAMP.CALL, 1234, {}, 'any.function.name', []]);
        expect(sender.send).to.have.been.called.once();
    });

    it('cleanup RPC API', function () {
        var procSpy = chai.spy(function() {});
        api.regrpc('func1', procSpy);
        expect(realm.cleanupRPC(api)).to.deep.equal(['func1']);
        expect(realm.cleanupRPC(api)).to.deep.equal([]);
        expect(procSpy).to.not.have.been.called();
    });

    it('CALL to router', function () {
        var procSpy = chai.spy(function(id, args, kwargs) {
            api.resrpc(id, undefined, ['result.1','result.2'], {kVal:'kRes'});
        });
        var regId = api.regrpc('func1', procSpy);

        sender.send = chai.spy(
            function (msg, callback) {
                expect(msg[0]).to.equal(WAMP.RESULT);
                expect(msg[1]).to.equal(1234);
                expect(msg[3]).to.deep.equal(['result.1','result.2']);
                expect(msg[4]).to.deep.equal({kVal:'kRes'});
            }
        );
        cli.handle([WAMP.CALL, 1234, {}, 'func1', ['arg1', 'arg2'], {'kArg':'kVal'}]);
        expect(procSpy, 'RPC delivered').to.have.been.called.once();
        expect(sender.send, 'result delivered').to.have.been.called.once();
        expect(api.unregrpc(regId)).to.equal('func1');
    });

    it('CALL to router with error', function () {
        var callId = null;
        var procSpy = chai.spy(function(id, args, kwargs) {
            callId = id;
        });
        api.regrpc('func1', procSpy);
        sender.send = chai.spy(
            function (msg, callback) {
                expect(msg[0]).to.equal(WAMP.ERROR);
                expect(msg[1]).to.equal(WAMP.CALL);
                expect(msg[2]).to.equal(1234);
                expect(msg[4]).to.deep.equal('wamp.error.callee_failure');
            }
        );
        cli.handle([WAMP.CALL, 1234, {}, 'func1', ['arg1', 'arg2'], {'kArg':'kVal'}]);
        api.resrpc(callId, 1, ['result.1','result.2'], {kVal:'kRes'});
        expect(procSpy).to.have.been.called.once();
        expect(sender.send).to.have.been.called.once();
    });

    it('UNREGISTER error', function () {
        sender.send = chai.spy(
            function (msg, callback) {
                expect(msg[0]).to.equal(WAMP.ERROR);
                expect(msg[1]).to.equal(WAMP.UNREGISTER);
                expect(msg[2]).to.equal(2345);
                // 3 options
                expect(msg[4]).to.equal('wamp.error.no_such_registration');
            }
        );
        cli.handle([WAMP.UNREGISTER, 2345, 1234567890]);
        expect(sender.send, 'unregistration confirmed').to.have.been.called.once();
    });

    it('UNREGISTER', function () {
        var registrationId = null;

        sender.send = chai.spy(
            function (msg, callback) {
                expect(msg[0]).to.equal(WAMP.REGISTERED);
                expect(msg[1]).to.equal(1234);
                registrationId = msg[2];
            }
        );
        cli.handle([WAMP.REGISTER, 1234, {}, 'func1']);
        expect(sender.send, 'registration confirmed').to.have.been.called.once();

        sender.send = chai.spy(
            function (msg, callback) {
                expect(msg[0]).to.equal(WAMP.UNREGISTERED);
                expect(msg[1]).to.equal(2345);
            }
        );
        cli.handle([WAMP.UNREGISTER, 2345, registrationId]);
        expect(sender.send, 'unregistration confirmed').to.have.been.called.once();
    });

    it('CALL to remote', function () {
        var registrationId = null;

        sender.send = chai.spy(
            function (msg, callback) {
                expect(msg[0]).to.equal(WAMP.REGISTERED);
                expect(msg[1]).to.equal(1234);
                registrationId = msg[2];
            }
        );
        cli.handle([WAMP.REGISTER, 1234, {}, 'func1']);
        expect(sender.send, 'registration confirmed').to.have.been.called.once();

        var callId = null;
        sender.send = chai.spy(
            function (msg, callback) {
                expect(msg[0]).to.equal(WAMP.INVOCATION);
                callId = msg[1];
                expect(msg[2]).to.equal(registrationId);
                expect(msg[3]).to.deep.equal({});  // options
                expect(msg[4]).to.deep.equal(['arg.1','arg.2']);
                expect(msg[5]).to.deep.equal({kVal:'kRes'});
            }
        );
        var callResponse = chai.spy(function(err, args, kwargs) {
            expect(err).to.equal(null);
            expect(args).to.deep.equal(['result.1','result.2'], 'args call spy response');
            expect(kwargs).to.deep.equal({foo:'bar'}, 'kwargs call spy response');
        });
        api.callrpc('func1', ['arg.1','arg.2'], {kVal:'kRes'}, callResponse);
        expect(sender.send, 'invocation received').to.have.been.called.once();

        // return the function result
        cli.handle([WAMP.YIELD, callId, {}, ['result.1','result.2'], {foo:'bar'}]);

        expect(callResponse, 'result delivered').to.have.been.called.once();
    });

    it('CALL error to remote', function () {
        sender.send = function () {};
        cli.handle([WAMP.REGISTER, 1234, {}, 'func1']);

        var callId = null;
        sender.send = chai.spy(
            function (msg, callback) {
                callId = msg[1];
            }
        );
        var callSpy = chai.spy(function(err, args) {
            expect(err).to.be.an('error');
            expect(args).to.deep.equal(['err.detail.1','err.detail.2']);
        });
        api.callrpc('func1', ['arg.1','arg.2'], {kVal:'kRes'}, callSpy);
        expect(sender.send, 'invocation received').to.have.been.called.once();

        cli.handle([WAMP.ERROR, WAMP.INVOCATION, callId, {}, 'wamp.error.runtime_error', ['err.detail.1','err.detail.2']]);
        expect(callSpy, 'error delivered').to.have.been.called.once();
    });

    it('Progress remote CALL', function () {
        sender.send = function (msg, callback) {};
        cli.handle([WAMP.REGISTER, 1234, {}, 'func1']);

        var callId = null;
        sender.send = chai.spy(
            function (msg, callback) {
                expect(msg[0]).to.equal(WAMP.INVOCATION);
                callId = msg[1];
                // registrationId
                expect(msg[3]).to.deep.equal({receive_progress:true});
            }
        );
        var result;
        var options;
        var callResponse = chai.spy(function(err, args, kwargs, options) {
            expect(err).to.equal(null);
            expect(args).to.deep.equal(result, 'args call spy response');
            expect(options).to.deep.equal(options, 'progress 1');
        });
        api.callrpc('func1', [], {}, callResponse, {receive_progress:1});
        expect(sender.send, 'invocation received').to.have.been.called.once();

        result = ['result.1'];
        options = {progress:true};
        cli.handle([WAMP.YIELD, callId, {progress:true}, ['result.1']]);

        result = ['result.2'];
        options = {progress:true};
        cli.handle([WAMP.YIELD, callId, {progress:true}, ['result.2']]);

        result = ['result.3.final'];
        options = {};
        cli.handle([WAMP.YIELD, callId, {}, ['result.3.final']]);

        cli.handle([WAMP.YIELD, callId, {}, ['result.not_delivered']]);

        expect(callResponse, 'result delivered').to.have.been.called.exactly(3);
    });

    it('UNSUBSCRIBE-ERROR', function () {
        sender.send = chai.spy(
            function (msg, callback) {
                expect(msg[0]).to.equal(WAMP.ERROR);
                expect(msg[1]).to.equal(WAMP.UNSUBSCRIBE);
                expect(msg[2]).to.equal(2345);
                // 3 options
                expect(msg[4]).to.equal('wamp.error.no_such_subscription');
            }
        );
        cli.handle([WAMP.UNSUBSCRIBE, 2345, 1234567890]);
        expect(sender.send, 'unsubscription confirmed').to.have.been.called.once();
    });

    it('UNSUBSCRIBE-OK', function () {
        var subscriptionId = null;

        sender.send = chai.spy(
            function (msg, callback) {
                expect(msg[0]).to.equal(WAMP.SUBSCRIBED);
                expect(msg[1]).to.equal(1234);
                subscriptionId = msg[2];
            }
        );
        cli.handle([WAMP.SUBSCRIBE, 1234, {}, 'topic1']);
        expect(sender.send, 'subscription confirmed').to.have.been.called.once();

        sender.send = chai.spy(
            function (msg, callback) {
                expect(msg[0]).to.equal(WAMP.UNSUBSCRIBED);
                expect(msg[1]).to.equal(2345);
            }
        );
        cli.handle([WAMP.UNSUBSCRIBE, 2345, subscriptionId]);
        expect(sender.send, 'unsubscription confirmed').to.have.been.called.once();
    });

    it('cleanup Topic API', function () {
        var subSpy = chai.spy(function () {});
        api.substopic('topic1', subSpy);
        expect(cli.realm.cleanupTopic(api)).to.deep.equal(['topic1']);
        expect(cli.realm.cleanupTopic(api)).to.deep.equal([]);
        expect(subSpy).to.not.have.been.called();
    });

    it('PUBLISH default exclude_me:true', function () {
      var subSpy = chai.spy(function () {});
      api.substopic('topic1', subSpy);
      api.publish('topic1', [], {});
      expect(subSpy).to.not.have.been.called();
    });

    it('PUBLISH exclude_me:false', function () {
      var subSpy = chai.spy(function () {});
      api.substopic('topic1', subSpy);
      api.publish('topic1', [], {}, {exclude_me:false});
      expect(subSpy).to.have.been.called.once();
    });

    it('PUBLISH to remote', function () {
        var subscriptionId = null;

        sender.send = chai.spy(
            function (msg, callback) {
                expect(msg[0]).to.equal(WAMP.SUBSCRIBED);
                expect(msg[1]).to.equal(1234);
                subscriptionId = msg[2];
            }
        );
        cli.handle([WAMP.SUBSCRIBE, 1234, {}, 'topic1']);
        expect(sender.send, 'subscription confirmed').to.have.been.called.once();

        sender.send = chai.spy(
            function (msg, callback) {
                expect(msg[0]).to.equal(WAMP.EVENT);
                expect(msg[1]).to.equal(subscriptionId);
                // 2 published message Id
                expect(msg[3]).to.deep.equal({topic:'topic1'});
                expect(msg[4]).to.deep.equal(['arg.1','arg.2']);
                expect(msg[5]).to.deep.equal({foo:'bar'});
            }
        );
        api.publish('topic1', ['arg.1','arg.2'], {foo:'bar'});
        expect(sender.send, 'publication received').to.have.been.called.once();
    });

    it('SUBSCRIBE to remote', function () {
        var subSpy = chai.spy(
            function (publicationId, args, kwargs) {
                expect(args).to.deep.equal(['arg.1','arg.2']);
                expect(kwargs).to.deep.equal({foo:'bar'});
            }
        );
        var subId = api.substopic('topic1', subSpy);

        sender.send = chai.spy(
            function (msg, callback) {
                expect(msg[0]).to.equal(WAMP.PUBLISHED);
                expect(msg[1]).to.equal(2345);
            }
        );
        cli.handle([WAMP.PUBLISH, 1234, {}, "topic1", ['arg.1','arg.2'],{foo:'bar'}]);
        expect(sender.send, 'published').to.not.have.been.called();
        cli.handle([WAMP.PUBLISH, 2345, {"acknowledge":true}, "topic1", ['arg.1','arg.2'],{foo:'bar'}]);
        expect(sender.send, 'published').to.have.been.called.once();

        expect(subSpy, 'publication done').to.have.been.called.twice();
        expect(api.unsubstopic(subId)).to.equal('topic1');
    });
});
