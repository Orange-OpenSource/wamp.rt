/*jshint mocha: true */
/*jshint node: true */
/*jshint expr: true */
'use strict';

var
    chai    = require('chai'),
    spies   = require('chai-spies'),
    expect  = chai.expect,
    WAMP    = require('../lib/protocol'),
    Session = require('../lib/session'),
    Router  = require('../lib/router');

chai.use(spies);

describe('session', function() {
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
    });

    it('HELLO/WELCOME', function () {
        sender.send = chai.spy(
            function (msg, callback) {
                expect(msg[0]).to.equal(WAMP.WELCOME);
            }
        );
        cli.handle([WAMP.HELLO, 'test', {}]);
        expect(sender.send).to.have.been.called.once();

        // second hello command raises error and disconnects the user
        sender.send = chai.spy(function (msg, callback) {});
        sender.close = chai.spy(function (error, reason) {});
        cli.handle([WAMP.HELLO, 'test', {}]);
        expect(sender.send).to.not.have.been.called();
        expect(sender.close).to.have.been.called.once();
    });

    it('GOODBYE', function () {
        sender.send = chai.spy(
            function (msg, callback) {
                expect(msg[0]).to.equal(WAMP.GOODBYE);
                callback();
            }
        );
        sender.close = chai.spy(
            function (error) {}
        );
        cli.handle([WAMP.GOODBYE]);
        expect(sender.send).to.have.been.called.once();
        expect(sender.close).to.have.been.called.once();
    });

    it('CALL to no realm RPC', function () {
        sender.send = chai.spy(
            function (msg, callback) {
                expect(msg[0]).to.equal(WAMP.ERROR);
                expect(msg[1]).to.equal(WAMP.CALL);
                expect(msg[2]).to.equal(1234);
                expect(msg[4]).to.equal('wamp.error.not_authorized');
            }
        );
        cli.handle([WAMP.CALL, 1234, {}, 'any.function.name', []]);
        expect(sender.send).to.have.been.called.once();
    });

    it('REGISTER to no realm', function () {
        sender.send = chai.spy(
            function (msg, callback) {
                expect(msg[0]).to.equal(WAMP.ERROR);
                expect(msg[1]).to.equal(WAMP.REGISTER);
                expect(msg[2]).to.equal(1234);
                expect(msg[4]).to.equal('wamp.error.not_authorized');
            }
        );
        cli.handle([WAMP.REGISTER, 1234, {}, 'func1']);
        expect(sender.send, 'registration failed').to.have.been.called.once();
    });
});
