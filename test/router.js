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
    client;

  beforeEach(function(){
    sender = {};
    router = new Router();
    cli = router.createSession(sender);
    cli.initRealm('test');
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
    cli.handle([WAMP.CALL, 1234, {}, 'any.function.name', []]);
    expect(sender.send).to.have.been.called.once;
  });
});
