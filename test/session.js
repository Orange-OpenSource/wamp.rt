'use strict';

var
    chai    = require('chai'),
    spies   = require('chai-spies'),
    expect  = chai.expect,
    WAMP    = require('../lib/protocol'),
    Session = require('../lib/session'),
    Router  = require('../lib/router');

chai.use(spies);

describe('protocol', function() {
  var
    router,
    sender,
    cli;

    beforeEach(function(){
        sender = {};
        router = new Router();
        cli = new Session(router, sender, router.getNewSessionId());
        router.registerSession(cli);
    });

    afterEach(function(){
    })

    it('HELLO/WELCOME', function () {
        sender.send = chai.spy(
            function (msg, id, callback) {
                expect(msg[0]).to.equal(WAMP.WELCOME);
            }
        );
        cli.handle([WAMP.HELLO, 'test', {}]);
        expect(sender.send).to.have.been.called.once;

        // second hello command raises error and disconnects the user
        sender.send = chai.spy(function (msg, id, callback) {});
        sender.close = chai.spy(function (error, reason) {});
        cli.handle([WAMP.HELLO, 'test', {}]);
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
});
