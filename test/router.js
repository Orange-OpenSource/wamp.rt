'use strict';

var
  chai   = require('chai'),
  spies  = require('chai-spies'),
  expect = chai.expect,
  WAMP   = require('../lib/protocol'),
  Router = require('../lib/router');

chai.use(spies);

describe('protocol', function() {
  var
    router,
    sender,
    cli;

  beforeEach(function(){
    sender = {};
    router = new Router();
    cli = router.createSession(sender);
  });

  afterEach(function(){
  })

  it('HELLO/WELCOME', function () {
    sender.send = chai.spy(
      function (msg, id, callback) {
        expect(msg[0]).to.equal(WAMP.WELCOME);
      }
    );
    cli.handle([WAMP.HELLO, 1, 'test', {}]);
    expect(sender.send).to.have.been.called.once;

    // second hello to logout
    sender.send = chai.spy(function (msg, id, callback) {});
    sender.close = chai.spy(function (error, reason) {});
    cli.handle([WAMP.HELLO, 1, 'test', {}]);
    expect(sender.send).to.not.have.been.called;
    expect(sender.close).to.have.been.called.once;
  });

  it('GOODBYE', function () {
    sender.send = chai.spy(
      function (msg, id, callback) {
        expect(msg[0]).to.equal(WAMP.GOODBYE);
        callback();
      }
    );
    sender.close = chai.spy(
      function (error) {}
    );
    cli.handle([WAMP.GOODBYE]);
    expect(sender.send).to.have.been.called.once;
    expect(sender.close).to.have.been.called.once;
  });

  it('CALL to RPC not exist', function () {
    sender.send = chai.spy(
      function (msg, id, callback) {
        expect(msg[0]).to.equal(WAMP.ERROR);
        expect(msg[1]).to.equal(WAMP.CALL);
        expect(msg[2]).to.equal(1234);
        expect(msg[4]).to.equal('wamp.error.no_such_procedure');
      }
    );
    cli.initRealm('test');
    cli.handle([WAMP.CALL, 1234, {}, 'any.function.name', []]);
    expect(sender.send).to.have.been.called.once;
  });

  it('CALL to router', function () {
    cli.initRealm('test');
    var realm = cli.getRealm('test');
    var procSpy = chai.spy(function(id, args, kwargs) {
//      console.log(id, args, kwargs);
      realm.resrpc(id, undefined, [['result.1','result.2'], {kVal:'kRes'}]);
    });
    realm.regrpc('func1', procSpy)

    sender.send = chai.spy(
      function (msg, id, callback) {
//        console.log(msg);
        expect(msg[0]).to.equal(WAMP.RESULT);
        expect(msg[1]).to.equal(1234);
        expect(msg[3]).to.deep.equal(['result.1','result.2']);
        expect(msg[4]).to.deep.equal({kVal:'kRes'});
      }
    );
    cli.initRealm('test');
    cli.handle([WAMP.CALL, 1234, {}, 'func1', ['arg1', 'arg2'], {'kArg':'kVal'}]);
    expect(procSpy).to.have.been.called.once;
    expect(sender.send).to.have.been.called.once;
  });

  it('CALL to router with error', function () {
    cli.initRealm('test');
    var realm = cli.getRealm('test');
    var callId = null;
    var procSpy = chai.spy(function(id, args, kwargs) {
      callId = id;
    });
    realm.regrpc('func1', procSpy);
    sender.send = chai.spy(
      function (msg, id, callback) {
        expect(msg[0]).to.equal(WAMP.ERROR);
        expect(msg[1]).to.equal(WAMP.CALL);
        expect(msg[2]).to.equal(1234);
        expect(msg[4]).to.deep.equal('wamp.error.callee_failure');
      }
    );
    cli.initRealm('test');
    cli.handle([WAMP.CALL, 1234, {}, 'func1', ['arg1', 'arg2'], {'kArg':'kVal'}]);
    realm.resrpc(callId, 1, [['result.1','result.2'], {kVal:'kRes'}]);
    expect(procSpy).to.have.been.called.once;
    expect(sender.send).to.have.been.called.once;
  });

  it('CALL to remote', function () {
    cli.initRealm('test');
    var realm = cli.getRealm('test');
    var registrationId = null;

    sender.send = chai.spy(
      function (msg, id, callback) {
        expect(msg[0]).to.equal(WAMP.REGISTERED);
        expect(msg[1]).to.equal(1234);
        registrationId = msg[2];
      }
    );
    cli.handle([WAMP.REGISTER, 1234, {}, 'func1']);
    expect(sender.send, 'registration confirmed').to.have.been.called.once;

    var callId = null;
    sender.send = chai.spy(
      function (msg, id, callback) {
        expect(msg[0]).to.equal(WAMP.INVOCATION);
        callId = msg[1];
        expect(msg[2]).to.equal(registrationId);
        // 3 options?
        expect(msg[4]).to.deep.equal(['arg.1','arg.2']);
        expect(msg[5]).to.deep.equal({kVal:'kRes'});
      }
    );
    var callSpy = chai.spy(function(id, args, kwargs) {
//      console.log('call result', id, args, kwargs);
      expect(args).to.deep.equal([['result.1','result.2'],{foo:'bar'}]);
    });
    realm.callrpc('func1', ['arg.1','arg.2'], {kVal:'kRes'}, callSpy);
    expect(sender.send, 'invocation received').to.have.been.called.once;

    cli.handle([WAMP.YIELD, callId, {}, ['result.1','result.2'], {foo:'bar'}]);

    expect(callSpy, 'result delivered').to.have.been.called.once;
  });

  it('PUBLISH to remote', function () {
    cli.initRealm('test');
    var realm = cli.getRealm('test');
    var subscriptionId = null;

    sender.send = chai.spy(
      function (msg, id, callback) {
        expect(msg[0]).to.equal(WAMP.SUBSCRIBED);
        expect(msg[1]).to.equal(1234);
        subscriptionId = msg[2];
      }
    );
    cli.handle([WAMP.SUBSCRIBE, 1234, {}, 'topic1']);
    expect(sender.send, 'subscription confirmed').to.have.been.called.once;

    sender.send = chai.spy(
      function (msg, id, callback) {
        expect(msg[0]).to.equal(WAMP.EVENT);
        expect(msg[1]).to.equal(subscriptionId);
        // 2 published message Id
        // 3 options?
        expect(msg[4]).to.deep.equal(['arg.1','arg.2']);
        expect(msg[5]).to.deep.equal({foo:'bar'});
      }
    );
    realm.publish('topic1', ['arg.1','arg.2'], {foo:'bar'});
    expect(sender.send, 'publication received').to.have.been.called.once;
  });

  it('SUBSCRIBE to remote', function () {
    cli.initRealm('test');
    var realm = cli.getRealm('test');
    var subscriptionId = cli.subscribe('topic1');

    var subSpy = chai.spy(
      function (publicationId, args, kwargs) {
        expect(args).to.deep.equal(['arg.1','arg.2']);
        expect(kwargs).to.deep.equal({foo:'bar'});
      }
    );
    realm.substopic('topic1', subscriptionId, subSpy);

    sender.send = chai.spy(
      function (msg, id, callback) {
        expect(msg[0]).to.equal(WAMP.PUBLISHED);
        expect(msg[1]).to.equal(2345);
      }
    );
    cli.handle([WAMP.PUBLISH, 1234, {}, "topic1", ['arg.1','arg.2'],{foo:'bar'}]);
    expect(sender.send, 'published').to.not.have.been.called;
    cli.handle([WAMP.PUBLISH, 2345, {"acknowledge":true}, "topic1", ['arg.1','arg.2'],{foo:'bar'}]);
    expect(sender.send, 'published').to.have.been.called.once;
  });
});
