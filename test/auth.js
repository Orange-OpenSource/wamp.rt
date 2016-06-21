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

var Auth = function () {
    this.authenticate = function (realmName, secureDetails, secret, callback) {
        if (realmName+'-'+secureDetails.authid+'-secret' === secret)
            callback();
        else
            callback('authorization_failed');
    };
};

describe('authenticate', function() {
    var
        router,
        sender,
        cli;

    beforeEach(function(){
        sender = {};
        router = new Router();

        cli = new Session(router, sender, router.getNewSessionId());
        cli.setAuthHandler(new Auth());
        router.registerSession(cli);
    });

    afterEach(function(){
    });

    it('Joe AUTH:FAIL', function () {
        sender.send = chai.spy(
            function (msg, callback) {
                expect(msg[0]).to.equal(WAMP.CHALLENGE);
                expect(msg[1]).to.equal('ticket');
            }
        );
        cli.handle([WAMP.HELLO, 'test', {authid: 'joe', authmethods:['ticket']}]);
        expect(sender.send).to.have.been.called.once;

        sender.send = chai.spy(
            function (msg, callback) {
                expect(msg[0]).to.equal(WAMP.ABORT);
//                callback();
            }
        );
        cli.handle([WAMP.AUTHENTICATE, 'incorrect-secret']);
        expect(sender.send).to.have.been.called.once;
    });

    it('Joe AUTH:OK', function () {
        sender.send = chai.spy(
            function (msg, callback) {
                expect(msg[0]).to.equal(WAMP.CHALLENGE);
                expect(msg[1]).to.equal('ticket');
            }
        );
        cli.handle([WAMP.HELLO, 'test', {authid: 'joe', authmethods:['ticket']}]);
        expect(sender.send).to.have.been.called.once;

        sender.send = chai.spy(
            function (msg, callback) {
                expect(msg[0]).to.equal(WAMP.WELCOME);
            }
        );
        cli.handle([WAMP.AUTHENTICATE, 'test-joe-secret']);
        expect(sender.send).to.have.been.called.once;
    });

});
